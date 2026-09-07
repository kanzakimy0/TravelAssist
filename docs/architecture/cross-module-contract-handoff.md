# TravelAssist 跨模块 Contract 交接规则

> WBS: `0.9`  
> Owner: `B`  
> Status: `Draft / 进行中`  
> Issue: `#168`  
> Updated: `2026-09-07`

## 1. 目的

本规范定义 TravelAssist 中 A（旅行主系统）与 B（个人中心）之间的公开 Contract 如何被拥有、发布、消费、升级、弃用和验收。

目标只有一个：**跨模块协作依赖稳定的公开 Contract，而不是依赖对方的私有实现。**

因此，以下方式一律不作为正式交接机制：

- A 直接读取 B 的 Personal Center 表单状态；
- B 复制 A 的 Planner Store 作为长期 Trip Schema；
- Consumer 引用 Producer 的私有组件 Props 作为 domain model；
- 将 Map / Hotel / Payment Provider 原始响应直接暴露为共享 Schema；
- A/B 各自维护一份“看起来一样”的 TypeScript 类型；
- 为解决临时问题同时修改同一高冲突共享文件。

---

## 2. 与 WBS 0.8 的关系

WBS 0.8 当前仍在固化 A/B 责任边界，本规范依据已经冻结的 v0.4 原则先行启动：

- A：旅行主系统、Planner、Map、Route、Trip Plan、AI 主流程；
- B：账户、Profile、Preference、Companion、Trip Library 与个人管理；
- Shared Infra / CI / Deployment 默认由 A 负责架构；
- 跨模块通过公开 Contract 交接。

本规范**不重新划分业务 Owner**。

如果 0.8 后续合入的新边界与本规范冲突，以最新 `develop` 为准修订本规范，不反向覆盖 0.8。

---

## 3. 角色定义

### 3.1 Contract Owner / Producer

拥有业务语义，并负责发布该业务域公开 Contract 的模块 Owner。

Producer 负责：

- 字段语义；
- ID 稳定性；
- null / optional 语义；
- 状态枚举语义；
- 版本与兼容策略；
- example / fixture；
- 变更说明与迁移说明。

原则：**谁拥有业务语义，谁拥有 Contract。**

### 3.2 Consumer

使用公开 Contract 的另一模块。

Consumer 负责：

- 只依赖 canonical Contract；
- 为未知 enum/status 提供 fallback；
- 在自己模块内做 UI / adapter 转换；
- 在 breaking change 时按迁移计划升级；
- 不把 Consumer 自己的 ViewModel 反向定义为 Producer 的核心 Schema。

### 3.3 Integration Reviewer

涉及 A/B 两侧的 Contract 变更，另一侧 Owner 或指定共享架构 Reviewer 必须检查：

- 是否越界；
- 是否兼容；
- 是否泄漏私有实现；
- 是否具备迁移窗口；
- 是否覆盖真实 Consumer。

---

## 4. 责任矩阵

| Contract | Producer / Owner | Consumer | 主要用途 | 禁止事项 |
|---|---|---|---|---|
| User / Session Public View | B | A | 主系统判断登录/用户公开状态 | A 不读取账户私有 Store、credential |
| Profile Public View | B | A | Planner 需要的公开用户信息 | 不把完整 Account Schema 暴露给 A |
| Preference Contract | B | A | Planner / Recommendation 使用长期偏好 | A 不直接读取 Personal Center Form State |
| Companion Contract | B | A | Planner 使用同行人摘要与约束 | A 不依赖 Companion 编辑页面内部模型 |
| Trip Plan Contract | A | B | 保存、历史、Trip Library 使用可保存行程 | B 不复制 Planner Store 为自己的核心 Schema |
| Planner Resume / Edit Handoff | A | B | Trip Library 返回 Planner 继续编辑 | B 不自行构造 Planner 私有 State |

Reservation / Partner / Payment 等 Contract 在其正式设计完成前，仅适用本规范的通用版本与安全规则，不在 WBS 0.9 内提前冻结业务字段。

---

## 5. Public Contract 与内部模型的边界

必须区分：

