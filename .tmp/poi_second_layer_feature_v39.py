#!/usr/bin/env python3
import json,sys,os,re,math,time,hashlib
from pathlib import Path
from collections import defaultdict,Counter
import requests
from rapidfuzz import fuzz
from shapely.geometry import shape

FEATURES=['scenery','history','architecture','photo','food','shopping','nature','night','onsen','art','entertainment','local','unique','hidden','iconic','family','senior','couple','solo','relax','adventure','educational','interactive','rest','walking','physical','crowd','queue','wheelchair','stroller','morning','daytime','sunrise','sunset','rain','heat','cold','snow','weather_sensitive','spring','summer','autumn','winter']
BASE={
'historic_site_or_ruin':dict(scenery=5,history=9,architecture=4,photo=6,food=1,shopping=1,nature=4,night=1,onsen=0,art=4,entertainment=1,local=8,unique=7,hidden=7,iconic=4,family=4,senior=4,couple=4,solo=8,relax=4,adventure=4,educational=9,interactive=2,rest=3,walking=5,physical=4,crowd=2,queue=0,wheelchair=None,stroller=None,morning=6,daytime=8,sunrise=None,sunset=None,rain=3,heat=4,cold=4,snow=4,weather_sensitive=5,spring=5,summer=5,autumn=6,winter=4),
'castle_or_fortification':dict(scenery=7,history=9,architecture=6,photo=8,food=1,shopping=1,nature=5,night=2,onsen=0,art=4,entertainment=2,local=8,unique=7,hidden=6,iconic=6,family=5,senior=4,couple=6,solo=8,relax=4,adventure=5,educational=9,interactive=2,rest=3,walking=6,physical=5,crowd=3,queue=1,wheelchair=None,stroller=None,morning=7,daytime=8,sunrise=None,sunset=None,rain=3,heat=4,cold=4,snow=4,weather_sensitive=6,spring=6,summer=5,autumn=7,winter=4),
'kofun_or_shell_mound':dict(scenery=5,history=9,architecture=3,photo=5,food=0,shopping=0,nature=5,night=0,onsen=0,art=2,entertainment=1,local=7,unique=7,hidden=8,iconic=3,family=4,senior=4,couple=4,solo=8,relax=4,adventure=3,educational=9,interactive=1,rest=2,walking=5,physical=4,crowd=1,queue=0,wheelchair=None,stroller=None,morning=6,daytime=8,sunrise=None,sunset=None,rain=3,heat=4,cold=4,snow=4,weather_sensitive=5,spring=5,summer=5,autumn=6,winter=4),
'religious_site':dict(scenery=5,history=8,architecture=7,photo=6,food=1,shopping=1,nature=4,night=2,onsen=0,art=5,entertainment=1,local=7,unique=6,hidden=6,iconic=4,family=5,senior=5,couple=5,solo=7,relax=6,adventure=2,educational=7,interactive=1,rest=4,walking=4,physical=3,crowd=3,queue=1,wheelchair=None,stroller=None,morning=7,daytime=8,sunrise=None,sunset=None,rain=4,heat=4,cold=4,snow=4,weather_sensitive=5,spring=6,summer=5,autumn=7,winter=4),
'industrial_heritage':dict(scenery=4,history=8,architecture=5,photo=5,food=0,shopping=0,nature=2,night=1,onsen=0,art=3,entertainment=2,local=8,unique=7,hidden=8,iconic=3,family=4,senior=4,couple=4,solo=7,relax=2,adventure=4,educational=8,interactive=2,rest=2,walking=5,physical=4,crowd=1,queue=0,wheelchair=None,stroller=None,morning=5,daytime=8,sunrise=None,sunset=None,rain=4,heat=4,cold=4,snow=4,weather_sensitive=5,spring=5,summer=5,autumn=5,winter=4)}

def norm(s):
 s=(s or '').lower();s=s.replace('ヶ','ケ').replace('ヵ','カ')
 return re.sub(r'[\s\u3000・･,，.。()（）「」『』\[\]【】〈〉《》_\-ー]', '', s)
def hav(a,b,c,d):
 r=6371000; p1=math.radians(a);p2=math.radians(c);dp=math.radians(c-a);dl=math.radians(d-b)
 x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
 return 2*r*math.asin(min(1,math.sqrt(x)))
def clamp(x): return max(0,min(9,int(round(x))))
def read_jsonl(p): return [json.loads(x) for x in open(p,encoding='utf-8') if x.strip()]
def dump_jsonl(p,rows):
 Path(p).parent.mkdir(parents=True,exist_ok=True)
 with open(p,'w',encoding='utf-8',newline='\n') as f:
  for r in rows:f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')

