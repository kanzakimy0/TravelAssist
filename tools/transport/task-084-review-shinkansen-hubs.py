#!/usr/bin/env python3
"""Record spatially bounded, per-ID Hub decisions for the original Shinkansen nodes."""
import argparse
import hashlib
import json
import math
import sys
import zipfile
from pathlib import Path

SOURCE_SHA = "aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f"
ENTRY = "N02-25_GML/UTF-8/N02-25_Station.geojson"
ENTRY_SHA = "908e2c3036e9c80760ae3514be3682c77f81f0bd60ab5fb1b3da1aa9352bbd94"
SOURCE_URL = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html"
REVIEW_RADIUS_M = 800

# Operator station guides were inspected alongside N02. These named cases have one
# Shinkansen component and no other N02 rail station within the review area.
SELF_GUIDES = {
    "くりこま高原": "https://www.jreast.co.jp/estation/stations/632.html",
    "七戸十和田": "https://www.jreast.co.jp/estation/stations/1725.html",
    "上毛高原": "https://www.jreast.co.jp/estation/station/info.aspx?StationCd=844",
    "安中榛名": "https://www.jreast.co.jp/estation/station/info.aspx?StationCd=96",
    "本庄早稲田": "https://www.jreast.co.jp/estation/stations/1715.html",
    "水沢江刺": "https://www.jreast.co.jp/estation/stations/1462.html",
    "白石蔵王": "https://www.jreast.co.jp/estation/stations/851.html",
    "新富士": "https://railway.jr-central.co.jp/station-guide/shinkansen/shin-fuji/index.html",
    "越前たけふ": "https://eki.jr-odekake.net/top?id=0540203",
    "嬉野温泉": "https://www.jrkyushu.co.jp/railway/station/1227475_1601.html",
    "新尾道": "https://eki.jr-odekake.net/premises?id=0650650",
    "新玉名": "https://www.jrkyushu.co.jp/railway/station/1191625_1601.html",
    "新大牟田": "https://www.jrkyushu.co.jp/railway/station/1191622_1601.html",
    "東広島": "https://eki.jr-odekake.net/premises?id=0800666",
}

# These operator pages establish an interchange, but the nearby N02 geometry
# does not by itself authorize a new component identity or parent Hub link.
REVIEW_GUIDES = {
    "品川": ["https://www.jreast.co.jp/estation/stations/788.html"],
    "米原": ["https://railway.jr-central.co.jp/station-guide/shinkansen/maibara/index.html"],
    "三島": ["https://railway.jr-central.co.jp/station-guide/shinkansen/mishima/"],
    "八戸": ["https://www.jreast.co.jp/estation/stations/1230.html"],
    "郡山": ["https://www.jreast.co.jp/estation/station/info.aspx?StationCd=675"],
    "高崎": ["https://www.jreast.co.jp/estation/station/info.aspx?StationCd=934"],
    "新青森": ["https://www.jreast.co.jp/estation/stations/854.html"],
    "上越妙高": ["https://eki.jr-odekake.net/premises?id=0300201", "https://www.echigo-tokimeki.co.jp/userfiles/elfinder/information/20260314_timetable.pdf"],
    "豊橋": ["https://railway.jr-central.co.jp/station-guide/shinkansen/toyohashi/"],
    "長岡": ["https://www.jreast.co.jp/estation/stations/1085.html"],
    "越後湯沢": ["https://www.jreast.co.jp/estation/stations/285.html"],
}


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n"


def sha(data):
    return hashlib.sha256(data).hexdigest()


