import type {
  ChangeSetV0_1,
  EngineIssueV0_1,
  EngineResultV0_1,
} from "../../shared/contracts/engine";
import { requireUuid } from "../trips/projection";
import { parseChangeSet } from "./input";
import { detached, digest } from "./json";

export function applyResult(change?: ChangeSetV0_1): EngineResultV0_1 {
  return {
    engineContractVersion: "0.1",
    requestKind: "apply",
    outcome: "accepted",
    changeSetId: change?.changeSetId ?? "invalid-request",
    idempotencyKey: change?.idempotencyKey ?? "invalid-request",
    payloadHash: change ? digest(change) : "",
    observedVersion: null,
    resultingVersion: null,
    issues: [],
    confirmationRequirements: [],
    preview: null,
    replay: { duplicate: false, originalChangeSetId: null },
    transaction: { status: "not_started", retryable: false },
  };
}
export function failApply(
  result: EngineResultV0_1,
  code: string,
  category: EngineIssueV0_1["category"],
  outcome: EngineResultV0_1["outcome"] = "blocked",
  status: EngineResultV0_1["transaction"]["status"] = "not_started",
) {
  result.outcome = outcome;
  result.resultingVersion = null;
  result.preview = null;
  result.transaction = {
    status,
    retryable: status === "rolled_back" || status === "outcome_unknown",
  };
  result.issues.push({
    code,
    category,
    severity: "blocking",
    path: null,
    operationId: null,
    subjectRef: null,
    retryable: result.transaction.retryable,
    details: {},
  });
  return result;
}
export function prepareApply(
  input: unknown,
):
  | { change: ChangeSetV0_1; result: EngineResultV0_1 }
  | { change: null; result: EngineResultV0_1 } {
  try {
    const parsed = parseChangeSet(detached(input));
    if (!parsed.ok) {
      const unsupported =
        parsed.issue.code === "OPERATION_UNSUPPORTED" ||
        parsed.issue.path.endsWith("ContractVersion");
      return {
        change: null,
        result: failApply(
          applyResult(),
          unsupported ? "OPERATION_UNSUPPORTED" : "INPUT_INVALID",
          "input",
          unsupported ? "unsupported" : "blocked",
        ),
      };
    }
    const change = parsed.value;
    requireUuid(change.target.tripId);
    requireUuid(change.target.planId);
    if (!change.operations.length) throw Error("EMPTY_OPERATIONS");
    return { change, result: applyResult(change) };
  } catch {
    return {
      change: null,
      result: failApply(applyResult(), "INPUT_INVALID", "input"),
    };
  }
}
export function replayApply(
  stored: EngineResultV0_1,
  incoming: EngineResultV0_1,
) {
  if (stored.payloadHash !== incoming.payloadHash)
    return failApply(incoming, "IDEMPOTENCY_KEY_REUSED", "idempotency");
  const replay = detached(stored);
  replay.replay = { duplicate: true, originalChangeSetId: stored.changeSetId };
  return replay;
}
