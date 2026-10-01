#!/usr/bin/env python3
"""Extract task-local, bounded S12 topology evidence. No v1/review node promotion."""
import argparse, hashlib, json, math, zipfile
from pathlib import Path
from collections import defaultdict

ARCHIVE_SHA = "0785e932a32b3ec15e1a1345537ae145eafe1c07bf38d5c16c11ee2b391e7a28"
ENTRY = "S12-25_GML/UTF-8/S12-25_NumberOfPassengers.geojson"
SOURCE = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2024.html"
def enc(v):
    return (json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(",", ":"))+"\n").encode("utf-8")
def sha(b):
    return hashlib.sha256(b).hexdigest()
def distance(a,b):
    x,y,u,v=map(math.radians,[a["latitude"],a["longitude"],b["latitude"],b["longitude"]])
    return 12742000*math.asin(min(1,math.sqrt(math.sin((u-x)/2)**2+math.cos(x)*math.cos(u)*math.sin((v-y)/2)**2)))
def run(archive, output):
    raw=Path(archive).read_bytes()
    if sha(raw)!=ARCHIVE_SHA: raise ValueError("S12_ARCHIVE_SHA_MISMATCH")
    runtime=json.loads(Path("src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json").read_text("utf-8"))
    body=Path(runtime["datasetPath"]).read_bytes()
    if runtime["runtimeImportAuthorized"] is not True or runtime["candidateCorpusAuthorized"] is not False or sha(body)!=runtime["datasetFileSha256"]:
        raise ValueError("CANONICAL_AUTHORIZATION_FAILED")
    pois=json.loads(body)["records"]
    config=json.loads(Path("data/transport/access/inputs/config.json").read_text("utf8"))
    spatial_config={key:config[key] for key in ["stagedRadiiM","maxDiscoveryCandidatesPerPoi","cellDegrees"]}
    cell=spatial_config["cellDegrees"]; cap=spatial_config["maxDiscoveryCandidatesPerPoi"]
    if {x["internalId"] for x in pois}!=set(runtime["internalIds"]): raise ValueError("CANONICAL_SET_MISMATCH")
    with zipfile.ZipFile(archive) as z: entry=z.read(ENTRY)
    features=json.loads(entry)["features"]
    # Exact identical station geometries of the same named operator are one
    # topology component. Nearby stations are NEVER identity-merged.
    grouped=defaultdict(list)
    for f in features:
        p=f["properties"]; g=f["geometry"]
        points=g["coordinates"] if g["type"]=="LineString" else [p for line in g["coordinates"] for p in line]
        point={"latitude":round(sum(p[1] for p in points)/len(points),7),"longitude":round(sum(p[0] for p in points)/len(points),7)}
        key=enc([p["S12_001"],p["S12_002"],point,p["S12_004"]]).decode().strip()
        grouped[key].append({"name":p["S12_001"],"operator":p["S12_002"],"line":p["S12_003"],"railClass":p["S12_004"],"point":point,"stationCode":p["S12_001c"],"featureSha256":sha(enc(f)),"geometry":g,"passengersPerDay":p["S12_061"] if p["S12_058"]==1 and p["S12_059"]==1 else None})
    cells=defaultdict(list)
    nodes=[]
    for key, rows in sorted(grouped.items()):
        row=rows[0]
        node={k:row[k] for k in ["name","operator","railClass","point"]}
        node.update({"sourceId":"mlit-s12-fy2024","sourceUrl":SOURCE,"archiveSha256":ARCHIVE_SHA,"entry":ENTRY,"coordinateSemantics":"mean_of_official_station_geometry_vertices_JGD2011_not_entrance","lines":sorted({r["line"] for r in rows}),"sourceRows":sorted(rows,key=lambda r:enc(r))})
        node["sourceRecordSha256"]=sha(enc(node))
        idx=len(nodes);nodes.append(node)
        cells[(math.floor(row["point"]["latitude"]/cell), math.floor(row["point"]["longitude"]/cell))].append(idx)
    selected=set();scans=[]
    for poi in sorted(pois,key=lambda p:p["internalId"]):
        p=poi["location"]["point"]; radius=spatial_config["stagedRadiiM"][-1]
        latDelta=radius/110000
        lonDelta=radius/(110000*max(.1,math.cos(math.radians(p["latitude"]))))
        found=[];visited=0
        for x in range(math.floor((p["latitude"]-latDelta)/cell),math.floor((p["latitude"]+latDelta)/cell)+1):
            for y in range(math.floor((p["longitude"]-lonDelta)/cell),math.floor((p["longitude"]+lonDelta)/cell)+1):
                for i in cells.get((x,y),[]):
                    visited+=1
                    d=distance(p,nodes[i]["point"])
                    if d<=radius: found.append((round(d),nodes[i]["sourceRecordSha256"],i))
        found.sort()
        selected.update(r[2] for r in found[:cap])
        scans.append({"poiId":poi["internalId"],"searchRadiusM":radius,"spatialRecordsExamined":visited,"credibleTopologyCandidates":len(found),"retainedSourceRecordHashes":[r[1] for r in found[:cap]],"truncatedSourceRecordHashes":[r[1] for r in found[cap:]],"truncateReason":"DETERMINISTIC_DISTANCE_THEN_SOURCE_HASH_DISCOVERY_CAP_"+str(cap),"stages":[{"radiusM":r,"count":sum(d<=r for d,_,_ in found)} for r in spatial_config["stagedRadiiM"]]})
    out=Path(output);out.mkdir(parents=True,exist_ok=True)
    subset=sorted((nodes[i] for i in selected),key=lambda n:n["sourceRecordSha256"])
    (out/"s12-source-records.jsonl").write_bytes(b"".join(enc(n) for n in subset))
    (out/"s12-spatial-scan.jsonl").write_bytes(b"".join(enc(s) for s in scans))
    (out/"s12-extraction.json").write_bytes(enc({"schemaVersion":"1.0","archiveSha256":ARCHIVE_SHA,"entrySha256":sha(entry),"sourceUrl":SOURCE,"archiveUrl":"https://nlftp.mlit.go.jp/ksj/gml/data/S12/S12-25/S12-25_GML.zip","spatialConfig":spatial_config,"sourceFeatureCount":len(features),"distinctExactGeometryComponents":len(nodes),"selectedRecordCount":len(subset),"canonicalDatasetFileSha256":runtime["datasetFileSha256"],"license":"CC-BY-4.0","attribution":"国土数値情報（駅別乗降客数データ・令和6年度）国土交通省を加工してTravelAssistが作成。Representative points and bounded selection are TravelAssist derivatives.","runtimeImportAuthorized":False,"downstreamNodeAdmissionPerformed":False,"derivedFiles":{name:sha((out/name).read_bytes()) for name in ["s12-source-records.jsonl","s12-spatial-scan.jsonl"]}}))
    print(json.dumps({"features":len(features),"selected":len(subset),"pois":len(pois)}))
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--archive",required=True);p.add_argument("--output",default="data/transport/access/inputs")
    a=p.parse_args();run(a.archive,a.output)
