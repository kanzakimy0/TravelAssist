# WBS-5.7-B Result

## Status

Completed

## Preflight

- origin/develop base: implementation started from `718d57ad1631c6517d49c697ce9a0c516fcab806`；pre-publish sync merged latest `e725d21821107414a4551427d315aa55cfab7903` without history rewrite。
- dependency 5.5: Passed；Master WBS 为已完成。
- duplicate Task: No；使用唯一正式 Task `TASK-WBS-5.7-b-mobility-preference-ui.md`。
- duplicate Issue: No；使用唯一 Open Issue #123。
- duplicate PR: No；启动前未发现等价实现 PR。

## Tracking

- Issue: [#123](https://github.com/kanzakimy0/TravelAssist/issues/123)（用户验收通过；tracking closeout 合并后关闭）。
- Task File: `docs/tasks/TASK-WBS-5.7-b-mobility-preference-ui.md`
- Result File: `docs/tasks/RESULT-WBS-5.7-b-mobility-preference-ui.md`
- Branch: `feature/b-account-wbs-5-7-mobility-preference-ui`
- Implementation Commit: `ab7969741bdcc932a97745c7c6df44815fba5b66`
- Final Head: `e544bc5aa36ab82acb1baa5ab253f1e9437fb2a8`（implementation PR head）。
- PR: [#125](https://github.com/kanzakimy0/TravelAssist/pull/125) 已合入 `develop`；Merge Commit `8b83628f60e7dd2a07231a59ca448c4dc5af510d`。
- WBS updated: WBS 5.7 与唯一 WBS-5.7-B tracking record 已更新为已完成（用户验收通过）。

## Acceptance Fix

- User Acceptance: Passed（2026-09-06）。
- Defect: 在缩放 / 小视口下点击“不乘坐公共交通”时，绝对定位的隐藏 checkbox 焦点会产生幽灵滚动范围和大块空白。
- Fix Branch: `fix/wbs-5-7-checkbox-focus-scroll`
- Fix Commit: `ddf0abafe7d94b20870600c87a66fd57c26f80ab`
- Fix PR: [#126](https://github.com/kanzakimy0/TravelAssist/pull/126) 已合入 `develop`。
- Fix Merge Commit: `cabb4874d4c27f0909011af76c7ca13f79288c22`
- Regression: checkbox 焦点目标固定在选项卡内部；390×844、320×740 与 125% 缩放等效场景均通过。

## Mobility UI

- generic shell replaced: Yes；仅 `category === "mobility"` 使用完整移动偏好页，其余动态分类继续使用既有通用 shell。
- current summary: Live；最多展示 3 个主要项目，presentation default 为“平衡 · 少换乘 · 少步行”。
- preset selector: 轻松优先 / 平衡 / 效率优先；仅为 UI View Model，不是正式 Schema。
- fewer transfers: 独立可选，使用 `aria-pressed` 暴露状态。
- less walking: 独立可选，使用 `aria-pressed` 暴露状态。
- detailed restrictions: 仅包含“不乘坐公共交通 / 不乘坐公交 / 不乘坐游船”三项。
- save / cancel / restore: Save 写入页面内存 saved snapshot 并显示“✓ 已保存”；Cancel 回滚到 saved；Restore 恢复 UI fixture，不代表 WBS 5.13 正式 preset。

## Conflict UX

- lessWalking + noPublicTransit: 显示“可用路线可能明显减少”警告并明确不自动修改选择。
- redundancy notice: “不乘坐公共交通”与“不乘坐公交”同时启用时显示覆盖关系说明，并保留两项选择。
- silent state mutation: No

## State Boundary

- Persistence: Mock / in-memory only。
- Formal Preference Schema: Not implemented。
- Planner Contract: Not implemented。
- localStorage / Cookie: Not used。
- network writes: None。
- overview cross-route synchronization: deferred

## Unsaved Guard

- back to preferences: Passed；未保存时触发现有离页确认。
- Sidebar: Passed；未保存时触发现有离页确认。
- Avatar Popover: Passed；账户快捷导航在未保存时触发现有离页确认。
- beforeunload: Passed；dirty 时阻止默认离页，保存后解除。

## Responsive

- 1920×1080: Passed；顶部与底部截图完成。
- 1440×900: Passed；顶部与底部截图完成，完整交互流程通过。
- 1280×720: Passed；Compact Shell 下布局与操作可用。
- 390×844: Passed；单列卡片与底部操作区可用。
- 320×740: Passed；最窄视口无截断，选项与按钮可用。
- horizontal overflow: 五个视口均不超过 1px。

截图证据：`docs/evidence/WBS-5.7-B/mobility/`（每个视口 top / bottom 共 10 张）。

## Regression

- Preference overview: Passed；200 且无水平溢出。
- other category shells: Passed；attractions / dining / accommodation / budget / experience / advanced 仍使用既有通用 shell。
- Companions: Passed；200 且无水平溢出。
- Account: Passed；200 且无水平溢出。
- Avatar Popover: Passed；打开与 Escape 关闭、dirty guard 均通过。

## Validation

- npm ci: Passed；首次被旧 dev 进程锁定 native module 后停止该明确进程并重试成功；362 packages，0 vulnerabilities。
- lint: Passed。
- typecheck: Passed。
- format:check: Repository baseline not clean；26 个既有非本 Task 文件未通过，按范围约束仅记录。
- targeted format: Passed；本 Task TS / TSX / CSS / MJS / Task / Result 均通过。
- tests-if-present: 仓库无 `test` script，按 Task 规则 no-op。
- Node tests: Passed，30 / 30（WBS-5.5 回归 7；WBS-5.7-B 23）。
- build: Passed；Next.js 16.3.4，mobility 动态参数路由 SSG 成功。
- diff-check: Passed。
- browser QA: Passed；真实本地 Edge、5 个指定 viewport、完整功能与回归路径；验收修复后新增 checkbox focus geometry 与小视口跳屏回归并通过。

## Ownership Safety

- A Task modified: No。
- Other B Task modified: No。
- 5.5 status changed: No。
- 5.8 / 5.9 implemented: No。
- Planner modified: No。
- Auth / API / DB added: No。
- package/dependencies modified: No。
- shared Shell modified: No。

## Git

- Commit: `ab7969741bdcc932a97745c7c6df44815fba5b66`（implementation）；`ddf0abafe7d94b20870600c87a66fd57c26f80ab`（acceptance fix）。
- Push: Success；implementation 与 acceptance fix 分支均已推送。
- PR: [#125](https://github.com/kanzakimy0/TravelAssist/pull/125) 与 [#126](https://github.com/kanzakimy0/TravelAssist/pull/126) 均已合入 `develop`。
- Merge behavior: 仓库自动化在 PR 创建后自动完成合并；未 force push、未改写历史、未修改或绕过 workflow / security rules。

## Problems

- 全仓 Prettier 存在 26 个既有非本 Task baseline 文件；本 Task 定向检查通过。
- 浏览器测试脚本热更新后的首轮回归出现一次开发态 HMR hydration 日志；服务器稳定后原样重跑无 console / hydration / asset error。
- Windows screenshot viewer 因沙箱初始化错误不可用；Playwright/Edge 的 DOM、资源、交互、几何检查与 10 张证据截图均成功。
- 仓库 PR 自动化在人工操作前自动合并 #125 / #126；实际状态已如实记录，用户验收后才执行完成状态 closeout。

## Next

Stop. Do not automatically start WBS 5.8 / 5.9 / 5.11 / 5.16.
