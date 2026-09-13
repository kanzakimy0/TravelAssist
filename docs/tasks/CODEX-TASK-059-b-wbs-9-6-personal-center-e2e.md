# CODEX — TASK-059-B / WBS 9.6 Personal Center E2E

Execute the formal Task exactly as published. Do not implement from this specification branch.

## Repository

```text
https://github.com/kanzakimy0/TravelAssist
```

## Tracking

- Task: `TASK-059-B`
- WBS: `9.6`
- Issue: `#364`
- Spec branch: `task/b-wbs-9-6-personal-center-e2e`
- Planned implementation branch: `codex/b-account-wbs-9-6-personal-center-e2e`
- Result: `docs/tasks/RESULT-TASK-059-b-wbs-9-6-personal-center-e2e.md`

## 1. Preflight

Run first:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Forbidden throughout this Task:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

If the current worktree contains unrelated user changes, preserve them. Do not delete, reset, stash destructively, or absorb them into this Task.

## 2. Read the authoritative remote Task

Read directly from the spec branch:

```bash
git show origin/task/b-wbs-9-6-personal-center-e2e:docs/tasks/TASK-059-b-wbs-9-6-personal-center-e2e.md
```

Then read execution-time latest canonical state from `origin/develop`, including:

```bash
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/tasks/RESULT-TASK-055-b-wbs-9-5-personal-center-unit-integration-qa.md
git show origin/develop:docs/qa/TASK-055/gap-report.md
git show origin/develop:package.json
```

Also read the full TASK-055 QA inventory/matrix/README and the current repository browser/E2E infrastructure required by TASK-059.

## 3. Dependency / Supersession Gate

Before implementation, confirm from latest `origin/develop`:

- B-owned 5.x prerequisites needed by Personal Center are completed;
- 8.2 completed;
- 8.3 completed;
- 8.6 completed;
- 9.5 completed;
- 9.6 has not already been completed/superseded by another Task;
- Issue #364 remains the canonical TASK-059-B issue.

If a newer canonical change supersedes the Task or removes a prerequisite, do not guess. Return precise `Blocked`/supersession evidence.

## 4. Create the implementation branch from latest develop

Do **not** branch from the Task/spec branch.

From execution-time latest clean `origin/develop`, create/switch to:

```text
codex/b-account-wbs-9-6-personal-center-e2e
```

Use a normal branch creation workflow without rewriting published history.

Once the prerequisite gate passes and actual implementation begins, update WBS 9.6 to:

```text
进行中（#364 / TASK-059-B）
```

Preserve all unrelated WBS edits.

## 5. Execute the formal Task

The formal Task is the authority. In particular:

- reuse the canonical repository E2E/browser framework; do not add a second framework merely for 9.6;
- audit the current browser harness/runtime first;
- implement the full J1–J8 Personal Center browser journeys;
- use real Local Supabase/Auth for mandatory persisted/authenticated journeys;
- use at least two distinct synthetic Local users for browser-level isolation;
- cover desktop and mobile Personal Center navigation using accepted repository viewport definitions;
- complete the disposable-user browser account-deletion lifecycle;
- use accepted B Trip Library fixtures/contracts without inventing A WBS 8.5 or crossing into WBS 9.8;
- keep WBS 9.7 Preference→Planner E2E and WBS 9.8 Planner→Save→Personal Center E2E out of scope;
- do not mutate Production/Staging or external booking/provider systems;
- create a stable `test:personal-center:e2e` entry point unless execution-time canonical naming clearly supersedes it;
- run the complete mandatory primary-browser aggregate twice and prove deterministic counts;
- execute additional canonical browser engines when actually supported, otherwise record exact Deferred evidence rather than claiming PASS;
- preserve TASK-055 unit/integration baselines and rerun them as required;
- clean synthetic users/data and browser/server/Local runtime processes.

If browser infrastructure or mandatory primary-browser execution is unavailable, do not silently skip. Return `Partial`/`Blocked` with evidence.

## 6. Required evidence

Create/update at least:

```text
docs/qa/TASK-059/README.md
docs/qa/TASK-059/browser-harness-inventory.json
docs/qa/TASK-059/e2e-matrix.json
docs/qa/TASK-059/journey-results.json
docs/qa/TASK-059/browser-matrix.json
docs/qa/TASK-059/quality-gates.json
docs/tasks/RESULT-TASK-059-b-wbs-9-6-personal-center-e2e.md
```

Do not commit secrets, Auth tokens, real user identifiers, or unnecessary large screenshots/videos/traces.

## 7. Required final validation

Follow the formal Task's Mandatory QA Sequence. At minimum, the final candidate must accurately record:

- `npm ci`;
- baseline/candidate full repository tests;
- accepted TASK-055 Personal Center non-Local aggregate;
- accepted TASK-055 Personal Center Local aggregate;
- relevant existing browser baseline/smoke;
- J1–J8 primary-browser E2E;
- desktop/mobile journey;
- two-user browser isolation;
- destructive disposable account deletion;
- supported browser matrix;
- `test:personal-center:e2e` run #1;
- cleanup/re-establishment as needed;
- `test:personal-center:e2e` run #2;
- deterministic comparison;
- lint;
- typecheck;
- build;
- current canonical local deployment validation/build/artifact gates;
- scoped formatting;
- `git diff --check`;
- final synthetic-data/process/Local runtime cleanup;
- exact final-head GitHub Quality Gate.

Use the execution-time canonical commands if names changed and document the mapping.

## 8. Publish candidate for review only

When implementation and mandatory QA are complete:

1. update WBS 9.6 to:

   ```text
   待审查（#364 / TASK-059-B；Draft PR #<number>）
   ```

2. complete the Result file;
3. commit and push the implementation branch;
4. open a **Draft PR** to `develop`;
5. PR body must use `Refs #364`, not `Closes #364`;
6. obtain and record the exact final-head GitHub Quality Gate result;
7. if CI/evidence causes a final tracking-only commit, ensure the recorded exact-head gate corresponds to the actual final candidate head;
8. stop.

Do **not** merge the PR.
Do **not** close Issue #364.
Do **not** set WBS 9.6 to `已完成`.
Do **not** start 9.7, 9.8, 4.22, 6.14, 8.8, or another downstream Task.

Only the user may accept the result and separately authorize merge/closeout.

## 9. Final Codex response

Return a concise structured summary containing:

- Status: Completed / Partial / Blocked for review readiness;
- execution baseline and final head;
- Issue #364;
- implementation branch;
- Draft PR URL/number;
- E2E harness/browser matrix;
- J1–J8 summary;
- primary aggregate run #1/#2 counts;
- Local user/isolation/account deletion result;
- TASK-055 regression result;
- full repo/lint/typecheck/build/deploy/diff results;
- exact final-head Quality Gate URL/status;
- cleanup result;
- Production/Staging/external mutation = No;
- WBS 9.6 = `待审查` if candidate is review-ready;
- downstream Task started = No;
- Result file path.
