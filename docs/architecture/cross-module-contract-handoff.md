# TravelAssist 跨模块 Contract 交接规则

> WBS: `0.9`
> Owner: `B`
> Status: `Frozen / 治理规范；2026-09-10用户授权修正差异并合并`
> Issue: `#168`
> Baseline: `develop@707bcc8d2af14a86032181be63573beb3aea3e17`
> Updated: `2026-09-10`

## 1. 目的

本规范冻结 TravelAssist 中 A（旅行主系统）与 B（个人中心）之间的公开 Contract 交接方式。

核心原则：**跨模块协作依赖稳定、唯一、可版本化、可验证的公开 Contract，而不是依赖对方的私有实现。**

以下方式一律不作为正式交接机制：

- A 直接读取 B 的 Personal Center 表单状态、组件状态或私有 Store；
- B 复制 A 的 Planner Store / UI fixture 作为长期 Trip Schema；
- Consumer 引用 Producer 的 React Props / ViewModel 作为 domain model；
- 将 Map / Hotel / Payment Provider 原始响应直接暴露为共享 Schema；
- A/B 各自维护一份“看起来一样”的 TypeScript 类型；
- 为赶进度同时修改同一高冲突 Contract 文件；
- 通过 cherry-pick 对方未合入功能分支来形成事实 Contract。

---

## 2. 与 WBS 0.8 的关系

启动时0.8处于责任边界固化阶段，当前状态以最新Master WBS为准。本规范根据已经生效的 v0.4 责任原则先行冻结交接机制：

- A：网站入口、Planner、Map、Route、Trip Plan、AI 主流程；
- B：账户、Profile、Preference、Companion、Trip Library 与个人管理；
- Shared Infra / CI / Deployment 默认由 A 负责架构；
- A/B 之间只通过明确 Contract 交接。

本规范**不重新划分业务 Owner**。

如果 0.8 后续合入的新边界与本规范冲突，以最新 `develop` 为准修订 0.9；0.9 不反向覆盖 0.8。

---

## 3. 2026-09-07 历史审计与2026-09-10更新

以下3.1–3.5保留2026-09-07历史语境；“不存在”不代表今天的仓库。当前权威清单见3.6，不以旧快照阻止已完成Contract消费。

### 3.1 当前没有正式共享 Contract 层

当前 `src/` 已有：

```text
src/features/preferences/
src/features/companions/
src/features/profile/
src/features/planner/
src/features/trip-library/
src/types/
```

但：

- `src/shared/` 当前不存在；
- `src/server/` 当前不存在；
- `src/types/` 只有 `.gitkeep`；
- 当前没有 `src/shared/contracts/**` 形式的 canonical runtime Contract。

因此 WBS 0.9 **不做代码搬迁、不新建 runtime Contract、不抢跑 WBS 4.17 / 5.14 / 5.19**。

### 3.2 Preference 当前是 B 内部模型

例如 `src/features/preferences/mobility-preference-model.ts` 当前定义：

```text
MobilityPreferenceState
MobilityPreset
MobilityNotice
```

其中同时包含 UI preset、提示文案、保存/取消/恢复默认等页面行为。这些可以作为未来 B 发布 Preference Contract 的输入，但**当前文件本身不是跨模块 Contract**。

### 3.3 Planner 当前模型不是可保存 Trip Contract

`src/features/planner/model/planner-types.ts` 已明确标注：

```text
TASK-008 presentation fixtures, not a business Trip Plan / provider contract.
```

其中的：

```text
MockPlan
MockDay
MockStop
PlannerSettings
PlannerUiState
```

属于当前 Planner 展示 / UI / fixture 范围，不得被 B 直接拿来作为保存行程 Schema。

`src/features/planner/model/planner-state.ts` 也包含 `selectedDay`、`activeBottomTab`、overlay 开关等明显的 runtime/UI 状态，因此不是跨模块稳定数据面。

### 3.4 Trip Library 当前类型是 B ViewModel

