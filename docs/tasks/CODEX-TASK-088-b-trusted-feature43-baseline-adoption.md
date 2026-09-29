# CODEX — TASK-088-B Trusted Feature43 Baseline Adoption

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#455

Read:

```bash
git show origin/docs/task-088-b-trusted-feature43-baseline:docs/design/feature43-trusted-internal-baseline-policy.md
git show origin/docs/task-088-b-trusted-feature43-baseline:docs/tasks/TASK-088-b-trusted-feature43-baseline-adoption.md
```

Start from latest develop on:

```text
feature/b-trusted-feature43-baseline
```

Core decision:

The user explicitly trusts the existing internal Feature43 database.

Do not perform per-field promotion.

Do not require field-level provenance to use the existing internal score as the baseline.

For the exact 100 admitted Canonical POIs:

1. bind the matching historical v1.66 Feature43 row by exact identity;
2. copy the existing 43 internal baseline score values as-is;
3. validate exact 43-code mapping and 0–9 domain;
4. bind the output to the exact Canonical 100 IDs and Master Codes;
5. create a versioned trusted baseline overlay and manifest;
6. preserve historical workbook/source hash and revision;
7. generate deterministic QA;
8. compare the 17 PR #437 Draft inferred values against the trusted baseline, but do not average or replace the baseline with them.

Expected if the database is complete:

```text
100 POIs
43 fields each
4300 / 4300 baseline cells
100 / 100 POIs at 43/43
```

Important semantic boundary:

```text
TRUSTED_INTERNAL_BASELINE != LIVE_FACT
```

crowd / queue / weather / accessibility / seasonal and similar values are baseline ratings.

A fresher runtime fact overrides baseline.

Do not authorize arbitrary candidate POIs.

Only existing admitted Canonical POIs may receive the trusted baseline.

Do not:
- change Canonical IDs;
- change Master Codes;
- create a new Feature43 registry;
- run a new web enrichment;
- apply evidence-promotion gates;
- replace missing values with invented defaults;
- claim scoring calibration quality;
- auto-merge.

Required QA:

- exact 100 identity matches
- exact 4300 cells
- 43/43 for each POI
- valid 0–9 domain
- zero ambiguous mappings
- zero unexplained deltas
- deterministic rebuild
- source workbook hash pinned
- candidate boundary intact
- full regression
- exact-head Quality Gate

Create Draft PR and stop.

Return:

```text
BASE_DEVELOP
FINAL_HEAD
DRAFT_PR
trusted source revision/hash
100/100 identity mapping
4300/4300 cells
100/100 43-of-43 POIs
per-feature coverage
PR #437 equal/different count
tests
Quality Gate
remaining blockers
```
