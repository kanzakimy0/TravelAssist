# CODEX — TASK-053-B / WBS 5.13 Preference Presets / Defaults v1

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#345
```

Spec branch:

```text
task/b-wbs-5-13-preference-presets-defaults
```

Planned implementation branch:

```text
codex/b-account-wbs-5-13-preference-presets-defaults
```

## 0. Safety / workspace

Before doing anything:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Do not continue from the spec branch.

Implementation must branch from the execution-time latest `origin/develop`:

```bash
git switch -c codex/b-account-wbs-5-13-preference-presets-defaults origin/develop
```

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

## 1. Read the authoritative files

```bash
git show origin/task/b-wbs-5-13-preference-presets-defaults:docs/tasks/TASK-053-b-preference-presets-defaults.md
git show origin/task/b-wbs-5-13-preference-presets-defaults:docs/architecture/preference-presets-defaults-v1.md
git show origin/task/b-wbs-5-13-preference-presets-defaults:docs/project/WBS-5.13-preference-presets-defaults-start.md
```

Also read the execution-time latest versions of:

```text
docs/project/WBS-TravelAssist.md
docs/preferences/preference-system.md
src/shared/contracts/preferences/core.ts
src/shared/contracts/preferences/index.ts
src/features/preferences/persistence/canonical-preference-editor.tsx
src/features/preferences/persistence/preference-adapter.ts
src/features/preferences/persistence/use-preference-resource.ts
src/features/preferences/mobility-preference-model.ts
src/features/preferences/attraction-activity-preference-model.ts
src/features/preferences/dining-accommodation-budget-preference-model.ts
```

Read current WBS 5.11 / 5.14 / 5.16 Results/QA as needed before modifying behavior.

## 2. Dependency gate

Hard dependency:

```text
5.11 Preference Schema = completed
```

5.14 and 5.16 are already accepted and should be reused, not redesigned.

If execution-time develop has changed those contracts materially, stop and report the specific incompatibility instead of guessing.

## 3. Mandatory Master WBS start update

Read the complete latest `docs/project/WBS-TravelAssist.md` locally.

Change only WBS 5.13:

```text
未开始
→
进行中（#345 / TASK-053-B）
```

Do not overwrite any concurrent A/B rows or completion records.

## 4. Implement the frozen Task

Follow the formal TASK-053-B exactly.

Key rules:

- missing is unset;
- implicit default is empty Preference;
- preset click only edits draft;
- no network write until explicit Save;
- no preset ID/label persistence;
- no new endpoint/migration/table/RLS/revision;
- reuse 5.16 persistence/CAS;
- only mobility/dining/accommodation/budget v1 catalog;
- no attraction/style presets;
- no 23→43 mapping.

Implement the exact 9 preset patches defined by the Task.

## 5. Required QA

Add dedicated TASK-053 pure and Local/browser tests.

At minimum execute:

```bash
npm ci
npm run test:preferences
npm run test:preferences:db
npm run test:preference-api
npm run test:preference-api:local
npm run test:preference-contract
npm run test:preference-contract:local
npm run test:trip-library-api
npm run test:trip-library-api:local
```

Run new TASK-053 test scripts plus the complete repository test suite.

Then:

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
git diff --check
```

Local Supabase:

```bash
npm run db:start
npm run db:status
npm run db:reset
```

Do not run/modify generated DB types unless a justified migration occurs; a migration is not expected in this Task.

## 6. Mandatory semantic assertions

Prove all of these:

1. fresh user = empty/unset, no GET side effect;
2. no preset active by default;
3. preset click = draft only, zero mutation;
4. Save persists exact canonical patch outcome;
5. Cancel restores server state;
6. out-of-scope category keys survive preset apply/save;
7. switching presets deterministic;
8. manual edit changes exact match to Custom;
9. page clear unsets category;
10. global reset = empty, not balanced preset;
11. stale save retains 5.16 409 behavior;
12. User B unaffected / anon denied;
13. 5.14 read contains no preset metadata;
14. Trip Library snapshot contains canonical preference/revision only;
15. no preset ID/label in DB/Trip JSON;
16. no changes to A 43-field planning/scoring contracts.

## 7. Scope / bundle audit

Ensure client imports stay browser-safe.

Do not leak:

- DB implementation;
- server Auth/private HTTP implementation;
- server-only modules.

No new API or DB surface should exist.

## 8. Result / tracking

Create:

```text
docs/tasks/RESULT-TASK-053-b-preference-presets-defaults.md
docs/qa/TASK-053/README.md
```

and sanitized machine evidence.

When implementation + mandatory QA are complete, update only WBS 5.13 to:

```text
待审查（#345 / TASK-053-B；Draft PR #<number>）
```

Update Issue #345 with branch/head/tests/PR, but keep it Open.

Open a Draft PR to develop.

Do not merge.

The exact final PR head must have its own passing GitHub Quality Gate. If any commit is added after PASS, the new head must receive a new PASS.

Do not start WBS 8.6, 9.5, 9.6 or any other downstream Task.

Return the complete TASK-053-B Result to the user.