#!/usr/bin/env python3
"""Review current MLIT airport identities against licensed 2021 C28 GML points.

The current Aviation Bureau list establishes identity/category. C28 supplies an
explicitly historical reference point. Neither source ID is a TravelAssist ID.
"""
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
CURRENT_SHA = "033c72ca0329c6be15a5b2c179ea25d1e96130517ba24601bdfaf15c6fd8d360"
C28_SHA = "07d69353a34558d7ebd21d4b5f62b685d4f9b9d0e55c6eed6ce05aefcc6b7b35"
XML_SHA = "3fdbef2b7bd514a3aa22235d9874c508d56597a0407e7b4e1f1815e36ac7a158"
XML_ENTRY = "UTF-8/C28-21.xml"
NAMESPACE = uuid.UUID("ed7ae3bf-b4e1-4a2c-abd6-acf1ea74d15d")
GML_ID = "{http://www.opengis.net/gml/3.2.1}id"
XLINK_HREF = "{http://www.w3.org/1999/xlink}href"
BATCH_SIZE = 200

# Aviation Bureau A-class airports, current 2026-09-01. The expected prefecture
# is an independent reviewed crosswalk check against C28's 2021 admin code.
REVIEW = {
    "成田国際": ("COMPANY", "12"), "中部国際": ("COMPANY", "23"),
    "関西国際": ("COMPANY", "27"), "大阪国際": ("COMPANY", "27"),
    "東京国際": ("NATIONAL", "13"), "新千歳": ("NATIONAL", "01"),
    "稚内": ("NATIONAL", "01"), "釧路": ("NATIONAL", "01"),
    "函館": ("NATIONAL", "01"), "仙台": ("NATIONAL", "04"),
    "新潟": ("NATIONAL", "15"), "広島": ("NATIONAL", "34"),
    "高松": ("NATIONAL", "37"), "松山": ("NATIONAL", "38"),
    "高知": ("NATIONAL", "39"), "福岡": ("NATIONAL", "40"),
    "北九州": ("NATIONAL", "40"), "長崎": ("NATIONAL", "42"),
    "熊本": ("NATIONAL", "43"), "大分": ("NATIONAL", "44"),
    "宮崎": ("NATIONAL", "45"), "鹿児島": ("NATIONAL", "46"),
    "那覇": ("NATIONAL", "47"),
    "旭川": ("SPECIAL_LOCAL", "01"), "帯広": ("SPECIAL_LOCAL", "01"),
    "秋田": ("SPECIAL_LOCAL", "05"), "山形": ("SPECIAL_LOCAL", "06"),
    "山口宇部": ("SPECIAL_LOCAL", "35"),
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


def source_observations(current_path, c28_path):
    current = current_path.read_bytes()
    if digest(current) != CURRENT_SHA or file_hash(c28_path) != C28_SHA:
        raise RuntimeError("SOURCE_HASH_MISMATCH")
    current_text = html.unescape(re.sub(r"<[^>]*>", " ", current.decode("utf-8")))
    current_text = re.sub(r"\s+", " ", current_text)
    a_start = current_text.index("Ａ．拠点空港")
    a_end = current_text.index("Ｂ．", a_start)
    a_section = current_text[a_start:a_end]
    category_markers = {
        "COMPANY": ("会社管理空港", "国管理空港"),
        "NATIONAL": ("国管理空港", "特定地方管理空港"),
        "SPECIAL_LOCAL": ("特定地方管理空港", None),
    }
    with zipfile.ZipFile(c28_path) as archive:
        xml = archive.read(XML_ENTRY)
    if digest(xml) != XML_SHA:
        raise RuntimeError("C28_XML_HASH_MISMATCH")
    root = ET.fromstring(xml)
    elements = {element.attrib[GML_ID]: element for element in root if GML_ID in element.attrib}
    by_name = defaultdict(list)
    for element in root:
        if element.tag.split("}")[-1] == "Airport":
            item = children(element)
            by_name[item["name"].text].append((element, item))
    observations = []
    for short_name, (category, expected_pref) in sorted(REVIEW.items()):
        start_marker, end_marker = category_markers[category]
        segment = a_section[a_section.index(start_marker):]
        if end_marker:
            segment = segment[:segment.index(end_marker)]
        if short_name not in segment:
            raise RuntimeError(f"CURRENT_AIRPORT_CATEGORY_MISMATCH: {short_name}")
        full_name = short_name + "空港"
        matches = by_name[full_name]
        if not matches:
            raise RuntimeError(f"C28_NAME_MISSING: {short_name}")
        admin_codes = {item["administrativeAreaCode"].text for _, item in matches}
        historical_types = {item["type"].text for _, item in matches}
        ref_ids = {item["airportReferencePoint"].attrib[XLINK_HREF].lstrip("#") for _, item in matches}
        if len(admin_codes) != 1 or len(ref_ids) != 1 or len(historical_types) != 1:
            raise RuntimeError(f"C28_IDENTITY_AMBIGUOUS: {short_name}")
        if next(iter(historical_types)) != {"COMPANY": "1", "NATIONAL": "2", "SPECIAL_LOCAL": "3"}[category]:
            raise RuntimeError(f"C28_CLASSIFICATION_CONFLICT: {short_name}")
        admin_code = next(iter(admin_codes))
        if admin_code[:2] != expected_pref:
            raise RuntimeError(f"C28_PREFECTURE_CONFLICT: {short_name}")
        reference = elements[next(iter(ref_ids))]
        point_id = children(reference)["position"].attrib[XLINK_HREF].lstrip("#")
        point = elements[point_id]
        latitude, longitude = map(float, children(point)["pos"].text.split())
        if not (20 <= latitude <= 46 and 122 <= longitude <= 154 and math.isfinite(latitude) and math.isfinite(longitude)):
            raise RuntimeError(f"C28_POINT_INVALID: {short_name}")
        observations.append({
            "currentNameJa": full_name,
            "currentAirportCategory": "A_BASE_AIRPORT",
            "currentManagementCategory": category,
            "expectedPrefectureCode": expected_pref,
            "c28NameJa": full_name,
            "c28HistoricalMunicipalityCode": admin_code,
            "c28HistoricalAirportType": next(iter(historical_types)),
            "c28AirportIds": sorted(element.attrib[GML_ID] for element, _ in matches),
            "c28ReferencePointId": next(iter(ref_ids)),
            "latitude": latitude,
            "longitude": longitude,
            "coordinateRole": "AIRPORT_REFERENCE_POINT",
            "currentIdentitySource": CURRENT_URL,
            "coordinateSource": C28_URL,
            "identityObservedAt": "2026-09-01",
            "coordinateObservedAt": "2021-12-31",
            "selectionReason": "Current Aviation Bureau A-class airport; intercity or regional air gateway for tourism planning.",
            "identityReviewStatus": "CROSSWALK_REVIEWED",
        })
    if len(observations) != 28:
        raise RuntimeError("REVIEW_COUNT_MISMATCH")
    return observations


def signature(observation):
    return digest(canonical([observation["currentNameJa"], observation["currentManagementCategory"], observation["expectedPrefectureCode"]]))


def allocate(observations, accepted_at):
    out = []
    for observation in observations:
        anchor = "ta:airport:" + str(uuid.uuid4())
        out.append({
            "transportNodeId": "transport-node:" + str(uuid.uuid5(NAMESPACE, anchor)),
            "identityAnchor": anchor,
            "identitySignature": signature(observation),
            "identityStatus": "NODE_ACCEPTED",
            "canonicalNameJa": observation["currentNameJa"],
            "aliases": [],
            "nodeKind": "airport",
            "operatorRefs": [],
            "lineRefs": [],
            "externalRefs": [{"source": "MLIT C28 2021", "field": "C28_000", "id": value} for value in observation["c28AirportIds"]],
            "acceptedAt": accepted_at,
            "sourceRefs": [CURRENT_URL, C28_URL, TERMS_URL],
            "decisionEvidence": {
                "currentCategory": observation["currentAirportCategory"],
                "currentManagementCategory": observation["currentManagementCategory"],
                "prefectureCrosswalk": observation["expectedPrefectureCode"],
                "c28HistoricalMunicipalityCode": observation["c28HistoricalMunicipalityCode"],
                "c28HistoricalAirportType": observation["c28HistoricalAirportType"],
                "uniqueC28ReferencePoint": observation["c28ReferencePointId"],
                "spatialBoundsValidated": True,
                "licenseDecision": "PASS_COMMERCIAL_REUSE_WITH_ATTRIBUTION",
                "sourceCodeUsedAsTravelAssistId": False,
            },
        })
    return sorted(out, key=lambda item: item["transportNodeId"])


def validate_ledger(ledger):
    ids = [item["transportNodeId"] for item in ledger]
    signatures = [item["identitySignature"] for item in ledger]
    if len(ids) != len(set(ids)) or len(signatures) != len(set(signatures)):
        raise RuntimeError("DUPLICATE_AIRPORT_IDENTITY")
    for item in ledger:
        if item["transportNodeId"] != "transport-node:" + str(uuid.uuid5(NAMESPACE, item["identityAnchor"])):
            raise RuntimeError("AIRPORT_ID_REBIND")
        if item["identityStatus"] != "NODE_ACCEPTED" or item["decisionEvidence"]["licenseDecision"] != "PASS_COMMERCIAL_REUSE_WITH_ATTRIBUTION":
            raise RuntimeError("AIRPORT_LEDGER_DECISION_INVALID")


def write_or_verify(path, body, rebuild):
    if path.exists() and not rebuild:
        if file_hash(path) != digest(body):
            raise RuntimeError(f"CORRUPTED_AIRPORT_ARTIFACT: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)


def process(args):
    observations = source_observations(Path(args.current_html), Path(args.c28_zip))
    output = Path(args.output)
    candidate_body = b"".join(canonical(item) for item in observations)
    ledger_path = Path(args.ledger)
    if args.allocate:
        if ledger_path.exists() or not args.accepted_at:
            raise RuntimeError("AIRPORT_LEDGER_ALREADY_EXISTS_OR_TIME_MISSING")
        ledger = allocate(observations, args.accepted_at)
        ledger_path.parent.mkdir(parents=True, exist_ok=True)
        ledger_path.write_bytes(b"".join(canonical(item) for item in ledger))
    else:
        ledger = rows(ledger_path)
    validate_ledger(ledger)
    if len(ledger) != len(observations):
        raise RuntimeError("AIRPORT_LEDGER_COUNT_MISMATCH")
    by_signature = {item["identitySignature"]: item for item in ledger}
    accepted = []
    for observation in observations:
        identity = by_signature.get(signature(observation))
        if identity is None:
            raise RuntimeError("AIRPORT_IDENTITY_REVIEW_REQUIRED")
        accepted.append({
            "transportNodeId": identity["transportNodeId"],
            "identityStatus": "NODE_ACCEPTED",
            "canonicalNameJa": identity["canonicalNameJa"],
            "aliases": identity["aliases"],
            "nodeKind": "airport",
            "nodeLevel": "T1",
            "hierarchyEvidence": "Aviation Bureau A-class airport; reviewed intercity/regional gateway. T0 requires separate national hierarchy review.",
            "latitude": observation["latitude"],
            "longitude": observation["longitude"],
            "coordinateRole": observation["coordinateRole"],
            "currentIdentitySource": CURRENT_URL,
            "coordinateSource": C28_URL,
            "identityObservedAt": observation["identityObservedAt"],
            "coordinateObservedAt": observation["coordinateObservedAt"],
            "airportCategory": observation["currentAirportCategory"],
            "managementCategory": observation["currentManagementCategory"],
            "prefectureCode": None,
            "municipalityCode": None,
            "c28HistoricalMunicipalityCode": observation["c28HistoricalMunicipalityCode"],
            "c28HistoricalAirportType": observation["c28HistoricalAirportType"],
            "parentHubId": None,
            "hubResolutionStatus": "SELF_GATEWAY",
            "terminalComponentStatus": "NOT_REVIEWED",
            "operatorRefs": [],
            "lineRefs": [],
            "serviceRefs": [],
            "externalRefs": identity["externalRefs"],
            "sourceRefs": identity["sourceRefs"],
            "confidence": 0.9,
            "unresolvedReasons": ["CURRENT_MUNICIPALITY_UNRESOLVED", "TERMINAL_COMPONENTS_NOT_REVIEWED", "COORDINATE_SNAPSHOT_2021"],
        })
    accepted.sort(key=lambda item: item["transportNodeId"])
    candidate_path = output / "candidates.jsonl"
    nodes_path = output / "transport-nodes.jsonl"
    batch_path = output / "batches" / "batch-0001.jsonl"
    candidate_manifest = {"count": len(observations), "currentSourceSha256": CURRENT_SHA, "c28ArchiveSha256": C28_SHA, "c28XmlSha256": XML_SHA, "sourceLicense": "COMMERCIAL_REUSE_WITH_ATTRIBUTION", "candidateSha256": digest(candidate_body)}
    candidate_manifest_body = canonical(candidate_manifest)
    nodes_body = b"".join(canonical(item) for item in accepted)
    receipt = {"batchId": "batch-0001", "nodeCount": len(accepted), "nodeSha256": digest(nodes_body), "identityLedgerSha256": file_hash(ledger_path), "candidateManifestSha256": digest(candidate_manifest_body)}
    receipt_body = canonical(receipt)
    manifest = {"task": "TASK-084-B", "stage": "AIRPORT_NODE_ACCEPTANCE", "nationalMasterStatus": "PARTIAL", "candidateCount": len(observations), "acceptedCount": len(accepted), "batchSize": BATCH_SIZE, "batches": [{"batchId": "batch-0001", "receiptSha256": digest(receipt_body)}], "sourceLicenseDecision": "PASS", "identityLedgerSha256": file_hash(ledger_path), "artifactSha256": {"candidates.jsonl": digest(candidate_body), "transport-nodes.jsonl": digest(nodes_body)}}
    targets = [(candidate_path, candidate_body), (output / "candidate-manifest.json", candidate_manifest_body), (nodes_path, nodes_body), (batch_path, nodes_body), (output / "batch-receipts" / "batch-0001.json", receipt_body), (output / "manifest.json", canonical(manifest))]
    if args.batch not in (None, 1):
        raise RuntimeError("BATCH_OUT_OF_RANGE")
    for path, body in targets:
        write_or_verify(path, body, args.rebuild)
    print(json.dumps({"candidateCount": len(observations), "acceptedCount": len(accepted), "batchCount": 1}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--current-html", required=True)
    parser.add_argument("--c28-zip", required=True)
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
