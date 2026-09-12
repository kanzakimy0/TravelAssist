# TASK-050-B Result

## Status

**待审查。** 实现、真实 Local Supabase/Auth/RLS 验收与全部质量门已完成；Draft PR #337 等待用户验收。

- Owner：B / Personal Center。
- Issue：[#336](https://github.com/kanzakimy0/TravelAssist/issues/336)，保持 Open。
- 执行基线 / 最新 develop：`1af8d7feac7fa2d254ca85a00061bf6d6b0e7940`。
- 实现分支：`codex/b-account-wbs-5-15-profile-account-api`，从执行时最新 origin/develop 创建，没有从 Spec branch 开发。
- Dependency Gate：8.2 / TASK-016-B、8.3 / TASK-018-B 均已完成并合入；依赖通过。
- 实现提交：`11f82ea7fa636cb64a9394f82bcf3d9931d9750a`；最终代码提交（含尾随换行边界修正）：`96038570c6c9557855f4461c45550c493ebaa48f`。
- Draft PR：[#337](https://github.com/kanzakimy0/TravelAssist/pull/337)，目标 develop，使用 `Relates to #336`。

## API 与契约

| Method | Route                          | 成功结果                                                        |
| ------ | ------------------------------ | --------------------------------------------------------------- |
| GET    | `/api/profile`                 | 200：完整 Profile/settings/Auth contact/emergency contacts 聚合 |
| PATCH  | `/api/profile`                 | 200：原子保存并返回刷新聚合                                     |
| GET    | `/api/emergency-contacts`      | 200：当前用户联系人数组                                         |
| POST   | `/api/emergency-contacts`      | 201：创建的联系人                                               |
| PATCH  | `/api/emergency-contacts/[id]` | 200：更新后的联系人                                             |
| DELETE | `/api/emergency-contacts/[id]` | 204：删除成功                                                   |

- 复用 `public.profiles`、`public.profile_settings`、`public.emergency_contacts`；唯一 v1 契约位于 `src/features/profile/domain/profile-account-v1.ts`。
- missing = unchanged，null 清除允许为空字段；空 PATCH、未知字段、owner/id/timestamp/Auth 字段拒绝。GET 缺行返回全 null 投影，不建行。
- 日期真实有效且不晚于执行时 UTC 日期；文本长度、E.164、邮箱、地区、语言、时区、货币和单位严格校验。
- genderCode 保持既有开放文本语义；Locale/timezone/currency 复用运行时 Intl 支持，无新词表。Avatar 仅相对引用，无 binary upload。
- Profile/settings 在既有 Drizzle 事务中原子 upsert，审计字段归数据库；未增加 revision/CAS。联系人按 created_at、id 排序。
- 错误仅暴露确定性 code，不泄漏底层错误；private/no-store、Vary Authorization/Cookie、80 KiB JSON 上限复用现有私有 HTTP 边界。

## Auth / Owner / RLS

- 复用 Authentication Core 和 `src/server/private-http.ts`，没有第二套 Auth/Session。
- Owner 仅来自验证后的当前 Auth user；所有查询包含 owner 条件。事务内 SET LOCAL ROLE authenticated 与 transaction-local verified subject 保持原 RLS 生效。
- Auth email/phone/verification 只从已验证 request client 的 `auth.getUser()` 读取，metadata 和 PATCH 不可覆盖，也不写入产品表。
- 真实 A/B/anon 验证跨用户读写拒绝、owner spoof 拒绝、Cookie Origin 保护、显式 Bearer 不回退 Cookie。
- SQL 故障注入证明双表回滚；实际 SQL 触发器验证 authenticated 角色与 auth.uid。所有临时夹具清理完成。
- 删除联系人不会影响实际填充的 Profile/Preference/Companion/Trip 或 Auth。账户删除只用于 Local 测试清理，不是产品能力。

## Tests / Quality Gates

| 检查                                       | 结果                                                          |
| ------------------------------------------ | ------------------------------------------------------------- |
| npm ci                                     | PASS                                                          |
| npm run test:profile-api                   | 104/104 PASS                                                  |
| 真实 Profile API / Local Auth / RLS / Edge | 25/25 PASS                                                    |
| TASK-016 Schema / RLS / FK 回归            | 25/25 PASS                                                    |
| 全仓测试                                   | 1,847/1,847 PASS（基线 1,743/1,743）                          |
| 修改代码/测试 ESLint                       | PASS，0 errors / 0 warnings                                   |
| npm run lint                               | 7 项原有历史缓存错误，before/after 输出逐字节一致，新增问题 0 |
| typecheck / build                          | PASS                                                          |
| format:check:deploy                        | PASS                                                          |
| deploy:validate:local / deploy:build:local | PASS                                                          |
| deploy:verify-artifact                     | PASS，1,860 文件                                              |
| 生产浏览器包检查                           | PASS，34 chunks；server-only/纯契约边界通过                   |
| git diff --check                           | PASS                                                          |
| GitHub Quality Gate                        | PASS，最终代码 head `9603857`，run #34680751816               |

GitHub 干净环境 [Quality Gate](https://github.com/kanzakimy0/TravelAssist/actions/runs/34680751816) 已在最终代码提交通过，包含全仓 tests、lint、typecheck、format、standalone artifact 与 whitespace。最后文档同步提交的检查可在 [PR #337](https://github.com/kanzakimy0/TravelAssist/pull/337) 的最新 head 检查列表确认。

本地 lint 的既有错误位于 `.cache/qa/task024-worktree/.cache/qa/*.cjs`，未删除历史工作区或放宽规则。具体 before/after SHA-256 与验收场景见 [QA README](../qa/TASK-050/README.md)、[quality-gates.json](../qa/TASK-050/quality-gates.json)、[runtime-summary.json](../qa/TASK-050/runtime-summary.json)。

## Local DB / Migration

- `npm run db:start`、`npm run db:status`、`npm run db:reset`：真实 Local Supabase 全部通过。
- 未新增/修改 migration、RPC、DB Schema、generated types。
- 既有 Drizzle transaction 已满足一致性，不需要数据库结构变更；按 Task 不执行无必要的 db:types。
- Generated types SHA-256：`c8914dc706c1ceb9383a56abb8a27a6fcc81e17010482355febf96fa473fac91`，与基线一致。
- 未访问远端数据库；合成 Auth 用户剩余 0；临时 SQL 夹具已删除。

## Changed Files

- `src/features/profile/domain/profile-account-v1.ts`
- `src/server/profile/http.ts`
- `src/server/profile/repository.ts`
- `src/app/api/profile/route.ts`
- `src/app/api/emergency-contacts/route.ts`
- `src/app/api/emergency-contacts/[id]/route.ts`
- `tests/task-050-profile-api.test.mjs`
- `tests/task-050-profile-api.runtime.mjs`
- `tests/task-050-profile-fixtures.mjs`
- `package.json`：仅增加两个专项测试脚本。
- `docs/tasks/CODEX-TASK-050-b-profile-account-api.md`
- `docs/tasks/TASK-050-b-profile-account-api.md`
- `docs/project/WBS-5.15-profile-account-api-start.md`
- `docs/tasks/RESULT-TASK-050-b-profile-account-api.md`
- `docs/qa/TASK-050/README.md`
- `docs/qa/TASK-050/runtime-summary.json`
- `docs/qa/TASK-050/quality-gates.json`
- `docs/project/WBS-TravelAssist.md`：只修改 5.15 状态。

## Limitations / WBS

- API 已实现；既有 Profile UI 保持原样，未声称 UI 持久化接线完成。
- 数据库连接使用现有 server-only DATABASE_URL，需具有切换 authenticated 角色的权限；配置缺失/错误安全返回 503。
- 未修改 Preference、Companion、Trip API、Planner、Engine、Auth Core 或 DB 契约。
- 未实现凭证修改、OAuth 连接、Session/设备、安全活动、导出、Booking/Partner Sync 或 Avatar 上传。
- WBS 5.15：`待审查（#336 / TASK-050-B；Draft PR #337）`。已完整读取最新 Master 并逐行核对，其余 A/B 行和历史记录完全保留。
- Issue #336 保持 Open；不自动合并、不标记已完成。
- **未启动 WBS 5.21，也未启动后续 Task。**
