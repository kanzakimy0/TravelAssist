#!/usr/bin/env python3
import hashlib,json,math,os,re,sys,time,unicodedata
from collections import Counter,defaultdict
from datetime import datetime,timezone
from pathlib import Path
import requests
from rapidfuzz.fuzz import ratio
from shapely.geometry import Point,shape
from shapely.strtree import STRtree

GEN_VERSION="poi-source-enrichment-v3.8.1"
UA="TravelAssist-POI-Pipeline/3.8.1 (https://github.com/kanzakimy0/TravelAssist)"
SPARQL="https://query.wikidata.org/sparql"
PREFS={1:"北海道",2:"青森県",3:"岩手県",4:"宮城県",5:"秋田県",6:"山形県",7:"福島県",8:"茨城県",9:"栃木県",10:"群馬県",11:"埼玉県",12:"千葉県",13:"東京都",14:"神奈川県",15:"新潟県",16:"富山県",17:"石川県",18:"福井県",19:"山梨県",20:"長野県",21:"岐阜県",22:"静岡県",23:"愛知県",24:"三重県",25:"滋賀県",26:"京都府",27:"大阪府",28:"兵庫県",29:"奈良県",30:"和歌山県",31:"鳥取県",32:"島根県",33:"岡山県",34:"広島県",35:"山口県",36:"徳島県",37:"香川県",38:"愛媛県",39:"高知県",40:"福岡県",41:"佐賀県",42:"長崎県",43:"熊本県",44:"大分県",45:"宮崎県",46:"鹿児島県",47:"沖縄県"}
REGIONS={"JP-HOKKAIDO":("北海道地方",[1]),"JP-TOHOKU":("東北地方",list(range(2,8))),"JP-KANTO":("関東地方",list(range(8,15))),"JP-CHUBU":("中部地方",list(range(15,24))),"JP-KINKI":("近畿地方",list(range(24,31))),"JP-CHUGOKU":("中国地方",list(range(31,36))),"JP-SHIKOKU":("四国地方",list(range(36,40))),"JP-KYUSHU-OKINAWA":("九州・沖縄地方",list(range(40,48)))}
REGION_BY_PREF={p:k for k,(_,ps) in REGIONS.items() for p in ps}

def read_jsonl(p):
 o=[]
 with open(p,encoding="utf-8") as f:
  for line in f:
   if line.strip():o.append(json.loads(line))
 return o

def dump_jsonl(p,rows):
 Path(p).parent.mkdir(parents=True,exist_ok=True)
 with open(p,"w",encoding="utf-8",newline="\n") as f:
  for r in rows:f.write(json.dumps(r,ensure_ascii=False,separators=(",",":"))+"\n")

def norm(s):
 s=unicodedata.normalize("NFKC",s or "").lower()
 return re.sub(r"[\s　・･,，.。/／()（）\[\]【】『』「」'\"‐‑‒–—―ー_-]+","",s)

def hav(a,b,c,d):
 R=6371.0088;p1=math.radians(a);p2=math.radians(c);dp=math.radians(c-a);dl=math.radians(d-b)
 x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
 return 2*R*math.asin(min(1,math.sqrt(x)))

def build_admin(admin_docs):
 geoms=[];metas=[]
 for d in sorted(Path(admin_docs).glob("[0-9][0-9]")):
  pref=int(d.name)
  for fp in d.glob("*.json"):
   if not re.fullmatch(r"\d{5}",fp.stem):continue
   try:obj=json.load(open(fp,encoding="utf-8"))
   except:continue
   for feat in obj.get("features",[]):
    try:g=shape(feat["geometry"])
    except:continue
    geoms.append(g);metas.append({"pref_code":pref,"admin_code":fp.stem,"full_name":feat.get("properties",{}).get("name") or ""})
 return geoms,metas,STRtree(geoms)

