# TASK-090-A — Canonical 100 POI Recommendation Match Quality Calibration

- Issue: #461
- Owner: A
- WBS: 7.9.1
- Priority: P0
- Base: latest `develop`
- Execution branch: `feature/a-recommendation-quality-calibration`
- Depends on:
  - TASK-083-A Canonical Pilot-100
  - TASK-088-A trusted Feature43 baseline
  - TASK-084-A Recommendation Scoring v1 / PR #451 merged
- Auto-merge: No

## 1. Objective

Validate and calibrate whether the merged Recommendation Scoring v1 behaves correctly when real product Preference and Context inputs change.

The previous TASK-084-A proved:

- 100 admitted Canonical POIs;
- 100/100 with 43/43 trusted Feature43 baseline;
- 4,300 deterministic POI-feature trace rows;
- 100 deterministic aggregate score rows;
- score recomputation and runtime integrity.

TASK-090-A is not another “can it calculate?” task.

It asks:

```text
when the user changes a preference,
do the right POIs move in the right direction,
by a reasonable amount,
without unrelated dimensions moving unexpectedly?
```

## 2. Calibration scope

Use the fixed Canonical Pilot-100 only.

Do not expand POI membership.

Use current production-candidate Preference and Feature43 contracts.

Do not create an 8-persona or arbitrary persona benchmark.

Use controlled, deterministic probes over actual supported user inputs.

## 3. Probe model

Each probe compares two or more states while keeping all unrelated inputs frozen.

Primary rule:

```text
one factor at a time
```

A probe must identify:

- input field / context field;
- state A;
- state B;
- expected affected Feature43 codes;
- expected direction;
- expected unaffected dimensions/components;
- score/rank delta output.

## 4. Required Preference probes

At minimum cover every current preference input that affects POI recommendation scoring.

### 4.1 Interest preference direction

For each supported interest code, test:

```text
dislike
→ neutral / absent baseline
→ like
```

Current interest families include:

- nature_scenery
- history_culture
- food
- photography
- onsen_wellness
- art_museums
- anime_entertainment
- shopping
- urban_exploration
- outdoor_activity
- night_experience
- family_activity
- traditional_experience
- theme_parks
- rural_towns
- seasonal_events

For each, freeze all other interest inputs.

### 4.2 Interest details

Where details map to independent Feature43 dimensions, test those detail signals separately.

Examples currently include:

- photography.nightscape
- photography.architecture
- outdoor_activity.skiing
- seasonal_events.cherry_blossom
- seasonal_events.autumn_leaves
- seasonal_events.snow_scenery
- family_activity.science_museum
- art_museums.architecture

Only use detail codes that exist in the current contract.

### 4.3 Walking tolerance

Test at minimum:

```text
veryLow
low
medium/default
high
veryHigh
```

or the exact current enum.

Expected:

- high walking burden POIs should be penalized more for low tolerance;
- low walking burden POIs should not be penalized in the same direction;
- monotonicity should hold unless a documented other signal offsets it.

### 4.4 Queue tolerance

Test current queue tolerance levels.

Expected:

- higher queue-risk baseline should hurt low-tolerance inputs more.

### 4.5 Discovery style

Test the actual discovery input across:

- iconic orientation
- balanced
- hidden/local orientation

Expected movement must align with Feature43:

- iconic
- hidden
- local

No named-POI special cases.

## 5. Required Context probes

Contextual fits must be tested independently from static matchScore.

### 5.1 Party / family

Where supported:

- no party-specific context
- family context
- senior/accessibility-relevant context where contract supports it

Expected output:

- partyFit changes;
- static matchScore must not silently absorb unrelated party context unless the contract explicitly maps it.

### 5.2 Season

Test supported season contexts:

- spring
- summer
- autumn
- winter

Verify Feature43 seasonal dimensions:

- 40 spring
- 41 summer
- 42 autumn
- 43 winter

### 5.3 Weather

Test representative weather contexts supported by contract:

- clear / neutral
- rain
- heat
- cold
- snow

Do not invent real current weather.

These are deterministic calibration contexts.

Expected:

- weatherFit changes;
- weather-sensitive POIs move appropriately;
- static baseline remains unchanged.

### 5.4 Time slot

Test supported:

- morning
- daytime
- sunrise
- sunset

or exact current time-slot contract.

### 5.5 Rest / fatigue context

If supported by current scoring contract, test needs-rest strength.

Expected:

- restFit changes only through supported inputs.

## 6. Hard-constraint probes

At minimum validate:

- wheelchair requirement
- stroller requirement
- no public transit
- no bus
- no ferry
- critical fact unknown
- schedule/opening requirement where the current scorer supports it

Hard constraint failures must:

```text
REJECT
or
NEEDS_FACT
```

before soft ranking.

They must never be averaged away by a high matchScore.

## 7. Score sensitivity outputs

For every probe and POI output:

```ts
type CalibrationObservation = {
  probeId: string;
  poiId: string;
  masterCode: string;

  stateA: {
    matchScore: number | null;
    componentScores: Record<string, number | null>;
    rank: number | null;
  };

  stateB: {
    matchScore: number | null;
    componentScores: Record<string, number | null>;
    rank: number | null;
  };

  delta: {
    matchScore: number | null;
    rank: number | null;
  };

  expectedFeatureCodes: string[];
  observedFeatureContributionDelta: Array<{
    featureCode: string;
    before: number | null;
    after: number | null;
    delta: number | null;
  }>;

  directionCheck:
    | "PASS"
    | "COUNTER_DIRECTION"
    | "NO_EFFECT"
    | "NOT_APPLICABLE"
    | "BLOCKED";
};
```

