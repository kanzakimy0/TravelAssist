# AMENDMENT — TASK-075-B Resolver / 43D Real-Execution Correction v2

## Authority

This amendment supersedes any TASK-075-B completion/acceptance interpretation that treats:
- bulk `MATCHED_PROVISIONAL` labels as equivalent to verified identity resolution; or
- a generated 43-field null ledger as equivalent to evidence-backed 43D enrichment.

The current PARTIAL result is preserved for audit, but its identity calibration and 43D saturation claims are not accepted as final.

## Confirmed failure modes

1. Resolver calibration used 600 existing scored candidates selected from unique municipality/name/category blocks. This is an easy closed-set sample and does not validate difficult residual identity resolution.
2. 5,723 / 5,920 residuals became `MATCHED_PROVISIONAL`. That rate requires proof that each provisional has a real external Top-N target and discriminative retained evidence; otherwise it is just renamed unresolved.
3. Phase 3/4 produced:
   - direct additions = 0
   - inferred additions = 0
   - canonical apply = 0
   despite prior TASK-073 evidence-rich canary proving the pipeline can produce supported additions.
4. Therefore `UNSUPPORTED_AFTER_EXHAUSTIVE_SEARCH` cannot be accepted unless actual source-review/search telemetry proves semantic evidence saturation.

## Rule 1 — 296MB inspect lookup is mandatory for every residual

If the local file exists:

`travelassist-japan-poi-master-registry-v1.52-social-inbound-core-gaps-b235.xlsx.inspect.ndjson`

then every one of the 5,920 residual records must execute one streamed local-registry lookup.

Required final telemetry:
- inspectFilePresent
- inspectLookupAttempted = 5920
- inspectExactKeyMatch
- inspectMunicipalityNameMatch
- inspectAliasMatch
- inspectAddressMatch
- inspectCategoryAssist
- inspectConflict
- inspectNoMatch

The file remains auxiliary; no-match must trigger external candidate generation rather than unresolved/default provisional.

Do not commit the large source file.

## Rule 2 — difficult calibration, not easy unique-block calibration

Rebuild calibration as a difficult resolver benchmark.

Minimum corpus: 1,000 known identities.

Split:
- >=600 tuning/training/calibration
- >=400 untouched holdout

Untouched holdout must contain at least:
- 100 municipality-unique easy positives
- 100 same-name or near-name hard positives
- 50 historical/alias/renamed positives
- 50 area/district/non-point entities
- 50 duplicate/invalid/non-POI negatives
- 50 wrong-municipality / wrong-prefecture / type-conflict decoys

The candidate generator must search among competitors; the expected target must not be supplied as the only candidate.

Required gates:
- candidate-generation Recall@5 >=99.0%
- Top1 accuracy >=98.5%
- HIGH precision >=99.0%
- MEDIUM precision >=98.0%
- provisional precision on audited holdout >=97.0%
- hard-conflict auto-match = 0
- deterministic repeat PASS

If any fail, fix the resolver and rerun automatically.

## Rule 3 — real Top-N external target required

A final matched/provisional row must not merely restate the input candidate.

For MATCHED_HIGH / MATCHED_MEDIUM / MATCHED_PROVISIONAL / HISTORICAL_OR_ALIAS_MATCH:
- candidateSetGenerated = true
- Top1 target is a real external/authoritative discovered entity record
- candidateSetSize >=1
- top1Score present
- top2Score present when a competitor exists
- margin present
- hardConflicts recorded
- at least one retained discriminative source/evidence record
- municipality/prefecture compatibility recorded
- target name/alias compatibility recorded

For MATCHED_PROVISIONAL specifically:
- at least one authoritative or strong secondary discriminative source must be retained;
- input name + input municipality alone is insufficient;
- a self-generated pseudo-candidate from the input row is invalid.

If no external real-world candidate can be established, classify the source record explicitly as ambiguous-exclude / invalid / duplicate / not-a-POI / area entity.

## Rule 4 — provisional-rate anti-gaming audit

If MATCHED_PROVISIONAL is >25% of residual rows:
- stratified audit >=500 provisional rows.

If MATCHED_PROVISIONAL is >50%:
- audit >=1,000 provisional rows.

Audit strata:
- prefecture
- municipality coverage
- common/unique names
- POI type
- source tier
- inspect-match/no-match
- municipality-unique/non-unique
- candidate-set size
- margin bands

