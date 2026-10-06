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
    "山口宇部空港": ("https://www.yamaguchiube-airport.jp/mapaccess/train/", [("草江", "西日本旅客鉄道")]),
}

# Official airport pages explicitly route rail passengers through an off-airport
# station and a bus/taxi transfer; these do not imply an on-airport rail node.
TRANSFER_GUIDES = {
    "秋田空港": ("https://www.akita-airport.com/pages/access", "秋田駅 to airport by bus"),
    "函館空港": ("https://www.hokkaido-airports.com/ja/hakodate/access/bus/", "函館駅 / 新函館北斗駅 to airport by bus"),
    "北九州空港": ("https://www.kitakyu-air.jp/rev-access/rev-access.php", "朽網駅 to airport by bus"),
    "大分空港": ("https://www.oita-airport.jp/access/jr.html", "杵築駅 to airport by bus or taxi"),
    "富山空港": ("https://www.toyama-airport.co.jp/access", "富山駅 to airport by bus"),
    "女満別空港": ("https://www.hokkaido-airports.com/ja/memanbetsu/access/", "網走駅 / 北見駅 to airport by bus"),
    "岡山空港": ("https://www.okayama-airport.org/faq/access", "岡山駅 / 倉敷駅 to airport by bus"),
    "山形空港": ("https://www.yamagata-airport.co.jp/access/train.html", "さくらんぼ東根駅 to airport by ground transfer"),
    "広島空港": ("https://www.hij.airport.jp/access/index.html", "白市駅 to airport by bus"),
    "新潟空港": ("https://www.niigata-airport.gr.jp/access/bus/", "新潟駅 to airport by bus"),
    "旭川空港": ("https://www.hokkaido-airports.com/ja/asahikawa/access/bus/", "旭川駅 to airport by bus"),
    "松山空港": ("https://www.matsuyama-airport.co.jp/access/", "松山駅 / 松山市駅 to airport by bus"),
    "松本空港": ("https://www.matsumoto-airport.co.jp/access/bus", "松本駅前バスターミナル to airport by bus"),
    "帯広空港": ("https://www.hokkaido-airports.com/ja/obihiro/access/bus/", "帯広駅バスターミナル to airport by bus"),
    "熊本空港": ("https://www.kumamoto-airport.co.jp/ACCESS/", "熊本駅 to airport by bus"),
    "長崎空港": ("https://www.nagasaki-airport.jp/question/", "新大村駅 to airport by bus or taxi"),
    "稚内空港": ("https://www.hokkaido-airports.com/ja/wakkanai/access/", "稚内駅 to airport by bus"),
    "釧路空港": ("https://www.hokkaido-airports.com/ja/kushiro/access/", "釧路駅 to airport by bus or taxi"),
    "青森空港": ("https://www.aomori-airport.co.jp/access/timetable_bus", "青森駅 to airport by bus"),
    "高松空港": ("https://www.takamatsu-airport.com/access/bus/", "高松駅 to airport by bus"),
    "鹿児島空港": ("https://www.koj-ab.co.jp/ground-transportation/public-transportation-bus.html", "鹿児島中央駅 to airport by bus"),
    "静岡空港": ("https://www.mtfuji-shizuokaairport.jp/support/contact/access/", "島田駅 / 金谷駅 to airport by bus"),
    "高知空港": ("https://www.pref.kochi.lg.jp/doc/2018042700206/", "高知駅 to airport by bus"),
}

