#!/usr/bin/env python3
"""Assemble accepted TASK-084-B phase artifacts without reallocating any ID."""
import argparse
import hashlib
import json
import sys
from collections import Counter, defaultdict
from pathlib import Path

BATCH_SIZE = 200
ORIGINAL_NODE_LEDGER_SHA = "a31b42ccf2fb9891710d24874d6f9cd79736bf2e5cdabd2f6cddc8e0c15a75c0"
ORIGINAL_HUB_LEDGER_SHA = "d66b3988b1bf6cfa26fd511929198382c4dd440b890c582e2bf8851cfe6471c1"
HIERARCHY = {
    "東京": ("T0", "National Tokaido/Tohoku Shinkansen interchange and central rail/metro gateway."),
    "新大阪": ("T0", "National Tokaido/Sanyo Shinkansen interchange and Kansai rail/metro gateway."),
    "博多": ("T0", "Super-regional Sanyo/Kyushu Shinkansen interchange and Fukuoka rail/metro gateway."),
    "京都": ("T1", "Major regional tourism gateway with Tokaido Shinkansen, JR, private rail and metro transfer."),
    "大宮": ("T1", "Major northern Kanto regional gateway with Shinkansen, JR and private rail transfer."),
}


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n"


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    return digest(path.read_bytes())


def rows(path):
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line]


def verify_stage(root, expected_count):
    manifest_path = root / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest["acceptedCount"] != expected_count:
        raise RuntimeError(f"STAGE_COUNT_CHANGED: {root}")
    node_path = root / "transport-nodes.jsonl"
    if file_hash(node_path) != manifest["artifactSha256"]["transport-nodes.jsonl"]:
        raise RuntimeError(f"STAGE_NODE_HASH_CHANGED: {root}")
    nodes = rows(node_path)
    if len(nodes) != expected_count:
        raise RuntimeError(f"STAGE_NODE_COUNT_CHANGED: {root}")
    batched = []
    for batch in manifest["batches"]:
        batch_id = batch["batchId"]
        receipt_path = root / "batch-receipts" / f"{batch_id}.json"
        if file_hash(receipt_path) != batch["receiptSha256"]:
            raise RuntimeError(f"STAGE_RECEIPT_CHANGED: {batch_id}")
        receipt = json.loads(receipt_path.read_text(encoding="utf-8"))
        batch_path = root / "batches" / f"{batch_id}.jsonl"
        claimed = receipt.get("nodeSha256", receipt.get("outputSha256"))
        if file_hash(batch_path) != claimed:
            raise RuntimeError(f"STAGE_BATCH_CHANGED: {batch_id}")
        batched.extend(rows(batch_path))
    if batched != nodes:
        raise RuntimeError(f"STAGE_BATCH_CONTENT_CHANGED: {root}")
    return nodes, manifest


def batchify(nodes):
    return [nodes[index:index + BATCH_SIZE] for index in range(0, len(nodes), BATCH_SIZE)]


def hub_resolution_counts(nodes):
    allowed = {"ACCEPTED", "UNRESOLVED", "HUB_REVIEW_REQUIRED", "SELF_GATEWAY", "NOT_APPLICABLE"}
    counts = Counter()
    for node in nodes:
        status = node["hubResolutionStatus"]
        if status not in allowed:
            raise RuntimeError(f"INVALID_HUB_RESOLUTION_STATUS: {status}")
        parent = node["parentHubId"]
        reasons = node.get("unresolvedReasons", [])
        if status == "ACCEPTED" and not parent:
            raise RuntimeError("ACCEPTED_HUB_PARENT_MISSING")
        if status != "ACCEPTED" and parent:
            raise RuntimeError("NON_ACCEPTED_HUB_HAS_PARENT")
        if status in {"SELF_GATEWAY", "NOT_APPLICABLE"} and ("PARENT_HUB_UNRESOLVED" in reasons or "HUB_RELATION_UNRESOLVED" in reasons):
            raise RuntimeError("STANDALONE_GATEWAY_PARENT_UNRESOLVED")
        if status == "ACCEPTED" and "HUB_RELATION_UNRESOLVED" in reasons:
            raise RuntimeError("ACCEPTED_HUB_HAS_STALE_UNRESOLVED_REASON")
        if node["nodeKind"] == "ferry_port" and status != "SELF_GATEWAY":
            raise RuntimeError("FERRY_GATEWAY_HUB_STATUS_INVALID")
        counts[status] += 1
    return counts


