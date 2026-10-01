"""Read-only workbook projection for the user-requested 1xxxx–7xxxx work queue.

Registry rows are targets, never Canonical authorization. No coordinates or
Feature43 values are imported from the workbook. --check validates the projection.
"""
import hashlib
import json
from pathlib import Path
import sys
import openpyxl

ROOT = Path(__file__).resolve().parents[2]
SOURCE = "data/poi/full/registry/travelassist-japan-poi-master-registry-v1.66-B-5xxxx-7xxxx-feature43-phase2c-review-v2.xlsx"
OUT = ROOT / "data/transport/access-expansion/inputs"
source_hash = hashlib.sha256((ROOT / SOURCE).read_bytes()).hexdigest()
book = openpyxl.load_workbook(ROOT / SOURCE, read_only=True, data_only=True)
sheet = book["Registry"]
rows = sheet.iter_rows(values_only=True)
headers = next(rows)
targets = []
counts = {}
for number, row in enumerate(rows, 2):
    record = dict(zip(headers, row))
    code = str(record["master_code"]).zfill(5)
    counts[code[0]] = counts.get(code[0], 0) + 1
    if len(code) == 5 and code[0] in "1234567":
        targets.append({"targetMasterCode": code,
                        "candidateInternalUuid": record["internal_uuid"],
                        "name": record["name_ja"],
                        "registryStatus": record["registry_status"],
                        "sourceWorkbookRow": number})
book.close()
targets.sort(key=lambda r: (r["targetMasterCode"], r["candidateInternalUuid"]))
assert len(targets) == 7791, "USER_TARGET_INVENTORY_CHANGED"
assert len({r["candidateInternalUuid"] for r in targets}) == len(targets)
encode = lambda value: json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
text = "".join(encode(r) + "\n" for r in targets)
manifest = {"sourcePath": SOURCE, "sourceSha256": source_hash, "sourceSheet": "Registry",
            "authorization": "USER_TASK_085_EXPANSION_QUEUE_ONLY_NOT_CANONICAL_ADMISSION",
            "targetCount": len(targets), "countsByPrefix": counts,
            "region0Excluded": counts.get("0", 0), "transport8NodeOnly": counts.get("8", 0),
            "targetSha256": hashlib.sha256(text.encode()).hexdigest(),
            "runtimeImportAuthorized": False, "candidateCoordinatesImported": False}
files = {"targets.jsonl": text, "manifest.json": json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"}
if "--check" in sys.argv:
    for file, data in files.items():
        assert (OUT / file).read_bytes() == data.encode(), "TARGET_PROJECTION_DRIFT:" + file
else:
    OUT.mkdir(parents=True, exist_ok=True)
    for file, data in files.items():
        (OUT / file).write_bytes(data.encode())
print(json.dumps({"status": "PASS", "targets": len(targets), "sourceSha256": source_hash}))
