# TASK-WBS-4.21-B — Deterministic Rule / Feasibility Engine

## Metadata

- Task ID: TASK-WBS-4.21-B
- WBS: 4.21
- Owner: B
- Status: 进行中
- Branch: `feature/b-wbs-4-21-rule-feasibility-engine`
- Base: `origin/develop@afed8292036d233b9336bcd02b8f5bd66f53037f`
- Depends On: WBS 4.20 / 4.20.1 Engine Contract；WBS 4.17 canonical Trip Plan；相关 Provider / POI / Profile 只通过公开契约消费
- Parent Contract: `docs/architecture/travelassist-engine-contract.md`

## 1. 目标

实现 TravelAssist Engine 的第一层可运行确定性规则能力：

- 规则校验（validate）
- 冲突检查（conflict detection）
- 影响预览（preview impact）
- 单景点 / 单日 / 整段 itinerary 的可行性与合理性评估

本任务不实现事务写入、数据库持久化、幂等提交、权限事务或 rollback runtime；这些属于 WBS 4.22+。

4.21 必须严格遵守 4.20 / 4.20.1 Contract，不创建第二套 Trip Plan Schema、第二套 Engine result 或 UI 私有规则。

## 2. 设计基线

开始执行前完整读取并核对：

- `docs/architecture/travelassist-engine-contract.md`
- `docs/tasks/TASK-WBS-4.20-b-travelassist-engine-contract.md`
- `docs/tasks/RESULT-WBS-4.20-b-travelassist-engine-contract.md`
- `docs/tasks/TASK-WBS-4.20.1-b-engine-contract-amendment.md`
- `docs/tasks/RESULT-WBS-4.20.1-b-engine-contract-amendment.md`
- `src/shared/contracts/trips/index.ts`
- `docs/project/WBS-TravelAssist.md`
- 当前已合入的 POI / scoring / itinerary feasibility / profile 设计；未合入内容只能作为候选参考，不能冒充 frozen baseline

若发现 4.16 / 4.17 / Provider / Profile 的依赖仍未冻结，必须 fail closed，并在 Result 中列为 dependency / unsupported，不得自行补造字段。

## 3. 本任务实现边界

### 3.1 Runtime 纯规则层

建立可单元测试的纯函数 / 纯领域模块，用于：

- 输入 authoritative canonical snapshot
- 输入 ChangeSet / Engine validation context
- 输入版本化 policy / rule / POI / profile / provider facts
- 输出符合 4.20.1 的 `assessment` / issues / impact

规则执行必须可重复、确定性、无副作用。

禁止：

- 写 DB
- 写文件作为业务状态
- 调用外部付费 Provider
- 预约 / 取消 / 支付
- 自动修改 canonical snapshot
- 依赖浏览器私有 state

### 3.2 Duration / Visit Feasibility

实现结构化 duration 检查：

- minimum duration
- recommended duration
- planned duration（优先从 canonical schedule 派生）
- visit mode / rule version / source refs

至少支持：

- `< minimum` -> `DURATION_TOO_SHORT`
- `>= minimum && < recommended` -> `COMPRESSED_VISIT`
- `>= recommended` -> duration dimension pass
- unknown / missing / conflicting profile -> `ASSESSMENT_INPUT_MISSING` 或 `ASSESSMENT_UNSUPPORTED`

不得把测试景点阈值硬编码到规则引擎；测试 fixture 必须显式提供。

### 3.3 Physical Load / Fatigue Impact

实现可插拔、版本化的负荷模型接口，但不要在本任务把用户近期讨论中的某个临时公式当永久标准。

模型至少允许消费：

- baseline physical intensity / walking
- actual/planned duration
- route / slope / stairs 等可用 context
- environment context
- party / mobility constraints 的非敏感规则输入
- prior day / current day load context（若正式可用）

必须满足：

- 同一景点 30min 与 90min 可以产生不同 impact
- `walking=7` 不能直接等于最终疲劳 7
- 缺模型或缺必要上下文时返回 unsupported / insufficient inputs + null，而不是伪造 0
- POI baseline、route walking、visit load、day fatigue 必须分层，避免重复累计

本任务可实现一个明确标注版本的 baseline rule model 供测试，但必须保留 modelRef / modelVersion，且不得声称产品阈值永久冻结。

### 3.4 Schedule / Time Conflict

复用现有 code：

- `SOFT_TIME_CONFLICT`
- `HARD_TIME_CONFLICT`

至少检查：

- item schedule overlap
- hard fixed / must-do / booking-protected 时间冲突（仅使用 canonical / trusted context 已存在的表达）
- item duration 与相邻安排之间明显不可能的时间窗口
- provider fact 缺失或过期时不得伪造 travel time

若路线时间依赖 7.5 仍不可用：

- route-sensitive rule 必须明确 unsupported / insufficient inputs
- 不得使用城市中心、0,0、地图视口或拍脑袋固定分钟数替代

### 3.5 Day Capacity

实现单日聚合 assessment，至少考虑：

- scheduled item duration
- 已知 transfer/travel time
- 必要 buffer
- meal/rest window（若政策存在）
- physical load / fatigue impact
- opening/hard schedule facts（若可信输入存在）

输出：

- `DAY_OVERLOADED`
- warning / needsConfirmation / blocked
- related item/day assessments

不得用“每个单项都通过”直接推导“当天合理”。

### 3.6 Itinerary Reasonableness

实现整段 itinerary 聚合规则框架，至少支持：

- 多日连续高负荷
- recovery / rest context
- 前后日依赖
- 跨日硬时间冲突
- 未覆盖规则的 coverage gap

输出：