def rows(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def distance_m(a, b):
    lat1, lat2 = math.radians(a[1]), math.radians(b[1])
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(math.radians(b[0] - a[0]) / 2) ** 2
    return 6371000 * 2 * math.asin(min(1, math.sqrt(h)))


def point(feature):
    geometry = feature["geometry"]
    if geometry["type"] != "LineString" or len(geometry["coordinates"]) < 2:
        raise RuntimeError("INVALID_N02_STATION_GEOMETRY")
    coordinates = geometry["coordinates"]
    return [sum(float(p[i]) for p in coordinates) / len(coordinates) for i in range(2)]


def decide(node, nearby_rail, nearby_shinkansen):
    name = node["canonicalNameJa"]
    other_components = sorted(nearby_rail, key=lambda item: (item["distanceM"], item["name"], item["operator"], item["line"]))
    peer_ids = sorted(nearby_shinkansen)
    guide = SELF_GUIDES.get(name)
    review_guides = REVIEW_GUIDES.get(name, [])
    if guide and not other_components and not peer_ids:
        status, reason = "SELF_GATEWAY", "OPERATOR_GUIDE_AND_NO_OTHER_N02_RAIL_COMPONENT_WITHIN_800M"
        evidence_status = "STANDALONE_GATEWAY_REVIEWED"
    elif review_guides and (other_components or peer_ids):
        status, reason = "HUB_REVIEW_REQUIRED", "OPERATOR_INTERCHANGE_CONFIRMED_EXPLICIT_HUB_COMPONENT_REVIEW_PENDING"
        evidence_status = "OPERATOR_INTERCHANGE_CONFIRMED"
    elif other_components or peer_ids:
        status, reason = "HUB_REVIEW_REQUIRED", "NEARBY_RAIL_OR_SHINKANSEN_COMPONENT_REQUIRES_OPERATOR_TRANSFER_REVIEW"
        evidence_status = "PROXIMITY_REVIEW_TRIGGER_ONLY"
    else:
        status, reason = "HUB_REVIEW_REQUIRED", "STANDALONE_GATEWAY_EVIDENCE_PENDING"
        evidence_status = "STANDALONE_EVIDENCE_PENDING"
    return {
        "transportNodeId": node["transportNodeId"], "canonicalNameJa": name,
        "hubResolutionStatus": status, "decisionReason": reason,
        "parentHubId": None, "officialStationGuide": guide if status == "SELF_GATEWAY" else (review_guides[0] if review_guides else None),
        "reviewEvidenceStatus": evidence_status,
        "reviewRadiusM": REVIEW_RADIUS_M, "nearbyRailComponents": other_components,
        "nearbyShinkansenTransportNodeIds": peer_ids, "sourceRefs": [SOURCE_URL] + ([guide] if status == "SELF_GATEWAY" else review_guides),
        "sameNameAloneUsed": False,
    }


def process(args):
    source_zip = Path(args.zip)
    if sha(source_zip.read_bytes()) != SOURCE_SHA:
        raise RuntimeError("N02_ARCHIVE_HASH_MISMATCH")
    with zipfile.ZipFile(source_zip) as archive:
        raw = archive.read(ENTRY)
    if sha(raw) != ENTRY_SHA:
        raise RuntimeError("N02_ENTRY_HASH_MISMATCH")
    source = Path(args.data)
    original = rows(source / "task-084-b-accepted" / "transport-nodes.jsonl")
    old_accepted = {node["transportNodeId"] for node in original if node["hubResolutionStatus"] == "ACCEPTED"}
    later_accepted = {row["transportNodeId"] for row in rows(source / "task-084-b-national-rail-accepted" / "hub-component-decisions.jsonl") if row["componentOrigin"] == "IMMUTABLE_SHINKANSEN_ID"}
    pending = [node for node in original if node["transportNodeId"] not in old_accepted | later_accepted]
    if len(original) != 110 or len(old_accepted) != 9 or len(later_accepted) != 7 or len(pending) != 94:
        raise RuntimeError("SHINKANSEN_REVIEW_SCOPE_CHANGED")
    nearby = {node["transportNodeId"]: [] for node in pending}
    for feature in json.loads(raw)["features"]:
        props = feature["properties"]
        if "新幹線" in props["N02_003"]:
            continue
        p = point(feature)
        for node in pending:
            if abs(p[1] - node["latitude"]) > 0.01 or abs(p[0] - node["longitude"]) > 0.015:
                continue
            distance = distance_m(p, [node["longitude"], node["latitude"]])
            if distance <= REVIEW_RADIUS_M:
                nearby[node["transportNodeId"]].append({
                    "name": props["N02_005"], "operator": props["N02_004"], "line": props["N02_003"],
                    "sourceStationCode": str(props["N02_005c"]), "distanceM": round(distance),
                })
    decisions = []
    for node in pending:
        peer_ids = [other["transportNodeId"] for other in original if other["transportNodeId"] != node["transportNodeId"] and distance_m([other["longitude"], other["latitude"]], [node["longitude"], node["latitude"]]) <= REVIEW_RADIUS_M]
        decision = decide(node, nearby[node["transportNodeId"]], peer_ids)
        decisions.append(decision)
    decisions.sort(key=lambda item: item["transportNodeId"])
    actual_self = {item["canonicalNameJa"] for item in decisions if item["hubResolutionStatus"] == "SELF_GATEWAY"}
    if actual_self != set(SELF_GUIDES):
        raise RuntimeError(f"SELF_GATEWAY_SPATIAL_EVIDENCE_CHANGED: {sorted(actual_self)}")
    reviewed_names = {item["canonicalNameJa"] for item in decisions if item["reviewEvidenceStatus"] == "OPERATOR_INTERCHANGE_CONFIRMED"}
    if reviewed_names != set(REVIEW_GUIDES):
        raise RuntimeError(f"OPERATOR_INTERCHANGE_EVIDENCE_CHANGED: {sorted(reviewed_names)}")
    output = Path(args.output)
    output.mkdir(parents=True, exist_ok=True)
    body = b"".join(canonical(item) for item in decisions)
    target = output / "hub-resolution-decisions.jsonl"
    if target.exists() and not args.rebuild and target.read_bytes() != body:
        raise RuntimeError("HUB_REVIEW_ARTIFACT_CHANGED")
    target.write_bytes(body)
    manifest = {"task": "TASK-084-B", "decisionCount": 94, "selfGatewayCount": len(actual_self), "hubReviewRequiredCount": 94 - len(actual_self), "n02ArchiveSha256": SOURCE_SHA, "n02StationEntrySha256": ENTRY_SHA, "reviewRadiusM": REVIEW_RADIUS_M, "artifactSha256": sha(body)}
    manifest_body = canonical(manifest)
    manifest_target = output / "manifest.json"
    if manifest_target.exists() and not args.rebuild and manifest_target.read_bytes() != manifest_body:
        raise RuntimeError("HUB_REVIEW_MANIFEST_CHANGED")
    manifest_target.write_bytes(manifest_body)
    print(json.dumps({"selfGateway": len(actual_self), "hubReviewRequired": 94 - len(actual_self)}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--zip", required=True)
    parser.add_argument("--data", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--rebuild", action="store_true")
    try:
        process(parser.parse_args())
    except (OSError, ValueError, KeyError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
