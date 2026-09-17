# WBS 3.7 Owner Correction

> Effective date: 2026-09-17
>
> Repository baseline at publication: `develop@3a2779aee65c7335413adcc53ee5b4f7135c654c`
>
> Related Task: `TASK-067-B`
>
> Related Issue: `#391`

## Decision

The user explicitly authorized B to continue the accepted `1.20 → 3.7` path and complete **WBS 3.7 — 主系统 Loading / Empty / Error** after WBS 1.20 was accepted, normal-merged and frozen as `Frozen v0.1`.

Authoritative ownership for WBS 3.7 is therefore changed for this single work item to:

```text
WBS 3.7
Owner: B
Priority: P1
Dependencies: 1.20, 3.1
Current execution state at Task publication: 未开始
```

Both dependencies are completed on the publication baseline:

- `1.20 — 主系统 Loading / Empty / Error / Skeleton`: `B / 已完成`, Frozen v0.1;
- `3.1 — 全局 Main Layout / Header`: `B / 已完成`.

Publication of this correction does not by itself mean runtime work has started. The Master WBS is synchronized to `B / 进行中` only when TASK-067-B actually begins execution.

## Scope of the exception

This correction changes **only WBS 3.7**.

It does not change the project-wide rule that the main travel system is normally A-owned, and it does not reassign or authorize work on:

- WBS 1.14 / 1.15 / 1.17 / 1.18;
- Planner Store 4.15;
- Day Plan Core 4.16;
- Planner preference/save integration 4.18 / 4.19;
- Route/provider work 7.3 / 7.8;
- AI runtime 6.x;
- Engine runtime 4.20–4.24;
- Booking / Payment;
- database/schema/migrations;
- Production/Staging environment or deployment capability expansion;
- any other A-owned WBS item.

## Design authority

TASK-067-B must implement, not reinterpret, the accepted design authority:

```text
docs/ui/main-system-loading-empty-error-skeleton.md
Status: Frozen v0.1
```

If the current runtime cannot truthfully produce a Frozen state, TASK-067-B must not fabricate it. Conditional/future design rows remain design inputs for their future owning capabilities.

## Synchronization rule

When TASK-067-B starts, update only the current WBS 3.7 row to:

```text
B / 进行中（#391 / TASK-067-B；用户授权单项代做）
```

After implementation, evidence and one Draft PR are ready:

```text
B / 待审查（#391 / TASK-067-B；Draft PR #...）
```

Only after explicit user acceptance plus merge to `develop` may WBS 3.7 be marked `已完成`.

Historical records that listed WBS 3.7 as A-owned remain valid historical snapshots and must not be rewritten.
