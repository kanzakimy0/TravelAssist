# WBS 6.2 AI Conversation 持久化契约 v1 — PROPOSAL

状态：**PROPOSAL / CONTRACT_REVIEW_REQUIRED**。Canonical Owner：**A**；本轮执行：B。提案标识 `ai-conversation-persistence/1.0-proposal.1`，不是获批版本。全部新增字段和行为须经 A/用户确认 D01–D12 后才可进入 Phase 2；本文件不创建 TypeScript 契约、SQL 或公共 API。

## 1. 证据与唯一权威

- 已合并基线 D：`8f60c8b94d3f5148abeb414d0d8e209e5d736cea`。
- 待审查来源 U：PR #426 / `97a53d5f1fc1fdb5c2c445103fc4c0173be9aca1`。以下 U 字段均来自该提交 `src/shared/contracts/ai-conversation/index.ts`，Tool 内部字段另见 `src/server/ai/conversation/model.ts` 和 `src/server/ai/tools/registry.ts`。
- U 只实现 session-only Conversation/Turn/Message、text/tool_summary block、工具调用 transcript 和 SSE。没有 canonical Citation；不能从 WBS “规格冻结”推导其数据库结构。
- D 的 `src/server/ai/contracts.ts` 是 foundation 文本 Provider 边界；D 的 6.14 `source-adapter.ts` 是只读展示桥接，不是六对象模型。
- 审计细节及每文件 blob SHA：[复用/冲突矩阵](../qa/TASK-WBS-8.7-B/PR-426-REUSE-CONFLICT-MATRIX.md)、[机器证据](../qa/TASK-WBS-8.7-B/phase1-evidence.json)。

推荐由同一个 Conversation Service 管理六对象身份；未来 DB 是持久化权威，Repository 是其存取实现，SSE/浏览器和 6.14 都是投影。不得另建 history Conversation、另发 message ID，或把浏览器文本数组存成并列权威。Auth 用户与 Trip 继续由既有模块负责。SQL migration 继续是唯一 Schema 历史，Drizzle 仅映射查询；generated types 必须真实生成。任何表布局仍须 Phase 2 审核。

## 2. 字段矩阵读法

`U`=上游 PR 已存在但未获 develop 接纳；`P`=本提案新增/收敛，**待决策**；`D`=已合并的外部权威。`I`=创建后不可变；`M`=只能由服务按状态/版本规则修改；`N`=不持久化。类型是逻辑类型，不预定 SQL 类型。所有 P 字段由括号中的 Dxx 控制，不因写入本表而冻结。

六对象共有 `schemaVersion`：建议独立存储 envelope 版本，不改旧 wire `contractVersion: "1.0"`；由 Conversation Service 验证，I，未知主版本拒绝写入。owner 只在 Conversation 权威记录一次，子对象通过父链继承，不能接收客户端 owner。若物理层为索引/RLS 冗余 owner，必须约束与父一致，不能成为第二份事实。

### 2.1 Conversation

