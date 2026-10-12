#!/usr/bin/env python3
"""Accept source-supported station components using a committed TravelAssist identity ledger.

The candidate generator and this acceptance step are intentionally separate.
No source station code or source grouping code is a TransportNode ID.
"""
import argparse
import hashlib
import json
import math
import sys
import unicodedata
import uuid
from pathlib import Path

SOURCE_URL = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html"
SOURCE_SHA256 = "aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f"
SOURCE_ENTRY_SHA256 = "908e2c3036e9c80760ae3514be3682c77f81f0bd60ab5fb1b3da1aa9352bbd94"
ID_NAMESPACE = uuid.UUID("ed7ae3bf-b4e1-4a2c-abd6-acf1ea74d15d")
HUB_NAMESPACE = uuid.UUID("3fbc1a1f-01c3-4d82-9dc6-9b6d058204b0")
BATCH_SIZE = 200


def encoded(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def file_sha(path):
    return sha(path.read_bytes())


def lines(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def signature(row):
    """A matching hint, not the permanent ID. Changed names require reviewed ledger updates."""
    fields = [row["canonicalNameJaCandidate"], row["operatorRefCandidate"], row["lineRefCandidate"]]
    return sha(encoded([unicodedata.normalize("NFKC", value).strip() for value in fields]))


def candidate_eligible(row):
    point = row["pointCandidate"]
    return (
        bool(row["canonicalNameJaCandidate"].strip())
        and bool(row["operatorRefCandidate"].strip())
        and bool(row["lineRefCandidate"].strip())
        and bool(row["sourceStationCode"])
        and row["coordinateRole"] == "STATION_GEOMETRY_REPRESENTATIVE"
        and point is not None
        and 122 <= point["longitude"] <= 154
        and 20 <= point["latitude"] <= 46
        and math.isfinite(point["longitude"])
        and math.isfinite(point["latitude"])
        and row["sourceRefs"] == [SOURCE_URL]
        and row["observedAt"] == "2025-12-31"
    )


def load_candidates(candidate_root):
    manifest = json.loads((candidate_root / "manifest.json").read_text(encoding="utf-8"))
    if (
        manifest["sourceArchiveSha256"] != SOURCE_SHA256
        or manifest["sourceEntrySha256"] != SOURCE_ENTRY_SHA256
        or manifest["sourceLicense"] != "CC BY 4.0 (2025 edition)"
    ):
        raise RuntimeError("CANDIDATE_SOURCE_MISMATCH")
    rows = []
    for batch in manifest["batches"]:
        batch_id = batch["batchId"]
        receipt_path = candidate_root / "batch-receipts" / f"{batch_id}.json"
        if file_sha(receipt_path) != batch["receiptSha256"]:
            raise RuntimeError(f"CORRUPTED_CANDIDATE_RECEIPT: {batch_id}")
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        batch_path = candidate_root / "batches" / f"{batch_id}.jsonl"
        if file_sha(batch_path) != receipt["outputSha256"]:
            raise RuntimeError(f"CORRUPTED_CANDIDATE_BATCH: {batch_id}")
        rows.extend(lines(batch_path))
    if len(rows) != manifest["candidateCount"]:
        raise RuntimeError("CANDIDATE_COUNT_MISMATCH")
    if len({r["candidateKey"] for r in rows}) != len(rows):
        raise RuntimeError("DUPLICATE_CANDIDATE_KEY")
    return sorted(rows, key=lambda row: row["candidateKey"]), manifest


def allocate_ledger(rows, accepted_at):
    signatures = [signature(row) for row in rows]
    if len(set(signatures)) != len(rows):
        raise RuntimeError("SEMANTIC_IDENTITY_COLLISION")
    ledger = []
    for row in rows:
        if not candidate_eligible(row):
            continue
        anchor = "ta:station-component:" + str(uuid.uuid4())
        transport_id = "transport-node:" + str(uuid.uuid5(ID_NAMESPACE, anchor))
        ledger.append({
            "transportNodeId": transport_id,
            "identityAnchor": anchor,
            "identitySignature": signature(row),
            "identityStatus": "NODE_ACCEPTED",
            "canonicalNameJa": row["canonicalNameJaCandidate"],
            "aliases": [],
            "nodeKind": "shinkansen_station",
            "operatorRefs": [row["operatorRefCandidate"]],
            "lineRefs": [row["lineRefCandidate"]],
            "externalRefs": [
                {"source": "MLIT N02 2025", "field": "N02_005c", "id": row["sourceStationCode"]},
                {"source": "MLIT N02 2025", "field": "N02_005g", "id": row["sourceGroupCode"]},
            ],
            "acceptedAt": accepted_at,
            "sourceRefs": [SOURCE_URL],
            "decisionEvidence": {
                "officialSnapshot": "2025-12-31",
                "sourceArchiveSha256": SOURCE_SHA256,
                "sourceStationCodeUniqueInSelection": True,
                "nameOperatorLineSignatureUniqueInSelection": True,
                "representativePointValidated": True,
                "sameNameGroupNotMerged": True,
            },
        })
    return sorted(ledger, key=lambda entry: entry["transportNodeId"])


def validate_ledger(ledger):
    ids = [entry["transportNodeId"] for entry in ledger]
    anchors = [entry["identityAnchor"] for entry in ledger]
    signatures = [entry["identitySignature"] for entry in ledger]
    if len(ids) != len(set(ids)) or len(anchors) != len(set(anchors)) or len(signatures) != len(set(signatures)):
        raise RuntimeError("DUPLICATE_LEDGER_IDENTITY")
    for entry in ledger:
        if entry["transportNodeId"] != "transport-node:" + str(uuid.uuid5(ID_NAMESPACE, entry["identityAnchor"])):
            raise RuntimeError("LEDGER_ID_REBIND")
        if entry["identityStatus"] != "NODE_ACCEPTED" or not entry["sourceRefs"] or not entry["decisionEvidence"]:
            raise RuntimeError("INVALID_LEDGER_DECISION")


def project_node(row, entry, hub=None):
    if signature(row) != entry["identitySignature"] or not candidate_eligible(row):
        raise RuntimeError("IDENTITY_EVIDENCE_CHANGED")
    point = row["pointCandidate"]
    return {
        "transportNodeId": entry["transportNodeId"],
        "nodeKind": "shinkansen_station",
        "nodeLevel": "T2",
        "canonicalNameJa": entry["canonicalNameJa"],
        "canonicalNameEn": None,
        "aliases": entry["aliases"],
        "latitude": point["latitude"],
        "longitude": point["longitude"],
        "coordinateRole": "STATION_GEOMETRY_REPRESENTATIVE",
        "prefectureCode": None,
        "municipalityCode": None,
        "administrativeResolutionStatus": "UNRESOLVED",
        "parentHubId": hub["hubId"] if hub else None,
        "hubResolutionStatus": "ACCEPTED" if hub else "UNRESOLVED",
        "operatorRefs": entry["operatorRefs"],
        "lineRefs": entry["lineRefs"],
        "serviceRefs": [],
        # Source codes are observations. A later reviewed source refresh may
        # change them without changing the TravelAssist identity ledger ID.
        "externalRefs": [
            {"source": "MLIT N02 2025", "field": "N02_005c", "id": row["sourceStationCode"]},
            {"source": "MLIT N02 2025", "field": "N02_005g", "id": row["sourceGroupCode"]},
        ],
        "accessibility": "unknown",
        "sourceRefs": entry["sourceRefs"],
        "confidence": 0.88,
        "observedAt": "2025-12-31",
        "generatedAt": entry["acceptedAt"],
        "identityStatus": "NODE_ACCEPTED",
        "unresolvedReasons": ["MUNICIPALITY_UNRESOLVED"] if hub else ["HUB_RELATION_UNRESOLVED", "MUNICIPALITY_UNRESOLVED"],
    }


def load_hubs(path, ledger):
    if path is None:
        return [], {}
    hubs = lines(path)
    node_by_id = {entry["transportNodeId"]: entry for entry in ledger}
    by_component = {}
    hub_ids = set()
    for hub in hubs:
        if hub["hubId"] != "transport-hub:" + str(uuid.uuid5(HUB_NAMESPACE, hub["identityAnchor"])):
            raise RuntimeError("HUB_ID_REBIND")
        if hub["hubId"] in hub_ids or hub["identityStatus"] != "HUB_ACCEPTED":
            raise RuntimeError("DUPLICATE_OR_UNACCEPTED_HUB")
        hub_ids.add(hub["hubId"])
        if len(hub["sourceRefs"]) < 2 or not hub["decisionEvidence"]["officialStationGuide"]:
            raise RuntimeError("HUB_PROVENANCE_MISSING")
        for node_id in hub["componentTransportNodeIds"]:
            entry = node_by_id.get(node_id)
            if entry is None or node_id in by_component:
                raise RuntimeError("HUB_COMPONENT_INVALID")
            if entry["canonicalNameJa"] != hub["canonicalNameJa"]:
                raise RuntimeError("HUB_COMPONENT_NAME_CONFLICT")
            if not set(entry["lineRefs"]).issubset(set(hub["lineRefs"])):
                raise RuntimeError("HUB_COMPONENT_LINE_CONFLICT")
            by_component[node_id] = hub
    return hubs, by_component


def write_or_verify(path, body, rebuild):
    if path.exists() and not rebuild:
        if file_sha(path) != sha(body):
            raise RuntimeError(f"CORRUPTED_ACCEPTED_ARTIFACT: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)


def process(args):
    candidate_root = Path(args.candidates)
    rows, candidate_manifest = load_candidates(candidate_root)
    ledger_path = Path(args.ledger)
    if args.allocate:
        if ledger_path.exists():
            raise RuntimeError("LEDGER_ALREADY_EXISTS")
        if not args.accepted_at:
            raise RuntimeError("ACCEPTED_AT_REQUIRED")
        ledger = allocate_ledger(rows, args.accepted_at)
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_bytes(b"".join(encoded(entry) for entry in ledger))
    else:
        if not ledger_path.exists():
            raise RuntimeError("IDENTITY_LEDGER_REQUIRED")
        ledger = lines(ledger_path)
    validate_ledger(ledger)
    hub_path = Path(args.hub_ledger) if args.hub_ledger else None
    hubs, hub_by_component = load_hubs(hub_path, ledger)
    by_signature = {entry["identitySignature"]: entry for entry in ledger}
    accepted = []
    decisions = []
    unresolved = []
    for row in rows:
        entry = by_signature.get(signature(row))
        if entry is None or not candidate_eligible(row):
            decisions.append({"candidateKey": row["candidateKey"], "decision": "REVIEW_REQUIRED", "reasons": row["reasons"]})
            unresolved.append({"candidateKey": row["candidateKey"], "reasons": row["reasons"]})
            continue
        hub = hub_by_component.get(entry["transportNodeId"])
        node = project_node(row, entry, hub)
        accepted.append(node)
        decisions.append({
            "candidateKey": row["candidateKey"], "transportNodeId": entry["transportNodeId"],
            "decision": "NODE_ACCEPTED", "hubResolutionStatus": node["hubResolutionStatus"],
        })
        unresolved.append({
            "transportNodeId": entry["transportNodeId"],
            "reasons": node["unresolvedReasons"],
        })
    if len({node["transportNodeId"] for node in accepted}) != len(accepted):
        raise RuntimeError("DUPLICATE_ACCEPTED_ID")
    if len(accepted) != len(ledger):
        raise RuntimeError("LEDGER_ORPHAN")
    accepted.sort(key=lambda node: node["transportNodeId"])
    decisions.sort(key=lambda row: row["candidateKey"])
    unresolved.sort(key=lambda row: row.get("transportNodeId", row.get("candidateKey")))
    output = Path(args.output)
    batch_count = (len(accepted) + BATCH_SIZE - 1) // BATCH_SIZE
    if args.batch is not None and not (1 <= args.batch <= batch_count):
        raise RuntimeError("BATCH_OUT_OF_RANGE")
    batch_manifest = []
    for index in range(batch_count):
        number = index + 1
        batch_id = f"batch-{number:04}"
        batch_rows = accepted[index * BATCH_SIZE:(index + 1) * BATCH_SIZE]
        body = b"".join(encoded(row) for row in batch_rows)
        receipt = {
            "batchId": batch_id,
            "status": "PASS_NODE_ACCEPTANCE_QA",
            "nodeCount": len(batch_rows),
            "nodeSha256": sha(body),
            "ledgerSha256": file_sha(ledger_path),
            "candidateManifestSha256": file_sha(candidate_root / "manifest.json"),
        }
        receipt_body = encoded(receipt)
        rerun = args.rebuild and (args.batch is None or args.batch == number)
        batch_path = output / "batches" / f"{batch_id}.jsonl"
        receipt_path = output / "batch-receipts" / f"{batch_id}.json"
        if args.batch is not None and args.batch != number and (not batch_path.exists() or not receipt_path.exists()):
            raise RuntimeError(f"MISSING_PRIOR_BATCH: {batch_id}")
        write_or_verify(batch_path, body, rerun)
        write_or_verify(receipt_path, receipt_body, rerun)
        batch_manifest.append({"batchId": batch_id, "receiptSha256": sha(receipt_body)})
    extras = {
        "transport-nodes.jsonl": b"".join(encoded(row) for row in accepted),
        "transport-hubs.jsonl": b"".join(encoded(row) for row in hubs),
        "transport-node-acceptance-decisions.jsonl": b"".join(encoded(row) for row in decisions),
        "transport-node-unresolved.jsonl": b"".join(encoded(row) for row in unresolved),
    }
    for name, body in extras.items():
        write_or_verify(output / name, body, args.rebuild)
    manifest = {
        "task": "TASK-084-B",
        "nationalMasterStatus": "PARTIAL",
        "identityLedgerSha256": file_sha(ledger_path),
        "hubLedgerSha256": file_sha(hub_path) if hub_path else None,
        "candidateManifestSha256": file_sha(candidate_root / "manifest.json"),
        "candidateCount": len(rows),
        "acceptedCount": len(accepted),
        "hubAcceptedCount": len(hubs),
        "hubUnresolvedCount": sum(node["hubResolutionStatus"] == "UNRESOLVED" for node in accepted),
        "municipalityResolvedCount": 0,
        "coordinateRoleCoverage": len(accepted),
        "batchSize": BATCH_SIZE,
        "batches": batch_manifest,
        "artifactSha256": {name: sha(body) for name, body in extras.items()},
        "runtimeIntegration": "DEFERRED_TO_A",
        "sourceArchiveSha256": candidate_manifest["sourceArchiveSha256"],
    }
    write_or_verify(output / "manifest.json", encoded(manifest), args.rebuild)
    print(json.dumps({
        "candidateCount": len(rows), "acceptedCount": len(accepted),
        "hubAcceptedCount": len(hubs), "hubUnresolvedCount": manifest["hubUnresolvedCount"],
        "batchCount": batch_count,
    }))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--candidates", required=True)
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--hub-ledger")
    parser.add_argument("--output", required=True)
    parser.add_argument("--allocate", action="store_true", help="one-time owned ID allocation; never overwrites a ledger")
    parser.add_argument("--accepted-at")
    parser.add_argument("--rebuild", action="store_true")
    parser.add_argument("--batch", type=int)
    args = parser.parse_args()
    try:
        process(args)
    except (OSError, KeyError, ValueError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
