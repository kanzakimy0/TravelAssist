# RESULT — TASK-065-B / WBS 4.24 Engine Integration Certification

## Metadata

- Task: TASK-065-B
- Owner: B
- Issue: [#387](https://github.com/kanzakimy0/TravelAssist/issues/387) — Open
- Status: 待验收；本地 QA 全部通过；最终 head CI 回执见 PR #388 delivery JSON
- Execution base: `3d6c326ff62d69c8d1a9fb96bd6dca368faa3642`
- Branch: `codex/b-wbs-4-24-engine-integration-certification`
- Draft PR → develop: [Draft PR #388](https://github.com/kanzakimy0/TravelAssist/pull/388)
- Implementation commit: f4dfcadf3fae2fe9b1aa97196264eb5158316444
- Final-head/CI: final immutable SHA and exact workflow_dispatch Quality Gate receipt are bound in the PR delivery JSON and final user response; no self-referential SHA is invented.

## 1. 执行结论与边界

完成当前已合并 Engine v0.1 子集的认证测试与证据建设。认证范围为 4.21 validate/preview、4.22 apply/reconcile、4.23 local recompute/compensating rollback；source.kind=user，仅 UPDATE_TIME / REORDER_ITEMS。

没有发现需要修改 Engine runtime 的 correctness bug。新增八个测试／generator／fault harness 文件以及认证与 QA 文档；没有新增 runtime 能力、schema、migration、revision system、产品 HTTP 或 Planner UI。39 个相关生产代码、契约、schema、generated types 和历史 migration 文件与执行基线内容哈希一致。

前置 4.20 Frozen、4.20.1、4.21、4.22 B、4.23 B、8.5 B、7.5 均已确认完成；8.5 Owner 按 authoritative correction。独立候选 worktree 和干净 detached develop baseline 已建立；原工作区未跟踪的 outputs/ 保留。

## 2. TASK-065 核心认证

| 范围                              | 实际结果                                                                                                                               |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Seeded replay/fuzz                | 5,120 / 5,120；固定 seed 0x065b2026；40 类 × 128；零失败                                                                               |
| Outcome 分布                      | accepted 384；blocked 2,944；needsConfirmation 384；unsupported 1,408                                                                  |
| 确定性                            | validate/preview、issues、assessment、fingerprints、输入不变性、key 顺序／空白、数组语义通过；独立执行与 full Node transcript 一致     |
| Apply concurrency                 | 120 轮，1,080 个竞争请求；same key / mixed payload / stale base 各 20 轮、每轮 16 请求，并观测 15 个真实 DB 等待会话                   |
| 多 Plan / 独立 Trip / actor scope | 同 Trip root 串行化；独立 Trip 两个 resolver 同时进入；相同 key 不跨 actor 冲突                                                        |
| Rollback/race                     | 100 轮，560 个竞争请求；50 轮 UPDATE_TIME、50 轮含 REORDER_ITEMS；涵盖同 key、不同 key、rollback-first、apply-first、drift 后并发拒绝  |
| Runtime                           | 初始 531 个事件由 8 个并发 worker loop 消费；每个 worker 实际处理 66–67 个事件；批量阶段全部 processed                                 |
| Lease / retry / fencing           | 四次旧 worker fencing；retry recovery、三次 bounded retry terminal、弃置 lease exhaustion；无 stranded claim，重复执行不产生第二份结果 |
| Route facts                       | 7.5 contract 的 valid / missing / stale / invalid 场景；缺失／失效 fail closed；非 loopback Provider 请求次数 0                        |
| Transaction faults                | 26 项全部通过：18 个真实 SQL statement/deferred-constraint 故障，8 个 real-COMMIT ack/read 故障                                        |
| accepted graph                    | 544 accepted receipt、audit、outbox、required preimage、runtime result 各一份                                                          |
| non-accepted graph                | 347 terminal apply receipts；关联 accepted audit/outbox/preimage 为 0                                                                  |
| Compensation relation             | 75 个唯一关联；每个补偿有自己的 receipt/audit/outbox/preimage                                                                          |
| 总体 DB invariant                 | 891 receipts；零 orphan/duplicate/版本或 graph 违规                                                                                    |
| Data minimization                 | 扫描 3,507 行 Engine 持久化内容，禁止内容命中 0                                                                                        |
| 内部 metadata 权限                | 7 表 × anon/authenticated-browser × read/insert/update，共 42 项返回 42501                                                             |
| Account deletion                  | 真实 DELETE /api/account 返回 204；目标 owner 的 869 个 receipt 及关联 Engine/Trip/Profile 数据清除，另一用户保留                      |
| 清理                              | Synthetic Auth、七张 Engine metadata 表、fault functions 均为 0；最终 db:stop 见 gate ledger                                           |

accepted resultingVersion 对照真实 DB revision；历史 duplicate replay 对照原始 committed result。Revision 只前进；原 receipt/audit 逐项比对不变；成功补偿后再次 rollback original 或 compensation receipt 不会翻转状态。confirmationRequirements 不生成 accepted mutation/audit/outbox/preimage。

Unknown outcome 只以 original key / exact payload reconcile。已 COMMIT 的 read failure 不谎报 rollback；已知 23514/40001 提交拒绝真实回滚全部写入，再用原 key retry。故障注入是受控 Local 事务／transport wrapper，不声称验证真实生产网络分区。

## 3. 全部 QA

核心执行记录在 [QA ledger](../qa/TASK-065/acceptance-evidence.json)，各 suite 存在重叠，不能相加。

| Gate                                                                | 结果                                                                           |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| clean latest-develop full Node                                      | 2,557 / 2,557 PASS                                                             |
| candidate full Node                                                 | 2,598 / 2,598 PASS；fail/skip/todo 均 0                                        |
| 4.21 + TASK-063/064 pure + schema union                             | 115 / 115 PASS                                                                 |
| TASK-065 pure wrapper                                               | 41 / 41 PASS，内部 5,120 cases                                                 |
| TASK-065 real Local wrapper                                         | 7 / 7 PASS，内部轮次与事件数如上                                               |
| Trip pure / Local                                                   | 3 个 pure wrapper PASS（含契约子测试）；Local 21 / 21 PASS                     |
| Routing                                                             | 28 / 28 PASS                                                                   |
| TASK-063 Local                                                      | 35 / 35 PASS                                                                   |
| TASK-064 Local                                                      | 42 / 42 PASS                                                                   |
| A+B coexistence                                                     | 5 / 5 PASS                                                                     |
| 两次 reset/types/catalog replay                                     | PASS；19 表 catalog 和 generated types 两次完全一致                            |
| Personal Center Local                                               | 15 suites / 877 tests PASS；零 fail/skip/todo                                  |
| npm ci / db:start / db:status / db:reset / db:types                 | PASS，真实 Local                                                               |
| lint / typecheck / build                                            | PASS                                                                           |
| format:check:deploy / Task-owned formatting                         | PASS                                                                           |
| deploy:validate:local / deploy:build:local / deploy:verify-artifact | PASS，1,869 文件产物                                                           |
| git diff --check / final cleanup / db:stop                          | PASS；synthetic cleanup 已验证，Local Supabase 已停止                          |
| exact final-head GitHub Quality Gate                                | 精确 final branch head 回执由 PR delivery JSON 绑定；要求 Quality Gate success |

Node v24.18.0；Next 16.3.4；Supabase CLI 2.116.0；PostgreSQL 17.6。Types SHA-256：`03edd402289d6822b73a3b686f2fc57d8d77807dde46df0f2dea2246488be4c1`。Catalog SHA-256：`589df4dbe3afa3b59c99e5b28a2a7b8562cb61562e0593bb748cb47cc965b22a`。

## 4. 缺陷、校准与兼容性

Engine correctness defect / minimal runtime fix / public compatibility change：无。

初轮失败属于 harness 校准：confirmed booking 合成数据缺少 canonical required refs；invalid context 的既有错误码断言；PostgreSQL Result 子类数组的 strict prototype 比较；task-owned formatting。已修正并实际重跑。最终 seed failures=[]，并保留初始 case 编号与输入复现说明。未降低现有 suite 断言、未改 Frozen public semantics、未修改历史 migration。

## 5. Deferred 与残余风险

[完整认证报告](../architecture/engine-v0.1-certification.md) 对 Frozen §25 的 21 项 Open Decision 逐项分类。CERTIFIED_FOR_CURRENT_SUBSET 只表示当前子集有证据，不等于生产／产品决策关闭。

其余 operation、AI/system/provider_event apply、confirmation grant、Booking/Payment、生产 Route/POI policy、模型校准、公开 API／Consumer rollout、4.18/4.19、cron/daemon/broker 均保持 deferred / fail closed。未来改变 Frozen public semantics 必须 REQUIRES_AMENDMENT。

本任务未调用 live/paid Provider，未修改 Production/Staging DB，未改变 7.3/7.8 状态。有限 synthetic soak 不代表生产容量或可用性 SLA；历史无 preimage、后续 drift 和当前保护仍可阻止补偿，补偿不表示订单／付款已经撤销。

## 6. 交付物与等待验收

- [Task](TASK-065-b-wbs-4-24-engine-integration-certification.md)
- [Codex instructions](CODEX-TASK-065-b-wbs-4-24-engine-integration-certification.md)
- [Engine certification](../architecture/engine-v0.1-certification.md)
- [QA README](../qa/TASK-065/README.md)
- [Seeded evidence](../qa/TASK-065/seeded-evidence.json)
- [Runtime evidence](../qa/TASK-065/runtime-evidence.json)
- [Command / delivery ledger](../qa/TASK-065/acceptance-evidence.json)
- Eight TASK-065 test/harness files.

最终状态：4.24 = B / 待审查（#387 / TASK-065-B；Draft PR #388）。唯一 Draft PR 保持 Open / Draft；Issue #387 保持 Open；未 merge、未标记 4.24 已完成，等待用户验收。
