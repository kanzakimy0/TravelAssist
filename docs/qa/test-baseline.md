# TravelAssist test framework and global baseline

Status: **review baseline for WBS 9.1**  
Measured revision: `origin/develop@171900698180b80220017c9c4bec551b72792f27`  
Audit date: 2026-09-10 JST  
Runtime used for the audit: Node `v24.19.0`, npm `11.17.0`, Windows

This document is the canonical map of the repository test surface. Counts and timings below are evidence for the named commit and machine only. They are not a permanent pass threshold. A later change must rerun the commands and record its own evidence.

## Canonical entry points

| Layer                       | Canonical command                                                                               | Default CI                                                  | Environment contract                                                            |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Locked install              | `npm ci`                                                                                        | Yes                                                         | Repository Node version from `.nvmrc`                                           |
| Repository Node baseline    | `npm test`                                                                                      | Yes                                                         | Offline fixtures; no production credential or cloud dependency                  |
| Routing focus               | `npm run test:routing`                                                                          | Covered by `npm test`; run separately while changing routes | Sanitized fixture responses; live Ekiworld is separate                          |
| DB foundation static checks | `npm run test:db-foundation`                                                                    | Covered by `npm test`                                       | No database connection                                                          |
| Local Profile/Auth runtime  | commands in **Local DB / Auth runtime**                                                         | No                                                          | Verified Local Supabase only; destructive reset requires exclusive ownership    |
| Browser / E2E smoke         | `npm run qa:browser:smoke`                                                                      | No                                                          | Local production server plus an explicitly supplied external Playwright runtime |
| Task browser suites         | commands documented by the owning Result/QA README                                              | No                                                          | Task-specific fixture/server/evidence contract                                  |
| Deployment contract         | `npm run deploy:validate:local`, `npm run deploy:build:local`, `npm run deploy:verify-artifact` | Yes                                                         | Local fixture configuration; no external deployment                             |
| Quality                     | `npm run lint`, `npm run typecheck`, `npm run format:check:deploy`, `git diff --check`          | Yes                                                         | Ordinary repository checkout                                                    |
| Full production build       | `npm run build`                                                                                 | Indirectly through `deploy:build:local`                     | Must not require a cloud database, route key or Mapbox token                    |

`npm test` is the one canonical Node entry. It uses the repository's existing `register-planner-ts.mjs` resolver so extensionless TypeScript imports behave consistently. The quality workflow now invokes that script instead of duplicating its implementation. `npm run typecheck` first runs `next typegen`, as required for a clean Next.js checkout before `tsc --noEmit`; generated `next-env.d.ts` remains ignored and is never hand-edited. Focus scripts are for diagnosis and ownership, not additional unique coverage in CI.

## Test layers and ownership

### Unit and model

Pure Node `node:test` cases cover Planner scheduling, browser-persistence models, wizard state, Personal Center presentation models, asset helpers and deployment contracts. Ownership follows the feature under test: Planner/Home/Route/Asset/DB infrastructure is A; Personal Center, preferences and companions are B; navigation, auth boundaries and shared contracts are shared.

### Contract

- Trip snapshot contract: `tests/wbs-4-17-trip-contract.test.mjs`.
- Route contract and normalized provider errors: `tests/task-022-route-contract.test.mjs`, `tests/task-022-routing-boundary.test.mjs`.
- Auth/profile static contracts: `tests/task-015-db-foundation.test.mjs`, `tests/task-016-user-profile.test.mjs`, `tests/task-018-authentication.test.mjs`.
- Asset manifest/variant contracts: the five `task-013-*.test.mjs` files.
- Deployment environment contract: `tests/task-025-environment-deployment.test.mjs`.

Contract fixtures must be synthetic, sanitized and deterministic. They must never contain a credential copied from a live response.

### Integration

The ordinary Node baseline includes cross-file integration checks for Planner ↔ Detail, Planner ↔ routing, localStorage serialization, navigation, asset catalogs and build/deployment tooling. These remain fixture integrations unless the command explicitly declares a real local service.