def admin_for(row,geoms,metas,tree):
 pt=Point(float(row["longitude"]),float(row["latitude"]));hits=[]
 for idx in tree.query(pt):
  i=int(idx)
  if geoms[i].covers(pt):hits.append((geoms[i].area,metas[i]))
 if not hits:return None
 m=min(hits,key=lambda x:x[0])[1];pref_name=PREFS[m["pref_code"]];nm=m["full_name"]
 if nm.startswith(pref_name):nm=nm[len(pref_name):]
 return {"prefecture_code_jisx0401":f"{m['pref_code']:02d}","prefecture_name_ja":pref_name,"municipality_code_jisx0402":m["admin_code"],"municipality_name_ja":nm,"admin_boundary_source":"geolonia/japanese-admins derived from MLIT N03","admin_boundary_ref":f"https://geolonia.github.io/japanese-admins/{m['pref_code']:02d}/{m['admin_code']}.json"}

def parse_wkt_point(s):
 m=re.search(r"Point\(([-0-9.]+)\s+([-0-9.]+)\)",s or "")
 return (float(m.group(2)),float(m.group(1))) if m else None

def fetch_cultural_catalog():
 # P4275 is the Japanese Database of National Cultural Properties ID. Batch query avoids 5k per-name API calls.
 out=[];offset=0;limit=5000
 while True:
  q=f'''SELECT ?item ?label ?id ?coord ?website WHERE {{
    ?item wdt:P4275 ?id .
    ?item rdfs:label ?label . FILTER(LANG(?label)="ja")
    OPTIONAL {{ ?item wdt:P625 ?coord . }}
    OPTIONAL {{ ?item wdt:P856 ?website . }}
  }} ORDER BY ?item LIMIT {limit} OFFSET {offset}'''
  ok=False
  for attempt in range(4):
   try:
    r=requests.get(SPARQL,params={"query":q,"format":"json"},headers={"User-Agent":UA,"Accept":"application/sparql-results+json"},timeout=90)
    if r.status_code in (429,502,503,504):time.sleep(2+attempt*2);continue
    r.raise_for_status();bs=r.json()["results"]["bindings"];ok=True;break
   except Exception as e:
    print("sparql retry",offset,attempt,repr(e));time.sleep(2+attempt*2)
  if not ok:raise RuntimeError(f"WDQS failed at offset {offset}")
  for b in bs:
   qid=b["item"]["value"].rsplit("/",1)[-1];lab=b["label"]["value"];pid=b["id"]["value"];coord=parse_wkt_point(b.get("coord",{}).get("value"));web=b.get("website",{}).get("value")
   out.append({"qid":qid,"label":lab,"p4275":pid,"coord":coord,"official_url":web})
  print("catalog page",offset,"rows",len(bs))
  if len(bs)<limit:break
  offset+=limit
  if offset>60000:raise RuntimeError("catalog pagination runaway")
 return out

def build_catalog_index(cat):
 idx=defaultdict(list)
 for x in cat:idx[norm(x["label"])].append(x)
 return idx

def match_catalog(row,idx):
 n=norm(row["name_ja"]);cands=list(idx.get(n,[]))
 # common historic suffix variation: compare nearby normalized keys only when direct exact key absent
 if not cands:
  variants={n.removesuffix("跡"),n+"跡" if not n.endswith("跡") else n}
  for v in variants:cands.extend(idx.get(v,[]))
 best=None
 for c in cands:
  if not c.get("coord"):continue
  sim=ratio(n,norm(c["label"]))/100;d=hav(float(row["latitude"]),float(row["longitude"]),c["coord"][0],c["coord"][1])
  if sim>=0.92 and d<=5.0:
   score=sim-d/100
   if best is None or score>best[0]:best=(score,c,sim,d)
 return best

