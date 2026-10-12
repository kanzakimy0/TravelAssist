// Separate conditional proposition. No actual reservation or numerical cutoff is inferred.
export const AGUNI_TERMS = {
  contractKind: "AGUNI_PUBLIC_OD_CAPABILITY_V1",
  audience: "PUBLIC",
  profile: "PUBLIC_VISITOR",
  channel: "PHONE",
  reservationRequired: true,
  currentMinimumLeadMinutes: null,
  currentLeadTimeEvidenceStatus: "NOT_PUBLISHED_IN_CURRENT_REVIEWED_SOURCES",
  payment: "NOT_PUBLISHED_IN_REVIEWED_SOURCES",
  publishedReceptionWindows: [
    {
      source: "access.html",
      start: "08:30",
      end: "16:15",
    },
    {
      source: "bus-timetable.pdf",
      start: "08:00",
      end: "16:15",
    },
  ],
  publishedServiceWindows: [
    {
      source: "access.html",
      windows: [["08:30", "16:30"]],
    },
    {
      source: "bus-timetable.pdf",
      windows: [
        ["10:30", "11:20"],
        ["12:35", "17:00"],
      ],
    },
  ],
  timeZone: "Asia/Tokyo",
  serviceArea: "AGUNI_HAMA_NISHI_HIGASHI_INCLUDING_AIRPORT",
  serviceType: "SHARED_AREA_DEMAND_PASSENGER_SERVICE_NOT_FIXED_CALLS",
  operatorAcceptanceRequired: true,
  pickupPlaceAgreementRequired: true,
  dispatchGuarantee: false,
  routePolicy: "SHARED_RIDE_VIA_OPERATOR_ROUTE_NOT_EXCLUSIVE_DIRECT_TAXI",
  reviewedStructuralDate: "2026-10-17",
  validToClaim: null,
  queryUse: "AUDITED_CONDITIONAL_CAPABILITY_ONLY_NOT_ACTUAL_BOOKING",
};
export const isAguni = (c) => c?.contractKind === AGUNI_TERMS.contractKind;
export function aguniFacilityBound(
  node,
  context,
  { canonical, hash, verifyEvidence },
) {
  const n = context.nativeFacilityByAnchor?.get(node?.identityAnchor),
    r = node?.identityRecord;
  if (!n || !r) return false;
  const ep = context.evidence.get(n.currentEndpointEvidenceRef)?.record;
  return (
    node.identityAnchor === "p05:22:47:P05_845" &&
    r.nativeRecordId === "P05_845" &&
    r.archiveSha256 ===
      "9c1dd233fb7a71ecb0e36a173696b63375a57ca12487efacfe162356e96010e8" &&
    r.memberSha256 ===
      "358cab1d04ad6ef4693f443274245c13a33bd26d9f9520f65100068f23a1c8e9" &&
    hash(r.feature) ===
      "ad7a0fba7b01129e962602747dd16575e6f2e5230db8cc9e295a1b7aff1a0fad" &&
    canonical(r) === canonical(n.identityRecord) &&
    node.canonicalNameJa === "粟国村役場" &&
    node.latitude === r.feature.geometry.coordinates[1] &&
    node.longitude === r.feature.geometry.coordinates[0] &&
    node.nodeKind === "public_pickup_facility" &&
    node.mode === "demand_shared_taxi" &&
    canonical(node.operatorRefs) === canonical(["facility:P05-22:P05_845"]) &&
    canonical(node.lineRefs) === canonical(["facility:P05-22:P05_845"]) &&
    verifyEvidence(node.evidenceRefs, context.sources, context.evidence) &&
    node.evidenceRefs.some(
      (ref) => canonical(context.evidence.get(ref)?.record) === canonical(r),
    ) &&
    verifyEvidence(
      [n.currentEndpointEvidenceRef],
      context.sources,
      context.evidence,
    ) &&
    canonical(ep?.endpointNames) === canonical(["粟国空港", "粟国村役場"]) &&
    ep?.currentOfficeAddress === "沖縄県島尻郡粟国村字東483番地" &&
    ep?.queryEligibility === "AUDITED_CONDITIONAL_SERVICE_CAPABILITY"
  );
}

export const AGUNI_EXACT_CONDITION_SOURCES = [
  [
    "https://www.vill.aguni.okinawa.jp/sonsei/60.html",
    "7018d3970cf08b70b4a0778210305c912c18e98517c18696c0acb5eb9932114b",
  ],
  [
    "https://www.vill.aguni.okinawa.jp/material/files/group/1/7_kousinnsinnsei_R7_1.pdf",
    "c2a8a1a256c40a9e150f9b34be5668903bdbb8cbcb64db021b27a9ef8f524abc",
  ],
  [
    "https://www.vill.aguni.okinawa.jp/material/files/group/1/3_hyou1_R8_1.pdf",
    "e7780fc7b56e3c3d298ce24a0f8cd352a718373e9e4365f45c5582e44d5384b4",
  ],
];
export function aguniSourceScope(raw, { canonical }) {
  return (
    raw.sourceUrl === AGUNI_EXACT_CONDITION_SOURCES[0][0] &&
    raw.observedResponseSha256 === AGUNI_EXACT_CONDITION_SOURCES[0][1] &&
    canonical(
      raw.conditionObservations
        .map((o) => [o.sourceUrl, o.observedResponseSha256])
        .sort(),
    ) === canonical([...AGUNI_EXACT_CONDITION_SOURCES].sort())
  );
}
