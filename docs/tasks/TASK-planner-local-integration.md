# TASK-PLANNER-INTEGRATION-A — Restore local Planner changes

## Metadata

- Task ID: TASK-PLANNER-INTEGRATION-A
- Owner: A
- Status: 待验收
- WBS: 4.37 / 4.38 / 4.40 / 4.41 / 7.12
- GitHub Issue: #203
- Branch: `codex/planner-local-integration-20260908`
- Depends On: merged Planner / Detail workspace in develop
- Base: `6386c83c21ecd4b8172d9faa39aef2b01fdf315c`
- Commit: `0006814de1492128deb6a41a7cd95cb4bc330095` (implementation; subsequent tracking-only commit on the same branch)
- Pull Request: [#204](https://github.com/kanzakimy0/TravelAssist/pull/204) — Draft, not merged

## User request

Recover the latest local Planner changes missing from the preview, combine them with current develop and upload to GitHub. The user explicitly permits the existing public Mapbox token for local preview only; never commit local configuration or credentials.

## Scope

- Audit both original working directories; preserve their uncommitted changes.
- Integrate the later Planner timeline, Detail actions, hotel endpoints and range-aware secondary panels onto current develop, without importing superseded layout/header code.
- Preserve current shared map/workspace lifecycle, browser-only explicit Detail saving, B Personal Center, Japan-only assets and Engine ownership.
- Restore local Mapbox, retain interactive fallback, fix reproducible integration/runtime errors.
- Reconcile local WBS IDs without overwriting Engine entries; preserve historical Result records with an explicit ID cross-reference.

## Acceptance

- Install existing locked dependencies; lint, typecheck, production build and all Node tests.
- Full format check with byte-for-byte base comparison for pre-existing failures; no new format failures.
- Desktop real Mapbox and forced fallback; desktop/mobile timeline editing, lock, keyboard movement, +15 minute insertion, range switching and Detail reminder handling. Desktop pointer drag and fixed bottom height.
- Redacted QA report in Git, screenshots in ignored local QA output; no token or production asset catalog changes.
- Update Result / WBS / Issue, commit and push; create a Draft PR to develop. No automatic merge.

## Non-goals

No new DB, Auth, AI, Directions, booking service or production credentials. No real hotel booking or payment. No Engine implementation. No global restoration of obsolete feature branches.
