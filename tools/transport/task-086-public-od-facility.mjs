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
  if (review.profile === "IWAMI_MISUMI_FIXED_PUBLIC_PICKUP")
    return publicFixedOfficeCandidate({
      archiveBytes,
      memberBytes,
      review,
      currentEndpointEvidenceRef,
      sources,
      evidence,
      nativeIdentityEvidenceRef,
    });
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

// Separate P04 medical-facility identity. Never reinterpret P05 records or curb geometry.
export function publicODHospitalCandidate({
  archiveBytes,
  memberBytes,
  gmlBytes,
  review,
  currentEndpointEvidenceRef,
  sources,
  evidence,
  nativeIdentityEvidenceRef,
}) {
  invariant(
    hash(archiveBytes) ===
      "07c60f5a996989e512c53aa42e9ad35bb6e4898bb57b6ba6a55426907427b2f7" &&
      hash(archiveBytes) === review.sourceArchiveSha256 &&
      hash(memberBytes) ===
        "7d4e5798083789f46c5e4c28f5f7846c02ec9b768389892ebddb4730d3265d4a" &&
      hash(memberBytes) === review.geojsonMemberSha256 &&
      hash(gmlBytes) ===
        "28be454c8e85209ebd97d8aeab1cdc6fc3e42d7e3ebb0b76d8d9a84232d83093" &&
      hash(gmlBytes) === review.gmlMemberSha256,
    "P04_ARCHIVE_OR_MEMBER_CHANGED",
  );
  invariant(
    review.dataset === "P04-20" &&
      review.nativeRecordId === "DE01_721" &&
      review.pointReferenceId === "pt721" &&
      review.coordinateScope ===
        "OFFICIAL_FACILITY_REPRESENTATIVE_POINT_NOT_CURB_ENTRANCE_OR_PRECISION_NAVIGATION",
    "P04_NATIVE_ID_OR_COORDINATE_SCOPE",
  );
  const identitySource = sources.get(
    evidence.get(nativeIdentityEvidenceRef)?.sourceId,
  );
  invariant(
    identitySource?.contentSha256 === hash(archiveBytes) &&
      identitySource.url ===
        "https://nlftp.mlit.go.jp/ksj/gml/data/P04/P04-20/P04-20_17_GML.zip" &&
      identitySource.rightsClass === "RAW_PERSISTENCE_ALLOWED" &&
      identitySource.rightsDecision === "CC_BY_4_0" &&
      identitySource.rightsReview?.licenseEvidenceSha256 ===
        "ae6d3657d0d6259fc387cf0b44d0a567b592da7e7557a70b79e808f7bd0e5dcc" &&
      identitySource.rightsReview?.attribution &&
      identitySource.rightsReview?.changes,
    "P04_NATIVE_SOURCE_ARCHIVE_AND_LICENSE_BINDING",
  );
  const matches = JSON.parse(memberBytes.toString("utf8")).features.filter(
    (f) =>
      f.properties?.P04_002 === "公立宇出津総合病院" &&
      f.properties?.P04_003 === "鳳珠郡能登町字宇出津タ字97番地",
  );
  invariant(matches.length === 1, "P04_UNIQUE_NATIVE_RECORD_REQUIRED");
  const feature = matches[0],
    [longitude, latitude] = feature.geometry.coordinates;
  invariant(
    feature.properties.P04_001 === 1 &&
      feature.geometry.type === "Point" &&
      Number.isFinite(latitude) &&
      Number.isFinite(longitude),
    "P04_NATIVE_COORDINATES",
  );
  const identityRecord = {
    dataset: "P04-20",
    nativeRecordId: "DE01_721",
    pointReferenceId: "pt721",
    archiveSha256: review.sourceArchiveSha256,
    memberSha256: review.geojsonMemberSha256,
    gmlMemberSha256: review.gmlMemberSha256,
    feature,
    coordinateScope: review.coordinateScope,
  };
  const endpoint = evidence.get(currentEndpointEvidenceRef)?.record;
  invariant(
    verifyEvidence(
      [nativeIdentityEvidenceRef, currentEndpointEvidenceRef],
      sources,
      evidence,
    ) &&
      canonical(evidence.get(nativeIdentityEvidenceRef)?.record) ===
        canonical(identityRecord) &&
      canonical(endpoint?.endpointNames) ===
        canonical(["能登空港", "公立宇出津総合病院"]) &&
      endpoint.currentHospitalAddress === feature.properties.P04_003 &&
      endpoint.corroboratingEvidence?.some(
        (x) =>
          x.url ===
            "https://www.town.noto.lg.jp/kakuka/ushitsu-hospital/4979.html" &&
          x.observedResponseSha256 ===
            "1a31a4934e03be3784a11b3ce310cc4db1cbf493c368ba027a0fe3f629423f20",
      ),
    "P04_NATIVE_AND_CURRENT_PUBLIC_ENDPOINT_EVIDENCE",
  );
  const identityAnchor = "p04:20:17:DE01_721",
    candidate = {
      identityAnchor,
      canonicalNameJa: "公立宇出津総合病院",
      origin: "TASK_086_INDEPENDENT_P04_AND_PUBLIC_OD",
      nodeKind: "public_pickup_facility",
      mode: "demand_shared_taxi",
      nodeLevel: "T3",
      operatorRefs: ["facility:P04-20:DE01_721"],
      lineRefs: ["facility:P04-20:DE01_721"],
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
        method: "EXACT_P04_NATIVE_HOSPITAL_AND_CURRENT_PUBLIC_OD_ENDPOINT",
      },
    };
  return {
    candidate,
    nativeFacilityByAnchor: new Map([
      [identityAnchor, { identityRecord, currentEndpointEvidenceRef }],
    ]),
  };
}

