# TASK-051-A — WBS 4.15 Planner State / Store Closeout

> Owner: A — Main Travel System / Planner Core  
> WBS: 4.15 — Planner 状态模型 / Store  
> Priority: P0  
> Issue: #400  
> Publication baseline: `develop@45e9f8830ac66d03b3ace6480d36d3ee31907a2e`  
> Publication branch: `task/a-task-051-planner-state-store-closeout`  
> Planned implementation branch: `codex/a-planner-state-store-closeout`

## 1. Goal

收口现有 Planner / Detail 的本地运行时状态模型，建立**唯一明确、可测试、可扩展的 Planner Store ownership boundary**。

本 Task 不重写 Planner，也不引入第二套 Trip Model。

当前仓库已经存在：

```text
TripState / TripAction / tripReducer
PlannerUi compatibility reducer
DetailDraftState
browser TripSnapshot
WorkingDraft
useBrowserTrip
PlannerPage central useReducer
many component-local useState slices
```

目标是：

> **把“谁是业务工作态真值、谁是 UI 临时态、谁是草稿、谁只是持久化投影”冻结清楚，并让后续 Preference / Save / AI / Engine 都只能通过明确边界接入。**

---

## 2. Execution-time gate

开始前必须读取执行时最新：

```text
origin/develop
docs/project/WBS-TravelAssist.md
```

必须确认：

- 2.6 已完成；
- 5.11 已完成；
- 4.17 Trip Plan Contract 已完成；
- 8.5 Trip Plan Schema 已完成；
- Engine 4.20–4.24 已完成；
- 4.15 仍未被更新 Task 完成或替代。

如果最新 develop 已经有完整 4.15 收口，则返回：

```text
Blocked / Superseded
```

并 STOP。

---

## 3. Existing implementation that must be audited and preserved

至少审计：

```text
src/features/planner/model/planner-state.ts
src/features/planner/model/trip-model.ts
src/features/planner/model/browser-trip.ts
src/features/planner/model/working-drafts.ts
src/features/planner/model/detail-workspace.ts
src/features/planner/components/use-browser-trip.ts
src/features/planner/components/planner-page.tsx
src/features/planner/components/trip-workspace.tsx
src/shared/contracts/trips/**
```

以及执行时新增的：

- Planner state/runtime helpers；
- Trip persistence adapters；
- Engine/canonical Trip integration helpers；
- route query/session state；
- Planner tests。

不要为了“架构更整齐”删除已经验收的行为。

---

## 4. Required state ownership model

最终必须明确区分：

### 4.1 Planner Working / Domain State

当前挂载 Planner Workspace 中唯一的**可编辑工作副本真值**。

包括当前方案、行程项目、设置、工作方案等真正影响旅行内容的状态。

### 4.2 Planner UI State

例如：

- selected item；
- day/range；
- inspector；
- panel/overlay；
- focus；
- layer collapse。

它可以 reset，而不能改变旅行事实。

### 4.3 Detail Draft State

当前 Detail 中：

- local additions；
- execution notes；
- preparation/checklist；
- completion state；
- rail responses 等。

必须做明确选择：

```text
A. 纳入 PlannerStore draft slice
或
B. Store-owned explicit draft boundary
```

不得继续成为含糊的第二业务真值源。

### 4.4 Ephemeral Component State

例如：

- Dialog open；
- DOM trigger；
- map-pick transient；
- temporary progress；
- animation state；
- focus return target。

这些不需要进入 Store。

### 4.5 Persistence Projection

Browser Snapshot / 未来服务器保存 payload：

```text
Store
 ↓ project
Persistence Representation
```

它不是第二个可编辑 Domain Model。

### 4.6 Canonical Trip

4.17 / 8.5 是 canonical public/server model。

Store 不能复制第二套 canonical Trip contract。

### 4.7 Mutation Engine

4.20–4.24 是可信 server mutation boundary。

Planner Store 只代表 client working copy。

未来：

```text
UI / AI Proposal
→ ChangeSet
→ Mutation Engine
→ Canonical Trip revision
→ Planner Store hydrate/reconcile
```

不得通过本 Task 新增 bypass Engine 的 durable mutation。

---

## 5. Mandatory state ownership audit

生成完整矩阵，覆盖至少：

- every material field in `TripState`;
- `TripUi`;
- `DetailDraftState`;
- `TripSnapshot`;
- `WorkingDraft`;
- `PlannerPage` component local states;
- URL/search params;
- localStorage keys;
- route-query/session state;
- derived selectors.

