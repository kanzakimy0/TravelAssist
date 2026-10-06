# WBS 3.1 / 3.2 Owner Correction

> Effective date: 2026-09-10
> Status: Canonical ownership correction
> Scope: Ownership attribution only

## Decision

The project owner confirms that the actual implementation ownership for WBS 3.1 and WBS 3.2 belongs to **B**.

| WBS | Work item | Canonical Owner | Status |
| --- | --- | --- | --- |
| 3.1 | Global Main Layout / Header | **B** | 已完成 |
| 3.2 | Homepage background / static Production MVP and concept fidelity | **B** | 已完成 |
| 3.2.1 | Homepage video background enhancement | A | Deferred / 未开始 |
| 3.3 | 「让我们开始吧」主入口 | A | 未开始 |

## Historical Task ID Rule

The following Task IDs and branch / PR names are historical identifiers and **must not be renamed**, because they are already part of the repository and GitHub audit trail:

- `TASK-024-A`
- `TASK-025-A`
- `TASK-025.2-A`
- `feature/a-main-layout-header`
- `feature/a-homepage-concept-fidelity`
- PR #244
- PR #252 / related closeout PRs

For ownership interpretation only, the trailing `-A` in those historical Task IDs **does not represent the canonical execution owner** after this correction.

Canonical attribution is:

```text
WBS 3.1 → B
WBS 3.2 → B
```

## Precedence

For the `Owner` field of WBS 3.1 and 3.2, this document overrides older WBS table rows, Task metadata, Issue text, or historical Result text that still says `Owner: A`.

This correction does **not** change:

- implementation content;
- completion status;
- dependencies;
- accepted screenshots or QA evidence;
- historical commits, branches, PR numbers, or merge commits;
- A/B responsibility of any other WBS item.

## Future Task Rule

When generating or auditing future Tasks:

1. Treat WBS 3.1 and 3.2 as B-completed work.
2. Do not infer that 3.2.1 or 3.3 moved to B; they remain under their current Owner until explicitly reassigned.
3. Preserve historical Task IDs rather than renaming already-merged files.
4. If the Master WBS is normalized later, update only the Owner cells / tracking notes for 3.1 and 3.2 and preserve all concurrent records.
