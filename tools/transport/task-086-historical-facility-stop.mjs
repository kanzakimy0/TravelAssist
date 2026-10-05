// One source-bound historical facility reference point with a separately evidenced current public front-stop component.
// It is neither a current hospital identity nor a bus-pole coordinate and does not assert corporate succession.
const profile = Object.freeze({
  archive: "7df01d1bd444b62af89714eb0df07612cd18a29cfd32001e63a159b940a6562d",
  member: "76a22c6e5c92674648099a96c7dbc8ca0e97a3e61e47c505a44f0a23a6f684a0",
  native: "388739034cb5caa0ad68d27bdb8698dc289159d0fe2e2a5864a8948e44eec235",
  rename: [
    "https://www.town.kikai.lg.jp/kikaku/documents/r6kotsukaigisiryo.pdf",
    "c9237f0968f04aa6ee9978a820b910bf8412ff75f1560829cd3886bec67fffcd",
  ],
  handoff: [
    "https://www.town.kikai.lg.jp/kikaku/koukyoutoutuu/documents/hontai.pdf",
    "17b90942583c5b50ce754d591b35f17a7c989fbc29b84a8abe598e8d51be8c23",
  ],
  current: [
    "https://www.town.kikai.lg.jp/kankou/kanko-iju/kotsuannai/documents/basujikoku.pdf",
    "8e1b392c492c37fcc62cfae1fe62f06dad5d27daa8c2e98c1059d293fea17060",
  ],
});
export function historicalNativeShape(n, hash) {
  return !!(
    n?.dataset === "P04-20" &&
    n.archiveSha256 === profile.archive &&
    n.memberSha256 === profile.member &&
    n.featureIndex === 466 &&
    n.member === "P04-20_46_GML/P04-20_46.geojson" &&
    n.nativeRecordSha256 === profile.native &&
    hash(n.nativeRecord) === profile.native &&
    n.nativeRecord?.type === "Feature" &&
    n.nativeRecord.geometry?.type === "Point" &&
    n.name === "医療法人徳洲会　喜界徳洲会病院" &&
    n.name === n.nativeRecord.properties.P04_002 &&
    n.address === "大島郡喜界町湾字前金久３１５" &&
    n.address === n.nativeRecord.properties.P04_003 &&
    n.latitude === n.nativeRecord.geometry.coordinates[1] &&
    n.longitude === n.nativeRecord.geometry.coordinates[0] &&
    n.identityAnchor ===
      "mlit-p04:20:46:feature466:historical-hospital-front-stop" &&
    n.nativeFacilityStatus === "HISTORICAL_2020_SITE_NOT_CURRENT_HOSPITAL" &&
    n.coordinateScope ===
      "OFFICIAL_HISTORICAL_FACILITY_REPRESENTATIVE_NOT_BUS_POLE_ENTRANCE_OR_NAVIGATION"
  );
}
export function historicalFrontComponentBound(
  node,
  v,
  { hash, verifyEvidence },
) {
  const n = v.nativeFacilityByAnchor?.get(node.identityAnchor);
  if (
    !Array.isArray(node.evidenceRefs) ||
    !historicalNativeShape(n, hash) ||
    node.canonicalNameJa !== "旧病院前" ||
    node.operatorRefs?.length !== 1 ||
    node.operatorRefs[0] !== "喜界町" ||
    node.lineRefs?.length !== 1 ||
    node.lineRefs[0] !== "kikai:municipal-central"
  )
    return false;
  const matches = node.evidenceRefs
    .map((ref) => v.evidence.get(ref)?.record)
    .filter(
      (r) =>
        r?.kind === "REVIEWED_EXACT_NAMED_PUBLIC_FACILITY_BUS_COMPONENT" &&
        r.nativeName === "旧病院前" &&
        r.nativeFacilityName === n.name &&
        r.sourceCallName === "旧病院前" &&
        r.identityAnchor === n.identityAnchor &&
        r.identityRecordSha256 === hash(n) &&
        r.publicServiceOperator === "喜界町" &&
        r.componentScope ===
          "COARSE_NAMED_PUBLIC_FACILITY_NOT_CURB_OR_NAVIGATION" &&
        r.coordinateProximityUsed === false &&
        r.googleCoordinatesUsed === false &&
        r.currentHospitalClaimed === false &&
        r.componentType === "HISTORIC_FACILITY_FRONT_PUBLIC_STOP",
    );
  return (
    matches.length > 0 &&
    matches.every((r) => {
      const refs = r.currentOfficialFacilityEvidenceRefs;
      if (!Array.isArray(refs) || !verifyEvidence(refs, v.sources, v.evidence))
        return false;
      const find = (kind, key) =>
        refs
          .map((ref) => v.evidence.get(ref))
          .find((e) => {
            const rec = e?.record,
              s = v.sources.get(e?.sourceId),
              expected = profile[key];
            return (
              rec?.kind === kind &&
              rec.sourceUrl === expected[0] &&
              rec.observedResponseSha256 === expected[1] &&
              e.sourceSha256 === s?.contentSha256 &&
              s?.url === expected[0] &&
              s.evidenceContentSha256 === expected[1]
            );
          })?.record;
      const rename = find("REVIEWED_EXISTING_STOP_RENAME", "rename"),
        handoff = find("REVIEWED_MUNICIPAL_OPERATION_REPLACEMENT", "handoff"),
        current = find("REVIEWED_CURRENT_HISTORICAL_FRONT_STOP", "current");
      return !!(
        rename &&
        rename.oldStopName === "病院前" &&
        rename.newStopName === "旧病院前" &&
        rename.originalFacilityName === "喜界徳洲会病院" &&
        rename.existingStopRenamed === true &&
        rename.newHospitalStopSeparate === true &&
        rename.effectiveDate === "2024-12-01" &&
        rename.physicalRelation ===
          "EXISTING_STOP_RENAME_AFTER_FACILITY_RELOCATION" &&
        handoff &&
        handoff.predecessorOperator === "株式会社奄美航空" &&
        handoff.currentServiceOrganizer === "喜界町" &&
        handoff.corporateSuccession === false &&
        handoff.effectiveMonth === "2025-12" &&
        handoff.sameNamedRoutesContinued === true &&
        current &&
        current.currentStopName === "旧病院前" &&
        current.currentNewHospitalStopName === "徳洲会病院" &&
        current.effectiveDate === "2026-06-01" &&
        current.ordinaryPublicService === true &&
        current.north1800Excluded === true &&
        current.southAdjacentDirection === "旧病院前→空港" &&
        current.northAdjacentDirection === "空港→旧病院前"
      );
    })
  );
}