```text
Public Contract
Database Model
Internal Domain Model
Provider Response
React Props
UI ViewModel
Store State
```

它们不是同一概念。

### 5.1 Public Contract

跨模块稳定交接面，只包含 Consumer 真正需要且 Producer 愿意长期维护语义的字段。

### 5.2 Database Model

可为持久化优化，字段和索引可以与 Public Contract 不同，不得因为表结构方便就直接暴露整张表。

### 5.3 Provider Response

第三方 API 返回结构必须先经过 Provider Adapter 转成内部模型，再由 Owner 决定是否进入 Public Contract。

第三方字段名、token、内部 provider id、raw payload 默认不得进入共享 Contract。

### 5.4 UI ViewModel

每一侧 UI 可以派生自己的 ViewModel，但 ViewModel 不得成为对方模块的业务真相。

---

## 6. Canonical Source

每个正式 Contract 只能有一个 canonical source。

当前规范阶段不强制搬迁已有代码。若未来建立统一共享目录，推荐：

```text
src/shared/contracts/<domain>/
```

示意：

```text
src/shared/contracts/preferences/
src/shared/contracts/companions/
src/shared/contracts/trips/
src/shared/contracts/session/
```

规则：

1. Contract 按 domain 命名；
2. 不使用 `common.ts` / `misc.ts` / `types2.ts` 等无语义命名；
3. Contract 不依赖 React component；
4. Contract 不依赖 Mapbox / Booking / Payment SDK；
5. Contract 不依赖 DB client；
6. Consumer 不复制 canonical 类型到自己的目录长期维护；
7. Consumer adapter 留在 Consumer 模块内部。

如果当前仓库已有更明确、已被双方使用的 canonical 位置，应保持现状并记录，不为了满足目录偏好做无收益重构。

---

## 7. 数据语义基线

### 7.1 ID

- 使用 opaque stable string；
- Consumer 不解析 ID 格式获得业务含义；
- 不以数组下标、UI key 或 Provider 临时 ID 作为长期跨模块 ID。

### 7.2 日期与时间

- 使用 ISO 8601；
- 必须区分 local date 与 instant；
- 涉及时刻时明确 timezone；
- 不用格式化后的 UI 文案作为 Contract 日期。

### 7.3 Currency

金额必须与 currency code 分离；禁止只传一个语义不明的裸浮点数。

示意：

```text
amountMinor: 12500
currency: JPY
```

实际字段名可由对应 domain owner 冻结。

### 7.4 Locale / Display Text

- Contract 传业务 enum / code；
- UI 展示文案由 Consumer 本地化；
- 除非字段本身就是用户输入文本，不把中文/日文展示标签当 domain enum。

### 7.5 Optional / Null / Empty

每个重要字段必须区分：

```text
missing / optional
null
empty string
empty array
unknown
```

Consumer 不自行猜测。

### 7.6 Enum / Status

Consumer 必须实现 unknown/fallback；Producer 新增枚举值前确认 Consumer 不会因 exhaustive assumption 崩溃。

---

## 8. 安全边界

跨模块 Contract 禁止包含：

- API key；
- OAuth access token / refresh token；
- session secret；
- payment credential；
- partner secret；
- DB credential；
- 原始认证 header；
- 不必要的个人敏感数据。

服务器内部 credential 不因为另一个模块“需要调用”就进入客户端 Contract。

Consumer 若需要某项能力，应消费受控 service/action 的结果，而不是获取 credential 本身。

---

## 9. 兼容性分类

### 9.1 Additive / Compatible

通常可视为兼容：

- 新增 optional field；
- 新增独立 Contract；
- 新增不影响旧逻辑的 metadata；
- 新增 enum 值，前提是所有现有 Consumer 都有 unknown fallback。

即使是 additive，也必须更新 example / fixture 和变更记录。

### 9.2 Breaking

以下默认是 breaking：

- 删除字段；
- 字段 rename；
- optional → required；
- 改变字段类型；
- 改变单位；
- 改变 timezone / local-date 语义；
- 改变 ID 稳定性；
- 改变 null / empty semantics；
- 新增 Consumer 无法处理的 enum/status；
- 将已有字段从“快照”改成“实时值”或反之。