def validate_n03_rights(rights, nodes):
    if rights["decision"] not in {"PASS_WITH_ATTRIBUTION", "APPROVAL_REQUIRED", "BLOCKED", "ALTERNATIVE_SOURCE_REQUIRED"}:
        raise RuntimeError("N03_RIGHTS_DECISION_INVALID")
    if rights["decision"] != "PASS_WITH_ATTRIBUTION":
        assignment_fields = ("prefecture", "prefectureName", "prefectureCode", "municipality", "municipalityName", "municipalityCode", "administrativeSource", "sourceVersion", "joinAlgorithmVersion", "boundaryStatus")
        if rights["productionJoinAllowed"] or any(any(node.get(field) is not None for field in assignment_fields) for node in nodes):
            raise RuntimeError("ADMIN_ASSIGNMENT_BEFORE_RIGHTS_PASS")
    elif (not rights["productionJoinAllowed"] or not rights["formalGsiConfirmationOnFile"]
          or not rights.get("formalGsiDecisionRef") or not rights.get("attributionText")):
        raise RuntimeError("N03_RIGHTS_PASS_EVIDENCE_MISSING")


def write_or_verify(path, body, rebuild):
    if path.exists() and not rebuild:
        if file_hash(path) != digest(body):
            raise RuntimeError(f"CORRUPTED_MASTER_ARTIFACT: {path}")
    else:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(body)


