# WBS 7.9 Amendment — TASK-038-A 100 POI Scoring Pilot

> Date: 2026-09-11  
> Task: TASK-038-A  
> Issue: #299  
> Owner: A  
> Status at publication: 待开始  
> Base requirement: TASK-036 / WBS 4.47 and TASK-037 / WBS 9.13 merged and completed

## Mapping

TASK-038-A is the first evidence-backed calibration Pilot under the existing POI recommendation scoring workstream.

```text
WBS 7.9
POI Recommendation Scoring / Calibration
    ↓
TASK-038-A
100 real Japan POI scoring pilot
```

This amendment does not create a new competing scoring WBS and does not renumber existing Master WBS rows.

## Scope

```text
100 real POI stratified sample
POIFeatureV1 pilot annotations
Visit Profile pilot annotations
fixed preference scenarios
pairwise benchmark judgments
train / untouched holdout split
bounded parameter search
ranking / invariant evaluation
failure and bias analysis
Calibration Candidate recommendation
```

## Status semantics

```text
Task publication only
→ 待开始

implementation begins
→ 进行中

Pilot evidence complete + Draft PR unmerged
→ 待审查

merged + accepted
→ 已完成（Pilot范围）
```

`已完成（Pilot范围）` must not be interpreted as production scoring rollout, final Frozen v1 parameter acceptance, full POI corpus completion, or Recommendation Engine completion.

## Boundaries

TASK-038 must not:

```text
call paid LLM/Provider APIs
write production DB data
change canonical Trip/Route contracts
change Trip Mutation Engine semantics
change Planner UI
renumber Master Codes
auto-merge
start subsequent Pilots automatically
```

Unknown evidence remains `null`; no fabricated POI attributes are allowed.

## Required implementation tracking

When Codex starts TASK-038, update the current Master WBS 7.9 record in `docs/project/WBS-TravelAssist.md` with:

```text
TASK-038-A
Issue #299
branch
implementation commit
Draft PR
Pilot status
calibration candidate status
blockers/deferred
```

The implementation Task file is authoritative for detailed acceptance criteria:

```text
docs/tasks/TASK-038-a-100-poi-scoring-pilot.md
```
