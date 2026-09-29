import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "transport" / "nodes"


def load_script(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


master = load_script("task084_master", ROOT / "tools" / "transport" / "task-084-build-master.py")
rail = load_script("task084_rail", ROOT / "tools" / "transport" / "task-084-core-rail-expansion.py")
airport = load_script("task084_airport", ROOT / "tools" / "transport" / "task-084-airport-crosswalk.py")
ferry = load_script("task084_ferry", ROOT / "tools" / "transport" / "task-084-fukuoka-ferry.py")
bus = load_script("task084_bus", ROOT / "tools" / "transport" / "task-084-nagasaki-bus.py")
cable = load_script("task084_cable", ROOT / "tools" / "transport" / "task-084-tourism-cable.py")
hub_review = load_script("task084_hub_review", ROOT / "tools" / "transport" / "task-084-review-shinkansen-hubs.py")


class Task084Phase2Tests(unittest.TestCase):
    def test_original_ids_and_hubs_remain_immutable(self):
        self.assertEqual(master.file_hash(DATA / "transport-node-identity-ledger.jsonl"), master.ORIGINAL_NODE_LEDGER_SHA)
        self.assertEqual(master.file_hash(DATA / "transport-hub-identity-ledger.jsonl"), master.ORIGINAL_HUB_LEDGER_SHA)
        combined = master.rows(DATA / "task-084-b-national-master" / "transport-nodes.jsonl")
        old = master.rows(DATA / "task-084-b-accepted" / "transport-nodes.jsonl")
        self.assertEqual({item["transportNodeId"] for item in old}, {item["transportNodeId"] for item in combined if item["nodeKind"] == "shinkansen_station"})
        old_hubs = master.rows(DATA / "transport-hub-identity-ledger.jsonl")
        expanded = master.rows(DATA / "task-084-b-national-master" / "transport-hubs.jsonl")
        self.assertTrue({item["hubId"] for item in old_hubs} <= {item["hubId"] for item in expanded})
        self.assertEqual({item["hubId"] for item in expanded} - {item["hubId"] for item in old_hubs}, {item["hubId"] for item in master.rows(DATA / "transport-national-hub-identity-ledger.jsonl")})
        self.assertEqual(len(expanded), 21)
        self.assertEqual(len(combined), len({item["transportNodeId"] for item in combined}))

    def test_final_generated_at_is_immutable_accepted_provenance(self):
        ledger_paths = sorted(DATA.glob("transport-*-identity-ledger.jsonl"))
        accepted_at = {entry["transportNodeId"]: entry["acceptedAt"]
                       for path in ledger_paths for entry in master.rows(path) if "transportNodeId" in entry}
        stages = ["task-084-b-accepted", "task-084-b-core-rail-accepted", "task-084-b-airport-accepted",
                  "task-084-b-ferry-accepted", "task-084-b-national-rail-accepted",
                  "task-084-b-regional-airport-accepted", "task-084-b-nagasaki-bus-accepted",
                  "task-084-b-tourism-cable-accepted"]
        source_refs = {node["transportNodeId"]: node["sourceRefs"] for stage in stages
                       for node in master.rows(DATA / stage / "transport-nodes.jsonl")}
        combined = master.rows(DATA / "task-084-b-national-master" / "transport-nodes.jsonl")
        self.assertEqual(len(accepted_at), 244)
        self.assertEqual({node["transportNodeId"] for node in combined}, set(accepted_at))
        self.assertTrue(all(node["generatedAt"] == accepted_at[node["transportNodeId"]]
                            and node["sourceRefs"] == source_refs[node["transportNodeId"]]
                            and node["administrativeResolutionStatus"] == "UNRESOLVED"
                            for node in combined))

    def test_phase2_identity_and_source_boundaries(self):
        rail_nodes = master.rows(DATA / "task-084-b-core-rail-accepted" / "transport-nodes.jsonl")
        excluded = master.rows(DATA / "task-084-b-core-rail-accepted" / "excluded-same-name.jsonl")
        self.assertEqual(len(rail_nodes), 22)
        self.assertEqual(len(excluded), 1)
        self.assertEqual(excluded[0]["name"], "大宮")
        self.assertEqual(excluded[0]["operator"], "阪急電鉄")
        self.assertTrue(all(node["hubResolutionStatus"] == "ACCEPTED" for node in rail_nodes))
        air_nodes = master.rows(DATA / "task-084-b-airport-accepted" / "transport-nodes.jsonl")
        self.assertEqual(len(air_nodes), 28)
        self.assertTrue(all(node["identityObservedAt"] == "2026-09-01" and node["coordinateObservedAt"] == "2021-12-31" for node in air_nodes))
        self.assertTrue(all(node["coordinateRole"] == "AIRPORT_REFERENCE_POINT" and node["municipalityCode"] is None for node in air_nodes))
        ferry_nodes = master.rows(DATA / "task-084-b-ferry-accepted" / "transport-nodes.jsonl")
        self.assertEqual(len(ferry_nodes), 7)
        self.assertTrue(all(node["coordinateRole"] == "GTFS_FERRY_STOP_POINT" and node["feedValidThrough"] == "2027-12-31" for node in ferry_nodes))
        registry = master.rows(DATA.parent / "gtfs-source-license-registry.jsonl")
        self.assertEqual({item["decision"] for item in registry}, {"LICENSE_PASS_AND_GATEWAY_ACCEPTED", "LICENSE_PASS_SOURCE_ONLY", "LICENSE_BLOCKED"})
        bus_record = next(item for item in registry if item["provider"] == "長崎県交通局")
        self.assertTrue(bus_record["commercialUse"] and bus_record["persistenceAllowed"] and bus_record["derivedDataAllowed"])
        self.assertEqual(bus_record["sourceArchiveSha256"], bus.FEED_SHA)
        rail.validate_ledger(master.rows(DATA / "transport-rail-expansion-identity-ledger.jsonl"))
        airport.validate_ledger(master.rows(DATA / "transport-airport-identity-ledger.jsonl"))
        ferry.validate_ledger(master.rows(DATA / "transport-ferry-identity-ledger.jsonl"))
        bus.validate_ledger(master.rows(DATA / "transport-nagasaki-bus-identity-ledger.jsonl"))
        cable.validate_ledger(master.rows(DATA / "transport-tourism-cable-identity-ledger.jsonl"))

    def test_national_expansion_review_layers(self):
        rail_nodes = master.rows(DATA / "task-084-b-national-rail-accepted" / "transport-nodes.jsonl")
        new_hubs = master.rows(DATA / "task-084-b-national-rail-accepted" / "transport-hubs.jsonl")
        airport_nodes = master.rows(DATA / "task-084-b-regional-airport-accepted" / "transport-nodes.jsonl")
        airport_decisions = master.rows(DATA / "task-084-b-national-master" / "airport-hierarchy-decisions.jsonl")
        bus_nodes = master.rows(DATA / "task-084-b-nagasaki-bus-accepted" / "transport-nodes.jsonl")
        cable_nodes = master.rows(DATA / "task-084-b-tourism-cable-accepted" / "transport-nodes.jsonl")
        self.assertEqual((len(rail_nodes), len(new_hubs), len(airport_nodes), len(airport_decisions), len(bus_nodes), len(cable_nodes)), (47, 16, 19, 47, 5, 6))
        self.assertTrue(all(item["reviewReason"] and item["sourceRefs"] for item in airport_decisions))
        self.assertTrue(all(item["coordinateRole"] == "AIRPORT_REFERENCE_POINT" and item["coordinateObservedAt"] == "2021-12-31" for item in airport_nodes))
        self.assertTrue(all(item["hubResolutionStatus"] == "SELF_GATEWAY" for item in bus_nodes + cable_nodes))

    def test_hub_resolution_semantics(self):
        nodes = master.rows(DATA / "task-084-b-national-master" / "transport-nodes.jsonl")
        by_kind = {}
        for node in nodes:
            by_kind.setdefault(node["nodeKind"], []).append(node)
        self.assertEqual(len(by_kind["ferry_port"]), 7)
        self.assertTrue(all(node["hubResolutionStatus"] == "SELF_GATEWAY" and "PARENT_HUB_UNRESOLVED" not in node["unresolvedReasons"] for node in by_kind["ferry_port"]))
        self.assertTrue(all(node["hubResolutionStatus"] == "SELF_GATEWAY" for node in by_kind["airport"]))
        counts = master.hub_resolution_counts(nodes)
        self.assertEqual(counts["UNRESOLVED"], 0)
        self.assertEqual(counts["HUB_REVIEW_REQUIRED"], 80)
        self.assertEqual(counts["SELF_GATEWAY"], 79)
        self.assertEqual(counts["ACCEPTED"], 85)
        self.assertTrue(all(node["nodeKind"] == "shinkansen_station" and node["hubReviewReason"] for node in nodes if node["hubResolutionStatus"] == "HUB_REVIEW_REQUIRED"))
        self.assertTrue(all(node["parentHubId"] for node in nodes if node["hubResolutionStatus"] == "ACCEPTED"))
        self.assertTrue(all("HUB_RELATION_UNRESOLVED" not in node["unresolvedReasons"] for node in nodes if node["hubResolutionStatus"] in {"ACCEPTED", "SELF_GATEWAY"}))

    def test_shinkansen_hub_review_complete_and_no_silent_parent_rebind(self):
        original = master.rows(DATA / "task-084-b-accepted" / "transport-nodes.jsonl")
        combined = {node["transportNodeId"]: node for node in master.rows(DATA / "task-084-b-national-master" / "transport-nodes.jsonl")}
        decisions = master.rows(DATA / "task-084-b-shinkansen-hub-reviewed" / "hub-resolution-decisions.jsonl")
        old_accepted = {node["transportNodeId"] for node in original if node["hubResolutionStatus"] == "ACCEPTED"}
        national_links = {item["transportNodeId"] for item in master.rows(DATA / "task-084-b-national-rail-accepted" / "hub-component-decisions.jsonl") if item["componentOrigin"] == "IMMUTABLE_SHINKANSEN_ID"}
        self.assertEqual(len(decisions), 94)
        self.assertEqual({item["transportNodeId"] for item in decisions}, {node["transportNodeId"] for node in original} - old_accepted - national_links)
        self.assertTrue(all(not item["sameNameAloneUsed"] and item["parentHubId"] is None and item["reviewRadiusM"] == 800 for item in decisions))
        self.assertEqual(sum(item["hubResolutionStatus"] == "SELF_GATEWAY" for item in decisions), 14)
        self.assertTrue(all(combined[item["transportNodeId"]]["parentHubId"] is None for item in decisions))
        self.assertEqual(len(hub_review.REVIEW_GUIDES), 21)
        self.assertEqual(sum(item["reviewEvidenceStatus"] == "OPERATOR_INTERCHANGE_CONFIRMED" for item in decisions), 24)
        for name in hub_review.REVIEW_GUIDES:
            selected = [item for item in decisions if item["canonicalNameJa"] == name]
            self.assertTrue(selected, name)
            self.assertTrue(all(item["hubResolutionStatus"] == "HUB_REVIEW_REQUIRED" and (item["nearbyRailComponents"] or item["nearbyShinkansenTransportNodeIds"]) for item in selected), name)
            self.assertTrue(all(item["reviewEvidenceStatus"] == "OPERATOR_INTERCHANGE_CONFIRMED" and item["officialStationGuide"] in item["sourceRefs"] for item in selected), name)
        for name in hub_review.SELF_GUIDES:
            selected = [item for item in decisions if item["canonicalNameJa"] == name]
            self.assertEqual(len(selected), 1)
            self.assertEqual(selected[0]["hubResolutionStatus"], "SELF_GATEWAY")
            self.assertTrue(selected[0]["officialStationGuide"])

    def test_hub_review_decision_requires_spatial_and_guide_evidence(self):
        node = {"transportNodeId": "t:1", "canonicalNameJa": "七戸十和田"}
        standalone = hub_review.decide(node, [], [])
        self.assertEqual(standalone["hubResolutionStatus"], "SELF_GATEWAY")
        self.assertEqual(hub_review.decide(node, [{"name": "rail", "operator": "JR", "line": "local", "distanceM": 50}], [])["hubResolutionStatus"], "HUB_REVIEW_REQUIRED")
        self.assertEqual(hub_review.decide(node, [], ["t:2"])["hubResolutionStatus"], "HUB_REVIEW_REQUIRED")
        self.assertEqual(hub_review.decide({"transportNodeId": "t:3", "canonicalNameJa": "unknown"}, [], [])["hubResolutionStatus"], "HUB_REVIEW_REQUIRED")

    def test_n03_rights_gate_fails_closed(self):
        rights = json.loads((DATA.parent / "n03-2026-source-rights-decision.json").read_text(encoding="utf-8"))
        nodes = master.rows(DATA / "task-084-b-national-master" / "transport-nodes.jsonl")
        self.assertEqual(rights["decision"], "APPROVAL_REQUIRED")
        master.validate_n03_rights(rights, nodes)
        altered = dict(rights, productionJoinAllowed=True)
        with self.assertRaisesRegex(RuntimeError, "ADMIN_ASSIGNMENT_BEFORE_RIGHTS_PASS"):
            master.validate_n03_rights(altered, nodes)
        with self.assertRaisesRegex(RuntimeError, "ADMIN_ASSIGNMENT_BEFORE_RIGHTS_PASS"):
            master.validate_n03_rights(rights, [{**nodes[0], "municipality": "unapproved"}])
        altered = dict(rights, decision="PASS_WITH_ATTRIBUTION", productionJoinAllowed=True)
        with self.assertRaisesRegex(RuntimeError, "N03_RIGHTS_PASS_EVIDENCE_MISSING"):
            master.validate_n03_rights(altered, nodes)
        altered["formalGsiConfirmationOnFile"] = True
        with self.assertRaisesRegex(RuntimeError, "N03_RIGHTS_PASS_EVIDENCE_MISSING"):
            master.validate_n03_rights(altered, nodes)
        altered["formalGsiDecisionRef"] = "documented-written-response"
        with self.assertRaisesRegex(RuntimeError, "N03_RIGHTS_PASS_EVIDENCE_MISSING"):
            master.validate_n03_rights(altered, nodes)

    def test_master_resume_selected_rebuild_corruption_and_batch_limit(self):
        self.assertEqual([len(chunk) for chunk in master.batchify(list(range(205)))], [200, 5])
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / "master"
            args = SimpleNamespace(data=str(DATA), output=str(output), rebuild=False, batch=None)
            master.process(args)
            first = (output / "manifest.json").read_bytes()
            self.assertEqual(first, (DATA / "task-084-b-national-master" / "manifest.json").read_bytes())
            manifest = json.loads(first)
            self.assertEqual(manifest["acceptedCount"], 244)
            self.assertEqual(manifest["nationalMasterStatus"], "PASS")
            self.assertEqual(manifest["generatedAtCoverageCount"], 244)
            self.assertEqual(manifest["administrativeEnrichmentStatus"], "DEFERRED_ADMINISTRATIVE_ENRICHMENT")
            self.assertEqual(manifest["newAcceptedSincePreviousCheckpoint"], 77)
            self.assertEqual(manifest["nodeLevelCounts"], {"T0": 8, "T1": 40, "T2": 196, "T3": 0})
            self.assertEqual(manifest["hubLevelCounts"], {"T0": 10, "T1": 11})
            self.assertEqual(manifest["hubUnresolvedNodeCount"], 80)
            self.assertEqual(manifest["n03RightsDecision"], "APPROVAL_REQUIRED")
            self.assertEqual((manifest["licenseBlockedDatasetCount"], manifest["licenseApprovalRequiredDatasetCount"]), (2, 1))
            self.assertEqual([len(master.rows(output / "batches" / f"batch-{i:04}.jsonl")) for i in (1, 2)], [200, 44])
            master.process(args)
            args.rebuild = True
            args.batch = 2
            master.process(args)
            self.assertEqual((output / "manifest.json").read_bytes(), first)
            args.rebuild = False
            args.batch = None
            receipt = output / "batch-receipts" / "batch-0002.json"
            receipt.write_bytes(receipt.read_bytes() + b"corrupt")
            with self.assertRaisesRegex(RuntimeError, "CORRUPTED_MASTER_ARTIFACT"):
                master.process(args)


if __name__ == "__main__":
    unittest.main()
