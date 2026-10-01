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
  const publicAliasReview =
    review.method === "REVIEWED_EXPLICIT_AIRFIELD_PUBLIC_NAME_ALIAS";
  const airfieldReview =
    publicAliasReview ||
    review.method === "REVIEWED_EXACT_OFFICIAL_NAME_WITH_AIRFIELD_SUFFIX";
  const newAirportReview =
    review.method === "REVIEWED_EXACT_OFFICIAL_NEW_AIRPORT_PREFIX";
  const nameEvidence = review.officialNameEvidence;
  const boundReference = (ref) =>
    typeof ref?.url === "string" &&
    /^https:\/\//.test(ref.url) &&
    /^[a-f0-9]{64}$/.test(ref.observedResponseSha256 ?? "") &&
    serviceFact?.corroboratingEvidence?.some(
      (e) =>
        e.url === ref.url &&
        e.observedResponseSha256 === ref.observedResponseSha256,
    );
  if (airfieldReview || newAirportReview) {
    invariant(
      nameEvidence?.officialName === record.airportName &&
        nameEvidence.requirementName === requirement?.name &&
        typeof nameEvidence.publicName === "string" &&
        (newAirportReview
          ? nameEvidence.publicName === requirement.name + "空港"
          : nameEvidence.publicName.endsWith("空港") &&
            (publicAliasReview
              ? nameEvidence.equivalenceKind ===
                  "EXPLICIT_PRIMARY_FORMAL_AND_PUBLIC_NAME" &&
                typeof nameEvidence.locator === "string" &&
                nameEvidence.locator.trim().length > 0 &&
                serviceFact?.reviewedAirportPublicNames?.includes(
                  nameEvidence.publicName,
                )
              : nameEvidence.publicName.startsWith(requirement.name))) &&
        boundReference(nameEvidence),
      "AIRPORT_OFFICIAL_NAME_EVIDENCE_MISMATCH",
    );
  }
  const closure = review.predecessorClosureEvidence;
  if (newAirportReview) {
    invariant(
      closure?.currentReferencePointId === record.referencePointId &&
        closure.closedPredecessorName === requirement?.name + "空港" &&
        closure.closedPredecessorExcluded === true &&
        Number.isInteger(closure.closureYear) &&
        closure.closureYear >= 1900 &&
        closure.closureYear < Number(record.identityAsOf?.slice(0, 4)) &&
        boundReference(closure),
      "AIRPORT_CLOSED_PREDECESSOR_NOT_EXCLUDED",
    );
  }
  invariant(
    requirement?.kind === "airport" &&
      requirement.requirementId === review.requirementId &&
      requirement.name === review.expectedRequirementName &&
      record.airportName ===
        (newAirportReview ? "新" : "") +
          requirement.name +
          (airfieldReview ? "飛行場" : "空港") &&
      requirement.nodeId === id("node", requirement.requirementId) &&
      (airfieldReview ||
        newAirportReview ||
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
      ...(airfieldReview || newAirportReview
        ? { officialNameEvidence: nameEvidence }
        : {}),
      ...(newAirportReview ? { predecessorClosureEvidence: closure } : {}),
      coordinateScope: record.coordinateScope,
      identityAsOf: record.identityAsOf,
    },
    hubSemantics: "AIRPORT_FACILITY_GATEWAY_EXPLICIT_TERMINAL_ACCESS_ONLY",
    parentHubId: null,
    runtimeImportAuthorized: false,
    discoveryCandidateRef: requirement.requirementId.slice("review:".length),
  };
}
