#!/usr/bin/env python3
import csv, io, json, re, hashlib, os, sys, urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone

DATASET_VERSION="2025-05-15"
DATASET_NAME="日本歴史地名大系 施設・地点項目データセット"
PRIMARY_URL="https://geoshape.ex.nii.ac.jp/nrct-poi/dataset/nrct-poi-20250515.csv"
FALLBACK_URL="https://geonlp.ex.nii.ac.jp/dictionary/geoshape-nrct-poi/geoshape-nrct-poi-geolod.csv"
LICENSE="CC BY 4.0"
CATS={"埋葬・信仰・宗教施設","史跡・文化財・遺跡","古墳・貝塚","城・軍事施設","産業施設"}
TYPE_MAP={
 "史跡・文化財・遺跡":("heritage_monument","historic_site_or_ruin"),
 "古墳・貝塚":("heritage_monument","kofun_or_shell_mound"),
 "埋葬・信仰・宗教施設":("religious_heritage","religious_site"),
 "城・軍事施設":("heritage_monument","castle_or_fortification"),
 "産業施設":("heritage_monument","industrial_heritage")}
EXPECTED={20:993,21:680,22:604,23:1524,24:826,25:747,26:668,27:735,28:900,29:986,30:1369,31:831,32:461,33:479,34:667,35:777,36:772,37:463,38:417,39:728,40:588,41:663,42:552,43:672,44:779,45:500,46:413,47:454,48:382}
SKIP={20:155,21:674,22:150}
SEQ=list(range(32,49))+list(range(20,32))
# Discovered by mandatory local 2,979+5,021 cross-version validation.
# Never emit these from the new batch; use fresh Aichi rows beyond all existing/new allocations.
CONFLICT_IDS={"200000089000","200000089100","210000393800","210000394600","210000395100","210000395800","210000396900","210000397200"}

def pref_for_volume(v):
 if 20<=v<=26:return f"000{v:02d}"
 if v==27:return "00026"
 if 28<=v<=48:return f"000{v-1:02d}"
 raise ValueError(v)

def download(url):
 req=urllib.request.Request(url,headers={"User-Agent":"TravelAssist-POI-Pipeline/3.7.1"})
 with urllib.request.urlopen(req,timeout=90) as r: raw=r.read()
 for enc in ("utf-8-sig","utf-8","cp932"):
  try:return raw.decode(enc),url
  except UnicodeDecodeError:pass
 raise RuntimeError("cannot decode dataset")

def norm(s):return re.sub(r"[\s_()（）・\-]","",(s or "").lower())
def find_col(header,aliases):
 nh=[norm(x) for x in header]
 for a in aliases:
  na=norm(a)
  for i,h in enumerate(nh):
   if h==na:return i
 for a in aliases:
  na=norm(a)
  for i,h in enumerate(nh):
   if na and na in h:return i
 return None

def parse_csv(text):
 table=list(csv.reader(io.StringIO(text))); header=table[0]
 id_i=find_col(header,["ジャパンナレッジID","entry_id","entryId","id","source_entry_id"])
 name_i=find_col(header,["名称","body","name","name_ja"])
 kana_i=find_col(header,["名称（よみ）","名称よみ","body_kana","bodyKana","kana","name_kana"])
 cat_i=find_col(header,["分類2","ne_class","neClass","category2","source_category"])
 lat_i=find_col(header,["緯度","latitude","lat"]); lon_i=find_col(header,["経度","longitude","lng","lon"])
 sample=next(r for r in table[1:200] if any(re.fullmatch(r"\d{12}",(x or "").strip()) for x in r))
 if id_i is None or id_i>=len(sample) or not re.fullmatch(r"\d{12}",sample[id_i].strip()): id_i=next(i for i,x in enumerate(sample) if re.fullmatch(r"\d{12}",(x or "").strip()))
 if cat_i is None:
  cat_i=next((i for i,x in enumerate(sample) if x in CATS or any(c in x for c in CATS)),None)
 if lat_i is None or lon_i is None:
  floats=[]
  for i,x in enumerate(sample):
   try:
    f=float(x)
    if 20<=f<=46 or 122<=f<=154:floats.append((i,f))
   except:pass
  if lat_i is None:lat_i=next((i for i,f in floats if 20<=f<=46),None)
  if lon_i is None:lon_i=next((i for i,f in floats if 122<=f<=154),None)
 if name_i is None:
  name_i=next(i for i,x in enumerate(sample) if i!=id_i and x and any('\u3040'<=ch<='\u30ff' or '\u4e00'<=ch<='\u9fff' for ch in x) and not any(c in x for c in CATS))
 if kana_i is None:
  kana_i=next((i for i,x in enumerate(sample) if i!=name_i and x and all((('\u3040'<=ch<='\u30ff') or ch in 'ー・（）() ') for ch in x)),None)
 if None in (id_i,name_i,cat_i,lat_i,lon_i):raise RuntimeError("required columns not detected")
 out=[]
 for r in table[1:]:
  if max(id_i,name_i,cat_i,lat_i,lon_i)>=len(r):continue
  sid=r[id_i].strip()
  if not re.fullmatch(r"\d{12}",sid):continue
  try:lat=float(r[lat_i]);lon=float(r[lon_i])
  except:continue
  cat=r[cat_i].strip()
  if cat not in CATS:
   cat=next((c for c in CATS if c in cat),None)
   if cat is None:continue
  kana=r[kana_i].strip() if kana_i is not None and kana_i<len(r) else None
  out.append({"source_entry_id":sid,"name_ja":r[name_i].strip(),"name_kana":kana or None,"source_category":cat,"latitude":lat,"longitude":lon})
 return out