`src/features/trip-library/trip-library-model.ts` 当前定义：

```text
TripLibraryViewModel
TripCardViewModel
DraftTripViewModel
HistoryTripViewModel
FavoriteViewModel
ReservationSummaryViewModel
```

这些类型用于个人中心展示与页面逻辑，属于 B 的 Consumer ViewModel。它们可以由未来 Trip Plan / Save Contract 派生，但**不得反向成为 A 的 Trip Plan 核心 Schema**。

### 3.5 Canonical location 决策

本次冻结：

1. 当前内部模型原地保留；
2. 正式跨模块 Contract 建立时使用唯一 canonical source；
3. 若无更成熟的共享路径，首选：

```text
src/shared/contracts/<domain>/
```

4. 目录真正创建应由对应 Contract WBS 执行，而不是由 0.9 提前创建空架构；
5. 若后续 A 在共享基础设施中冻结另一 canonical 路径，则以已合入 `develop` 的统一路径为准，不重复建立第二套。

---

### 3.6 最新canonical inventory与交接边界（2026-09-10）

核对基线：develop f14ac40d329d96d900a53e832ba40e8e4abe8cbd。已存在shared/server公开边界：

| 领域                     | Canonical source / Producer                                               | Consumer或adapter                                                                      | 状态 / 缺口                                                                            |
| ------------------------ | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Trip Plan / Resume v1.0  | src/shared/contracts/trips/index.ts、validation.ts、fixtures.ts；A / 4.17 | src/features/start-flow/model/trip-contract-adapter.ts；B Engine复用snapshot/parser    | 4.17已完成；Planner UI model非主Schema；5.18/5.19未完成服务接线                        |
| Route v1.0               | src/shared/contracts/routes/index.ts、validation.ts、fixtures.ts；A / 7.5 | server Route evaluation及B Engine context使用RouteResponse/validator                   | 7.5已完成；7.8开发期子集不等于生产Provider/付费/retention授权                          |
| Auth公开视图             | src/lib/auth/contracts.ts；B / 8.3                                        | src/lib/auth/home-viewer.server.ts、current-user.ts等可信服务适配，Header/账户入口消费 | 已有公共视图和可信session边界；不得传credential或客户端自报role                        |
| Engine v0.1 + assessment | src/shared/contracts/engine/index.ts；B / 4.20                            | src/server/engine/index.ts及input/context/report，输入复用4.17/7.5                     | 4.20 Frozen、4.20.1/4.21已完成；apply/rollback未实现，类型不等于API                    |
| Preference / Companion   | src/features/preferences与companions内部模型；B                           | 页面内部adapter；未来A消费正式公共包                                                   | develop无相应shared/contracts包；PR #221候选不是已发布Contract，5.14/5.17/4.18单独交接 |
| Save / Read / History    | B 5.18/5.19；A 4.19 Consumer及8.5主Schema                                 | Trip Library派生ViewModel，恢复引用4.17                                                | API/DB handoff未完成；浏览器存储或未合并PR不能冒充公共服务                             |

路径为当前唯一来源，不复制Schema或建立第二包。未来升级仍须版本、fixture和Consumer review；治理冻结不授予新业务能力。PR #169/#170是kickoff历史，最终规范以PR #171实际合并为准。

## 4. Contract 角色

### 4.1 Contract Owner / Producer

拥有业务语义，并负责发布该业务域公开 Contract 的模块 Owner。

Producer 负责：

- 字段语义；
- ID 稳定性；
- optional / null / empty 语义；
- 状态枚举语义；
- 日期、时区、金额单位；
- 版本与兼容策略；
- example / fixture；
- 变更说明、迁移说明与弃用说明。

原则：**谁拥有业务语义，谁拥有 Contract。**

### 4.2 Consumer

消费公开 Contract 的另一模块。

Consumer 负责：