| 字段            | 来源、缺口                                | 建议类型/归属与约束                                                                                             | 生命周期/可见性            |
| --------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------- |
| contractVersion | U 固定 1.0                                | 保留 legacy wire 版本；不拿它代替 storage schemaVersion (D01)                                                   | I / wire                   |
| schemaVersion   | P (D01)                                   | 版本化 envelope；所有子对象明确同版或独立已注册 upcast                                                          | I / server                 |
| id              | U string，允许客户端提供；生成器默认 UUID | canonical ID 同名复用；新 durable ID 由服务生成 UUID；现有服务颁发 opaque ID 保留，任意客户端 ID 不能认领 (D02) | I / owner 可见             |
| persistence     | U 仅 session_only                         | 旧 DTO 保持原字面量；durable 能力在独立 envelope 显式协商，不能原地扩旧 union (D01)                             | I / 能力元数据             |
| ownerUserId     | P，D Auth userId                          | 认证后的服务端用户；创建时设置且不可转移 (D03)                                                                  | I / server，非公开历史 DTO |
| createdByUserId | P (D03)                                   | v1 必须等于 ownerUserId，不开放代用户写入                                                                       | I / server                 |
| tenantId        | U 无；D 无会话租户契约                    | 不新增 tenant 字段、不接受客户端 tenant；未来组织模型另审 (D03)                                                 | N                          |
| tripId          | U 无                                      | v1 默认无关联；若批准可选关联，必须引用既有 Trip 且每次授权；不得创建 AI Trip (D03)                             | 默认 N；非公开授权凭证     |
| createdAt       | P (D04)                                   | 服务首次成功创建时间 UTC；空会话也具备                                                                          | I / owner                  |
| updatedAt       | P (D04)                                   | 最近持久化变更时间；不代替排序序号                                                                              | M / owner                  |
| lastActivityAt  | P (D04)                                   | 已提交可见活动的时间；状态维护不伪造聊天活动                                                                    | M / owner，6.14 投影源     |
| visibleTitle    | P (D10)                                   | nullable；只允许经脱敏的显示标题，默认 null，不保存隐藏摘要                                                     | M / owner                  |
| status          | P (D06)                                   | active / archived；deletedAt 单独表达软删除，不重复 deleted 状态                                                | M / owner                  |
| revision        | P (D05)                                   | 每次提交递增；并发比较与恢复快照标识                                                                            | M / server+owner cursor    |
| deletedAt       | P (D09)                                   | nullable UTC；只有批准软删除方案才启用；默认不得自行设置保留期                                                  | M / server                 |
| expiresAt       | P (D09)                                   | 从已批准 retention 配置计算；未配置不得启用 durable 写入                                                        | M / server                 |
| turns           | U ordered array                           | 按 canonical turnSequence 查询组装，非第二份 aggregate 快照 (D04)                                               | 派生 / owner               |
| messages        | U ordered array                           | 按 canonical messageSequence 查询组装；不得信任请求 history (D04)                                               | 派生 / owner               |

### 2.2 Turn

| 字段               | 来源、缺口                             | 建议类型/关系/权威                                                                          | 生命周期/可见性         |
| ------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------- |
| contractVersion    | U 1.0                                  | 保持 legacy wire (D01)                                                                      | I / wire                |
| schemaVersion      | P (D01)                                | 共同 envelope 规则                                                                          | I / server              |
| id                 | U，服务 makeId                         | 保留服务颁发 turn ID (D02)                                                                  | I / owner               |
| conversationId     | U                                      | 指向同 owner Conversation，跨父引用拒绝                                                     | I / owner               |
| turnSequence       | P (D04)                                | Conversation 内服务分配递增整数，不靠时间排序                                               | I / server+owner        |
| status             | U running/completed/error              | legacy 原样投影；durable terminal outcome 另字段承载，不能直接加旧客户端不认识的 enum (D06) | M / owner               |
| outcome            | P (D06)                                | null / completed / failed / cancelled；terminal 后不可改写                                  | M 至 terminal / owner   |
| userMessageId      | U                                      | 指向同一 Turn 的 user message；创建原子提交                                                 | I / owner               |
| assistantMessageId | U                                      | 服务先预留 ID，running 可有空 assistant shell，不能把预留当 completed                       | I / owner               |
| traceId            | U 服务生成                             | 仅关联追踪，不具授权效力                                                                    | I / server；不送 6.14   |
| correlationId      | U 客户端或服务生成                     | 非幂等键、非 owner，沿用 bounded ID                                                         | I / server；不送 6.14   |
| startedAt          | U                                      | 服务开始时间；首次写入固定                                                                  | I / owner               |
| completedAt        | U nullable                             | durable 终态时固定；取消/失败也有终止时间，legacy status 映射单独定义 (D06)                 | M 一次 / owner          |
| outputCompleteness | P (D06)                                | none / partial / complete；失败不伪称 complete                                              | M 至 terminal / owner   |
| terminalReasonCode | P (D06)                                | 安全枚举，不能放原始异常；cancelled/client_disconnected 等需审核                            | M 一次 / owner 安全摘要 |
| lastEventSequence  | P (D04,D05)                            | 已提交的 turn 内 event high-water；原子随内容提交                                           | M / server              |
| createRequestKey   | P (D05)                                | owner+conversation+operation 下 opaque 幂等键；非 correlationId                             | I / server              |
| requestDigest      | P (D05,D08)                            | 规范化请求的服务端 keyed digest，检测同键异载荷；不进入日志                                 | I / server              |
| usage              | U turn.completed event 有、Turn 本体无 | 只收已归一化 input/output/cached tokens、toolCalls、toolRounds；可空，不推断缺失计费 (D08)  | M 至 terminal / server  |

