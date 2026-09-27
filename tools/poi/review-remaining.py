"""Build resumable pending-review lists and a versioned candidate-only evidence delta.
The TASK-070 baseline remains immutable; this continuation never imports into runtime.
"""
import argparse, copy, datetime, hashlib, json, math, unicodedata
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PREFIX = Path("data/poi/full")
PLAN = PREFIX / "manifests/remaining-v1"
SOURCE = PREFIX / "sources/remaining-v1"
REVIEW = PREFIX / "reviews/remaining-v1"
QA = Path("docs/qa/POI-REMAINING-10097")
CODES = [str(n).zfill(2) for n in range(1, 44)]

def sha(data):
    return hashlib.sha256(data).hexdigest()

def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))

def lines(path):
    return [json.loads(s) for s in Path(path).read_text(encoding="utf-8").splitlines() if s.strip()]

def encode(obj):
    return (json.dumps(obj, ensure_ascii=False, indent=2) + "\n").encode()

def jsonl(rows):
    return "".join(json.dumps(r, ensure_ascii=False, separators=(",", ":")) + "\n" for r in rows).encode()

def atomic(path, data):
    path = Path(path)
    if path.exists() and path.read_bytes() == data:
        return False
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(path.suffix + ".tmp")
    temp.write_bytes(data)
    temp.replace(path)
    return True

def validate_editorial(entry, item, attempt, cache=None):
    assert entry["candidateKey"] == item["candidateKey"]
    if item["identityHold"]:
        assert entry["identityAssessment"]["status"] == "TARGET_UNRESOLVED" and not entry["features"] and not entry["anchors"] and entry["visit"] is None, "Identity hold cannot be released by attribute review"
    assert entry["identityAssessment"]["status"] in ("TARGET_CONFIRMED", "TARGET_UNRESOLVED")
    if entry["identityAssessment"]["status"] == "TARGET_UNRESOLVED":
        assert not entry["features"] and not entry["anchors"] and entry["visit"] is None
    assert entry["identityAssessment"]["rationale"].strip()
    assert entry["reviewedScope"] and entry["unassessedFieldsRemainNull"] is True
    datetime.datetime.fromisoformat(entry["reviewedAt"].replace("Z", "+00:00"))
    source = entry["source"]
    if source is None:
        assert not entry["features"] and not entry["anchors"] and entry["visit"] is None
        assert entry.get("assessmentOutcome") in ("REVIEW_BLOCKED_EVIDENCE_INSUFFICIENT", "IDENTITY_HOLD_PRESERVED")
        assert entry.get("nullReason") and attempt["attempts"], "Missing source needs actual failed/insufficient attempts"
        return
    matched = next((a for a in attempt["attempts"] if a.get("url") == source["url"] and a.get("textSha256") == source["textSha256"]), None)
    assert matched is not None, "Source must have an actual retained acquisition"
    assert all(source[k] == matched.get(k) for k in ("url", "finalUrl", "retrievedAt", "rawSha256", "textSha256", "textPath")), "Source provenance differs from retained acquisition"
    assert entry["sourceRef"] == "remaining-source:" + source["textSha256"][:24]
    features = entry["features"]
    assert len({f["code"] for f in features}) == len(features)
    for anchor in entry["anchors"]:
        assert anchor["type"] in ("rail_station", "bus_stop", "tram_stop", "port")
        assert anchor["mode"] in ("walk", "bus", "tram", "road", "ferry")
        assert anchor["scope"].strip() and anchor["name"].strip()
    if entry["visit"]:
        visit = entry["visit"]
        assert visit["visitMode"] in ("full_visit", "guided_visit")
        durations = [visit[k] for k in ("minimumDurationMinutes", "recommendedDurationMinutes", "maximumUsefulDurationMinutes")]
        assert any(v is not None for v in durations)
        assert all(v is None or type(v) is int and 0 < v <= 10080 for v in durations)
        known = [v for v in durations if v is not None]
        assert known == sorted(known), "Invalid duration order"
    raw = None
    if cache is not None:
        path = (Path(cache) / source["textPath"]).resolve()
        assert path.is_relative_to(Path(cache).resolve()), "Cache path escape"
        raw = path.read_text(encoding="utf-8")
        assert sha(raw.encode()) == source["textSha256"], "Source content changed"
        raw_path = (Path(cache) / matched["rawPath"]).resolve()
        assert raw_path.is_relative_to(Path(cache).resolve()), "Raw cache path escape"
        assert sha(raw_path.read_bytes()) == source["rawSha256"], "Raw source content changed"
    for f in features:
        assert f["code"] in CODES and type(f["value"]) is int and 0 <= f["value"] <= 9
        assert f["annotationMethod"] == "editorial_calibration"
    located = features + entry["anchors"] + ([entry["visit"]] if entry["visit"] else [])
    if entry.get("targetBoundary"):
        located += [{"reason": "Reviewed target text boundary", "confidence": 1, "locator": entry["targetBoundary"]}]
    for f in located:
        boundary = entry.get("targetBoundary")
        if boundary:
            loc = f["locator"]
            assert boundary["offset"] <= loc["offset"] and loc["offset"] + loc["length"] <= boundary["offset"] + boundary["length"], "Fact outside reviewed target boundary"
        assert f["reason"].strip() and type(f["confidence"]) in (int, float) and math.isfinite(f["confidence"]) and 0 <= f["confidence"] <= 1
        loc = f["locator"]
        assert type(loc["offset"]) is int and loc["offset"] >= 0
        assert type(loc["length"]) is int and loc["length"] > 0
        assert len(loc["locatorSha256"]) == 64 and all(c in "0123456789abcdef" for c in loc["locatorSha256"])
        if raw is not None:
            utf16 = raw.encode("utf-16-le")
            start, end = loc["offset"] * 2, (loc["offset"] + loc["length"]) * 2
            assert end <= len(utf16), "Locator exceeds source"
            assert sha(utf16[start:end].decode("utf-16-le").encode()) == loc["locatorSha256"], "Locator content changed"

