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

The [preflight](../qa/TASK-084/preflight.json) records the original publication-base state: PR #444 was Draft/Open and its Pilot-100 dataset absent, while PR #437 reported 0/4,300 real Feature43 cells assessed. The latest-develop refresh below supersedes the Canonical inventory portion of that historical audit.

No candidate-only workbook, historical v1.66 score, synthetic POI fixture or unaccepted PR-only data was promoted to Canonical. No real top-20 list, pairwise gold set, rank correlation, calibration delta or 100-POI score file was created.

## Latest-develop refresh

Merged develop 3fab703d13694fd1205679c96fb8d1d2e8549fbc normally into #451 as merge commit 5c27b6142fe2a69240a588f5d26c3b6264da70c7. This preserves TASK-083 Canonical Pilot-100, TASK-082 Edge, PR governance, Preference/Feature43 registries and this scoring runtime.

The TASK-083 server-only repository now authorizes exactly 100 admitted Canonical IDs and 100 active Master Codes. A concrete scoring adapter delegates to that validated repository; the new real boundary test verifies **100/100 repository recognition** and **100/100 FEATURE43_UNAVAILABLE** responses. All 100 admitted records have features: null, so scored real POIs remain **0/100**. This is a fail-closed runtime smoke, not the Real POI Matching Pilot. PR #437 remains Draft/Open and real Feature43 assessment remains 0/4,300.

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

The 26-case scoring contract suite covers the Task's required 24 semantics plus the generic Canonical service boundary and persona schema. The additional real Canonical-100 boundary test checks the newly admitted repository. Mapping/config artifacts are checked from source. Local synthetic performance is recorded in [contract-test-summary.json](../qa/TASK-084/contract-test-summary.json) for one POI/persona, 100 scorer calls/one persona and 800 calls/eight personas, 25 repeats each. This measures the hot path, not real data quality.

| Gate                                                                                             | Result                                                                                                                           |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| New scoring and Canonical-100 boundary tests                                                     | 27/27 pass                                                                                                                       |
| Preference / Planning / Canonical POI / TASK-083 runtime / Edge / governance focused regressions | 1,139/1,139 pass                                                                                                                 |
| Full repository Node tests                                                                       | 2,803/2,803 pass with bundled Python; initial concurrent build caused one transient .next chunk ENOENT, then serial rerun passed |
| Lint                                                                                             | Pass; 10 pre-existing warnings, 0 errors                                                                                         |
| Typecheck                                                                                        | Pass                                                                                                                             |
| Formatting                                                                                       | format:check:deploy pass                                                                                                         |
| Build                                                                                            | Pass                                                                                                                             |
| Deployment validate/build/artifact                                                               | All pass; standalone artifact 1,908 files verified                                                                               |
| Exact-head GitHub Quality Gate                                                                   | Old #487 belongs to the pre-refresh head; new exact-head run pending                                                             |

No accepted real-data calibration was performed. Gamma/weights remain labeled pilot candidates. #444 is now merged; #437 must still assess/publish real Canonical Feature43 with confidence/provenance and user acceptance before the fixed 100-POI × 8-persona Pilot and pairwise analysis can run. Do not treat this runtime PR as full WBS 7.9 completion or auto-merge it.