子对象 owner/creator 通过 Conversation/Turn 父链确定，tenant/trip 不复制。reopen 不复用 terminal turn ID；重试若产生新运算必须新 turn，必要关联 `retryOfTurnId` 为未来扩展，v1 不隐式产生。

### 2.3 Message

| 字段            | 来源、缺口                             | 建议类型/关系/权威                                                                 | 生命周期/可见性       |
| --------------- | -------------------------------------- | ---------------------------------------------------------------------------------- | --------------------- |
| contractVersion | U 1.0                                  | legacy wire 保持                                                                   | I / wire              |
| schemaVersion   | P (D01)                                | 共同规则                                                                           | I / server            |
| id              | U 服务 ID；UI user 行另用 local-user-* | canonical ID 必须采用服务 userMessage.id；local-user-* 只作临时 UI key (D02)       | I / owner             |
| conversationId  | P (D02)                                | 父 Conversation，与 turn 父一致                                                    | I / server+owner      |
| turnId          | P (D02)                                | 父 Turn；匹配其 user/assistantMessageId                                            | I / server+owner      |
| messageSequence | P (D04)                                | conversation 内稳定总序；服务分配                                                  | I / server+owner      |
| role            | U user/assistant                       | v1 仅此二类；不把 system/developer/tool transcript 插入 visible message (D08)      | I / owner             |
| createdAt       | U；delta reducer 会重建时间            | durable 固定首次创建时间，不随 delta 或恢复改变 (D04)                              | I / owner             |
| updatedAt       | P (D04)                                | 最近合法内容提交时间                                                               | M 至终态 / server     |
| visibility      | P (D08)                                | user_visible 或 internal；v1 message 仅前者，未来未知值默认隐藏                    | I / 授权后过滤        |
| completeness    | P (D06)                                | none/partial/complete，受 Turn 状态约束                                            | M 至 terminal / owner |
| blocks          | U ordered array                        | 由 canonical block ID+blockSequence 组装；顺序稳定，不能以数组覆盖丢身份 (D04,D07) | 派生 / 按 visibility  |

### 2.4 Content Block

| 字段          | 来源、缺口                      | 建议类型/关系/权威                                                   | 生命周期/可见性              |
| ------------- | ------------------------------- | -------------------------------------------------------------------- | ---------------------------- |
| type          | U text / tool_summary           | 保留；citation 只能在新能力 envelope 中显式协商 (D01,D07)            | I / owner 安全投影           |
| text          | U text variant                  | bounded plain text；最小化/敏感过滤后保留；显示时继续 React escaping | M 仅非 terminal text / owner |
| toolName      | U tool_summary variant          | 必须从关联工具定义导出，不能凭名字反推唯一 call                      | I / owner 安全摘要           |
| status        | U summary completed/unavailable | 由关联执行结果投影，不等价所有内部失败细类                           | M 至 terminal / owner        |
| schemaVersion | P (D01)                         | 共同规则                                                             | I / server                   |
| id            | P (D02,D07)                     | 服务预分配 block canonical ID；不以 text 哈希当身份                  | I / owner 或 server          |
| messageId     | P (D02)                         | 同 turn Message，父链限定 owner                                      | I / server+owner             |
| blockSequence | P (D04)                         | Message 内稳定整数；final assembly 沿用先前 block ID                 | I / owner                    |
| createdAt     | P (D04)                         | 服务首次创建时间                                                     | I / server                   |
| updatedAt     | P (D04)                         | 合法增量最后提交时间                                                 | M 至终态 / server            |
| visibility    | P (D08)                         | user_visible/internal；未知类型默认不展示且标 omission               | I / server                   |
| toolCallRef   | P (D07)                         | 对 tool_summary 必填 canonical (turnId, callId)，不能只用 toolName   | I / server，旧 wire 不扩字段 |
| citationRefs  | P (D07)                         | 有序 canonical citation ID 列表；引用与父 conversation 一致          | 终态前受控 / 仅安全展示      |

