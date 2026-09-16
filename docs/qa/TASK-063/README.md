# TASK-063-B — authoritative Engine apply acceptance

Execution starts from clean `origin/develop@849ed9f207a0ec55ff514e287fbc3d6c7adc2cea` in an independent worktree. A separate detached worktree runs the same full Node baseline. See the [Result](../../tasks/RESULT-TASK-063-b-wbs-4-22-engine-transaction-apply.md), [design](../../architecture/engine-transaction-apply.md) and [machine-readable evidence](acceptance-evidence.json).

## Reproduce

Use the repository's locked Node/npm dependencies, an empty dedicated Local Supabase project and Docker. Local suites must run sequentially because they share Auth, ports and DB fixtures. No Production/Staging database or live Provider is involved. The migration replay driver checks empty Auth/application/Storage state before reset.

```powershell
npm ci
node --import ./tests/register-route-ts.mjs --test --test-reporter=tap "tests/*.test.mjs"
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run build
npm run test:personal-center-migration:replay
node --import ./tests/register-route-ts.mjs --test tests/wbs-4-21-rule-feasibility.test.mjs
node --import ./tests/register-route-ts.mjs --test tests/task-063-engine-apply.test.mjs
node --conditions=react-server --import ./tests/register-route-ts.mjs --test tests/task-063-engine-apply.runtime.mjs
npm run test:trip-plan
npm run test:trip-plan:runtime
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
npx prettier --check docs/qa/TASK-063/*.json docs/qa/TASK-063/*.md docs/tasks/*TASK-063*.md docs/architecture/engine-transaction-apply.md
git diff --check
npm run db:stop
```

The initial full Node command must separately run on a clean latest-develop worktree. The candidate run includes the new pure tests. TASK-063 uses the existing route TypeScript loader, which supports the 4.21 module's directory-index imports; the older planner loader does not. The canonical Trip runtime command remains unchanged. Migration replay executes reset/types twice, compares the full fifteen-table catalog and repeats the existing B migration behavior suite. The full Personal Center aggregate includes account deletion and stops Local Supabase after cleanup; the explicit final db:stop is also recorded.

## Evidence and count interpretation

Focused, wrapper, migration and aggregate counts overlap. Do not sum them as distinct product tests. The TASK-019 pure command reports three wrapper tests, including its existing sixteen-case projection fixture child suite. TASK-063 Local reports 35 tests: 34 acceptance subtests plus the parent. One unsupported-operation subtest also iterates all sixteen other recognized operation shapes.

The real Local suite proves owner UPDATE_TIME/REORDER_ITEMS, canonical round-trip and actual revisions, untouched unrelated Plan, both stale revisions, foreign/missing-target non-disclosure, anonymous/actor mismatch rejection, locks/booking/protected/confirmation gates, all unsupported sources/operations, terminal replay/conflict and actor isolation. Concurrent tests use a six-connection pool and additionally observe another PostgreSQL session waiting on the advisory key lock. Different keys from the same old base cannot both commit.

A trigger at outbox insertion forces rollback after Trip/receipt/audit writes. A deferred trigger forces a known COMMIT rejection. Both leave all four effects absent. Deterministic database-wrapper faults simulate lost acknowledgement and post-COMMIT read failure around real Local transactions; committed receipts are reconciled from the actual DB. This is not a claim of a live network-level partition. Metadata RLS/privileges, minimal stored results, target-deletion replay and real public account-deletion cascade are tested. Fixtures, temporary trigger functions and users are removed.

The existing TASK-062 coexistence suite separately populates every Personal Center/Trip family for two users, checks non-interference and public account deletion. TASK-054 keeps its strict original eight-family audit; TASK-062's exact union assertion now includes the three Engine tables and still checks every generated column/type/nullability/optionality and immutable migration history. The original eight merged migrations are unchanged.

## Initial failures and corrections

Initial development checks are retained separately from final PASS evidence:

- The first mechanical writer extraction cut off its closing statements; typecheck caught it before DB execution. The complete existing writer was extracted and the original DAL tests passed.
- TASK-063 runtime initially used the planner loader, which cannot resolve existing 4.21 directory-index imports. The test invocation now uses the canonical route loader without changing 4.21 code.
- The account-deletion assertion initially expected 200; the established route correctly returns 204. The assertion was corrected to the existing contract and the cascade verified.
- The additional deferred-COMMIT fault fixture initially had a dollar-quote typo. The fixture was corrected and the actual COMMIT rollback case then executed successfully.
- Code review identified that an acknowledged COMMIT followed by a failed read must not become rolled_back. The service now tracks acknowledgement separately, with a real-commit regression proving recovery.

No skipped mandatory tests or historical-failure waivers are used. TASK-053's Local suite rewrites historical evidence formatting; scoped Prettier restores its existing tracked form. Runtime fixtures are synthetic, and published evidence contains only statuses/counts/hashes/safe identifiers.

## Final-head CI

A PR event tests a GitHub merge revision. Delivery additionally requires `workflow_dispatch` of `quality-gate.yml` on the implementation branch and verification that the run's headSha equals the final pushed head. The final delivery receipt and Draft PR description carry that exact SHA/run URL. The committed Result does not fabricate its own self-referential SHA. No merge or issue closure is performed.
