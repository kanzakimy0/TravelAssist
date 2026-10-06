# TASK-048-A — WBS 4.49 Candidate Pipeline Reference Implementation / Pilot Harness

## Goal
Implement the first deterministic, provider-free Candidate Pipeline reference runtime for the TravelAssist Planning Engine after the Region Graph is formally accepted. Convert the frozen Candidate Pipeline contract into executable stage orchestration with reproducible traces, failure handling, Pareto/diversity behavior and bounded Top-N output, without freezing scoring calibration or calling AI/providers.

## Owner / WBS
- Owner: A — Main Travel System / Planning Engine
- WBS: 4.49 — Candidate Pipeline Reference Implementation / Pilot Harness
- Issue: #367
- Task: TASK-048-A
- Priority: P0 Pilot

## Execution Gate
Before implementation, independently verify all of the following against latest `origin/develop`:
1. PR #352 is merged.
2. Merge commit `4465d8fef68456a1d4554322b97fa5b3e3f10b82` is an ancestor of `origin/develop`.
3. WBS 4.48 is completed by the final closeout record.
4. Production Region Graph contains exactly 50 Region nodes.
5. Canonical Master Codes are populated 50/50.
6. Production Region Graph has zero `masterCode = null` values.
7. All 50 Master Codes resolve to active canonical Registry entries.

If any gate fails, return `Blocked / WBS 4.48 not complete` and stop without implementation.

## Existing Foundations — Reuse, Do Not Duplicate
- WBS 4.47 Planning contracts / validators / fixtures.
- Candidate Pipeline Contract v0.1.
- completed Region Graph Contract + reference dataset.
- canonical Master Code Registry.
- POI Master / POIFeature projection contracts.
- Itinerary Feasibility contract.
- Route Contract / RouteCompact boundary.
- Decision Trace contract.
- Fact Freshness policy.

Do not create parallel versions of these contracts or identifier families.

## Reference Pipeline
Implement deterministic orchestration for:

`Trip Request / Effective Preference / Runtime Context`
→ `Region Candidate`
→ `Corridor Candidate`
→ `POI Expansion`
→ `Hard Filter`
→ `Score Input / Projection`
→ `Route Feasibility`
→ `Itinerary Feasibility`
→ `Pareto`
→ `Diversity`
→ `Top-N`
→ optional future AI boundary

The optional AI boundary is modeled only as a future handoff boundary. No AI or provider call is permitted in this Task.

## Scoring Boundary
TASK-039 human blind review / `candidate-0457` is not a hard dependency for this reference runtime.

Rules:
- do not freeze scoring weights;
- do not retune scoring calibration;
- do not claim production scoring validity;
- expose a narrow deterministic score/projection adapter boundary;
- use approved merged real candidate data only if already present in `develop`; otherwise use contract-valid deterministic fixtures;
- Human Gold, reviewer answers and benchmark answers must not be read or used.

## Required Runtime Behavior
- deterministic `CandidateRun` root and stable stage ordering;
- stable domain IDs remain stable; Candidate/run-local IDs remain temporary;
- must-go candidates survive unless a hard constraint makes them invalid;
- fallback may relax only soft breadth/expansion thresholds, never hard constraints;
- unknown critical facts produce `NEEDS_FACT` or another explicit unresolved disposition, never silent PASS;
- no production-frozen funnel counts; keep/expand limits are Pilot config and must be traced;
- Pareto selection must not collapse all objectives into one hidden scalar;
- diversity selection must prevent obvious region/category monoculture without resurrecting rejected candidates;
- every stage emits structured Decision Trace / Reason Codes including counts, dispositions and relevant config;
- retries/expansions are deterministic and bounded;
- identical input + config + revision produces reproducible Top-N output;
- no Candidate/local ID leaks into stable domain output.

