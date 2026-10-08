# PR #426 复用与真实冲突矩阵

状态：只读审计完成，**CONTRACT_REVIEW_REQUIRED / WBS_8_7_BLOCKED**。Canonical Owner A 不变。这里的 REUSE 表示建议复用，不表示已导入、已验收或对最新 develop 已通过运行回归。

## 固定证据

- D = develop `8f60c8b94d3f5148abeb414d0d8e209e5d736cea`。
- U = PR #426 `97a53d5f1fc1fdb5c2c445103fc4c0173be9aca1`，分支 `codex/a-ai-conversation-orchestrator`，Open / Draft / Unmerged。
- M = merge-base `f08daa9f8aa9b459fbd294f08e4bd29e16624647`。
- #469 文档来源 = `c8c1a36d27a3314fe69fda51868092ced7bba214`，仅拷入三个任务文档，未 merge 文档分支。
- 完整 changed-file list 以 `git diff --name-status M U` 取得：**25 文件，16 A / 9 M**。逐文件完整 sourceCommit、sourceBlob、developBlob 见 [phase1-evidence.json](phase1-evidence.json)。下表每行来源 **U** 均明确引用上述同一 exact SHA；D 表示当前已合并版本，缺失表示该路径尚未合入。

## 逐文件复用清单（25/25）

| 路径（均来源 U）                                              | 职责与相对 D 的差异                                                     | 分类 / 后续处理                                                                           | 本阶段 DB migration  |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------- |
| docs/project/AI-WBS-6.4-6.13-runtime-completion-plan.md       | 增加 TASK-077 实现/旧本地 Gate 记录；D 尚无该状态                       | EXTEND：以后记录当前重新验证，不能沿用旧 PASS                                             | 无                   |
| docs/project/WBS-TravelAssist.md                              | 修改 6.10/6.13，携带旧 6.14 未开始上下文；D 的 6.14 已完成              | CONFLICT：保留 D 已验收状态，见下方精确冲突                                               | 无                   |
| docs/qa/TASK-077/README.md                                    | D 无；2026-09-22 的历史 QA                                              | NO-CHANGE：保留 A 证据，不改写为本轮测试结果                                              | 无                   |
| docs/qa/TASK-077/acceptance-evidence.json                     | D 无；旧基线 f08daa9 的机器证据                                         | NO-CHANGE：历史 provenance；新的兼容回归另产 evidence                                     | 无                   |
| docs/tasks/RESULT-TASK-077-a-ai-conversation-orchestrator.md  | D 无；A 的结果及 live smoke deferred                                    | NO-CHANGE：保留原结果，不把历史 PASS 当合入许可                                           | 无                   |
| package.json                                                  | 新增 test:ai-conversation 与 bundle 两个 script；D 还有后续测试基线入口 | REUSE：Git 自动合并；Phase 2 核验新测试纳入 baseline inventory                            | 无                   |
| src/app/api/ai/conversation/route.ts                          | D 无；POST exact parser、Preference context、SSE                        | EXTEND：复用路由；durable actor/owner 尚不存在，不把 Preference 读取当会话授权            | 无；未来表设计须审批 |
| src/features/home/components/ai-conversation-panel.module.css | D 有 shell；U 增 message/status 样式并替换 note                         | REUSE：保留既有布局/焦点/响应式语义，需 UI 回归                                           | 无                   |
| src/features/home/components/ai-conversation-panel.tsx        | D disabled shell；U 接 AIConversationRuntime                            | REUSE：沿用同一 Home panel，不建第二个会话 Shell                                          | 无                   |
| src/features/home/components/ai-conversation-runtime.tsx      | D 无；本地 visible messages/history、stop/error                         | EXTEND：local-user-* 是 UI key，不是 canonical user message ID；以后需重放/状态校验       | 无                   |
| src/features/home/model/ai-conversation-stream.ts             | D 无；受限 SSE frame parser                                             | EXTEND：保留 provider 事件拒绝；补显式版本/重放与终态规则后才谈恢复                       | 无                   |
| src/server/ai/conversation/fake-model.ts                      | D 无；确定性模型注入及 requests 收集                                    | REUSE：只用于合成测试，不在 production 返回 fixture                                       | 无                   |
| src/server/ai/conversation/model.ts                           | D 无；normalized model transcript/tool call，复用 foundation metadata   | EXTEND：raw arguments/output 是内存运算字段，不直接存；Tool 身份须审核                    | 无                   |
| src/server/ai/conversation/openai-model.ts                    | D 无；复用配置/错误，store:false，read-only functions                   | REUSE：保留封装；输出总体大小、取消重试与超时组合需 Phase 2 回归                          | 无                   |
| src/server/ai/conversation/orchestrator.ts                    | D 无；服务 ID、局部 sequence、3 rounds/4 calls                          | EXTEND：保留轮次/工具权限；持久化 claim/commit、取消终态、稳定 block refs 缺失            | 无                   |
| src/server/ai/conversation/transport.ts                       | D 无；private/no-store SSE、取消 provider、finish cookies               | EXTEND：保留安全 headers/finalizer；无 durable replay 或提交证明                          | 无                   |
| src/server/ai/prompts/registry.ts                             | D 单 foundation prompt；U 增 checksum-backed conversation prompt        | REUSE：两种 prompt 并存，不改 foundation 文本或放宽 tools                                 | 无                   |
| src/server/ai/tools/registry.ts                               | D 无；仅 user.preference.get，严格空参数、验证输出                      | EXTEND：复用权限白名单，durable per-tool safe fields 另审；不存 preference 原值           | 无                   |
| src/shared/contracts/ai-conversation/index.ts                 | D 无；四对象+六 SSE event；无 owner/block ID/Citation                   | EXTEND：同一 canonical 模块族补提案，不把 session_only 当 durable                         | 无；提案获批才讨论   |
| src/shared/contracts/ai-conversation/runtime.ts               | D 无；immutable session projection，处理四类 event                      | EXTEND：重复 delta/terminal 后 delta 无幂等防护；工具事件不形成可追溯对象                 | 无                   |
| tests/task-025-2-concept-fidelity.test.mjs                    | 从未接线 shell 改为 live composer 断言                                  | REUSE：Phase 2 保留语义/焦点断言并重新运行实际 UI                                         | 无                   |
| tests/task-067-main-system-state.test.mjs                     | 从 disabled shell 改为 bounded streaming/fallback                       | REUSE：不能在 Phase 1 替换已合并测试；仅随集成更新                                        | 无                   |
| tests/task-076-ai-runtime.test.mjs                            | prompt 数量 1→2，并校验 conversation prompt                             | REUSE：随 registry 同步集成，防仅改实现遗漏 foundation regression                         | 无                   |
| tests/task-077-ai-client-bundle.mjs                           | D 无；源文件 secret/mutation/storage 边界测试                           | EXTEND：有价值但不是编译 bundle scan；future durable 的边界须精确调整，不能直接删安全断言 | 无                   |
| tests/task-077-ai-conversation.test.mjs                       | D 无；8 个 fake/parser/tools/SSE/cancel 测试                            | EXTEND：不覆盖 DB/auth/replay/partial/concurrency；未来加入获批用例                       | 无                   |

