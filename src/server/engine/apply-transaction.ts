import "server-only";
import { sql } from "drizzle-orm";
import type { ChangeSetV0_1 } from "../../shared/contracts/engine";
import type { TripPlanSnapshotV1 } from "../../shared/contracts/trips";
import {
  engineApplyReceipts as receipts,
  engineApplyAudits as audits,
  engineApplyOutbox as outbox,
} from "../../db/schema/engine-apply";
import { engineApplyPreimages as preimages } from "../../db/schema/engine-runtime";
import { replaceTripTree, type TripTransaction } from "../trips/transaction";
import { preview } from "./index";
import type { EvaluationContext } from "./context";
import { detached } from "./json";
import { applyResult, failApply } from "./apply-result";
import { capturePreimage } from "./preimage";
export type ApplyContextResolver = (input: {
  actorUserId: string;
  snapshot: TripPlanSnapshotV1;
  change: ChangeSetV0_1;
}) =>
  | Omit<EvaluationContext, "access">
  | Promise<Omit<EvaluationContext, "access">>;

/** Internal shared write primitive. Caller must hold actor/key and current Trip locks under verified RLS. */
export async function applyLocked(
  tx: TripTransaction,
  snapshot: TripPlanSnapshotV1,
  change: ChangeSetV0_1,
  userId: string,
  resolveContext: ApplyContextResolver,
  trustedFactRefs = false,
) {
  const plan = snapshot.plans.find((p) => p.id === change.target.planId)!;
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
    if (trustedFactRefs)
      change.factRefs = [
        ...(context.routes ?? []).map((x) => x.fact),
        ...(context.openingHours ?? []).map((x) => x.fact),
      ];
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
      (i) => i.severity === "blocking" || i.severity === "confirmation",
    );
  if (decision.outcome === "accepted" && !accepted)
    decision = failApply(decision, "TRANSACTION_FAILED", "transaction");
  let preimage: ReturnType<typeof capturePreimage> | null = null;
  if (accepted) {
    const saved = await replaceTripTree(
      tx,
      candidate!.after,
      change.target.planId,
    );
    preimage = capturePreimage(snapshot, saved, change);
    const savedPlan = saved.plans.find((p) => p.id === change.target.planId)!;
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
      resultingTripRevision: decision.resultingVersion!.tripRevision,
      resultingPlanRevision: decision.resultingVersion!.planRevision,
      previewHash: candidate!.previewHash,
      contextFingerprint: decision.assessment!.contextFingerprint,
      operationRefs: change.operations.map((o) => ({
        operationId: o.operationId,
        op: o.op,
      })),
    });
    await tx.insert(preimages).values({
      receiptId: receipt.id,
      preimage: preimage!,
    });
    await tx.insert(outbox).values({ receiptId: receipt.id });
  }
  return { decision, receiptId: receipt.id };
}
