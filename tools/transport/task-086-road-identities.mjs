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
