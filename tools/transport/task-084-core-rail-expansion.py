#!/usr/bin/env python3
"""Accept reviewed conventional/metro/private components at five existing hubs."""
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
GUIDES = {
    ("東京", "東日本旅客鉄道"): "https://www.jreast.co.jp/estation/stations/1039.html",
    ("東京", "東京地下鉄"): "https://www.tokyometro.jp/station/tokyo/index.html",
    ("新大阪", "西日本旅客鉄道"): "https://eki.jr-odekake.net/premises?id=0610155",
    ("新大阪", "大阪市高速電気軌道"): "https://subway.osakametro.co.jp/station_guide/m/m13/",
    ("京都", "西日本旅客鉄道"): "https://eki.jr-odekake.net/premises?id=0610116",
    ("京都", "京都市"): "https://www.city.kyoto.lg.jp/kotsu/page/0000009812.html",
    ("京都", "近畿日本鉄道"): "https://www.kintetsu.co.jp/soukatsu/kounai/kyoto.html",
    ("大宮", "東日本旅客鉄道"): "https://www.jreast.co.jp/estation/stations/350.html",
    ("大宮", "埼玉新都市交通"): "https://www.new-shuttle.jp/station/",
    ("大宮", "東武鉄道"): "https://www.tobu.co.jp/railway/guide/station/info/6102/",
    ("博多", "九州旅客鉄道"): "https://www.jrkyushu.co.jp/railway/station/1191771_1601.html",
    ("博多", "西日本旅客鉄道"): "https://eki.jr-odekake.net/premises?id=0910127",
    ("博多", "福岡市"): "https://subway.city.fukuoka.lg.jp/eki/stations/hakata.php",
}


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


def point(geometry):
    if geometry["type"] != "LineString":
        raise RuntimeError("UNSUPPORTED_STATION_GEOMETRY")
    coordinates = geometry["coordinates"]
    if len(coordinates) < 2:
        raise RuntimeError("INVALID_STATION_GEOMETRY")
    return [round(sum(float(p[i]) for p in coordinates) / len(coordinates), 7) for i in range(2)]


def signature(item):
    return digest(canonical([item["canonicalNameJaCandidate"], item["operatorRefCandidate"], item["lineRefCandidate"]]))


def candidates(source_zip, shinkansen_nodes, hub_ledger):
    if file_hash(source_zip) != SOURCE_SHA:
        raise RuntimeError("N02_ARCHIVE_HASH_MISMATCH")
    with zipfile.ZipFile(source_zip) as archive:
        raw = archive.read(ENTRY)
    if digest(raw) != ENTRY_SHA:
        raise RuntimeError("N02_ENTRY_HASH_MISMATCH")
    hubs = rows(hub_ledger)
    hub_by_name = {hub["canonicalNameJa"]: hub for hub in hubs}
    if set(hub_by_name) != {"東京", "新大阪", "京都", "大宮", "博多"}:
        raise RuntimeError("CORE_HUB_SET_CHANGED")
    node_by_id = {node["transportNodeId"]: node for node in rows(shinkansen_nodes)}
    anchors = {}
    for name, hub in hub_by_name.items():
        anchors[name] = [[node_by_id[node_id]["longitude"], node_by_id[node_id]["latitude"]] for node_id in hub["componentTransportNodeIds"]]
    grouped = defaultdict(list)
    rejected_same_name = []
    for feature in json.loads(raw)["features"]:
        props = feature["properties"]
        name = props["N02_005"]
        if name not in hub_by_name or "新幹線" in props["N02_003"]:
            continue
        p = point(feature["geometry"])
        if min(distance_m(p, existing) for existing in anchors[name]) > 800:
            rejected_same_name.append({"name": name, "operator": props["N02_004"], "line": props["N02_003"], "sourceStationCode": str(props["N02_005c"]), "reason": "SAME_NAME_DIFFERENT_PLACE"})
            continue
        key = (name, props["N02_004"], props["N02_003"], str(props["N02_005c"]))
        grouped[key].append((p, str(props["N02_005g"])))
    out = []
    for (name, operator, line, code), parts in sorted(grouped.items()):
        guide = GUIDES.get((name, operator))
        if not guide:
            raise RuntimeError(f"OPERATOR_GUIDE_REQUIRED: {name}/{operator}")
        points = [p for p, _ in parts]
        if len({group for _, group in parts}) != 1:
            raise RuntimeError("GROUP_CODE_CONFLICT")
        centroid = [round(sum(p[i] for p in points) / len(points), 7) for i in range(2)]
        if max(distance_m(centroid, p) for p in points) > 300:
            raise RuntimeError(f"GEOMETRY_CONFLICT: {name}/{operator}/{line}")
        hub = hub_by_name[name]
        out.append({
            "candidateKey": digest(canonical([name, operator, line, code])),
            "canonicalNameJaCandidate": name,
            "operatorRefCandidate": operator,
            "lineRefCandidate": line,
            "sourceStationCode": code,
            "sourceGroupCode": parts[0][1],
            "sourceGeometryPieces": len(points),
            "longitude": centroid[0], "latitude": centroid[1],
            "coordinateRole": "STATION_GEOMETRY_REPRESENTATIVE",
            "nodeKindCandidate": "metro_station" if operator in {"東京地下鉄", "大阪市高速電気軌道", "京都市", "福岡市"} else ("private_rail_station" if operator in {"近畿日本鉄道", "東武鉄道", "埼玉新都市交通"} else "rail_station"),
            "proposedHubId": hub["hubId"],
            "officialOperatorGuide": guide,
            "selectionReason": "Explicit component at an already accepted national Shinkansen transfer hub; useful for intercity-to-local Planner connectivity.",
            "sourceRefs": [SOURCE_URL, guide],
            "observedAt": "2025-12-31",
        })
    if len({signature(item) for item in out}) != len(out):
        raise RuntimeError("RAIL_SIGNATURE_COLLISION")
    return sorted(out, key=lambda item: item["candidateKey"]), sorted(rejected_same_name, key=lambda item: (item["name"], item["sourceStationCode"]))


