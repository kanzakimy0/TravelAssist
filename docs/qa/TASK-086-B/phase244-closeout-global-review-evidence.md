# TASK-086-B phase 244 bounded global-review closeout evidence

Observed 2026-10-04 08:27–08:38 UTC in `F:\CodexWorktrees\TravelAssist-TASK086`. Scope: the three assigned global-review roots and the coordinator-requested special-tourism check. No shared network data, review, manifest, acceptance report, or proof was changed.

## Conclusion

The three assigned roots have one shared current cause: **the published audit/stage was generated before the current global-review input, while the current review and retained graph pass the executable review predicate**. The additional `mode:required-special-tourism` check is a separate original obligation, but its current executable predicate also passes. There is no evidence-grounded review or graph patch to propose. Do not edit hashes or mark the saved proof current.

The isolated read-only check at `.cache/task-086/closeout-B/review-current.mjs` calls the repository's `prepareExactPatternCorrections` and `reviewGlobalGaps` with current review files, source actions, phase facts, admitted nodes, patterns, edges, inventory, connectivity, source-rights and evidence records. Command:

```powershell
node .cache/task-086/closeout-B/review-current.mjs
```

Observed runtime 2.3 seconds; exit 0; `source:national-stopping-patterns`, `service:shinkansen-continuity`, `service:major-rail-private-metro`, and `mode:required-special-tourism` all returned `CLOSED` with no deficit. The checker writes no outputs. It validates the current published graph and current review inputs; it is not a deterministic rebuild or a clean-stage proof.

## Evidence and root mapping

| Check/root | Review input binding and retained coverage | Current saved stage |
| --- | --- | --- |
| `root:obligation:source:national-stopping-patterns` / `source:national-stopping-patterns` | 94/94 binding hashes match current bytes; 2,521/2,521 required nodes admitted and connected; 403 required patterns include five explicitly retired, exact-correction-audited legacy IDs; all 398 present patterns have valid service-segment counts and admitted calls. Exact correction predicate passes. | `FAIL`, stale audit deficit reason `REVIEW_EVIDENCE_OR_COVERAGE_INVALIDATED`. |
| `root:obligation:service:shinkansen-continuity` / `service:shinkansen-continuity` | 9/9 bindings match; 118/118 nodes admitted and connected; all 34 required patterns present with valid service-segment counts and admitted calls. | Same stale FAIL reason. |
| `root:obligation:service:major-rail-private-metro` / `service:major-rail-private-metro` | 90/90 bindings match; 2,421/2,421 nodes admitted and connected; 375 required patterns include the same five audited corrections; all 370 present patterns have valid service-segment counts and admitted calls. Exact correction predicate passes. | Same stale FAIL reason. |
| Separate check `mode:required-special-tourism` | 171/171 bindings match; applicability set exactly matches 152 required nodes and 20 relevant patterns; current modes exactly `fixed_guideway` and `tram`; all required nodes admitted and connected. The current executable applicability predicate passes. | `FAIL` in `core-stage-acceptance.structuralChecks`, despite a `root:stale-review:mode:required-special-tourism` row marked `RESOLVED` in residual roots. It is a distinct obligation, but current evidence does not support an open deficit. |

For the source and major-rail checks, the five absent old pattern IDs are the exact allowlisted corrections in `research/pattern-corrections.v1.json`: `227b50...`, `5fb424...`, `fc54dd...`, `ee9eb7...`, and `f68de1...`. The old implementations were not silently deleted from the obligation: `reviewGlobalGaps` invokes `correctionObligationsPreserved` and `exactCorrectionCovers`, both passed in the scoped run. The special-tourism decision is bounded to the accepted original/current inventory; it does not claim all-Japan ropeway coverage.

The current `global-review.v1.json` raw SHA-256 is `63c6aaa0a1c739ac60054dbec07f746aa18f6c95e3a765ed648d67b5f039f4e8`. The saved manifest binds `e8b60725a68dc3d75f8bb6c7eb77b75693daf9cd90a39ec76d901109bd622965`; `deterministic-rebuild.json` binds `bbe57e2aa157d53072a905beee8f55ce39ca68e1f8a23ec25e80d9e7c2f37e15`. The proof is the older phase-220 PASS receipt. These three different hashes establish a stale publication/proof dependency, independent of the four current review predicates.

## One proposed reconciliation

**Shared patch: none.** Preserve the current review and graph records. The coordinator can use the normal generator `node tools/transport/task-086-remediate.mjs` once, after freezing other authorized inputs, then regenerate the stage with `node tools/transport/task-086-stage.mjs` and inspect these four check IDs. The remediator writes shared graph, audit and manifest outputs; it is not a scoped 2-second check and was deliberately not run here. Historical phase-244 replay was about 35.5 minutes, so budget it as a long operation. `task-086-stage.mjs` alone only consumes saved `topology-unresolved.jsonl` and `connectivity-audit.json`; it writes shared reports and cannot reconcile their stale deficits. A fresh deterministic rebuild verification is separately required to replace the phase-220 proof, if the larger validation budget permits. Do not report full acceptance while the six independent bus-direction roots remain open.

Targeted pre/post condition: run `node .cache/task-086/closeout-B/review-current.mjs` (expected four CLOSED), then after regeneration inspect `data/transport/network/core-stage-acceptance.json` for these exact four structural check IDs. The first command is read-only and takes about 2–3 seconds. The repository's focused unit test for input/proof invalidation also passed:

```powershell
node --test --test-name-pattern "TASK086 changed static review evidence invalidates both unreplayed checks and old rebuild proof" tests/task-086-b-stage-closeout.test.mjs
```

Observed 1 test passed in 0.15 seconds. It tests the invalidation rule, not the current dataset; the isolated current-data checker supplies that evidence.

The isolated checker reads `generatedAt` from the saved manifest only to evaluate the currently published graph under the same deterministic timestamp. `task-086-remediate.mjs` hardcodes `2026-10-01T00:00:00Z`, which equals the saved manifest value. `generatePattern` can use this timestamp in GTFS service-date/section validation and exact replacement-edge generation, so it is part of coverage validation rather than only a source-rights label. The scoped result is valid for the present fixed timestamp; it does not certify a future generator run or fresh manifest/proof.
