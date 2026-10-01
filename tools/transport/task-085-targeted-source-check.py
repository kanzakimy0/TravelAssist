"""Offline verification of selected GTFS rows against the retained licensed ZIP.

This verifies source extraction, not human access findings or physical exhaustion.
Only the two reviewed rows may be imported; no nationwide extraction is run.
"""

import csv
import hashlib
import io
import json
from pathlib import Path
import zipfile

ROOT = Path(__file__).resolve().parents[2]


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def digest(obj):
    return sha(json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode())


def verify(root=ROOT):
    receipt = json.loads((root / "data/transport/access/inputs/targeted-repair.json").read_text(encoding="utf8"))
    expected = receipt.pop("receiptSha256")
    assert digest(receipt) == expected, "TARGETED_RECEIPT_CORRUPTED"
    assert len(receipt["sourceFiles"]) == 1
    source = receipt["sourceFiles"][0]
    raw = (root / source["path"]).read_bytes()
    assert sha(raw) == source["sha256"], "TARGETED_ARCHIVE_CORRUPTED"
    with zipfile.ZipFile(io.BytesIO(raw)) as archive:
        def table(name):
            return list(csv.DictReader(io.StringIO(archive.read(name).decode("utf-8-sig"))))

        assert {name: sha(archive.read(name)) for name in sorted(archive.namelist())} == receipt["extraction"]["entryHashes"]
        stops = table("stops.txt")
        agencies = table("agency.txt")
        assert len(stops) == receipt["extraction"]["stopCount"]
        assert agencies == receipt["extraction"]["agencies"]
        assert table("feed_info.txt") == receipt["extraction"]["feedInfo"]
        assert sorted(r["externalId"] for r in receipt["records"]) == sorted(receipt["extraction"]["selectedStopIds"])
        served = {row["stop_id"] for row in table("stop_times.txt")}
        for record in receipt["records"]:
            rows = [s for s in stops if s["stop_id"] == record["externalId"]]
            assert len(rows) == 1 and rows[0] == record["sourceRow"], "TARGETED_ROW_NOT_IN_ARCHIVE"
            assert record["externalId"] in served, "TARGETED_UNSERVED_STOP"
            assert record["operator"] in {a["agency_name"] for a in agencies}
            assert digest(rows[0]) == record["sourceRowSha256"]
            assert record["point"] == {"latitude": float(rows[0]["stop_lat"]), "longitude": float(rows[0]["stop_lon"])}
            payload = {k: v for k, v in record.items() if k != "sourceRecordSha256"}
            assert digest(payload) == record["sourceRecordSha256"]
    return {"status": "PASS", "selectedRecords": len(receipt["records"]), "receiptSha256": expected, "archiveSha256": source["sha256"]}


if __name__ == "__main__":
    print(json.dumps(verify()))
