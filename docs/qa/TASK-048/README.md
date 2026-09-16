# TASK-048-B QA

本任务只实现 WBS 5.18 数据模型。Trip Library / Planner / Start / Personal Center
页面与 fixtures 没有修改；不新增 5.19 HTTP、RPC、autosave 或数据接线。

## 复现

使用仓库固定 Node/npm、Docker 和 **Local** Supabase。测试 helper 验证本机 endpoint、
`travelassist` Docker project 与空 Auth 数据库；不接收云端 URL，不静默跳过。

```bash
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run db:types
npm run test:trip-persistence
npm run test:trip-persistence:db
node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-016-user-profile.runtime.mjs
npm run test:preferences:db
npm run test:companions:db
npm run build
npm run test:preference-api:local
npm run test:companion-api:local
node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
node tests/task-016-client-bundle.mjs
git diff origin/develop --check
```

现有 API 浏览器回归使用 `CODEX_PLAYWRIGHT_PATH` 指向本机已安装 Playwright，
Companion 回归还需要其原有 `.artifacts/task047/baseline-browser/geometry.json`。
这些是原测试的既有前提，不修改测试来绕过。所有数据库测试顺序运行，临时 Auth 用户和
数据在 `finally` 清理。原始日志仅保留在忽略目录 `.artifacts/task048/`；提交的证据不含
连接串、JWT、Cookie、邮件或用户标识。

## 持久化边界

- TypeScript 直接委托 A 的三个 parser；数据库只对 Trip JSON 检查 object、version、
  size 和跨字段一致性，不复制 Trip/Day/Item 语义。已验证的 B Preference/Companion
  parser 与 SQL validator 直接复用。
- SQL 可以接受版本正确但语义不完整的 Trip envelope；这不是可公开写入的 API。
  authenticated 只有 owner SELECT，未来 5.19 的写入服务必须调用 canonical parser。
- `preference_override_patch` 的 SQL 检查 envelope、set 的已接受 Preference 值、unset
  array 与大小；完整 unset 键/冲突/有效偏好语义由当前 TypeScript parser 保证。
- source revision 0 必须对应空 Preference；捕获不会查询或更新长期根。
- 新记录允许从 draft 或 saved 开始；history 只能经 saved→history 进入。
- SQL INSERT 强制 revision=1；UPDATE 必须 old+1。revision 上限是 PostgreSQL integer
  的 2,147,483,647，耗尽后拒绝继续更新，不覆盖 A Trip/Plan revision。
- `created_at`/`updated_at` 由数据库维护；saved→history 使用该次写入唯一
  `clock_timestamp()` 同时设置 `frozen_at`/`updated_at`，忽略调用方冻结时间。
  旧 history 连 no-op UPDATE 也拒绝。无自动按旅行日期归档。
- 复制历史 helper 要求新 id、新 creationKey，返回新 draft，保留 canonical draft/progress
  和已最小化 party 上下文，清空 plan/canonical ID/freeze。新创建的 Preference source 必须
  显式提供，override 从空 patch 开始；保持原 owner，不修改原历史，不自行生成 A Trip ID。
- party 仅保存 includesOwner、参考日期、成员 UUID trace/name/age group/功能 profile。
  捕获优先使用 exact departure local date，否则要求显式 reference date；不保存 DOB
  或其他私人字段。没有 Companion FK，也不把 named member 数量当作 canonical participants。

## 技术大小限制

唯一 B 常量源为 `TRIP_PERSISTENCE_MAX_BYTES`，Preference 值复用
`PREFERENCE_MAX_BYTES`；SQL 原样镜像并有 parity tests。计量为 UTF-8
`jsonb::text`（含分隔符空格）；应用在委托 parser 前检查 JSON 描述符、字节、深度、
PostgreSQL 无法保存的 NUL/未配对 surrogate，拒绝 getter/toJSON/隐藏字段。

| Payload                   |      上限 |                            当前 fixture 大小（bytes） |
| ------------------------- | --------: | ----------------------------------------------------: |
| draft facts               |   262,144 |                               minimal 432；full 1,597 |
| wizard progress           |     4,096 |                                                   133 |
| plan snapshot             | 4,194,304 |                               minimal 247；full 1,616 |
| preference snapshot       |    65,536 |                                    使用现有 5.11 上限 |
| preference override patch |    65,536 |                                    使用现有 5.11 上限 |
| party snapshot            |   131,072 | empty 96；100 人 × 100 中文字、全功能 codes 为 76,094 |

这些限制为当前 Web 使用保留余量并约束意外/恶意大 JSON，**不是会员权益限制**。
合法 canonical stress plan 在 4,194,304 bytes 可解析并真实入库，增加一个字节时
应用与 SQL 都拒绝。Trip 与 party 的技术限制不修改 canonical contracts 原有字段限制。

## 证据

- [逐文件历史审计](legacy-pr221-audit.md)：23 个 PR #221 文件，每个仅一个 disposition。
- [机器证据](acceptance.json)：baseline/candidate 计数、类型 hash、常量/fixture metrics、
  受保护源文件 hash、边界核对和最终状态。
- [完整 Result](../../tasks/RESULT-TASK-048-b-trip-persistence-data-model.md)：实际运行结果、
  例外、PR 和 WBS 状态。

## 已知本机基线例外

原有 `.cache/qa/task024-worktree/.cache/qa/` 下 7 个历史 CommonJS 脚本触发
`@typescript-eslint/no-require-imports`。未修改源码前与候选 `npm run lint` 的文件、
位置、错误数一致：7 errors / 0 warnings。新改动单独 ESLint 通过；GitHub 干净 checkout
不含该本机缓存。原有缓存保留，不用删除或改变 lint 规则隐藏问题。
