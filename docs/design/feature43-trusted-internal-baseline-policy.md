# Feature43 Trusted Internal Baseline Policy

Date: 2026-09-29

## Decision

The existing internal POI Feature43 database is trusted as the authoritative **baseline scoring dataset** for already admitted Canonical POIs.

The project no longer requires every historical Feature43 value to pass a separate per-cell provenance/promotion gate before scoring use.

## Core rule

```text
trusted internal Feature43 dataset
+ exact Canonical identity binding
+ version/hash validation
→ baseline scoring input
```

This is a governance decision about internal scoring data, not a claim that every value is externally published fact.

## Baseline versus live/current facts

Trusted Feature43 values are baseline ratings.

For dynamic or operational attributes:

```text
fresh live/current fact > trusted baseline
```

Examples include:

- crowd
- queue
- accessibility status
- weather
- seasonal operation
- current opening/closure
- current transport conditions

Baseline data must never be presented as current telemetry unless separately verified.

## Identity boundary

Trusting Feature43 does not relax POI identity.

Only already admitted Canonical POIs may receive trusted baseline data.

Required binding uses exact stable identity:

1. Canonical internalId / historical UUID
2. accepted Master Code relationship
3. QID/frozen identity mapping as supporting evidence

Name-only fuzzy matching is not sufficient.

## Candidate boundary

This policy does not authorize arbitrary candidate POIs for runtime use.

Allowed:

```text
admitted Canonical POI
+ exact matching trusted historical Feature43 row
→ trusted Feature43 baseline
```

Not allowed:

```text
candidate-only POI
→ Canonical runtime POI
```

without the normal admission gate.

## Relationship to prior Tasks

### TASK-087-B / PR #454

Keep as the historical audit record.

Its result that 0 values passed the old per-cell promotion policy remains true as an audit conclusion, but that policy no longer determines whether the internal baseline may be used for scoring.

### TASK-081-B / PR #437

Its 17 evidence-backed inferred values remain audit/reference material.

They are not the primary Feature43 source and must not overwrite the complete trusted baseline without a later explicit reconciliation decision.

### TASK-084-A / PR #451

This is the Recommendation Scoring Runtime that should consume the trusted baseline after A integrates it.

## Ownership

B owns the completed offline legacy audit.

A owns:

- baseline runtime adoption
- Canonical repository integration
- Recommendation Scoring integration
- live-over-baseline precedence
- scoring Pilot execution and acceptance

## Principle

```text
Trust the existing Feature43 database as internal scoring data.
Keep Canonical identity strict.
Keep versioning reproducible.
Do not pretend baseline values are live facts.
```
