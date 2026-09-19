# CODEX — TASK-048-A Candidate Pipeline Reference Implementation

Execute `TASK-048-A` exactly as specified in:

`docs/tasks/TASK-048-a-candidate-pipeline-reference.md`

Repository:
`https://github.com/kanzakimy0/TravelAssist`

Issue:
`#367`

## Start checks

Run:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
git merge-base --is-ancestor 4465d8fef68456a1d4554322b97fa5b3e3f10b82 origin/develop
```

The ancestor check must pass.

Read:

```bash
git show origin/develop:docs/tasks/TASK-048-a-candidate-pipeline-reference.md
git show origin/develop:docs/project/WBS-4.48-final-closeout.md
```

Then independently verify the WBS 4.48 execution gate from repository state before implementation.

## Safety

Do not run:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not rebase or rewrite existing shared history.

Use a dedicated clean worktree from latest `origin/develop` and create/use:

`codex/a-candidate-pipeline-reference`

## Scope lock

Implement only the provider-free deterministic Candidate Pipeline reference runtime and Pilot harness required by TASK-048-A.

Do not:
- call AI/LLM;
- call live Route/Places/Weather/Booking providers;
- read Human Gold / TASK-039 answers;
- tune or freeze `candidate-0457` scoring;
- change production scoring weights;
- change Region Graph semantics;
- change Master Code governance/allocation;
- modify Planner/Step UI;
- add DB migration or production persistence;
- start the AI Compact Context / Decision Adapter Pilot.

## Required pipeline

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

The AI boundary is future-only and must not be invoked.

## Required outcomes

At minimum prove:

```text
deterministic repeat = PASS
byte-stable normalized result = PASS
hard reject bypass = 0
must-go silently dropped = 0
NEEDS_FACT silently promoted = 0
dangling Region/POI/Candidate refs = 0
Pareto dominated improper survivors = 0
diversity resurrected rejected candidates = 0
unbounded loop/retry = 0
Decision Trace stage coverage = 100%
AI/provider calls = 0
production DB writes = 0
scoring parameter changes = 0
Region Graph semantic changes = 0
Master Code governance changes = 0
```

Cover all 14 mandatory Pilot scenarios and all negative tests in the Task.

## Validation

Run the TASK-048 focused suite plus the relevant Planning Contracts, Planning Soak, Region Graph, Master Code, Routing, Trip/Engine regression, full canonical Node regression, lint, typecheck, build, Prettier and `git diff --check`.

Create a Draft PR to `develop`; do not merge it.

Update Issue #367 and Master WBS tracking.

Return the complete file:

`docs/tasks/RESULT-TASK-048-a-candidate-pipeline-reference.md`

Stop after Draft PR + Result. Do not start any later Task automatically.
