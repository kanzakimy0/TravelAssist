# CODEX — TASK-073-A PR #406 Save/Read Integrity Refresh

You are working in a worktree prepared by the user outside Codex.

## Absolute Git boundary

Execute **zero Git commands**.

Do not run:
`git status`, `git fetch`, `git log`, `git show`, `git diff`, `git add`, `git commit`, `git push`, `git branch`, `git merge`, `git worktree`, GitHub PR commands, or any other Git command.

Do not modify `.git`.

The user handles all Git/worktree/merge/stage/commit/push operations outside Codex.

## Read first from the filesystem

```text
AGENTS.md
docs/tasks/TASK-073-a-pr406-planner-save-read-integrity-refresh.md
docs/reviews/pr-406-372-231-245-review-2026-09-21.md
docs/tasks/RESULT-TASK-069-a-planner-save-read-wiring.md
docs/architecture/planner-save-read-v1.md

src/features/planner/model/planner-canonical.ts
src/features/planner/model/planner-store.ts
src/features/planner/model/browser-trip.ts
src/features/planner/persistence/canonical-trip-client.ts
src/features/planner/components/use-planner-canonical-trip.ts
src/server/planner/canonical-http.ts
src/server/trips/repository.ts
src/server/trips/transaction.ts
tests/task-069-planner-save-read.test.mjs
tests/task-069-planner-save-read.runtime.mjs
```

Read other directly related files as needed.

## Main defect to fix

A Canonical place may have unknown coordinates. Planner currently needs safe fallback coordinates for visual rendering. Those fallback coordinates are not facts.

Fix the system so that a visual fallback can never be serialized back into Canonical Trip data as if it were a real coordinate.

Required regression:

```text
source canonical place coordinate unknown
→ planner visual fallback
→ supported new/reused item
→ canonical save
→ coordinate remains unknown/null
```

Do not simply remove all visual fallback behavior if the UI still requires it. Preserve rendering while separating visual geometry from Canonical truth.

## Preserve

- TripRepository / RLS / transaction / CAS;
- supported semantic roundtrip;
- browser recovery boundary;
- late hydrate guard;
- late acknowledgement guard;
- owner-only access;
- fail-closed malformed payload behavior;
- existing Canonical Trip contract.

Do not expand TASK-069 scope.

## Tests

Run non-Git validation, including at minimum:

```text
npm ci
node --import ./tests/register-planner-ts.mjs --test tests/task-069-planner-save-read.test.mjs
npm run test:trip-plan
npm run test:trip-plan:runtime
new TASK-073 focused regression
all directly affected Planner Store / Trip persistence tests
npm run lint
npm run typecheck
npm run build
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
```

Run the real Local Supabase/Auth/HTTP/RLS/CAS TASK-069 acceptance if the local runtime is available and safe.

## Evidence

Create/update:

```text
docs/qa/TASK-073-A/README.md
docs/qa/TASK-073-A/acceptance-evidence.json
docs/tasks/RESULT-TASK-073-a-pr406-planner-save-read-integrity-refresh.md
```

Do not claim hosted Quality Gate because Codex is not performing Git/push actions.

## Final response

Report only:

- Status
- Root cause
- Fix summary
- Complete changed/new file list
- Canonical coordinate truth rule after fix
- Regression coverage
- Test commands/results
- Local runtime acceptance
- Remaining blockers
- Explicit statement: `Git operations not performed by Codex`