def process(args):
    data = Path(args.data)
    original_node_ledger = data / "transport-node-identity-ledger.jsonl"
    original_hub_ledger = data / "transport-hub-identity-ledger.jsonl"
    if file_hash(original_node_ledger) != ORIGINAL_NODE_LEDGER_SHA or file_hash(original_hub_ledger) != ORIGINAL_HUB_LEDGER_SHA:
        raise RuntimeError("ORIGINAL_ACCEPTED_IDENTITY_CHANGED")
    stages = [
        (data / "task-084-b-accepted", 110),
        (data / "task-084-b-core-rail-accepted", 22),
        (data / "task-084-b-airport-accepted", 28),
        (data / "task-084-b-ferry-accepted", 7),
        (data / "task-084-b-national-rail-accepted", 47),
        (data / "task-084-b-regional-airport-accepted", 19),
        (data / "task-084-b-nagasaki-bus-accepted", 5),
        (data / "task-084-b-tourism-cable-accepted", 6),
    ]
    stage_nodes = []
    stage_manifests = []
    for root, count in stages:
        nodes, manifest = verify_stage(root, count)
        stage_nodes.extend(nodes)
        stage_manifests.append({"stage": root.name, "manifestSha256": file_hash(root / "manifest.json"), "acceptedCount": count})
    ids = [node["transportNodeId"] for node in stage_nodes]
    if len(ids) != len(set(ids)):
        raise RuntimeError("MASTER_DUPLICATE_TRANSPORT_NODE_ID")
    node_by_id = {node["transportNodeId"]: node for node in stage_nodes}
    original_ids = {item["transportNodeId"] for item in rows(original_node_ledger)}
    if original_ids != {node["transportNodeId"] for node in stage_nodes[:110]}:
        raise RuntimeError("ORIGINAL_NODE_IDS_CHANGED")
    rail_ledger = data / "transport-rail-expansion-identity-ledger.jsonl"
    airport_ledger = data / "transport-airport-identity-ledger.jsonl"
    if {item["transportNodeId"] for item in rows(rail_ledger)} != {node["transportNodeId"] for node in stage_nodes[110:132]}:
        raise RuntimeError("RAIL_LEDGER_IDS_CHANGED")
    if {item["transportNodeId"] for item in rows(airport_ledger)} != {node["transportNodeId"] for node in stage_nodes[132:160]}:
        raise RuntimeError("AIRPORT_LEDGER_IDS_CHANGED")
    ferry_ledger = data / "transport-ferry-identity-ledger.jsonl"
    if {item["transportNodeId"] for item in rows(ferry_ledger)} != {node["transportNodeId"] for node in stage_nodes[160:167]}:
        raise RuntimeError("FERRY_LEDGER_IDS_CHANGED")
    national_rail_ledger = data / "transport-national-rail-identity-ledger.jsonl"
    national_hub_ledger = data / "transport-national-hub-identity-ledger.jsonl"
    if {item["transportNodeId"] for item in rows(national_rail_ledger)} != {node["transportNodeId"] for node in stage_nodes[167:214]}:
        raise RuntimeError("NATIONAL_RAIL_LEDGER_IDS_CHANGED")
    regional_airport_ledger = data / "transport-regional-airport-identity-ledger.jsonl"
    if {item["transportNodeId"] for item in rows(regional_airport_ledger)} != {node["transportNodeId"] for node in stage_nodes[214:233]}:
        raise RuntimeError("REGIONAL_AIRPORT_LEDGER_IDS_CHANGED")
    bus_ledger = data / "transport-nagasaki-bus-identity-ledger.jsonl"
    bus_stage = data / "task-084-b-nagasaki-bus-accepted"
    bus_manifest = json.loads((bus_stage / "manifest.json").read_text(encoding="utf-8"))
    if file_hash(bus_ledger) != bus_manifest["identityLedgerSha256"] or {item["transportNodeId"] for item in rows(bus_ledger)} != {node["transportNodeId"] for node in stage_nodes[233:238]}:
        raise RuntimeError("BUS_LEDGER_IDS_CHANGED")
    cable_ledger = data / "transport-tourism-cable-identity-ledger.jsonl"
    cable_stage = data / "task-084-b-tourism-cable-accepted"
    cable_manifest = json.loads((cable_stage / "manifest.json").read_text(encoding="utf-8"))
    if file_hash(cable_ledger) != cable_manifest["identityLedgerSha256"] or {item["transportNodeId"] for item in rows(cable_ledger)} != {node["transportNodeId"] for node in stage_nodes[238:244]}:
        raise RuntimeError("CABLE_LEDGER_IDS_CHANGED")
    gtfs_registry = data.parent / "gtfs-source-license-registry.jsonl"
    source_decisions = rows(gtfs_registry)
    if not any(item["provider"] == "福岡市営渡船" and item["decision"] == "LICENSE_PASS_AND_GATEWAY_ACCEPTED" and item["sourceArchiveSha256"] == json.loads((data / "task-084-b-ferry-accepted" / "manifest.json").read_text(encoding="utf-8"))["feedSha256"] for item in source_decisions):
        raise RuntimeError("FERRY_FEED_LICENSE_DECISION_MISSING")
    if not any(item["provider"] == "長崎県交通局" and item["decision"] == "LICENSE_PASS_AND_GATEWAY_ACCEPTED" and item["commercialUse"] and item["persistenceAllowed"] and item["derivedDataAllowed"] and item["sourceArchiveSha256"] == bus_manifest["feedSha256"] for item in source_decisions):
        raise RuntimeError("BUS_FEED_LICENSE_DECISION_MISSING")
    hubs = rows(original_hub_ledger)
    if {hub["canonicalNameJa"] for hub in hubs} != set(HIERARCHY):
        raise RuntimeError("ORIGINAL_HUB_SET_CHANGED")
    hub_by_id = {hub["hubId"]: hub for hub in hubs}
    new_stage = data / "task-084-b-national-rail-accepted"
    new_manifest = json.loads((new_stage / "manifest.json").read_text(encoding="utf-8"))
    if file_hash(national_rail_ledger) != new_manifest["nodeLedgerSha256"] or file_hash(national_hub_ledger) != new_manifest["hubLedgerSha256"]:
        raise RuntimeError("NATIONAL_RAIL_LEDGER_HASH_CHANGED")
    for name in ["transport-hubs.jsonl", "hub-component-decisions.jsonl", "excluded-same-name.jsonl"]:
        if file_hash(new_stage / name) != new_manifest["artifactSha256"][name]:
            raise RuntimeError(f"NATIONAL_RAIL_REVIEW_HASH_CHANGED: {name}")
    new_hubs = rows(new_stage / "transport-hubs.jsonl")
    if new_hubs != rows(national_hub_ledger) or len(new_hubs) != 16:
        raise RuntimeError("NATIONAL_HUB_LEDGER_CHANGED")
    if {hub["hubId"] for hub in new_hubs} & set(hub_by_id) or {hub["canonicalNameJa"] for hub in new_hubs} & {hub["canonicalNameJa"] for hub in hubs}:
        raise RuntimeError("NATIONAL_HUB_IDENTITY_COLLISION")
    hub_by_id.update({hub["hubId"]: hub for hub in new_hubs})
    hub_decisions = rows(data / "task-084-b-core-rail-accepted" / "hub-component-decisions.jsonl")
    new_hub_decisions = rows(new_stage / "hub-component-decisions.jsonl")
    extra_components = defaultdict(list)
    for decision in hub_decisions:
        node_id, hub_id = decision["transportNodeId"], decision["hubId"]
        node = node_by_id.get(node_id)
        if not node or hub_id not in hub_by_id or node["parentHubId"] != hub_id or not decision["officialOperatorGuide"]:
            raise RuntimeError("INVALID_NEW_HUB_COMPONENT_DECISION")
        if node_id in extra_components[hub_id]:
            raise RuntimeError("DUPLICATE_NEW_HUB_COMPONENT")
        extra_components[hub_id].append(node_id)
    if len(hub_decisions) != 22:
        raise RuntimeError("NEW_HUB_COMPONENT_COUNT_CHANGED")
    old_shinkansen_ids = {node["transportNodeId"] for node in stage_nodes[:110]}
    new_rail_ids = {node["transportNodeId"] for node in stage_nodes[167:214]}
    seen_new_decisions = set()
    for decision in new_hub_decisions:
        node_id, hub_id = decision["transportNodeId"], decision["hubId"]
        node = node_by_id.get(node_id)
        if not node or hub_id not in {hub["hubId"] for hub in new_hubs} or node_id in seen_new_decisions:
            raise RuntimeError("INVALID_NATIONAL_HUB_COMPONENT_DECISION")
        if not decision["officialStationGuide"] or decision["sameNameAloneUsed"]:
            raise RuntimeError("NATIONAL_HUB_GUIDE_REQUIRED")
        if decision["componentOrigin"] == "NEW_N02_COMPONENT":
            if node_id not in new_rail_ids or node["parentHubId"] != hub_id:
                raise RuntimeError("NEW_NATIONAL_RAIL_HUB_LINK_INVALID")
        elif decision["componentOrigin"] == "IMMUTABLE_SHINKANSEN_ID":
            if node_id not in old_shinkansen_ids or node["parentHubId"] is not None or node["hubResolutionStatus"] != "UNRESOLVED":
                raise RuntimeError("ORIGINAL_SHINKANSEN_HUB_LINK_INVALID")
            node_by_id[node_id] = {**node, "parentHubId": hub_id, "hubResolutionStatus": "ACCEPTED", "unresolvedReasons": [reason for reason in node["unresolvedReasons"] if reason not in {"PARENT_HUB_UNRESOLVED", "HUB_RELATION_UNRESOLVED"}]}
        else:
            raise RuntimeError("NATIONAL_HUB_COMPONENT_ORIGIN_INVALID")
        seen_new_decisions.add(node_id)
    if len(new_hub_decisions) != 54 or len(seen_new_decisions & old_shinkansen_ids) != 7 or len(seen_new_decisions & new_rail_ids) != 47:
        raise RuntimeError("NATIONAL_HUB_COMPONENT_COUNT_CHANGED")
    review_stage = data / "task-084-b-shinkansen-hub-reviewed"
    review_manifest = json.loads((review_stage / "manifest.json").read_text(encoding="utf-8"))
    review_path = review_stage / "hub-resolution-decisions.jsonl"
    review_decisions = rows(review_path)
    pending_old_ids = {node_id for node_id in old_shinkansen_ids if node_by_id[node_id]["hubResolutionStatus"] == "UNRESOLVED"}
    if (review_manifest["decisionCount"] != 94 or file_hash(review_path) != review_manifest["artifactSha256"]
            or len(review_decisions) != 94 or {item["transportNodeId"] for item in review_decisions} != pending_old_ids):
        raise RuntimeError("SHINKANSEN_HUB_REVIEW_INCOMPLETE")
    for decision in review_decisions:
        node_id = decision["transportNodeId"]
        node = node_by_id[node_id]
        status = decision["hubResolutionStatus"]
        if (status not in {"SELF_GATEWAY", "HUB_REVIEW_REQUIRED"} or decision["parentHubId"] is not None
                or decision["sameNameAloneUsed"] or decision["canonicalNameJa"] != node["canonicalNameJa"]
                or decision["reviewRadiusM"] != 800 or not decision["decisionReason"]):
            raise RuntimeError("SHINKANSEN_HUB_REVIEW_INVALID")
        if status == "SELF_GATEWAY" and (not decision["officialStationGuide"] or decision["nearbyRailComponents"] or decision["nearbyShinkansenTransportNodeIds"]):
            raise RuntimeError("SHINKANSEN_SELF_GATEWAY_EVIDENCE_INVALID")
        if status == "HUB_REVIEW_REQUIRED" and decision["reviewEvidenceStatus"] == "OPERATOR_INTERCHANGE_CONFIRMED" and (not decision["officialStationGuide"] or decision["officialStationGuide"] not in decision["sourceRefs"] or not decision["nearbyRailComponents"]):
            raise RuntimeError("SHINKANSEN_INTERCHANGE_EVIDENCE_INVALID")
        remaining = [reason for reason in node["unresolvedReasons"] if reason != "HUB_RELATION_UNRESOLVED"]
        if status == "HUB_REVIEW_REQUIRED":
            remaining.append("HUB_REVIEW_REQUIRED")
        node_by_id[node_id] = {**node, "hubResolutionStatus": status, "unresolvedReasons": remaining,
                               "hubReviewReason": decision["decisionReason"]}
    expanded_hubs = []
    hierarchy_decisions = []
    for hub in hubs:
        level, reason = HIERARCHY[hub["canonicalNameJa"]]
        combined = sorted(set(hub["componentTransportNodeIds"] + extra_components[hub["hubId"]]))
        if len(combined) != len(hub["componentTransportNodeIds"]) + len(extra_components[hub["hubId"]]):
            raise RuntimeError("OLD_AND_NEW_HUB_COMPONENT_COLLISION")
        for node_id in hub["componentTransportNodeIds"]:
            if node_by_id[node_id]["parentHubId"] != hub["hubId"]:
                raise RuntimeError("ORIGINAL_HUB_LINK_CHANGED")
        expanded_hubs.append({**hub, "nodeLevel": level, "componentTransportNodeIds": combined, "componentCoverage": "REVIEWED_SHINKANSEN_AND_SELECTED_RAIL_COMPONENTS"})
        hierarchy_decisions.append({"hubId": hub["hubId"], "canonicalNameJa": hub["canonicalNameJa"], "nodeLevel": level, "reviewReason": reason, "sourceRefs": hub["sourceRefs"], "componentCount": len(combined), "supersedesPreliminaryAllT0Classification": True})
    for hub in new_hubs:
        components = sorted(decision["transportNodeId"] for decision in new_hub_decisions if decision["hubId"] == hub["hubId"])
        if not components or hub["nodeLevel"] not in {"T0", "T1"} or not hub["reviewReason"] or not hub["officialStationGuides"]:
            raise RuntimeError("NATIONAL_HUB_HIERARCHY_REVIEW_MISSING")
        expanded_hubs.append({**hub, "componentTransportNodeIds": components, "componentCoverage": "REVIEWED_SELECTED_RAIL_COMPONENTS"})
        hierarchy_decisions.append({"hubId": hub["hubId"], "canonicalNameJa": hub["canonicalNameJa"], "nodeLevel": hub["nodeLevel"], "reviewReason": hub["reviewReason"], "sourceRefs": hub["sourceRefs"], "componentCount": len(components), "supersedesPreliminaryAllT0Classification": False})
    airport_stage = data / "task-084-b-regional-airport-accepted"
    airport_manifest = json.loads((airport_stage / "manifest.json").read_text(encoding="utf-8"))
    if file_hash(regional_airport_ledger) != airport_manifest["identityLedgerSha256"] or file_hash(data / "task-084-b-airport-accepted" / "transport-nodes.jsonl") != airport_manifest["aAirportNodeSha256"]:
        raise RuntimeError("REGIONAL_AIRPORT_REVIEW_SOURCE_CHANGED")
    airport_decision_path = airport_stage / "airport-hierarchy-decisions.jsonl"
    if file_hash(airport_decision_path) != airport_manifest["artifactSha256"]["airport-hierarchy-decisions.jsonl"]:
        raise RuntimeError("AIRPORT_HIERARCHY_DECISIONS_HASH_CHANGED")
    airport_decisions = rows(airport_decision_path)
    airport_ids = {node["transportNodeId"] for node in stage_nodes if node["nodeKind"] == "airport"}
    if len(airport_decisions) != 47 or {item["transportNodeId"] for item in airport_decisions} != airport_ids:
        raise RuntimeError("AIRPORT_HIERARCHY_REVIEW_INCOMPLETE")
    for decision in airport_decisions:
        node_id = decision["transportNodeId"]
        node = node_by_id[node_id]
        if decision["nodeLevel"] not in {"T0", "T1", "T2"} or not decision["reviewReason"] or not decision["sourceRefs"] or decision["airportCategoryIsHierarchy"]:
            raise RuntimeError("AIRPORT_HIERARCHY_REVIEW_INVALID")
        if decision["identityObservedAt"] != node["identityObservedAt"] or decision["coordinateObservedAt"] != node["coordinateObservedAt"]:
            raise RuntimeError("AIRPORT_HIERARCHY_TIME_MISMATCH")
        node_by_id[node_id] = {**node, "nodeLevel": decision["nodeLevel"], "hierarchyEvidence": decision["reviewReason"]}
    nodes = sorted(node_by_id.values(), key=lambda item: item["transportNodeId"])
    expanded_hubs.sort(key=lambda item: item["hubId"])
    hierarchy_decisions.sort(key=lambda item: item["hubId"])
    body_nodes = b"".join(canonical(item) for item in nodes)
    extras = {
        "transport-nodes.jsonl": body_nodes,
        "transport-hubs.jsonl": b"".join(canonical(item) for item in expanded_hubs),
        "hub-hierarchy-decisions.jsonl": b"".join(canonical(item) for item in hierarchy_decisions),
        "hub-component-decisions.jsonl": b"".join(canonical(item) for item in hub_decisions + new_hub_decisions),
        "airport-hierarchy-decisions.jsonl": b"".join(canonical(item) for item in airport_decisions),
        "hub-resolution-decisions.jsonl": b"".join(canonical(item) for item in review_decisions),
    }
    output = Path(args.output)
    chunks = batchify(nodes)
    if args.batch is not None and not (1 <= args.batch <= len(chunks)):
        raise RuntimeError("BATCH_OUT_OF_RANGE")
    batch_manifest = []
    for index, chunk in enumerate(chunks, 1):
        batch_id = f"batch-{index:04}"
        body = b"".join(canonical(item) for item in chunk)
        receipt = {"batchId": batch_id, "nodeCount": len(chunk), "nodeSha256": digest(body), "stageManifestSha256": [entry["manifestSha256"] for entry in stage_manifests]}
        receipt_body = canonical(receipt)
        rerun = args.rebuild and (args.batch is None or args.batch == index)
        batch_path = output / "batches" / f"{batch_id}.jsonl"
        receipt_path = output / "batch-receipts" / f"{batch_id}.json"
        if args.batch is not None and args.batch != index and (not batch_path.exists() or not receipt_path.exists()):
            raise RuntimeError("MISSING_PRIOR_MASTER_BATCH")
        write_or_verify(batch_path, body, rerun)
        write_or_verify(receipt_path, receipt_body, rerun)
        batch_manifest.append({"batchId": batch_id, "receiptSha256": digest(receipt_body)})
    for name, body in extras.items():
        write_or_verify(output / name, body, args.rebuild)
    kinds = Counter(node["nodeKind"] for node in nodes)
    levels = Counter(node["nodeLevel"] for node in nodes)
    hub_resolution = hub_resolution_counts(nodes)
    rights_path = data.parent / "n03-2026-source-rights-decision.json"
    rights = json.loads(rights_path.read_text(encoding="utf-8"))
    validate_n03_rights(rights, nodes)
    manifest = {
        "task": "TASK-084-B", "nationalMasterStatus": "PARTIAL", "acceptedCount": len(nodes),
        "newAcceptedSincePreviousCheckpoint": 77,
        "nodeKindCounts": dict(sorted(kinds.items())), "nodeLevelCounts": {level: levels[level] for level in ["T0", "T1", "T2", "T3"]},
        "hubAcceptedCount": len(expanded_hubs), "hubLevelCounts": dict(sorted(Counter(hub["nodeLevel"] for hub in expanded_hubs).items())),
        "hubUnresolvedNodeCount": hub_resolution["UNRESOLVED"] + hub_resolution["HUB_REVIEW_REQUIRED"],
        "hubResolutionCounts": {status: hub_resolution[status] for status in ["ACCEPTED", "UNRESOLVED", "HUB_REVIEW_REQUIRED", "SELF_GATEWAY", "NOT_APPLICABLE"]},
        "n03RightsDecision": rights["decision"], "n03RightsDecisionSha256": file_hash(rights_path),
        "shinkansenHubReviewManifestSha256": file_hash(review_stage / "manifest.json"),
        "currentPrefectureCoverageCount": sum(node["prefectureCode"] is not None for node in nodes),
        "currentMunicipalityCoverageCount": sum(node["municipalityCode"] is not None for node in nodes),
        "coordinateRoleCoverageCount": sum(bool(node["coordinateRole"]) for node in nodes),
        "licenseBlockedDatasetCount": 2, "licenseApprovalRequiredDatasetCount": 1,
        "batchSize": BATCH_SIZE, "batches": batch_manifest,
        "originalNodeLedgerSha256": ORIGINAL_NODE_LEDGER_SHA, "originalHubLedgerSha256": ORIGINAL_HUB_LEDGER_SHA,
        "railLedgerSha256": file_hash(rail_ledger), "airportLedgerSha256": file_hash(airport_ledger), "regionalAirportLedgerSha256": file_hash(regional_airport_ledger), "ferryLedgerSha256": file_hash(ferry_ledger), "nationalRailLedgerSha256": file_hash(national_rail_ledger), "nationalHubLedgerSha256": file_hash(national_hub_ledger), "busLedgerSha256": file_hash(bus_ledger), "cableLedgerSha256": file_hash(cable_ledger), "gtfsSourceLicenseRegistrySha256": file_hash(gtfs_registry),
        "stageManifests": stage_manifests, "artifactSha256": {name: digest(body) for name, body in extras.items()},
        "runtimeIntegration": "DEFERRED_TO_A",
    }
    write_or_verify(output / "manifest.json", canonical(manifest), args.rebuild)
    print(json.dumps({"acceptedCount": len(nodes), "newAccepted": 77, "hubCount": len(expanded_hubs), "batchCount": len(chunks)}))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--data", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--rebuild", action="store_true")
    parser.add_argument("--batch", type=int)
    args = parser.parse_args()
    try:
        process(args)
    except (OSError, KeyError, ValueError, RuntimeError) as exc:
        print(str(exc), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
