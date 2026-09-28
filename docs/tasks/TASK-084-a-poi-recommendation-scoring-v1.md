# TASK-084-A — WBS 7.9 Recommendation Scoring v1 / Real POI Matching Pilot

> Issue: #450  
> Owner: A — Recommendation / Planner Integration  
> Priority: P0  
> WBS: 7.9 — 推荐打分 v1  
> Publication branch: `task/a-task-084-poi-recommendation-scoring-v1`  
> Publication baseline: `develop@511508c9a59c3b94c7d72cedbf5ff559da69ded8`  
> Canonical prerequisites: WBS 5.14 completed; WBS 7.4 completed  
> Real-runtime prerequisite: TASK-083-A / PR #444  
> Real-Feature43 prerequisite: TASK-081-B / PR #437 after TASK-083-A acceptance  
> No automatic merge.

## 1. Goal

Implement the first production-grade, deterministic, versioned and explainable POI recommendation scoring engine for TravelAssist.

The engine must implement the already accepted architecture instead of creating another scoring model:

```text
LongTermPreferenceReadV1 (23 canonical long-term keys)
+ Trip Preference Snapshot / Trip Override
+ Party / Schedule / Weather / Season Context
+ Hard Constraints
        ↓
Preference / Context Adapter
        ↓
EffectivePreferenceV1 / scoring inputs
        ↓
Constraint Gate
        ↓
POI 43D Feature Matching
        ↓
matchScore + coverage + confidence + breakdown
        ↓
partyFit / seasonFit / weatherFit / dayFit
        ↓
routeFit (separate input)
        ↓
Candidate / Planner Ranking (downstream; not duplicated here)
```

The Task has two deliverable layers:

1. **Scoring Runtime** — may be implemented immediately on latest `develop`.
2. **Real 100-POI Matching Pilot** — may run only when the real Canonical POI sample and its real canonical Feature43 values are legitimately available.

## 2. Authoritative design sources

Read and reuse, in this order:

1. `docs/architecture/poi-scoring-spec-v0.2.md`
2. `docs/architecture/poi-scoring-spec-v0.1.md` only for sections not superseded by v0.2
3. `docs/architecture/poi-feature-preference-codebook-v0.1.md`
4. `docs/architecture/planner-preference-contract-v1.md`
5. `docs/architecture/preference-schema-v1.md`
6. `docs/design/planner-decision-candidate-ranking-tradeoff-explanation-model.md`
7. `docs/design/candidate-retrieval-query-planning-geo-search-poi-prefilter-model.md`
8. `docs/design/route-transport-graph-edge-cost-reliability-model.md`
9. existing shared Planning / Preference contracts and Canonical POI runtime code.

Do not duplicate the 43 feature registry, Preference registry, Canonical POI schema, Planner Candidate model or Route model.

## 3. Current state / prerequisite semantics

WBS-level prerequisites for 7.9 are already satisfied:

- 5.14 Planner-readable Preference Contract = completed.
- 7.4 Canonical POI Schema = completed.

However the real-data Pilot has two additional runtime gates:

### Gate A — real Canonical POI inventory

TASK-083-A / PR #444 currently owns the first exactly 100 real admitted Canonical POIs and runtime import authorization.

At Task publication, PR #444 is Draft/Open and must not be treated as merged merely because its branch contains 100 ADMIT records.

### Gate B — real Feature43 coverage

TASK-081-B / PR #437 owns the real 100 × 43 = 4,300 Feature43 evaluation after TASK-083-A is accepted.

At Task publication, PR #437 is BLOCKED and has assessed 0/4,300 cells.

Therefore:

- scoring runtime implementation may start immediately;
- real 100-POI benchmark must fail closed / report BLOCKED until both gates are legitimately satisfied;
- do not import candidate-only workbook Feature43 values into production scoring merely to unblock this Task.

## 4. Core semantic boundaries

Freeze and test these distinctions:

```text
POI Preference Match
≠ Visit Load
≠ Day Fatigue
≠ Route Load
≠ Planner Candidate Rank
```

### matchScore

Answers:

> How well does the POI itself match the user's soft preferences?

### Visit Load / dayFit

Uses actual Visit Mode, planned duration, fixed/variable onsite load, current accumulated fatigue, recovery and route load.

### routeFit

Uses Canonical Route facts. It must not infer transit time from POI 43D features.

### Planner Candidate Ranking

Consumes match/fit/route/load components later. WBS 7.9 must not collapse the entire itinerary optimizer into one POI score.

