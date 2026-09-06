# TASK-010-B v1.1 Result

## Status

待验收 / WBS 待审查。自身实现与浏览器验收完成；仅提交 Draft PR，不自动合并。全产品迁移不标记 100% 完成。

## Tracking / Prerequisites

- Issue: [#79](https://github.com/kanzakimy0/TravelAssist/issues/79)
- Owner: A+B / Shared Navigation
- WBS: 3.1 / 5.1 / 5.10 / 5.20，仅导航子集，不提前完成完整业务。
- Base Commit: `a567dffc5930523cb0917889abab9ac9b8cebf19`
- Branch: `fix/shared-global-logo-navigation`
- Implementation Commit: `0e581513e72b5890b77bf74f6f369fc73f6538f0`
- Draft Pull Request: [#108](https://github.com/kanzakimy0/TravelAssist/pull/108) / Open Draft → develop；后续提交仅补齐本 Task 的追踪文档，最终交付 head 以该 PR 为准。
- TASK-010-A / #78 / PR #101: 已合并；merge commit `550a2b8b066111996bfc78894ce4f17dafc0dafe` 已确认是 origin/develop 祖先，Step 3 deep-link 可用。
- 文档 PR #106: Open / Draft / 未合并，head `533801b320f48371fda0dac4f3747594ec6df2f2`。完整读取该分支的 Task v1.1、navigation-flow v1.2 和 2026-09-06 audit；只将本 Task 最新定义与执行记录同步到功能分支。导航规范和历史审计仍由文档 PR #106 承接。
- 开发基线始终为最新 develop，没有从文档分支或 PR #102 分支叠加。原工作区有既有 Planner 改动，本次在独立 clean worktree 开发，原改动完整保留。

## Implemented by TASK-010-B v1.1

- 首页 Brand 改为语义化 `Link href="/"`，可访问名称为 `TravelAssist 首页`；保留原图形、文字、尺寸、位置和样式，未修改首页 CSS、Hero、背景、语言或 AI 面板。
- Personal Center Desktop 与 Compact Brand 改为 `GuardedLink → /`；继承所有 8 个当前 Personal Center 路由，未保存时保留取消 / 放弃修改保护。
- Personal Home 主动作 `继续规划 → /planner`、次动作 `开始新旅行 → /start?entry=step3`；明确当前为示例规划，尚未接入真实保存行程。
- Trips placeholder 新增 `开始新旅行 → /start?entry=step3` 与 `返回当前规划 → /planner`，说明不存在真实保存列表。
- `PersonalPlaceholder` 增加可选 actions，Preferences / Companions 不增加无关按钮。
- 动作使用既有主题并支持窄屏换行；链接按钮颜色增加局部选择器优先级，避免共享链接样式覆盖主按钮文字。
- 新增独立静态导航测试与可复跑浏览器脚本，没有修改受保护测试。

## Verified existing navigation

- Start / Planner Logo 原有 `→ /` 保持，四种尺寸逐页点击验证。
- TASK-010-A 提供的 `/start?entry=step3` 实测显示 `这次旅行怎么安排？` UI Step 3，没有改 Start 源码或新建路由。
- `我的首页 → /personal-center` 保留；五项一级导航与 active / aria-current 实现未改变；Personal Home 查看全部、旅行卡、收藏仍进入 Trips。
- Account 的 security / privacy / booking-sync 三个入口及每个子页 `返回账户` 四种尺寸均复验。
- Avatar Popover 原有快捷导航保留；Esc 关闭及焦点恢复保持；没有新增“返回首页 / 返回 TravelAssist”菜单，退出登录仍 disabled。
- 新动作的 Back / Forward、Logo 的 Tab / Enter / focus-visible、未保存 Guard 取消后输入保留及确认离开均实测通过。
- 既有主流程导航及草稿契约由原 TASK-010-A 独立测试复验通过，不计为本 Task 新实现。

## Pending external task / PR

- **Planner → Detail: Pending TASK-011-A / Issue #86 / Draft PR #102**。
- 交付前复核 PR #102: Open / Draft / 未合并，head `affac24816a72b7cd26826d3004a2cd5d1c10b71`。
- `/planner?view=detail&day=1` 的 Detail Logo、返回 Planner 与共享 Map 生命周期不计入本次通过项；须 PR #102 合并后由对应任务验收。
- 未修改 `src/features/planner/**`、`src/app/planner/page.tsx`、`tests/task-010-navigation.test.mjs`；没有 cherry-pick、覆盖或重写 PR #102。
- 文档 PR #106 保持独立待合并；本次没有合并任何 PR。

## Not implemented / Non-goal

Auth / Session / Logout、Saved Trips backend / DB、Profile Preference 预填、Preferences / Companions 正文、正式 Trip Library、旅行灵感 / 目的地探索、Planner / Detail 功能开发、Mapbox / Trip State / Route 重构、真实 AI / Weather / Traffic / Reservation Provider、Partner Logo 跳转规则、视觉重做。没有新 API、Secret、数据库配置或依赖变更。

## Changed Files

- `src/features/home/components/compact-header.tsx`
- `src/features/personal-center/components/personal-sidebar.tsx`
- `src/features/personal-center/components/personal-home-preview.tsx`
- `src/features/personal-center/components/personal-placeholder.tsx`
- `src/features/personal-center/personal-center.module.css`
- `src/app/(account)/personal-center/trips/page.tsx`
- `tests/task-010-b-global-logo-navigation.test.mjs`
- `tools/qa/task-010-b-navigation-check.mjs`
- `docs/qa/TASK-010-B/report.json` 与四尺寸 Home / Trips / Guard 共 12 张截图
- `docs/tasks/TASK-010-b-personal-center-navigation.md`
- `docs/tasks/RESULT-TASK-010-b-personal-center-navigation.md`
- `docs/project/WBS-TravelAssist.md`

## Test / Typecheck / Build Result

| Validation                                    | Actual result                                                                       |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `npm ci`                                      | Passed；未修改 package / lockfile                                                   |
| `npm run lint`                                | Passed                                                                              |
| `npm run typecheck`                           | Passed                                                                              |
| `npm run test --if-present`                   | Exit 0，但仓库无 npm test script，属于未运行测试，不写 Passed                       |
| `node --test` + 全部 `tests/*.test.mjs`       | 74/74 Passed，含新增 2 项导航契约测试                                               |
| `npm run format:check`                        | Failed：21 个 origin/develop 既有文件，逐项核对内容相同且基线同样格式失败；详见下方 |
| Task-owned 格式检查                           | Passed；WBS 按既有 `.prettierignore` 排除，未扩大 ignore 或格式化无关文档           |
| `npm run build`                               | Passed，13 个静态页面及现有动态 /start；本地生产预览验收                            |
| `git diff --check`                            | Passed                                                                              |
| 浏览器 Logo QA                                | 44/44，11 路由 × 4 视口                                                             |
| 四个动作 / 历史 / Account 子页 / Guard / 键盘 | 四视口全部 Passed                                                                   |
| Console / hydration / 横向溢出                | 0 新 error；11 路由四视口无文档横向溢出                                             |

Node 测试输出既有 MODULE_TYPELESS_PACKAGE_JSON 提示；未为消除警告改工程配置。Planner 使用无 Token fallback 验收，本次不改地图实现。

### Browser QA matrix

| Routes                                  | 1440×900 | 1024×768 | 390×844  | 320×740  |
| --------------------------------------- | -------- | -------- | -------- | -------- |
| `/`                                     | Logo → / | Logo → / | Logo → / | Logo → / |
| `/start`                                | Logo → / | Logo → / | Logo → / | Logo → / |
| `/planner`                              | Logo → / | Logo → / | Logo → / | Logo → / |
| `/personal-center`                      | Logo → / | Logo → / | Logo → / | Logo → / |
| `/personal-center/trips`                | Logo → / | Logo → / | Logo → / | Logo → / |
| `/personal-center/preferences`          | Logo → / | Logo → / | Logo → / | Logo → / |
| `/personal-center/companions`           | Logo → / | Logo → / | Logo → / | Logo → / |
| `/personal-center/account`              | Logo → / | Logo → / | Logo → / | Logo → / |
| `/personal-center/account/security`     | Logo → / | Logo → / | Logo → / | Logo → / |
| `/personal-center/account/privacy`      | Logo → / | Logo → / | Logo → / | Logo → / |
| `/personal-center/account/booking-sync` | Logo → / | Logo → / | Logo → / | Logo → / |

证据：[QA report](../qa/TASK-010-B/report.json)、同目录 `{width}x{height}-home.png` / `-trips.png` / `-guard.png`。

复跑：先 `npm run build`、`npm start -- -p 3112`；设置本机可用 `PLAYWRIGHT_MODULE` 和 `CHROME_EXE` 后运行 `node tools/qa/task-010-b-navigation-check.mjs`。默认仅访问本机 3112；未改变用户 localhost:3000 服务。

### Existing format baseline exceptions

以下 21 个文件逐项与 `origin/develop:a567dff` 比较内容完全相同（仅规范化 Git CRLF/LF）；基线本身也未通过当前 Prettier。原 Task v1.0 是第 22 个失败文件，本次同步 v1.1 后已格式化通过。

1. `docs/README.md`
2. `docs/ai/trip-judgement-two-phase.md`
3. `docs/architecture/db-orm-migration-standards.md`
4. `docs/architecture/trip-plan-data-ai-takeover.md`
5. `docs/assets/personal-center-generated-images-20260905.md`
6. `docs/project/WBS-5.1-LOCAL-ASSET-COPY-MAP.md`
7. `docs/project/WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md`
8. `docs/tasks/TASK-009-a-db-foundation.md`
9. `docs/tasks/TASK-011-a-planner-to-trip-detail-workspace.md`
10. `docs/tasks/TASK-WBS-5.1-b-visual-assets-integration.md`
11. `docs/tasks/TASK-WBS-5.4-b-personal-center-generated-assets-integration.md`
12. `docs/tasks/TASK-WBS-5.4-b-profile-account-ui.md`
13. `docs/tasks/TASK-WBS-5.5-b-preference-center-ui-amendment-local-assets.md`
14. `docs/tasks/TASK-WBS-5.5-b-preference-center-ui.md`
15. `docs/ui/companion-management.md`
16. `docs/ui/navigation-flow.md`
17. `docs/ui/personal-center-responsive-states.md`
18. `docs/ui/planner-map-interaction-booking-mapbox.md`
19. `docs/ui/planner-right-panel-secondary-tabs.md`
20. `docs/ui/trip-detail.md`
21. `tests/wbs-5.4-v2.test.mjs`

## Blockers / Handoff

本 Task 自身范围无实现阻塞。全仓格式基线异常已如实记录；按 Task 允许的基线例外交付。Planner → Detail 外部待合并不是本 Task 擅自补做的范围。Task / WBS / Result / Issue / Draft PR 同步后停止；不自动 merge。
