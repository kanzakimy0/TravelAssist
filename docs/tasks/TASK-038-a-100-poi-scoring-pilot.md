# TASK-038-A — 100 POI Scoring Pilot / Calibration

> Issue: #299  
> WBS: **7.9 — POI Recommendation Scoring / Calibration**  
> Owner: **A — Main Travel System / Planning Engine**  
> Priority: **P0 Pilot**  
> Status at publication: **Ready / do not auto-merge**  
> Authoritative base: latest `origin/develop` after TASK-036 + TASK-037 merge  
> Expected implementation branch: `codex/a-100-poi-scoring-pilot`

---

## 1. Goal

Run the first **evidence-backed 100-real-POI scoring calibration pilot** for TravelAssist.

This Task does not merely prove that a scoring function can execute. It must test whether the current POI Feature / Preference semantics produce rankings that are directionally correct, explainable, robust to unknown data, and stable enough to propose a candidate calibration for later human review.

Target flow:

```text
100 real Japan POIs
↓
stratified sample + evidence/provenance
↓
POIFeatureV1 + Visit Profile pilot annotations
↓
fixed preference scenarios
↓
independent benchmark judgments / invariant cases
↓
train / holdout split
↓
parameter candidate search
↓
train selection
↓
untouched holdout evaluation
↓
error / failure-case analysis
↓
Calibration Candidate report
↓
STOP — no production freeze
```

The output is a **Pilot Calibration Candidate**, not a production scoring implementation and not a final Frozen v1 parameter set.

---

## 2. Preconditions

Before modifying files, confirm:

```text
PR #293 merged
PR #298 merged
WBS 4.47 completed
WBS 9.13 completed
```

Fetch latest `origin/develop` and verify that it contains:

```text
src/shared/contracts/planning/**
tests/task-036-planning-contracts.test.mjs
tests/task-037-planning-contract-soak.test.mjs
docs/architecture/poi-feature-preference-codebook-v0.1.md
docs/architecture/poi-scoring-spec-v0.2.md
docs/architecture/poi-master-schema-v0.2.md
docs/architecture/itinerary-feasibility-spec-v0.1.md
docs/architecture/planning-fact-freshness-policy-v0.1.md
```

Also read relevant Japan POI / asset / destination source material already present in the repository, including available resolved attraction / destination manifests and source catalogs.

If a newer canonical/frozen contract on `develop` materially contradicts these semantics, stop as `Blocked` and document the exact conflict rather than silently redefining scoring.

---

## 3. Non-negotiable scoring semantics

### 3.1 Feature values

POI Feature values remain:

```text
0..9 | null
```

Meaning:

```text
0    = known absent / extremely unsuitable
1..9 = valid known strength
null = unknown
```

Never convert:

```text
null → 0
null → 5
0 → null
```

### 3.2 Preference values

Effective Preference remains:

```text
1..9
5 = explicit neutral
```

Sparse AI omit-5 encoding is irrelevant to the offline scoring math except that the semantic value of omitted compact preferences is neutral after Effective Preference construction.

### 3.3 Feature kinds

Preserve the current codebook ownership:

```text
benefit:     01–15
suitability: 16–24, 29–38, 40–43
cost:        25 walking, 26 physical
risk:        27 crowd, 28 queue, 39 weather_sensitive
```

Do not treat all 43 dimensions as a naive dot product.

### 3.4 Tolerance semantics

For cost/risk dimensions, Preference means tolerance/target, not desire for burden.

Examples:

```text
walking=2
= low walking tolerance

crowd=2
= low crowd tolerance

crowd=9
= can tolerate crowd
≠ likes crowd
```

High tolerance may reduce a penalty. It must not turn high burden/risk into a positive reward merely because tolerance is high.

### 3.5 Match vs context

`matchScore` must remain separate from:

```text
current weather
live route
current day fatigue
opening-hours feasibility
booking/payment state
real-time inventory
itinerary scheduling feasibility
```

These belong to separate components / gates such as:

```text
partyFit
seasonFit
weatherFit
dayFit
routeFit
currentSuitability
Constraint Gate
Itinerary Feasibility
```

This Pilot may use static scenario components where explicitly defined, but it must not contaminate `matchScore` with live facts.

### 3.6 Hard constraints

Hard constraints are not large negative scores.

They remain:

```text
PASS / REJECT / NEEDS_FACT
```