每个字段标记：

```text
DOMAIN_WORKING
UI
DRAFT
EPHEMERAL
DERIVED
PERSISTENCE_METADATA
NAVIGATION
EXTERNAL_AUTHORITY
```

最终要求：

> **同一个业务事实不得存在两个独立 writable authoritative locations。**

---

## 6. Target Store boundary

优先使用现有 React / TypeScript，不增加 Zustand / Redux / MobX 等依赖，除非审计证明现有实现无法满足并单独记录理由。

建议概念结构：

```text
PlannerStoreState
  working
  draft
  ui
  meta
```

meta 至少应能表达：

- local revision / change revision；
- hydrate source/revision；
- dirty-relevant revision 或 equivalent；
- restore/reconcile status if needed。

不要求按这个字段名实现。

### Required capabilities

- typed Store root；
- pure deterministic reducer/update path；
- typed actions/commands；
- explicit hydrate/restore；
- explicit reset/replace；
- selectors；
- no mutation of previous state；
- no module-global mutable hidden store；
- no presentation component direct writes to migrated business state；
- deterministic identical action replay。

---

## 7. planner-state.ts vs trip-model.ts

目前 `planner-state.ts` 与 `trip-model.ts` 存在历史兼容关系。

必须审计：

- 是否还有两个 reducer 都能独立改变同一事实；
- `PlannerPage` compatibility adapter 是否只是旧组件 adapter；
- 哪一层是最终 Store authority。

如果 `planner-state.ts` 已是 compatibility-only：

- 保留最低限度兼容；
- 不允许它独立拥有业务真值；
- 写明 deprecation/removal path；
- 不必为了删文件破坏现有测试。

---

## 8. Browser persistence boundary

必须复用当前有效行为：

```text
browser-trip.ts
working-drafts.ts
use-browser-trip.ts
```

### Rules

1. snapshot 必须从 Store projection 生成；
2. restore 必须经过唯一 hydrate/restore action；
3. localStorage 不直接修改 Store internals；
4. stale-tab overwrite guard 保留；
5. corrupt/invalid payload fail closed；
6. persistence failure 不丢当前 working state；
7. browser-only save 在本 Task 保持 browser-only；
8. localStorage key 不新增第二个“当前行程真值”。

### Dirty semantics

Dirty 必须比较**可持久化业务投影**。

以下操作不得单独导致 itinerary dirty：

- 打开/关闭 overlay；
- inspector focus；
- selected item；
- dialog open；
- viewport collapse；
- map layer UI；
- temporary DOM trigger。

---

## 9. Planner ↔ Detail navigation

必须验证：

```text
Planner
→ Detail
→ Planner
```

不是 save 操作。

要求：

- working changes 保留；
- draft 保留；
- no implicit browser save；
- current map/workspace lifecycle 不因 Store 收口被重建；
- URL day/scope 是 navigation state，不产生第二行程真值。

---

## 10. Canonical Trip compatibility

审计：

```text
src/shared/contracts/trips/**
WBS 4.17
WBS 8.5
```

Store 必须明确：

```text
Store Working Model
!= Canonical Trip Contract
```

允许纯 adapter：

```text
Canonical Trip -> Planner Store hydrate
Planner Store -> supported canonical/persistence projection
```

但禁止：

- 新建第二套 public Trip schema；
- DB migration；
- 把 Planner local state 宣称为服务器真值。

---

## 11. Preference boundary

5.14 已完成，4.18 尚未执行。

本 Task 可以：

- 为 future Preference input 保留清晰 Store input boundary；
- 保留当前 local configuration。

本 Task 不得：

- 调用 5.14 live API；
- 实现 4.18；
- 做 23→43 mapping；
- 写 Preference DB。

---

## 12. Engine boundary

Engine 4.20–4.24 已完成。

必须增加架构说明/测试，证明：

### Current

```text
tripReducer action
= local working-copy action
!= Engine ChangeSet
!= Engine audit event
!= canonical revision commit
```

### Future durable mutation

```text
Store
→ proposal / user intent
→ ChangeSet builder
→ Mutation Engine
→ authoritative new revision
→ Store reconcile
```

禁止复制：

- permissions；
- RLS；
- audit；
- outbox；
- Engine idempotency；
- Engine server revision authority。

---

## 13. Required regression scenarios

至少覆盖：