### 2.5 Tool Call / Result（一个调用身份，两种关联记录）

| 字段           | 来源、缺口                                       | 建议类型/关系/权威                                                                                | 生命周期/可见性          |
| -------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------ |
| callId         | U model/tool transcript 与 SSE toolCallId        | canonical 身份建议 `(turnId, callId)`，原 provider callId 原值保留；不能每次投影再发一套 ID (D07) | I / server               |
| turnId         | U SSE base，transcript 无                        | 关联 Turn；同 turn 重复 callId 拒绝，跨 turn 同 callId 不碰撞                                     | I / server               |
| conversationId | U SSE base                                       | 从 turn 父链导出，不能独立改 owner                                                                | I / server               |
| schemaVersion  | P (D01)                                          | 共同规则                                                                                          | I / server               |
| name           | U call.name / result.name / toolName             | 来自白名单 Registry，非客户端选权                                                                 | I / safe label 可展示    |
| version        | U ToolDefinition.version=1.0.0，调用未带         | 执行时捕获 Registry 版本 (D07)                                                                    | I / server               |
| kind           | U definition read                                | v1 只能 read，禁止 action/mutation 混入                                                           | I / server               |
| arguments      | U raw string                                     | 不原样存；仅 schema 校验后 per-tool allowlist；当前 preference.get 只能 `{}` (D08)                | N 原始值                 |
| safeInput      | P (D08)                                          | 明确已批准白名单字段；缺少白名单拒绝持久化，不能任意 JSON                                         | I / server               |
| inputDigest    | P (D08)                                          | keyed digest of canonical validated input，非公开、非通用日志                                     | I / server               |
| callSequence   | P (D04)                                          | turn 内执行序号，保留事件关联                                                                     | I / server               |
| startedAt      | U tool.started.occurredAt                        | 由 Router/服务提供并固定                                                                          | I / server               |
| completedAt    | U tool.completed.occurredAt                      | 成功/失败终止时间；无事件则保持 null，不能猜造                                                    | M 一次 / server          |
| output         | U AiToolExecutionResultV1 string                 | 原始 transcript 输出不存，不给 6.14；当前内含 preference 数据                                     | N                        |
| safeResult     | P (D08)                                          | 当前仅 status/sourceRevision/sourceUpdatedAt 等批准元数据；不复制偏好值                           | M 至 terminal / server   |
| status         | U result completed/unavailable；缺少持久化中间态 | durable pending/running/completed/failed/cancelled 的映射须 D06；legacy summary 仍原二值          | M 至 terminal / 安全投影 |
| errorCode      | P，U 已有 AiToolError codes                      | 只存稳定白名单错误码，不存栈/异常体                                                               | M 一次 / server          |
| resultDigest   | P (D08)                                          | 只对已允许的 safeResult 做 keyed digest                                                           | M 一次 / server          |
| visibility     | P (D08)                                          | 工具记录 internal；用户仅见 tool_summary，不授予 raw read                                         | I / server               |

Result 以同一 `(turnId,callId)` 归属调用，最多一个终态结果；无需第二个 canonical result identity。若未来要保留重试 attempts，只增加同一调用的 attemptSequence 审计，不把它伪装成新 Tool。Provider 外部 request ID 仅为外部关联，不作为会话 ID。原始敏感工具结果被主动排除，因此本提案不承诺重建 provider transcript；可逆性只针对**获批的最小 durable DTO**。

### 2.6 Citation（U 完全缺失，所有字段待 D07/D08 审核）

