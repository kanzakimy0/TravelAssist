# WBS 5.18 — Trip Draft / Saved / History Data Model Start Record

> Date: 2026-09-12  
> Owner: B — Personal Center / Saved Trip Data  
> Task: TASK-048-B  
> Issue: #329  
> Publication baseline: `develop@b7eb931698da69cec73f7a0399897dbb5caab8c2`  
> Spec branch: `task/b-wbs-5-18-trip-data-model`

## Decision

WBS 5.18 is authorized to start.

Required dependencies are satisfied:

```text
4.17 Trip Plan / Planner Contract = 已完成
8.1 DB / ORM / Migration 总体方案 = 已完成
```

The current Master WBS marks 5.18 as startable. TASK-048-B and Issue #329 are now the clean implementation track for this WBS.

## Legacy track decision

Issue #207 / Draft PR #221 are not the current implementation track.

They are retained as historical Partial evidence because they mixed early 5.11 / 5.16 / 5.18 work and include Preference semantics superseded by accepted 5.11/5.16.

TASK-048-B must audit reusable ideas, but must not merge/cherry-pick the old branch wholesale.

## Canonical implementation direction

```text
A canonical Trip contracts
TripDraftFactsV1 / WizardProgressV1 / TripPlanSnapshotV1
        ↓
B Trip Library persistence aggregate
trip_library_records
        ↓
Draft → Saved → History
```

B owns persistence lifecycle, owner identity, snapshots and history freeze.

A continues to own the Trip/Plan/Day/Item semantics.

## Master WBS synchronization

To avoid overwriting concurrent WBS updates, this publication branch does not replace the entire Master WBS with a stale snapshot.

When Codex actually begins implementation from the latest `origin/develop`, it must reread:

```text
docs/project/WBS-TravelAssist.md
```

and minimally update only the 5.18 status cell:

```text
current startable state
→ 进行中（#329 / TASK-048-B）
```

After implementation + mandatory Local Supabase QA + Draft PR:

```text
5.18 → 待审查
```

Only after explicit user acceptance and merge:

```text
5.18 → 已完成
Issue #329 → Closed / Completed
```

Do not automatically start 5.19.

## Published authority

- Design: `docs/architecture/trip-persistence-data-model-v1.md`
- Task: `docs/tasks/TASK-048-b-trip-persistence-data-model.md`
- Codex Launcher: `docs/tasks/CODEX-TASK-048-b-trip-persistence-data-model.md`

The implementation must use latest `origin/develop` at execution time, not the publication baseline.
