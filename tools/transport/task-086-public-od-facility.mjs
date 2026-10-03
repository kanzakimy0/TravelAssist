import {
  hash,
  id,
  invariant,
  canonical,
  verifyEvidence,
} from "./task-086-model.mjs";
// Source-bound native selection for the one reviewed South Daito public pickup facility.
export function publicODOfficeCandidate({
  archiveBytes,
  memberBytes,
  review,
  currentEndpointEvidenceRef,
  sources,
  evidence,
  nativeIdentityEvidenceRef,
}) {
  invariant(
    hash(archiveBytes) === review.sourceArchiveSha256 &&
      hash(memberBytes) === review.memberSha256,
    "P05_ARCHIVE_OR_MEMBER_CHANGED",
  );
  invariant(
    review.coordinateScope ===
      "OFFICIAL_FACILITY_REPRESENTATIVE_POINT_NOT_CURB_ENTRANCE_OR_PRECISION_NAVIGATION",
    "P05_COORDINATE_SCOPE",
  );
  const identitySource = sources.get(
    evidence.get(nativeIdentityEvidenceRef)?.sourceId,
  );
  invariant(
    identitySource?.contentSha256 === hash(archiveBytes) &&
      identitySource.url ===
        "https://nlftp.mlit.go.jp/ksj/gml/data/P05/P05-22/P05-22_47_GML.zip" &&
      identitySource.rightsClass === "RAW_PERSISTENCE_ALLOWED" &&
      identitySource.rightsDecision === "CC_BY_4_0",
    "P05_NATIVE_SOURCE_ARCHIVE_BINDING",
  );
  const features = JSON.parse(memberBytes.toString("utf8")).features;
  const matches = features.filter(
    (f) =>
      f.properties?.P05_001 === "47357" &&
      f.properties?.P05_003 === "南大東村役場",
  );
  invariant(matches.length === 1, "P05_EXACT_UNIQUE_RECORD_REQUIRED");
  const feature = matches[0];
  invariant(
    hash(feature) === review.nativeFeatureCanonicalSha256 &&
      feature.properties.P05_002 === "1" &&
      feature.properties.P05_004 === "南大東村字南144-1" &&
      feature.geometry?.type === "Point",
    "P05_EXACT_NATIVE_RECORD_CHANGED",
  );
  const [longitude, latitude] = feature.geometry.coordinates;
  invariant(
    Number.isFinite(latitude) &&
      Number.isFinite(longitude) &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude >= -180 &&
      longitude <= 180,
    "P05_COORDINATE_INVALID",
  );
  const identityRecord = {
    dataset: "P05-22",
    nativeRecordId: "P05_858",
    archiveSha256: review.sourceArchiveSha256,
    memberSha256: review.memberSha256,
    feature,
    coordinateScope: review.coordinateScope,
  };
  invariant(
    verifyEvidence(
      [nativeIdentityEvidenceRef, currentEndpointEvidenceRef],
      sources,
      evidence,
    ) &&
      canonical(evidence.get(nativeIdentityEvidenceRef).record) ===
        canonical(identityRecord) &&
      evidence
        .get(currentEndpointEvidenceRef)
        .record.endpointNames?.includes("南大東村役場"),
    "P05_NATIVE_AND_CURRENT_ENDPOINT_EVIDENCE",
  );
  const identityAnchor = "p05:22:47:P05_858",
    candidate = {
      identityAnchor,
      canonicalNameJa: "南大東村役場",
      origin: "TASK_086_INDEPENDENT_P05_AND_PUBLIC_OD",
      nodeKind: "public_pickup_facility",
      mode: "demand_shared_taxi",
      nodeLevel: "T3",
      operatorRefs: ["facility:P05-22:P05_858"],
      lineRefs: ["facility:P05-22:P05_858"],
      latitude,
      longitude,
      identityRecord,
      evidenceRefs: [nativeIdentityEvidenceRef, currentEndpointEvidenceRef],
      hubSemantics:
        "NAMED_PUBLIC_BOOKED_PICKUP_FACILITY_REPRESENTATIVE_NOT_CURB",
      parentHubId: null,
      independentReview: {
        decision: "ADMIT_TASK_086_TOPOLOGY",
        recordSha256: hash(identityRecord),
        sourceArchiveSha256: review.sourceArchiveSha256,
        method: "EXACT_P05_NATIVE_RECORD_AND_CURRENT_PUBLIC_OD_ENDPOINT",
      },
    };
  return {
    candidate,
    nativeFacilityByAnchor: new Map([
      [identityAnchor, { identityRecord, currentEndpointEvidenceRef }],
    ]),
  };
}
