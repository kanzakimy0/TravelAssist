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
        self.assertEqual(counts["UNRESOLVED"], 94)
        self.assertEqual(counts["SELF_GATEWAY"], 65)
        self.assertEqual(counts["ACCEPTED"], 85)
        self.assertTrue(all(node["nodeKind"] in {"shinkansen_station", "rail_station", "metro_station", "private_rail_station"} for node in nodes if node["hubResolutionStatus"] == "UNRESOLVED"))
        self.assertTrue(all(node["parentHubId"] for node in nodes if node["hubResolutionStatus"] == "ACCEPTED"))

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
            self.assertEqual(manifest["newAcceptedSincePreviousCheckpoint"], 77)
            self.assertEqual(manifest["nodeLevelCounts"], {"T0": 8, "T1": 40, "T2": 196, "T3": 0})
            self.assertEqual(manifest["hubLevelCounts"], {"T0": 10, "T1": 11})
            self.assertEqual(manifest["hubUnresolvedNodeCount"], 94)
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
