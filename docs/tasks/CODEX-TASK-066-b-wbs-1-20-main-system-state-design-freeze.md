# CODEX — TASK-066-B / WBS 1.20 Main System State Design Freeze

请在 `kanzakimy0/TravelAssist` 仓库中完整执行 `TASK-066-B`。

## Canonical Task

```bash
git show origin/task/b-wbs-1-20-main-system-state-design:docs/tasks/TASK-066-b-wbs-1-20-main-system-state-design-freeze.md
```

GitHub Issue: `#389`

## Before Anything Else

先执行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

然后读取：

```bash
git show origin/task/b-wbs-1-20-main-system-state-design:docs/project/WBS-1.20-owner-correction.md
git show origin/task/b-wbs-1-20-main-system-state-design:docs/tasks/TASK-066-b-wbs-1-20-main-system-state-design-freeze.md
git show origin/develop:docs/project/WBS-TravelAssist.md
```

并读取执行时最新的：

```text
WBS 1.13 / Design Token final closeout
现有 docs/ui/ 主系统设计资料
Home / Start / Planner / Trip Detail 当前实现和样式
当前响应式 / accessibility 规范
```

## Ownership

用户明确授权本次单项代做：

```text
WBS 1.20 Owner: A → B
```

这是**单项例外**，不要修改其他 A Owner。

WBS 3.7 仍保持：

```text
Owner: A
Status: 未开始
```

TASK-066-B 禁止启动 3.7。

## Execution Branch

从执行时最新干净 `origin/develop` 建独立 worktree：

```text
codex/b-wbs-1-20-main-system-state-design
```

不要从 Task publication branch 开发。

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
rebase/history rewrite
```

## Core Goal

冻结主系统以下状态的视觉 / 交互 / 文案 / accessibility 规范：

```text
Loading
Skeleton
Empty
Error
Retry / Recovery
Partial Degradation
```

这是设计 Task，不是 runtime Task。

必须产出：

```text
docs/ui/main-system-loading-empty-error-skeleton.md
```

## Required State Taxonomy

必须至少区分：

```text
Initial page loading
Section loading
Skeleton
Empty / first use
Empty / no result
Recoverable error
Non-recoverable / permission / invalid state
Partial degradation
Generic connection-loss presentation
```

不要把 Empty 当 Error。
不要把 Skeleton 当 Progress。
不要伪造百分比进度。
不要为了一个局部 Provider 失败把整个 Planner 替换成 Error page。

## Required Surfaces

必须覆盖当前产品实际存在的：

```text
Home
Start wizard
Planner shell
Planner map region
Planner recommendation/right rail
Planner bottom timeline/summary
Trip Detail
Route preview
AI visual shell（仅视觉状态，不接 runtime）
shared modal/drawer/popover
```

每个适用状态必须定义：

```text
semantic trigger meaning
page-level vs section-level
what remains visible
what remains interactive
title/body copy pattern
primary/secondary action
retry scope
geometry preservation
animation/reduced motion
focus/keyboard
ARIA/live region
responsive behavior
prohibited misleading behavior
```

## UX Invariants

必须冻结：

```text
Prefer local degradation over whole-page failure
Preserve user-entered Start/Planner state
Map/Route/AI failure != itinerary deletion
Retry smallest failed operation where possible
Full-page blocking only when primary resource cannot safely render
No raw SQL/Auth/Provider errors
No false business truth
No color-only meaning
No accidental duplicate submissions during loading
No Planner geometry redesign
```

## Copy System

至少设计这些文案意图：

```text
正在加载…
正在准备您的行程…
首次使用 Empty
No-result Empty
Generic retryable failure
Blocking failure
Map unavailable
Route unavailable / no route
Session expired / sign-in required
Trip missing/not accessible
Save/read failure visual presentation only
AI temporarily unavailable visual presentation only
```

要求 localization-ready，但不要建立完整 i18n 系统。

## Visual System

只复用当前已接受的 WBS 1.13 / runtime tokens。

禁止：

```text
新建第二套 palette
token 大规模重命名
全站 radius/shadow 重构
```

要明确说明现有 token 如何用于：

```text
loading
skeleton
empty
warning/degraded
blocking error
focus
action buttons
backdrop/overlay
```

## Accessibility

至少冻结：

```text
44x44 target
keyboard actions
visible focus
aria-busy
role=status / aria-live
alert semantics only when justified
skeleton hidden from accessibility tree when decorative
screen-reader loading text
focus restore after retry/modal state change
reduced motion
contrast
non-modal loading must not trap focus
```

## Responsive

必须覆盖：

```text
1440+
~1024
~390
~320
```

不要重设计 Planner Grid。

## Acceptance Matrix

最终设计文档至少包含 28 项可验收矩阵，覆盖：

```text
page loading
section loading
skeleton
first-use empty
no-result empty
recoverable error
blocking error
partial degradation
retry success/failure
auth/session
missing/not-accessible Trip
map unavailable
route unavailable
AI unavailable visual state
Home/Start/Planner/Detail
desktop/tablet/mobile/narrow mobile
keyboard/focus
screen reader
reduced motion
layout preservation
no false business-truth copy
```

## Evidence

创建：

```text
docs/qa/TASK-066/README.md
```

可选：

```text
docs/qa/TASK-066/design-matrix.json
```

必须如实记录：

```text
latest develop audited
token/design sources audited
Home/Start/Planner/Detail audited
no runtime code changed
no API/schema/migration changed
acceptance matrix complete
known design conflicts and authoritative resolution
```

不要伪称没有实际执行的 browser QA。

## WBS Update

实际开始执行时，只更新 1.20：

```text
1.20 = B / 进行中（#389 / TASK-066-B；用户授权单项代做）
```

设计完成 + Draft PR 后：

```text
1.20 = B / 待审查（#389 / TASK-066-B；Draft PR #...）
```

只有用户明确验收 + merge develop 后才能：

```text
1.20 = B / 已完成
```

3.7 不得启动或改状态。

## Required Delivery

必须产出：

```text
docs/tasks/TASK-066-b-wbs-1-20-main-system-state-design-freeze.md
docs/tasks/CODEX-TASK-066-b-wbs-1-20-main-system-state-design-freeze.md
docs/tasks/RESULT-TASK-066-b-wbs-1-20-main-system-state-design-freeze.md
docs/ui/main-system-loading-empty-error-skeleton.md
docs/project/WBS-1.20-owner-correction.md
docs/qa/TASK-066/README.md
```

必要时追加 machine-readable design matrix。

最后创建：

```text
Draft PR → develop
```

## Explicitly Out of Scope

禁止执行：

```text
WBS 3.7 runtime implementation
React state component implementation
Home/Start/Planner/Detail business changes
Planner Store 4.15
Day Plan 4.16
4.18 / 4.19
Route Provider 7.3 / 7.8 behavior
AI runtime 6.x
Engine runtime
Booking/Payment
API/schema/migration
Production/Staging DB
Deployment/env change
main-system layout redesign
unrelated asset generation
```

## Final Checks

至少执行：

```text
execution-time latest develop recheck
format/style check for changed docs
git diff --check
verify no runtime/source/schema/migration files changed
record exact final-head CI truth if CI runs
```

完成后：

- 不自动 merge；
- 不启动 3.7；
- 返回完整 `TASK-066-B Result` 给用户验收。
