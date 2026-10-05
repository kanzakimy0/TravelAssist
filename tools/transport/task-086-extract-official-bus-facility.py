"""Source-bound official facility extraction. No map coordinate inference or network I/O."""
import csv,io,json,sys,zipfile,hashlib
from pathlib import Path
r=json.load(sys.stdin)
b=Path(r['archiveAbsolutePath']).read_bytes()
def sha(v):return hashlib.sha256(v if isinstance(v,bytes)else json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':')).encode()).hexdigest()
assert sha(b)==r['archiveSha256'],'OFFICIAL_FACILITY_ARCHIVE_CHANGED'
if r['dataset']=='P05-22':
 with zipfile.ZipFile(io.BytesIO(b))as z:
  assert z.namelist().count(r['member'])==1,'OFFICIAL_FACILITY_MEMBER_NOT_UNIQUE'
  m=z.read(r['member'])
 assert sha(m)==r['memberSha256'],'OFFICIAL_FACILITY_MEMBER_CHANGED'
 feature=json.loads(m)['features'][r['featureIndex']]
 assert feature['type']=='Feature'and feature['geometry']['type']=='Point','OFFICIAL_FACILITY_NOT_POINT'
 props=feature['properties'];coords=feature['geometry']['coordinates']
 n={'dataset':'P05-22','nativeRecord':feature,'nativeRecordSha256':sha(feature),'archiveSha256':sha(b),'memberSha256':sha(m),'featureIndex':r['featureIndex'],'name':props['P05_003'],'address':props['P05_004'],'latitude':coords[1],'longitude':coords[0],'municipalityCode':props['P05_001'],'identityAnchor':'mlit-p05:22:'+props['P05_001'][:2]+':'+props['P05_003']+':'+props['P05_004']}
elif r['dataset']=='P04-20':
 assert r['archiveSha256']=='7df01d1bd444b62af89714eb0df07612cd18a29cfd32001e63a159b940a6562d','P04_HISTORICAL_ARCHIVE_UNREVIEWED'
 assert r['member']=='P04-20_46_GML/P04-20_46.geojson' and r['featureIndex']==466,'P04_HISTORICAL_RECORD_UNREVIEWED'
 with zipfile.ZipFile(io.BytesIO(b)) as z:
  assert z.namelist().count(r['member'])==1,'OFFICIAL_FACILITY_MEMBER_NOT_UNIQUE'
  m=z.read(r['member'])
 assert sha(m)==r['memberSha256']=='76a22c6e5c92674648099a96c7dbc8ca0e97a3e61e47c505a44f0a23a6f684a0','OFFICIAL_FACILITY_MEMBER_CHANGED'
 features=json.loads(m)['features'];feature=features[466];props=feature['properties'];coords=feature['geometry']['coordinates']
 assert props['P04_002']=='医療法人徳洲会　喜界徳洲会病院' and props['P04_003']=='大島郡喜界町湾字前金久３１５','P04_HISTORICAL_NAME_OR_ADDRESS'
 assert len([f for f in features if f['properties']['P04_002']==props['P04_002']])==1,'P04_HISTORICAL_RECORD_NOT_UNIQUE'
 assert props['P04_001']==1 and feature['geometry']['type']=='Point','P04_HISTORICAL_NOT_HOSPITAL_POINT'
 n={'dataset':'P04-20','member':r['member'],'featureIndex':466,'nativeRecord':feature,'nativeRecordSha256':sha(feature),'archiveSha256':sha(b),'memberSha256':sha(m),'name':props['P04_002'],'address':props['P04_003'],'longitude':coords[0],'latitude':coords[1],'identityAnchor':'mlit-p04:20:46:feature466:historical-hospital-front-stop','nativeFacilityStatus':'HISTORICAL_2020_SITE_NOT_CURRENT_HOSPITAL','coordinateScope':'OFFICIAL_HISTORICAL_FACILITY_REPRESENTATIVE_NOT_BUS_POLE_ENTRANCE_OR_NAVIGATION'}
elif r['dataset']=='TOKYO_PUBLIC_EVACUATION_FACILITIES':
 rows=list(csv.reader(io.StringIO(b.decode('cp932'))));h=r['header']
 assert len(rows)==r['rowCount'] and rows[r['headerRowIndex']]==h and all(len(x)==len(h)for x in rows),'OFFICIAL_FACILITY_CSV_LAYOUT_CHANGED'
 assert sum(not any(x)for x in rows)==r['emptyRowCount'],'OFFICIAL_FACILITY_EMPTY_ROWS_CHANGED'
 row=dict(zip(h,rows[r['logicalRowIndex']]))
 n={'dataset':r['dataset'],'nativeRecord':row,'nativeRecordSha256':sha(row),'archiveSha256':sha(b),'logicalRowIndex':r['logicalRowIndex'],'name':row[h[0]],'address':row[h[4]],'latitude':float(row[h[5]]),'longitude':float(row[h[6]]),'municipalityCode':row[h[1]],'identityAnchor':'tokyo-evacuation-facility:'+row[h[1]]+':'+row[h[0]]+':'+row[h[4]]}
else:raise ValueError('OFFICIAL_FACILITY_UNREVIEWED_DATASET')
assert n['nativeRecordSha256']==r['nativeRecordSha256'],'OFFICIAL_FACILITY_NATIVE_RECORD_CHANGED'
assert -90<=n['latitude']<=90 and -180<=n['longitude']<=180,'OFFICIAL_FACILITY_COORDINATES'
print(json.dumps(n,ensure_ascii=True,separators=(',',':')))
