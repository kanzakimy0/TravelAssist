#!/usr/bin/env python3
"""Deterministic, repository-only TASK-087-B Pilot-100 legacy audit.

Uses only the Python standard library. The v1.66 workbook is read, never edited.
The unmerged PR #437 reference is a frozen, explicitly unauthorised input.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import re
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
QA = ROOT / "docs/qa/TASK-087-B"
DATA = ROOT / "src/shared/data"
WORKBOOK = next((ROOT / "data/poi/full/registry").glob("*v1.66*.xlsx"))
SOURCE_STATUS = "UNMERGED_DRAFT_REFERENCE"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
ZIP_REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"
STATES = (
    "PROMOTE_AS_IS", "PROMOTE_REVALIDATED", "KEEP_CURRENT_CANONICAL",
    "CONFLICT_REVIEW_REQUIRED", "LEGACY_VALUE_NO_PROVENANCE",
    "LEGACY_VALUE_SCHEMA_MISMATCH", "NO_LEGACY_VALUE", "REJECTED",
)


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def file_hash(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def encoded(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def jsonl(rows) -> bytes:
    return b"".join(
        (json.dumps(row, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
        for row in rows
    )


def put(outputs: dict[str, bytes], relative: str, value, lines=False):
    outputs[relative] = jsonl(value) if lines else encoded(value)


def column_index(address: str) -> int:
    letters = re.match(r"[A-Z]+", address).group()
    value = 0
    for letter in letters:
        value = value * 26 + ord(letter) - 64
    return value - 1


def workbook_rows(book: zipfile.ZipFile, sheet_name: str):
    workbook = ET.fromstring(book.read("xl/workbook.xml"))
    relationships = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
    sheet = next(
        (s for s in workbook.iter(NS + "sheet") if s.attrib.get("name") == sheet_name),
        None,
    )
    if sheet is None:
        raise ValueError(f"Missing workbook sheet {sheet_name}")
    rid = sheet.attrib[REL + "id"]
    target = next(
        r.attrib["Target"] for r in relationships.iter(ZIP_REL + "Relationship")
        if r.attrib["Id"] == rid
    )
    target = target.lstrip("/") if target.startswith("/") else "xl/" + target
    shared = []
    if "xl/sharedStrings.xml" in book.namelist():
        strings = ET.fromstring(book.read("xl/sharedStrings.xml"))
        shared = ["".join(t.text or "" for t in si.iter(NS + "t")) for si in strings]
    with book.open(target) as stream:
        for _, element in ET.iterparse(stream, events=("end",)):
            if element.tag != NS + "row":
                continue
            cells = {}
            for cell in element.findall(NS + "c"):
                index = column_index(cell.attrib["r"])
                kind = cell.attrib.get("t")
                raw = cell.find(NS + "v")
                if kind == "inlineStr":
                    inline = cell.find(NS + "is")
                    value = "".join(t.text or "" for t in inline.iter(NS + "t")) if inline is not None else None
                elif raw is None:
                    value = None
                elif kind == "s":
                    value = shared[int(raw.text)]
                elif kind in ("str", "e"):
                    value = raw.text
                elif kind == "b":
                    value = raw.text == "1"
                else:
                    try:
                        number = float(raw.text)
                        value = int(number) if number.is_integer() else number
                    except (TypeError, ValueError):
                        value = raw.text
                cells[index] = value
            row = [None] * (max(cells, default=-1) + 1)
            for index, value in cells.items():
                row[index] = value
            yield int(element.attrib["r"]), row
            element.clear()


def value(row, index):
    return row[index] if index < len(row) else None


def source_inventory():
    roots = [ROOT / "data/poi/full"]
    roots += [
        ROOT / f"docs/qa/TASK-{number:03d}{suffix}"
        for number, suffix in ((68, ""), (70, ""), (71, ""), (72, "-B"),
                               (73, "-B"), (74, "-B"), (75, "-B"))
    ]
    task_documents = sorted(
        path for number in range(68, 76)
        for path in (ROOT / "docs/tasks").glob(f"*TASK-{number:03d}-b*")
        if path.is_file()
    )
    paths = sorted(
        {path for base in roots if base.exists() for path in base.rglob("*") if path.is_file()}
        | set(task_documents)
    )
    entries = [
        {"path": path.relative_to(ROOT).as_posix(), "bytes": path.stat().st_size, "sha256": file_hash(path)}
        for path in paths
    ]
    root_hash = digest(jsonl(entries))
    return {
        "scope": "REPOSITORY_ONLY_PHASE_1",
        "fileCount": len(entries),
        "inventorySha256": root_hash,
        "workbookSha256": file_hash(WORKBOOK),
        "candidateRuntimeImportAuthorized": False,
        "historicalFiles": entries,
        "limitations": [
            "Workbook score-source names refer to review/source files not retained in this repository.",
            "Candidate-only partitions have no accepted Pilot-100 candidateKey linkage.",
            "PR #437 is an unmerged Draft reference, not Canonical authorization.",
        ],
    }


def candidate_partition_audit(manifest, qids):
    rows = {}
    origins = {}
    baseline_numeric = 0
    for partition in manifest["baseFeaturePartitions"]:
        path = ROOT / partition["path"]
        if file_hash(path) != partition["sha256"]:
            raise ValueError("Candidate feature partition hash changed")
        for line_number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
            row = json.loads(line)
            if row["candidateKey"] in rows:
                raise ValueError("Duplicate candidate key in feature partitions")
            rows[row["candidateKey"]] = row
            origins[row["candidateKey"]] = partition["path"] + "#" + str(line_number)
            baseline_numeric += sum(isinstance(v, int) and not isinstance(v, bool) for v in row["featureSet"]["values"].values())
    delta_ref = manifest["delta"]
    delta_path = ROOT / delta_ref["path"]
    if file_hash(delta_path) != delta_ref["sha256"]:
        raise ValueError("Candidate delta hash changed")
    delta_count = 0
    for line_number, line in enumerate(delta_path.read_text(encoding="utf-8").splitlines(), 1):
        row = json.loads(line)
        if row["candidateKey"] not in rows:
            raise ValueError("Delta has no baseline candidate")
        rows[row["candidateKey"]] = row
        origins[row["candidateKey"]] = delta_ref["path"] + "#" + str(line_number)
        delta_count += 1
    current_numeric = sum(
        isinstance(v, int) and not isinstance(v, bool)
        for row in rows.values() for v in row["featureSet"]["values"].values()
    )
    exact_qid_refs = []
    for row in rows.values():
        refs = row.get("matchedSourceRefs", []) + row["featureSet"].get("sourceRefs", [])
        matches = sorted(qid for qid in qids if any(qid in str(ref) for ref in refs))
        if matches:
            exact_qid_refs.append({"candidateKey": row["candidateKey"], "qids": matches})
    exact_qid_pointers = []
    for qid in sorted(qids):
        key = "wikidata:" + qid
        if key not in rows:
            continue
        row = rows[key]
        exact_qid_pointers.append({
            "candidateKey": key, "qid": qid, "sourceArtifact": origins[key],
            "numericCells": sum(
                isinstance(v, int) and not isinstance(v, bool)
                for v in row["featureSet"]["values"].values()
            ),
            "candidateScope": row["scope"],
            "governance": "HISTORICAL_POINTER_ONLY_NOT_ADMITTED",
        })
    if any(pointer["numericCells"] for pointer in exact_qid_pointers):
        raise ValueError("Exact QID candidate pointer has numeric data requiring explicit review")
    return {
        "candidateCount": len(rows),
        "baselinePartitionCount": len(manifest["baseFeaturePartitions"]),
        "baselineNumericCells": baseline_numeric,
        "deltaRowCount": delta_count,
        "currentCandidateNumericCells": current_numeric,
        "exactPilotQidSourceRefHits": exact_qid_refs,
        "exactPilotQidCandidateKeyPointers": exact_qid_pointers,
        "canonicalPromotionAllowed": False,
    }


def build():
    sample = load(ROOT / "data/poi/canonical/pilot-100/sample-manifest.v1.json")
    dataset = load(DATA / "canonical-poi-pilot100.v1.json")
    runtime = load(DATA / "canonical-poi-pilot100.runtime-manifest.v1.json")
    draft = load(QA / "pr437-draft-reference.json")
    manifest_path = ROOT / "data/poi/full/manifests/current-candidate-review.v1.json"
    candidate = load(manifest_path)
    if candidate["scope"] != "CANDIDATE_ONLY_NO_CANONICAL_IMPORT" or candidate["runtimeImportAuthorized"]:
        raise ValueError("Candidate runtime gate changed")
    if not (len(sample["records"]) == len(dataset["records"]) == len(runtime["internalIds"]) == 100):
        raise ValueError("Pilot-100 membership count changed")
    if not runtime["runtimeImportAuthorized"]:
        raise ValueError("Pilot-100 admission is not authorized")
    ids = [row["internalId"] for row in sample["records"]]
    codes = [row["allocatedMasterCode"] for row in sample["records"]]
    if ids != runtime["internalIds"] or codes != runtime["masterCodes"]:
        raise ValueError("Pilot-100 manifest order/code binding changed")
    if ids != [row["internalId"] for row in dataset["records"]]:
        raise ValueError("Canonical dataset order changed")
    if codes != [row["masterCode"] for row in dataset["records"]]:
        raise ValueError("Canonical Master Code binding changed")
    if any(row["features"] is not None for row in dataset["records"]):
        raise ValueError("Unexpected pre-existing Canonical Feature43 data")
    if len(ids) != len(set(ids)) or len(codes) != len(set(codes)):
        raise ValueError("Duplicate Canonical identity")
    feature_definitions = re.findall(
        r'^\s*\["(\d{2})", "([^"]+)", "(benefit|suitability|cost|risk)"\]',
        (ROOT / "src/shared/contracts/planning/features.ts").read_text(encoding="utf-8"),
        re.MULTILINE,
    )
    if len(feature_definitions) != 43:
        raise ValueError("Feature43 registry changed")
    features = [code for code, _, _ in feature_definitions]
    feature_names = [name for _, name, _ in feature_definitions]
    uuid_to_sample = {r["sourceInternalUuid"]: r for r in sample["records"]}
    if any(r["candidateLinkage"] is not None for r in sample["records"]):
        raise ValueError("Review candidate linkage before joining candidate-only values")
    candidate_audit = candidate_partition_audit(
        candidate, {r["wikidataQid"] for r in sample["records"]}
    )
    old_code_to_sample = {str(r["legacyMasterCodeClaim"]).zfill(5): r for r in sample["records"]}
    if len(old_code_to_sample) != 100:
        raise ValueError("Ambiguous historical code claims")

    registry_rows = defaultdict(list)
    score_rows = defaultdict(list)
    merge_audit = defaultdict(list)
    with zipfile.ZipFile(WORKBOOK) as book:
        for line, row in workbook_rows(book, "Registry"):
            uuid = value(row, 2)
            if uuid in uuid_to_sample:
                registry_rows[uuid].append((line, row))
        header_line, header = next(workbook_rows(book, "Feature43"))
        if [value(header, i) for i in range(14, 57)] != feature_names:
            raise ValueError("Legacy 43D column order does not match current registry")
        for line, row in workbook_rows(book, "Feature43"):
            code = str(value(row, 0)).zfill(5)
            if code in old_code_to_sample:
                score_rows[code].append((line, row))
        for line, row in workbook_rows(book, "B_Feature43_Merge_Audit"):
            code = str(value(row, 0)).zfill(5)
            if code in old_code_to_sample:
                merge_audit[code].append((line, row))
    if any(len(registry_rows[r["sourceInternalUuid"]]) != 1 for r in sample["records"]):
        raise ValueError("Missing or ambiguous exact workbook UUID")
    if any(len(score_rows[str(r["legacyMasterCodeClaim"]).zfill(5)]) != 1 for r in sample["records"]):
        raise ValueError("Missing or ambiguous workbook Feature43 row")
    draft_rows = draft["observations"]
    if draft["sourceStatus"] != SOURCE_STATUS or len(draft_rows) != 17:
        raise ValueError("PR #437 Draft snapshot is not correctly fenced")
    sample_by_id = {row["internalId"]: row for row in sample["records"]}
    capsules_by_id = {row["internalId"]: row for row in draft["capsules"]}
    for draft_row in draft_rows:
        identity = sample_by_id.get(draft_row["internalId"])
        capsule = capsules_by_id.get(draft_row["internalId"])
        if not identity or not capsule:
            raise ValueError("Draft reference has no exact Canonical identity")
        if capsule["qid"] != identity["wikidataQid"] or capsule["revision"] != identity["wikidataRevision"]:
            raise ValueError("Draft QID/revision mismatch")
        if draft_row["sourceRefs"] != [capsule["sourceRef"]]:
            raise ValueError("Draft sourceRef mismatch")
        if draft_row["evidenceHash"] != capsule["responseSha256"]:
            raise ValueError("Draft evidence hash mismatch")
        claim = draft_row["evidenceClaim"]
        if not claim or claim["property"] not in capsule["sourcePropertyIds"]:
            raise ValueError("Draft claim not present in retained capsule summary")
    draft_by_cell = {(r["internalId"], r["featureCode"]): r for r in draft_rows}
    if len(draft_by_cell) != 17 or any(key[0] not in ids or key[1] not in features for key in draft_by_cell):
        raise ValueError("PR #437 Draft cell identity changed")

    inventory = source_inventory()
    inventory["candidateFeaturePartitions"] = candidate_audit
    crosswalk, observations, decisions, conflicts, unresolved = [], [], [], [], []
    rubric_sources = Counter()
    provenance = Counter()
    per_feature = {code: {"before": 0, "found": 0, "promotable": 0, "final": 0} for code in features}
    workbook_numeric = 0
    draft_numeric = 0
    for sample_row in sample["records"]:
        internal_id = sample_row["internalId"]
        old_code = str(sample_row["legacyMasterCodeClaim"]).zfill(5)
        reg_line, reg = registry_rows[sample_row["sourceInternalUuid"]][0]
        feat_line, feat = score_rows[old_code][0]
        if str(value(reg, 0)).zfill(5) != old_code or str(value(feat, 0)).zfill(5) != old_code:
            raise ValueError("Legacy code to UUID lineage mismatch")
        if value(reg, 3) != sample_row["nameJa"] or value(reg, 7) != sample_row["prefectureJa"]:
            raise ValueError("Frozen identity's descriptive fields changed")
        if value(feat, 1) != value(reg, 3) or value(feat, 5) != value(reg, 7):
            raise ValueError("Feature row does not belong to frozen Registry row")
        qid = sample_row["wikidataQid"]
        if not any(ext["provider"] == "wikidata" and ext["externalId"] == qid for ext in dataset["records"][sample_row["index"] - 1]["externalIds"]):
            raise ValueError("Canonical QID binding changed")
        score_source = value(feat, 7)
        rubric_sources[str(score_source)] += 1
        reg_ref = "data/poi/full/registry/" + WORKBOOK.name
        historical_matches = [{
            "sourceArtifact": reg_ref,
            "workbookRow": reg_line,
            "feature43Row": feat_line,
            "historicalInternalUuid": sample_row["sourceInternalUuid"],
            "historicalMasterCodeClaim": old_code,
            "candidateKey": None,
            "matchMethod": "EXACT_INTERNAL_UUID_THEN_FROZEN_MASTER_CODE_LINEAGE",
            "matchConfidence": 1.0,
        }]
        historical_matches += [{
            "sourceArtifact": pointer["sourceArtifact"],
            "candidateKey": pointer["candidateKey"],
            "historicalInternalUuid": None,
            "qid": pointer["qid"],
            "matchMethod": "EXACT_WIKIDATA_QID_POINTER_ONLY_NOT_ADMITTED",
            "matchConfidence": 1.0,
            "numericCells": 0,
        } for pointer in candidate_audit["exactPilotQidCandidateKeyPointers"]
          if pointer["qid"] == qid]
        crosswalk.append({
            "canonicalPoiId": internal_id,
            "masterCode": sample_row["allocatedMasterCode"],
            "qid": qid,
            "identityDecision": "EXACT_MATCH",
            "historicalMatches": historical_matches,
            "duplicateHistoricalRows": 0,
            "candidateKeyChanges": [],
            "identityConflict": False,
        })
        source_url = value(reg, 16)
        for index, code in enumerate(features):
            old_value = value(feat, index + 14)
            if not isinstance(old_value, int) or isinstance(old_value, bool) or not 0 <= old_value <= 9:
                raise ValueError(f"Invalid legacy 0-9 value at {old_code}:{code}")
            workbook_numeric += 1
            per_feature[code]["found"] += 1
            old_observation = {
                "canonicalPoiId": internal_id, "featureCode": code,
                "historicalValue": old_value,
                "sourceArtifact": reg_ref, "sourceScope": "V166_HISTORICAL_WORKBOOK_NOT_RUNTIME_AUTHORIZED",
                "sourceRow": feat_line, "historicalMasterCodeClaim": old_code,
                "identityMatchMethod": "EXACT_INTERNAL_UUID_THEN_FROZEN_MASTER_CODE_LINEAGE",
                "sourceRefs": [source_url] if source_url else [],
                "provenanceRefs": [f"{reg_ref}#Feature43!{feat_line}"],
                "evidenceLocator": None, "evidenceHash": None,
                "confidence": None, "method": value(feat, 10),
                "rubricVersion": None, "featureVersion": "LEGACY_UNVERSIONED_43D",
                "scoreSource": score_source, "scoreStatus": value(feat, 6),
                "reviewBasis": value(feat, 12),
                "sourceReviewItemCount": value(feat, 11),
                "mergeAuditRows": [line for line, _ in merge_audit[old_code]],
                "rightsStatus": "MASTER_PRIOR_REFERENCE_ONLY",
                "freshnessStatus": "UNVERIFIED",
                "provenanceClass": "P2" if source_url else "P3",
            }
            observations.append(old_observation)
            provenance[old_observation["provenanceClass"]] += 1
            draft_observation = draft_by_cell.get((internal_id, code))
            refs = [len(observations) - 1]
            if draft_observation:
                draft_numeric += 1
                observation = {
                    "canonicalPoiId": internal_id, "featureCode": code,
                    "historicalValue": draft_observation["value"],
                    "sourceArtifact": "PR #437 @ " + draft["prHead"],
                    "sourceScope": SOURCE_STATUS,
                    "sourceRefs": draft_observation["sourceRefs"],
                    "provenanceRefs": [draft_observation["reviewRef"]],
                    "evidenceLocator": draft_observation["evidenceLocator"],
                    "evidenceHash": draft_observation["evidenceHash"],
                    "confidence": draft_observation["confidence"],
                    "method": draft_observation["method"],
                    "rubricVersion": draft_observation["rubricVersion"],
                    "featureVersion": "1.0",
                    "rightsStatus": "WIKIDATA_CC0_DRAFT_UNMERGED",
                    "freshnessStatus": "PINNED_REVISION_NOT_LIVE",
                    "provenanceClass": "P1",
                    "evidenceClaim": draft_observation["evidenceClaim"],
                    "decisionReason": draft_observation["decisionReason"],
                }
                observations.append(observation)
                provenance["P1"] += 1
                refs.append(len(observations) - 1)
                conflict_type = "NUMERIC_AND_RUBRIC_CONFLICT" if old_value != draft_observation["value"] else "RUBRIC_AND_GOVERNANCE_REVIEW"
                state = "CONFLICT_REVIEW_REQUIRED"
                reason = "Old 0-9 scale lacks field-level rubric/evidence replay; independent PR #437 inference is unmerged and cannot resolve the old value automatically."
            else:
                conflict_type = None
                state = "LEGACY_VALUE_NO_PROVENANCE"
                reason = "Workbook has a score and POI-level source/review pointer, but no retained field-level evidence locator, source-rights grant or verifiable rubric mapping."
            decision = {
                "decisionRef": f"task-087-b:{sample_row['allocatedMasterCode']}:{code}",
                "canonicalPoiId": internal_id, "masterCode": sample_row["allocatedMasterCode"],
                "featureCode": code, "state": state, "currentCanonicalValue": None,
                "legacyValues": [old_value] + ([draft_observation["value"]] if draft_observation else []),
                "proposedValue": None, "finalProposedValue": None,
                "observationIndexes": refs, "provenanceClasses": [observations[i]["provenanceClass"] for i in refs],
                "identityDecision": "EXACT_MATCH", "rubricCompatibility": "UNVERIFIED",
                "rightsGate": "NOT_CLEARED_FOR_LEGACY_VALUE",
                "conflictType": conflict_type, "reason": reason,
            }
            decisions.append(decision)
            unresolved.append(decision)
            if conflict_type:
                conflicts.append(decision)

    if len(crosswalk) != 100 or len(decisions) != 4300 or workbook_numeric != 4300:
        raise ValueError("Recovery audit is not exactly 100 x 43")
    if draft_numeric != 17 or len(observations) != 4317:
        raise ValueError("Historical observation preservation failed")
    if any(item["proposedValue"] is not None for item in decisions):
        raise ValueError("Unsupported value promoted")
    matrix = {
        "version": "TASK-087-B-rubric-compatibility-v1",
        "currentRegistry": "src/shared/contracts/planning/features.ts",
        "currentDomain": "integer 0-9 or null",
        "legacyRows": [{
            "scoreSource": source, "pilotPoiCount": count,
            "featureColumnNamesCompatible": True,
            "numericDomainCompatible": True,
            "scaleMagnitudeCompatibility": "UNVERIFIED",
            "fieldLevelRubricVersion": None,
            "directCopyAllowed": False,
            "reason": "Workbook records completed scores and review summaries, not replayable per-field scale calibration and evidence.",
        } for source, count in sorted(rubric_sources.items())],
        "draftReference": {
            "sourceStatus": SOURCE_STATUS,
            "rubricVersion": "TASK-081-B-evidence-inference-v1",
            "numericCells": 17,
            "sameValueAsWorkbook": sum(
                item["legacyValues"][0] == item["legacyValues"][1] for item in conflicts
            ),
            "differentValueFromWorkbook": sum(
                item["legacyValues"][0] != item["legacyValues"][1] for item in conflicts
            ),
            "directCopyAllowed": False,
        },
    }
    state_counts = Counter(item["state"] for item in decisions)
    coverage = {
        "canonicalPois": 100, "cells": 4300, "canonicalIdsWithLegacyMatch": 100,
        "noLegacyMatch": 0, "ambiguousIdentityJoins": 0,
        "historicalNumericObservations": len(observations),
        "uniqueCellsWithLegacyNumeric": 4300,
        "provenance": {f"P{i}": provenance[f"P{i}"] for i in range(4)},
        "states": {state: state_counts[state] for state in STATES},
        "existingCanonicalNonNull": 0, "promoted": 0,
        "proposedFinalNonNull": 0, "poiWith43Of43": 0,
        "unexplainedDelta": 0,
        "perFeature": per_feature,
        "draftEqualWorkbook": matrix["draftReference"]["sameValueAsWorkbook"],
        "draftDifferentWorkbook": matrix["draftReference"]["differentValueFromWorkbook"],
    }
    overlay = {
        "schemaVersion": "1.0", "task": "TASK-087-B",
        "revision": "task-087-b-pilot100-recovery-v2-candidate",
        "runtimeImportAuthorized": False,
        "baseDatasetRevision": runtime["datasetRevision"],
        "baseDatasetSha256": runtime["datasetSha256"],
        "sampleSelectionSha256": sample["selectionSha256"],
        "recordCount": 100, "promotedCount": 0,
        "records": [
            {"internalId": r["internalId"], "masterCode": r["allocatedMasterCode"], "features": None}
            for r in sample["records"]
        ],
    }
    outputs = {}
    put(outputs, "docs/qa/TASK-087-B/source-inventory.json", inventory)
    put(outputs, "docs/qa/TASK-087-B/identity-crosswalk.jsonl", crosswalk, True)
    put(outputs, "docs/qa/TASK-087-B/historical-feature-observations.jsonl", observations, True)
    put(outputs, "docs/qa/TASK-087-B/rubric-compatibility.json", matrix)
    put(outputs, "docs/qa/TASK-087-B/promotion-decisions.jsonl", decisions, True)
    put(outputs, "docs/qa/TASK-087-B/conflicts.jsonl", conflicts, True)
    put(outputs, "docs/qa/TASK-087-B/unresolved.jsonl", unresolved, True)
    put(outputs, "docs/qa/TASK-087-B/coverage-before-after.json", coverage)
    put(outputs, "docs/qa/TASK-087-B/provenance-audit.json", {
        "classes": coverage["provenance"],
        "promotionRequires": ["exact identity", "current semantic/rubric", "field-level retained evidence", "rights", "no material conflict"],
        "workbookOnlyFieldLevelEvidenceCount": 0,
        "draftReferenceFieldLevelObservations": 17,
        "draftReferenceGovernance": SOURCE_STATUS,
        "candidateCorpusAuthorized": False,
        "unexplainedDelta": 0,
    })
    overlay_path = "src/shared/data/canonical-poi-pilot100.feature43-recovery-v2.json"
    put(outputs, overlay_path, overlay)
    decisions_path = "docs/qa/TASK-087-B/promotion-decisions.jsonl"
    overlay_manifest = {
        "schemaVersion": "1.0", "scope": "CANONICAL_POI_PILOT_100_FEATURE43_RECOVERY_CANDIDATE",
        "runtimeImportAuthorized": False, "authorizingTask": None,
        "baseDatasetSha256": runtime["datasetSha256"],
        "baseDatasetFileSha256": runtime["datasetFileSha256"],
        "internalIds": ids, "masterCodes": codes,
        "sourceInventorySha256": inventory["inventorySha256"],
        "rubricCompatibilityVersion": matrix["version"],
        "promotionDecisionsPath": decisions_path,
        "promotionDecisionsSha256": digest(outputs[decisions_path]),
        "overlayPath": overlay_path, "overlaySha256": digest(outputs[overlay_path]),
        "promotedCount": 0, "unresolvedCount": 4300,
        "draftReferenceStatus": SOURCE_STATUS,
    }
    put(outputs, "src/shared/data/canonical-poi-pilot100.feature43-recovery-v2.manifest.v2.json", overlay_manifest)
    proof = {
        "schemaVersion": "1.0", "tool": "tools/poi/task-087-legacy-recovery.py",
        "inputHashes": {
            "sample": file_hash(ROOT / "data/poi/canonical/pilot-100/sample-manifest.v1.json"),
            "dataset": file_hash(DATA / "canonical-poi-pilot100.v1.json"),
            "runtimeManifest": file_hash(DATA / "canonical-poi-pilot100.runtime-manifest.v1.json"),
            "workbook": inventory["workbookSha256"],
            "draftSnapshot": file_hash(QA / "pr437-draft-reference.json"),
            "candidateManifest": file_hash(manifest_path),
        },
        "outputHashes": {path: digest(content) for path, content in sorted(outputs.items())},
        "repeatable": True,
        "unexplainedDelta": 0,
    }
    put(outputs, "docs/qa/TASK-087-B/deterministic-rebuild.json", proof)
    return outputs, coverage


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--freeze-draft", type=Path)
    parser.add_argument("--pr-head")
    args = parser.parse_args()
    if args.freeze_draft:
        if args.write or args.check or not args.pr_head or not re.fullmatch(r"[a-f0-9]{40}", args.pr_head):
            parser.error("--freeze-draft requires --pr-head and cannot combine with build modes")
        source = args.freeze_draft
        decisions_path = source / "docs/qa/TASK-081-B/field-decisions.v1.jsonl"
        capsules_path = source / "docs/qa/TASK-081-B/source-capsules.wikidata-revisions.v1.json"
        resolved = [
            json.loads(line) for line in decisions_path.read_text(encoding="utf-8").splitlines()
            if json.loads(line)["state"] == "RESOLVED_INFERRED"
        ]
        capsules = load(capsules_path)
        selected = {row["internalId"] for row in resolved}
        snapshot = {
            "sourceStatus": SOURCE_STATUS,
            "pr": 437,
            "prHead": args.pr_head,
            "sourcePaths": [
                "docs/qa/TASK-081-B/field-decisions.v1.jsonl",
                "docs/qa/TASK-081-B/source-capsules.wikidata-revisions.v1.json",
            ],
            "sourceFileSha256": file_hash(decisions_path),
            "capsulesFileSha256": file_hash(capsules_path),
            "observations": resolved,
            "capsules": [r for r in capsules["records"] if r["internalId"] in selected],
        }
        QA.mkdir(parents=True, exist_ok=True)
        (QA / "pr437-draft-reference.json").write_bytes(encoded(snapshot))
        print(json.dumps({"status": "FROZEN_UNMERGED_DRAFT_REFERENCE", "observations": len(resolved)}))
        return 0
    if args.write == args.check:
        parser.error("choose exactly one of --write or --check")
    outputs, coverage = build()
    mismatches = []
    for relative, content in outputs.items():
        path = ROOT / relative
        if args.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content)
        elif not path.exists() or path.read_bytes() != content:
            mismatches.append(relative)
    if mismatches:
        print(json.dumps({"status": "FAIL", "mismatches": mismatches}, ensure_ascii=False))
        return 1
    print(json.dumps({
        "status": "PASS", "mode": "write" if args.write else "check",
        "outputs": len(outputs), "coverage": coverage,
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
