#!/usr/bin/env python3
"""Accept licensed Fukuoka municipal ferry GTFS gateways, without N09 data."""
import argparse
import csv
import hashlib
import io
import json
import math
import sys
import uuid
import zipfile
from pathlib import Path

DATASET_URL = "https://data.bodik.jp/dataset/9938b52c-e54c-4d92-9975-a98c5f60e727"
FEED_URL = "https://data.bodik.jp/dataset/9938b52c-e54c-4d92-9975-a98c5f60e727/resource/499f5b3d-093e-4c32-9636-2b91b227e6c2/download/data.zip"
OPERATOR_URL = "https://www.city.fukuoka.lg.jp/kowan/kyakusen/hakata-port/ferry_city.html"
FEED_SHA = "b39a7590d454e37a400f724472e4969133c7b9f54b8600dce68bc47fa0da1b9e"
NAMESPACE = uuid.UUID("ed7ae3bf-b4e1-4a2c-abd6-acf1ea74d15d")
BATCH_SIZE = 200


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    return digest(path.read_bytes())


def rows(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def csv_entry(archive, name):
    return list(csv.DictReader(io.StringIO(archive.read(name).decode("utf-8-sig"))))


def candidates(feed_zip):
    if file_hash(feed_zip) != FEED_SHA:
        raise RuntimeError("FERRY_FEED_HASH_MISMATCH")
    with zipfile.ZipFile(feed_zip) as archive:
        stops = csv_entry(archive, "stops.txt")
        stop_times = csv_entry(archive, "stop_times.txt")
        routes = csv_entry(archive, "routes.txt")
        feed_info = csv_entry(archive, "feed_info.txt")
    if len(stops) != 7 or len(feed_info) != 1 or len(routes) != 4:
        raise RuntimeError("FERRY_FEED_STRUCTURE_CHANGED")
    if any(route["route_type"] != "4" for route in routes):
        raise RuntimeError("NON_FERRY_ROUTE_IN_FEED")
    if feed_info[0]["feed_start_date"] != "20260101" or feed_info[0]["feed_end_date"] != "20271231":
        raise RuntimeError("FERRY_FEED_WINDOW_CHANGED")
    used = {item["stop_id"] for item in stop_times}
    out = []
    for stop in stops:
        stop_id = stop["stop_id"]
        name = stop["stop_name"]
        lat, lon = float(stop["stop_lat"]), float(stop["stop_lon"])
        if stop_id not in used or not name or not (33 <= lat <= 34 and 129 <= lon <= 131 and math.isfinite(lat) and math.isfinite(lon)):
            raise RuntimeError("FERRY_STOP_INVALID_OR_UNUSED")
        out.append({
            "candidateKey": digest(canonical(["Fukuoka municipal ferry", name])),
            "canonicalNameJaCandidate": name,
            "sourceStopId": stop_id,
            "latitude": lat, "longitude": lon,
            "coordinateRole": "GTFS_FERRY_STOP_POINT",
            "selectionReason": "Licensed municipal ferry terminal serving Fukuoka coastal/island passenger routes; Planner island gateway.",
            "sourceRefs": [DATASET_URL, OPERATOR_URL],
            "observedAt": "2026-01-30",
            "feedValidFrom": "2026-01-01", "feedValidThrough": "2027-12-31",
        })
    if len({item["canonicalNameJaCandidate"] for item in out}) != 7:
        raise RuntimeError("FERRY_STOP_NAME_COLLISION")
    return sorted(out, key=lambda item: item["candidateKey"])


def signature(item):
    return digest(canonical(["Fukuoka municipal ferry", item["canonicalNameJaCandidate"]]))


def allocate(candidates_list, accepted_at):
    out = []
    for item in candidates_list:
        anchor = "ta:ferry-gateway:" + str(uuid.uuid4())
        out.append({
            "transportNodeId": "transport-node:" + str(uuid.uuid5(NAMESPACE, anchor)),
            "identityAnchor": anchor,
            "identitySignature": signature(item),
            "identityStatus": "NODE_ACCEPTED",
            "canonicalNameJa": item["canonicalNameJaCandidate"],
            "aliases": [], "nodeKind": "ferry_port",
            "operatorRefs": ["福岡市営渡船"], "lineRefs": [],
            "externalRefs": [{"source": "Fukuoka municipal ferry GTFS", "field": "stop_id", "id": item["sourceStopId"]}],
            "acceptedAt": accepted_at,
            "sourceRefs": [DATASET_URL, FEED_URL, OPERATOR_URL],
            "decisionEvidence": {"license": "CC BY 4.0", "publisher": "福岡市", "routeType": 4, "usedInStopTimes": True, "sourceStopIdUsedAsTravelAssistId": False, "selectionReason": item["selectionReason"]},
        })
    return sorted(out, key=lambda item: item["transportNodeId"])


def validate_ledger(ledger):
    ids = [item["transportNodeId"] for item in ledger]
    signatures = [item["identitySignature"] for item in ledger]
    if len(ids) != len(set(ids)) or len(signatures) != len(set(signatures)):
        raise RuntimeError("FERRY_LEDGER_DUPLICATE")
    for item in ledger:
        if item["transportNodeId"] != "transport-node:" + str(uuid.uuid5(NAMESPACE, item["identityAnchor"])):
            raise RuntimeError("FERRY_ID_REBIND")
        if item["identityStatus"] != "NODE_ACCEPTED" or item["decisionEvidence"]["license"] != "CC BY 4.0":
            raise RuntimeError("FERRY_LEDGER_INVALID")


def write_or_verify(path, body, rebuild):
    if path.exists() and not rebuild:
        if file_hash(path) != digest(body):
            raise RuntimeError(f"CORRUPTED_FERRY_ARTIFACT: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)


def process(args):
    observations = candidates(Path(args.zip))
    ledger_path = Path(args.ledger)
    if args.allocate:
        if ledger_path.exists() or not args.accepted_at:
            raise RuntimeError("FERRY_LEDGER_ALREADY_EXISTS_OR_TIME_MISSING")
        ledger = allocate(observations, args.accepted_at)
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_bytes(b"".join(canonical(item) for item in ledger))
    else:
        ledger = rows(ledger_path)
    validate_ledger(ledger)
    if len(ledger) != len(observations):
        raise RuntimeError("FERRY_LEDGER_COUNT_MISMATCH")
    by_signature = {item["identitySignature"]: item for item in ledger}
    nodes = []
    for observation in observations:
        identity = by_signature.get(signature(observation))
        if not identity:
            raise RuntimeError("FERRY_IDENTITY_REVIEW_REQUIRED")
        nodes.append({
            "transportNodeId": identity["transportNodeId"], "identityStatus": "NODE_ACCEPTED",
            "canonicalNameJa": identity["canonicalNameJa"], "aliases": [],
            "nodeKind": "ferry_port", "nodeLevel": "T2",
            "hierarchyEvidence": "Municipal island/coastal passenger gateway; national T1 review remains separate.",
            "latitude": observation["latitude"], "longitude": observation["longitude"],
            "coordinateRole": "GTFS_FERRY_STOP_POINT",
            "prefectureCode": None, "municipalityCode": None,
            "parentHubId": None, "hubResolutionStatus": "SELF_GATEWAY",
            "operatorRefs": identity["operatorRefs"], "lineRefs": [], "serviceRefs": [],
            "externalRefs": identity["externalRefs"], "sourceRefs": identity["sourceRefs"],
            "observedAt": observation["observedAt"], "feedValidFrom": observation["feedValidFrom"], "feedValidThrough": observation["feedValidThrough"],
            "confidence": 0.88,
            "unresolvedReasons": ["MUNICIPALITY_UNRESOLVED"],
        })
    nodes.sort(key=lambda item: item["transportNodeId"])
    output = Path(args.output)
    candidate_body = b"".join(canonical(item) for item in observations)
    node_body = b"".join(canonical(item) for item in nodes)
    receipt_body = canonical({"batchId": "batch-0001", "nodeCount": len(nodes), "nodeSha256": digest(node_body), "ledgerSha256": file_hash(ledger_path), "feedSha256": FEED_SHA})
    manifest_body = canonical({"task": "TASK-084-B", "stage": "FUKUOKA_FERRY_GATEWAYS", "nationalMasterStatus": "PARTIAL", "candidateCount": len(observations), "acceptedCount": len(nodes), "batchSize": BATCH_SIZE, "batches": [{"batchId": "batch-0001", "receiptSha256": digest(receipt_body)}], "sourceLicenseDecision": "PASS_CC_BY_4_0", "feedSha256": FEED_SHA, "identityLedgerSha256": file_hash(ledger_path), "artifactSha256": {"candidates.jsonl": digest(candidate_body), "transport-nodes.jsonl": digest(node_body)}})
    if args.batch not in (None, 1):
        raise RuntimeError("BATCH_OUT_OF_RANGE")
    for path, body in [(output / "candidates.jsonl", candidate_body), (output / "transport-nodes.jsonl", node_body), (output / "batches" / "batch-0001.jsonl", node_body), (output / "batch-receipts" / "batch-0001.json", receipt_body), (output / "manifest.json", manifest_body)]:
        write_or_verify(path, body, args.rebuild)
    print(json.dumps({"candidateCount": len(observations), "acceptedCount": len(nodes), "batchCount": 1}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", required=True)
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