### Local DB / Auth runtime

These four files are intentionally outside the ordinary `*.test.mjs` glob:

- `tests/task-016-user-profile.runtime.mjs`
- `tests/task-018-authentication.runtime.mjs`
- `tests/wbs-5-3-auth-callback.runtime.mjs`
- `tests/wbs-5-3-auth-user-flow.runtime.mjs`

Canonical A/DB runtime commands after an exclusive Local Supabase preflight are:

```text
npm run db:start
npm run db:status
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-018-authentication.runtime.mjs
npm run db:stop
```

The B visual Auth runtime scripts additionally require a local production application and browser harness; use their Task Result command sequence rather than invoking them as unit tests. Do not run `db:reset` while another worktree owns the shared `travelassist` stack. Before any reset, verify the Docker container label, loopback endpoints, task ownership and that all rows are disposable.

Temporary Auth/DB data rules:

1. Generate unique users with a random UUID or task-prefixed synthetic address.
2. Use a transaction and deliberate rollback where the contract permits it.
3. When an Auth API transaction is impossible, register cleanup before the first mutation and remove every temporary user in `finally`.
4. Assert the expected precondition before destructive reset; never point test helpers at remote Supabase.
5. Do not print CLI status JSON, database URLs, tokens, email links, OTPs or raw provider errors.
6. A cleanup failure is a test failure and must name only the synthetic fixture identifier, never a secret.

### Browser / E2E

The repository deliberately does not install Playwright as an application dependency. `npm run qa:browser:smoke` is the shared local-only smoke for `/`, `/start`, Planner and Detail at 1440×900 and 390×844. It requires `PLAYWRIGHT_MODULE`, a production server at `TASK_035_QA_URL`, and an existing Chromium channel. It writes no tracked screenshots and does not claim real Mapbox or Auth.

Sixteen task browser harnesses reuse an explicitly supplied external Playwright runtime and a local server:

```text
tests/personal-center-followup.browser.mjs
tests/wbs-5-10-trip-library.browser.mjs
tests/wbs-5-20-personal-center-responsive-states.browser.mjs
tests/wbs-5-3-auth-callback.browser.mjs
tests/wbs-5-3-auth-navigation.browser.mjs
tests/wbs-5-3-auth-surfaces.browser.mjs
tests/wbs-5-3-auth-user-flow.browser.mjs
tests/wbs-5-3-login-layout.browser.mjs
tests/wbs-5-3-logout-style.browser.mjs
tests/wbs-5-5-preferences.browser.mjs
tests/wbs-5-6-companions.browser.mjs
tests/wbs-5-7-mobility-preference.browser.mjs
tests/wbs-5-8-attraction-activity-preference.browser.mjs
tests/wbs-5-9-dining-accommodation-budget.browser.mjs
tests/wbs-5.4-v2.browser.mjs
tests/wbs-9-12-personal-center-qa.browser.mjs
```

The owning QA README defines its URL, fixture server, browser engine, viewport and evidence path. `CODEX_PLAYWRIGHT_PATH` or `PLAYWRIGHT_MODULE` must identify an existing compatible runtime; `WBS_BASE_URL` or the task-specific URL must resolve only to localhost. A Chromium/Edge pass is not a Safari, Firefox, physical-touch or cloud pass.

### Live provider / external

Ekiworld, Mapbox, OAuth providers, SMS, hosted Supabase, Preview/Production deployment and third-party booking services are never exercised by `npm test`. A sanitized fixture result is not live-provider evidence. Live smoke requires an authorized local credential and a task-specific, redacted report. Production Evaluation routing remains fail-closed.

## Complete repository inventory

### Node baseline files

The source baseline contained 61 `tests/*.test.mjs` files. TASK-035 adds one governance regression, `tests/task-035-test-baseline.test.mjs`, for 62 files on this branch.

