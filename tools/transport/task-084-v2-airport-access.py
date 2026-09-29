#!/usr/bin/env python3
"""Cross-check official airport rail access guides against S12 component candidates."""

import argparse
import hashlib
import json
from collections import Counter
from pathlib import Path

GUIDES = {
    "成田国際空港": ("https://www.narita-airport.jp/ja/access/train/", [("成田空港", "東日本旅客鉄道"), ("成田空港", "京成電鉄"), ("空港第2ビル", "東日本旅客鉄道"), ("空港第2ビル", "京成電鉄")]),
    "東京国際空港": ("https://www.tokyo-haneda.com/access/train/index.html", [("羽田空港第1・第2ターミナル", "京浜急行電鉄"), ("羽田空港第3ターミナル", "京浜急行電鉄"), ("羽田空港第1ターミナル", "東京モノレール"), ("羽田空港第2ターミナル", "東京モノレール"), ("羽田空港第3ターミナル", "東京モノレール")]),
    "関西国際空港": ("https://www.kansai-airport.or.jp/access/from-airport/train", [("関西空港", "西日本旅客鉄道"), ("関西空港", "南海電気鉄道")]),
    "新千歳空港": ("https://www.hokkaido-airports.com/ja/new-chitose/access/jr/", [("新千歳空港", "北海道旅客鉄道")]),
    "福岡空港": ("https://www.fukuoka-airport.jp/access/subway.html", [("福岡空港", "福岡市")]),
    "中部国際空港": ("https://www.centrair.jp/access/train.html", [("中部国際空港", "名古屋鉄道")]),
    "仙台空港": ("https://www.sendai-airport.co.jp/access/", [("仙台空港", "仙台空港鉄道")]),
    "神戸空港": ("https://www.kairport.co.jp/access/portliner", [("神戸空港", "神戸新交通")]),
    "大阪国際空港": ("https://www.osaka-airport.co.jp/access/from-airport", [("大阪空港", "大阪モノレール")]),
    "宮崎空港": ("https://www.miyazaki-airport.co.jp/access/train", [("宮崎空港", "九州旅客鉄道")]),
    "那覇空港": ("https://www.naha-airport.co.jp/access/monorail/", [("那覇空港", "沖縄都市モノレール")]),
}


def enc(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")) + "\n").encode("utf-8")


def sha(body):
    return hashlib.sha256(body).hexdigest()


def run(args):
    airports = [json.loads(line) for line in Path(args.airports).read_text(encoding="utf-8").splitlines() if line]
    rail = [json.loads(line) for line in Path(args.rail).read_text(encoding="utf-8").splitlines() if line]
    if len(airports) != 47:
        raise RuntimeError("AIRPORT_COUNT_CHANGED")
    index = {(r["canonicalNameJa"], r["operatorRefs"][0]): r for r in rail}
    audit = []
    for airport in sorted(airports, key=lambda r: r["canonicalNameJa"]):
        name = airport["canonicalNameJa"]
        guide = GUIDES.get(name)
        checks = []
        if guide:
            for station, operator in guide[1]:
                match = index.get((station, operator))
                checks.append({"stationName": station, "operator": operator, "candidateTransportNodeId": match["proposedTransportNodeId"] if match else None, "s12UsageValue": match["usageValue"] if match else None, "status": "CANDIDATE_PRESENT" if match else "COMPONENT_MISSING"})
        status = "ACCESS_MODE_REVIEW_REQUIRED" if not guide else ("COMPONENT_MISSING" if any(x["status"] == "COMPONENT_MISSING" for x in checks) else "CANDIDATES_PRESENT_FORMAL_ACCEPTANCE_PENDING")
        audit.append({"airportTransportNodeId": airport["transportNodeId"], "airportName": name, "airportLevel": airport["nodeLevel"], "officialAccessGuide": guide[0] if guide else None, "expectedRailComponents": checks, "status": status, "reason": "Official airport access page still needs review" if not guide else "Official access guide plus S12 component crosswalk; station identities still candidates"})
    root = Path(args.output)
    root.mkdir(parents=True, exist_ok=True)
    body = b"".join(map(enc,audit))
    path = root/"airport-access-audit.jsonl"
    if path.exists() and not args.rebuild and sha(path.read_bytes()) != sha(body):
        raise RuntimeError("CORRUPTED_AIRPORT_ACCESS_AUDIT")
    if not path.exists() or args.rebuild:
        path.write_bytes(body)
    manifest = {"task": "TASK-084-B", "stage": "V2_AIRPORT_ACCESS_AUDIT", "nationalMasterStatus": "REWORK_IN_PROGRESS", "acceptedAirportCount": len(audit), "officialGuideReviewedCount": len(GUIDES), "statusCounts": dict(sorted(Counter(a["status"] for a in audit).items())), "expectedComponentCount": sum(len(a["expectedRailComponents"]) for a in audit), "missingExpectedComponentCount": sum(x["status"] == "COMPONENT_MISSING" for a in audit for x in a["expectedRailComponents"]), "artifactSha256": sha(body)}
    manifest_body = enc(manifest)
    if (root/"manifest.json").exists() and not args.rebuild and sha((root/"manifest.json").read_bytes()) != sha(manifest_body):
        raise RuntimeError("CORRUPTED_AIRPORT_ACCESS_MANIFEST")
    if not (root/"manifest.json").exists() or args.rebuild:
        (root/"manifest.json").write_bytes(manifest_body)
    print(json.dumps({"airportGuidesReviewed": len(GUIDES), "expectedComponents": manifest["expectedComponentCount"], "missingComponents": manifest["missingExpectedComponentCount"], "pendingAirportAccessReviews": manifest["statusCounts"].get("ACCESS_MODE_REVIEW_REQUIRED",0)}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--airports", default="data/transport/nodes/task-084-b-v2-airport-review/transport-nodes.jsonl")
    parser.add_argument("--rail", default="data/transport/nodes/task-084-b-v2-rail-candidates/rail-components.jsonl")
    parser.add_argument("--output", default="data/transport/nodes/task-084-b-v2-airport-access-review")
    parser.add_argument("--rebuild", action="store_true")
    run(parser.parse_args())
