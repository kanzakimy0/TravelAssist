# AMENDMENT — TASK-075-B Correction v2.2: Candidate-Generation Recall Rescue + Final Blind Validation

## Authority

This amendment extends Correction v2.1 and addresses the current resolver-calibration failure.

Do not create TASK-076.

The current best difficult calibration shows:

- Recall@5 = 0.9666666666666667
- Top1 accuracy = 0.9666666666666667
- HIGH precision = 1.0
- MEDIUM precision = 1.0
- PROVISIONAL precision = 1.0
- hard-conflict auto-match = 0
- deterministic repeat = PASS

This pattern indicates candidate-generation coverage is the primary bottleneck: when the correct target is generated, ranking/precision is already strong.

The task must repair candidate generation rather than lower the acceptance thresholds.

## A. Metric-accounting correction

Every calibration/validation report must include raw numerator/denominator counts in addition to decimals.

Required:
- candidateGenerationHitAt1Count / evaluatedCount
- candidateGenerationHitAt5Count / evaluatedCount
- top1CorrectCount / evaluatedCount
- highCorrect / highPredicted
- mediumCorrect / mediumPredicted
- provisionalCorrect / provisionalPredicted

Report both:
- micro-average across rows
- macro-average across required strata

Primary acceptance gate uses **micro-average**.

If a reported decimal cannot be reconciled exactly with the stated row count, calibration FAIL until metric accounting is fixed.

## B. Replace repeated use of the same 'untouched holdout'

Because the previous 400-row holdout has now been inspected across multiple repair attempts, it is no longer fully untouched for final acceptance.

Build a three-way benchmark:

- >=600 tuning/calibration rows
- >=300 development validation rows
- >=300 final blind validation rows

Total >=1,200 known-good identities.

The final blind set must not be examined row-by-row or used to tune resolver rules until the final gate.

Required strata must exist across development + blind sets:
- municipality-unique easy
- same-name / near-name hard positives
- historical / alias / renamed
- area/district/non-point
- duplicate / invalid / non-POI negatives
- wrong municipality/prefecture/type-conflict decoys
- common temple/shrine names
- parks/nature with generic names
- English/Japanese alias cases
- urban and rural municipalities

## C. Candidate-generation rescue loop

For every development-row Recall@5 miss:

1. determine whether the expected target is:
   - absent from the 12,647-row registry target pool;
   - present under alias/former/English name;
   - present under historical municipality;
   - present with address/locality mismatch;
   - present but filtered by category/type;
   - discoverable only from official/government/tourism/operator/SNS/web sources;
   - an area/district entity;
   - a benchmark-label/data defect.

2. classify the miss into one machine-readable cause.

3. repair **general candidate-generation rules**, not individual target whitelists.

4. rerun the development set.

No candidateKey-specific hardcoded exceptions are allowed.

## D. Multi-strategy candidate generation

Candidate generation must union candidates from multiple strategies before ranking.

At minimum:

### D1. Municipality exact block
- prefecture exact/current-historical compatible
- municipality exact/current-historical compatible
- normalized exact name
- normalized alias
- Japanese/English name variants

### D2. Municipality fuzzy name
Within the same municipality:
- normalized edit/token similarity
- common suffix/prefix handling where semantically safe
- temple/shrine/park/museum/onsen naming variants
- punctuation/parenthetical/romanization variants

Do not over-normalize.

### D3. Locality/address rescue
Use:
- ward
- town/locality
- chome/address fragments
- postal/locality strings
to bring near-name candidates into Top-N.

### D4. Historical municipality rescue
Use documented old→current municipality mappings.

### D5. Official URL/domain rescue
When source/canonical/discovery URLs exist:
- extract domain/host
- correlate official organization/target pages
- use URL ownership as candidate-generation evidence.

### D6. Category-assisted rescue
Use type/category to expand/suppress candidates, but never discard a strong same-name official candidate solely because of noisy upstream category.

### D7. Access/context rescue
Use:
- nearest station
- named bus stop
- nearby landmark
- district/locality
- existing Access relationships
as identity-generation evidence.

