import "server-only";
import type {
  ChangeSetV0_1,
  EngineIssueV0_1,
  EngineResultV0_1,
} from "../../shared/contracts/engine";
import {
  BOOKING_STATUSES,
  ITEM_KINDS,
  LOCK_LEVELS,
  parseTripPlanSnapshot,
} from "../../shared/contracts/trips";
import { parseEvaluationContext } from "./context";
import { parseChangeSet } from "./input";
import { detached, digest } from "./json";
import { evaluationLoadModel, SUPPORTED_OPERATIONS } from "./registry";
import type { LoadModel } from "./registry";
import { buildReport, finishResult } from "./report";
import { evaluateRules } from "./rules";

export type { EvaluationContext } from "./context";
export type { LoadModel } from "./registry";
export { evaluationLoadModel, RULES } from "./registry";
export { parseChangeSet } from "./input";

function initial(kind: EngineResultV0_1["requestKind"]): EngineResultV0_1 {
  return {
    engineContractVersion: "0.1",
    requestKind: kind,
    outcome: "accepted",
    changeSetId: "invalid-request",
    idempotencyKey: "invalid-request",
    payloadHash: "",
    observedVersion: null,
    resultingVersion: null,
    issues: [],
    confirmationRequirements: [],
    preview: null,
    replay: { duplicate: false, originalChangeSetId: null },
    transaction: { status: "not_started", retryable: false },
  };
}
function issue(
  result: EngineResultV0_1,
  code: string,
  category: EngineIssueV0_1["category"] = "input",
  details: EngineIssueV0_1["details"] = {},
  severity: EngineIssueV0_1["severity"] = "blocking",
  operationId: string | null = null,
  subjectRef: string | null = null,
) {
  result.issues.push({
    code,
    category,
    severity,
    path: null,
    operationId,
    subjectRef,
    retryable: false,
    details,
  });
}
const duplicate = (values: string[]) => new Set(values).size !== values.length;
export function createRuleEngine(
  models: readonly LoadModel[] = [evaluationLoadModel],
) {
  // Registry is trusted executable code, not an input field or dynamically loaded plugin.
  if (
    models.some(
      (m) =>
        [m.ref, m.version, m.unit].some(
          (s) =>
            typeof s !== "string" || s.trim().length === 0 || s.length > 160,
        ) || typeof m.evaluate !== "function",
    )
  )
    throw Error("INVALID_MODEL_METADATA");
  const registry = Object.freeze(
    models
      .map((m) => Object.freeze({ ...m }))
      .sort((a, b) =>
        a.ref + "@" + a.version < b.ref + "@" + b.version ? -1 : 1,
      ),
  );
  if (duplicate(registry.map((m) => m.ref + "@" + m.version)))
    throw Error("DUPLICATE_MODEL_VERSION");
  function run(
    kind: EngineResultV0_1["requestKind"],
    snapshotInput: unknown,
    changeInput: unknown,
    contextInput: unknown,
  ): EngineResultV0_1 {
    const result = initial(kind);
    try {
      const changeRaw = detached(changeInput),
        contextRaw = detached(contextInput);
      const cp = parseChangeSet(changeRaw);
      if (!cp.ok) {
        const unsupported =
          cp.issue.code === "OPERATION_UNSUPPORTED" ||
          (changeRaw !== null &&
            typeof changeRaw === "object" &&
            (Reflect.get(changeRaw, "engineContractVersion") !== "0.1" ||
              Reflect.get(changeRaw, "tripContractVersion") !== "1.0"));
        result.outcome = unsupported ? "unsupported" : "blocked";
        issue(
          result,
          unsupported
            ? cp.issue.code === "OPERATION_UNSUPPORTED"
              ? "OPERATION_UNSUPPORTED"
              : "CONTRACT_VERSION_UNSUPPORTED"
            : "INPUT_INVALID",
        );
        return finishResult(result);
      }
      const change: ChangeSetV0_1 = cp.value;
      result.changeSetId = change.changeSetId;
      result.idempotencyKey = change.idempotencyKey;
      result.payloadHash = digest(change);
      const cc = parseEvaluationContext(contextRaw);
      if (!cc.ok) {
        result.outcome =
          cc.issue.code === "UNSUPPORTED_VALUE" ? "unsupported" : "blocked";
        issue(
          result,
          result.outcome === "unsupported"
            ? "ASSESSMENT_UNSUPPORTED"
            : "ASSESSMENT_INPUT_MISSING",
          "input",
          { dependency: "valid versioned evaluation context" },
        );
        return finishResult(result);
      }
      const ctx = cc.value;
      if (
        !ctx.access.canRead ||
        !ctx.access.canPropose ||
        ctx.access.actorRef !== change.source.actorRef ||
        ctx.access.tripId !== change.target.tripId ||
        ctx.access.planId !== change.target.planId
      ) {
        issue(result, "PERMISSION_DENIED", "authorization");
        return finishResult(result);
      }
      if (kind === "apply" || kind === "rollback") {
        result.outcome = "unsupported";
        issue(
          result,
          kind === "apply" ? "OPERATION_UNSUPPORTED" : "ROLLBACK_OUT_OF_SCOPE",
        );
        return finishResult(result);
      }
      if (change.source.kind !== "user") {
        result.outcome = "unsupported";
        issue(result, "ASSESSMENT_UNSUPPORTED", "authorization", {
          dependency: "AI/autopilot/system proposal policy",
        });
        return finishResult(result);
      }
      const rawSnapshot = detached(snapshotInput),
        sp = parseTripPlanSnapshot(rawSnapshot);
      if (!sp.ok) {
        issue(result, "INPUT_INVALID");
        return finishResult(result);
      }
      const snapshot = sp.value;
      const plan = snapshot.plans.find((p) => p.id === change.target.planId);
      if (snapshot.trip.id !== change.target.tripId || !plan) {
        issue(result, "TARGET_NOT_FOUND");
        return finishResult(result);
      }
      result.observedVersion = {
        tripRevision: snapshot.trip.revision,
        planRevision: plan.revision,
      };
      if (
        change.baseVersion.tripRevision !== snapshot.trip.revision ||
        change.baseVersion.planRevision !== plan.revision
      ) {
        issue(result, "BASE_VERSION_STALE", "version", {
          expectedTripRevision: change.baseVersion.tripRevision,
          actualTripRevision: snapshot.trip.revision,
          expectedPlanRevision: change.baseVersion.planRevision,
          actualPlanRevision: plan.revision,
        });
        return finishResult(result);
      }
      const items = plan.days.flatMap((d) => d.items);
      if (!items.length || items.length > 1000) {
        issue(result, "ASSESSMENT_INPUT_MISSING", "input", {
          dependency: "1–1000 scheduled items",
        });
        return finishResult(result);
      }
      if (
        duplicate(change.operations.map((o) => o.operationId)) ||
        duplicate(change.factRefs.map((f) => f.factId)) ||
        duplicate(ctx.profiles.map((p) => p.itemId)) ||
        duplicate(ctx.days.map((d) => d.dayId)) ||
        duplicate(ctx.openingHours.map((f) => f.itemId)) ||
        duplicate(ctx.routes.map((f) => f.fromItemId + "@" + f.toItemId)) ||
        duplicate(ctx.routes.map((f) => f.fact.factId)) ||
        duplicate(ctx.protectedItemIds)
      ) {
        issue(result, "INPUT_INVALID", "input", {
          constraint: "unique input identities",
        });
        return finishResult(result);
      }
      if (
        ctx.profiles.some((p) => !items.some((i) => i.id === p.itemId)) ||
        ctx.days.some((d) => !plan.days.some((p) => p.id === d.dayId)) ||
        ctx.openingHours.some((f) => !items.some((i) => i.id === f.itemId)) ||
        ctx.protectedItemIds.some((id) => !items.some((i) => i.id === id)) ||
        ctx.routes.some(
          (f) =>
            ![f.fromItemId, f.toItemId].every((id) =>
              items.some((i) => i.id === id),
            ),
        )
      ) {
        issue(result, "TARGET_NOT_FOUND");
        return finishResult(result);
      }
      if (
        items.some(
          (i) =>
            !(LOCK_LEVELS as readonly string[]).includes(i.lockLevel) ||
            !(BOOKING_STATUSES as readonly string[]).includes(
              i.booking.status,
            ) ||
            !(ITEM_KINDS as readonly string[]).includes(i.kind),
        )
      ) {
        result.outcome = "unsupported";
        issue(result, "ASSESSMENT_UNSUPPORTED", "input", {
          dependency: "known canonical codes",
        });
        return finishResult(result);
      }
      const unsupported = change.operations.filter(
        (o) => !(SUPPORTED_OPERATIONS as readonly string[]).includes(o.op),
      );
      if (unsupported.length) {
        result.outcome = "unsupported";
        for (const op of unsupported)
          issue(
            result,
            "OPERATION_UNSUPPORTED",
            "input",
            {
              operation: op.op,
              dependency:
                op.op === "UPDATE_DURATION"
                  ? "4.16/4.17 canonical duration"
                  : "operation capability not enabled in 4.21",
            },
            "blocking",
            op.operationId,
          );
        return finishResult(result);
      }
      const candidate = detached(snapshot),
        next = candidate.plans.find((p) => p.id === plan.id)!;
      for (const op of change.operations) {
        if (op.op === "UPDATE_TIME") {
          const item = next.days
            .flatMap((d) => d.items)
            .find((i) => i.id === op.itemId);
          if (!item) {
            issue(result, "TARGET_NOT_FOUND");
            return finishResult(result);
          }
          if (item.lockLevel === "system_hard_lock") {
            issue(
              result,
              "SYSTEM_HARD_LOCKED",
              "lock",
              {},
              "blocking",
              op.operationId,
              item.id,
            );
            return finishResult(result);
          }
          if (
            ["booking_lock", "payment_lock"].includes(item.lockLevel) ||
            item.booking.status !== "not_required"
          ) {
            // Trusted booking/override grant semantics are still gated by 4.22.
            result.outcome = "unsupported";
            issue(
              result,
              "ASSESSMENT_UNSUPPORTED",
              "booking",
              { dependency: "booking protection / confirmation policy" },
              "blocking",
              op.operationId,
              item.id,
            );
            return finishResult(result);
          }
          if (
            item.lockLevel === "user_lock" ||
            ctx.protectedItemIds.includes(item.id) ||
            ["hotel", "flight", "train"].includes(item.kind)
          )
            issue(
              result,
              item.lockLevel === "user_lock"
                ? "USER_LOCK_CONFIRMATION_REQUIRED"
                : "HARD_TIME_CHANGE_CONFIRMATION_REQUIRED",
              item.lockLevel === "user_lock" ? "lock" : "schedule",
              {},
              "confirmation",
              op.operationId,
              item.id,
            );
          item.schedule = op.schedule;
        } else if (op.op === "REORDER_ITEMS") {
          const day = next.days.find((d) => d.id === op.dayId);
          if (
            !day ||
            op.orderedItemIds.length !== day.items.length ||
            duplicate(op.orderedItemIds) ||
            op.orderedItemIds.some((id) => !day.items.some((i) => i.id === id))
          ) {
            issue(result, "INPUT_INVALID");
            return finishResult(result);
          }
          if (
            day.items.some(
              (i) =>
                i.lockLevel !== "none" ||
                i.booking.status !== "not_required" ||
                ctx.protectedItemIds.includes(i.id),
            )
          ) {
            result.outcome = "unsupported";
            issue(result, "ASSESSMENT_UNSUPPORTED", "lock", {
              dependency: "protected reorder policy",
            });
            return finishResult(result);
          }
          day.items = op.orderedItemIds.map((id) =>
            day.items.find((i) => i.id === id)!,
          );
        }
      }
      const validated = parseTripPlanSnapshot(candidate);
      if (!validated.ok) {
        issue(result, "INVALID_TIMEZONE_OR_INTERVAL", "schedule");
        return finishResult(result);
      }
      const after = validated.value,
        afterPlan = after.plans.find((p) => p.id === plan.id)!;
      const fingerprint = digest({
        before: snapshot,
        after,
        context: ctx,
        registry: registry.map((m) => ({
          ref: m.ref,
          version: m.version,
          unit: m.unit,
        })),
      });
      const reporter = buildReport(result, ctx, fingerprint);
      evaluateRules(afterPlan, plan, ctx, change.factRefs, registry, reporter);
      finishResult(result);
      if (kind === "preview") {
        result.preview = {
          previewHash: digest({
            payloadHash: result.payloadHash,
            contextFingerprint: fingerprint,
          }),
          baseVersion: { ...change.baseVersion },
          affected: {
            dayIds: afterPlan.days.map((d) => d.id),
            itemIds: afterPlan.days.flatMap((d) => d.items.map((i) => i.id)),
            bookingRefs: [],
          },
          before: detached(snapshot),
          after: detached(after),
          impact: {
            scheduleConflicts: [
              ...new Set(
                result.issues
                  .filter((i) =>
                    ["HARD_TIME_CONFLICT", "SOFT_TIME_CONFLICT"].includes(
                      i.code,
                    ),
                  )
                  .flatMap((i) =>
                    [
                      i.details.itemId,
                      i.details.conflictingItemId,
                      i.details.fromItemId,
                      i.details.toItemId,
                      i.subjectRef,
                    ].filter(
                      (id): id is string =>
                        typeof id === "string" &&
                        afterPlan.days.some((d) =>
                          d.items.some((item) => item.id === id),
                        ),
                    ),
                  ),
              ),
            ],
            amountDeltaMinor: null,
            currency: null,
            routeFactsUsed: [
              ...new Set(
                result.assessment!.assessments.flatMap((a) =>
                  a.sourceRefs
                    .filter((f) => f.kind === "provider_fact")
                    .map((f) => f.ref),
                ),
              ),
            ].filter((id) => ctx.routes.some((f) => f.fact.factId === id)),
          },
        };
      }
      return detached(result);
    } catch {
      // Never expose exception text, raw input or partially simulated data.
      const safe = initial(kind);
      issue(safe, "INPUT_INVALID");
      return finishResult(safe);
    }
  }
  return Object.freeze({
    validate: (snapshot: unknown, change: unknown, context: unknown) =>
      run("validate", snapshot, change, context),
    preview: (snapshot: unknown, change: unknown, context: unknown) =>
      run("preview", snapshot, change, context),
  });
}
const engine = createRuleEngine();
export const validate = engine.validate;
export const preview = engine.preview;
