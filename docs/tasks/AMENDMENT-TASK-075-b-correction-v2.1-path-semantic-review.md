# AMENDMENT — TASK-075-B Correction v2.1: Path Discovery + Mandatory Semantic Review

## Authority

This amendment supplements and overrides conflicting execution details in TASK-075-B Correction v2.

Do not create TASK-076.

The current blocked state is not a final hard blocker. The missing local inspect path and missing semantic review are routine execution problems that must be solved automatically.

## A. Local inspect-file discovery is mandatory and self-healing

Target filename:

`travelassist-japan-poi-master-registry-v1.52-social-inbound-core-gaps-b235.xlsx.inspect.ndjson`

A prior successful audit on the same project reported this concrete path:

`D:/xwechat_files/wxid_mwmxbrvhta2s22_01ed/msg/file/2026-09/travelassist-japan-poi-master-registry-v1.52-social-inbound-core-gaps-b235.xlsx.inspect.ndjson`

### Discovery order

1. Test the known absolute path above.
2. Test the same path with Windows backslashes.
3. Search only bounded likely roots, not the whole machine blindly:
   - `D:/xwechat_files/`
   - `C:/Users/Administrator/Documents/ChatGPT/`
   - `C:/Users/Administrator/Downloads/`
   - `C:/Users/Administrator/Desktop/`
   - repository parent directories
4. Search by exact filename first.
5. If needed, search by suffix:
   - `*social-inbound-core-gaps-b235.xlsx.inspect.ndjson`

Record:
- pathsChecked
- fileFound
- resolvedAbsolutePath
- fileSize
- lineCount sanity check

Do not stop just because the file is absent from the repository worktree.

### If found

Perform streamed lookup for all 5,920 residuals.

Required:
- inspectLookupAttempted = 5920
- inspectExactKeyMatch
- inspectMunicipalityNameMatch
- inspectAliasMatch
- inspectAddressMatch
- inspectCategoryAssist
- inspectConflict
- inspectNoMatch

Do not commit/copy/modify the 296MB file.

### If truly unavailable in the active machine environment

The task must **not** stop.

Use the already generated audit artifacts:

`docs/qa/POI-IDENTITY-REGISTRY-AUDIT/`

and the known audit summary as the cached inspect-stage result, explicitly recording:

- inspectFilePresent = false
- inspectLookupSource = PRECOMPUTED_AUDIT
- auditResidualPopulation = 5920
- audit exact/high/medium/conflict/no-match metrics

Then continue the resolver with external candidate generation for every row that is not already conclusively resolved by the cached audit.

The inspect source is auxiliary; its physical absence in one execution environment is not a reason to stop the identity resolver.

## B. Difficult resolver calibration still required

Correction v2 difficult calibration remains mandatory:

- >=1,000 known identities
- >=600 tuning
- >=400 untouched holdout
- hard positives/negatives/decoys included
- Recall@5 >=99.0%
- Top1 >=98.5%
- HIGH precision >=99.0%
- MEDIUM precision >=98.0%
- provisional audited precision >=97.0%
- hard-conflict auto-match = 0

Do not reuse the old easy-only 600-row calibration as the final gate.

## C. Semantic review means model/editorial interpretation of target-scoped text

Regex/keyword matching is allowed only to:
- locate potentially relevant passages;
- build search candidates;
- prioritize source snippets for reading.

Regex/keyword matching must **not**:
- directly assign a feature score;
- directly decide no-support/null;
- replace semantic review.

Every semantic annotation that can affect 43D must be produced from the actual retained/opened target-scoped source text and must contain:

- candidateKey
- sourceRef
- sourceTier
- retainedTextRef / locator
- contentHash
- facts[]
- featureCode candidates[]
- rubricMapping[]
- proposedValue or null
- rationale
- confidence
- annotationMethod = `model_semantic_review_v2_1`
- reviewer/model metadata

## D. Mandatory semantic-review canary dataset

Build a write-through canary with >=50 accepted POIs.

Selection must be evidence-rich and diverse:
- multiple POI types
- multiple prefectures
- multiple feature families
- current null fields
- actual retained source text or official/government/tourism pages available

At least:
- 10 history/architecture/cultural-rich
- 10 nature/scenery-rich
- 10 food/shopping/entertainment-rich
- 10 family/relax/adventure/access-rich
- 10 mixed/other

Do not select 50 weak-source rows merely to satisfy count.

## E. Canary execution loop — self-healing, not blocking

For every canary POI:

