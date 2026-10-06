import unittest,json,copy,zipfile,io,csv,hashlib,importlib.util,subprocess,sys,base64,difflib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
EXTRACTOR=ROOT/'tools/transport/task-086-extract-selected-gtfs.py'
FIXTURE=ROOT/'tests/fixtures/task-086-selected-gtfs-trailing-fields.json'
spec=importlib.util.spec_from_file_location('selected_gtfs_extractor',EXTRACTOR);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
REQ=json.loads(FIXTURE.read_text(encoding='utf8'))
RAW=(ROOT/'data/transport/network'/REQ['retainedArchive']).read_bytes();PROFILE=m.REVIEWED_TRAILING_PROFILE


def rewrite(raw,member,transform):
 z=zipfile.ZipFile(io.BytesIO(raw));out=io.BytesIO()
 with zipfile.ZipFile(out,'w') as w:
  for n in z.namelist():w.writestr(n,transform(z.read(n)) if n==member else z.read(n))
 return out.getvalue()
def csvedit(fn):
 def edit(b):
  rows=list(csv.reader(io.StringIO(b.decode('utf-8-sig'))));fn(rows);o=io.StringIO(newline='');csv.writer(o,lineterminator='\n').writerows(rows);return o.getvalue().encode()
 return edit
def revised(raw,review=True):
 r=copy.deepcopy(REQ);r['archiveSha256']=m.sha(raw)
 if not review:r.pop('sourceCsvLayoutReview',None)
 return r