### D8. External authoritative discovery
When local pools fail:
- official target website
- prefecture/municipality/government
- official tourism/DMO
- cultural-property/museum/park/religious sources
- official operator
- verified official SNS
- authoritative map/reference/knowledge source
- reliable secondary

Retain actual source text/locator for candidates promoted from web discovery.

Search snippets may generate candidate URLs but cannot prove identity.

## E. Candidate-pool coverage test

Before ranking evaluation, measure:

- expectedTargetPresentInLocalPool
- expectedTargetPresentAfterAliasExpansion
- expectedTargetPresentAfterHistoricalMunicipality
- expectedTargetPresentAfterExternalDiscovery
- finalCandidateSetContainsTarget

This distinguishes candidate-pool failure from ranker failure.

The final resolver must not be limited to the existing 12,647-row pool when authoritative web discovery can find the correct target.

## F. Development-set gate

Iterate on the development set until:

- Recall@5 micro >=99.0%
- Top1 micro >=98.5%
- HIGH precision >=99.0%
- MEDIUM precision >=98.0%
- provisional precision >=97.0%
- hard-conflict auto-match =0
- deterministic repeat PASS

If Recall@5 fails but ranking precision remains high:
continue candidate-generation rescue.

Do not lower the recall gate.

## G. Final blind validation gate

After development PASS, freeze resolver code/rules/thresholds.

Run the >=300 final blind rows once.

Required:
- Recall@5 micro >=99.0%
- Top1 micro >=98.5%
- HIGH precision >=99.0%
- MEDIUM precision >=98.0%
- provisional precision >=97.0%
- hard-conflict auto-match =0
- deterministic repeat PASS

If blind fails:
- create a blind-failure taxonomy;
- make only general resolver repairs;
- create a **new replacement blind set** of >=300 rows not previously inspected;
- rerun final blind validation.

Do not repeatedly tune against the same final blind rows.

## H. 5,920 production identity execution

Only after final blind PASS.

For each residual candidate:
- local inspect lookup/live or precomputed audit result
- municipality block
- multi-strategy candidate generation
- external authoritative discovery when local Top-N weak or absent
- real Top-N candidate set
- score/margin/hard conflicts
- retained discriminative evidence
- final disposition

A local-pool no-match cannot directly become provisional.

## I. Provisional anti-gaming remains

MATCHED_PROVISIONAL still requires:
- real external Top1 target
- discriminative retained evidence
- no hard conflict
- dominant candidate

If provisional >50%, audit >=1,000 rows at >=97% precision.

## J. 43D semantic write-through remains mandatory

After resolver blind PASS and production identity adjudication:
- run Correction v2.1 semantic write-through canary;
- automatically remediate until canary PASS;
- then execute full accepted-POI semantic review sweep.

Do not bypass the canary because identity is complete.

## K. Result requirements

Update existing Result with a v2.2 section:

### Metric accounting
- micro numerators/denominators
- macro by stratum

### Candidate-generation rescue
- development misses by cause
- local-pool coverage
- alias/historical/address/domain/category/context/web rescue counts
- Recall@1/5 progression across repair iterations

### Final blind validation
- blind population/strata
- Recall@5
- Top1
- HIGH/MEDIUM/PROVISIONAL precision
- hard conflicts
- deterministic repeat

### Production
- 5,920 final identity outputs
- inspect lookup stats
- candidateSetGenerated counts
- external-discovery counts
- provisional audit

### 43D
- semantic canary
- canonical additions
- full sweep telemetry and coverage

## L. Completion

TASK-075-B cannot be COMPLETE until:
- metric accounting is internally consistent;
- development resolver gates PASS;
- final blind resolver gates PASS;
- 5,920/5,920 production identities are adjudicated under corrected candidate generation;
- semantic write-through canary PASS;
- full accepted-POI semantic review sweep COMPLETE;
- canonical new non-null >0;
- provenance >0;
- final nulls have field-level semantic audit;
- exact current-head GitHub Quality Gate PASS.

Do not create TASK-076.
Do not lower thresholds merely to continue.
No force push, Registry rebind, Master Code allocation, production import, or auto-merge.