Do not calibrate a weight that allows a high match score to override a hard reject.

---

## 4. 100-POI sample design

### 4.1 Source rule

Select **exactly 100 real Japan POIs** from existing repository-resolved / evidence-backed POI or attraction material whenever possible.

Priority:

```text
1. already resolved repository entities with source/evidence
2. existing attraction / destination manifests and approved source catalogs
3. official public source confirmation if network access is available and permitted
```

No paid API or LLM is required or authorized.

Do not mass-scrape sources in violation of their terms. If a required attribute cannot be supported, store `null` / unknown instead of inventing an exact value.

If fewer than 100 sufficiently identified real POIs can be assembled without fabrication, stop as `Partial` and report the exact count and missing evidence categories. Do not silently fill the sample with synthetic POIs.

### 4.2 Geographic diversity

The 100 POIs must not collapse into Tokyo/Kyoto/Osaka only.

Minimum target:

```text
>= 6 broad Japan regions
>= 10 prefectures
no single prefecture > 20 POIs
Tokyo + Kyoto + Osaka combined <= 45 POIs
```

If repository source coverage makes one threshold impossible, report the exception and rationale; do not fabricate entities.

### 4.3 Experience diversity

The sample must include meaningful representation of at least these archetypes where repository material allows:

```text
shrine / temple
historic / architecture
museum / art
nature / park / garden
mountain / viewpoint / scenic
food / market / local food
shopping / urban district
entertainment / interactive / family
onsen / relaxation
night / evening experience
```

Target at least 5 POIs in each represented archetype, with multi-label classification allowed.

### 4.4 Difficulty / popularity diversity

The sample should contain both ends of important scoring dimensions:

```text
>= 20 high walking/physical burden examples
>= 20 low walking/physical burden examples
>= 20 high iconic examples
>= 20 high local/hidden examples
>= 15 potentially crowded/queue-prone examples
```

These are sample-balance targets, not production corpus distribution claims.

### 4.5 Sample manifest

Create a machine-readable sample manifest with at least:

```text
sampleIndex
poiRef / stable repository ref
canonical name
prefecture / region
archetype tags
sourceRefs / evidenceRefs
sample selection reason
splitAssignment
```

Suggested output:

```text
docs/qa/TASK-038/poi-sample-100.json
```

---

## 5. Pilot annotation dataset

Create a versioned pilot annotation dataset for all 100 POIs.

### 5.1 POIFeatureV1

Every POI must contain all 43 Feature keys.

Values:

```text
0..9 | null
```

For each non-null value, retain enough provenance to distinguish:

```text
existing repository fact/evidence
derived from verified facts
human/pilot editorial calibration
```

Do not imply that an editorial Feature label is an objective live Fact.

Where reasonable, retain per-feature annotation metadata:

```text
featureCode
value
annotationMethod
sourceRefs
confidence
noteCode
```

Free prose should be bounded; prefer reason/evidence codes.

### 5.2 Visit Profile pilot

For POIs with enough evidence, annotate at least one supported Visit Mode with:

```text
minimumDurationMinutes
recommendedDurationMinutes
maximumUsefulDurationMinutes
fixedWalkingLoad
variableWalkingLoad
fixedPhysicalLoad
variablePhysicalLoad
```

Use additional modes such as `quick_visit` / `photo_stop` only where the POI reasonably supports them.

Do not invent precise walking distance, stairs or duration data merely to avoid nulls.

Quality rule:

```text
minimum <= recommended <= maximumUseful
```

### 5.3 Annotation QA

Before running calibration:

```text
100/100 POI identity valid
100/100 complete 43-key vector shape
all values valid 0..9|null
all non-null labels have annotation method
all Visit Profiles pass TASK-036 validators
no cross-POI ref mismatch
```

Create an annotation-quality summary showing null/known coverage by Feature and by POI.

---

## 6. Benchmark preference scenarios

Create a fixed, versioned set of representative soft preference scenarios.

Minimum **12 scenarios**, including at least:

```text
A. first-time iconic traveler
B. hidden/local explorer
C. photography / scenery
D. history / architecture
E. food-focused traveler
F. shopping / city traveler
G. nature traveler
H. art / educational traveler
I. family / interactive soft-fit scenario
J. relaxed / rest-oriented traveler
K. low walking / physical tolerance
L. low crowd / queue tolerance
```

Optional additional scenarios are allowed if useful.

