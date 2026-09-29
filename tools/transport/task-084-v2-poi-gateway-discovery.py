#!/usr/bin/env python3
"""Find rail gateway review leads for runtime-authorized Canonical POIs.

Proximity is only discovery evidence. This does not generate TASK-085 access edges.
"""

import argparse
import hashlib
import json
import math
import zipfile
from collections import Counter
from pathlib import Path

ARCHIVE_SHA = "0785e932a32b3ec15e1a1345537ae145eafe1c07bf38d5c16c11ee2b391e7a28"
ENTRY = "S12-25_GML/UTF-8/S12-25_NumberOfPassengers.geojson"


def enc(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha(body):
    return hashlib.sha256(body).hexdigest()


def distance_km(lat1, lon1, lat2, lon2):
    a, b, c, d = map(math.radians, (lat1, lon1, lat2, lon2))
    h = math.sin((c-a)/2)**2 + math.cos(a)*math.cos(c)*math.sin((d-b)/2)**2
    return 12742*math.asin(min(1, math.sqrt(h)))


def run(args):
    manifest = json.loads(Path(args.authorization).read_text(encoding="utf-8"))
    dataset_path = Path(manifest["datasetPath"])
    dataset_bytes = dataset_path.read_bytes()
    if manifest["runtimeImportAuthorized"] is not True or manifest["candidateCorpusAuthorized"] is not False:
        raise RuntimeError("CANONICAL_POI_AUTHORIZATION_GATE_FAILED")
    if sha(dataset_bytes) != manifest["datasetFileSha256"]:
        raise RuntimeError("CANONICAL_POI_DATASET_SHA_MISMATCH")
    pois = json.loads(dataset_bytes)["records"]
    if len(pois) != manifest["recordCount"] or {p["internalId"] for p in pois} != set(manifest["internalIds"]):
        raise RuntimeError("CANONICAL_POI_AUTHORIZED_SET_MISMATCH")
    if sha(Path(args.archive).read_bytes()) != ARCHIVE_SHA:
        raise RuntimeError("S12_ARCHIVE_SHA_MISMATCH")
    with zipfile.ZipFile(args.archive) as archive:
        features = json.loads(archive.read(ENTRY))["features"]
    source_stations = {}
    for feature in features:
        p = feature["properties"]
        points = feature["geometry"]["coordinates"]
        points = points if feature["geometry"]["type"] == "LineString" else [point for line in points for point in line]
        key = (str(p["S12_001c"]), p["S12_002"], p["S12_003"])
        source_stations.setdefault(key, {"stationName": p["S12_001"], "stationCode": key[0], "operator": key[1], "line": key[2], "passengersPerDay": p["S12_061"] if p["S12_058"] == 1 and p["S12_059"] == 1 else None, "latitude": sum(x[1] for x in points)/len(points), "longitude": sum(x[0] for x in points)/len(points)})
    candidates = [json.loads(line) for line in Path(args.rail).read_text(encoding="utf-8").splitlines() if line]
    covered_codes = {ref["stationCode"] for c in candidates for ref in c["sourceStationRefs"]}
    result = []
    for poi in sorted(pois, key=lambda p: p["internalId"]):
        point = poi["location"]["point"]
        if not point:
            result.append({"canonicalPoiId": poi["internalId"], "status": "POI_POINT_MISSING_REVIEW_REQUIRED", "nearestS12": [], "nearestCandidate": []})
            continue
        lat, lon = point["latitude"], point["longitude"]
        source_nearest = sorted(source_stations.values(), key=lambda s: (distance_km(lat, lon, s["latitude"], s["longitude"]), s["stationCode"]))[:3]
        candidate_nearest = sorted(candidates, key=lambda c: (distance_km(lat, lon, c["latitude"], c["longitude"]), c["proposedTransportNodeId"]))[:3]
        srows = [{"stationName": s["stationName"], "operator": s["operator"], "line": s["line"], "stationCode": s["stationCode"], "passengersPerDay": s["passengersPerDay"], "distanceKm": round(distance_km(lat, lon, s["latitude"], s["longitude"]), 3), "inCandidateInventory": s["stationCode"] in covered_codes} for s in source_nearest]
        crows = [{"stationName": c["canonicalNameJa"], "operator": c["operatorRefs"][0], "proposedTransportNodeId": c["proposedTransportNodeId"], "distanceKm": round(distance_km(lat, lon, c["latitude"], c["longitude"]), 3)} for c in candidate_nearest]
        status = "NEAREST_S12_NOT_IN_CANDIDATES_REVIEW_REQUIRED" if not srows[0]["inCandidateInventory"] else "CANDIDATE_NEARBY_ACCESS_STILL_REVIEW_REQUIRED"
        result.append({"canonicalPoiId": poi["internalId"], "canonicalPoiNameJa": next((n["value"] for n in poi["names"]["localized"] if n["locale"] == "ja"), None), "prefecture": poi["location"]["address"]["prefecture"], "latitude": lat, "longitude": lon, "nearestS12": srows, "nearestCandidate": crows, "status": status, "reason": "Geographic proximity does not establish service, accessibility, route, or a formal POI access edge"})
    body = b"".join(map(enc, result))
    root = Path(args.output)
    root.mkdir(parents=True, exist_ok=True)
    path = root / "canonical-poi-rail-gateway-review.jsonl"
    if path.exists() and not args.rebuild and sha(path.read_bytes()) != sha(body):
        raise RuntimeError("POI_GATEWAY_REVIEW_MISMATCH")
    if not path.exists() or args.rebuild:
        path.write_bytes(body)
    counts = dict(sorted(Counter(r["status"] for r in result).items()))
    summary = {"task": "TASK-084-B", "stage": "V2_CANONICAL_POI_RAIL_GATEWAY_DISCOVERY_ONLY", "nationalMasterStatus": "REWORK_IN_PROGRESS", "canonicalScope": manifest["scope"], "canonicalRecordCount": len(pois), "runtimeManifestDatasetFileSha256": manifest["datasetFileSha256"], "candidateCorpusAuthorized": False, "sourceS12ArchiveSha256": ARCHIVE_SHA, "sourceStationCount": len(source_stations), "statusCounts": counts, "accessEdgesGenerated": 0, "artifactSha256": sha(body)}
    summary_body = enc(summary)
    manifest_path = root / "manifest.json"
    if manifest_path.exists() and not args.rebuild and sha(manifest_path.read_bytes()) != sha(summary_body):
        raise RuntimeError("POI_GATEWAY_MANIFEST_MISMATCH")
    if not manifest_path.exists() or args.rebuild:
        manifest_path.write_bytes(summary_body)
    print(json.dumps({"canonicalPois": len(pois), "statuses": counts, "accessEdgesGenerated": 0}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", required=True)
    parser.add_argument("--authorization", default="src/shared/data/canonical-poi-pilot100.runtime-manifest.v1.json")
    parser.add_argument("--rail", default="data/transport/nodes/task-084-b-v2-rail-candidates/rail-components.jsonl")
    parser.add_argument("--output", default="data/transport/nodes/task-084-b-v2-poi-gateway-review")
    parser.add_argument("--rebuild", action="store_true")
    run(parser.parse_args())
