# WBS 4.48 Amendment — Travel Region Graph Pilot / Reference Dataset

> Task: TASK-041-A  
> Issue: #305  
> Owner: A — Main Travel System / Planning Engine  
> Priority: P0 Pilot

## Purpose

Introduce a dedicated WBS row for the P0 Region Graph Pilot that follows WBS 4.47 Planning Contracts and precedes Candidate Pipeline reference implementation.

This row is independent of WBS 7.9 POI scoring human blind review and must not alter its status.

## New row

```md
| 4.48 | Travel Region Graph Pilot / Reference Dataset | A | P0 | 4.47 | 未开始 / 进行中 / 待审查 / 已完成按阶段更新 |
```

## Dependency

```text
4.47 Trip Planning Contracts / Validators / Fixtures Foundation
→ 4.48 Travel Region Graph Pilot
```

TASK-038 / 039 / 040 scoring/blind-review work is not a dependency.

## Scope boundary

WBS 4.48 covers:

- region node pilot data;
- RegionRelation;
- directional TravelEdge;
- TravelEdgeVariant planning priors;
- graph validation, reachability and evidence diagnostics.

It does not cover:

- live Route Facts;
- Provider runtime;
- Candidate ranking;
- POI scoring calibration;
- Human Gold;
- Planner UI;
- production DB persistence;
- final nationwide graph scale freeze.

## Status rule

```text
Task publication only → 未开始
implementation begins → 进行中
implementation complete + Draft PR unmerged → 待审查
merged to develop + user acceptance → 已完成
evidence/semantic blocker → 阻塞 or Partial with exact reason
```

## Core invariant

```text
RegionRelation != TravelEdge != TravelEdgeVariant != Live Route Fact
```

Planning priors must never masquerade as exact current timetable/fare/availability facts.