1. Planner initial seed
2. current plan switch
3. day/range switch
4. select/inspect
5. add item
6. remove item
7. edit item time/title
8. reorder / movement-related current supported mutation
9. lock/fixed protections
10. reservation protection
11. settings edit/apply/cancel
12. Detail draft add/edit/delete
13. completion/preparation state
14. Planner → Detail no implicit save
15. Detail → Planner working state preserved
16. explicit browser save
17. reload restore
18. invalid saved payload
19. unavailable localStorage
20. stale-tab overwrite conflict
21. working-draft archive/switch
22. viewport/overlay reset preserves domain
23. UI-only action does not mark dirty
24. identical action replay is deterministic
25. hydrate same snapshot deterministic
26. supported canonical projection round-trip
27. future Engine-origin higher canonical revision reconcile fixture

---

## 14. Required negative tests

至少：

- previous Store state mutation;
- invalid Store action;
- duplicate authoritative writable field;
- invalid hydrate Trip ID/reference;
- stale hydrate overwrites newer local revision;
- UI-only dirty;
- persistence error clears current work;
- non-serializable HTMLElement enters persistence snapshot;
- provider/session transient result becomes canonical fact;
- route transient response becomes durable Store truth unintentionally;
- local reducer writes fake Engine revision/audit;
- second localStorage current-trip source;
- compatibility reducer changes plan without authoritative Store;
- restore bypasses validator.

---

## 15. UI / geometry freeze

本 Task 是状态架构收口，不是视觉 Task。

禁止：

- Planner Grid redesign；
- Map size changes；
- Right rail geometry changes；
- Bottom timeline geometry changes；
- Header redesign；
- breakpoint rewrite；
- palette/token redesign。

允许因 Store wiring 导致的最小 component prop/hook 修改。

---

## 16. Required deliverables

建议：

```text
src/features/planner/model/planner-store.ts
src/features/planner/model/planner-store-selectors.ts
src/features/planner/model/planner-store-persistence.ts
```

或执行时更符合仓库 convention 的等价路径。

必须生成：

```text
docs/architecture/planner-state-store-v1.md
docs/qa/TASK-051/state-ownership-audit.json
docs/qa/TASK-051/store-invariants.json
docs/qa/TASK-051/persistence-boundary.json
docs/qa/TASK-051/regression-report.md
tests/task-051-a-planner-store.test.mjs
docs/tasks/RESULT-TASK-051-a-planner-state-store-closeout.md
```

必要时增加 browser test，但不要制造纯截图型“通过”。

---

## 17. Acceptance gates

全部必须满足：

```text
authoritative Planner working Store boundary = 1
duplicate writable business truth = 0
deterministic replay = PASS
previous-state mutation = 0
dirty ignores UI-only state = PASS
browser save/restore = PASS
stale-tab guard = PASS
corrupt payload fail-closed = PASS
Planner/Detail working-state preservation = PASS
canonical Trip schema duplication = 0
Engine semantics duplication = 0
Engine bypass introduced = 0
remote save API changes = 0
DB migration changes = 0
Preference live integration changes = 0
Provider calls = 0
AI calls = 0
Planner geometry redesign = 0
```

---

## 18. Regression gates

至少运行执行时的 canonical equivalents：

```text
npm ci

TASK-051 focused Store tests
existing browser-trip-save tests
planner working-plan tests
planner track-actions
planner audit regressions
Planner/Detail workspace tests
Trip Contract tests
Trip persistence-model tests
Engine focused tests

full Node regression

npm run lint
npm run typecheck
npm run build

current deployment validate/build/artifact checks
TASK-owned Prettier
git diff --check
```

如果执行时已有更完整的 canonical Planner test aggregate，优先使用并记录。

最终 exact PR head 必须取得 GitHub Quality Gate PASS。

---

## 19. Out of scope

明确禁止：

```text
4.16 server Itinerary runtime redesign
4.18 Planner live Preference integration
4.19 remote Trip Save/Read/History
Candidate Pipeline / POI
AI runtime
Route Provider production enablement
Engine semantic changes
Booking/Payment
DB schema/migration
new state management framework without separate justification
visual redesign
```

---

## 20. WBS / completion

实施开始后：

```text
4.15 = A / 进行中（#400 / TASK-051-A）
```

实现 + QA + Draft PR：

```text
4.15 = A / 待审查（#400 / TASK-051-A；Draft PR #...）
```

只有用户明确验收 + merge develop：

```text
4.15 = 已完成
```

不要自动 merge。
不要自动启动 4.18 或 4.19。