def wd_exact(rows):
 endpoint='https://query.wikidata.org/sparql';sess=requests.Session();sess.headers.update({'User-Agent':'TravelAssist-POI-Pipeline/3.9 contact=github.com/kanzakimy0/TravelAssist'})
 names=sorted({r['name_ja'] for r in rows if not r.get('source_ready') and r.get('name_ja')})
 byname=defaultdict(list); failures=0
 for i in range(0,len(names),80):
  batch=names[i:i+80]; vals=' '.join(json.dumps(x,ensure_ascii=False)+'@ja' for x in batch)
  q=f'''SELECT ?item ?label ?coord ?website ?dissolved WHERE {{ VALUES ?label {{ {vals} }} ?item rdfs:label ?label; wdt:P625 ?coord. OPTIONAL{{?item wdt:P856 ?website}} OPTIONAL{{?item wdt:P576 ?dissolved}} }}'''
  try:
   rr=sess.post(endpoint,data={'query':q,'format':'json'},timeout=90);rr.raise_for_status()
   for b in rr.json()['results']['bindings']:
    m=re.match(r'Point\(([-0-9.]+) ([-0-9.]+)\)',b['coord']['value'])
    if not m:continue
    byname[b['label']['value']].append({'id':b['item']['value'].rsplit('/',1)[-1],'lon':float(m.group(1)),'lat':float(m.group(2)),'website':b.get('website',{}).get('value'),'dissolved':b.get('dissolved',{}).get('value')})
  except Exception as e:
   failures+=1;print('WD_BATCH_FAIL',i,repr(e))
  time.sleep(.15)
 out={}
 for r in rows:
  cand=byname.get(r.get('name_ja'),[]); best=None
  for c in cand:
   d=hav(r['latitude'],r['longitude'],c['lat'],c['lon'])
   if d<=2500 and (best is None or d<best[0]):best=(d,c)
  if best: out[r['source_entry_id']]={'distance_m':round(best[0],1),**best[1]}
 return out,failures

def load_osm(p):
 grid=defaultdict(list);n=0
 with open(p,encoding='utf-8',errors='ignore') as f:
  for line in f:
   line=line.lstrip('\x1e').strip()
   if not line:continue
   try:o=json.loads(line);g=shape(o.get('geometry'))
   except:continue
   if g.is_empty:continue
   pt=g if g.geom_type=='Point' else g.representative_point();props=o.get('properties') or {}
   names=[]
   for k in ('name:ja','name','official_name','alt_name','old_name','short_name'):
    v=props.get(k)
    if v:
     for x in str(v).split(';'):
      if norm(x):names.append(x)
   if not names:continue
   ident=props.get('@id') or props.get('id') or f'osm-{n}'
   rec={'id':ident,'lat':pt.y,'lon':pt.x,'names':names,'tags':props}
   key=(int(pt.y/0.02),int(pt.x/0.02));grid[key].append(rec);n+=1
 return grid,n

def osm_match(rows,grid):
 out={}
 for r in rows:
  lat,lon=r['latitude'],r['longitude'];k=(int(lat/0.02),int(lon/0.02));best=None;rn=norm(r['name_ja'])
  for di in range(-2,3):
   for dj in range(-2,3):
    for c in grid.get((k[0]+di,k[1]+dj),[]):
     d=hav(lat,lon,c['lat'],c['lon'])
     if d>2500:continue
     for nm in c['names']:
      cn=norm(nm); sim=fuzz.ratio(rn,cn); exact=(rn==cn)
      strong=(exact and d<=2000 and (len(rn)>=4 or d<=300)) or (sim>=96 and d<=500 and min(len(rn),len(cn))>=4) or (sim>=90 and d<=150 and min(len(rn),len(cn))>=4)
      if not strong:continue
      rank=(1 if exact else 0,sim,-d)
      if best is None or rank>best[0]:best=(rank,d,sim,nm,c)
  if best:
   _,d,sim,nm,c=best;tags=c['tags'];oid=str(c['id'])
   if '/' in oid: typ,oidnum=oid.split('/',1)
   else: typ,oidnum='object',oid
   out[r['source_entry_id']]={'osm_type':typ,'osm_id':oidnum,'matched_name':nm,'distance_m':round(d,1),'name_similarity':sim,'wikidata':tags.get('wikidata'),'wikipedia':tags.get('wikipedia'),'website':tags.get('website') or tags.get('contact:website'),'opening_hours':tags.get('opening_hours'),'wheelchair':tags.get('wheelchair'),'tourism':tags.get('tourism'),'historic':tags.get('historic'),'heritage':tags.get('heritage'),'amenity':tags.get('amenity'),'religion':tags.get('religion'),'access':tags.get('access'),'fee':tags.get('fee')}
 return out