// Exact separately reviewed immutable P05 facility profile for fixed public airport service.
// P05 is the facility identity, not a native taxi stop or precision curb.
function publicFixedOfficeCandidate({
  archiveBytes,
  memberBytes,
  review,
  currentEndpointEvidenceRef,
  sources,
  evidence,
  nativeIdentityEvidenceRef,
}) {
  const archiveSha256 =
      "f873e16525173d6a5eaf4812e8764b4a524d4497a856aeee4cf00d385eda0423",
    memberSha256 =
      "50679fe0ffdf091951551dd2f09406ba80ec27ac3be12bbbd2c961e8421a3536",
    featureSha256 =
      "605b88b90ef640ac5f46efb8077651e16b3d117d18837cbc982ec9f3538c724a";
  invariant(
    hash(archiveBytes) === archiveSha256 &&
      hash(memberBytes) === memberSha256 &&
      review.sourceArchiveSha256 === archiveSha256 &&
      review.memberSha256 === memberSha256 &&
      review.nativeFeatureCanonicalSha256 === featureSha256,
    "P05_FIXED_IMMUTABLE_SOURCE_BINDING",
  );
  const feature = JSON.parse(memberBytes.toString("utf8")).features[220],
    p = feature?.properties;
  invariant(
    hash(feature) === featureSha256 &&
      p.P05_001 === "32202" &&
      p.P05_002 === "2" &&
      p.P05_003 === "市役所三隅支所" &&
      p.P05_004 === "浜田市三隅町三隅1434" &&
      feature.geometry?.type === "Point",
    "P05_FIXED_EXACT_RECORD",
  );
  const source = sources.get(evidence.get(nativeIdentityEvidenceRef)?.sourceId),
    current = evidence.get(currentEndpointEvidenceRef)?.record;
  invariant(
    source?.contentSha256 === archiveSha256 &&
      source.url ===
        "https://nlftp.mlit.go.jp/ksj/gml/data/P05/P05-22/P05-22_32_GML.zip" &&
      source.rightsClass === "RAW_PERSISTENCE_ALLOWED" &&
      source.rightsDecision === "CC_BY_4_0",
    "P05_FIXED_NATIVE_RIGHTS_BINDING",
  );
  const scope =
      "OFFICIAL_FACILITY_REPRESENTATIVE_POINT_NOT_CURB_ENTRANCE_OR_PRECISION_NAVIGATION",
    identityRecord = {
      dataset: "P05-22",
      nativeRecordId: "P05_220",
      archiveSha256,
      memberSha256,
      feature,
      coordinateScope: scope,
    };
  invariant(
    review.coordinateScope === scope &&
      verifyEvidence(
        [nativeIdentityEvidenceRef, currentEndpointEvidenceRef],
        sources,
        evidence,
      ) &&
      canonical(evidence.get(nativeIdentityEvidenceRef).record) ===
        canonical(identityRecord) &&
      current?.kind === "reviewed_public_fixed_endpoint" &&
      current.endpointNames?.includes(p.P05_003) &&
      current.publishedEndpointName === "浜田市役所三隅支所" &&
      current.currentAddress === "浜田市三隅町三隅1434" &&
      current.serviceOperator === "株式会社Fromハート" &&
      current.sourceUrl === "https://hagiiwami.jp/access/" &&
      current.observedResponseSha256 ===
        "98d353bccff5de4eb24c5092d965c3b511e54d1a4519669f4d549e55fc9eb471",
    "P05_FIXED_CURRENT_PASSENGER_COMPONENT_BINDING",
  );
  const identityAnchor = "p05:22:32:P05_220",
    origin = "TASK_086_INDEPENDENT_P05_AND_PUBLIC_FIXED_SERVICE",
    native = { identityRecord, currentEndpointEvidenceRef, origin };
  const candidate = {
    identityAnchor,
    canonicalNameJa: p.P05_003,
    origin,
    nodeKind: "public_pickup_facility",
    mode: "demand_shared_taxi",
    nodeLevel: "T3",
    operatorRefs: ["facility:P05-22:32:P05_220"],
    lineRefs: ["facility:P05-22:32:P05_220"],
    latitude: feature.geometry.coordinates[1],
    longitude: feature.geometry.coordinates[0],
    identityRecord,
    evidenceRefs: [nativeIdentityEvidenceRef, currentEndpointEvidenceRef],
    hubSemantics: "NAMED_PUBLIC_BOOKED_PICKUP_FACILITY_REPRESENTATIVE_NOT_CURB",
    parentHubId: null,
    independentReview: {
      decision: "ADMIT_TASK_086_TOPOLOGY",
      recordSha256: hash(identityRecord),
      sourceArchiveSha256: archiveSha256,
      method: "EXACT_P05_NATIVE_RECORD_AND_CURRENT_PUBLIC_FIXED_ENDPOINT",
    },
  };
  return {
    candidate,
    nativeFacilityByAnchor: new Map([[identityAnchor, native]]),
  };
}

