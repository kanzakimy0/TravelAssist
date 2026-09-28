# RESULT — TASK-084-A Recommendation Scoring v1

**Outcome: PARTIAL / PASS_RUNTIME / BLOCKED_REAL_PILOT.** Runtime implementation and deterministic fixture contracts are ready for review. No real 100-POI matching result is claimed.

| Item                   | Result                                                               |
| ---------------------- | -------------------------------------------------------------------- |
| Issue                  | [#450](https://github.com/kanzakimy0/TravelAssist/issues/450)        |
| Base develop           | 511508c9a59c3b94c7d72cedbf5ff559da69ded8                             |
| Implementation branch  | codex/a-task-084-poi-recommendation-scoring-v1                       |
| WBS 7.9                | 待审查; real Pilot separately blocked                                |
| Mapping version        | preference-to-poi-v1-pilot-candidate                                 |
| Scoring config version | poi-match-v1-pilot-candidate                                         |
| Benchmark personas     | Eight canonical Preference-schema fixtures, synthetic test data only |

## Phase 0 / real-data gate

The [preflight](../qa/TASK-084/preflight.json) records authoritative registries and upstream state. PR #444 remained Draft/Open and unmerged, and its admitted Pilot-100 dataset/runtime manifest was absent from the base. PR #437 remained Draft/Open and reported 0/4,300 real Feature43 cells assessed. The base has no authorized Pilot-100 runtime inventory or accepted 100 × 43 real facts.

No candidate-only workbook, historical v1.66 score, synthetic POI fixture or unaccepted PR-only data was promoted to Canonical. No real top-20 list, pairwise gold set, rank correlation, calibration delta or 100-POI score file was created.

## Runtime delivered

- Versioned explicit classification for all 23 canonical Preference keys, 16 interest codes and supported details. Product defaults are tagged; absent long-term values are not rewritten into user storage. Trip Override beats Trip Snapshot and long-term/default values.
- Deterministic Feature43 benefit, preference/context suitability, walking/physical cost, crowd/queue risk and adverse-weather sensitivity. Policy lives in one versioned calibration-candidate config.
- PASS / REJECT / NEEDS_FACT gate for wheelchair/stroller requirements, selected route-mode bans, schedule feasibility and unknown critical facts.
- Coverage/confidence-aware 0–99 score envelope with replay revisions, recomputable breakdown and evidence-linked reason codes. All-unresolved requested facts return null score with neutral_default; null is never made into feature 0 or 5.
- Group cost/risk uses the least tolerant supplied member. Fresh live crowd/queue facts replace baseline with one contribution.
- Separate matchScore, partyFit, seasonFit, weatherFit, timeSlotFit, restFit. Actual dayFit and routeFit remain not_applicable until independent inputs exist. No route minutes, fare, transfers, visit-mode fatigue or Planner rank are inferred from POI features.
- Server-only Canonical repository adapter. Unauthorized manifest, out-of-scope identity, invalid Canonical record and absent Feature43 fail closed. No endpoint added.

Code: src/shared/recommendation-scoring/ and src/server/recommendation-scoring/service.ts. Mapping/design table: [QA README](../qa/TASK-084/README.md).

## QA

The new 26-case contract suite covers the Task's required 24 semantics plus Canonical service boundary and persona schema. Mapping/config artifacts are checked from source. Local synthetic performance is recorded in [contract-test-summary.json](../qa/TASK-084/contract-test-summary.json) for one POI/persona, 100 scorer calls/one persona and 800 calls/eight personas, 25 repeats each. This measures the hot path, not real data quality.

| Gate                                                                          | Result                                                                                                          |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| New scoring tests                                                             | 26/26 pass                                                                                                      |
| Preference / Planning / Canonical POI / Edge / governance focused regressions | 1,106/1,106 pass                                                                                                |
| Full repository Node tests                                                    | 2,796/2,796 pass with bundled Python; initial Windows system Python alias caused one environment-only exit 9009 |
| Lint                                                                          | Pass; 9 pre-existing unrelated tools/poi warnings, 0 errors                                                     |
| Typecheck                                                                     | Pass                                                                                                            |
| Formatting                                                                    | format:check:deploy pass                                                                                        |
| Build                                                                         | Pass                                                                                                            |
| Deployment validate/build/artifact                                            | All pass; standalone artifact 1,908 files verified                                                              |
| Exact-head GitHub Quality Gate                                                | Pending Draft PR head                                                                                           |

No accepted real-data calibration was performed. Gamma/weights remain labeled pilot candidates. Once #444 is accepted and merged, #437 must assess/publish real Canonical Feature43 with confidence/provenance and user acceptance; then rerun the fixed 100-POI × 8-persona Pilot and pairwise analysis in a separately reviewed update. Do not treat this runtime PR as full WBS 7.9 completion or auto-merge it.