## 实际文本冲突（不是 GitHub dirty 状态推测）

执行命令：

```text
git merge-tree --write-tree 8f60c8b94d3f5148abeb414d0d8e209e5d736cea 97a53d5f1fc1fdb5c2c445103fc4c0173be9aca1
```

退出码 **1**（此命令表示存在冲突，不是 QA 工具损坏）。结果树 `39a66d88da6e6b7da87a21d77cd7cb80d13295eb`；只生成临时 Git 对象，未 checkout、未 merge commit、未更新 A 分支。完整 stdout：[merge-tree.txt](merge-tree.txt)；带行号冲突片段：[wbs-conflict-excerpt.txt](wbs-conflict-excerpt.txt)。该临时树未提交，未来可由相同两 SHA 再生；stdout/片段/哈希已跟审计提交。

唯一 unmerged path：`docs/project/WBS-TravelAssist.md`。冲突标记区间为结果树 **1086–1092**，不是 PR diff 侧行号。

| 侧         | 精确位置        | 两侧语义                                                   |
| ---------- | --------------- | ---------------------------------------------------------- |
| D/ours     | 1086–1087       | 6.13 进行中；6.14 已完成，#435 normal merge 后只读投影范围 |
| U/theirs   | 1012–1013       | 6.13 基础实现部分完成/待审查；相邻 6.14 仍旧值未开始       |
| 自动合并项 | U 1009 / D 1083 | 6.10 由进行中改待审查，Git 没报冲突，但需当期验收证据      |

推荐：未来兼容集成保留 D 的 6.14 已验收记录；6.13 可明确写“#426 分支有基础实现，最新集成待验证”，不能选择整块 theirs 抹去 6.14，也不能把分支实现等同已合入。6.10 只在重新验证后更新审查状态。**本 Phase 1 不解决/提交 #426 merge，也不更改 6.10/6.13/6.14。** 只准确更正 8.7 的上游契约阻塞状态。

