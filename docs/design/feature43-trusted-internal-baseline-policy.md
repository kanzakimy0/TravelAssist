# Feature43 Trusted Internal Baseline Policy

Date: 2026-09-29  
Applies to: TravelAssist POI Feature43 scoring data

## 1. User governance decision

Existing internal POI Feature43 data is trusted as the authoritative **baseline scoring dataset**.

The project will no longer require each historical Feature43 numeric value to pass a separate per-field Canonical promotion gate before it can be used for recommendation scoring.

This supersedes the earlier operational assumption:

```text
historical candidate score
→ field-level provenance replay
→ promotion decision
→ Canonical usable score
```

For trusted internal Feature43, the new rule is:

```text
trusted internal Feature43 dataset
→ exact Canonical identity binding
→ version/hash validation
→ baseline scoring input
```

## 2. What is being trusted

The trusted object is the project's existing internal Feature43 score dataset and its frozen/versioned derivatives.

For the Pilot-100:

```text
100 Canonical POIs
× 43 Feature43 values
= 4,300 trusted baseline score cells
```

The trust decision applies to the score values as internal editorial/model data.

It does not mean every value is an externally published fact.

## 3. Baseline score vs live fact

A Feature43 value may be used as a stable baseline preference signal while a separate runtime fact may override or qualify it.

Examples:

```text
crowd baseline score
+ today's crowd observation
→ runtime crowd fit

queue baseline score
+ current wait-time observation
→ runtime queue fit

weather sensitivity baseline
+ today's forecast
→ runtime weather fit

wheelchair/accessibility baseline
+ current official accessibility status
→ runtime accessibility gate
```

Historical values must never be presented to the user as current/live measurements unless a current source confirms them.

## 4. Identity gate remains strict

Trusting score values does not relax POI identity.

Every trusted Feature43 row must be bound to a Canonical POI using stable identity:

1. exact internal UUID / internalId;
2. accepted Master Code relationship;
3. frozen mapping / QID as supporting identity evidence.

Name-only fuzzy matching is not sufficient.

No ID or Master Code rebinding is allowed.

## 5. Dataset-level governance replaces field-level promotion

Required validation:

- exact dataset version;
- exact source workbook / frozen artifact hash;
- exact 100 Canonical IDs;
- exact 100 Master Codes;
- exactly 43 values per POI;
- values within current domain;
- Feature43 column mapping compatible with current 43-code registry;
- deterministic rebuild;
- no unexplained row/cell mutation.

Not required as a runtime gate:

- field-level evidence locator;
- field-level source hash;
- field-level provenance class P0/P1;
- external publication of the numeric magnitude;
- per-cell PROMOTE_AS_IS decision.

Those may still be retained for audit and future improvement.

## 6. Candidate corpus boundary

This decision does **not** authorize arbitrary candidate POI rows for runtime.

The allowed operation is narrow:

```text
trusted historical Feature43 row
+ exact match to an already admitted Canonical POI
→ trusted Feature43 baseline for that Canonical POI
```

It does not allow:

```text
candidate POI
→ runtime Canonical POI
```

without the existing Canonical identity/admission gate.

## 7. Relationship to TASK-081-B and TASK-087-B

### TASK-081-B / PR #437

Its 17 evidence-backed inferred values remain useful audit/reference material but are not the primary source of truth for the trusted Feature43 baseline.

Do not merge its partial overlay as the main Feature43 dataset if doing so would overwrite the complete trusted baseline.

### TASK-087-B / PR #454

Its audit remains valid:

- historical per-field provenance is weak under the previous evidence-promotion policy;
- field-level replayability is incomplete.

But the result:

```text
PROMOTE_AS_IS = 0
```

no longer means:

```text
Feature43 values cannot be used
```

It means only:

```text
Feature43 values do not satisfy the old external-evidence promotion standard
```

The user has explicitly chosen dataset-level internal trust instead.

## 8. Scoring usage

Recommendation scoring may consume the trusted baseline after:

- exact Canonical identity binding;
- schema validation;
- dataset/version validation;
- runtime integration acceptance.

Scores must preserve dataset revision in trace/output so future calibration or replacement is reproducible.

## 9. Future recalibration

Trusted baseline does not freeze values forever.

Future changes may come from:

- better official evidence;
- user behavior/calibration;
- expert review;
- new scoring rubric;
- live operational data.

Such changes must be versioned and auditable, but do not invalidate the current baseline merely because older per-field provenance is incomplete.

## 10. Principle

```text
Trust the project's existing Feature43 database as internal scoring data.
Do not pretend it is live factual telemetry.
Keep identity, versioning, and reproducibility strict.
```
