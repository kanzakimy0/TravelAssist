# TASK-063-B Result — WBS 4.22 Engine Transaction Apply

## 状态与追踪

- Task：TASK-063-B；Owner：B；Issue：[#380](https://github.com/kanzakimy0/TravelAssist/issues/380)，保持 Open。
- 状态：本地实现及强制 QA 已完成，Draft PR 已创建，待验收；WBS 4.22 = B / 待审查。不能在合并前标记已完成。
- Branch：`codex/b-wbs-4-22-engine-transaction-apply`，独立 worktree。
- Execution base：`849ed9f207a0ec55ff514e287fbc3d6c7adc2cea`。
- Draft PR：[#382](https://github.com/kanzakimy0/TravelAssist/pull/382) → develop，保持 Open / Draft；不自动 merge，不自动关闭 #380。
- Implementation commit：`c95bb5b38532c6f29400b2639c47d63c667163a2`；后续提交仅更新交付追踪文档。
- 设计：[Engine transactional apply](../architecture/engine-transaction-apply.md)。
- QA：[README](../qa/TASK-063/README.md)、[machine-readable evidence](../qa/TASK-063/acceptance-evidence.json)。
- 最终 pushed head 与 exact-head Quality Gate run 由 PR 描述及最终交付回执记录；不在文档提交中伪造自身 SHA。

## 启动门与前置

按用户顺序执行 status、branch、fetch、develop SHA 与 20 条 log，读取指定远端完整 CODEX 和 TASK。原工作站为 detached HEAD，仅有既存 `outputs/` 未跟踪内容；未覆盖或删除它。候选和干净 develop 基线使用两个新独立 worktree，均从上述最新 develop 建立。交付前再次 fetch，develop 未变化。

4.20 已完成 / Frozen；4.20.1、4.21、8.1、8.3、8.4、8.5 均已完成。PR #227 已合并，merge `842447d29e2b8792df6674a1a3c0c45b967622e8`；PR #379 已合并，merge 即本次执行基线。

8.5 Owner 依据 `docs/project/WBS-8.5-owner-correction.md` 为 **B / 已完成**。该文档明确要求同步仍为 A 的主表及 TASK-062 tracking，因此只对这两处做机械 Owner 修正；历史 A-owned 实现及 TASK-062 执行时记录保留。4.22 实际开始时置 B / 进行中。未改变 4.23/4.24 或其他模块状态/Owner。

## 实现

新增 server-only `createEngineApplyService`，请求入口只有现有 ChangeSetV0_1；不接受 caller snapshot、owner、role、access、context 或确认 grant JSON。真实请求级 Auth 验证后，actorRef 必须匹配实际用户。

在一个 READ COMMITTED 事务内锁定 actor/key，读取幂等记录；以真实用户的 transaction-local claims + authenticated RLS 锁定并重建 Trip/Plan；复查 tripRevision 和 planRevision；获取可信服务端评估上下文并重跑完整 4.21 preview/validation；仅对可接受候选复用 8.5 writer；回读真实 resultingVersion；同事务写 terminal receipt、一个 accepted audit、一个 pending outbox 后提交。成功返回前再读取已提交的 receipt。

没有第二套 Trip Plan、revision counter 或并行 writer。原 Trip repository 的事务内逻辑抽取至 `src/server/trips/transaction.ts`；普通 create/read/replace/remove 行为保持。Engine 用同一 writer 的目标 Plan 模式，其他 Plan 与其 revision 保持不变。原 SQL CAS/RLS/revision/ancestor triggers 未修改。

仅真正 apply `UPDATE_TIME` 和 `REORDER_ITEMS`，且 source.kind=user。其余十六种已识别 operation、AI/system/provider_event、Booking/Payment、SKIP/RESTORE、宏重规划均不能写入。非空 confirmationRequirements 返回 needsConfirmation：Trip mutation=0、accepted audit=0、outbox=0；不发明 confirmed:true 或客户端授权。

## 幂等、失败与对账

- 采用 **同一已认证用户 + apply + key** 的全局唯一 reservation，目标 Trip/Plan、request kind 及全部 ChangeSet 语义仍绑定在记录/现有 canonical hash 中。不同目标复用同一用户的 key 也冲突；其他用户独立。
- 同 key + 同 canonical payload 返回首次 terminal result，duplicate=true，originalChangeSetId 指向原请求。对象键顺序不改变 hash；不增加 mutation/audit/outbox。
- 同 key + 不同 payload 返回 IDEMPOTENCY_KEY_REUSED；SQL unique constraint 与 transaction advisory lock 共同保护并发。
- 有权限的 stale/blocked/unsupported/needsConfirmation 决策可保留 terminal receipt，但无 accepted audit/outbox；Auth/ownership/parse 失败不留记录。
- 已知事务失败：TRANSACTION_FAILED / rolled_back / resultingVersion=null，全部业务及三类元数据回滚。
- COMMIT 结果不确定：按原 actor/key/hash 对账；有已提交记录则 replay，无法确认则 outcome_unknown。已确认 COMMIT 后的回读失败也不能误报 rollback。只允许原 key、原 payload 恢复。
- OD-8.5-02 的本次实现部分已完成；retention/cleanup 仍待后续契约，在此之前不自动清理幂等记录。

## Migration、权限与数据最小化

唯一新增 migration：`20260917090000_create_engine_apply.sql`。原有八个已合并 migration 内容不变；Drizzle 和真实 Local db:types 同步到十五张 public 表。

三张 Engine 表：

| 表                    | 用途                                                                                  |
| --------------------- | ------------------------------------------------------------------------------------- |
| engine_apply_receipts | Auth owner FK/cascade、actor/key 唯一性、历史 target refs、hash、原 terminal result   |
| engine_apply_audits   | accepted receipt 的唯一审计，前后 revision、preview/context hash、operation codes/IDs |
| engine_apply_outbox   | accepted audit 的唯一 pending 事件，未来消费                                          |

全部 RLS enabled，PUBLIC/anon/authenticated 无读写权限；service_role 仅 SELECT/INSERT。Trip 业务读写始终在已验证用户的 authenticated RLS 下完成。仅元数据插入恢复可信 DB 原始角色，没有新增公开 privileged RPC。

receipt 不保存 preview.before/after、完整 snapshot/ChangeSet/context、原始 Provider 数据、token、凭证、支付数据或 UI state。保留公开 assessment/issues/confirmation 引用，以准确 replay 原结果。历史 Trip/Plan refs 不建立依赖可删除业务树的 FK；Trip 删除后仍能原 key 对账，Auth 删除则 receipt → audit → outbox 全级联。未部署 Production/Staging。

## Focused acceptance

真实 Local Supabase/Auth 的 **34 个子验收 + 1 个父测试 = 35/35**：

| Task 要求                                                                    | 已执行结果                                                                          |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1–4 owner UPDATE_TIME / REORDER、canonical round-trip、真实 resultingVersion | PASS；Trip/目标 Plan 各递增一次，无关 Plan 不变                                     |
| 5–6 stale Trip / Plan                                                        | PASS；无 mutation/audit/outbox                                                      |
| 7–9 跨用户、匿名、actorRef mismatch                                          | PASS；跨用户与不存在目标返回相同权限失败，无目标数据泄露                            |
| 10 锁、booking/payment、protected、全部 unsupported operations/sources       | PASS；不能持久化                                                                    |
| 11 confirmation                                                              | PASS；needsConfirmation，零业务副作用，客户端确认字段拒绝                           |
| 12–13 same key replay / payload conflict                                     | PASS；原结果、duplicate=true、原 changeSetId，一次提交总量                          |
| 14 同 key 并发                                                               | PASS；独立 PostgreSQL 会话真实 advisory lock wait，最多一次 commit                  |
| 15 不同 key / 同旧版本并发                                                   | PASS；一个成功，一个 stale，不能覆盖                                                |
| 16 事务失败原子回滚                                                          | PASS；outbox 插入失败及 deferred COMMIT constraint 均零残留                         |
| 17–18 accepted 一份 audit/outbox，非 accepted 无 accepted 记录               | PASS                                                                                |
| 19 账户删除                                                                  | PASS；真实 DELETE /api/account 返回 204，级联清除 Engine/Trip/Profile，另一用户保持 |
| 20 A+B coexistence                                                           | PASS；原 TASK-062 的全部八个 Personal Center + 四个 Trip 表共存回归通过             |

还验证了：服务端重读覆盖调用前 preview；resolver 无法通过修改副本篡改持久化 candidate；提交确认丢失后的真实 DB 对账；DB 不可用时 outcome_unknown；post-COMMIT read serialization failure 不误报 rollback；Trip 删除后的安全 replay；浏览器角色无法读/伪造元数据；所有测试用户及 Engine 行清零。

未知提交采用确定性故障注入包裹真实 Local transaction，并从真实已提交记录恢复；**没有声称执行 live network partition**。

## 全仓与数据库 QA

以下最终执行结果以 machine-readable evidence 为准；聚合/单项计数相互重叠，不相加：

| Gate                                                                                      | 结果                                                                  |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| npm ci（baseline/candidate）                                                              | PASS                                                                  |
| 干净 develop full Node baseline                                                           | 2520/2520                                                             |
| 4.21 focused regression                                                                   | 77/77                                                                 |
| TASK-063 pure                                                                             | 14/14                                                                 |
| TASK-063 Local                                                                            | 35/35                                                                 |
| test:trip-plan                                                                            | 3/3 wrapper；内含既有 16-case fixture suite                           |
| test:trip-plan:runtime                                                                    | 21/21                                                                 |
| A+B coexistence                                                                           | 5/5                                                                   |
| 两次从零 reset/types + migration static/runtime                                           | PASS；每次 static 4/4、runtime 6/6，十五表 catalog/types 两次字节一致 |
| Personal Center 完整 Local aggregate                                                      | 15 个套件，877/877，零 skips                                          |
| candidate full Node                                                                       | 2534/2534，零 failures/skips                                          |
| lint / typecheck / build                                                                  | PASS                                                                  |
| format:check:deploy / deploy:validate:local / deploy:build:local / deploy:verify-artifact | PASS                                                                  |
| Task-owned formatting / git diff --check / fixture cleanup / db:stop                      | PASS                                                                  |
| exact final-head GitHub Quality Gate                                                      | 最终交付前要求 PASS；精确 head/run 见 Draft PR 及交付回执             |

Generated types SHA-256：`2fae0ed89511b70dbadeb34b3aa8ba245630d902dcfa2dad7de3af04f665bd48`。两次完整 catalog SHA-256：`47402cd348fc39a5e5c1dc72f956067ebc4f5e1ea49f34fa88a3a2f228ac52d9`。

开发阶段 writer 抽取截断、测试 loader、204 状态码断言及 deferred-trigger fixture 拼写问题都在最终验收前修正并重跑，记录在 QA；没有修改旧 migration、放宽现有产品断言或拿历史失败豁免新失败。

## 保留边界与交付

本任务完成的是 owner-only server apply 能力，不是生产评估适配器接线。真实产品 policy/profile/fact adapter、confirmation grant、outbox delivery、rollback execution、扩展 operation 和 AI/system/provider_event apply 仍未开启；4.23/4.24 未启动。无 UI/live Provider/Booking/Payment 外部副作用。

最终实施分支只创建一个 Draft PR → develop，Issue #380 保持 Open，WBS 4.22 置 **B / 待审查**；等待用户验收和后续明确合并授权。不执行自动 merge、Issue closure、rebase、force push、reset --hard 或 clean -fd。
