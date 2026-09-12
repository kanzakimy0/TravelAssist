# TASK-047-B QA evidence

Execution date: 2026-09-12 (Asia/Tokyo). Base and last fetched `origin/develop`: `6750a50d9fc49e561e60d25e7ebfc90c76c60a60`. Tested implementation: `443bad8da0b6a3460838385993d444b16865c0d9`; subsequent commits contain reporting/tracking only.

## Evidence index

- `gate-summary.json`: counts parsed from actual local test logs, baseline/implementation comparison, generated-type checksum and standalone artifact verification.
- `real-acceptance.json`: 21 completed real scenarios (22 Node tests including the parent), browser diagnostics, all five viewports and 20 unchanged geometry comparisons.
- `baseline-geometry.json`: 25 route/viewport measurements taken from the unmodified develop production build before UI implementation.
- `baseline-lint.txt`, `final-lint.txt`: same-command evidence of the same seven old local QA-worktree errors; not a PASS.
- `screenshot-manifest.json`: 13 baseline/current PNG paths, sizes and SHA-256 hashes. PNGs and full command logs remain in ignored `.artifacts/task047/`; no product asset inventory entries were added. The committed JSON and test harness remain reviewable in GitHub; screenshots are local artifacts.

## Reproduce implementation acceptance

Use the repository Node version, Docker Desktop, Local Supabase, and an installed Playwright module with Microsoft Edge. The runtime creates and removes its own real Auth users; it expects an empty disposable Local Auth database. `db:reset` below resets the project's local test database.

```powershell
npm ci
npm run db:start
npm run db:reset
npm run db:types
npm run build
$env:CODEX_PLAYWRIGHT_PATH = 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
New-Item -ItemType Directory -Force .artifacts/task047/baseline-browser | Out-Null
Copy-Item docs/qa/TASK-047/baseline-geometry.json .artifacts/task047/baseline-browser/geometry.json
npm run test:companion-api
npm run test:companion-api:local
npm run test:companions:db
npm run test:preferences:db
npm run test:preference-api:local
node --import ./tests/register-route-ts.mjs --test 'tests/*.test.mjs'
npm run lint
npm run typecheck
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
git diff --check
```

Set `CODEX_PLAYWRIGHT_PATH` to the equivalent installed module on another machine. `tools/qa/task-047-browser-baseline.mjs` captures baseline geometry/screenshots when run against the unmodified baseline build, using the same local helpers. Do not replace the baseline with implementation measurements.

## What was exercised

Real Cookie and Bearer login; invalid Bearer cannot fall back to Cookie; User A and User B CRUD; Anon denial; owner-scoped 404; direct authenticated/anonymous RLS; strict fields, UUIDs, quoted revisions, JSON size and Origin checks. Concurrent Companion and Group updates produce one winner and one 409. Owner-scoped count races obey 100/20 caps. Group replacement preserves member order and `includesOwner`; foreign and duplicate members never partially commit. A temporary local SQL trigger deliberately fails membership insertion to prove both create and update rollback, then is removed. Deleting a Companion cascades memberships and advances affected group revisions; deleting a group preserves Companion masters. Deleting an Auth user cascades only that user's records.

All five viewports exercise load/create/edit/reload/group create/reorder/owner toggle/delete. Conflict tests retain both Companion and Group drafts and require explicit server reload. Separate authenticated browser contexts demonstrate server consistency. Dirty guards, loading, failed load/retry and guest redirect are exercised. All created test users and SQL failure fixtures are cleaned up.

## Diagnostics and baseline exceptions

- Application page errors: 0; application console errors: 0; unexpected mutations: 0. Each viewport has exactly the six intended mutations. Raw browser resource logging includes the existing `/favicon.ico` 404, two deliberately induced 409 responses and one deliberately aborted request; these are listed separately, not silently counted as a clean raw console.
- Viewports: 1920×1080, 1440×900, 1280×720, 390×844, 320×740; horizontal overflow 0. `/`, `/start`, `/planner`, `/personal-center` geometry matches baseline in all 20 comparisons. Companion overview, narrow/wide group ordering and conflict screenshots were visually inspected; new ordering controls meet 44px targets.
- `npm run lint` before/after: 7 errors, 0 warnings, all `@typescript-eslint/no-require-imports` in `.cache/qa/task024-worktree/.cache/qa/`. Task files separately pass ESLint. The unrelated cache files were left untouched.
- Initial baseline typecheck/build referenced three removed routes from `.next/dev/types/validator.ts` (`src/app/page.js`, `src/app/planner/page.js`, `src/app/start/page.js`). Moving only generated `.next/dev` into the local artifact backup made the same commands pass without changing baseline source.
- Initial Docker startup failed on stale `sailor-ingest.sock` / secrets-engine IPC reparse points. IPC directories were preserved as backups and regenerated; no factory reset or container/image/database data deletion was used for recovery. The later explicit Local Supabase resets are test setup.
- The specification references count constants absent from the existing Domain. This implementation establishes 100 companions / 20 groups / 20 members in the sole Domain and tests parity with RPC limits. These are reviewable new API limits, not preexisting approved values. Empty groups remain valid under the 5.17 design and actual 5.12 schema; deleting the last member does not delete the group.

## Manual preview

After building and starting Local Supabase:

```powershell
node --conditions=react-server --import ./tests/register-planner-ts.mjs tools/qa/task-047-preview.mjs
```

Open `http://127.0.0.1:3000/personal-center/companions`, register/sign in using Local Auth; confirmation mail is available at `http://127.0.0.1:54324`. The preview helper injects local runtime configuration in memory and logs no credentials. Follow the Result's manual steps. Stop the preview with Ctrl+C.
