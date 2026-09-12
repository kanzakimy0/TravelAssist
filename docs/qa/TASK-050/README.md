# TASK-050-B QA — Profile / Account API

执行基线：`1af8d7feac7fa2d254ca85a00061bf6d6b0e7940`。仅 Local Supabase（travelassist / loopback 54321、54322）及本机 production Next.js；未访问远端数据库。

## 可复验命令

```text
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run build
npm run test:profile-api
npm run test:profile-api:local
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs
node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
git diff --check
```

真实验收脚本拒绝非 Local 项目、非 loopback 数据库和已有 Auth 用户的环境；运行前请关闭占用 3000 端口的预览。Edge 浏览器通过 Playwright 执行；如项目中没有 Playwright，可用 `CODEX_PLAYWRIGHT_PATH` 指向本机已安装的 Playwright 包。测试不会跳过必需用例。

`db:reset` 仅针对已确认且没有用户数据的本地测试库。无 migration/RPC/types 变更，按 Task 不执行无必要的 `db:types`。现有 generated types SHA-256：`c8914dc706c1ceb9383a56abb8a27a6fcc81e17010482355febf96fa473fac91`。

## 结果与证据

- [runtime-summary.json](runtime-summary.json)：24 个真实验收场景，含父测试共 25/25 PASS；68 个非法 Profile/settings payload、25 个非法 Contact payload；真实 Edge Cookie/native fetch；34 个生产浏览器 JS chunks。
- [quality-gates.json](quality-gates.json)：基线/候选测试、原样文件范围、生成类型及 lint before/after SHA-256。
- 专项纯测试 100/100；全仓由 1,743/1,743 增至 1,843/1,843；TASK-016 真实 Schema/Drizzle/RLS/FK 25/25。
- 本地全仓 lint 的 7 个 `no-require-imports` 错误全部来自忽略的历史 `.cache/qa/task024-worktree/.cache/qa/*.cjs`，运行前后输出逐字节相同。新增/修改源代码和测试 lint 为 0 errors / 0 warnings。未清理历史工作区、未放宽 ESLint。
- typecheck、build、部署格式、local 环境校验、standalone 构建与 1,860 文件制品检查、diff whitespace 均通过。

真实脚本只将场景名称与计数写入证据，不记录用户邮箱、UUID、密码、Cookie、JWT、数据库连接串或服务密钥。Local admin 仅用于合成用户夹具及清理；正常 API 使用既有验证边界，并通过 authenticated 数据库角色执行查询。

## 安全与事务验证方法

1. 建立真实 A/B 用户，使用真实 Auth 签发 Bearer 和实际登录路由生成 Cookie。匿名六路由拒绝；显式 Bearer 不回退 Cookie；Cookie 变更逐路由检查 Origin。
2. 首次 GET 验证三张表仍为零行，且仅从已验证 `auth.getUser()` 投影联系方式。伪造 metadata 不能替换 Auth 真值；真实未验证状态不会变成已验证。
3. 通过用户态 Supabase client 验证 owner-only RLS；跨用户读、改、删、插入及 owner spoof 不能越权。联系人 UUID 非法请求在数据库配置故意失效时仍返回 400，合法 UUID 才进入数据库并返回安全 503。
4. Local 临时触发器验证实际写入时 `current_user = authenticated`、`auth.uid()` 与行 Owner 相同；第二张表故意报错，证明第一张表和审计时间整体回滚。触发器/函数只作为故障夹具，在 finally 中删除，不进入 migration 或产品运行时。
5. 并发 PATCH 不同字段、交替 A/B 请求验证 sparse 更新与身份隔离；没有 revision/CAS 新契约。GET 使用 repeatable-read/read-only 事务；写入使用同一事务并只设置出现的字段。
6. 删除联系人前真实填充 Profile、Preference、Companion 和 Trip，之后逐项比较保持不变。Auth 用户删除只发生在 Local 夹具清理中，并验证已有 FK cascade，未公开账户删除能力。
7. 真实 Edge Cookie 保存/读取与匿名浏览器拒绝；pure contract 的 browser bundle 无 DB/Auth 依赖，server-only 导入保护和生产 chunk 泄漏扫描通过。

## 契约补充说明

- 唯一契约：`src/features/profile/domain/profile-account-v1.ts`；v1 `schemaVersion: "1.0"`，不复制 UI ViewModel 或另建 Auth Schema。
- 文本 trim 后按 Unicode code point 限长；空文本与控制字符拒绝，nullable 字段用 null 清除。
- 出生日期按执行时 UTC 日期判断，纯 parser 显式传入日期以便确定性测试。
- genderCode 保持已接受的 1–64 字符开放语义，没有新 enum。
- Country/region 沿用 uppercase alpha-2 shape；develop 没有已接受的 assigned-country registry，因此不另造国家列表。
- Locale 使用 `Intl.getCanonicalLocales` 和 `Intl.DateTimeFormat.supportedLocalesOf`；timezone 使用 `Intl.DateTimeFormat` 的 IANA 支持；currency 使用 `Intl.supportedValuesOf("currency")`。不新增第二套语言/时区/货币清单。
- Avatar 是最多 1,024 字符的相对引用，拒绝 URL、绝对路径、反斜杠、dot segment、百分号编码、query/fragment、凭证样式；不实施上传或资源所有权签发。
- Emergency email 保留 local part 大小写，将 domain 小写；电话严格 canonical E.164，countryCode 为 alpha-2，不是电话区号。
- 200 读取/更新、201 创建、204 删除；400 INVALID_REQUEST、401 AUTH_REQUIRED、403 FORBIDDEN、404 EMERGENCY_CONTACT_NOT_FOUND、413 PAYLOAD_TOO_LARGE、503 AUTH_UNAVAILABLE/PROFILE_UNAVAILABLE。
- GET 不创建默认行；无数据时 null 由未来 Consumer 自行应用显示 fallback。现有 Profile UI 保持原状态，本 Task 不声称完成 UI 持久化接线。
