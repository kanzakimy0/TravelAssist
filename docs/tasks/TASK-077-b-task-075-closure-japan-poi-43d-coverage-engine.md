# TASK-077-B — TASK-075-B Closure + Japan POI 43D Coverage Engine / Core Coverage Pass

## 0. Authorization

User authorizes B to:

1. close the scope ambiguity left by TASK-075-B without reopening its already-passed resolver / identity execution;
2. preserve TASK-075-B as COMPLETE for identity resolution, field-level evidence audit, canonical reconciliation, and exact-head QA;
3. explicitly record that TASK-075-B COMPLETE does **not** mean that every POI has 43 numeric values;
4. immediately build and execute a new evidence-backed Fact -> Rule -> 43D coverage engine;
5. run a representative 200-POI Canary;
6. if the Canary passes, continue unattended across the current 2,519 scored/core POIs in batches of at most 200;
7. create the next full-population gap queue for the remaining accepted POIs.

No per-batch user confirmation is required.

This task must not fabricate values in order to satisfy a coverage target.

---

## 1. Tracking

- Task: TASK-077-B
- Issue: #424
- Repository: `kanzakimy0/TravelAssist`
- Task branch: `task/b-task-077-japan-poi-43d-coverage-engine`
- Execution branch: `codex/b-task-077-japan-poi-43d-coverage-engine`
- Upstream task: TASK-075-B / Issue #416
- Upstream Draft PR: #423
- Upstream execution branch: `codex/b-task-075-japan-poi-entity-resolver-43d-completion`
- Authoritative upstream head at task publication: `d706534dbfd3aa77d2857f3c214f66a8a84d07c3`
- Upstream exact-head Quality Gate run: `35731940622` — SUCCESS

While PR #423 remains unmerged, the TASK-077-B Draft PR must target:

`codex/b-task-075-japan-poi-entity-resolver-43d-completion`

Do not auto-merge.

---

## 2. Authoritative TASK-075-B baseline

TASK-075-B is the authoritative identity/evidence baseline.

Final accepted upstream facts:

- total candidate population: **10,369**
- current scored POIs: **2,519**
- final residual identity adjudication: **5,920 / 5,920**
- point/candidate enrichment identities: **5,915**
- area/district entities: **5**
- hard-conflict rows: **0**
- exact 43D field decisions: **445,867 = 10,369 × 43**
- non-null 43D before TASK-075 semantic write-through: **6,209**
- non-null 43D after TASK-075: **6,385**
- TASK-075 additions: **176**
- remaining null fields: **439,482**
- POIs with 43/43 numeric values: **0**
- coverage bands after TASK-075:
  - 0 fields: 7,847
  - 1–9 fields: 2,507
  - 10–19 fields: 15
  - 20–29 fields: 0
  - 30–42 fields: 0
  - 43 fields: 0
- deterministic TASK-075 rebuild: PASS
- exact-current-head GitHub Quality Gate: PASS

Authoritative Result:

`docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md`

Authoritative task-scoped canonical state:

`data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/canonical-state-v2.3.jsonl`

Do not rerun the TASK-075 resolver unless TASK-077 itself introduces a demonstrated identity regression.

---

## 3. Mandatory TASK-075-B scope closeout

Before implementing new scoring behavior, append a non-destructive scope clarification to the TASK-075 Result and record the same clarification in TASK-077 QA.

The clarification must preserve all previous metrics and acceptance records and state, in substance:

> TASK-075-B COMPLETE means identity resolver / final identity adjudication / exact field-decision audit / evidence review / canonical reconciliation / deterministic QA are complete. It does not mean 10,369 POIs have 43/43 numeric values. Numeric coverage at TASK-075-B final acceptance is 6,385 populated fields out of 445,867 possible fields, with 439,482 remaining null decisions and 0 POIs at 43/43.

Required artifact:

`docs/qa/TASK-077-B/task-075-b-scope-closeout.md`

Also add a short clarification comment to PR #423 / Issue #416 if GitHub permissions are available.

Do not rewrite, delete, or supersede the prior TASK-075 audit history.

---

## 4. Frozen 43D contract

The canonical feature contract remains:

