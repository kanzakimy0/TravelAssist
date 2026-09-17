import "server-only";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { ChangeSetV0_1 } from "../../shared/contracts/engine";
import {
  parseRuntimeResult,
  type RuntimeResultV1,
} from "../../shared/contracts/engine/runtime";
import { getDb } from "../../db";
import {
  engineApplyReceipts as receipts,
  engineApplyOutbox as outbox,
} from "../../db/schema/engine-apply";
import { engineRuntimeResults as results } from "../../db/schema/engine-runtime";
import { readTree, setTripActor } from "../trips/transaction";
import { TripPersistenceError } from "../trips/projection";
import { validate } from "./index";
import type { ApplyContextResolver } from "./apply-transaction";
import { detached, digest } from "./json";
export const LOCAL_RUNTIME_POLICY = Object.freeze({
  leaseSeconds: 60,
  retrySeconds: 5,
  maxAttempts: 3,
});
type Db = ReturnType<typeof getDb>;
/** Internal server capability only; never deserialize a browser claim/token. */
export type RuntimeClaim = {
  eventId: string;
  token: string;
  exhausted: boolean;
};
type Summary = Pick<
  RuntimeResultV1,
  | "currentObservedVersion"
  | "recomputeStatus"
  | "fingerprint"
  | "issueCodes"
  | "issuesTruncated"
