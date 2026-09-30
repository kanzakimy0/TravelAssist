"""Reviewed CC0 coordinate identities, independently joined to official gateway facts.
Offline extraction from four manually selected entity snapshots; never a route service.
"""
import hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'data/transport/access/inputs'
def stable(v):return json.dumps(v,ensure_ascii=False,sort_keys=True,separators=(',',':'))
def sha(v):return hashlib.sha256(v).hexdigest()
selection=[
 ('Q11542854','1a0cd655d749016cc0a27855498d70fc13a397026fc2d6b974cdef6590c23507','YCAT','横浜シティ・エア・ターミナル','bus_terminal',['https://www.ycat.co.jp/company/outline/']),
 ('Q115034784','32b01f32fee039775d203c9aa264795a09aca40de3697627f89dcd77f115576c','二見港','東京都港湾局','ferry_port',['https://www.mlit.go.jp/kankocho/cruise/jp/detail/119/index.html','https://www.islandaccess.metro.tokyo.lg.jp/island/hahajima/']),
 ('Q21019135','d6f7f7560a182518c0a2fc030bdd10659507f2df0a2b0cd5f16132001f182f73','竹芝客船ターミナル','東京都港湾局','ferry_port',['https://www.islandaccess.metro.tokyo.lg.jp/island/hahajima/']),
 ('Q117217639','69ef6b530b90f65e7f57acc066a2b794f3e4c5513346dfa372038c75c8cbf194','沖港','東京都港湾局','ferry_port',['https://www.islandaccess.metro.tokyo.lg.jp/stations/oki_port/','https://www.locationbox.metro.tokyo.lg.jp/catalog/1401/'])
]
rights=json.loads((OUT/'source-rights.json').read_text(encoding='utf8'));nodes=[];meta=[]
for q,expected,name,operator,kind,official in selection:
 b=(ROOT/'.cache/qa/task085-full/sources'/f'{q}.json').read_bytes();assert sha(b)==expected
 e=json.loads(b)['entities'][q];cs=[c['mainsnak']['datavalue']['value'] for c in e['claims']['P625'] if c['rank']!='deprecated']
 assert len(cs)==1 and cs[0]['globe']=='http://www.wikidata.org/entity/Q2'
 c=cs[0];sid='wikidata-'+q+'-r'+str(e['lastrevid']);url='https://www.wikidata.org/wiki/'+q
 n={'name':name,'operator':operator,'nodeKind':kind,'point':{k:c[k] for k in ['latitude','longitude']},'lines':[],'externalId':q,'identityAuthority':'wikidata-reviewed-official-gateway','sourceId':sid,'sourceUrl':url,'archiveSha256':expected,'sourceRevision':e['lastrevid'],'coordinateSemantics':'CC0_entity_representative_point_not_boarding_berth_or_entrance','coordinatePrecisionAsPublishedDegrees':c['precision'],'coordinateAccuracyM':None,'independentIdentityReview':{'status':'APPROVED','method':'EXACT_NAMED_FACILITY_OPERATOR_LOCALITY_OFFICIAL_ACCESS_JOIN','sourceRefs':official}}
 n['sourceRecordSha256']=sha(stable(n).encode());nodes.append(n)
 if not any(s['sourceId']==sid for s in rights['sources']):rights['sources'].append({'sourceId':sid,'license':'CC0-1.0','licenseUrl':'https://www.wikidata.org/wiki/Wikidata:Licensing','sourceUrl':url,'archiveUrl':'https://www.wikidata.org/wiki/Special:EntityData/'+q+'.json?revision='+str(e['lastrevid']),'archiveSha256':expected,'attribution':'Wikidata structured data (CC0); TravelAssist reviewed named identity against official facility/operator sources. No images, prose, route payload or OSM database imported.','scope':'FOUR_REVIEWED_STATIC_IDENTITIES_ONLY_NOT_ROUTE_METRICS','rights':dict.fromkeys(['bulkDatasetDownload','cache','retention','production','derivativePersistence'],True),'routeAccessGrant':False})
 meta.append({'entityId':q,'revision':e['lastrevid'],'rawSnapshotSha256':expected,'officialIdentityRefs':official})
(OUT/'supplemental-source-records.jsonl').write_bytes((''.join(stable(n)+'\n' for n in nodes)).encode())
(OUT/'supplemental-extraction.json').write_bytes((json.dumps({'scope':'REVIEWED_STATIC_IDENTITIES_ONLY','sources':meta,'derivedFiles':{'supplemental-source-records.jsonl':sha((OUT/'supplemental-source-records.jsonl').read_bytes())}},ensure_ascii=False,indent=2)+'\n').encode())
(OUT/'source-rights.json').write_bytes((json.dumps(rights,ensure_ascii=False,indent=2)+'\n').encode())
print(json.dumps({'nodes':len(nodes),'source':'CC0','routeMetricsImported':0}))