def allocate(candidates_list, accepted_at):
    ledger = []
    for item in candidates_list:
        anchor = "ta:station-component:" + str(uuid.uuid4())
        ledger.append({
            "transportNodeId": "transport-node:" + str(uuid.uuid5(NAMESPACE, anchor)),
            "identityAnchor": anchor,
            "identitySignature": signature(item),
            "identityStatus": "NODE_ACCEPTED",
            "canonicalNameJa": item["canonicalNameJaCandidate"],
            "aliases": [],
            "nodeKind": item["nodeKindCandidate"],
            "operatorRefs": [item["operatorRefCandidate"]],
            "lineRefs": [item["lineRefCandidate"]],
            "externalRefs": [{"source": "MLIT N02 2025", "field": "N02_005c", "id": item["sourceStationCode"]}, {"source": "MLIT N02 2025", "field": "N02_005g", "id": item["sourceGroupCode"]}],
            "acceptedAt": accepted_at,
            "sourceRefs": item["sourceRefs"],
            "decisionEvidence": {"operatorGuide": item["officialOperatorGuide"], "shinkansenTransferHubId": item["proposedHubId"], "representativePointValidated": True, "sameNameOrSourceGroupCodeAloneUsed": False, "selectionReason": item["selectionReason"]},
        })
    return sorted(ledger, key=lambda item: item["transportNodeId"])


def validate_ledger(ledger):
    ids = [item["transportNodeId"] for item in ledger]
    signatures = [item["identitySignature"] for item in ledger]
    if len(ids) != len(set(ids)) or len(signatures) != len(set(signatures)):
        raise RuntimeError("RAIL_LEDGER_DUPLICATE")
    for item in ledger:
        if item["transportNodeId"] != "transport-node:" + str(uuid.uuid5(NAMESPACE, item["identityAnchor"])):
            raise RuntimeError("RAIL_ID_REBIND")
        if item["identityStatus"] != "NODE_ACCEPTED" or not item["decisionEvidence"]["operatorGuide"]:
            raise RuntimeError("RAIL_LEDGER_INVALID")