## 5. Phase 0 — repository audit and single-source proof

Before coding:

1. sync latest `origin/develop`;
2. record exact base SHA;
3. locate all existing Feature43 registries/types/functions;
4. locate current `EffectivePreferenceV1`, `SparsePreferenceV1`, Canonical POI feature representation and Preference read contract;
5. prove there is one authoritative FeatureCode registry;
6. prove there is one authoritative long-term Preference registry;
7. identify any existing score helpers before adding new code;
8. inspect TASK-083-A / #444 and TASK-081-B / #437 current state;
9. write a preflight artifact with real-pilot gate status.

If a stronger accepted scoring implementation has landed since publication, extend it rather than creating a competing module.

## 6. Phase 1 — Preference-to-scoring adapter

The 23 long-term Preference keys are **not** a second 43D user vector.

Implement an explicit, versioned adapter that classifies every canonical Preference key into exactly one or more of:

```text
A. POI_43D_INPUT
B. PLANNER_WEIGHT_INPUT
C. ROUTE_HARD_CONSTRAINT
D. ROUTE_SOFT_INPUT
E. COST_INPUT
F. DURATION_OR_PACE_INPUT
G. NOT_USED_BY_POI_SCORING_V1
```

Publish a machine-readable mapping matrix and a human-readable design table.

### Mandatory examples

- `mobility.walkingTolerance` → POI cost tolerance input for feature 25 walking and runtime fatigue/planning context.
- `mobility.fewerTransfers` → route/planner input; do not fake it as a POI 43D attraction feature.
- `mobility.noPublicTransit/noBus/noFerry=true` → hard route constraints; never soft-score them away.
- `interests.preferences` / `interests.details` → supported 43D interest signals through an explicit mapping registry.
- `style.discovery` may influence iconic/local/hidden trade-off only through an explicit versioned mapping/weight policy.
- `style.pace` / `style.depth` primarily influence schedule/duration policy and must not be forced into unrelated POI feature codes.
- accommodation-only and budget-only fields must not be silently mapped to arbitrary POI 43D values.

### Mapping rules

- no LLM-generated mapping at runtime;
- no hidden magic numbers in UI or prompt text;
- all mapping parameters live in a versioned config/registry;
- every output signal includes provenance:
  - `long_term`
  - `trip_snapshot`
  - `trip_override`
  - `party_context`
  - `product_default`;
- Trip Override > Trip Snapshot > Product Default, per accepted Preference state semantics;
- missing long-term preference is not the same as explicit neutral;
- if an engine-effective default 5 is materialized, record its provenance as default; do not rewrite user storage.

## 7. Phase 2 — scoring kernel

Implement the accepted function families.

### 7.1 Benefit

For benefit and preference-driven suitability:

```text
p ∈ 1..9
q = (p - 5) / 4

f ∈ 0..9
x = f / 9

contribution = q × x
```

### 7.2 Context-driven suitability

For context-derived signals:

```text
strength s ∈ [0,1]
x = f / 9
contribution = s × (2x - 1)
```

Hard needs still execute before soft suitability scoring.

### 7.3 Cost

For walking / physical burden:

```text
t = (p - 1) / 8
b = f / 9
penalty = max(0, b - t)^γ
contribution = -penalty
```

High tolerance reduces penalty; it must not reward unnecessary burden.

### 7.4 Risk

For crowd / queue tolerance:

```text
t = (p - 1) / 8
r = f / 9
penalty = max(0, r - t)^γ
contribution = -penalty
```

High tolerance must not reward crowding/queue.

Runtime `weather_sensitive` must be combined with actual weather severity, not treated as a static attraction dislike.

### 7.5 γ and weights

Do not hardcode untraceable values.

Create a versioned Scoring Config containing:

- `configVersion`
- per-feature weights
- γ values by applicable function family
- context component weights if aggregation is implemented
- coverage policy
- score mapping policy.

Initial parameters may use conservative explicit defaults for deterministic tests, but must be labeled `pilot/calibration candidate`, not empirical truth.

## 8. Phase 3 — Hard Constraint Gate

Soft score cannot rescue an invalid candidate.

Support:

```text
PASS
REJECT
NEEDS_FACT
```

At minimum cover:

- required wheelchair/stroller accessibility when treated as a hard Trip need;
- explicit route mode bans supplied through Planner/Route constraint input;
- closed / unavailable schedule facts when the scorer is invoked with schedule feasibility context;
- critical required facts that are unknown.

Do not duplicate the full Planner Validator. Reuse or adapt existing hard-constraint interfaces.

