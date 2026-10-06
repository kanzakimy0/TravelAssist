#!/usr/bin/env python3
"""Review selected regional airports and independent A/B airport hierarchy."""
import argparse
import hashlib
import html
import json
import math
import re
import sys
import uuid
import xml.etree.ElementTree as ET
import zipfile
from collections import defaultdict
from pathlib import Path

CURRENT_URL = "https://www.mlit.go.jp/koku/15_bf_000310.html"
C28_URL = "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C28-2021.html"
TERMS_URL = "https://nlftp.mlit.go.jp/ksj/other/agreement_02.html"
ISHIGAKI_ALIAS_URL = "https://www.pref.okinawa.jp/machizukuri/kowankuko/1012617/1012619.html"
OKINAWA_ROLE_URL = "https://www.pref.okinawa.jp/machizukuri/kowankuko/1012617/1012618.html"
CURRENT_SHA = "033c72ca0329c6be15a5b2c179ea25d1e96130517ba24601bdfaf15c6fd8d360"
C28_SHA = "07d69353a34558d7ebd21d4b5f62b685d4f9b9d0e55c6eed6ce05aefcc6b7b35"
XML_SHA = "3fdbef2b7bd514a3aa22235d9874c508d56597a0407e7b4e1f1815e36ac7a158"
XML_ENTRY = "UTF-8/C28-21.xml"
NAMESPACE = uuid.UUID("ed7ae3bf-b4e1-4a2c-abd6-acf1ea74d15d")
GML_ID = "{http://www.opengis.net/gml/3.2.1}id"
XLINK_HREF = "{http://www.w3.org/1999/xlink}href"
BATCH_SIZE = 200

# Explicit tourism/network review. Prefecture prefixes are independent C28 checks.
# B is a source category; the T level is an independent Planner hierarchy decision.
REGIONAL = {
    "神戸": ("28110", "28", "T1", "Kansai air gateway serving Kobe and Setouchi transfers."),
    "石垣": ("47207", "47", "T1", "Yaeyama island air hub and onward island tourism gateway."),
    "宮古": ("47214", "47", "T1", "Miyako archipelago tourism and essential island air gateway."),
    "下地島": ("47214", "47", "T1", "Miyako-area international and domestic island air gateway."),
    "奄美": ("46222", "46", "T1", "Amami island-chain tourism and regional air gateway."),
    "屋久島": ("46503", "46", "T1", "Yakushima mountain and island tourism access gateway."),
    "松本": ("20202", "20", "T1", "Alpine and Nagano inland tourism gateway."),
    "静岡": ("22226", "22", "T1", "Shizuoka and Fuji-area regional air gateway."),
    "福江": ("42211", "42", "T1", "Goto island-chain main air gateway."),
    "対馬": ("42209", "42", "T1", "Remote border-island tourism and essential access gateway."),
    "隠岐": ("32528", "32", "T1", "Oki archipelago tourism and essential island access gateway."),
    "与那国": ("47382", "47", "T2", "Remote Yaeyama island endpoint with essential air access."),
    "種子島": ("46501", "46", "T1", "Tanegashima island tourism and regional access gateway."),
    "八丈島": ("13401", "13", "T1", "Izu island tourism and essential air access gateway."),
    "女満別": ("01564", "01", "T1", "Okhotsk and eastern Hokkaido tourism gateway."),
    "中標津": ("01692", "01", "T1", "Eastern Hokkaido regional and Shiretoko-area gateway."),
    "青森": ("02201", "02", "T1", "Aomori and northern Tohoku tourism gateway."),
    "岡山": ("33201", "33", "T1", "Okayama and Setouchi regional air gateway."),
    "富山": ("16201", "16", "T1", "Hokuriku and Alpine-route regional air gateway."),
}