`src/shared/contracts/planning/features.ts`

Values remain:

`0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | null`

Do **not** change the 43 codes, names, kinds, or value domain in this task.

Canonical codes:

| Code | Feature | Kind |
|---|---|---|
| 01 | scenery | benefit |
| 02 | history | benefit |
| 03 | architecture | benefit |
| 04 | photo | benefit |
| 05 | food | benefit |
| 06 | shopping | benefit |
| 07 | nature | benefit |
| 08 | night | benefit |
| 09 | onsen | benefit |
| 10 | art | benefit |
| 11 | entertainment | benefit |
| 12 | local | benefit |
| 13 | unique | benefit |
| 14 | hidden | benefit |
| 15 | iconic | benefit |
| 16 | family | suitability |
| 17 | senior | suitability |
| 18 | couple | suitability |
| 19 | solo | suitability |
| 20 | relax | suitability |
| 21 | adventure | suitability |
| 22 | educational | suitability |
| 23 | interactive | suitability |
| 24 | rest | suitability |
| 25 | walking | cost |
| 26 | physical | cost |
| 27 | crowd | risk |
| 28 | queue | risk |
| 29 | wheelchair | suitability |
| 30 | stroller | suitability |
| 31 | morning | suitability |
| 32 | daytime | suitability |
| 33 | sunrise | suitability |
| 34 | sunset | suitability |
| 35 | rain | suitability |
| 36 | heat | suitability |
| 37 | cold | suitability |
| 38 | snow | suitability |
| 39 | weather_sensitive | risk |
| 40 | spring | suitability |
| 41 | summer | suitability |
| 42 | autumn | suitability |
| 43 | winter | suitability |

Required freeze artifact:

`docs/qa/TASK-077-B/43d-contract-freeze.json`

It must record the source file SHA/checksum and exact definition list.

---

## 5. Why the old TASK-075 annotation policy must not be reused as the coverage engine

The existing upstream rubric:

`data/poi/full/rubrics/candidate-feature-rubric.v1.json`

was appropriate for conservative evidence recovery and contains policies such as:

- no inference from raw page text or POI category;
- emit only explicitly reviewed fact-sheet values;
- leave null where target-specific explicit support is unavailable.

That policy successfully prevented fabrication but cannot produce useful Planner-scale coverage by itself.

TASK-077 must **not modify v1 in place**.

Create a new versioned coverage rubric:

`data/poi/full/rubrics/candidate-feature-rubric.v2.json`

v2 may infer numeric feature values only through retained structured facts plus explicit deterministic rule IDs.

The chain must be auditable:

`source -> retained fact -> normalized fact -> ruleId -> score -> confidence -> canonical feature provenance`

AI memory or category/name intuition is never a valid source.

---

## 6. Structured POI Fact layer

Create a reusable structured fact contract before new bulk scoring.

Suggested path:

`data/poi/full/schemas/poi-fact-v2.schema.json`

and a typed/runtime validation implementation in the most appropriate existing project location.

At minimum the fact model must support:

### Identity / entity
- candidateKey
- entity type
- prefecture
- municipality
- sourceRefs
- identityDisposition

### Historical / cultural
- dated origin/founding/period
- heritage/designation facts
- preserved historic fabric
- interpretation/exhibits
- architecture/design facts
- artistic collection/work facts
- local cultural practice facts

### Experience
- viewpoint / landscape
- natural feature / habitat / geology
- photography subject / vantage
- food offering
- retail offering
- evening/night experience
- onsen bathing
- entertainment/performance
- hands-on/interactive activity
- relaxation/rest characteristics

### Audience / accessibility
- explicit family facilities
- senior-relevant access/rest facts
- wheelchair accessibility
- stroller accessibility
- lifts/ramps
- unavoidable stairs
- seating/rest areas
- barrier information

### Mobility / physical
- standard route distance when supported
- steps/stair burden
- elevation / slope / terrain
- standing burden
- indoor/outdoor ratio
- recommended visit duration
- minimum/maximum useful duration when supported

