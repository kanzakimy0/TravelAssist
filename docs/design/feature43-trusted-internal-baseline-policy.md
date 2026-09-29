# Feature43 Trusted Internal Baseline Policy

Date: 2026-09-29

The existing internal POI Feature43 database is trusted as the authoritative **baseline scoring dataset** for already admitted Canonical POIs. This is a dataset-level governance decision, not a claim that every 0–9 rating is an externally verified or current operational fact.

```text
trusted internal Feature43 dataset
+ exact Canonical identity binding
+ version/hash validation
→ baseline scoring input
```

The former per-cell evidence promotion gate is not required for this internal scoring baseline. TASK-087-B / PR #454 remains the historical audit record: its finding of zero values promoted under the former gate is unchanged, but does not block this policy.

## Boundaries

- Only already admitted Canonical POIs with exact internalId, accepted Master Code, historical UUID and frozen identity linkage may receive the baseline. Name-only and coordinate-near joins are insufficient.
- Candidate-only POIs remain unauthorized. A candidateKey cannot substitute for a Canonical internalId.
- The v1.66 source workbook, Canonical dataset, Feature43 registry, runtime manifest and generated artifact are pinned by revision/hash. Any mismatch fails closed.
- The baseline is internal scoring data. The source workbook's reference-only/restricted rights do not authorize public Detail API redistribution of raw ratings.
- TASK-081-B / PR #437's 17 inferred values remain unmerged audit references. They are not averaged with or substituted for the complete baseline.

## Current fact precedence

For dynamic attributes, a fresh same-scale current fact takes precedence over the trusted baseline. This includes crowd, queue, accessibility, weather, season and time suitability when a current 0–9 value with source and validity window actually exists. Stale or absent current facts leave the baseline rating intact.

Operational booleans such as current closure and step-free access are not translated into invented 0–9 scores. They enter the Recommendation Scoring hard-constraint gate. Neither the baseline nor the absence of a live source may override a known current closure or accessibility restriction.

TASK-084-A / PR #451 owns scorer behavior and calibration. TASK-088-A supplies validated Feature43 input; complete data-path coverage is not recommendation-quality acceptance.
