# TASK-084-B node acceptance QA

Status: **PARTIAL** national master. This checkpoint has **244 NODE_ACCEPTED TransportNodes**, **77 new** since accepted head `9b34f3cd6984aa2d193df3759f86d25b20dbeae9`. Issue #441 and Draft PR #448 remain the only tracking artifacts. TASK-085-B and TASK-086-B remain unstarted.

## Reproduction

Downloaded source archives remain outside Git. The one-time `--allocate` operations have already produced immutable identity ledgers; routine rebuilds must reuse them. The original 110-node and five-hub ledger hashes are enforced by the assembler.

```powershell
$n02 = Join-Path $env:TEMP 'travelassist-N02-25_GML.zip'
$c28 = Join-Path $env:TEMP 'travelassist-C28-21_GML.zip'
$airports = Join-Path $env:TEMP 'travelassist-airports-current.html'
$ferry = Join-Path $env:TEMP 'travelassist-fukuoka-ferry-gtfs.zip'
$bus = Join-Path $env:TEMP 'travelassist-nagasaki-bus-gtfs.zip'
python tools/transport/task-084-core-rail-expansion.py --zip $n02 --shinkansen-nodes data/transport/nodes/task-084-b-accepted/transport-nodes.jsonl --hub-ledger data/transport/nodes/transport-hub-identity-ledger.jsonl --ledger data/transport/nodes/transport-rail-expansion-identity-ledger.jsonl --output data/transport/nodes/task-084-b-core-rail-accepted
python tools/transport/task-084-airport-crosswalk.py --current-html $airports --c28-zip $c28 --ledger data/transport/nodes/transport-airport-identity-ledger.jsonl --output data/transport/nodes/task-084-b-airport-accepted
python tools/transport/task-084-fukuoka-ferry.py --zip $ferry --ledger data/transport/nodes/transport-ferry-identity-ledger.jsonl --output data/transport/nodes/task-084-b-ferry-accepted
python tools/transport/task-084-national-rail-hubs.py --zip $n02 --shinkansen-nodes data/transport/nodes/task-084-b-accepted/transport-nodes.jsonl --node-ledger data/transport/nodes/transport-national-rail-identity-ledger.jsonl --hub-ledger data/transport/nodes/transport-national-hub-identity-ledger.jsonl --output data/transport/nodes/task-084-b-national-rail-accepted
python tools/transport/task-084-airport-phase2.py --current-html $airports --c28-zip $c28 --a-airports data/transport/nodes/task-084-b-airport-accepted/transport-nodes.jsonl --ledger data/transport/nodes/transport-regional-airport-identity-ledger.jsonl --output data/transport/nodes/task-084-b-regional-airport-accepted
python tools/transport/task-084-nagasaki-bus.py --zip $bus --ledger data/transport/nodes/transport-nagasaki-bus-identity-ledger.jsonl --output data/transport/nodes/task-084-b-nagasaki-bus-accepted
python tools/transport/task-084-tourism-cable.py --zip $n02 --ledger data/transport/nodes/transport-tourism-cable-identity-ledger.jsonl --output data/transport/nodes/task-084-b-tourism-cable-accepted
python tools/transport/task-084-build-master.py --data data/transport/nodes --output data/transport/nodes/task-084-b-national-master
python tests/task-084-b-n02-candidates.test.py
python tests/task-084-b-phase2.test.py
```

Fixed archive SHA-256: N02 `aaf76af133b2e771e538fabc4646d2e443dc1d5a67b221382a28d744e706cc9f`; C28 `07d69353a34558d7ebd21d4b5f62b685d4f9b9d0e55c6eed6ce05aefcc6b7b35`; current airport HTML `033c72ca0329c6be15a5b2c179ea25d1e96130517ba24601bdfaf15c6fd8d360`; Fukuoka ferry `b39a7590d454e37a400f724472e4969133c7b9f54b8600dce68bc47fa0da1b9e`; Nagasaki bus `69a20a9477a71af71921d71ea68b338122cddbdaa3fad7a2560baed7be655d4e`.

## Acceptance audit

| Check | Result |
| --- | --- |
| Old identity ledgers | 110 TransportNode IDs and 5 Hub IDs unchanged; exact prior SHA-256 verified |
| Rail expansion | 22 components at five old hubs; 47 components and 16 explicit new hubs, including separate Osaka and Umeda identities |
| Name collision guard | Same-name Hankyu 大宮 in Kyoto excluded from Saitama hub |
| Airport review | 47 selected airports: 28 retained A-class IDs plus 19 tourism-relevant B-class IDs; 47 independent T-level decisions |
| Airport coordinate time | C28 2021 reference point only; current airport identity observed 2026-09-01 |
| Ferry semantics | 7 Fukuoka ferry gateways are SELF_GATEWAY; none inflate unresolved Hub count |
| Bus terminals | 5 reviewed Nagasaki bus/airport terminal facilities from licensed current GTFS; ordinary stops excluded |
| Tourism cable | 6 selected Takao, Tsukuba and Hiei funicular stations, N02 representative points and operator guide reviews |
| Combined master | 244 accepted, 0 duplicate IDs; actual batches 200 + 44 |
| Hubs | 21 accepted, 85 linked nodes, 94 unresolved station components, 65 independent self gateways |
| Current administrative assignment | 0/244 prefecture and 0/244 municipality; N03/GSI rights review still required |
| National gate | PARTIAL; see [coverage audit](national-coverage-audit.md) |

[MLIT N02 2025](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html), [MLIT C28 2021](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C28-2021.html), [Fukuoka ferry](https://data.bodik.jp/dataset/9938b52c-e54c-4d92-9975-a98c5f60e727), and [Nagasaki bus](https://data.bodik.jp/dataset/420000_nagasakikeneibus) are the accepted data sources with attribution requirements. [N09](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N09.html) remains excluded for noncommercial terms. [N03 2026](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html) warns that GSI secondary use may require an application; no polygon or persisted join is admitted. [Shimoden ODPT](https://ckan.odpt.org/dataset/shimoden_shimoden_bus_gtfs_realtime) remains blocked by provider-specific terms. [Sakurajima Ferry GTFS](https://ckan.odpt.org/dataset/kagoshima_city_maritime_bureau_all_lines) is CC BY 4.0 but presently requires developer registration to retrieve and verify a feed, so it is source-unresolved and not admitted.

## Quality gate

| Gate | Result |
| --- | --- |
| Prior exact-head GitHub Quality Gate | Commit `9b34f3cd6984aa2d193df3759f86d25b20dbeae9`; run `36425815085`; **SUCCESS** |
| New exact-head GitHub Quality Gate | Pending for this checkpoint; record after push |
| Focused Python tests | PASS; N02 candidate 4/4 and phase-2 5/5 |
| POI graph / routing tests | PASS; 15/15 and 28/28 |
| Lint | PASS; 0 errors, 9 pre-existing unrelated warnings |
| Typecheck / production build | PASS / PASS |
| Actual 200-node batching, resume, selected batch 2 rebuild, checksum and corruption rejection | PASS; 200 + 44 verified |
| Staged secret pattern scan / `git diff --cached --check` | PASS / PASS |

Candidate QA, individual NODE_ACCEPTED decisions and NATIONAL_MASTER_PASS are separate gates. The latest combined manifest records `nationalMasterStatus=PARTIAL`. PR #448 must remain Draft and unmerged.
