# WBS 3.4 Owner Correction

## Decision

- WBS: `3.4`
- Work item: `登录按钮 / 头像入口在主系统中的实现`
- Canonical Owner: **B**
- Decision date: `2026-09-10`
- Reason: 用户明确指定由 B 继续负责 3.4；本项连接 B 已完成的 Auth / Session / Personal Center 能力与主系统入口，作为单项例外由 B 执行。

## Tracking Rule

- 既有 `TASK-031-A` / `a-` 命名若已出现在历史 Issue 文本，仅视为历史预规划，不代表当前 Owner。
- 正式执行 Task 使用 `TASK-031-B`。
- 正式实现分支使用 `feature/b-wbs-3-4-main-account-entry`。
- Master WBS 在 TASK-031-B 真正启动时从最新 `origin/develop` 安全更新为 `Owner B / 进行中`；实现完成未合并为 `待审查`；用户验收且合并 develop 后为 `已完成`。
- 不改变 3.2.1 / 3.5 / 3.7 或其他工作项 Owner。

## Integration Note

TASK-030-B / PR #273 与 3.4 在 Home/Main Shell 测试及追踪上存在重叠。TASK-031-B 实施前必须确认 PR #273 已合入 `develop`；否则仅记录阻塞并停止，不从未合并分支叠加开发。
