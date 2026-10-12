// Private exact facility adapter; OSM geography never proves a service or public passage.
export function createPriciaFacility({
  hash,
  canonical,
  invariant,
  verifyEvidence,
}) {
  const ORIGIN = "TASK_086_OFFICIAL_PRIVATE_HOTEL_AND_OSM";
  const expected = {
    nativeElementType: "way",
    nativeElementId: "1353020075",
    nativeElementVersion: 2,
    nativeTimestamp: "2025-07-08T06:00:53Z",
    tags: { building: "yes", name: "プリシアリゾートヨロン", tourism: "hotel" },
    nodeRefs: [
      "12519254297",
      "12519254298",
      "12519254299",
      "12519254300",
      "12519269601",
      "12519269602",
      "12519269603",
      "12519269604",
      "12519269605",
      "12519269606",
      "12519269607",
      "12519269608",
      "12519269609",
      "12519269610",
      "12519269611",
      "12519269612",
      "12519254297",
    ],
    coordinates: [
      [128.3983104, 27.0489954],
      [128.398319, 27.0490444],
      [128.3982882, 27.0490488],
      [128.3983066, 27.0491532],
      [128.3983329, 27.0491495],
      [128.3983503, 27.0492486],
      [128.3986113, 27.0492121],
      [128.3986044, 27.0491729],
      [128.3987537, 27.049152],
      [128.398739, 27.0490685],
      [128.3986573, 27.0490799],
      [128.3986474, 27.0490241],
      [128.3986789, 27.0490197],
      [128.3986704, 27.048972],
      [128.3984566, 27.0490019],
      [128.398452, 27.0489755],
      [128.3983104, 27.0489954],
    ],
    representativeCoordinate: {
      longitude: 128.39849912942222,
      latitude: 27.049103200354747,
      method: "PLANAR_POLYGON_AREA_CENTROID_NATIVE_WGS84_VERTICES",
      insideNativePolygonVerified: true,
      scope:
        "NAMED_HOTEL_FACILITY_REPRESENTATIVE_ONLY_NOT_RECEPTION_CURB_NAVIGATION",
    },
    nativeResponseSha256:
      "bee8c040baf0a7315236deb67e15d4fe3866c07a27b26d19bffc038fb31c63b1",
    attribution: "© OpenStreetMap contributors",
    license: "ODbL 1.0",
    notClaimed: [
      "Actual pickup at centroid",
      "Public road access",
      "Bus stopping permission",
      "Hotel-building vertex is a boarding pole",
    ],
  };
  function create({
    nativeBytes,
    identityRecord,
    nativeEvidenceRef,
    endpointEvidenceRef,
    sources,
    evidence,
  }) {
    invariant(
      hash(nativeBytes) === expected.nativeResponseSha256,
      "HOTEL_NATIVE_BYTES_CHANGED",
    );
    invariant(
      canonical(identityRecord) === canonical(expected),
      "HOTEL_NATIVE_RECORD_CHANGED",
    );
    const refs = [nativeEvidenceRef, endpointEvidenceRef],
      native = evidence.get(nativeEvidenceRef),
      endpoint = evidence.get(endpointEvidenceRef);
    invariant(
      verifyEvidence(refs, sources, evidence),
      "HOTEL_SOURCE_RIGHTS_OR_BINDING",
    );
    invariant(
      sources.get(native.sourceId)?.url ===
        "https://api.openstreetmap.org/api/0.6/map?bbox=128.395,27.047,128.402,27.052" &&
        sources.get(endpoint.sourceId)?.url === endpoint.record.sourceUrl &&
        native.sourceSha256 === expected.nativeResponseSha256 &&
        canonical(native.record) === canonical(expected),
      "HOTEL_NATIVE_EVIDENCE",
    );
    invariant(
      endpoint.record.kind === "REVIEWED_PRIVATE_HOTEL_SHUTTLE_ENDPOINT" &&
        endpoint.record.hotelName === expected.tags.name &&
        endpoint.record.address === "鹿児島県大島郡与論町立長358-1" &&
        endpoint.record.pickupScope === "HOTEL_FRONT_FACILITY_NOT_OSM_POINT" &&
        endpoint.record.sourceUrl ===
          "https://www.pricia.co.jp/staffblog/hotel/25137/" &&
        (sources.get(endpoint.sourceId)?.evidenceContentSha256 ??
          endpoint.sourceSha256) ===
          "d631711d193aebde5b6e68f8e6eefedbba375349ee1df2b3cefc1af4736a5439",
      "HOTEL_EXACT_ENDPOINT",
    );
    const identityAnchor = "osm:way:1353020075:pricia-hotel",
      candidate = {
        identityAnchor,
        origin: ORIGIN,
        canonicalNameJa: expected.tags.name,
        nodeKind: "private_hotel_pickup_facility",
        mode: "airport_bus",
        longitude: expected.representativeCoordinate.longitude,
        latitude: expected.representativeCoordinate.latitude,
        operatorRefs: ["facility:pricia-hotel"],
        lineRefs: ["facility:pricia-hotel"],
        evidenceRefs: refs,
        identityRecord: expected,
        hubSemantics: "EXPLICIT_WHOLE_PRIVATE_HOTEL_FACILITY_NOT_PUBLIC_HUB",
        independentReview: {
          decision: "ADMIT_TASK_086_TOPOLOGY",
          recordSha256: hash(expected),
          method: "EXACT_OSM_NAMED_FACILITY_AND_OPERATOR_SHUTTLE_ENDPOINT",
        },
      };
    return {
      candidate,
      nativeFacilityByAnchor: new Map([
        [
          identityAnchor,
          {
            identityRecord: expected,
            nativeEvidenceRef,
            endpointEvidenceRef,
            origin: ORIGIN,
          },
        ],
      ]),
    };
  }
  function bound(node, { sources, evidence, nativeFacilityByAnchor }) {
    const n = nativeFacilityByAnchor?.get(node.identityAnchor);
    const nativeSource = sources.get(
        evidence.get(n?.nativeEvidenceRef)?.sourceId,
      ),
      endpoint = evidence.get(n?.endpointEvidenceRef)?.record;
    return (
      !!n &&
      nativeSource?.license === "ODbL 1.0" &&
      nativeSource.attribution === "© OpenStreetMap contributors" &&
      nativeSource.shareAlikeRequired === true &&
      endpoint?.kind === "REVIEWED_PRIVATE_HOTEL_SHUTTLE_ENDPOINT" &&
      endpoint.address === "鹿児島県大島郡与論町立長358-1" &&
      endpoint.pickupScope === "HOTEL_FRONT_FACILITY_NOT_OSM_POINT" &&
      endpoint.sourceUrl ===
        "https://www.pricia.co.jp/staffblog/hotel/25137/" &&
      node.identityAnchor === "osm:way:1353020075:pricia-hotel" &&
      n.origin === ORIGIN &&
      canonical(node.identityRecord) === canonical(expected) &&
      canonical(n.identityRecord) === canonical(expected) &&
      node.canonicalNameJa === expected.tags.name &&
      node.latitude === expected.representativeCoordinate.latitude &&
      node.longitude === expected.representativeCoordinate.longitude &&
      node.nodeKind === "private_hotel_pickup_facility" &&
      node.mode === "airport_bus" &&
      canonical(node.operatorRefs) === canonical(["facility:pricia-hotel"]) &&
      canonical(node.lineRefs) === canonical(["facility:pricia-hotel"]) &&
      node.hubSemantics ===
        "EXPLICIT_WHOLE_PRIVATE_HOTEL_FACILITY_NOT_PUBLIC_HUB" &&
      [n.nativeEvidenceRef, n.endpointEvidenceRef].every((r) =>
        node.evidenceRefs.includes(r),
      ) &&
      verifyEvidence(node.evidenceRefs, sources, evidence) &&
      sources.get(evidence.get(n.nativeEvidenceRef)?.sourceId)?.url ===
        "https://api.openstreetmap.org/api/0.6/map?bbox=128.395,27.047,128.402,27.052" &&
      sources.get(evidence.get(n.endpointEvidenceRef)?.sourceId)?.url ===
        "https://www.pricia.co.jp/staffblog/hotel/25137/" &&
      evidence.get(n.nativeEvidenceRef)?.sourceSha256 ===
        expected.nativeResponseSha256 &&
      canonical(evidence.get(n.nativeEvidenceRef)?.record) ===
        canonical(expected) &&
      evidence.get(n.endpointEvidenceRef)?.record.hotelName ===
        expected.tags.name &&
      (sources.get(evidence.get(n.endpointEvidenceRef)?.sourceId)
        ?.evidenceContentSha256 ??
        evidence.get(n.endpointEvidenceRef)?.sourceSha256) ===
        "d631711d193aebde5b6e68f8e6eefedbba375349ee1df2b3cefc1af4736a5439"
    );
  }
  return { create, bound };
}