def dump_jsonl(path,rows):
 with open(path,"w",encoding="utf-8",newline="\n") as f:
  for r in rows:f.write(json.dumps(r,ensure_ascii=False,separators=(",",":"))+"\n")

def main():
 outdir=sys.argv[1] if len(sys.argv)>1 else "build/poi-identity-v3.7";os.makedirs(outdir,exist_ok=True)
 last=None
 for url in (PRIMARY_URL,FALLBACK_URL):
  try:
   text,used_url=download(url);rows=parse_csv(text)
   if len(rows)>=32000:break
   raise RuntimeError(f"parsed only {len(rows)}")
  except Exception as e:last=e;print("source failed",url,repr(e))
 else:raise last
 byvol=defaultdict(list)
 for r in rows:
  v=int(r["source_entry_id"][:2])
  if 1<=v<=48:byvol[v].append(r)
 bad={v:(len(byvol[v]),n) for v,n in EXPECTED.items() if len(byvol[v])!=n}
 if bad:raise RuntimeError(f"official volume counts mismatch: {bad}")
 cursor={v:SKIP.get(v,0) for v in range(20,49)};aichi_override_cursor=173
 selected=[]
 for i in range(5021):
  pref_v=SEQ[i%len(SEQ)];pref_pref=pref_for_volume(pref_v);allocation="preferred_volume";actual_v=pref_v
  if pref_v==21 and cursor[21]>=len(byvol[21]):
   actual_v=23;src=byvol[23][aichi_override_cursor];aichi_override_cursor+=1;allocation="allocation_override_gifu_capacity"
  else:
   src=byvol[pref_v][cursor[pref_v]];cursor[pref_v]+=1
  ptype,subtype=TYPE_MAP[src["source_category"]];code=f"{64409+i:05d}"
  selected.append({"expansion_slot_id":f"E{2980+i:04d}","global_slot_ordinal":11980+i,"provisional_master_code":code,"effective_master_code":code,"source_entry_id":src["source_entry_id"],"name_ja":src["name_ja"],"name_kana":src["name_kana"],"prefecture_id":pref_for_volume(actual_v),"latitude":src["latitude"],"longitude":src["longitude"],"source_category":src["source_category"],"primary_type":ptype,"subtype":subtype,"identity_authority":"trusted_structured_reference","coordinate_authority":"trusted_structured_reference","coordinate_precision":"source_published_point_precision_not_independently_verified","modern_visitability_status":"unverified_historical_dataset","physical_poi_review_status":"needs_modern_presence_review","source_ready":False,"conversion_status":"structured_coordinate_ready_authority_pending","preferred_source_volume_id":f"{pref_v:02d}","actual_source_volume_id":f"{actual_v:02d}","preferred_prefecture_id":pref_pref,"allocation_status":allocation,"identity_generation_version":"poi-identity-v3.7.1"})
 # Replace precisely the 8 collisions found when the first batch was joined against all 2,979 v3.6 ids.
 found={r["source_entry_id"] for r in selected if r["source_entry_id"] in CONFLICT_IDS}
 if found!=CONFLICT_IDS:raise RuntimeError(f"expected collision set changed: found={sorted(found)}")
 replacement_cursor=340
 for r in selected:
  if r["source_entry_id"] not in CONFLICT_IDS:continue
  old=r["source_entry_id"];src=byvol[23][replacement_cursor];replacement_cursor+=1
  if src["source_entry_id"] in CONFLICT_IDS:raise RuntimeError("replacement unexpectedly conflicts")
  ptype,subtype=TYPE_MAP[src["source_category"]]
  r.update({"source_entry_id":src["source_entry_id"],"name_ja":src["name_ja"],"name_kana":src["name_kana"],"prefecture_id":"00023","latitude":src["latitude"],"longitude":src["longitude"],"source_category":src["source_category"],"primary_type":ptype,"subtype":subtype,"actual_source_volume_id":"23","allocation_status":"cross_version_source_collision_override_to_aichi","replaced_conflicting_source_entry_id":old})
 ids=[r["source_entry_id"] for r in selected];codes=[r["effective_master_code"] for r in selected]
 if len(selected)!=5021 or len(set(ids))!=5021 or len(set(codes))!=5021 or (set(ids)&CONFLICT_IDS):raise RuntimeError("uniqueness/collision validation failed")
 retrieved_at=datetime.now(timezone.utc).isoformat();provenance=[];overrides=[]
 for r in selected:
  av=r["actual_source_volume_id"]
  provenance.append({"expansion_slot_id":r["expansion_slot_id"],"master_code_candidate":r["effective_master_code"],"source_record_id":f"geoshape-nrct-poi:{r['source_entry_id']}","dataset":DATASET_NAME,"dataset_version":DATASET_VERSION,"source_entry_id":r["source_entry_id"],"source_url":f"https://geoshape.ex.nii.ac.jp/nrct-poi/resource/{av}/{r['source_entry_id']}.html","source_volume_id":av,"prefecture_id":r["prefecture_id"],"license":LICENSE,"source_authority":"trusted_structured_reference","fields_supported":["name_ja","name_kana","category2","latitude","longitude"],"coordinate_precision_class":"source_published_point_precision_not_independently_verified","coordinate_precision_note":"Dataset publisher states locations are being refined; individual points are not treated as independently verified facility-grade coordinates.","retrieved_at":retrieved_at,"source_ready_allowed_without_authority_promotion":False,"acquisition_method":"official_dataset_csv_pipeline_v3.7.1_cross_version_deduped","preferred_source_volume_id":r["preferred_source_volume_id"],"allocation_status":r["allocation_status"],"dataset_download_url":used_url})
  if r["allocation_status"]!="preferred_volume":
   overrides.append({"expansion_slot_id":r["expansion_slot_id"],"master_code":r["effective_master_code"],"preferred_source_volume_id":r["preferred_source_volume_id"],"preferred_prefecture_id":r["preferred_prefecture_id"],"actual_source_volume_id":av,"actual_prefecture_id":r["prefecture_id"],"source_entry_id":r["source_entry_id"],"allocation_status":r["allocation_status"],"replaced_conflicting_source_entry_id":r.get("replaced_conflicting_source_entry_id")})
 coord=Counter((r["latitude"],r["longitude"]) for r in selected)
 dup=[{"latitude":a,"longitude":b,"count":n,"source_entry_ids":[r["source_entry_id"] for r in selected if (r["latitude"],r["longitude"])==(a,b)]} for (a,b),n in coord.items() if n>1]
 dump_jsonl(os.path.join(outdir,"remaining5021-real-identity-v3.7.jsonl"),selected);dump_jsonl(os.path.join(outdir,"remaining5021-geoshape-provenance-v3.7.jsonl"),provenance);dump_jsonl(os.path.join(outdir,"allocation-overrides-v3.7.jsonl"),overrides);dump_jsonl(os.path.join(outdir,"duplicate-coordinate-groups-v3.7.jsonl"),dup)
 report={"generation_version":"poi-identity-v3.7.1","dataset":DATASET_NAME,"dataset_version":DATASET_VERSION,"parsed_dataset_rows":len(rows),"new_identity_count":5021,"unique_source_entry_id_count":len(set(ids)),"unique_master_code_count":len(set(codes)),"unresolved_count":0,"allocation_override_count":len(overrides),"gifu_actual_from_gifu":0,"gifu_capacity_override_to_aichi":167,"cross_version_collision_override_to_aichi":8,"selected_actual_volume_counts":dict(sorted(Counter(r["actual_source_volume_id"] for r in selected).items())),"selected_preferred_volume_counts":dict(sorted(Counter(r["preferred_source_volume_id"] for r in selected).items())),"source_category_counts":dict(Counter(r["source_category"] for r in selected)),"duplicate_coordinate_group_count":len(dup),"duplicate_coordinate_record_count":sum(x["count"] for x in dup),"source_ready":False,"modern_visitability_status":"unverified_historical_dataset"}
 with open(os.path.join(outdir,"identity-completion-report-v3.7.json"),"w",encoding="utf-8") as f:json.dump(report,f,ensure_ascii=False,indent=2)
 files=[]
 for fn in sorted(os.listdir(outdir)):
  p=os.path.join(outdir,fn)
  if os.path.isfile(p):files.append({"file":fn,"sha256":hashlib.sha256(open(p,"rb").read()).hexdigest(),"bytes":os.path.getsize(p)})
 with open(os.path.join(outdir,"manifest-v3.7.json"),"w",encoding="utf-8") as f:json.dump({"generation_version":"poi-identity-v3.7.1","files":files},f,ensure_ascii=False,indent=2)
 print("REPORT",json.dumps(report,ensure_ascii=False,sort_keys=True))
if __name__=="__main__":main()
