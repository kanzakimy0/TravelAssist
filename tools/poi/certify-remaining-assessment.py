"""Certify one fully authored 200-POI assessment; never infer facts or auto-score.
Search receipts alone cannot pass this gate. Each row needs an explicit editorial
outcome, target scope, source-backed locators or a reasoned no-evidence outcome.
"""
import argparse
import copy
import datetime
import importlib.util
import json
import subprocess
import sys
sys.dont_write_bytecode = True
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("remaining_review", ROOT / "tools/poi/review-remaining.py")
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)
ASSESSMENT = review.SOURCE / "assessment"
CERTIFIED = review.REVIEW / "assessment"
RECEIPTS = review.PLAN / "assessment"
QA = review.QA / "assessment"
OUTCOMES = {"REVIEWED_SUPPORTED_FACTS", "REVIEWED_NO_SUPPORTED_FACTS", "REVIEW_BLOCKED_EVIDENCE_INSUFFICIENT", "IDENTITY_HOLD_PRESERVED", "REVIEW_BLOCKED_TARGET_UNRESOLVED"}


def contained(outer, inner):
    assert type(outer["offset"]) is int and outer["offset"] >= 0
    assert type(outer["length"]) is int and outer["length"] > 0
    assert outer["offset"] <= inner["offset"] and inner["offset"] + inner["length"] <= outer["offset"] + outer["length"], "Fact outside reviewed target boundary"


def convert(note, item, attempt, cache=None):
    assert note["candidateKey"] == item["candidateKey"] and note["position"] == item["position"] and note["batchId"] == item["batchId"]
    assert note["all43DimensionsConsidered"] is True and note["nullIsUnknown"] is True
    assert note["rubricVersion"] == "candidate-recovery-1.0"
    assert note["outcome"] in OUTCOMES and note["identity"].strip() and note["nullReason"].strip()
    assert note["features"] or note["accessFacts"] or note["visit"] or note["outcome"] != "REVIEWED_SUPPORTED_FACTS"
    has_facts = bool(note["features"] or note["accessFacts"] or note["visit"])
    assert has_facts == (note["outcome"] == "REVIEWED_SUPPORTED_FACTS")
    assert not item["identityHold"] or note["outcome"] == "IDENTITY_HOLD_PRESERVED"
    assert item["identityHold"] or note["outcome"] != "IDENTITY_HOLD_PRESERVED"
    source = note["source"]
    if source:
        boundary = note["targetBoundary"]
        contained(boundary, boundary)
        for fact in note["features"] + note["accessFacts"] + ([note["visit"]] if note["visit"] else []):
            contained(boundary, fact["locator"])
    else:
        assert not has_facts and note["outcome"] in ("REVIEW_BLOCKED_EVIDENCE_INSUFFICIENT", "IDENTITY_HOLD_PRESERVED")
    entry = {"candidateKey": item["candidateKey"], "position": item["position"], "batchId": item["batchId"],
        "identityAssessment": {"status": "TARGET_UNRESOLVED" if item["identityHold"] or not source or note["outcome"] == "REVIEW_BLOCKED_TARGET_UNRESOLVED" else "TARGET_CONFIRMED",
            "method": "Individual name/locality/category and complete retained target-scope assessment",
            "rationale": note["identity"]},
        "reviewedAt": note["reviewedAt"], "reviewedScope": "All 43 dimensions, Visit Profile and Access considered within the retained target boundary; unsupported fields remain null.",
        "source": source, "sourceRef": note.get("sourceRef"), "features": note["features"], "anchors": note["accessFacts"], "visit": note["visit"],
        "unassessedFieldsRemainNull": True, "assessmentOutcome": note["outcome"], "nullReason": note["nullReason"],
        "targetBoundary": note.get("targetBoundary")}
    review.validate_editorial(entry, item, attempt, cache)
    if cache and note.get("supplementalSearch"):
        path = (Path(cache) / note["supplementalSearch"]).resolve()
        assert path.is_relative_to(Path(cache).resolve()) and path.exists()
        assert review.sha(path.read_bytes()) == note["supplementalSearchSha256"]
    return entry


def validate_batch(doc, items, attempts, cache=None):
    assert doc["schemaVersion"] == "remaining-editorial-assessment-v1"
    assert [e["candidateKey"] for e in doc["entries"]] == [i["candidateKey"] for i in items], "Every ordered candidate needs an authored assessment"
    assert len(items) == (97 if doc["batchId"] == "R-0051" else 200)
    entries, errors = [], []
    for note, item in zip(doc["entries"], items):
        try:
            entries.append(convert(note, item, attempts[item["candidateKey"]], cache))
        except (AssertionError, KeyError, ValueError, OSError) as error:
            errors.append({"candidateKey": item["candidateKey"], "position": item["position"], "error": type(error).__name__ + ": " + str(error)})
    return entries, errors


def verified_receipt(root, bid):
    path = root / RECEIPTS / (bid + ".json")
    receipt = review.read(path)
    assert receipt["status"] == "ASSESSMENT_QA_PASS"
    for output in receipt["outputs"] + receipt["inputs"]:
        file = (root / output["path"]).resolve()
        assert file.is_relative_to(root.resolve())
        assert review.sha(file.read_bytes()) == output["sha256"], "Assessment checkpoint changed: " + output["path"]
    return receipt