## 9. Phase 4 — unknown / confidence / coverage

Freeze:

```text
0 ≠ null
null ≠ 5
```

For non-critical unknown Feature43 values:

- no fabricated positive contribution;
- no fabricated negative contribution;
- exclude unknown from known contribution;
- reduce evidence coverage.

Implement accepted coverage-aware aggregation:

```text
knownRaw =
Σ(w_i × κ_i × c_i) / Σ(w_i × κ_i)

coverage =
Σ(w_i × κ_i) / Σ(requested w_i)

adjustedRaw =
coverage × knownRaw

score =
round(99 × (adjustedRaw + 1) / 2)
```

Clamp score to `0..99`.

If the accepted implementation refines this formula, keep the same semantic requirement: low evidence coverage shrinks toward neutral rather than inflating a sparse perfect signal.

## 10. Phase 5 — Score Envelope / breakdown

Do not return a naked number.

Minimum result:

```ts
type ScoreResultV1 = {
  value: number;       // 0..99
  coverage: number;    // 0..1
  confidence: number;  // 0..1
  status:
    | "scored"
    | "neutral_default"
    | "not_applicable"
    | "blocked"
    | "needs_fact";
  configVersion: string;
  mappingVersion: string;
  breakdown: ScoreBreakdownItemV1[];
}
```

Each breakdown item must make the score recomputable and include at least:

- featureCode / key / kind;
- feature value;
- feature confidence;
- preference/context value;
- signal source;
- function kind;
- contribution;
- weight;
- weighted contribution;
- provenance ref where available.

## 11. Phase 6 — explanation reasons

Derive stable reason codes from structured breakdown, not from LLM invention.

At minimum support:

```text
PREF_STRONG_MATCH
PREF_DISLIKE_CONFLICT
LOW_WALKING_BURDEN
WALKING_OVER_TOLERANCE
LOW_CROWD_RISK
CROWD_OVER_TOLERANCE
PARTY_FIT_HIGH
PARTY_FIT_LOW
SEASON_FIT_HIGH
WEATHER_FIT_LOW
TIME_SLOT_FIT_HIGH
REST_VALUE_HIGH
LOW_DATA_COVERAGE
```

Reasons must carry evidence sufficient for deterministic template rendering.

AI may later phrase reasons in natural language, but cannot manufacture a reason unsupported by the score trace.

## 12. Phase 7 — deterministic contract test suite

Create comprehensive fixtures before the real Pilot.

At minimum test:

1. benefit p=9/f=9 => strong positive;
2. benefit p=1/f=9 => strong negative;
3. benefit p=1/f=0 => neutral, not reward;
4. benefit p=5 => zero personalized contribution;
5. cost below tolerance => no penalty;
6. cost above tolerance => penalty;
7. high risk tolerance => reduced/zero penalty, not reward;
8. null feature => coverage loss, not zero;
9. hard constraint violation => reject before scoring;
10. critical unknown => needs_fact;
11. context suitability direction;
12. weather_sensitive only penalizes under relevant adverse weather;
13. group hard need cannot be averaged away;
14. group cost/risk protects most affected member when group logic is used;
15. live fact replaces baseline prior rather than double counts;
16. low coverage shrinks toward neutral;
17. same input + config/mapping versions => byte-stable deterministic result;
18. score breakdown recomputes the result;
19. user dislike is a soft negative unless the Preference contract says hard;
20. no route minutes / fares / transfers are invented from POI feature values;
21. walking feature is not directly reused as visit/day fatigue;
22. Trip Override beats long-term/default source;
23. unsupported long-term keys are not secretly mapped into 43D;
24. all 43 FeatureCodes have exactly one FeatureKind.

## 13. Phase 8 — fixed benchmark personas

Publish versioned benchmark personas as **test fixtures**, not saved user records.

Use at least these strategy families:

1. `first_visit_classic`
   - strong history/culture + photography
   - lower discovery / stronger iconic preference
   - standard walking/crowd tolerance

2. `nature_photo_low_crowd`
   - nature/scenery + photography
   - low crowd tolerance
   - standard walking tolerance

3. `low_walking_relaxed`
   - very low/low walking tolerance
   - relax/wellness interests
   - lower intensity profile

4. `hidden_local_explorer`
   - high discovery
   - rural/traditional/local-oriented interests
   - accepts moderate walking

5. `art_culture`
   - art/museums + history/culture
   - educational/depth-oriented signals when supported

6. `family_day`
   - family activity interest
   - explicit Party Context fixture with child; stroller hard/soft condition only when supplied by test context

