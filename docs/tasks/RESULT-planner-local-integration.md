# TASK-PLANNER-INTEGRATION-A Result

## Status

待验收 / [Draft PR #204](https://github.com/kanzakimy0/TravelAssist/pull/204) published. Implemented in an isolated integration worktree; not yet merged into develop.

## Tracking

- Issue: #203
- Branch: `codex/planner-local-integration-20260908`
- Base: `6386c83c21ecd4b8172d9faa39aef2b01fdf315c`
- Commit: `0006814de1492128deb6a41a7cd95cb4bc330095` (implementation; subsequent tracking-only commit on the same branch)
- Draft PR: [#204](https://github.com/kanzakimy0/TravelAssist/pull/204), open and unmerged
- Task: `docs/tasks/TASK-planner-local-integration.md`

## Recovery / Conflict Audit

The previous preview ran clean develop, while newer changes remained uncommitted in the older `TravelAssist-task012` worktree at `540e6dbaae8512084d08e308396c8999e1ba5a77`. Its Planner source, tests and QA base had no changes between that commit and current develop. The scoped local patch therefore applied without conflict. Untracked implementation and four local Results were also preserved.

The original OneDrive working tree contains much older concept work. Its five artwork binaries and media README match the current committed assets; the newer layout already incorporates the later accepted design. Its old full navigation/header and styles were not applied over the current map-to-top workspace. Both original dirty working trees remain untouched.

The old preview had no local Mapbox configuration. The user authorized copying only the existing public Mapbox setting into the new worktree's ignored `.env.local`. No token is present in this PR. Old preview processes were stopped; one freshly built integrated production preview now owns port 3113.

## Implemented

- Compact two-track Planner timeline, proportional day ruler, pointer/keyboard movement, insertion at predecessor end +15 minutes, duration editing and lock protection. No artificial free-gap restriction.
- Hotel departure/return endpoints, meal placeholders and transport synchronization; placeholder locations are not fake POIs or orders.
- Detail agreement applies the proposed safe edit; ignoring dismisses the current reminder, not the itinerary item. Missing meal/hotel slots use the large add control; protected reservations remain protected.
- Range-aware secondary panels for one day, three days and all days, with booking entries filtered to relevant items.
- Existing browser snapshots extended for new fields; Planner remains unsaved recommendation/editing state, explicit saving remains in Detail.
- Mapbox async import cancellation guard prevents stale Strict Mode initialization; SVG artwork titles now have a single React text child.

## Existing and Reverified

Shared Planner / Detail map lifecycle, interactive fallback, registered illustrative artwork, map-to-item selection, responsive bottom drawer and 25vh desktop bottom panel were retained. Real Mapbox style, tiles and fonts returned HTTP 200 in local QA.

## Validation

- `npm ci`: passed, 362 packages, zero reported vulnerabilities.
- `npm run lint`, `npm run typecheck`, `npm run build`: passed; 21 generated pages.
- Full Node tests: 521 passed, zero failed/skipped. Initial post-QA run exposed two asset-catalog coverage failures because screenshots had been placed among production-scanned sources; moving QA output to the ignored QA cache restored the unmodified asset tests. No assertions or catalogs were weakened.
- Full format check: exit 1, exactly 28 unchanged baseline document failures, zero new failures. Each failed file was compared byte-for-byte against the base and its baseline formatting failure reproduced. See `docs/qa/planner-local-integration/format-baseline.json`.
- `git diff --check`: passed.
- Browser: Chrome 152, 1440×900 real Mapbox + forced fallback, 390×844 and 320×740 fallback. Time editing, lock/unlock, keyboard movement, insertion at 13:30 +15 = 13:45, all-day range, booking panel and Detail ignore passed in all cases. Pointer movement passed on both desktop cases. No page exceptions/hydration errors; no document horizontal overflow. Desktop bottom panel remains approximately 25% viewport height.
- Fallback deliberately aborts Mapbox requests; corresponding network errors are expected. The existing favicon 404 is not a map failure. An obsolete installed Chrome 111 cannot support the existing native Popover API; final QA uses Chrome 152.
- Reproduction: `tools/qa/planner-local-integration-check.mjs`, with `PLAYWRIGHT_MODULE`, `CHROME_EXE` and `PLANNER_QA_URL` pointing to the local runtime/current browser/preview. JSON evidence: `docs/qa/planner-local-integration/results.json`; screenshots: ignored `.cache/qa/planner-local-integration/`.
- Screenshots are QA outputs, not destination assets. They are retained locally, outside the production asset scan. No changes to frozen Japan manifests, variant registry, source catalog, package lock or database files.

## WBS Update

Old UI IDs 4.20–4.36 conflicted with merged B Engine IDs 4.20–4.24. Engine remains unchanged; the old UI sequence maps to 4.25–4.41 (old ID +5). Four preserved local Results retain their historical IDs and are superseded for tracking by this Result.

New work 4.37 / 4.38 / 4.40 / 4.41 and local map verification 7.12 are 待审查, not 已完成. Already merged UI/Mock rows are explicitly distinguished from real APIs. Old artwork 2.16 maps to 2.17, preserving Japan entity resolution 2.16. Existing B wizard rows are not duplicated or reassigned.

## Non-goals / Limitations

No real booking/payment, routing API, AI, Auth, DB or Engine work. Mapbox uses authorized local configuration only; another checkout requires its own local configuration and rebuild. Uploading this branch does not update develop until its PR is merged. The user browser's existing saved data was not cleared or overwritten by tests, which run isolated contexts.
