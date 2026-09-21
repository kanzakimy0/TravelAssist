# AMENDMENT — TASK-072-B Authoritative Enrichment Correction v2

## Status

This amendment supersedes the prior TASK-072-B completion claim for enrichment acceptance.

PR #410 / the prior TASK-072 execution proved deterministic decision generation, but it did not satisfy the product goal because it read an obsolete/incomplete feature baseline and produced zero new non-null values/provenance.

The correction must be implemented on the existing TASK-072 execution branch. Do not create a new business task.

## Confirmed failure modes

1. The prior TASK-072 Result reported 272 scored POIs / 860 non-null features, while the authoritative current-candidate view inherited from the upstream remaining-POI review contains 2,510 scored POIs / 6,104 non-null features.
2. The 10,097 pending population therefore already includes 2,238 scored candidates and 5,244 non-null features that must be preserved.
3. Prior TASK-072 generated 434,171 decisions but zero new non-null features and zero provenance, showing that decision generation alone is not evidence enrichment.
4. 6,044 / 6,049 identity-unresolved candidates were classified RESOLVED_MEDIUM without a sufficiently strong final audit of the required independent identity signals.
5. The prior visible Result referenced an older head after later commits changed PR #410 head.

## Authoritative feature baseline

Before any new projection, execute the canonical reader:

`node --import ./tests/register-route-ts.mjs tools/poi/read-current-candidates.mjs`

At the authoritative upstream state, it must reconcile to:

- population = 10,369
- newScoredPois = 2,238
- scoredPois = 2,510
- nonNullFeatures = 6,104
- pendingCandidates = 10,097
- runtimeImportAuthorized = false

If the current branch does not reproduce these values from the canonical manifest/view, STOP and repair the view wiring before any enrichment.

For the TASK-072 10,097 population, the existing baseline must therefore preserve:

- scored candidates already inside pending population = 2,238
- non-null features already inside pending population = 5,244

The protected 272 / 860 baseline outside the pending population must remain untouched.

No corrected run may reduce these values without a specific contradiction/supersession record.

## Two-stage architecture

The corrected pipeline must separate:

### Stage 1 — semantic evidence annotation

A model/editorial pass reads retained target-scoped text and/or supplemental accepted sources and emits structured candidate evidence facts.

This stage is where semantic interpretation occurs.

It must not be replaced by a mechanical null-decision generator.

### Stage 2 — deterministic projection

Validated structured evidence facts are projected into:

- 43D candidate feature sidecars
- provenance
- identity disposition
- Visit Profile
- Access Anchor/static access facts

The deterministic projector may only project facts emitted by Stage 1 or preserve prior authoritative values.

## Mandatory enrichment canary

Full-run execution is forbidden until this canary passes.

### A. Preservation controls

Use >=20 candidates from the current 10,097 population that already have authoritative non-null values.

Required:

- all current non-null values load correctly;
- all their existing provenance loads correctly;
- projector emits PRESERVE_SUPPORTED for every existing supported value;
- no current supported value disappears.

### B. Evidence-to-new-value controls

Select >=20 currently-null candidates with retained target-scoped text or accepted sources.

The set must intentionally include evidence-rich cases across several feature families (for example history, architecture, scenery/nature, art, food/shopping, seasonality, suitability/cost/risk where evidence exists).

Before projection, the semantic annotation pass must identify target-specific rubric-supporting facts.

Canary PASS requires:

- at least 10 candidates produce >=1 ADD_SUPPORTED feature;
- total new non-null features >=10;
- provenanceWrittenCount equals or exceeds new/superseded non-null count;
- every new non-null has sourceRef + rationale + confidence + rubricVersion + locator/hash;
- at least 3 distinct feature codes receive new supported values;
- deterministic projection repeat produces byte-identical outputs;
- no Registry/Master Code/candidateKey mutation.

If the canary yields zero new non-null/provenance, STOP. It is forbidden to start the full 10,097 run.

## Per-candidate 43D execution

Every candidate still receives exactly 43 decisions.

But a decision is only valid after:

1. current authoritative value is loaded;
2. relevant retained/supplemental evidence is loaded;
3. semantic evidence annotation is performed;
4. rubric is applied;
5. decision is made.

Allowed dispositions:

- PRESERVE_SUPPORTED
- ADD_SUPPORTED
- SUPERSEDE_SUPPORTED
- UNSUPPORTED_REMAINS_NULL
- IDENTITY_BLOCKED
- SOURCE_CONTRADICTORY

PRESERVE_SUPPORTED must preserve current authoritative provenance.

ADD_SUPPORTED / SUPERSEDE_SUPPORTED must create complete provenance.

No evidence => null, never default 0 or 5.

## Hard baseline gates

Final corrected execution must satisfy:

