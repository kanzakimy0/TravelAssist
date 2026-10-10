# AMENDMENT — WBS 8.7-B: 会话契约前置缺失与 PR #426 恢复路线

- 日期：2026-10-08
- 所属任务：`docs/tasks/TASK-WBS-8.7-B-ai-conversation-storage.md`
- 对应任务 PR：#469 (docs only)
- 与上游关系：TASK-077-A / Draft PR #426；原 Owner A。本补充由 B 对 WBS 8.7 实施前置审计，不代表接管或合并 TASK-077-A。
- 状态：**BLOCKED — 缺少可验收并已合并的持久化权威会话契约**；禁止在本条件下自行创建全新 Schema/业务服务。

## 事实核对（develop 与未合并 PR 分开）

1. `docs/project/WBS-TravelAssist.md` 声明 WBS 6.2 已完成、Conversation / Turn / Message / Block / Tool / Citation 语义已冻结，但 **WBS 的“已完成”状态不等于可引用的逐字段、已合并 TypeScript 契约**。
2. `develop` 已合并的 TASK-076-A AI Runtime 只有 `src/server/ai/contracts.ts` 内的 Provider/Prompt/文本请求-响应契约，不是 6.2 完整 Conversation 结构；现有 AI Runtime 测试通过仅说明基线健康。
3. 6.14 的 `src/features/personal-center/ai-history/production-reader.ts` 明确返回 `unavailable`，属于预期的未接线状态；TASK-082-B 的 `source-adapter.ts` 是只读桥接投影，不是权威存储模型。**8.8 不在本任务范围内**，因此 8.7 完成不要求个人中心 reader 自动变为 available。
4. PR #426 (`codex/a-ai-conversation-orchestrator`, head `97a53d5f1fc1fdb5c2c445103fc4c0173be9aca1`) 仍 Draft / Open / Unmerged，并标记 `mergeable_state=dirty`（截至 2026-10-08 检查），须独立处理冲突及回归，不得当成 `develop` 既成事实。
5. PR #426 **存在应优先复用的实现**：`src/shared/contracts/ai-conversation/index.ts`, `runtime.ts`, `src/server/ai/conversation/*`, `src/app/api/ai/conversation/route.ts`。其 AiConversationV1 是 `persistence: "session_only"`；AiContentBlockV1 目前仅 `text | tool_summary`，Tool 调用过程通过 SSE event 和模型内部 transcript 表示；并未提供完整的、已验收的持久化 Tool/Citation 逐字段模型。不得假称它已覆盖 WBS 6.2 的所有持久化需求。

## 解除 BLOCKED 的严格阶段门禁

### Gate 0 — 保存当前阻塞与可重复基线（B 现在可做）

- 在 WBS 8.7 独立干净分支记录 base/head SHA、盘点引用路径/逐字段缺口、现有 AI Runtime 回归与 6.14 回归的真实命令及结果。
- 在 `docs/tasks/RESULT-TASK-WBS-8.7-B-ai-conversation-storage.md` 写明 `BLOCKED_UPSTREAM_CONVERSATION_CONTRACT`；机器证据存 `docs/qa/TASK-WBS-8.7-B/`。
- 若某项测试失败，注明失败性质及与 base 的对比；不得将运行测试解释为 8.7 验收完成。
- 更新 WBS 8.7 最多为“阻塞/待前置收敛”（沿用项目 WBS 的状态规范），绝不标为“已完成”。提交并推送专属分支，创建/更新 Draft PR，不 merge。

### Gate 1 — 只读核验和复用规划（B 可独立做）

- 仅**读取** PR #426 的 Diff、Result、QA、`AiConversationV1/AiTurnV1/AiMessageV1/AiContentBlockV1` 与 Orchestrator/SSE 服务边界，生成逐字段/逐职责 REUSE / EXTEND / OPEN / CONFLICT 矩阵。
- 明确 6.2 六个名词各自的权威字段、归属、持久化生命周期及 Tool/Citation 是否属于 DB 主数据还是独立审计/显示投影；未冻结字段标记 `OPEN_DECISION`，不自行推断。
- 记录 #426 针对最新 `develop` 的冲突文件、回归结果和最小兼容集成建议。在**全新隔离的审计 worktree** 可尝试本地试集成，但不 push、merge、改写/force push A 分支；遇到有损更改即停止。
- 若无 A 时间，由项目负责人**明确授权** B 代办 TASK-077-A 的集成/验收，然后用单独任务/PR 完成；WBS 8.7 本身不是对 #426 的合并授权。

### Gate 2 — 已接受上游会话契约

继续 WBS 8.7 的充分条件：
- (a) TASK-077-A #426 或被接受的替代实现 **已经合入 develop**；或者项目负责人明确批准、冻结兼容契约并书面授权在分支上以其为前置，注明相应集成风险。
- (b) 6.2 的逐字段持久化契约（Conversation、Turn、Message、Block、Tool、Citation）可找到**明确权威文件、版本、字段和兼容处理**，缺口通过获批的补充契约解决；仅引用 WBS 行不算满足。
- (c) 8.7 Schema 所需的 owner、删除/保留、认证/RLS、幂等/序列、事务/错误处理明确且可测试。

**任一未满足：保持 BLOCKED，只做规划/测试，不编造新模型。**

### Gate 3 — 重新实施 8.7（满足 Gate 2 后）

- 从当时最新 `develop` 和已接受会话契约执行最小迁移、repository/service、增量映射、事务/幂等/鉴权，复用既有 Runtime；不得创建第二套 Conversation 类型或历史来源。
- 完成持久化创建→追加→查询→恢复→删除与安全/性能/迁移回归证据。
- **8.7 输出权威持久化源及未来安全 reader 接口契约；8.8 才把该源关联到 6.14 个人中心 UI。** 8.7 不应直接将 6.14 production reader 改为返回真实历史。
- 单独 Draft PR、人工验收、禁止自动 merge；完成状态必须以合并/验收和证据为准。

## 本轮给 Codex 的执行命令

按 WBS 8.7 的 BLOCKED 纪律继续，但**只执行 Gate 0 + Gate 1 的只读审计**：保存基线回归及 BLOCKED RESULT，审计 PR #426 的已实现契约、冲突与差距；不得新建 AI 持久化 Schema/Service，不得复制或 cherry-pick PR #426 的未经验收代码，不得修改 A 的分支，不得更改 6.14 production reader，不得自动合并。最终给出可解除阻塞的最小决策清单与 Draft PR，并停止，等待上游审查/授权。