- 只依赖 canonical Contract；
- 为未知 enum/status 提供 fallback；
- 在自己模块中做 adapter / ViewModel 转换；
- breaking change 时按迁移计划升级；
- 不将自己的 UI 模型反向定义为 Producer 的业务 Schema。

### 4.3 Integration Reviewer

涉及 A/B 两侧的 Contract 变更，另一侧 Owner 或指定共享架构 Reviewer 必须检查：

- ownership 是否正确；
- 是否兼容；
- 是否泄漏内部实现；
- 是否具有迁移窗口；
- fixture/example 是否同步；
- Consumer 是否真实验证。

---

## 5. 冻结的责任矩阵

| Contract                      | Producer / Owner | Consumer | 关联后续 WBS                         | 主要用途                                   |
| ----------------------------- | ---------------- | -------- | ------------------------------------ | ------------------------------------------ |
| User / Session Public View    | B                | A        | `5.3` → `3.4`                        | 主系统读取登录与公开用户状态               |
| Profile Public View           | B                | A        | `5.15` → 主系统需要方                | 仅公开主系统真正需要的资料                 |
| Preference Contract           | B                | A        | `5.14` → `4.18`, `6.3`, `6.5`, `7.9` | Planner / Recommendation / AI 消费长期偏好 |
| Companion Contract            | B                | A        | `5.12`, `5.17` → Planner             | Planner 消费同行人摘要与约束               |
| Trip Plan Contract            | A                | B        | `4.17` → `5.18`, `5.19`              | B 保存、历史与 Trip Library 消费可保存行程 |
| Planner Resume / Edit Handoff | A                | B        | `4.15`, `4.17` ↔ `5.10`, `5.19`      | B 返回 Planner 继续编辑                    |
| Trip Save Invocation Contract | B                | A        | `5.19` → `4.19`                      | Planner 调用 B 的保存能力                  |

说明：

- 此矩阵定义 ownership 与交接方向，不把上述后续 WBS 标记为已完成；
- Reservation / Partner / Payment 尚未完成正式领域设计，0.9 不提前冻结其字段；
- Provider-specific raw schema 永远不是默认跨模块 Contract。

---

## 6. Public Contract 与内部模型边界

必须区分：

```text
Public Contract
Database Model
Internal Domain Model
Provider Response
React Props
UI ViewModel
Store State
Fixture / Mock
```

### 6.1 Public Contract

跨模块稳定交接面，只包含 Consumer 真正需要、且 Producer 愿意长期维护语义的字段。

### 6.2 Database Model

可为持久化和索引优化。表结构不得因为“方便”直接暴露为完整公开 Contract。

### 6.3 Provider Response

第三方 API 返回必须先经过 Provider Adapter 转为 Owner 内部模型，再由 Owner 决定哪些稳定语义进入公开 Contract。

### 6.4 UI ViewModel / Store / Fixture

UI ViewModel、React Props、Store State、Mock 数据均可随界面实现变化，默认不是跨模块稳定面。

Consumer 可以派生自己的 ViewModel，但 ViewModel 不反向控制 Producer 的 domain Contract。

---

## 7. Canonical Source 与命名

每个正式 Contract 只能有一个 canonical source。

若未来采用共享目录，推荐：

```text
src/shared/contracts/session/
src/shared/contracts/profile/
src/shared/contracts/preferences/
src/shared/contracts/companions/
src/shared/contracts/trips/
```

规则：

1. 按 domain 命名；
2. 禁止 `common.ts`、`misc.ts`、`types2.ts` 等无语义名称；
3. Contract 不依赖 React component；
4. Contract 不依赖 Mapbox / Booking / Payment SDK；
5. Contract 不依赖 DB client；
6. Consumer 不复制 canonical 类型长期维护平行版本；
7. Consumer adapter 留在 Consumer 模块；
8. Producer adapter 留在 Producer 模块。

---

## 8. 数据语义基线

### 8.1 ID

