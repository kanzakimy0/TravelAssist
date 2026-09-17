import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, or, sql } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.generated";
import type { ChangeSetV0_1 } from "../../shared/contracts/engine";
import {
  parseRollbackRequest,
  type RollbackRequestV1,
  type RollbackResultV1,
} from "../../shared/contracts/engine/runtime";
import { requireAuthUser } from "../../lib/auth/server-user";
import { getDb } from "../../db";
import {
  engineApplyReceipts as applies,
  engineApplyAudits as audits,
} from "../../db/schema/engine-apply";
import {
  engineApplyPreimages as histories,
  engineApplyCompensations as links,
  engineRollbackReceipts as receipts,
} from "../../db/schema/engine-runtime";
import {
  setTripActor,
  lockTripTree,
  readTree,
  type TripTransaction,
} from "../trips/transaction";
import { TripPersistenceError } from "../trips/projection";
import { applyLocked, type ApplyContextResolver } from "./apply-transaction";
import { knownCommitRejection } from "./apply";
import { canonicalJson, detached, digest } from "./json";
import { inverseOperations, parsePreimage } from "./preimage";
type Db = ReturnType<typeof getDb>;
type Receipt = typeof receipts.$inferSelect;
function initial(p?: RollbackRequestV1): RollbackResultV1 {
  return {
    rollbackContractVersion: "4.23-rollback-1",
    requestId: p?.requestId ?? "invalid-request",
    idempotencyKey: p?.idempotencyKey ?? "invalid-request",
    originalReceiptId: p?.originalReceiptId ?? "invalid-request",
    outcome: "blocked",
    issueCodes: [],
    observedVersion: null,
    resultingVersion: null,
    applyReceiptId: null,
    replay: { duplicate: false },
    transaction: { status: "not_started" },
  };
}
function fail(
  r: RollbackResultV1,
  code: string,
  outcome: RollbackResultV1["outcome"] = "blocked",
) {
  return { ...r, outcome, issueCodes: [code] };
}
function fromReceipt(row: Receipt, duplicate: boolean): RollbackResultV1 {
  return {
    rollbackContractVersion: "4.23-rollback-1",
    requestId: row.requestId,
    idempotencyKey: row.idempotencyKey,
    originalReceiptId: row.originalReceiptId,
    outcome: row.outcome,
    issueCodes: row.issueCodes,
    observedVersion: {
      tripRevision: row.observedTripRevision,
      planRevision: row.observedPlanRevision,
    },
    resultingVersion:
      row.resultingTripRevision !== null && row.resultingPlanRevision !== null
        ? {
            tripRevision: row.resultingTripRevision,
            planRevision: row.resultingPlanRevision,
          }
        : null,
    applyReceiptId: row.applyReceiptId,
    replay: { duplicate },
    transaction: {
      status: row.outcome === "accepted" ? "committed" : "not_started",
    },
  };
}
async function keyLock(
  tx: TripTransaction,
  actor: string,
  key: string,
  kind = "rollback",
) {
  await tx.execute(
    sql`select pg_advisory_xact_lock(hashtextextended(${canonicalJson({ actor, kind, key })},0))`,
  );
}
async function terminal(tx: TripTransaction, actor: string, key: string) {
  const [row] = await tx
    .select()
    .from(receipts)
    .where(
      and(eq(receipts.actorUserId, actor), eq(receipts.idempotencyKey, key)),
    );
  return row;
}
export function createEngineRollbackService(
  auth: SupabaseClient<Database>,
  resolveContext: ApplyContextResolver,
  database: () => Db = getDb,
) {
  async function prepare(input: unknown) {
    try {
      const user = await requireAuthUser(auth);
      if (!user.ok)
        return { error: fail(initial(), "PERMISSION_DENIED") } as const;
      const p = parseRollbackRequest(detached(input));
      if (!p.ok) return { error: fail(initial(), "INPUT_INVALID") } as const;
      if (p.value.actorRef !== user.data.userId)
        return { error: fail(initial(p.value), "PERMISSION_DENIED") } as const;
      return { p: p.value, userId: user.data.userId } as const;
    } catch {
      return { error: fail(initial(), "INPUT_INVALID") } as const;
    }
  }
  async function committed(p: RollbackRequestV1, userId: string) {
    return database().transaction(
      async (tx) => {
        await keyLock(tx, userId, p.idempotencyKey);
        const row = await terminal(tx, userId, p.idempotencyKey);
        if (!row || row.payloadHash !== digest(p)) return row;
        const [original] = await tx
          .select()
          .from(applies)
          .where(
            and(
              eq(applies.id, row.originalReceiptId),
              eq(applies.actorUserId, userId),
            ),
          );
        if (!original) throw new TripPersistenceError("NOT_FOUND");
        await setTripActor(tx, userId);
        const snapshot = await readTree(tx, original.tripId);
        if (!snapshot.plans.some((x) => x.id === original.planId))
          throw new TripPersistenceError("NOT_FOUND");
        return row;
      },
      { isolationLevel: "read committed" },
    );
  }
  async function reconcile(p: RollbackRequestV1, userId: string) {
    try {
      const row = await committed(p, userId);
      if (row)
        return row.payloadHash === digest(p)
          ? fromReceipt(row, true)
          : fail(initial(p), "IDEMPOTENCY_KEY_REUSED");
    } catch (e) {
      if (e instanceof TripPersistenceError && e.code === "NOT_FOUND")
        return fail(initial(p), "PERMISSION_DENIED");
    }
    return {
      ...fail(initial(p), "TRANSACTION_OUTCOME_UNKNOWN"),
      transaction: { status: "outcome_unknown" as const },
    };
  }
  return {
    async reconcile(input: unknown): Promise<RollbackResultV1> {
      const prepared = await prepare(input);
      if (prepared.error) return prepared.error;
      return reconcile(prepared.p, prepared.userId);
    },
    async rollback(input: unknown): Promise<RollbackResultV1> {
      const prepared = await prepare(input);
      if (prepared.error) return prepared.error;
      const { p, userId } = prepared;
      const hash = digest(p);
      let bodyCompleted = false,
        commitAcknowledged = false;
      try {
        const result = await database().transaction(
          async (tx) => {
            const execute = async (): Promise<RollbackResultV1> => {
              await keyLock(tx, userId, p.idempotencyKey);
              const stored = await terminal(tx, userId, p.idempotencyKey);
              if (stored && stored.payloadHash !== hash)
                return fail(initial(p), "IDEMPOTENCY_KEY_REUSED");
              // A distinct lock serializes all external keys for the same original accepted receipt.
              await keyLock(tx, userId, p.originalReceiptId, "compensate");
              const [original] = await tx
                .select()
                .from(applies)
                .where(
                  and(
                    eq(applies.id, p.originalReceiptId),
                    eq(applies.actorUserId, userId),
                    eq(applies.outcome, "accepted"),
                  ),
                );
              if (!original) return fail(initial(p), "PERMISSION_DENIED");
              const compensationKey = randomUUID();
              await keyLock(tx, userId, compensationKey, "apply");
              await setTripActor(tx, userId);
              let snapshot;
              try {
                snapshot = await lockTripTree(tx, original.tripId);
              } catch (e) {
                if (e instanceof TripPersistenceError && e.code === "NOT_FOUND")
                  return fail(initial(p), "PERMISSION_DENIED");
                throw e;
              }
              const plan = snapshot.plans.find((x) => x.id === original.planId);
              if (!plan) return fail(initial(p), "ROLLBACK_CONFLICT");
              if (stored) return fromReceipt(stored, true);
              let decision = initial(p);
              decision.observedVersion = {
                tripRevision: snapshot.trip.revision,
                planRevision: plan.revision,
              };
              await tx.execute(sql`set local role none`);
              const [audit] = await tx
                .select()
                .from(audits)
                .where(eq(audits.receiptId, original.id));
              const [history] = await tx
                .select()
                .from(histories)
                .where(eq(histories.receiptId, original.id));
              const existing = await tx
                .select()
                .from(links)
                .where(
                  or(
                    eq(links.originalReceiptId, original.id),
                    eq(links.compensationReceiptId, original.id),
                  ),
                );
              const valid = parsePreimage(history?.preimage);
              if (existing.some((x) => x.originalReceiptId === original.id))
                decision = fail(decision, "ROLLBACK_ALREADY_COMPENSATED");
              else if (existing.length)
                decision = fail(
                  decision,
                  "ROLLBACK_OUT_OF_SCOPE",
                  "unsupported",
                );
              else if (
                !audit ||
                !valid.ok ||
                !Array.isArray(audit.operationRefs) ||
                !audit.operationRefs.length ||
                audit.operationRefs.some(
                  (o) =>
                    !o ||
                    typeof o !== "object" ||
                    (o.op !== "UPDATE_TIME" && o.op !== "REORDER_ITEMS"),
                )
              )
                decision = fail(
                  decision,
                  "ROLLBACK_HISTORY_UNAVAILABLE",
                  "unsupported",
                );
              else {
                const operations = inverseOperations(
                  snapshot,
                  original.planId,
                  valid.value,
                );
                if (!operations) decision = fail(decision, "ROLLBACK_CONFLICT");
                else {
                  const change: ChangeSetV0_1 = {
                    engineContractVersion: "0.1",
                    tripContractVersion: "1.0",
                    changeSetId: randomUUID(),
                    idempotencyKey: compensationKey,
                    target: {
                      tripId: original.tripId,
                      planId: original.planId,
                    },
                    baseVersion: decision.observedVersion!,
                    source: {
                      kind: "user",
                      actorRef: userId,
                      correlationId: original.id,
                      proposalRef: null,
                    },
                    reason: p.reason,
                    operations,
                    factRefs: [],
                  };
                  await setTripActor(tx, userId);
                  const applied = await applyLocked(
                    tx,
                    snapshot,
                    change,
                    userId,
                    resolveContext,
                    true,
                  );
                  decision = {
                    ...decision,
                    outcome: applied.decision.outcome,
                    issueCodes: [
                      ...new Set(applied.decision.issues.map((i) => i.code)),
                    ]
                      .sort()
                      .slice(0, 32),
                    resultingVersion: applied.decision.resultingVersion,
                    applyReceiptId: applied.receiptId,
                    transaction: {
                      status:
                        applied.decision.outcome === "accepted"
                          ? "committed"
                          : "not_started",
                    },
                  };
                  if (decision.outcome === "accepted")
                    await tx.insert(links).values({
                      originalReceiptId: original.id,
                      compensationReceiptId: applied.receiptId,
                    });
                }
              }
              await tx.insert(receipts).values({
                actorUserId: userId,
                originalReceiptId: p.originalReceiptId,
                idempotencyKey: p.idempotencyKey,
                requestId: p.requestId,
                payloadHash: hash,
                outcome: decision.outcome,
                issueCodes: decision.issueCodes,
                observedTripRevision: decision.observedVersion!.tripRevision,
                observedPlanRevision: decision.observedVersion!.planRevision,
                resultingTripRevision:
                  decision.resultingVersion?.tripRevision ?? null,
                resultingPlanRevision:
                  decision.resultingVersion?.planRevision ?? null,
                applyReceiptId: decision.applyReceiptId,
              });
              return decision;
            };
            const decision = await execute();
            bodyCompleted = true;
            return decision;
          },
          { isolationLevel: "read committed" },
        );
        commitAcknowledged = true;
        if (result.outcome === "accepted") {
          const row = await committed(p, userId);
          return row
            ? fromReceipt(row, result.replay.duplicate)
            : reconcile(p, userId);
        }
        return result;
      } catch (e) {
        if (commitAcknowledged || (bodyCompleted && !knownCommitRejection(e)))
          return reconcile(p, userId);
        return {
          ...fail(initial(p), "TRANSACTION_FAILED"),
          transaction: { status: "rolled_back" },
        };
      }
    },
  };
}
