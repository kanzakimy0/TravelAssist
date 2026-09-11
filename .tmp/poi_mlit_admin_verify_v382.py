#!/usr/bin/env python3
import json,os,re,sys,tempfile,zipfile,hashlib
from pathlib import Path
from collections import Counter,defaultdict
import requests
import geopandas as gpd
from shapely.geometry import Point
from shapely.strtree import STRtree

GEN="poi-source-enrichment-v3.8.2"
BASE="https://nlftp.mlit.go.jp/ksj/gml/data/N03/N03-2026"
UA="TravelAssist-POI-Pipeline/3.8.2 (https://github.com/kanzakimy0/TravelAssist)"
REGIONS={"JP-HOKKAIDO":[1],"JP-TOHOKU":list(range(2,8)),"JP-KANTO":list(range(8,15)),"JP-CHUBU":list(range(15,24)),"JP-KINKI":list(range(24,31)),"JP-CHUGOKU":list(range(31,36)),"JP-SHIKOKU":list(range(36,40)),"JP-KYUSHU-OKINAWA":list(range(40,48))}
REGION_BY_PREF={p:k for k,ps in REGIONS.items() for p in ps}

def read_jsonl(p):
 out=[]
 with open(p,encoding='utf-8') as f:
  for line in f:
   if line.strip():out.append(json.loads(line))
 return out

def dump_jsonl(p,rows):
 Path(p).parent.mkdir(parents=True,exist_ok=True)
 with open(p,'w',encoding='utf-8',newline='\n') as f:
  for r in rows:f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')

def sval(x):
 if x is None:return None
 try:
  if str(x).lower()=='nan':return None
 except:pass
 s=str(x).strip()
 return s or None

def load_pref(pref,tmp):
 url=f"{BASE}/N03-20260101_{pref:02d}_GML.zip"
 zpath=Path(tmp)/f"{pref:02d}.zip"
 r=requests.get(url,headers={'User-Agent':UA},timeout=120);r.raise_for_status();zpath.write_bytes(r.content)
 edir=Path(tmp)/f"p{pref:02d}";edir.mkdir()
 with zipfile.ZipFile(zpath) as z:z.extractall(edir)
 candidates=[]
 for ext in ('*.shp','*.geojson','*.json','*.gml','*.xml'):
  candidates.extend(edir.rglob(ext))
 if not candidates:raise RuntimeError(f"no vector file in {url}")
 last=None
 for fp in candidates:
  try:
   gdf=gpd.read_file(fp)
   if len(gdf) and 'geometry' in gdf.columns:
    print('MLIT_FILE',pref,fp.name,len(gdf),list(gdf.columns));return gdf,url
  except Exception as e:last=e
 raise RuntimeError(f"cannot read pref {pref}: {last}")

def make_index(gdf):
 geoms=[];metas=[]
 for _,row in gdf.iterrows():
  g=row.geometry
  if g is None or g.is_empty:continue
  geoms.append(g)
  metas.append({k:sval(row.get(k)) for k in ['N03_001','N03_002','N03_003','N03_004','N03_005','N03_006','N03_007']})
 return geoms,metas,STRtree(geoms)

def map_point(r,geoms,metas,tree):
 pt=Point(float(r['longitude']),float(r['latitude']));hits=[]
 for idx in tree.query(pt):
  i=int(idx);g=geoms[i]
  if g.covers(pt):hits.append((g.area,metas[i]))
 if not hits:return None
 return min(hits,key=lambda x:x[0])[1]

