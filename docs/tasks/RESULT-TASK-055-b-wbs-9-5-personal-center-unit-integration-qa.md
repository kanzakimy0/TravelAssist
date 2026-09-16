# RESULT — TASK-055-B / WBS 9.5 Personal Center Unit / Integration Test Baseline

## 状态与交付边界

**状态：已完成 / 用户验收通过并已合并。** 用户先明确验收 TASK-055-B 并授权合并 PR #356，随后明确授权将 WBS 9.5 标为已完成、关闭 Issue #355 为 Completed，并将文档验收收尾合入 develop。本次收尾仅更新本 Result 和 Master WBS 的 9.5 行。

- Issue：[#355](https://github.com/kanzakimy0/TravelAssist/issues/355)，Closed / Completed。
- 执行基线：`3850ec91a94b96f61800a9e45ba7792d07bb1c44`，执行时最新且干净的 `origin/develop`。
- 实现分支：`codex/b-account-wbs-9-5-personal-center-unit-integration-qa`，直接从该基线创建，没有从 task/spec 分支开发。
- 实现 PR：[#356](https://github.com/kanzakimy0/TravelAssist/pull/356) 已合入 `develop`；merge `6e8b73c20a0c2845f03c86dd3201f9212b7d728c`。
- WBS 9.5：`已完成（#355 / TASK-055-B；用户验收，PR #356 已合并）`；9.6 保持未开始。
- 已验收最终 head：`03531ca8f8e1cea7f682791e005a2e85f5bb75f5`；[exact-head Quality Gate](https://github.com/kanzakimy0/TravelAssist/actions/runs/34735090336) SUCCESS。本文末尾记录合并与用户授权收尾的证据。

本任务建立 B Personal Center 的可复现单元 / 集成基线。没有增加业务功能、修改生产代码、重构已验收 API、修改 SQL migration、修改生成类型或依赖，也没有实现 WBS 9.6 的完整浏览器旅程。

## 审计、清单与矩阵

已读取远端完整 TASK/CODEX 指令与执行时完整 Master WBS，核对 5.x、8.2、8.3、8.6 已完成且 9.5 尚未完成。审计覆盖实际 `tests/` 文件、npm aliases、B-owned handler/schema/private boundary，以及既有 Profile/Auth/Preference/Companion/Trip/Deletion/Migration Task、Result、QA。

[test-inventory.json](../qa/TASK-055/test-inventory.json) 共 **62 个 suite/script 文件 + 15 个 support 文件**，包括无 npm alias 的 Profile/Auth/Personal Center 测试。每个套件记录来源 Task/WBS、领域、分层、Local/browser/reset 要求、现有入口、实际测试标题和位置、环境限制、清理策略及排除理由。

| 主要分层                            | 文件数 |
| ----------------------------------- | -----: |
| Pure unit/domain                    |     16 |
| Contract/parser                     |      8 |
| API/server integration              |      6 |
| DB integration                      |      5 |
| Auth/RLS integration                |      9 |
| 单功能 browser-boundary integration |     10 |
| E2E candidate，留待 9.6             |      8 |
| 合计                                |     62 |

执行分组为 **28 个非 Local、15 个 Local 步骤、19 个明确排除的历史脚本**。分层与执行分组是不同维度：例如客户端 bundle 合同审计随 Local 序列执行，但自身不连接数据库。

[coverage-matrix.json](../qa/TASK-055/coverage-matrix.json) 映射 **46 项关键 9.5 行为，未覆盖项 0**。包括 live Auth、Cookie/Bearer 优先级、owner 不可由客户端指定、Profile/settings/contact 所有权、稀疏 Preference 与 CAS/reset/preset、公开读取和 snapshot 隔离、Companion group 原子操作、Trip 幂等/并发、账户删除/Storage/旧凭证失效及 Migration/type 一致性。所有覆盖声明指向被选入执行的真实断言；这不是行覆盖率百分比。

## 真实缺口与最小补测

[gap-report.md](../qa/TASK-055/gap-report.md) 记录缺口依据与处理。新增两份测试文件，共 **13 个断言**：

1. 五个 private mutation handler 在 Auth 503 时必须返回 `AUTH_UNAVAILABLE`、确定的私有响应头，且只访问一次 Auth，不进入产品 DB/Admin I/O：5 个。
2. Profile 在第一次成功验证后，第二次 live verification 更换 owner、返回 Auth 401 或 503 时禁止写入，保留现有错误合同：3 个。
3. Unicode JSON 按单字节分块，在实际 byte 上限内正确解析，超出一字节拒绝，虚假 Content-Length 不绕过限制，reader 均释放：1 个。
4. 聚合入口通过真实 Node 子进程验证正常通过、断言失败、exit 0 但 mandatory skip、exit 0 但没有测试输出：4 个。

没有复制既有整套测试，没有为了数量新增业务对象。可控 Auth 响应用于失败注入；真实 Local Auth、Cookie/Bearer、RLS、双用户隔离与删除另外执行。没有发现需要生产代码修复的 B-owned defect。

## 9.5 / 9.6 边界

仅四项 intrinsically full-journey 行为 Deferred 到 9.6，矩阵逐项记录原因与预期断言：完整注册/登录/多页/登出/再登录、跨模块浏览器持久化、完整桌面/移动端导航、完整浏览器账户生命周期直至删除。单元/API 断言无法证明完整多页旅程连续性。

19 个排除脚本为 16 个历史独立浏览器/视觉 harness、2 个 legacy 完整 Auth-flow runtime、1 个 TASK-054 destructive replay driver。逐项理由见 inventory；未重跑的脚本不计为新 PASS。保留现有 accepted narrow browser/API 合同测试，未重写历史 WSL full-flow harness，未重开 9.12 已验收视觉范围。

## 统一入口与确定性

```sh
npm run test:personal-center
npm run build
npm run test:personal-center:local
```

现有 aliases 全部保留。Node orchestrator 按 inventory 的固定顺序复用既有文件/loader，无 fragile shell 串联，也无第二测试框架。Local 共用项目/端口的套件串行执行；任何 mandatory child 失败、skip、todo、cancel 或无 TAP tests 都拒绝 PASS。

- 非 Local 两遍：每遍 **28 suites / 1,823 tests**，零失败、零跳过。
- Local 两遍：每遍 **13 integration suites / 877 tests + 2 bundle audits**，零失败、零跳过。
- 两遍按实际命令参数、套件顺序和逐套件测试计数比较，必须一致；清理检查亦必须一致。首遍后完善了 inventory 的审计元数据，manifest hash 因此不同；执行清单、参数和测试实现没有变化。证据保留两个 hash，而不伪装成相同 manifest。

`CODEX_PLAYWRIGHT_PATH` 由环境显式提供已安装 Playwright，现有 narrow suites 使用已安装 Edge。无 Docker/Auth/browser 时失败；不将 mandatory integration 转为 skip。详细复现步骤见 [README](../qa/TASK-055/README.md)。

## Focused 非 Local 计数

| 套件                                  |      测试数 |
| ------------------------------------- | ----------: |
| TASK-010-B global navigation          |           2 |
| TASK-016 Profile                      |           4 |
| TASK-018 Auth                         |           9 |
| TASK-042 Preference schema            |         503 |
| TASK-044 Companion schema             |         163 |
| TASK-045 Preference API               |          37 |
| TASK-046 Preference read contract     |         540 |
| TASK-047 Companion API                |          41 |
| TASK-048 Trip persistence             |          77 |
| TASK-049 Trip Library API             |          76 |
| TASK-050 Profile API                  |         104 |
| TASK-052 Account deletion             |          52 |
| TASK-053 Preference presets           |          22 |
| TASK-054 Migration contract           |           4 |
| TASK-055 private boundaries           |           9 |
| TASK-055 runner                       |           4 |
| Trip status Personal Center follow-up |          16 |
| WBS 5.10 Trip Library                 |          17 |
| WBS 5.20 responsive states            |          16 |
| WBS 5.3 callback / user-flow domain   |      6 / 14 |
| WBS 5.5 / 5.6 / 5.7                   | 8 / 11 / 23 |
| WBS 5.8 / 5.9 / 5.4-v2                | 28 / 20 / 5 |
| WBS 9.12 unit baseline                |          12 |
| 合计                                  |       1,823 |

旧 UI model 的 presentation defaults 保留为纯模型回归，不能用于证明 persisted Preference 默认值。当前存储语义以 TASK-042/045/046/053 的 sparse/missing=unset 合同为准。

## 真实 Local 计数与清理

| 套件                                     |                           测试数 |
| ---------------------------------------- | -------------------------------: |
| TASK-016 Profile DB                      |                               25 |
| TASK-018 Auth                            |                               16 |
| TASK-042 Preference schema               |                              505 |
| TASK-044 Companion schema                |                              147 |
| TASK-045 Preference API                  |                               17 |
| TASK-046 public read contract            |                               13 |
| TASK-047 Companion API                   |                               22 |
| TASK-048 Trip persistence                |                               29 |
| TASK-049 Trip Library API                |                               35 |
| TASK-050 Profile API                     |                               25 |
| TASK-052 Account deletion                |                               16 |
| TASK-053 Preference presets              |                               21 |
| TASK-054 Migration integration           |                                6 |
| 合计                                     |                              877 |
| TASK-016 / TASK-018 client bundle audits | 2 项独立 PASS，不计为 Node tests |

每遍通过 repository Local wrappers 完成 start → types → suites → status → stop。开始前拒绝占用项目和端口；没有 reset/wipe。真实 Local Auth 至少两个不同用户和 anon，用于 owner、cross-user、RLS 与 cascade。每个步骤后检查 `auth.users`、八张 B 表、`storage.objects`/`storage.buckets` 均为 0，3000/3001 端口空闲；最后重复检查、关闭 DB 连接、记录 `db:status`、执行 `db:stop`。

TASK-054 已验收的两次真实 replay 证据继续有效；本任务重新执行 immutable migration contract、真实 catalog/RLS/cascade 与 `db:types`，后者必须与受控生成类型逐字节相同。没有为了 9.5 重跑无新增信号的 destructive double replay，没有新建或修改 migration。TASK-053 runtime 对旧证据 JSON 的纯格式重写通过 scoped Prettier 还原，不构成历史证据内容变更。

## Mandatory QA

最终执行结果和日志哈希见 [quality-gates.json](../qa/TASK-055/quality-gates.json)。原始日志留在 ignored `.artifacts/task055/`，公开证据不包含凭证、用户 UUID 或 Auth token。

| Gate                                        | 结果                                                                                          |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm ci`                                    | PASS，395 packages，0 vulnerabilities                                                         |
| Baseline 全仓 Node                          | 2,480 / 2,480，fail/skip/cancel/todo 全 0                                                     |
| Candidate 全仓 Node                         | 2,493 / 2,493，fail/skip/cancel/todo 全 0                                                     |
| 两遍非 Local aggregate                      | 每遍 1,823，PASS                                                                              |
| 两遍真实 Local aggregate                    | 每遍 877 + 2 bundle audits，PASS                                                              |
| `npm run lint`                              | 精确相同基线债务，见下文                                                                      |
| `npx eslint . --ignore-pattern '.cache/**'` | PASS                                                                                          |
| `npm run format:check:deploy`               | PASS                                                                                          |
| `npm run typecheck`                         | PASS                                                                                          |
| `npm run build`                             | PASS                                                                                          |
| `npm run deploy:validate:local`             | PASS                                                                                          |
| `npm run deploy:build:local`                | PASS                                                                                          |
| `npm run deploy:verify-artifact`            | PASS                                                                                          |
| Scoped Prettier / `git diff --check`        | PASS                                                                                          |
| Exact final-head GitHub Quality Gate        | [PASS / run 34735090336](https://github.com/kanzakimy0/TravelAssist/actions/runs/34735090336) |

全仓 canonical 命令为 `node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"`。本次 package 中无需改名的 equivalent mapping；仅新增两个 aggregate aliases。非 Local、Local 与全仓测试存在覆盖重叠，不把这些数字相加作为唯一产品测试总数。

基线与候选 `npm run lint` 均只在 ignored `.cache/qa/task024-worktree/.cache/qa/*.cjs` 报 7 个相同 `no-require-imports` 错误。两份原始输出 SHA-256 完全相同：`a16851c43da73e4710f03d11bc5b9f24ec8926eb34e35eafe48f1edc47e72084`。变更文件未增加失败；排除该 ignored cache 的完整 lint 已通过。干净环境的 exact-head Quality Gate 已通过，包含完整 lint；合并后 develop Quality Gate 亦已通过，没有把新失败归为历史债务。

## 最终状态

- Production / Staging mutation = **No**。
- 历史 SQL migration 修改 / 新增 = **No / No**。
- Production code / A-owned Planner、Map、Route、AI、Engine 修改 = **No**。
- 新测试框架 / 依赖变化 = **No / No**。
- downstream task started / WBS 9.6 started = **No / No**。
- PR #356 合并与 Issue #355 Completed 关闭均有用户明确授权。
- WBS 9.5 = **已完成**；WBS 9.6 = **未开始**。

## 验收与合并收尾（2026-09-13）

- 用户明确验收通过 TASK-055-B / WBS 9.5，授权合并 PR #356，并另行明确授权 WBS 完成、Issue Completed 关闭及文档收尾合入 develop。这是任务对话中的用户验收，不声称存在 GitHub APPROVED review。
- 实现 commit：`89041acce0d265fcbac8b9b62683349269ec6bf6`；已验收最终 head：`03531ca8f8e1cea7f682791e005a2e85f5bb75f5`。
- Exact-head [Quality Gate run 34735090336](https://github.com/kanzakimy0/TravelAssist/actions/runs/34735090336)：workflow_dispatch，headSha 与已验收 head 完全相同，SUCCESS；干净环境全仓 2,493 tests、lint、typecheck、format、deployment artifact build/verify 均通过。
- 实现 PR [#356](https://github.com/kanzakimy0/TravelAssist/pull/356)：Merged → develop，`2026-09-13T03:55:29Z`；merge commit `6e8b73c20a0c2845f03c86dd3201f9212b7d728c`。
- 合并后 fetch 确认该提交已进入 origin/develop；`git diff --exit-code 03531ca8f8e1cea7f682791e005a2e85f5bb75f5 6e8b73c20a0c2845f03c86dd3201f9212b7d728c` 无差异，原已验收实现与 QA 证据继续有效。
- 合并后的 develop [Quality Gate run 34736667399](https://github.com/kanzakimy0/TravelAssist/actions/runs/34736667399)：headSha = `6e8b73c20a0c2845f03c86dd3201f9212b7d728c`，SUCCESS。
- Issue [#355](https://github.com/kanzakimy0/TravelAssist/issues/355)：Closed / Completed，关闭时间 `2026-09-13T04:00:16Z`，在用户明确授权后执行。
- Master WBS 仅 9.5 行更新为 `已完成（#355 / TASK-055-B；用户验收，PR #356 已合并）`；9.6 和所有其他 A/B 状态保持原样。
- 文档收尾分支：`codex/b-account-wbs-9-5-acceptance-closeout`，基于已合并 develop `6e8b73c20a0c2845f03c86dd3201f9212b7d728c`；仅本 Result 与 WBS 9.5 行变化。收尾 PR 记录自己的 exact-head 检查与合并证据。
- 收尾没有重跑或改写已验收 Local 测试证据；两遍非 Local 1,823 tests、两遍真实 Local 877 tests + 2 bundle audits 的结果与清理证据保留。
- Production/Staging mutation = No；生产代码、测试、SQL migration、生成类型及依赖修改 = No；WBS 9.6 或任何其他任务 started = No。
