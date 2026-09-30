#!/usr/bin/env python3
"""Build a reviewable nationwide S12 rail inventory for TASK-084-B v2.

S12 station/group codes are external observations, never TransportNode IDs.
This inventory is not an accepted national master.
"""

import argparse
import hashlib
import json
import math
import uuid
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

SOURCE = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-S12-2024.html"
ARCHIVE_URL = "https://nlftp.mlit.go.jp/ksj/gml/data/S12/S12-25/S12-25_GML.zip"
ARCHIVE_SHA = "0785e932a32b3ec15e1a1345537ae145eafe1c07bf38d5c16c11ee2b391e7a28"
ENTRY = "S12-25_GML/UTF-8/S12-25_NumberOfPassengers.geojson"
NAMESPACE = uuid.UUID("72c1d06d-8ba0-4f7f-93b3-5366961242e0")
BATCH_SIZE = 200
RAIL_KINDS = {"rail_station", "shinkansen_station", "metro_station", "private_rail_station"}
AIRPORT_STATIONS = {"成田空港", "空港第２ビル", "羽田空港第１・第２ターミナル", "羽田空港第１ターミナル", "羽田空港第２ターミナル", "羽田空港第３ターミナル", "関西空港", "新千歳空港", "福岡空港", "中部国際空港", "仙台空港", "神戸空港", "草江"}


def airport_access_name(name):
    return name in AIRPORT_STATIONS or ("空港" in name and name not in {"空港通り"})


