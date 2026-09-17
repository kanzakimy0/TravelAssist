# RESULT — TASK-064-B / WBS 4.23

## Tracking

- Task：TASK-064-B；Issue：[#383](https://github.com/kanzakimy0/TravelAssist/issues/383)，保持 Open。
- Owner：B / TravelAssist Engine Runtime。
- Status：实现与本机 QA 完成，待验收；Draft PR 与准确 final-head CI 见交付记录。
- Branch：`codex/b-wbs-4-23-runtime-recompute-rollback`。
- Execution base：`b3c37a40ff8f0690a25d0372ac8e0c8f3cc063ea`。
- PR：PENDING → develop（必须 Draft / Open，不自动合并）。
- 实现 commit、最终 head 与 exact-head CI：发布后记录于 PR delivery metadata；提交内不伪造自身 SHA。
- [完整 Task](TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md)、[架构说明](../architecture/engine-runtime-events-rollback.md)、[QA](../qa/TASK-064/README.md)、[机器证据](../qa/TASK-064/acceptance-evidence.json)。

## 启动与前置核实

已按顺序执行 status、branch、fetch --all --prune、origin/develop SHA 和最近 20 条日志，完整读取远端 TASK / CODEX 指令及最新 Master WBS。原主工作区 detached HEAD，仅有既存 `outputs/`；未修改或清理。候选与 Node baseline 分别从执行时干净的最新 origin/develop 创建独立 worktree，没有从 Task publication branch 开发。

前置均成立：4.20 已完成 / Frozen、4.20.1 已完成、4.21 已完成、4.22 B / 已完成、7.5 已完成、8.5 B / 已完成。8.5 Owner 依据 `WBS-8.5-owner-correction.md`。PR #382 已 normal merge，merge `47c9f48c371ba42faf646bef87ad7ca7a8ee3f66`，Issue #380 Closed / Completed。

7.3 仍为 Production Provider 待确认，7.8 仍为开发期子集 / Production Gate 未关闭。4.24 未启动。发布前再次 fetch 确认 develop 仍为上述执行基线。

## 实现结果

### Pending outbox → 当前状态重算

`createLocalEngineRuntime` 是 server-only、显式调用的本地 consumer。通过 PostgreSQL FOR UPDATE SKIP LOCKED 原子 claim，使用随机 lease token、数据库时钟、60 秒租约、5 秒 retry delay 和最多 3 次评估。支持 processed、retryable_failure、terminal_failure；过期租约可恢复，过期或被替换 worker 的提交被 token 条件拒绝。同一事件仅一条 runtime result，重复调用无额外结果。

Consumer 从已接受 receipt 获取可信 actor/target，在当前 authenticated RLS 和一致数据库读取下，通过现有 8.5 projection 读取当前 Trip/Plan。复用 4.21 validate，对目标 Plan 进行只读重算；不修改 Trip、不调用 apply、不生成自动变更。结果保留原 resultingVersion 与当前 observedVersion、确定性 fingerprint 和最多 32 个安全 issue code，不保存完整 assessment、snapshot、context 或 Provider payload。

Route facts 经过现有 7.5 validator 和 4.21 freshness/reference/endpoint/time/mode 检查。缺失、过期、无效事实保持 fail closed；没有真实或付费 Provider 调用、刷新、伪造替代事实。未部署 daemon、cron 或 broker。

### Accepted apply → 最小历史 → 补偿 ChangeSet

4.22 的已锁定事务主体抽取为共享 `applyLocked`，原 apply coordinator 的真实 Auth、actor/key 幂等、RLS、双 revision、commit/reconcile 语义保持。普通 apply 与 rollback 都使用同一 8.5 `replaceTripTree`，没有第二套 Trip 或 revision system。

每次未来 accepted apply 同事务记录最小净变化：

- UPDATE_TIME：itemId、beforeSchedule、appliedSchedule。
- REORDER_ITEMS：dayId、beforeOrder、appliedOrder。

Applied 值来自实际数据库写入后读回的 canonical state，避免 timestamp 表示规范化造成假冲突。历史限制 100 个不同目标、每个 order 最多 1000 UUID、JSON 总量 256 KiB，并有严格 parser / SQL shape 检查。缺少历史的旧 receipt 返回 unsupported / ROLLBACK_HISTORY_UNAVAILABLE，零 mutation。

`createEngineRollbackService` 只接受 versioned identity / reason / correlation 请求；不接受调用者 snapshot、inverse、role、confirmed 或任意 grant。它重新检查真实 Auth、actor、当前 owner/RLS、原 accepted receipt/audit、history、已有补偿关系、目标存在性和 current == applied-after。

发现时间或顺序漂移、目标删除时返回 ROLLBACK_CONFLICT，零 mutation。通过前置检查后，以当前真实 revisions 构造可信 inverse UPDATE_TIME / REORDER_ITEMS，重新解析当前 context 和 4.21 preview，再进入同一事务 apply。当前 hard/user/booking/payment lock、protected、missing-context 与 confirmation 门禁保持生效。

成功补偿产生新的正向 revision、新 apply receipt、新 accepted audit、新 pending outbox、新 preimage，以及 original receipt → compensation receipt 关系。原 receipt/audit 保持不变；不会回退 revision、覆盖旧 snapshot 或冒充 Booking/Payment 已撤销。

Actor + rollback key 绑定整个请求 hash；相同请求 replay duplicate=true，不同 payload 冲突。额外 original-receipt lock 与唯一补偿关系确保不同外部 key 并发也最多一次成功。原 receipt 被消费后不能再次补偿，compensation receipt 自身也不开放反向补偿，因此不会来回翻转状态。已知事务故障完整 rollback，未知提交按原 key 对账。

### Schema / contract / 兼容

新增唯一 migration：`20260917100000_engine_runtime_compensation.sql`。原九份 SQL migration 保持字节一致。扩展现有 outbox delivery 字段，新增四张内部表：

| Table                      | 内容                                       |
| -------------------------- | ------------------------------------------ |
| engine_apply_preimages     | accepted audit 关联与严格有界最小 preimage |
| engine_apply_compensations | original → compensation 唯一关联           |
| engine_rollback_receipts   | typed 幂等、结果、版本与 receipt 引用      |
| engine_runtime_results     | 一个事件一条 typed 最小重算结果            |

共十九张 application tables。新增 metadata 全部 RLS enabled，浏览器 / anon / authenticated 无访问权；可信 service role 只有必要 SELECT/INSERT，outbox 另有 UPDATE。Auth 删除安全级联，保留其他用户数据。没有 child-row FK 妨碍 8.5 的规范化替换写入。

共享 Engine 增量 request/result/runtime 类型、严格 parser、确定性 serializer 和 fixtures 已提供。Frozen ChangeSetV0_1 与 4.21 规则不变，Trip 仅额外导出现有 schedule parser；Route contract 不变。SQL 改动后已真实运行 db:types，未手写 generated types。

## Focused acceptance

真实 Local Supabase/Auth 验收覆盖 Task §17–18 全部 36 项，组织为 41 个子验收 + 父测试 = **42 项**。完整逐项映射见 QA；包括：

- event pending/claim/terminal/repeat、并发 claim 与 duplicate completion、过期运行中 worker fencing、bounded retry 及最后一次 lease crash；
- current revision、只读 4.21、合法/缺失/过期/无效 Route facts、无 Provider network、确定性 fingerprint、最小保留及权限；
- UPDATE_TIME、REORDER_ITEMS 的正向补偿与真实新 revision、原 receipt/audit 不变、正确新 receipt/audit/outbox/correlation；
- 时间/顺序 drift、缺失目标、跨用户、匿名、actor mismatch、当前 locks/booking/protected/context、历史不可用；
- 同 key replay / payload conflict、不同 key 对同一原 receipt 的真实 PostgreSQL advisory wait / 最多一次提交、重复补偿禁止；
- preimage、correlation 和 deferred COMMIT 的真实 SQL 故障原子性，提交确认丢失后的真实记录对账；
- 原 TASK-063 apply/reconcile 行为，以及真实 DELETE /api/account=204 的级联和其他用户保留。

成功 reorder fixture 同时补偿对应 schedule，确保前后均满足现有 chronological rules。过去顺序在当前规则下不可行时仍会 blocked / needsConfirmation，不强行恢复。故障注入包裹真实数据库事务，没有宣称执行 live network partition。

## QA gate 汇总

最终机器证据记录精确命令、counts、log hashes、migration replay 与 cleanup；聚合/单项计数有重叠，不相加。

| Gate                                           | 结果                                                            |
| ---------------------------------------------- | --------------------------------------------------------------- |
| npm ci（baseline/candidate）                   | PASS                                                            |
| clean develop full Node baseline               | 2534/2534                                                       |
| 4.21 focused regression                        | 77/77                                                           |
| TASK-063 pure / real Local                     | 14/14；35/35                                                    |
| TASK-064 pure / real Local                     | 23/23；42/42                                                    |
| test:trip-plan / runtime                       | 3/3 wrapper（含既有 16-case suite）；21/21                      |
| test:routing                                   | 28/28                                                           |
| 两次空库 reset/types + migration regression    | PASS；每次 static 4/4、runtime 6/6；十九表 catalog / types 一致 |
| TASK-062 A+B coexistence                       | 5/5                                                             |
| Personal Center 完整 Local aggregate           | 15 个套件，877/877，零 skips                                    |
| candidate full Node                            | 2557/2557，zero failures / skips                                |
| lint / typecheck / build                       | PASS                                                            |
| format:check:deploy / 三项 deploy gates        | PASS                                                            |
| scoped format / diff-check / cleanup / db:stop | PASS                                                            |
| exact final-head GitHub Quality Gate           | 以 PR 最终 delivery metadata 中的准确 SHA / run 为验收证据      |

Generated types SHA-256：`03edd402289d6822b73a3b686f2fc57d8d77807dde46df0f2dea2246488be4c1`。
两次完整 catalog SHA-256：`589df4dbe3afa3b59c99e5b28a2a7b8562cb61562e0593bb748cb47cc965b22a`。

初轮 timestamp readback、负向 SQLSTATE 断言及 generated-schema 验收清单扩展均已记录并修正；最终验收不使用历史失败豁免。B 的原表清单、migration hash、列/default/nullability 核对保持严格。

## 边界与验收交付

4.23 的交付范围是本地 server-only runtime / recompute / compensating rollback。Production context/profile/fact adapter 接线、生产 worker、UI/HTTP 入口、confirmation grant、其他 operation、AI/system/provider_event apply 和 Booking/Payment 副作用未开启。

WBS 4.23 在实际开始时已更新为 B / 进行中；实现、QA、Draft PR 完成后同步 B / 待审查。保留 Issue #383 Open、PR Draft/Open，不自动 merge，不标记已完成，不启动 4.24。7.3 / 7.8 状态不变。没有 rebase、force push、reset --hard、clean -fd 或 Production/Staging DB mutation。
