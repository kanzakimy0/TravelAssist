export const OKUSHIRI_TERMS = {
  contractKind: "OKUSHIRI_PUBLIC_OD_CAPABILITY_V1",
  audience: "PUBLIC",
  profile: "PUBLIC_VISITOR",
  channels: ["PHONE", "LINE"],
  reservationRequired: true,
  currentMinimumLeadMinutes: null,
  currentLeadTimeEvidenceStatus: "NOT_PUBLISHED_IN_CURRENT_REVIEWED_SOURCES",
  payment: "NOT_PUBLISHED_IN_REVIEWED_SOURCES",
  publishedReceptionWindows: [
    {
      channels: ["PHONE", "LINE"],
      hours: "24H",
      humanPhoneWindow: ["08:30", "18:30"],
      outsideHumanPhone: "AI_VOICE_RECEPTION",
    },
  ],
  publishedServiceWindows: [["06:00", "23:00"]],
  timeZone: "Asia/Tokyo",
  serviceArea:
    "WHOLE_OKUSHIRI_ISLAND_INCLUDING_AIRPORT_AND_REVIEWED_PUBLIC_FACILITY",
  serviceType: "PUBLIC_AREA_DEMAND_PASSENGER_SERVICE_NOT_FIXED_CALLS",
  operatorAcceptanceRequired: true,
  pickupPlaceAgreementRequired: true,
  dispatchGuarantee: false,
  routePolicy:
    "OPERATOR_DISPATCH_SHARED_PASSENGER_SERVICE_NOT_EXCLUSIVE_DIRECT_TAXI",
  reviewedStructuralDate: "2026-10-05",
  periodStart: "2026-10-01",
  plannedPeriodEnd: "2027-01-31",
  periodEndIsPlanned: true,
  dispatchManagement: "奥尻町",
  driverAlternatives: [
    {
      driver: "YAMATO_SALES_DRIVER",
      hours: ["08:00", "18:30"],
      vehicle: "DELIVERY_WAGON",
      maxPassengers: 4,
    },
    {
      driver: "TOWN_RESIDENT_DRIVER",
      hours: null,
      publishedTiming: "PRIMARILY_EVENING_AND_NIGHT",
      vehicle: "TOWN_MANAGED_OR_LEASED",
      maxPassengers: 9,
    },
  ],
  publishedInitialFareJPY: 700,
  fareBasis: "DISTANCE_BASED_NOT_A_FARE_ENGINE",
  queryUse: "AUDITED_CONDITIONAL_CAPABILITY_ONLY_NOT_ACTUAL_BOOKING",
};
export const isOkushiri = (c) =>
  c?.contractKind === OKUSHIRI_TERMS.contractKind;
export function okushiriFacilityBound(
  node,
  context,
  { canonical, hash, verifyEvidence },
) {
  const n = context.nativeFacilityByAnchor?.get(node?.identityAnchor),
    r = node?.identityRecord;
  if (!n || !r) return false;
  const ep = context.evidence.get(n.currentEndpointEvidenceRef)?.record;
  return (
    node.identityAnchor === "p05:22:01:P05_2451" &&
    r.nativeRecordId === "P05_2451" &&
    r.archiveSha256 ===
      "a99cb2d43ec142724d7d0296982efd9be759b4de93f64ad648725f784e56f521" &&
    r.memberSha256 ===
      "ba97e7929caa0d5c11a08ac742e2fec8e8d382cebdd7c080bc3ed96c7427bb01" &&
    hash(r.feature) ===
      "547b557782f42742e1038a3a3d3d14f8a90fbbdebe292a2ca68c68931fce0472" &&
    canonical(r) === canonical(n.identityRecord) &&
    node.canonicalNameJa === "神威脇生活改善センター" &&
    node.latitude === r.feature.geometry.coordinates[1] &&
    node.longitude === r.feature.geometry.coordinates[0] &&
    node.nodeKind === "public_pickup_facility" &&
    node.mode === "demand_shared_taxi" &&
    canonical(node.operatorRefs) === canonical(["facility:P05-22:P05_2451"]) &&
    canonical(node.lineRefs) === canonical(["facility:P05-22:P05_2451"]) &&
    verifyEvidence(node.evidenceRefs, context.sources, context.evidence) &&
    node.evidenceRefs.some(
      (ref) => canonical(context.evidence.get(ref)?.record) === canonical(r),
    ) &&
    verifyEvidence(
      [n.currentEndpointEvidenceRef],
      context.sources,
      context.evidence,
    ) &&
    canonical(ep?.endpointNames) ===
      canonical(["奥尻空港", "神威脇生活改善センター"]) &&
    ep?.currentOfficeAddress === "北海道奥尻郡奥尻町字湯浜83" &&
    ep?.queryEligibility === "AUDITED_CONDITIONAL_SERVICE_CAPABILITY"
  );
}

export const OKUSHIRI_EXACT_SOURCE = [
  "https://www.kuronekoyamato.co.jp/ytc/info/info_261001_1.html",
  "393f1e6e857c08c615075503f9ff74b9c8e4692e380a6ad8d0012e7f14e51ac4",
];
export function okushiriSourceScope(raw, { canonical }) {
  return (
    raw.sourceUrl === OKUSHIRI_EXACT_SOURCE[0] &&
    raw.observedResponseSha256 === OKUSHIRI_EXACT_SOURCE[1] &&
    canonical(
      raw.conditionObservations.map((o) => [
        o.sourceUrl,
        o.observedResponseSha256,
      ]),
    ) === canonical([OKUSHIRI_EXACT_SOURCE])
  );
}
