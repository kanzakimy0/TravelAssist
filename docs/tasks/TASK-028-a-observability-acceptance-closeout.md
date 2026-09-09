# TASK-028-A — WBS 9.11 Performance / Observability Acceptance Closeout

## Metadata

- Task ID: TASK-028-A
- Owner: A / Shared Infrastructure / Observability
- Status: 待验收
- WBS: 9.11
- Priority: P2
- GitHub Issue: #258
- Source Task: TASK-024-A
- Existing Branch: `codex/a-performance-observability`
- Source Pull Request: #245（Draft）
- Latest Develop Baseline: `171900698180b80220017c9c4bec551b72792f27`
- Integrated Acceptance Head: `d9be32a903f87c6096e8c1785e31baa93c7aa11c`
- Result File: `docs/tasks/RESULT-TASK-028-a-observability-acceptance-closeout.md`

## Objective

Refresh the existing performance-budget and privacy-first observability implementation against latest develop and re-establish reproducible performance/error evidence.

## Required Work

- Merge latest develop into the existing branch.
- Revalidate browser/server error capture into controlled test sinks.
- Verify privacy redaction: no raw Cookie/Auth/key/user profile/preferences/precise location/trip content/provider payload.
- Re-run Web Vitals/performance budget harness, cold-start samples, Planner/Detail lifecycle stress, error/failure paths and routing regression.
- If the current Mapbox token is legally available in the execution environment, run the existing conditional sample without exposing the token; otherwise mark it Deferred.
- Confirm observability sink failure never blocks business operation or recursively floods.
- Confirm external transmission remains disabled by default.
- Run full tests, lint, typecheck, build, changed-file format and diff checks.
- Sync Result/WBS/Issue/PR #245; do not mark completed before user acceptance and merge.

## Acceptance Outcome

Integrated local acceptance passed for the privacy-first runtime, controlled browser/server error paths, performance budget, compact overflow, Planner/Detail lifecycle and routing regression. The live Mapbox conditional sample attempted with the locally authorized public token but could not establish the external map in this environment; bounded fallback succeeded and the live sample is therefore Deferred rather than reported as passed.

Three full-suite failures reproduce unchanged on the exact `origin/develop` baseline and are recorded as pre-existing repository debt. They are not hidden or attributed to this closeout.

## Deferred

- External collector vendor and transport.
- Production RUM p75.
- Real alert delivery and production deployment.
- Successful live Mapbox performance sample in this execution environment.

## Completion Boundary

WBS 9.11 remains `待审查`. PR #245 remains Draft and Issue #258 remains Open until explicit user acceptance and merge into `develop`.
