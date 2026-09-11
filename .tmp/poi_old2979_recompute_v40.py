#!/usr/bin/env python3
import csv,io,json,re,sys,importlib.util,tempfile,hashlib
from pathlib import Path
from collections import defaultdict,Counter

def loadmod(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
v39=loadmod('v39','.tmp/poi_second_layer_feature_v39.py')
mlit=loadmod('mlit','.tmp/poi_mlit_admin_verify_v382.py')
CORE28=['scenery','history','architecture','photo','food','shopping','nature','night','onsen','art','entertainment','local','unique','hidden','iconic','family','senior','couple','solo','walking','physical','crowd','queue','rain','spring','summer','autumn','winter']
CATMAP={'史跡・文化財・遺跡':('heritage_monument','historic_site_or_ruin'),'古墳・貝塚':('heritage_monument','kofun_or_shell_mound'),'埋葬・信仰・宗教施設':('religious_heritage','religious_site'),'城・軍事施設':('heritage_monument','castle_or_fortification'),'産業施設':('heritage_monument','industrial_heritage')}
REGION={1:'JP-HOKKAIDO',**{x:'JP-TOHOKU' for x in range(2,8)},**{x:'JP-KANTO' for x in range(8,15)},**{x:'JP-CHUBU' for x in range(15,24)}}

def norm(s):return re.sub(r'[\s\u3000・･,，.。()（）_\-ー]','',(s or '').lower())
def col(h,alts):
 n=[norm(x) for x in h]
 for a in alts:
  aa=norm(a)
  for i,x in enumerate(n):
   if x==aa:return i
 for a in alts:
  aa=norm(a)
  for i,x in enumerate(n):
   if aa in x:return i
 return None

def recover(csvpath,wanted):
 text=Path(csvpath).read_text(encoding='utf-8-sig',errors='replace');t=list(csv.reader(io.StringIO(text)));h=t[0]
 ii=col(h,['ジャパンナレッジID','entry_id','id']);ni=col(h,['名称','body','name']);ki=col(h,['名称（よみ）','名称よみ','body_kana','kana']);ci=col(h,['分類2','ne_class','category2']);lai=col(h,['緯度','latitude','lat']);loi=col(h,['経度','longitude','lng','lon'])
 if None in (ii,ni,ci,lai,loi):raise RuntimeError(f'CSV columns not detected: {h}')
 out={}
 for r in t[1:]:
  if max(ii,ni,ci,lai,loi)>=len(r):continue
  sid=r[ii].strip()
  if sid not in wanted:continue
  cat=r[ci].strip();cat=cat if cat in CATMAP else next((x for x in CATMAP if x in cat),None)
  if not cat:continue
  try:lat=float(r[lai]);lon=float(r[loi])
  except:continue
  pt,st=CATMAP[cat];out[sid]={'source_entry_id':sid,'name_ja':r[ni].strip(),'name_kana':r[ki].strip() if ki is not None and ki<len(r) and r[ki].strip() else None,'source_category':cat,'latitude':lat,'longitude':lon,'primary_type':pt,'subtype':st}
 return out

def current_admin(rows):
 groups=defaultdict(list)
 for i,r in enumerate(rows):groups[int(r['source_entry_id'][:2])].append(i)
 mapped={}
 with tempfile.TemporaryDirectory() as tmp:
  for pref in sorted(groups):
   gdf,url=mlit.load_pref(pref,tmp);geoms,metas,tree=mlit.make_index(gdf)
   for i in groups[pref]:
    m=mlit.map_point(rows[i],geoms,metas,tree)
    if m:mapped[i]=(pref,m,url)
 return mapped

def dump(p,rows):
 with open(p,'w',encoding='utf-8',newline='\n') as f:
  for r in rows:f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')

def main():
 idsfile,csvfile,osmfile,outdir=sys.argv[1:5];Path(outdir).mkdir(parents=True,exist_ok=True)
 ids=[x.strip() for x in open(idsfile,encoding='utf-8') if x.strip()];want=set(ids)
 if len(ids)!=2979 or len(want)!=2979:raise RuntimeError('old source id set must be 2979 unique')
 got=recover(csvfile,want)
 if set(got)!=want:raise RuntimeError(f'identity recovery missing {len(want-set(got))}')
 rows=[got[x] for x in ids];adm=current_admin(rows)
 for i,r in enumerate(rows):
  p=int(r['source_entry_id'][:2]);r.update({'prefecture_id':f'000{p:02d}','region_key':REGION[p],'source_ready':False,'modern_visitability_status':'unverified_historical_dataset','physical_poi_review_status':'needs_modern_presence_review','review_status':'second_review','deterministic_confidence':.58})
  if i in adm:
   p,m,url=adm[i];code=(m.get('N03_007') or '')[:5] or None;r.update({'prefecture_id':f'000{p:02d}','region_key':REGION[p],'admin_prefecture_code_jisx0401':f'{p:02d}','admin_prefecture_name_ja':m.get('N03_001'),'admin_subprefecture_name_ja':m.get('N03_002'),'admin_county_name_ja':m.get('N03_003'),'admin_city_name_ja':m.get('N03_004'),'admin_ward_name_ja':m.get('N03_005'),'admin_municipality_code_jisx0402':code,'admin_municipality_name_ja':m.get('N03_005') or m.get('N03_004'),'admin_boundary_source':'MLIT National Land Numerical Information N03 Administrative Area 2026','admin_boundary_ref':url,'admin_boundary_basis_date':'2026-01-01','admin_mapping_confidence':1.0})
 wd,wdfail=v39.wd_exact(rows);grid,osmcount=v39.load_osm(osmfile);om=v39.osm_match(rows,grid)
 enriched=[];features=[];evidence=[];second=[];conf=[]
 for r0 in rows:
  r=dict(r0);sid=r['source_entry_id'];w=wd.get(sid);o=om.get(sid);ec=int(bool(w))+int(bool(o))
  if w:
   r['wikidata_secondary_id']=w['id'];r['wikidata_secondary_distance_m']=w['distance_m'];r['wikidata_secondary_dissolved']=w.get('dissolved')
   if w.get('website'):r['official_url']=w['website'];r['official_url_source']='wikidata_P856_secondary_exact_name_coordinate'
  else:r['wikidata_secondary_id']=None
  if o:r.update({'osm_id':o['osm_id'],'osm_type':o['osm_type'],'osm_distance_m':o['distance_m'],'osm_name_similarity':o['name_similarity'],'osm_url':f"https://www.openstreetmap.org/{o['osm_type']}/{o['osm_id']}",'osm_opening_hours_candidate':o.get('opening_hours'),'osm_website_candidate':o.get('website')})
  else:r['osm_id']=None
  r['secondary_evidence_count']=ec
  wdok=bool(w and not w.get('dissolved'));osmok=bool(o)
  if wdok or osmok:
   r.update({'source_ready':True,'source_ready_scope':'identity_and_feature_enrichment_not_public_access','physical_poi_review_status':'current_identity_corroborated_public_access_review_needed','review_status':'auto_approved_identity_only'})
   if wdok and osmok:r['modern_visitability_status']='current_identity_multi_source_corroborated_public_access_unknown';r['deterministic_confidence']=.94
   elif osmok:r['modern_visitability_status']='current_identity_osm_corroborated_public_access_unknown';r['deterministic_confidence']=.86
   else:r['modern_visitability_status']='current_identity_wikidata_corroborated_public_access_unknown';r['deterministic_confidence']=.84
  r['secondary_enrichment_version']='poi-secondary-source-v4.0';enriched.append(r)
  ft=v39.apply_feature(r,o)
  for x in ft.values():
   if x.get('model_version')=='poi-feature-evidence-prior-v3.9':x['model_version']='poi-feature-evidence-prior-v4.0'
  pr={k:r.get(k) for k in ('source_entry_id','name_ja','prefecture_id','latitude','longitude','primary_type','subtype')};pr.update({'schema_version':'POIFeatureV1.1-43D','poi_feature_v1':ft,'feature_profile_status':'auto_approved' if all(x['value'] is None or x['review_status']=='auto_approved' for x in ft.values()) else 'second_review','conversion_status':'identity_bound_feature43_v4.0','source_ready':r['source_ready']});features.append(pr)
  evidence.append({'source_entry_id':sid,'name_ja':r['name_ja'],'wikidata_secondary':w,'osm':o,'source_ready_after':r['source_ready'],'modern_visitability_status':r['modern_visitability_status']})
  if not r['source_ready']:second.append({'source_entry_id':sid,'name_ja':r['name_ja'],'reason':'no strong exact-coordinate Wikidata or strong current OSM identity match; not evidence of nonexistence'})
  vv={k:x['value'] for k,x in ft.items()}
  if re.search(r'山|岳|峠|峰',r['name_ja']) and vv['rain']>=8:conf.append({'source_entry_id':sid,'rule':'outdoor_mountain_rain_high'})
 dump(Path(outdir)/'old2979-source-enriched-v4.0.jsonl',enriched);dump(Path(outdir)/'feature43-old2979-source-keyed-v4.0.jsonl',features);dump(Path(outdir)/'old2979-modern-presence-evidence-v4.0.jsonl',evidence);dump(Path(outdir)/'old2979-modern-presence-still-second-review-v4.0.jsonl',second);dump(Path(outdir)/'old2979-feature-conflicts-v4.0.jsonl',conf)
 dist={}
 for k in v39.FEATURES:
  vals=[p['poi_feature_v1'][k]['value'] for p in features if p['poi_feature_v1'][k]['value'] is not None];dist[k]={'non_null':len(vals),'unique_values':sorted(set(vals)),'unique_count':len(set(vals)),'distribution':dict(sorted(Counter(vals).items()))}
 json.dump(dist,open(Path(outdir)/'old2979-feature-distribution-v4.0.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
 report={'version':'v4.0-old2979','input':2979,'geoshape_identity_recovered':len(rows),'admin_mapped_2026':len(adm),'source_ready_after':sum(r['source_ready'] for r in enriched),'still_second_review':len(second),'wikidata_exact_coordinate_matches':len(wd),'wikidata_batch_failures':wdfail,'osm_strong_matches':len(om),'both_sources':sum(bool(r.get('wikidata_secondary_id')) and bool(r.get('osm_id')) for r in enriched),'feature_profiles':len(features),'core28_complete':sum(all(p['poi_feature_v1'][k]['value'] is not None for k in CORE28) for p in features),'feature_conflicts':len(conf),'osm_candidate_features_loaded':osmcount,'identity_invariants':'source_entry_id/name/category/coordinate rehydrated from official Geoshape 2025-05-15','admin_source':'MLIT N03 2026-01-01'}
 json.dump(report,open(Path(outdir)/'old2979-recompute-report-v4.0.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
 files=[]
 for p in sorted(Path(outdir).glob('*')):
  if p.is_file():files.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
 json.dump({'version':'v4.0-old2979','files':files},open(Path(outdir)/'manifest-v4.0.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
 print('REPORT',json.dumps(report,ensure_ascii=False,sort_keys=True))
if __name__=='__main__':main()
