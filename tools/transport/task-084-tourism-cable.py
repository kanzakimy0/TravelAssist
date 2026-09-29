#!/usr/bin/env python3
"""Review selected mountain funicular stations against N02 and operator guides."""
import argparse
import hashlib
import json
import math
import sys
import uuid
import zipfile
from pathlib import Path

SOURCE_URL = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html"
SOURCE_SHA = "aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f"
ENTRY = "N02-25_GML/UTF-8/N02-25_Station.geojson"
ENTRY_SHA = "908e2c3036e9c80760ae3514be3682c77f81f0bd60ab5fb1b3da1aa9352bbd94"
NAMESPACE = uuid.UUID("ed7ae3bf-b4e1-4a2c-abd6-acf1ea74d15d")
SELECTED = {
    ("清滝", "高尾登山電鉄", "高尾鋼索線"): ("T1", "Takao mountain ascent gateway connected to Keio rail", "https://www.takaotozan.co.jp/sp/cable/"),
    ("高尾山", "高尾登山電鉄", "高尾鋼索線"): ("T2", "Upper Takao mountain cable station", "https://www.takaotozan.co.jp/sp/cable/"),
    ("宮脇", "筑波観光鉄道", "筑波山鋼索鉄道線"): ("T1", "Tsukuba mountain cable ascent gateway", "https://mt-tsukuba.com/"),
    ("筑波山頂", "筑波観光鉄道", "筑波山鋼索鉄道線"): ("T2", "Upper Tsukuba mountain cable station", "https://mt-tsukuba.com/"),
    ("ケーブル八瀬", "京福電気鉄道", "鋼索線"): ("T1", "Kyoto rail-to-Hiei cable gateway", "https://www.keifuku.co.jp/cms/eizan_timetable/"),
    ("ケーブル比叡", "京福電気鉄道", "鋼索線"): ("T2", "Hiei cable-to-ropeway transfer gateway", "https://www.keifuku.co.jp/cms/eizan_timetable/"),
}


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    return digest(path.read_bytes())


