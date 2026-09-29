# CODEX — TASK-087-B Canonical Feature43 Legacy Recovery Audit

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#452

Task:
docs/tasks/TASK-087-b-canonical-feature43-legacy-recovery.md

## Start

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Read the task from the task-spec branch before implementation:

```bash
git show origin/docs/task-087-b-canonical-feature43-legacy-recovery:docs/tasks/TASK-087-b-canonical-feature43-legacy-recovery.md
git show origin/docs/task-087-b-canonical-feature43-legacy-recovery:docs/project/WBS-TravelAssist.md
```

Also read current:

- TASK-083-A / PR #444 Canonical Pilot-100
- TASK-081-B / Draft PR #437
- TASK-084-A / Draft PR #451
- Feature43 contract
- Canonical POI contract
- current candidate manifest
- historical TASK-068 through TASK-075 results and QA

## Execution branch

Create from latest develop:

```text
feature/b-canonical-feature43-legacy-recovery
```

Do not build from PR #437.

PR #437 may be read as an unmerged reference input only.

## Core instruction

Do not redo 100 POIs from scratch.

For the exact admitted Canonical Pilot-100:

1. inventory the entire historical POI / Feature43 corpus;
2. build exact identity crosswalks;
3. recover every historical 43D numeric observation and provenance chain;
4. emit exactly 4,300 cell-level promotion decisions;
5. promote only values that pass current identity / semantic / provenance / rights / conflict gates;
6. preserve null otherwise;
7. build a proposed recovery overlay v2;
8. report whether #437 should be superseded, merged first, incorporated/closed, or remain Draft.

Historical candidate values are evidence candidates, not Canonical authorization.

Never:
- name-match only
- candidateKey → Canonical without identity proof
- null → 0/5
- average conflicting values
- copy incompatible old rubric values
- create a second Feature43 registry
- auto-merge

## First pass: repository-only

The first pass must use existing repository artifacts before doing any new external research.

Search at least:

```text
data/poi/full/features/batch-*.jsonl
data/poi/full/reviews/**
data/poi/full/sources/**
data/poi/full/manifests/**
v1.66 workbook / frozen derivatives
TASK-068 .. TASK-075 artifacts
PR #437 artifacts
```

## Required output metrics

Return at least:

```text
BASE_DEVELOP
FINAL_HEAD
DRAFT_PR

Canonical POIs
Canonical IDs with legacy match
NO_LEGACY_MATCH
ambiguous identity joins

historical numeric observations
unique cells with historical numeric values

P0 provenance
P1 provenance
P2 provenance
P3 provenance

PROMOTE_AS_IS
PROMOTE_REVALIDATED
KEEP_CURRENT_CANONICAL
CONFLICT_REVIEW_REQUIRED
LEGACY_VALUE_NO_PROVENANCE
LEGACY_VALUE_SCHEMA_MISMATCH
NO_LEGACY_VALUE
REJECTED

proposed final non-null cells
43/43 POIs
unexplained delta

per-feature before/found/promotable/final coverage
deterministic rebuild
full regression
exact-head Quality Gate

recommendation for PR #437
remaining blockers
```

Keep the PR Draft. Do not merge.
