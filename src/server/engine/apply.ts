import "server-only";
import { and, eq, sql } from "drizzle-orm";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../types/database.generated";
import type {
  ChangeSetV0_1,
  EngineResultV0_1,
} from "../../shared/contracts/engine";
import type { TripPlanSnapshotV1 } from "../../shared/contracts/trips";
import { requireAuthUser } from "../../lib/auth/server-user";
import { getDb } from "../../db/index";
import {
  engineApplyReceipts as receipts,
  engineApplyAudits as audits,
  engineApplyOutbox as outbox,
} from "../../db/schema/engine-apply";
import { TripPersistenceError } from "../trips/projection";
import {
  lockTripTree,
  replaceTripTree,
  setTripActor,
  type TripTransaction,
} from "../trips/transaction";
import { preview } from "./index";
import type { EvaluationContext } from "./context";
import { canonicalJson, detached } from "./json";
import {
  applyResult,
  failApply,
  prepareApply,
  replayApply,
} from "./apply-result";

type Db = ReturnType<typeof getDb>;
export type ApplyContextResolver = (input: {
  actorUserId: string;
  snapshot: TripPlanSnapshotV1;
  change: ChangeSetV0_1;
}) =>
  | Omit<EvaluationContext, "access">
  | Promise<Omit<EvaluationContext, "access">>;

function knownCommitRejection(error: unknown) {
  const cause = error instanceof Error ? error.cause : undefined;
  return [error, cause].some(
    (e) =>
      e &&
      typeof e === "object" &&
      "code" in e &&
      /^(23|40|PT409)/.test(String(e.code)),
  );
}

/** Internal request-scoped service. resolveContext is trusted server code, never request JSON.
 * No HTTP/UI/grant mechanism is introduced. The only request input is ChangeSetV0_1.
 */