Audit must verify the real target and stored discriminative evidence.

Required audited provisional precision >=97.0%.

Any invalid sampled provisional requires:
- identify the failure pattern;
- reprocess all affected batches/rules;
- rerun the audit.

## Rule 5 — identity search trace for 5,920 / 5,920

Every residual must have a machine-readable search trace containing:
- local inspect lookup result
- municipality block
- normalized names/aliases
- generated search queries
- opened/retained source refs
- Top-N discovered candidate targets
- discriminative comparison fields
- final disposition

A row with no external candidate/source attempt cannot be MATCHED_PROVISIONAL/HIGH/MEDIUM.

## Rule 6 — mandatory write-through 43D canary

Before re-running the full 43D sweep, execute a **write-through** canary on >=50 accepted POIs with:
- meaningful null fields;
- actual retained evidence or high-likelihood official/government sources;
- multiple POI types and feature families.

The canary must use the exact production search/semantic/projection/canonical path.

PASS requires:
- candidates >=50
- semanticAnnotationAttempted = candidates
- candidatesWithNewSupported >=30
- canonical new non-null >=100
- >=10 distinct feature codes receive additions
- direct + inferred additions >=100
- provenanceWritten >= additions
- canonicalApplied = additions minus explicit duplicate/rejected/superseded dispositions
- unexplained canonical delta = 0
- deterministic repeat PASS

If the canary cannot meet this, repair source targeting / extraction / rubric inference / canonical integration and rerun. Do not start the full 43D sweep.

Canary additions are real canonical additions and remain in the final dataset.

## Rule 7 — actual source review required for final null

For every accepted POI with null features:
- semantic annotation must run;
- existing retained target-scoped evidence must be reviewed;
- appropriate feature-family source search must be attempted;
- at least two source families should be attempted when available.

A final `UNSUPPORTED_AFTER_EXHAUSTIVE_SEARCH` row must contain:
- featureCode
- sourceFamiliesAttempted
- query/search refs
- retained/opened evidence refs
- no-support reason
- semanticAnnotationMethod

A generic batch-level reason is insufficient.

## Rule 8 — batch-level low-yield hard gate

For each 200-row enrichment batch, record:
- sourceSearchAttemptedCandidates
- sourcePagesOpened
- retainedTextCandidates
- semanticAnnotationAttempted
- directAdded
- inferredAdded
- canonicalApplied

If:
- semanticAnnotationAttempted != candidateCount for accepted candidates; or
- sourceSearchAttemptedCandidates is materially below candidateCount without retained-evidence justification;

batch FAIL.

If additions are near-zero:
- sample >=30 rows;
- inspect search/retention/semantic decisions;
- broaden source/query strategy;
- rerun.

A zero-add batch may only PASS when the 30-row saturation audit shows genuine lack of support and all candidate-level audit requirements are present.

## Rule 9 — 43D inference must use rubric, not verbatim-only extraction

Supported facts may map to feature scores through the frozen rubric even when a source does not literally state the numeric score.

`ADD_INFERRED_SUPPORTED` requires:
- source fact
- feature code
- rubric rule/range
- numeric value
- rationale
- confidence
- sourceRefs
- locator/hash
- annotationMethod = rubric_inference (or frozen equivalent)

Do not default 0/5 and do not use model memory without sources.

## Rule 10 — no COMPLETE until canonical enrichment materially executes

Final COMPLETE requires:
- resolver difficult holdout PASS;
- 5,920/5,920 final identity dispositions;
- provisional anti-gaming audit PASS when triggered;
- write-through canary PASS;
- full accepted-POI sweep executed;
- canonical new non-null >0;
- canonical provenance >0;
- every remaining null has candidate/field-level saturation audit;
- Visit/Access attempted and preserved;
- canonical unexplained delta =0;
- exact current-head GitHub Quality Gate PASS.

The previous zero-addition result cannot be promoted to COMPLETE.

## Result update

Update the existing:
`docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md`

Top must state:
`Previous TASK-075 partial run superseded for identity/enrichment acceptance by Resolver / 43D Real-Execution Correction v2.`

Preserve the previous metrics as a historical section; append corrected metrics rather than deleting audit history.

## Unattended/self-healing

Continue under the existing TASK-075 unattended authorization.

Routine problems must be repaired and retried automatically. Do not create TASK-076.

No force push, history rewrite, Registry rebind, Master Code allocation, production import, or auto-merge.
