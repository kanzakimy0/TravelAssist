import { hash, id, invariant } from "./task-086-model.mjs";
export const P36_ARCHIVE_SHA256 =
  "50d92052dd15ccf29fa86bee74b18ce7c95fcb9cb93678395842e67658f26de4";

// Admission is for the reviewed operator component within a named terminal.
// Other operators at the same coordinates are not merged or admitted implicitly.
export function roadTerminalCandidate(
  selector,
  record,
  requirement,
  evidenceRefs,
) {
  const review = selector.terminalIdentity;
  invariant(
    review?.dataset === "P36-23" &&
      review.stopRecordId === record.stopRecordId &&
      selector.name === record.stopName &&
      selector.operator === record.operator &&
      selector.line === "p36-stop:" + record.stopRecordId &&
      selector.mode === "highway_bus",
    "ROAD_TERMINAL_IDENTITY_SELECTOR_MISMATCH",
  );
  invariant(
    requirement?.kind === "bus_terminal" &&
      requirement.requirementId === review.requirementId &&
      requirement.name === record.stopName &&
      requirement.name === review.expectedRequirementName &&
      requirement.nodeId === id("node", requirement.requirementId) &&
      review.method ===
        "EXACT_P36_OPERATOR_COMPONENT_AND_CURRENT_TERMINAL_ACCESS" &&
      review.currentOperatorReview &&
      review.currentPassengerAccessReview &&
      evidenceRefs.length === 2,
    "ROAD_TERMINAL_REQUIREMENT_REVIEW_MISMATCH",
  );
  return {
    identityAnchor: requirement.requirementId,
    canonicalNameJa: record.stopName,
    nodeKind: "bus_terminal",
    nodeLevel: requirement.tier,
    mode: "highway_bus",
    operatorRefs: [record.operator],
    lineRefs: [selector.line],
    operatorReferenceScope:
      "REVIEWED_OPERATOR_STOP_COMPONENT_NOT_ALL_TERMINAL_OPERATORS",
    latitude: record.latitude,
    longitude: record.longitude,
    identityRecord: record,
    origin: "TASK_086_INDEPENDENT_P36_AND_CURRENT_TERMINAL_ACCESS",
    evidenceRefs,
    independentReview: {
      decision: "ADMIT_TASK_086_TOPOLOGY",
      recordSha256: hash(record),
      method: review.method,
      sourceArchiveSha256: P36_ARCHIVE_SHA256,
      currentOperatorReview: review.currentOperatorReview,
      currentPassengerAccessReview: review.currentPassengerAccessReview,
      coordinateScope: record.coordinateScope,
      identityAsOf: record.identityAsOf,
    },
    hubSemantics:
      "OPERATOR_SPECIFIC_TERMINAL_COMPONENT_NO_UNREVIEWED_COLOCATED_TRANSFER",
    parentHubId: null,
    runtimeImportAuthorized: false,
    discoveryCandidateRef: requirement.requirementId.slice("review:".length),
  };
}

// P36 also contains individual airport/highway stops outside the original
// terminal inventory. Keep their archive anchor separate from terminal reviews.
export function roadStopCandidate(selector, record, evidenceRefs, fact) {
  const review = selector.roadStopIdentity;
  invariant(
    !selector.terminalIdentity &&
      review?.dataset === "P36-23" &&
      review.stopRecordId === record.stopRecordId &&
      review.recordSha256 === hash(record) &&
      selector.name === record.stopName &&
      selector.operator === record.operator &&
      selector.line === "p36-stop:" + record.stopRecordId &&
      ["airport_bus", "highway_bus"].includes(selector.mode) &&
      selector.nodeKind === "bus_stop",
    "P36_STOP_IDENTITY_SELECTOR_MISMATCH",
  );
  invariant(
    review.method === "EXACT_P36_OPERATOR_STOP_AND_CURRENT_SERVICE" &&
      review.currentPassengerAccessReview &&
      evidenceRefs.length === 2 &&
      review.coordinateScope === record.coordinateScope &&
      record.coordinateScope ===
        "OPERATOR_STOP_REPRESENTATIVE_NOT_PLATFORM_OR_PRECISE_NAVIGATION",
    "P36_STOP_COMPONENT_REVIEW_REQUIRED",
  );
  const current = review.currentOperatorEvidence;
  const company = (name) =>
    (name ?? "").replace(/株式会社|（株）|\(株\)/gu, "").trim();
  invariant(
    current?.recordOperator === record.operator &&
      current.currentOperatorName &&
      company(current.currentOperatorName) === company(record.operator) &&
      current.currentStopName === record.stopName &&
      /^https?:\/\//.test(current.url ?? "") &&
      /^[a-f0-9]{64}$/.test(current.observedResponseSha256 ?? "") &&
      fact?.corroboratingEvidence?.some(
        (e) =>
          e.url === current.url &&
          e.observedResponseSha256 === current.observedResponseSha256,
      ),
    "P36_STOP_CURRENT_OPERATOR_EVIDENCE_NOT_BOUND",
  );
  return {
    identityAnchor: "p36:23:" + record.stopRecordId,
    canonicalNameJa: record.stopName,
    nodeKind: "bus_stop",
    nodeLevel: "T3",
    mode: selector.mode,
    operatorRefs: [record.operator],
    lineRefs: [selector.line],
    operatorReferenceScope: "EXACT_OPERATOR_ROAD_STOP_NOT_COLOCATED_OPERATORS",
    latitude: record.latitude,
    longitude: record.longitude,
    identityRecord: record,
    origin: "TASK_086_INDEPENDENT_P36_AND_CURRENT_STOP_SERVICE",
    evidenceRefs,
    independentReview: {
      decision: "ADMIT_TASK_086_TOPOLOGY",
      recordSha256: hash(record),
      mode: selector.mode,
      method: review.method,
      sourceArchiveSha256: P36_ARCHIVE_SHA256,
      currentOperatorEvidence: current,
      currentPassengerAccessReview: review.currentPassengerAccessReview,
      coordinateScope: record.coordinateScope,
      identityAsOf: record.identityAsOf,
    },
    hubSemantics:
      "OPERATOR_STOP_REPRESENTATIVE_NO_PLATFORM_OR_UNREVIEWED_TRANSFER",
    parentHubId: null,
    runtimeImportAuthorized: false,
  };
}