export function createEngineApplyService(
  auth: SupabaseClient<Database>,
  resolveContext: ApplyContextResolver,
  database: () => Db = getDb,
) {
  async function actor() {
    try {
      const user = await requireAuthUser(auth);
      return user.ok ? user.data.userId : null;
    } catch {
      return null;
    }
  }
  async function keyLock(
    tx: TripTransaction,
    userId: string,
    change: ChangeSetV0_1,
  ) {
    await tx.execute(
      sql`select pg_advisory_xact_lock(hashtextextended(${canonicalJson({ actor: userId, kind: "apply", key: change.idempotencyKey })},0))`,
    );
  }
  async function terminal(tx: TripTransaction, userId: string, key: string) {
    const [row] = await tx
      .select()
      .from(receipts)
      .where(
        and(eq(receipts.actorUserId, userId), eq(receipts.idempotencyKey, key)),
      );
    return row?.result ?? null;
  }
  async function committed(userId: string, change: ChangeSetV0_1) {
    return database().transaction(
      async (tx) => {
        await keyLock(tx, userId, change);
        return terminal(tx, userId, change.idempotencyKey);
      },
      { isolationLevel: "read committed" },
    );
  }
  async function reconcileFor(userId: string, change: ChangeSetV0_1) {
    const result = applyResult(change);
    try {
      const stored = await committed(userId, change);
      if (stored) return replayApply(stored, result);
    } catch {
      /* Unavailable DB is not evidence of rollback. Keep original key. */
    }
    return failApply(
      result,
      "TRANSACTION_OUTCOME_UNKNOWN",
      "transaction",
      "blocked",
      "outcome_unknown",
    );
  }
  async function prepare(input: unknown) {
    const userId = await actor();
    if (!userId)
      return {
        userId: null,
        change: null,
        result: failApply(applyResult(), "PERMISSION_DENIED", "authorization"),
      };
    const prepared = prepareApply(input);
    if (prepared.change && prepared.change.source.actorRef !== userId)
      return {
        userId,
        change: null,
        result: failApply(
          prepared.result,
          "PERMISSION_DENIED",
          "authorization",
        ),
      };
    return { userId, ...prepared };
  }
  return {
    async reconcile(input: unknown): Promise<EngineResultV0_1> {
      const p = await prepare(input);
      if (!p.change || !p.userId) return p.result;
      return reconcileFor(p.userId, p.change);
    },
    async apply(input: unknown): Promise<EngineResultV0_1> {
      const prepared = await prepare(input);
      if (!prepared.change || !prepared.userId) return prepared.result;
      const { change, userId } = prepared;
      let bodyCompleted = false;
      let commitAcknowledged = false;
      try {
        const result = await database().transaction(
          async (tx) => {
            const execute = async () => {
              await keyLock(tx, userId, change);
              const stored = await terminal(tx, userId, change.idempotencyKey);
              if (stored) return replayApply(stored, applyResult(change));
              // Only metadata access uses the server connection role. Trip reads and writes use RLS.
              await setTripActor(tx, userId);
              let snapshot: TripPlanSnapshotV1;
              try {
                snapshot = await lockTripTree(tx, change.target.tripId);
              } catch (e) {
                if (e instanceof TripPersistenceError && e.code === "NOT_FOUND")
                  return failApply(
                    applyResult(change),
                    "PERMISSION_DENIED",
                    "authorization",
                  );
                throw e;
              }
              const plan = snapshot.plans.find(
                (p) => p.id === change.target.planId,
              );
              if (!plan)
                return failApply(
                  applyResult(change),
                  "PERMISSION_DENIED",
                  "authorization",
                );
              let decision = applyResult(change);
              decision.observedVersion = {
                tripRevision: snapshot.trip.revision,
                planRevision: plan.revision,
              };
              if (
                snapshot.trip.revision !== change.baseVersion.tripRevision ||
                plan.revision !== change.baseVersion.planRevision
              )
                decision = failApply(decision, "BASE_VERSION_STALE", "version");
              else if (
                change.source.kind !== "user" ||
                change.operations.some(
                  (o) => o.op !== "UPDATE_TIME" && o.op !== "REORDER_ITEMS",
                )
              )
                decision = failApply(
                  decision,
                  "OPERATION_UNSUPPORTED",
                  "input",
                  "unsupported",
                );
              else {
                const context = detached(
                  await resolveContext({
                    actorUserId: userId,
                    snapshot: detached(snapshot),
                    change: detached(change),
                  }),
                );
                decision = preview(snapshot, change, {
                  ...context,
                  access: {
                    actorRef: userId,
                    tripId: change.target.tripId,
                    planId: change.target.planId,
                    canRead: true,
                    canPropose: true,
                  },
                });
                decision.requestKind = "apply";
              }
              const candidate = decision.preview;
              // No confirmation grants exist yet: never accept a client assertion of consent.
              if (decision.confirmationRequirements.length)
                decision.outcome = "needsConfirmation";
              const accepted =
                decision.outcome === "accepted" &&
                candidate !== null &&
                !decision.issues.some(
                  (i) =>
                    i.severity === "blocking" || i.severity === "confirmation",
                );
              if (decision.outcome === "accepted" && !accepted)
                decision = failApply(
                  decision,
                  "TRANSACTION_FAILED",
                  "transaction",
                );
              if (accepted) {
                const saved = await replaceTripTree(
                  tx,
                  candidate!.after,
                  change.target.planId,
                );
                const savedPlan = saved.plans.find(
                  (p) => p.id === change.target.planId,
                )!;
                decision.resultingVersion = {
                  tripRevision: saved.trip.revision,
                  planRevision: savedPlan.revision,
                };
                decision.transaction = {
                  status: "committed",
                  retryable: false,
                };
              }
              decision.preview = null; // Never retain Trip snapshots in receipts/audit/outbox.
              // Restore the original server DB role solely for immutable Engine metadata inserts.
              await tx.execute(sql`set local role none`);
              const [receipt] = await tx
                .insert(receipts)
                .values({
                  actorUserId: userId,
                  idempotencyKey: change.idempotencyKey,
                  tripId: change.target.tripId,
                  planId: change.target.planId,
                  changeSetId: change.changeSetId,
                  payloadHash: decision.payloadHash,
                  outcome: decision.outcome,
                  result: decision,
                })
                .returning({ id: receipts.id });
              if (accepted) {
                await tx.insert(audits).values({
                  receiptId: receipt.id,
                  beforeTripRevision: change.baseVersion.tripRevision,
                  beforePlanRevision: change.baseVersion.planRevision,
                  resultingTripRevision:
                    decision.resultingVersion!.tripRevision,
                  resultingPlanRevision:
                    decision.resultingVersion!.planRevision,
                  previewHash: candidate!.previewHash,
                  contextFingerprint: decision.assessment!.contextFingerprint,
                  operationRefs: change.operations.map((o) => ({
                    operationId: o.operationId,
                    op: o.op,
                  })),
                });
                await tx.insert(outbox).values({ receiptId: receipt.id });
              }
              return decision;
            };
            const decision = await execute();
            bodyCompleted = true;
            return decision;
          },
          { isolationLevel: "read committed" },
        );
        commitAcknowledged = true;
        // An accepted response is backed by a terminal record visible after COMMIT.
        if (result.outcome === "accepted") {
          const stored = await committed(userId, change);
          if (!stored) return reconcileFor(userId, change);
          return result.replay.duplicate
            ? replayApply(stored, applyResult(change))
            : detached(stored);
        }
        return detached(result);
      } catch (error) {
        if (
          commitAcknowledged ||
          (bodyCompleted && !knownCommitRejection(error))
        )
          return reconcileFor(userId, change);
        return failApply(
          applyResult(change),
          "TRANSACTION_FAILED",
          "transaction",
          "blocked",
          "rolled_back",
        );
      }
    },
  };
}
