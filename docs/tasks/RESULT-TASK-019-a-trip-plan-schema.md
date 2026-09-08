# TASK-019-A Result

## Status

Completed — implementation and real Local acceptance scope; **not merged / not user acceptance**. WBS 8.5 is 待审查; Issue #226 stays Open. Draft PR only. Execution started 2026-09-08, acceptance 2026-09-09 JST. No subsequent Task started.

## Prerequisite

- origin/develop base: `74bc3cccf8bcfd603706e2b96d4072076191f308`; final fetch unchanged.
- 4.17 present: Yes, #216 merge `ec9b06240040881b6fdc249bf0967f820ac2406b`, accepted freeze #217 in develop; ancestry checked.
- 8.1 present: Yes, #186 merge `24dff4e3b74dfe01c369d2c149d37eba86ad6472`, real DB acceptance in develop; ancestry checked.
- TASK-017-B / PR #221 state at start: Open / Draft / Partial; head `ae8b1e18ea713a2d86b1126178522e1752b1cb8d`; #207 Open.
- TASK-017-B / PR #221 state at finish: unchanged. No stack/cherry-pick or B migration copied. Future merge requires preserving B migration and rerunning reset/types/RLS/full regression.
- Original dirty user worktree and previews untouched; independent clean worktree created from latest develop, not spec/Planner/B feature branches.

## Tracking

