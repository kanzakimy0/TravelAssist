#!/usr/bin/env python3
"""Review selected national rail gateways against N02 and official station guides."""
import argparse
import hashlib
import json
import math
import sys
import uuid
import zipfile
from collections import defaultdict
from pathlib import Path

SOURCE_URL = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html"
SOURCE_SHA = "aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f"
ENTRY = "N02-25_GML/UTF-8/N02-25_Station.geojson"
ENTRY_SHA = "908e2c3036e9c80760ae3514be3682c77f81f0bd60ab5fb1b3da1aa9352bbd94"
NAMESPACE = uuid.UUID("ed7ae3bf-b4e1-4a2c-abd6-acf1ea74d15d")
BATCH_SIZE = 200

# Each row is an explicit station-area review, not a query for every N02 station.
# Osaka JR and Umeda Metro are deliberately different hubs despite proximity.
HUBS = {
    "札幌": {"center": [141.34999, 43.06837], "level": "T0", "reason": "Hokkaido-wide intercity rail and tourism gateway.", "guides": {
        "北海道旅客鉄道": "https://www.jrhokkaido.co.jp/construction/"}},
    "仙台": {"center": [140.88216, 38.26097], "level": "T0", "reason": "Tohoku Shinkansen, conventional JR and two municipal metro lines connect the region.", "guides": {
        "東日本旅客鉄道": "https://www.jreast.co.jp/estation/stations/913.html",
        "仙台市": "https://www.kotsu.city.sendai.jp/subway/station/list/sendai-ew/"}},
    "上野": {"center": [139.77738, 35.71332], "level": "T1", "reason": "Shinkansen to JR and Tokyo Metro transfer serving northern Tokyo tourism.", "guides": {
        "東日本旅客鉄道": "https://www.jreast.co.jp/estation/stations/204.html",
        "東京地下鉄": "https://www.tokyometro.jp/station/ueno/index.html"}},
    "新宿": {"center": [139.70014, 35.69047], "level": "T0", "reason": "National-scale JR, metro and western Kanto private-rail transfer gateway.", "guides": {
        "東日本旅客鉄道": "https://www.jreast.co.jp/estation/stations/866.html",
        "東京地下鉄": "https://www.tokyometro.jp/station/shinjuku/index.html",
        "京王電鉄": "https://www.keio.co.jp/global/routes/stations/shinjuku/",
        "小田急電鉄": "https://www.odakyu.jp/station/shinjuku/"}},
    "渋谷": {"center": [139.70172, 35.65808], "level": "T1", "reason": "Major JR, metro and Tokyu interchange and western Tokyo tourism gateway.", "guides": {
        "東日本旅客鉄道": "https://www.jreast.co.jp/estation/stations/808.html",
        "東京地下鉄": "https://www.tokyometro.jp/station/shibuya/index.html",
        "東急電鉄": "https://www.tokyu.co.jp/area/shibuya/station/"}},
    "池袋": {"center": [139.71108, 35.73028], "level": "T1", "reason": "Major JR, three-line metro and Seibu transfer toward western Saitama.", "guides": {
        "東日本旅客鉄道": "https://www.jreast.co.jp/estation/stations/108.html",
        "東京地下鉄": "https://www.tokyometro.jp/station/ikebukuro/index.html",
        "西武鉄道": "https://www.seiburailway.jp/railway/station/ikebukuro/"}},
    "横浜": {"center": [139.62225, 35.46541], "level": "T0", "reason": "Major intercity and municipal rail gateway for Yokohama and Kanagawa tourism.", "guides": {
        "東日本旅客鉄道": "https://www.jreast.co.jp/estation/stations/1638.html",
        "横浜市": "https://navi.hamabus.city.yokohama.lg.jp/koutuu/pc/detail/Station?id=00000838"}},
    "名古屋": {"center": [136.88166, 35.17140], "level": "T0", "reason": "Tokaido Shinkansen, Chubu conventional rail and two-line metro interchange.", "guides": {
        "東海旅客鉄道": "https://railway.jr-central.co.jp/station-guide/shinkansen/nagoya/map.html",
        "名古屋市": "https://www.kotsu.city.nagoya.jp/rp/READER/trp0004207.htm"}},
    "金沢": {"center": [136.64804, 36.57792], "level": "T1", "reason": "Hokuriku Shinkansen to regional IR railway tourism transfer.", "guides": {
        "西日本旅客鉄道": "https://www.jr-odekake.net/eki/top?id=0541449",
        "IRいしかわ鉄道": "https://www.ishikawa-railway.jp/station/kanazawa/"}},
    "大阪": {"center": [135.49500, 34.70249], "level": "T0", "reason": "Kansai intercity JR hub; reviewed separately from Umeda Metro.", "guides": {
        "西日本旅客鉄道": "https://eki.jr-odekake.net/premises?id=0610130"}},
    "梅田": {"center": [135.49768, 34.70313], "level": "T1", "reason": "Osaka Metro Umeda terminal within a wider interchange area, separate from JR Osaka identity.", "guides": {
        "大阪市高速電気軌道": "https://subway.osakametro.co.jp/station_guide/m/m16/index.php"}},
    "三ノ宮": {"center": [135.19504, 34.69479], "level": "T1", "reason": "Central Kobe JR tourism and regional transfer gateway.", "guides": {
        "西日本旅客鉄道": "https://eki.jr-odekake.net/premises?id=0610143"}},
    "奈良": {"center": [135.81885, 34.68050], "level": "T1", "reason": "JR regional gateway for Nara cultural tourism.", "guides": {
        "西日本旅客鉄道": "https://eki.jr-odekake.net/premises?id=0620816"}},
    "広島": {"center": [132.47594, 34.39729], "level": "T0", "reason": "Sanyo Shinkansen to regional JR and Setouchi tourism gateway.", "guides": {
        "西日本旅客鉄道": "https://eki.jr-odekake.net/premises?id=0800613"}},
    "熊本": {"center": [130.68866, 32.78931], "level": "T1", "reason": "Kyushu Shinkansen and regional rail gateway for Kumamoto tourism.", "guides": {
        "九州旅客鉄道": "https://www.jrkyushu.co.jp/railway/station/1191555_1601.html"}},
    "鹿児島中央": {"center": [130.54206, 31.58428], "level": "T1", "reason": "Southern Kyushu Shinkansen and regional rail gateway.", "guides": {
        "九州旅客鉄道": "https://www.jrkyushu.co.jp/railway/station/1191491_1601.html"}},
}

