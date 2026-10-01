import { hash, id, invariant } from "./task-086-model.mjs";

export const C28_ARCHIVE_SHA256 =
  "07d69353a34558d7ebd21d4b5f62b685d4f9b9d0e55c6eed6ce05aefcc6b7b35";

// An airport facility reference is not an airline, concessionaire, or terminal.
// Source-era manager class is preserved separately; it is not promoted to a
// current operating company. Current passenger access/service is a second source.
export function airportCandidate(
  selector,
  record,
  requirement,
  evidenceRefs,
  serviceFact,
) {
  const review = selector.airportIdentity;
  invariant(
    review?.dataset === "C28-21" &&
      review.referencePointId === record.referencePointId &&
      selector.name === record.airportName &&
      selector.operator === "airport-facility:" + record.referencePointId &&
      selector.line === "airport:" + record.referencePointId &&
      selector.mode === "flight",
    "AIRPORT_IDENTITY_SELECTOR_MISMATCH",
  );
  const airfieldReview =
    review.method === "REVIEWED_EXACT_OFFICIAL_NAME_WITH_AIRFIELD_SUFFIX";
  const nameEvidence = review.officialNameEvidence;
  if (airfieldReview) {
    invariant(
      nameEvidence?.officialName === record.airportName &&
        nameEvidence.requirementName === requirement?.name &&
        typeof nameEvidence.publicName === "string" &&
        nameEvidence.publicName.startsWith(requirement.name) &&
        nameEvidence.publicName.endsWith("空港") &&
        typeof nameEvidence.url === "string" &&
        /^https:\/\//.test(nameEvidence.url) &&
        /^[a-f0-9]{64}$/.test(nameEvidence.observedResponseSha256 ?? "") &&
        serviceFact?.corroboratingEvidence?.some(
          (e) =>
            e.url === nameEvidence.url &&
            e.observedResponseSha256 === nameEvidence.observedResponseSha256,
        ),
      "AIRPORT_OFFICIAL_NAME_EVIDENCE_MISMATCH",
    );
  }
  invariant(
    requirement?.kind === "airport" &&
      requirement.requirementId === review.requirementId &&
      requirement.name === review.expectedRequirementName &&
      record.airportName ===
        requirement.name + (airfieldReview ? "飛行場" : "空港") &&
      requirement.nodeId === id("node", requirement.requirementId) &&
      (airfieldReview ||
        review.method === "REVIEWED_EXACT_OFFICIAL_NAME_WITH_AIRPORT_SUFFIX") &&
      !!review.currentPassengerAccessReview &&
      evidenceRefs.length === 2,
    "AIRPORT_REQUIREMENT_REVIEW_MISMATCH",
  );
  return {
    identityAnchor: requirement.requirementId,
    canonicalNameJa: record.airportName,
    nodeKind: "airport",
    nodeLevel: requirement.tier,
    mode: "flight",
    operatorRefs: [selector.operator],
    operatorReferenceScope: "AIRPORT_FACILITY_ID_NOT_AIRLINE_OR_CONCESSIONAIRE",
    lineRefs: [selector.line],
    latitude: record.latitude,
    longitude: record.longitude,
    identityRecord: record,
    origin: "TASK_086_INDEPENDENT_C28_AND_CURRENT_ACCESS",
    evidenceRefs,
    independentReview: {
      decision: "ADMIT_TASK_086_TOPOLOGY",
      recordSha256: hash(record),
      method:
        "EXACT_C28_REFERENCE_ID_AND_REVIEWED_REQUIREMENT_PLUS_CURRENT_PRIMARY_ACCESS",
      sourceArchiveSha256: C28_ARCHIVE_SHA256,
      currentPassengerAccessReview: review.currentPassengerAccessReview,
      ...(airfieldReview ? { officialNameEvidence: nameEvidence } : {}),
      coordinateScope: record.coordinateScope,
      identityAsOf: record.identityAsOf,
    },
    hubSemantics: "AIRPORT_FACILITY_GATEWAY_EXPLICIT_TERMINAL_ACCESS_ONLY",
    parentHubId: null,
    runtimeImportAuthorized: false,
    discoveryCandidateRef: requirement.requirementId.slice("review:".length),
  };
}
