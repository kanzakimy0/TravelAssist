# RESULT — TASK-084-A Recommendation Scoring v1

**Outcome: PARTIAL / PASS_RUNTIME / PASS_DETERMINISTIC_REAL_PILOT_SMOKE / NOT_QUALITY_VALIDATED.** The admitted 100 Canonical POIs and TASK-088 trusted baseline supplied exactly 4,300 field decisions and 100 recomputable POI results. This is one frozen QA input, not a recommendation-quality or real-user acceptance.

| Item                   | Result                                                            |
| ---------------------- | ----------------------------------------------------------------- |
| Issue                  | [#450](https://github.com/kanzakimy0/TravelAssist/issues/450)     |
| Base develop           | c94ae856e2bde348442736384c34ca30c4ebd68a (current refresh)        |
| Implementation branch  | codex/a-task-084-poi-recommendation-scoring-v1                    |
| WBS 7.9                | 待审查; deterministic Pilot smoke complete, quality not validated |
| Mapping version        | preference-to-poi-v1-pilot-candidate                              |
| Scoring config version | poi-match-v1-pilot-candidate                                      |
| Real Pilot input       | One frozen `pilot-full-coverage-v1` QA input; no 8-persona Pilot  |

## Historical Phase 0 / real-data gate

The [preflight](../qa/TASK-084/preflight.json) records the original publication-base state: PR #444 was Draft/Open and its Pilot-100 dataset absent, while PR #437 reported 0/4,300 real Feature43 cells assessed. The latest-develop refresh below supersedes the Canonical inventory portion of that historical audit.

At that earlier head, no candidate-only workbook, historical v1.66 score, synthetic POI fixture or unaccepted PR-only data was promoted to Canonical. The former no-real-result statement is superseded by the TASK-088-based Pilot below.

## Historical develop refresh, then current refresh

Merged develop 3fab703d13694fd1205679c96fb8d1d2e8549fbc normally into #451 as merge commit 5c27b6142fe2a69240a588f5d26c3b6264da70c7. This preserves TASK-083 Canonical Pilot-100, TASK-082 Edge, PR governance, Preference/Feature43 registries and this scoring runtime.

At that historical head, all 100 admitted Canonical records had `features:null`; the boundary test correctly expected 100 `FEATURE43_UNAVAILABLE` responses. That expectation is obsolete after TASK-088. This execution normally merged current `origin/develop@c94ae856e2bde348442736384c34ca30c4ebd68a` into #451 as merge commit `2ebe8fbcda12aaca10ea48ad900460cd2763bc0e`. The merge retains TASK-088 trusted Feature43, TASK-084-B transport data, TASK-083 Canonical-100, POI Edge, PR governance and the scorer. The refreshed boundary test now asserts 100/100 recognized, 100/100 baseline available, 100/100 entered scorer.

## Runtime delivered

- Versioned explicit classification for all 23 canonical Preference keys, 16 interest codes and supported details. Product defaults are tagged; absent long-term values are not rewritten into user storage. Trip Override beats Trip Snapshot and long-term/default values.
- Deterministic Feature43 benefit, preference/context suitability, walking/physical cost, crowd/queue risk and adverse-weather sensitivity. Policy lives in one versioned calibration-candidate config.
- PASS / REJECT / NEEDS_FACT gate for wheelchair/stroller requirements, selected route-mode bans, schedule feasibility and unknown critical facts.
- Coverage/confidence-aware 0–99 score envelope with replay revisions, recomputable breakdown and evidence-linked reason codes. All-unresolved requested facts return null score with neutral_default; null is never made into feature 0 or 5.
- Group cost/risk uses the least tolerant supplied member. Fresh live crowd/queue facts replace baseline with one contribution.
- Separate matchScore, partyFit, seasonFit, weatherFit, timeSlotFit, restFit. Actual dayFit and routeFit remain not_applicable until independent inputs exist. No route minutes, fare, transfers, visit-mode fatigue or Planner rank are inferred from POI features.
- Server-only Canonical repository adapter. Unauthorized manifest, out-of-scope identity, invalid Canonical record and absent Feature43 fail closed. No endpoint added.

Code: src/shared/recommendation-scoring/ and src/server/recommendation-scoring/service.ts. Mapping/design table: [QA README](../qa/TASK-084/README.md).

## Historical QA (pre-Pilot)

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

The earlier 8-persona proposal is superseded for this execution. Its fixture files remain historical contract tests only; no 8-persona real Pilot was run. One initial invocation of the old QA script did execute its preexisting synthetic 800-call performance loop before that path was removed; it used only a synthetic POI fixture and produced no real-POI Pilot result. Current QA now executes one input only. Gamma/weights remain pilot candidates. Do not treat this smoke as ranking-quality validation or WBS 7.9 completion.

## Real Canonical Pilot-100 — one frozen QA input

The only POI membership is TASK-083's authorized runtime manifest; TASK-088 attaches the separately versioned trusted baseline. The [frozen input](../qa/TASK-084/real-pilot100/pilot-input.v1.json) is synthetic and explicitly **not a user/persona benchmark**. It sets all 16 canonical interests to `like` to exercise the Preference mapping. Trip Snapshot and Override are null. Party, season, weather and time-slot facts are absent; route and schedule checks are not asserted. This prevents an invented rainy day, open venue, transport mode or party composition from entering the Pilot.

The source Feature43 values remain exactly TASK-088's 0–9 values. Their historical `confidence:null` remains unchanged. For this admitted dataset only, the scoring service treats dataset-level `TRUSTED_INTERNAL_BASELINE` authorization as computation weight 1 and writes that policy plus source reference in the breakdown provenance. This **does not claim per-cell external evidence confidence or live factual certainty**. Without that explicit policy, the old scorer would accept all 100 POIs but leave every numeric matchScore null.

| Pilot gate                                     |                Result |
| ---------------------------------------------- | --------------------: |
| Admitted Canonical POIs / active Master Codes  |             100 / 100 |
| Feature43 dimensions per POI                   |               43 / 43 |
| Field evaluation rows / duplicate / missing    |         4,300 / 0 / 0 |
| Aggregate POI results / recomputation failures |               100 / 0 |
| Entirely not-applicable cells for this input   |                 2,000 |
| matchScore min / median / mean / max           |  57 / 66 / 65.82 / 72 |
| matchScore bins 50–59 / 60–69 / 70–79          |           5 / 77 / 18 |
| Coverage and policy scoring confidence         | 100/100 at 1.000 each |

Every [cell row](../qa/TASK-084/real-pilot100/feature43-match-matrix.jsonl) identifies POI, Master Code, feature code/name/value, all participating component signals, source, weight, normalized/weighted/coverage contributions, confidence basis, reason codes and ordered trace. A field unused by a component is explicitly `not_applicable`; dayFit and routeFit are not inferred. The [100 aggregate rows](../qa/TASK-084/real-pilot100/poi-match-results.jsonl) carry all component envelopes, hard gate, positive/negative reasons and a trace recomputed from underlying cells. [Coverage](../qa/TASK-084/real-pilot100/coverage-summary.json), [component counts](../qa/TASK-084/real-pilot100/component-summary.json), [Pilot membership](../qa/TASK-084/real-pilot100/pilot-pois.v1.json) and [replay hashes](../qa/TASK-084/real-pilot100/deterministic-replay.json) are machine-readable. Repeat generation and `--check` are byte-stable.

[Top 10 / Top 20 / Bottom 10](../qa/TASK-084/real-pilot100/ranking-smoke.json) are labeled `DETERMINISTIC_PILOT_SMOKE`, with `qualityValidated=false`. There is no pairwise gold set, multi-input robustness, actual-user preference, weather, schedule or route observation here. PR #437 remains reference only; it is not a prerequisite to the user-approved TASK-088 trusted baseline. WBS 7.9 stays **待审查** until the runtime/Pilot PR is reviewed and any separate recommendation-quality gate is defined and passed.

## Current validation receipt

Pilot replay tests check exact membership, 4,300 unique cells, source-value equality, recomputation, policy provenance, byte-stable files, candidate rejection and hard-closure rejection. The updated TASK-084 scoring suite passes 30/30; TASK-088 trusted-baseline suite passes 6/6. Full Node regression passes **2,812/2,812**, including Preference, Planning, Canonical POI, Edge and governance tests. Lint passes with 0 errors and 10 pre-existing warnings; typecheck, production build, repository formatting, changed-document formatting and `git diff --check` pass. Local deployment validation, standalone build and artifact verification pass with 1,908 files. Production deployment validation correctly reports unavailable production environment/credentials on this machine and is not a deployment authorization.

TASK-084-B transport Python regression: N02 4/4 passes; Phase 2 runs 8/9 with one existing Windows byte-hash replay failure (`test_master_resume_selected_rebuild_corruption_and_batch_limit`). Transport test, scripts and data are unchanged relative to merged develop. `qa:poi-edge-pilot --check` also fails against its preexisting checked-in `BLOCKED_NO_ADMITTED_CANONICAL_POI` artifacts: its generator now sees the 100 Canonical POIs. Neither unrelated artifact set was rewritten in TASK-084. The regular Edge tests in the full Node suite pass.

The current PR head must receive a new exact-head GitHub Quality Gate after push. Old #487/#492 runs are historical only. PR remains Draft; no merge or auto-merge is authorized.
