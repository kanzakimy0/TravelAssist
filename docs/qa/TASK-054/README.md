# TASK-054-B / WBS 8.6 QA

Execution baseline: `166f996eab3d75fb5afabc4ad7cb9f3d265c54c1`. Implementation starts from clean `origin/develop`, independently of the specification branch. WBS 5.11, 5.12, 5.18 and 8.4 remain completed.

## Scope and evidence

- `migration-inventory.json`: six immutable accepted SQL files and SHA-256 hashes, baseline generated types and all eight Drizzle source files. Hashes use Git text normalized to LF, so a Windows CRLF checkout is not treated as history modification.
- `schema-catalog.json`: real Local PostgreSQL definitions after replay: 8 tables, 78 columns, 70 constraints, 20 indexes, 26 policies, 10 triggers and 13 functions, including ACLs/grants. This is audit evidence; SQL migrations remain the sole executable schema history.
- `replays.json`: both actual reset/type/static/runtime command sequences, timestamps, exit codes and matching schema/type hashes.
- `quality-gates.json`: baseline versus candidate, focused regressions, Local API/DB/browser suites and build/deployment results.

Replay catalog hashes use canonical JSON.stringify(parsedCatalog, null, 2) plus a final LF. The committed catalog is losslessly formatted by Prettier; quality-gates.json records both canonical and committed-file hashes.

No SQL migration, Drizzle mirror or generated type change was needed. No corrective migration or forward-application branch was required.

## Agreement and ownership

The catalog test checks real PostgreSQL columns, nullability, defaults, primary/foreign/unique keys, cascade targets, index order and partial predicates. PostgreSQL parses each Drizzle CHECK/default on a temporary table so its expression can be compared to the accepted SQL expression. The temporary tables disappear on commit. No schema is derived from a Dashboard.

The generated TypeScript is parsed with the TypeScript AST and compared to every mirror's Row/Insert/Update type and optionality. Every non-trigger SQL function is checked against generated argument types, optional/default arguments and return types. Trigger functions are correctly absent from the public generated RPC surface. Functions remain SECURITY INVOKER with a fixed pg_catalog search path; anonymous EXECUTE is denied.

Each replay creates two real Local Auth users and populates all eight B tables. Both directions test cross-user SELECT/INSERT/UPDATE/DELETE, anonymous access, RPC update/delete and foreign group membership. Tests verify the victim's complete data remains unchanged. Accepted direct-write restrictions are preserved: Profile/Settings/Preference have no client DELETE; Trip Library is owner SELECT only and uses its existing server gateway for product mutations. A fixture-only local admin seeds the Trip row; this does not introduce an application service-role path.

CAS guards, immutable ownership, JSON versions and immutable Trip creation intent are exercised. The real production Next server receives DELETE /api/account with the current user's verified Bearer token and accepted confirmation envelope. All eight data families and Auth user disappear; the other user is byte-for-byte unchanged. Finally, all synthetic users and B rows are removed. The existing TASK-052 suite additionally covers populated draft/saved/history rows, Storage blocking, Cookie/CSRF/session semantics and the browser flow.

SQL DESC indexes use the database's default NULL ordering while Drizzle carries its own default. All affected indexed columns are NOT NULL, so order and query behavior are identical; no artificial corrective migration is justified.

## Reproduce

1. Run `npm ci` and `npm run build`.
2. Run `npm run test:personal-center-migration` for static drift coverage.
3. Run `npm run test:personal-center-migration:replay`. It starts/status-checks the real Local project, refuses to erase an existing Auth user or B row, performs two `db:reset` + `db:types` sequences, runs both dedicated suites after each replay, and compares complete catalog/type hashes. Docker/Supabase unavailability is a failure, never a skip.
4. Run `npm run test:personal-center-migration:local` to repeat catalog/behavior checks without resetting. The production build must exist, Local Auth must be empty, and port 3000 must be free.
5. Run the mandatory existing regressions listed in the Result. For existing browser suites set CODEX_PLAYWRIGHT_PATH to an installed Playwright package; this execution used Microsoft Edge. Run Local suites sequentially because they share the project and server ports.
6. Run full repository tests, lint, typecheck, build, deployment validation/build/artifact and scoped format checks; finish with `npm run db:status` and `npm run db:stop`.

## Environment recovery and baseline debt

Initial Windows sandbox process startup failed, so authorized commands used the approved external command runner. Docker Desktop initially exited because stale Windows socket files could not be accessed. The stopped runtime-only directories were renamed to preserved task054 backup directories, then rebuilt empty; Docker recovered at version 29.7.2. Database volumes, images and repository migrations were preserved. All reported replay results were collected after recovery.

Baseline and candidate `npm run lint` both report the same seven errors in ignored, pre-existing `.cache/qa/task024-worktree/.cache/qa/*.cjs` files; the two logs have identical SHA-256 `a16851c43da73e4710f03d11bc5b9f24ec8926eb34e35eafe48f1edc47e72084`. `npx eslint . --ignore-pattern '.cache/**'` checks the actual repository scope. No unrelated cache files or historical format debt are changed.

Raw logs/screenshots stay in ignored `.artifacts/task054` and the parent suites' artifact directories. Committed evidence contains no Auth UUID, email, password, Cookie, Bearer, API key or connection string. No Production/Staging mutation. No downstream task started. Final exact-head GitHub Quality Gate is recorded on the Draft PR checks and PR description; each new head needs its own passing run.