7. `onsen_recovery`
   - onsen/wellness
   - relax/rest-oriented profile

8. `night_urban_photo`
   - night experience + photography + urban exploration
   - night schedule context

The fixture definitions must use the canonical Preference schema and mapping adapter wherever possible; do not manually type arbitrary 43D vectors and call them user preferences.

## 14. Phase 9 — real 100-POI Pilot gate

Before the real Pilot, re-check repository state.

### Required hard gates

All must be true:

1. TASK-083-A accepted and its Canonical Pilot-100 runtime dataset is present on the execution base or a later accepted equivalent exists.
2. Exactly 100 real Canonical POIs are available through the authorized runtime boundary.
3. Real canonical Feature43 values for the Pilot sample exist through an accepted source.
4. Those Feature43 values preserve unknown/null and confidence/provenance semantics.
5. No candidate-only workbook or PR-only unaccepted data is being substituted.
6. The sample is deterministic and references stable canonical `poi:*` IDs.

If any gate is false:

- runtime implementation may still complete;
- real Pilot status must be `BLOCKED_REAL_PILOT`;
- record the exact blocker and stop the real-data phase;
- do not relabel fixture results as real Pilot results.

## 15. Phase 10 — real 100-POI benchmark

When gates pass, score the same 100 canonical POIs under all fixed benchmark personas.

Required outputs for every persona:

- all eligible POI scores;
- coverage/confidence;
- top 20 ranked POIs;
- bottom / conflict examples where meaningful;
- reason codes and top positive/negative contributions;
- blocked / needs_fact counts;
- deterministic hash of input + config + mapping + results.

Required aggregate analysis:

- top-10 overlap/Jaccard between personas;
- rank correlation where meaningful;
- how low walking / crowd tolerance changes ranking;
- how classic vs hidden/local preference changes ranking;
- how low-coverage POIs behave;
- distribution of match scores;
- distribution of coverage/confidence;
- number of ties / near-ties;
- reason-code frequency;
- no single Feature dominates outside configured/expected cases.

## 16. Phase 11 — pairwise calibration set

Build a small deterministic, auditable pairwise benchmark from the real sample.

Target at least 30 cases when data allows:

```text
(persona, POI_A, POI_B, expected_direction_or_tradeoff, evidence)
```

Do not use an LLM as the sole gold-label source.

Expected direction should be based on explicit fixture priorities + Feature43 facts, for example:

- photography-heavy persona: POI with clearly higher photo score should improve, all else controlled/recorded;
- low-walking persona: high walking burden should receive stronger penalty than comparable low-burden POI;
- low-crowd persona: high crowd risk should lose relative utility;
- strong dislike signal: POI strongly exhibiting the disliked benefit should receive a negative contribution;
- unknown-heavy POI should not beat a well-evidenced comparable POI solely due sparse perfect values.

Cases that are genuine trade-offs may be labeled `NO_STRICT_WINNER`; do not invent a false gold ordering.

## 17. Phase 12 — calibration policy

This Task may tune v1 parameters only through explicit version changes.

Every parameter change must record:

- previous config version;
- new config version;
- exact changed parameters;
- benchmark delta;
- regression results;
- reason for change.

Do not optimize only for one persona or one famous POI.

Do not train on the same pairwise set and then claim that set as independent validation. If tuning is performed, split deterministic calibration/validation subsets.

## 18. Runtime/API boundary

WBS 7.9 should expose a reusable service/library boundary consumed by Search/Planner/AI, not a UI-only calculation.

Prefer:

```text
shared pure scoring kernel
+ server adapter for canonical POI/preference/context retrieval
+ stable result contract
```

Do not put provider secrets, cookies, owner IDs or raw DB records in score results.

Do not create a second POI Detail API or Search API.

If an API endpoint is not already required by accepted architecture, keep this Task at service boundary and let Search/Planner call it internally.

## 19. Performance

The scorer must be cheap enough for Candidate Retrieval's deep-score tier.

Benchmark at least:

- one POI / one persona;
- 100 POIs / one persona;
- 100 POIs / all benchmark personas;
- deterministic repeated run.

Record p50/p95 or an equivalent reproducible local benchmark.

Do not use external LLM/API calls inside the scoring hot path.

## 20. Observability / versioning

Every production score must bind:

- Feature/data revision;
- Preference snapshot/override revision where available;
- mapping version;
- scoring config version;
- context version/snapshot refs where applicable;
- generated timestamp only where accepted contract requires it.

