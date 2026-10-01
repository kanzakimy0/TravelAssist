# TASK-086-B connectivity checkpoint

Status: **IN_PROGRESS_AUTO_REMEDIATION**. This is an ongoing-work checkpoint under [the no-early-exit amendment](../../tasks/AMENDMENT-TASK-086-b-autonomous-source-acquisition-no-early-exit-v2.md), not a terminal Result or acceptance request. Ordinary discovery remains and the global fixpoint is not proven. Work continues on the same branch and [Draft PR #466](https://github.com/kanzakimy0/TravelAssist/pull/466).

| Measure | Preserved checkpoint 1236238c8 | Current phase 82 |
| --- | ---: | ---: |
| Required inventory | 1038 | 2691 |
| ADMIT / HOLD | 327 / 711 | 2607 / 84 |
| Lines / service patterns | 9 / 63 | 172 / 403 |
| Directed edges | 1339 | 6570 |
| Batches | 88 | 607 |
| Adaptive iterations | 10 | 82 |
| Connected T0 | 0 / 89 | 89 / 89 |
| Connected T1 | 0 / 462 | 433 / 462 |
| Connected required nodes | 0 / 1038 | 2362 / 2691 |
| Mandatory corridors | 0 / 9 | 9 / 9 |

Independent component review has converted **627 original HOLD records to ADMIT**. Additional actual service intermediates expand the denominator; no original requirement was dropped or downgraded.

## Mandatory graph queries

| Corridor | Result |
| --- | --- |
| 東京 ↔ 京都 | PASS |
| 東京 ↔ 大阪 | PASS |
| 東京 ↔ 河口湖 | PASS |
| 大阪 ↔ 京都 | PASS |
| 大阪 ↔ 三ノ宮 | PASS |
| 大阪 ↔ 奈良 | PASS |
| 博多 ↔ 熊本 | PASS |
| 札幌 ↔ 旭川 | PASS |
| 札幌 ↔ 函館 | PASS |

Queries require independently evidenced forward and reverse paths. Previously absent endpoint placeholders can resolve only to a unique admitted exact-name conventional/private rail component; existing endpoint bindings are preserved. Airport names do not satisfy rail queries. Resolving a QA endpoint creates no graph edge.

## Directed graph scope

| Mode | Directed edges |
| --- | ---: |
| airport_bus | 138 |
| conventional_rail | 1513 |
| ferry | 11 |
| fixed_guideway | 56 |
| flight | 2 |
| highway_bus | 1059 |
| local_bus | 156 |
| metro | 1112 |
| private_rail | 1719 |
| shinkansen | 289 |
| transfer | 515 |

Original hub scopes: 100 complete, 118 pending or partial. A hub is complete only when every expected component is independently admitted and mutually reachable using reviewed transfer edges inside that hub. New boundary/interchange nodes outside the original 218 scopes are separately evidenced; no same-name or S12 group-code transfer is synthesized.

## Remaining hard deficits

| Class | Count |
| --- | ---: |
| AIRPORT_SURFACE_GAP | 75 |
| CORRIDOR_UNREACHABLE | 370 |
| DISCONNECTED_T0 | 0 |
| DISCONNECTED_T1 | 29 |
| HIGHWAY_BUS_GAP | 1 |
| HUB_TRANSFER_GAP | 118 |
| ISLAND_FERRY_GAP | 7 |
| MISSING_INTERMEDIATE_NODE | 300 |
| NODE_IDENTITY_GAP | 84 |
| SERVICE_PATTERN_GAP | 2 |
| SOURCE_LICENSE_GAP | 1 |
| TOURISM_SPECIAL_MODE_GAP | 1 |

Metric-only gaps stay separate. Unknown times/fares/accessibility do not remove confirmed topology or justify stopping ordinary discovery.
