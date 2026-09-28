# TASK-084-B partial candidate QA

Status: **PARTIAL / BLOCKED**. Accepted TransportNodes: **0**.

## Reproduction

1. Download the official [MLIT N02 2025 railway ZIP](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html) to a local temporary location. Keep the raw ZIP out of Git.
2. Verify its SHA-256 equals `aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f`.
3. Run:

```powershell
python tools/transport/task-084-n02-candidates.py --zip <local-zip-path> --output data/transport/nodes/task-084-b-candidates --expected-sha256 aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f
python tests/task-084-b-n02-candidates.test.py
```

Rerun the first command for checksum-verified resume; add `--rebuild` for deterministic rebuild or `--rebuild --batch 1` for a selected batch. Existing mismatched input, output, receipt, ledger or manifest hashes fail closed. The synthetic test verifies a 205-candidate two-batch corpus, resume, selected rerun, deterministic bytes and corrupted receipt rejection.

## Actual source QA

| Check | Result |
| --- | --- |
| Source ZIP hash | PASS |
| Station GeoJSON hash | PASS |
| 112 shinkansen station geometries → 110 source components | PASS |
| 200-candidate batch limit | PASS (1 batch of 110) |
| Candidate key uniqueness | PASS |
| Candidate source attribution | PASS (110/110) |
| Identity decisions and unresolved ledger | PASS (110/110 REVIEW_REQUIRED) |
| Accepted stable IDs and municipality/hub review | BLOCKED (0 accepted) |
| Airport/bus/ferry and 47-prefecture coverage | BLOCKED |
| Provider bulk/retention rights | UNCONFIRMED; no calls |

N02 [2025 railway license](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html): CC BY 4.0. [MLIT terms](https://nlftp.mlit.go.jp/ksj/other/agreement.html) require source attribution and identifying edits. [N09 passenger-route license](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N09.html): noncommercial, excluded. Source snapshot is 2025-12-31, so no record claims live service or timetable.

## Quality gate

| Gate | Result |
| --- | --- |
| `npm ci` | PASS; 396 packages, 0 vulnerabilities |
| `python tests/task-084-b-n02-candidates.test.py` | PASS; 2/2 |
| `npm run test:poi-edge-graph` | PASS; 15/15 |
| `npm run test:routing` | PASS; 28/28 |
| `npm run lint` | PASS; 0 errors, 9 existing warnings in unrelated POI tools |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| Real artifact deterministic byte-for-byte rebuild | PASS |
| Receipt resume / selected batch / corruption rejection | PASS (fixture test and real checksum rerun) |
| Provenance and aggregate ledger checksum audit | PASS; 110/110 |
| Secret pattern scan of added files | PASS; 0 matches |
| `git diff --cached --check` | PASS after removing one trailing blank line |

No failing test or build was observed. The nine lint warnings are present in unrelated existing POI tool files; they are not candidate failures.
