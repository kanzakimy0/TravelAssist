#!/usr/bin/env python3
"""Deterministically bind v1.66 Feature43 ratings to TASK-083 Pilot-100.

The workbook is read-only. This tool applies the TASK-088 dataset-level trust
policy; it does not revisit TASK-087's per-cell promotion conclusions.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
DATA = ROOT / "src/shared/data"
QA = ROOT / "docs/qa/TASK-088-A"
WORKBOOK_REL = (
    "data/poi/full/registry/"
    "travelassist-japan-poi-master-registry-v1.66-B-5xxxx-7xxxx-"
    "feature43-phase2c-review-v2.xlsx"
)
WORKBOOK_SHA256 = "b396723fbe1ed326fc205b7b259dd992019120182ad35044c2a96bd8a54d4014"
AUDIT_HEAD = "4e156293d6fc19d385461a75ab48352950305ee5"
PR437_HEAD = "0e2dc3ab8b39258eaf3b53b2d40c47f79f96e360"
PR437_REFERENCE_SHA256 = "cb5d8a0fe5b2d8cc5f56d6030e0a7cfb439ff4d83a304b50d35d72ea04a5b106"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"
REL = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
ZIP_REL = "{http://schemas.openxmlformats.org/package/2006/relationships}"


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def compact(value) -> bytes:
    def javascript_order(item):
        if isinstance(item, list):
            return [javascript_order(entry) for entry in item]
        if not isinstance(item, dict):
            return item
        numeric = sorted(
            (key for key in item if re.fullmatch(r"(?:0|[1-9][0-9]*)", key)
             and int(key) < 2**32 - 1),
            key=int,
        )
        return {key: javascript_order(item[key]) for key in [
            *numeric, *(key for key in item if key not in numeric)
        ]}

    return json.dumps(javascript_order(value), ensure_ascii=False, separators=(",", ":")).encode("utf-8")


def output(value) -> bytes:
    return (json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8")


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def column_index(address: str) -> int:
    value = 0
    for letter in re.match(r"[A-Z]+", address).group():
        value = value * 26 + ord(letter) - 64
    return value - 1


def workbook_rows(book: zipfile.ZipFile, sheet_name: str):
    workbook = ET.fromstring(book.read("xl/workbook.xml"))
    relationships = ET.fromstring(book.read("xl/_rels/workbook.xml.rels"))
    sheet = next(
        (item for item in workbook.iter(NS + "sheet") if item.attrib.get("name") == sheet_name),
        None,
    )
    if sheet is None:
        raise ValueError(f"Missing workbook sheet: {sheet_name}")
    rid = sheet.attrib[REL + "id"]
    target = next(
        item.attrib["Target"]
        for item in relationships.iter(ZIP_REL + "Relationship")
        if item.attrib["Id"] == rid
    )
    target = target.lstrip("/") if target.startswith("/") else "xl/" + target
    shared = []
    if "xl/sharedStrings.xml" in book.namelist():
        strings = ET.fromstring(book.read("xl/sharedStrings.xml"))
        shared = ["".join(t.text or "" for t in item.iter(NS + "t")) for item in strings]
    with book.open(target) as stream:
        for _, element in ET.iterparse(stream, events=("end",)):
            if element.tag != NS + "row":
                continue
            cells = {}
            for cell in element.findall(NS + "c"):
                index = column_index(cell.attrib["r"])
                raw = cell.find(NS + "v")
                kind = cell.attrib.get("t")
                if kind == "inlineStr":
                    inline = cell.find(NS + "is")
                    value = (
                        "".join(t.text or "" for t in inline.iter(NS + "t"))
                        if inline is not None else None
                    )
                elif raw is None:
                    value = None
                elif kind == "s":
                    value = shared[int(raw.text)]
                elif kind in ("str", "e"):
                    value = raw.text
                elif kind == "b":
                    value = raw.text == "1"
                else:
                    number = float(raw.text)
                    value = int(number) if number.is_integer() else number
                cells[index] = value
            row = [None] * (max(cells, default=-1) + 1)
            for index, value in cells.items():
                row[index] = value
            yield int(element.attrib["r"]), row
            element.clear()


def value(row, index):
    return row[index] if index < len(row) else None


def feature_definitions():
    text = (ROOT / "src/shared/contracts/planning/features.ts").read_text(encoding="utf-8")
    definitions = re.findall(
        r'^\s*\["(\d{2})", "([^"]+)", "(benefit|suitability|cost|risk)"\]',
        text, re.MULTILINE,
    )
    if len(definitions) != 43 or [code for code, _, _ in definitions] != [
        f"{number:02d}" for number in range(1, 44)
    ]:
        raise ValueError("Current Feature43 registry is not the expected 43-code contract")
    return definitions


def build():
    workbook_path = ROOT / WORKBOOK_REL
    if sha256(workbook_path.read_bytes()) != WORKBOOK_SHA256:
        raise ValueError("Pinned v1.66 workbook hash mismatch")
    sample = load(ROOT / "data/poi/canonical/pilot-100/sample-manifest.v1.json")
    dataset = load(DATA / "canonical-poi-pilot100.v1.json")
    runtime = load(DATA / "canonical-poi-pilot100.runtime-manifest.v1.json")
    draft = load(QA / "pr437-reference.v1.json")
    if sha256(compact(draft)) != PR437_REFERENCE_SHA256:
        raise ValueError("Frozen PR #437 reference changed")
    definitions = feature_definitions()
    codes = [code for code, _, _ in definitions]
    names = [name for _, name, _ in definitions]
    if draft["sourceStatus"] != "UNMERGED_DRAFT_REFERENCE" or draft["prHead"] != PR437_HEAD:
        raise ValueError("PR #437 reference is not the frozen Draft")
    if not runtime["runtimeImportAuthorized"] or runtime["candidateCorpusAuthorized"]:
        raise ValueError("Canonical runtime authorization changed")
    if sha256(compact(dataset)) != runtime["datasetSha256"]:
        raise ValueError("Canonical dataset hash mismatch")
    samples = sample["records"]
    canonical = dataset["records"]
    if not (len(samples) == len(canonical) == len(runtime["internalIds"]) == 100):
        raise ValueError("Pilot membership must be exactly 100")
    if [row["internalId"] for row in samples] != runtime["internalIds"]:
        raise ValueError("Pilot internalId ordering changed")
    if [row["allocatedMasterCode"] for row in samples] != runtime["masterCodes"]:
        raise ValueError("Pilot Master Code ordering changed")
    if any(row["features"] is not None for row in canonical):
        raise ValueError("Base Canonical dataset was mutated")
    uuids = [row["sourceInternalUuid"] for row in samples]
    old_codes = [str(row["legacyMasterCodeClaim"]).zfill(5) for row in samples]
    if any(len(set(keys)) != 100 for keys in (runtime["internalIds"], runtime["masterCodes"], uuids, old_codes)):
        raise ValueError("Ambiguous identity or Master Code mapping")
    if any(row["candidateLinkage"] is not None for row in samples):
        raise ValueError("Candidate-only linkage cannot authorize a baseline")
    reg_rows, score_rows = {}, {}
    uuid_set, old_code_set = set(uuids), set(old_codes)
    with zipfile.ZipFile(workbook_path) as book:
        for line, row in workbook_rows(book, "Registry"):
            uuid = value(row, 2)
            if uuid in uuid_set:
                reg_rows.setdefault(uuid, []).append((line, row))
        header_line, header = next(workbook_rows(book, "Feature43"))
        if [value(header, index) for index in range(14, 57)] != names:
            raise ValueError(f"Legacy Feature43 columns differ from the sole current registry at row {header_line}")
        for line, row in workbook_rows(book, "Feature43"):
            old_code = str(value(row, 0)).zfill(5)
            if old_code in old_code_set:
                score_rows.setdefault(old_code, []).append((line, row))
    if any(len(reg_rows.get(uuid, [])) != 1 for uuid in uuids):
        raise ValueError("Missing or ambiguous exact legacy UUID")
    if any(len(score_rows.get(code, [])) != 1 for code in old_codes):
        raise ValueError("Missing or ambiguous exact legacy Feature43 row")

    records = []
    for index, sample_row in enumerate(samples):
        poi = canonical[index]
        uuid = sample_row["sourceInternalUuid"]
        old_code = old_codes[index]
        reg_line, reg = reg_rows[uuid][0]
        score_line, score = score_rows[old_code][0]
        internal_id = sample_row["internalId"]
        master_code = sample_row["allocatedMasterCode"]
        qid = sample_row["wikidataQid"]
        if (
            internal_id != "poi:" + uuid
            or poi["internalId"] != internal_id
            or poi["masterCode"] != master_code
            or str(value(reg, 0)).zfill(5) != old_code
            or str(value(score, 0)).zfill(5) != old_code
            or reg_line != sample_row["workbookRow"]
            or value(reg, 3) != sample_row["nameJa"]
            or value(reg, 7) != sample_row["prefectureJa"]
            or value(score, 1) != value(reg, 3)
            or value(score, 5) != value(reg, 7)
            or not any(
                ext["provider"] == "wikidata" and ext["externalId"] == qid
                for ext in poi["externalIds"]
            )
            or not any(
                ref["sourceRef"] == "source:v166:" + uuid
                for ref in poi["sourceRefs"]
            )
        ):
            raise ValueError(f"Exact identity/lineage binding failed at {internal_id}")
        values = {}
        for offset, code in enumerate(codes):
            number = value(score, offset + 14)
            if type(number) is not int or not 0 <= number <= 9:
                raise ValueError(f"Invalid Feature43 domain at {internal_id}:{code}")
            values[code] = number
        records.append({
            "internalId": internal_id,
            "masterCode": master_code,
            "legacyUuid": uuid,
            "legacyMasterCodeClaim": old_code,
            "feature43Row": score_line,
            "featureSet": {
                "contractVersion": "1.0",
                "featureVersion": "1.0",
                "poiRef": internal_id,
                "values": values,
                "sourceRefs": ["source:v166:" + uuid],
                "confidence": None,
                "updatedAt": "2026-09-29T00:00:00+09:00",
            },
        })
    artifact = {
        "schemaVersion": "1.0",
        "scope": "CANONICAL_POI_PILOT_100_FEATURE43_TRUSTED_BASELINE",
        "trustPolicy": "TRUSTED_INTERNAL_BASELINE",
        "revision": "task-088-a-pilot100-feature43-trusted-baseline-v1",
        "records": records,
    }
    manifest = {
        "schemaVersion": "1.0",
        "scope": artifact["scope"],
        "trustPolicy": artifact["trustPolicy"],
        "baselineAttachAuthorized": True,
        "candidateCorpusAuthorized": False,
        "authorizingTask": "TASK-088-A",
        "artifactPath": "src/shared/data/canonical-poi-pilot100.feature43-trusted-baseline.v1.json",
        "artifactRevision": artifact["revision"],
        "artifactSha256": sha256(compact(artifact)),
        "baseCanonicalDatasetPath": runtime["datasetPath"],
        "baseCanonicalDatasetRevision": runtime["datasetRevision"],
        "baseCanonicalDatasetSha256": runtime["datasetSha256"],
        "baseRuntimeManifestSha256": sha256(compact(runtime)),
        "sourceWorkbookPath": WORKBOOK_REL,
        "sourceWorkbookRevision": "v1.66-B-5xxxx-7xxxx-feature43-phase2c-review-v2",
        "sourceWorkbookSha256": WORKBOOK_SHA256,
        "featureRegistryVersion": "1.0",
        "featureRegistryDefinitionSha256": sha256(compact(definitions)),
        "deterministicRebuildVersion": "TASK-088-A-v1",
        "auditReference": {
            "task": "TASK-087-B",
            "pr": 454,
            "head": AUDIT_HEAD,
            "governance": "HISTORICAL_AUDIT_ONLY_OLD_PROMOTION_GATE_NOT_APPLIED",
        },
        "recordCount": 100,
        "featureCount": 43,
        "cellCount": 4300,
        "internalIds": runtime["internalIds"],
        "masterCodes": runtime["masterCodes"],
        "legacyUuids": uuids,
    }
    by_id = {row["internalId"]: row for row in records}
    comparisons = []
    for observation in draft["observations"]:
        internal_id = observation["internalId"]
        record = by_id.get(internal_id)
        code = observation["featureCode"]
        if (
            record is None
            or record["masterCode"] != observation["masterCode"]
            or code not in codes
            or type(observation["value"]) is not int
        ):
            raise ValueError("Draft #437 reference has invalid identity or feature")
        baseline_value = record["featureSet"]["values"][code]
        comparisons.append({
            **observation,
            "trustedBaselineValue": baseline_value,
            "comparison": "EQUAL" if baseline_value == observation["value"] else "DIFFERENT",
            "runtimeAuthority": "TRUSTED_INTERNAL_BASELINE",
        })
    if len(comparisons) != 17 or len({(r["internalId"], r["featureCode"]) for r in comparisons}) != 17:
        raise ValueError("Draft #437 must have exactly 17 unique observations")
    report = {
        "task": "TASK-088-A",
        "policy": "TRUSTED_INTERNAL_BASELINE",
        "canonicalPoiCount": 100,
        "exactIdentityBindings": 100,
        "exactMasterCodeBindings": 100,
        "exactLegacyUuidBindings": 100,
        "ambiguousJoins": 0,
        "nameOnlyJoins": 0,
        "cellCount": 4300,
        "invalidDomainCells": 0,
        "poiWith43Of43": 100,
        "baseCanonicalNonNull": 0,
        "baselineNonNull": 4300,
        "unexplainedMutation": 0,
        "pr437Equal": sum(row["comparison"] == "EQUAL" for row in comparisons),
        "pr437Different": sum(row["comparison"] == "DIFFERENT" for row in comparisons),
        "perFeature": {code: 100 for code in codes},
        "artifactSha256": manifest["artifactSha256"],
        "sourceWorkbookSha256": WORKBOOK_SHA256,
    }
    outputs = {
        DATA / "canonical-poi-pilot100.feature43-trusted-baseline.v1.json": output(artifact),
        DATA / "canonical-poi-pilot100.feature43-trusted-baseline.manifest.v1.json": output(manifest),
        QA / "coverage-and-identity.json": output(report),
        QA / "pr437-comparison.json": output({
            "sourceStatus": "UNMERGED_DRAFT_REFERENCE",
            "pr": 437,
            "prHead": PR437_HEAD,
            "equalCount": report["pr437Equal"],
            "differentCount": report["pr437Different"],
            "observations": comparisons,
        }),
    }
    return outputs, report


def main():
    args = argparse.ArgumentParser()
    args.add_argument("--write", action="store_true")
    args.add_argument("--check", action="store_true")
    options = args.parse_args()
    if options.write == options.check:
        args.error("Select exactly one of --write or --check")
    outputs, report = build()
    for path, payload in outputs.items():
        if options.write:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(payload)
        elif not path.is_file() or load(path) != json.loads(payload):
            raise ValueError(f"Deterministic rebuild mismatch: {path.relative_to(ROOT)}")
    print(json.dumps(report, ensure_ascii=False, separators=(",", ":")))


if __name__ == "__main__":
    main()
