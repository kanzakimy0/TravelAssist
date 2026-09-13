# TASK-047-A — WBS 4.49 Candidate Pipeline Reference Implementation / Pilot Harness

## Status

Published / execution blocked until WBS 4.48 is complete.

## Tracking

- Repository: `kanzakimy0/TravelAssist`
- Issue: #367
- Owner: A — Main Travel System / Planning Engine
- WBS: 4.49 — Candidate Pipeline Reference Implementation / Pilot Harness
- Priority: P0 Pilot
- Publication branch: `task/a-task-047-candidate-pipeline-reference`
- Planned implementation branch: `codex/a-candidate-pipeline-reference`

## 1. Goal

Convert the frozen Candidate Pipeline contract into the first deterministic, provider-free executable reference runtime.

Reference flow:

```text
Trip Request / Effective Preference / Runtime Context
→ Region Candidate
→ Corridor Candidate
→ POI Expansion
→ Hard Filter
→ Score Input / Projection
→ Route Feasibility
→ Itinerary Feasibility
→ Pareto
→ Diversity
→ Top-N
→ future AI boundary (not called here)
```

The Task validates orchestration, stage semantics, failure handling, traceability, bounded expansion and deterministic selection. It does not freeze scoring, call AI, call live Providers or write production data.

## 2. Hard execution gate

Before implementation, Codex must verify all of the following against execution-time latest `origin/develop`:

1. TASK-046-A acceptance recommendation for PR #352 is `ACCEPT`.
2. PR #352 has explicit owner merge authorization and is merged to `develop`.
3. WBS 4.48 is `已完成`.
4. The canonical Region Graph on `develop` has exactly 50 Region nodes, 50/50 active canonical Master Codes and zero production `masterCode = null` values.

If any condition is false:

```text
Status = Blocked / WBS 4.48 not complete
```

Update Result/WBS tracking only as required, do not implement Candidate Pipeline runtime, do not create a misleading completion PR, and STOP.

## 3. Canonical dependencies

Reuse existing public contracts and architecture. Never duplicate them:

- WBS 4.47 Planning Contracts / Validators / Fixtures;
- `candidate-pipeline-contract-v0.1.md`;
- canonical Region Graph contract and completed Region dataset;
- POI Master / POIFeature planning projections;
- Effective Preference contract;
- Route Contract / RouteCompact boundary;
- Itinerary Feasibility contract;
- Planning Fact Freshness policy;
- Decision Trace / Reason Code contract.

Planning Engine and Trip Mutation Engine remain separate. This Task must not alter WBS 4.20–4.24 Mutation Engine semantics.

## 4. Scoring boundary

TASK-039 human blind review and `candidate-0457` are not hard dependencies for this reference orchestration.

Rules:

- do not freeze or retune scoring weights;
- do not call machine benchmark or Human Gold a production scoring truth;
- do not read R1/R2/R3 reviewer answers;
- Candidate Pipeline receives a deterministic scoring-stage projection/input through a narrow adapter boundary;
- if an approved scoring implementation is merged at execution time, it may be consumed through its public boundary only;
- otherwise use contract-valid deterministic Pilot fixtures for orchestration tests;
- all thresholds/counts introduced here are `PILOT_DEFAULT`, not Frozen Business Constants.

## 5. Core runtime requirements

### 5.1 CandidateRun

One complete run must have one deterministic correlation root containing at least:

- run ID;
- input revision / graph revision / fixture revision;
- effective preference reference;
- runtime context reference;
- Pilot config revision;
- stage sequence;
- final disposition;
- trace link.

Same normalized inputs + config + revisions must produce the same normalized result.

### 5.2 Identity

Must distinguish:

```text
Domain ID = stable
Candidate ID = run-local temporary
AI Local ID = future Gateway-only temporary
```

No run-local Candidate/AI ID may leak into persisted/domain identity fields.

### 5.3 Hard constraints

Hard constraints are gates, not negative scores.

Allowed dispositions include the existing canonical semantics such as:

```text
PASS
REJECT
NEEDS_FACT
```

A hard-rejected candidate must never reappear due to fallback, Pareto, diversity or Top-N.

Critical unknown facts must not silently become PASS.

### 5.4 Must-go

Must-go items/anchors are protected through soft stages.

They may be removed only when a deterministic hard reason makes them invalid or impossible. Every removal must produce an explicit reason code and trace entry.

### 5.5 Bounded fallback

Fallback may widen only soft discovery/expansion breadth.

It must never relax:

- hard constraints;
- booking/payment/system-hard protections;
- fact freshness rules;
- invalid references;
- impossible feasibility.

Expansion rounds/retries must be explicitly bounded in Pilot config.

### 5.6 Pareto

Pareto must remain a real multi-objective stage and not secretly collapse all objectives into one scalar.

Dominated candidates should not survive unless protected by an explicit, auditable exception such as a must-go anchor. Such exceptions must carry Reason Codes.

### 5.7 Diversity

Diversity must reduce obvious category/region monoculture while respecting prior dispositions.

Diversity must not:

- resurrect hard rejects;
- resurrect NEEDS_FACT as valid;
- invent candidates;
- override must-go hard impossibility;
- hide why a candidate was kept/dropped.