Breaking change 不得只通过“同时改两边让 CI 绿”来完成。

---

## 10. Breaking Change 迁移规则

Breaking change 必须记录：

```text
Contract
Producer
Consumers
Affected WBS
Why breaking
New shape / semantics
Migration steps
Compatibility window
Deprecation date/condition
Fixture changes
Integration validation
```

优先采用两阶段迁移：

```text
Phase 1
Producer 增加新字段 / 新版本
旧 Contract 继续工作
Consumer 开始迁移

Phase 2
确认所有 Consumer 已迁移
删除旧字段 / 旧版本
```

禁止一次 PR 同时删除旧接口并要求所有并行分支立即重写。

---

## 11. Contract Handoff 流程

标准流程：

1. Producer 创建/更新 Issue，标记 Contract、Producer、Consumer、WBS；
2. 标记兼容性：`additive` 或 `breaking`；
3. 先修改 canonical Contract；
4. 同时更新 example / fixture；
5. Producer 完成自己的验证；
6. Consumer/Integration Reviewer Review；
7. Contract PR 合入 `develop`；
8. Consumer 从已合入 commit 接入；
9. 执行双方 integration test；
10. 若有旧版本，按弃用计划清理。

### 11.1 为什么 Contract 先合入

这样 Consumer 基于稳定基线开发，不依赖未合入的功能分支，也避免双方互相 cherry-pick 半成品实现。

---

## 12. PR / Issue / WBS 记录要求

每次正式 Contract 变更至少记录：

```text
Contract name/version
Producer
Consumer(s)
Affected WBS
Compatibility: additive / breaking
Migration required: yes/no
Fixture/example changed: yes/no
Integration validation
```

建议顺序：

```text
Contract PR
→ Producer implementation PR
→ Consumer integration PR
```

小型 additive change 可将 Contract 与 Producer 实现合并，但必须保证 Contract 内容在 diff 中清楚可审查。

Consumer 内部 adapter 变更、且 Contract 未变化时，不修改 Producer 的 Task / Result 文件。

---

## 13. Fixture / Example 规则

每个正式 Contract 至少有可读 example 或 fixture，覆盖：

1. 最小有效数据；
2. 常见完整数据；
3. optional/null 边界；
4. unknown enum fallback（适用时）。

Fixture 是测试/理解工具，不是第二份业务真相。

如果 fixture 与 canonical Contract 冲突，以 canonical Contract 为准并修复 fixture。

---

## 14. 示例 A：Preference → Planner

### 14.1 Ownership

```text
B owns Preference domain
B publishes Preference Contract
A consumes it in Planner / recommendation
```

### 14.2 正确做法

1. 用户在 Personal Center 编辑长期偏好；
2. B 内部可以有 FormState / UI ViewModel / Persistence Model；
3. B 将 Planner 真正需要的稳定信息映射成 Preference Contract；
4. A 只消费 Preference Contract；
5. A 在 Planner 内将它转换成自己的 recommendation input；
6. A 需要新字段时，创建 Contract change 请求给 B。

### 14.3 禁止做法

```text
A import B 的 preference page component state
A 直接读取 B localStorage key
A 复制 B 表单 TypeScript interface 后自行扩展
A 要字段时直接修改 B 的私有 schema
```

### 14.4 语义示意

Preference Contract 未来可包含具有稳定业务意义的摘要，例如：

- pace / 旅行节奏；
- mobility constraints；
- accommodation preference summary；
- dining preference summary；
- activity/attraction preference summary；
- budget summary；
- companion-derived planning constraints。

WBS 0.9 只冻结交接原则，不替 Preference domain 提前冻结全部字段。

---

## 15. 示例 B：Trip Plan → Trip Library

### 15.1 Ownership

```text
A owns Trip Plan
A publishes savable Trip Plan Contract
B consumes it for save/read/history/library
```

### 15.2 正确做法

1. A Planner 生成 Trip Plan；
2. A 将“可保存的稳定行程语义”映射为 Trip Plan Contract；
3. B 保存 Contract 或由 B 的数据层映射到自己的 persistence model；
4. Trip Library 根据保存的数据派生自己的 card/detail ViewModel；
5. 用户选择继续编辑时，B 通过 Planner Resume / Edit Handoff 返回 A；
6. A 负责把稳定 handoff 恢复成自己的 Planner runtime state。

