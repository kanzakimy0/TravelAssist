# RESULT — TASK-045-B / WBS 5.16 Preference Persistence API v1

- Result: **PASS — Ready for User Acceptance: Yes**
- 日期：2026-09-11
- WBS 5.16：**待审查**；未标记已完成。
- Issue：[#316](https://github.com/kanzakimy0/TravelAssist/issues/316)，保持 **OPEN**。
- 实现分支：`codex/b-account-wbs-5-16-preference-persistence-api`
- PR：Draft → `develop`；最终发布链接见本次交付记录。不得自动合并或标记 Ready。
- 执行基线：`origin/develop@59673f99866e98af59173dfbac4842371bb02f04`
- 正式规格 head：`2e9a9236b65685606c6b531fc581cc4cdb5ea5f0`
- 实现与部署产物 commit：`7ed5bab2ce86de34229d2832ba30a43019db20bb`
- 本 Result / WBS 状态提交在实现提交之后；没有后续 runtime 修改。

## 1. 启动与范围

完成 `git status --short`、`git branch --show-current`、`git fetch --all --prune`、`git rev-parse origin/develop` 和 `git log --oneline -15 origin/develop`。读取正式设计、Task、launcher、最新 WBS、5.11 domain/SQL/Drizzle、Auth Core 与现有 Preference UI。执行时最新 develop 尚无 canonical 5.16 实现。

从干净的上述 develop 创建独立实现 worktree 和指定 `codex/` 分支。原工作树保持原分支和干净状态。首次 C 盘 `npm ci` 遇到 ENOSPC；仅将新建 Task worktree 移至 `F:/CodexWorktrees/TravelAssist-TASK045` 并修复 worktree 路径，随后 `npm ci --cache .artifacts/npm-cache` 成功。没有强制推送、reset、clean、merge 或 cherry-pick。

执行开始时，主表 5.16 已由启动记录设为「进行中」。必需实现与真实 QA 完成后，本次仅将该行改为「待审查」。其他 WBS 行不变。

## 2. API、Auth 与 CAS

| 路由                          | 行为                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `GET /api/preferences`        | 返回 canonical resource；缺行返回 empty Preference、revision 0、updatedAt null，不建行、不返回 owner |
| `PATCH /api/preferences`      | 严格解析 expectedRevision + 5.11 patch；首写 0→1；现有行条件更新；返回同一次写入的结果               |
| `POST /api/preferences/reset` | 清空显式 Preference 并递增 revision；缺行 + 0 不建行；已空行的显式 Reset 仍递增                      |

所有请求通过既有 Auth Core 的 `requireAuthUser()` / Supabase `getUser()` 验证。Cookie client 保留会话刷新；显式 Bearer 使用 public client 的 Authorization header，验证失败不回退 Cookie。owner 只来自可信 Auth，拒绝 query/JSON owner 注入和多余 envelope 字段。

Cookie mutation 必须匹配可信站点 Origin 且使用 JSON。请求流按实际字节限制 **80 KiB**，检查声明长度、UTF-8 与 JSON；5.11 domain 的 **64 KiB** 限制继续生效。三个 handler 的成功及错误响应均为 `private, no-store`，Vary 为 Authorization/Cookie，错误只返回规定的稳定 code，不暴露 SQL、token 或堆栈。

Repository 使用用户上下文 Supabase client、现有 RLS 和 `public.travel_preferences`。首写唯一键冲突转 409；后续写入使用 owner + expected revision 条件，条件未命中为 409。已过期的空 patch 同样拒绝。PATCH 复用 `applyPreferencePatch`，结果再次由 `parsePreferenceV1` 校验。Reset 与 PATCH 均不隐藏重试或自动合并。

复用且未修改 `PreferenceV1`、`PreferencePatchV1`、`emptyPreference`、`parsePreferenceV1`、`parsePreferencePatchV1`、`applyPreferencePatch`。新增 resource/envelope 校验不构成第二套 Preference registry。SQL migration、Drizzle mirror、5.11 validators/trigger/RLS 和 generated types 均无 diff。

## 3. UI adapter 审计

| 当前页面/旧表示        | 本次 canonical 映射与行为                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| Preference 总览        | 读取已保存 resource；六轴画像和摘要由 canonical values 派生；不保存 radar/Mock defaults                    |
| Mobility               | 5 个 `mobility.*` 字段；旧 lessWalking 控件改为 walkingTolerance 五档；不保存 preset identity              |
| Dining                 | 3 个 `dining.*` 字段；未设置与 neutral 分离                                                                |
| Accommodation          | 3 个 `accommodation.*` 字段；旧视图数据不转存                                                              |
| Budget                 | 3 个 `budget.*` 字段；未设置与 false 分离                                                                  |
| Attractions / Activity | `interests.preferences` + `interests.details`；16 个 stable InterestCode 与既有 DetailCode；中文仅为 label |
| Experience             | 7 个 `style.*`，包括 planning；未设置与显式中间档 3 分离，提供显式选择 3 的按钮                            |
| 旧 photoExperience     | 使用 photography Interest / canonical DetailCode；不保存旧 boolean                                         |
| Advanced               | 仅汇总编辑同一 23-key schema，不新增 schema/事实来源                                                       |

每个 editor 使用已保存 resource 与独立 canonical draft；Save 根据差异产生 set/unset。两个兴趣 map 都是 whole-value replacement，保留用户当前 draft 内未编辑项目，但不深合并远端冲突。取消恢复上次读取的保存值；409 保留 draft、显示「已在其他设备更新」、禁用继续提交，用户显式选择后才放弃 draft 并重新读取服务器版本。网络失败保留 draft。继续复用原导航 dirty guard。

总览 Reset 调用真实 API，成功后读取空 resource。Guest 由现有 Personal Center Auth gate 转到登录页；空账户首次读取不会自动写入默认值。旧纯 UI model/fixture helper 保留为历史测试数据，不再用作长期 Preference 保存来源。页面没有 localStorage、StartFlow autosave 或 Trip 写入接线。

移动端 390×844 实际操作并检查无水平溢出；修正移动端保存区遮挡控件的问题。真实浏览器保存 walkingTolerance、neutral、false、style 3、摄影兴趣与 detail 后均可重载恢复。

## 4. PR #221 只读审计

Issue #207 与 Draft PR #221 均只读。审计的 PR head 为 `929529be302b60c84ace3a580461de95e04de461`。参考 verified Cookie/Bearer、bounded JSON、no-store、CAS/409、repository 分层与两用户验收模式，按当前 5.11 设计重新实现。

未 merge/cherry-pick #221，未采用旧 30-key/likes-dislikes contract、operation-multiplexed travel-persistence route、Trip Draft/Snapshot/Override 或 StartFlow autosave。未修改、关闭 #207/#221。

## 5. 真实 Local Supabase / Auth / API / UI 验收

环境：Windows，Node 24.18.0，Docker 29.7.2，Supabase CLI 2.116.0，Next 16.3.4。使用真实 Local API/DB、真实 Next production server 和 headless Microsoft Edge。创建 **2 名真实临时 Auth 用户**；通过真实 `/auth/signin` 建立 **2 个独立 Cookie browser contexts**。没有 mock DB/Auth/API/browser 保存结果。

`test:preference-api:local`：**17/17 PASS**，包含 1 个父测试与以下 16 个实际完成场景；0 fail / 0 skipped。

1. anon GET/PATCH/Reset 拒绝；畸形/无效显式 Bearer 拒绝，即使存在有效 Cookie 也不回退。
2. 缺行 GET revision 0，缺行 Reset 不建行；Cookie/Bearer 均验证。
3. Cookie mutation 拒绝缺失/跨站 Origin 和非 JSON；显式 Bearer 决定身份。
4. Cookie 首次 PATCH 0→1，Bearer 连续 PATCH；stale 409；owner 注入拒绝。
5. 并发首写恰好一个成功、一个 409；已存在行同 revision 竞争也仅一胜者。
6. 畸形 JSON、非法 Preference、超过 80 KiB、错误 revision 被拒绝且不写入。
7. 兴趣 map whole-value replacement 与显式 unset，其他字段保留。
8. 真 Reset、stale Reset、已空 Reset 递增；第二 Cookie session 恢复同一数据。
9. 真实 RLS 跨用户/anon 隔离及 SQL validator、revision/owner/timestamp guard 回归。
10. 浏览器显式编辑 Save，reload 与第二 session 均恢复服务器值。
11. 旧 session 保存产生可见 409，draft 保留，必须显式 reload。
12. 网络失败保留 draft；Cancel 恢复保存值；dirty navigation 弹窗可继续编辑。
13. 总览 Reset 后 reload 为空；Guest/空第二账户不写 Mock defaults。
14. 全部分类路由加载 canonical 控件，移动布局检查与无浏览器 JS 错误。
15. Dining neutral、Accommodation、Budget false、Style 3、兴趣 whole map 的实际保存/重载。
16. 删除 Auth A cascade A Preference、保留 B；最终删除所有临时用户和 fixture。

证据：`.artifacts/task045/runtime.log`、`ui-evidence.json`、`mobile-layout.json`、`mobility-mobile.png`。`ui-evidence.json` 仅在实际场景 callback 成功后记录完成项，最终 `completedScenarios.length = 16`、`complete = true`。本地日志和截图属于忽略的验收产物，凭据不提交。

## 6. 回归与质量门禁

| 检查                                                   | 结果                                                                |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| `npm ci --cache .artifacts/npm-cache`                  | PASS，395 packages，0 vulnerabilities；C 盘失败后迁移工作树重新执行 |
| `npm run test:preferences`                             | PASS 503/503                                                        |
| `npm run test:preferences:db`                          | PASS 505/505，真实 Local                                            |
| `npm run test:preference-api`                          | PASS 37/37                                                          |
| `npm run test:preference-api:local`                    | PASS 17/17，真实 DB/Auth/API/browser                                |
| Preference UI regression（WBS 5.5/5.7/5.8/5.9）        | PASS 79/79                                                          |
| Profile real DB regression                             | PASS 25/25                                                          |
| `npm run test:companions:db`                           | PASS 147/147；Companion pure 163 项亦包含在全仓中                   |
| 全仓 `tests/*.test.mjs`                                | PASS 1532/1532，0 skipped                                           |
| `npm run lint`                                         | PASS                                                                |
| `npm run typecheck`                                    | PASS                                                                |
| `npm run build`                                        | PASS                                                                |
| `npm run deploy:validate:local`                        | PASS，local development target                                      |
| `npm run deploy:build:local`                           | PASS，产物 commit `7ed5bab2ce86de34229d2832ba30a43019db20bb`        |
| `npm run deploy:verify-artifact`                       | PASS，1746 files，failures=[]                                       |
| `npm run format:check:deploy`                          | PASS                                                                |
| 新增/修改实现、测试和 Task 文档 Prettier               | PASS                                                                |
| `git diff --check`                                     | PASS                                                                |
| `npm run db:start/status/reset/types/stop`（分别执行） | 全部 PASS；最后已 stop                                              |

真实 `db:types` 重新生成后与基线文件完全相同，SHA-256：`2A7D374BE90755CAE372F566947A21834028A51D226D8BC74F9F97E76193CB26`。本 Task 没有 DDL 变更，未手工伪造 generated types。

完整 `npm run format:check` **未通过**：64 个既有基线文件格式问题。本地逐文件比对执行基线内容，并对基线内容运行相同 Prettier，确认 **64 baseline failures / 0 new failures**。其中 WBS 只改变 5.16 的状态单元格，保留其原有格式债务；没有借本 Task 重排全表或修改其他文档。证据为 `full-format.log` 和 `format-audit.json`。这是正式 Task 允许单独披露的既有基线债务，不能表述为全仓格式 PASS。

Node 的既有 MODULE_TYPELESS_PACKAGE_JSON 提示为非阻断 warning；未为消除提示修改 package module mode。部署 gate 仅做本地构建/产物验证，没有发布到远端环境。

## 7. 复现入口

```powershell
npm ci --cache .artifacts/npm-cache
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run test:preferences
npm run test:preferences:db
npm run test:preference-api
npm run build
$env:CODEX_PLAYWRIGHT_PATH='C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
npm run test:preference-api:local
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs
npm run test:companions:db
node --import ./tests/register-route-ts.mjs --test tests/wbs-5-5-preferences.test.mjs tests/wbs-5-7-mobility-preference.test.mjs tests/wbs-5-8-attraction-activity-preference.test.mjs tests/wbs-5-9-dining-accommodation-budget.test.mjs
node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs
npm run lint
npm run typecheck
npm run build
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
npm run format:check:deploy
npm run format:check
git diff --check
npm run db:stop
```

真实 DB 套件须顺序运行于可 reset 的专用 Local 实例。UI QA 要求安装 Microsoft Edge 与真实 Playwright runtime；上面的 CODEX_PLAYWRIGHT_PATH 是本机路径，其他机器应指向其实际安装路径。缺失 DB/browser 时套件失败，不跳过并伪报 PASS。没有为测试额外修改 package-lock 或产品依赖。

## 8. 变更与最终边界

新增 `src/app/api/preferences/**`、`src/server/preferences/**`、`src/features/preferences/persistence/**`；五个既有 Preference 页面/总览接入共享 canonical editor/resource。新增 3 个 TASK-045 测试/Local helper 文件，更新 3 个旧页面测试的实现边界断言以反映真实持久化；旧纯 fixture 测试仍保留。package.json 仅新增两个测试命令。

同步正式设计/Task/launcher，并新增本 Result；主表只改变 5.16。完整文件清单可由 `git diff --name-only 59673f99866e98af59173dfbac4842371bb02f04 HEAD` 核对。

未修改 SQL/Drizzle/generated types、5.11 domain、Auth Core、A Trip Contract、Planner、Engine、AI、POI 或 StartFlow。未启动 5.13、5.14、5.17、5.18、8.6；不发布 Planner-readable contract、不定义新 preset、不接 Trip 持久化。Issue #316 保持 OPEN，PR 保持 Draft，等待用户验收与合并；TASK-045-B 完成后停止。