Rules:

- use Effective Preference semantics `1..9`, neutral `5`;
- do not encode hard accessibility requirements as soft preferences merely to make the benchmark easier;
- weather, season, current fatigue and route are separate context scenarios if tested;
- record scenario intent and expected dominant dimensions.

Suggested output:

```text
docs/qa/TASK-038/preference-scenarios.json
```

---

## 7. Benchmark judgments / ground-truth candidate set

Do not evaluate a scoring formula only against labels generated by that same formula.

Create an explicit benchmark judgment set independent of candidate parameter values.

Use a mixture of:

```text
pairwise preference judgments
obvious monotonicity/invariant cases
Top-K expectation groups
known conflict / tie cases
```

Minimum target:

```text
>= 240 pairwise judgments total
>= 20 judgments involving low walking/physical tolerance
>= 20 involving crowd/queue tolerance
>= 20 iconic vs hidden/local tradeoffs
>= 20 null/unknown coverage cases
```

Each judgment should include:

```text
scenarioId
poiA
poiB
expected: A | B | TIE | INDETERMINATE
confidenceBand: high | medium | low
reasonCodes
reviewRequired
```

Only `high` and `medium` confidence judgments should drive the main calibration metric. Low-confidence judgments are diagnostic.

`INDETERMINATE` cases must not be forced into a win/loss label.

The Task may construct obvious semantic judgments from evidence-backed annotations, but must flag subjective judgments for later human review. It must not claim that machine-authored pairwise labels are final human truth.

Suggested output:

```text
docs/qa/TASK-038/pairwise-benchmark.json
```

---

## 8. Train / holdout discipline

Avoid tuning and scoring on the same benchmark only.

Use a deterministic split, such as a stable hash of `poiRef + pilotVersion`, producing approximately:

```text
80 POIs calibration/train
20 POIs untouched holdout
```

Requirements:

- stratify or verify the holdout does not collapse into one region/archetype;
- parameter selection uses calibration judgments only;
- holdout is evaluated only after the candidate config is selected;
- do not retune on holdout failures inside the same reported run;
- if the split is changed, increment the Pilot version and record why.

Optional deterministic k-fold analysis is allowed as a diagnostic, but the final report must still contain one untouched holdout result.

---

## 9. Offline scoring experiment harness

Add a provider-free deterministic harness using the public Planning contracts.

Suggested location:

```text
tools/qa/poi-scoring-pilot.mjs
```

No new large framework dependency is required.

The harness should support:

```text
load versioned POI annotations
load preference scenarios
validate all inputs
calculate score components
run candidate parameter configurations
rank POIs per scenario
compare to pairwise benchmark
report coverage/confidence
report invariant violations
report per-region/per-archetype errors
write deterministic evidence
```

Do not call Provider APIs or an LLM from scoring execution.

---

## 10. Candidate scoring model

Start from the semantics already defined in `poi-scoring-spec-v0.2.md`.

Reference normalized variables:

```text
feature x = feature / 9
preference q = (p - 5) / 4
cost/risk tolerance t = (p - 1) / 8
```

Reference contribution families include:

```text
benefit contribution
suitability contribution
cost/risk penalty
coverage-aware aggregation
```

The Pilot may search candidate parameterizations around the design, but must not introduce a completely different semantic model without reporting it as a design conflict.

### 10.1 Parameter families allowed to search

At minimum evaluate bounded candidates for:

```text
cost/risk penalty gamma
benefit weight
suitability weight
cost weight
risk weight
coverage adjustment / penalty strength
confidence adjustment
normalization to 0..99
optional component floor / clipping behavior
```

Example candidate ranges may include, but are not frozen by this Task:

```text
gamma: 1.0 .. 3.0
weights: bounded positive ranges around 1.0
coverage exponent/penalty: 0 .. 1
```

Use deterministic coarse-to-fine or bounded grid/search. Record the exact candidate space and seed.

Do not run an unbounded optimizer.

### 10.2 Forbidden parameter behavior

Reject a candidate configuration if it causes any of these:

```text
neutral preference 5 creates non-neutral preference contribution
unknown null treated as known 0/5
high cost/risk tolerance turns burden into positive reward
hard-rejected POI becomes selectable through score
weather/live-route/booking data enters matchScore
score outside 0..99 contract range
non-deterministic output for same inputs/config
```

These are hard Pilot gates, not soft metrics.

---

