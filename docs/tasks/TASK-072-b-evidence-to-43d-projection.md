# TASK-072-B — POI Evidence → 43D Projection Hard-Gated Extraction

## Status
Authorized for unattended execution.

- Issue: #409
- Owner: B
- Upstream PR: #408
- Upstream branch: `codex/b-task-071-official-sns-43d-enrichment`
- Upstream head: `b3ce290e0ccaf2c9d6128e94216c6e4b2fbd46db`
- Upstream Quality Gate: run `35557538106` = SUCCESS
- Publication branch: `task/b-task-072-evidence-to-43d-projection`
- Planned execution branch: `codex/b-task-072-evidence-to-43d-projection`

## Purpose
Fix the exact failure mode in TASK-071-B: source discovery/full-text review completed, but 43D extraction/provenance projection/Visit/Access writeback did not occur.

This task may only PASS if extraction and projection actually run.

## Upstream evidence facts
- candidates: 10,097
- frozen batches: 53
- source pages opened: 31,281
- full-text reviewed candidates: 9,878
- retained text: 2,645
- locator/hash records: 2,645
- identity decisions reported: 25
- TASK-071 new non-null 43D: 0
- TASK-071 provenance: 0
- TASK-071 Visit additions: 0
- TASK-071 Access additions: 0

## Frozen population / order
Reuse the exact TASK-071 10,097 population and 53 frozen batch membership/order.

Priority grouping remains:
1. 6,049 TARGET_IDENTITY_UNRESOLVED
2. 165 IDENTITY_CONFLICT
3. 1,422 REVIEWED_TARGET_NO_SUPPORTED_FACT
4. 2,461 UNSUPPORTED_FIELDS_REMAIN_NULL

## Mandatory preflight canary
Before full unattended execution:

### Positive controls
Use >=20 candidates that already have non-null features + valid provenance from pre-TASK-071 data.

Dry-run/read-only projector must prove:
- rubric loads;
- current feature sidecars load;
- retained/source evidence loads;
- at least one existing supported feature/provenance relation can be reproduced;
- existing values are preserved.

### Retained-text controls
Use >=20 TASK-071 retained-text candidates.

Each control must produce exactly 43 field decisions.

### Preflight PASS requires
- positive-control parse/reproduction PASS;
- rubricVersion exact;
- retained evidence hash validation PASS;
- featureDecisionCount = 43 × control candidate count;
- projector schema validation PASS;
- deterministic repeated dry-run PASS;
- Registry/Master Code/candidateKey unchanged.

Any failure = STOP. Do not start 10,097 full run.

## Per-candidate hard requirement
Every candidate must produce exactly 43 feature decisions.

Each decision must include:
- featureCode
- currentValue
- proposedValue|null
- disposition:
  - PRESERVE_SUPPORTED
  - ADD_SUPPORTED
  - SUPERSEDE_SUPPORTED
  - UNSUPPORTED_REMAINS_NULL
  - IDENTITY_BLOCKED
  - SOURCE_CONTRADICTORY
- evidenceRefs
- sourceTier
- confidence
- rationale
- rubricVersion
- annotationMethod
- locator/hash OR explicit no-evidence reason

Candidate complete only if featureDecisionCount == 43.

## Writeback
For ADD/SUPERSEDE non-null:
- write authoritative candidate feature sidecar;
- write full provenance;
- preserve sourceRef/content hash/locator-hash;
- preserve frozen rubric semantics.

For existing supported non-null:
- preserve by default;
- only supersede with stronger contradictory evidence + explicit supersession record.

For null:
- keep null;
- write field-level reason.

Never default 0 or 5.

## Identity projection
TASK-071 reported 25 identity decisions but pending counts did not update.

TASK-072 must:
- reconcile those decisions;
- project supported candidate-level disposition changes;
- keep candidateKey unchanged;
- keep Registry unchanged;
- keep formal Master Code allocation = 0;
- keep old-code claims unchanged;
- cite evidence for every transition.

Before final PASS, identityResolvedCount and pending/disposition counts must reconcile mathematically.

## Visit / Access
Attempt for all 10,097 candidates:
- Visit Profile extraction;
- Access Anchor/static access extraction.

No support => explicit no-supported-fact disposition.

No live/current operational fact may be promoted into static master truth.

## Evidence use
Default to existing TASK-071:
- retained text
- source cache
- locator records
- discovery inventory

Only when insufficient for a specific candidate/field may supplemental search occur.

Supplemental accepted evidence must first be retained with text/content hash/locator/provenance.

## Batch execution
Reuse all 53 frozen batches, <=200 candidates each.

Flow:
`load evidence → 43-field extraction → identity projection → Visit/Access extraction → writeback → QA → checkpoint/receipt → auto-next`

No confirmation between normal batches.

## Hard batch FAIL conditions
Fail batch if any:
- expected candidate membership/count mismatch;
- candidate missing;
- any candidate featureDecisionCount != 43;
- featureExtractionAttemptedCount != candidateCount;
- ADD/SUPERSEDE non-null lacks provenance;
- new non-null lacks locator/hash or preserved equivalent evidence;
- score outside 0..9;
- null becomes 0/5 without evidence;
- identity transition lacks evidence;
- candidateKey/Registry/Master Code changes;
- output non-deterministic;
- receipt written before outputs;
- corruption/resume test fails.

