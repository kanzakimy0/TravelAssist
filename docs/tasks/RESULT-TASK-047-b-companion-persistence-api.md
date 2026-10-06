# TASK-047-B Result

## Status

WBS 5.17 Companion Persistence API v1 实现与真实验收已完成，状态为 **待审查**。全仓 lint 保留 7 项既有本地 QA 缓存错误，不能称为全部检查全绿；本 Task 未增加未解释失败。等待用户验收，不自动合并。

## Prerequisite / Baseline

- 执行了要求的 status、branch、fetch、develop SHA 和最近 15 条日志；初始工作树干净，原分支为 `fix/quality-gate-baseline-repair`。
- 基于执行时最新 `origin/develop@6750a50d9fc49e561e60d25e7ebfc90c76c60a60` 创建实现分支；提交前再次 fetch，integrated develop SHA 相同。
- 确认 WBS 5.12、8.1 已完成，Issue #324 Open，没有另一份 5.17 实现；完整读取远端四份规格及现有 Domain、DB、Preference API、UI 和测试。
- 未修改 develop 基线：`npm ci` 通过（395 packages，0 vulnerabilities）；全仓 1532/1532、Companion 163/163、Personal Center 39/39、真实 Companion DB 147/147。
- 基线 lint 7 错误；初始 typecheck/build 的 3 个过期生成类型引用在隔离 `.next/dev` 后通过，未改基线源码。详见 Exceptions 和 [QA 证据](../qa/TASK-047/README.md)。

## Tracking