def main():
 if len(sys.argv)!=4:raise SystemExit("usage input admins/docs outdir")
 inp,admins,outdir=sys.argv[1:];Path(outdir).mkdir(parents=True,exist_ok=True)
 rows=read_jsonl(inp)
 if len(rows)!=5021:raise RuntimeError(f"expected 5021 got {len(rows)}")
 geoms,metas,tree=build_admin(admins);print("admin polygons",len(geoms))
 amap={};unmapped=[];corrections=[]
 for r in rows:
  a=admin_for(r,geoms,metas,tree)
  if a:
   amap[r["expansion_slot_id"]]=a;correct=f"000{int(a['prefecture_code_jisx0401']):02d}"
   if r.get("prefecture_id")!=correct:corrections.append({"expansion_slot_id":r["expansion_slot_id"],"master_code":r["effective_master_code"],"name_ja":r["name_ja"],"old_prefecture_id":r.get("prefecture_id"),"correct_prefecture_id":correct,"municipality_code_jisx0402":a["municipality_code_jisx0402"],"evidence":a["admin_boundary_ref"]})
  else:unmapped.append({"expansion_slot_id":r["expansion_slot_id"],"master_code":r["effective_master_code"],"name_ja":r["name_ja"],"latitude":r["latitude"],"longitude":r["longitude"]})
 print("admin mapped",len(amap),"unmapped",len(unmapped),"pref corrections",len(corrections))
 cat=fetch_cultural_catalog();cidx=build_catalog_index(cat);print("cultural catalog",len(cat),"normalized labels",len(cidx))
 now=datetime.now(timezone.utc).isoformat();enriched=[];evidence=[];low=[];admin_rows=[]
 for r in rows:
  x=dict(r);a=amap.get(r["expansion_slot_id"])
  if a:
   x["prefecture_id"]=f"000{int(a['prefecture_code_jisx0401']):02d}";x["admin_prefecture_code_jisx0401"]=a["prefecture_code_jisx0401"];x["admin_prefecture_name_ja"]=a["prefecture_name_ja"];x["admin_municipality_code_jisx0402"]=a["municipality_code_jisx0402"];x["admin_municipality_name_ja"]=a["municipality_name_ja"];x["admin_boundary_source"]=a["admin_boundary_source"];x["admin_boundary_ref"]=a["admin_boundary_ref"];x["region_key"]=REGION_BY_PREF.get(int(a["prefecture_code_jisx0401"]));admin_rows.append({"expansion_slot_id":r["expansion_slot_id"],"master_code":r["effective_master_code"],**a,"region_key":x["region_key"]})
  else:
   for k in ["admin_prefecture_code_jisx0401","admin_prefecture_name_ja","admin_municipality_code_jisx0402","admin_municipality_name_ja","admin_boundary_source","admin_boundary_ref","region_key"]:x[k]=None
  # No internal TravelAssist area registries were supplied; do not fabricate internal IDs.
  x["city_id"]=None;x["district_id"]=None;x["region_id"]=None;x["city_id_status"]="external_admin_code_available_internal_registry_missing" if a else "admin_mapping_unresolved";x["district_id_status"]="internal_registry_missing";x["region_id_status"]="region_key_available_internal_registry_missing" if x.get("region_key") else "region_mapping_unresolved"
  x["official_url"]=None;x["opening_hours"]=None;x["last_entry"]=None;x["closed_days"]=None;x["adult_price_jpy"]=None;x["child_price_jpy"]=None;x["is_free"]=None;x["reservation_required"]=None;x["deterministic_enrichment_version"]=GEN_VERSION;x["deterministic_updated_at"]=now
  m=match_catalog(r,cidx)
  if m:
   _,c,sim,d=m;x["wikidata_id"]=c["qid"];x["japanese_national_cultural_property_id"]=c["p4275"];x["authority_url"]=f"https://kunishitei.bunka.go.jp/heritage/detail/{c['p4275']}";x["official_url"]=c.get("official_url");x["modern_visitability_status"]="verified_current_national_cultural_property_identity_public_access_unknown";x["physical_poi_review_status"]="current_identity_verified_public_access_review_needed";x["source_ready"]=True;x["source_ready_scope"]="identity_and_feature_enrichment_not_public_access";x["deterministic_confidence"]=round(min(.99,.94+.04*sim-max(0,d-1)*.005),3);x["review_status"]="auto_approved_identity_only"
   evidence.append({"expansion_slot_id":r["expansion_slot_id"],"master_code":r["effective_master_code"],"name_ja":r["name_ja"],"evidence_source":"Wikidata P4275 -> Agency for Cultural Affairs","wikidata_id":c["qid"],"matched_label_ja":c["label"],"name_similarity":round(sim,4),"distance_km":round(d,4),"japanese_national_cultural_property_id":c["p4275"],"authority_url":x["authority_url"],"official_url":c.get("official_url"),"checked_at":now})
  else:
   x["wikidata_id"]=None;x["japanese_national_cultural_property_id"]=None;x["authority_url"]=None;x["source_ready"]=False;x["source_ready_scope"]=None;x["deterministic_confidence"]=0.58 if a else 0.35;x["review_status"]="second_review" if a else "human_review"
   low.append({"expansion_slot_id":r["expansion_slot_id"],"master_code":r["effective_master_code"],"name_ja":r["name_ja"],"reason":"no_exact_nearby_national_cultural_property_match","admin_mapped":bool(a),"confidence":x["deterministic_confidence"]})
  enriched.append(x)
 dump_jsonl(Path(outdir)/"remaining5021-source-enriched-v3.8.jsonl",enriched);dump_jsonl(Path(outdir)/"remaining5021-admin-mapping-v3.8.jsonl",admin_rows);dump_jsonl(Path(outdir)/"remaining5021-modern-presence-evidence-v3.8.jsonl",evidence);dump_jsonl(Path(outdir)/"prefecture-corrections-v3.8.jsonl",corrections);dump_jsonl(Path(outdir)/"admin-unmapped-v3.8.jsonl",unmapped);dump_jsonl(Path(outdir)/"low-confidence-v3.8.jsonl",low)
 with open(Path(outdir)/"region-codebook-v0.1.json","w",encoding="utf-8") as f:json.dump({"status":"external_region_key_only_not_TravelAssist_master_code","regions":{k:{"name_ja":v[0],"pref_codes":v[1]} for k,v in REGIONS.items()}},f,ensure_ascii=False,indent=2)
 cov={"generation_version":GEN_VERSION,"input_count":5021,"admin_mapped":len(admin_rows),"admin_unmapped":len(unmapped),"prefecture_corrections":len(corrections),"wikidata_p4275_catalog_rows":len(cat),"verified_national_cultural_property_matches":len(evidence),"official_url_from_wikidata_p856":sum(bool(x.get("official_url")) for x in enriched),"source_ready_identity_feature_scope":sum(bool(x.get("source_ready")) for x in enriched),"opening_hours_known":0,"price_known":0,"reservation_known":0,"city_id_intentionally_null":5021,"district_id_intentionally_null":5021,"region_id_intentionally_null":5021,"note":"TravelAssist internal city/district/region registries were not supplied; no internal IDs were invented. JIS X 0401/X 0402 administrative codes and region_key are emitted instead. Current cultural-property identity does not imply public access."}
 with open(Path(outdir)/"coverage-report-v3.8.json","w",encoding="utf-8") as f:json.dump(cov,f,ensure_ascii=False,indent=2)
 with open(Path(outdir)/"coverage-report-v3.8.md","w",encoding="utf-8") as f:
  f.write("# TravelAssist POI source enrichment v3.8.1\n\n"+"\n".join(f"- **{k}**: {v}" for k,v in cov.items())+"\n\n## Deterministic-field policy\n- No guessed values are written to deterministic fields.\n- `official_url` is only copied from Wikidata P856 on an accepted P4275 name+coordinate match.\n- `authority_url` is the Agency for Cultural Affairs detail URL derived from P4275.\n- `opening_hours`, prices, closed days, last entry, and reservation status remain null in this stage because this source set does not reliably supply them.\n- `source_ready=true` means identity is ready for feature enrichment, not that public entry is confirmed.\n")
 files=[]
 for fp in sorted(Path(outdir).glob("*")):
  if fp.is_file():files.append({"file":fp.name,"sha256":hashlib.sha256(fp.read_bytes()).hexdigest(),"bytes":fp.stat().st_size})
 with open(Path(outdir)/"manifest-v3.8.json","w",encoding="utf-8") as f:json.dump({"generation_version":GEN_VERSION,"files":files},f,ensure_ascii=False,indent=2)
 print("COVERAGE",json.dumps(cov,ensure_ascii=False,sort_keys=True))
if __name__=="__main__":main()
