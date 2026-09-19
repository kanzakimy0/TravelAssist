# WBS 1.20 Owner Correction

> Effective date: 2026-09-17
>
> Repository baseline at publication: `develop@f5e3ca6fe2989c846be062b5921d0b9527753917`
>
> Related Task: `TASK-066-B`
>
> Related Issue: `#389`

## Decision

The user explicitly authorized B to take over **WBS 1.20 — 主系统 Loading / Empty / Error / Skeleton** as a single-item exception so B can complete the design freeze before the downstream WBS 3.7 implementation is considered.

Authoritative ownership for WBS 1.20 is therefore:

```text
WBS 1.20
Owner: B
Priority: P1
Dependency: 1.13
Current execution state at Task publication: 未开始
```

The Master WBS should be synchronized to Owner `B` when TASK-066-B actually begins execution. Publication of this correction does not by itself mean implementation/design work has started.

## Scope of the exception

This correction changes **only WBS 1.20**.

It does not change the project-wide v0.4 responsibility rule that the main travel system is normally A-owned, and it does not reassign any of the following:

- WBS 1.14 / 1.15 / 1.17 / 1.18 / 1.19;
- WBS 3.6 or WBS 3.7;
- Planner Store / Day Plan / Route / Provider / AI / Engine / Trip Save work;
- any other A-owned WBS item.

## Downstream 3.7

WBS `3.7 — 主系统 Loading / Empty / Error` remains:

```text
Owner: A
Status: 未开始
Dependency: 1.20, 3.1
```

TASK-066-B must not start or implement WBS 3.7. After WBS 1.20 is accepted and frozen, the user may separately decide whether to keep 3.7 with A or authorize another ownership exception.

## Synchronization rule

When TASK-066-B starts, update only the current WBS 1.20 row to reflect B ownership and `进行中`. When the design is delivered but not yet accepted/merged, use `待审查`. Only after explicit user acceptance plus merge to `develop` may WBS 1.20 be marked `已完成`.

Historical records that previously listed 1.20 as A-owned remain valid as historical snapshots and should not be rewritten.
