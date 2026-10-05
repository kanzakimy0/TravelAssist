// ABR master/position are separate licensed raw inputs. The address review binds a named private hotel to their exact composite parcel key.
export const ABR_DATASET = "ABR_EXACT_PRIVATE_HOTEL_PARCEL";
export const ABR_LICENSE = "PDL-1.0+MOJ-MAP-DATA-TERMS";
export function abrNativeShape(n, { canonical, hash }) {
  const r = n?.nativeRecord,
    m = r?.master,
    p = r?.position,
    a = r?.hotelFacilityAddressReview;
  return !!(
    n?.dataset === ABR_DATASET &&
    m &&
    p &&
    a &&
    hash(r) === n.nativeRecordSha256 &&
    ["lg_code", "machiaza_id", "prc_id"].every(
      (k) => typeof m[k] === "string" && m[k] && m[k] === p[k],
    ) &&
    m.prc_rec_flg === "1" &&
    m.src_code === "1" &&
    m.ablt_date === "" &&
    p.rep_srid === "EPSG:6668" &&
    p.rep_src_code === "1" &&
    a.kind === "REVIEWED_OFFICIAL_NAMED_PRIVATE_HOTEL_EXACT_PARCEL" &&
    a.municipalityCode === m.lg_code &&
    a.city === m.city &&
    a.oazaCho === m.oaza_cho &&
    canonical(a.parcelNumbers) ===
      canonical([m.prc_num1, m.prc_num2, m.prc_num3]) &&
    a.coordinateProximityUsed === false &&
    a.googleCoordinatesUsed === false &&
    n.name === a.facilityName &&
    n.address === a.officialAddress &&
    n.municipalityCode === m.lg_code &&
    n.identityAnchor ===
      "abr-parcel:" +
        ["lg_code", "machiaza_id", "prc_id"].map((k) => m[k]).join(":") +
        ":private-hotel-facility" &&
    n.longitude === Number(p.rep_lon) &&
    n.latitude === Number(p.rep_lat) &&
    Number.isFinite(n.latitude) &&
    Number.isFinite(n.longitude) &&
    Math.abs(n.latitude) <= 90 &&
    Math.abs(n.longitude) <= 180 &&
    n.coordinateReferenceSystem === "EPSG:6668" &&
    n.coordinateScope ===
      "OFFICIAL_PARCEL_REPRESENTATIVE_NOT_BUS_POLE_ENTRANCE_OR_NAVIGATION" &&
    [
      n.archiveSha256,
      n.positionArchiveSha256,
      n.memberSha256,
      n.positionMemberSha256,
    ].every((h) => /^[a-f0-9]{64}$/.test(h))
  );
}
export function abrSourcesBound(
  n,
  refs,
  v,
  { canonical, hash, verifyEvidence },
) {
  if (
    !abrNativeShape(n, { canonical, hash }) ||
    !Array.isArray(refs) ||
    !verifyEvidence(refs, v.sources, v.evidence)
  )
    return false;
  const rows = refs.map((ref) => v.evidence.get(ref)),
    licensed = (e, sha, role) => {
      const s = v.sources.get(e?.sourceId),
        r = s?.rightsBinding;
      return !!(
        s &&
        e.sourceSha256 === sha &&
        s.contentSha256 === sha &&
        s.license === ABR_LICENSE &&
        s.rightsBindingSchemaVersion === 1 &&
        r?.license === ABR_LICENSE &&
        r.attribution?.length &&
        r.shareAlikeRequired === false &&
        r.shareAlikeScope === "NONE" &&
        s.nativeArchiveRole === role &&
        s.rightsClass === "RAW_PERSISTENCE_ALLOWED" &&
        s.persistenceAllowed === true &&
        s.rawPayloadRetained === true &&
        s.retainedArchiveSha256 === sha &&
        s.rightsReview?.processingDisclosure &&
        s.rightsReview?.noIndividualIdentification === true &&
        s.rightsReview?.pdlTermsResponseSha256 ===
          "7c808e8a07a46266382d5d071c67ac07cb70812e5334ad0be76b742beee59f14" &&
        s.rightsReview?.mojTermsResponseSha256 ===
          "275914c735b19cc7a274a13aac22e0c08378269d9d80f26f6b285aca32367b99"
      );
    };
  const master = rows.some(
    (e) =>
      canonical(e.record) === canonical(n) &&
      licensed(e, n.archiveSha256, "ABR_MASTER"),
  );
  const position = rows.some(
    (e) =>
      e.record?.kind === "REVIEWED_ABR_POSITION_ARCHIVE_BINDING" &&
      e.record.identityAnchor === n.identityAnchor &&
      e.record.nativeIdentitySha256 === hash(n) &&
      e.record.masterArchiveSha256 === n.archiveSha256 &&
      e.record.positionArchiveSha256 === n.positionArchiveSha256 &&
      e.record.positionMemberSha256 === n.positionMemberSha256 &&
      canonical(e.record.positionRecord) ===
        canonical(n.nativeRecord.position) &&
      licensed(e, n.positionArchiveSha256, "ABR_POSITION"),
  );
  const address = rows.some(
    (e) =>
      canonical(e.record) ===
      canonical(n.nativeRecord.hotelFacilityAddressReview),
  );
  const role = rows.some(
    (e) =>
      e.record?.kind === "REVIEWED_PRIVATE_HOTEL_FACILITY_ROLE" &&
      e.record.identityAnchor === n.identityAnchor &&
      e.record.nativeIdentitySha256 === hash(n) &&
      e.record.facilityRole === "PRIVATE_HOTEL_NOT_PUBLIC_FACILITY" &&
      e.record.hotelName === n.name &&
      e.record.sourceUrl ===
        n.nativeRecord.hotelFacilityAddressReview.sourceUrl &&
      e.record.observedResponseSha256 ===
        n.nativeRecord.hotelFacilityAddressReview.observedResponseSha256,
  );
  const terms = [
    [
      "PDL-1.0",
      "7c808e8a07a46266382d5d071c67ac07cb70812e5334ad0be76b742beee59f14",
    ],
    [
      "MOJ_MAP_DATA_TERMS",
      "275914c735b19cc7a274a13aac22e0c08378269d9d80f26f6b285aca32367b99",
    ],
  ].every(([type, sha]) =>
    rows.some(
      (e) =>
        e.record?.kind === "REVIEWED_NATIVE_REUSE_TERMS" &&
        e.record.termsType === type &&
        e.record.observedResponseSha256 === sha &&
        e.record.commercialReuseAllowed === true &&
        e.record.attributionRequired === true &&
        e.record.processingDisclosureRequired === true,
    ),
  );
  return master && position && address && role && terms;
}
