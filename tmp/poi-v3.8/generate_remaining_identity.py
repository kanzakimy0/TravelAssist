#!/usr/bin/env python3
import base64,csv,hashlib,json,re,zlib
from collections import Counter,defaultdict
from pathlib import Path
from datetime import datetime,timezone,timedelta

ROOT=Path(__file__).resolve().parent
CSV=ROOT/'nrct-poi-20250515.csv'
OUT=ROOT/'out'
OUT.mkdir(parents=True,exist_ok=True)
DATASET='日本歴史地名大系 施設・地点項目データセット'
DATASET_VERSION='2025-05-15'
DATASET_URL='https://geoshape.ex.nii.ac.jp/nrct-poi/dataset/nrct-poi-20250515.csv'
LICENSE='CC BY 4.0'
GEN='travelassist-poi-identity-v3.8-geoshape'
JST=timezone(timedelta(hours=9))
NOW=datetime.now(JST).replace(microsecond=0).isoformat()

EXPECTED_COUNTS={
'01':769,'02':687,'03':643,'04':449,'05':367,'06':519,'07':615,'08':1047,'09':501,'10':618,
'11':541,'12':670,'13':562,'14':554,'15':862,'16':494,'17':436,'18':642,'19':432,'20':993,
'21':680,'22':604,'23':1524,'24':826,'25':747,'26':668,'27':735,'28':900,'29':986,'30':1369,
'31':831,'32':461,'33':479,'34':667,'35':777,'36':772,'37':463,'38':417,'39':728,'40':588,
'41':663,'42':552,'43':672,'44':779,'45':500,'46':413,'47':454,'48':382}
VOL_PREF={str(v).zfill(2):str(v).zfill(5) for v in range(1,27)}
VOL_PREF['27']='00026'
for v in range(28,49): VOL_PREF[str(v)]=f'{v-1:05d}'
PREFERRED_SEQUENCE=[f'{v:02d}' for v in range(32,49)]+[f'{v:02d}' for v in range(20,32)]

def norm(s): return re.sub(r'[\s_()（）・:/-]+','',str(s or '')).lower()
def pick(row,cands):
    nmap={norm(k):k for k in row}
    for c in cands:
        if norm(c) in nmap:return row[nmap[norm(c)]]
    return None

def map_type(cat):
    return {
      '埋葬・信仰・宗教施設':('religious_heritage','religious_site'),
      '史跡・文化財・遺跡':('heritage_monument','historic_site_or_ruin'),
      '城・軍事施設':('heritage_monument','castle_or_fortification'),
      '古墳・貝塚':('heritage_monument','kofun_or_shell_mound'),
      '産業施設':('heritage_monument','industrial_heritage'),
    }.get(cat,('heritage_monument','historical_cultural_poi_pending_review'))

def write_jsonl(path,rows):
    with open(path,'w',encoding='utf-8',newline='\n') as f:
        for r in rows:f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')

