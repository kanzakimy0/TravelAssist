#!/usr/bin/env python3
"""Review five Nagasaki bus gateways from the licensed prefectural GTFS."""
import argparse
import csv
import hashlib
import io
import json
import math
import sys
import uuid
import zipfile
from collections import Counter
from pathlib import Path

DATASET_URL = "https://data.bodik.jp/dataset/420000_nagasakikeneibus"
FEED_URL = "https://data.bodik.jp/dataset/420000_nagasakikeneibus/resource/97f91f64-2124-4bf1-b3e3-422de17fc080/download"
OPERATOR_URL = "https://www.keneibus.jp/local/map"
FEED_SHA = "69a20a9477a71af71921d71ea68b338122cddbdaa3fad7a2560baed7be655d4e"
NAMESPACE = uuid.UUID("ed7ae3bf-b4e1-4a2c-abd6-acf1ea74d15d")

# GTFS facility parent when present, or an explicitly labelled terminal platform.
# Source station IDs remain references; the local immutable ID has its own anchor.
SELECTED = {
    "881010_02": ("長崎駅前バスターミナル", "T1", "Airport and city rail interchange bus terminal", "https://www.keneibus.jp/limousine/nagasaki/index.html"),
    "886625": ("長崎空港バスターミナル", "T1", "Airport bus terminal with multiple used boarding platforms", "https://www.keneibus.jp/limousine/nagasaki/index.html"),
    "883075": ("諫早駅前バスターミナル", "T1", "Regional rail and airport bus interchange", "https://www.keneibus.jp/limousine/isahaya"),
    "886045": ("大村ターミナル", "T2", "Regional shuttle bus terminal", "https://www.keneibus.jp/cellular/shuttlebus/omura/"),
    "887095_05": ("佐世保バスセンター", "T1", "Intercity bus center for Sasebo and northern Nagasaki tourism", "https://www.keneibus.jp/cellular/highway/sasebo/index.html"),
}


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


def signature(item):
    return digest(canonical(["Nagasaki prefectural bus", item["sourceStopId"], item["canonicalNameJaCandidate"]]))


def candidates(feed_zip):
    if file_hash(feed_zip) != FEED_SHA:
        raise RuntimeError("BUS_FEED_HASH_MISMATCH")
    with zipfile.ZipFile(feed_zip) as archive:
        stops = {item["stop_id"]: item for item in csv_entry(archive, "stops.txt")}
        times = Counter(item["stop_id"] for item in csv_entry(archive, "stop_times.txt"))
        routes = csv_entry(archive, "routes.txt")
        info = csv_entry(archive, "feed_info.txt")
        agency = csv_entry(archive, "agency.txt")
    if len(stops) != 1753 or len(routes) != 49 or len(info) != 1 or len(agency) != 1:
        raise RuntimeError("BUS_FEED_STRUCTURE_CHANGED")
    if info[0]["feed_start_date"] != "20260401" or info[0]["feed_end_date"] != "20270401" or info[0]["feed_version"] != "VER_20260901":
        raise RuntimeError("BUS_FEED_WINDOW_CHANGED")
    if agency[0]["agency_name"] != "長崎県交通局" or any(route["route_type"] != "3" for route in routes):
        raise RuntimeError("BUS_OPERATOR_OR_ROUTE_CHANGED")
    out = []
    for stop_id, (name, level, reason, guide) in SELECTED.items():
        stop = stops[stop_id]
        lat, lon = float(stop["stop_lat"]), float(stop["stop_lon"])
        if not (32 <= lat <= 34 and 129 <= lon <= 131 and math.isfinite(lat) and math.isfinite(lon)):
            raise RuntimeError("BUS_COORDINATE_INVALID")
        if stop["location_type"] == "1":
            children = [child for child in stops.values() if child["parent_station"] == stop_id and times[child["stop_id"]] > 0]
            if not children or stop["stop_name"] not in name:
                raise RuntimeError("BUS_PARENT_FACILITY_UNVERIFIED")
            used_count = sum(times[child["stop_id"]] for child in children)
            role = "GTFS_BUS_STATION_REFERENCE_POINT"
        else:
            if not times[stop_id] or "ターミナル" not in stop["stop_desc"] and "ターミナル" not in name and "バスセンター" not in name:
                raise RuntimeError("BUS_TERMINAL_PLATFORM_UNVERIFIED")
            used_count = times[stop_id]
            role = "GTFS_BUS_TERMINAL_PLATFORM_POINT"
        out.append({"sourceStopId": stop_id, "canonicalNameJaCandidate": name,
                    "sourceStopNameJa": stop["stop_name"], "latitude": lat, "longitude": lon,
                    "coordinateRole": role, "nodeLevel": level, "reviewReason": reason,
                    "officialOperatorGuide": guide, "usedStopTimeCount": used_count,
                    "feedPublisherName": info[0]["feed_publisher_name"],
                    "observedAt": "2026-09-01", "feedValidFrom": "2026-04-01", "feedValidThrough": "2027-04-01"})
    return sorted(out, key=lambda item: signature(item))