STANDARD=rewrite(RAW,'trips.txt',csvedit(lambda rs: [rs.__setitem__(i,r[:5]) for i,r in enumerate(rs)]))
class ContractTests(unittest.TestCase):
 def reject(self,raw=RAW,req=None,needle='SELECTED_GTFS'):
  with self.assertRaisesRegex(ValueError,needle):m.extract(raw,REQ if req is None else req)
 def test_physical_blank_lines_match_original_dictreader(self):
  raw=rewrite(STANDARD,'trips.txt',lambda b:b.replace(b'\n',b'\n\n'))
  req=revised(raw,False)
  with zipfile.ZipFile(io.BytesIO(raw)) as z:
   expected=list(csv.DictReader(io.StringIO(z.read('trips.txt').decode('utf-8-sig'))))
   self.assertEqual(m.read_native_table(z,'trips',req,m.sha(raw),set()),expected)
  self.assertEqual(len(m.extract(raw,req)['patterns']),2)
 def test_delimiter_only_row_is_not_skipped(self):
  raw=rewrite(STANDARD,'trips.txt',lambda b:b+b',,,,\n');self.reject(raw,revised(raw,False),needle='CSV_CORE_VALUE_MISSING')
 def test_one_missing_core_cell_is_not_skipped(self):
  raw=rewrite(STANDARD,'trips.txt',csvedit(lambda rs:rs[1].__setitem__(0,'')));self.reject(raw,revised(raw,False),needle='CSV_CORE_VALUE_MISSING')
 def test_review_for_missing_member_rejected_even_empty_selection(self):
  source=zipfile.ZipFile(io.BytesIO(STANDARD));out=io.BytesIO()
  with zipfile.ZipFile(out,'w') as z:
   for name in source.namelist():
    if name!='trips.txt':z.writestr(name,source.read(name))
  raw=out.getvalue();req=revised(raw);req['trips']=[];self.reject(raw,req,needle='CSV_LAYOUT_REVIEW_NOT_CONSUMED')
 def test_review_for_unread_member_rejected(self):
  req=revised(STANDARD);req['sourceCsvLayoutReview']['member']='not_read.txt';self.reject(STANDARD,req,needle='CSV_LAYOUT_REVIEW_NOT_CONSUMED')
 def test_nonobject_layout_review_diagnostic(self):
  req=revised(STANDARD);req['sourceCsvLayoutReview']='WRONG_TYPE';self.reject(STANDARD,req,needle='CSV_LAYOUT_REVIEW_NOT_CONSUMED')
 def test_exact_source_extracts_two_actual_sections(self):
  p=m.extract(RAW,REQ);self.assertEqual([len(x['callingNodes']) for x in p['patterns']],[2,2]);self.assertEqual(len(p['nodes']),4)
 def test_original_named_fields_and_extra_cells_preserved(self):
  p=m.extract(RAW,REQ);z=zipfile.ZipFile(io.BytesIO(RAW));rs=list(csv.reader(io.StringIO(z.read('trips.txt').decode('utf-8-sig'))));native={r[2]:r for r in rs[1:]}
  for e in p['evidence']:
   if 'trip' not in e['record']:continue
   t=e['record']['trip'];row=native[t['trip_id']];self.assertEqual({k:t[k] for k in rs[0]},dict(zip(rs[0],row[:5])));self.assertEqual(t['uninterpretedTrailingFields'],row[5:]);self.assertNotIn('block_id',t);self.assertNotIn('shape_id',t);self.assertEqual(e['recordSha256'],m.sha(e['record']))
 def test_profile_marks_nonstandard_source(self):self.assertEqual(m.extract(RAW,REQ)['source']['sourceCsvLayoutReview']['sourceSchemaStatus'],'NONSTANDARD_SURPLUS_COLUMNS_EXPLICITLY_PRESERVED_NOT_GTFS_SCHEMA_CERTIFIED')
 def test_deterministic_reconstruction(self):self.assertEqual(m.sha(m.extract(RAW,REQ)),m.sha(m.extract(RAW,copy.deepcopy(REQ))))
 def test_missing_review_diagnostic(self):self.reject(req=revised(RAW,False),needle='CSV_SURPLUS_LAYOUT_REVIEW_REQUIRED')
 def test_unknown_review_rejected(self):
  r=copy.deepcopy(REQ);r['sourceCsvLayoutReview']['reviewId']='UNKNOWN';self.reject(req=r,needle='CSV_SURPLUS_LAYOUT_REVIEW_REQUIRED')
 def test_unknown_source_url_rejected(self):
  r=copy.deepcopy(REQ);r['sourceUrl']='https://example.org/another.zip';self.reject(req=r,needle='CSV_LAYOUT_SOURCE_MISMATCH')
 def test_archive_changed_rejected(self):
  raw=rewrite(RAW,'feed_info.txt',lambda b:b+b'\n');self.reject(raw,revised(raw),needle='CSV_LAYOUT_SOURCE_MISMATCH')
 def test_resealed_profile_rejected(self):
  raw=rewrite(RAW,'trips.txt',lambda b:b.replace(b'SHP0001',b'CHANGED'));r=revised(raw);r['sourceCsvLayoutReview']['archiveSha256']=m.sha(raw);self.reject(raw,r,needle='CSV_SURPLUS_LAYOUT_REVIEW_REQUIRED')
 def test_member_changed_rejected(self):
  raw=rewrite(RAW,'trips.txt',lambda b:b.replace(b'SHP0001',b'CHANGED'));self.reject(raw,revised(raw),needle='CSV_LAYOUT_SOURCE_MISMATCH')
 def test_width_changed_rejected(self):
  raw=rewrite(RAW,'trips.txt',csvedit(lambda rs:rs[1].append('EXTRA')));self.reject(raw,revised(raw))
 def test_row_count_changed_rejected(self):
  raw=rewrite(RAW,'trips.txt',csvedit(lambda rs:rs.pop()));self.reject(raw,revised(raw))
 def test_named_columns_swapped_rejected(self):
  raw=rewrite(RAW,'trips.txt',csvedit(lambda rs:rs[1].__setitem__(slice(0,2),list(reversed(rs[1][:2])))));self.reject(raw,revised(raw))
 def test_header_reordered_rejected(self):
  raw=rewrite(RAW,'trips.txt',csvedit(lambda rs:rs[0].__setitem__(slice(0,2),list(reversed(rs[0][:2])))));self.reject(raw,revised(raw))
 def test_duplicate_header_diagnostic(self):
  raw=rewrite(RAW,'trips.txt',csvedit(lambda rs:rs[0].__setitem__(1,'route_id')));self.reject(raw,revised(raw),needle='CSV_HEADER_DUPLICATE_OR_EMPTY')
 def test_empty_header_diagnostic(self):
  raw=rewrite(RAW,'trips.txt',csvedit(lambda rs:rs[0].__setitem__(1,'')));self.reject(raw,revised(raw),needle='CSV_HEADER_DUPLICATE_OR_EMPTY')
 def test_missing_core_header_diagnostic(self):
  raw=rewrite(RAW,'trips.txt',csvedit(lambda rs:rs[0].__setitem__(2,'unknown')));self.reject(raw,revised(raw),needle='CSV_CORE_HEADER_MISSING')
 def test_reserved_field_collision_diagnostic(self):
  raw=rewrite(RAW,'trips.txt',csvedit(lambda rs:rs[0].append('uninterpretedTrailingFields')));self.reject(raw,revised(raw),needle='CSV_RESERVED_FIELD')
 def test_short_row_diagnostic(self):
  raw=rewrite(RAW,'trips.txt',csvedit(lambda rs:rs.__setitem__(1,rs[1][:3])));self.reject(raw,revised(raw),needle='CSV_SHORT_ROW')
 def test_unrelated_member_surplus_rejected(self):
  raw=rewrite(STANDARD,'routes.txt',csvedit(lambda rs:rs[1].append('UNKNOWN')));self.reject(raw,revised(raw,False),needle='CSV_SURPLUS_LAYOUT_REVIEW_REQUIRED:routes.txt')
 def test_standard_synthetic_named_csv_remains_supported(self):
  p=m.extract(STANDARD,revised(STANDARD,False));self.assertEqual(len(p['patterns']),2);self.assertNotIn('sourceCsvLayoutReview',p['source'])
 def test_removed_source_tail_not_accepted_under_review(self):self.reject(STANDARD,revised(STANDARD),needle='CSV_LAYOUT_SOURCE_MISMATCH')
 def test_parent_call_mutation_rejected(self):
  raw=rewrite(STANDARD,'stop_times.txt',lambda b:b.replace(b'189_1',b'188_1'));self.reject(raw,revised(raw,False),needle='SECTION_REVIEW_MISMATCH')
 def test_direction_mutation_rejected(self):
  def change(rs):
   for r in rs[1:]:
    if '10月12日' in r[1]:r[4]='9'
  raw=rewrite(STANDARD,'trips.txt',csvedit(change));self.reject(raw,revised(raw,False),needle='SECTION_REVIEW_MISMATCH')
 def test_pickup_dropoff_preserved(self):
  p=m.extract(RAW,REQ);self.assertEqual([[(c['pickupType'],c['dropOffType']) for c in x['callingNodes']] for x in p['patterns']],[[('0','0'),('1','0')],[('0','1'),('0','0')]])
 def test_expired_day_still_rejected(self):
  r=copy.deepcopy(REQ);r['serviceDate']='20261013';self.reject(req=r,needle='TRIP_NOT_ACTIVE')
 def test_full_parent_evidence_retained(self):
  p=m.extract(RAW,REQ);parents=[e for e in p['evidence'] if 'trip' in e['record'] and 'section' not in e['record']];self.assertEqual([len(e['record']['calls']) for e in parents],[28,28])
 def test_verify_stdin_accepts_exact_package(self):
  p=m.extract(RAW,REQ);r=subprocess.run([sys.executable,'-X','utf8',str(EXTRACTOR),'--verify-stdin'],input=json.dumps({'package':p,'archive':base64.b64encode(RAW).decode()}),text=True,capture_output=True);self.assertEqual(r.returncode,0,r.stderr)
 def test_verify_stdin_rejects_stripped_trailing_evidence(self):
  p=m.extract(RAW,REQ)
  for e in p['evidence']:
   if 'trip' in e['record']:e['record']['trip'].pop('uninterpretedTrailingFields',None)
  r=subprocess.run([sys.executable,'-X','utf8',str(EXTRACTOR),'--verify-stdin'],input=json.dumps({'package':p,'archive':base64.b64encode(RAW).decode()}),text=True,capture_output=True);self.assertNotEqual(r.returncode,0);self.assertIn('NATIVE_PACKAGE_MISMATCH',r.stderr)
if __name__=='__main__':
 unittest.main(verbosity=2)
