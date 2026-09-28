# TASK-084-B node acceptance QA

Status: **PARTIAL** national master; **110 `NODE_ACCEPTED`** station components and **5 accepted core hubs**. Neither TASK-085-B nor TASK-086-B has started.

## Reproduction

Use the [MLIT N02 2025 railway ZIP](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html) outside Git. Verify SHA-256 `aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f`.

```powershell
python tools/transport/task-084-n02-candidates.py --zip <local-zip-path> --output data/transport/nodes/task-084-b-candidates --expected-sha256 aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f
python tools/transport/task-084-accept-nodes.py --candidates data/transport/nodes/task-084-b-candidates --ledger data/transport/nodes/transport-node-identity-ledger.jsonl --hub-ledger data/transport/nodes/transport-hub-identity-ledger.jsonl --output data/transport/nodes/task-084-b-accepted
python tests/task-084-b-n02-candidates.test.py
```

The one-time `--allocate --accepted-at <UTC time>` command created the committed node ledger. The one-time `task-084-review-core-hubs.py` review created the committed hub ledger. **Do not rerun allocation against a new ledger in routine builds:** it would issue different IDs. Routine builds read the committed ledgers. Both candidate and accepted stages support checksum-verified resume, `--rebuild`, `--rebuild --batch 1`, and fail-closed corruption detection.

## Current source and identity audit

| Check | Result |
| --- | --- |
| Source ZIP / station GeoJSON hashes | PASS / PASS |
| 112 Shinkansen geometries → 110 candidate components | PASS |
| Accepted identity ledger uniqueness / source-code independence | PASS (110 / 110) |
| Accepted station components / accepted hubs | 110 / 5 |
| Explicit hub links / hub-unresolved components | 9 / 101 |
| Representative coordinate role / entrance claim | 110 / 110 / 0 |
| Municipality coverage | 0 / 110; N03 join on hold |
| Wider rail, airport, bus, ferry coverage | UNRESOLVED; no national PASS |
| License-blocked datasets | 2: N03 secondary-use determination, N09 noncommercial |
| Provider bulk/retention rights | UNCONFIRMED; no calls |

N02 is [CC BY 4.0](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html); the [MLIT terms](https://nlftp.mlit.go.jp/ksj/other/agreement.html) require attribution and identifying edits. [N03 2026](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html) has a GSI secondary-use caveat; it was not imported. [N09](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N09.html) is noncommercial; it was excluded. The [Aviation Bureau list](https://www.mlit.go.jp/koku/15_bf_000310.html) gives current airport identity/classification, while [C28 2021](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C28-2021.html) permits commercial use of historical spatial data. The C28 ZIP was inspected in a temporary directory: SHA-256 `07d69353a34558d7ebd21d4b5f62b685d4f9b9d0e55c6eed6ce05aefcc6b7b35`, 108 polygon features, 97 reference points and 96 terminal points. Its UTF-8 GeoJSON name attributes contain replacement characters, so it cannot support a trusted name join as-is. The GML XML retains legible Japanese names and needs a separate verified parser/current-list crosswalk. No joined airport node was admitted. Bus GTFS licenses remain feed-specific.

## Quality gate

| Gate | Result |
| --- | --- |
| `python tests/task-084-b-n02-candidates.test.py` | PASS; 4/4 |
| Real accepted-master verified resume | PASS |
| Deterministic rebuild, selected-batch rerun and receipt corruption rejection | PASS in focused test |
| `npm run test:poi-edge-graph` and `npm run test:routing` | PASS; 15/15 and 28/28 |
| `npm run lint` | PASS; 0 errors, 9 existing unrelated warnings |
| `npm run typecheck` and `npm run build` | PASS |
| Secret pattern scan of new source, ledgers and reports | PASS; no matches |
| `git diff --cached --check` | PASS |
| GitHub exact-head Quality Gate | To verify at updated PR head |

Candidate QA passing, node acceptance, and national master passing are separate gates. The latest accepted manifest records `nationalMasterStatus=PARTIAL`.