## 11. Required scoring invariants

Create explicit automated invariant tests.

### 11.1 Benefit monotonicity

For otherwise equal known Features:

```text
p > 5 → stronger desired benefit must not reduce contribution
p = 5 → benefit contribution neutral
p < 5 → stronger disliked benefit must not improve contribution
```

### 11.2 Cost/risk tolerance directionality

For walking/physical/crowd/queue/weather-sensitive cost/risk dimensions:

```text
lower tolerance → same burden cannot receive a smaller penalty than higher tolerance
higher tolerance → penalty may decrease to zero
higher tolerance → burden must not become a reward
```

### 11.3 Unknown handling

Replacing a known Feature with `null` must affect coverage/confidence according to policy, not silently behave as feature `0`, `5`, or another known score.

### 11.4 Walking duration semantics

Do not use static `walkingFeature` as actual visit fatigue.

Where Visit Profile data exists, demonstrate at least several examples where:

```text
30 / 60 / 90 / 120 minute plans
```

produce different Visit Load while respecting fixed/non-scaling burden.

A too-short `full_visit` remains a feasibility issue rather than a scoring trick.

---

## 12. Evaluation metrics

Report metrics separately for calibration and holdout.

At minimum:

```text
pairwise agreement — high confidence
pairwise agreement — high + medium confidence
tie handling accuracy
indeterminate exclusion count
invariant pass rate
coverage distribution
confidence distribution
per-scenario agreement
per-region agreement
per-archetype agreement
walking/crowd directionality pass rate
unknown/null handling pass rate
```

Optional useful ranking metrics:

```text
NDCG@5 / NDCG@10
Top-K expectation recall
Spearman/Kendall on ranked subsets
```

Only use a metric when the benchmark representation legitimately supports it.

### 12.1 Pilot candidate gates

A candidate configuration is **eligible for human review**, not automatically production-ready, only if:

```text
all hard semantic invariants = 100% PASS
all contract/data validation = 100% PASS
no hard-reject bypass = 0 cases
walking/crowd tolerance directionality = 100% PASS
unknown/null semantics = 100% PASS
high-confidence pairwise agreement >= 85% on calibration
high-confidence pairwise agreement >= 80% on untouched holdout
high+medium pairwise agreement >= 75% on untouched holdout
```

If these quality targets are not met, the Task still completes as a valid Pilot Result but status must be:

```text
Pilot completed / calibration not accepted
```

Do not tune repeatedly against holdout to force a pass.

These thresholds are **Pilot review gates**, not frozen production SLAs.

---

## 13. Bias / failure analysis

The report must explicitly inspect:

```text
Tokyo/Kyoto/Osaka dominance
iconic popularity bias
hidden/local suppression
high-walking POIs winning despite low walking tolerance
crowded POIs being rewarded by high crowd tolerance
unknown-heavy POIs receiving unfairly high scores
small-coverage scores becoming overconfident
category monoculture
subjective annotation dependence
```

For at least the top 20 disagreements, write a bounded failure record:

```text
scenario
POIs
expected result
actual result
score breakdown
coverage/confidence
likely cause
parameter issue vs annotation issue vs benchmark ambiguity
recommended follow-up
```

Do not hide failures by deleting benchmark judgments after seeing the result.

---

## 14. Required evidence outputs

Suggested directory:

```text
docs/qa/TASK-038/
```

Required outputs:

```text
poi-sample-100.json
poi-feature-annotations.json
visit-profile-annotations.json
annotation-quality.json
preference-scenarios.json
pairwise-benchmark.json
train-holdout-split.json
parameter-search.json
calibration-results.json
holdout-results.json
failure-cases.json
pilot-report.md
```

Also create/update:

```text
docs/tasks/RESULT-TASK-038-a-100-poi-scoring-pilot.md
```

Generated evidence must be deterministic where inputs and source tree are unchanged.

---

## 15. Tests

Add focused tests, for example:

```text
tests/task-038-poi-scoring-pilot.test.mjs
```

Minimum test coverage:

```text
sample exactly 100 real unique POIs
sample stratification rules
43-key vector validation
0 vs null
neutral 5
cost/risk directionality
benefit monotonicity
unknown coverage behavior
Visit Profile duration ordering
Visit Load duration sensitivity
hard reject separation
parameter deterministic search
train/holdout separation
holdout not used in selection
score range 0..99
failure report reproducibility
```

