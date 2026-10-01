# TASK-086-B execution checkpoint — national mobility backbone

**IN_PROGRESS_AUTO_REMEDIATION**. This document replaces the invalid early-stop wording at checkpoint `1236238c89e83088e0454d16c6eb86050e8f935c`. It is not a terminal result. The [mandatory amendment](AMENDMENT-TASK-086-b-autonomous-source-acquisition-no-early-exit-v2.md) requires continued acquisition, review, admission and replay while ordinary work remains.

Branch: `feature/b-transport-node-mobility-backbone`. Existing [Draft PR #466](https://github.com/kanzakimy0/TravelAssist/pull/466), base `develop`. No merge or auto-merge. WBS 7.16 remains **进行中**.

| Measure | Preserved checkpoint 1236238c8 | Current phase 42 |
| --- | ---: | ---: |
| Required inventory | 1038 | 1759 |
| ADMIT / HOLD | 327 / 711 | 1520 / 239 |
| Lines / service patterns | 9 / 63 | 84 / 229 |
| Directed edges | 1339 | 4210 |
| Batches | 88 | 372 |
| Adaptive iterations | 10 | 42 |
| Connected T0 | 0 / 89 | 80 / 89 |
| Connected T1 | 0 / 462 | 287 / 462 |
| Connected required nodes | 0 / 1038 | 1193 / 1759 |
| Mandatory corridors | 0 / 9 | 9 / 9 |

Independent component review has converted **472 original HOLD records to ADMIT**. Additional actual service intermediates expand the denominator; no original requirement was dropped or downgraded.

## Executed remediation

28 source actions have actual acquisition attempts, with 221 recorded source/terms responses. Operator evidence now covers all six JR passenger companies, Fujikyu, Tokyo Metro, Osaka Metro, Fukuoka and Nagoya municipal metros, Tokyu, Odakyu and Keikyu. MLIT S12 supplies independently re-extracted station-code/operator/line/coordinate identities. Original GTFS bus and ferry topology is preserved.

Official train columns or service-specific stopping diagrams establish directed calls. Company-boundary concourses and explicit station gates establish physical transfers. Full operator timetables, prose and map artwork are not distributed; only reviewed minimal static facts and response fingerprints are retained. MLIT and the two original CC BY 4.0 GTFS archives retain their licensed raw data.

## Remaining execution

The graph still has held identities, disconnected required components, 138 incomplete original hub scopes, airport-surface and island links, and unreviewed railway/private/metro/service scopes. All mandatory sample corridors passing does not establish national completion. Remaining source actions are executable queue states, not a handoff to the user. No fixpoint proof or exception is claimed.

`ordinaryDiscoveryRemaining=true`; `globalTopologyDiscoveryFixpoint=NOT_PROVEN`; `terminal=false`. A final-delivery invocation with this state throws `TERMINAL_RESULT_FORBIDDEN_ORDINARY_REMEDIATION_REMAINS`. Each replay selects the next source action and records measured hard-deficit changes; two consecutive stagnant iterations prohibit repeating the same strategy.

## Evidence and verification

[QA commands and verification](../qa/TASK-086-B/README.md), [connectivity](../qa/TASK-086-B/connectivity-report.md), [source rights](../qa/TASK-086-B/source-license-summary.md), [iteration deltas](../qa/TASK-086-B/adaptive-model-report.md), [rebuild receipt](../qa/TASK-086-B/deterministic-rebuild.json), and [manifest](../../data/transport/network/manifest.json). Publication validation is recorded only after the corresponding checks finish. Previous exact-head CI is historical checkpoint evidence and is not presented as validation of uncommitted changes.