| 字段              | 来源        | 建议类型/关系/权威                                                                    | 生命周期/可见性              |
| ----------------- | ----------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| schemaVersion     | P (D01)     | 共同规则                                                                              | I / server                   |
| id                | P (D02,D07) | 服务唯一 canonical citation ID，不能以 label/url 当身份                               | I / server+安全投影          |
| conversationId    | P (D07)     | 同 owner Conversation 父链                                                            | I / server                   |
| sourceToolCallRef | P (D07)     | 可空；若来自工具，必须同 conversation 的 (turnId,callId)                              | I / server                   |
| sourceKind        | P (D07)     | registered_tool / approved_internal_source；禁止任意模型 URL 自称证据                 | I / server                   |
| sourceRef         | P (D07,D08) | 权威来源模块的稳定 opaque 引用，不是复制整个来源对象                                  | I / server                   |
| label             | P (D08)     | bounded sanitized plain text；6.14 唯一展示字段                                       | I / owner                    |
| safeUrl           | P (D08)     | 默认不存；若批准，只允许可信来源 https 无凭据/敏感 query 的规范化链接，绝不自动 fetch | 默认 N；6.14 永不返回        |
| retrievedAt       | P (D04,D07) | 从权威来源接收，可空，未知不合成                                                      | I / server，非伪造 freshness |
| validUntil        | P (D07)     | 来源有明确 freshness 才存，可空                                                       | I / server                   |
| createdAt         | P (D04)     | 服务记录 Citation 时间，不代替 retrievedAt                                            | I / server                   |
| visibility        | P (D08)     | safe_label/internal；未知值隐藏                                                       | I / server                   |

关联通过 Block.citationRefs，外键/应用验证防悬空、防跨会话引用。引用多个 block 仍用同一 citation ID；若引用来源修订，创建有来源版本的新 citation，而非就地改变旧证据。Tool 审计、Citation 和展示 DTO 是同一 canonical graph 的不同视图，不是第二套对象身份。推荐先批准完整语义再决定关系表/JSONB 布局，禁止先造表后补契约。

## 3. 持久化与会话读写边界（建议，未实现）

D03 推荐：未认证请求继续走 U session-only 行为，不落库，不自动导入匿名历史。认证失败不能被当成有效 owner；durable 请求必须使用现有 server Auth 验证的 actor。Preference context 是否存在不证明拥有某个 Conversation。客户端 `userId/owner/tenant` 不得成为输入权限；现有 U exact-key parser 继续拒绝额外字段。

未来服务对 create/read/list/append/status/archive/reopen/delete 每次鉴权，未知和非本人 ID 使用一致的安全错误形状，避免泄露存在性；RLS 作为用户 DB 访问防线，Drizzle/service-role 路径仍必须显式 actor 过滤和父链验证。子对象引用必须同 owner、同 conversation、正确 turn/message。共享 Trip 权限不自动授予私人会话权限。

D01/D11 推荐：不增加第二套公开 conversation API。保留既有 `/api/ai/conversation` 的 session-only 请求与 SSE；未来获批后在该边界做显式版本/能力协商，服务内部提供存取端口，不让旧客户端开始无声持久化。具体 HTTP 读取/删除能力需同一接口家族设计审核；本阶段不宣布不存在的 endpoint 已可用。

## 4. 行为、事务、恢复与幂等（D04–D06）

