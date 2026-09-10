# TASK-036-A Result — Trip Planning Contracts / Validators / Fixtures Foundation

## Status

TASK-036主体已通过 PR #295 / #296 进入 `develop`；review fixes implementation complete / Pending review. This follow-up adds fail-closed cross-field invariants for expired facts, POI projection identity, and Planning Compact route priors. The P0 designs remain Freeze Candidates; this Result does not promote them to Frozen v1.

## Base / Design Base / develop integration state

- Design base: `origin/design/a-trip-engine-poi-ai-architecture-v2` at `cb96645db40c98389a554c830f1c0dd5f769d4f5`.
- Initial develop integration: `origin/develop` at `2d3df8819da0e02b6b8449097dc2b95cd475f9d9` through normal merge commit `e14f9a8`.
- Final develop integration: execution-time advance `f14ac40d329d96d900a53e832ba40e8e4abe8cbd` (B-owned Engine contract closeout) through normal merge commit `29d9c044655607d08c55f77c47cfcfb442a7c399`.
- Design PR #266 was open and unmerged when the implementation was completed; it was subsequently integrated into `develop` through PR #295.
- The newly frozen B-owned Trip Mutation Engine contract was reviewed after integration; it does not conflict with or get copied by this Planning contract namespace.

## Issue

- [#291](https://github.com/kanzakimy0/TravelAssist/issues/291) — TASK-036-A.

## Branch

`codex/a-trip-planning-contract-foundation`

## Commit

`7a95da6252110a638f8ab0a2e1a819a1bf9df727` — `feat(planning): add TASK-036 contract foundation`.

## Pull Request

[#293](https://github.com/kanzakimy0/TravelAssist/pull/293) — the pre-review implementation was integrated through [#295](https://github.com/kanzakimy0/TravelAssist/pull/295); the remaining review-fix diff is retargeted to `develop` and remains Draft / unmerged.

## Files created/changed

- `src/shared/contracts/planning/common.ts`
- `src/shared/contracts/planning/features.ts`
- `src/shared/contracts/planning/poi.ts`
- `src/shared/contracts/planning/regions.ts`
- `src/shared/contracts/planning/scoring.ts`
- `src/shared/contracts/planning/candidates.ts`
- `src/shared/contracts/planning/ai.ts`
- `src/shared/contracts/planning/facts.ts`
- `src/shared/contracts/planning/replanning.ts`
- `src/shared/contracts/planning/trace.ts`
- `src/shared/contracts/planning/validation.ts`
- `src/shared/contracts/planning/fixtures.ts`
- `src/shared/contracts/planning/index.ts`
- `tests/task-036-planning-contracts.test.mjs`
- `package.json`
- `docs/tasks/TASK-036-a-trip-planning-contract-foundation.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/tasks/RESULT-TASK-036-a-trip-planning-contract-foundation.md`

## Public contract entry point

`src/shared/contracts/planning/index.ts` is the single public Planning contract entry point. It also re-exports the canonical Trip and Route contract versions/types by reference instead of creating competing schemas.

## Implemented contract groups

- Complete 43-code POI Feature keyspace, feature ownership and `0..9 | null` semantics.
- Effective and sparse Preference contracts, including explicit neutral `5` and compact omit-5 semantics.
- POI planning projection and configurable Visit Profile with duration ordering and standard-visit load baselines.
- Region nodes, structural relations, directional TravelEdge priors, variants and gateway references.
- Separate score components, coverage/confidence breakdowns, constraint gates and itinerary feasibility results.
- Candidate pipeline stages/statuses and hard-reject versus soft-ranking boundaries.
- AI Compact Context V1, Gateway-only Local ID map and AI Decision/Patch V1 intent contracts.
- Runtime overlay, replan trigger/scope/protection/assessment/proposal metadata with Trip/Plan/Runtime revision binding.
- Planning Fact, prior, provenance, freshness/usability metadata without hard-coded TTLs.
- DecisionRun trace for Engine-only and Engine+AI paths with privacy-safe references and aggregate telemetry.

## Validator coverage

Dependency-free strict parsers reject unknown versions/fields/codes, missing fields, invalid enums, non-finite or out-of-range numbers, duplicate IDs, dangling graph references, relation cycles, reverse duplicates for symmetric relations, invalid duration/range ordering, cross-POI projection identity, expired-fact actions that still claim usability, Planning Compact priors carrying exact timetable minutes, invalid AI state combinations and protected-reference mutations. Validation errors expose only safe machine-readable `path` and `code` values and never echo input payloads.

## Positive fixtures

Synthetic fixtures cover the 43-dimensional feature vector with both `0` and `null`, effective neutral `5`, sparse omit-5 preference, 60/90/120-minute Visit Profile, directional multi-variant Region Graph, score/coverage/confidence breakdown, feasibility PASS and canonical 30-versus-60/90 CRITICAL example, hard-rejected Candidate, Local-ID AI context, AI decision/context-request states, protected rest-of-day replan proposal, freshness evaluation, Engine-only trace and Engine+AI trace.

## Negative fixtures

Synthetic invalid fixtures cover incomplete/unknown feature vectors, compact neutral `5`, invalid Visit Profile order, cross-POI FeatureSet and VisitProfile attachment, Region Graph cycle and symmetric reverse duplicate, out-of-range score, unknown AI Local ID, run/task mismatch, duplicate/illegal choices, invalid status/payload combinations, unsupported expansion, `EXPIRED + USE` fact misuse, planning priors with exact arrival/departure minutes, protected replan overlap and forbidden raw provider fields. The freshness enum rejection remains separately covered and is not presented as expired-state misuse coverage.

## Trip/Route compatibility

Planning imports/re-exports canonical Trip and Route contracts without copying their models. Existing Trip Plan, Route contract, Ekiworld routing boundary, Planner route integration and the newly frozen B-owned Engine feasibility suites remain green after the final `develop` merge.

## Commands/tests and exact outcomes

- `npm ci` — PASS.
- `npm run test:planning-contracts` — PASS, 21/21 after the review invariants and dedicated negative tests were added.
- Initial relevant Trip/Route command — PASS, 75/75.
- Review follow-up canonical Trip/Route/Engine compatibility command — PASS, 130/130.
- `npm run test:routing` — PASS, 28/28.
- `npm run lint` — PASS.
- `npm run typecheck` — PASS.
- `node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs` — PASS, 823/823.
- `npm run build` — PASS; production compilation and all 19 static page generations completed.
- `npx prettier --check` for every TASK-036-created/modified file — PASS.
- `npm run format:check` — BASELINE EXCEPTION: 62 pre-existing unrelated files fail; 0 TASK-036-created/modified files fail.
- `git diff --check` — PASS after removing the changed Markdown hard-break whitespace.

## Known baseline failures

The repository-wide Prettier check reports 62 pre-existing unrelated files on the integrated base. None is created or modified by TASK-036 and a targeted check of every TASK-036 file passes. TASK-036 therefore adds zero formatting failures. Existing Node ESM package-type warnings appear in legacy tests but do not fail the 820-test suite; changing package module mode is outside this Task.

## Deferred runtime work

Live AI/Provider calls, POI and Region corpora, tuned weights, candidate search/optimization, route search, Trip persistence, Mutation Engine runtime, replan workers, Fact refresh jobs, UI changes, booking/payment actions and the 100-real-POI pilot remain out of scope.

## WBS updated Yes/No

Yes. WBS 4.47 and the current Task tracking row remain `待审查` for this review follow-up; no dependent WBS item is marked complete.

## Recommended next Task

After normal review of PR #266 and this stacked Draft PR, run the separately scoped 100-real-POI scoring pilot and Consumer Review. Do not start it automatically from TASK-036.