Reuse existing Planning validators rather than duplicating contract semantics in the test harness.

---

## 16. Validation commands

Before final Result, run at least:

```bash
npm ci
npm run test:planning-contracts
npm run test:planning-soak
npm run test:routing
npm run lint
npm run typecheck
npm run build
```

Run the current Trip / Route / Engine contract suites and full Node regression using the repository's canonical commands at execution time.

Add a focused script such as:

```text
npm run test:poi-scoring-pilot
npm run qa:poi-scoring-pilot
```

if consistent with repository conventions.

Run Prettier on Task-owned files and `git diff --check`.

Repository-wide pre-existing format failures may be documented as baseline only if reproduced against the exact base. TASK-038 must add zero new formatting failures.

---

## 17. Explicitly out of scope

Do not do any of the following in TASK-038:

```text
- production POI DB migration/import
- generate the full 15,000+ POI corpus
- live route search
- live weather integration
- live booking / hotel / restaurant availability
- OpenAI / LLM scoring
- user-facing Planner UI changes
- Trip Mutation Engine changes
- automatic Replanning runtime
- production scoring rollout
- membership/paywall logic
- deployment
- Master Code renumbering
- final Frozen v1 promotion
- automatically start Region Graph / Candidate / AI Pilot after completion
```

The sample may use public evidence research when permitted, but must not call paid APIs or perform prohibited scraping.

---

## 18. WBS tracking

Use existing:

```text
WBS 7.9 — POI Recommendation Scoring / Calibration
```

Do not create a second competing scoring WBS.

Status rule:

```text
Task published → 待开始
implementation starts → 进行中
pilot evidence complete, Draft PR unmerged → 待审查
merged + accepted → 已完成（Pilot范围）
```

Important:

`已完成（Pilot范围）` does not mean production scoring is frozen or all recommendation-engine work is complete.

Update the Master WBS before returning with:

```text
TASK-038-A
Issue #299
branch
commit
Draft PR
Pilot status
calibration candidate status
blockers/deferred
```

---

## 19. Required Result

`RESULT-TASK-038-a-100-poi-scoring-pilot.md` must include:

```text
Status
Base / develop SHA
Issue
Branch
Commits
Draft PR
Sample source and selection rules
100-POI distribution
Annotation completeness / null coverage
Visit Profile coverage
Preference scenarios
Benchmark judgment counts
Train/holdout split
Parameter search space
Selected candidate config
Calibration metrics
Holdout metrics
Invariant results
Top disagreements / failure categories
Bias checks
Commands/tests exact outcomes
Known baseline failures
No-provider/no-LLM confirmation
Files changed
WBS updated Yes/No
Recommended decision: accept candidate / revise annotations / revise model / insufficient evidence
Recommended next Task (do not start)
```

The Result must clearly distinguish:

```text
measured evidence
editorial annotation
benchmark judgment
parameter candidate
human-review recommendation
```

---

## 20. Git / workspace safety

The user's main workspace may contain uncommitted Planner / Step work.

Do not switch/reset/clean/overwrite that workspace.

Use an isolated worktree or clean clone for TASK-038.

Before modifications:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Forbidden:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Implementation branch:

```text
codex/a-100-poi-scoring-pilot
```

Base it on the latest `origin/develop` at execution time.

Create a **Draft PR → develop** only.

Do not auto-merge.

---

## 21. Stop conditions

Stop as `Blocked` / `Partial` rather than guessing if:

```text
- TASK-036 or TASK-037 is no longer present in latest develop;
- a newer frozen contract changes POIFeature / Preference semantics materially;
- fewer than 100 real identifiable POIs can be assembled without fabrication;
- required evidence would require unauthorized paid/provider credentials;
- a source license/terms boundary prevents safe use of needed evidence;
- the experiment would require changing Trip Mutation, canonical Trip or canonical Route contracts;
- the benchmark cannot be separated from the model enough to make calibration meaningful.
```

Ordinary Task-owned coding/test defects are not stop conditions; fix them and rerun.

---

## 22. Completion boundary

TASK-038 completes when the 100-POI pilot is reproducible and reviewable.

It may end in either:

```text
Pilot completed / calibration candidate eligible for human review
```

or:

```text
Pilot completed / calibration not accepted
```

Both are legitimate Pilot outcomes when evidence is complete.

TASK-038 must not silently convert a Pilot result into production truth.