- 创建空会话：owner、ID、createdAt、revision 与 create receipt 一次提交，列表允许零消息；不会因为“空”返回服务不可用。
- 开始 turn：服务验证 expectedRevision，分配 turnSequence/messageSequence/blockSequence；Turn、user Message、assistant 预留、首事件 receipt 在同一事务写入。数据库失败回滚全部；不发送假成功 SSE。
- 增量：每批内容与 eventId/sequence receipt/high-water 在同一事务；仅提交后发事件。UI delta 不是权威。恢复读取一个提交版本，terminal message、blocks、tool/citation refs 与 terminal event 同批提交，禁止半条成功消息。
- `event.sequence` 在 U 每个 Turn 从 0 开始；不能直接当 conversation 全局序号。建议 receipt 唯一域 `(conversationId,turnId,eventId)` 且 `(turnId,sequence)` 唯一。同 ID 同内容回放 no-op；同 ID 异内容或同序号异事件为 conflict；乱序有缺口不擅自拼接，读取提交的快照再恢复。
- create 幂等域 `(owner,operation,key)`；其余写入为 `(owner,conversation,operation,key)`。同 key+同规范化请求返回原 receipt/ID，不再次模型调用/插消息；同 key 异 payload 返回稳定 conflict（建议 HTTP 409），不回显摘要或内容。correlationId 不当幂等键。
- 同会话推荐最多一个 running turn；服务端行锁/乐观 revision 保障，第二个请求返回 busy/conflict。不同会话可并行。锁定顺序固定；并发删除/终态写入通过同一会话版本串行化。
- 完成：running → completed，输出 complete；失败：running → failed，保存安全 code 与 none/partial；取消：running → cancelled。终态不可接受后续 delta，重复同终态事件 no-op，矛盾终态 conflict。U abort 当前直接 return 没有 terminal event；Phase 2 必须有服务端终止/失联收敛规则，不能以浏览器“停止”当 DB 已取消证明。
- partial 输出不得拼接到下一次重试；是否保存用户可见 partial 由 D06 确认。推荐保留已提交的最小脱敏片段并明确 partial，不用于后续默认上下文。长期 running 在服务恢复时通过租约判定转 interrupted/failed；租约时长为运行配置，需批准，不发明固定数值。
- archived → active 为 owner 显式 reopen，沿用同一 conversation ID，新增 turn 继续递增。软删除 restore 与 archive reopen 分离；purged 永不恢复，旧 idempotency key 不得复活删除对象 (D09)。
- 列表采用稳定 keyset（建议 createdAt+id，固定过滤条件）；详情按 turnSequence/messageSequence/blockSequence 分页，读 snapshotRevision 和 high-water。新增内容在下一快照；禁止单纯 offset 导致重复/遗漏。时间戳平局由 canonical 序号/ID 决定，页大小和消息/事件总字节界限必须受配置上限约束 (D04,D11)。
- 不承诺外部 provider 调用的 exactly-once。服务先 claim durable request、再调用 provider、最后提交结果；崩溃后同幂等 key 返回 in-progress/已提交结果，不能盲目重调。有证据无法确定调用结果时标 interrupted 并由显式新请求重试。现有 Router 只读与轮次上限继续生效。

## 5. 隐私、保留与删除（D08/D09）

最小化持久化 user/assistant 的可见文本及结构化关系；系统提示全文、隐藏推理、原始 provider response、tool arguments/output、令牌、Cookie、用户 Profile、精确位置不进入该主存储。文本过滤覆盖凭据形式、敏感字段和受保护工具数据；无法可靠脱敏的字段拒绝或省略并记录非敏感 omission，不承诺任意自由文本都能自动识别全部 PII。存储 DTO 可逆往返不等于原始敏感输入无损往返。

日志仅允许安全 code、耗时、版本和受控关联 ID；不得打印正文、完整请求、密钥、digest 或原始异常。指标不以用户/会话高基数 ID 作标签。Citation label 纯文本显示，未知 scheme 和原始来源 URL 不传到 6.14。

**没有获批保留天数。** 推荐安全启用门槛：无明确 retention policy/config 时 durable 写入保持关闭，已有数据按已生效策略管理，不能临时改为无限保留。D09 需选择立即硬删除或带明确恢复窗口的软删除。软删先阻断读取/写入，用户恢复期及后台清除 SLA 明确后才可启用。owner 账户删除必须覆盖 Conversation→Turn→Message→Block→Tool/Result→Citation/引用→replay receipts；不影响权威 Trip/Preference。幂等 tombstone 只可保存不含正文的必要不可复活标记，保留时长也需批准；备份恢复需重放删除标记，不能声称在线级联等同备份即时擦除。

## 6. 版本、序列化、兼容与 6.14

建议方案 A：在 U 同一 contract 模块族下增加经审核的 persistence envelope 与映射；wire 1.0、事件权限、Provider 封装不变。JSON 仅允许声明字段，时间 UTC ISO8601，序号安全整数，ID 有界字符串；额外 owner/未知主版本拒绝，未来可选字段按兼容策略处理。存储读取先检查 schemaVersion，再用纯函数 upcast 到获批 DTO；往返测试保留所有允许字段、null/缺失语义、顺序和引用。

