# TASK-WBS-8.7-B — AI 会话主系统存储策略（B 代 A 执行）

- 日期：2026-10-08
- 仓库：kanzakimy0/TravelAssist
- WBS：8.7；原 Owner A，本任务执行 Owner B（临时代办，不自动改变 WBS 原归属）
- 优先级：P2
- 状态：READY / 待 Codex 执行；不得将“任务发布”视为“功能完成”
- Base：执行时获取最新 develop 的确切 SHA，记录于结果
- 依赖：6.2 已完成（Conversation / Turn / Message / Block / Tool / Citation 模型冻结）；8.1 已完成（DB/ORM/Migration）；8.2、8.5、8.6 已完成；6.14 已完成（个人 AI 历史只读投影）
- 后续：8.8 个人 AI 历史关联仍未开始，须另行验收

## 目标

在**不建立第二套 AI 会话模型**的条件下，确认并完成主系统 AI 会话的持久化策略，实现可审计、可恢复、按用户隔离的会话读写闭环。以现有 6.2 对话结构及既有 Auth/DB/ORM/Migration/AI Runtime 契约为唯一事实来源，不改写已冻结模型，不把 6.14 的个人历史投影当作主存储。

## 执行纪律

1. 先检查工作树；有未提交/未追踪变更立即停止并报告，不得擅自清理、stash、覆盖。
2. 获取远端最新 develop，核验 WBS 与相关 schema/migration/接口/测试；记录确切 SHA。先形成“现状盘点 + 差距表”，标记 REUSE/EXTEND/NO-CHANGE/BLOCKED，禁止仅凭任务描述创建重复表或服务。
3. 发现既有 6.2 冻结契约、6.14 只读投影或 A 的 AI Runtime 现有行为需要破坏性修改时，停止该部分并提出兼容方案；不得擅自改变 A 的接口。
4. 在 B 独立工作分支实施，限定 8.7 存储边界；不碰 POI/Transport/Planner 自动变更、偏好匹配评分、计费或 8.8 UI；不提交凭据或真实会话内容。
5. 仅提交分支，创建 Draft PR 供审查，禁止自动 merge/auto-merge，禁止直接写 develop。WBS 的“已完成”只在 PR 经用户验收与合并后更新。

## 工作包

### P0 — 数据模型与策略（必须）

- 根据 6.2 盘点 Conversation、Turn、Message、Block、Tool、Citation 的既存类型、关联键、顺序、状态与版本；列明存储/不存储字段及理由。
- 明确 tenant/user 归属、anonymous/登录边界（按现有契约）、会话 ID、turn/message/block ID、顺序、时间戳、幂等键、会话状态、软删除/硬删除；复用已有规范。
- 决策 source of truth：主系统 DB 持久化为权威，缓存/客户端本地仅加速或草稿，不可作为另一份权威；如果当前架构已有不同决策，保留并说明冲突。
- 隐私与生命周期：最小持久化、工具参数及结果的脱敏/白名单、敏感信息过滤、删除级联、保留周期可配置；**不能自行发明合规保留天数**，未定策略采用显式配置/待决策并保证安全默认值。
- Schema 变更仅允许增量、可重复、安全迁移；明确向前/向后兼容、索引、外键、RLS/服务端 auth 的实际防线。

### P1 — 主系统持久化闭环（在现有边界内实现）

- 基于现有服务/仓储接口完成创建会话、追加 turn/message/block、更新状态、按 owner 查询列表与详情、分页、恢复、删除或软删除；避免新建第二套公共 API。
- 写入具备事务原子性、服务端 owner 检查、稳定排序、重复请求幂等、防跨用户读取与写入；失败时不得落下半截会话或重复消息。
- 保持 6.2 会话模型与存储 DTO 的可逆映射；结构化 Tool/Citation 引用一致性；必要时引入版本字段及兼容读取旧数据方案。
- 与现有 AI Runtime 仅做已定义的安全接线；若运行时写入入口不属于现有 8.7 边界，给出接口契约和后续任务，不伪称已完成端到端。
- 6.14 个人 AI 历史只读投影的查询来源必须可说明；不擅自写 8.8 关联，不修改个人中心的公开行为。

### P2 — 测试与性能

- 单元/集成测试：空会话、正常多轮、复杂 blocks/tool/citation、分页排序、幂等重试、事务回滚、迁移兼容、删除级联、并发写入冲突。
- 安全测试：未认证、跨用户读取/写入/删除、伪造 owner_id、服务端授权绕过、RLS（如现有 DB 使用）以及日志脱敏。
- 性能：会话列表和详情查询的索引与查询计划；大会话分页边界；不编造 benchmark 数值。
- 运行仓库现有 lint/typecheck/tests/build/migration/Quality Gate，逐项报告实际命令与结果；既有失败要与基线分离。

## 验收标准

- [ ] 6.2 模型对应关系逐字段记录且没有第二套权威模型。
- [ ] 主系统数据存储策略文档完整，列出字段、归属、保留/删除、权限、迁移与兼容性。
- [ ] DB/schema/migration 与既有实现兼容，可从空库重建，升级路径经测试验证。
- [ ] 真实持久化创建→追加→查询→恢复→删除闭环成立；若因外部依赖无法实现，明确 BLOCKED，不得自报 PASS。
- [ ] 幂等、事务、并发和跨用户隔离测试通过；无真实敏感数据进入代码/日志/CI。
- [ ] 6.14 只读投影回归通过，8.8 保持原状态。
- [ ] lint/typecheck/相关测试/必要的全仓 Quality Gate 有确切证据；Draft PR 不自动合并。
- [ ] docs/tasks/RESULT-TASK-WBS-8.7-B-ai-conversation-storage.md 与 docs/qa/TASK-WBS-8.7-B/ 机器审计证据齐全；WBS 8.7 仅可先标“进行中”，最终由用户验收决定完成。

## 交付物

1. 主存储策略设计书（推荐 docs/architecture/ai-conversation-storage-strategy.md，若已有同等文档则扩展原文件）。
2. 最小必要 schema/migration/repository/service/接口映射与测试。
3. 现状盘点差距矩阵、RLS/认证证据、迁移证明、测试矩阵、端到端证据。
4. RESULT 文件，列明 base SHA、最终 head SHA、分支、Draft PR、变更清单、测试结果、已知风险、BLOCKED 项与明确的 8.8 后续边界。

## Codex 可直接执行的指令

请在 TravelAssist 仓库执行 docs/tasks/TASK-WBS-8.7-B-ai-conversation-storage.md（WBS 8.7，B 代 A）。首先检查工作树是否干净，再同步最新 develop，盘点 6.2、8.1、6.14 和现有 AI Runtime/DB/ORM；严格遵循任务的范围、实现、迁移、安全、测试和验收标准。使用独立分支，形成 RESULT 和 QA 证据，推送 Draft PR；禁止自动合并。如有冻结契约冲突、工作树不干净或核心前置缺失，停下来明确 BLOCKED，不能用空实现替代。