>;
export function summarizeRecompute(
  snapshot: Parameters<typeof validate>[0],
  change: ChangeSetV0_1,
  context: Parameters<typeof validate>[2],
): Summary {
  const assessment = validate(snapshot, change, context);
  const codes = [...new Set(assessment.issues.map((i) => i.code))].sort();
  const summary = {
    currentObservedVersion: assessment.observedVersion ?? change.baseVersion,
    recomputeStatus: assessment.outcome,
    issueCodes: codes.slice(0, 32),
    issuesTruncated: codes.length > 32,
  };
  return {
    ...summary,
    fingerprint: digest({
      summary,
      contextFingerprint:
        assessment.assessment?.contextFingerprint ??
        digest({ snapshot, context }),
    }),
  };
}
export function createLocalEngineRuntime(
  resolveContext: ApplyContextResolver,
  database: () => Db = getDb,
) {
  async function claim(): Promise<RuntimeClaim | null> {
    return database().transaction(
      async (tx) => {
        const rows = await tx.execute<{
          receipt_id: string;
          attempts: number;
        }>(sql`
    select receipt_id,attempts from public.engine_apply_outbox
    where (status in ('pending','retryable_failure') and available_at<=clock_timestamp())
       or (status='processing' and lease_expires_at<=clock_timestamp())
    order by created_at,receipt_id for update skip locked limit 1`);
        const row = rows[0];
        if (!row) return null;
        const token = randomUUID();
        await tx
          .update(outbox)
          .set({
            status: "processing",
            attempts: Math.min(
              row.attempts + 1,
              LOCAL_RUNTIME_POLICY.maxAttempts,
            ),
            leaseToken: token,
            leaseExpiresAt: sql`clock_timestamp()+make_interval(secs=>${LOCAL_RUNTIME_POLICY.leaseSeconds})`,
            failureCode: null,
          })
          .where(eq(outbox.receiptId, row.receipt_id));
        return {
          eventId: row.receipt_id,
          token,
          exhausted: row.attempts >= LOCAL_RUNTIME_POLICY.maxAttempts,
        };
      },
      { isolationLevel: "read committed" },
    );
  }
  async function processClaim(c: RuntimeClaim) {
    let summary: Summary | null = null;
    let failure:
      "CONTEXT_UNAVAILABLE" | "TARGET_UNAVAILABLE" | "RETRY_EXHAUSTED" | null =
      c.exhausted ? "RETRY_EXHAUSTED" : null;
    // An expired/replaced token cannot publish a result; evaluation itself has no Trip writes.
    const [active] = await database()
      .select()
      .from(outbox)
      .where(
        and(
          eq(outbox.receiptId, c.eventId),
          eq(outbox.leaseToken, c.token),
          sql`${outbox.leaseExpiresAt}>clock_timestamp()`,
        ),
      );
    if (!active) return { state: "lease_lost" as const, event: null };
    if (!failure)
      try {
        summary = await database().transaction(
          async (tx) => {
            const [receipt] = await tx
              .select()
              .from(receipts)
              .where(eq(receipts.id, c.eventId));
            if (!receipt) throw new TripPersistenceError("NOT_FOUND");
            await setTripActor(tx, receipt.actorUserId);
            const snapshot = await readTree(tx, receipt.tripId);
            const plan = snapshot.plans.find((p) => p.id === receipt.planId);
            if (!plan) throw new TripPersistenceError("NOT_FOUND");
            const change: ChangeSetV0_1 = {
              engineContractVersion: "0.1",
              tripContractVersion: "1.0",
              changeSetId: "runtime-recompute",
              idempotencyKey: "runtime-recompute",
              target: { tripId: receipt.tripId, planId: receipt.planId },
              baseVersion: {
                tripRevision: snapshot.trip.revision,
                planRevision: plan.revision,
              },
              source: {
                kind: "user",
                actorRef: receipt.actorUserId,
                correlationId: null,
                proposalRef: null,
              },
              reason: "Read-only current Plan assessment",
              operations: [],
              factRefs: [],
            };
            const context = detached(
              await resolveContext({
                actorUserId: receipt.actorUserId,
                snapshot: detached(snapshot),
                change: detached(change),
              }),
            );
            // Facts come solely from the trusted resolver; 4.21 validates each RouteResponse via 7.5.
            change.factRefs = [
              ...(context.routes ?? []).map((x) => x.fact),
              ...(context.openingHours ?? []).map((x) => x.fact),
            ];
            const result = summarizeRecompute(snapshot, change, {
              ...context,
              access: {
                actorRef: receipt.actorUserId,
                tripId: receipt.tripId,
                planId: receipt.planId,
                canRead: true,
                canPropose: true,
              },
            });
            // Invalid context may be rejected before 4.21 emits observedVersion; the DB read is still authoritative.
            result.currentObservedVersion = change.baseVersion;
            return result;
          },
          { isolationLevel: "repeatable read" },
        );
      } catch (e) {
        failure =
          e instanceof TripPersistenceError && e.code === "NOT_FOUND"
            ? "TARGET_UNAVAILABLE"
            : "CONTEXT_UNAVAILABLE";
      }
    return database().transaction(
      async (tx) => {
        const [row] = await tx
          .select()
          .from(outbox)
          .where(
            and(
              eq(outbox.receiptId, c.eventId),
              eq(outbox.leaseToken, c.token),
              sql`${outbox.leaseExpiresAt}>clock_timestamp()`,
            ),
          )
          .for("update");
        if (!row) return { state: "lease_lost" as const, event: null };
        if (
          failure === "CONTEXT_UNAVAILABLE" &&
          row.attempts < LOCAL_RUNTIME_POLICY.maxAttempts
        ) {
          await tx
            .update(outbox)
            .set({
              status: "retryable_failure",
              failureCode: failure,
              leaseToken: null,
              leaseExpiresAt: null,
              availableAt: sql`clock_timestamp()+make_interval(secs=>${LOCAL_RUNTIME_POLICY.retrySeconds})`,
            })
            .where(eq(outbox.receiptId, c.eventId));
          return { state: "retryable_failure" as const, event: null };
        }
        const terminalFailure = failure !== null;
        if (terminalFailure)
          summary = {
            currentObservedVersion: null,
            recomputeStatus: "failed",
            fingerprint: digest({ runtime: "4.23-runtime-1", failure }),
            issueCodes: [failure!],
            issuesTruncated: false,
          };
        const value = summary!;
        const [receipt] = await tx
          .select()
          .from(receipts)
          .where(eq(receipts.id, c.eventId));
        const event: RuntimeResultV1 = {
          runtimeContractVersion: "4.23-runtime-1",
          eventId: receipt.id,
          eventType: "engine.apply.accepted.v0.1",
          originalReceiptId: receipt.id,
          changeSetId: receipt.changeSetId,
          actorRef: receipt.actorUserId,
          target: { tripId: receipt.tripId, planId: receipt.planId },
          originalResultingVersion: receipt.result.resultingVersion!,
          processingState: terminalFailure ? "terminal_failure" : "processed",
          ...value,
        };
        const parsed = parseRuntimeResult(event);
        if (!parsed.ok) throw Error("INVALID_RUNTIME_RESULT");
        await tx.insert(results).values({
          receiptId: receipt.id,
          observedTripRevision:
            value.currentObservedVersion?.tripRevision ?? null,
          observedPlanRevision:
            value.currentObservedVersion?.planRevision ?? null,
          recomputeStatus: value.recomputeStatus,
          fingerprint: value.fingerprint,
          issueCodes: value.issueCodes,
          issuesTruncated: value.issuesTruncated,
        });
        await tx
          .update(outbox)
          .set({
            status: event.processingState,
            failureCode: failure,
            leaseToken: null,
            leaseExpiresAt: null,
            finishedAt: sql`clock_timestamp()`,
          })
          .where(eq(outbox.receiptId, c.eventId));
        return { state: event.processingState, event: parsed.value };
      },
      { isolationLevel: "read committed" },
    );
  }
  return {
    claim,
    processClaim,
    async processNext() {
      const c = await claim();
      return c ? processClaim(c) : { state: "idle" as const, event: null };
    },
  };
}
