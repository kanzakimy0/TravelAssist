# TASK-026-A — WBS 8.5 Trip Plan Schema Acceptance / Integration Closeout

- Issue: #256
- Owner: A / Main Travel System / Persistence
- WBS: 8.5
- Source task: TASK-019-A
- Source PR: #227
- Existing branch: `codex/a-trip-plan-schema`
- Status: Ready
- Definition source: `docs/project/A-TASK-026-035-execution-plan.md`

## Objective

Re-integrate and re-validate the existing Trip Plan persistence implementation against the latest `origin/develop`. Resolve current merge conflicts safely, rerun real Local Supabase acceptance, and leave PR #227 in a current, reviewable Draft state. This is not a rewrite.

## Required work

1. Confirm #227 is still the canonical implementation and inspect its changed files.
2. Use an independent worktree on `codex/a-trip-plan-schema`.
3. Merge latest `origin/develop` into that branch without force/history rewrite.
4. Resolve only real conflicts; preserve newer Home/Planner/Auth/routing/security/observability work from develop.
5. Revalidate:
   - migrations from empty Local Supabase;
   - generated DB types;
   - `trips / trip_plans / trip_days / itinerary_items`;
   - owner-only RLS and anon/cross-user denial;
   - active-plan ownership/FK rules;
   - revision/CAS stale-write rejection and concurrency;
   - transaction rollback;
   - canonical `TripPlanSnapshotV1 ↔ DB` round-trip;
   - Auth account cascade boundary.
6. Run full repository tests, lint, typecheck, production build, changed-file format checks, diff checks.
7. Update existing TASK-019 Result plus a TASK-026 closeout Result if useful; synchronize WBS 8.5 to `待审查` if validation passes.
8. Keep PR #227 Draft. User acceptance + merge is required for `已完成`.

## Boundaries

- No new Trip schema.
- No B Preference/Trip Library tables or UI.
- No Engine 4.21+.
- No POI/Route/AI/Booking/Payment.
- No production DB migration.
- No auto merge.

## Final result rules

Before returning:
- update the task Result;
- update the current Master WBS truthfully;
- synchronize Issue/PR tracking;
- commit and push all task-owned changes;
- report exact commands/tests run and exact Deferred items;
- stop. Do not start the next task automatically.