def rows(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def signature(item):
    return digest(canonical([item["name"], item["operator"], item["line"]]))


def observations(source_zip):
    if file_hash(source_zip) != SOURCE_SHA:
        raise RuntimeError("CABLE_ARCHIVE_HASH_MISMATCH")
    with zipfile.ZipFile(source_zip) as archive:
        raw = archive.read(ENTRY)
    if digest(raw) != ENTRY_SHA:
        raise RuntimeError("CABLE_ENTRY_HASH_MISMATCH")
    out = []
    for feature in json.loads(raw)["features"]:
        p = feature["properties"]
        key = (p["N02_005"], p["N02_004"], p["N02_003"])
        if key not in SELECTED:
            continue
        coords = feature["geometry"]["coordinates"]
        if feature["geometry"]["type"] != "LineString" or len(coords) < 2:
            raise RuntimeError("CABLE_GEOMETRY_INVALID")
        lon, lat = [round(sum(float(v[i]) for v in coords) / len(coords), 7) for i in range(2)]
        if not (30 <= lat <= 45 and 129 <= lon <= 146 and math.isfinite(lat) and math.isfinite(lon)):
            raise RuntimeError("CABLE_COORDINATE_INVALID")
        level, reason, guide = SELECTED[key]
        out.append({"name": key[0], "operator": key[1], "line": key[2], "nodeLevel": level,
                    "reviewReason": reason, "officialOperatorGuide": guide,
                    "latitude": lat, "longitude": lon, "coordinateRole": "N02_STATION_GEOMETRY_REPRESENTATIVE",
                    "sourceStationCode": str(p["N02_005c"]), "sourceGroupCode": str(p["N02_005g"]),
                    "coordinateObservedAt": "2025-12-31", "identityObservedAt": "2026-09-28"})
    if len(out) != 6 or {tuple(item[k] for k in ["name", "operator", "line"]) for item in out} != set(SELECTED):
        raise RuntimeError("CABLE_REVIEW_SET_CHANGED")
    return sorted(out, key=signature)


def allocate(observed, accepted_at):
    result = []
    for item in observed:
        anchor = "ta:tourism-cable:" + str(uuid.uuid4())
        result.append({"transportNodeId": "transport-node:" + str(uuid.uuid5(NAMESPACE, anchor)),
                       "identityAnchor": anchor, "identitySignature": signature(item), "identityStatus": "NODE_ACCEPTED",
                       "canonicalNameJa": item["name"], "nodeKind": "funicular_station", "operatorRefs": [item["operator"]],
                       "lineRefs": [item["line"]], "acceptedAt": accepted_at,
                       "externalRefs": [{"source": "MLIT N02 2025", "field": "N02_005c", "id": item["sourceStationCode"]}],
                       "sourceRefs": [SOURCE_URL, item["officialOperatorGuide"]],
                       "decisionEvidence": {"reviewReason": item["reviewReason"], "coordinateRole": item["coordinateRole"], "sourceStationCodeUsedAsTravelAssistId": False}})
    return sorted(result, key=lambda item: item["transportNodeId"])


def validate_ledger(ledger):
    if len(ledger) != 6 or len({item["transportNodeId"] for item in ledger}) != 6 or len({item["identitySignature"] for item in ledger}) != 6:
        raise RuntimeError("CABLE_LEDGER_DUPLICATE_OR_INCOMPLETE")
    for item in ledger:
        if item["transportNodeId"] != "transport-node:" + str(uuid.uuid5(NAMESPACE, item["identityAnchor"])) or item["identityStatus"] != "NODE_ACCEPTED":
            raise RuntimeError("CABLE_ID_REBIND")


def write_or_verify(path, body, rebuild):
    if path.exists() and not rebuild:
        if file_hash(path) != digest(body):
            raise RuntimeError(f"CORRUPTED_CABLE_ARTIFACT: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)


def process(args):
    observed = observations(Path(args.zip))
    ledger_path = Path(args.ledger)
    if args.allocate:
        if ledger_path.exists() or not args.accepted_at:
            raise RuntimeError("CABLE_LEDGER_ALREADY_EXISTS_OR_TIME_MISSING")
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_bytes(b"".join(canonical(item) for item in allocate(observed, args.accepted_at)))
    ledger = rows(ledger_path)
    validate_ledger(ledger)
    by_signature = {item["identitySignature"]: item for item in ledger}
    if set(by_signature) != {signature(item) for item in observed}:
        raise RuntimeError("CABLE_IDENTITY_REVIEW_REQUIRED")
    nodes = []
    for item in observed:
        identity = by_signature[signature(item)]
        nodes.append({"transportNodeId": identity["transportNodeId"], "identityStatus": "NODE_ACCEPTED",
                      "canonicalNameJa": identity["canonicalNameJa"], "aliases": [],
                      "nodeKind": "funicular_station", "nodeLevel": item["nodeLevel"], "hierarchyEvidence": item["reviewReason"],
                      "latitude": item["latitude"], "longitude": item["longitude"], "coordinateRole": item["coordinateRole"],
                      "prefectureCode": None, "municipalityCode": None,
                      "parentHubId": None, "hubResolutionStatus": "SELF_GATEWAY",
                      "operatorRefs": identity["operatorRefs"], "lineRefs": identity["lineRefs"], "serviceRefs": [],
                      "externalRefs": identity["externalRefs"], "sourceRefs": identity["sourceRefs"],
                      "identityObservedAt": item["identityObservedAt"], "coordinateObservedAt": item["coordinateObservedAt"],
                      "confidence": 0.84, "unresolvedReasons": ["MUNICIPALITY_UNRESOLVED"]})
    nodes.sort(key=lambda item: item["transportNodeId"])
    output = Path(args.output)
    candidate_body = b"".join(canonical(item) for item in observed)
    node_body = b"".join(canonical(item) for item in nodes)
    receipt_body = canonical({"batchId": "batch-0001", "nodeCount": 6, "nodeSha256": digest(node_body), "ledgerSha256": file_hash(ledger_path), "sourceSha256": SOURCE_SHA})
    manifest_body = canonical({"task": "TASK-084-B", "stage": "TOURISM_CABLE_GATEWAYS", "nationalMasterStatus": "PARTIAL", "candidateCount": 6, "acceptedCount": 6,
                               "batchSize": 200, "batches": [{"batchId": "batch-0001", "receiptSha256": digest(receipt_body)}],
                               "sourceSha256": SOURCE_SHA, "identityLedgerSha256": file_hash(ledger_path),
                               "artifactSha256": {"candidates.jsonl": digest(candidate_body), "transport-nodes.jsonl": digest(node_body)}})
    if args.batch not in (None, 1):
        raise RuntimeError("BATCH_OUT_OF_RANGE")
    for path, body in [(output / "candidates.jsonl", candidate_body), (output / "transport-nodes.jsonl", node_body),
                       (output / "batches" / "batch-0001.jsonl", node_body), (output / "batch-receipts" / "batch-0001.json", receipt_body),
                       (output / "manifest.json", manifest_body)]:
        write_or_verify(path, body, args.rebuild)
    print(json.dumps({"candidateCount": 6, "acceptedCount": 6, "batchCount": 1}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", required=True)
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--allocate", action="store_true")
    parser.add_argument("--accepted-at")
    parser.add_argument("--rebuild", action="store_true")
    parser.add_argument("--batch", type=int)
    try:
        process(parser.parse_args())
    except (OSError, KeyError, ValueError, RuntimeError, zipfile.BadZipFile) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
