#!/usr/bin/env python3
"""Extract current, licensed GTFS stop topology; never turn stop times into POI access."""
import argparse, csv, hashlib, io, json, zipfile
from pathlib import Path

def enc(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))+"\n").encode("utf-8")
def sha(value):
    return hashlib.sha256(value).hexdigest()
def run(source_dir, output):
    sources = [
        {"sourceId":"ikoma-community-20260314","file":"ikoma20260314.zip","sha256":"b48b71fbc7896fe735a06c5eb7740f055d669e410d250d8ee8cd5423359e0971","sourceUrl":"https://data.bodik.jp/dataset/292095_1714108666","archiveUrl":"https://data.bodik.jp/dataset/f305e5a9-a0ee-4d71-8313-2cf7e25bc483/resource/bb299b6f-5560-417d-b183-6d11c0a55726/download/ikoma20260314.zip","attribution":"生駒市 コミュニティバスGTFSデータ; CC BY 4.0; TravelAssist extracted stop identities and route references."},
        {"sourceId":"seki-itadori-20260401","file":"itadorifureaibus.zip","sha256":"2999dfaf94dec85d11da1f75ad58e251ec894a668b825f988c30ff171acd171c","sourceUrl":"https://www.city.seki.lg.jp/0000010802.html","archiveUrl":"https://api.gtfs-data.jp/v2/organizations/sekicity/feeds/itadorifureaibus/files/feed.zip?rid=current","attribution":"関市 板取ふれあいバス; CC BY 4.0; TravelAssist extracted stop identities and route references."}
    ]
    records = []
    for s in sources:
        raw=(Path(source_dir)/s["file"]).read_bytes()
        if sha(raw) != s["sha256"]: raise ValueError("GTFS_ARCHIVE_SHA_MISMATCH")
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            def table(name):
                return list(csv.DictReader(io.StringIO(z.read(name).decode("utf-8-sig"), newline="")))
            agencies, stops, routes, trips, times = [table(x+".txt") for x in ["agency","stops","routes","trips","stop_times"]]
            trip_routes={x["trip_id"]:x["route_id"] for x in trips}
            by_stop={}
            for t in times: by_stop.setdefault(t["stop_id"],set()).add(trip_routes[t["trip_id"]])
            s.update({"license":"CC-BY-4.0","feedInfo":table("feed_info.txt"),"agencies":agencies,"stopCount":len(stops),"routes":routes,"entryHashes":{n:sha(z.read(n)) for n in sorted(z.namelist())}})
            for row in stops:
                r={"sourceId":s["sourceId"],"sourceUrl":s["sourceUrl"],"archiveSha256":s["sha256"],"name":row["stop_name"],"operator":agencies[0]["agency_name"],"nodeKind":"bus_stop","point":{"latitude":float(row["stop_lat"]),"longitude":float(row["stop_lon"])},"coordinateSemantics":"GTFS_WGS84_boarding_stop_not_POI_entrance","externalId":row["stop_id"],"sourceRow":row,"lines":sorted(by_stop.get(row["stop_id"],[])),"sourceRowSha256":sha(enc(row))}
                r["sourceRecordSha256"]=sha(enc(r));records.append(r)
    out=Path(output);out.mkdir(parents=True,exist_ok=True)
    (out/"gtfs-source-records.jsonl").write_bytes(b"".join(enc(r) for r in sorted(records,key=lambda r:r["sourceRecordSha256"])))
    (out/"gtfs-extraction.json").write_bytes(enc({"sources":sources,"derivedSha256":sha((out/"gtfs-source-records.jsonl").read_bytes()),"routeAccessObservationsExtracted":0,"reason":"GTFS describes stop-to-stop trips, not the unmeasured final leg to a Canonical POI."}))
    print(json.dumps({"sources":len(sources),"stops":len(records)}))
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--source-dir",required=True);p.add_argument("--output",default="data/transport/access/inputs")
    args=p.parse_args();run(args.source_dir,args.output)
