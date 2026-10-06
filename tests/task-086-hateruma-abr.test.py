import unittest,copy,json,zipfile,io,csv
from pathlib import Path
import importlib.util
_spec=importlib.util.spec_from_file_location("task086_abr",Path(__file__).resolve().parents[1]/"tools/transport/task-086-extract-abr-facility.py")
_mod=importlib.util.module_from_spec(_spec);_spec.loader.exec_module(_mod)
extract,sha=_mod.extract,_mod.sha
P=Path(__file__).parent/"fixtures/task-086-hateruma"
REAL=json.loads((P/"review.json").read_text(encoding="utf8"))
IDENTITY=json.loads((P/"native-identity.json").read_text(encoding="utf8"))
def archive(name,rs):
    text=io.StringIO(newline="");w=csv.DictWriter(text,fieldnames=list(rs[0]));w.writeheader();w.writerows(rs);raw=text.getvalue().encode();bio=io.BytesIO()
    with zipfile.ZipFile(bio,"w") as z:z.writestr(name,raw)
    return bio.getvalue(),sha(raw)
def fixture(m=None,p=None):
    m=m or [copy.deepcopy(IDENTITY["nativeRecord"]["master"])];p=p or [copy.deepcopy(IDENTITY["nativeRecord"]["position"])];r=copy.deepcopy(REAL)
    mb,mh=archive(r["masterMember"],m);pb,ph=archive(r["positionMember"],p)
    r.update(masterArchiveSha256=sha(mb),masterMemberSha256=mh,positionArchiveSha256=sha(pb),positionMemberSha256=ph,masterRecordSha256=sha(m[0]),positionRecordSha256=sha(p[0]))
    return mb,pb,r
class TestABR(unittest.TestCase):
    def reject(self,args,code):
        with self.assertRaisesRegex(ValueError,code):extract(*args)
    def test_real_native_pair(self):
        actual=extract((P/"registration/sources/raw/hateruma-abr-master-473812.zip").read_bytes(),(P/"registration/sources/raw/hateruma-abr-position-473812.zip").read_bytes(),REAL);self.assertEqual(actual,IDENTITY)
    def test_position_bytes_changed(self):
        m,p,r=fixture();self.reject((m,p+b"changed",r),"ABR_ARCHIVE_CHANGED")
    def test_master_bytes_changed(self):
        m,p,r=fixture();self.reject((m+b"changed",p,r),"ABR_ARCHIVE_CHANGED")
    def test_same_parcel_number_other_island_rejected(self):
        m=copy.deepcopy(IDENTITY["nativeRecord"]["master"]);m["machiaza_id"]="0002000";m["oaza_cho"]="字小浜";self.reject(fixture(m=[m]),"ABR_JOIN_NOT_UNIQUE")
    def test_forged_key_to_other_island_still_rejected(self):
        m=copy.deepcopy(IDENTITY["nativeRecord"]["master"]);p=copy.deepcopy(IDENTITY["nativeRecord"]["position"]);m["machiaza_id"]=p["machiaza_id"]="0002000";m["oaza_cho"]="字小浜";a,b,r=fixture(m=[m],p=[p]);r["nativeKey"]["machiaza_id"]="0002000";self.reject((a,b,r),"ABR_FACILITY_PARCEL_MISMATCH")
    def test_duplicate_native_position_rejected(self):
        p=copy.deepcopy(IDENTITY["nativeRecord"]["position"]);self.reject(fixture(p=[p,p]),"ABR_JOIN_NOT_UNIQUE")
    def test_missing_position_rejected(self):
        p=copy.deepcopy(IDENTITY["nativeRecord"]["position"]);p["prc_id"]="027810000000000";self.reject(fixture(p=[p]),"ABR_JOIN_NOT_UNIQUE")
    def test_arbitrary_coordinate_system_rejected(self):
        p=copy.deepcopy(IDENTITY["nativeRecord"]["position"]);p["rep_srid"]="LOCAL_ARBITRARY";self.reject(fixture(p=[p]),"ABR_UNREVIEWED_COORDINATE_REFERENCE")
    def test_nonfinite_coordinates_rejected(self):
        p=copy.deepcopy(IDENTITY["nativeRecord"]["position"]);p["rep_lat"]="NaN";self.reject(fixture(p=[p]),"ABR_COORDINATE_INVALID")
    def test_abolished_parcel_rejected(self):
        m=copy.deepcopy(IDENTITY["nativeRecord"]["master"]);m["ablt_date"]="2025-01-01";self.reject(fixture(m=[m]),"ABR_PARCEL_NOT_CURRENT_NATIVE_RECORD")
    def test_source_record_mutation_rejected(self):
        m,p,r=fixture();r["positionRecordSha256"]="0"*64;self.reject((m,p,r),"ABR_NATIVE_RECORD_CHANGED")
    def test_curb_precision_claim_rejected(self):
        m,p,r=fixture();r["municipalFacilityAddressReview"]["coordinateScope"]="EXACT_BUS_POLE";self.reject((m,p,r),"ABR_REPRESENTATIVE_SCOPE")
    def test_proximity_identity_rejected(self):
        m,p,r=fixture();r["municipalFacilityAddressReview"]["coordinateProximityUsed"]=True;self.reject((m,p,r),"ABR_REPRESENTATIVE_SCOPE")
    def test_address_review_mutation_rejected(self):
        m,p,r=fixture();r["municipalFacilityAddressReview"]["facilityName"]="Nearby center";self.reject((m,p,r),"ABR_ADDRESS_REVIEW_CHANGED")
if __name__=="__main__":
 result=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(TestABR))
 if not result.wasSuccessful():raise SystemExit(1)
 print("ABR_UNITTESTS_PASS")
