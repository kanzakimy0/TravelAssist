# CODEX — TASK-050-A Canonical POI Schema / Validator / Candidate Admission

Repository: `https://github.com/kanzakimy0/TravelAssist`

Issue: `#399`

WBS: `7.4`

## Start

Use a dedicated clean worktree/clone. Do not disturb any existing dirty Planner/Step workspace.

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Forbidden:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Read the full Task from the publication branch:

```bash
git show origin/task/a-task-050-poi-canonical-schema:docs/tasks/TASK-050-a-poi-canonical-schema.md
```

Read the WBS amendment:

```bash
git show origin/task/a-task-050-poi-canonical-schema:docs/project/WBS-7.4-poi-canonical-schema-amendment.md
```

## Execution branch

Create from execution-time latest clean `origin/develop`:

```text
codex/a-poi-canonical-schema
```

Do NOT implement from the Task publication branch.

## Mandatory preflight

Confirm:

1. WBS 7.2 is completed.
2. WBS 7.4 is not already completed/superseded by newer work.
3. Canonical Master Code Registry exists.
4. Region Graph canonical contracts exist.
5. Existing Planning POI/Feature/Visit Profile contracts are readable.
6. Current B POI candidate/enrichment work is treated read-only and is not modified/stacked/cherry-picked merely for this Task.

If 7.4 has already been implemented by newer accepted work, return Blocked / Superseded and STOP.

## Core rule

Build exactly one provider-independent Canonical POI contract and a fail-closed candidate admission boundary.

Do not create:

- second 43-feature codebook;
- second Master Code system;
- second Region identity system;
- second Planning POI projection;
- provider-specific POI domain contract.

## Identity rule

Preserve:

```text
POI Internal ID
!= Master Code
!= candidateKey
!= destination/asset slot
!= Provider ID
!= Region ID
!= Transport Node ID
!= AI Local ID
!= DB PK
```

## Candidate boundary

Candidate data must never become canonical solely because it has:

- an assigned candidateKey;
- partial 43-feature values;
- a Provider ID;
- a retained evidence page;
- an old-code claim.

Promotion must pass the Task admission gates.

## Provider/licensing boundary

Do not call any live/paid Provider.

Do not treat WBS 7.2's preferred candidate as production-approved persistence rights.

Provider Raw, transient-only fields and fields with unknown retention rights must not silently enter Canonical POI.

## Required implementation

Follow the complete Task. At minimum produce:

```text
canonical POI shared contract
strict validator/parser
canonical fixtures
candidate admission types/helper
canonical -> PoiPlanningProjectionV1 adapter
docs/architecture/poi-canonical-schema-v1.md
docs/qa/TASK-050/schema-audit.json
docs/qa/TASK-050/admission-fixtures.json
docs/qa/TASK-050/compatibility-report.json
docs/qa/TASK-050/pilot-report.md
tests/task-050-a-poi-schema.test.mjs
docs/tasks/RESULT-TASK-050-a-poi-schema.md
```

Update latest Master WBS minimally:

```text
7.4 -> 进行中
then -> 待审查 after implementation + QA + Draft PR
```

Preserve all unrelated A/B WBS updates.

## Regression

Run all current canonical equivalents required by the Task, including:

```text
npm ci
TASK-050 focused
Planning Contracts
Planning Soak
Master Code Registry
Region Graph
Routing
Trip / Engine focused
full Node
lint
typecheck
build
current deployment validation/artifact gates
TASK-owned Prettier
git diff --check
```

If Candidate Pipeline is not merged into execution-time develop, do not stack its Draft PR just to run its tests.

## Publication

Commit and push:

```text
codex/a-poi-canonical-schema
```

Create one Draft PR:

```text
codex/a-poi-canonical-schema -> develop
```

Update Issue #399 with the complete result.

Do not auto-merge.
Do not close #399.
Do not start 7.6 / 7.7 / 7.9.

Return the complete:

`docs/tasks/RESULT-TASK-050-a-poi-schema.md`

Then STOP.
