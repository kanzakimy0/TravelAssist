import importlib.util
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from types import SimpleNamespace


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "task084", ROOT / "tools" / "transport" / "task-084-n02-candidates.py"
)
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


def feature(index, shinkansen=True):
    return {
        "properties": {
            "N02_003": "東海道新幹線" if shinkansen else "普通鉄道",
            "N02_004": "JR東海",
            "N02_005": f"駅{index}",
            "N02_005c": f"{index:06}",
            "N02_005g": f"{index:06}",
        },
        "geometry": {
            "type": "LineString",
            "coordinates": [[139.0, 35.0], [139.001, 35.001]],
        },
    }


class Task084CandidateTests(unittest.TestCase):
    def test_component_identity_and_non_admission(self):
        rows = module.candidates(
            json.dumps({"features": [feature(2), feature(1), feature(3, False)]}).encode(),
            "synthetic-fixture",
        )
        self.assertEqual(len(rows), 2)
        self.assertEqual(
            [r["candidateKey"] for r in rows],
            sorted(r["candidateKey"] for r in rows),
        )
        self.assertTrue(all(r["transportNodeId"] is None for r in rows))
        self.assertTrue(all(r["identityStatus"] == "REVIEW_REQUIRED" for r in rows))
        self.assertEqual(rows, module.candidates(
            json.dumps({"features": [feature(1), feature(2), feature(3, False)]}).encode(),
            "synthetic-fixture",
        ))

    def test_resume_rebuild_single_batch_and_corruption(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            archive = root / "fixture.zip"
            features = [feature(i) for i in range(205)]
            with zipfile.ZipFile(archive, "w") as zf:
                zf.writestr(module.ENTRY, json.dumps({"features": features}))
            output = root / "out"
            args = SimpleNamespace(
                zip=str(archive), output=str(output), expected_sha256="",
                fixture=True, rebuild=False, batch=None,
            )
            module.process(args)
            first = (output / "manifest.json").read_bytes()
            manifest = json.loads(first)
            self.assertEqual(manifest["acceptedCount"], 0)
            self.assertEqual(manifest["candidateCount"], 205)
            self.assertEqual(len(manifest["batches"]), 2)
            module.process(args)  # validated checksum skip
            self.assertEqual((output / "manifest.json").read_bytes(), first)
            args.rebuild = True
            args.batch = 2
            module.process(args)
            self.assertEqual((output / "manifest.json").read_bytes(), first)
            args.rebuild = False
            args.batch = None
            damaged = output / "batch-receipts" / "batch-0001.json"
            damaged.write_bytes(damaged.read_bytes() + b"corrupt")
            with self.assertRaisesRegex(RuntimeError, "CORRUPTED_BATCH"):
                module.process(args)
            args.rebuild = True
            module.process(args)
            self.assertEqual((output / "manifest.json").read_bytes(), first)


if __name__ == "__main__":
    unittest.main()
