# CODEX — TASK-088-A Trusted Feature43 Baseline Runtime Adoption

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#455

Owner:
A

Task-spec branch:
docs/task-088-a-trusted-feature43-baseline

Read:

```bash
git show origin/docs/task-088-a-trusted-feature43-baseline:docs/design/feature43-trusted-internal-baseline-policy.md
git show origin/docs/task-088-a-trusted-feature43-baseline:docs/tasks/TASK-088-a-trusted-feature43-baseline-runtime-adoption.md
```

Start from latest develop:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Create:

```text
feature/a-trusted-feature43-baseline-runtime
```

## Core decision

The user explicitly trusts the existing internal Feature43 database.

Do not run per-field promotion.

Do not ask B to regenerate the data.

Reuse TASK-087-B / PR #454's completed audit findings:

- 100/100 exact legacy identity match
- 4,300/4,300 historical Feature43 numeric cells
- source workbook/hash inventory

A's job is runtime adoption.

## Required implementation

For the exact admitted Canonical Pilot-100:

1. bind the existing 43 historical Feature43 values to each Canonical POI;
2. validate exact identity / Master Code / UUID mapping;
3. build a versioned TRUSTED_INTERNAL_BASELINE artifact;
4. bind it to the exact Canonical dataset hash and source workbook hash;
5. integrate it into the server-only Canonical POI repository;
6. ensure candidate-only POIs remain unauthorized;
7. integrate with the existing TASK-084-A Recommendation Scoring Runtime;
8. verify 100/100 Canonical POIs now have 43/43 baseline values;
9. verify 100/100 can enter the scoring runtime;
10. preserve live/current fact precedence over baseline values.

Expected:

```text
100 Canonical POIs
4300 / 4300 trusted baseline cells
100 / 100 at 43-of-43
100 / 100 scorable at Feature43 boundary
```

## Do not

- create a second Feature43 registry;
- change Canonical IDs;
- change Master Codes;
- authorize arbitrary candidate POIs;
- run another web enrichment;
- require field-level provenance promotion;
- average #437 values with baseline;
- describe baseline crowd/queue/weather/accessibility as live truth;
- claim ranking/calibration quality is complete;
- auto-merge.

## #437

Compare its 17 inferred values against the baseline.

Keep them as reference/audit observations.

Trusted internal baseline remains primary unless a later explicit governance decision changes it.

## #454

Treat as completed B audit input.

Do not rewrite its historical finding.

Its old promotion gate no longer blocks runtime adoption.

## QA

Run:

- TASK-088-A targeted tests
- Canonical POI
- Feature43
- TASK-083
- Recommendation Scoring
- Preference
- Planning
- Edge
- governance
- full Node regression
- lint
- typecheck
- build
- deployment validate/build/artifact
- formatting
- git diff --check

Create Draft PR only.

Return:

```text
BASE_DEVELOP
FINAL_HEAD
DRAFT_PR

trusted source workbook revision/hash
100/100 identity mapping
4300/4300 baseline cells
100/100 43-of-43
invalid/out-of-domain cells
ambiguous joins
unexplained deltas

Canonical runtime integration result
100/100 scoring compatibility
live-over-baseline precedence result

PR #437 equal/different count

tests
exact-head Quality Gate
WBS 7.4.3 status
remaining blockers
```

Do not auto-merge.
