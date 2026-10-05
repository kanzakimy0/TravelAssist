import {
  ABR_DATASET,
  abrNativeShape,
  abrSourcesBound,
} from "./task-086-abr-public-facility.mjs";
import {
  historicalNativeShape,
  historicalFrontComponentBound,
} from "./task-086-historical-facility-stop.mjs";
// Exact official native facility identities with separately evidenced named public bus components.
// Native registry entries must be populated by the source-bound offline loader, never nearest-point matching.
export function createOfficialFacilityBus({ canonical, hash, verifyEvidence }) {
  const same = (a, b) => canonical(a) === canonical(b);
  function nativeShape(n) {
    if (n?.dataset === ABR_DATASET)
      return abrNativeShape(n, { canonical, hash });
    if (n?.dataset === "P04-20") return historicalNativeShape(n, hash);
    if (n?.dataset === "P05-22")
      return (
        n.nativeRecord?.type === "Feature" &&
        n.nativeRecord.geometry?.type === "Point" &&
        n.name === n.nativeRecord.properties?.P05_003 &&
        n.address === n.nativeRecord.properties.P05_004 &&
        n.municipalityCode === n.nativeRecord.properties.P05_001 &&
        n.longitude === n.nativeRecord.geometry.coordinates[0] &&
        n.latitude === n.nativeRecord.geometry.coordinates[1]
      );
    if (n?.dataset === "TOKYO_PUBLIC_EVACUATION_FACILITIES") {
      const r = n.nativeRecord;
      return (
        r &&
        n.name === r["避難所_施設名称"] &&
        n.address === r["所在地住所"] &&
        n.municipalityCode === r["地方公共団体コード"] &&
        n.latitude === Number(r["緯度"].trim()) &&
        n.longitude === Number(r["経度"].trim())
      );
    }
    return false;
  }
  function facilityBound(node, v) {
    const n = v.nativeFacilityByAnchor?.get(node.identityAnchor);
    return !!(
      n &&
      nativeShape(n) &&
      hash(n.nativeRecord) === n.nativeRecordSha256 &&
      same(node.identityRecord, n) &&
      (n.dataset === "P04-20"
        ? historicalFrontComponentBound(node, v, { hash, verifyEvidence })
        : node.canonicalNameJa === n.name) &&
      node.latitude === n.latitude &&
      node.longitude === n.longitude &&
      node.nodeKind === "public_pickup_facility" &&
      node.mode === "local_bus" &&
      node.operatorRefs.length === 1 &&
      node.lineRefs.length === 1 &&
      node.independentReview?.coordinateScope ===
        "OFFICIAL_FACILITY_REPRESENTATIVE_NOT_BUS_POLE_ENTRANCE_OR_NAVIGATION" &&
      verifyEvidence(node.evidenceRefs, v.sources, v.evidence) &&
      (n.dataset === ABR_DATASET
        ? abrSourcesBound(n, node.evidenceRefs, v, {
            canonical,
            hash,
            verifyEvidence,
          })
        : node.evidenceRefs.some((ref) => {
            const e = v.evidence.get(ref),
              s = v.sources.get(e?.sourceId);
            return (
              e?.recordSha256 === hash(n) &&
              e.sourceSha256 === n.archiveSha256 &&
              s?.license === "CC-BY-4.0" &&
              s.persistenceAllowed === true &&
              s.rawPayloadRetained === true
            );
          }))
    );
  }
  function selectorBound(selector, sourceName, node, fact, sources, evidence) {
    const ref = selector.publicFacilityComponentReviewEvidenceRef,
      r = evidence.get(ref)?.record;
    return !!(
      r &&
      verifyEvidence([ref], sources, evidence) &&
      r.kind === "REVIEWED_EXACT_NAMED_PUBLIC_FACILITY_BUS_COMPONENT" &&
      r.sourceFactId === fact.factId &&
      r.serviceResponseSha256 === fact.observedResponseSha256 &&
      r.sourceCallName === sourceName &&
      r.nativeName === node.canonicalNameJa &&
      r.identityAnchor === node.identityAnchor &&
      r.identityRecordSha256 === hash(node.identityRecord) &&
      r.publicServiceOperator === fact.operator &&
      r.componentScope ===
        "COARSE_NAMED_PUBLIC_FACILITY_NOT_CURB_OR_NAVIGATION" &&
      r.coordinateProximityUsed === false &&
      r.googleCoordinatesUsed === false &&
      r.nativeName === selector.name &&
      r.currentOfficialFacilityEvidenceRefs?.length &&
      verifyEvidence(r.currentOfficialFacilityEvidenceRefs, sources, evidence)
    );
  }
  return { facilityBound, selectorBound };
}
