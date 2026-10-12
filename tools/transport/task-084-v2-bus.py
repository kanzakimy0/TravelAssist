#!/usr/bin/env python3
"""Publish official-source national intercity bus-terminal review inventory."""

import argparse
import hashlib
import json
import uuid
from collections import Counter
from pathlib import Path

NAMESPACE = uuid.UUID("3da42a67-5839-425f-97a2-3d317b72ad24")
SOURCE_PDF = "https://www.mlit.go.jp/road/content/002008873.pdf"
SOURCE_PDF_SHA = "1b87814289dbd6432cf005a2ddc2e89fd68c436277873cf2ff18db293b6745df"

# Each URL is the facility, operator, or government page that identifies this facility.
TERMINALS = [
    ("バスタ新宿", "東京・新宿", "https://www.shinjuku-busterminal.co.jp/access/", "ACTIVE"),
    ("東京駅JR高速バスターミナル", "東京・八重洲", "https://www.jrbuskanto.co.jp/jwp/bus_stop/tokyo", "ACTIVE"),
    ("バスターミナル東京八重洲", "東京・八重洲", "https://bt-tokyoyaesu.com/", "ACTIVE"),
    ("札幌駅周辺仮設バス乗降場", "札幌", "https://www.city.sapporo.jp/sogokotsu/kasetsubus.html", "ACTIVE_TEMPORARY_GROUP"),
    ("札幌駅バスターミナル", "札幌", "https://www.city.sapporo.jp/sogokotsu/kasetsubus/kasetsu_faq.html", "CLOSED_2023_09_30"),
    ("宮交仙台高速バスセンター", "仙台", "https://www.miyakou.co.jp/bus-route/guide/sendai/", "ACTIVE"),
    ("名鉄バスセンター", "名古屋", "https://meitetsu-bus.co.jp/rosen/meibc", "ACTIVE"),
    ("京都駅八条口高速バスのりば", "京都", "https://info.keihanbus.jp/highway/stop/kyoto-hachijo/", "MULTI_OPERATOR_STOP_REVIEW"),
    ("阪急高速バス大阪梅田ターミナル", "大阪・梅田", "https://www.hankyu-kankobus.co.jp/highway/map/post/", "ACTIVE"),
    ("湊町バスターミナル（OCAT）", "大阪・難波", "https://www.ocat.co.jp/highwaybus/", "ACTIVE"),
    ("南海なんば高速バスターミナル", "大阪・難波", "https://www.nankaibus.jp/highway/", "ACTIVE"),
    ("広島バスセンター", "広島", "https://www.h-buscenter.com/", "ACTIVE"),
    ("博多バスターミナル", "福岡・博多", "https://www.h-bt.jp/access/", "ACTIVE"),
    ("西鉄天神高速バスターミナル", "福岡・天神", "https://www.nishitetsu.jp/bus/highwaybus/bus_terminal/", "ACTIVE"),
    ("熊本桜町バスターミナル", "熊本", "https://www.sankobus.jp/busportal/wp-content/uploads/noriba_kuma-bt.pdf", "ACTIVE"),
    ("長崎県営バスターミナル", "長崎", "https://www.keneibus.jp/cellular/limousine/nagasaki/", "ACTIVE"),
]


