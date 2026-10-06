"""Offline fault tests; network transport is forbidden in this suite."""
import copy
import importlib.util
import json
import pathlib
import sys
import tempfile
import types
import unittest
from unittest import mock

sys.dont_write_bytecode = True
ROOT = pathlib.Path(__file__).resolve().parents[1]
def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

review = load("remaining_review", "tools/poi/review-remaining.py")
search = load("remaining_search", "tools/poi/index-remaining-search.py")
with mock.patch.dict(sys.modules, {"requests": types.SimpleNamespace(Session=lambda: (_ for _ in ()).throw(AssertionError("Network forbidden")))}):
    acquire = load("remaining_acquire", "tools/poi/acquire-remaining-evidence.py")

class EvidenceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = review.read(ROOT / review.PLAN / "population.json")
        cls.entry = next(e for e in review.read(ROOT / review.SOURCE / "editorial.json")["entries"] if e["features"])
        cls.item = next(i for i in cls.plan["items"] if i["candidateKey"] == cls.entry["candidateKey"])
        cls.attempt = next(a for a in review.lines(ROOT / review.SOURCE / (cls.item["batchId"] + ".jsonl")) if a["candidateKey"] == cls.item["candidateKey"])

    def test_scope_is_exactly_fifty_full_batches_and_97(self):
        self.assertEqual([b["count"] for b in self.plan["batches"]], [200] * 50 + [97])
        self.assertEqual(len({i["candidateKey"] for i in self.plan["items"]}), 10097)
        self.assertEqual(sum(i["identityHold"] for i in self.plan["items"]), 165)

    def test_missing_confidence_locator_or_changed_source_rejected(self):
        review.validate_editorial(self.entry, self.item, self.attempt)
        mutations = [
            lambda e: e["features"][0].update(confidence=2),
            lambda e: e["features"][0].update(value=10),
            lambda e: e["features"][0].update(code="44"),
            lambda e: e["features"][0].update(reason=""),
            lambda e: e["features"][0]["locator"].update(offset=-1),
            lambda e: e["source"].update(textSha256="0" * 64),
            lambda e: e["features"].append(copy.deepcopy(e["features"][0])),
            lambda e: e["identityAssessment"].update(status="TARGET_UNRESOLVED"),
        ]
        for mutate in mutations:
            entry = copy.deepcopy(self.entry)
            mutate(entry)
            with self.assertRaises((AssertionError, KeyError)):
                review.validate_editorial(entry, self.item, self.attempt)

    def test_identity_hold_cannot_receive_attributes(self):
        item = {**self.item, "identityHold": True}
        with self.assertRaisesRegex(AssertionError, "Identity hold"):
            review.validate_editorial(self.entry, item, self.attempt)
        entry = copy.deepcopy(self.entry)
        entry["identityAssessment"]["status"] = "TARGET_UNRESOLVED"
        entry["features"] = []
        review.validate_editorial(entry, item, self.attempt)

    def test_locator_checks_actual_utf16_bytes_and_cache_path(self):
        with tempfile.TemporaryDirectory(prefix="travelassist-remaining-test-") as d:
            cache = pathlib.Path(d).resolve()
            self.assertTrue(cache.is_relative_to(pathlib.Path(tempfile.gettempdir()).resolve()))
            text = "prefix \U0001f3ef reviewed body"
            needle = "reviewed body"
            entry = copy.deepcopy(self.entry)
            entry.pop("targetBoundary", None)
            source = entry["source"]
            source.update(textPath="target.txt", textSha256=review.sha(text.encode()))
            entry["sourceRef"] = "remaining-source:" + source["textSha256"][:24]
            (cache / "target.txt").write_text(text, encoding="utf-8")
            fact = entry["features"][0]
            fact["locator"] = {"offset": len(text[:text.index(needle)].encode("utf-16-le")) // 2, "length": len(needle), "locatorSha256": review.sha(needle.encode())}
            entry["features"] = [fact]
            source["rawSha256"] = review.sha(b"raw fixture")
            (cache / "target.bin").write_bytes(b"raw fixture")
            attempt = {"attempts": [{**source, "rawPath": "target.bin"}]}
            review.validate_editorial(entry, self.item, attempt, cache)
            fact["locator"]["locatorSha256"] = "0" * 64
            with self.assertRaisesRegex(AssertionError, "Locator content"):
                review.validate_editorial(entry, self.item, attempt, cache)
            source["textPath"] = "../escape.txt"
            attempt["attempts"][0]["textPath"] = source["textPath"]
            with self.assertRaisesRegex(AssertionError, "Cache path"):
                review.validate_editorial(entry, self.item, attempt, cache)

    def test_completed_cache_is_reused_but_corrupt_text_is_refetched(self):
        with tempfile.TemporaryDirectory(prefix="travelassist-remaining-test-") as d:
            cache = pathlib.Path(d).resolve()
            self.assertTrue(cache.is_relative_to(pathlib.Path(tempfile.gettempdir()).resolve()))
            fetch = acquire.Fetcher(cache)
            url = "https://example.com/target"
            calls = []
            def get(*args):
                calls.append(args)
                return 200, url, "text/html", b"<h1>Target</h1><p>retained body</p>"
            with mock.patch.object(fetch, "get", side_effect=get), mock.patch.object(fetch, "robot", return_value=(True, {})), mock.patch.object(acquire, "public_url", return_value=True), mock.patch.object(acquire.time, "sleep"):
                first = fetch.fetch(url)
                self.assertEqual(first["status"], "FETCHED_UNREVIEWED")
                self.assertEqual(fetch.fetch(url), first)
                self.assertEqual(len(calls), 1)
                (cache / first["textPath"]).write_text("tampered", encoding="utf-8")
                recovered = fetch.fetch(url)
                self.assertEqual(len(calls), 2)
                self.assertEqual(acquire.sha((cache / recovered["textPath"]).read_bytes()), recovered["textSha256"])

    def test_single_fetch_failure_is_a_record_then_next_candidate_runs(self):
        with tempfile.TemporaryDirectory(prefix="travelassist-remaining-test-") as d:
            cache = pathlib.Path(d).resolve()
            self.assertTrue(cache.is_relative_to(pathlib.Path(tempfile.gettempdir()).resolve()))
            fetch = acquire.Fetcher(cache)
            with mock.patch.object(fetch, "get", side_effect=[TimeoutError("fixture"), (200, "https://example.com/good", "text/plain", b"good")]), mock.patch.object(fetch, "robot", return_value=(True, {})), mock.patch.object(acquire, "public_url", return_value=True), mock.patch.object(acquire.time, "sleep"):
                self.assertEqual(fetch.fetch("https://example.com/bad")["status"], "FETCH_ERROR")
                self.assertEqual(fetch.fetch("https://example.com/good")["status"], "FETCHED_UNREVIEWED")

    def test_one_invalid_editorial_candidate_is_queued_without_changing_others(self):
        normal_outputs, normal = review.build()
        original_read = review.read
        def corrupt_one(path):
            value = original_read(path)
            if pathlib.Path(path) == ROOT / review.SOURCE / "editorial.json":
                value = copy.deepcopy(value)
                entry = next(e for e in value["entries"] if e["features"])
                entry["features"][0]["value"] = 10
            return value
        with mock.patch.object(review, "read", side_effect=corrupt_one):
            fault_outputs, report = review.build()
        self.assertEqual(len(report["errors"]), 1)
        failed = report["errors"][0]["candidateKey"]
        path = review.REVIEW / "feature-delta.jsonl"
        before = [json.loads(x) for x in normal_outputs[path].decode().splitlines()]
        after = [json.loads(x) for x in fault_outputs[path].decode().splitlines()]
        self.assertEqual(after, [r for r in before if r["candidateKey"] != failed])
        self.assertEqual(report["identityHashesBefore"], report["identityHashesAfter"])
        self.assertLess(report["featuresAdded"], normal["featuresAdded"])

    def test_invalid_receipt_timestamp_is_repaired_without_trusting_it(self):
        outputs, _ = review.build()
        path = review.PLAN / "R-0001-review.json"
        bad = json.loads(outputs[path])
        bad["completedAt"] = "invalid-date"
        original_read = review.read
        def previous(path_arg):
            return copy.deepcopy(bad) if pathlib.Path(path_arg) == ROOT / path else original_read(path_arg)
        with mock.patch.object(review, "read", side_effect=previous):
            recovered, _ = review.build()
        fixed = json.loads(recovered[path])
        self.assertNotEqual(fixed["completedAt"], "invalid-date")
        self.assertEqual(fixed["inputChecksum"], bad["inputChecksum"])
        self.assertEqual(fixed["outputs"], bad["outputs"])

    def test_search_urls_preserve_parentheses_and_never_become_identity_proof(self):
        text = "Temple (https://en.wikipedia.org/wiki/Temple_(Japan))\nother (https://example.com/a)\n"
        self.assertEqual(search.extract_urls(text), ["https://en.wikipedia.org/wiki/Temple_(Japan)", "https://example.com/a"])

    def test_private_hosts_and_credentials_rejected_before_transport(self):
        for url in ["file:///etc/passwd", "https://u:p@example.com", "https://example.com:444"]:
            with self.assertRaises(ValueError):
                acquire.public_url(url)
        with mock.patch.object(acquire.socket, "getaddrinfo", return_value=[(2,1,6,"",("127.0.0.1",443))]):
            with self.assertRaisesRegex(ValueError, "NON_PUBLIC"):
                acquire.public_url("https://example.com/private")

assessment = load("remaining_assessment", "tools/poi/certify-remaining-assessment.py")

class AssessmentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.plan = review.read(ROOT / review.PLAN / "population.json")
        cls.items = [i for i in cls.plan["items"] if i["batchId"] == "R-0001"]
        cls.doc = review.read(ROOT / assessment.ASSESSMENT / "R-0001.json")
        cls.attempts = {a["candidateKey"]: a for a in review.lines(ROOT / review.SOURCE / "R-0001.jsonl")}
        for extra in review.lines(ROOT / review.SOURCE / "discovered-target-sources.jsonl"):
            if extra["candidateKey"] in cls.attempts:
                cls.attempts[extra["candidateKey"]]["attempts"].append(extra["attempt"])

    def test_partial_or_reordered_batch_cannot_pass_as_complete(self):
        for entries in (self.doc["entries"][:-1], list(reversed(self.doc["entries"]))):
            with self.assertRaisesRegex(AssertionError, "Every ordered"):
                assessment.validate_batch({**self.doc, "entries": entries}, self.items, self.attempts)

    def test_one_annotation_error_does_not_prevent_checking_other_199(self):
        doc = copy.deepcopy(self.doc)
        doc["entries"][0]["features"][0]["locator"]["offset"] = 0
        entries, errors = assessment.validate_batch(doc, self.items, self.attempts)
        self.assertEqual(len(entries), 199)
        self.assertEqual(len(errors), 1)
        self.assertIn("outside reviewed target", errors[0]["error"])

    def test_no_evidence_or_identity_hold_cannot_acquire_a_default_fact(self):
        doc = copy.deepcopy(self.doc)
        unknown = next(e for e in doc["entries"] if e["source"] is None)
        item = next(i for i in self.items if i["candidateKey"] == unknown["candidateKey"])
        unknown["features"] = copy.deepcopy(doc["entries"][0]["features"])
        with self.assertRaises(AssertionError):
            assessment.convert(unknown, item, self.attempts[item["candidateKey"]])
        sourced = doc["entries"][0]
        with self.assertRaises(AssertionError):
            assessment.convert(sourced, {**self.items[0], "identityHold": True}, self.attempts[self.items[0]["candidateKey"]])

    def test_receipt_rejects_missing_predecessor_or_corrupted_owned_output(self):
        with tempfile.TemporaryDirectory(prefix="travelassist-assessment-test-") as d:
            root = pathlib.Path(d)
            with self.assertRaises(FileNotFoundError):
                assessment.verified_receipt(root, "R-0001")
            output = pathlib.Path("out.json")
            review.atomic(root / output, b"original")
            receipt = {"status": "ASSESSMENT_QA_PASS", "inputs": [], "outputs": [{"path": output.as_posix(), "sha256": review.sha(b"original")}]}
            review.atomic(root / assessment.RECEIPTS / "R-0001.json", review.encode(receipt))
            assessment.verified_receipt(root, "R-0001")
            review.atomic(root / output, b"corrupt")
            with self.assertRaisesRegex(AssertionError, "checkpoint changed"):
                assessment.verified_receipt(root, "R-0001")

if __name__ == "__main__":
    unittest.main()
