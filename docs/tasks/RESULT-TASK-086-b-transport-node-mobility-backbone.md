# TASK-086-B execution checkpoint — national mobility backbone

**IN_PROGRESS_AUTO_REMEDIATION**. This document replaces the invalid early-stop wording at checkpoint `1236238c89e83088e0454d16c6eb86050e8f935c`. It is not a terminal result. The [mandatory amendment](AMENDMENT-TASK-086-b-autonomous-source-acquisition-no-early-exit-v2.md) requires continued acquisition, review, admission and replay while ordinary work remains.

Branch: `feature/b-transport-node-mobility-backbone`. Existing [Draft PR #466](https://github.com/kanzakimy0/TravelAssist/pull/466), base `develop`. No merge or auto-merge. WBS 7.16 remains **进行中**.

| Measure                  | Preserved checkpoint 1236238c8 | Current phase 104 |
| ------------------------ | -----------------------------: | ----------------: |
| Required inventory       |                           1038 |              2921 |
| ADMIT / HOLD             |                      327 / 711 |         2848 / 73 |
| Lines / service patterns |                         9 / 63 |         192 / 437 |
| Directed edges           |                           1339 |              7044 |
| Batches                  |                             88 |               708 |
| Adaptive iterations      |                             10 |               104 |
| Connected T0             |                         0 / 89 |           89 / 89 |
| Connected T1             |                        0 / 462 |         444 / 462 |
| Connected required nodes |                       0 / 1038 |       2601 / 2921 |
| Mandatory corridors      |                          0 / 9 |             9 / 9 |

Independent component review has converted **638 original HOLD records to ADMIT**. Additional actual service intermediates expand the denominator; no original requirement was dropped or downgraded.

## Executed remediation

149 source actions have actual acquisition attempts, with 836 recorded source/terms responses. Operator evidence now covers all six JR passenger companies, Fujikyu, Tokyo Metro, Osaka Metro, Fukuoka and Nagoya municipal metros, Tokyu, Odakyu, Keikyu, Keio, Seibu, Toei, Meitetsu, Hankyu, Hanshin, Osaka Monorail, Yui Rail, Kyoto municipal subway, Minatomirai Railway, Sotetsu, Kita-Osaka Kyuko, Nishitetsu, Tsukuba Express, Keisei (including the reviewed 2025 Matsudo merger), Rinkai, Sendai Airport Transit, Sendai and Sapporo municipal metros, Nankai, Yurikamome, Kobe New Transit, and partner-published Tobu F-Liner/ordinary/interchange evidence. JR Kyushu Kirishima calls and the Kagoshima-Chuo transfer connect the Miyazaki airport branch. Exact licensed Nagasaki terminal components connect the existing bus graph to rail; new purpose-bounded Kotoden and Kyushu Sanko airport trips connect Takamatsu and Kumamoto airports. JAL services published by Naha Airport provide a reviewed Haneda–Naha bridge. MLIT P36 supplies an operator-specific Busta Shinjuku identity tied to current JR Bus Kanto and terminal access evidence. MLIT C28 supplies independently reviewed airport identities and current operator evidence binds terminal access. MLIT S12 supplies independently re-extracted station-code/operator/line/coordinate identities. Further phases add JR Shikoku Nanpu and Uzushio actual calls, JR Kyushu Sonic and JR West Sanyo sections, licensed Tosaden/Tokushima/Oita airport trips, existing Nagasaki airport endpoints, and CC0 Geiyo Saijo airport trips. Current station and terminal evidence connects Kochi, Tokushima, Nagasaki, Oita and Hiroshima airports. Narimasu is admitted through independently reviewed municipal/Metro public access, while exact Tokyo station passages close remaining reviewed hub components. Phases 94-104 add licensed Miyako/Karry island airport trips with independently published JTA flight bridges; P11 exact operator-stop identities and current actual Komatsu/Okayama direct airport trips; seven Tokyo, ten Osaka and four central-Japan completed hub reviews; actual Meitetsu Seto and Aonami directional trains; independently published municipal Yutorito guideway patterns; and public passages at Nagoya, Ozone, Sakae/Sakaemachi, Tenjin and Miyanojin. Original GTFS bus and ferry topology is preserved.

Official train columns or service-specific stopping diagrams establish directed calls. Company-boundary concourses and explicit station gates establish physical transfers. Copyright-reserved operator timetables, prose and map artwork are not distributed; those sources retain only reviewed minimal static facts and response fingerprints. MLIT S12, P36, the PDL 1.0 P11-22 edition and the two original CC BY 4.0 GTFS archives retain their licensed raw data. The separately CC BY 4.0 Toei Train GTFS archive is also retained with attribution; its four selected actual trips preserve calendar validity, repeated calls and boarding restrictions. MLIT C28-21 is retained under its separate commercial-use National Land Numerical Information terms, with attribution and processing notice; it is not labelled CC BY.

## Remaining execution

The graph still has held identities, disconnected required components, 82 incomplete original hub scopes, airport-surface and island links, and unreviewed railway/private/metro/service scopes. All mandatory sample corridors passing does not establish national completion. Remaining source actions are executable queue states, not a handoff to the user. No fixpoint proof or exception is claimed.

`ordinaryDiscoveryRemaining=true`; `globalTopologyDiscoveryFixpoint=NOT_PROVEN`; `terminal=false`. A final-delivery invocation with this state throws `TERMINAL_RESULT_FORBIDDEN_ORDINARY_REMEDIATION_REMAINS`. Each replay selects the next source action and records measured hard-deficit changes; two consecutive stagnant iterations prohibit repeating the same strategy.

## Evidence and verification

[QA commands and verification](../qa/TASK-086-B/README.md), [connectivity](../qa/TASK-086-B/connectivity-report.md), [source rights](../qa/TASK-086-B/source-license-summary.md), [iteration deltas](../qa/TASK-086-B/adaptive-model-report.md), [rebuild receipt](../qa/TASK-086-B/deterministic-rebuild.json), and [manifest](../../data/transport/network/manifest.json). Publication validation is recorded only after the corresponding checks finish. Previous exact-head CI is historical checkpoint evidence and is not presented as validation of uncommitted changes.
