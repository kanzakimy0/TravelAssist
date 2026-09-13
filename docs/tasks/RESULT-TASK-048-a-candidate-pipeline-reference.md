# TASK-048-A Result — Candidate Pipeline Reference Implementation / Pilot Harness

## Status

Completed / Candidate Pipeline reference ready for human review.

WBS 4.49 is `待审查`. The implementation is not merged and no later AI Compact
Context / Decision Adapter task was started.

## Base / Execution Gate

- Base branch: `origin/develop`
- Base SHA: `3ba3f34ea07a160c237c22b85050df5313ea10ae`
- Implementation branch: `codex/a-candidate-pipeline-reference`
- PR #352: merged
- Required merge commit `4465d8fef68456a1d4554322b97fa5b3e3f10b82`:
  confirmed as an ancestor of the base SHA
- WBS 4.48: confirmed `已完成` from the final closeout record
- Production Region nodes: 50
- Canonical Master Codes populated: 50/50
- Production `masterCode = null`: 0
- Active canonical Registry resolution: 50/50

The gate was independently revalidated using the production Region Graph
generator, canonical Registry and TASK-045 integration validator rather than by
trusting a prior Result file.

## Implementation

Implemented a provider-free deterministic Candidate Pipeline reference runtime
with the following fixed stage order:

1. Region Candidate
2. Corridor Candidate
3. POI Expansion
4. Hard Filter
5. Score Input / Projection
6. Route Feasibility
7. Itinerary Feasibility
8. Pareto
9. Diversity
10. Top-N

The runtime:

- validates canonical Effective Preference, Region Graph and POI Planning
  Projection inputs;
- keeps stable domain IDs separate from run-local Candidate IDs;
- rejects hard-invalid candidates and fails closed on unknown critical facts;
- protects must-go items unless an explicit hard constraint makes them invalid;
- exposes a narrow deterministic Pilot score projection without freezing or
  changing production scoring parameters;
- performs multi-objective Pareto selection without a hidden scalar collapse;
- applies bounded diversity without resurrecting rejected candidates;
- uses bounded deterministic fallback expansion and stable tie ordering;
- emits canonical Candidate Run / Decision Run traces for every stage;
- validates persistable output so run-local Candidate IDs cannot leak into
  stable domain output;
- provides byte-stable normalized JSON for repeatability verification.

## Pilot Scenarios

All 14 required scenarios are covered:

1. Tokyo first-time iconic trip
2. Tokyo hidden/local preference
3. Hakone/Fuji corridor
4. Alpine/Hokuriku corridor
5. Kyoto/Nara/Osaka/Kobe corridor
6. Low walking tolerance
7. Low crowd tolerance
8. Must-go item preserved
9. Must-go item impossible because of a hard constraint
10. Route-infeasible candidate removed
11. Critical route/opening fact unknown becomes `NEEDS_FACT`
12. Diversity prevents one-category Top-N monoculture
13. Sparse candidate fallback expansion
14. No-valid-choice terminal case

The fixture POIs are contract-valid deterministic Pilot fixtures. They are not
presented as real production POI records or as evidence of production scoring
quality.

## Negative / Fail-Closed Coverage

The focused suite proves rejection of:

- duplicate Candidate IDs;
- stale run/revision mismatch;
- reintroduction of hard-rejected candidates;
- unknown critical facts treated as PASS;
- silent must-go removal without a hard reason;
- invalid Region references;
- invalid POI references;
- improperly retained Pareto-dominated candidates;
- diversity attempts to revive rejected candidates;
- expansion beyond configured bounds;
- nondeterministic equal-score ordering;
- run-local Candidate IDs in persistable output.

## Acceptance Evidence

| Acceptance gate                           | Result |
| ----------------------------------------- | -----: |
| Deterministic repeat                      |   PASS |
| Byte-stable normalized result             |   PASS |
| Hard reject bypass                        |      0 |
| Must-go silently dropped                  |      0 |
| `NEEDS_FACT` silently promoted            |      0 |
| Dangling Region / POI / Candidate refs    |      0 |
| Improper Pareto-dominated survivors       |      0 |
| Diversity-resurrected rejected candidates |      0 |
| Unbounded loop / retry                    |      0 |
| Decision Trace stage coverage             |   100% |
| AI / provider calls                       |      0 |
| Production DB writes                      |      0 |
| Scoring parameter changes                 |      0 |
| Region Graph semantic changes             |      0 |
| Master Code governance changes            |      0 |
| Planner / Step UI changes                 |      0 |

## Validation

| Check                           | Result           |
| ------------------------------- | ---------------- |
| TASK-048 focused                | PASS — 16/16     |
| Planning Contracts              | PASS — 21/21     |
| Planning Soak                   | PASS — 6/6       |
| Region Graph regression         | PASS — 17/17     |
| Master Code Registry regression | PASS — 15/15     |
| Region Master Code integration  | PASS — 6/6       |
| Routing                         | PASS — 28/28     |
| Trip / Engine focused           | PASS — 124/124   |
| Canonical full Node regression  | PASS — 2532/2532 |
| ESLint                          | PASS             |
| TypeScript                      | PASS             |
| Production build                | PASS             |
| TASK-owned Prettier             | PASS             |
| `git diff --check`              | PASS             |
| GitHub CI                       | Pending Draft PR |

The first sandboxed full regression attempt encountered five filesystem access
errors while esbuild traversed the parent of the isolated worktree. The same
canonical command was rerun with normal repository read access and passed all
2532 tests; no production or test code was changed to mask the environment
restriction.

## Evidence / Files

- `src/features/planning/candidate-pipeline/types.ts`
- `src/features/planning/candidate-pipeline/runtime.ts`
- `src/features/planning/candidate-pipeline/index.ts`
- `tools/qa/candidate-pipeline-pilot.mjs`
- `tests/task-048-a-candidate-pipeline.test.mjs`
- `docs/qa/TASK-048/pipeline-fixtures.json`
- `docs/qa/TASK-048/pipeline-config.json`
- `docs/qa/TASK-048/stage-trace.json`
- `docs/qa/TASK-048/scenario-results.json`
- `docs/qa/TASK-048/failure-cases.json`
- `docs/qa/TASK-048/pilot-report.md`
- `docs/project/WBS-TravelAssist.md`
- `package.json`

Existing B-owned files already present under `docs/qa/TASK-048` were not
modified.

## Scope / Non-Goals

No AI/LLM, live Route/Places/Weather/Booking provider, Human Gold, TASK-039
reviewer answer, candidate-0457 evaluation, production score tuning, Region
Graph or Master Code semantic edit, Planner/Step UI edit, DB migration or
production persistence was introduced.

## Tracking

- Issue: [#367](https://github.com/kanzakimy0/TravelAssist/issues/367) — Open
- Commit(s): pending initial commit
- Draft PR: pending creation, target `develop`
- WBS 4.49: `待审查`

## Follow-ups

- Human review and explicit merge approval are still required before WBS 4.49
  can be marked complete.
- AI Compact Context / Decision Adapter work remains a separate future task and
  was not started.
