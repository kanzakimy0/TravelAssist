#!/usr/bin/env python3
"""Freeze the TASK-071 priority populations from the authoritative pending ledger.

The script deliberately creates only task sidecars.  It never alters a
candidate key, the Registry, a Master Code, or the existing remaining-v1
candidate view.
"""
import argparse
import hashlib
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
PENDING = ROOT / "data/poi/full/reviews/remaining-v1/pending"
OUT = ROOT / "data/poi/full/manifests/task-071"
POPULATION = ROOT / "data/poi/full/manifests/remaining-v1/population.json"
SUMMARY = ROOT / "docs/qa/POI-REMAINING-10097/review-summary.json"

PHASES = (
    ("A", "TARGET_IDENTITY_UNRESOLVED", 6049),
    ("B", "IDENTITY_CONFLICT", 165),
    ("C", "REVIEWED_TARGET_NO_SUPPORTED_FACT", 1422),
    ("D", "UNSUPPORTED_FIELDS_REMAIN_NULL", 2461),
)


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def encode(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode()


def atomic(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and path.read_bytes() == data:
        return
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_bytes(data)
    temp.replace(path)


def all_pending():
    rows = []
    for path in sorted(PENDING.glob("R-*.jsonl")):
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
    assert len(rows) == 10097
    assert len({row["candidateKey"] for row in rows}) == 10097
    return rows


def build():
    population = json.loads(POPULATION.read_text(encoding="utf-8"))
    summary = json.loads(SUMMARY.read_text(encoding="utf-8"))
    assert population["count"] == summary["population"] == 10097
    rows = all_pending()
    by_reason = {reason: [] for _, reason, _ in PHASES}
    for row in rows:
        by_reason[row["reasonCode"]].append(row)
    assert set(by_reason) == {row["reasonCode"] for row in rows}
    assert sum(len(v) for v in by_reason.values()) == 10097

    manifest_paths = []
    for phase, reason, expected in PHASES:
        selected = sorted(by_reason[reason], key=lambda row: row["candidateKey"])
        assert len(selected) == expected
        batches = []
        for offset in range(0, len(selected), 200):
            members = selected[offset : offset + 200]
            number = offset // 200 + 1
            batches.append(
                {
                    "batchId": f"TASK-071-{phase}-{number:04d}",
                    "phase": phase,
                    "reasonCode": reason,
                    "count": len(members),
                    "candidateKeys": [row["candidateKey"] for row in members],
                    "candidateKeysSha256": sha(
                        json.dumps(
                            [row["candidateKey"] for row in members],
                            ensure_ascii=False,
                            separators=(",", ":"),
                        ).encode()
                    ),
                }
            )
        manifest = {
            "schemaVersion": "task-071-phase-manifest-v1",
            "phase": phase,
            "reasonCode": reason,
            "candidateCount": len(selected),
            "batchSize": 200,
            "batchCount": len(batches),
            "order": "candidateKey ascending Unicode code-point order",
            "candidateKeys": [row["candidateKey"] for row in selected],
            "candidateKeysSha256": sha(
                json.dumps(
                    [row["candidateKey"] for row in selected],
                    ensure_ascii=False,
                    separators=(",", ":"),
                ).encode()
            ),
            "upstream": {
                "authoritativeHead": "df6d253ecba58e28afa12b79751c72414315acb2",
                "reviewSummarySha256": sha(SUMMARY.read_bytes()),
                "pendingLedgerSha256": sha(
                    json.dumps(rows, ensure_ascii=False, separators=(",", ":")).encode()
                ),
                "protectedIdentityChecksums": population["identityHashes"],
            },
            "batches": batches,
        }
        path = OUT / f"phase-{phase}.json"
        atomic(path, encode(manifest))
        manifest_paths.append(path.relative_to(ROOT).as_posix())

    index = {
        "schemaVersion": "task-071-phase-index-v1",
        "totalCandidates": 10097,
        "totalBatches": sum(
            len(json.loads((ROOT / path).read_text(encoding="utf-8"))["batches"])
            for path in manifest_paths
        ),
        "phaseOrder": [phase for phase, _, _ in PHASES],
        "phaseManifests": manifest_paths,
        "protectedIdentityChecksums": population["identityHashes"],
    }
    atomic(OUT / "index.json", encode(index))
    return index


def check():
    index = build()
    assert index["totalBatches"] == 53
    for phase, reason, expected in PHASES:
        path = OUT / f"phase-{phase}.json"
        manifest = json.loads(path.read_text(encoding="utf-8"))
        assert manifest["reasonCode"] == reason
        assert manifest["candidateCount"] == expected
        assert len(manifest["candidateKeys"]) == expected
        assert sum(batch["count"] for batch in manifest["batches"]) == expected
        assert all(1 <= batch["count"] <= 200 for batch in manifest["batches"])
        assert manifest["candidateKeys"] == sorted(manifest["candidateKeys"])
    print(json.dumps(index, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.check:
        check()
    else:
        print(json.dumps(build(), ensure_ascii=False))