### Time / weather / season
- morning/daytime suitability facts
- sunrise/sunset relevance
- rain exposure / indoor fallback
- heat exposure / shade
- cold exposure
- snow dependence/constraint
- spring/summer/autumn/winter attraction facts
- static weather sensitivity

### Crowd / queue
- retained crowd evidence
- queue/wait evidence
- reservation/capacity evidence where static and relevant

### Comparative
- defined peer set
- geographic scope
- comparative uniqueness evidence
- visibility / low-visibility evidence
- recognition / iconic evidence
- source and calibration basis

Every fact must retain:
- factId
- candidateKey
- fact type/key
- normalized value
- sourceRef
- source tier/family
- locator
- content hash or locator hash
- confidence
- extraction method
- observed/reviewed date where available

No fact may exist only because the model “knows” the attraction.

---

## 7. Source reuse first

TASK-077 must reuse existing retained evidence before initiating new web/source work.

Priority:

1. TASK-075 retained text and semantic review artifacts;
2. prior TASK-073/TASK-074 editorial/source evidence;
3. authoritative repository candidate metadata;
4. official target site;
5. government / prefecture / municipality;
6. official tourism / DMO;
7. official operator / museum / cultural-property / park / shrine / temple source;
8. verified official SNS for target-specific static facts;
9. authoritative secondary source.

Search snippets remain discovery only.

Do not redownload/reopen a source if the retained content hash and target identity remain valid and sufficient.

Fresh source acquisition should be fact-family targeted, not 43 independent searches.

---

## 8. 43D v2 derivation modes

Every non-null value emitted by TASK-077 must use exactly one derivation mode:

- `PRESERVE_SUPPORTED`
- `DIRECT_FACT_SUPPORTED`
- `RULE_INFERRED_SUPPORTED`
- `COMPARATIVE_CALIBRATED`
- `COMPUTED_STATIC_SUPPORTED`
- `SUPERSEDE_SUPPORTED`

A null must remain:

- `UNSUPPORTED_AFTER_V2_FACT_REVIEW`

or an existing contract-permitted N/A representation if already defined elsewhere; do not invent a new numeric N/A sentinel.

### 8.1 Preserve
All existing 6,385 supported values are protected by default.

A supported value may be superseded only if:
- the old and new provenance are compared;
- the new fact is target-scoped;
- the new rubric/rule is explicit;
- an explicit supersede reason is written;
- there is no silent regression.

### 8.2 Direct facts
A source may directly support the semantic presence/strength of a feature, but the numeric 0–9 mapping must still use the frozen v2 anchor/rule.

### 8.3 Rule inference
A numeric value may be inferred from multiple structured target facts.

Example pattern:

`heritage designation + dated historic fabric + interpretation -> history rule`

not:

`famous temple -> history=9`

### 8.4 Comparative features 13/14/15
`unique`, `hidden`, and `iconic` require a defined comparison set.

At minimum support:
- municipality peer set;
- prefecture peer set;
- national peer set where evidence permits;
- same-type peer set where useful.

Do not assign high/low comparative scores only because a POI is remote, famous, or unfamiliar.

The comparative artifact must record:
- peer set definition;
- population size;
- signals;
- percentile/band or other calibrated basis;
- final ruleId.

### 8.5 Zero values
Never use 0 as a missing-value replacement.

0 requires affirmative support for absence/incompatibility within the assessed scope, or a validated entity/fact rule that proves the condition.

---

## 9. Walking / physical must be duration-aware without corrupting the 43D contract

Codes 25 and 26 are canonical static baseline costs, not the final trip-day fatigue.

TASK-077 must define them relative to a standard/recommended visit.

Where evidence exists, use the existing Visit Profile fields rather than inventing a second incompatible model:

- `minimumDurationMinutes`
- `recommendedDurationMinutes`
- `maximumUsefulDurationMinutes`
- `fixedWalkingLoad`
- `variableWalkingLoad`
- `fixedPhysicalLoad`
- `variablePhysicalLoad`
- `terrainModifier`
- `standingModifier`

Canonical 43D `walking` / `physical` should represent the **reference burden at the recommended/standard visit**.

Runtime Planner fatigue for a 30-minute vs 90-minute visit must later be derived from the Visit Profile and actual itinerary duration, not by mutating the canonical POI feature score per itinerary.

