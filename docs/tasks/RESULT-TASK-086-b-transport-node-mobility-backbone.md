# RESULT — TASK-086-B TransportNode mobility backbone

**BLOCKED_NATIONAL_SOURCE_IDENTITY_COVERAGE**. The requested national mobility backbone is not complete. No audited fixpoint is claimed and WBS 7.16 remains **进行中**.

Base develop: `5123966f62dbe9587a3bbe38e877ccf3ea959b80`. Task commit: `f3e0c696a20b34c4e9dd6d2021cb046eeab8ceff`. Branch: `feature/b-transport-node-mobility-backbone`. Existing [Draft PR #466](https://github.com/kanzakimy0/TravelAssist/pull/466) remains Draft; no merge or auto-merge. Final head and exact-head Quality Gate are reported with publication evidence, avoiding a self-referential commit hash in this file.

## Produced and verified scope

- Offline task-owned model, independent deterministic node admission, exact service calling sequences, directed edges, official transfers, source-bound metrics and graph-derived QA.
- 327 admitted / 711 HOLD / 0 rejected. All admitted identities are independently derived from licensed GTFS; no rejected 084 v1 identity or unreviewed v2 bulk promotion is used.
- Required inventory: 1038 entries, including protected national discovery obligations. T0 89, T1 462, other 487. Admitted T0/T1 count is zero; the proposed national tiers are explicitly held.
- 9 lines, 63 service patterns, 1339 directed edges: 1,314 service segments, 25 transfers, zero direct shortcuts. Modes: highway bus 1,059; tourism/local bus 156; airport bus 88; ferry 11; transfer 25. No real rail/flight/special-mode edge is claimed from synthetic tests.
- 88 deterministic batches, capped at 200 edges; source/node/pattern inputs, QA receipts, corruption detection, resume/skip, changed-source invalidation and explicit single-batch rerun.
- 10 adaptive replay iterations, with every parameter change, source fingerprint and deficit delta recorded. National T0/T1 deltas remain zero; this is not convergence.

## Hard topology failures

T0 **0/89**, T1 **0/462**, all national required connected **0/1038**. Mandatory named corridors **0/9**, all graph-derived corridor queries **22/1109**. Explicit GTFS transfer topology **25/25**; held v2 multi-component hub reviews **218**. Airport surface, national ferry/island connection, national highway/tourism bus coverage, special tourism modes and Shinkansen/major rail continuity do not pass.

The reviewed nationwide options do not yet provide an admitted identity/service/rights package. Additional ordinary discovery and component review remain. The machine result therefore has `globalTopologyDiscoveryFixpoint=NOT_PROVEN`, zero validated exceptions and an empty `fixpoint-proofs.jsonl`. The next-source-action ledger makes the remaining acquisition work concrete. No fixpoint exception table is offered for acceptance because there are no proved exceptions.

## Dynamic metrics

Calendar coverage: 1,314/1,339 edges. Transfer-time coverage: 24/25 transfer edges (24/1,339 overall). Duration, fare, frequency, first/last departures, reservation, seasonal, accessibility and P90 remain unresolved. Unknown metrics preserve confirmed topology and do not cause the national blocker.

## Evidence and reproduction

[QA and commands](../qa/TASK-086-B/README.md), [connectivity](../qa/TASK-086-B/connectivity-report.md), [source/license decisions](../qa/TASK-086-B/source-license-summary.md), [all adaptive parameter changes](../qa/TASK-086-B/adaptive-model-report.md), [deterministic verification](../qa/TASK-086-B/deterministic-rebuild.json), [complete input hashes and inventory checksum](../../data/transport/network/manifest.json).

The current Nagasaki feed is `VER_20261001`, SHA-256 `add5981eb3444be32570b26785c845be582b3458fac2b3ac9830351feb0148fc`; it differs from the 084 snapshot and was re-parsed independently. Fukuoka ferry ZIP is `b39a7590d454e37a400f724472e4969133c7b9f54b8600dce68bc47fa0da1b9e`.

Production build/artifact verification, typecheck and lint (0 errors, 10 existing warnings) passed. Local validation is recorded in [the publication receipt](../qa/TASK-086-B/publication-validation.json). Final exact-head CI is linked from the Draft PR description and final execution report, after the commit exists. No Route runtime, API, Planner behavior, Canonical POI truth, TASK-085 data or N03 administrative assignment was changed.