- 使用 opaque stable string；
- Consumer 不解析 ID 格式推断业务意义；
- 不使用数组下标、UI key、Provider 临时 ID 作为长期 ID。

### 8.2 日期与时间

- 使用 ISO 8601；
- 必须区分 local date 与 instant；
- 涉及时刻时明确 timezone；
- 不把 `4月11日 09:30` 之类展示文案作为 domain date/time。

### 8.3 Currency

金额与 ISO currency code 分离。推荐使用整数最小货币单位，避免裸浮点金额语义不明。

示意：

```text
amountMinor: 12500
currency: JPY
```

### 8.4 Locale 与展示文案

- Contract 传稳定 code / enum；
- UI 展示文案由 Consumer 本地化；
- 用户自由输入文本除外，不把中文/日文 label 当 domain enum。

### 8.5 Optional / Null / Empty

Contract 必须明确区分：

```text
missing / optional
null
empty string
empty array
unknown
```

Consumer 不自行猜测。

### 8.6 Enum / Status

Consumer 必须有 unknown/fallback。Producer 新增枚举值前确认已有 Consumer 不会因 exhaustive assumption 崩溃。

---

## 9. 安全与隐私边界

跨模块客户端 Contract 禁止包含：

- API key；
- OAuth access token / refresh token；
- session secret；
- payment credential；
- partner secret；
- DB credential；
- 原始认证 header；
- Provider raw payload；
- Consumer 无必要使用的个人敏感数据。

另一模块需要某项能力时，应消费受控 service/action 的结果，而不是获取 credential 本身。

---

## 10. Versioning 与兼容性

### 10.1 版本原则

正式跨模块 Contract 建立后必须可识别版本。可以使用目录、导出名或 contract metadata 表达，但全仓同一阶段只采用一种主策略。

推荐语义：

```text
v1 = 当前稳定主版本
additive change = 保持主版本
breaking change = 新建下一主版本并提供迁移窗口
```

禁止使用日期字符串作为唯一兼容性判断依据。

### 10.2 Additive / Compatible

通常视为兼容：

- 新增 optional field；
- 新增独立 Contract；
- 新增不影响旧逻辑的 metadata；
- 新增 enum 值，前提是已有 Consumer 有 unknown fallback。

即使 additive，也必须同步 example / fixture 与变更记录。

### 10.3 Breaking

以下默认是 breaking：

- 删除字段；
- rename 字段；
- optional → required；
- 改变字段类型、单位或 timezone 语义；
- 改变 ID 稳定性；
- 改变 null / empty semantics；
- 新增 Consumer 无法处理的 enum/status；
- 将字段从快照语义改成实时语义或反之。

---

## 11. Breaking Change 迁移与弃用

Breaking change 必须记录：

```text
Contract name/version
Producer
Consumers
Affected WBS
Why breaking
New shape / semantics
Migration steps
Compatibility window
Deprecation condition
Fixture changes
Integration validation
```

优先两阶段迁移：

```text
Phase 1
Producer 增加兼容字段 / 新版本
旧 Contract 继续可用
Consumer 迁移并验证

Phase 2
确认所有 Consumer 已迁移
旧 Contract 标记 deprecated
满足移除条件后删除旧字段 / 旧版本
```

“看起来没有人用”不是删除共享字段的充分理由。

---

## 12. 标准 Handoff Workflow

```text
1. Producer 创建/更新 Issue
2. 写明 Contract / Producer / Consumer / WBS / impact
3. 标记 additive 或 breaking
4. 先修改 canonical Contract + example/fixture
5. Producer 自测
6. Consumer / Integration Reviewer 检查兼容性
7. Contract PR 合入 develop
8. Consumer 基于已合入 commit 接入
9. 执行跨模块 integration test
10. 按弃用计划清理旧版本
```

推荐 PR 顺序：

```text
Contract PR
→ Producer implementation PR
→ Consumer integration PR
```

小型 additive change 可以将 Contract 与 Producer 实现放在同一 PR，但 Contract diff 必须独立可审查。

