# RESULT — TASK-090-A Canonical 100 POI Recommendation Match Quality Calibration

- Issue: #461
- WBS: 7.9.1
- Base `origin/develop`: `c4f00b8d0ffe553a19eaa6086e8c0b1e9d2aec5c` (includes TASK-084-A / PR #451)
- Branch: `feature/a-recommendation-quality-calibration`
- Status: **PASS_BEHAVIOR_GATES_WITH_REVIEW_LIMITATIONS**; Draft review required. This is not a recommendation-ranking-quality or user-taste validation.

## Frozen input and method

The only POIs are the 100 admitted internal IDs in `canonical-poi-pilot100.runtime-manifest.v1.json`, paired in order with their 100 Master Codes. All 100 have the TASK-088-A 43/43 trusted baseline in the server-only Canonical repository. No candidate-only row, name-based match, synthetic POI, or additional POI was admitted.

Input hashes (SHA-256): Canonical dataset `802785ddb24e720698c2813f1f9dce29fe6792cdf02dbd01e9557b385a88bda2`; trusted baseline artifact `f77a6afd7e37fe6d6e1ea42fc7f0f411761748c06bb11a1c574cee7d26326b24`; frozen scoring config object `54cfbf23caa3a4b8af9e09ad09d0dd9bb6ccf5876ab06715461c9c8edfd83c35`. The version is `poi-match-v1-pilot-candidate`; the Preference mapping remains the existing single registry.

The [probe catalog](../qa/TASK-090-A/probe-catalog.json) has 98 controlled, one-factor-at-a-time comparisons: 32 interest steps (all 16 current codes, dislike → absent → like), 8 independent detail signals, 4 walking, 2 queue, 4 discovery, 12 party, 7 season, 8 weather, 9 time-slot, 2 rest, and 10 hard-constraint probes. Every probe evaluates both states against the same 100 POIs: **19,600 score evaluations** and **9,800 paired POI observations**. Weather/season/time states are deterministic QA contexts, not live conditions; no 8-persona benchmark was run.

## Acceptance gates frozen before PASS

| Gate                                             | Frozen threshold |                      Observed |
| ------------------------------------------------ | ---------------: | ----------------------------: |
| Expected direction for materially relevant cells |             ≥95% |    1,957 / 2,008 = **97.46%** |
| Counter-direction                                |              ≤2% |                 **0 / 2,008** |
| Hard `REJECT` / `NEEDS_FACT` before soft ranking |             100% |             **1,000 / 1,000** |
| Soft-score override of rejected/unknown gate     |                0 |                         **0** |
| Unexplained unrelated component movement         |                0 |                         **0** |
| Deterministic replay                             |      byte-stable | **PASS**, all artifact hashes |

The materially relevant walking/queue case requires Feature43 burden ≥6 **and** burden above the current tolerance; a burden already covered by the old tolerance cannot be required to improve at the next tolerance level. The Pilot-100 has no walking-burden value above the `high` tolerance threshold (7), so `high → veryHigh` has no materially testable POI. That is a sample limitation, not a score failure. Nominal changes in discovery orientation, season, or time slot are not treated as universally nondecreasing utility. Their directional and anchor checks remain recorded separately.

The 50 bottom/top Feature43-quartile anchor comparisons all pass. All materially represented ordinal interest and walking/queue groups are nondecreasing. Static `matchScore` does not change under party/season/weather/time/rest context-only probes. Hard-gated POIs receive no eligible rank.

## Sensitivity limitations and anomaly ledger

There are **51 no-integer-score-effect observations** among the materially relevant cells and **zero counter-direction movements**. Every one has a changed weighted Feature43 contribution in the trace; integer 0–99 rounding absorbs the movement. All 51 are retained in the [machine-readable anomaly ledger](../qa/TASK-090-A/anomaly-ledger.jsonl) as `expected interaction`, not silently excluded. Probe groups:

| Probe                   | Relevant | Integer score moved | No effect |
| ----------------------- | -------: | ------------------: | --------: |
| walking standard → high |       20 |                  11 |         9 |
| queue medium → high     |        9 |                   3 |         6 |
| discovery 1 → 2         |       61 |                  53 |         8 |
| discovery 2 → 3         |       61 |                  53 |         8 |
| discovery 3 → 4         |       85 |                  67 |        18 |
| discovery 4 → 5         |       85 |                  83 |         2 |

The overall frozen gate passes, but these small interval effects are an explicit UX sensitivity review item. No claim is made that every adjacent input step produces a visibly distinct integer score, that the resulting ranking is optimal, or that actual weather was validated. One interest family (`onsen_wellness`) has no ≥6 Feature43 sample in this fixed Pilot; its mapping is exercised but material high-value directional sensitivity remains unmeasured. More representative admitted POIs or a product-level visible-score policy would be needed to close those limitations.

## Config decision

`config-before.json` and `config-after.json` are intentionally identical. No central weight, gamma, Preference mapping, or Feature43 value was changed because the frozen overall directional, counter-direction, hard-gate, trace-isolation, anchor, and determinism gates pass; changing global production weights merely to eliminate integer ties on this fixed sample would risk overfitting. The before/after sensitivity values are therefore identical. If product review requires **every** adjacent setting to change the integer score, that is a distinct acceptance criterion and warrants a versioned central-config follow-up with a full TASK-084 output migration.

## Artifacts and verification

`docs/qa/TASK-090-A/` contains the 12 specified machine-readable artifacts: probe catalog/inputs, per-POI score observations and rank deltas, monotonicity, pairwise anchors, hard constraints, anomaly ledger, config before/after, summary, and deterministic replay with hashes. The runner `tools/qa/task-090-calibration.mjs` can rebuild them; `npm run qa:poi-recommendation:calibration` verifies byte equality. Tests cover the catalog, 100-ID boundary, score/rank recomputation, directional/ordinal behavior, component isolation, hard gates, anchors, anomaly completeness, config/hash binding, no named-POI patch, and replay.

Validation record: targeted tests **5/5 PASS**; deterministic QA replay PASS; full Node regression **2,817/2,817 PASS** (includes TASK-084/088, Canonical, Preference, Planning, Edge, Transport, and governance); lint **0 errors** (10 pre-existing unrelated warnings, no TASK-090 warning); typecheck PASS; Next production build PASS; local deployment validation/build/artifact verification PASS (1,908 artifact files). The first build attempt failed solely because this isolated worktree had an external `node_modules` junction; after replacing only that junction with a worktree-local `npm ci`, production build passed. Format and `git diff --check` PASS. Production deployment credential validation was not attempted and no production deployment occurred.

## Final review state

- WBS 7.9.1: 待审查 (Draft PR; not merged or accepted).
- Draft PR: pending creation.
- Exact-head GitHub Quality Gate: pending.
- No auto-merge; no national expansion; no POI-specific bonus; no modification of trusted Feature43 values.
