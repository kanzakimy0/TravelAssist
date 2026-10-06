# TASK-064-B QA — local runtime and compensating rollback

Execution baseline is clean `origin/develop@b3c37a40ff8f0690a25d0372ac8e0c8f3cc063ea`. Implementation and baseline use separate worktrees. The unrelated root `outputs/` directory is preserved. See the [Task](../../tasks/TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md), [architecture](../../architecture/engine-runtime-events-rollback.md), [Result](../../tasks/RESULT-TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md) and [acceptance evidence](acceptance-evidence.json).

## Reproduce

Use the locked Node/npm versions, Docker and an empty dedicated Local Supabase project. Local suites run sequentially because they share Auth, database and ports. No production/staging service or real/paid Provider is used.

```powershell
npm ci
# Also run this in a separate clean execution-time develop worktree:
node --import ./tests/register-route-ts.mjs --test --test-reporter=tap "tests/*.test.mjs"
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run build
node --import ./tests/register-route-ts.mjs --test tests/wbs-4-21-rule-feasibility.test.mjs tests/task-063-engine-apply.test.mjs tests/task-064-runtime-rollback.test.mjs
node --conditions=react-server --import ./tests/register-route-ts.mjs --test tests/task-064-runtime-rollback.runtime.mjs
npm run test:personal-center-migration:replay
node --conditions=react-server --import ./tests/register-route-ts.mjs --test tests/task-063-engine-apply.runtime.mjs
npm run test:trip-plan
npm run test:trip-plan:runtime
npm run test:routing
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-062-trip-plan-coexistence.runtime.mjs
$env:CODEX_PLAYWRIGHT_PATH = '<installed Playwright package path>'
New-Item -ItemType Directory -Force .artifacts/task047/baseline-browser | Out-Null
Copy-Item docs/qa/TASK-047/baseline-geometry.json .artifacts/task047/baseline-browser/geometry.json
npm run test:personal-center:local
node --import ./tests/register-route-ts.mjs --test --test-reporter=tap "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run build
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
npx prettier --check docs/qa/TASK-064/*.json docs/qa/TASK-064/*.md docs/tasks/*TASK-064*.md docs/architecture/engine-runtime-events-rollback.md
git diff --check
npm run db:stop
```

The replay driver checks empty application/Auth/Storage data before resetting and compares generated types plus all nineteen application table catalogs across two complete resets. The original Personal Center migration inventory remains immutable. The full Personal Center aggregate includes public account deletion and stops Local Supabase; the explicit final stop is recorded separately.

The existing route TypeScript loader is required for Engine modules because it supports the 4.21 directory-index imports. The existing Trip runtime command/loader is unchanged. Wrapper and aggregate counts overlap and must not be summed as distinct product tests.

## Focused acceptance mapping

The Local suite has 41 acceptance subtests plus its parent (42 tests), using real Local Auth and an eight-connection PostgreSQL pool. It writes safe machine-readable evidence to `.artifacts/task064/runtime-evidence.json`; the delivery evidence embeds it.

