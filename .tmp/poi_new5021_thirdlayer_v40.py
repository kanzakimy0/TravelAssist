#!/usr/bin/env python3
import json,re,sys,math,importlib.util,concurrent.futures as cf,hashlib
from pathlib import Path
from collections import defaultdict,Counter
from rapidfuzz import fuzz
from shapely.geometry import shape

def loadmod(name,path):
 s=importlib.util.spec_from_file_location(name,path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
v39=loadmod('v39','.tmp/poi_second_layer_feature_v39.py')
v38=loadmod('v38','.tmp/poi_source_enrich_v38.py')
CORE28=['scenery','history','architecture','photo','food','shopping','nature','night','onsen','art','entertainment','local','unique','hidden','iconic','family','senior','couple','solo','walking','physical','crowd','queue','rain','spring','summer','autumn','winter']

def norm(s):
 s=(s or '').lower().replace('ヶ','ケ').replace('ヵ','カ')
 return re.sub(r'[\s\u3000・･,，.。()（）「」『』\[\]【】〈〉《》_\-ー/／]','',s)
def kana_norm(s):
 s=norm(s)
 for a,b in [('しや','しゃ'),('じや','じゃ'),('ちや','ちゃ'),('ぢや','ぢゃ'),('きや','きゃ'),('ぎや','ぎゃ'),('にや','にゃ'),('ひや','ひゃ'),('びや','びゃ'),('ぴや','ぴゃ'),('みや','みゃ'),('りや','りゃ'),('しゆ','しゅ'),('じゆ','じゅ'),('ちゆ','ちゅ'),('きゆ','きゅ'),('ぎゆ','ぎゅ'),('にゆ','にゅ'),('ひゆ','ひゅ'),('びゆ','びゅ'),('ぴゆ','ぴゅ'),('みゆ','みゅ'),('りゆ','りゅ'),('しよ','しょ'),('じよ','じょ'),('ちよ','ちょ'),('きよ','きょ'),('ぎよ','ぎょ'),('によ','にょ'),('ひよ','ひょ'),('びよ','びょ'),('ぴよ','ぴょ'),('みよ','みょ'),('りよ','りょ')]:s=s.replace(a,b)
 return s
def hav(a,b,c,d):
 R=6371000;p1=math.radians(a);p2=math.radians(c);dp=math.radians(c-a);dl=math.radians(d-b);x=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2;return 2*R*math.asin(min(1,math.sqrt(x)))
def read(p):return [json.loads(x) for x in open(p,encoding='utf-8') if x.strip()]
def dump(p,rows):
 with open(p,'w',encoding='utf-8',newline='\n') as f:
  for r in rows:f.write(json.dumps(r,ensure_ascii=False,separators=(',',':'))+'\n')
def type_ok(st,t):
 h=str(t.get('historic') or '');am=t.get('amenity');tour=t.get('tourism');herit=t.get('heritage')
 if st=='religious_site':return am=='place_of_worship' or bool(herit) or h in ('religious','church','monastery','wayside_shrine','memorial') or tour=='attraction'
 if st=='castle_or_fortification':return h in ('castle','fort','ruins','archaeological_site','city_gate') or bool(herit) or tour=='attraction'
 if st=='kofun_or_shell_mound':return h in ('archaeological_site','tomb','ruins') or bool(herit) or tour=='attraction'
 if st=='industrial_heritage':return bool(h) or bool(herit) or bool(t.get('man_made')) or tour=='attraction'
 return bool(h) or bool(herit) or tour in ('attraction','museum')
def load_osm(p):
 grid=defaultdict(list);n=0
 for line in open(p,encoding='utf-8',errors='ignore'):
  line=line.lstrip('\x1e').strip()
  if not line:continue
  try:o=json.loads(line);g=shape(o.get('geometry'))
  except:continue
  if g.is_empty:continue
  pt=g if g.geom_type=='Point' else g.representative_point();t=o.get('properties') or {};names=[];kanas=[]
  for k in ('name:ja','name','official_name','alt_name','alt_name:ja','old_name','loc_name','short_name','historic_name','was:name'):
   v=t.get(k)
   if v:
    for x in str(v).split(';'):
     if norm(x):names.append(x)
  for k in ('name:ja-Hira','name:ja_kana','name:kana','name:ja_hira'):
   v=t.get(k)
   if v:
    for x in str(v).split(';'):
     if kana_norm(x):kanas.append(x)
  if not names and not kanas:continue
  rec={'id':t.get('@id') or t.get('id') or f'osm-{n}','lat':pt.y,'lon':pt.x,'names':names,'kanas':kanas,'tags':t};grid[(int(pt.y/.02),int(pt.x/.02))].append(rec);n+=1
 return grid,n
def match_osm(rows,grid):
 out={}
 for r in rows:
  if r.get('source_ready'):continue
  lat,lon=r['latitude'],r['longitude'];key=(int(lat/.02),int(lon/.02));rn=norm(r['name_ja']);rk=kana_norm(r.get('name_kana'));best=None
  for di in range(-2,3):
   for dj in range(-2,3):
    for c in grid.get((key[0]+di,key[1]+dj),[]):
     if not type_ok(r['subtype'],c['tags']):continue
     d=hav(lat,lon,c['lat'],c['lon'])
     if d>1800:continue
     for nm in c['names']:
      cn=norm(nm);sim=fuzz.ratio(rn,cn);exact=(rn==cn)
      strong=(exact and d<=1000 and len(rn)>=4) or (sim>=98 and d<=250 and min(len(rn),len(cn))>=4) or (sim>=94 and d<=80 and min(len(rn),len(cn))>=5)
      if strong:
       rank=(2 if exact else 1,sim,-d)
       if best is None or rank>best[0]:best=(rank,d,sim,nm,c,'name')
     if rk:
      for nm in c['kanas']:
       ck=kana_norm(nm);sim=fuzz.ratio(rk,ck);exact=(rk==ck)
       strong=(exact and d<=800 and len(rk)>=5) or (sim>=98 and d<=180 and min(len(rk),len(ck))>=5)
       if strong:
        rank=(3 if exact else 1,sim,-d)
        if best is None or rank>best[0]:best=(rank,d,sim,nm,c,'kana')
  if best:
   _,d,sim,nm,c,mode=best;t=c['tags'];oid=str(c['id']);typ,oidnum=(oid.split('/',1) if '/' in oid else ('object',oid));out[r['source_entry_id']]={'osm_type':typ,'osm_id':oidnum,'matched_name':nm,'match_mode':mode,'distance_m':round(d,1),'name_similarity':round(sim,1),'website':t.get('website') or t.get('contact:website'),'opening_hours':t.get('opening_hours'),'wheelchair':t.get('wheelchair'),'tourism':t.get('tourism'),'historic':t.get('historic'),'heritage':t.get('heritage'),'amenity':t.get('amenity'),'religion':t.get('religion'),'access':t.get('access'),'fee':t.get('fee'),'wikipedia':t.get('wikipedia')}
 return out

def fuzzy_wd(rows):
 target=[r for r in rows if not r.get('source_ready')];searches={}
 with cf.ThreadPoolExecutor(max_workers=16) as ex:
  fut={ex.submit(v38.wd_search,r['name_ja']):r['source_entry_id'] for r in target}
  for n,f in enumerate(cf.as_completed(fut),1):
   searches[fut[f]]=f.result()
   if n%500==0:print('WD_FUZZY_SEARCHED',n)
 qids=[x['id'] for a in searches.values() for x in a if x.get('id')];ents=v38.batch_entities(qids);out={}
 for r in target:
  w=v38.choose_wd(r,searches.get(r['source_entry_id'],[]),ents)
  if w:out[r['source_entry_id']]=w
 return out

def main():
 src,osmfile,outdir=sys.argv[1:4];Path(outdir).mkdir(parents=True,exist_ok=True);rows=read(src)
 if len(rows)!=5021:raise RuntimeError(f'expected 5021 got {len(rows)}')
 before=sum(bool(r.get('source_ready')) for r in rows);wd=fuzzy_wd(rows);grid,oc=load_osm(osmfile);om=match_osm(rows,grid)
 enriched=[];evid=[];profiles=[];second=[];conf=[]
 for r0 in rows:
  r=dict(r0);sid=r['source_entry_id'];w=wd.get(sid);o=om.get(sid);prior=bool(r.get('source_ready'))
  if w:
   r['wikidata_tertiary_id']=w['qid'];r['wikidata_tertiary_distance_km']=w['distance_km'];r['wikidata_tertiary_name_similarity']=w['name_similarity'];r['wikidata_tertiary_p4275']=w.get('p4275')
   if w.get('p4275') and not r.get('japanese_national_cultural_property_id'):r['japanese_national_cultural_property_id']=w['p4275'][0]
   if w.get('official_urls') and not r.get('official_url'):r['official_url']=w['official_urls'][0];r['official_url_source']='wikidata_P856_tertiary_strong_match'
  else:r['wikidata_tertiary_id']=None
  if o:
   r.update({'osm_tertiary_id':o['osm_id'],'osm_tertiary_type':o['osm_type'],'osm_tertiary_distance_m':o['distance_m'],'osm_tertiary_name_similarity':o['name_similarity'],'osm_tertiary_match_mode':o['match_mode'],'osm_tertiary_url':f"https://www.openstreetmap.org/{o['osm_type']}/{o['osm_id']}",'osm_tertiary_opening_hours_candidate':o.get('opening_hours'),'osm_tertiary_website_candidate':o.get('website')})
  else:r['osm_tertiary_id']=None
  newev=int(bool(w))+int(bool(o));oldcount=int(r.get('secondary_evidence_count') or 0);r['secondary_evidence_count_v3_9']=oldcount;r['tertiary_evidence_count']=newev;r['evidence_count_total']=oldcount+newev;r['secondary_evidence_count']=r['evidence_count_total']
  if not prior and newev:
   r['source_ready']=True;r['source_ready_scope']='identity_and_feature_enrichment_not_public_access';r['physical_poi_review_status']='current_identity_corroborated_public_access_review_needed';r['review_status']='auto_approved_identity_only'
   if w and o:r['modern_visitability_status']='current_identity_multi_source_corroborated_public_access_unknown';r['deterministic_confidence']=.92
   elif o:r['modern_visitability_status']='current_identity_osm_alias_or_kana_corroborated_public_access_unknown';r['deterministic_confidence']=.82
   else:r['modern_visitability_status']='current_identity_wikidata_fuzzy_coordinate_corroborated_public_access_unknown';r['deterministic_confidence']=.82
  r['tertiary_enrichment_version']='poi-tertiary-source-v4.0';enriched.append(r)
  ft=v39.apply_feature(r,o)
  for x in ft.values():
   if x.get('model_version')=='poi-feature-evidence-prior-v3.9':x['model_version']='poi-feature-evidence-prior-v4.0'
  pr={k:r.get(k) for k in ('expansion_slot_id','global_slot_ordinal','effective_master_code','name_ja','prefecture_id','latitude','longitude','primary_type','subtype','source_entry_id')};pr.update({'schema_version':'POIFeatureV1.1-43D','poi_feature_v1':ft,'feature_profile_status':'auto_approved' if all(x['value'] is None or x['review_status']=='auto_approved' for x in ft.values()) else 'second_review','conversion_status':'identity_bound_feature43_v4.0','source_ready':r['source_ready']});profiles.append(pr)
  evid.append({'expansion_slot_id':r['expansion_slot_id'],'master_code':r['effective_master_code'],'source_entry_id':sid,'prior_source_ready':prior,'wikidata_tertiary':w,'osm_tertiary':o,'source_ready_after':r['source_ready'],'modern_visitability_status':r['modern_visitability_status']})
  if not r['source_ready']:second.append({'expansion_slot_id':r['expansion_slot_id'],'master_code':r['effective_master_code'],'source_entry_id':sid,'name_ja':r['name_ja'],'reason':'no strong current evidence after national-property + exact Wikidata/OSM + tertiary fuzzy/alias review; not evidence of nonexistence'})
  vv={k:x['value'] for k,x in ft.items()}
  if re.search(r'山|岳|峠|峰',r['name_ja']) and vv['rain']>=8:conf.append({'master_code':r['effective_master_code'],'rule':'outdoor_mountain_rain_high'})
 dump(Path(outdir)/'remaining5021-source-enriched-v4.0.jsonl',enriched);dump(Path(outdir)/'remaining5021-tertiary-evidence-v4.0.jsonl',evid);dump(Path(outdir)/'feature43-new5021-v4.0.jsonl',profiles);dump(Path(outdir)/'modern-presence-still-second-review-v4.0.jsonl',second);dump(Path(outdir)/'feature-conflicts-new5021-v4.0.jsonl',conf)
 after=sum(bool(r.get('source_ready')) for r in enriched);dist={}
 for k in v39.FEATURES:
  vals=[p['poi_feature_v1'][k]['value'] for p in profiles if p['poi_feature_v1'][k]['value'] is not None];dist[k]={'non_null':len(vals),'unique_values':sorted(set(vals)),'unique_count':len(set(vals)),'distribution':dict(sorted(Counter(vals).items()))}
 json.dump(dist,open(Path(outdir)/'feature-distribution-new5021-v4.0.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
 report={'version':'v4.0-new5021','input':5021,'source_ready_before':before,'source_ready_after':after,'newly_source_ready':after-before,'still_second_review':len(second),'wikidata_tertiary_matches':len(wd),'osm_tertiary_matches':len(om),'both_tertiary_sources':sum(1 for e in evid if e['wikidata_tertiary'] and e['osm_tertiary']),'feature_profiles':len(profiles),'core28_complete':sum(all(p['poi_feature_v1'][k]['value'] is not None for k in CORE28) for p in profiles),'feature_conflicts':len(conf),'osm_candidate_features_loaded':oc,'deterministic_unknown_policy':'No unknown deterministic field guessed; OSM opening_hours/website remain candidate fields; Wikidata P856 promoted only on accepted strong entity match.'}
 json.dump(report,open(Path(outdir)/'new5021-tertiary-report-v4.0.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
 files=[]
 for p in sorted(Path(outdir).glob('*')):
  if p.is_file():files.append({'file':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'bytes':p.stat().st_size})
 json.dump({'version':'v4.0-new5021','files':files},open(Path(outdir)/'manifest-v4.0.json','w',encoding='utf-8'),ensure_ascii=False,indent=2)
 print('REPORT',json.dumps(report,ensure_ascii=False,sort_keys=True))
if __name__=='__main__':main()
