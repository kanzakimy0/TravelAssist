# TASK-084-B node acceptance QA

Status: **PARTIAL** national master; **167 accepted TransportNodes**, including **57 new in this run**. TASK-085-B and TASK-086-B remain unstarted.

## Reproduction

Keep all downloaded source archives outside Git. The one-time `--allocate` steps created new rail, airport and ferry identity ledgers. Routine rebuilds **must not** allocate IDs again; they read the committed ledgers. The original 110-node and five-hub ledgers are unchanged.

```powershell
$n02 = Join-Path $env:TEMP 'travelassist-N02-25_GML.zip'
$c28 = Join-Path $env:TEMP 'travelassist-C28-21_GML.zip'
$airports = Join-Path $env:TEMP 'travelassist-airports-current.html'
$ferry = Join-Path $env:TEMP 'travelassist-fukuoka-ferry-gtfs.zip'
python tools/transport/task-084-core-rail-expansion.py --zip $n02 --shinkansen-nodes data/transport/nodes/task-084-b-accepted/transport-nodes.jsonl --hub-ledger data/transport/nodes/transport-hub-identity-ledger.jsonl --ledger data/transport/nodes/transport-rail-expansion-identity-ledger.jsonl --output data/transport/nodes/task-084-b-core-rail-accepted
python tools/transport/task-084-airport-crosswalk.py --current-html $airports --c28-zip $c28 --ledger data/transport/nodes/transport-airport-identity-ledger.jsonl --output data/transport/nodes/task-084-b-airport-accepted
python tools/transport/task-084-fukuoka-ferry.py --zip $ferry --ledger data/transport/nodes/transport-ferry-identity-ledger.jsonl --output data/transport/nodes/task-084-b-ferry-accepted
python tools/transport/task-084-build-master.py --data data/transport/nodes --output data/transport/nodes/task-084-b-national-master
python tests/task-084-b-n02-candidates.test.py
python tests/task-084-b-phase2.test.py
```

Source SHA-256 values: N02 `aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f`; C28 `07d69353a34558d7ebd21d4b5f62b685d4f9b9d0e55c6eed6ce05aefcc6b7b35`; current airport HTML `033c72ca0329c6be15a5b2c179ea25d1e96130517ba24601bdfaf15c6fd8d360`; Fukuoka ferry GTFS `b39a7590d454e37a400f724472e4969133c7b9f54b8600dce68bc47fa0da1b9e`. All stage manifests retain their source and accepted artifact hashes. For licensed C28 commercial reuse, attribution and derivative terms, see [C28](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C28-2021.html) and [MLIT's applicable terms](https://nlftp.mlit.go.jp/ksj/other/agreement_02.html).

## Acceptance audit

| Check | Result |
| --- | --- |
| Original 110 node and 5 hub ledger hashes | PASS; exact prior SHA-256 retained |
| New conventional/metro/private components | 22 accepted; 22 explicit hub links |
| Same-name different-place guard | PASS; Hankyu 大宮 in Kyoto excluded from Saitama hub |
| Airport current/C28 crosswalk | PASS; 28 A-class airports, unique reference point, category, prefecture prefix and coordinate checks |
| Airport temporal semantics | PASS; identity 2026-09-01, coordinate 2021-12-31; no current terminal claim |
| C28 UTF-8 GeoJSON replacement-character audit | PASS; 0 replacement characters in name attributes. Prior contrary report corrected. |
| Ferry source and GTFS route/stop validation | PASS; CC BY 4.0; 7 used stops, 4 ferry routes |
| Per-feed bus/GTFS license registry | PASS; 1 ferry feed admitted, 1 community bus source-pass only, 1 ODPT provider-restricted feed blocked |
| Combined accepted IDs / duplicate IDs | 167 / 0 |
| Explicit hub links / hub-unresolved nodes | 31 / 108 |
| Representative/GTFS coordinate role coverage | 167 / 167 |
| Current municipality and prefecture coverage | 0 / 167 each; N03 secondary-use determination pending |
| National master | PARTIAL; see [coverage audit](national-coverage-audit.md) |

N02 [2025 railway data](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html) is CC BY 4.0. Fukuoka City [GTFS dataset](https://data.bodik.jp/dataset/9938b52c-e54c-4d92-9975-a98c5f60e727) is CC BY 4.0. [N09](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N09.html) is noncommercial and excluded. [N03 2026](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html) has a GSI secondary-use caveat and was not imported. [Shimoden's ODPT dataset](https://ckan.odpt.org/dataset/shimoden_shimoden_bus_gtfs_realtime) requires provider-specific prior contact and approval for guidance use, so it is blocked. Challenge-only ODPT data is not admitted.

## Quality gate

| Gate | Result |
| --- | --- |
| Focused Python tests | PASS; phase 1 4/4, phase 2 3/3 |
| 200-node batch limit fixture | PASS; 205 records split 200 + 5 |
| Combined master verified resume / selected rebuild / corruption rejection | PASS |
| `npm run test:poi-edge-graph` / `npm run test:routing` | PASS; 15/15 and 28/28 |
| `npm run lint` | PASS; 0 errors, 9 existing unrelated warnings |
| `npm run typecheck` / `npm run build` | PASS / PASS |
| Staged secret pattern scan / `git diff --cached --check` | PASS / PASS |
| GitHub exact-head Quality Gate | To verify at new PR head |

Candidate QA, individual `NODE_ACCEPTED` decisions and `NATIONAL_MASTER_PASS` are separate gates. The latest combined manifest records `nationalMasterStatus=PARTIAL`.
