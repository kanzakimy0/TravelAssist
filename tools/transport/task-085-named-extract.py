"""Expand only named official gateways from pinned licensed static archives.
No POI x national node cross product, no proximity-based access admission.
"""
import hashlib, importlib.util, io, json, zipfile, unicodedata
from collections import defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'data/transport/access/inputs'
CACHE=ROOT/'.cache/qa/task085-full/sources'
def sha(b): return hashlib.sha256(b).hexdigest()
def enc(o): return (json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(',',':'))+'\n').encode()
def normalized_name(s): return ''.join(unicodedata.normalize('NFKC',s).split())
facts=json.loads((OUT/'gateway-fact-reviews.json').read_text(encoding='utf8'))
names={normalized_name(g['name']) for f in facts for g in f['gateways']}
allnodes=[]
s12raw=(CACHE/'S12-25_GML.zip').read_bytes()
assert sha(s12raw)=='0785e932a32b3ec15e1a1345537ae145eafe1c07bf38d5c16c11ee2b391e7a28'
entry='S12-25_GML/UTF-8/S12-25_NumberOfPassengers.geojson'
features=json.loads(zipfile.ZipFile(io.BytesIO(s12raw)).read(entry))['features']
groups=defaultdict(list)
for f in features:
 p=f['properties'];g=f['geometry']
 if normalized_name(p['S12_001']) not in names:continue
 pts=g['coordinates'] if g['type']=='LineString' else [p for line in g['coordinates'] for p in line]
 point={'latitude':round(sum(p[1] for p in pts)/len(pts),7),'longitude':round(sum(p[0] for p in pts)/len(pts),7)}
 key=enc([p['S12_001'],p['S12_002'],point,p['S12_004']])
 groups[key].append({'name':p['S12_001'],'operator':p['S12_002'],'line':p['S12_003'],'railClass':p['S12_004'],'point':point,'stationCode':p['S12_001c'],'featureSha256':sha(enc(f)),'geometry':g,'passengersPerDay':p['S12_061'] if p['S12_058']==1 and p['S12_059']==1 else None})
for rows in groups.values():
 r=rows[0];n={k:r[k] for k in ['name','operator','railClass','point']}
 n.update({'sourceId':'mlit-s12-fy2024','sourceUrl':'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2024.html','archiveSha256':sha(s12raw),'entry':entry,'coordinateSemantics':'mean_of_official_station_geometry_vertices_JGD2011_not_entrance','lines':sorted({r['line'] for r in rows}),'sourceRows':sorted(rows,key=enc)})
 n['sourceRecordSha256']=sha(enc(n));allnodes.append(n)
p11raw=(CACHE/'P11-22_SHP.zip').read_bytes()
assert sha(p11raw)=='12132cc1c349d5d84c1ae90e7e5fff7c12a79540f4487edfae46e9f640bc1c72'
z=zipfile.ZipFile(io.BytesIO(p11raw));p11count=0
for member in z.namelist():
 zz=zipfile.ZipFile(io.BytesIO(z.read(member)));entry=next(n for n in zz.namelist() if n.endswith('.geojson'))
 for idx,f in enumerate(json.loads(zz.read(entry))['features']):
  p11count+=1;p=f['properties']
  if normalized_name(p['P11_001']) not in names:continue
  lon,lat=f['geometry']['coordinates']
  r={'name':p['P11_001'],'operator':p['P11_002'],'point':{'latitude':lat,'longitude':lon},'nodeKind':'bus_stop','lines':sorted(set(v for k,v in p.items() if k.startswith('P11_003') and v)),'externalId':member+':feature:'+str(idx),'sourceId':'mlit-p11-fy2022','sourceUrl':'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P11-v3_0.html','archiveSha256':sha(p11raw),'sourceFeatureSha256':sha(enc(f)[:-1]),'coordinateSemantics':'JGD2011_P11_STOP_CLUSTER_NOT_DIRECTIONAL_BOARDING_POINT','sourceEntry':entry,'sourceFeatureIndex':idx}
  r['sourceRecordSha256']=sha(enc(r)[:-1]);allnodes.append(r)
spec=importlib.util.spec_from_file_location('s12',ROOT/'tools/transport/task-085-source-extract.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
runtime=json.loads((ROOT/'src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json').read_text(encoding='utf8'))
assert runtime['runtimeImportAuthorized'] is True and runtime['candidateCorpusAuthorized'] is False
canonical_bytes=(ROOT/runtime['datasetPath']).read_bytes()
assert sha(canonical_bytes)==runtime['datasetFileSha256']
pois={p['internalId']:p for p in json.loads(canonical_bytes)['records']}
assert len(pois)==runtime['recordCount'] and set(pois)==set(runtime['internalIds'])
existing={json.loads(s)['sourceRecordSha256'] for name in ['s12-source-records.jsonl','gtfs-source-records.jsonl','p11-source-records.jsonl'] for s in (OUT/name).read_text(encoding='utf8').splitlines()}
idx=defaultdict(list)
for r in allnodes:idx[normalized_name(r['name'])].append(r)
keep={};scans=[]
for fact in facts:
 for g in fact['gateways']:
  candidates=[r for r in idx[normalized_name(g['name'])] if bool(r.get('sourceRows'))==(g['kind']=='rail')]
  matches=[(mod.distance(pois[fact['poiId']]['location']['point'],r['point']),r) for r in candidates]
  matches=sorted(matches,key=lambda x:(x[0],x[1]['sourceRecordSha256']))
  near=[r for d,r in matches if d<=g.get('maxJoinDistanceM',12000) and d<=matches[0][0]+750]
  for r in near:
   if r['sourceRecordSha256'] not in existing:keep[r['sourceRecordSha256']]=r
  scans.append({'poiId':fact['poiId'],'gatewayName':g['name'],'sourceRefs':fact['sourceRefs'],'kind':g['kind'],'maxJoinDistanceM':g.get('maxJoinDistanceM',12000),'nationalNamedMatchCount':len(matches),'localityQualifiedHashes':[r['sourceRecordSha256'] for r in near],'nearestMatchStraightDistanceM':round(matches[0][0]) if matches else None,'unqualifiedReason':None if near else 'NO_LICENSED_NAME_KIND_LOCALITY_MATCH','unresolvedTopologyRelationshipNotAutomaticallyAdmitted':True})
for name,rows in [('named-source-records.jsonl',sorted(keep.values(),key=lambda r:r['sourceRecordSha256'])),('named-source-scans.jsonl',scans)]:
 (OUT/name).write_bytes(b''.join(enc(r) for r in rows))
meta={'schemaVersion':'1.0','scope':'ONLY_EXPLICIT_REVIEWED_GATEWAY_NAMES_AND_BOUNDED_LOCALITY','sourceFeatureCounts':{'s12':len(features),'p11':p11count},'inputFactReviewsSha256':sha((OUT/'gateway-fact-reviews.json').read_bytes()),'archiveSha256':{'s12':sha(s12raw),'p11':sha(p11raw)},'selectedAdditionalRecords':len(keep),'derivedFiles':{n:sha((OUT/n).read_bytes()) for n in ['named-source-records.jsonl','named-source-scans.jsonl']}}
(OUT/'named-extraction.json').write_bytes(enc(meta))
print(json.dumps({'extraNodes':len(keep),'gatewaySearches':len(scans),'withoutIdentity':sum(not s['localityQualifiedHashes'] for s in scans)}))