- Issue: [#226](https://github.com/kanzakimy0/TravelAssist/issues/226), Open.
- Task File: `docs/tasks/TASK-019-a-trip-plan-schema.md`; full remote Codex command also archived unchanged in scope.
- Branch: `codex/a-trip-plan-schema`.
- Implementation Commit: PENDING.
- Final Head: PENDING.
- Draft PR: PENDING → develop; do not merge.
- WBS updated: Yes, 8.5 待审查, not 已完成. No other WBS advanced.

## Schema

- trips: UUID + verified Auth owner, title/status/IANA zone/active plan/provenance, DB-authored audit/revision.
- trip_plans: multiple ordered candidate plans, revision, immutable parent.
- trip_days: numbered local dates and independent timezone, repeated dates supported.
- itinerary_items: scheduled/alternative bucket + position; minimal place reference/coordinates; nullable schedule; independent lock/assessment/booking facts.
- indexes / constraints: owner, parent/order/date/start indexes; composite same-trip active-plan FK; deferred unique plan/day/item ordering; coordinate/schedule/code/confirmed-evidence checks. UUID/parent immutable; no fake POI/Route FK. SQL is sole history, Drizzle key metadata verified against real DB.
- delete behavior: owner account / Trip cascades all descendants; Plan/Day cascade children; active Plan must first be cleared/switched. Actual GoTrue account deletion verified, other owner unaffected.
- Migrations: `20260908150000_create_trip_plan_schema.sql`, `20260908150100_add_trip_plan_rls_revision.sql`; original B Profile migration untouched.

## Contract Projection

- TripPlanSnapshotV1 → DB: strict parser before DB, verified Auth user, transaction-local authenticated RLS, typed Drizzle transaction. Internal create/read/replace/remove only; no HTTP/UI save API.
- DB → TripPlanSnapshotV1: repeatable snapshot, ordered reconstruction, canonical parser validates read result. No duplicate full-state JSONB store.
- round-trip fixtures: minimum, full, multi-plan/active plan, three days, scheduled/alternative, nullable meal, future codes, confirmed evidence, DST repeated hour, cross-zone flight, date-line repeated date, subsecond instants. 16 pure cases and real persisted fixtures pass.
- unknown code handling: forward-compatible lowercase text; canonical conservative fallback. No DB enum freezing future codes.
- Explicit creation semantics: fresh UUID identities / revision 1 required; legacy non-UUIDs or imported high initial revisions are rejected, not silently rewritten. DB owns updatedAt; ISO offset spelling normalizes but instant/local-date/zone semantics survive. See `docs/architecture/trip-plan-persistence.md`.

## Revision / Concurrency

- trip revision: starts 1; affected existing tree increments once per transaction, including child edits.
- plan revision: starts 1; affected existing Plan increments once per transaction; new Plan remains 1.
- stale write: root and Plan expected-token checks; SQL guard rejects revision jumps/marker spoofing; repeatable-read concurrency gives one winner for two same-version writes. Stable public errors without SQL/payload/credentials.
- transaction rollback: deliberate late collision with another tree's item ID rolls back root title, revision, child deletion/insertion; original snapshot byte-equal after failure.
- Raw low-level table CRUD is owner-protected, but blind SQL is not a CAS public API. All future snapshot-save integrations must use the checked DAL. No Engine ChangeSet or history implemented.

## RLS

- owner access: actual Auth login identities, owner CRUD and tree read/write pass.
- cross-user denial: B cannot select/insert/update/delete A's four-level tree; repository returns NOT_FOUND for inaccessible roots.
- anon denial: all four table read/write operations denied by grants/default-deny.
- child ownership escape attempts: parent FK spoofing and immutable parent/ID attacks rejected; activePlan cannot cross Trips.
- Narrow ancestor-touch trigger is security-definer only to permit Auth service account cascade; fixed search_path, no dynamic SQL/arguments, no public/anon/authenticated EXECUTE. Direct invocation denial tested. Other guards are invoker. No browser service-role policy.

## Local Supabase

- start: PASS, actual Local Supabase CLI 2.116.0 / Docker 29.7.2, no cloud endpoint.
- status: PASS, loopback API 54321 / Studio 54323 / mail 54324; credential-bearing CLI output withheld.
- reset: PASS, multiple from-zero replays; final replay after final fetch. Pre-reset old stopped test DB verified 0 Auth users and all seven prior tables 0 records; no real user data removed.
- types: PASS, real CLI generation. Final repeated generation byte-identical SHA-256 `78de41f5c9b6eb97729c87d59c1b6ed7f7f563a9657c658f5e306dfccff07a24`.
- runtime tests: TASK-019 **21/21**; existing TASK-016 **25/25**. Two real temporary GoTrue accounts logged in. Fixtures removed; 0 users and 0 Trip rows verified afterward.
- stop: PASS; task-started Local stack stopped, volumes preserved.
- First runtime uncovered Auth cascade permission failure; fixed confined trigger, replayed schema and reran all real gates. No failing attempt reported as PASS.

## Validation

- npm ci: PASS, 395 locked packages installed; no dependency/version or package-lock changes. Only two dedicated test scripts added.
- lint: PASS.
- typecheck: PASS.
- full tests: **634/634**, no failed/skipped tests; includes wrapper proving all 16 isolated server-only projection cases ran. TASK-019 Local 21 and Profile Local 25 are separately executed real suites, not simulated by static tests.
- format / diff check: changed files PASS; full repository formatter exits 1 with **28 unchanged baseline Markdown failures**, new/changed failures 0. All failing files verified unchanged versus latest origin/develop; no unrelated reformat. `git diff --check` PASS.
- build: PASS, 23 prerendered pages, no real cloud database configuration/connection required.
- Browser QA: not applicable, no UI changes; no new browser integration claimed.

## Scope Preserved

- TASK-017-B tables untouched: Yes; no travel_preferences/trip_drafts/snapshot/override implementation imported or modified.
- Preference / Companion untouched: Yes. Original Profile migration/schema unchanged. Two existing Profile tests now enumerate their same three owned tables explicitly so new A tables don't invalidate B-only assertions; all prior assertions retained and real 25-test suite passes.
- Planner UI untouched: Yes, also Start/Personal Center/Mapbox/local drafts/previews untouched.
- POI / Route schema not invented: Yes.
- Booking / Payment not implemented: Yes, only canonical evidence facts; no purchase/provider calls.
- no secrets: No environment/credential files added; runtime captures local keys in memory and never publishes them. Server-only import/bundle boundary tested. No production database/secret used.
- No Saved Trips 5.18/5.19, Engine 4.20–4.24, AI 6.x or downstream task.

## Ready For Review

Yes — keep PR Draft awaiting user acceptance; WBS 8.5 remains 待审查. This does not authorize merge or mark the work 已完成.
