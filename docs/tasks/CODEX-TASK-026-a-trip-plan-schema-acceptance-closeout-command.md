# Codex Command — TASK-026-A

Execute TASK-026-A in `kanzakimy0/TravelAssist`.

Read first:
- `docs/project/A-TASK-026-035-execution-plan.md`
- `docs/tasks/TASK-026-a-trip-plan-schema-acceptance-closeout.md`
- `docs/tasks/TASK-019-a-trip-plan-schema.md`
- `docs/tasks/RESULT-TASK-019-a-trip-plan-schema.md`
- `docs/architecture/trip-plan-persistence.md`
- `docs/architecture/cross-module-contract-handoff.md`
- `docs/project/WBS-TravelAssist.md`

Repository checks:
```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Use the existing branch `codex/a-trip-plan-schema` in an independent worktree. Do not create a replacement implementation branch. Merge latest `origin/develop` normally, resolve conflicts narrowly, then run every acceptance item in the Task including real Local Supabase reset/types/RLS/concurrency/rollback tests.

Forbidden:
```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
auto merge
production DB mutation
```

If Local Supabase genuinely cannot run, do not invent PASS; record Blocked/Partial. If validation passes, update WBS to `待审查`, update Result/Issue/PR #227, push, and stop.
