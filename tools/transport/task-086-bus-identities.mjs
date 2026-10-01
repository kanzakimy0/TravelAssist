import { hash, invariant } from "./task-086-model.mjs";
export const P11_ARCHIVE_SHA256 =
  "e74da3736c56ddeb1f47c18d6e5f373f40fa7f3c7d695593029e8ac7a7f790d1";

export function busStopCandidate(selector, record, evidenceRefs, fact) {
  const review = selector.busIdentity;
  invariant(
    review?.dataset === "P11-22" &&
      review.stopRecordId === record.stopRecordId &&
      review.recordSha256 === hash(record) &&
      selector.name === record.stopName &&
      selector.operator === record.operator &&
      selector.line === "p11-stop:" + record.stopRecordId &&
      selector.mode === "airport_bus" &&
      selector.nodeKind === "bus_stop",
    "P11_IDENTITY_SELECTOR_MISMATCH",
  );
  invariant(
    review.method === "EXACT_P11_OPERATOR_STOP_AND_CURRENT_SERVICE" &&
      review.currentPassengerAccessReview &&
      evidenceRefs.length === 2 &&
      review.coordinateScope === record.coordinateScope &&
      record.coordinateScope ===
        "SAME_OPERATOR_ROAD_STOP_REPRESENTATIVE_NOT_PLATFORM_OR_ENTRANCE",
    "P11_COMPONENT_REVIEW_REQUIRED",
  );
  const current = review.currentOperatorEvidence;
  invariant(
    current?.recordOperator === record.operator &&
      current.currentOperatorName &&
      current.currentStopName === record.stopName &&
      current.historicalRoute &&
      record.historicalRoutes.some((r) => r.name === current.historicalRoute) &&
      /^[a-f0-9]{64}$/.test(current.observedResponseSha256 ?? "") &&
      fact?.corroboratingEvidence?.some(
        (r) =>
          r.url === current.url &&
          r.observedResponseSha256 === current.observedResponseSha256,
      ),
    "P11_CURRENT_OPERATOR_EVIDENCE_NOT_BOUND",
  );
  return {
    identityAnchor: "p11:22:" + record.stopRecordId,
    canonicalNameJa: record.stopName,
    nodeKind: "bus_stop",
    nodeLevel: "T3",
    mode: selector.mode,
    operatorRefs: [record.operator],
    lineRefs: [selector.line],
    operatorReferenceScope:
      "EXACT_OPERATOR_ROAD_STOP_COMPONENT_NOT_COLOCATED_OPERATORS",
    latitude: record.latitude,
    longitude: record.longitude,
    identityRecord: record,
    origin: "TASK_086_INDEPENDENT_P11_AND_CURRENT_SERVICE",
    evidenceRefs,
    independentReview: {
      decision: "ADMIT_TASK_086_TOPOLOGY",
      recordSha256: hash(record),
      method: review.method,
      sourceArchiveSha256: P11_ARCHIVE_SHA256,
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