禁止“大爆炸式”同时重写 A/B 两侧。

---

## 13. PR / Issue / WBS 必填元数据

每次正式跨模块 Contract 变更至少记录：

```text
Contract name/version:
Producer:
Consumer(s):
Affected WBS:
Compatibility: additive / breaking
Migration required: yes / no
Fixture/example changed: yes / no
Integration validation:
```

Consumer 仅修改内部 adapter、且 Contract 未变化时：

- 不修改 Producer Task；
- 不修改 Producer Result；
- 不抢占 Producer WBS ownership。

---

## 14. Fixture / Example 规则

每个正式 Contract 至少提供一个可读 example 或 fixture，覆盖：

1. 最小有效数据；
2. 常见完整数据；
3. optional/null 边界；
4. unknown enum fallback（适用时）。

Fixture 只服务测试和理解，不是第二份业务真相。

如果 fixture 与 canonical Contract 冲突，以 canonical Contract 为准。

---

## 15. 示例 A：Preference → Planner

### 15.1 Ownership

```text
B owns Preference domain
B publishes Preference Contract (WBS 5.14)
A consumes it in Planner / recommendation (WBS 4.18 and related A consumers)
```

### 15.2 正确流程

1. 用户在 Personal Center 编辑长期偏好；
2. B 内部可拥有 FormState / UI ViewModel / Persistence Model；
3. B 将 Planner 真正需要的稳定业务语义映射成 Preference Contract；
4. A 只消费公开 Contract；
5. A 在 Planner 内通过 adapter 转成 recommendation input；
6. A 需要新字段时，通过 Contract change 请求 B，而不是直接修改 B 私有模型。

### 15.3 代表性语义

以下仅是交接语义示意，不在 0.9 冻结具体 TypeScript shape：

```text
旅行节奏：relaxed / balanced / efficient
移动约束：少换乘、少步行、禁用某类交通
预算：金额 + currency
住宿：类别/位置/舒适度等稳定偏好摘要
餐饮：类型/限制/价格倾向摘要
景点活动：类别偏好与必要约束
同行人：成人/儿童等规划约束摘要
```

当前 `MobilityPreferenceState` 可以由 B adapter 读取，但 A 不直接 import 它作为长期 Contract。

### 15.4 禁止做法

```text
A import preference page state
A 直接读取 B localStorage / component state
A copy MobilityPreferenceState 后自己增加字段
A 为获取新偏好字段直接修改 B 私有 schema
```

---

## 16. 示例 B：Trip Plan → Trip Library

### 16.1 Ownership

```text
A owns Trip Plan
A publishes savable Trip Plan Contract (WBS 4.17)
B consumes it for save/read/history/library (WBS 5.18 / 5.19)
```

### 16.2 正确流程

1. A Planner 生成 Trip Plan；
2. A 将可长期保存的稳定行程语义映射成 Trip Plan Contract；
3. B 的保存层消费该 Contract 并映射到自己的 persistence model；
4. Trip Library 再从保存数据派生 `TripCardViewModel` 等 UI 模型；
5. 用户继续编辑时，B 通过 Planner Resume / Edit Handoff 返回 A；
6. A 负责把稳定 handoff 恢复成自己的 Planner runtime state。

### 16.3 必须隔离的内容

以下默认不得进入可保存 Trip Contract：

```text
selectedDay
activeBottomTab
isMoreSettingsOpen
isRightPanelOverlayOpen
Mapbox runtime object
screen x/y position
仅用于当前 Mock 的 color / presentation state
React component state
```

### 16.4 ViewModel 边界

B 可以继续拥有：

```text
TripLibraryViewModel
TripCardViewModel
DraftTripViewModel
HistoryTripViewModel
FavoriteViewModel
```

但这些类型不得反向定义 A 的 Trip Plan core schema。

---

## 17. Planner Resume / Edit Handoff