def anchor_ref(anchor):
    def norm(value):
        return "".join(c for c in unicodedata.normalize("NFKC", value).lower() if not (c.isspace() or unicodedata.category(c)[0] in "PZ"))
    return "candidate-anchor:" + sha((anchor["type"] + "|" + norm(anchor["scope"]) + "|" + norm(anchor["name"])).encode())[:24]


def access_link(anchor, source_ref):
    return {"anchorRef": anchor_ref(anchor), "accessMode": anchor["mode"], "sourceRefs": [source_ref],
            "confidence": anchor["confidence"], "locator": anchor["locator"], "distanceMeters": None,
            "durationMinutes": None, "fare": None, "lastMileWalkLevel": None, "barrierFree": None,
            "currentService": "UNKNOWN"}


def visit_profile(entry, updated_at):
    visit = entry["visit"]
    profile = {"contractVersion": "1.0", "profileVersion": "1.0",
               "profileId": "candidate-visit:" + sha(entry["candidateKey"].encode())[:24],
               "poiRef": entry["candidateKey"], "visitMode": visit["visitMode"], "status": "active",
               **{k: visit[k] for k in ("minimumDurationMinutes", "recommendedDurationMinutes", "maximumUsefulDurationMinutes")},
               **{k: None for k in ("fixedWalkingLoad", "variableWalkingLoad", "fixedPhysicalLoad", "variablePhysicalLoad", "terrainModifier", "standingModifier")},
               "sourceRefs": [entry["sourceRef"]], "confidence": visit["confidence"], "updatedAt": updated_at}
    return {"profile": profile, "completeness": "PARTIAL_NUMERIC_DURATION_ONLY",
            "provenance": [{"sourceRef": entry["sourceRef"], **visit}]}


