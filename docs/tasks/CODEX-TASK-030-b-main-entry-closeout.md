# Codex Launcher — TASK-030-B / WBS 3.3

请完整执行 TravelAssist 的 `TASK-030-B`。

## Repository

```text
https://github.com/kanzakimy0/TravelAssist
```

## Issue

```text
#260
```

## Formal Task

```text
docs/tasks/TASK-030-b-main-entry-closeout.md
```

## Owner Correction

```text
docs/project/WBS-3.3-owner-correction.md
```

## Start

先执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

读取最新正式指令：

```bash
git show origin/develop:docs/tasks/TASK-030-b-main-entry-closeout.md
git show origin/develop:docs/project/WBS-3.3-owner-correction.md
git show origin/develop:docs/project/WBS-TravelAssist.md
```

然后严格按正式 Task 执行。

## Critical Rules

- Canonical Owner = `B`。
- 从最新 `origin/develop` 创建 `feature/b-wbs-3-3-main-entry`。
- 启动时把最新 Master WBS 的 `3.3 Owner` 改为 `B`，Status 改为 `进行中`。
- 当前 CTA 已是 `ButtonLink href="/start"`；先审计，正确就不要重写。
- WBS 3.2 已完成，禁止重新设计首页视觉。
- Guest 和已登录用户默认都应可由主 CTA 进入 `/start`；不要把 CTA 改成登录入口。
- 不重做 Step 1–5，不修改 Planner，不实施 3.4 / 3.5 / 3.7。
- 不增加无意义 spinner / debounce / Client Component。
- 实现完成但 PR 未合并：`3.3 = 待审查`。
- 用户验收通过并 merge develop 后才可 `3.3 = 已完成`。
- 完成后停止，不自动执行下一 Task。

## Safety

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

WBS 冲突逐段解决，禁止整份 ours/theirs。