METRO_OPERATORS = {"仙台市", "東京地下鉄", "横浜市", "名古屋市", "大阪市高速電気軌道"}
PRIVATE_OPERATORS = {"京王電鉄", "小田急電鉄", "東急電鉄", "西武鉄道", "IRいしかわ鉄道"}


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    return digest(path.read_bytes())


def rows(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def distance_m(a, b):
    lat1, lat2 = math.radians(a[1]), math.radians(b[1])
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(math.radians(b[0] - a[0]) / 2) ** 2
    return 6371000 * 2 * math.asin(min(1, math.sqrt(h)))


def point(feature):
    geometry = feature["geometry"]
    if geometry["type"] != "LineString" or len(geometry["coordinates"]) < 2:
        raise RuntimeError("INVALID_STATION_GEOMETRY")
    return [round(sum(float(p[i]) for p in geometry["coordinates"]) / len(geometry["coordinates"]), 7) for i in range(2)]


def node_signature(item):
    return digest(canonical([item["name"], item["operator"], item["line"]]))


def hub_signature(name):
    return digest(canonical(["reviewed rail hub", name]))


def observations(source_zip, original_shinkansen):
    if file_hash(source_zip) != SOURCE_SHA:
        raise RuntimeError("N02_ARCHIVE_HASH_MISMATCH")
    with zipfile.ZipFile(source_zip) as archive:
        raw = archive.read(ENTRY)
    if digest(raw) != ENTRY_SHA:
        raise RuntimeError("N02_ENTRY_HASH_MISMATCH")
    grouped = defaultdict(list)
    excluded = []
    for feature in json.loads(raw)["features"]:
        props = feature["properties"]
        name, operator, line = props["N02_005"], props["N02_004"], props["N02_003"]
        if name not in HUBS or operator not in HUBS[name]["guides"] or "新幹線" in line:
            continue
        p = point(feature)
        distance = distance_m(p, HUBS[name]["center"])
        if distance > 800:
            excluded.append({"name": name, "operator": operator, "line": line, "reason": "SAME_NAME_OUTSIDE_REVIEWED_STATION_AREA", "distanceM": round(distance)})
            continue
        grouped[(name, operator, line, str(props["N02_005c"]))].append((p, str(props["N02_005g"])))
    candidates = []
    for (name, operator, line, code), parts in sorted(grouped.items()):
        if len({group for _, group in parts}) != 1:
            raise RuntimeError("N02_GROUP_CODE_CONFLICT")
        points = [p for p, _ in parts]
        center = [round(sum(p[i] for p in points) / len(points), 7) for i in range(2)]
        if max(distance_m(center, p) for p in points) > 300:
            raise RuntimeError(f"STATION_GEOMETRY_CONFLICT: {name}/{operator}/{line}")
        candidates.append({
            "name": name, "operator": operator, "line": line,
            "sourceStationCode": code, "sourceGroupCode": parts[0][1], "sourceGeometryPieces": len(parts),
            "longitude": center[0], "latitude": center[1], "coordinateRole": "STATION_GEOMETRY_REPRESENTATIVE",
            "officialStationGuide": HUBS[name]["guides"][operator],
            "distanceFromReviewedHubCenterM": round(distance_m(center, HUBS[name]["center"])),
            "selectionReason": HUBS[name]["reason"],
        })
    if len(candidates) != 47:
        raise RuntimeError(f"REVIEWED_RAIL_COMPONENT_COUNT_CHANGED: {len(candidates)}")
    old_by_name = defaultdict(list)
    for node in rows(original_shinkansen):
        if node["canonicalNameJa"] in HUBS:
            old_by_name[node["canonicalNameJa"]].append(node)
    old_links = []
    for name, nodes in sorted(old_by_name.items()):
        for node in nodes:
            if distance_m([node["longitude"], node["latitude"]], HUBS[name]["center"]) > 800:
                raise RuntimeError(f"OLD_SHINKANSEN_OUTSIDE_HUB: {name}")
            if node["operatorRefs"][0] not in HUBS[name]["guides"]:
                raise RuntimeError(f"OLD_SHINKANSEN_GUIDE_MISSING: {name}")
            old_links.append({"name": name, "transportNodeId": node["transportNodeId"], "officialStationGuide": HUBS[name]["guides"][node["operatorRefs"][0]]})
    if len(old_links) != 7:
        raise RuntimeError(f"OLD_SHINKANSEN_LINK_COUNT_CHANGED: {len(old_links)}")
    return candidates, old_links, excluded


def allocate(candidates, accepted_at):
    nodes, hubs = [], []
    for name in sorted(HUBS):
        anchor = "ta:national-rail-hub:" + str(uuid.uuid4())
        config = HUBS[name]
        hubs.append({
            "hubId": "transport-hub:" + str(uuid.uuid5(NAMESPACE, anchor)),
            "identityAnchor": anchor, "identitySignature": hub_signature(name), "identityStatus": "HUB_ACCEPTED",
            "canonicalNameJa": name, "reviewedAt": accepted_at, "nodeLevel": config["level"],
            "reviewReason": config["reason"], "officialStationGuides": sorted(config["guides"].values()),
            "coordinateRole": "N02_STATION_AREA_REVIEW_CENTER", "longitude": config["center"][0], "latitude": config["center"][1],
            "decisionEvidence": {"sameNameAloneUsed": False, "spatialLimitM": 800, "separateAreaIdentity": "梅田" if name == "大阪" else ("大阪" if name == "梅田" else None)},
            "sourceRefs": [SOURCE_URL, *sorted(config["guides"].values())],
        })
    for item in candidates:
        anchor = "ta:station-component:" + str(uuid.uuid4())
        nodes.append({
            "transportNodeId": "transport-node:" + str(uuid.uuid5(NAMESPACE, anchor)),
            "identityAnchor": anchor, "identitySignature": node_signature(item), "identityStatus": "NODE_ACCEPTED",
            "canonicalNameJa": item["name"], "aliases": [], "operatorRefs": [item["operator"]], "lineRefs": [item["line"]],
            "nodeKind": "metro_station" if item["operator"] in METRO_OPERATORS else ("private_rail_station" if item["operator"] in PRIVATE_OPERATORS else "rail_station"),
            "externalRefs": [{"source": "MLIT N02 2025", "field": "N02_005c", "id": item["sourceStationCode"]}, {"source": "MLIT N02 2025", "field": "N02_005g", "id": item["sourceGroupCode"]}],
            "acceptedAt": accepted_at, "sourceRefs": [SOURCE_URL, item["officialStationGuide"]],
            "decisionEvidence": {"selectionReason": item["selectionReason"], "officialStationGuide": item["officialStationGuide"], "distanceFromReviewedHubCenterM": item["distanceFromReviewedHubCenterM"], "sameNameOrSourceGroupCodeAloneUsed": False},
        })
    return sorted(nodes, key=lambda item: item["transportNodeId"]), sorted(hubs, key=lambda item: item["hubId"])


def validate_ledgers(nodes, hubs):
    if len(nodes) != 47 or len(hubs) != 16:
        raise RuntimeError("NATIONAL_RAIL_LEDGER_COUNT_CHANGED")
    if len({x["transportNodeId"] for x in nodes}) != 47 or len({x["identitySignature"] for x in nodes}) != 47:
        raise RuntimeError("DUPLICATE_NATIONAL_RAIL_IDENTITY")
    if len({x["hubId"] for x in hubs}) != 16 or {x["canonicalNameJa"] for x in hubs} != set(HUBS):
        raise RuntimeError("DUPLICATE_OR_MISSING_NATIONAL_HUB")
    for item in nodes:
        if item["transportNodeId"] != "transport-node:" + str(uuid.uuid5(NAMESPACE, item["identityAnchor"])) or item["identityStatus"] != "NODE_ACCEPTED":
            raise RuntimeError("NATIONAL_RAIL_NODE_ID_REBIND")
    for hub in hubs:
        if hub["hubId"] != "transport-hub:" + str(uuid.uuid5(NAMESPACE, hub["identityAnchor"])) or hub["identitySignature"] != hub_signature(hub["canonicalNameJa"]) or hub["identityStatus"] != "HUB_ACCEPTED":
            raise RuntimeError("NATIONAL_RAIL_HUB_ID_REBIND")


def write_or_verify(path, body, rebuild):
    if path.exists() and not rebuild:
        if file_hash(path) != digest(body):
            raise RuntimeError(f"CORRUPTED_NATIONAL_RAIL_ARTIFACT: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)


def process(args):
    candidates, old_links, excluded = observations(Path(args.zip), Path(args.shinkansen_nodes))
    node_ledger_path, hub_ledger_path = Path(args.node_ledger), Path(args.hub_ledger)
    if args.allocate:
        if node_ledger_path.exists() or hub_ledger_path.exists() or not args.accepted_at:
            raise RuntimeError("NATIONAL_RAIL_LEDGERS_ALREADY_EXIST_OR_TIME_MISSING")
        nodes, hubs = allocate(candidates, args.accepted_at)
        node_ledger_path.parent.mkdir(parents=True, exist_ok=True)
        hub_ledger_path.parent.mkdir(parents=True, exist_ok=True)
        node_ledger_path.write_bytes(b"".join(canonical(x) for x in nodes))
        hub_ledger_path.write_bytes(b"".join(canonical(x) for x in hubs))
    nodes, hubs = rows(node_ledger_path), rows(hub_ledger_path)
    validate_ledgers(nodes, hubs)
    by_signature = {x["identitySignature"]: x for x in nodes}
    hub_by_name = {x["canonicalNameJa"]: x for x in hubs}
    accepted, links = [], []
    for item in candidates:
        identity = by_signature.get(node_signature(item))
        if not identity or identity["canonicalNameJa"] != item["name"] or identity["operatorRefs"] != [item["operator"]] or identity["lineRefs"] != [item["line"]]:
            raise RuntimeError("NATIONAL_RAIL_IDENTITY_REVIEW_REQUIRED")
        hub = hub_by_name[item["name"]]
        accepted.append({
            "transportNodeId": identity["transportNodeId"], "identityStatus": "NODE_ACCEPTED",
            "canonicalNameJa": item["name"], "aliases": [], "nodeKind": identity["nodeKind"], "nodeLevel": "T2",
            "hierarchyEvidence": "Reviewed component required for a T0/T1 regional or national transfer hub.",
            "longitude": item["longitude"], "latitude": item["latitude"], "coordinateRole": item["coordinateRole"],
            "prefectureCode": None, "municipalityCode": None, "parentHubId": hub["hubId"], "hubResolutionStatus": "ACCEPTED",
            "operatorRefs": identity["operatorRefs"], "lineRefs": identity["lineRefs"], "serviceRefs": [], "externalRefs": identity["externalRefs"],
            "sourceRefs": identity["sourceRefs"], "confidence": 0.9, "unresolvedReasons": ["MUNICIPALITY_UNRESOLVED"],
        })
        links.append({"hubId": hub["hubId"], "transportNodeId": identity["transportNodeId"], "componentOrigin": "NEW_N02_COMPONENT", "officialStationGuide": item["officialStationGuide"], "distanceFromReviewedHubCenterM": item["distanceFromReviewedHubCenterM"], "sameNameAloneUsed": False})
    for item in old_links:
        hub = hub_by_name[item["name"]]
        links.append({"hubId": hub["hubId"], "transportNodeId": item["transportNodeId"], "componentOrigin": "IMMUTABLE_SHINKANSEN_ID", "officialStationGuide": item["officialStationGuide"], "distanceFromReviewedHubCenterM": None, "sameNameAloneUsed": False})
    if {x["identitySignature"] for x in nodes} != {node_signature(x) for x in candidates}:
        raise RuntimeError("NATIONAL_RAIL_SOURCE_SIGNATURE_DRIFT_REVIEW_REQUIRED")
    accepted.sort(key=lambda x: x["transportNodeId"])
    links.sort(key=lambda x: (x["hubId"], x["transportNodeId"]))
    output = Path(args.output)
    payloads = {
        "candidates.jsonl": b"".join(canonical(x) for x in candidates),
        "transport-nodes.jsonl": b"".join(canonical(x) for x in accepted),
        "transport-hubs.jsonl": b"".join(canonical(x) for x in hubs),
        "hub-component-decisions.jsonl": b"".join(canonical(x) for x in links),
        "excluded-same-name.jsonl": b"".join(canonical(x) for x in excluded),
    }
    batches = [accepted[i:i + BATCH_SIZE] for i in range(0, len(accepted), BATCH_SIZE)]
    if args.batch is not None and not (1 <= args.batch <= len(batches)):
        raise RuntimeError("BATCH_OUT_OF_RANGE")
    manifest_batches = []
    for number, batch in enumerate(batches, 1):
        batch_id = f"batch-{number:04}"
        body = b"".join(canonical(x) for x in batch)
        receipt = canonical({"batchId": batch_id, "nodeCount": len(batch), "nodeSha256": digest(body), "nodeLedgerSha256": file_hash(node_ledger_path), "hubLedgerSha256": file_hash(hub_ledger_path)})
        write_or_verify(output / "batches" / f"{batch_id}.jsonl", body, args.rebuild and args.batch in (None, number))
        write_or_verify(output / "batch-receipts" / f"{batch_id}.json", receipt, args.rebuild and args.batch in (None, number))
        manifest_batches.append({"batchId": batch_id, "receiptSha256": digest(receipt)})
    for name, body in payloads.items():
        write_or_verify(output / name, body, args.rebuild)
    manifest = canonical({
        "task": "TASK-084-B", "stage": "NATIONAL_SELECTED_RAIL_HUBS", "nationalMasterStatus": "PARTIAL",
        "candidateCount": len(candidates), "acceptedCount": len(accepted), "hubAcceptedCount": len(hubs),
        "oldShinkansenHubLinks": len(old_links), "batchSize": BATCH_SIZE, "batches": manifest_batches,
        "sourceLicenseDecision": "PASS_CC_BY_4_0", "sourceArchiveSha256": SOURCE_SHA, "sourceEntrySha256": ENTRY_SHA,
        "nodeLedgerSha256": file_hash(node_ledger_path), "hubLedgerSha256": file_hash(hub_ledger_path),
        "artifactSha256": {name: digest(body) for name, body in payloads.items()},
    })
    write_or_verify(output / "manifest.json", manifest, args.rebuild)
    print(json.dumps({"acceptedCount": len(accepted), "hubCount": len(hubs), "oldShinkansenLinks": len(old_links), "batchCount": len(batches)}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", required=True)
    parser.add_argument("--shinkansen-nodes", required=True)
    parser.add_argument("--node-ledger", required=True)
    parser.add_argument("--hub-ledger", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--allocate", action="store_true")
    parser.add_argument("--accepted-at")
    parser.add_argument("--rebuild", action="store_true")
    parser.add_argument("--batch", type=int)
    args = parser.parse_args()
    try:
        process(args)
    except (OSError, KeyError, ValueError, RuntimeError, zipfile.BadZipFile) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