def apply_feature(r,osm):
 st=r['subtype'];v=dict(BASE[st]);name=r['name_ja'];tags=(osm or {})
 def add(keys,n):
  for k in keys:
   if v.get(k) is not None:v[k]=clamp(v[k]+n)
 if r.get('japanese_national_cultural_property_id'):add(['history','iconic','educational'],1);add(['hidden'],-1)
 if r.get('wikidata_secondary_id'):add(['iconic','educational'],1)
 if tags.get('tourism')=='attraction':add(['iconic','crowd','family'],1);add(['queue'],1);add(['hidden'],-2)
 if tags.get('wikipedia'):add(['iconic','crowd'],1);add(['hidden'],-1)
 if tags.get('heritage'):add(['history','educational'],1)
 if tags.get('amenity')=='place_of_worship':add(['relax','senior'],1)
 if re.search(r'山|岳|峠|峰|滝|渓|峡|岬|岩|洞|海|湖|沼|池',name):
  add(['scenery','nature','photo'],2);add(['physical','adventure','weather_sensitive'],1);add(['senior','rain'],-1)
  if v['sunrise'] is None:v['sunrise']=6
  if v['sunset'] is None:v['sunset']=6
 if re.search(r'庭園|公園|桜|梅|紅葉|並木|松原',name):add(['scenery','photo','nature','relax'],1)
 if re.search(r'桜|梅',name):add(['spring'],2)
 if re.search(r'紅葉|楓',name):add(['autumn'],2)
 if re.search(r'城跡|城址|山城',name):add(['scenery','photo','physical'],1)
 if re.search(r'神宮|大社|一宮|国分寺|五重塔|三重塔',name):add(['iconic','architecture'],1)
 if re.search(r'古墳|塚',name):add(['hidden'],1)
 if re.search(r'跡|址|遺跡',name):add(['architecture'],-1);add(['hidden'],1)
 if re.search(r'鉱山|炭鉱|製鉄|製錬|窯|工場|水車|堰|橋梁',name):add(['unique','architecture','educational'],1)
 reg=r.get('region_key')
 if reg=='JP-KYUSHU-OKINAWA':add(['heat'],1);add(['snow'],-2);add(['winter'],1);add(['summer'],-1)
 elif reg=='JP-SHIKOKU':add(['heat'],1);add(['snow'],-1)
 elif reg=='JP-CHUBU':add(['cold','snow'],1)
 # explicit OSM accessibility only; never infer unknown accessibility
 if tags.get('wheelchair') in ('yes','designated'):v['wheelchair']=8
 elif tags.get('wheelchair')=='limited':v['wheelchair']=5
 elif tags.get('wheelchair')=='no':v['wheelchair']=1
 baseconf=0.58
 if r.get('japanese_national_cultural_property_id'):baseconf=0.82
 elif r.get('secondary_evidence_count',0)>=2:baseconf=0.78
 elif r.get('source_ready'):baseconf=0.72
 vals={}
 for k in FEATURES:
  val=v.get(k)
  if val is None: vals[k]={'value':None,'feature_source':'unknown','feature_confidence':None,'model_version':'poi-feature-evidence-prior-v3.9','review_status':'second_review'};continue
  conf=baseconf
  if k in ('history','architecture','educational','local','solo'):conf=min(.9,conf+.05)
  if k in ('iconic','crowd','queue'):conf=max(.35,conf-.12)
  if k in ('sunrise','sunset'):conf=max(.4,conf-.10)
  if k=='wheelchair' and tags.get('wheelchair'):conf=.86
  status='auto_approved' if conf>=.80 else 'second_review'
  vals[k]={'value':clamp(val),'feature_source':'ai_authored_evidence_rule_batch','feature_confidence':round(conf,2),'model_version':'poi-feature-evidence-prior-v3.9','review_status':status}
 return vals

