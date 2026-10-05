export function createHamayusoFacility({
  hash,
  canonical,
  invariant,
  verifyEvidence,
  abrSourcesBound,
}) {
  const origin = "TASK_086_INDEPENDENT_ABR_PRIVATE_HOTEL",
    anchor = "abr-parcel:473588:0004000:001520000900000:private-hotel-facility";
  function bound(node, v) {
    const n = v.nativeFacilityByAnchor?.get(node.identityAnchor);
    return (
      !!n &&
      n.identityAnchor === anchor &&
      node.identityAnchor === anchor &&
      node.origin === origin &&
      node.canonicalNameJa === "ハマユウ荘 うふあがり島" &&
      n.name === node.canonicalNameJa &&
      node.nodeKind === "private_hotel_pickup_facility" &&
      node.mode === "airport_bus" &&
      node.hubSemantics ===
        "EXPLICIT_WHOLE_PRIVATE_HOTEL_FACILITY_NOT_PUBLIC_HUB" &&
      canonical(node.operatorRefs) === canonical(["facility:hamayuso-hotel"]) &&
      canonical(node.lineRefs) === canonical(["facility:hamayuso-hotel"]) &&
      node.longitude === n.longitude &&
      node.latitude === n.latitude &&
      canonical(node.identityRecord) === canonical(n) &&
      abrSourcesBound(n, node.evidenceRefs, v, {
        canonical,
        hash,
        verifyEvidence,
      })
    );
  }
  function candidate(n, refs, v) {
    invariant(
      n.identityAnchor === anchor &&
        n.address === "沖縄県島尻郡北大東村字中野152-9" &&
        abrSourcesBound(n, refs, v, { canonical, hash, verifyEvidence }),
      "HAMAYUSO_NATIVE_SOURCE_BINDING",
    );
    return {
      identityAnchor: anchor,
      origin,
      canonicalNameJa: n.name,
      nodeKind: "private_hotel_pickup_facility",
      mode: "airport_bus",
      longitude: n.longitude,
      latitude: n.latitude,
      operatorRefs: ["facility:hamayuso-hotel"],
      lineRefs: ["facility:hamayuso-hotel"],
      evidenceRefs: refs,
      identityRecord: n,
      hubSemantics: "EXPLICIT_WHOLE_PRIVATE_HOTEL_FACILITY_NOT_PUBLIC_HUB",
      independentReview: {
        decision: "ADMIT_TASK_086_TOPOLOGY",
        recordSha256: hash(n),
        method: "EXACT_ABR_DUAL_ARCHIVE_PRIVATE_HOTEL_OWNER_ADDRESS",
        coordinateScope: n.coordinateScope,
      },
    };
  }
  return { candidate, bound };
}
