# CODEX — TASK-047-A Candidate Pipeline Reference Implementation / Pilot Harness

Repository: `https://github.com/kanzakimy0/TravelAssist`

Issue: `#367`

WBS: `4.49`

## Start

Use a dedicated clean worktree / clean clone.

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Forbidden:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Read the full Task:

```bash
git show origin/task/a-task-047-candidate-pipeline-reference:docs/tasks/TASK-047-a-candidate-pipeline-reference.md
```

Read the WBS amendment:

```bash
git show origin/task/a-task-047-candidate-pipeline-reference:docs/project/WBS-4.49-candidate-pipeline-reference-amendment.md
```

## Hard gate — do this before implementation

Verify against execution-time latest `origin/develop`:

1. TASK-046-A recommendation for PR #352 = `ACCEPT`.
2. PR #352 has been explicitly owner-approved and merged into `develop`.
3. WBS 4.48 = `已完成`.
4. Canonical Region Graph = exactly 50 nodes, 50/50 active canonical Master Codes, production null Master Codes = 0.

If any item is false:

```text
Status: Blocked / WBS 4.48 not complete
```

Do not implement Candidate Pipeline. Return the blocked Result and STOP.

## Implementation branch

Only after all hard gates pass, create from execution-time latest clean `origin/develop`:

```text
codex/a-candidate-pipeline-reference
```

## Critical boundaries

Reuse canonical Planning contracts. Do not create a parallel Candidate/Region/POI/Trace model.

Implement deterministic provider-free reference orchestration:

```text
Trip Request / Effective Preference / Runtime Context
→ Region Candidate
→ Corridor
→ POI Expansion
→ Hard Filter
→ Score Input / Projection
→ Route Feasibility
→ Itinerary Feasibility
→ Pareto
→ Diversity
→ Top-N
```

Do NOT:

- call LLM/OpenAI;
- call live Route/Places/Weather/Booking providers;
- read R1/R2/R3 Human Review answers;
- generate Human Gold;
- tune/freeze `candidate-0457`;
- change scoring weights;
- change Region Graph semantics;
- change Trip Mutation Engine semantics;
- write production DB;
- modify Planner UI;
- implement Replanning;
- start the AI Pilot.

Scoring is an injected deterministic input/projection boundary unless an already approved canonical implementation is merged at execution time.

All new funnel limits/thresholds are `PILOT_DEFAULT`, never Frozen constants.

## Mandatory semantics

- Domain IDs stable; Candidate IDs run-local.
- Hard constraints are PASS/REJECT/NEEDS_FACT gates, not negative scores.
- Hard reject can never reappear.
- Critical unknown can never silently become PASS.
- Must-go survives soft stages and may be dropped only by explicit hard reason.
- Fallback may widen only soft breadth, with bounded rounds.
- Pareto remains multi-objective.
- Diversity cannot resurrect invalid candidates.
- Equal-score ordering must be deterministic.
- Every stage emits structured Decision Trace / Reason Codes.

## Required scenarios

At least 14 scenarios from the Task, including Tokyo iconic/hidden, Hakone/Fuji, Alpine/Hokuriku, Kansai, walking/crowd tolerance, must-go success/failure, route infeasible, NEEDS_FACT, diversity, bounded fallback and no-valid-choice.

## Required outputs

```text
src/features/planning/candidate-pipeline/   (or current canonical equivalent)
tools/qa/candidate-pipeline-pilot.mjs
tests/task-047-a-candidate-pipeline.test.mjs
docs/qa/TASK-047/pipeline-fixtures.json
docs/qa/TASK-047/pipeline-config.json
docs/qa/TASK-047/stage-trace.json
docs/qa/TASK-047/scenario-results.json
docs/qa/TASK-047/failure-cases.json
docs/qa/TASK-047/pilot-report.md
docs/tasks/RESULT-TASK-047-a-candidate-pipeline-reference.md
```

Update latest `docs/project/WBS-TravelAssist.md` minimally for WBS 4.49 and preserve all unrelated A/B changes.

## Required negative tests

At least:

- duplicate Candidate ID;
- stale revision/run;
- hard reject reintroduced;
- critical unknown treated PASS;
- must-go dropped without hard reason;
- invalid Region/POI ref;
- dominated candidate improperly retained;
- diversity revives reject;
- expansion exceeds bound;
- unstable equal-score order;
- run-local/AI ID leaks into domain output;
- invalid stage order/transition.

## Validation

Run execution-time canonical equivalents of:

```text
npm ci
TASK-047 focused tests
TASK-041 Region Graph regression
TASK-043 Master Code regression
Planning Contracts
Planning Soak
Routing
Trip / Route / Engine regression
full Node regression
npm run lint
npm run typecheck
npm run build
TASK-owned Prettier
git diff --check
```

Require exact final-head GitHub Quality Gate PASS.

## Completion

Create Draft PR:

```text
codex/a-candidate-pipeline-reference → develop
```

Do not merge.

Expected PASS status:

```text
Completed / Candidate Pipeline reference ready for human review
```

WBS 4.49 remains `待审查` until explicit user acceptance and merge.

Update Issue #367, return the complete Result, and STOP.