Required QA note:

`docs/qa/TASK-077-B/walking-physical-duration-model.md`

---

## 10. v2 rubric requirements

`candidate-feature-rubric.v2.json` must define, per feature:

- code/key/kind
- feature semantic definition
- score anchors at minimum 0/3/5/7/9
- fact inputs
- allowed rule families
- contraindications/counterexamples
- null conditions
- confidence floor
- whether comparative calibration is required
- whether Visit Profile facts may contribute
- whether access facts may contribute
- explicit rule IDs or rule-family IDs

Rules should be deterministic and data-driven.

Do not hide score logic in free-form model prompts only.

---

## 11. Phase A — baseline and non-regression freeze

Before adding values:

1. reproduce the TASK-075 authoritative candidate view;
2. verify population = 10,369;
3. verify existing non-null = 6,385;
4. verify current field-level null count = 439,482;
5. verify all 43 feature codes match the contract;
6. compute a checksum for all existing candidateKey + featureCode + value + provenance tuples;
7. freeze candidate membership/order;
8. verify Registry/Master Code/candidateKey unchanged.

Required:

`docs/qa/TASK-077-B/baseline.json`
`docs/qa/TASK-077-B/baseline.md`

If these values do not reproduce, stop new scoring, diagnose the upstream mismatch, and repair the smallest safe layer.

---

## 12. Phase B — calibration corpus

Build a stratified calibration corpus of **at least 120 POIs** from the current scored/core population.

Use:
- 80 tuning/calibration rows;
- 40 untouched blind holdout rows.

Stratify across:
- temples/shrines;
- historic architecture;
- museums/art;
- parks/gardens;
- mountain/nature;
- observation/viewpoint;
- shopping/food districts or facilities;
- theme/entertainment;
- onsen;
- family attractions;
- area/district-like attractions where contract-compatible;
- urban and rural;
- multiple prefectures;
- different existing coverage bands.

The blind holdout must not be individually tuned.

### Calibration hard gates

- deterministic repeat: 100% identical output for same frozen inputs;
- 100% of new/superseded numeric values have source-backed facts + ruleId + provenance;
- 0 values derived from name/category alone;
- no Registry/Master Code/candidateKey changes;
- no loss of existing supported values;
- no contradiction with retained explicit facts;
- for existing supported values in the blind set, >=95% of v2 independently-derived comparable values must either preserve the old value or fall within ±1; larger differences require explicit reviewed supersede evidence and are excluded from the automatic agreement denominator;
- comparative 13/14/15 values must have peer-set artifacts;
- walking/physical must have a reference-duration basis when derived.

Required:

`docs/qa/TASK-077-B/calibration-v2.json`
`docs/qa/TASK-077-B/calibration-v2.md`
`docs/qa/TASK-077-B/calibration-holdout-differences.jsonl`

If gates fail, inspect errors, revise fact normalization/rules/calibration, and rerun automatically. Do not ask the user to tune weights.

---

## 13. Phase C — 200-POI coverage Canary

After calibration passes, select exactly **200 POIs**.

The Canary must be reproducibly stratified, not hand-picked only for easy source-rich cases.

Include:
- multiple prefectures;
- urban/rural;
- all major entity/activity families;
- existing coverage 0–9 and 10–19;
- accessibility-relevant POIs;
- indoor/outdoor;
- seasonal and non-seasonal attractions;
- high/medium/low recognition.

Prefer core/scored POIs so the Canary tests the first production target population.

Process in one or more batches, maximum 200 candidates per batch.

### Canary output per candidate

- normalized Fact document;
- 43 feature decisions;
- old value;
- proposed value;
- derivation mode;
- ruleId;
- supporting factIds;
- sourceRefs;
- confidence;
- rationale;
- provenance;
- Visit Profile changes, if any;
- canonical apply/reject outcome.

### Canary quality hard gates

- membership exactly 200;
- exactly 43 decisions per candidate;
- 100% existing supported values preserved or explicitly superseded;
- 100% added/superseded values have complete trace;
- 0 unsupported default fills;
- 0 unexplained canonical deltas;
- deterministic repeat PASS;
- no Registry/Master Code/candidateKey changes.

