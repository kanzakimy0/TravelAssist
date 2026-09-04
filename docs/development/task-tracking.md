# Task / Issue / WBS Tracking

本文件定义 TravelAssist 开发任务的统一追踪规则。它适用于 A、B 和通过 Codex 执行的任务，不改变产品方案或现有自动合并行为。

## 1. 追踪链路

```text
WBS（计划与责任边界）
  ↕
GitHub Issue（执行状态）
  ↕
Task.md（任务定义与审计记录）
  ↓
Feature Branch
  ↓
Commit
  ↓
Pull Request
  ↓
develop
```

所有环节使用同一个 Task ID，例如 `TASK-003-B`。通过 Task ID 可以从 WBS 找到 Issue、Task 文件、分支、提交和 PR。

## 2. 真实来源

- `docs/project/WBS-TravelAssist.md` 是计划、优先级、依赖和 A/B 责任边界的真实来源。
- GitHub Issue 是任务执行状态、讨论和验收进度的真实来源。
- `docs/tasks/TASK-xxx-*.md` 是任务范围、验证结果和交付记录的真实来源。
- `develop` 是已合并成果的真实来源；feature 分支上的完成不等于已经进入项目基线。

如果三者不一致，停止新功能开发，先读取最新 `origin/develop`、Issue 和 WBS。以实际 Git/PR 状态校正 Task 和 Issue，不得凭本地完成状态把 WBS 标记为已完成。

## 3. Task 文件最小元数据

每个正式 Task 文件顶部必须包含：

```md
## Metadata

- Task ID: TASK-XXX-A/B
- Owner: A / B
- Status: 待开始 / 进行中 / 阻塞 / 待验收 / 已完成 / 取消
- WBS: <WBS ID>
- GitHub Issue: #<issue-number> / PENDING
- Branch: feature/a-xxx / feature/b-xxx
- Depends On: TASK-XXX-A/B / None
- Commit: <SHA> / PENDING
- Pull Request: #<pr-number> / PENDING
```

不得伪造 Issue、Commit 或 PR。尚未创建时写 `PENDING`，并列入同步未完成项。

## 4. 状态映射

Task 使用唯一状态集合：`待开始`、`进行中`、`阻塞`、`待验收`、`已完成`、`取消`。

| 阶段                     | Task.md | GitHub Issue       | WBS            |
| ------------------------ | ------- | ------------------ | -------------- |
| 尚未开始                 | 待开始  | Open / Planned     | 未开始或可开始 |
| 正在执行                 | 进行中  | Open / In Progress | 进行中         |
| 无法继续                 | 阻塞    | Open / Blocked     | 阻塞           |
| 实现完成、等待合并或验收 | 待验收  | Open / Review      | 待审查         |
| PR 已合并且验收通过      | 已完成  | Closed             | 已完成         |
| 任务取消                 | 取消    | Closed / Cancelled | 取消           |

WBS 沿用其现有状态名称；`Task.md: 待验收` 对应 `WBS: 待审查`，不另建第二套 WBS 状态。

## 5. 生命周期同步

### 开始时

1. 执行 `git fetch --all --prune`，同步最新 `develop`。
2. 检查最新 A/B Task、WBS、Issue 和 PR，避免重复工作。
3. 创建 GitHub Issue，记录 Task ID、Owner、WBS、Task 文件、分支、依赖、目标和验收条件。
4. 从最新 `origin/develop` 创建 feature 分支。
5. 将 Task.md、Issue 和 WBS 状态同步为“进行中”。

### 开发完成时

1. 运行 Task 要求的全部验证。
2. 将 Task.md 更新为“待验收”，记录真实验证结果、Commit/PR 或 `PENDING`。
3. Issue 保持 Open，并追加 Review / 待验收评论。
4. WBS 更新为“待审查”。
5. Commit message 带 Task ID，push feature 分支并创建指向 `develop` 的 PR。

### 验收通过时

1. 确认 PR 已合并到 `develop`，并拉取最新 `origin/develop`。
2. 将 Task.md 和 WBS 更新为“已完成”，补全 Commit 与 PR。
3. 在 Issue 追加完成评论并关闭 Issue。
4. 完成评论至少包含 Task ID、Branch、Commit、Validation、PR 和 Result。

## 6. Commit 规范

Commit subject 必须包含 Task ID：

```text
feat(TASK-003-B): ...
fix(TASK-003-B): ...
chore(TASK-003-B): ...
docs(TASK-003-B): ...
```

## 7. Issue 和 PR 模板

- 使用 `.github/ISSUE_TEMPLATE/feature.md` 创建开发 Task Issue，不创建重复模板。
- 使用 `.github/PULL_REQUEST_TEMPLATE.md` 创建 PR。
- PR 必须记录 Task ID、Issue、Task File、Validation 和 WBS Sync。
- 使用 `Closes #<issue-number>` 让合并 PR 时自动关联并关闭 Issue；若仍需验收，重新打开 Issue，完成最终同步后再关闭。

## 8. 不一致处理

- Issue 已关闭但 PR 未合并：重新打开 Issue，Task/WBS 保持“待验收/待审查”。
- PR 已合并但验证未通过：Issue 保持或恢复 Open，Task/WBS 标记“阻塞”。
- Task 已完成但 WBS 未更新：先同步 WBS，不开始下一 Task。
- WBS Owner 与 Task 指令冲突：不自行改 Owner；记录冲突并请求负责人确认，除非用户已明确授权本 Task 的执行人。
- Issue、Task 或 WBS 缺失：创建或补齐真实记录；无法访问 GitHub 时使用 `PENDING` 并明确阻塞原因。

## 9. 自动化边界

现有 workflow 负责 feature 分支的 PR 创建和符合条件时的合并尝试，不代表 Issue 或 WBS 已自动同步。Issue 评论、状态和 WBS 更新必须由任务执行者核对完成。未经权限和安全评审，不增加自动写 Issue/WBS 的高风险 workflow。

## 10. 历史任务

历史 Task 不删除。被其他实现取代时使用 `取消`，并记录 `Superseded by <Task or implementation>`；不得把旧分支代码整体合入 `develop`。