def enc(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha(body):
    return hashlib.sha256(body).hexdigest()


def file_sha(path):
    return sha(path.read_bytes())


def rows(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def output(path, body, rebuild):
    if path.exists() and not rebuild:
        if file_sha(path) != sha(body):
            raise RuntimeError(f"CORRUPTED_V2_ARTIFACT: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)


def metric_tier(count):
    if count >= 200000:
        return "T0"
    if count >= 50000:
        return "T1"
    if count >= 10000:
        return "T2"
    return "T3"


def mode(row):
    line, op, code = row["line"], row["operator"], row["railClassCode"]
    if "新幹線" in line:
        return "shinkansen"
    if code == 13:
        return "funicular"
    # S12 legal/technical class 16 includes Sapporo's rubber-tired subway.
    # The public transport mode takes precedence over propulsion/guideway class.
    if op in {"札幌市", "神戸市"}:
        return "metro"
    # Osaka subway lines can be legally classified as ordinary tramway (21).
    # Keep New Tram (16/24) separate; legal class 21 is not sufficient alone.
    if op == "大阪市高速電気軌道" and code in {12, 21}:
        return "metro"
    # Kintetsu Keihanna / former Higashi-Osaka is rapid rail despite legal class 21.
    if op == "近畿日本鉄道" and line in {"けいはんな線", "東大阪線"}:
        return "private_rail"
    if code == 21:
        return "tram"
    if code in {14, 15, 16, 22, 23, 24, 25}:
        return "fixed_guideway"
    if "地下鉄" in op or op in {"東京地下鉄", "大阪市高速電気軌道", "名古屋市交通局", "福岡市交通局", "札幌市交通局", "仙台市交通局", "京都市交通局", "神戸市交通局", "横浜市交通局", "仙台市", "名古屋市", "京都市", "横浜市", "福岡市", "大阪市", "札幌市", "神戸市", "東京都"} and ("号線" in line or "地下鉄" in line or "南北線" in line or "東西線" in line or "烏丸線" in line):
        return "metro"
    return "conventional_rail" if "旅客鉄道" in op else "private_rail"


def kind(family):
    return {"shinkansen": "shinkansen_station", "metro": "metro_station", "conventional_rail": "rail_station", "private_rail": "private_rail_station", "funicular": "funicular_station", "fixed_guideway": "other_tourism_transport", "tram": "other_tourism_transport"}[family]


def source_row(feature):
    p = feature["properties"]
    geom = feature["geometry"]
    points = geom["coordinates"] if geom["type"] == "LineString" else [point for line in geom["coordinates"] for point in line]
    if not points:
        raise RuntimeError("EMPTY_S12_GEOMETRY")
    return {"stationName": p["S12_001"], "stationCode": str(p["S12_001c"]), "groupCode": str(p["S12_001g"]), "operator": p["S12_002"], "line": p["S12_003"], "railClassCode": p["S12_004"], "duplicateCode": p["S12_058"], "availabilityCode": p["S12_059"], "passengersPerDay": p["S12_061"], "latitude": round(sum(float(x[1]) for x in points)/len(points), 7), "longitude": round(sum(float(x[0]) for x in points)/len(points), 7)}


def distance_km(a, b):
    la1, lo1, la2, lo2 = map(math.radians, [a["latitude"], a["longitude"], b["latitude"], b["longitude"]])
    h = math.sin((la2-la1)/2)**2 + math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2
    return 12742*math.asin(min(1, math.sqrt(h)))


def build(archive, old_master, required_components=None):
    required_components = required_components or {}
    if file_sha(archive) != ARCHIVE_SHA:
        raise RuntimeError("S12_ARCHIVE_SHA256_MISMATCH")
    with zipfile.ZipFile(archive) as z:
        raw = z.read(ENTRY)
    features = json.loads(raw)["features"]
    observations = {}
    for feature in features:
        r = source_row(feature)
        key = tuple(r[k] for k in ("stationCode", "groupCode", "operator", "line", "duplicateCode", "availabilityCode", "passengersPerDay"))
        observations.setdefault(key, r)
    observations = sorted(observations.values(), key=lambda r: (r["groupCode"], r["operator"], r["stationCode"], r["line"], r["duplicateCode"]))
    groups = defaultdict(list)
    for r in observations:
        groups[(r["stationName"], r["operator"], r["groupCode"], mode(r))].append(r)
    old = [r for r in rows(old_master) if r["nodeKind"] in RAIL_KINDS]
    used_old = set()
    components, lineage = [], []
    for group_key, related in sorted(groups.items()):
        primary = [r for r in related if r["duplicateCode"] == 1 and r["availabilityCode"] == 1]
        required = required_components.get((group_key[0], group_key[1], group_key[3]))
        selected = [r for r in primary if r["passengersPerDay"] >= 10000 or group_key[3] == "shinkansen" or airport_access_name(r["stationName"]) or required]
        if not selected and (group_key[3] == "shinkansen" or required):
            selected = [min(related, key=lambda r: r["stationCode"])]
        for focus in selected:
            # Multiple primary figures at one station can indicate distinct platforms or fare gates.
            # Keep them separate for physical/operational review instead of summing counts.
            lines = sorted({r["line"] for r in related if len(primary) <= 1 or r["line"] == focus["line"]})
            candidates = [r for r in old if r["transportNodeId"] not in used_old and r["canonicalNameJa"] == focus["stationName"] and r.get("operatorRefs") == [focus["operator"]] and r["nodeKind"] == kind(group_key[3]) and distance_km(r, focus) <= 1.2]
            candidates.sort(key=lambda r: (r.get("lineRefs", [None])[0] != focus["line"], distance_km(r, focus), r["transportNodeId"]))
            lines = sorted(set(lines) | {line for prior in candidates for line in prior.get("lineRefs", [])})
            reuse = candidates[0] if len(candidates) == 1 and len(lines) == 1 else None
            identity_key = f"station-component|{focus['stationName']}|{focus['operator']}|{group_key[3]}|{focus['latitude']:.4f}|{focus['longitude']:.4f}|{focus['line'] if len(primary)>1 else ''}"
            node_id = reuse["transportNodeId"] if reuse else "transport-node:" + str(uuid.uuid5(NAMESPACE, identity_key))
            for prior in candidates:
                used_old.add(prior["transportNodeId"])
                lineage.append({"oldTransportNodeId": prior["transportNodeId"], "newTransportNodeId": node_id, "decision": "REUSED_SAME_COMPONENT" if reuse else "SUPERSEDED_BY", "reason": "Single-line component confirmed by S12" if reuse else "V1 line feature superseded by operator/station/mode component", "oldLineRefs": prior.get("lineRefs", []), "oldExternalRefs": prior.get("externalRefs", [])})
            available = focus["duplicateCode"] == 1 and focus["availabilityCode"] == 1
            usage = focus["passengersPerDay"] if available else None
            refs = sorted({(r["stationCode"], r["groupCode"], r["line"]) for r in related})
            reasons = []
            if usage is not None and usage >= 10000:
                reasons.append("S12_061_GE_10000")
            if group_key[3] == "shinkansen":
                reasons.append("SHINKANSEN")
            if airport_access_name(focus["stationName"]):
                reasons.append("AIRPORT_ACCESS_AUDIT")
            if required:
                reasons.append("OFFICIAL_HUB_COMPONENT_REVIEW")
            decision_reason = "Official S12 usage unavailable; manual tier review required"
            if usage is not None:
                decision_reason = "S12_061 usage threshold"
                if usage < 10000:
                    decision_reason += "; low-flow inclusion justified by " + ("official Hub component review" if required else "airport access" if airport_access_name(focus["stationName"]) else "Shinkansen inventory")
            components.append({"proposedTransportNodeId": node_id, "identityKey": identity_key, "canonicalNameJa": focus["stationName"], "operatorRefs": [focus["operator"]], "lineRefs": lines, "nodeKind": kind(group_key[3]), "modeFamily": group_key[3], "latitude": focus["latitude"], "longitude": focus["longitude"], "sourcePrimaryStationCode": focus["stationCode"], "sourcePrimaryLine": focus["line"], "sourceStationRefs": [{"stationCode": c, "groupCode": g, "line": line} for c,g,line in refs], "dataAvailabilityCode": focus["availabilityCode"], "duplicateCode": focus["duplicateCode"], "usageMetricType": "DAILY_ENTRIES_EXITS" if available else "USAGE_DATA_UNAVAILABLE", "usageValue": usage, "usageUnit": "persons/day" if available else None, "usagePeriod": "FY2024", "usageSource": SOURCE, "sourceObservedAt": "FY2024", "sourceArchiveSha256": ARCHIVE_SHA, "levelDecisionVersion": "TASK-084-B-V2-S12-FY2024-1", "proposedNodeLevel": metric_tier(usage) if usage is not None else None, "functionalRole": "AIRPORT_ACCESS" if airport_access_name(focus["stationName"]) else "STATION", "promotionReason": None, "decisionReason": decision_reason, "confidence": 0.9 if usage is not None else 0.6, "reviewStatus": "MULTIPLE_PRIMARY_RECORDS_REVIEW_REQUIRED" if len(primary)>1 else "COMPONENT_REVIEW_REQUIRED", "inclusionReasons": reasons, "sourceLicense": "CC BY 4.0", "sourceRefs": [SOURCE]})
    for prior in old:
        if prior["transportNodeId"] not in used_old:
            lineage.append({"oldTransportNodeId": prior["transportNodeId"], "newTransportNodeId": None, "decision": "REVIEW_REQUIRED", "reason": "No safe S12 station/operator/mode crosswalk; no silent rebind or rejection"})
    for component in components:
        required = required_components.get((component['canonicalNameJa'],component['operatorRefs'][0],component['modeFamily']))
        component['manualLevelReview'] = component['usageValue'] is None
        if required:
            component['componentInclusionEvidence'] = required
            component['sourceRefs'] = sorted(set(component['sourceRefs']+[required['officialSource']]))
    components.sort(key=lambda r: (r["canonicalNameJa"], r["operatorRefs"][0], r["modeFamily"], r["identityKey"]))
    ids = [r["proposedTransportNodeId"] for r in components]
    if len(ids) != len(set(ids)):
        raise RuntimeError("DUPLICATE_PROPOSED_TRANSPORT_NODE_ID")
    high = {r["stationCode"] for r in observations if r["duplicateCode"] == 1 and r["availabilityCode"] == 1 and r["passengersPerDay"] >= 200000}
    covered = {ref["stationCode"] for component in components for ref in component["sourceStationRefs"]}
    missing_high = sorted(high - covered)
    if missing_high:
        raise RuntimeError(f"S12_GE_200K_MISSING: {missing_high}")
    valid = [r for r in observations if r["duplicateCode"] == 1 and r["availabilityCode"] == 1]
    index = defaultdict(list)
    for component in components:
        index[(component["canonicalNameJa"], component["operatorRefs"][0], component["sourcePrimaryStationCode"], component["sourcePrimaryLine"])].append(component["proposedTransportNodeId"])
    high_flow = []
    for r in valid:
        if r["passengersPerDay"] < 50000:
            continue
        ids = index[(r["stationName"], r["operator"], r["stationCode"], r["line"])]
        if len(ids) != 1:
            raise RuntimeError(f"S12_GE_50K_CROSSWALK_NOT_UNIQUE: {r['stationCode']}: {ids}")
        high_flow.append({"stationName":r["stationName"],"operator":r["operator"],"line":r["line"],"stationCode":r["stationCode"],"groupCode":r["groupCode"],"passengersPerDay":r["passengersPerDay"],"candidateTransportNodeId":ids[0],"status":"CANDIDATE_PRESENT_NOT_YET_ACCEPTED"})
    high_flow.sort(key=lambda r:(-r["passengersPerDay"],r["stationCode"],r["line"]))
    stats = {"archiveSha256": ARCHIVE_SHA, "archiveUrl": ARCHIVE_URL, "entrySha256": sha(raw), "sourceVersion": "S12-25 / FY2024", "sourceFeatureCount": len(features), "deduplicatedObservationCount": len(observations), "validFY2024Count": len(valid), "sourceGE10000Count": sum(r["passengersPerDay"] >= 10000 for r in valid), "sourceGE50000Count": len(high_flow), "sourceGE200000Count": len(high), "sourceGE200000MissingCount": len(missing_high), "sourceUrl": SOURCE, "sourceLicense": "CC BY 4.0"}
    return components, lineage, high_flow, stats


def run(args):
    required_rows = rows(Path(args.component_review)) if args.component_review else []
    required = {(r['stationName'],r['operator'],r['modeFamily']):r for r in required_rows}
    if len(required)!=len(required_rows): raise RuntimeError('DUPLICATE_REQUIRED_COMPONENT')
    components, lineage, high_flow, stats = build(Path(args.archive), Path(args.v1), required)
    stats['requiredComponentEvidenceSha256'] = file_sha(Path(args.component_review)) if args.component_review else None
    root = Path(args.output)
    artifacts = {"rail-components.jsonl": b"".join(map(enc, components)), "v1-rail-lineage.jsonl": b"".join(map(enc, sorted(lineage, key=lambda r: r["oldTransportNodeId"]))), "s12-high-flow-gate.jsonl": b"".join(map(enc, high_flow))}
    batches = []
    for start in range(0, len(components), BATCH_SIZE):
        number = start//BATCH_SIZE + 1
        batch_id = f"batch-{number:04d}"
        body = b"".join(map(enc, components[start:start+BATCH_SIZE]))
        receipt = enc({"batchId": batch_id, "nodeCount": len(components[start:start+BATCH_SIZE]), "outputSha256": sha(body), "sourceArchiveSha256": ARCHIVE_SHA})
        if args.batch is not None and args.batch != number and not (root / "batches" / f"{batch_id}.jsonl").exists():
            raise RuntimeError(f"MISSING_PRIOR_BATCH: {batch_id}")
        rerun = args.rebuild and (args.batch is None or args.batch == number)
        output(root / "batches" / f"{batch_id}.jsonl", body, rerun)
        output(root / "batch-receipts" / f"{batch_id}.json", receipt, rerun)
        batches.append({"batchId": batch_id, "nodeCount": len(components[start:start+BATCH_SIZE]), "receiptSha256": sha(receipt)})
    if args.batch is not None and not 1 <= args.batch <= len(batches):
        raise RuntimeError("INVALID_BATCH_NUMBER")
    for name, body in artifacts.items():
        output(root / name, body, args.rebuild and args.batch is None)
    tiers = Counter(c["proposedNodeLevel"] or "REVIEW_REQUIRED" for c in components)
    by_mode = {family: dict(sorted(Counter(c["proposedNodeLevel"] or "REVIEW_REQUIRED" for c in components if c["modeFamily"] == family).items())) for family in sorted({c["modeFamily"] for c in components})}
    manifest = {"task": "TASK-084-B", "stage": "V2_S12_RAIL_CANDIDATE_REBUILD", "nationalMasterStatus": "REWORK_IN_PROGRESS", "acceptanceStatus": "REVIEW_REQUIRED", "candidateComponentCount": len(components), "proposedTierCounts": dict(sorted(tiers.items())), "modeTierCounts": by_mode, "v1RailLineageCount": len(lineage), "lineageCounts": dict(sorted(Counter(r["decision"] for r in lineage).items())), "source": stats, "batchSize": BATCH_SIZE, "batches": batches, "artifactSha256": {name: sha(body) for name,body in artifacts.items()}}
    output(root / "manifest.json", enc(manifest), args.rebuild and args.batch is None)
    print(json.dumps({"candidateComponents": len(components), "proposedTiers": manifest["proposedTierCounts"], "lineage": manifest["lineageCounts"], "batches": len(batches), "s12GE200kMissing": stats["sourceGE200000MissingCount"]}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--archive", required=True)
    parser.add_argument("--v1", default="data/transport/nodes/task-084-b-national-master/transport-nodes.jsonl")
    parser.add_argument("--output", default="data/transport/nodes/task-084-b-v2-rail-candidates")
    parser.add_argument("--rebuild", action="store_true")
    parser.add_argument("--batch", type=int)
    parser.add_argument("--component-review", default="data/transport/nodes/task-084-b-v2-official-evidence/required-hub-components-expanded.jsonl")
    run(parser.parse_args())