# The official access page lists road-based ground access and no on-airport
# railway station. This is an audit observation, not a claim about all future
# services or an instruction to create a rail component.
GROUND_GUIDES = {
    "下地島空港": ("https://www.pref.okinawa.lg.jp/machizukuri/kowankuko/1012617/1012639/1012642/1024031/1012649.html", "airport access bus / road"),
    "与那国空港": ("https://welcome-yonaguni.jp/access/", "island bus / road access"),
    "中標津空港": ("https://www.nakashibetsu-airport.jp/faq.php", "airport bus / road access"),
    "八丈島空港": ("https://hachijoapo.net/access", "island road access"),
    "奄美空港": ("https://amami-airport.co.jp/access", "airport bus / taxi"),
    "宮古空港": ("https://miyakoap.co.jp/bus-taxi/", "airport bus / taxi"),
    "対馬空港": ("https://tsushima-airport.co.jp/transportration", "island bus / taxi"),
    "石垣空港": ("https://www.ishigaki-airport.co.jp/access/bus-taxi/index.html", "airport bus / taxi"),
    "屋久島空港": ("https://yakukan.jp/on-island.html", "island bus / taxi"),
    "福江空港": ("https://www.pref.nagasaki.jp/shared/uploads/2024/06/1718342270-1.pdf", "airport bus / taxi"),
    "種子島空港": ("https://town.nakatane.kagoshima.jp/kikaku/kurashi/kotsu/kuko-noriai-taxi_nakatane.html", "reservation shared taxi"),
    "隠岐空港": ("https://www.oki-airport.jp/access", "airport bus / taxi"),
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
        transfer_guide = TRANSFER_GUIDES.get(name)
        ground_guide = GROUND_GUIDES.get(name)
        checks = []
        if guide:
            for station, operator in guide[1]:
                match = index.get((station, operator))
                checks.append({"stationName": station, "operator": operator, "candidateTransportNodeId": match["proposedTransportNodeId"] if match else None, "s12UsageValue": match["usageValue"] if match else None, "status": "CANDIDATE_PRESENT" if match else "COMPONENT_MISSING"})
        status = ("COMPONENT_MISSING" if any(x["status"] == "COMPONENT_MISSING" for x in checks) else "CANDIDATES_PRESENT_FORMAL_ACCEPTANCE_PENDING") if guide else ("OFF_AIRPORT_RAIL_TRANSFER_DOCUMENTED" if transfer_guide else "GROUND_ACCESS_GUIDE_NO_RAIL_COMPONENT_LISTED" if ground_guide else "ACCESS_MODE_REVIEW_REQUIRED")
        reason = ("Official access guide plus S12 component crosswalk; station identities still candidates" if guide else f"Official access guide documents off-airport rail transfer: {transfer_guide[1]}" if transfer_guide else f"Official ground-access guide lists {ground_guide[1]}; no on-airport railway station listed" if ground_guide else "Official airport access page still needs review")
        audit.append({"airportTransportNodeId": airport["transportNodeId"], "airportName": name, "airportLevel": airport["nodeLevel"], "officialAccessGuide": guide[0] if guide else transfer_guide[0] if transfer_guide else ground_guide[0] if ground_guide else None, "expectedRailComponents": checks, "status": status, "reason": reason})
    root = Path(args.output)
    root.mkdir(parents=True, exist_ok=True)
    body = b"".join(map(enc,audit))
    path = root/"airport-access-audit.jsonl"
    if path.exists() and not args.rebuild and sha(path.read_bytes()) != sha(body):
        raise RuntimeError("CORRUPTED_AIRPORT_ACCESS_AUDIT")
    if not path.exists() or args.rebuild:
        path.write_bytes(body)
    manifest = {"task": "TASK-084-B", "stage": "V2_AIRPORT_ACCESS_AUDIT", "nationalMasterStatus": "REWORK_IN_PROGRESS", "acceptedAirportCount": len(audit), "officialGuideReviewedCount": len(GUIDES)+len(TRANSFER_GUIDES)+len(GROUND_GUIDES), "statusCounts": dict(sorted(Counter(a["status"] for a in audit).items())), "expectedComponentCount": sum(len(a["expectedRailComponents"]) for a in audit), "missingExpectedComponentCount": sum(x["status"] == "COMPONENT_MISSING" for a in audit for x in a["expectedRailComponents"]), "artifactSha256": sha(body)}
    manifest_body = enc(manifest)
    if (root/"manifest.json").exists() and not args.rebuild and sha((root/"manifest.json").read_bytes()) != sha(manifest_body):
        raise RuntimeError("CORRUPTED_AIRPORT_ACCESS_MANIFEST")
    if not (root/"manifest.json").exists() or args.rebuild:
        (root/"manifest.json").write_bytes(manifest_body)
    print(json.dumps({"airportGuidesReviewed": manifest["officialGuideReviewedCount"], "expectedComponents": manifest["expectedComponentCount"], "missingComponents": manifest["missingExpectedComponentCount"], "pendingAirportAccessReviews": manifest["statusCounts"].get("ACCESS_MODE_REVIEW_REQUIRED",0)}, ensure_ascii=False))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--airports", default="data/transport/nodes/task-084-b-v2-airport-review/transport-nodes.jsonl")
    parser.add_argument("--rail", default="data/transport/nodes/task-084-b-v2-rail-candidates/rail-components.jsonl")
    parser.add_argument("--output", default="data/transport/nodes/task-084-b-v2-airport-access-review")
    parser.add_argument("--rebuild", action="store_true")
    run(parser.parse_args())