`package.json` 自动合并，无文本冲突。其余 23 个路径也未出现文本冲突。没有发现其他实际 unmerged path，不虚构源码冲突文件。

## 非文本语义风险与兼容建议

| 风险                    | 代码证据 / 已观察事实                                                                                              | 建议及回归边界                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| session ID 无持久化授权 | request exact parser 接受 conversationId/history，Orchestrator 直接沿用 conversationId；Preference helper 允许匿名 | 不能把会话存在性/客户端历史当 owner；保留匿名 session-only，durable 必须独立 server Auth gate |
| 重放重复文本            | runtime.ts 直接 text + delta；合成探针同 eventId/sequence 重放结果 XX                                              | canonical receipt 去重+内容摘要；旧 UI 与持久化应分别回归；不能声称 U 已幂等                  |
| 终态后追加              | reducer 不检查 completed 状态；先完成 Final 再迟到 delta 得 FinalX                                                 | terminal immutable，版本/序号检查；不是文本冲突                                               |
| Tool 关系丢失           | reducer 对 tool.started/completed 返回原 projection；summary 仅 toolName/status                                    | 同一 callId/turn 身份关联 summary，不凭 toolName 推断；Result 与调用共同身份                  |
| Citation 缺席           | index.ts 无 Citation；block 仅 text/tool_summary                                                                   | 新字段只作为增量 proposal，需 A/用户审查来源、ID、refs、展示范围                              |
| cancellation 未归档     | Orchestrator signal.aborted 分支直接 return；UI stopped 为本地状态                                                 | 明确取消/失联终态与 partial 策略；传输取消不等于 DB 已记录                                    |
| message 时间与 UI key   | reducer 每次 delta 用 occurredAt；UI user key 为 local-user-Date.now()                                             | 持久化 createdAt 固定；用户消息沿用 turn.started.userMessage.id，不创建第二身份               |
| sequence 域有限         | Orchestrator 每 turn let sequence=0；无 durable cursor；SSE 未发送 id: resume 标记                                 | 明确 turnSequence/messageSequence 与事件域；不当作全局 monotonic sequence                     |
| 输入与输出整体限额      | parser 12 history x 32KiB；route body 总限 input32KiB+8KiB；parser 限512事件，而 provider 输出整体未明确同限       | Phase 2 验证多轮 body 上限、长回答、分帧/总量边界；仅“每条 bounded”不能证明全部场景兼容       |
| 版本容忍度              | request exact-key；客户端只认六 event type；legacy persistence 固定 session_only                                   | 不能直接在旧 request 加 owner/idempotency 字段或推新事件；须协商/映射版本                     |
| 未合入测试与后续 CI     | U package scripts 添加测试，但最新 baseline runner 已冻结清单                                                      | Phase 2 重新核验 inventory/runners，不以新增 script 推定 Quality Gate 会执行                  |
| 历史 PASS 时效          | U Result/QA 绑定旧基线 f08daa9；不是 D 的集成运行                                                                  | 本轮只实测 D TASK-076/6.14；PR426 integrated QA 为 NOT_RUN                                    |

探针将 exact U `runtime.ts` 在内存转译后用合成事件调用，源码不拷入应用目录，不调用 provider、不改数据库。机器证据包含源码 hash 和观察值；这是问题复现，不是 #426 完整集成 PASS。

## 现有边界必须保留

- **REUSE（D）**：`src/server/ai/contracts.ts`、配置/错误/Prompt Registry、`src/server/ai/context/request-preference.ts`；规范化 provider 与安全错误，不能泄漏 raw payload。
- **REUSE（D）**：`src/lib/auth/server-user.ts` 验证用户，`src/db/index.ts` 服务端连接与显式授权责任；`docs/architecture/db-orm-migration-standards.md` / `db-foundation-bootstrap-plan.md` 的 SQL 唯一历史、Drizzle、RLS、真实 reset、生成类型。旧 migrations README 的“零 migrations”是历史 bootstrap 文字，不代表当前确实无 migration。
- **NO-CHANGE（D）**：6.14 `source-adapter.ts` / `production-reader.ts` / UI。当前 production unavailable 为预期，8.8 未开始。桥接 DTO 不升格为 canonical schema。
- **OPEN**：六对象 owner/sequence/lifecycle/idempotency/Tool/Citation/retention 字段；见 [契约 Proposal](../../architecture/ai-conversation-persistence-contract-v1-proposal.md) D01–D12。
- **BLOCKED**：WBS 8.7 Schema/Service/正式 Runtime 接线，直到契约版本与 commit 获批、#426 恢复方案认可且另行授权 Phase 2。