session-only 记录没有 owner/稳定 block 身份，不自动迁移或推断归属；重开浏览器不承诺找回。未来用户明确发起导入也必须另审授权和服务器重新验证，不能当已有 durable 记录。旧 schema 缺字段只能采用有依据的默认（例如 citationRefs=[] 且标无 citation 来源），不能凭 text/url 合成证据、凭时间猜 ID。未知版本不可写，保留原记录供兼容处理；schema migration 只允许增量、重放测试，不能回改旧 SQL。

旧 browser 只接受现有六个 SSE type；不向其发送 turn.cancelled/citation.created 等新 type。新 terminal outcome 与 durable capability 在显式新版本协商后使用；兼容投影可按已批准 D06 把 failed 映成 legacy error，cancelled 使用旧连接结束行为但不谎称 completed。旧客户端的 reducer 重放问题须 Phase 2 独立修复/回归；本文件不是修复证明。

未来 **8.8** 的唯一映射如下，本轮及 8.7 不改变 production reader：

| 6.14 字段                     | canonical 来源                       | 规则                                                               |
| ----------------------------- | ------------------------------------ | ------------------------------------------------------------------ |
| conversationId                | Conversation.id                      | 同一身份，授权后返回                                               |
| lastActivityAt                | Conversation.lastActivityAt          | 原源时间，可空；不以读取时间代替                                   |
| visibleTitle                  | Conversation.visibleTitle            | 安全标题或 null                                                    |
| visibleMessages[].messageId   | Message.id                           | 服务 ID，不用 local-user-*                                         |
| speaker                       | Message.role                         | 仅 user/assistant                                                  |
| sentAt                        | Message.createdAt                    | 首次创建原源时间，历史缺失可 null                                  |
| content[].plainText.text      | visible text Block.text              | 仅已批准可展示文本                                                 |
| content[].citationLabel.label | Citation.label 经 Block.citationRefs | 同一 citation 引用；不返回 URL/工具数据                            |
| hadOmissions                  | 映射过程事实                         | internal/unsupported/filtered/missing source 时 true，不能伪称完整 |

## 7. 审核选项与 OPEN_DECISION 登记

所有推荐均未生效。每项由 **A/用户**确认具体选项及版本 commit；没有默许或超时自动批准。

| ID  | 决策问题                                   | 推荐选项 / 安全默认                                                                           | 可选项及影响                                                                                   |
| --- | ------------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| D01 | 版本和模型怎样演进？                       | A：同一 canonical 模块族的增量 persistence envelope；旧 wire 1.0 不变                         | B：整体 v2 替换会破坏旧事件/parser/UI，需专项迁移。批准前无 durable 类型                       |
| D02 | ID 谁颁发、是否接纳旧 session？            | 新 durable ID 服务生成，沿用有 provenance 的服务 ID；不自动接纳 client session/local IDs      | 可另批显式 session 导入和验证协议；增加认领/冲突/隐私测试。UUID 生成不等于强改所有旧 opaque ID |
| D03 | 用户/匿名/tenant/trip 边界？               | 仅已认证 owner 持久化；anonymous session-only；无 tenant、trip 暂不关联                       | 可批准 owner 授权 Trip 关联；组织共享或匿名持久化需独立权限契约，不在默认 v1                   |
| D04 | 顺序、时间与分页依据？                     | 服务分配各级 sequence，createdAt 不变，快照+keyset                                            | 可选全局事件序列，但需更大索引/协议变更；禁止仅客户端时间/数组索引                             |
| D05 | 幂等与并发怎样裁决？                       | owner/operation/key（及 conversation）+digest receipt；单 running turn；409 conflict          | 可选多 running turn，但须定义合并次序/上下文隔离；需重新审核 lost update 与恢复用例            |
| D06 | failed/cancelled/partial/reopen 怎样保留？ | 明确 terminal outcome；保存已提交脱敏 partial 并标记；archive 可 reopen，terminal turn 不复活 | 可选失败时清除 partial 内容，需保留最小终态证据；失联租约阈值也须配置审批                      |
| D07 | Tool/Citation 身份与权威是什么？           | Tool 用 (turnId,callId)，Result 共用调用身份；Citation 服务 ID+sourceRef；Block 明确 refs     | 可选工具独立全局 ID 但必须一对一保留原 callId 映射；不得以 toolName/URL/label 当唯一身份       |
| D08 | 哪些敏感字段可存/可展示？                  | raw payload 全不存，工具 per-name allowlist，Citation label only，safeUrl 默认不存            | 扩展脱敏 safeInput/safeResult/URL 必须逐工具逐字段批准；更大隐私/保留面，不能写任意 JSON       |
| D09 | 保留期、删除/恢复及 tombstone？            | 未配置前禁用 durable 写入；建议用户删除立即硬删在线数据；不填任何天数                         | 可批准软删+恢复期、保留上限、清除 SLA、tombstone/备份策略；所有时长待用户提供，启用前必须完整  |
| D10 | 标题和可见范围？                           | nullable sanitized visibleTitle；v1 不存隐藏摘要、不扩 private role                           | 可选 owner 编辑标题（鉴权/脱敏）；自动模型摘要需另审，不能把 internal 当可见                   |
| D11 | API/旧客户端怎样兼容？                     | 复用现有 endpoint 家族、显式协商 durable 能力；旧事件不扩枚举，读取分页有上限                 | 可选统一 wire v2 与更新全部消费者；需另批准接口与旧版退役计划；本轮不实施                      |
| D12 | 何时解锁 Phase 2？                         | A/用户逐项决策并锁定契约 commit，认可 #426 恢复方案，另行授权 Phase 2                         | 可先合入已审核 runtime 再持久化；或明确授权分支前置集成；仅消除文本冲突不解锁                  |