B 从 Trip Library 返回 Planner 时只传稳定恢复标识或正式 handoff payload。

原则：

```text
B stores stable trip/resume identity
        ↓
Planner Resume Contract
        ↓
A reconstructs Planner runtime state
```

B 不自行构造：

```text
PlannerUiState
selectedDay
selectedStopId
panel open/closed state
Map runtime state
```

恢复入口的具体字段和 route 在 WBS 4.17 / 5.19 接入时冻结，0.9 不抢跑。

---

## 18. Adapter 规则

### Consumer side

```text
Canonical Contract
    ↓
Consumer Adapter
    ↓
Consumer Internal Model / ViewModel
```

### Producer side

```text
Provider / DB / Internal Model
    ↓
Producer Adapter
    ↓
Canonical Public Contract
```

只为了减少一层转换，不得把 Consumer 特有 UI 字段塞回共享 Contract。

---

## 19. 并行开发与冲突规避

1. 同一个 Contract 变更由一个 Owner 主写；
2. 另一侧通过 Review、Issue 或明确 follow-up commit 反馈；
3. A/B 不同时修改同一高冲突 Contract 文件；
4. Consumer 不 cherry-pick 未合入 Producer 功能分支抢跑；
5. Consumer 基于已合入的 Contract baseline 开发正式接入；
6. 不覆盖、删除或重写其他 Owner 的 Task / Result；
7. WBS 只更新当前工作项和必要关联；
8. 必须双方改代码时优先拆 PR，保持 ownership 清晰。

---

## 20. Contract Review Checklist

- [ ] Producer / Owner 明确；
- [ ] Consumer 列全；
- [ ] canonical source 唯一；
- [ ] 内容是稳定业务语义，不是 UI / DB / Provider 私有实现；
- [ ] 无 secret / credential；
- [ ] optional / null / empty 语义明确；
- [ ] enum/status 有 unknown fallback；
- [ ] 日期 / timezone / 金额单位明确；
- [ ] additive / breaking 已分类；
- [ ] breaking 有迁移窗口和弃用条件；
- [ ] example / fixture 已同步；
- [ ] affected WBS / Issue / PR 已记录；
- [ ] Consumer integration 已验证或明确 deferred；
- [ ] 未修改其他 Owner 私有文件。

---

## 21. 与后续 WBS 的执行关系

0.9 只冻结规则，不提前实现以下工作：

```text
5.11 Preference Schema
5.12 Companion Schema
5.14 Planner-readable Preference Contract
5.16 Preference Persistence API
5.18 Saved Trip / History / Draft data model
5.19 Trip Save / Read / History Contract
4.15 Planner Store finalization
4.16 Day Plan / Itinerary Core
4.17 Trip Plan / Planner Contract
4.18 Planner reads Preference Contract
4.19 Planner invokes Save Contract
9.7 Preference → Planner E2E
9.8 Planner → Save → Personal Center E2E
```

后续这些 Task 必须引用本规范并遵守 ownership、versioning、adapter 和 migration 规则。

---

## 22. WBS 0.9 完成条件

进入 `待审查` 前必须满足：

- [x] 责任矩阵完整；
- [x] Public Contract / internal model 边界明确；
- [x] 当前仓库结构完成审计；
- [x] canonical source 决策明确；
- [x] additive / breaking 定义明确；
- [x] migration / deprecation 流程明确；
- [x] PR / Issue / WBS 交接机制明确；
- [x] Fixture / Example 规则明确；
- [x] Preference → Planner 示例完整；
- [x] Trip Plan → Trip Library 示例完整；
- [x] Planner Resume 边界明确；
- [x] 并行冲突规则明确；
- [x] 安全边界明确；
- [x] 未重新划分 A/B Owner；
- [x] 未提前实现后续 runtime Contract。

本规范当前状态为 **Frozen / 待审查**。

只有最终收尾 PR 合入 `develop` 且用户验收通过后，Master WBS 0.9 才可标记 `已完成`。
