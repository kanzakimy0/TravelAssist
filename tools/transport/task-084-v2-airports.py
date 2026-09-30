#!/usr/bin/env python3
"""Recalculate the 47 accepted airport tiers from MLIT FY2025 passenger totals."""

import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

SOURCE_URL = "https://www.mlit.go.jp/koku/15_bf_000185.html"
SOURCE_XLSX = "https://www.mlit.go.jp/koku/content/002016480.xlsx"
SOURCE_SHA = "0cd693d9b7dcc8b4c279608f6bb21468ededc8013a62754a3530b46bd34e988e"


def enc(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def digest(value):
    return hashlib.sha256(value).hexdigest()


def tier(value):
    if value >= 10_000_000:
        return "T0"
    if value >= 1_000_000:
        return "T1"
    if value >= 100_000:
        return "T2"
    return "T3"


def main(args):
    try:
        import openpyxl
    except ImportError as exc:
        raise RuntimeError("OPENPYXL_REQUIRED_FOR_OFFICIAL_MLIT_XLSX_PARSE") from exc
    workbook_path = Path(args.workbook)
    if digest(workbook_path.read_bytes()) != SOURCE_SHA:
        raise RuntimeError("MLIT_AIRPORT_XLSX_SHA256_MISMATCH")
    workbook = openpyxl.load_workbook(workbook_path, read_only=True, data_only=True)
    sheet = workbook.worksheets[1]
    source_rows = list(sheet.iter_rows(values_only=True))
    figures = {}
    for i, row in enumerate(source_rows):
        if str(row[2]).replace(" ", "") != "空港名：":
            continue
        name = re.sub(r"\s|　", "", str(row[3])).split("（")[0]
        annual = [(j+1, source_rows[j]) for j in range(i+1, min(i+30, len(source_rows))) if str(source_rows[j][2]).replace(" ", "") == "年度計"]
        for line_number, annual_row in annual:
            value = annual_row[13]
            if isinstance(value, int) and value > 0:
                if value != annual_row[9] + annual_row[12]:
                    raise RuntimeError(f"AIRPORT_PASSENGER_SUBTOTAL_MISMATCH: {name}")
                figures.setdefault(name, []).append((value, line_number))
    old = [json.loads(line) for line in Path(args.v1).read_text(encoding="utf-8").splitlines() if line]
    airports = [row for row in old if row["nodeKind"] == "airport"]
    if len(airports) != 47:
        raise RuntimeError("V1_AIRPORT_SET_CHANGED")
    updated, decisions = [], []
    for airport in sorted(airports, key=lambda x: x["transportNodeId"]):
        name = airport["canonicalNameJa"].replace("空港", "")
        matches = figures.get(name, [])
        if len(matches) != 1:
            raise RuntimeError(f"AIRPORT_OFFICIAL_CROSSWALK_AMBIGUOUS: {name}: {matches}")
        value, row_number = matches[0]
        level = tier(value)
        evidence = {"transportNodeId": airport["transportNodeId"], "airportName": airport["canonicalNameJa"], "levelDecisionVersion": "TASK-084-B-V2-MLIT-AIRPORT-FY2025-1", "nodeLevel": level, "metricMode": "airport", "usageMetricType": "ANNUAL_AIRPORT_PASSENGER_ENTRIES_EXITS", "usageValue": value, "usageUnit": "passengers/year", "usagePeriod": "FY2025", "usageSource": SOURCE_XLSX, "sourceWorkbookSha256": SOURCE_SHA, "sourceSheet": sheet.title, "sourceRow": row_number, "sourceColumn": "N", "sourceObservedAt": "FY2025", "functionalRole": "AIRPORT", "promotionReason": None, "decisionReason": "MLIT FY2025 airport passenger total; no legal-classification inference", "confidence": 0.98}
        decisions.append(evidence)
        updated.append({**airport, "nodeLevel": level, "levelDecisionVersion": evidence["levelDecisionVersion"], "usageMetricType": evidence["usageMetricType"], "usageValue": value, "usageUnit": evidence["usageUnit"], "usagePeriod": evidence["usagePeriod"], "usageSource": SOURCE_XLSX, "sourceObservedAt": "FY2025", "functionalRole": "AIRPORT", "promotionReason": None, "decisionReason": evidence["decisionReason"], "confidence": evidence["confidence"], "sourceRefs": sorted(set(airport["sourceRefs"]+[SOURCE_URL,SOURCE_XLSX]))})
    root = Path(args.output)
    root.mkdir(parents=True, exist_ok=True)
    artifacts = {"transport-nodes.jsonl": b"".join(map(enc,updated)), "airport-tier-decisions.jsonl": b"".join(map(enc,decisions))}
    for name, body in artifacts.items():
        path = root/name
        if path.exists() and not args.rebuild and digest(path.read_bytes()) != digest(body):
            raise RuntimeError(f"CORRUPTED_AIRPORT_V2_ARTIFACT: {name}")
        if not path.exists() or args.rebuild:
            path.write_bytes(body)
    manifest = {"task": "TASK-084-B", "stage": "V2_AIRPORT_FY2025_TIER_REVIEW", "nationalMasterStatus": "REWORK_IN_PROGRESS", "airportCount": len(updated), "nodeLevelCounts": dict(sorted(Counter(x["nodeLevel"] for x in updated).items())), "sourceWorkbookSha256": SOURCE_SHA, "sourceUrl": SOURCE_URL, "sourceXlsxUrl": SOURCE_XLSX, "usagePeriod": "FY2025", "artifactSha256": {name: digest(body) for name,body in artifacts.items()}}
    body = enc(manifest)
    if (root/"manifest.json").exists() and not args.rebuild and digest((root/"manifest.json").read_bytes()) != digest(body):
        raise RuntimeError("CORRUPTED_AIRPORT_V2_MANIFEST")
    if not (root/"manifest.json").exists() or args.rebuild:
        (root/"manifest.json").write_bytes(body)
    print(json.dumps({"airportCount": len(updated), "tiers": manifest["nodeLevelCounts"]}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--workbook", required=True)
    parser.add_argument("--v1", default="data/transport/nodes/task-084-b-national-master/transport-nodes.jsonl")
    parser.add_argument("--output", default="data/transport/nodes/task-084-b-v2-airport-review")
    parser.add_argument("--rebuild", action="store_true")
    main(parser.parse_args())
