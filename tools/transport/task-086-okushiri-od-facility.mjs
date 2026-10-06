import {
  hash,
  canonical,
  invariant,
  verifyEvidence,
} from "./task-086-model.mjs";
export function publicOkushiriFacilityCandidate({
  archiveBytes,
  memberBytes,
  review,
  currentEndpointEvidenceRef,
  sources,
  evidence,
  nativeIdentityEvidenceRef,
}) {
  invariant(
    review.profile === "OKUSHIRI_PUBLIC_OD_CAPABILITY" &&
      hash(archiveBytes) ===
        "a99cb2d43ec142724d7d0296982efd9be759b4de93f64ad648725f784e56f521" &&
      hash(memberBytes) ===
        "ba97e7929caa0d5c11a08ac742e2fec8e8d382cebdd7c080bc3ed96c7427bb01",
    "OKUSHIRI_EXACT_NATIVE_ARCHIVE",
  );
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
        "https://nlftp.mlit.go.jp/ksj/gml/data/P05/P05-22/P05-22_01_GML.zip" &&
      identitySource.rightsClass === "RAW_PERSISTENCE_ALLOWED" &&
      identitySource.rightsDecision === "CC_BY_4_0",
    "P05_NATIVE_SOURCE_ARCHIVE_BINDING",
  );
  const features = JSON.parse(memberBytes.toString("utf8")).features;
  const matches = features.filter(
    (f) =>
      f.properties?.P05_001 === "01367" &&
      f.properties?.P05_003 === "神威脇生活改善センター",
  );
  invariant(matches.length === 1, "P05_EXACT_UNIQUE_RECORD_REQUIRED");
  const feature = matches[0];
  invariant(
    hash(feature) === review.nativeFeatureCanonicalSha256 &&
      feature.properties.P05_002 === "5" &&
      feature.properties.P05_004 === "奥尻町字湯浜83" &&
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
    nativeRecordId: "P05_2451",
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
        .record.endpointNames?.includes("神威脇生活改善センター"),
    "P05_NATIVE_AND_CURRENT_ENDPOINT_EVIDENCE",
  );
  const ep = evidence.get(currentEndpointEvidenceRef)?.record;
  invariant(
    canonical(ep?.endpointNames) ===
      canonical(["奥尻空港", "神威脇生活改善センター"]) &&
      ep?.currentOfficeAddress === "北海道奥尻郡奥尻町字湯浜83" &&
      ep?.queryEligibility === "AUDITED_CONDITIONAL_SERVICE_CAPABILITY",
    "OKUSHIRI_CURRENT_ENDPOINT_SCOPE",
  );
  const identityAnchor = "p05:22:01:P05_2451",
    candidate = {
      identityAnchor,
      canonicalNameJa: "神威脇生活改善センター",
      origin: "TASK_086_INDEPENDENT_P05_AND_PUBLIC_OD",
      nodeKind: "public_pickup_facility",
      mode: "demand_shared_taxi",
      nodeLevel: "T3",
      operatorRefs: ["facility:P05-22:P05_2451"],
      lineRefs: ["facility:P05-22:P05_2451"],
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
