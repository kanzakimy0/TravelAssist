# WBS 4.49 Amendment — Candidate Pipeline Reference Implementation / Pilot Harness

## Purpose

Add the next A-owned Planning Engine Pilot after WBS 4.48 Region Graph completion.

## WBS row

| WBS ID | Work Item | Owner | Priority | Dependency | Publication Status |
| --- | --- | --- | --- | --- | --- |
| 4.49 | Candidate Pipeline Reference Implementation / Pilot Harness | A | P0 | 4.47, 4.48 | 未开始 / Gate blocked until 4.48 complete |

## Tracking

- Task: TASK-047-A
- Issue: #367
- Publication branch: `task/a-task-047-candidate-pipeline-reference`
- Planned implementation branch: `codex/a-candidate-pipeline-reference`

## Hard dependency rule

Publication does not authorize implementation.

Implementation may start only after:

1. TASK-046-A independently returns `ACCEPT` for PR #352;
2. PR #352 is explicitly owner-approved and merged;
3. WBS 4.48 is `已完成`;
4. latest `develop` exposes the production-complete 50-node Region Graph with 50/50 canonical Master Codes and zero production nulls.

Otherwise 4.49 remains `未开始 / Blocked by 4.48` and Codex must not implement runtime code.

## Scope boundary

4.49 is the deterministic Candidate Pipeline reference runtime only.

It does not complete or alter:

- WBS 7.9 scoring calibration / Human Gold;
- AI Compact Context / Decision Adapter Pilot;
- live Provider selection/runtime;
- Planner UI;
- Replanning;
- Trip Mutation Engine 4.20–4.24;
- production DB persistence;
- production threshold/count freeze.

## Status transitions

```text
Publication only                    → 未开始 / Gate blocked
Hard gates pass + implementation    → 进行中
Implementation + evidence + Draft PR→ 待审查
Explicit user acceptance + merge    → 已完成（Reference/Pilot scope）
```

`已完成` for WBS 4.49 means only the Candidate Pipeline reference/Pilot scope is accepted. It does not mean production recommendation generation, scoring, AI selection or nationwide POI runtime are complete.

## Master WBS update rule

Implementation must read the execution-time latest complete `docs/project/WBS-TravelAssist.md` and minimally add/update only WBS 4.49 while preserving all unrelated A/B changes.
