# TASK-028-A — WBS 9.11 Performance / Observability Acceptance Closeout

- Issue: #258
- Owner: A / Shared Infrastructure / Observability
- WBS: 9.11
- Source task: TASK-024-A (performance/observability)
- Source PR: #245
- Existing branch: `codex/a-performance-observability`
- Status: Ready

## Objective

Refresh the existing performance-budget and privacy-first observability implementation against latest develop and re-establish reproducible performance/error evidence.

## Required work

- Merge latest develop into the existing branch.
- Revalidate browser/server error capture into controlled test sinks.
- Verify privacy redaction: no raw Cookie/Auth/key/user profile/preferences/precise location/trip content/provider payload.
- Re-run Web Vitals/performance budget harness, cold-start samples, Planner/Detail lifecycle stress, error/failure paths and routing regression.
- If current Mapbox token is legally available in the execution environment, run the existing conditional sample without exposing token; otherwise mark it Deferred.
- Confirm observability sink failure never blocks business operation or recursively floods.
- Confirm external transmission remains disabled by default.
- Full tests, lint, typecheck, build, changed-file format and diff checks.
- Sync Result/WBS/Issue/PR #245; do not mark completed before user acceptance/merge.

## Deferred by default

External collector vendor, production RUM p75, real alert delivery and production deployment.

## Final result rules

Before returning:
- update the task Result;
- update the current Master WBS truthfully;
- synchronize Issue/PR tracking;
- commit and push all task-owned changes;
- report exact commands/tests run and exact Deferred items;
- stop. Do not start the next task automatically.