- global current view before corrected enrichment = scoredPois 2,510 / nonNullFeatures 6,104;
- existing pending-population supported candidates = 2,238;
- existing pending-population non-null features = 5,244;
- those 5,244 existing non-null values are preserved unless individually superseded with contradiction evidence;
- global scoredPois after >= 2,510;
- global nonNullFeatures after >= 6,104;
- corrected full-run newNonNullFeatureCount > 0;
- corrected full-run provenanceWrittenCount > 0.

A final result with newNonNullFeatureCount = 0 is BLOCKED even if all 434,171 decisions exist.

## Identity correction

The previous RESOLVED_MEDIUM = 6,044 outcome must be re-audited.

RESOLVED_MEDIUM requires per candidate:

- >=2 independent identity signals;
- >=2 source/evidence refs when the signals come from external evidence, unless one source is an official authoritative record containing multiple discriminative fields;
- at least one discriminative signal beyond bare name: address/locality/municipality/coordinates/operator/official domain/official account;
- no unresolved credible competing target.

Each resolution record must retain:

- signals considered;
- sourceRefs;
- discriminative signal;
- competingTargets;
- rejection reasons;
- confidence;
- final disposition.

If the evidence does not meet that threshold, classify SECOND_PASS_REQUIRED.

Do not optimize for a low second-pass count.

### Identity audit gate

Before accepting Phase A identity output:

- stratified audit >=200 RESOLVED_MEDIUM rows;
- 0 rows may lack the required evidence structure;
- if any invalid row is found, re-evaluate the affected batch(es) and repeat audit;
- final Phase A must reconcile all 6,049 candidates.

## Visit / Access baseline

Do not treat TASK-072 output directories as the only truth.

Load the current authoritative candidate view and preserve all existing Visit Profile / Access information already produced upstream.

Report both:

- authoritative before count;
- corrected after count;
- additions/supersessions.

No existing supported Visit/Access fact may disappear silently.

## Supplemental search

Use existing TASK-071 discovery/retained evidence first.

When a candidate lacks sufficient evidence for identity or fields, actively supplement from:

1. official target site;
2. government/prefecture/municipality;
3. official tourism/DMO/cultural source;
4. official operator;
5. verified official SNS;
6. reliable secondary source.

Accepted supplemental evidence must be retained before projection.

## Full-run batch gates

Reuse the 53 frozen batches.

For each batch:

- featureExtractionAttemptedCount = candidateCount;
- featureDecisionCount = candidateCount × 43;
- current authoritative values loaded;
- semanticAnnotationAttemptedCount = candidateCount except identity-blocked rows, which must have identity evidence/reason;
- existingNonNullLoadedCount reconciles with input;
- preserved + superseded current non-null count reconciles exactly;
- every ADD/SUPERSEDE has provenance;
- every null has field-level reason;
- identity transitions have evidence;
- Visit/Access attempts recorded;
- deterministic output;
- checkpoint/receipt after outputs;
- ordinary batch success auto-next.

## Anti-gaming gates

The following are automatic FAIL:

- using only old baseFeaturePartitions while ignoring current feature delta/editorial ledger;
- reporting 272/860 as the authoritative current baseline;
- generating 43 null decisions mechanically without semantic annotation;
- newNonNullFeatureCount = 0 after a passing evidence-rich canary;
- provenanceWrittenCount = 0 while new/superseded non-null exists;
- bulk RESOLVED_MEDIUM without stored qualifying signals/source evidence;
- silently reducing current scored/non-null/Visit/Access data;
- claiming COMPLETE using only local deterministic decision-count gates.

## Final visible Result

Update:

`docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md`

The corrected Result must clearly label the earlier completion as superseded by this correction.

It must include:

- authoritative baseline source and command output;
- global before: 2,510 scored / 6,104 non-null;
- pending-population before: 2,238 scored / 5,244 non-null;
- canary results including actual ADD_SUPPORTED/provenance;
- 53-batch summary;
- 434,171 decisions;
- semantic annotation attempted count;
- preserved current non-null count;
- new/superseded non-null count;
- provenance count;
- per-feature before/after coverage;
- coverage bands;
- identity HIGH/MEDIUM/SECOND_PASS/CONFLICT results;
- identity audit result;
- Visit/Access authoritative before/after;
- supplemental source stats;
- remaining null reasons;
- review queues;
- Registry/candidate checksums;
- deterministic final check.

## GitHub finalization without self-reference bug

Do not require the Result Markdown to contain its own final commit SHA.

Use this sequence:

1. finish implementation/data + QA;
2. update Result Markdown with all substantive metrics and the implementation/evidence head it verifies;
3. commit the Result;
4. push normally to PR #410 branch;
5. run exact PR-head Quality Gate;
6. if PASS, add a PR/Issue comment recording:
   - exact final PR head;
   - exact Quality Gate run ID/conclusion;
   - Result file path;
7. do not make another commit merely to insert that final PR-head SHA into Result, because that would invalidate self-reference.

PR comment + GitHub check is the authoritative exact-head delivery receipt.

## Completion

Only after all correction gates pass may TASK-072-B be ACCEPTABLE FOR USER REVIEW.

Do not merge automatically.