1. load current identity and feature state;
2. read retained target-scoped evidence;
3. if evidence is weak, actively open official/government/tourism/operator/authoritative secondary sources;
4. retain text + locator/hash;
5. perform model semantic review;
6. map source facts through frozen rubric;
7. produce field decisions;
8. project;
9. canonical apply;
10. reconcile;
11. validate provenance.

PASS target remains:

- candidates >=50
- semanticAnnotationAttempted = candidates
- candidatesWithNewSupported >=30
- canonical new non-null >=100
- >=10 feature codes receive canonical additions
- provenanceWritten >= canonical additions
- unexplained canonical delta = 0
- deterministic projection/rebuild PASS

### If canary misses thresholds

Do **not** return BLOCKED immediately.

Automatically:
- inspect at least 20 failed/no-add rows;
- identify whether the failure is:
  - weak source selection
  - source retrieval
  - wrong target scope
  - annotation prompt/schema
  - rubric mapping
  - projector
  - canonical gate
- repair the responsible layer;
- replace genuinely weak canary rows with evidence-rich accepted POIs if needed while preserving an audit of replaced rows;
- rerun the canary.

Continue bounded remediation iterations until:
- PASS; or
- a true infrastructure/permission blocker prevents further source retrieval or repository execution.

Routine low-yield is not a hard blocker.

## F. Production semantic review

After canary PASS, every accepted POI with remaining null fields must have semantic review.

For each accepted candidate:
- existing retained evidence reviewed;
- feature-family searches attempted;
- source text opened/retained where available;
- model semantic review produced;
- every 43D field receives one explicit decision.

A final null requires field-level:

- featureCode
- sourceFamiliesAttempted
- queries
- openedSources
- retainedSources
- semanticReviewRef
- noSupportReason
- annotationMethod = `model_semantic_review_v2_1`

If no actual semanticReviewRef exists, `UNSUPPORTED_AFTER_EXHAUSTIVE_SEARCH` is invalid.

## G. Per-batch mandatory search/review telemetry

Every accepted-POI 43D batch must record:

- candidateCount
- acceptedCandidateCount
- retainedEvidenceReviewedCandidates
- sourceSearchAttemptedCandidates
- sourcePagesOpened
- retainedTextCandidates
- semanticAnnotationAttempted
- semanticAnnotationWithFacts
- directAdded
- inferredAdded
- canonicalApplied
- provenanceWritten
- finalNullFieldCount

Hard gates:
- semanticAnnotationAttempted = acceptedCandidateCount
- retainedEvidenceReviewedCandidates = acceptedCandidateCount
- every candidate has semanticReviewRef(s)
- no final null without semanticReviewRef

If sourceSearchAttemptedCandidates < acceptedCandidateCount, each non-searched candidate must document that sufficient retained evidence was already available and reviewed.

## H. Identity provisional anti-gaming remains mandatory

Every MATCHED_PROVISIONAL must still have:
- real external Top1 target
- candidateSetGenerated = true
- retained discriminative evidence
- score/margin
- no hard conflict

If provisional remains >50%, >=1,000-row audit is mandatory with >=97% precision.

Rows failing the audit must be reprocessed under corrected resolver rules.

## I. Result requirements

Update:

`docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md`

Add a Correction v2.1 section reporting:

### Inspect
- file discovery attempts
- resolved path or PRECOMPUTED_AUDIT fallback
- inspectLookupAttempted / cached population
- lookup metrics

### Resolver
- difficult calibration
- holdout composition/results
- provisional audit

### Semantic canary
- selection composition
- remediation iterations
- pages opened
- retained texts
- semantic annotations
- canonical additions
- feature codes
- provenance

### Full 43D
- accepted POIs processed
- retainedEvidenceReviewedCandidates
- sourceSearchAttemptedCandidates
- semanticAnnotationAttempted
- semanticAnnotationWithFacts
- direct/inferred additions
- canonical applied
- remaining field-level audited nulls
- all 43 coverage before/after

## J. Completion

TASK-075-B cannot be COMPLETE unless:
- difficult resolver gates PASS;
- 5,920 final identity adjudications are valid;
- inspect stage is either 5,920/5,920 live lookup or documented PRECOMPUTED_AUDIT fallback;
- write-through semantic canary PASS;
- full accepted-POI semantic review sweep completes;
- canonical new non-null >0;
- provenance >0;
- every final null has semanticReviewRef and field-level saturation audit;
- exact current-head GitHub Quality Gate PASS.

Do not create TASK-076.
Do not auto-merge.
Do not allocate Master Codes.
Do not rebind Registry.
Do not production import.