Benchmark replay must be possible from recorded input versions.

## 21. Required artifacts

Create at minimum:

- `docs/tasks/RESULT-TASK-084-a-poi-recommendation-scoring-v1.md`
- `docs/qa/TASK-084/README.md`
- `docs/qa/TASK-084/preflight.json`
- `docs/qa/TASK-084/preference-43d-mapping.json`
- `docs/qa/TASK-084/scoring-config.json`
- `docs/qa/TASK-084/benchmark-personas.json`
- `docs/qa/TASK-084/contract-test-summary.json`
- real Pilot artifacts only when the real-data gates pass.

Suggested real Pilot artifacts:

- `docs/qa/TASK-084/real-pilot-input-manifest.json`
- `docs/qa/TASK-084/real-pilot-scores.jsonl`
- `docs/qa/TASK-084/real-pilot-summary.json`
- `docs/qa/TASK-084/pairwise-benchmark.jsonl`

Large generated artifacts should follow repository data/QA size conventions; do not bloat source files when a summarized audited artifact is sufficient.

## 22. Acceptance gates — runtime

Runtime may reach `PASS_RUNTIME` only when:

- no duplicate Feature registry exists;
- 23-key Preference boundary is respected;
- mapping categories are explicit/versioned;
- hard constraints execute before soft score;
- benefit/suitability/cost/risk semantics match accepted spec;
- null/0/5 semantics are preserved;
- coverage/confidence are preserved;
- breakdown is recomputable;
- reasons derive from evidence;
- score is deterministic for identical versioned inputs;
- no LLM in the scoring hot path;
- route/day/fatigue/planner ranking are not collapsed into matchScore;
- targeted + full relevant regressions pass.

## 23. Acceptance gates — real Pilot

Real Pilot may reach `PASS_REAL_PILOT` only when:

- real canonical dataset gate passes;
- real Feature43 gate passes;
- 100/100 sample identity is canonical;
- all benchmark personas execute;
- results are deterministic;
- ranking reacts directionally to controlled preference changes;
- low coverage cannot inflate sparse records to top rank without evidence;
- pairwise benchmark and explanation evidence pass;
- no candidate-only data was promoted;
- all artifacts identify exact config/mapping/data revisions.

If runtime passes but real data is still unavailable, Result must be:

```text
PARTIAL
PASS_RUNTIME
BLOCKED_REAL_PILOT
```

That is a valid truthful outcome; do not weaken the real-data gate.

## 24. Required QA / regression

At minimum run:

- new scoring unit/contract tests;
- Preference shared-contract tests;
- Planning Feature43 contract tests;
- Canonical POI schema/runtime tests;
- Candidate Admission tests;
- POI Detail/Search tests if present on execution base;
- Planner ranking/validator tests affected by shared contracts;
- full repository Node test suite;
- lint;
- typecheck;
- build;
- deployment validation/build/artifact verification where repository standard requires;
- format/diff checks;
- exact-head GitHub Quality Gate before acceptance.

Record pre-existing failures separately; do not hide new regressions behind baseline debt.

## 25. WBS / Result lifecycle

WBS 7.9 lifecycle:

- Task published only → remain `未开始 / Task 已发布` or repository-equivalent tracking text.
- implementation starts → `进行中`.
- runtime implementation + QA + Draft PR → `待审查` with real Pilot state stated separately.
- only user acceptance + merge → `已完成`.

Do not mark WBS 7.9 completed when only fixtures pass and the Task still claims a required real Pilot that is blocked.

## 26. Hard prohibitions

- no automatic merge;
- no force push;
- no LLM-generated runtime scoring weights;
- no second Feature43 registry;
- no second Preference schema;
- no candidate/workbook rows relabeled as Canonical;
- no unknown → 0 or unknown → 5 coercion;
- no using POI walking feature as actual route walk time;
- no using POI walking/physical summary as fixed Visit fatigue independent of duration/mode;
- no double-counting live facts and baseline priors;
- no hard constraint overridden by a high soft score;
- no hidden preference mapping;
- no fabricated "99" scores from sparse evidence;
- no merging TASK-083-A, TASK-081-B or this Task without explicit authorization.

## 27. Definition of success

The Task is successful when TravelAssist can answer, deterministically and audibly:

> "For this versioned user/trip preference and this versioned real POI fact set, why did this POI receive this match score?"

and, after the real Pilot gates are satisfied:

> "Why do different traveler profiles rank the same 100 real POIs differently, and can every major ranking change be traced to explicit preference/fact evidence?"
