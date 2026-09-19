/** Additive WBS 4.23 domain contracts. ChangeSetV0_1 stays frozen. */
import type { EngineOutcome, ChangeSetV0_1 } from "./index";
import {
  boolean,
  integer,
  invalid,
  list,
  nullable,
  object,
  oneOf,
  parse,
  refine,
  text,
} from "../trips/validation";
export const runtimeId = refine(text(160), (v, p) => {
  if (/\s/.test(v)) invalid(p, "INVALID_ID");
});
export const runtimeUuid = refine(text(36), (v, p) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v))
    invalid(p, "INVALID_UUID");
});
export const revisionPair = object({
  tripRevision: integer(1),
  planRevision: integer(1),
});
export const issueCodes = refine(
  list(
    refine(text(64), (v, p) => {
      if (!/^[A-Z][A-Z0-9_]*$/.test(v)) invalid(p, "INVALID_ISSUE_CODE");
    }),
    32,
  ),
  (v, p) => {
    if (
      new Set(v).size !== v.length ||
      v.some((x, i) => i > 0 && x <= v[i - 1])
    )
      invalid(p, "NONCANONICAL_CODES");
  },
);
export const rollbackRequestV1 = object({
  rollbackContractVersion: oneOf(["4.23-rollback-1"]),
  requestId: runtimeId,
  idempotencyKey: runtimeId,
  originalReceiptId: runtimeUuid,
  actorRef: runtimeUuid,
  correlationId: nullable(runtimeId),
  reason: text(1000),
});
export type RollbackRequestV1 = ReturnType<typeof rollbackRequestV1>;
export const parseRollbackRequest = (input: unknown) =>
  parse(rollbackRequestV1, input);
export type RollbackResultV1 = {
  rollbackContractVersion: "4.23-rollback-1";
  requestId: string;
  idempotencyKey: string;
  originalReceiptId: string;
  outcome: EngineOutcome;
  issueCodes: string[];
  observedVersion: ChangeSetV0_1["baseVersion"] | null;
  resultingVersion: ChangeSetV0_1["baseVersion"] | null;
  applyReceiptId: string | null;
  replay: { duplicate: boolean };
  transaction: {
    status: "not_started" | "committed" | "rolled_back" | "outcome_unknown";
  };
};
export const runtimeResultV1 = refine(
  object({
    runtimeContractVersion: oneOf(["4.23-runtime-1"]),
    eventId: runtimeUuid,
    eventType: oneOf(["engine.apply.accepted.v0.1"]),
    originalReceiptId: runtimeUuid,
    changeSetId: runtimeId,
    actorRef: runtimeUuid,
    target: object({ tripId: runtimeUuid, planId: runtimeUuid }),
    originalResultingVersion: revisionPair,
    currentObservedVersion: nullable(revisionPair),
    processingState: oneOf(["processed", "terminal_failure"]),
    recomputeStatus: oneOf([
      "accepted",
      "blocked",
      "unsupported",
      "needsConfirmation",
      "failed",
    ]),
    fingerprint: refine(text(64), (v, p) => {
      if (!/^[0-9a-f]{64}$/.test(v)) invalid(p, "INVALID_HASH");
    }),
    issueCodes,
    issuesTruncated: boolean,
  }),
  (v, p) => {
    if (
      v.eventId !== v.originalReceiptId ||
      (v.processingState === "terminal_failure") !==
        (v.recomputeStatus === "failed") ||
      (v.processingState === "processed" && v.currentObservedVersion === null)
    )
      invalid(p, "INVALID_RUNTIME_RESULT");
  },
);
export type RuntimeResultV1 = ReturnType<typeof runtimeResultV1>;
export const parseRuntimeResult = (input: unknown) =>
  parse(runtimeResultV1, input);
/** Parsers construct a fixed field order and reject extensions; stable wire bytes. */
export function serializeRuntimeResult(input: unknown): string {
  const p = parseRuntimeResult(input);
  if (!p.ok) throw Error(p.issue.code);
  return JSON.stringify(p.value);
}
export function serializeRollbackRequest(input: unknown): string {
  const p = parseRollbackRequest(input);
  if (!p.ok) throw Error(p.issue.code);
  return JSON.stringify(p.value);
}

export const rollbackResultV1 = refine(
  object({
    rollbackContractVersion: oneOf(["4.23-rollback-1"]),
    requestId: runtimeId,
    idempotencyKey: runtimeId,
    originalReceiptId: refine(runtimeId, (v, p) => {
      if (v !== "invalid-request") runtimeUuid(v, p);
    }),
    outcome: oneOf(["accepted", "blocked", "unsupported", "needsConfirmation"]),
    issueCodes,
    observedVersion: nullable(revisionPair),
    resultingVersion: nullable(revisionPair),
    applyReceiptId: nullable(runtimeUuid),
    replay: object({ duplicate: boolean }),
    transaction: object({
      status: oneOf([
        "not_started",
        "committed",
        "rolled_back",
        "outcome_unknown",
      ]),
    }),
  }),
  (v, p) => {
    if (v.outcome === "accepted") {
      if (
        !v.observedVersion ||
        !v.resultingVersion ||
        !v.applyReceiptId ||
        v.transaction.status !== "committed" ||
        v.resultingVersion.tripRevision <= v.observedVersion.tripRevision ||
        v.resultingVersion.planRevision <= v.observedVersion.planRevision
      )
        invalid(p, "INVALID_ROLLBACK_RESULT");
    } else if (
      v.resultingVersion !== null ||
      v.transaction.status === "committed"
    )
      invalid(p, "INVALID_ROLLBACK_RESULT");
  },
);
export const parseRollbackResult = (input: unknown) =>
  parse(rollbackResultV1, input);
export function serializeRollbackResult(input: unknown): string {
  const p = parseRollbackResult(input);
  if (!p.ok) throw Error(p.issue.code);
  return JSON.stringify(p.value);
}
