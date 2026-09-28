# TASK-084-A scoring QA

Status: **PARTIAL / PASS_RUNTIME / BLOCKED_REAL_PILOT**. This directory contains contract fixtures, mapping/config artifacts and a Phase-0 gate audit. It contains **no real POI matching output**.

## Sources and replay

- Feature registry: existing src/shared/contracts/planning/features.ts#POI_FEATURE_DEFINITIONS (43 codes).
- Long-term Preference registry: existing src/shared/contracts/preferences/core.ts#preferenceFields (23 keys).
- preference-43d-mapping.json and scoring-config.json are generated from versioned TypeScript config by tools/qa/task-084-recommendation-runtime.mjs. Run npm run qa:poi-recommendation to check semantic equivalence.
- benchmark-personas.json holds eight canonical Preference-schema fixtures, not saved users or scored real POIs.
- contract-test-summary.json records deterministic fixture hash and local performance. It is not empirical calibration.
- Runtime tests: npm run test:poi-recommendation.

## 23-key classification

| Preference key                                                                       | Category / use                                                                             |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| mobility.fewerTransfers                                                              | ROUTE_SOFT_INPUT; never a POI attraction feature                                           |
| mobility.walkingTolerance                                                            | POI_43D_INPUT, COST_INPUT, DURATION_OR_PACE_INPUT; feature 25 tolerance, not route minutes |
| mobility.noPublicTransit, mobility.noBus, mobility.noFerry                           | ROUTE_HARD_CONSTRAINT; selected route modes require hard gate                              |
| dining.localCuisine, dining.smallShops                                               | PLANNER_WEIGHT_INPUT                                                                       |
| dining.queueTolerance                                                                | COST_INPUT, PLANNER_WEIGHT_INPUT; feature 28 risk tolerance                                |
| accommodation.transportConvenience                                                   | ROUTE_SOFT_INPUT                                                                           |
| accommodation.comfort                                                                | NOT_USED_BY_POI_SCORING_V1                                                                 |
| accommodation.fewerHotelChanges                                                      | PLANNER_WEIGHT_INPUT                                                                       |
| budget.spendingTendency, budget.prioritizeAccommodation, budget.prioritizeExperience | PLANNER_WEIGHT_INPUT                                                                       |
| interests.preferences, interests.details                                             | POI_43D_INPUT; explicit interest projection                                                |
| style.pace, style.depth                                                              | DURATION_OR_PACE_INPUT; schedule policy only                                               |
| style.discovery                                                                      | POI_43D_INPUT, PLANNER_WEIGHT_INPUT; iconic/hidden/local tradeoff                          |
| style.movement                                                                       | ROUTE_SOFT_INPUT                                                                           |
| style.coverage, style.priority, style.planning                                       | PLANNER_WEIGHT_INPUT                                                                       |

The machine-readable matrix lists all 23 keys individually. POI_43D_INPUT does not mean a second 43D user vector.

## Scoring and gate

The kernel follows accepted benefit/suitability, cost, risk and context functions. Hard needs produce REJECT or NEEDS_FACT before soft scoring. Breakdown records inputs, provenance, confidence, weight and contribution. Unknown feature value stays null; known zero remains zero. If all requested evidence is unresolved, score value is null with neutral_default and zero coverage, not a rankable fabricated number. Partial evidence shrinks toward neutral.

Weights and gamma are explicit pilot-calibration candidates, not empirical truth. The service boundary accepts only an authorized Canonical runtime repository and refuses candidate IDs or Canonical records without Feature43. No new API, second registry, LLM or provider call exists in the hot path. Day fatigue, actual route facts and Planner rank remain separate.

## Real Pilot gate

preflight.json records PR #444 (Canonical Pilot-100) and PR #437 (real 43D, 0/4,300 at preflight) as Draft/Open and not accepted on the base. Current develop has no authorized Pilot-100 or accepted real Feature43 set. The 100-POI × 8-persona benchmark, pairwise calibration and real-rank analysis are intentionally absent. Resume only after both gates pass, never with Candidate workbook values or synthetic fixtures.