A_REVIEW = {
    "東京国際": ("T0", "National domestic/international air gateway for Tokyo."),
    "成田国際": ("T0", "National international air gateway for the Tokyo region."),
    "中部国際": ("T0", "Central Japan international air and intermodal gateway."),
    "関西国際": ("T0", "Western Japan international air and island gateway."),
    "大阪国際": ("T0", "Major domestic air gateway for the Osaka/Kyoto/Kobe region."),
    "新千歳": ("T0", "Hokkaido-wide air gateway connecting Sapporo and regional tourism."),
    "福岡": ("T0", "Kyushu-wide air gateway adjacent to the Fukuoka urban rail network."),
    "那覇": ("T0", "Okinawa-wide trunk air gateway for mainland and island travel."),
    "函館": ("T1", "Southern Hokkaido regional tourism gateway."),
    "旭川": ("T1", "Central Hokkaido regional tourism gateway."),
    "仙台": ("T1", "Tohoku regional air gateway linked to Sendai."),
    "広島": ("T1", "Chugoku and Setouchi regional tourism gateway."),
    "高松": ("T1", "Shikoku regional gateway for Kagawa and island tourism."),
    "松山": ("T1", "Western Shikoku regional tourism gateway."),
    "長崎": ("T1", "Nagasaki and western Kyushu tourism gateway."),
    "熊本": ("T1", "Kumamoto and central Kyushu regional tourism gateway."),
    "鹿児島": ("T1", "Southern Kyushu regional and island-connection gateway."),
    "秋田": ("T1", "Northern Tohoku regional tourism gateway."),
    "新潟": ("T1", "Niigata and Sea-of-Japan regional gateway."),
    "宮崎": ("T1", "Eastern Kyushu coastal tourism gateway."),
    "大分": ("T1", "Oita and Beppu/onsen regional air gateway."),
    "高知": ("T1", "Southern Shikoku regional tourism gateway."),
    "釧路": ("T1", "Eastern Hokkaido wetland and regional tourism gateway."),
    "稚内": ("T2", "Northern Hokkaido remote air endpoint; wider hub role requires review."),
    "帯広": ("T2", "Tokachi regional air node; limited intermodal hub evidence."),
    "山形": ("T2", "Yamagata regional air node; intermodal hub role not yet established."),
    "山口宇部": ("T2", "Yamaguchi regional air node; wider network role not yet established."),
    "北九州": ("T2", "Northern Kyushu airport node; Fukuoka regional gateway is separate."),
}


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    return digest(path.read_bytes())


