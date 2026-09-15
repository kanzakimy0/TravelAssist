# TASK-059-B — Personal Center E2E evidence

Current disposition: **COMPLETED FOR REVIEW**. TASK-060 / PR #368 and TASK-061 / PR #370 resolved J3/J6 and were merged into develop under explicit user authorization. Latest develop was normally merged into the existing TASK-059 branch. All J1–J8 now pass in two complete Edge runs and one complete Chromium run on the same source candidate. WBS 9.6 is pending review; PR #366 remains Draft and Issue #364 remains Open.

## Reproduce

Use a clean checkout, Node 24, Docker running locally, locked dependencies, an installed Playwright package and selected browser. Follow repository Local setup; never use Production/Staging values. The aggregate verifies loopback endpoints, refuses an already-running TravelAssist Local project or occupied application ports, checks Auth/B tables/Storage are empty, and never resets unrelated data.

```powershell
npm ci
npm run build
$env:CODEX_PLAYWRIGHT_PATH = 'C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
$env:WBS_BROWSER = 'edge'
npm run test:personal-center:e2e
npm run test:personal-center:e2e
$env:WBS_BROWSER = 'chromium'
npm run test:personal-center:e2e
Remove-Item Env:WBS_BROWSER
```

The package path is this host's installed runtime, not a project dependency or portable path. Point the variable to your installed Playwright package elsewhere. No new framework, dependency or browser download was introduced. Firefox/WebKit require their actual installed binary; their absence on this host is recorded as Deferred, not PASS.

The default browser is headless Microsoft Edge (`channel: msedge`). J1–J8 always run serially without journey filtering. The aggregate starts Local Supabase and production Next via accepted helpers, creates fresh users/fixtures, closes task browsers/server, removes synthetic data, verifies tracked tables/application ports empty, records `db:status`, and executes `db:stop`. Mandatory failure/cancel/skip/todo/zero-test, missing browser or failed cleanup returns nonzero.

Desktop 1440×900 and mobile 390×844 reuse WBS 9.12. Viewport testing does not claim a native mobile application or real Safari. External email/SMS/OAuth delivery remains Deferred; real Local mailbox confirmation is executed.

## Existing 9.5 baseline

Run `npm run test:personal-center` and `npm run test:personal-center:local` unchanged. The accepted Companion runtime needs ignored `.artifacts/task047/baseline-browser/geometry.json`; regenerate through the existing script before the Local aggregate:

```powershell
npm run db:start
try {
  node tools/qa/task-047-browser-baseline.mjs
} finally {
  npm run db:stop
}
npm run test:personal-center:local
```

The geometry script visits 25 accepted page/viewport combinations. This is existing baseline preparation, not WBS 9.7/9.8 journey coverage. Original execution initially found the missing ignored geometry; that historical attempt was retained, prepared and rerun. The resumed candidate regenerated it again and reran the full Local aggregate. No historical assertion was weakened.

## Evidence map

- `browser-harness-inventory.json`: reused framework/helpers, executable resolution, actual engines and CI limits.
- `e2e-matrix.json`: each mandatory journey mapped to executable assertions and current source lines.
- `journey-results.json`: three fresh passing runs, source SHA/hash, observations, metrics and cleanup.
- `browser-matrix.json`: actual engines, viewports, identical mandatory-check counts and two-run determinism.
- `quality-gates.json`: original/resumed baseline, dependency merge proof, candidate regressions and local gates.
- `../../tasks/RESULT-TASK-059-b-wbs-9-6-personal-center-e2e.md`: complete review result and stop state.

Ignored `.artifacts/task059/` holds raw logs. Public records retain sanitized counts and hashes without Auth credentials, tokens, account UUIDs, HAR, storageState or large media. Every E2E run uses three unique Local users (journey/control/disposable) plus anonymous context. Full control rows are compared in memory, not published.

## Counts, determinism and CI

Eight mandatory journey subtests plus one parent produce Node TAP `tests=9, pass=9, fail=0`. Both Edge runs use the same source head/hash, identical mandatory check lists and results; fresh users and empty pre/post state make the runs independent. Skip/todo/cancel remain zero. Previous J3/J6 failed runs and intermediate passing reports remain historical. After matching the local runtime byte-for-byte to the committed Git blob, the complete final matrix was rerun; only verified-* reports are included in the passing comparison.

Current GitHub Quality gate runs `tests/*.test.mjs`, lint, typecheck, formatting and deployment artifact gates; it does not provision Local E2E. The final PR head and matching successful workflow run are recorded in PR #366's **Exact final-head verification** ledger after the final documentation commit, avoiding a self-referential extra commit. Three actual Local E2E reports separately establish the browser acceptance.

## Scope

TASK-059's diff against latest develop is limited to tests, runner, one npm aggregate, QA/Result and WBS 9.6 tracking. Product UI integrations are already merged dependencies. Profile uses existing owner-verified APIs; Trip Library uses real B contracts and explicitly unavailable unknown metadata. No API/schema/migration redesign, A WBS 8.5, WBS 9.7/9.8, Production/Staging mutation or external provider write is introduced. Do not merge PR #366 or complete/close WBS 9.6 / Issue #364 without separate user acceptance and authorization.
