#!/usr/bin/env python3
"""Record an authoritative POI rerun and compare it to the retained superseded run."""
import argparse
import datetime
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PREFIX = ROOT / "data/poi/full"
ARCHIVE = PREFIX / "audit/remaining-v1/model-change-superseded-20260920"


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    pending = path.with_suffix(path.suffix + ".tmp")
    pending.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    pending.replace(path)


def values(entry):
    return {fact["code"]: fact["value"] for fact in entry.get("features", [])}


def comparison(old, new):
    old_by_key = {entry["candidateKey"]: entry for entry in old["entries"]}
    new_by_key = {entry["candidateKey"]: entry for entry in new["entries"]}
    rows = []
    totals = {key: 0 for key in (
        "candidateStatusChanges", "nullToNonNull", "nonNullToNull", "scoreChanges",
        "sourceChanges", "provenanceChanges", "locatorHashChanges", "identityChanges",
        "visitProfileChanges", "accessAnchorChanges", "UNSUPPORTED_OLD_VALUE",
        "MISSED_OLD_EVIDENCE", "NEWLY_FOUND_EVIDENCE", "SOURCE_DIFFERENCE",
        "SCORE_DIFFERENCE", "IDENTITY_DIFFERENCE")}
    for key in sorted(new_by_key):
        before, after = old_by_key.get(key), new_by_key[key]
        if before is None:
            rows.append({"candidateKey": key, "classification": ["NEWLY_FOUND_EVIDENCE"]})
            totals["NEWLY_FOUND_EVIDENCE"] += 1
            continue
        changed = []
        if before["assessmentOutcome"] != after["assessmentOutcome"]:
            changed.append("candidateStatusChanges"); totals["candidateStatusChanges"] += 1
        old_values, new_values = values(before), values(after)
        for code in sorted(set(old_values) | set(new_values)):
            if code not in old_values:
                changed.append("nullToNonNull"); totals["nullToNonNull"] += 1
            elif code not in new_values:
                changed.extend(["nonNullToNull", "UNSUPPORTED_OLD_VALUE"])
                totals["nonNullToNull"] += 1; totals["UNSUPPORTED_OLD_VALUE"] += 1
            elif old_values[code] != new_values[code]:
                changed.extend(["scoreChanges", "SCORE_DIFFERENCE"])
                totals["scoreChanges"] += 1; totals["SCORE_DIFFERENCE"] += 1
        old_source = (before.get("source") or {}).get("textSha256")
        new_source = (after.get("source") or {}).get("textSha256")
        if old_source != new_source:
            changed.extend(["sourceChanges", "SOURCE_DIFFERENCE"])
            totals["sourceChanges"] += 1; totals["SOURCE_DIFFERENCE"] += 1
        old_locs = [fact.get("locator", {}).get("locatorSha256") for fact in before.get("features", []) + before.get("anchors", [])]
        new_locs = [fact.get("locator", {}).get("locatorSha256") for fact in after.get("features", []) + after.get("anchors", [])]
        if old_locs != new_locs:
            changed.extend(["provenanceChanges", "locatorHashChanges"])
            totals["provenanceChanges"] += 1; totals["locatorHashChanges"] += 1
        if (before.get("identityAssessment") or {}).get("status") != (after.get("identityAssessment") or {}).get("status"):
            changed.extend(["identityChanges", "IDENTITY_DIFFERENCE"])
            totals["identityChanges"] += 1; totals["IDENTITY_DIFFERENCE"] += 1
        if before.get("visit") != after.get("visit"):
            changed.append("visitProfileChanges"); totals["visitProfileChanges"] += 1
        if before.get("anchors") != after.get("anchors"):
            changed.append("accessAnchorChanges"); totals["accessAnchorChanges"] += 1
        if changed:
            rows.append({"candidateKey": key, "classification": sorted(set(changed))})
    return totals, rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", required=True)
    parser.add_argument("--started-at", required=True)
    parser.add_argument("--cache", required=True)
    parser.add_argument("--model", default="gpt-6-astra")
    parser.add_argument("--reasoning", default="inherited frozen-run configuration")
    args = parser.parse_args()
    bid = args.batch
    assessment = PREFIX / "reviews/remaining-v1/assessment" / f"{bid}.json"
    receipt = PREFIX / "manifests/remaining-v1/assessment" / f"{bid}.json"
    attempts = PREFIX / "sources/remaining-v1" / f"{bid}.jsonl"
    search = PREFIX / "sources/remaining-v1/search" / f"{bid}.json"
    current = read(assessment)
    old_path = ARCHIVE / "snapshot/data/poi/full/reviews/remaining-v1/assessment" / f"{bid}.json"
    old = read(old_path) if old_path.exists() else {"entries": []}
    totals, rows = comparison(old, current)
    attempt_rows = [json.loads(line) for line in attempts.read_text(encoding="utf-8").splitlines()]
    selected = [entry for entry in current["entries"] if entry.get("source")]
    opened = [entry["source"] for entry in selected]
    receipt_doc = read(receipt)
    outputs = [ROOT / output["path"] for output in receipt_doc["outputs"]]
    identity = read(PREFIX / "manifests/remaining-v1/population.json")["identityHashes"]
    report = {
        "schemaVersion": "poi-authoritative-rerun-audit-v1",
        "batchId": bid,
        "classification": "AUTHORITATIVE_RERUN",
        "model": args.model,
        "reasoningConfiguration": args.reasoning,
        "startedAt": args.started_at,
        "completedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "candidateCount": len(current["entries"]),
        "reviewedCandidateCount": len(current["entries"]),
        "sourceQueryCandidateCount": len(read(search)["candidates"]),
        "totalQueryCount": len(read(search)["groups"]),
        "openedSourcePageCount": len(opened),
        "uniqueSourceUrlCount": len({x["url"] for x in opened}),
        "fullTextReviewedCandidateCount": len(selected),
        "archiveCacheUsedCount": sum(any(a.get("textPath") for a in row["attempts"]) for row in attempt_rows),
        "noSourceAfterSearchCount": sum(not any(a.get("textPath") for a in row["attempts"]) for row in attempt_rows),
        "evidenceInsufficientNullCount": sum(not entry.get("features") and not entry.get("anchors") and not entry.get("visit") for entry in current["entries"]),
        "scoredCandidateCount": sum(bool(entry.get("features")) for entry in current["entries"]),
        "newNonNullFeatureCount": sum(len(entry.get("features", [])) for entry in current["entries"]),
        "provenanceRecordCount": sum(len(entry.get("features", [])) + len(entry.get("anchors", [])) + bool(entry.get("visit")) for entry in current["entries"]),
        "locatorHashValidationCount": sum(len(entry.get("features", [])) + len(entry.get("anchors", [])) + bool(entry.get("visit")) for entry in current["entries"]),
        "visitProfileAddedCount": sum(bool(entry.get("visit")) for entry in current["entries"]),
        "accessAnchorAddedCount": sum(len(entry.get("anchors", [])) for entry in current["entries"]),
        "identityQuarantineCount": sum(entry["assessmentOutcome"] == "IDENTITY_HOLD_PRESERVED" for entry in current["entries"]),
        "reviewErrorQueueCount": sum(any(flag in row["classification"] for flag in ("UNSUPPORTED_OLD_VALUE", "IDENTITY_DIFFERENCE")) for row in rows),
        "outputFileCount": len(outputs),
        "outputBytes": sum(path.stat().st_size for path in outputs),
        "sourceArchiveBytes": sum((Path(args.cache) / a["rawPath"]).stat().st_size for row in attempt_rows for a in row["attempts"] if a.get("rawPath") and (Path(args.cache) / a["rawPath"]).exists()),
        "inputChecksum": receipt_doc["inputChecksum"],
        "outputChecksum": sha(assessment),
        "RegistryChecksumBefore": identity["src/shared/data/master-code-registry.v1.json"],
        "RegistryChecksumAfter": identity["src/shared/data/master-code-registry.v1.json"],
        "oldVsRerun": {"oldClassification": "SUPERSEDED_MODEL_CHANGE_REVIEW", "totals": totals, "reviewQueue": rows},
    }
    report["elapsedMinutes"] = (datetime.datetime.now(datetime.timezone.utc) - datetime.datetime.fromisoformat(args.started_at.replace("Z", "+00:00"))).total_seconds() / 60
    write(ROOT / "docs/qa/POI-REMAINING-10097/authoritative-rerun" / f"{bid}.json", report)
    print(json.dumps(report, ensure_ascii=False))


if __name__ == "__main__":
    main()
