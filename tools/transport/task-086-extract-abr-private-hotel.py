"""Offline exact ABR parcel join. Coordinates are native representative points, never inferred."""
import csv, hashlib, io, json, math, zipfile

def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else json.dumps(value,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode()).hexdigest()

def require(condition, code):
    if not condition: raise ValueError(code)

def rows(blob, archive_sha, member, member_sha):
    require(sha(blob)==archive_sha,"ABR_ARCHIVE_CHANGED")
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        require(z.namelist().count(member)==1,"ABR_MEMBER_NOT_UNIQUE")
        raw=z.read(member)
    require(sha(raw)==member_sha,"ABR_MEMBER_CHANGED")
    r=csv.DictReader(io.StringIO(raw.decode("utf-8-sig")))
    require(r.fieldnames and len(r.fieldnames)==len(set(r.fieldnames)),"ABR_DUPLICATE_COLUMNS")
    result=list(r)
    require(all(None not in x and None not in x.values() for x in result),"ABR_ROW_WIDTH")
    return result

def extract(master_bytes,position_bytes,review):
    master_rows=rows(master_bytes,review["masterArchiveSha256"],review["masterMember"],review["masterMemberSha256"])
    position_rows=rows(position_bytes,review["positionArchiveSha256"],review["positionMember"],review["positionMemberSha256"])
    keys=("lg_code","machiaza_id","prc_id")
    key=review["nativeKey"]
    require(set(key)==set(keys) and all(isinstance(key[k],str) and key[k] for k in keys),"ABR_NATIVE_KEY")
    select=lambda rs:[r for r in rs if all(r.get(k)==key[k] for k in keys)]
    masters,positions=select(master_rows),select(position_rows)
    require(len(masters)==1 and len(positions)==1,"ABR_JOIN_NOT_UNIQUE")
    m,p=masters[0],positions[0]
    require(sha(m)==review["masterRecordSha256"] and sha(p)==review["positionRecordSha256"],"ABR_NATIVE_RECORD_CHANGED")
    require(m["prc_rec_flg"]=="1" and m["src_code"]=="1" and not m["ablt_date"],"ABR_PARCEL_NOT_CURRENT_NATIVE_RECORD")
    require(p["rep_srid"]=="EPSG:6668" and p["rep_src_code"]=="1","ABR_UNREVIEWED_COORDINATE_REFERENCE")
    lon,lat=float(p["rep_lon"]),float(p["rep_lat"])
    require(math.isfinite(lon) and math.isfinite(lat) and -180<=lon<=180 and -90<=lat<=90,"ABR_COORDINATE_INVALID")
    a=review["hotelFacilityAddressReview"]
    require(a["kind"]=="REVIEWED_OFFICIAL_NAMED_PRIVATE_HOTEL_EXACT_PARCEL" and a["sourceFactId"] and a["sourceActionId"] and a["sourceUrl"].startswith("https://") and len(a["observedResponseSha256"])==64,"ABR_ADDRESS_REVIEW_REQUIRED")
    require(a["municipalityCode"]==m["lg_code"] and a["city"]==m["city"] and a["oazaCho"]==m["oaza_cho"] and a["parcelNumbers"]==[m["prc_num1"],m["prc_num2"],m["prc_num3"]],"ABR_FACILITY_PARCEL_MISMATCH")
    require(a["coordinateScope"]=="OFFICIAL_PARCEL_REPRESENTATIVE_NOT_BUS_POLE_ENTRANCE_OR_NAVIGATION" and a["coordinateProximityUsed"] is False and a["googleCoordinatesUsed"] is False,"ABR_REPRESENTATIVE_SCOPE")
    require(sha(a)==review["hotelFacilityAddressReviewSha256"],"ABR_ADDRESS_REVIEW_CHANGED")
    native={"master":m,"position":p,"hotelFacilityAddressReview":a}
    return {"dataset":"ABR_EXACT_PRIVATE_HOTEL_PARCEL","nativeRecord":native,"nativeRecordSha256":sha(native),"archiveSha256":sha(master_bytes),"positionArchiveSha256":sha(position_bytes),"memberSha256":review["masterMemberSha256"],"positionMemberSha256":review["positionMemberSha256"],"name":a["facilityName"],"address":a["officialAddress"],"municipalityCode":m["lg_code"],"latitude":lat,"longitude":lon,"coordinateReferenceSystem":p["rep_srid"],"coordinateScope":a["coordinateScope"],"identityAnchor":"abr-parcel:"+":".join(key[k] for k in keys)+":private-hotel-facility"}

if __name__ == "__main__":
    import sys
    from pathlib import Path
    r=json.load(sys.stdin)
    print(json.dumps(extract(Path(r["archiveAbsolutePath"]).read_bytes(),Path(r["positionArchiveAbsolutePath"]).read_bytes(),r["review"]),ensure_ascii=True,separators=(",",":")))