export function publicAguniOfficeCandidate({
  archiveBytes,
  memberBytes,
  review,
  currentEndpointEvidenceRef,
  sources,
  evidence,
  nativeIdentityEvidenceRef,
}) {
  invariant(
    review.profile === "AGUNI_PUBLIC_OD_CAPABILITY" &&
      hash(archiveBytes) ===
        "9c1dd233fb7a71ecb0e36a173696b63375a57ca12487efacfe162356e96010e8" &&
      hash(memberBytes) ===
        "358cab1d04ad6ef4693f443274245c13a33bd26d9f9520f65100068f23a1c8e9",
    "AGUNI_EXACT_NATIVE_ARCHIVE",
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
        "https://nlftp.mlit.go.jp/ksj/gml/data/P05/P05-22/P05-22_47_GML.zip" &&
      identitySource.rightsClass === "RAW_PERSISTENCE_ALLOWED" &&
      identitySource.rightsDecision === "CC_BY_4_0",
    "P05_NATIVE_SOURCE_ARCHIVE_BINDING",
  );
  const features = JSON.parse(memberBytes.toString("utf8")).features;
  const matches = features.filter(
    (f) =>
      f.properties?.P05_001 === "47355" &&
      f.properties?.P05_003 === "粟国村役場",
  );
  invariant(matches.length === 1, "P05_EXACT_UNIQUE_RECORD_REQUIRED");
  const feature = matches[0];
  invariant(
    hash(feature) === review.nativeFeatureCanonicalSha256 &&
      feature.properties.P05_002 === "1" &&
      feature.properties.P05_004 === "粟国村東483" &&
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
    nativeRecordId: "P05_845",
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
        .record.endpointNames?.includes("粟国村役場"),
    "P05_NATIVE_AND_CURRENT_ENDPOINT_EVIDENCE",
  );
  const ep = evidence.get(currentEndpointEvidenceRef)?.record;
  invariant(
    canonical(ep?.endpointNames) === canonical(["粟国空港", "粟国村役場"]) &&
      ep?.currentOfficeAddress === "沖縄県島尻郡粟国村字東483番地" &&
      ep?.queryEligibility === "AUDITED_CONDITIONAL_SERVICE_CAPABILITY",
    "AGUNI_CURRENT_ENDPOINT_SCOPE",
  );
  const identityAnchor = "p05:22:47:P05_845",
    candidate = {
      identityAnchor,
      canonicalNameJa: "粟国村役場",
      origin: "TASK_086_INDEPENDENT_P05_AND_PUBLIC_OD",
      nodeKind: "public_pickup_facility",
      mode: "demand_shared_taxi",
      nodeLevel: "T3",
      operatorRefs: ["facility:P05-22:P05_845"],
      lineRefs: ["facility:P05-22:P05_845"],
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
