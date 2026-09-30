#!/usr/bin/env python3
"""Extract current, licensed GTFS stop topology; never turn stop times into POI access."""
import argparse, csv, hashlib, io, json, zipfile
from pathlib import Path

def enc(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))+"\n").encode("utf-8")
def sha(value):
    return hashlib.sha256(value).hexdigest()
def run(source_dir, output):
    sources = json.loads(Path("data/transport/access/inputs/expanded-gtfs-sources.json").read_text(encoding="utf-8"))
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
            s.update({"scheduleFreshness":"NOT_USED_AS_CURRENT_SERVICE_EVIDENCE","feedInfo":table("feed_info.txt"),"agencies":agencies,"stopCount":len(stops),"routes":routes,"entryHashes":{n:sha(z.read(n)) for n in sorted(z.namelist())}})
            for row in stops:
                r={"sourceId":s["sourceId"],"sourceUrl":s["sourceUrl"],"archiveSha256":s["sha256"],"name":row["stop_name"],"operator":agencies[0]["agency_name"],"nodeKind":"bus_stop","point":{"latitude":float(row["stop_lat"]),"longitude":float(row["stop_lon"])},"coordinateSemantics":"GTFS_WGS84_boarding_stop_not_POI_entrance","externalId":row["stop_id"],"sourceRow":row,"lines":sorted(by_stop.get(row["stop_id"],[])),"sourceRowSha256":sha(enc(row))}
                r["sourceRecordSha256"]=sha(enc(r));records.append(r)
    out=Path(output);out.mkdir(parents=True,exist_ok=True)
    (out/"expanded-gtfs-source-records.jsonl").write_bytes(b"".join(enc(r) for r in sorted(records,key=lambda r:r["sourceRecordSha256"])))
    (out/"expanded-gtfs-extraction.json").write_bytes(enc({"sources":sources,"derivedSha256":sha((out/"expanded-gtfs-source-records.jsonl").read_bytes()),"routeAccessObservationsExtracted":0,"reason":"GTFS describes stop-to-stop trips, not the unmeasured final leg to a Canonical POI."}))
    print(json.dumps({"sources":len(sources),"stops":len(records)}))
if __name__=="__main__":
    p=argparse.ArgumentParser();p.add_argument("--source-dir",required=True);p.add_argument("--output",default="data/transport/access/inputs")
    args=p.parse_args();run(args.source_dir,args.output)