### Canary coverage gate

The purpose of TASK-077 is actual coverage expansion, not another null-only audit.

After safe self-healing and rule/source-family expansion, the 200-POI Canary should target:

- **>= 3,000 genuinely new non-null values** across the 200 POIs;
- median populated features after Canary **>= 20 / 43**;
- at least **150 / 200** POIs at **>=15 / 43**;
- at least **100 / 200** POIs at **>=20 / 43**.

These are coverage gates, but **quality wins over coverage**.

It is forbidden to invent values to reach them.

If the first Canary misses the coverage gate:
1. sample >=30 low-yield rows;
2. classify the missing fact families;
3. improve structured extraction, reusable source targeting, or deterministic rules;
4. rerun the same frozen Canary membership;
5. allow up to 3 rule/source iterations.

If quality passes but coverage remains below the gate after 3 evidence-backed iterations, record **PARTIAL / COVERAGE GATE NOT MET**, preserve all valid outputs, and do not automatically expand to all 2,519 core POIs.

Required:

`docs/qa/TASK-077-B/canary-200/result.json`
`docs/qa/TASK-077-B/canary-200/result.md`
`docs/qa/TASK-077-B/canary-200/decisions.jsonl`
`docs/qa/TASK-077-B/canary-200/facts.jsonl`

---

## 14. Phase D — core 2,519 POI expansion

Only after Canary hard quality gates and coverage gate pass.

Freeze the TASK-075 current **2,519 scored/core POI** membership.

Process all 2,519 in deterministic batches of maximum 200.

For each batch:

`retained evidence -> normalized facts -> v2 rules -> candidate projection -> canonical task-state apply -> reconcile -> QA -> receipt`

Do not run 43 independent web searches.

Use grouped fact-family source acquisition.

### Batch low-yield recovery

If a batch produces:
- <5 new values per candidate average, or
- >50% of candidates receive zero additions,

automatically inspect >=20 candidates and determine whether:
- retained evidence was not parsed;
- target pages were too narrow;
- a fact family was not represented in the schema;
- valid rules are missing;
- the entities genuinely lack enough support.

Repair reusable logic before repeating the batch.

A low-yield batch may still PASS only if evidence/fact saturation is documented.

### Core quality gates

For all 2,519:
- all candidates processed exactly once;
- exactly 43 final decisions per candidate;
- every emitted value has v2 trace;
- all TASK-075 supported values preserved unless explicitly superseded;
- no silent Visit/Access regression;
- no unexplained projection/canonical delta;
- deterministic rebuild PASS;
- Registry/Master Code/candidateKey unchanged.

### Core coverage target

Report:
- non-null before/after;
- additions by derivation mode;
- additions by all 43 feature codes;
- coverage bands;
- per-POI mean/median;
- POIs >=10, >=15, >=20, >=30, 43/43.

Target after the core pass:
- median core coverage >=20/43;
- >=75% of core POIs at >=15/43;
- >=50% of core POIs at >=20/43.

These are desired operational coverage targets, not permission to fabricate.

If the quality gates pass but evidence-backed coverage cannot meet the targets, finish as PARTIAL with a precise gap taxonomy rather than inventing values.

---

## 15. Phase E — full 10,369 gap manifest

Regardless of whether full long-tail enrichment is executed in this task, build a new deterministic gap manifest over the entire 10,369 population after applying valid core results.

Required classification per remaining null:
- fact family missing;
- source family missing;
- comparative peer calibration missing;
- visit/access measurement missing;
- environment/season signal missing;
- explicit unsupported after v2 facts;
- blocked by entity-type semantics;
- deferred long-tail enrichment.

Required outputs:

`data/poi/full/task-077-b-japan-poi-43d-coverage-engine/remaining-gap-queue.jsonl.gz`
`docs/qa/TASK-077-B/full-population-gap-summary.json`
`docs/qa/TASK-077-B/full-population-gap-summary.md`

This becomes the authoritative input for the next long-tail coverage task.

---

## 16. Feature-family strategy

Do not treat all 43 dimensions the same.