方案比较：A 复用 #426 parser、Orchestrator、Router、SSE、UI 和身份，新增经批准的 server metadata/映射，改动较小但需补齐恢复与幂等防线。B 替换 Conversation/事件/存储的重构会造成双版本迁移及旧浏览器破坏，当前不推荐也不实施。A 仍需真正代码、数据库和端到端验收，不因是“兼容增量”免测。

## 8. 契约验收用例（Phase 2 待执行，均非本轮 PASS）

| 用例                      | 必须观察到的结果                                                                          |
| ------------------------- | ----------------------------------------------------------------------------------------- |
| 空会话及多轮              | owner 列表有空会话；append 后顺序/身份/时间稳定；跨页不漏不重                             |
| 六对象 round-trip         | 允许 DTO 序列化/读取严格等价；多个 tool/citation 引用不悬空；敏感 raw 字段被拒绝/明确省略 |
| 同键重试/同键异载荷       | 返回原 ID/receipt 且不重复运算；异载荷 conflict，不泄露原请求                             |
| 重复/乱序/迟到事件        | duplicate no-op；gap 恢复快照；terminal 后 delta 拒绝；sequence 域正确                    |
| 并发 append/delete/finish | 同会话版本串行裁决；无重复消息、复活删除或 lost update                                    |
| 事务故障注入              | 每一步失败均无半截 turn/message/block/ref/receipt；无未提交的成功事件                     |
| 取消/失败/进程崩溃        | 明确 partial/terminal；无永远 running；不假称 provider exactly-once                       |
| archive/reopen/purge      | archive 重开同一身份；purge 不恢复；删除级联到引用/receipt 且不删除 Trip                  |
| 身份攻击                  | anonymous durable、伪造 owner/tenant、跨用户 read/write/delete、跨父 refs 均拒绝          |
| 授权防线                  | 实际 RLS 与 server privileged connection 各自测越权，不能只 mock actor                    |
| 隐私与日志                | system/tool/provider/raw/秘密不出库及日志；Citation label 安全；URL 默认丢弃              |
| 迁移与 upcast             | 空库重建、旧库增量、未知版本拒绝、生成类型及 Drizzle 一致                                 |
| legacy browser            | 旧 wire 1.0 与六 SSE type 可用、session-only 不冒充 durable；provider wrapper 不绕过      |
| 6.14/8.8                  | 当前 production reader 保持 unavailable；未来单独 8.8 授权后仅按上表投影                  |
| 性能与边界                | 大会话分页/单请求字节限额有测试；真实索引/查询计划，禁止编造 benchmark                    |

审核签署位置：待 A/用户明确 D01–D12 选项、批准版本与 commit。**当前 CONTRACT_REVIEW_REQUIRED；WBS 8.7 BLOCKED；Phase 2 未开始。**
