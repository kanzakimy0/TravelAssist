# CODEX — TASK-040-A Blind Review Excel Pack / Import Bridge

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#303
```

Task:

```text
TASK-040-A
```

WBS:

```text
7.9
```

## Start

Before changing anything:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/a-poi-scoring-blind-review
git log --oneline -20 origin/develop
git log --oneline -10 origin/codex/a-poi-scoring-blind-review
```

Do not use:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Read the complete Task from the publication branch:

```bash
git show origin/task/a-task-040-blind-review-excel-pack:docs/tasks/TASK-040-a-blind-review-excel-pack.md
```

## Branching

If PR #302 is still unmerged:

- create an isolated worktree/clean clone;
- create `codex/a-blind-review-excel-pack` from latest `origin/codex/a-poi-scoring-blind-review`;
- merge latest `origin/develop` normally;
- preserve TASK-039 files exactly;
- TASK-040 Draft PR targets `codex/a-poi-scoring-blind-review`.

If #302 is already merged, create from latest `origin/develop` and target `develop`.

Do not touch the user's dirty primary Planner/Step workspace.

## Deliverables

Generate exactly:

```text
docs/qa/TASK-040/reviewer-r1-blind-review.xlsx
docs/qa/TASK-040/reviewer-r2-blind-review.xlsx
```

Each workbook:

- 144 Review rows in source-pack order;
- Review / Instructions / Metadata sheets;
- readable professional formatting;
- frozen header / sensible panes;
- filters;
- clickable source links where supported;
- Choice dropdown: A / B / TIE / INSUFFICIENT_INFO;
- Confidence dropdown: high / medium / low;
- Choice / Confidence / Note blank in committed files;
- question cells protected against accidental edits where practical.

Implement a deterministic XLSX generation/import bridge and tests as defined in the Task.

If no XLSX library exists, at most one development-only library may be added. Do not add a runtime/browser spreadsheet dependency.

## Critical human boundary

YOU ARE NOT R1 OR R2.

Do not fill any reviewer answer.
Do not infer what a human should answer.
Do not create fake reviewer response JSON.
Do not create Human Gold.
Do not evaluate candidate-0457.

Synthetic answers may be used only inside tests/temporary fixtures and must never be committed as human judgments.

## Leakage boundary

Reviewer workbooks must not reveal:

```text
candidate-0457
parameter values
gamma
weights
engine score
rank
score gap
machine benchmark expected answer
machine confidence
POIFeature numeric values
archetypeTags
calibration/holdout partition
internal review map
machine reason codes
```

Run and commit the leakage audit required by TASK-040.

## Import validation

The importer must fail closed on altered question content, wrong pack SHA, wrong reviewer, missing/unknown/duplicate blind IDs, invalid values, incomplete final submission, formulas/errors in answer fields, unexpected rows, or hidden/internal fields.

Its output must conform to TASK-039 canonical response JSON.

## Validation

Run at least:

```bash
npm ci
npm run test:planning-contracts
npm run test:planning-soak
npm run test:routing
npm run lint
npm run typecheck
npm run build
git diff --check
```

Also run:

- TASK-040 focused tests;
- TASK-039 focused tests;
- relevant TASK-038 tests;
- current Trip / Route / Engine contract suites;
- canonical full Node regression;
- TASK-owned Prettier check.

## Finish

Create:

```text
docs/qa/TASK-040/workbook-manifest.json
docs/qa/TASK-040/excel-leakage-audit.json
docs/tasks/RESULT-TASK-040-a-blind-review-excel-pack.md
```

Update Master WBS, but keep WBS 7.9 as `待人工盲审` or equivalent.

Commit and push the existing implementation branch.
Create one Draft PR only.
Update Issue #303.
Do not auto-merge.

Return the full TASK-040 Result, including workbook SHA-256 hashes, validation results, PR status, and the exact next human action.

Then STOP.