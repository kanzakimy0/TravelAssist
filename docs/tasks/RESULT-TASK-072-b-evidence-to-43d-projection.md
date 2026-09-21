# RESULT — TASK-072-B Evidence → 43D Projection

> This Result file is intentionally created at task publication time so progress and final acceptance are always visible in GitHub.
>
> Codex MUST update this file during execution. TASK-072-B cannot be marked complete without a fully populated final Result.

## Status

**NOT STARTED / AWAITING EXECUTION**

Current acceptance state:

- Task: TASK-072-B
- Issue: #409
- Upstream: PR #408
- Publication branch: `task/b-task-072-evidence-to-43d-projection`
- Planned execution branch: `codex/b-task-072-evidence-to-43d-projection`
- Completion gate: NOT SATISFIED

## Required Final Summary

The final execution MUST replace this section with the authoritative result.

| Metric | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Frozen candidates | 10,097 | TBD | TBD |
| Feature extraction attempted candidates | 0 | TBD | TBD |
| Total 43-field decisions | 0 | TBD | TBD |
| Scored POIs | 2,510 | TBD | TBD |
| Non-null 43D fields | 6,104 | TBD | TBD |
| New non-null fields | 0 | TBD | TBD |
| Superseded fields | 0 | TBD | TBD |
| Provenance records written | 0 | TBD | TBD |
| Identity disposition updates | 0 | TBD | TBD |
| Visit Profile additions | 0 | TBD | TBD |
| Access Anchor additions | 0 | TBD | TBD |

Required exact total feature decisions:

```text
10,097 × 43 = 434,171
```

## Preflight Controls

Must report:

- positive-control candidate count:
- retained-text control count:
- rubricVersion:
- positive-control reproduction:
- retained evidence hash validation:
- 43-decision control validation:
- deterministic repeated dry-run:
- Registry unchanged:
- Master Code unchanged:
- candidateKey unchanged:
- preflight result:

## Batch Completion

Must list all 53 frozen batches.

| Batch | Candidates | Extraction attempted | Feature decisions | New non-null | Provenance | Identity updates | Visit | Access | QA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Batch 1 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| ... | ... | ... | ... | ... | ... | ... | ... | ... | ... |
| Batch 53 | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD | TBD |

A completed batch must satisfy:

```text
featureExtractionAttemptedCount == candidateCount
featureDecisionCount == candidateCount × 43
```

## 43D Coverage

Final Result must include:

- scored POIs before / after;
- total non-null fields before / after;
- new non-null count;
- superseded count;
- preserved non-null count;
- remaining null count;
- per-feature coverage for all 43 codes;
- POI coverage bands:
  - >=1 feature
  - >=10 features
  - >=20 features
  - >=30 features
  - 43/43 features

## Identity Projection

Before:

- TARGET_IDENTITY_UNRESOLVED: 6,049
- IDENTITY_CONFLICT: 165
- TASK-071 reported identity decisions not projected: 25

Final Result must include:

- unresolved after:
- conflicts after:
- projected identity resolutions:
- unresolved reasons:
- mathematical reconciliation:
- Registry rebinds: must remain 0
- formal Master Code allocations: must remain 0

## Visit / Access Projection

Must report:

- visitExtractionAttemptedCount:
- Visit Profile additions:
- accessExtractionAttemptedCount:
- Access Anchor additions:
- static access link additions:
- unsupported/no-supported disposition counts:

## Evidence / Provenance

Must report:

- retained evidence candidates loaded:
- retained text used:
- supplemental search candidates:
- supplemental official source count:
- supplemental official SNS count:
- provenance written:
- locator/hash validated:
- contradictory sources:
- rejected evidence:
- no-evidence reasons:

Every new or superseded non-null feature MUST have complete provenance.

## Errors / Review Queue

Must report:

- batch failures:
- candidate errors:
- contradictory evidence queue:
- identity blocker queue:
- corruption/recovery events:
- unresolved review queue:

## Integrity

Must report exact before/after hashes for:

- canonical Registry
- candidate identity corpus
- frozen population manifests
- rubric
- relevant output manifest(s)

Required invariant:

```text
Registry change = 0
formal Master Code allocation = 0
candidateKey change = 0
```

## GitHub Delivery

Final Result must report:

- execution branch:
- Draft PR:
- final commit:
- exact final head:
- GitHub Quality Gate run:
- Quality Gate conclusion:
- heartbeat deleted:
- auto-merge: false

## Final Acceptance Statement

One of the following must appear explicitly:

### COMPLETE

Only allowed if all TASK-072 hard gates pass, including:

- 10,097/10,097 processed
- 434,171/434,171 feature decisions
- 10,097 extraction attempts
- all new/superseded non-null values have provenance
- identity counts reconcile
- Visit/Access attempted for all
- deterministic final check PASS
- exact final-head Quality Gate PASS

### BLOCKED / PARTIAL

Required if any hard gate is not satisfied.

The final Result must name the exact failed gate(s).