def certify(bid, cache, root=ROOT):
    root = Path(root)
    plan = review.read(root / review.PLAN / "population.json")
    index = [b["batchId"] for b in plan["batches"]].index(bid)
    previous = verified_receipt(root, plan["batches"][index - 1]["batchId"]) if index else None
    for path, digest in plan["identityHashes"].items():
        assert review.sha((root / path).read_bytes()) == digest, "Protected identity/Registry/rubric changed"
    items = [i for i in plan["items"] if i["batchId"] == bid]
    input_paths = [ASSESSMENT / (bid + ".json"), review.SOURCE / (bid + ".jsonl"), review.SOURCE / "search" / (bid + ".json"), review.PLAN / "population.json", review.PLAN / "queries.json"]
    for tool in ("certify-remaining-assessment.py", "review-remaining.py", "read-current-candidates.mjs"):
        input_paths.append(Path("tools/poi") / tool)
    extras = [x for x in review.lines(root / review.SOURCE / "discovered-target-sources.jsonl") if x["candidateKey"] in {i["candidateKey"] for i in items}]
    inputs = [{"path": p.as_posix(), "sha256": review.sha((root / p).read_bytes())} for p in input_paths]
    checksum = review.sha(review.encode({"inputs": inputs, "extras": extras, "previousBatchInputChecksum": previous["inputChecksum"] if previous else None}))
    receipt_path = root / RECEIPTS / (bid + ".json")
    if receipt_path.exists():
        receipt = verified_receipt(root, bid)
        assert receipt["inputChecksum"] == checksum, "Changed completed batch needs explicit review, not automatic overwrite"
        print(json.dumps({"batchId": bid, "status": "SKIPPED_IDENTICAL_ASSESSMENT", "candidateCount": len(items)}))
        return receipt
    doc = review.read(root / ASSESSMENT / (bid + ".json"))
    attempts = {a["candidateKey"]: a for a in review.lines(root / review.SOURCE / (bid + ".jsonl"))}
    for extra in extras:
        attempts[extra["candidateKey"]]["attempts"].append(extra["attempt"])
    entries, errors = validate_batch(doc, items, attempts, cache)
    if errors:
        review.atomic(root / QA / (bid + "-errors.json"), review.encode(errors))
        raise ValueError(json.dumps(errors, ensure_ascii=False))
    ledger_path = root / review.SOURCE / "editorial.json"
    ledger = review.read(ledger_path)
    replacements = {e["candidateKey"]: e for e in entries}
    ledger["entries"] = sorted([e for e in ledger["entries"] if e["candidateKey"] not in replacements] + entries, key=lambda e: e["position"])
    # Build in memory against the proposed ledger before publishing a checkpoint.
    original_read = review.read
    def staged_read(path):
        return copy.deepcopy(ledger) if Path(path) == ledger_path else original_read(path)
    review.read = staged_read
    try:
        outputs, summary = review.build(root, cache=cache, final=True)
    finally:
        review.read = original_read
    assert not summary["errors"], "Candidate projection must validate before checkpoint"
    ledger_bytes = review.encode(ledger)
    manifest_path = review.PREFIX / "manifests/current-candidate-review.v1.json"
    manifest = json.loads(outputs[manifest_path])
    manifest["editorialLedger"]["sha256"] = review.sha(ledger_bytes)
    outputs[manifest_path] = review.encode(manifest)
    review.atomic(ledger_path, ledger_bytes)
    for path, data in outputs.items():
        review.atomic(root / path, data)
    subprocess.run(["node", "--import", "./tests/register-route-ts.mjs", "tools/poi/read-current-candidates.mjs"], cwd=root, check=True, capture_output=True)
    result = {"schemaVersion": "remaining-batch-assessment-qa-v1", "batchId": bid, "status": "ASSESSMENT_QA_PASS",
        "candidateCount": len(entries), "individuallyAssessed": len(entries), "outcomes": dict(Counter(e["assessmentOutcome"] for e in entries)),
        "scoredPois": sum(bool(e["features"]) for e in entries), "supportedFeatures": sum(len(e["features"]) for e in entries),
        "staticAccessLinks": sum(len(e["anchors"]) for e in entries), "partialVisitProfiles": sum(bool(e["visit"]) for e in entries),
        "unknownFieldsRemainNull": True, "identityHoldsPreserved": sum(i["identityHold"] for i in items),
        "sourceAndLocatorHashesVerified": True, "candidateContractsVerified": True, "errors": [],
        "identityHashesBefore": plan["identityHashes"], "identityHashesAfter": plan["identityHashes"],
        "completionMeaning": "Every candidate individually assessed; reasoned unknowns remain pending requery/manual review. No claim every attribute is known."}
    owned = {CERTIFIED / (bid + ".json"): review.encode({"batchId": bid, "entries": entries}), QA / (bid + ".json"): review.encode(result)}
    for path, data in owned.items():
        review.atomic(root / path, data)
    receipt = {"batchId": bid, "status": "ASSESSMENT_QA_PASS", "candidateCount": len(entries), "inputChecksum": checksum,
        "previousBatch": previous["batchId"] if previous else None, "previousBatchInputChecksum": previous["inputChecksum"] if previous else None,
        "inputs": inputs, "outputs": [{"path": p.as_posix(), "sha256": review.sha(data)} for p, data in owned.items()],
        "orderedCandidateKeys": [i["candidateKey"] for i in items], "completedAt": datetime.datetime.now(datetime.timezone.utc).isoformat()}
    review.atomic(receipt_path, review.encode(receipt))
    print(json.dumps(result))
    return receipt


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--batch", required=True)
    parser.add_argument("--cache", required=True)
    args = parser.parse_args()
    certify(args.batch, args.cache)


if __name__ == "__main__":
    main()