- Issue：[#324](https://github.com/kanzakimy0/TravelAssist/issues/324)，保持 Open。
- Branch：`codex/b-account-wbs-5-17-companion-persistence-api`。
- 实现 commit：`bd7d3fce92c64bd7ba84ed1f12271aa4a5f2e16c`。
- 验收入口/最终受测 commit：`443bad8da0b6a3460838385993d444b16865c0d9`；其后的提交仅补报告、证据和 tracking。
- Master WBS 仅修改 5.17 为“待审查”，未覆盖其他行状态。
- Draft PR：[ #325](https://github.com/kanzakimy0/TravelAssist/pull/325)，目标 develop，保持 Draft。
- Issue 更新：[验收记录](https://github.com/kanzakimy0/TravelAssist/issues/324#issuecomment-5642154687)。
- Result/QA 提交：`bd6c74e`；后续仅补入实际 PR/Issue 链接和证据文件行尾规范。

## Architecture Reuse

继续以 5.12 表、RLS、FK 和 `src/features/companions/domain/companion-v1.ts` 为真源，在同一 Domain 补入严格输入 parser；枚举、DOB/fallback 及 travel profile 规则复用原实现。单一 server mapper 集中处理 DB 与 canonical resource；React 不拼 DB payload。

将 5.16 已验证的 Cookie/Bearer、verified Auth、Origin、bounded JSON、private response 能力提取到 `src/server/private-http.ts`，Preference 保持原公开 helper 接口，真实回归通过。没有第二套 Auth 基础设施。

新增 migration 仅提供两项 `SECURITY INVOKER` 事务 RPC，未更改 5.12 表结构、RLS、FK 或 ORM 语义。生成 DB types 经重复生成校验一致。

## Companion API

| 路径                   | 方法               | 行为                     |
| ---------------------- | ------------------ | ------------------------ |
| `/api/companions`      | GET / POST         | 当前用户列表 / 创建      |
| `/api/companions/{id}` | GET / PUT / DELETE | 读取 / 完整更新 / 硬删除 |

创建返回 201、revision 1；读取/更新返回 200 和服务器 canonical resource；删除返回 204。PUT/DELETE 必须携带 `If-Match: "<revision>"`，更新成功 revision +1。

严格限制 writable fields，拒绝 owner、revision、未知字段、self ID、无效日期/枚举、敏感 note 和超限 JSON。单项上限 80 KiB；成功 envelope 为 `{ok:true,data}`，错误为 `{ok:false,error:{code}}`。响应 private/no-store。

## Companion Group API / Atomicity

| 路径                         | 方法               | 行为                       |
| ---------------------------- | ------------------ | -------------------------- |
| `/api/companion-groups`      | GET / POST         | 当前用户群组列表 / 创建    |
| `/api/companion-groups/{id}` | GET / PUT / DELETE | 读取 / 替换完整快照 / 删除 |

`name + includesOwner + ordered memberIds` 构成群组输入。RPC 在一个事务内验证 owner/members、执行 revision CAS、替换全部 membership 并返回同一已提交快照。拒绝重复、其他用户及超限成员；空组有效。

Companion 删除通过既有 FK 清除 membership，并在同一事务提高受影响群组 revision；不遗留 dangling membership。Group 删除只删除群组及 membership，保留 Companion masters。

真实并发测试验证完整快照只存在一个赢家；临时 SQL 故障注入证明 create/update 的中途 membership 失败都完全回滚。

## Auth / RLS

身份仅来自经 `getUser` 验证的 Supabase Auth。支持 Cookie/Bearer；无效 Bearer 不回退到有效 Cookie。Cookie mutation 验证同源 Origin；普通请求不使用 service-role。读取同时限定 owner，mutation 由 RPC 的 `auth.uid()` 限定 owner；固定 search_path，保留 invoker RLS，仅 authenticated 可执行 RPC。

真实 User A/User B 均完成自身 CRUD，跨用户读取/更新/删除使用 404，不泄露资源存在性；外部成员不能写入群组。Anon API 返回 401，直接数据库/RPC 路径亦被拒绝。Auth 用户删除只级联自身数据。

## CAS / Conflict Handling

revision 进入实际 DB mutation predicate。相同 revision 并发写入恰好一条成功，另一条 409；stale update/delete 均零写入。群组 metadata、revision、成员顺序不会部分提交。按 owner 的事务锁同时保护 API 数量上限和跨 aggregate mutation。

稳定错误包括 `STALE_COMPANION_REVISION`、`STALE_COMPANION_GROUP_REVISION`、`COMPANION_GROUP_MEMBER_INVALID`、`COMPANION_LIMIT_REACHED`、`COMPANION_GROUP_LIMIT_REACHED`；其他错误按 400/401/403/404/413/500/503 脱敏输出。

UI 遇到冲突保留本地 draft，禁用继续保存，不自动重试或覆盖；用户点击“放弃本地修改并重新读取”后获取服务器版本，再重新编辑确认。

## Personal Center Wiring

既有 `/personal-center/companions` 从 authenticated API 获取服务器数据，mock/localStorage 不再充当持久化真源。保存仅由明确用户动作触发，并使用服务器返回值；刷新和第二个登录上下文保持一致。

保留现有页面布局、编辑器、dirty guard 和导航保护；补入 loading/error/retry、pending 防重入、群组删除和 44px 成员排序按钮。本人是 virtual projection，不创建 Companion row，不实现 Profile API。`diningNote`、群组场景等自由文本明确标记为本次草稿，不发送持久化；privateNote 和 blob avatar 不入库。

## Local Supabase Acceptance

- Docker 恢复后执行正式 Local Supabase start、baseline reset、implementation reset 和重复 reset，migration 全部通过。
- TASK-047 真实套件 **22/22**（21 场景加父测试）；`real-acceptance.json` 为 `complete:true`。
- 覆盖真实 Auth/API、两用户 RLS、Anon、严格输入、CSRF、80 KiB、Companion/Group CAS race、原子回滚、数量边界并发、级联删除及跨上下文一致性。
- 真实回归：Companion DB **147/147**，Preference DB **505/505**，Profile DB **25/25**，Preference API/浏览器 **17/17**。
- 测试 Auth 用户及临时 SQL 故障 fixture 已清理。正常 API 请求不使用 fixture 管理权限。
- DB types 重复生成 SHA-256：`c2d8acafa6d920d3d8b34d1dfc6ba472b933e937b8f56f085d24bb557ea7c652`。

## Browser Acceptance

五种视口均完成真实登录后的 Companion load/create/edit/reload/delete、Group create/update/reorder/delete 和 includesOwner 保存：1920×1080、1440×900、1280×720、390×844、320×740。

两类 stale draft 保留及显式 reload recovery、dirty guard、loading、网络失败/retry、guest redirect 均通过。每个视口六次预期 mutation，无额外自动写入；横向 overflow 为 0。`/`、`/start`、`/planner`、`/personal-center` 共 20 项 geometry 与未修改基线一致。

应用 page error **0**、应用 console error **0**、unexpected mutation **0**。原始资源日志另有已有 favicon 404、两次故意触发的 409 和一次故意中断请求，已单列保存，不宣称原始 console 完全无错误。

保存 13 张基线/结果截图的路径与 SHA-256；已目视检查桌面/手机概览、群组排序和冲突状态。[QA 目录](../qa/TASK-047/README.md) 内保留可审查 JSON 和复现命令；PNG 在本机 `.artifacts/task047/`。

## Quality Gates

| 检查                             | 基线                                   | 实现结果                                               |
| -------------------------------- | -------------------------------------- | ------------------------------------------------------ |
| npm ci                           | PASS，395 packages / 0 vulnerabilities | 同一 lockfile，未改依赖                                |
| lint                             | FAIL，7 errors / 0 warnings            | FAIL，同样 7 errors / 0 warnings；本次文件 ESLint PASS |
| typecheck / build                | 初始旧生成类型失败；隔离后 PASS        | PASS / PASS                                            |
| 全仓测试                         | 1532/1532                              | **1573/1573**                                          |
| Companion schema                 | 163/163                                | 全仓包含并通过                                         |
| Personal Center                  | 39/39                                  | 39/39                                                  |
| TASK-047 单元/契约               | 不适用                                 | 41/41                                                  |
| 受影响回归                       | 不适用                                 | 117/117                                                |
| TASK-047 真实 Auth/DB/API/浏览器 | 不适用                                 | 22/22                                                  |
| Local reset / types              | PASS                                   | PASS，重复生成一致                                     |
| deploy:validate:local            | —                                      | PASS                                                   |
| format:check:deploy              | —                                      | PASS                                                   |
| deploy:build:local               | —                                      | PASS                                                   |
| deploy:verify-artifact           | —                                      | PASS，1783 files，0 failures                           |
| git diff origin/develop --check  | —                                      | PASS                                                   |

Standalone artifact 对应 `443bad8da0b6a3460838385993d444b16865c0d9`；仅本地构建与审计，未部署生产。[gate-summary.json](../qa/TASK-047/gate-summary.json) 给出测试计数、日志路径与 checksum。

## Changed Files

- Domain/API resource/adapter/client：`src/features/companions/domain/companion-v1.ts`、`src/features/companions/persistence/{companion-resource,companion-adapter,companion-client}.ts`。
- UI：`companion-center.tsx`、`companion-center.module.css`、`companion-view-model.ts`、`components/companion-card.tsx`。
- HTTP routes：`src/app/api/companions/route.ts`、`src/app/api/companions/[id]/route.ts`、`src/app/api/companion-groups/route.ts`、`src/app/api/companion-groups/[id]/route.ts`。
- Server：`src/server/companions/{http,mapper,repository}.ts`、`src/server/private-http.ts`、`src/server/preferences/http.ts`。
- DB：`supabase/migrations/20260912090000_add_companion_transaction_api.sql`、`src/types/database.generated.ts`。
- Tests：`tests/task-047-companion-api.{test,runtime}.mjs`、`tests/task-045-preference-api.test.mjs`、`tests/wbs-5-6-companions.test.mjs`、`tests/wbs-9-12-personal-center-qa.test.mjs`。
- QA/scripts：`tools/qa/task-047-browser-baseline.mjs`、`tools/qa/task-047-preview.mjs`、`package.json` 两项 Task test scripts、`docs/qa/TASK-047/*`。
- 管理文档：四份权威规格文档、此 Result、Master WBS 5.17 行。

## Exceptions / Existing Baseline Failures

1. **lint 仍 FAIL**：7 项均位于 `.cache/qa/task024-worktree/.cache/qa/`，规则为 `@typescript-eslint/no-require-imports`，文件分别为 `close-task024.cjs`、`implement-static-mvp.cjs`、`link-task024-pr.cjs`、`record-task025-asset-gate.cjs`、`record-visual-acceptance.cjs`、`start-static-mvp.cjs`、`write-task024-tracking.cjs`。前后完全一致，未修改这些无关文件。
2. **旧 Next 生成类型**：初始 `.next/dev/types/validator.ts` 引用已不存在的 `src/app/page.js`、`src/app/planner/page.js`、`src/app/start/page.js`。将 `.next/dev` 移至本地证据备份后，同一未修改源码通过 typecheck/build。
3. **Docker IPC 启动故障已恢复**：保留并重建仅含 stale IPC socket 的 run/secrets-engine 目录；未 factory reset，未删除 Docker 容器、镜像或数据库数据。正式 Local db reset 是验收环境初始化。
4. **数量常量基础缺口**：规格所称三个 Domain 上限常量实际不存在。本次在唯一 Domain 中新增 100 名非本人 Companion / 20 个 Group / 每组 20 名非本人 member，并在 SQL 保持一致和测试 parity。这是本次采用的可审查 API 限制，不声称为已有值或已获用户确认。
5. **空组语义**：按更高优先级 5.17 设计及实际 5.12 表约束保留有效空组，删除最后成员不会额外删除群组。
6. **浏览器资源错误**：已有 favicon 404 与主动注入的 409/断网分别记录；应用错误和意外 mutation 均为零。
7. **规格排版**：三份带入文档的 Markdown 行末双空格改为等价反斜线换行，以通过 whitespace gate，未改规格内容。

## Draft PR

[Draft PR #325](https://github.com/kanzakimy0/TravelAssist/pull/325) 已创建，目标 `develop`，正文使用 `Relates to #324`。Issue #324 已更新 Result 与 PR 链接并保持 Open；PR 保持 Draft，等待人工验收。

## Manual Acceptance Steps

1. 执行 `npm run db:start`、`npm run build`，再执行 `node --conditions=react-server --import ./tests/register-planner-ts.mjs tools/qa/task-047-preview.mjs`。
2. 打开 `http://127.0.0.1:3000/personal-center/companions`，通过 Local Auth 注册/登录；确认邮件入口为 `http://127.0.0.1:54324`。
3. 新建非本人同行人、编辑姓名/出生日期/需求并保存，硬刷新检查；删除后刷新确认不恢复。本人不产生 DB row。
4. 创建群组，调整成员顺序、勾选/取消本人并保存，刷新确认一致；删除群组确认同行人仍在。
5. 同账户在两个浏览器上下文先加载同一 revision；一处保存，另一处保存应提示冲突并保留草稿。确认不会自动重试；显式重新读取后重新编辑保存。
6. 修改未保存内容再导航，确认 dirty guard；检查临时用餐备注/群组场景明确为草稿，不会跨刷新保存。
7. 用第二个账户验证看不到第一个账户数据；退出后进入页面应要求登录。检查桌面及 390/320 窄屏排序按钮和编辑器。

## Stop Confirmation

实现、真实验收、Result 提交、WBS 待审查、Issue 更新且 Open、Draft PR 创建均已完成，停在用户验收点。**不合并、不关闭 Issue #324、不把 5.17 标记为已完成、不启动后续 Task。** 未实现 5.13、5.15、5.18、5.19、Planner/Engine mapping、AI、Booking 或 sharing；未修改 A-owned Planner/Trip/Engine contract。未执行任何被禁止的 Git 命令。