def sha(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()

# Exact prior 2,979 source IDs, compressed only to keep this temporary data-transfer file small.
b64=(ROOT/'used-geoshape-source-ids-v3.6.zlib.b64').read_text(encoding='utf-8').strip()
used=set(zlib.decompress(base64.b64decode(b64)).decode('utf-8').splitlines())
if len(used)!=2979: raise SystemExit(f'expected 2979 prior ids, got {len(used)}')

rows=[]
with open(CSV,encoding='utf-8-sig',newline='') as f:
    rd=csv.DictReader(f)
    for raw in rd:
        sid=str(pick(raw,['ジャパンナレッジID','日本歴史地名体系ID','source_entry_id','entry_id','id']) or '').strip()
        name=str(pick(raw,['名称','name_ja','name']) or '').strip()
        kana=str(pick(raw,['名称（よみ）','名称よみ','name_kana','kana']) or '').strip() or None
        cat=str(pick(raw,['分類2','category2','sub_category']) or '').strip()
        cat1=str(pick(raw,['分類1','category1']) or '').strip() or None
        latv=pick(raw,['緯度','latitude','lat']); lonv=pick(raw,['経度','longitude','lon','lng'])
        if not sid: continue
        try: lat=float(latv); lon=float(lonv)
        except (TypeError,ValueError): lat=lon=None
        rows.append({'source_entry_id':sid,'source_volume_id':sid[:2],'name_ja':name or None,'name_kana':kana,'category1':cat1,'category2':cat or None,'latitude':lat,'longitude':lon})

source_counts=Counter(r['source_volume_id'] for r in rows)
if len(rows)!=32038: raise SystemExit(f'official source row-count mismatch: {len(rows)} != 32038')
if dict(sorted(source_counts.items()))!=dict(sorted(EXPECTED_COUNTS.items())):
    raise SystemExit(f'official per-volume counts mismatch: {source_counts}')

# Only source rows with all queue-required deterministic fields are eligible.
byvol=defaultdict(list)
for r in rows:
    if r['source_entry_id'] in used: continue
    if not r['name_ja'] or not r['category2'] or r['latitude'] is None or r['longitude'] is None: continue
    if r['source_volume_id'] not in set(PREFERRED_SEQUENCE): continue
    byvol[r['source_volume_id']].append(r)
for v in byvol: byvol[v].sort(key=lambda x:x['source_entry_id'])

# Reconstruct the exact supplied queue E2980..E8000. The original file is sequential by slot/code/global ordinal.
queue=[]
for i in range(5021):
    eslot=2980+i
    vol=PREFERRED_SEQUENCE[i%len(PREFERRED_SEQUENCE)]
    queue.append({
      'expansion_slot_id':f'E{eslot:04d}','global_slot_ordinal':11980+i,'small_image_slot_id':f'SMALL-{11980+i}',
      'provisional_master_code':f'{64409+i:05d}','preferred_source_volume_id':vol,
      'preferred_prefecture_id':VOL_PREF[vol]})

cursor=defaultdict(int); assigned=[]; deferred=[]; assigned_ids=set()
for q in queue:
    v=q['preferred_source_volume_id']; pool=byvol[v]; idx=cursor[v]
    if idx>=len(pool): deferred.append(q); continue
    src=pool[idx];cursor[v]+=1;assigned_ids.add(src['source_entry_id']);assigned.append((q,src,'preferred_volume',None))

# Deterministic balanced fallback for exhausted preferred volumes: one row per spare volume per round, sorted 20..48.
# The true actual source volume/prefecture is preserved; preferred volume is never falsified.
spare_vols=[f'{v:02d}' for v in range(20,49) if f'{v:02d}'!='21']
spare_cursor={v:cursor[v] for v in spare_vols}
si=0
for q in deferred:
    found=None
    for _ in range(len(spare_vols)*10000):
        v=spare_vols[si%len(spare_vols)];si+=1
        pool=byvol[v]; idx=spare_cursor[v]
        if idx<len(pool):
            src=pool[idx];spare_cursor[v]+=1
            if src['source_entry_id'] in assigned_ids: continue
            found=src;break
    if found is None: raise SystemExit(f'no fallback source for {q}')
    assigned_ids.add(found['source_entry_id'])
    assigned.append((q,found,'fallback','preferred_volume_exhausted'))

# Restore canonical queue order after fallback fill.
assigned.sort(key=lambda x:x[0]['global_slot_ordinal'])
identities=[]; provenance=[]; selected=[]
for q,s,alloc,fallback_reason in assigned:
    pt,st=map_type(s['category2']); av=s['source_volume_id']; ap=VOL_PREF[av]
    base={
      'expansion_slot_id':q['expansion_slot_id'],'global_slot_ordinal':q['global_slot_ordinal'],'small_image_slot_id':q['small_image_slot_id'],
      'provisional_master_code':q['provisional_master_code'],'effective_master_code':q['provisional_master_code'],
      'preferred_source_volume_id':q['preferred_source_volume_id'],'preferred_prefecture_id':q['preferred_prefecture_id'],
      'source_entry_id':s['source_entry_id'],'source_volume_id':av,'name_ja':s['name_ja'],'name_kana':s['name_kana'],
      'prefecture_id':ap,'latitude':s['latitude'],'longitude':s['longitude'],'source_category':s['category2'],
      'primary_type':pt,'subtype':st,'allocation_status':alloc,'allocation_fallback_reason':fallback_reason,
      'identity_authority':'trusted_structured_reference','coordinate_authority':'trusted_structured_reference',
      'coordinate_precision':'source_published_point_precision_not_independently_verified',
      'modern_visitability_status':'unverified_historical_dataset','physical_poi_review_status':'needs_modern_presence_review',
      'source_ready':False,'conversion_status':'structured_coordinate_ready_authority_pending',
      'generation_version':GEN,'updated_at':NOW}
    identities.append(base)
    provenance.append({
      'expansion_slot_id':q['expansion_slot_id'],'effective_master_code':q['provisional_master_code'],
      'source_record_id':f"geoshape-nrct-poi:{s['source_entry_id']}",'dataset':DATASET,'dataset_version':DATASET_VERSION,
      'source_entry_id':s['source_entry_id'],'source_url':f"https://geoshape.ex.nii.ac.jp/nrct-poi/resource/{av}/{s['source_entry_id']}.html",
      'dataset_url':DATASET_URL,'source_volume_id':av,'prefecture_id':ap,'preferred_source_volume_id':q['preferred_source_volume_id'],
      'preferred_prefecture_id':q['preferred_prefecture_id'],'allocation_status':alloc,'allocation_fallback_reason':fallback_reason,
      'license':LICENSE,'source_authority':'trusted_structured_reference','fields_supported':['name_ja','name_kana','category2','latitude','longitude'],
      'coordinate_precision_class':'source_published_point_precision_not_independently_verified',
      'coordinate_precision_note':'Dataset publisher states locations are being refined; individual points are not treated as independently verified facility-grade coordinates.',
      'retrieved_at':NOW,'acquisition_method':'official_geoshape_csv_2025-05-15_via_github_actions','generation_version':GEN})
    selected.append({**q,**s,'actual_prefecture_id':ap,'allocation_status':alloc,'allocation_fallback_reason':fallback_reason})

if len(identities)!=5021: raise SystemExit(f'converted count {len(identities)} != 5021')
new_ids=[r['source_entry_id'] for r in identities]; codes=[r['effective_master_code'] for r in identities]
if len(set(new_ids))!=5021: raise SystemExit('duplicate source_entry_id in new output')
if set(new_ids)&used: raise SystemExit('new output overlaps prior used source_entry_id')
if len(set(codes))!=5021: raise SystemExit('duplicate master code in new output')
required_bad=[r['expansion_slot_id'] for r in identities if not r['source_entry_id'] or not r['name_ja'] or not r['source_category'] or r['latitude'] is None or r['longitude'] is None]
if required_bad: raise SystemExit(f'missing required deterministic fields: {required_bad[:10]}')
invalid_coord=[r['expansion_slot_id'] for r in identities if not (-90<=r['latitude']<=90 and -180<=r['longitude']<=180)]
if invalid_coord: raise SystemExit(f'invalid coords: {invalid_coord[:10]}')

coord=Counter((r['latitude'],r['longitude']) for r in identities)
dup_coord_groups={f'{a},{b}':n for (a,b),n in coord.items() if n>1}
preferred_counts=Counter(q['preferred_source_volume_id'] for q,_,_,_ in assigned)
actual_counts=Counter(r['source_volume_id'] for r in identities)
alloc_counts=Counter(r['allocation_status'] for r in identities)
cat_counts=Counter(r['source_category'] for r in identities)
report={
 'generation_version':GEN,'generated_at':NOW,'dataset':DATASET,'dataset_version':DATASET_VERSION,'dataset_url':DATASET_URL,
 'source_csv_sha256':sha(CSV),'source_row_count':len(rows),'source_per_volume':dict(sorted(source_counts.items())),
 'prior_used_source_ids':len(used),'queue_count':len(queue),'converted_count':len(identities),'unresolved_count':0,
 'preferred_allocation_count':alloc_counts['preferred_volume'],'fallback_allocation_count':alloc_counts['fallback'],
 'fallback_reason_counts':dict(Counter(r['allocation_fallback_reason'] for r in identities if r['allocation_fallback_reason'])),
 'preferred_volume_counts':dict(sorted(preferred_counts.items())),'actual_volume_counts':dict(sorted(actual_counts.items())),
 'category_counts':dict(cat_counts),'duplicate_new_source_entry_id_count':len(new_ids)-len(set(new_ids)),
 'overlap_with_prior_source_entry_id_count':len(set(new_ids)&used),'duplicate_master_code_count':len(codes)-len(set(codes)),
 'missing_required_field_count':len(required_bad),'invalid_coordinate_count':len(invalid_coord),
 'duplicate_coordinate_group_count':len(dup_coord_groups),'records_in_duplicate_coordinate_groups':sum(dup_coord_groups.values()),
 'duplicate_coordinate_groups':dup_coord_groups,
 'authority_policy':{'source_ready':False,'modern_visitability_status':'unverified_historical_dataset','physical_poi_review_status':'needs_modern_presence_review'}
}

write_jsonl(OUT/'expansion8000-remaining-real-identity-v3.8.jsonl',identities)
write_jsonl(OUT/'expansion8000-remaining-geoshape-provenance-v3.8.jsonl',provenance)
write_jsonl(OUT/'expansion8000-selected-source-records-v3.8.jsonl',selected)
(OUT/'identity-completion-report-v3.8.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
md=f'''# TravelAssist Expansion8000 Remaining Identity Completion v3.8\n\n- Generated: {NOW}\n- Official source rows validated: **{len(rows):,} / 32,038**\n- Remaining queue converted: **{len(identities):,} / 5,021**\n- Preferred-volume assignments: **{alloc_counts['preferred_volume']:,}**\n- Explicit fallback assignments: **{alloc_counts['fallback']:,}** (`preferred_volume_exhausted`)\n- Duplicate new source IDs: **0**\n- Overlap with prior 2,979 source IDs: **0**\n- Duplicate Master Codes: **0**\n- Missing required deterministic identity fields: **0**\n- Unresolved queue entries: **0**\n\nThe 167 fallback records are not relabeled as source volume 21. Their actual source volume and actual prefecture are stored, while the original preferred volume/prefecture remain as allocation metadata. All records remain `source_ready=false` until modern physical presence / visitability authority review.\n'''
(OUT/'identity-completion-summary-v3.8.md').write_text(md,encoding='utf-8')
manifest={'generation_version':GEN,'generated_at':NOW,'files':{}}
for p in sorted(OUT.iterdir()):
    if p.name=='manifest-v3.8.json':continue
    manifest['files'][p.name]={'bytes':p.stat().st_size,'sha256':sha(p)}
(OUT/'manifest-v3.8.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({k:report[k] for k in ['source_row_count','queue_count','converted_count','unresolved_count','preferred_allocation_count','fallback_allocation_count','duplicate_new_source_entry_id_count','overlap_with_prior_source_entry_id_count','duplicate_master_code_count','missing_required_field_count']},ensure_ascii=False,indent=2))
