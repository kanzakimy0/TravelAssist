# Personal Center unit / integration baseline

TASK-055-B / WBS 9.5 / Issue #355. Start with [test inventory](test-inventory.json), [critical coverage matrix](coverage-matrix.json), [gap audit](gap-report.md) and [QA evidence](quality-gates.json).

## Commands

```sh
npm ci
npm run test:personal-center
npm run build
npm run test:personal-center:local
```

The first aggregate runs 28 non-Local suites sequentially using the repository's existing Node loaders. It does not need Supabase. Every mandatory Node suite must emit TAP totals with tests > 0, all tests passing and zero failures, cancellations, skips or todo. The runner's own four child-process tests verify these failure boundaries.

The Local command requires Docker, the installed Supabase CLI from the lockfile, an already installed Playwright runtime with Edge available, and a completed production Next build. Set `CODEX_PLAYWRIGHT_PATH` to that installed Playwright package. On this execution host it was:

```powershell
$env:CODEX_PLAYWRIGHT_PATH = 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
npm run test:personal-center:local
```

This is an environment input, not a path hardcoded into the runner. Browser/runtime absence fails the aggregate. No mandatory integration is converted into a skip and no browser is downloaded by the runner.

## Local isolation and lifecycle

The command uses repository `db:start`, `db:types`, `db:status` and `db:stop` implementations through their Node wrapper. It validates the existing Local project/loopback environment and requires ports 3000/3001 to be free. It requires zero rows in Auth users, the eight B tables and task-relevant Storage tables before execution; an occupied project fails without a reset or data wipe. Run this command exclusively against the repository's disposable, empty Local test project.

Thirteen accepted runtime suites and two existing client-bundle audits execute in inventory order. After each step, the runner verifies that synthetic Auth users, all eight B tables, Storage objects/buckets and both server ports are clear. Existing suite finally blocks own their fixtures and child processes. Before finishing, it repeats the empty-data check, closes its DB connection, records Local status and stops the Local stack. Successful cleanup is recorded per step in the report. Do not run another suite/server against the same project during execution.

Type generation must reproduce `src/types/database.generated.ts` byte-for-byte. There is no automatic reset. The accepted TASK-054 double replay remains separately callable through `test:personal-center-migration:replay`; its prior accepted evidence is reused, because another destructive replay adds no missing 9.5 signal.

TASK-053's accepted runtime rewrites its own tracked evidence JSON with expanded array formatting. Its contents are unchanged; normalize that file with scoped Prettier after QA to retain the accepted tracked form. The TASK-055 reports contain the fresh execution evidence.

## Evidence and scope

Each aggregate saves a timestamped report and per-command raw logs under ignored `.artifacts/task055/`; `<mode>-latest.json` points to the most recent report. Reports include manifest hash, ordered files/commands, child exit codes, TAP counts, UTC timestamps, log hashes, generated-type hash and Local cleanup counts. Raw logs remain local; public evidence is sanitized and contains no Auth tokens, keys, user identifiers or credentials.

The checked-in inventory records 62 suite/script files and 15 support files, seven primary layers, actual test titles/lines, environment requirements and explicit exclusions. The critical matrix contains 46 covered 9.5 rows and four full-journey 9.6 deferrals. Updating tests should update inventory/matrix references as well. Counts are executable assertion counts, not a coverage percentage; baseline/full-repository and Local totals overlap and must not be added as unique product tests.

`quality-gates.json` records both aggregate passes and full repository gates. GitHub's pull-request event checks its synthetic merge revision; a separate Quality Gate `workflow_dispatch` on the final implementation branch is required to prove the exact final head. The delivered Result and PR contain that run URL and SHA. No full 9.6 browser journey, production/staging access or downstream task is part of this baseline.
