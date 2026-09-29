# TASK-084-B node acceptance QA

Status: **PASS / READY_TO_MERGE** against the original TASK-084-B acceptance and [final closeout amendment](../../tasks/AMENDMENT-TASK-084-b-final-closeout.md). The national planning backbone has **244 NODE_ACCEPTED TransportNodes**, **77 new** since accepted head `9b34f3cd6984aa2d193df3759f86d25b20dbeae9`. Issue #441 and PR #448 remain the only tracking artifacts. TASK-085-B and TASK-086-B remain unstarted.

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
python tools/transport/task-084-review-shinkansen-hubs.py --zip $n02 --data data/transport/nodes --output data/transport/nodes/task-084-b-shinkansen-hub-reviewed
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
| Original node contract | 244/244 `generatedAt` values equal immutable ledger `acceptedAt`; required fields, finite Japan coordinates, confidence, sourceRefs and valid Hub parents checked on all records |
| Hubs | 21 accepted, 85 linked nodes, 80 review-required Shinkansen components, 79 independent self gateways; 0 generic unresolved |
| Shinkansen semantics | 94 per-ID decisions: 14 operator-supported standalone gateways, 80 needing explicit transfer review; no parent rebind |
| Priority interchange evidence | Official operator guides checked for 21 station areas / 24 pending components; the Hub relationship remains pending explicit component and parent review |
| Current administrative assignment | 0/244 prefecture, 0/244 municipality and 0/47 prefectures represented; all records explicitly `UNRESOLVED`; [N03/GSI decision](n03-gsi-rights-decision.md) `APPROVAL_REQUIRED`, formal reply reference absent; enrichment deferred |
| National backbone gate | PASS under original §16; remaining breadth is `DEFERRED_PLANNER_EXPANSION`; see [coverage audit](national-coverage-audit.md) |

[MLIT N02 2025](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N02-2025.html), [MLIT C28 2021](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C28-2021.html), [Fukuoka ferry](https://data.bodik.jp/dataset/9938b52c-e54c-4d92-9975-a98c5f60e727), and [Nagasaki bus](https://data.bodik.jp/dataset/420000_nagasakikeneibus) are the accepted data sources with attribution requirements. [N09](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N09.html) remains excluded for noncommercial terms. [N03 2026](https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-N03-2026.html) warns that GSI secondary use may require an application; no polygon or persisted join is admitted. [Shimoden ODPT](https://ckan.odpt.org/dataset/shimoden_shimoden_bus_gtfs_realtime) remains blocked by provider-specific terms. [Sakurajima Ferry GTFS](https://ckan.odpt.org/dataset/kagoshima_city_maritime_bureau_all_lines) is CC BY 4.0 but presently requires developer registration to retrieve and verify a feed, so it is source-unresolved and not admitted.

## Original §16 final acceptance

| Criterion | Decision and evidence |
| --- | --- |
| National T0/T1 planning backbone | PASS; 8 T0 and 40 T1 nodes, Shinkansen spine, 21 reviewed rail/metro/private Hubs, airports, bus terminals, ferry gateways and selected funiculars |
| TransportNode distinct from POI | PASS; separate ID namespace and current authorized Canonical POI IDs/Master Codes checked for collision |
| Traceable identity and deterministic IDs | PASS; eight immutable accepted node ledgers, exact original ledger hashes, 244/244 accepted timestamps and source references |
| Hub/stop relationship expressible | PASS; 85 explicit parents, 80 evidence-bearing review states, 79 self gateways, 0 generic unresolved; no same-name auto merge |
| 200/batch recovery | PASS; real 200 + 44 batches, receipts/checksums, resume, selected batch rerun and corruption rejection |
| Accepted provenance and static/dynamic boundary | PASS; 244/244 sourceRefs/confidence/coordinates/generatedAt; no timetable, fare, delay or other live field persisted |
| A Route/Planner runtime ownership | PASS; TASK-084 implementation changes only offline TransportNode data/tools/tests and tracking documents |
| WBS / Result / QA synchronized | PASS; national backbone PASS, N03 administrative enrichment and later node breadth explicitly deferred |
| PR review / merge control | Pending exact-head green and authorized normal merge; never auto-merge |

The accepted master contains 57 distinct source references and no reference to blocked N09, Shimoden or N03 sources. N02, C28, the Aviation Bureau, Fukuoka ferry, Nagasaki GTFS and official operator guides support the persisted rows; the GTFS rights registry records persistence decisions. The 0/47 administrative coverage figure is a deferred enrichment metric, not a national backbone failure.

## Quality gate

| Gate | Result |
| --- | --- |
| Prior exact-head GitHub Quality Gate | Commit `9b34f3cd6984aa2d193df3759f86d25b20dbeae9`; run `36425815085`; **SUCCESS** |
| Prior final PR exact-head GitHub Quality Gate | Commit `2481cec58d795d98ee06202e755a2b0fb52e3564`; run `36444366196`; **SUCCESS** |
| Historical implementation exact-head GitHub Quality Gate | Commit `b2564aa7cccdb42e8f3a679e9718b64e2eb31d83`; run `36443717150`; **SUCCESS** |
| Focused Python tests | PASS; N02 candidate 4/4 and phase-2 9/9, including 244/244 deterministic `generatedAt`, 94 per-ID decisions and N03 rights fail-closed gate |
| POI graph / routing tests | PASS; 15/15 and 28/28 |
| `npm ci` | PASS; locked dependencies installed, 0 reported vulnerabilities |
| Lint | PASS; 0 errors, 10 warnings in unchanged POI files on latest develop |
| Typecheck / production build / CI format check | PASS / PASS / PASS |
| Actual 200-node batching, resume, selected batch 2 rebuild, checksum and corruption rejection | PASS; 200 + 44 verified |
| Staged secret pattern scan / `git diff --cached --check` | PASS / PASS |

Candidate QA, individual NODE_ACCEPTED decisions and NATIONAL_MASTER_PASS are separate gates. The combined manifest records `nationalMasterStatus=PASS`; future N03 administrative enrichment still fails closed until rights PASS. Further node breadth is outside this closeout. PR #448 may move from Draft to Ready for Review only after final exact-head Quality Gate succeeds; normal merge remains governed by the amendment's explicit conditions.