| Task acceptance | Proof                                                                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| §17 1–4         | Pending accepted event, claim/processing state, one terminal result, repeated claim/invocation publishes nothing                                                                                       |
| §17 5           | Eight concurrent claims for four events; duplicate completion per token produces four results and four lease_lost outcomes                                                                             |
| §17 6           | Pause worker inside trusted resolver, expire its lease in real SQL, recover with another worker, fence the original completion                                                                         |
| §17 7–8         | Forced resolver error produces two retryable failures then terminal failure; each claim crash including the final lease exhausts at three evaluations                                                  |
| §17 9–10        | Later authoritative revision is observed; Trip and accepted metadata remain unchanged by recompute                                                                                                     |
| §17 11–12       | Valid, missing, stale and malformed normalized route facts through 7.5/4.21; global fetch throws if runtime tries network                                                                              |
| §17 13          | Separate events processed against identical current state/context have identical fingerprints                                                                                                          |
| §17 14          | Actual readback preimage equals stored evidence; malformed/extra-field/oversized JSON rejected; runtime table has typed columns; anon/authenticated cannot access metadata                             |
| §17 15 / §18 36 | Real public account DELETE returns 204 and cascades all runtime/rollback metadata while preserving another user's Trip and receipts                                                                    |
| §18 16–18       | Future UPDATE_TIME preimage is atomic; inverse restores only schedule and keeps unrelated current title; actual revisions move forward                                                                 |
| §18 19–20       | Combined schedule/order change and trusted inverse restore chronological beforeOrder through unchanged 4.21 rules                                                                                      |
| §18 21–22       | Original receipt/audit JSON remain identical; new apply/audit/pending outbox and unique correlation exist                                                                                              |
| §18 23–25       | Schedule drift, order drift, missing item/day yield ROLLBACK_CONFLICT and zero mutation                                                                                                                |
| §18 26–28       | Foreign/nonexistent receipt, anonymous Auth and actor mismatch disclose no authoritative state                                                                                                         |
| §18 29          | Current hard/user/booking/payment lock, booking evidence, protected item and missing context all prevent automatic acceptance                                                                          |
| §18 30          | Synthetic historical accepted receipt without history is unsupported and unchanged                                                                                                                     |
| §18 31–33       | Exact retry replays, changed payload conflicts; real distinct PostgreSQL sessions wait on same/different rollback keys; at most one compensation; consumed original/compensation receipt cannot toggle |
| §18 34          | SQL faults at preimage/relation insertion and deferred COMMIT roll back every effect; simulated lost acknowledgement reconciles a real committed record                                                |
| §18 35          | Original apply/reconcile after compensation still replays its original versions without mutation                                                                                                       |
| Additional      | Current ownership/RLS is rechecked for rollback replay/reconcile after target deletion                                                                                                                 |

The same/different-key concurrency tests explicitly observe PostgreSQL advisory waiters, rather than relying only on Promise concurrency. Fault injection around database-wrapper acknowledgement is deterministic and does not claim a live network partition. Expiry/due-time test changes are confined to synthetic local queue rows; production timing is always DB clock.

The successful REORDER_ITEMS case includes corresponding UPDATE_TIME operations so both chronological before/after states satisfy existing rules. An infeasible older order remains blocked or needsConfirmation; no rule bypass or fabricated grant is used.

## Initial failures and corrections

Development attempts are distinguished from the final passing evidence:

1. Local rollback initially compared preview timestamps without milliseconds against normalized DB readback. It correctly refused mutation but incorrectly classified unchanged state as drift. Preimage capture now uses the actual saved canonical readback. All compensation/protection/concurrency tests were rerun.
2. That initial conflict caused a concurrency fixture waiting for resolver entry to stall. Only the identified test Node processes were stopped; only `task064-<UUID>@example.test` synthetic Auth users were removed. The fixture now detects premature completion, and final cleanup is all zero.
3. A negative JSON test expected CHECK violation for SQL NULL, while PostgreSQL correctly raised NOT NULL violation. The test now accepts the two exact constraint SQLSTATEs, without weakening rejection.
4. Existing generated-contract QA had an exact old function list and no text-array scalar mapping. The new server-only shape predicate and explicit text[] mapping were added to exact assertions. Original B inventory, column/default/nullability checks and old migration hashes remain unchanged. Full Node and replay were rerun.

## Evidence and delivery

`acceptance-evidence.json` records command outcomes/counts, log hashes, actual Local case matrix, cleanup, migration/type replay hashes and immutable migration comparison. No raw Auth credentials, provider payload or real user data are published.

Final-head CI is attached to PR delivery metadata, because a committed file cannot contain its own final commit hash. A workflow_dispatch Quality Gate must report the exact final branch SHA; a pull_request synthetic merge SHA alone does not satisfy this task. Draft/Open state and Issue #383 Open are verified after delivery. WBS 4.23 stays B / 待审查; 4.24 remains 未开始.