def main():
 src,osmfile,outdir=sys.argv[1:4];Path(outdir).mkdir(parents=True,exist_ok=True)
 rows=read_jsonl(src); assert len(rows)==5021
 wd,wdfail=wd_exact(rows);grid,osmcount=load_osm(osmfile);om=osm_match(rows,grid)
 evid=[];profiles=[];second=[];conflicts=[]
 for r0 in rows:
  r=dict(r0); sid=r['source_entry_id'];w=wd.get(sid);o=om.get(sid);ec=0
  if w:
   r['wikidata_secondary_id']=w['id'];r['wikidata_secondary_distance_m']=w['distance_m'];r['wikidata_secondary_dissolved']=w['dissolved'];ec+=1
   if w.get('website') and not w.get('dissolved') and not r.get('official_url'):
    r['official_url']=w['website'];r['official_url_source']='wikidata_P856_secondary_exact_name_coordinate'
  else:r['wikidata_secondary_id']=None
  if o:
   r['osm_id']=o['osm_id'];r['osm_type']=o['osm_type'];r['osm_distance_m']=o['distance_m'];r['osm_name_similarity']=o['name_similarity'];r['osm_url']=f"https://www.openstreetmap.org/{o['osm_type']}/{o['osm_id']}";r['osm_opening_hours_candidate']=o.get('opening_hours');r['osm_website_candidate']=o.get('website');ec+=1
  else:r['osm_id']=None
  r['secondary_evidence_count']=ec
  prior_ready=bool(r.get('source_ready'))
  wd_ok=bool(w and not w.get('dissolved'))
  osm_ok=bool(o)
  if not prior_ready and (wd_ok or osm_ok):
   r['source_ready']=True;r['source_ready_scope']='identity_and_feature_enrichment_not_public_access';r['physical_poi_review_status']='current_identity_corroborated_public_access_review_needed'
   if wd_ok and osm_ok:r['modern_visitability_status']='current_identity_multi_source_corroborated_public_access_unknown';r['deterministic_confidence']=.94
   elif osm_ok:r['modern_visitability_status']='current_identity_osm_corroborated_public_access_unknown';r['deterministic_confidence']=.86
   else:r['modern_visitability_status']='current_identity_wikidata_corroborated_public_access_unknown';r['deterministic_confidence']=.84
   r['review_status']='auto_approved_identity_only'
  r['secondary_enrichment_version']='poi-secondary-source-v3.9'
  evid.append({'expansion_slot_id':r['expansion_slot_id'],'master_code':r['effective_master_code'],'source_entry_id':sid,'name_ja':r['name_ja'],'prior_source_ready':prior_ready,'wikidata_secondary':w,'osm':o,'source_ready_after':r['source_ready'],'modern_visitability_status':r['modern_visitability_status']})
  ft=apply_feature(r,o)
  pr={k:r.get(k) for k in ('expansion_slot_id','global_slot_ordinal','effective_master_code','name_ja','prefecture_id','latitude','longitude','primary_type','subtype','source_entry_id')}
  pr.update({'schema_version':'POIFeatureV1.1-43D','poi_feature_v1':ft,'feature_profile_status':'auto_approved' if all(x['value'] is None or x['review_status']=='auto_approved' for x in ft.values()) else 'second_review','conversion_status':'identity_bound_feature43_v3.9','source_ready':r['source_ready']})
  profiles.append(pr)
  if not r['source_ready']:second.append({'expansion_slot_id':r['expansion_slot_id'],'master_code':r['effective_master_code'],'source_entry_id':sid,'name_ja':r['name_ja'],'reason':'no strong current national-cultural-property, exact-coordinate Wikidata, or strong OSM identity match; not evidence of nonexistence'})
  # consistency checks
  vv={k:x['value'] for k,x in ft.items()}
  if re.search(r'山|岳|峠|峰',r['name_ja']) and vv['rain'] is not None and vv['rain']>=8:conflicts.append({'master_code':r['effective_master_code'],'rule':'outdoor_mountain_rain_high'})
  if r.get('japanese_national_cultural_property_id') and vv['iconic'] is not None and vv['iconic']<=1:conflicts.append({'master_code':r['effective_master_code'],'rule':'national_property_iconic_too_low'})
  if vv['physical'] is not None and re.search(r'登山|山城|峠',r['name_ja']) and vv['physical']<=1:conflicts.append({'master_code':r['effective_master_code'],'rule':'high_physical_name_low_score'})
 # outputs
 dump_jsonl(Path(outdir)/'remaining5021-source-enriched-v3.9.jsonl',rows if False else [dict(r) for r in []])
 # re-create enriched rows from evidence loop source by applying updates again is avoided: store during loop
 enriched=[]
 for r0,e in zip(rows,evid):
  r=dict(r0);w=e['wikidata_secondary'];o=e['osm'];ec=int(bool(w))+int(bool(o));prior=bool(r.get('source_ready'));wd_ok=bool(w and not w.get('dissolved'));osm_ok=bool(o)
  if w:
   r['wikidata_secondary_id']=w['id'];r['wikidata_secondary_distance_m']=w['distance_m'];r['wikidata_secondary_dissolved']=w['dissolved']
   if w.get('website') and not w.get('dissolved') and not r.get('official_url'):r['official_url']=w['website'];r['official_url_source']='wikidata_P856_secondary_exact_name_coordinate'
  else:r['wikidata_secondary_id']=None
  if o:r.update({'osm_id':o['osm_id'],'osm_type':o['osm_type'],'osm_distance_m':o['distance_m'],'osm_name_similarity':o['name_similarity'],'osm_url':f"https://www.openstreetmap.org/{o['osm_type']}/{o['osm_id']}",'osm_opening_hours_candidate':o.get('opening_hours'),'osm_website_candidate':o.get('website')})
  else:r['osm_id']=None
  r['secondary_evidence_count']=ec
  if not prior and (wd_ok or osm_ok):
   r['source_ready']=True;r['source_ready_scope']='identity_and_feature_enrichment_not_public_access';r['physical_poi_review_status']='current_identity_corroborated_public_access_review_needed';r['review_status']='auto_approved_identity_only'
   if wd_ok and osm_ok:r['modern_visitability_status']='current_identity_multi_source_corroborated_public_access_unknown';r['deterministic_confidence']=.94
   elif osm_ok:r['modern_visitability_status']='current_identity_osm_corroborated_public_access_unknown';r['deterministic_confidence']=.86
   else:r['modern_visitability_status']='current_identity_wikidata_corroborated_public_access_unknown';r['deterministic_confidence']=.84
  r['secondary_enrichment_version']='poi-secondary-source-v3.9';enriched.append(r)
 dump_jsonl(Path(outdir)/'remaining5021-source-enriched-v3.9.jsonl',enriched)
 dump_jsonl(Path(outdir)/'remaining5021-modern-presence-evidence-v3.9.jsonl',evid)
 dump_jsonl(Path(outdir)/'feature43-remaining5021-v3.9.jsonl',profiles)
 dump_jsonl(Path(outdir)/'modern-presence-still-second-review-v3.9.jsonl',second)
 dump_jsonl(Path(outdir)/'feature-conflicts-v3.9.jsonl',conflicts)
 ready=sum(1 for r in enriched if r.get('source_ready'));wdn=sum(1 for x in evid if x['wikidata_secondary']);osmn=sum(1 for x in evid if x['osm']);both=sum(1 for x in evid if x['wikidata_secondary'] and x['osm'])
 dists=Counter();
 for p in profiles:
  for k,x in p['poi_feature_v1'].items():
   if x['value'] is not None:dists[(k,x['value'])]+=1
 report={'version':'v3.9','input':5021,'source_ready_before':sum(1 for r in rows if r.get('source_ready')),'source_ready_after':ready,'newly_source_ready':ready-sum(1 for r in rows if r.get('source_ready')),'still_second_review':len(second),'wikidata_secondary_matches':wdn,'osm_strong_matches':osmn,'both_secondary_sources':both,'wikidata_batch_failures':wdfail,'osm_candidate_features_loaded':osmcount,'feature_profiles':len(profiles),'feature_conflicts':len(conflicts),'features':len(FEATURES),'feature_generation_method':'AI-authored evidence-aware deterministic batch rules; no per-row external LLM API call','deterministic_fields_policy':'No unknown deterministic field was guessed. OSM opening_hours/website remain candidate fields; Wikidata P856 may populate official_url after exact-name+coordinate match.'}
 json.dump(report,open(Path(outdir)/'coverage-report-v3.9.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
 # concentration report
 conc={}
 for k in FEATURES:
  vals=[p['poi_feature_v1'][k]['value'] for p in profiles if p['poi_feature_v1'][k]['value'] is not None]
  conc[k]={'non_null':len(vals),'unique_values':sorted(set(vals)),'unique_count':len(set(vals)),'pct_5_to_8':round(sum(5<=x<=8 for x in vals)/len(vals)*100,2) if vals else None,'distribution':dict(sorted(Counter(vals).items()))}
 json.dump(conc,open(Path(outdir)/'feature-distribution-v3.9.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
 files=[]
 for p in sorted(Path(outdir).glob('*')):
  if p.is_file():files.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
 json.dump({'version':'v3.9','files':files},open(Path(outdir)/'manifest-v3.9.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
 print(json.dumps(report,ensure_ascii=False,sort_keys=True))
if __name__=='__main__':main()
