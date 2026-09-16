# TASK-062-B integration / database acceptance

This closeout reuses TASK-019-A / TASK-026-A, `codex/a-trip-plan-schema` and Draft PR #227. WBS 8.5 owner remains A; B executes the authorization recorded in Issue #376. See the [Result](../../tasks/RESULT-TASK-062-b-wbs-8-5-trip-plan-schema-integration-closeout.md) and [machine-readable evidence](acceptance-evidence.json).

## Reproduce

Use an empty, dedicated repository Local Supabase project, Docker, repository Node/npm, locked dependencies and an installed Playwright/Edge runtime. Do not run these Local suites concurrently. The replay driver refuses existing Auth/application/Storage data before resetting.

```powershell
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run build
npm run test:personal-center-migration:replay
npm run test:trip-plan
npm run test:trip-plan:runtime
node --import ./tests/register-route-ts.mjs --test tests/task-054-personal-center-migration.test.mjs tests/task-062-schema-union.test.mjs
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-062-trip-plan-coexistence.runtime.mjs
npm run test:personal-center
$env:CODEX_PLAYWRIGHT_PATH = '<installed Playwright package path>'
New-Item -ItemType Directory -Force .artifacts/task047/baseline-browser | Out-Null
Copy-Item docs/qa/TASK-047/baseline-geometry.json .artifacts/task047/baseline-browser/geometry.json
npm run test:personal-center:local
node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
npx prettier --check docs/qa/TASK-062/*.json docs/qa/TASK-062/*.md docs/tasks/RESULT-TASK-062-b-wbs-8-5-trip-plan-schema-integration-closeout.md
git diff --check
```

The Local aggregate records cleanup and stops Supabase. If interrupted before it runs, finish fixture cleanup and use `npm run db:stop`. TASK-053's runtime rewrites its historical evidence formatting; normalize `docs/qa/TASK-053/local-evidence.json` with scoped Prettier and verify no semantic/tracked change remains.

## What the additional checks prove

- Existing eight SQL migrations remain immutable: six accepted B migrations plus the original two Trip Plan migrations. No forward migration or second migration history was necessary.
- TASK-052 scopes its existing B cascade catalog queries to the original eight owner families, retaining all FK assertions. TASK-054 retains its strict B-only table/check/FK/RPC/policy audit. Its `tables` collection now follows its original manifest rather than assuming every schema export belongs to B. TASK-062 separately asserts the exact twelve-table union and every generated Row/Insert/Update column, scalar, nullability and insert/update optionality.
- Replay compares freshly generated types with the current checked-in combined schema, not the historical B-only checksum. Both resets produce identical combined table/column/constraint/index/policy/trigger/grant catalogs; B function definitions are also included. TASK-019's real runtime separately verifies Trip trigger confinement, SQL/Drizzle agreement and behavior.
- Two real users each simultaneously populate all eight B tables and the four-level Trip tree. Canonical Trip CAS leaves B records and the detached saved snapshot unchanged; B writes leave canonical rows/revisions unchanged. The accepted public `DELETE /api/account` removes all twelve owned table families and Auth while preserving the other account exactly. Raw rows and credentials stay in memory.
- Existing TASK-019 fixtures cover minimal/full/multi-plan/multi-day/scheduled/alternative/timezone/date-line/booking/future-code round-trips, contract rejection, RLS/ownership, stale trip/plan revisions, concurrent writers, transaction rollback and cascade.

## Evidence interpretation

Counts from focused suites, aggregates and the full repository suite overlap; do not add them as unique product tests. All final mandatory executions must have zero failures/skips. The historical TASK-026 709/712 result is not a current waiver: clean `origin/develop@87fe139fa96eb5885ff7d2591197fee60b171ac7` independently passed 2516/2516, and the integrated candidate passed 2520/2520.

Local raw logs remain in the task worktree's ignored `.artifacts/` and the parent TASK-062 artifact directory. Published evidence contains commands, counts, timestamps and hashes only. The initial Docker stale-socket failure was repaired by preserving its runtime socket directory and restarting Docker Desktop; no database volumes or settings were deleted. An initial timing-sensitive repeat-OTP test failure and a missing documented Companion browser-baseline prerequisite are recorded separately from final results. Neither caused product-code changes or relaxed assertions.

A pull-request event validates GitHub's merge revision. A separate `workflow_dispatch` of `quality-gate.yml` against the canonical branch is required for exact-head acceptance. The final delivery receipt and PR #227 description record the final documentation head and its exact-head run; delivery is withheld until that run succeeds. No self-referential commit SHA is fabricated inside its own committed Result.
