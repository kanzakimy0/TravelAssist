# TASK-052-B QA

执行基线：`cb97e96bdb27e7b8e1e6eef742fa95837dcc3477`。真实 Local Supabase、Auth、Storage、PostgreSQL、Next production server 和 Microsoft Edge；没有跳过 Local/browser 验收。

## 结果

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

- 删除 A 后 Auth 和 8 张业务表全部清零；B 的 Auth 和完整业务行逐字段保持一致。
- A/B 各有 Profile/settings/contact/Preference、2 Companion、1 group/2 members、Draft/Saved/History 各 1。
- 保留 A 的真实旧 Cookie/Bearer 后，56 次私有 GET/mutation 请求均为 401；refresh/getUser/sign-in 拒绝。Auth session 正确返回 unauthenticated。
- 另一个临时 Bearer target 与 B Cookie 同时出现时，仅删除 Bearer 已验证的当前用户。
- 真实 A-owned Storage object 使删除返回 409，账户及对象不变；B-owned object 不阻止 A 删除，也不会被删除。测试工具仅清理明确命名的合成对象和空测试 bucket，产品代码没有 Storage 删除链。
- 浏览器确认词/checkbox/cancel/export unavailable、错误重试状态、防双击、pending controls、204 后离开私有页、reload guard、B 独立上下文均通过。成功操作仅发出 1 次 DELETE。
- 新增 console/page errors = 0；既有 favicon.ico 404 = 1，沿用 TASK-047 明确记录的历史资源问题。负向用例预期的 HTTP 401/403/503 单列为正常拒绝，不作为脚本异常。
- 浏览器和 server fetch 的外部请求 = 0；server preload 只允许 loopback，并在尝试外部请求时计数/拒绝。没有调用 Booking/Agoda/Klook/航空/铁路/酒店或支付 API。
- 生产浏览器 import graph 没有 Account Admin / DB / private Auth 代码。实际 Local Secret Key 仅保留在进程内存，扫描输出及待提交文件未发现实际值。
- 所有测试完成后 Auth、业务表和 Storage fixture residue 为 0。

## 证据

- [local-acceptance.json](local-acceptance.json)：15 个验收分组（Node 共 16 tests）、A/B 数量、Storage、防双击、56 次旧凭据拒绝和外部请求计数。
- [schema-baseline.json](schema-baseline.json)：执行时真实 pg_catalog / information_schema 表与 FK 审计；包含 7 条业务表到 Auth 的 cascade、2 条 group membership cascade。
- [baseline-comparison.json](baseline-comparison.json)：2387 baseline vs 2439 candidate；原有 7 项 cache lint 错误输出完全一致；受保护路径无变化。
- [quality-gates.json](quality-gates.json)：全量、focused、Local 与 DB 回归数量和本地 gate 结果。
- [artifact-and-cleanup.json](artifact-and-cleanup.json)：生产输出/standalone 实际 Secret 扫描、client implementation 扫描及回归后全部表清零。

证据只含合成别名、数量、表/约束名、公开提交号和布尔结果。不保存 UUID、email、phone、password、Cookie、JWT 或 Secret Key。原始 CLI/SDK 输出不发布。

## 复现

先通过仓库 Local-only wrappers 执行 `npm run db:start`、`npm run db:status`、`npm run db:reset`，且确保这是允许重置的本地测试库。

执行 `npm ci`、`npm run build`、`npm run test:account-deletion`、`npm run test:account-deletion:local`。浏览器验收使用 `CODEX_PLAYWRIGHT_PATH` 指向可用 Playwright module，安装 Microsoft Edge；其余 Local prerequisites 与 TASK-047/049/050 相同。测试拒绝 remote Docker/Supabase，要求 Auth/Storage 初始为空。Local Secret 通过已验证的本地 CLI 获取并只注入 task-owned server 进程，不写 env 文件。

依次运行 quality-gates.json 中既有 API/DB suites，以及 `node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"`。部署 gate 为 `lint`、`typecheck`、`build`、`format:check:deploy`、`deploy:validate:local`、`deploy:build:local`、`deploy:verify-artifact`、`git diff --check`。

没有 migration/type 变化，因此按 Task 不运行 db:types。最终 PR exact head 的 CI run 链接保存在 PR 的审查账本及完整交付 Result；新增 commit 后必须重新获得 PASS。
