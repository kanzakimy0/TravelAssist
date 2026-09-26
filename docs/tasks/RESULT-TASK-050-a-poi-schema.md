# RESULT — TASK-050-A Canonical POI Schema / Validator / Candidate Admission Boundary

## Status

Completed / WBS 7.4 canonical POI schema ready for human review.

## Execution

- Issue: #399
- Branch: `codex/a-poi-canonical-schema`
- Execution baseline: `origin/develop@18f15037908d97a954fef2a7e76200cd0f06d450`
- Implementation commit: `c4e81a34`
- Latest develop integration commit: `fc4864485756ae5791ad504e94ff379d18dbfe6a`
- Pull request: [Draft PR #417](https://github.com/kanzakimy0/TravelAssist/pull/417) → `develop`

## Delivered

- One provider-independent `CanonicalPoiV1` source of truth with strict public parsers.
- Dataset-level duplicate identity, active Master Code and lifecycle-target validation.
- Separate candidate admission envelope/result with five outcomes and 14 deterministic gates.
- Reuse of canonical Master Code registry grammar/resolution, merged Region identities, Planning Fact semantics, frozen 43D vector and Visit Profiles.
- Deterministic adapter to the existing `PoiPlanningProjectionV1`.
- Positive and negative fixtures, focused tests and QA evidence.

## Identity decision

Canonical POI internal ID, Master Code, candidate key, Provider ID, asset slot/reference, Region ID, transport-node ID, AI local ID and DB key remain distinct. Only `ADMIT` returns a canonical POI reference; review, block, merge and insufficient-evidence outcomes cannot promote a candidate implicitly.

## Safety boundaries

Static canonical master data rejects realtime timetable/weather/crowd/queue and other runtime fact kinds. Unknown fields reject Provider raw payloads. Rights-restricted or transient Provider fields cannot be marked for canonical persistence. Unknown 43D values remain `null` and cannot be coerced to `0` or `5`.

## Scope confirmation

No production DB write or migration, live Provider call/purchase/credential, B-corpus mutation, whole-corpus Master Code allocation, Planner UI change, scoring change, Route change or Trip model change was made. WBS 7.6, 7.7 and 7.9 remain unstarted.

## Verification

All required gates passed after merging the execution-time latest `origin/develop`:

- `npm ci` — PASS, 395 packages installed, 0 vulnerabilities;
- `npm run test:planning-contracts` — PASS, 21/21;
- `npm run test:planning-soak` — PASS, 6/6;
- `npm run test:routing` — PASS, 28/28;
- `npm run test:poi-contracts` — PASS, 24/24;
- `npm run test:region-graph-pilot` — PASS, 17/17;
- `npm run test:region-master-code-integration` — PASS, 6/6;
- `npm run test:master-code-registry` — PASS, 15/15;
- `npm run test:pr352-delta-revalidation` — PASS, 6/6;
- `npm run lint` — PASS;
- `npm run typecheck` — PASS;
- `npm run build` — PASS.

The Node test runner emitted the repository's existing typeless-package warning; it did not fail any gate.

## Review state

WBS 7.4 is `待审查`. The Draft PR must remain open and must not be merged automatically.