### 15.3 禁止做法

```text
B copy Planner Store shape 作为长期数据库 schema
B 依赖 Mapbox runtime object
B 依赖 A component local state
B 自己定义 Trip Plan core schema 后要求 A 适配
```

### 15.4 ViewModel 边界

B 可以拥有：

```text
TripLibraryViewModel
TripCardViewModel
HistoryTripViewModel
```

这些是 B 的 UI 派生模型，不反向成为 A 的 Trip Plan Contract。

---

## 16. Adapter 规则

当 Consumer 需要与公开 Contract 不同的内部形状时：

```text
Canonical Contract
    ↓
Consumer Adapter
    ↓
Consumer Internal Model / ViewModel
```

Adapter 属于 Consumer，不应把 Consumer 特有字段塞回共享 Contract，只为了减少一层转换。

同理，Provider 原始响应应先经过 Producer Adapter，再进入 Producer domain。

---

## 17. 并行开发与冲突规避

1. 同一个 Contract 变更由一个 Owner 主写；
2. 另一侧通过 Review、Issue 或明确 follow-up commit 反馈；
3. A/B 不同时修改同一高冲突 Contract 文件；
4. Consumer 不 cherry-pick 未合入的 Producer 功能分支来抢跑；
5. Consumer 等 Contract baseline 合入后再开发正式接入；
6. 不覆盖、删除、重写其他 Owner 的 Task / Result；
7. WBS 追踪只更新当前工作项与必要的关联信息；
8. 如果双方都必须改代码，优先拆分 PR，保持 ownership 清晰。

---

## 18. Deprecated / Removal

正式 Contract 的字段/版本进入 deprecated 后：

1. 标记 deprecated；
2. 列出 Consumer；
3. 指定替代方案；
4. 给出移除条件或版本窗口；
5. Consumer 完成迁移并验证；
6. 才允许删除旧内容。

“看起来没有人用”不是删除共享字段的充分理由。

---

## 19. Review Checklist

每个跨模块 Contract PR 至少回答：

- [ ] Producer/Owner 是谁？
- [ ] Consumer 有哪些？
- [ ] 这是公开业务语义还是内部实现细节？
- [ ] canonical source 是否唯一？
- [ ] 是否泄漏 Provider / DB / UI 私有结构？
- [ ] 是否包含 secret/credential？
- [ ] optional/null/empty 是否明确？
- [ ] enum/status 是否有 unknown fallback？
- [ ] 日期/timezone/金额单位是否明确？
- [ ] additive 还是 breaking？
- [ ] breaking 是否有迁移窗口？
- [ ] example / fixture 是否同步？
- [ ] 是否标明 affected WBS / Issue / PR？
- [ ] Consumer integration 是否验证？
- [ ] 是否避免修改其他 Owner 私有文件？

---

## 20. WBS 0.9 完成条件

0.9 进入 `待审查` 前必须满足：

- 责任矩阵完整；
- Public Contract / internal model 边界明确；
- canonical source 原则明确；
- additive / breaking 定义明确；
- breaking migration / deprecation 流程明确；
- PR / Issue / WBS 交接机制明确；
- Fixture / Example 规则明确；
- Preference → Planner 示例完整；
- Trip Plan → Trip Library 示例完整；
- 并行冲突规则明确；
- 安全边界明确；
- 无重新划分 A/B Owner 的越界内容。

只有 PR 合入 `develop` 且用户验收通过后，WBS 0.9 才标记 `已完成`。

---

## 21. 当前决策状态

本版为 WBS 0.9 的首版执行草案。Codex 执行时应根据最新 `origin/develop` 检查：

- 是否已有共享 Contract 目录；
- 是否已有实际跨模块类型；
- 是否存在与本规范冲突的已合入设计；
- 是否需要将目录建议改成现有 canonical 路径。

任何目录调整都应以减少迁移和冲突为优先，而不是为了形式统一强制重构。