def main():
 if len(sys.argv)!=3:raise SystemExit('usage input_enriched outdir')
 inp,outdir=sys.argv[1:];Path(outdir).mkdir(parents=True,exist_ok=True)
 rows=read_jsonl(inp)
 if len(rows)!=5021:raise RuntimeError(f'expected 5021 got {len(rows)}')
 groups=defaultdict(list)
 for i,r in enumerate(rows):
  p=r.get('admin_prefecture_code_jisx0401') or (r.get('prefecture_id') or '')[-2:]
  if not p or not p.isdigit():raise RuntimeError(f'no prefecture hint at {i}')
  groups[int(p)].append(i)
 mapped={};source_urls={}
 with tempfile.TemporaryDirectory() as tmp:
  for pref in sorted(groups):
   gdf,url=load_pref(pref,tmp);geoms,metas,tree=make_index(gdf);source_urls[pref]=url
   for i in groups[pref]:
    m=map_point(rows[i],geoms,metas,tree)
    if m:mapped[i]=(pref,m)
 # Retry unmapped points against neighbor/all relevant prefectures when old hint is wrong near borders.
 missing=[i for i in range(len(rows)) if i not in mapped]
 if missing:
  print('UNMAPPED_AFTER_HINT',len(missing))
  with tempfile.TemporaryDirectory() as tmp:
   cache={}
   for pref in sorted(set(groups)):
    gdf,url=load_pref(pref,tmp);cache[pref]=(*make_index(gdf),url)
   for i in missing:
    for pref,(geoms,metas,tree,url) in cache.items():
     m=map_point(rows[i],geoms,metas,tree)
     if m:mapped[i]=(pref,m);source_urls[pref]=url;break
 out=[];admin=[];diff=[];unmapped=[]
 for i,r in enumerate(rows):
  x=dict(r)
  old={k:r.get(k) for k in ['admin_prefecture_code_jisx0401','admin_prefecture_name_ja','admin_municipality_code_jisx0402','admin_municipality_name_ja','prefecture_id']}
  if i in mapped:
   pref,m=mapped[i];code=(m.get('N03_007') or '').strip();
   if code and len(code)>=5:code=code[:5]
   x['prefecture_id']=f'000{pref:02d}'
   x['admin_prefecture_code_jisx0401']=f'{pref:02d}'
   x['admin_prefecture_name_ja']=m.get('N03_001')
   x['admin_subprefecture_name_ja']=m.get('N03_002')
   x['admin_county_name_ja']=m.get('N03_003')
   x['admin_city_name_ja']=m.get('N03_004')
   x['admin_ward_name_ja']=m.get('N03_005')
   x['admin_municipality_code_jisx0402']=code or None
   x['admin_municipality_name_ja']=(m.get('N03_005') or m.get('N03_004'))
   x['admin_boundary_source']='MLIT National Land Numerical Information N03 Administrative Area 2026'
   x['admin_boundary_ref']=source_urls[pref]
   x['admin_boundary_basis_date']='2026-01-01'
   x['admin_mapping_confidence']=1.0
   x['region_key']=REGION_BY_PREF.get(pref)
   rec={'expansion_slot_id':r['expansion_slot_id'],'master_code':r['effective_master_code'],'name_ja':r['name_ja'],'prefecture_code_jisx0401':f'{pref:02d}','prefecture_name_ja':m.get('N03_001'),'county_name_ja':m.get('N03_003'),'city_name_ja':m.get('N03_004'),'ward_name_ja':m.get('N03_005'),'municipality_code_jisx0402':code or None,'region_key':x['region_key'],'source_url':source_urls[pref]}
   admin.append(rec)
   new={k:x.get(k) for k in old}
   if old!=new:diff.append({'expansion_slot_id':r['expansion_slot_id'],'master_code':r['effective_master_code'],'name_ja':r['name_ja'],'old':old,'new':new})
  else:
   x['admin_mapping_confidence']=None;x['admin_boundary_basis_date']=None
   unmapped.append({'expansion_slot_id':r['expansion_slot_id'],'master_code':r['effective_master_code'],'name_ja':r['name_ja'],'latitude':r['latitude'],'longitude':r['longitude']})
  x['deterministic_enrichment_version']=GEN
  out.append(x)
 dump_jsonl(Path(outdir)/'remaining5021-source-enriched-v3.8.2.jsonl',out)
 dump_jsonl(Path(outdir)/'remaining5021-admin-mapping-mlit2026-v3.8.2.jsonl',admin)
 dump_jsonl(Path(outdir)/'admin-differences-v3.8.2.jsonl',diff)
 dump_jsonl(Path(outdir)/'admin-unmapped-v3.8.2.jsonl',unmapped)
 report={'generation_version':GEN,'input_count':5021,'official_admin_mapped':len(admin),'official_admin_unmapped':len(unmapped),'admin_values_changed_vs_v3.8.1':len(diff),'prefecture_id_changed_vs_v3.8.1':sum(1 for d in diff if d['old'].get('prefecture_id')!=d['new'].get('prefecture_id')),'basis_date':'2026-01-01','source':'MLIT National Land Numerical Information N03 2026','modern_presence_evidence_preserved':sum(bool(r.get('japanese_national_cultural_property_id')) for r in out),'source_ready_preserved':sum(bool(r.get('source_ready')) for r in out),'city_id_intentionally_null':sum(r.get('city_id') is None for r in out),'district_id_intentionally_null':sum(r.get('district_id') is None for r in out),'region_id_intentionally_null':sum(r.get('region_id') is None for r in out)}
 with open(Path(outdir)/'mlit-admin-validation-v3.8.2.json','w',encoding='utf-8') as f:json.dump(report,f,ensure_ascii=False,indent=2)
 files=[]
 for fp in sorted(Path(outdir).glob('*')):
  if fp.is_file():files.append({'file':fp.name,'sha256':hashlib.sha256(fp.read_bytes()).hexdigest(),'bytes':fp.stat().st_size})
 with open(Path(outdir)/'manifest-v3.8.2.json','w',encoding='utf-8') as f:json.dump({'generation_version':GEN,'files':files},f,ensure_ascii=False,indent=2)
 print('REPORT',json.dumps(report,ensure_ascii=False,sort_keys=True))
if __name__=='__main__':main()