def allocate(observations, accepted_at):
    out = []
    for item in observations:
        anchor = "ta:bus-gateway:" + str(uuid.uuid4())
        out.append({"transportNodeId": "transport-node:" + str(uuid.uuid5(NAMESPACE, anchor)),
                    "identityAnchor": anchor, "identitySignature": signature(item),
                    "identityStatus": "NODE_ACCEPTED", "canonicalNameJa": item["canonicalNameJaCandidate"],
                    "nodeKind": "bus_terminal", "operatorRefs": ["長崎県交通局"],
                    "externalRefs": [{"source": "Nagasaki prefectural bus GTFS", "field": "stop_id", "id": item["sourceStopId"]}],
                    "acceptedAt": accepted_at, "sourceRefs": [DATASET_URL, FEED_URL, item["officialOperatorGuide"]],
                    "decisionEvidence": {"license": "CC BY 4.0", "publisher": "長崎県", "usedStopTimeCount": item["usedStopTimeCount"], "sourceStopIdUsedAsTravelAssistId": False, "reviewReason": item["reviewReason"]}})
    return sorted(out, key=lambda item: item["transportNodeId"])


def validate_ledger(ledger):
    if len(ledger) != 5 or len({item["transportNodeId"] for item in ledger}) != 5 or len({item["identitySignature"] for item in ledger}) != 5:
        raise RuntimeError("BUS_LEDGER_DUPLICATE_OR_INCOMPLETE")
    for item in ledger:
        if item["transportNodeId"] != "transport-node:" + str(uuid.uuid5(NAMESPACE, item["identityAnchor"])) or item["identityStatus"] != "NODE_ACCEPTED":
            raise RuntimeError("BUS_ID_REBIND")


def write_or_verify(path, body, rebuild):
    if path.exists() and not rebuild:
        if file_hash(path) != digest(body):
            raise RuntimeError(f"CORRUPTED_BUS_ARTIFACT: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)


def process(args):
    observed = candidates(Path(args.zip))
    ledger_path = Path(args.ledger)
    if args.allocate:
        if ledger_path.exists() or not args.accepted_at:
            raise RuntimeError("BUS_LEDGER_ALREADY_EXISTS_OR_TIME_MISSING")
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_bytes(b"".join(canonical(item) for item in allocate(observed, args.accepted_at)))
    ledger = rows(ledger_path)
    validate_ledger(ledger)
    by_sig = {item["identitySignature"]: item for item in ledger}
    if set(by_sig) != {signature(item) for item in observed}:
        raise RuntimeError("BUS_IDENTITY_REVIEW_REQUIRED")
    nodes = []
    for item in observed:
        identity = by_sig[signature(item)]
        nodes.append({"transportNodeId": identity["transportNodeId"], "identityStatus": "NODE_ACCEPTED",
                      "canonicalNameJa": identity["canonicalNameJa"], "aliases": [],
                      "nodeKind": "bus_terminal", "nodeLevel": item["nodeLevel"], "hierarchyEvidence": item["reviewReason"],
                      "latitude": item["latitude"], "longitude": item["longitude"], "coordinateRole": item["coordinateRole"],
                      "prefectureCode": None, "municipalityCode": None, "parentHubId": None, "hubResolutionStatus": "SELF_GATEWAY",
                      "operatorRefs": identity["operatorRefs"], "lineRefs": [], "serviceRefs": [],
                      "externalRefs": identity["externalRefs"], "sourceRefs": identity["sourceRefs"],
                      "observedAt": item["observedAt"], "feedValidFrom": item["feedValidFrom"], "feedValidThrough": item["feedValidThrough"],
                      "confidence": 0.86, "unresolvedReasons": ["MUNICIPALITY_UNRESOLVED"]})
    nodes.sort(key=lambda item: item["transportNodeId"])
    output = Path(args.output)
    candidate_body = b"".join(canonical(item) for item in observed)
    node_body = b"".join(canonical(item) for item in nodes)
    receipt_body = canonical({"batchId": "batch-0001", "nodeCount": 5, "nodeSha256": digest(node_body), "ledgerSha256": file_hash(ledger_path), "feedSha256": FEED_SHA})
    manifest_body = canonical({"task": "TASK-084-B", "stage": "NAGASAKI_BUS_GATEWAYS", "nationalMasterStatus": "PARTIAL", "candidateCount": 5, "acceptedCount": 5,
                               "batchSize": 200, "batches": [{"batchId": "batch-0001", "receiptSha256": digest(receipt_body)}],
                               "sourceLicenseDecision": "PASS_CC_BY_4_0", "feedSha256": FEED_SHA, "identityLedgerSha256": file_hash(ledger_path),
                               "artifactSha256": {"candidates.jsonl": digest(candidate_body), "transport-nodes.jsonl": digest(node_body)}})
    if args.batch not in (None, 1):
        raise RuntimeError("BATCH_OUT_OF_RANGE")
    for path, body in [(output / "candidates.jsonl", candidate_body), (output / "transport-nodes.jsonl", node_body),
                       (output / "batches" / "batch-0001.jsonl", node_body), (output / "batch-receipts" / "batch-0001.json", receipt_body),
                       (output / "manifest.json", manifest_body)]:
        write_or_verify(path, body, args.rebuild)
    print(json.dumps({"candidateCount": 5, "acceptedCount": 5, "batchCount": 1}))


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
