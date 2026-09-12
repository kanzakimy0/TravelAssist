# WBS 5.21 — User Data / Account Deletion Start Record

## Authorization

User explicitly requested checking WBS 5.19 and then starting WBS 5.21.

## Publication baseline

```text
develop@cb97e96bdb27e7b8e1e6eef742fa95837dcc3477
```

## Dependency result

WBS 5.21 depends on 5.15–5.19.

Actual GitHub/develop state at publication:

- 5.15 completed; PR #337 merged; Issue #336 completed.
- 5.16 completed.
- 5.17 completed.
- 5.18 completed; PR #331 merged.
- 5.19 implementation PR #334 is already merged.
- 5.19 closeout PR #335 is already merged.
- Issue #333 is Closed / Completed and its closeout record declares 5.19 completed.

Therefore the dependency gate is **PASS**.

## Master WBS drift

At publication the Master table still contains:

```text
5.19 | Trip Save / Read / History Contract | ... | 待审查（#333 / TASK-049-B；Draft PR #334）
```

This is stale tracking text. It does **not** mean PR #334 is still awaiting merge.

When TASK-052 implementation actually begins from the execution-time latest develop, Codex must read the complete current Master file and minimally synchronize:

```text
5.19 -> 已完成（#333 / TASK-049-B；用户验收，PR #334 已合并）
5.21 -> 进行中（#342 / TASK-052-B）
```

If another accepted update already corrected 5.19, preserve that newer text and do not rewrite it.

## Published tracking

- WBS: `5.21`
- Task: `TASK-052-B`
- Issue: `#342`
- Spec branch: `task/b-wbs-5-21-account-deletion`
- Planned implementation branch: `codex/b-account-wbs-5-21-account-deletion`
- Task file: `docs/tasks/TASK-052-b-account-deletion.md`
- Codex launcher: `docs/tasks/CODEX-TASK-052-b-account-deletion.md`
- Architecture: `docs/architecture/account-deletion-v1.md`

## Start-state rule

This publication records user authorization and freezes the implementation contract. It does not claim runtime implementation has begun inside a Codex worktree yet.

Actual implementation branch creation is the transition point at which Master WBS 5.21 becomes `进行中`.

After implementation, mandatory real Local Supabase/Auth/DB/browser QA and a Draft PR, set 5.21 to `待审查`.

Only explicit user acceptance and merge may set 5.21 to `已完成`.
