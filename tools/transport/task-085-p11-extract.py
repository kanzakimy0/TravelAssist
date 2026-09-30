"""Extract P11 FY2022 static bus topology with bounded spatial/name discovery.
The archive is PDL1.0 open data; FY2010 non-commercial data is never read.
This does not confirm any POI relationship or route/service metrics.
"""
import hashlib,io,json,math,sys,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'data/transport/access/inputs'
ARCHIVE=ROOT/'.cache/qa/task085-full/sources/P11-22_SHP.zip'
EXPECTED='12132cc1c349d5d84c1ae90e7e5fff7c12a79540f4487edfae46e9f640bc1c72'
def sha(b):return hashlib.sha256(b).hexdigest()
def stable(o):return json.dumps(o,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def write(name,rows): (OUT/name).write_bytes((''.join(stable(r)+'\n' for r in rows)).encode())
def distance(a,b):
 r=math.pi/180;x=(a[0]-b[0])*r;y=(a[1]-b[1])*r
 return round(6371000*2*math.asin(min(1,math.sqrt(math.sin(x/2)**2+math.cos(a[0]*r)*math.cos(b[0]*r)*math.sin(y/2)**2))))
config=json.loads((OUT/'config.json').read_text(encoding='utf8'))
cell=config['cellDegrees'];radius=config['stagedRadiiM'][-1];cap=config['p11MaxNearestCandidatesPerPoi']
assert isinstance(cap,int) and cap>0
assert sha(ARCHIVE.read_bytes())==EXPECTED
z=zipfile.ZipFile(ARCHIVE);cells={};names={};entries=[];universe=0
for member in z.namelist():
 zz=zipfile.ZipFile(io.BytesIO(z.read(member)));entry=next(n for n in zz.namelist() if n.endswith('.geojson'));raw=zz.read(entry)
 entries.append({'member':member,'memberSha256':sha(z.read(member)),'entry':entry,'entrySha256':sha(raw)})
 for idx,f in enumerate(json.loads(raw)['features']):
  universe+=1;p=f['properties'];lon,lat=f['geometry']['coordinates']
  r={'name':p['P11_001'],'operator':p['P11_002'],'point':{'latitude':lat,'longitude':lon},
     'nodeKind':'bus_stop','lines':sorted(set(v for k,v in p.items() if k.startswith('P11_003') and v)),
     'externalId':member+':feature:'+str(idx),'sourceId':'mlit-p11-fy2022',
     'sourceUrl':'https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P11-v3_0.html','archiveSha256':EXPECTED,
     'sourceFeatureSha256':sha(stable(f).encode()),'coordinateSemantics':'JGD2011_P11_STOP_CLUSTER_NOT_DIRECTIONAL_BOARDING_POINT',
     'sourceEntry':entry,'sourceFeatureIndex':idx}
  r['sourceRecordSha256']=sha(stable(r).encode())
  cells.setdefault((math.floor(lat/cell),math.floor(lon/cell)),[]).append(r)
  names.setdefault(r['name'],[]).append(r)
runtime=json.loads((ROOT/'src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json').read_text(encoding='utf8'))
assert runtime['runtimeImportAuthorized'] is True and runtime['candidateCorpusAuthorized'] is False
body=(ROOT/runtime['datasetPath']).read_bytes();assert sha(body)==runtime['datasetFileSha256']
pois=json.loads(body)['records'];assert {p['internalId'] for p in pois}==set(runtime['internalIds'])
research={r['poiId']:r for r in json.loads((OUT/'official-access-research.json').read_text(encoding='utf8'))}
selected={};scans=[]
for p in sorted(pois,key=lambda p:p['internalId']):
 a=(p['location']['point']['latitude'],p['location']['point']['longitude']);local=[]
 dx=radius/110000;dy=dx/max(.1,math.cos(a[0]*math.pi/180))
 for x in range(math.floor((a[0]-dx)/cell),math.floor((a[0]+dx)/cell)+1):
  for y in range(math.floor((a[1]-dy)/cell),math.floor((a[1]+dy)/cell)+1):
   for r in cells.get((x,y),[]):
    d=distance(a,(r['point']['latitude'],r['point']['longitude']))
    if d<=radius:local.append((d,r))
 local.sort(key=lambda t:(t[0],t[1]['externalId']))
 gateway=set(research[p['internalId']]['gatewayNames'])
 keep=[r for d,r in local if r['name'] in gateway]
 keep+= [r for d,r in local[:cap] if r not in keep]
 for r in keep:selected[r['externalId']]=r
 scans.append({'poiId':p['internalId'],'sourceId':'mlit-p11-fy2022','archiveSha256':EXPECTED,'stages':[{'radiusM':v,'count':sum(d<=v for d,r in local)} for v in config['stagedRadiiM']],'retainedExternalIds':[r['externalId'] for r in keep],'nearbyUniverseCount':len(local),'truncatedRecordsSha256':sha(stable([r['sourceRecordSha256'] for d,r in local if r not in keep]).encode()),'noProximityAdmissionOfAccess':True})
write('p11-source-records.jsonl',sorted(selected.values(),key=lambda r:r['externalId']))
write('p11-spatial-scan.jsonl',scans)
meta={'canonicalDatasetFileSha256':sha(body),'spatialConfig':{k:config[k] for k in ['cellDegrees','stagedRadiiM','p11MaxNearestCandidatesPerPoi']},'sourceId':'mlit-p11-fy2022','archiveSha256':EXPECTED,'features':universe,'selectedRecords':len(selected),'entries':entries,'derivedFiles':{n:sha((OUT/n).read_bytes()) for n in ['p11-source-records.jsonl','p11-spatial-scan.jsonl']},'attribution':'国土数値情報（バス停留所データ・令和4年度）国土交通省を加工してTravelAssistが作成。','license':'PDL-1.0','licenseUrl':'https://nlftp.mlit.go.jp/ksj/other/agreement.html'}
(OUT/'p11-extraction.json').write_bytes((json.dumps(meta,ensure_ascii=False,indent=2)+'\n').encode())
print(json.dumps({'features':universe,'selected':len(selected)},ensure_ascii=False))