## Required Pilot Scenarios
At minimum cover:
1. Tokyo first-time iconic trip.
2. Tokyo hidden/local preference.
3. Hakone/Fuji corridor.
4. Alpine/Hokuriku corridor.
5. Kyoto/Nara/Osaka/Kobe corridor.
6. Low walking tolerance.
7. Low crowd tolerance.
8. Must-go item preserved.
9. Must-go item impossible because of a hard constraint.
10. Route-infeasible candidate removed.
11. Critical route/opening fact unknown → `NEEDS_FACT`.
12. Diversity prevents one-category Top-N monoculture.
13. Sparse candidate fallback expansion.
14. No-valid-choice terminal case.

## Required Negative Tests
- duplicate Candidate ID;
- stale run/revision mismatch;
- hard-rejected candidate reintroduced;
- unknown critical fact treated as PASS;
- must-go dropped without hard reason;
- invalid Region ref;
- invalid POI ref;
- Pareto-dominated candidate improperly retained without explicit protected reason;
- diversity quota attempts to revive a rejected candidate;
- expansion/retry exceeds configured bound;
- nondeterministic ordering under equal scores;
- AI/local Candidate ID leaks into stable/persistable domain output.

## Acceptance Gates
PASS requires:
- deterministic repeat = PASS;
- same input/config/revision produces byte-stable normalized result;
- hard reject bypass = 0;
- must-go silently dropped = 0;
- `NEEDS_FACT` silently promoted = 0;
- dangling Region/POI/Candidate refs = 0;
- Pareto dominated survivors = 0 unless explicitly protected and traced;
- diversity-resurrected rejected candidate = 0;
- unbounded loop/retry = 0;
- Decision Trace stage coverage = 100%;
- AI/provider calls = 0;
- production DB writes = 0;
- scoring parameter changes = 0;
- Region Graph semantic changes = 0;
- Master Code governance/allocation changes = 0;
- Planner/Step UI changes = 0.

## Required Validation
At minimum run:
- TASK-048 focused Candidate Pipeline tests;
- Planning Contracts;
- Planning Soak;
- Region Graph / TASK-041 focused regression;
- Master Code / TASK-043/044 focused regression where relevant;
- Routing;
- Trip / Engine focused regression;
- canonical full Node regression;
- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- TASK-owned Prettier;
- `git diff --check`;
- GitHub CI on the Draft PR.

## Required Outputs
Use repository conventions, with at least:
- Candidate Pipeline runtime under the canonical Planning runtime location (prefer `src/features/planning/candidate-pipeline/` only if consistent with current structure);
- `tools/qa/candidate-pipeline-pilot.mjs`;
- `tests/task-048-a-candidate-pipeline.test.mjs`;
- `docs/qa/TASK-048/pipeline-fixtures.json`;
- `docs/qa/TASK-048/pipeline-config.json`;
- `docs/qa/TASK-048/stage-trace.json`;
- `docs/qa/TASK-048/scenario-results.json`;
- `docs/qa/TASK-048/failure-cases.json`;
- `docs/qa/TASK-048/pilot-report.md`;
- `docs/tasks/RESULT-TASK-048-a-candidate-pipeline-reference.md`;
- Master WBS tracking update.

## Branch / PR
- Create a dedicated clean worktree from execution-time latest `origin/develop`.
- Suggested branch: `codex/a-candidate-pipeline-reference`.
- Create Draft PR → `develop`.
- Do not auto-merge.

## Out of Scope
- LLM/AI calls or AI soft choice;
- `candidate-0457` tuning/freeze;
- Human Gold / TASK-039 reviewer data;
- live Route / Places / Weather / Booking providers;
- production POI DB import;
- Planner UI;
- Trip Mutation Engine changes;
- Replanning runtime;
- DB migration/persistence;
- production threshold/count freeze;
- automatic start of AI Compact Context / Decision Adapter Pilot.

## Completion States
- PASS: `Completed / Candidate Pipeline reference ready for human review`; WBS 4.49 = `待审查` until explicit review and merge.
- Gate false: `Blocked / WBS 4.48 not complete`.
- Contract incompatibility: `Partial / Contract correction requires review`.

Stop after Result + Draft PR. Do not merge and do not start the next AI Pilot automatically.