### Anti-repeat gate
If retainedTextCount > 0 and featureExtractionAttemptedCount == 0 => FAIL.

If newNonNullFeatureCount == 0, batch may PASS only when:
- every candidate has exactly 43 decisions;
- every null has a reasoned disposition;
- positive-control projector remains healthy;
- extraction stage definitely executed.

## Required batch telemetry
- phase
- batchId
- candidateCount
- evidenceLoadedCandidateCount
- retainedTextCount
- featureExtractionAttemptedCount
- featureDecisionCount
- candidatesWithAtLeastOneSupportedFeature
- preservedNonNullCount
- newNonNullFeatureCount
- supersededFeatureCount
- provenanceWrittenCount
- locatorHashValidatedCount
- identityDecisionAttemptedCount
- identityDispositionUpdatedCount
- visitExtractionAttemptedCount
- visitProfileAddedCount
- accessExtractionAttemptedCount
- accessAnchorAddedCount
- supplementalSearchCandidateCount
- supplementalOfficialSourceCount
- supplementalOfficialSNSCount
- unsupportedNullDecisionCount
- contradictorySourceCount
- reviewErrorQueueCount
- input/evidence/output checksums
- Registry checksum before/after
- candidate identity checksum before/after
- model/reasoning config
- elapsed time

## Unattended authorization
After preflight PASS, the user explicitly authorizes unattended execution for TASK-072 only.

Allowed:
- create/recreate one TASK-072 heartbeat automation;
- auto-next after batch QA PASS;
- ordinary non-force push to TASK-072 execution branch;
- resume checksum-identical batches;
- delete heartbeat on completion or hard blocker.

Not allowed:
- force push
- merge
- push develop/main
- create unrelated task
- Master Code allocation
- Registry rebind
- production import
- issue closure

Non-fast-forward/divergence/auth failure requiring destructive action => STOP.

## Final acceptance
TASK-072 may only be COMPLETE if all:
1. 10,097/10,097 candidates processed.
2. Exactly 434,171 feature decisions (10,097 × 43).
3. featureExtractionAttemptedCount = 10,097.
4. Every new/superseded non-null has provenance.
5. Identity counts reconcile.
6. Visit/Access extraction attempted for all candidates.
7. Registry checksum unchanged.
8. Candidate identity integrity preserved.
9. Deterministic final rebuild/check PASS.
10. Exact final-head GitHub Quality Gate PASS.
11. Mandatory visible Result Markdown complete.

Otherwise final status must be BLOCKED/PARTIAL, never COMPLETE.

## Mandatory visible Result Markdown
The file MUST exist from publication and be updated throughout execution:

`docs/tasks/RESULT-TASK-072-b-evidence-to-43d-projection.md`

Final Result must include:
- Status
- branch / Draft PR / final head / Quality Gate
- preflight controls
- 53-batch summary
- exact 434,171 decision total
- scored POI before/after
- non-null before/after
- new/superseded feature counts
- per-feature coverage
- >=1 / >=10 / >=20 / >=30 / 43-of-43 coverage
- identity before/after
- Visit / Access before/after
- provenance / locator stats
- supplemental source stats
- remaining null reasons
- errors/review queue
- Registry/candidate checksums
- explicit completion/blocker statement

No complete Result Markdown = TASK FAIL.

## Git
While PR #408 remains unmerged:
- execution branch: `codex/b-task-072-evidence-to-43d-projection`
- Draft PR base: `codex/b-task-071-official-sns-43d-enrichment`

Do not auto-merge.


## Identity Resolution Amendment v1

The user has clarified that the 6,049 `TARGET_IDENTITY_UNRESOLVED` candidates must not remain frozen merely because perfect official retained text is unavailable.

Authoritative amendment:

`docs/tasks/AMENDMENT-TASK-072-b-identity-resolution-second-pass-v1.md`

TASK-072-B must apply that amendment during Phase A.

Required candidate-level identity dispositions:

- `RESOLVED_HIGH`
- `RESOLVED_MEDIUM`
- `SECOND_PASS_REQUIRED`
- `IDENTITY_CONFLICT_HOLD`

`RESOLVED_HIGH` and `RESOLVED_MEDIUM` are candidate-level enrichment decisions only. They do not allocate Master Codes or rebind the canonical Registry.

Every resolved candidate must immediately continue into 43D / Visit / Access extraction.

Candidates that still cannot be safely assigned after reasonable search must be written to:

- `docs/qa/TASK-072-B/identity-second-pass.md`
- `docs/qa/TASK-072-B/identity-second-pass.jsonl`

Phase A cannot be considered complete while candidates silently remain in the old broad `TARGET_IDENTITY_UNRESOLVED` bucket.

Required reconciliation:

```text
6049
= RESOLVED_HIGH
+ RESOLVED_MEDIUM
+ SECOND_PASS_REQUIRED
+ IDENTITY_CONFLICT_HOLD
```
