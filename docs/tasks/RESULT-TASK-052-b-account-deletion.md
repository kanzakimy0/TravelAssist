# TASK-052-B Result

## 状态与基线

实现、真实 Local Supabase/Auth/Storage/浏览器验收和本地 Quality Gates 已完成。WBS 5.21 待审查，等待用户验收；不标记已完成、不自动合并、不启动后续 Task。

- Issue：[#342](https://github.com/kanzakimy0/TravelAssist/issues/342)，保持 Open。
- 执行基线：`cb97e96bdb27e7b8e1e6eef742fa95837dcc3477`；发布前再次 fetch 确认 origin/develop 未变化。
- 实现分支：`codex/b-account-wbs-5-21-account-deletion`，直接从执行时最新 origin/develop 创建，没有从 Spec branch 开发。
- 已完整读取 Launcher、正式 Task、Architecture、Start record 与最新 Master WBS。
- 实现提交：`IMPLEMENTATION_COMMIT`。
- Draft PR：PR_PENDING，base = develop，使用 `Relates to #342`。
- 最终 exact head / GitHub Quality Gate：以 PR 描述中的最终审查账本和交付消息为准；该账本不产生额外 Git commit，避免用旧 head 的 CI 冒充新 head。

## Exact changed files

- `.env.example`
- `docs/architecture/account-deletion-v1.md`
- `docs/project/WBS-5.21-account-deletion-start.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/qa/TASK-052/README.md`
- `docs/qa/TASK-052/artifact-and-cleanup.json`
- `docs/qa/TASK-052/baseline-comparison.json`
- `docs/qa/TASK-052/local-acceptance.json`
- `docs/qa/TASK-052/quality-gates.json`
- `docs/qa/TASK-052/schema-baseline.json`
- `docs/tasks/CODEX-TASK-052-b-account-deletion.md`
- `docs/tasks/RESULT-TASK-052-b-account-deletion.md`
- `docs/tasks/TASK-052-b-account-deletion.md`
- `package.json`
- `src/app/api/account/route.ts`
- `src/features/account-deletion/client.ts`
- `src/features/account-deletion/contract.ts`
- `src/features/account-deletion/finish.ts`
- `src/features/profile/account-subpage.tsx`
- `src/server/account-deletion/admin.ts`
- `src/server/account-deletion/http.ts`
- `src/server/account-deletion/storage.ts`
- `tests/task-052-account-deletion-fixtures.mjs`
- `tests/task-052-account-deletion.runtime.mjs`
- `tests/task-052-account-deletion.test.mjs`
- `tests/task-052-local-helpers.mjs`
- `tests/task-052-network-guard.mjs`

## API 与安全边界

`DELETE /api/account`，唯一成功结果为 `204 No Content`，请求严格为：

```json
{
  "schemaVersion": "1.0",
  "confirmation": "DELETE_ACCOUNT",
  "externalBookingsAcknowledged": true
}
```

- missing/unknown/错误类型或确认值、userId/ownerUserId/target 等注入与任何 query 均拒绝；stream body 上限 4096 bytes。
- 首先调用现有 verifiedPrivateRequest / Auth Core 的 live getUser；唯一 Owner 是 verified current Auth UUID。
- Cookie DELETE 保留 Origin 防护；显式 malformed/invalid Bearer 不 fallback Cookie；Bearer 和其他用户 Cookie 共存时遵守 Bearer 的已验证身份。
- 仅 server-only 窄函数 deleteVerifiedAuthUser 可以读取运行时 SUPABASE_SECRET_KEY，并只调用 auth.admin.deleteUser(verifiedOwner, false)。不导出 Admin client，不建立通用用户管理 API。
- 缺失、格式无效或上游失败均 fail closed / sanitized 503。执行密钥不授权 caller、不用于普通 CRUD，也不进入 browser bundle/HTML/响应/日志/证据。
- 所有响应保留 private/no-store/Vary Authorization,Cookie 和现有 Auth finish / Set-Cookie 处理。
- 错误契约：AUTH_REQUIRED 401、FORBIDDEN 403、INVALID_REQUEST 400、PAYLOAD_TOO_LARGE 413、AUTH_UNAVAILABLE 503、ACCOUNT_DELETION_UNAVAILABLE 503、ACCOUNT_DELETION_BLOCKED 409。

## 真实数据库级联与隔离

真实 pg_catalog 确认 8 张当前业务表；7 条直接 Auth FK 和 2 条 membership parent FK 均为 ON DELETE CASCADE。未发现遗漏的 user-owned 业务表。产品删除只有 Auth hard-delete，没有逐表删除链；History 的普通不可修改约束没有阻止账户级联删除。

A/B 都通过已接受 API 填充 Profile/settings/contact/Preference、2 Companion、1 group/2 members，以及 Draft/Saved/History 各 1。

| Table                   | A before | A after | B after（完整行不变） |
| ----------------------- | -------- | ------- | --------------------- |
| auth_users              | 1        | 0       | 1                     |
| profiles                | 1        | 0       | 1                     |
| profile_settings        | 1        | 0       | 1                     |
| emergency_contacts      | 1        | 0       | 1                     |
| travel_preferences      | 1        | 0       | 1                     |
| companions              | 2        | 0       | 2                     |
| companion_groups        | 1        | 0       | 1                     |
| companion_group_members | 2        | 0       | 2                     |
| trip_library_records    | 3        | 0       | 3                     |

B 的完整 Auth 与业务行在内存中逐字段比较一致，证据只保存数量与一致性布尔值。额外 Bearer target 被正确删除，B Cookie 对应的用户保留。所有回归结束后 Auth、8 张业务表、Storage objects/buckets 的合成数据残留均为 0。

## Storage 与外部服务

执行时 Storage objects = 0、buckets = 0；当前 avatarPath 仅为引用，产品没有已接受的 binary upload/Storage ownership 功能。Storage catalog 不提供可依赖的 Auth FK cascade，因此新增只读当前 owner existence gate，同时检查对象和 bucket 的 owner_id / legacy owner；存在内容则 sanitized 409，不返回对象名称、不 broad delete。

真实 A-owned object 阻止删除并保留账户/对象；清理这个明确的测试对象后，A 成功删除，B-owned object 完整保留。仅测试工具清理自己的已知对象与空 fixture bucket，产品没有对象删除逻辑。

服务器 fetch 审计 3 个配置阶段共 170 个本地请求、0 个外部请求；浏览器外部请求为 0。Booking/Agoda/Klook/航空/铁路/酒店/支付调用均为 0。

## 删除后的 Session 验收

删除前保留 A 的真实 Cookie、Bearer 和 refresh token，仅放内存。删除后，Profile、Emergency Contact、Preference/reset、Companion/groups、Trip Library/save/history/copy，以及 account mutation 的 56 次旧 Cookie/Bearer 请求全部返回 401。Auth session 返回 unauthenticated；旧 refresh/getUser/sign-in 均拒绝。B 的 API 及独立浏览器上下文保持可用。

## 浏览器与现有 UI

复用 /personal-center/account/privacy/delete 和现有样式，保留 checkbox、精确输入“删除账户”、外部订单不会取消、取消导航。移除虚构旅行/订单数量、mock provider counts 与虚假数据导出成功行为；导出显示 unavailable。

- 两项确认缺一不可；带空格的确认词不通过。
- idle/deleting/failed 状态明确；ref 防重入，成功流程即使同事件循环双击也只发送 1 次真实 DELETE。
- pending 禁用输入、checkbox、删除与取消；错误只显示白名单文案。
- 成功后 best-effort SDK local signOut，最长等待 1 秒后离开私有页；清理失败也不阻止导航。
- signed-out guard、503 安全错误且数据不变、204 成功离开、reload 不恢复账户、B 独立上下文均通过。
- 本次新增 console/page errors = 0；另记录已有 /favicon.ico 404 = 1（原 TASK-047 已记录的同一历史资源问题）。负向请求预期 HTTP 拒绝与脚本异常区分记录。

## 测试与 Quality Gates

| Suite                       | PASS      |
| --------------------------- | --------- |
| full repository             | 2439/2439 |
| TASK-052 pure               | 52/52     |
| TASK-052 Local/browser      | 16/16     |
| TASK-050 Profile pure       | 104/104   |
| TASK-045 Preference pure    | 37/37     |
| TASK-047 Companion pure     | 41/41     |
| TASK-049 Trip Library pure  | 76/76     |
| TASK-050 Profile Local      | 25/25     |
| TASK-045 Preference Local   | 17/17     |
| TASK-047 Companion Local    | 22/22     |
| TASK-049 Trip Library Local | 35/35     |
| Preference DB               | 505/505   |
| Companion DB                | 147/147   |
| Trip persistence DB         | 29/29     |
| TASK-016 Schema/RLS/FK      | 25/25     |

全部测试 fail/skip/cancel 均为 0。全仓 baseline 2387/2387，candidate 2439/2439。

- npm ci、typecheck、build、format:check:deploy、deploy:validate:local、deploy:build:local、deploy:verify-artifact、git diff --check：PASS。
- Local db:start、db:status、db:reset：真实 PASS。
- lint：本地原有 cache 目录 7 项错误，baseline/candidate 输出逐字节一致；所有本次变更代码单独 ESLint 为 0 error。GitHub 干净 checkout 的 lint 由最终 exact-head Quality Gate 另行确认。
- migration/generated types 无变化，因此按 Task 不运行 db:types；没有手改类型。
- 生产输出与 standalone 扫描 4635 个文件（其中 70 个 client JS/map/HTML），实际 Secret 命中 0、Account Admin client implementation 命中 0；发布 artifact verifier 为 1871 个文件，failures = []。
- esbuild browser import graph 无本 Task server-only / DB / private Auth 实现；最终 GitHub run 必须对应最终 PR head，不能复用 earlier head。

## WBS 与范围

Master WBS 仅改两行，其他内容保持执行基线：

- 5.19 → 已完成（#333 / TASK-049-B；用户验收，PR #334 已合并）。只是机械同步，没有重新实现/合并 5.19。
- 5.21 → 待审查（#342 / TASK-052-B；Draft PR PR_NUMBER）。

Issue #342 保持 Open，PR 保持 Draft/Open，目标 develop；不 auto-merge。Auth Core/private-http、既有 Profile/Preference/Companion/Trip API、RLS/CAS、schema/migration/generated types、Planner/Start/Engine/POI/Trip boundaries 均未改；未启动 5.13、8.6、9.5、9.6 或其他后续 Task。

完整机器证据与复现说明见 [TASK-052 QA](../qa/TASK-052/README.md)。仅保存合成别名、数量、表/约束名与布尔值，没有 PII 删除账本、凭据或账户 UUID。
