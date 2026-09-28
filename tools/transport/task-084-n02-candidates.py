#!/usr/bin/env python3
"""TASK-084-B licensed N02 railway candidate extraction; never admits nodes."""
import argparse
import hashlib
import json
import math
import sys
import zipfile
from pathlib import Path

ENTRY = "N02-25_GML/UTF-8/N02-25_Station.geojson"
SOURCE = "mlit-n02-2025"
SOURCE_URL = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html"
SNAPSHOT = "2025-12-31"
BATCH_SIZE = 200
REASONS = ["IDENTITY_AMBIGUOUS", "HUB_RELATION_UNRESOLVED", "MUNICIPALITY_UNRESOLVED"]
def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n"
def digest(data):
    return hashlib.sha256(data).hexdigest()
def path_digest(path):
    return digest(path.read_bytes())
def write_bytes(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
def verify(path, expected):
    if not path.is_file() or path_digest(path) != expected:
        raise RuntimeError(f"CORRUPTED_BATCH: {path}")
def midpoint(coords):
    if len(coords) < 2 or any(len(p) < 2 for p in coords):
        raise ValueError("invalid line geometry")
    lon = sum(float(p[0]) for p in coords) / len(coords)
    lat = sum(float(p[1]) for p in coords) / len(coords)
    if not (122 <= lon <= 154 and 20 <= lat <= 46 and math.isfinite(lon) and math.isfinite(lat)):
        raise ValueError("coordinate outside Japan sanity bounds")
    return [round(lon, 7), round(lat, 7)]
def candidates(raw, source_ref=SOURCE_URL):
    features = json.loads(raw)["features"]
    out = []
    seen = {}
    for feature in features:
        props = feature["properties"]
        if "新幹線" not in props["N02_003"]:
            continue
        source_id = str(props["N02_005c"])
        identity = [source_id, props["N02_003"], props["N02_004"]]
        key = "candidate:n02-2025:" + digest(canonical(identity))[:20]
        point = midpoint(feature["geometry"]["coordinates"])
        if key in seen:
            previous = seen[key]
            if previous["sourceGroupCode"] != str(props["N02_005g"]) or previous["canonicalNameJaCandidate"] != props["N02_005"]:
                raise RuntimeError("conflicting source component identity")
            previous["sourceGeometryPieces"] += 1
            previous["pointCandidate"] = None
            previous["reasons"] = REASONS + ["MULTI_SEGMENT_GEOMETRY_REVIEW"]
            continue
        out.append({
            "candidateKey": key,
            "sourceStationCode": source_id,
            "sourceGroupCode": str(props["N02_005g"]),
            "canonicalNameJaCandidate": props["N02_005"],
            "lineRefCandidate": props["N02_003"],
            "operatorRefCandidate": props["N02_004"],
            "nodeKindCandidate": "shinkansen_station",
            "pointCandidate": {"longitude": point[0], "latitude": point[1]},
            "sourceGeometry": "station_line_midpoint_estimate",
            "sourceGeometryPieces": 1,
            "sourceRefs": [source_ref],
            "observedAt": SNAPSHOT,
            "identityStatus": "REVIEW_REQUIRED",
            "reasons": REASONS + ["LOCATION_GEOMETRY_REVIEW"],
            "transportNodeId": None,
            "parentHubId": None,
            "prefectureCode": None,
            "municipalityCode": None,
        })
        seen[key] = out[-1]
    return sorted(out, key=lambda item: item["candidateKey"])
def process(args):
    archive = Path(args.zip)
    source_hash = path_digest(archive)
    if args.expected_sha256 and source_hash.lower() != args.expected_sha256.lower():
        raise RuntimeError("SOURCE_CHECKSUM_MISMATCH")
    with zipfile.ZipFile(archive) as zf:
        raw = zf.read(ENTRY)
    source_id = "synthetic-fixture" if args.fixture else SOURCE
    source_ref = "synthetic-fixture" if args.fixture else SOURCE_URL
    rows = candidates(raw, source_ref)
    outdir = Path(args.output)
    batch_count = (len(rows) + BATCH_SIZE - 1) // BATCH_SIZE
    if args.batch is not None and not (1 <= args.batch <= batch_count):
        raise ValueError("batch out of range")
    manifest_batches = []
    for index in range(batch_count):
        number = index + 1
        batch_rows = rows[index * BATCH_SIZE:(index + 1) * BATCH_SIZE]
        batch_id = f"batch-{number:04}"
        body = b"".join(canonical(row) for row in batch_rows)
        input_meta = {
            "batchId": batch_id, "sourceId": source_id, "sourceArchiveSha256": source_hash,
            "sourceEntrySha256": digest(raw), "candidateKeys": [r["candidateKey"] for r in batch_rows],
            "selection": "N02_003 contains 新幹線; source components retained separately",
            "batchSize": BATCH_SIZE,
        }
        input_body = canonical(input_meta)
        input_path = outdir / "batch-inputs" / f"{batch_id}.json"
        output_path = outdir / "batches" / f"{batch_id}.jsonl"
        receipt_path = outdir / "batch-receipts" / f"{batch_id}.json"
        receipt = {
            "batchId": batch_id, "status": "PASS_CANDIDATE_QA_NOT_ADMITTED",
            "inputSha256": digest(input_body), "outputSha256": digest(body),
            "candidateCount": len(batch_rows), "acceptedCount": 0,
            "sourceArchiveSha256": source_hash,
        }
        receipt_body = canonical(receipt)
        exists = any(p.exists() for p in [input_path, output_path, receipt_path])
        should_rebuild = args.rebuild and (args.batch is None or args.batch == number)
        if args.batch is not None and args.batch != number and not exists:
            raise RuntimeError(f"MISSING_PRIOR_BATCH: {batch_id}")
        if exists and not should_rebuild:
            verify(input_path, receipt["inputSha256"])
            verify(output_path, receipt["outputSha256"])
            verify(receipt_path, digest(receipt_body))
        else:
            write_bytes(input_path, input_body)
            write_bytes(output_path, body)
            write_bytes(receipt_path, receipt_body)
        manifest_batches.append({"batchId": batch_id, "receiptSha256": digest(receipt_body)})
    decisions_body = b"".join(canonical({
        "candidateKey": row["candidateKey"], "decision": "REVIEW_REQUIRED",
        "transportNodeId": None, "reasons": row["reasons"],
    }) for row in rows)
    unresolved_body = b"".join(canonical({
        "candidateKey": row["candidateKey"], "reasons": row["reasons"],
    }) for row in rows)
    artifacts = {
        "transport-node-identity-decisions.jsonl": decisions_body,
        "transport-node-unresolved.jsonl": unresolved_body,
    }
    for name, body in artifacts.items():
        path = outdir / name
        if path.exists() and not args.rebuild:
            verify(path, digest(body))
        else:
            write_bytes(path, body)
    manifest = {
        "task": "TASK-084-B", "status": "PARTIAL_BLOCKED", "sourceId": source_id,
        "sourceUrl": source_ref, "sourceLicense": "test-only" if args.fixture else "CC BY 4.0 (2025 edition)",
        "sourceArchiveSha256": source_hash, "sourceEntrySha256": digest(raw),
        "sourceObservedAt": SNAPSHOT, "selection": "shinkansen source components only",
        "candidateCount": len(rows), "acceptedCount": 0, "batchSize": BATCH_SIZE,
        "batches": manifest_batches, "runtimeIntegration": "DEFERRED_TO_A",
        "artifactSha256": {name: digest(body) for name, body in artifacts.items()},
        "reason": "N02 station codes are latitude-order identifiers; hub/component and municipality identity remain unreviewed",
    }
    manifest_path = outdir / "manifest.json"
    manifest_body = canonical(manifest)
    if manifest_path.exists() and not args.rebuild:
        verify(manifest_path, digest(manifest_body))
    else:
        write_bytes(manifest_path, manifest_body)
    print(json.dumps({"candidateCount": len(rows), "batchCount": batch_count, "acceptedCount": 0, "sourceArchiveSha256": source_hash}))
def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--expected-sha256", default="")
    parser.add_argument("--fixture", action="store_true")
    parser.add_argument("--rebuild", action="store_true")
    parser.add_argument("--batch", type=int)
    args = parser.parse_args()
    try:
        process(args)
    except (OSError, KeyError, ValueError, zipfile.BadZipFile, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0
if __name__ == "__main__":
    raise SystemExit(main())
