# TASK-003-B — Task / Issue / WBS Tracking Integration

## Metadata

- Task ID: TASK-003-B
- Owner: B
- Status: 待验收
- WBS: 0.7（关联 0.3、0.5）
- GitHub Issue: #18
- Branch: `feature/task-003-b-tracking-integration`
- Depends On: TASK-002-B
- Commit: `b591030bfa1d61f3e55274c73032f3f5f4ce3955`
- Pull Request: #21

## Objective

把 WBS、GitHub Issue、Task.md、feature branch、commit、Pull Request 和 `develop` 的统一追踪规则落地到仓库。

## Preflight

- Latest integrated `origin/develop`: `cd03364282e727fdb335b8bb2e5f6660f4c0668f`（初始分支基线为 `9f87a0d45addb86370d20b25935128234d86129b`）。
- Latest A task: 未发现已进入 `origin/develop` 的 A Task 文件；A 最近通过 PR #19 合入 WBS v0.4 责任边界，PR #17 完成初始旅行需求流程和自动创建 PR workflow。
- Latest B task: `TASK-002-b-engineering-baseline.md`，状态 Completed。
- WBS: 正式 `docs/project/WBS-TravelAssist.md` 已进入 `develop`；本 Task 不合并 `origin/docs/wbs-codex-sync`。
- Issue / PR template: 已存在，但缺少统一 Task ID、WBS、Task File 等追踪字段。
- Equivalent mechanism: 未发现完整的 Task / Issue / WBS 三方同步机制。

## Scope

- 定义 Task 文件最小元数据和唯一状态集合。
- 说明 WBS、Issue、Task.md、分支、提交、PR 与 `develop` 的追踪关系。
- 补充现有 Issue 和 PR 模板，不创建重复模板。
- 在正式 WBS 中记录本 Task 的真实关联。
- 同步 Issue #18 的执行和完成状态。

## Out of Scope

- 产品功能与 UI 修改
- 运行时依赖升级
- 自动合并或部署逻辑变更
- 自动写入 Issue/WBS 的复杂 workflow
- 合并旧 B 工程或 `origin/docs/wbs-codex-sync`

## Deliverables

- `docs/development/task-tracking.md`
- `docs/tasks/TASK-003-b-tracking-integration.md`
- 更新 `.github/ISSUE_TEMPLATE/feature.md`
- 更新 `.github/PULL_REQUEST_TEMPLATE.md`
- 更新 `docs/project/WBS-TravelAssist.md`
- 更新 `.prettierignore`，保留正式 WBS 的手工表格格式并使工程格式检查覆盖策略保持一致

## Validation

| Check                  | Result | Details                                                         |
| ---------------------- | ------ | --------------------------------------------------------------- |
| `npm install`          | Passed | 依赖已是最新状态；审计 361 个包，0 个漏洞。                     |
| `npm run lint`         | Passed | ESLint 无错误或警告。                                           |
| `npm run typecheck`    | Passed | `tsc --noEmit` 无错误。                                         |
| `npm run format:check` | Passed | 所有纳入检查的文件符合 Prettier 格式。                          |
| `npm run build`        | Passed | Next.js 生产构建成功，静态生成 `/`、`/start` 和 `/_not-found`。 |
| `git diff --check`     | Passed | 无空白错误。                                                    |

## Tracking Sync

### Task.md

待验收；Issue、WBS、分支、主 Commit 和 PR #21 已关联。

### GitHub Issue

Issue #18 已创建并同步为 Open / Review。

### WBS

正式 WBS v0.4 已记录 TASK-003-B，主 WBS 为 0.7，关联 0.3 和 0.5，状态为待审查。

## Workflow Decision

不修改现有 `.github/workflows/auto-create-pr.yml` 和 `.github/workflows/auto-merge.yml`。现有自动化负责 PR 创建与合并尝试；Issue 和 WBS 同步仍由任务执行者确认，避免在 Token 和 Actions 权限未经专门评审时增加高风险自动写操作。

## Problems

- `npm install` 有一条非阻塞 allow-scripts 提示：`unrs-resolver@1.12.2` 的安装脚本尚未批准；未擅自修改依赖安全策略。
- `develop` 中新合入的正式 WBS 原本不符合 Prettier；已沿用现有手工维护文档策略加入 `.prettierignore`，避免无关全文件重排。

- PR #21 因执行期间 WBS v0.4 合入 `develop` 出现冲突；已以 v0.4 为准保留新责任边界，并重新叠加本 Task 的最小追踪记录。

## Result

追踪规则、模板和 WBS 关联已实现并通过工程验证，等待 PR 合并和最终三方同步。

## Next Task

Not ready for TASK-004 — synchronization required.
