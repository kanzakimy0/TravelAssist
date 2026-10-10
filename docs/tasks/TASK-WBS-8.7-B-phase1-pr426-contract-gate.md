# TASK — WBS 8.7-B Phase 1: PR #426 复用审计与 6.2 持久化契约提案

**日期**：2026-10-08  
**项目**：TravelAssist  
**WBS 关联**：6.2（AI 对话消息模型）、8.7（AI 会话主系统存储策略）、后续 8.8（个人 AI 历史关联）  
**Canonical Owner**：A（不变）  
**本阶段执行人**：B（经 A 确认代为执行审计、兼容集成准备及后续存储工作）  
**当前状态**：WBS 8.7 = **BLOCKED_UPSTREAM_PERSISTENCE_CONTRACT**；本任务 Phase 1 = **READY**  
**任务文档发布位置**：[Draft PR #469](https://github.com/kanzakimy0/TravelAssist/pull/469)；不代表功能实现或验收  
**上游 PR**：[Draft PR #426](https://github.com/kanzakimy0/TravelAssist/pull/426)，原分支 `codex/a-ai-conversation-orchestrator`

## 0. A 侧授权及不可逾越边界

A 于 2026-10-08 确认：

- **保留 #426**。B 可在**独立分支**审计、提出兼容修复、完成回归与集成，并在 6.2 持久化契约获批后实施 WBS 8.7；A 仍是 Canonical Owner。
- 不覆盖、改写、force-push、rebase 或删除 A 原分支与历史成果。合并任何 PR 仍需用户明确授权。
- WBS 6.2 已完成的“规格冻结”记录**不能代替**正式存储逐字段契约审批。
- **执行顺序锁定**：只读审计与冲突清单 → 版本化契约增量提案及审核 → Runtime 兼容集成与 8.7 持久化 → 单独推进 8.8。
- WBS 8.7 在权威持久化契约获批前一直保持 BLOCKED。仅修复 #426 合并冲突不解锁数据库 Schema。
- WBS 6.14 的个人历史 `source-adapter.ts` 是只读展示投影；`production-reader.ts` 暂时返回 `unavailable` 是预期行为。不得为 8.8 另建身份或存储源。

## 1. 事实基线（执行时必须重新核验）

2026-10-08 仓库核查：

- `develop` HEAD = `8f60c8b94d3f5148abeb414d0d8e209e5d736cea`；
- PR #426 HEAD = `97a53d5f1fc1fdb5c2c445103fc4c0173be9aca1`；
- #426 = Draft / Open / Unmerged，GitHub `mergeable_state=dirty`。**未拿到实际冲突文件清单前，绝不声称某具体文件有冲突**。
- #426 已有 `src/shared/contracts/ai-conversation/{index,runtime}.ts`、`src/server/ai/conversation/*`、Orchestrator、Tool Router、SSE、UI；`AiConversationV1.persistence` 当前仅 `session_only`，Block 为 `text | tool_summary`，不是持久化完整六对象模型。
- `develop` 现有 `src/server/ai/contracts.ts` 仅包含 foundation 级的 AI Provider / text input-output 契约；个人历史 production reader 返回 unavailable。
- 8.1 的 DB/ORM/Migration 规范已存在，不允许本阶段跳过模型 Gate 去写迁移。

这些 SHA 只是审计起点，不是执行时永远固定的分支 HEAD；报告必须另记**执行时最新** `origin/develop` 和 `origin/codex/a-ai-conversation-orchestrator`。

## 2. 本轮唯一目标

产出可供 A/用户审核的 **#426 复用及冲突实证清单 + WBS 6.2 持久化契约 v1 提案**，使下一轮 Codex 不必盲目猜测 Conversation / Turn / Message / Block / Tool / Citation 的正式存储字段和服务边界。

**本轮不实现 Schema、Migration、持久化 repository/service，也不把未合并的 #426 当作 develop 已接受契约。**

## 3. 执行过程与门禁

### Gate A — 干净独立工作环境

1. 在**新 clone / 全新隔离 worktree** 上执行。原 TASK-075 污染工作树、#426 原分支以及任何已有任务工作树完全不碰。
2. 先记录 `git status --short`、`git branch --show-current`、`git rev-parse HEAD`。若有不属于本任务的 modified/untracked 文件，立即停止报告，不自动 `stash`、`reset`、`clean`。
3. `git fetch origin --prune`，记录 `origin/develop`、`origin/codex/a-ai-conversation-orchestrator` 的 exact SHA 和 `git merge-base`；从执行时最新 `origin/develop` 建立 **B 专属** `codex/b-wbs-8-7-phase1-contract-review`（若已有同名活动分支则停止核对，绝不覆盖）。
4. 先读取本文、原 `TASK-WBS-8.7-B-ai-conversation-storage.md`、`AMENDMENT-TASK-WBS-8.7-B-unblock-conversation-contract.md`；文档只在 #469 分支上的，可**仅读取或拷入本任务分支**，不 merge 整个文档分支导致无关改动。

### Gate B — #426 只读事实审计与冲突清单

读取至少：

- `AGENTS.md` 和 `docs/project/WBS-TravelAssist.md`；
- `docs/tasks/{TASK-077-a-ai-conversation-orchestrator.md,RESULT-TASK-077-a-ai-conversation-orchestrator.md}`；
- `docs/design/{ai-orchestrator-tool-router-context-builder.md,ai-planner-realtime-final-architecture-freeze-and-implementation-order.md}`；
- PR #426 的完整 changed file list、源码与测试；
- `develop` 的 `src/server/ai/contracts.ts`、现有 Auth/DB/Migration 规范、6.14 `source-adapter.ts` 与 `production-reader.ts`。

严格区分：`develop` 已合并事实、#426 待审查实现、设计提案/尚缺决策。

产出 `docs/qa/TASK-WBS-8.7-B/PR-426-REUSE-CONFLICT-MATRIX.md`，逐文件记录：

- 路径、源头 SHA、职责、REUSE / EXTEND / NO-CHANGE / OPEN / CONFLICT、是否需要迁移；
- 对比当前 develop 的差异；**真实 git 合并冲突**单列文件名、冲突区间、两侧语义与推荐处理；
- **非文本 Git 冲突的语义/接口不兼容**单列，不把“文件都没冲突”视为可集成；
- 与 TASK-076/077 AI Runtime、6.14、WBS 8.1 既有规范的回归风险和保留边界。

可以使用 `git merge-tree --write-tree` 等不修改当前工作树的方式查看冲突。如工具版本不支持，仅在**另建临时且确定干净的隔离审计环境**作试合并；禁止向远端提交、推送或修改 A 原分支。对冲突原因不确定须显式 UNKNOWN。

### Gate C — 6.2 权威持久化契约增量 **提案，不冻结**

提交提案文档 `docs/architecture/ai-conversation-persistence-contract-v1-proposal.md`。不得把 `proposal` 冒充已审核的正式契约。该文档须包含：

1. **逐字段矩阵**：Conversation / Turn / Message / Content Block / Tool Call/Result / Citation 六类对象的 canonical ID、引用关系、schema version、creator/owner/tenant (若项目已有)、关联 trip（如适用）、时间戳、不可变/可变字段、可见性、数据来源与权威模块；明确哪些字段来自 #426，哪些仍待决策。
2. **持久化边界**：权威 DB/Repository/Service 与 session-only SSE/UI projection 的关系；不改变 #426 的事件权限和 provider 封装；不让客户端自报 `userId` 生效。
3. **行为语义**：ordered sequence、异常重试/同一事件重复回放、turn cancelled / failed / partial output 与最终归档、conversation reopen、并发、事务、幂等键作用域与 conflict 返回、恢复一致性。
4. **权限/隐私**：actor-scoped read/write/delete、系统角色和工具原始内容不得泄露、Citation 只允许安全展示字段、保留/删除及级联、log redaction、可选保留配置；保留期限和新增策略若未批准，标 `OPEN_DECISION`，**不得发明合规天数**。
5. **版本兼容**：`AiConversationV1.persistence="session_only"` 的向后兼容、序列化/反序列化方案、未来 migration/upcast 策略、旧浏览器事件兼容、6.14 `PersonalAiHistorySourceRecordV1` 投影所需明确字段。
6. **可选择的实施方案**（如两案）：比较最小兼容增量与破坏性重构，不得在本轮擅定破坏性方案。附契约验收用例清单、开放问题、建议的选定方案及影响。
7. 明确 `Tool` 与 `Citation` 如何满足 WBS 6.2 的身份和关系语义；如后续分层为独立审计/显示投影，须说明权威源、不丢失可追溯性且不得再建第二套 canonical identity。

每个 `OPEN_DECISION` 必须有决策问题、推荐默认、A/用户需要确认的具体选项及变更影响。

### Gate D — Baseline QA / 保存 BLOCKED

- 运行实际能在现有 `develop` 上跑的 AI Runtime（TASK-076）与 6.14 历史投影回归，记录准确命令、计数、输出位置和 SHA。无法跑的测试明确 `NOT_RUN` 并解释，不能填 PASS。
- 可运行文档/lint 检查。**不因 #426 PR 历史测试 PASS 而声称其对最新 develop 通过**。
- 产出 `docs/qa/TASK-WBS-8.7-B/PR-426-BASELINE-EVIDENCE.md`、必要机器可读 JSON；敏感信息不得包含在报告中。
- 产出 `docs/tasks/RESULT-TASK-WBS-8.7-B-phase1-contract-review.md`，状态为 `CONTRACT_REVIEW_REQUIRED / WBS_8_7_BLOCKED`，包括 exact HEAD、PR、审计结果、测试事实、风险、开放决策与下一阶段 Gate。
- WBS 8.7 保持 BLOCKED；6.2 原始责任人 A 不变；8.8 未开始，6.14 production reader 不变。

### Gate E — 仅发布审批件

- 仅在 B 独立分支提交以上审计/提案/证据/Result，以及必要的准确 WBS 状态更正；
- 推送并创建 **一个 Draft PR → develop**，标题明确 `WBS 8.7 Phase 1: #426 audit + persistence contract PROPOSAL (no Schema)`；
- 禁止自动 merge、auto-merge、提交到 develop 或合并 #426；
- 发布后 STOP：请 A/用户审核并明确冻结契约版本、身份关系、Tool/Citation、保留/删除和幂等行为；**未经审核，不执行 Phase 2**。

## 4. Phase 1 验收清单

- [ ] A 原 #426 分支和任务历史完全未改动；
- [ ] 实际合并冲突文件 / 非文本兼容风险分别有证据；
- [ ] #426 运行时可复用清单有路径 + SHA + 处理方式；
- [ ] 六类对象逐字段契约草案及关键状态/权限/保留语义完整，无假装冻结；
- [ ] 每个未决点均具备清晰的可审核选项；
- [ ] AI Runtime 和 6.14 基线结果有实际证据；
- [ ] RESULT + QA + Draft PR 齐全，且 WBS 8.7 仍 BLOCKED；
- [ ] **没有任何数据库 Schema/Migration/持久化业务实现**。

## 5. Phase 2（将来，仅批准后启动）

条件：**权威 6.2 持久化增量契约获得 A/用户明确确认并固定版本/commit**，且 #426 的兼容方案获认可。届时另发 TASK/阶段授权，让 B：

- 在独立分支复用/修复 #426，运行完整回归并提交 Draft PR；
- 实施 WBS 8.7 的最小增量 Schema/Migration/Repository/Service、安全认证、幂等、恢复/删除等，接受运行验收；
- 维持 #426 原分支、6.14 只读 UI 行为，8.8 只在 8.7 通过后独立启动。

**不能以 #426 冲突修复完毕，替代持久化契约审批。**

## 6. 给 Codex 的本轮指令

请执行 `docs/tasks/TASK-WBS-8.7-B-phase1-pr426-contract-gate.md`。A 已授权 B 在独立分支审计并未来代办 #426 集成，但本轮 **只执行 Gate A–E**：新干净工作环境、实际冲突分析、6.2 持久化契约 v1 proposal、AI Runtime/6.14 baseline、证据与 RESULT、Draft PR。**契约审核前禁止 Schema/Migration/持久化 Service、禁止更改 A 原分支、禁止直接合并 #426 或 develop，最后停在 REVIEW_REQUIRED。**