Field names may follow repository conventions.

## 8. Monotonicity / directional metrics

For each probe calculate at least:

- POIs with expected positive movement;
- POIs with expected negative movement;
- no-effect count;
- counter-direction count;
- rank-up / rank-down distribution;
- mean / median score delta;
- max absolute delta;
- expected-feature-value vs score-delta correlation;
- top/bottom quartile separation;
- monotonicity pass rate.

For ordinal preferences with >2 levels:

```text
low → medium → high
```

verify monotonic progression where the same dimension dominates.

Do not require every POI to move if its relevant feature value is neutral or zero.

## 9. Counterintuitive movement ledger

Every unexpected result must be machine-readable.

Examples:

- high history score decreases when history preference becomes stronger;
- low walking burden gets penalized more than high walking burden;
- unrelated shopping preference changes seasonFit;
- hard constraint still ranks a rejected POI.

For each anomaly report:

- probe;
- POI;
- expected direction;
- actual direction;
- responsible trace components;
- whether behavior is:
  - expected interaction
  - config issue
  - mapping issue
  - data issue
  - scorer bug
  - needs review

No silent exception lists.

## 10. Pairwise anchor checks

Create a small deterministic anchor set from Feature43 data itself.

Do not select anchors based on desired ranking outcome.

Examples:

For history probe:

- choose high-history POIs from top Feature43 history quantile;
- choose low-history POIs from bottom quantile.

For nature probe:

- same strategy using nature/scenery.

For walking:

- compare high vs low walking burden groups.

Check that preference changes increase separation in the intended direction.

The anchor set must be derived deterministically from the Pilot-100 data.

## 11. Calibration config changes

If current config produces material counter-direction or weak-sensitivity behavior:

1. capture pre-change baseline output;
2. change only centralized versioned scoring config/mapping;
3. bump config version;
4. rerun the full calibration suite;
5. publish before/after metrics.

Do not:

- patch named POIs;
- add POI-specific bonuses;
- tune to Top-10 names;
- modify trusted Feature43 values merely to improve rankings.

Data issues and scoring issues must remain separate.

## 12. Acceptance thresholds

Freeze explicit thresholds in the Result before declaring PASS.

Suggested starting gates:

### Directional probes

For POIs where the relevant Feature43 value is materially above/below neutral:

- expected-direction rate >= 95%
- counter-direction rate <= 2%
- remaining cases must be explainable interactions or blocked/not-applicable

### Hard constraints

- 100% correct REJECT / NEEDS_FACT semantics
- zero soft-score override

### Determinism

- repeated runs byte-stable
- same config/input/data revisions → identical outputs

### Traceability

- 100% score/rank deltas traceable to explicit changed signals
- no unexplained component changes

If a threshold is inappropriate for a specific probe, the Result must explain and freeze a justified alternative before final PASS.

## 13. Ranking interpretation

This Task may compare ranking changes.

It must not claim:

```text
this is the objectively best POI ranking
```

without human/gold-set evidence.

The quality conclusion allowed here is:

```text
the scoring engine responds to product inputs
in the intended, deterministic, explainable direction
```

This is behavior calibration, not universal taste validation.

## 14. Required machine-readable outputs

Suggested:

```text
docs/qa/TASK-090-A/
  probe-catalog.json
  probe-inputs.jsonl
  score-observations.jsonl
  rank-deltas.jsonl
  monotonicity-summary.json
  pairwise-anchor-checks.json
  hard-constraint-checks.json
  anomaly-ledger.jsonl
  config-before.json
  config-after.json
  calibration-summary.json
  deterministic-replay.json
```

If no config change is required, config-before/after may be identical with an explicit no-change decision.

## 15. Tests

Add automated tests for:

- every probe catalog entry;
- directional expectations;
- monotonic ordinal preferences;
- unrelated component isolation;
- hard constraints;
- deterministic anchor derivation;
- no named-POI patching;
- score/rank delta recomputation;
- anomaly ledger completeness;
- config version/hash binding;
- deterministic replay.

Run:

```text
TASK-090 targeted tests
TASK-084 scoring tests
TASK-088 trusted baseline tests
Canonical POI tests
Preference tests
Planning tests
Edge tests
Transport-related regression where applicable
governance tests
full Node regression
lint
typecheck
build
deployment validate/build/artifact
format
git diff --check
```

## 16. WBS

Start:

```text
7.9.1 = 进行中
```

Draft review:

```text
7.9.1 = 待审查
```

After user acceptance and merge:

```text
7.9.1 = 已完成
```

WBS 7.9 Recommendation Scoring v1 Runtime is considered implemented after PR #451 merge.

TASK-090-A validates and calibrates behavior quality separately.

## 17. Deliverables

- `docs/tasks/TASK-090-a-recommendation-match-quality-calibration.md`
- `docs/tasks/RESULT-TASK-090-a-recommendation-match-quality-calibration.md`
- `docs/qa/TASK-090-A/`
- calibration runner
- tests
- any versioned config update with before/after evidence
- WBS update

Draft PR only.

No auto-merge.
