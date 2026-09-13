# TASK-059-B — Personal Center E2E evidence

Current acceptance disposition: **PARTIAL / BLOCKED**. J3 Profile persistence and J6 real Trip Library rendering require previously deferred UI integration. Their mandatory assertions remain enabled and fail; passing API regressions or GitHub CI must not be presented as complete WBS 9.6 acceptance. See the Result and `journey-results.json` for actual final-run outcomes.

## Reproduce

Use a clean checkout with Node 24, Docker running locally, locked dependencies, an installed Playwright package and the selected browser. Follow the repository's existing Local setup; never use Production/Staging values. The aggregate resolves and verifies loopback endpoints, refuses an already-running TravelAssist Local project or occupied application ports, checks that Auth/B tables/Storage are empty, and never resets unrelated data.

```powershell
npm ci
npm run build
$env:CODEX_PLAYWRIGHT_PATH = 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
npm run test:personal-center:e2e
```

The package path is this host's installed runtime, not a project dependency or a portable path. Point the same variable to your installed Playwright package elsewhere. No new framework, npm dependency or browser download is introduced.

The default browser is headless Microsoft Edge (`channel: msedge`). All J1–J8 run serially. The aggregate starts Local Supabase, starts the production Next server through the accepted helper, creates fresh users/fixtures, closes task browsers/server, deletes synthetic data, verifies all tracked tables and application ports empty, records `db:status`, and runs `db:stop`. A mandatory failure, cancellation, skip, todo, zero-test child, unavailable browser or cleanup failure makes the aggregate exit nonzero.

```powershell
$env:WBS_BROWSER = 'chromium' # alternatively firefox or webkit, only if installed
npm run test:personal-center:e2e
Remove-Item Env:WBS_BROWSER
```

This is browser viewport coverage, not a native mobile application test. WebKit would not prove real Safari. This host's missing Firefox/WebKit binaries are explicitly Deferred in `browser-matrix.json`.

## Existing 9.5 baseline

Run `npm run test:personal-center` and `npm run test:personal-center:local` unchanged. On a fresh checkout the accepted Companion runtime reads ignored `.artifacts/task047/baseline-browser/geometry.json`. Generate it with the existing script before the Local aggregate; do not copy a historical geometry file:

```powershell
npm run db:start
try {
  node tools/qa/task-047-browser-baseline.mjs
} finally {
  npm run db:stop
}
npm run test:personal-center:local
```

The existing geometry script visits the repository's accepted baseline routes without running a Planner preference/save journey. It is recorded as baseline preparation, not new WBS 9.7/9.8 coverage. The first unprepared Local attempt failed with ENOENT, cleaned up successfully, and the complete prepared run was rerun. No old test assertion was changed.

## Evidence map

- `browser-harness-inventory.json`: existing framework, Local helpers, executable resolution, available engines and CI limits.
- `e2e-matrix.json`: every mandatory journey mapped to executable assertions.
- `journey-results.json`: sanitized final runs, actual counts, owner lifecycle and cleanup.
- `browser-matrix.json`: actual engine outcomes, canonical 1440×900 / 390×844 viewports and two-run comparison.
- `quality-gates.json`: baseline/candidate regression, local deployment, formatting and GitHub gate evidence.
- `../../tasks/RESULT-TASK-059-b-wbs-9-6-personal-center-e2e.md`: acceptance disposition and exact defect handoff.

Raw logs stay in ignored `.artifacts/task059/`; source and artifact hashes identify the reviewed runs. No HAR, storageState, access token, Auth credential, real account UUID, large trace/video or personal screenshot is committed. Random unique Local credentials exist only in test/server memory. Public evidence uses journey/control/disposable roles and aggregate counts.

## Meaning of counts and CI

There are eight mandatory journey subtests and one parent Node test. Thus a run with six passing journeys and two failing journeys reports Node TAP `tests=9, pass=6, fail=3`: the failed parent is counted once in addition to J3/J6. It is not a third product blocker. Skip/todo/cancel must all be zero. Identical failing runs demonstrate reproducibility of the blockers; they do not satisfy the required two passing primary-browser runs.

The current GitHub Quality gate runs `tests/*.test.mjs`, lint, typecheck, formatting and deployment artifact checks. It does not provision the Local E2E runtime. An exact-head green GitHub check is necessary evidence but cannot override failing mandatory J3/J6.

## Scope and handoff

No product UI, schema, migration, generated DB types, external provider, A WBS 8.5 or downstream Task is implemented here. Profile still initializes the accepted presentation fixture and saves React state. Trip Library still uses its accepted view-model fixture; the accepted TASK-049 Result expressly defers real UI wiring until Trip-only presentation and unknown-data semantics are decided.

Authorize and define those focused UI integrations separately, preserve the accepted API contracts and unknown/unset semantics, then rerun this unchanged mandatory suite. Do not weaken J3/J6, substitute mock cards, or treat missing rows as proof of browser owner isolation. WBS 9.6 stays in progress under TASK-059 §§15/20 until all mandatory acceptance conditions are met.