- `ITINERARY_UNREASONABLE`
- reasonable / unreasonable / undetermined

不得用每日平均分、景点匹配分或单日全部通过直接推出整段合理。

## 4. 43 字段 / POI Scoring 边界

43 字段方向属于 Attraction / POI master / Profile / Rule input。

4.21 可以读取公开、版本化、已核验的数据输入，但：

- 不复制 43 字段进 ChangeSet
- 不把 POI matching score 当作 feasibility 证明
- 不把偏好匹配高分用于抵消 duration / hard schedule / physical overload
- 不修改 POI master schema ownership

Scoring 与 feasibility 必须保持两个概念：

- scoring：值不值得去 / 用户喜不喜欢
- feasibility：当前排法是否现实 / 合理 / 安全执行

## 5. Rule Engine Architecture

推荐分层（允许在不破坏仓库既有结构的前提下调整路径）：

- rule registry / capability registry
- item rule evaluators
- day aggregators
- itinerary aggregators
- evidence / source-ref normalization
- assessment aggregation
- issue severity / outcome aggregation

要求：

- 每条 rule 有稳定 ruleRef / ruleVersion
- 相同输入 + 相同规则版本 => 相同结果
- rule 不直接访问 React state / Mapbox object / provider raw response / DB row
- 规则结果必须可序列化
- 规则结果必须可回放测试

## 6. 必须实现的设计案例 / 测试

### Case A — 清水寺 30 分钟

Fixture：

- minimum = 60
- recommended = 90
- planned = 30

预期：

- `DURATION_TOO_SHORT`
- item reasonableness = unreasonable
- blocked（本测试 policy 把 minimum 设为 hard）
- 不能被较低 physical load 抵消

### Case B — 清水寺 60–89 分钟

预期：

- `COMPRESSED_VISIT`
- warning 或 needsConfirmation，按 fixture policy

### Case C — 清水寺 90 分钟

预期：

- duration dimension accepted
- overall 仍需独立检查 schedule / route / physical / day / itinerary

### Case D — 同景点 30 vs 90 分钟 physical impact

同 baseline intensity / profile：

- 输出允许不同 physical/fatigue impact
- 不能固定输出相同 walking total

### Case E — 单项通过但 Day Overloaded

多个 item individually acceptable，但总日程容量/负荷超限：

- `DAY_OVERLOADED`

### Case F — 每日局部通过但跨日恢复不足

- `ITINERARY_UNREASONABLE`

### Case G — Route Fact Missing / Expired

- 不伪造转场时间
- route-sensitive dimension 不得 all-clear

### Case H — Unknown / Missing Inputs

- `reasonableness = undetermined`
- 必要规则缺失时不能裸 `accepted`

## 7. Output / Contract Compliance

实现结果必须兼容 4.20.1 已定义的：

- assessment status
- reasonableness
- coverage
- DurationEvidence
- impacts
- sourceRefs
- reasonCodes
- issueIndexes / relatedAssessmentIds

不得重新定义与 4.20.1 冲突的字段或 outcome。

如果当前 4.20.1 仍只存在文档伪 TypeScript，4.21 可以建立 runtime types / parser，但必须：

1. 明确它们实现的是同一 Contract；
2. 不复制 canonical Trip Plan 类型；
3. 添加契约测试，防止文档与 runtime 漂移；
4. 如发现 Contract 无法实现，先记录 blocked / amendment request，不私自改协议语义。

## 8. UPDATE_DURATION

当前 `UPDATE_DURATION` 在 4.20.1 中仍 unsupported。

4.21 不得绕开该限制。

若 4.17 仍无独立 canonical visit duration：

- 保持 `UPDATE_DURATION` unsupported
- 允许 `UPDATE_TIME` schedule-derived planned duration 进入纯评估
- 不新增 Engine 私有 duration 字段

## 9. Non-goals

本 Task 不做：

- DB transaction apply
- optimistic concurrency persistence
- idempotency storage
- audit/outbox/history persistence
- rollback runtime
- auth mutation permission persistence
- booking/payment side effects
- Planner / Detail redesign
- AI generation / LLM prompt logic
- Provider live fetch
- 4.22 / 4.23 / 4.24

## 10. Validation

至少要求：

- lint
- typecheck
- build
- git diff --check
- 4.21 专项 unit tests
- deterministic replay test：同输入同版本结果一致
- contract fixture tests
- item/day/itinerary case matrix
- baseline failure 必须与当前 develop 对比，不得修改无关测试或资产来“做绿”

如果全仓存在既有 failure，必须记录：

- develop baseline
- 本分支结果
- 是否新增 failure

## 11. Tracking / Delivery

执行时：

- 创建/确认唯一 4.21 Issue
- WBS 4.21 更新为 B / 进行中
- 不覆盖其他 Task / Owner 的记录

完成时交付：

- runtime rule / feasibility implementation
- tests / fixtures
- 必要的 architecture note
- `docs/tasks/RESULT-WBS-4.21-b-rule-feasibility-engine.md`
- WBS 4.21 = B / 待审查
- Draft PR -> develop

只有用户验收并明确授权合并后，才标记 4.21 已完成。

完成后停止，不自动启动 4.22。

## 12. Result Format

Result 至少包含：

- Status
- Tracking
- Base / Branch / Commit / Draft PR
- Architecture
- Rule Registry
- Item Feasibility
- Duration
- Physical Load / Fatigue
- Schedule Conflicts
- Day Capacity
- Itinerary Reasonableness
- Contract Compliance
- Unsupported / Open Decisions
- Test Matrix
- Baseline Comparison
- Files Changed
- WBS Update
- Non-goals / Stop