def rows(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def children(element):
    return {child.tag.split("}")[-1]: child for child in element}


def signature(item):
    return digest(canonical([item["currentNameJa"], "B_REGIONAL_AIRPORT", item["expectedPrefectureCode"]]))


def observations(current_html, c28_zip):
    current = current_html.read_bytes()
    if digest(current) != CURRENT_SHA or file_hash(c28_zip) != C28_SHA:
        raise RuntimeError("AIRPORT_PHASE2_SOURCE_HASH_MISMATCH")
    current_text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", " ", current.decode("utf-8"))))
    b_start, b_end = current_text.index("Ｂ．"), current_text.index("Ｃ．", current_text.index("Ｂ．"))
    b_section = current_text[b_start:b_end]
    with zipfile.ZipFile(c28_zip) as archive:
        raw = archive.read(XML_ENTRY)
    if digest(raw) != XML_SHA:
        raise RuntimeError("C28_XML_HASH_MISMATCH")
    root = ET.fromstring(raw)
    elements = {element.attrib[GML_ID]: element for element in root if GML_ID in element.attrib}
    by_name = defaultdict(list)
    for element in root:
        if element.tag.split("}")[-1] == "Airport":
            item = children(element)
            by_name[item["name"].text].append((element, item))
    out = []
    for short_name, (admin_code, pref, level, reason) in sorted(REGIONAL.items()):
        if short_name not in b_section:
            raise RuntimeError(f"CURRENT_B_AIRPORT_MISSING: {short_name}")
        current_name = short_name + "空港"
        c28_name = "新石垣空港" if short_name == "石垣" else current_name
        matches = by_name[c28_name]
        if not matches:
            raise RuntimeError(f"C28_B_AIRPORT_MISSING: {c28_name}")
        types = {item["type"].text for _, item in matches}
        codes = {item["administrativeAreaCode"].text for _, item in matches}
        refs = {item["airportReferencePoint"].attrib[XLINK_HREF].lstrip("#") for _, item in matches}
        if types != {"4"} or codes != {admin_code} or len(refs) != 1 or not admin_code.startswith(pref):
            raise RuntimeError(f"C28_B_AIRPORT_CROSSWALK_CONFLICT: {short_name}")
        reference = elements[next(iter(refs))]
        point_id = children(reference)["position"].attrib[XLINK_HREF].lstrip("#")
        latitude, longitude = map(float, children(elements[point_id])["pos"].text.split())
        if not (20 <= latitude <= 46 and 122 <= longitude <= 154 and math.isfinite(latitude) and math.isfinite(longitude)):
            raise RuntimeError(f"C28_B_AIRPORT_POINT_INVALID: {short_name}")
        out.append({
            "currentNameJa": current_name, "c28NameJa": c28_name, "currentAirportCategory": "B_REGIONAL_AIRPORT",
            "expectedPrefectureCode": pref, "c28HistoricalMunicipalityCode": admin_code, "c28HistoricalAirportType": "4",
            "c28AirportIds": sorted(element.attrib[GML_ID] for element, _ in matches),
            "c28ReferencePointId": next(iter(refs)), "latitude": latitude, "longitude": longitude,
            "coordinateRole": "AIRPORT_REFERENCE_POINT", "identityObservedAt": "2026-09-01", "coordinateObservedAt": "2021-12-31",
            "nodeLevel": level, "reviewReason": reason,
            "currentIdentitySource": CURRENT_URL, "coordinateSource": C28_URL,
            "additionalIdentityEvidence": ISHIGAKI_ALIAS_URL if short_name == "石垣" else None,
        })
    if len(out) != 19:
        raise RuntimeError("REGIONAL_AIRPORT_REVIEW_COUNT_CHANGED")
    return out


def allocate(observations_list, accepted_at):
    out = []
    for item in observations_list:
        anchor = "ta:regional-airport:" + str(uuid.uuid4())
        out.append({
            "transportNodeId": "transport-node:" + str(uuid.uuid5(NAMESPACE, anchor)),
            "identityAnchor": anchor, "identitySignature": signature(item), "identityStatus": "NODE_ACCEPTED",
            "canonicalNameJa": item["currentNameJa"], "aliases": [item["c28NameJa"]] if item["c28NameJa"] != item["currentNameJa"] else [],
            "nodeKind": "airport", "acceptedAt": accepted_at,
            "externalRefs": [{"source": "MLIT C28 2021", "field": "C28_000", "id": value} for value in item["c28AirportIds"]],
            "sourceRefs": [CURRENT_URL, C28_URL, TERMS_URL] + ([ISHIGAKI_ALIAS_URL] if item["additionalIdentityEvidence"] else []),
            "decisionEvidence": {"currentClass": "B_REGIONAL_AIRPORT", "c28HistoricalType": "4", "c28HistoricalMunicipalityCode": item["c28HistoricalMunicipalityCode"], "uniqueReferencePoint": item["c28ReferencePointId"], "nameAliasExplicitlyReviewed": item["additionalIdentityEvidence"] is not None, "licenseDecision": "PASS_COMMERCIAL_REUSE_WITH_ATTRIBUTION", "sourceCodeUsedAsTravelAssistId": False},
        })
    return sorted(out, key=lambda x: x["transportNodeId"])


def validate_ledger(ledger):
    if len(ledger) != 19 or len({x["transportNodeId"] for x in ledger}) != 19 or len({x["identitySignature"] for x in ledger}) != 19:
        raise RuntimeError("REGIONAL_AIRPORT_LEDGER_DUPLICATE_OR_COUNT")
    for item in ledger:
        if item["transportNodeId"] != "transport-node:" + str(uuid.uuid5(NAMESPACE, item["identityAnchor"])) or item["identityStatus"] != "NODE_ACCEPTED":
            raise RuntimeError("REGIONAL_AIRPORT_ID_REBIND")


def hierarchy_decisions(a_nodes, regional_nodes, observations_list):
    if len(a_nodes) != 28 or len({x["canonicalNameJa"] for x in a_nodes}) != 28 or len(A_REVIEW) != 28:
        raise RuntimeError("A_AIRPORT_HIERARCHY_REVIEW_COUNT_CHANGED")
    decisions = []
    for node in a_nodes:
        short = node["canonicalNameJa"].removesuffix("空港")
        if short not in A_REVIEW:
            raise RuntimeError(f"A_AIRPORT_HIERARCHY_MISSING: {short}")
        level, reason = A_REVIEW[short]
        decisions.append({"transportNodeId": node["transportNodeId"], "nodeLevel": level, "reviewReason": reason, "sourceRefs": [CURRENT_URL, C28_URL], "airportCategoryIsHierarchy": False, "identityObservedAt": node["identityObservedAt"], "coordinateObservedAt": node["coordinateObservedAt"]})
    regional_by_name = {item["currentNameJa"]: item for item in observations_list}
    for node in regional_nodes:
        observation = regional_by_name[node["canonicalNameJa"]]
        decisions.append({"transportNodeId": node["transportNodeId"], "nodeLevel": observation["nodeLevel"], "reviewReason": observation["reviewReason"], "sourceRefs": node["sourceRefs"] + ([OKINAWA_ROLE_URL] if observation["expectedPrefectureCode"] == "47" else []), "airportCategoryIsHierarchy": False, "identityObservedAt": node["identityObservedAt"], "coordinateObservedAt": node["coordinateObservedAt"]})
    return sorted(decisions, key=lambda x: x["transportNodeId"])


def write_or_verify(path, body, rebuild):
    if path.exists() and not rebuild:
        if file_hash(path) != digest(body):
            raise RuntimeError(f"CORRUPTED_REGIONAL_AIRPORT_ARTIFACT: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)


def process(args):
    observed = observations(Path(args.current_html), Path(args.c28_zip))
    ledger_path = Path(args.ledger)
    if args.allocate:
        if ledger_path.exists() or not args.accepted_at:
            raise RuntimeError("REGIONAL_AIRPORT_LEDGER_ALREADY_EXISTS_OR_TIME_MISSING")
        ledger = allocate(observed, args.accepted_at)
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_bytes(b"".join(canonical(x) for x in ledger))
    ledger = rows(ledger_path)
    validate_ledger(ledger)
    by_signature = {x["identitySignature"]: x for x in ledger}
    nodes = []
    for item in observed:
        identity = by_signature.get(signature(item))
        if not identity or identity["canonicalNameJa"] != item["currentNameJa"]:
            raise RuntimeError("REGIONAL_AIRPORT_IDENTITY_REVIEW_REQUIRED")
        nodes.append({
            "transportNodeId": identity["transportNodeId"], "identityStatus": "NODE_ACCEPTED",
            "canonicalNameJa": identity["canonicalNameJa"], "aliases": identity["aliases"], "nodeKind": "airport",
            "nodeLevel": item["nodeLevel"], "hierarchyEvidence": item["reviewReason"],
            "latitude": item["latitude"], "longitude": item["longitude"], "coordinateRole": item["coordinateRole"],
            "currentIdentitySource": CURRENT_URL, "coordinateSource": C28_URL,
            "identityObservedAt": item["identityObservedAt"], "coordinateObservedAt": item["coordinateObservedAt"],
            "airportCategory": item["currentAirportCategory"], "managementCategory": "LOCAL",
            "prefectureCode": None, "municipalityCode": None,
            "c28HistoricalMunicipalityCode": item["c28HistoricalMunicipalityCode"], "c28HistoricalAirportType": "4",
            "parentHubId": None, "hubResolutionStatus": "SELF_GATEWAY", "terminalComponentStatus": "NOT_REVIEWED",
            "operatorRefs": [], "lineRefs": [], "serviceRefs": [], "externalRefs": identity["externalRefs"],
            "sourceRefs": identity["sourceRefs"], "confidence": 0.88,
            "unresolvedReasons": ["CURRENT_MUNICIPALITY_UNRESOLVED", "TERMINAL_COMPONENTS_NOT_REVIEWED", "COORDINATE_SNAPSHOT_2021"],
        })
    nodes.sort(key=lambda x: x["transportNodeId"])
    a_nodes = rows(Path(args.a_airports))
    decisions = hierarchy_decisions(a_nodes, nodes, observed)
    output = Path(args.output)
    payloads = {
        "candidates.jsonl": b"".join(canonical(x) for x in observed),
        "transport-nodes.jsonl": b"".join(canonical(x) for x in nodes),
        "airport-hierarchy-decisions.jsonl": b"".join(canonical(x) for x in decisions),
    }
    if args.batch not in (None, 1):
        raise RuntimeError("BATCH_OUT_OF_RANGE")
    node_body = payloads["transport-nodes.jsonl"]
    receipt = canonical({"batchId": "batch-0001", "nodeCount": 19, "nodeSha256": digest(node_body), "ledgerSha256": file_hash(ledger_path), "aAirportNodeSha256": file_hash(Path(args.a_airports))})
    write_or_verify(output / "batches" / "batch-0001.jsonl", node_body, args.rebuild)
    write_or_verify(output / "batch-receipts" / "batch-0001.json", receipt, args.rebuild)
    for name, body in payloads.items():
        write_or_verify(output / name, body, args.rebuild)
    manifest = canonical({
        "task": "TASK-084-B", "stage": "SELECTED_B_AIRPORTS_AND_A_B_HIERARCHY", "nationalMasterStatus": "PARTIAL",
        "acceptedCount": 19, "candidateCount": 19, "hierarchyDecisionCount": 47, "batchSize": BATCH_SIZE,
        "batches": [{"batchId": "batch-0001", "receiptSha256": digest(receipt)}],
        "currentSourceSha256": CURRENT_SHA, "c28ArchiveSha256": C28_SHA, "c28XmlSha256": XML_SHA,
        "identityLedgerSha256": file_hash(ledger_path), "aAirportNodeSha256": file_hash(Path(args.a_airports)),
        "sourceLicenseDecision": "PASS_COMMERCIAL_REUSE_WITH_ATTRIBUTION",
        "artifactSha256": {name: digest(body) for name, body in payloads.items()},
    })
    write_or_verify(output / "manifest.json", manifest, args.rebuild)
    print(json.dumps({"acceptedCount": 19, "hierarchyDecisionCount": len(decisions), "batchCount": 1}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--current-html", required=True)
    parser.add_argument("--c28-zip", required=True)
    parser.add_argument("--a-airports", required=True)
    parser.add_argument("--ledger", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--allocate", action="store_true")
    parser.add_argument("--accepted-at")
    parser.add_argument("--rebuild", action="store_true")
    parser.add_argument("--batch", type=int)
    args = parser.parse_args()
    try:
        process(args)
    except (OSError, KeyError, ValueError, RuntimeError, ET.ParseError, zipfile.BadZipFile) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
