import { hash, invariant } from "./task-086-model.mjs";
export const P11_ARCHIVE_SHA256 =
  "e74da3736c56ddeb1f47c18d6e5f373f40fa7f3c7d695593029e8ac7a7f790d1";

// Only these two current descriptions have an existing reviewed municipal
// identity binding. Neither entry licenses arbitrary suffix/contractor aliases.
const MUNICIPAL_OPERATOR_DESCRIPTIONS = [
  {
    historical: "練馬区",
    current: "練馬区（運行委託：国際興業株式会社）",
    url: "https://www.city.nerima.tokyo.jp/kurashi/sumai/bus/jikokuhyo/hikawadai_timetable.files/20250601_hikawadai.pdf",
    sha256: "436be81afe6b828f2ad09fa5f57ee5d940e55b7b6ab1666c862d703064aedeb0",
  },
  {
    historical: "宇部市",
    current: "宇部市交通局",
    url: "https://ubebus.jp/pages/532/",
    sha256: "1f699a6ace10ebe9542cdacc269a89564dfb498d822fe3e2eae8d27e176983b1",
  },
];
const normalizedLegalName = (name) =>
  typeof name === "string"
    ? name.replaceAll("（株）", "株式会社").replace(/\s+/g, "")
    : "";

export function busStopCandidate(selector, record, evidenceRefs, fact) {
  const review = selector.busIdentity;
  invariant(
    review?.dataset === "P11-22" &&
      review.stopRecordId === record.stopRecordId &&
      review.recordSha256 === hash(record) &&
      selector.name === record.stopName &&
      selector.operator === record.operator &&
      selector.line === "p11-stop:" + record.stopRecordId &&
      ["airport_bus", "local_bus"].includes(selector.mode) &&
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
  const succession = review.currentOperatorSuccessionReview;
  if (Object.hasOwn(review, "currentOperatorSuccessionReview")) {
    invariant(
      succession &&
        typeof succession === "object" &&
        !Array.isArray(succession),
      "P11_OPERATOR_SUCCESSION_REVIEW_NOT_BOUND",
    );
    const proof = succession.evidence;
    const validDate = (date) =>
      /^\d{4}-\d{2}-\d{2}$/.test(date ?? "") &&
      Number.isFinite(Date.parse(date)) &&
      new Date(date).toISOString().slice(0, 10) === date;
    invariant(
      succession.method === "PRIMARY_CORPORATE_SUCCESSION_SAME_PUBLIC_STOP" &&
        succession.recordOperator === record.operator &&
        Array.isArray(succession.predecessorLegalNames) &&
        succession.predecessorLegalNames.includes(
          normalizedLegalName(record.operator),
        ) &&
        succession.currentLegalName === current?.currentOperatorName &&
        succession.physicalStopContinuityReview &&
        validDate(succession.effectiveDate) &&
        validDate(succession.reviewedForServiceDate) &&
        succession.reviewedForServiceDate === fact?.serviceDate &&
        succession.effectiveDate <= succession.reviewedForServiceDate &&
        proof?.currentLegalName === succession.currentLegalName &&
        Array.isArray(proof.predecessorLegalNames) &&
        hash(proof.predecessorLegalNames) ===
          hash(succession.predecessorLegalNames) &&
        proof.effectiveDate === succession.effectiveDate &&
        proof.locator &&
        /^https:\/\//.test(proof.url ?? "") &&
        /^[a-f0-9]{64}$/.test(proof.observedResponseSha256 ?? "") &&
        fact?.corroboratingEvidence?.some(
          (entry) =>
            entry.url === proof.url &&
            entry.observedResponseSha256 === proof.observedResponseSha256,
        ),
      "P11_OPERATOR_SUCCESSION_REVIEW_NOT_BOUND",
    );
  }
  const nameReview = review.currentStopNameReview;
  if (nameReview) {
    invariant(
      nameReview.method === "PRIMARY_HISTORICAL_CURRENT_ROAD_STOP_CONTINUITY" &&
        nameReview.recordStopName === record.stopName &&
        nameReview.currentStopName === current?.currentStopName &&
        nameReview.currentStopName !== record.stopName &&
        nameReview.operator === record.operator &&
        nameReview.physicalContinuityReview &&
        nameReview.historicalEvidence?.url !==
          nameReview.currentEvidence?.url &&
        [
          [nameReview.historicalEvidence, record.stopName],
          [nameReview.currentEvidence, current?.currentStopName],
        ].every(
          ([proof, name]) =>
            proof?.stopName === name &&
            proof.operator === record.operator &&
            proof.locator &&
            /^[a-f0-9]{64}$/.test(proof.observedResponseSha256 ?? "") &&
            fact?.corroboratingEvidence?.some(
              (e) =>
                e.url === proof.url &&
                e.observedResponseSha256 === proof.observedResponseSha256,
            ),
        ) &&
        nameReview.currentEvidence.url === current.url &&
        nameReview.currentEvidence.observedResponseSha256 ===
          current.observedResponseSha256,
      "P11_CURRENT_STOP_NAME_REVIEW_NOT_BOUND",
    );
  }
  invariant(
    current?.recordOperator === record.operator &&
      current.currentOperatorName &&
      (current.currentStopName === record.stopName || nameReview) &&
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
  const historicalName = normalizedLegalName(record.operator);
  const currentName = normalizedLegalName(current.currentOperatorName);
  const municipalDescription = MUNICIPAL_OPERATOR_DESCRIPTIONS.some(
    (entry) =>
      historicalName === entry.historical &&
      currentName === entry.current &&
      current.url === entry.url &&
      current.observedResponseSha256 === entry.sha256,
  );
  // Compare the complete physical-component identity. A real service may be
  // run by one carrier of a combined operator component; fact.operator is not
  // an identity alias and is deliberately not used in this comparison.
  invariant(
    historicalName &&
      currentName &&
      (historicalName === currentName || municipalDescription || succession),
    "P11_OPERATOR_CONTINUITY_REVIEW_REQUIRED",
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
      mode: selector.mode,
      method: review.method,
      sourceArchiveSha256: P11_ARCHIVE_SHA256,
      currentOperatorEvidence: current,
      ...(nameReview ? { currentStopNameReview: nameReview } : {}),
      ...(succession ? { currentOperatorSuccessionReview: succession } : {}),
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