**Planner, Home, Start and shared workspace (31):**

```text
browser-trip-save.test.mjs; bulk-booking.test.mjs; detail-card-actions.test.mjs;
detail-compact-board.test.mjs; detail-overview-locations.test.mjs;
planner-artwork.test.mjs; planner-audit-fixes.test.mjs;
planner-audit-regressions.test.mjs; planner-concept-refinement.test.mjs;
planner-local-integration.test.mjs; planner-meal-booking-refinement.test.mjs;
planner-quick-menu-design.test.mjs; planner-range-enrichment.test.mjs;
planner-responsive-density.test.mjs; planner-route-board.test.mjs;
planner-sight-timeline.test.mjs; planner-status-stack.test.mjs;
planner-track-actions.test.mjs; planner-working-plan.test.mjs;
task-007-background.test.mjs; task-007-calendar.test.mjs;
task-007-info-popover.test.mjs; task-008-planner.test.mjs;
task-0081-map-booking.test.mjs; task-0082-visuals.test.mjs;
task-0083-interactions.test.mjs; task-010-b-global-logo-navigation.test.mjs;
task-010-navigation.test.mjs; task-011-trip-detail-workspace.test.mjs;
task-012-planner-v05.test.mjs; trip-preparation.test.mjs
```

**Assets (5):** `task-013-1-asset-variants.test.mjs`, `task-013-2-core-generation-manifest.test.mjs`, `task-013-3-1-japan-destination-closure.test.mjs`, `task-013-3-japan-destination-resolution.test.mjs`, `task-013-assets.test.mjs`.

**DB/Auth/shared contracts (6):** `task-015-db-foundation.test.mjs`, `task-016-user-profile.test.mjs`, `task-018-authentication.test.mjs`, `wbs-4-17-trip-contract.test.mjs`, `wbs-5-3-auth-callback.test.mjs`, `wbs-5-3-auth-user-flow.test.mjs`.

**Routing (4):** `task-022-ekiworld-routing.test.mjs`, `task-022-route-contract.test.mjs`, `task-022-routing-boundary.test.mjs`, `task-023-planner-route-integration.test.mjs`.

**Deployment, shell and visual contract (5):** `task-024-main-shell.test.mjs`, `task-025-2-concept-fidelity.test.mjs`, `task-025-2-coral-palette.test.mjs`, `task-025-2-v11.test.mjs`, `task-025-environment-deployment.test.mjs`.

**Personal Center/preferences (10):** `trip-status-personal-center-followup.test.mjs`, `wbs-5-10-trip-library.test.mjs`, `wbs-5-20-personal-center-responsive-states.test.mjs`, `wbs-5-5-preferences.test.mjs`, `wbs-5-6-companions.test.mjs`, `wbs-5-7-mobility-preference.test.mjs`, `wbs-5-8-attraction-activity-preference.test.mjs`, `wbs-5-9-dining-accommodation-budget.test.mjs`, `wbs-5.4-v2.test.mjs`, `wbs-9-12-personal-center-qa.test.mjs`.

**TASK-035 governance (1):** `task-035-test-baseline.test.mjs`.

### Test helpers and deterministic fixtures

`tests/register-planner-ts.mjs` and `tests/register-route-ts.mjs` are loader hooks; `task-016-client-bundle.mjs` and `task-018-client-bundle.mjs` are explicit post-build secret-boundary checks; `task-018-local-helpers.mjs` supports local Auth cleanup; `tests/fixtures/ekiworld-course.json` is a sanitized deterministic provider fixture.

### QA tools

The source baseline had fifty scripts under `tools/qa/`; TASK-035 adds `task-035-browser-smoke.mjs`, for 51 scripts on this branch. The task-owned source scripts are:

```text
browser-trip-save-check; bulk-booking-check; detail-action-layout-check;
detail-board-check; detail-compact-board-check; detail-fixed-workspace-check;
detail-responsive-groups-check; detail-status-location-check;
planner-audit-fixes-check; planner-booking-choice-check;
planner-compact-secondary-check; planner-concept-check; planner-density-check;
planner-detail-choices-check; planner-local-integration-check;
planner-panel-boundaries-check; planner-quick-popovers-check;
planner-route-board-check; planner-save-adjustment-check; planner-scenery-check;
planner-settings-redesign-check; planner-shared-timeline-check;
planner-stability-check; planner-status-stack-check; planner-track-actions-check;
planner-v03-check; planner-visual-check; planner-working-plan-check;
project-overview-check; shared-sight-panel-check; start-mobile-check;
start-mobile-interactions; task-010-b-navigation-check;
task-010-navigation-check; task-011-detail-check; task-012-baseline;
task-012-interactions-check; task-012-planner-check; task-013-assets-review;
task-013-validation-record; task-023-route-integration-check;
task-024-shell-check; task-024-visual-auth-fixture;
task-025-2-auth-check; task-025-2-brand-check;
task-025-2-coral-colors; task-025-2-evidence;
task-025-2-home-check; task-025-2-regression; trip-preparation-check
```

TASK-035 shared smoke: `task-035-browser-smoke.mjs`.

Each name above has the `.mjs` suffix. They are not all interchangeable: several write task-specific screenshots/reports and some expect a separately started fixture service. They remain reproducible evidence tools, not the default unit-test glob.

### Workflows

- `quality-gate.yml`: locked install, local environment validation, canonical Node baseline, lint, typecheck, deploy-format scope, standalone build/artifact audit and whitespace check.
- `release-rehearsal.yml`: manually trusted current-`develop` standalone start/smoke; not a Preview or Production deployment.
- `auto-create-pr.yml`: repository automation only for `feature/**`; it is not test evidence.
- `auto-merge.yml`: merge automation for eligible non-Draft PRs; TASK-035 must remain Draft.

Open Draft PR #231 contains the pending security suite (`test:security`, tracked/history/boundary/bundle scans and `security.yml`). Open Draft PR #245 contains the pending observability/performance suite (`test:observability` and lab/browser budget scripts). They are inventoried but are not part of `origin/develop@1719006`; TASK-035 does not copy or pre-merge them.

## Deterministic fixture rules

1. Freeze clock, timezone and random identifiers or assert semantic ranges instead of wall-clock values.
2. Clone fixture inputs before mutation; one test must not alter another test's source object.
3. Never call a real provider from the default baseline. Network adapters use checked-in sanitized fixtures and injected fetch functions.
4. Generated catalogs must be byte-deterministic and a verification mode must be a no-op.
5. Browser screenshots are evidence for an exact viewport/engine/revision, never a universal pixel promise.
6. Test credentials use unmistakable fixture values; no output may include a real token, cookie, password, OTP, database URL or private provider payload.
7. Locale-sensitive assertions set the locale/timezone explicitly. Japan itinerary fixtures use `Asia/Tokyo` and preserve local-date versus instant semantics.

## Deferred taxonomy

The status belongs in Result/Issue/PR evidence with the exact prerequisite and owner:

| Status                   | Meaning                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------- |
| `PASS`                   | Command actually ran at the recorded revision and all assertions passed.                                |
| `FAIL`                   | Command ran and at least one assertion failed; include the safe failure name.                           |
| `DEFERRED_ENVIRONMENT`   | Required local runtime, browser binary, Docker capacity or exclusive service ownership was unavailable. |
| `DEFERRED_CREDENTIAL`    | An authorized evaluation credential was absent; fixture tests may still pass separately.                |
| `DEFERRED_AUTHORIZATION` | External deployment, paid vendor, production mutation or account action was not approved.               |
| `DEFERRED_PLATFORM`      | The required real platform, such as Safari/iOS/Android or physical touch/keyboard, was unavailable.     |
| `DEFERRED_EXTERNAL`      | A third-party or hosted service cannot be safely controlled in this run.                                |
| `QUARANTINED_FLAKY`      | A reproducible nondeterministic test is isolated under the policy below; this is never PASS.            |