def write_or_verify(path, body, rebuild):
    if path.exists() and not rebuild:
        if file_hash(path) != digest(body):
            raise RuntimeError(f"CORRUPTED_RAIL_ARTIFACT: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)


def process(args):
    source_zip = Path(args.zip)
    shinkansen_nodes = Path(args.shinkansen_nodes)
    hub_ledger = Path(args.hub_ledger)
    candidates_list, rejected = candidates(source_zip, shinkansen_nodes, hub_ledger)
    ledger_path = Path(args.ledger)
    if args.allocate:
        if ledger_path.exists() or not args.accepted_at:
            raise RuntimeError("RAIL_LEDGER_ALREADY_EXISTS_OR_TIME_MISSING")
        ledger = allocate(candidates_list, args.accepted_at)
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_bytes(b"".join(canonical(item) for item in ledger))
    else:
        ledger = rows(ledger_path)
    validate_ledger(ledger)
    by_signature = {item["identitySignature"]: item for item in ledger}
    if len(candidates_list) != len(ledger):
        raise RuntimeError("RAIL_LEDGER_COUNT_MISMATCH")
    nodes = []
    decisions = []
    for candidate in candidates_list:
        identity = by_signature.get(signature(candidate))
        if not identity:
            raise RuntimeError("RAIL_IDENTITY_REVIEW_REQUIRED")
        nodes.append({
            "transportNodeId": identity["transportNodeId"], "identityStatus": "NODE_ACCEPTED",
            "canonicalNameJa": identity["canonicalNameJa"], "aliases": [],
            "nodeKind": identity["nodeKind"], "nodeLevel": "T2",
            "hierarchyEvidence": "Network component of a reviewed Shinkansen transfer hub; hub hierarchy reviewed separately.",
            "longitude": candidate["longitude"], "latitude": candidate["latitude"],
            "coordinateRole": candidate["coordinateRole"],
            "prefectureCode": None, "municipalityCode": None,
            "parentHubId": candidate["proposedHubId"], "hubResolutionStatus": "ACCEPTED",
            "operatorRefs": identity["operatorRefs"], "lineRefs": identity["lineRefs"], "serviceRefs": [],
            "externalRefs": identity["externalRefs"], "sourceRefs": identity["sourceRefs"],
            "observedAt": "2025-12-31", "confidence": 0.88,
            "unresolvedReasons": ["MUNICIPALITY_UNRESOLVED"],
        })
        decisions.append({"transportNodeId": identity["transportNodeId"], "hubId": candidate["proposedHubId"], "decision": "HUB_COMPONENT_ACCEPTED", "officialOperatorGuide": candidate["officialOperatorGuide"], "sourceStationCode": candidate["sourceStationCode"]})
    nodes.sort(key=lambda item: item["transportNodeId"])
    decisions.sort(key=lambda item: item["transportNodeId"])
    output = Path(args.output)
    candidate_body = b"".join(canonical(item) for item in candidates_list)
    rejected_body = b"".join(canonical(item) for item in rejected)
    node_body = b"".join(canonical(item) for item in nodes)
    decision_body = b"".join(canonical(item) for item in decisions)
    receipt_body = canonical({"batchId": "batch-0001", "nodeCount": len(nodes), "nodeSha256": digest(node_body), "ledgerSha256": file_hash(ledger_path), "sourceArchiveSha256": SOURCE_SHA})
    manifest_body = canonical({"task": "TASK-084-B", "stage": "CORE_RAIL_EXPANSION", "nationalMasterStatus": "PARTIAL", "candidateCount": len(candidates_list), "acceptedCount": len(nodes), "excludedSameNameCount": len(rejected), "hubLinkCount": len(decisions), "batchSize": BATCH_SIZE, "batches": [{"batchId": "batch-0001", "receiptSha256": digest(receipt_body)}], "sourceArchiveSha256": SOURCE_SHA, "sourceEntrySha256": ENTRY_SHA, "previousShinkansenNodesSha256": file_hash(shinkansen_nodes), "previousHubLedgerSha256": file_hash(hub_ledger), "identityLedgerSha256": file_hash(ledger_path), "artifactSha256": {"candidates.jsonl": digest(candidate_body), "transport-nodes.jsonl": digest(node_body), "hub-component-decisions.jsonl": digest(decision_body)}})
    if args.batch not in (None, 1):
        raise RuntimeError("BATCH_OUT_OF_RANGE")
    for path, body in [
        (output / "candidates.jsonl", candidate_body), (output / "excluded-same-name.jsonl", rejected_body),
        (output / "transport-nodes.jsonl", node_body), (output / "hub-component-decisions.jsonl", decision_body),
        (output / "batches" / "batch-0001.jsonl", node_body),
        (output / "batch-receipts" / "batch-0001.json", receipt_body),
        (output / "manifest.json", manifest_body),
    ]:
        write_or_verify(path, body, args.rebuild)
    print(json.dumps({"candidateCount": len(candidates_list), "acceptedCount": len(nodes), "hubLinkCount": len(decisions), "excludedSameNameCount": len(rejected)}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", required=True)
    parser.add_argument("--shinkansen-nodes", required=True)
    parser.add_argument("--hub-ledger", required=True)
    parser.add_argument("--ledger", required=True)
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