def enc(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha(body):
    return hashlib.sha256(body).hexdigest()


def run(args):
    old = [json.loads(line) for line in Path(args.v1).read_text(encoding="utf-8").splitlines() if line]
    old_bus = [row for row in old if row["nodeKind"] == "bus_terminal"]
    if len(old_bus) != 5:
        raise RuntimeError("V1_BUS_SET_CHANGED")
    if sha(Path(args.busta_pdf).read_bytes()) != SOURCE_PDF_SHA:
        raise RuntimeError("BUSTA_MLIT_PDF_SHA256_MISMATCH")
    inventory = []
    for name, area, url, status in TERMINALS:
        count = 23360 if name == "バスタ新宿" else None
        row = {"canonicalNameJa": name, "area": area, "facilitySource": url, "operatingStatus": status,
               "proposedTransportNodeId": "transport-node:" + str(uuid.uuid5(NAMESPACE, "intercity-bus-terminal|"+name+"|"+area)),
               "nodeKind": "bus_terminal", "usageMetricType": "DAILY_USERS" if count is not None else "USAGE_DATA_UNAVAILABLE",
               "usageValue": count, "usageUnit": "persons/day" if count is not None else None,
               "usagePeriod": "2026-06 week 3" if count is not None else None,
               "usageSource": SOURCE_PDF if count is not None else None,
               "sourceEvidence": {"pdfSha256": SOURCE_PDF_SHA, "page": 8, "metric": "週平均１日利用者数", "value": count} if count is not None else None,
               "proposedNodeLevel": "T0" if count is not None else None,
               "tierStatus": "OFFICIAL_USAGE_THRESHOLD_SUPPORTED" if count is not None else "TIER_REVIEW_REQUIRED",
               "identityStatus": "FACILITY_CONFIRMED_COORDINATE_REVIEW_REQUIRED" if status == "ACTIVE" else "OPERATING_STATUS_REVIEW_REQUIRED",
               "inclusionStatus": "CLOSED_DO_NOT_IMPORT" if status.startswith("CLOSED") else "NATIONAL_INTERCITY_GATEWAY_CANDIDATE",
               "sourceRefs": [url] + ([SOURCE_PDF] if count is not None else []),
               "confidence": 0.96 if count is not None else 0.7}
        if name == "バスタ新宿":
            row["address"] = "東京都渋谷区千駄ヶ谷5丁目24-55"
            row["addressSource"] = "https://www.gotokyo.org/jp/spot/112/index.html"
        inventory.append(row)
    existing = [{"transportNodeId": row["transportNodeId"], "name": row["canonicalNameJa"], "sourceRefs": row["sourceRefs"], "reviewStatus": "V1_NAGASAKI_BUS_USAGE_AND_TIER_REVIEW_REQUIRED"} for row in old_bus]
    root = Path(args.output)
    root.mkdir(parents=True, exist_ok=True)
    artifacts = {"national-bus-terminal-inventory.jsonl": b"".join(map(enc, inventory)), "v1-bus-review.jsonl": b"".join(map(enc, existing))}
    for name, body in artifacts.items():
        path = root/name
        if path.exists() and not args.rebuild and sha(path.read_bytes()) != sha(body):
            raise RuntimeError(f"CORRUPTED_BUS_INVENTORY: {name}")
        if not path.exists() or args.rebuild:
            path.write_bytes(body)
    manifest = {"task": "TASK-084-B", "stage": "V2_NATIONAL_BUS_TERMINAL_REVIEW", "nationalMasterStatus": "REWORK_IN_PROGRESS", "nationalCandidates": len(inventory), "activeOrReviewCandidates": sum(not r["operatingStatus"].startswith("CLOSED") for r in inventory), "historicalClosed": sum(r["operatingStatus"].startswith("CLOSED") for r in inventory), "v1BusReauditCount": len(existing), "officialUsageTierSupported": sum(r["proposedNodeLevel"] is not None for r in inventory), "operatingStatusCounts": dict(sorted(Counter(r["operatingStatus"] for r in inventory).items())), "artifactSha256": {name: sha(body) for name,body in artifacts.items()}}
    body = enc(manifest)
    if (root/"manifest.json").exists() and not args.rebuild and sha((root/"manifest.json").read_bytes()) != sha(body):
        raise RuntimeError("CORRUPTED_BUS_MANIFEST")
    if not (root/"manifest.json").exists() or args.rebuild:
        (root/"manifest.json").write_bytes(body)
    print(json.dumps({"nationalBusCandidates": len(inventory), "officialUsageTiers": manifest["officialUsageTierSupported"], "historicalClosed": manifest["historicalClosed"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--busta-pdf", required=True)
    parser.add_argument("--v1", default="data/transport/nodes/task-084-b-national-master/transport-nodes.jsonl")
    parser.add_argument("--output", default="data/transport/nodes/task-084-b-v2-bus-review")
    parser.add_argument("--rebuild", action="store_true")
    run(parser.parse_args())
