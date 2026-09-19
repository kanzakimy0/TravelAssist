# TASK-026-A — WBS 8.5 Trip Plan Schema Acceptance / Integration Closeout

- Issue: #256
- Owner: A / Main Travel System / Persistence
- WBS: 8.5
- Source task: TASK-019-A
- Source PR: #227
- Existing branch: `codex/a-trip-plan-schema`
- Status: Partially Completed / acceptance evidence current, repository baseline follow-up required

## Objective

Re-integrate and revalidate the existing Trip Plan persistence implementation against the latest
`origin/develop`, without rewriting the schema or creating another implementation branch.

## Required acceptance

- Merge latest `origin/develop` normally and preserve newer Home, Planner, Auth, routing, security,
  observability, and deployment work.
- Replay migrations from an empty Local Supabase database and regenerate database types.
- Revalidate the four-table Trip Plan tree, owner-only RLS, anonymous and cross-user denial,
  active-plan ownership, revision/CAS behavior, concurrency, rollback, canonical contract
  round-trip, and Auth account cascade.
- Run the repository regression, lint, typecheck, production build, task-owned formatting, and diff
  checks.
- Update TASK-019/TASK-026 Result evidence, WBS 8.5, Issue #256, and existing Draft PR #227.

## Boundaries

- No new Trip schema or second implementation.
- No B Preference, Trip Draft, Trip Library, or UI work.
- No Engine, POI, Route, AI, Booking, Payment, or production database work.
- No automatic merge; WBS 8.5 remains `待审查` until user acceptance and merge to `develop`.