### A. Source/fact-heavy benefits
01–12 should primarily use target-scoped cultural/nature/experience facts.

### B. Comparative
13 unique, 14 hidden, 15 iconic require calibrated peer sets.

### C. Audience / experience suitability
16–24 may use explicit facilities, audience facts, accessibility, rest, activity and experience facts through deterministic rules.

### D. Static burden / operational risk
25–30 use route/terrain/standing/crowd/queue/accessibility facts. Walking/physical are reference-visit scores.

### E. Time / weather / seasonal suitability
31–43 use static target characteristics, indoor/outdoor exposure, orientation/viewpoint, climate/seasonal attraction facts, and explicit seasonal constraints.

Do not confuse:
- current weather with static weather suitability;
- current opening hours with morning/daytime suitability;
- live queue with static queue risk;
- transit schedule with static access facts.

Live runtime facts belong to runtime systems, not canonical 43D.

---

## 17. Provenance contract for every v2 value

Every addition/supersede must include at minimum:

- candidateKey
- featureCode
- value
- derivationMode
- rubricVersion
- ruleId
- factIds
- sourceRefs
- locator/content hashes where available
- confidence
- rationale
- generated/reviewed timestamp
- prior value
- canonical outcome

The value must be reconstructible from the frozen facts and rule version.

If not reconstructible, do not write the value.

---

## 18. Canonical/task-state integration

Preserve current repository governance.

This task may write TASK-scoped canonical candidate state and review artifacts.

It does **not** authorize:
- production import;
- formal Registry rebind;
- new Master Code allocation.

Every projection must end as:
- applied to TASK-077 task-state canonical data;
- duplicate already present;
- rejected with explicit reason;
- superseded with explicit reason.

No unexplained projected/canonical delta.

---

## 19. Required implementation outputs

At minimum:

### Contracts / rubric
- `data/poi/full/rubrics/candidate-feature-rubric.v2.json`
- `data/poi/full/schemas/poi-fact-v2.schema.json`
- reusable fact/rule/scoring implementation under the existing POI tool architecture
- tests for fact validation and deterministic scoring

### QA
- `docs/qa/TASK-077-B/task-075-b-scope-closeout.md`
- `docs/qa/TASK-077-B/43d-contract-freeze.json`
- `docs/qa/TASK-077-B/baseline.json`
- `docs/qa/TASK-077-B/baseline.md`
- `docs/qa/TASK-077-B/walking-physical-duration-model.md`
- `docs/qa/TASK-077-B/calibration-v2.json`
- `docs/qa/TASK-077-B/calibration-v2.md`
- `docs/qa/TASK-077-B/calibration-holdout-differences.jsonl`
- `docs/qa/TASK-077-B/canary-200/*`
- `docs/qa/TASK-077-B/core-coverage/*`
- `docs/qa/TASK-077-B/full-population-gap-summary.json`
- `docs/qa/TASK-077-B/full-population-gap-summary.md`

### Data
Use a task-scoped directory:

`data/poi/full/task-077-b-japan-poi-43d-coverage-engine/`

Large row-level artifacts should be batched and compressed when appropriate.

Do not commit large transient source downloads already available through retained hashes.

### Result
- `docs/tasks/RESULT-TASK-077-b-task-075-closure-japan-poi-43d-coverage-engine.md`

---

## 20. Batch telemetry

Every Canary/core batch must record:

- phase
- batchId
- candidateCount
- input checksum
- factCount
- factCountByFamily
- retainedSourcesReused
- freshSourcesOpened
- sourceFamilyCounts
- semanticExtractionAttempted
- ruleEvaluations
- preserved
- directAdded
- ruleInferredAdded
- comparativeAdded
- computedAdded
- superseded
- rejectedByReason
- provenanceWritten
- nonNullBefore
- nonNullAfter
- coverageDistributionBefore
- coverageDistributionAfter
- Visit changes
- Access changes
- unexplainedCanonicalDelta
- deterministic checksum
- retry/recovery actions
- elapsed
- gate status

---

## 21. Tests / final QA

At finalization run, at minimum:

