import importlib.util,json,hashlib
from pathlib import Path
base=Path('tests/fixtures/task-086-gtfs-agency-subset')
spec=importlib.util.spec_from_file_location('private_gtfs_extractor',Path('tools/transport/task-086-extract-selected-gtfs.py'))
extractor=importlib.util.module_from_spec(spec); spec.loader.exec_module(extractor)
request=json.loads((base/'oita-reviewed-section.json').read_text(encoding='utf-8'))
archive=Path('data/transport/network/sources/raw/oitakotsu-airport-20261001.zip').read_bytes()
canon=lambda v: json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode('utf-8')
def setbasehash(r): r['existingAnchorReuse']['sourceDescriptorSha256']=hashlib.sha256(canon(r['baseSource'])).hexdigest()
def check(name,mutation=None,expected=None):
    candidate=json.loads(json.dumps(request,ensure_ascii=False))
    if mutation: mutation(candidate)
    try: extractor.extract(archive,candidate); error=None
    except Exception as exc: error=str(exc)
    return {'case':name,'pass':error==expected,'error':error or 'ACCEPTED'}
def foreign_descriptor_agency(r):
    r['baseSource']['agencies'][0].update(agency_id='9999999999999',agency_name='foreign')
    setbasehash(r)
def duplicate_descriptor_agency(r):
    r['baseSource']['agencies'].append(dict(r['baseSource']['agencies'][0]));setbasehash(r)
def foreign_extra_agency(r):
    r['baseSource']['agencies'].append({'agency_id':'unknown-agency','agency_name':'unknown'});setbasehash(r)
def resealed_renamed_agency(r):
    r['baseSource']['agencies'][0]['agency_name']='unrelated';setbasehash(r)
def wrong_section_parent_hash(r): r['trips'][0]['section']['fullParentCallsSha256']='0'*64
def section_stop_edit(r): r['trips'][0]['reviewedStopIds'][1]='9 9'
results=[
 check('reject-duplicate-descriptor-agency',duplicate_descriptor_agency,'SELECTED_GTFS_BASE_SOURCE_MISMATCH'),
 check('reject-foreign-extra-descriptor-agency',foreign_extra_agency,'SELECTED_GTFS_BASE_SOURCE_MISMATCH'),
 check('reject-resealed-renamed-descriptor-agency',resealed_renamed_agency,'SELECTED_GTFS_BASE_SOURCE_MISMATCH'),
 check('accept-exact-selected-native-agency-subset-with-extra-unselected-native-agencies'),
 check('reject-missing-selected-agency',lambda r:r['baseSource']['agencies'].clear(),'SELECTED_GTFS_BASE_SOURCE_MISMATCH'),
 check('reject-renamed-selected-agency',lambda r:r['baseSource']['agencies'][0].update(agency_name='偽名'),'SELECTED_GTFS_BASE_SOURCE_MISMATCH'),
 check('reject-same-url-changed-archive-hash',lambda r:r['baseSource'].update(contentSha256='0'*64),'SELECTED_GTFS_BASE_SOURCE_MISMATCH'),
 check('reject-cross-agency-route',lambda r:r.update(agencyId='4000020442011',operator='大分市（大分きゃんバス）'),'SELECTED_GTFS_TRIP_IDENTITY_MISMATCH'),
 check('reject-descriptor-agency-not-an-exact-native-record',foreign_descriptor_agency,'SELECTED_GTFS_BASE_SOURCE_MISMATCH'),
 check('reject-section-parent-sequence-hash-mismatch',wrong_section_parent_hash,'SELECTED_GTFS_SECTION_REVIEW_MISMATCH'),
 check('reject-section-selected-calls-mismatch',section_stop_edit,'SELECTED_GTFS_REVIEW_SCOPE_CHANGED'),
]

print(json.dumps(results,ensure_ascii=False,indent=2))
if not all(x['pass'] for x in results): raise SystemExit('PRIVATE_AGENCY_SUBSET_TEST_FAILURE')
