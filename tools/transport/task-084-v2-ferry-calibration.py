#!/usr/bin/env python3
"""Calibrate ferry-port bands from MLIT 2024 domestic port passengers.

Port totals do not prove passenger volume at a specific ferry terminal.
"""

import argparse
import hashlib
import json
from pathlib import Path

SOURCE = "https://www.mlit.go.jp/k-toukei/R6kowan-datebase.html"
WORKBOOK = "https://www.mlit.go.jp/k-toukei/content/001974128.xlsx"
SOURCE_SHA = "9b301a0ad79acb77aa0e4e018fc00319c78eb6bbfa4c25adfb4e8f52fc9a9bef"


def enc(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha(value):
    return hashlib.sha256(value).hexdigest()


def run(args):
    try:
        import openpyxl
    except ImportError as exc:
        raise RuntimeError("OPENPYXL_REQUIRED_FOR_MLIT_PORT_XLSX") from exc
    workbook_path = Path(args.workbook)
    if sha(workbook_path.read_bytes()) != SOURCE_SHA:
        raise RuntimeError("MLIT_PORT_XLSX_SHA256_MISMATCH")
    workbook = openpyxl.load_workbook(workbook_path, read_only=True, data_only=True)
    sheet = workbook.active
    totals = {}
    for row_number, row in enumerate(sheet.iter_rows(min_row=4, values_only=True),4):
        if row[5] != "内国航路" or not isinstance(row[7],int):
            continue
        if row[7] != row[8]+row[9]:
            raise RuntimeError(f"PORT_PASSENGER_SUBTOTAL_MISMATCH: {row_number}")
        key = (str(row[1]),str(row[4]),str(row[3]),str(row[0]))
        if key in totals:
            raise RuntimeError(f"DUPLICATE_DOMESTIC_PORT_ROW: {key}")
        totals[key] = {"prefectureCode":key[0],"sourcePortCode":key[1],"portName":key[2],"prefectureName":key[3],"passengersPerYear":row[7],"sourceRow":row_number,"period":"CY2024","scope":"DOMESTIC_ROUTES_AT_PORT","sourceWorkbookSha256":SOURCE_SHA,"sourceUrl":WORKBOOK}
    records = sorted(totals.values(),key=lambda r:(-r["passengersPerYear"],r["sourcePortCode"]))
    values = sorted(r["passengersPerYear"] for r in records)
    if len(values) != 120:
        raise RuntimeError("PORT_DISTRIBUTION_CHANGED")
    percentile = lambda p: values[round((len(values)-1)*p)]
    stats = {"portCount":len(values),"min":values[0],"p10":percentile(.1),"p25":percentile(.25),"p50":percentile(.5),"p75":percentile(.75),"p90":percentile(.9),"p95":percentile(.95),"max":values[-1]}
    bands = {"T0":"at least 1,000,000 domestic passengers/year at the matched passenger terminal","T1":"250,000–999,999/year","T2":"50,000–249,999/year","T3":"below 50,000/year and Planner-relevant"}
    out = Path(args.output)
    out.mkdir(parents=True,exist_ok=True)
    body = b"".join(map(enc,records))
    path = out/"domestic-port-passengers-2024.jsonl"
    if path.exists() and not args.rebuild and sha(path.read_bytes()) != sha(body):
        raise RuntimeError("CORRUPTED_PORT_DISTRIBUTION")
    if not path.exists() or args.rebuild:
        path.write_bytes(body)
    manifest = {"task":"TASK-084-B","stage":"V2_FERRY_TIER_CALIBRATION_ONLY","nationalMasterStatus":"REWORK_IN_PROGRESS","source":SOURCE,"sourceWorkbook":WORKBOOK,"sourceWorkbookSha256":SOURCE_SHA,"scope":"MLIT 2024 domestic passengers, class-A ports only; not ferry-terminal-specific","distribution":stats,"proposedTerminalBands":bands,"formalTerminalTieringAllowed":False,"reason":"Terminal-specific crosswalk and operator figures remain required; port totals can contain multiple terminals or services.","artifactSha256":sha(body)}
    manifest_body = enc(manifest)
    if (out/"manifest.json").exists() and not args.rebuild and sha((out/"manifest.json").read_bytes()) != sha(manifest_body):
        raise RuntimeError("CORRUPTED_PORT_DISTRIBUTION_MANIFEST")
    if not (out/"manifest.json").exists() or args.rebuild:
        (out/"manifest.json").write_bytes(manifest_body)
    print(json.dumps(stats))


if __name__ == "__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--workbook",required=True)
    parser.add_argument("--output",default="data/transport/nodes/task-084-b-v2-ferry-calibration")
    parser.add_argument("--rebuild",action="store_true")
    run(parser.parse_args())