def build(root=ROOT, cache=None, final=False):
    root = Path(root)
    plan = read(root / PLAN / "population.json")
    query_plan = read(root / PLAN / "queries.json")
    assert plan["count"] == 10097 and len(plan["items"]) == 10097
    assert len(plan["batches"]) == 51
    for path, digest in plan["identityHashes"].items():
        assert sha((root / path).read_bytes()) == digest, "Frozen identity/Registry/rubric changed: " + path
    baseline = {}
    for part in plan["baselinePartitions"]:
        assert sha((root / part["path"]).read_bytes()) == part["sha256"], "Frozen TASK-070 baseline changed"
        for row in lines(root / part["path"]):
            assert row["candidateKey"] not in baseline
            baseline[row["candidateKey"]] = row
    assert len(baseline) == 10369
    queries = {i["candidateKey"]: (g["id"], i) for g in query_plan["groups"] for i in g["items"]}
    assert len(queries) == 10097 and set(queries) == {i["candidateKey"] for i in plan["items"]}
    ledger = read(root / SOURCE / "editorial.json")
    rubric = read(root / PREFIX / "rubrics/candidate-feature-rubric.v1.json")
    assert ledger["rubricVersion"] == rubric["rubricVersion"]
    definitions = {d["code"]: d for d in rubric["definitions"]}
    extra_path = root / SOURCE / "discovered-target-sources.jsonl"
    extra_sources = lines(extra_path) if extra_path.exists() else []
    for extra in extra_sources:
        group_id, query = queries[extra["candidateKey"]]
        assert group_id == extra["queryGroup"]
        batch_search = read(root / SOURCE / "search" / (query["batchId"] + ".json"))
        group = next(g for g in batch_search["groups"] if g["groupId"] == group_id)
        assert extra["queryResponseSha256"] == group["responseSha256"]
        assert extra["attempt"]["url"] in group["returnedUrls"], "Discovered URL absent from search"
    reviewed = {e["candidateKey"]: e for e in ledger["entries"]}
    assert len(reviewed) == len(ledger["entries"]) and set(reviewed) <= set(queries)
    outputs, deltas, totals, errors = {}, [], Counter(), []
    actual_searches = actual_sources = 0
    anchors = {}
    index_rows = []

    reasons = {
        "IDENTITY_HOLD_PRESERVED": ("IDENTITY_CONFLICT", "Existing identity isolation remains unresolved; review the original conflict before linking any facts.", "HUMAN_IDENTITY_REVIEW"),
        "IDENTITY_METADATA_ONLY": ("HISTORICAL_METADATA_ONLY", "Historical name/category/estimated position does not establish current target attributes or visit conditions.", "REQUERY_OFFICIAL_TARGET_THEN_EDITORIAL_REVIEW"),
        "TARGET_CONTENT_REVIEW_REQUIRED": ("TARGET_BODY_NOT_YET_ADJUDICATED", "Retained page mentions the name, but identity, page scope and field-level facts have not been editorially established.", "EDITORIAL_TARGET_AND_FIELD_REVIEW"),
        "SOURCE_TARGET_UNRESOLVED": ("TARGET_LINK_UNPROVEN", "Retrieved source does not establish that its content describes this exact candidate and prefecture.", "REQUERY_NAME_PREFECTURE_ALIASES"),
        "EVIDENCE_UNAVAILABLE": ("SOURCE_UNAVAILABLE", "Source acquisition failed or yielded no usable target text; inspect each source error before retrying.", "RETRY_OR_FIND_OFFICIAL_ALTERNATIVE"),
        "IDENTITY_REVIEW_REQUIRED": ("CATALOGUE_IDENTITY_MISMATCH", "The historical source record no longer matches the frozen candidate; do not reassign the identity.", "HUMAN_IDENTITY_REVIEW"),
        "SOURCE_ATTEMPT_PENDING": ("SOURCE_ATTEMPT_PENDING", "Source acquisition has not produced a verified checkpoint yet.", "CONTINUE_BATCH")
    }
    for batch in plan["batches"]:
        bid = batch["batchId"]
        items = [i for i in plan["items"] if i["batchId"] == bid]
        assert len(items) == (97 if bid == "R-0051" else 200)
        attempt_path = root / SOURCE / (bid + ".jsonl")
        attempts = {a["candidateKey"]: a for a in lines(attempt_path)} if attempt_path.exists() else {}
        attempt_receipt_path = root / PLAN / (bid + ".json")
        if attempts:
            ar = read(attempt_receipt_path)
            assert ar["status"] == "ATTEMPT_QA_PASS" and ar["orderedCandidateKeys"] == [i["candidateKey"] for i in items]
            for output in ar["outputs"]:
                assert sha((root / output["path"]).read_bytes()) == output["sha256"], "Attempt checkpoint corrupted"
        search_path = root / SOURCE / "search" / (bid + ".json")
        searched = {}
        if search_path.exists():
            sr = read(root / PLAN / (bid + "-search.json"))
            assert sr["status"] == "SEARCH_ATTEMPT_QA_PASS"
            assert sr["queryPlanSha256"] == sha((root / PLAN / "queries.json").read_bytes())
            assert sr["outputSha256"] == sha(search_path.read_bytes())
            search = read(search_path)
            searched = {s["candidateKey"]: s for s in search["candidates"]}
            assert set(searched) == {i["candidateKey"] for i in items}
        if final:
            assert len(attempts) == len(items) and len(searched) == len(items), "Final review disposition requires every actual source/search checkpoint: " + bid
        for extra in extra_sources:
            if extra["candidateKey"] in attempts:
                attempts[extra["candidateKey"]]["attempts"].append(extra["attempt"])
        queue = []
        for item in items:
            key = item["candidateKey"]
            group_id, query = queries[key]
            a = attempts.get(key, {"status": "SOURCE_ATTEMPT_PENDING", "attempts": []})
            row = copy.deepcopy(baseline[key])
            assert all(v is None for v in row["featureSet"]["values"].values()), "Protected scored candidate included"
            entry = reviewed.get(key)
            local_error = None
            if entry:
                try:
                    validate_editorial(entry, item, a, cache)
                except (AssertionError, ValueError, KeyError, OSError) as error:
                    local_error = type(error).__name__ + ": " + str(error)
                    errors.append({"candidateKey": key, "stage": "EDITORIAL_VALIDATION", "error": local_error})
                    entry = None
            has_facts = bool(entry and (entry["features"] or entry["anchors"] or entry["visit"]))
            if has_facts:
                for f in entry["features"]:
                    row["featureSet"]["values"][f["code"]] = f["value"]
                    row["provenance"].append({
                        "featureCode": f["code"], "kind": definitions[f["code"]]["kind"], "value": f["value"],
                        "annotationMethod": f["annotationMethod"], "rubricVersion": rubric["rubricVersion"],
                        "confidence": f["confidence"], "sourceRefs": [entry["sourceRef"]],
                        "rationale": f["reason"],
                        "facts": [{"sourceRef": entry["sourceRef"], "reason": f["reason"], "locator": f["locator"]}]
                    })
                row["featureSet"]["sourceRefs"] = [entry["sourceRef"]] if entry["features"] else []
                row["featureSet"]["confidence"] = min((f["confidence"] for f in entry["features"]), default=None)
                for anchor in entry["anchors"]:
                    ref = anchor_ref(anchor)
                    target = anchors.setdefault(ref, {"anchorRef": ref, "name": anchor["name"], "type": anchor["type"],
                        "localityScope": anchor["scope"], "identityStatus": "CANDIDATE_NAME_SCOPED_NOT_PROVIDER_ID",
                        "providerRef": None, "sourceRefs": []})
                    target["sourceRefs"] = sorted(set(target["sourceRefs"] + [entry["sourceRef"]]))
                    link = access_link(anchor, entry["sourceRef"])
                    if link not in row.setdefault("accessLinks", []):
                        row["accessLinks"].append(link)
                if entry["visit"]:
                    row.setdefault("visitProfiles", []).append(visit_profile(entry, row["featureSet"]["updatedAt"]))
                row["status"] = "REVIEWED_PARTIAL"
                row["remainingReview"] = {"batchId": bid, "identityAssessment": entry["identityAssessment"], "reviewedScope": entry["reviewedScope"]}
                deltas.append(row)
                reason, description, action = "UNSUPPORTED_FIELDS_REMAIN_NULL", entry.get("nullReason", "Only explicitly located editorial facts were accepted; remaining fields still need evidence."), "REQUERY_MISSING_FIELDS_OR_HUMAN_REVIEW"
            elif entry:
                reason, description, action = "REVIEWED_TARGET_NO_SUPPORTED_FACT", entry["identityAssessment"]["rationale"], "REQUERY_DEDICATED_FACT_PAGE_OR_HUMAN_REVIEW"
            else:
                reason, description, action = reasons[a["status"]]
            if entry and entry["identityAssessment"]["status"] == "TARGET_UNRESOLVED":
                reason, description, action = ("IDENTITY_CONFLICT" if item["identityHold"] else "TARGET_IDENTITY_UNRESOLVED"), entry["identityAssessment"]["rationale"], "HUMAN_IDENTITY_REVIEW"
            if local_error:
                reason, description, action = "EDITORIAL_VALIDATION_FAILED", local_error, "REPAIR_EVIDENCE_THEN_RETRY"
            pending = [c for c in CODES if row["featureSet"]["values"][c] is None]
            status = "PARTIAL_WITH_PENDING_FIELDS" if has_facts else ("IDENTITY_HOLD" if item["identityHold"] else "PENDING_REVIEW")
            queue.append({
                "candidateKey": key, "position": item["position"], "batchId": bid,
                "name": query["name"], "prefectures": query["prefectures"], "categories": query["categories"],
                "status": status, "identityHold": item["identityHold"],
                "reasonCode": reason, "reason": description, "nextAction": action,
                "editorialNotes": (entry["identityAssessment"]["rationale"] + " " + entry.get("nullReason", "")) if entry else None,
                "assessmentOutcome": entry.get("assessmentOutcome") if entry else None,
                "nullReason": entry.get("nullReason") if entry else None,
                "additionalIdentityUncertainty": bool(entry and entry["identityAssessment"]["status"] == "TARGET_UNRESOLVED"),
                "query": query["query"], "queryGroup": group_id,
                "searchEvidencePath": (SOURCE / "search" / (bid + ".json")).as_posix() if key in searched else None,
                "searchStatus": "SEARCH_EXECUTED" if key in searched else "NOT_YET_CHECKPOINTED",
                "searchResponseSha256": searched.get(key, {}).get("searchResponseSha256"),
                "searchResultsAreNotIdentityProof": True,
                "sourceAttemptStatus": a["status"],
                "checkedSources": [{k: source[k] for k in ("url", "status", "httpStatus", "errorCode", "retrievedAt", "textSha256", "bulkSha256", "recordId", "rowSha256") if k in source} for source in a["attempts"]],
                "unresolvedFeatureCodes": pending, "visitProfile": "PARTIAL_SOURCE_SUPPORTED" if entry and entry["visit"] else ("REVIEWED_NO_SUPPORTED_DURATION" if entry and entry.get("assessmentOutcome") else "NOT_ANNOTATED_REQUIRES_SEPARATE_REVIEW"),
                "accessAnchor": "STATIC_SOURCE_SUPPORTED_SERVICE_UNKNOWN" if entry and entry["anchors"] else ("REVIEWED_NO_SUPPORTED_LINK" if entry and entry.get("assessmentOutcome") else "NOT_ANNOTATED_REQUIRES_SEPARATE_REVIEW"),
                "acceptedFeatureCount": 43 - len(pending),
                "retryPolicy": {"automaticAt": None, "method": action, "manualReviewAllowed": True, "preserveCandidateKeyAndCodes": True}
            })
            totals[reason] += 1
        actual_searches += len(searched)
        actual_sources += len(attempts)
        labels = {
            "UNSUPPORTED_FIELDS_REMAIN_NULL": "部分有分，其余待查",
            "REVIEWED_TARGET_NO_SUPPORTED_FACT": "已读页面不足以评分",
            "TARGET_IDENTITY_UNRESOLVED": "身份需核实",
            "TARGET_BODY_NOT_YET_ADJUDICATED": "已取回正文，待审读",
            "TARGET_LINK_UNPROVEN": "页面与目标关系未证实",
            "SOURCE_UNAVAILABLE": "来源不可用，需重试",
            "IDENTITY_CONFLICT": "身份隔离，人工核实",
            "HISTORICAL_METADATA_ONLY": "仅历史目录，需补证",
            "EDITORIAL_VALIDATION_FAILED": "证据校验失败",
            "SOURCE_ATTEMPT_PENDING": "来源核验尚未完成"
        }
        def cell(value):
            return str(value).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("|", "\\|").replace("\n", " ").replace("[", "\\[").replace("]", "\\]")
        markdown = [
            "# " + bid + " 待查名单", "",
            "每行保留原 candidateKey；详细查询词、来源哈希和未解决字段见对应 JSONL。已取回页面或完成搜索均不等于已确认身份或可评分。", "",
            "| candidateKey | 地点名 | 都道府县 | 待查原因 | 查询回执 |",
            "| --- | --- | --- | --- | --- |"
        ]
        for q in queue:
            markdown.append("| " + " | ".join(cell(v) for v in (
                q["candidateKey"], q["name"], " / ".join(q["prefectures"]),
                labels[q["reasonCode"]], "已记录" if q["searchStatus"] == "SEARCH_EXECUTED" else "待完成"
            )) + " |")
        md_path = QA / "pending" / (bid + ".md")
        outputs[md_path] = ("\n".join(markdown) + "\n").encode()
        index_rows.append(f"| [{bid}](pending/{bid}.md) | {len(queue)} | {len(searched)} | {sum(q['acceptedFeatureCount'] for q in queue)} |")
        queue_path = REVIEW / "pending" / (bid + ".jsonl")
        outputs[queue_path] = jsonl(queue)
        qa = {"batchId": bid, "candidateCount": len(queue), "sourceCheckedCandidates": len(attempts), "actualSearches": len(searched), "pendingItems": len(queue), "supportedFieldsAdded": sum(q["acceptedFeatureCount"] for q in queue), "states": dict(Counter(q["reasonCode"] for q in queue)), "fullEditorialReviewClaimed": False}
        outputs[QA / (bid + "-review.json")] = encode(qa)

        input_checksum = sha(encode({
            "population": sha((root / PLAN / "population.json").read_bytes()),
            "queries": sha((root / PLAN / "queries.json").read_bytes()),
            "source": sha(attempt_path.read_bytes()) if attempt_path.exists() else None,
            "search": sha(search_path.read_bytes()) if search_path.exists() else None,
            "editorial": [reviewed[i["candidateKey"]] for i in items if i["candidateKey"] in reviewed],
            "discoveredSources": [x for x in extra_sources if x["candidateKey"] in attempts],
            "tool": sha(Path(__file__).read_bytes())
        }))
        receipt = {
            "batchId": bid, "status": "REVIEW_DISPOSITION_QA_PASS" if len(searched) == len(items) and len(attempts) == len(items) else "IN_PROGRESS",
            "candidateCount": len(items), "inputChecksum": input_checksum,
            "orderedCandidateKeys": [i["candidateKey"] for i in items],
            "outputs": [{"path": p.as_posix(), "sha256": sha(outputs[p])} for p in (queue_path, md_path, QA / (bid + "-review.json"))],
            "fullEditorialReviewClaimed": False
        }
        receipt_path = PLAN / (bid + "-review.json")
        try:
            previous = read(root / receipt_path) if (root / receipt_path).exists() else {}
        except (ValueError, OSError):
            previous = {}
        previous_time = previous.pop("completedAt", None)
        timestamp_valid = False
        if previous_time:
            try:
                timestamp_valid = datetime.datetime.fromisoformat(previous_time.replace("Z", "+00:00")).tzinfo is not None
            except (ValueError, AttributeError):
                pass
        if previous == receipt and timestamp_valid:
            receipt["completedAt"] = previous_time
        else:
            receipt["completedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        # Receipt follows its output files in insertion order.
        outputs[receipt_path] = encode(receipt)
    outputs[QA / "pending-review-index.md"] = (
        "# 剩余 10,097 个 POI 待查索引\n\n"
        "每批 200 条，最后一批 97 条。部分已有评分的地点仍有未知字段，因此也保留在名单中。"
        "人工审读和重复查询须沿用原 candidateKey；不得凭名称或类别补默认分。\n\n"
        "| 批次 | 待查候选数 | 已完成搜索回执 | 已支持字段数 |\n"
        "| --- | ---: | ---: | ---: |\n" + "\n".join(index_rows) + "\n"
    ).encode()
    outputs[REVIEW / "feature-delta.jsonl"] = jsonl(deltas)
    outputs[REVIEW / "anchors.jsonl"] = jsonl(sorted(anchors.values(), key=lambda a: a["anchorRef"]))
    summary = {
        "schemaVersion": "remaining-review-disposition-v1",
        "status": "ALL_ATTEMPTS_DISPOSITIONED_WITH_PENDING_REVIEW" if final else "IN_PROGRESS",
        "population": 10097, "batchCount": 51, "batchSize": 200, "lastBatchSize": 97,
        "sourceCheckedCandidates": actual_sources, "actualSearchAttempts": actual_searches,
        "editoriallyAssessedCandidates": len(reviewed),
        "fullyAssessedCandidates": sum(bool(e.get("assessmentOutcome")) for e in reviewed.values()),
        "scoredPoisBefore": 272, "scoredPoisAfter": 272 + sum(bool(r["provenance"]) for r in deltas),
        "featuresBefore": 860, "featuresAdded": sum(len(r["provenance"]) for r in deltas),
        "featuresAfter": 860 + sum(len(r["provenance"]) for r in deltas),
        "pendingCandidates": 10097, "pendingReasonCounts": dict(totals),
        "identityHoldsPreserved": sum(i["identityHold"] for i in plan["items"]),
        "heldCandidatesSearchedButNotAutoLinked": sum(i["identityHold"] for i in plan["items"]),
        "visitProfilesAdded": sum(bool(e.get("visit")) for e in reviewed.values()), "accessAnchorsAdded": len(anchors),
        "accessLinksAdded": sum(len(e["anchors"]) for e in reviewed.values()),
        "errors": errors, "formalCodeChanges": 0, "registryRebindings": 0,
        "identityHashesBefore": plan["identityHashes"], "identityHashesAfter": plan["identityHashes"],
        "fullEditorialReviewClaimed": False, "nullIsUnknown": True,
        "productionImportAuthorized": False
    }
    outputs[QA / "review-summary.json"] = encode(summary)
    manifest = {
        "schemaVersion": "candidate-review-generation-v1", "generation": "remaining-v1",
        "status": summary["status"], "scope": "CANDIDATE_ONLY_NO_CANONICAL_IMPORT",
        "interpretation": "Read frozen TASK-070 feature partitions, then replace only candidateKeys listed in the verified feature delta. Pending queues are workflow state, never evidence for scoring.",
        "baseHead": plan["baseHead"], "baseFeaturePartitions": plan["baselinePartitions"],
        "protectedPreviousScoredCandidates": 272,
        "delta": {"path": (REVIEW / "feature-delta.jsonl").as_posix(), "sha256": sha(outputs[REVIEW / "feature-delta.jsonl"])},
        "anchors": {"path": (REVIEW / "anchors.jsonl").as_posix(), "sha256": sha(outputs[REVIEW / "anchors.jsonl"])},
        "editorialLedger": {"path": (SOURCE / "editorial.json").as_posix(), "sha256": sha((root / SOURCE / "editorial.json").read_bytes())},
        "pendingBatches": [{"path": p.as_posix(), "sha256": sha(data)} for p, data in outputs.items() if p.parent == REVIEW / "pending"],
        "registrySha256": plan["identityHashes"]["src/shared/data/master-code-registry.v1.json"],
        "runtimeImportAuthorized": False
    }
    outputs[PREFIX / "manifests/current-candidate-review.v1.json"] = encode(manifest)
    return outputs, summary

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--cache")
    parser.add_argument("--final", action="store_true")
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    outputs, summary = build(cache=args.cache, final=args.final)
    changed = []
    for path, data in outputs.items():
        if args.check:
            assert (ROOT / path).read_bytes() == data, "Output/checkpoint changed: " + str(path)
        elif atomic(ROOT / path, data):
            changed.append(path.as_posix())
    print(json.dumps({**summary, "changedFiles": len(changed), "check": args.check}))
    if summary["errors"]:
        raise SystemExit(2)

if __name__ == "__main__":
    main()