1. TASK-077 targeted tests;
2. current POI/43D/review tests;
3. shared planning-contract tests;
4. full repository test suite;
5. typecheck;
6. repository lint, distinguishing true TASK-077 regressions from documented pre-existing unrelated issues;
7. scoped/full Prettier check as appropriate;
8. build / deployment validation;
9. artifact verification;
10. `git diff --check`;
11. exact-current-head GitHub Quality Gate.

If a repository-wide pre-existing lint/test issue remains unrelated to TASK-077, prove it by isolated baseline reproduction; do not silently call it PASS.

---

## 22. Self-healing policy

Routine failures are not reasons to ask the user.

Automatically handle:
- stale retained source path -> locate by hash/manifest;
- parse failure -> alternate parser;
- source 404/timeout -> bounded alternative source family;
- fact extraction low yield -> inspect sample and improve reusable extraction;
- rule disagreement -> classify and recalibrate;
- deterministic mismatch -> remove time/order/non-deterministic inputs;
- projection/canonical mismatch -> diff and repair smallest layer;
- batch artifact corruption -> invalidate/rebuild affected batch;
- transient Git/network failure -> bounded retry;
- ordinary non-fast-forward -> fetch/inspect and safe normal merge when history is preserved.

True blockers:
- force/history rewrite required;
- repository credentials/permissions unavailable;
- new paid provider authorization required;
- Registry/Master Code governance decision;
- evidence/fact semantics require a product-owner decision that cannot be represented by the frozen 43D contract.

Continue all unaffected work before reporting a true blocker.

---

## 23. Git safety

Before work:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/codex/b-task-075-japan-poi-entity-resolver-43d-completion
git log --oneline -15 origin/codex/b-task-075-japan-poi-entity-resolver-43d-completion
```

Expected upstream starting SHA:

`d706534dbfd3aa77d2857f3c214f66a8a84d07c3`

Forbidden:
- `git clean -fd`
- `git reset --hard`
- `git push --force`
- `git push --force-with-lease`
- direct push to `develop` / `main`
- auto-merge

Use a dedicated clean worktree.

---

## 24. Draft PR

Execution branch:

`codex/b-task-077-japan-poi-43d-coverage-engine`

If PR #423 is still unmerged, Draft PR base:

`codex/b-task-075-japan-poi-entity-resolver-43d-completion`

If #423 is merged before PR creation, re-evaluate the accepted upstream ancestry and target the correct accepted branch/develop without dropping history.

PR body must report:
- TASK-075 closeout clarification;
- baseline 6,385 / 439,482;
- calibration result;
- Canary before/after;
- core 2,519 before/after if executed;
- all 43 feature deltas;
- coverage bands;
- deterministic status;
- exact-head Quality Gate run;
- no Registry/Master Code/candidateKey changes;
- no production import.

No auto-merge.

---

## 25. Acceptance

TASK-077-B is COMPLETE only if:

### TASK-075 closure
- the scope clarification is recorded without rewriting prior audit history;
- TASK-075 remains COMPLETE for its actual resolver/evidence scope.

### Engine
- v2 Fact contract exists and is validated;
- v2 rubric exists without mutating v1;
- scoring is deterministic and rule-traceable;
- existing 43D contract remains unchanged;
- existing supported values are protected.

### Calibration
- calibration hard gates PASS.

### Canary
- 200/200 processed;
- quality hard gates PASS;
- coverage gate PASS after <=3 evidence-backed iterations.

### Core expansion
- if Canary passes, all frozen 2,519 core POIs are processed automatically;
- exact 43 decisions each;
- no unsupported fills;
- all additions have provenance;
- core coverage metrics reported.

### Next queue
- full 10,369 gap manifest is generated.

### QA
- targeted/full relevant tests and exact-current-head GitHub Quality Gate pass, or any unrelated pre-existing repository-wide blocker is explicitly isolated and proven;
- no Registry rebind;
- no Master Code allocation;
- no candidateKey mutation;
- no production import;
- no auto-merge.

If quality passes but safe coverage cannot satisfy the Canary coverage gate, finish as:

`PARTIAL / COVERAGE GATE NOT MET`

and preserve all valid evidence-backed additions. Never lower evidence quality or invent scores to claim COMPLETE.