The baseline must never silently skip a required check. Node's `skipped`/`todo` totals, conditional early returns and missing harnesses must be surfaced as one of the statuses above.

## Flaky-test policy

1. Re-run the single failure at least three times on the same commit and environment.
2. Treat a deterministic failure as `FAIL`, not flaky.
3. Before quarantine, create/link an Issue containing owner, reproduction, failure rate, impact, expiry/review date and the required replacement gate.
4. Quarantine only the narrow test, never the whole feature directory. Keep it runnable via an explicit command and report it as `QUARANTINED_FLAKY`.
5. No `.skip`, `todo`, catch-and-pass, retry-until-green or removed CI command without the tracked quarantine record.
6. Fix or renew before expiry; an expired quarantine fails the baseline.

## Commit-specific audit result

### Source baseline before TASK-035 wiring

`node --test "tests/*.test.mjs"` discovered 709 tests: 706 passed and 3 failed in 15.781 seconds (Node-reported duration). One failure was a harness mismatch: the coral route test needs the existing Planner TypeScript resolver. Two failures were genuine existing asset-catalog debt:

- `nightly --verify-only does not write canonical catalogs` failed because verification detected stale canonical asset state.
- `complete library passes file, schema, hash, rights and protected checks` reported four stale removed design SVG inventory entries.

TASK-035 fixes only the harness entry, not the asset catalog. The two asset failures remain visible and owned by the Asset pipeline; no test is muted to make this baseline green.

### Resulting canonical branch baseline

Final counts and timings are recorded in `RESULT-TASK-035-a-test-baseline-freeze.md` after the branch validations. Browser, DB/Auth runtime and live-provider results remain separately classified below and must not be inferred from `npm test`.

## Coverage gaps and follow-ups

| Gap                                                                                                 | Current classification                                      | Owner / next action                                                                                       |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Asset catalog contains four removed design SVG inventory rows; verify-only is not a no-op           | `FAIL`                                                      | A / Asset: regenerate and review canonical catalogs in an Asset-owned task, then rerun both tests         |
| Browser harnesses are task-specific and absent from default CI                                      | `DEFERRED_ENVIRONMENT` for this audit                       | Shared QA: design a CI-owned supported-browser matrix before WBS 9.4/9.6; retain local evidence meanwhile |
| Local DB/Auth runtime requires exclusive `travelassist` stack and destructive-from-zero assumptions | `DEFERRED_ENVIRONMENT` unless exclusive ownership is proven | A/B DB/Auth owners: run in an isolated CI database or reserved local window                               |
| Security baseline from PR #231 is not merged                                                        | Pending review, not part of baseline                        | WBS 9.10 / TASK-027; integrate only through its PR                                                        |
| Observability/performance baseline from PR #245 is not merged                                       | Pending review, not part of baseline                        | WBS 9.11 / TASK-028; integrate only through its PR                                                        |
| Live Ekiworld/Mapbox/OAuth/SMS/hosted Supabase                                                      | `DEFERRED_CREDENTIAL` or `DEFERRED_AUTHORIZATION`           | Owning provider/deployment task; do not add secrets to CI                                                 |
| Safari/iOS/Android and physical-device behavior                                                     | `DEFERRED_PLATFORM`                                         | WBS 9.4/9.6 or dedicated device QA                                                                        |
| Many historical Planner tests overlap behavior and increase loader warnings/runtime                 | Accepted duplication; no silent deletion                    | A / Planner: consolidate only when preserving named regression coverage and Result traceability           |

WBS 9.1 can move to `待审查` because the framework, entry point, inventory and truthful non-pass taxonomy are frozen. It cannot move to `已完成` until the Draft PR is merged and the user accepts it. The two Asset failures do not become PASS merely because the governance work is complete.
