# Final certification-engine repair and full re-certification

Frozen input `5d875e0e8061f560aced89f1f5732cd9ae692dd1b02ec76a5d0c242287a7d0a6`. Authority `67bf222e3d697186be43cf98c4d7299e41015e70`. Original candidate input and requirements unchanged.

| Inventory | Before | Current | Recovered | Disabled |
| --------- | -----: | ------: | --------: | -------: |
| node      |   1174 |    4061 |      2887 |        0 |
| edge      |   2460 |    9409 |      6949 |        0 |
| transfer  |     37 |    1072 |      1035 |        0 |

Transfers are a subset of edges. All11,556 typed prior exclusions including685 sources recomputed, no sampling or inherited quarantine decision. Engine-only recovery2,886 nodes/6,947 edges/1,035 transfers; exact ODbL obligation supplement1 node/2 edges/0 transfers. All734 descriptors certify their required derived-fact uses, without granting raw redistribution. 236 recovered source-family associations; counts overlap.

## Actual Tokyo/Ueno witnesses

- 東京→上野: 東海道・高崎線上野東京ライン / 普通 1822E / northbound; board/alight allowed. Pattern `transport-pattern:086:ce8a53e67add47698dca2e4a37f7cc5f`; edge `transport-edge:086:0559c955e0138e163409d97b4f842551`; [official train](https://timetables.jreast.co.jp/2610/train/040/040331.html).
- 上野→東京: 東海道・高崎線上野東京ライン / 普通 1825E / southbound; board/alight allowed. Pattern `transport-pattern:086:b1f2e13173d3a2002f256bb5a362864c`; edge `transport-edge:086:bf473ab41fdac48d9c756c803eaae958`; [official train](https://timetables.jreast.co.jp/2610/train/035/039741.html).

Tokyo and Otemachi retain separate canonical identities. No direct walking relation invented; unknown duration is not zero. No Yamanote/Keihin-Tohoku/Shinkansen conflation.

## Connectivity and integrity

16 frozen national corridor pairs pass both directions in actual certified export. Gateways 86/86. Candidate and certified passenger partitions match:17 existing components, zero certification-induced partition changes. Eight required numeric defects zero. Static topology is not guaranteed realtime service.

## Remaining original obligations

No certification-disabled entities remain. Original national acceptance remains BLOCKED: valid platform identity does not imply bidirectional access, and expired global proofs remain invalid. These6 roots are preserved, not waived.

| Stable root                                     | Remaining fact/proof                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `root:direction:component:4516374f05cda3a3809f` | Existing review proof invalidated by changed current input: data/transport/network/next-source-actions.jsonl      |
| `root:direction:component:662a9755abeab5d52770` | DIRECTION_BOARDING_OR_PUBLIC_TRANSFER_CONTINUITY_UNPROVEN                                                         |
| `root:direction:component:91378025a59875422ee5` | DIRECTION_BOARDING_OR_PUBLIC_TRANSFER_CONTINUITY_UNPROVEN                                                         |
| `root:direction:component:bcb8e18cee0bb3319142` | DIRECTION_BOARDING_OR_PUBLIC_TRANSFER_CONTINUITY_UNPROVEN                                                         |
| `root:direction:component:cdb5939683ed546563ce` | DIRECTION_BOARDING_OR_PUBLIC_TRANSFER_CONTINUITY_UNPROVEN                                                         |
| `root:obligation:mode:required-special-tourism` | Existing review proof invalidated by changed current input: data/transport/network/research/task-revision.v2.json |

Five native platforms:武部町886930_01/_05,雲仙888190_01/_05,波佐見有田インター887550_05. Preserve real pickup/dropoff restrictions. Missing complete public interchange or genuine direction service still needs evidence. 武部町_01 also has a stale public-conditional/highway audit binding; special-tourism scope proof references changed task-revision input. No hand-written hash/proof update or new ordinary discovery.

## Validation and publication

Current input engine tests19/19. Earlier45 focused/v2/Route Schema and dual-production projection checks passed; prior run preceded final witness/report-field completion. Lint/type/format/build/artifact checks exit0. Final remote gate independently covers all regression, deterministic clean raw/recovery and current engine receipt.

Actual final HEAD, CI URL/conclusion are published in the same-run `closeout-publication-final-receipt.json` artifact `task086-final-exact-head-<SHA>` of the Quality gate workflow. This source report does not predeclare remote PASS; old merged head is never reused.

PR466 was already merged at38f2f445fc4153e74832aaf9d4804d5220d2adc8, head26644283ba6b4cb9f8fa259654fc347685ccfc1b. Normal fast-forward publication goes to existing feature branch. A closed PR cannot merge new repair commits; no second PR/force push authorized. WBS pending review/publication, current repair not yet in develop. Issue443 already closed before repair.

Original large evidence and verified backup bundle remain local. Git retains compact receipts and bounded proof chunks. No second Backbone/TASK087/downstream task.