### 5.8 Top-N

Top-N is Pilot configurable and not a production constant.

Equal-score/tie ordering must be deterministic using stable documented tie-break rules.

## 6. Decision Trace

Every stage must emit structured trace data with, at minimum:

- input count;
- output count;
- rejected count;
- NEEDS_FACT count;
- reason-code counts;
- expansion/retry count;
- protected candidate dispositions;
- config revision;
- relevant Fact refs where applicable.

No hidden chain-of-thought is stored or required.

## 7. Pilot scenarios

At minimum implement deterministic fixtures for:

1. Tokyo first-time iconic trip;
2. Tokyo hidden/local preference;
3. Hakone/Fuji corridor;
4. Nagano/Matsumoto/Takayama/Kanazawa corridor;
5. Kyoto/Nara/Osaka/Kobe corridor;
6. low walking tolerance;
7. low crowd tolerance;
8. must-go preserved through soft filtering;
9. must-go rejected by hard impossibility;
10. route-infeasible candidate removed;
11. critical route/opening fact unknown → `NEEDS_FACT`;
12. diversity prevents one-category Top-N;
13. sparse result triggers bounded fallback expansion;
14. no-valid-choice terminal case.

Fixtures must be provider-free and deterministic.

## 8. Suggested implementation shape

Prefer current canonical Planning runtime conventions. Suggested locations may be adjusted if the repository already has a stronger convention:

```text
src/features/planning/candidate-pipeline/
tools/qa/candidate-pipeline-pilot.mjs
tests/task-047-a-candidate-pipeline.test.mjs
```

Do not create a second Planning contract tree.

## 9. Required evidence

Create under `docs/qa/TASK-047/`:

- `pipeline-fixtures.json`
- `pipeline-config.json`
- `stage-trace.json`
- `scenario-results.json`
- `failure-cases.json`
- `pilot-report.md`

Create Result:

- `docs/tasks/RESULT-TASK-047-a-candidate-pipeline-reference.md`

Update Master WBS 4.49 only; preserve unrelated A/B rows.

## 10. Acceptance gates

All of the following must pass:

- deterministic repeat: PASS;
- normalized same-input result byte-stable: PASS;
- hard reject bypass: 0;
- must-go silently dropped: 0;
- `NEEDS_FACT` silently promoted to valid: 0;
- dangling Region/POI/Candidate refs: 0;
- improper dominated survivors after Pareto: 0, except explicit protected cases with reasons;
- diversity resurrected rejected candidate: 0;
- unbounded retry/expansion: 0;
- Decision Trace stage coverage: 100%;
- AI calls: 0;
- live Provider calls: 0;
- production DB writes: 0;
- scoring parameter changes: 0;
- Region Graph semantic changes: 0;
- Trip Mutation Engine semantic changes: 0.

## 11. Required negative tests

At minimum:

- duplicate Candidate ID;
- stale run/revision mismatch;
- hard-rejected candidate reintroduced;
- critical unknown treated as PASS;
- must-go dropped without hard reason;
- invalid Region ref;
- invalid POI ref;
- Pareto dominated candidate improperly retained;
- diversity tries to revive rejected candidate;
- expansion exceeds configured bound;
- equal-score unstable/non-deterministic ordering;
- AI Local ID or run-local Candidate ID leaks into domain output;
- unsupported stage order;
- invalid stage transition/disposition.

## 12. Validation

At minimum run the execution-time canonical equivalents of:

```text
npm ci
TASK-047 focused tests
TASK-041 / Region Graph focused regression
TASK-043 / Master Code focused regression
Planning Contracts
Planning Soak
Routing
Trip / Route / Engine regression
canonical full Node regression
npm run lint
npm run typecheck
npm run build
TASK-owned Prettier
git diff --check
GitHub Quality Gate on exact final head
```

If scripts have changed, use the current canonical command and document the mapping.

## 13. Git / workspace safety

Main workspace may contain uncommitted Planner/Step work. Use isolated clean worktree or clean clone.

Before work:

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

Implementation branch after all gates pass:

```text
codex/a-candidate-pipeline-reference
```

Create Draft PR → `develop`; no auto-merge.

## 14. Out of scope

- LLM / AI calls or AI soft choice;
- AI Compact Context / Decision Adapter implementation;
- `candidate-0457` tuning or production freeze;
- Human Gold / blind-review responses;
- live Route / Places / Weather / Booking providers;
- production POI DB import;
- Planner UI;
- Trip Mutation Engine modifications;
- Replanning runtime;
- production DB migration/persistence;
- production funnel count / threshold freeze;
- membership/paywall;
- automatic start of the next Pilot.

## 15. Completion states

### Gate blocked

```text
Blocked / WBS 4.48 not complete
```

No Candidate Pipeline implementation.

### Implementation passes

```text
Completed / Candidate Pipeline reference ready for human review
```

WBS 4.49 = `待审查` until explicit user acceptance and merge.

### Contract incompatibility

```text
Partial / Contract correction requires review
```

Do not silently redefine frozen contracts.

After returning the Result, STOP. Do not start the AI Pilot automatically.
