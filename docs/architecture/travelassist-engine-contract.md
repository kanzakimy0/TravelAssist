# TravelAssist Engine / Trip Engine Contract v0.1

> WBS: `4.20`
>
> Owner / Contract Producer: B
>
> Review status: **Frozen / Engine Contract v0.1 已冻结**（2026-09-10；最终审计见§25）
>
> Issue: [#201](https://github.com/kanzakimy0/TravelAssist/issues/201)
>
> Authoring base: `origin/develop@1af72af0d7151af4dd59073ee0b015a70b267064`
>
> Canonical Trip Plan Schema: `src/shared/contracts/trips/index.ts`，`contractVersion: "1.0"`

## 1. 定义、目标与非目标

本文件中的 **TravelAssist Engine** 与既有架构中的 **Trip Engine** 是同一个模块：它接收结构化 ChangeSet，在可信服务边界内执行确定性校验、影响预览、权限与保护规则判断，并在未来持久化能力就绪后原子应用变更。

它不是：

- AI 模型或 AI Orchestrator；
- Planner / Detail 的第二套 Store；
- Mapbox、Route Provider、Booking 或 Payment 服务；
- Trip Plan 的第二套 Schema；
- API endpoint、数据库表、Migration 或已经可运行的 Engine service。

4.20只发布契约设计；后续4.21已实现纯validate/preview子集。apply/rollback仍为未来领域能力，当前没有运行时入口；本次冻结不增加任何运行时能力。当前能力与历史设计证据的区别见§25。

## 2. 权威来源与兼容性

### 2.1 唯一 Schema 来源

Trip、Plan、Day、Item、Place、Schedule、Booking summary、Lock、Assessment 及 revision 的 wire shape 只来自 WBS 4.17 的 canonical source：

`src/shared/contracts/trips/index.ts`

Engine Contract 只引用 `TripPlanSnapshotV1` / `PlanItemV1` 及其稳定 ID、`trip.revision`、`plan.revision`。不得复制、改名或在 Engine 目录维护一份相似类型。4.17 validator 通过只证明结构合法，不证明调用者有权限、事实仍新鲜、预约真实或变更可执行。

### 2.2 版本

- `tripContractVersion` 必须等于当前已冻结的 `"1.0"`；未知版本返回 `unsupported`。
- `engineContractVersion: "0.1"` 现为 Frozen，包含已验收的4.20.1增量；冻结依据、已解决的契约问题及仍未解决的实现决策见§25。冻结公共语义不表示全部 operation、生产 adapter 或持久化能力已实现。
- 4.17 breaking change 必须先按跨模块 handoff 规则发布新版本、fixture 和迁移窗口，Engine Consumer 再显式升级。
- Engine additive change 仍需更新样例、Acceptance Matrix 和 Consumer review；不得借“可选字段”泄漏 Provider、DB 或 UI 私有结构。

## 3. Producer / Consumer 与所有权

| 边界                                | Producer                         | Consumer                                        | 契约职责                                                 |
| ----------------------------------- | -------------------------------- | ----------------------------------------------- | -------------------------------------------------------- |
| Canonical Trip Plan v1.0            | A / WBS 4.17                     | Engine、B Save/History、Planner/Detail adapters | 唯一 Trip/Plan/Day/Item Schema                           |
| User UI action → ChangeSet          | A Planner / Detail adapter       | Engine                                          | 把用户动作转换为白名单 operation；不传组件 state         |
| AI proposal → ChangeSet             | A AI Orchestrator                | Engine                                          | 只提出候选意图、理由和来源；无直接写权限                 |
| Provider normalized fact            | A Provider adapter / 未来 7.5    | Engine validation context                       | 提供带 provenance 与时效的事实；不传 raw response/token  |
| Engine decision / preview           | B Engine Contract                | Planner / Detail、AI Orchestrator               | 返回统一结果、issues、confirmation requirements 和纯预览 |
| Applied result / history descriptor | 未来 Engine runtime              | B Save/History、A Planner resume                | 引用 canonical snapshot/revision；不暴露 DB 行           |
| Persistence transaction             | 未来 8.5 public service boundary | 未来 Engine runtime                             | 原子版本、幂等、审计和同步；本任务不定义表               |

所有 actor 权限必须来自可信 Auth / membership 查询。客户端提交的 role、owner ID、`confirmed: true` 或 AI 声明都不是授权证据。

## 4. ChangeSet 模型

以下是 Frozen v0.1 wire contract。文档 TypeScript 与已合入的 `src/shared/contracts/engine/index.ts` 声明对应；canonical 类型均为**引用**，不是新 Schema：

```ts
type ChangeSetV0_1 = {
  engineContractVersion: "0.1";
  tripContractVersion: "1.0";
  changeSetId: OpaqueId;
  idempotencyKey: OpaqueId;
  target: {
    tripId: TripPlanSnapshotV1["trip"]["id"];
    planId: TripPlanSnapshotV1["plans"][number]["id"];
  };
  baseVersion: {
    tripRevision: TripPlanSnapshotV1["trip"]["revision"];
    planRevision: TripPlanSnapshotV1["plans"][number]["revision"];
  };
  source: {
    kind: "user" | "ai" | "system" | "provider_event";
    actorRef: OpaqueId;
    correlationId: OpaqueId | null;
    proposalRef: OpaqueId | null;
  };
  reason: string;
  operations: EngineOperationV0_1[];
  factRefs: ProviderFactRefV0_1[];
};

type ProviderFactRefV0_1 = {
  factId: OpaqueId;
  factKind: string;
  subjectRef: OpaqueId;
  provider: string;
  observedAt: Instant;
  expiresAt: Instant;
  confidence: number | null;
};
```

规则：

1. `changeSetId` 是业务审计身份；`idempotencyKey` 是提交去重身份，两者不可互换。
2. `actorRef` 由可信服务注入或核验，不接受客户端自报权限。
3. `baseVersion` 同时绑定 4.17 的 trip 与 plan revision，禁止只比较其中一个后覆盖另一层更新。
4. `reason` 是不可执行的纯文本，不是授权或 SQL。
5. `operations` 按数组顺序构成一个原子意图；任一 operation 阻断时，整个 apply 不得部分成功。
6. `factRefs` 只保存归一化事实的引用与 provenance。事实值由对应 Provider-owned contract 提供；禁止 raw payload、token、service key、SQL 或 React/Mapbox 对象。
7. 未知字段、缺字段、重复 operation ID、悬空 target、超限集合和非 JSON 值必须 fail closed，且错误不得回显敏感原文。

每个 operation 共有：

```ts
type OperationBase = {
  operationId: OpaqueId;
  op: OperationCode;
  reason: string | null;
};

type OperationCode =
  | "ADD_ITEM"
  | "UPDATE_ITEM"
  | "MOVE_ITEM"
  | "DELETE_ITEM"
  | "SKIP_ITEM"
  | "RESTORE_ITEM"
  | "REPLACE_ITEM"
  | "REPLACE_TRANSPORT"
  | "UPDATE_TIME"
  | "UPDATE_DURATION"
  | "UPDATE_PLACE"
  | "LINK_BOOKING"
  | "UPDATE_BOOKING_STATUS"
  | "LOCK_ITEM"
  | "UNLOCK_ITEM"
  | "REORDER_ITEMS"
  | "REPLAN_DAY"
  | "REPLAN_RANGE";

type CanonicalSchedule = PlanItemV1["schedule"];
type CanonicalPlace = PlanItemV1["place"];
type CanonicalLock = PlanItemV1["lockLevel"];

type EngineOperationV0_1 = OperationBase &
  (
    | {
        op: "ADD_ITEM";
        dayId: OpaqueId;
        position: number;
        item: PlanItemV1;
      }
    | {
        op: "MOVE_ITEM";
        itemId: OpaqueId;
        toDayId: OpaqueId;
        toPosition: number;
        schedule: CanonicalSchedule;
      }
    | { op: "DELETE_ITEM"; itemId: OpaqueId }
    | {
        op: "REPLACE_ITEM";
        itemId: OpaqueId;
        replacement: PlanItemV1;
      }
    | {
        op: "UPDATE_TIME";
        itemId: OpaqueId;
        schedule: CanonicalSchedule;
      }
    | {
        op: "UPDATE_PLACE";
        itemId: OpaqueId;
        place: CanonicalPlace;
      }
    | {
        op: "LOCK_ITEM" | "UNLOCK_ITEM";
        itemId: OpaqueId;
        toLockLevel: CanonicalLock;
      }
    | {
        op: "REORDER_ITEMS";
        dayId: OpaqueId;
        orderedItemIds: OpaqueId[];
      }
    | {
        op:
          | "UPDATE_ITEM"
          | "SKIP_ITEM"
          | "RESTORE_ITEM"
          | "REPLACE_TRANSPORT"
          | "UPDATE_DURATION"
          | "LINK_BOOKING"
          | "UPDATE_BOOKING_STATUS"
          | "REPLAN_DAY"
          | "REPLAN_RANGE";
        targetRef: OpaqueId | null;
      }
  );
```

引用 canonical fragment 的 payload 必须先由 4.17 parser 校验。`ADD_ITEM.item`、`REPLACE_ITEM.replacement` 等逻辑类型直接引用 `PlanItemV1`；Schedule、Place、Booking summary 与 Lock 也从该类型索引取得，不另建字段副本。

`position` / `toPosition` 是目标 day 的 scheduled `items` 数组内从 0 开始的插入位置，只表达明确顺序，不能被当作稳定 ID；越界必须阻断。`REORDER_ITEMS.orderedItemIds` 必须是当前 day scheduled item IDs 的无重复、无遗漏全排列，不能混入 `alternatives`。最后一组 operation 只保留可识别 target，当前 v0.1 不接受任意 payload；在对应 Open Decision 关闭并发布新契约前统一返回 `unsupported`。

## 5. Operation Whitelist

`op` 只能是下表中的大写 code。白名单表示“可识别的领域词汇”，**不表示运行时已经启用**。

| Operation               | 最小语义                                                     | v0.1 处理                                            |
| ----------------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| `ADD_ITEM`              | 向 canonical day 的明确位置加入 canonical item               | 可定义；apply 等 4.21/4.22                           |
| `UPDATE_ITEM`           | 更新 item 的受控字段集合                                     | `unsupported`，待 4.16/4.17 冻结 patch 字段          |
| `MOVE_ITEM`             | 将 item 移至目标 day/position，并显式给出新 schedule 或 null | 可定义；不得推测时间                                 |
| `DELETE_ITEM`           | 删除未受保护 item                                            | 可定义；预约/付款/锁定规则先评估                     |
| `SKIP_ITEM`             | 运行态跳过 item                                              | `unsupported`，待 4.16/4.23 冻结状态表达             |
| `RESTORE_ITEM`          | 恢复已跳过/删除 item                                         | `unsupported`，待 history/runtime identity 规则      |
| `REPLACE_ITEM`          | 用 canonical replacement 替换目标 item                       | 可定义；保护与确认规则先评估                         |
| `REPLACE_TRANSPORT`     | 替换交通 item                                                | `unsupported`，待 4.16 transport 字段冻结            |
| `UPDATE_TIME`           | 以 canonical schedule 或 null 替换原 schedule                | 可定义；必须检查时区与冲突                           |
| `UPDATE_DURATION`       | 改变 item duration                                           | `unsupported`；4.17 当前无独立 duration 字段         |
| `UPDATE_PLACE`          | 以 canonical place 或 null 替换地点                          | 可定义；依赖路线时不得伪造坐标                       |
| `LINK_BOOKING`          | 把可信标准化 booking 关联到 item                             | 仅可信 BookingService；当前 `unsupported`            |
| `UPDATE_BOOKING_STATUS` | 根据可信 booking fact 更新摘要                               | 仅可信 BookingService；当前 `unsupported`            |
| `LOCK_ITEM`             | 提升到允许的 canonical lock level                            | 可定义；不得由 AI 创建 booking/payment/system lock   |
| `UNLOCK_ITEM`           | 按权限和确认策略降低 lock                                    | system hard lock 不可由普通 ChangeSet 解锁           |
| `REORDER_ITEMS`         | 提交 day 内全部 scheduled item ID 的无重复全排列             | 可定义；不从 UI 坐标推断顺序                         |
| `REPLAN_DAY`            | 对单日重新规划的宏意图                                       | proposal-only；展开为原子 operation 前 `unsupported` |
| `REPLAN_RANGE`          | 对日期范围重新规划的宏意图                                   | proposal-only；展开前 `unsupported`                  |

未知 `op`、大小写变体、任意 SQL、任意 JSON Patch path、`cancel_booking`、`modify_paid_booking`、`purchase_ticket` 或 Provider tool name 一律 `unsupported`，不得静默忽略。

## 6. validate / preview / apply / rollback

### 6.1 validate

`validate(changeSet, authoritativeSnapshot, policyContext)` 是只读确定性判断：

- 先用 4.17 parser 校验 authoritative snapshot；
- 校验 Engine 版本、operation whitelist、ID 引用和 baseVersion；
- 解析可信身份、membership、lock、booking、预算、时间与 Provider fact；
- 返回 outcome、结构化 issues 和 confirmation requirements；
- 不写 Trip、version、audit、idempotency、cache 或外部服务。

validate 结果不是 apply capability。apply 必须在事务内重新校验所有可变化事实。

### 6.2 preview

`preview` 包含 validate，并在内存中对 detached canonical snapshot 模拟 operations，返回 before/after 摘要和 affected refs。

Preview 的绝对规则：

- 不保存 Trip 或草稿；
- 不分配持久化 revision/ID；
- 不写 idempotency、audit、history 或 event；
- 不预约、不取消、不付款、不调用付费 Provider；
- 不改变 Booking、Payment、lock 或外部订单；
- 不把 Preview 的 `nextVersion` 当成已经提交；
- 缺失或过期关键事实时不得显示“正常”，必须返回 warning/blocked issue。

`previewHash` 只用于 UI 比对；它不授权 apply。apply 时 snapshot、版本、权限、事实或 payload 任一变化都必须重新预览/确认。

### 6.3 apply

`apply` 只接受：

1. whitelist 中当前可执行的 operation；
2. 最新 baseVersion；
3. 可信 actor 具备写权限；
4. 所有 blocking issue 已消失；
5. 所有 confirmation requirement 都有与 actor、payloadHash、baseVersion、scope 绑定的服务端 confirmation grant；
6. 幂等检查通过。

未来 4.22/8.5 实现必须在一个事务中完成：重校验 → operations → 新 plan/trip revision → audit link → current revision → outbox/sync record → commit。当前 PR 不实现该事务。

### 6.4 rollback

“rollback”有两个严格不同的含义：

- **事务内失败回滚**：commit 前任一步失败，数据库自动回滚，canonical snapshot/revision/audit/outbox 均不产生半成品。
- **提交后恢复历史**：不是 revision 倒退，而是在当前最新版之上创建一个新的 compensating ChangeSet；仍需权限、baseVersion、保护检查、确认和幂等。

提交后恢复只覆盖 TravelAssist 自有 Plan 内容。外部预约、付款、Provider 状态、已经发送的通知和现实世界动作不在可逆边界内。当前任务也不允许执行这些外部副作用。恢复语义依赖 4.23 与 8.5，运行时目前返回 `unsupported`。

## 7. 统一结果模型

所有四种能力返回同一结果族，不使用含混的布尔值：

```ts
type EngineOutcome =
  "accepted" | "needsConfirmation" | "blocked" | "unsupported";

type EngineResultV0_1 = {
  engineContractVersion: "0.1";
  requestKind: "validate" | "preview" | "apply" | "rollback";
  outcome: EngineOutcome;
  changeSetId: OpaqueId;
  idempotencyKey: OpaqueId;
  payloadHash: string;
  observedVersion: {
    tripRevision: number;
    planRevision: number;
  } | null;
  resultingVersion: {
    tripRevision: number;
    planRevision: number;
  } | null;
  issues: EngineIssueV0_1[];
  assessment?: ReasonablenessReportV0_1; // Optional 4.20.1 output; see section 24.
  confirmationRequirements: ConfirmationRequirementV0_1[];
  preview: PreviewV0_1 | null;
  replay: {
    duplicate: boolean;
    originalChangeSetId: OpaqueId | null;
  };
  transaction: {
    status: "not_started" | "committed" | "rolled_back" | "outcome_unknown";
    retryable: boolean;
  };
};
```

结果语义：

| Outcome             | 含义                                                                   | 是否发生持久化                              |
| ------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| `accepted`          | 当前请求在该 capability 下通过；对 apply 表示事务已 commit             | validate/preview：否；apply：仅 commit 后是 |
| `needsConfirmation` | 没有 blocking issue，但存在必须由用户确认的风险                        | 否                                          |
| `blocked`           | operation 可识别，但权限、锁、版本、硬约束、关键事实或事务状态阻止继续 | 否                                          |
| `unsupported`       | Engine/version/operation 或依赖能力未被本版本支持                      | 否                                          |

同一结果同时出现多个 issue 时，outcome 按 `unsupported > blocked > needsConfirmation > accepted` 取最严格值。warning 可以随 `accepted` 返回，但 warning 不得掩盖需要确认或阻断条件。`resultingVersion` 只有成功 apply/提交后恢复时非 null；Preview 永远为 null。

`accepted` 在不同 requestKind 下不可混用：

- validate accepted：结构、规则和当前上下文通过；
- preview accepted：纯模拟可展示；
- apply accepted：未来 runtime 已原子提交；
- rollback accepted：未来 runtime 已提交新的 compensating ChangeSet。

## 8. Issue / Error 模型

```ts
type EngineIssueV0_1 = {
  code: string;
  category:
    | "input"
    | "authorization"
    | "version"
    | "lock"
    | "booking"
    | "budget"
    | "schedule"
    | "location"
    | "provider_fact"
    | "idempotency"
    | "transaction"
    | "rollback";
  severity: "warning" | "confirmation" | "blocking";
  path: string | null;
  operationId: OpaqueId | null;
  subjectRef: OpaqueId | null;
  retryable: boolean;
  details: Record<string, string | number | boolean | null>;
};
```

`details` 只允许安全、可本地化的机器数据，例如当前/期望 revision、fact expiry、金额差值和冲突 item ID。不得包含 token、原始 Provider payload、订单验证码、SQL、用户私密 notes 或异常堆栈。UI 文案由 Consumer 根据 code 本地化。

### 8.1 规范化错误目录

| Code                                  | 触发条件                                            | 默认 outcome / 规则                                    |
| ------------------------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| `INPUT_INVALID`                       | ChangeSet 或 canonical fragment 结构非法            | blocked；修正输入                                      |
| `TARGET_NOT_FOUND`                    | trip/plan/day/item 引用不存在或不属于 target        | blocked；不得猜测                                      |
| `AUTH_REQUIRED`                       | 无可信身份                                          | blocked                                                |
| `PERMISSION_DENIED`                   | actor 不是可写成员或 scope 不允许                   | blocked                                                |
| `READ_ONLY_ROLE`                      | Viewer 等只读角色请求 apply/rollback                | blocked                                                |
| `BASE_VERSION_STALE`                  | trip 或 plan revision 与 baseVersion 不同           | blocked；返回实际 revision，重新加载                   |
| `USER_LOCK_CONFIRMATION_REQUIRED`     | 变更用户锁定项且策略允许用户覆盖                    | needsConfirmation；AI/autopilot 不可绕过               |
| `BOOKING_LOCK_CONFIRMATION_REQUIRED`  | 影响预约锁                                          | needsConfirmation 或更严格产品规则                     |
| `PAYMENT_LOCK_CONFIRMATION_REQUIRED`  | 影响已付款项                                        | needsConfirmation；不得自动执行                        |
| `SYSTEM_HARD_LOCKED`                  | 触碰系统硬锁                                        | blocked                                                |
| `BOOKING_FACT_MISSING`                | 需要预约判断但没有可信标准化事实                    | blocked；unknown 不是正常                              |
| `BOOKING_FACT_STALE`                  | booking fact 已过期                                 | blocked                                                |
| `NON_REFUNDABLE_BOOKING_AFFECTED`     | 影响不可退款预约                                    | needsConfirmation；取消能力仍 unsupported              |
| `BOOKING_CANCELLATION_UNSUPPORTED`    | ChangeSet 试图取消真实预约                          | unsupported；交给未来 BookingService                   |
| `AMOUNT_CHANGE_CONFIRMATION_REQUIRED` | 产生、改变或承诺费用                                | needsConfirmation                                      |
| `BUDGET_SOFT_LIMIT_EXCEEDED`          | 超出软预算/阈值                                     | needsConfirmation                                      |
| `BUDGET_HARD_LIMIT_EXCEEDED`          | 超出已确认硬预算                                    | blocked                                                |
| `SOFT_TIME_CONFLICT`                  | 与可调整时间产生软冲突                              | needsConfirmation                                      |
| `HARD_TIME_CONFLICT`                  | 与硬时刻、固定预约或不可移动段冲突                  | blocked                                                |
| `INVALID_TIMEZONE_OR_INTERVAL`        | canonical 时间/时区/区间非法                        | blocked；不自动修正                                    |
| `COORDINATES_REQUIRED`                | 路线影响判断需要坐标但 place.coordinates 为 null    | blocked；不得用城市中心补造                            |
| `PROVIDER_FACT_MISSING`               | 需要天气/路线/运行事实但未提供                      | blocked 或与本 operation 无关时 warning                |
| `PROVIDER_FACT_EXPIRED`               | `expiresAt <= evaluationTime`                       | 关键事实：blocked；非关键事实：warning，永不 all-clear |
| `PROVIDER_FACT_LOW_CONFIDENCE`        | confidence 低于未来策略阈值                         | needsConfirmation 或 blocked；阈值为 Open Decision     |
| `ROUTE_FACT_EXPIRED`                  | 移动/重排依赖的路线事实过期                         | blocked；不得调用付费 Provider 自动刷新                |
| `IDEMPOTENCY_KEY_REUSED`              | 相同 key 对应不同 canonical payloadHash             | blocked；安全冲突                                      |
| `TRANSACTION_FAILED`                  | 事务明确失败且已回滚                                | blocked；状态不变，可按 retryable 指示重试             |
| `TRANSACTION_OUTCOME_UNKNOWN`         | commit 响应不确定                                   | blocked；禁止换 key 重放，先按原 key 对账              |
| `ROLLBACK_OUT_OF_SCOPE`               | 请求恢复外部预约/付款等不可逆副作用                 | unsupported                                            |
| `ROLLBACK_BASE_STALE`                 | history restore 不基于当前最新版                    | blocked                                                |
| `ROLLBACK_DATA_UNAVAILABLE`           | 所需历史/反向信息不在保留窗口                       | blocked                                                |
| `OPERATION_UNSUPPORTED`               | 未知、尚未启用或 proposal-only operation 直接 apply | unsupported                                            |
| `CONTRACT_VERSION_UNSUPPORTED`        | Engine 或 Trip Contract 版本不支持                  | unsupported                                            |

同一事实在 Preview 中为 warning、在 Apply 中为 blocking 的前提必须由 operation dependency 明确决定，不允许 UI 自行降级。权限拒绝对外不得泄漏对象是否存在；服务端可将不存在与无权访问统一映射为安全的 blocking response。

## 9. 用户确认策略

### 9.1 永远需要显式确认

以下变更不能由 AI/autopilot 或简单 `confirmed: true` 绕过：

- 新增费用、金额变化或超过预算阈值；
- 新增、更换、删除或移动酒店/入住退房；
- 影响、修改或建议取消真实预约；
- 影响已付款、不可退款或 booking/payment lock 项；
- 改变航班、长途铁路、国际交通或其他硬时刻；
- 覆盖 `USER_LOCK`，或按产品规则允许覆盖 `BOOKING_LOCK` / `PAYMENT_LOCK`；
- 删除 MUST_DO / non-cancellable / fixed-time 语义的项目（这些字段的 canonical 表达尚待确认）。

真实取消预约、修改付费预约和购票不在本 whitelist 内，即使用户确认也返回 `unsupported`，不得把确认等同于外部服务能力。

### 9.2 Confirmation Requirement / Grant

```ts
type ConfirmationRequirementV0_1 = {
  code: string;
  operationIds: OpaqueId[];
  subjectRefs: OpaqueId[];
  summaryKey: string;
  expiresAt: Instant | null;
};
```

Consumer 展示 requirement 后，未来可信服务签发 `confirmationGrantRef`。Grant 至少绑定：

- actor/session；
- tripId/planId；
- changeSetId、payloadHash；
- baseVersion；
- requirement codes 与 subjects；
- 签发时间、过期时间、一次性/重放策略。

apply 接收的只是 opaque grant reference；Engine 必须服务端解析并重校验。payload、版本、actor、事实或 requirement 变化时旧 grant 失效。Grant 的存储、TTL 与签名格式属于 Open Decisions。

### 9.3 Autopilot

Autopilot 只允许策略明确授权的低风险 operation，且仍需通过权限、版本、锁、预算、时间、Provider freshness 与幂等检查。未知值一律 fail safe。Level 1 只能 review；Level 2 只能 proposal + preview；Level 3 也不能越过上述 mandatory confirmation 或触发外部 Booking/Payment 副作用。

## 10. baseVersion / Optimistic Concurrency

1. 客户端从 4.17 snapshot 读取 `trip.revision` 与选中 `plan.revision`，原样写入 `baseVersion`。
2. validate/preview 记录 `observedVersion`，但不保留写锁。
3. apply/rollback 在未来事务内重新读取并比较两层 revision。
4. 任一不相等返回 `BASE_VERSION_STALE`，不自动 rebase、不部分应用、不覆盖新版本。
5. Consumer 必须重新加载 canonical snapshot，重新生成 Preview，并重新取得确认。
6. 成功 apply 创建新 revision；history restore 同样递增，绝不把 revision 减回旧值。
7. 多 plan 是否每次都递增 tripRevision、revision 的分配者和具体数据库字段依赖 8.5，不能由本任务写成 SQL 事实。

## 11. Idempotency / Replay

幂等 scope 至少包含可信 actor/tenant、tripId、planId、requestKind 与 `idempotencyKey`。服务端以 canonical serialization 计算 `payloadHash`；字段顺序、空白和传输编码不应造成不同 hash，语义字段差异必须造成不同 hash。

| 重放情况                                                   | 规则                                                                               |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| same key + same payload，已有 committed terminal result    | 原样返回首次 terminal result，`replay.duplicate=true`；不新增 revision/audit/event |
| same key + same payload，首次明确 rolled back 且 retryable | 可用同一 key 安全重试；不得改变 payload                                            |
| same key + same payload，首次 outcome unknown              | 不执行第二次写入；先按同一 key 查询/对账                                           |
| same key + different payload                               | `IDEMPOTENCY_KEY_REUSED` / blocked；既不覆盖旧记录也不执行新 payload               |
| different key + same payload                               | 视为新请求，仍受 baseVersion 约束；成功首请求后通常因 stale version 阻断           |

validate/preview 本身无持久副作用，但携带 idempotencyKey 便于全链路关联；不得因为 Preview 使用过 key 就宣称 apply 已去重。最终持久化 scope、retention 与 retry state machine 依赖 8.5。

## 12. Transaction Failure Contract

- apply 的业务写入、revision、audit link 与 outbox/sync record 必须同事务提交；没有“部分 accepted”。
- 明确事务失败：返回 `TRANSACTION_FAILED`、`transaction.status="rolled_back"`、`resultingVersion=null`；authoritative snapshot 不变。
- commit 成功：只有在读取到已提交 idempotency record/result 后才能返回 `accepted` 与 resultingVersion。
- 网络中断导致结果不确定：返回 `TRANSACTION_OUTCOME_UNKNOWN`，客户端必须用原 key 对账；禁止改 key 盲重试。
- Plan 事务之外可记录最小化运维故障 telemetry，但它不是 plan revision/audit 事实，不得包含敏感 payload。
- 事务边界、隔离级别、outbox、唯一约束和故障注入测试必须在 4.22/4.24 + 8.5 中实现；本文只有契约要求。

## 13. Preview / Impact Contract

Preview 只返回 Consumer 展示所需的确定性派生数据：

```ts
type PreviewV0_1 = {
  previewHash: string;
  baseVersion: {
    tripRevision: number;
    planRevision: number;
  };
  affected: {
    dayIds: OpaqueId[];
    itemIds: OpaqueId[];
    bookingRefs: OpaqueId[];
  };
  before: TripPlanSnapshotV1;
  after: TripPlanSnapshotV1;
  impact: {
    scheduleConflicts: OpaqueId[];
    amountDeltaMinor: number | null;
    currency: string | null;
    routeFactsUsed: OpaqueId[];
  };
};
```

`before` / `after` 必须都是通过 4.17 parser 的 detached snapshot，`after` 仅存在于响应内存/传输中。Preview 不承诺最终 apply 结果相同；apply 时出现并发、权限、锁或事实时效变化必须拒绝并重新生成 Preview。跨币种金额不得计算一个伪造总差值；`amountDeltaMinor` 为 null 并返回相应 issue。

## 14. Planner / Detail 接口

### 14.1 Producer adapter

Planner / Detail 只能从公开 UI action 生成 ChangeSet：

```text
Canonical TripPlanSnapshotV1
  + explicit UI action
  + trusted actor context reference
  → Planner/Detail adapter
  → ChangeSetV0_1
```

禁止将 React props、Zustand/Context/private Store、Mapbox object、DOM position、localStorage blob 或显示文案直接作为 Engine input。数组顺序来自 canonical day items；时间来自 canonical schedule；ID 不从 UI index 推导。

### 14.2 Consumer response

Planner 与 Detail 消费统一 EngineResult：

- `accepted` Preview：展示 before/after 与 warnings，仍不代表已保存；
- `needsConfirmation`：逐项展示 confirmation requirement，不将风险压成单一弹窗布尔值；
- `blocked`：保持原 snapshot，提示 reload/repair/re-auth 等可恢复动作；
- `unsupported`：隐藏或禁用未实现能力，不模拟成功；
- apply accepted：按 resultingVersion 重新读取 canonical snapshot，不直接把私有 UI state 当服务端真相。

Planner 与 Detail 可以拥有不同 ViewModel 和文案，但不得改变 outcome、issue severity、confirmation scope 或版本语义。

## 15. AI → ChangeSet 边界

AI Orchestrator 是候选 ChangeSet Producer，不是执行者：

1. Context Builder 只提供最小必要 canonical facts、用户授权范围和未过期 Provider facts。
2. 模型输出经独立 schema parser 转为 ChangeSet；未知 operation/字段 fail closed。
3. AI 只能提出 `source.kind="ai"` 的候选和解释，不能伪造 actor role、booking evidence、confirmation grant、baseVersion 或 Provider freshness。
4. Level 1 不产生可应用 ChangeSet；Level 2 必须 Preview + 用户确认；Level 3 仅可提交政策许可的低风险项。
5. AI 无 Service Role、数据库连接、任意 SQL、订单修改、支付或 provider credential。
6. `REPLAN_DAY` / `REPLAN_RANGE` 必须由未来受控 expander 展开成可审计原子 operations，再进入 validate；不能把“重新规划”当任意写权限。

Engine 不负责模型选择、提示词、偏好推理或 Provider 搜索。AI proposal 被 blocked/unsupported 时，Orchestrator 可以解释原因，但不得改写结果为 accepted。

## 16. Provider Fact 输入边界

Provider 输入必须先归一化：

```text
Provider raw response
  → Provider-owned adapter / cache
  → normalized fact + provenance
  → factRef + trusted fact resolver
  → Engine validation context
```

最低 provenance 为 `provider`、`observedAt`、`expiresAt`、`confidence` 与 subjectRef。Engine：

- 不接收 raw Provider payload、SDK object、token 或收费调用能力；
- 不在 validate/preview/apply 内隐式刷新或付费查询；
- 只使用 evaluationTime 时尚未过期、subject 匹配、来源允许的事实；
- 对坐标 null、路线事实缺失/过期、状态 unknown 采用 fail-safe；
- 不把 Provider 的建议路线直接变成用户授权；
- 把实际使用的 fact ID 写入 Preview；未来 apply/audit 记录只引用必要 provenance。

WBS 7.5 Route Contract v1.0 已合入并验收；4.21复用 `src/shared/contracts/routes` 的 RouteResponse/validator，不建立第二份 payload。生产Provider选择、授权/retention、TTL/confidence政策及降级范围仍由A在7.3/7.8/7.10/7.11核定；7.5已完成不表示这些生产决策全部关闭，见§25的OD-7.5-01/02。

## 17. B Save / History 消费边界

B 的 Save / History 只消费公开结果与 4.17 canonical snapshot：

- Save：未来通过公共 Trip/Plan service 保存已 apply 的 canonical state，不读取 Planner private Store。
- History：展示 revision、changeSetId、actor/source、时间、原因、operation summary 和必要 fact references；不显示 raw secrets/Provider payload。
- Resume：使用 4.17 `PlannerResumeV1` 的 tripId、planId、tripRevision、planRevision，版本不符时显式冲突。
- Restore：用户选择历史版本后，由服务生成新的 compensating ChangeSet；不直接把数据库快照覆盖 current row。
- Replay：相同幂等结果不重复创建 history entry。

5.18/5.19 可以建立自己的 persistence model / Trip Library ViewModel，但不能反向成为 Engine 或 4.17 的 Schema。当前 4.20 不修改 5.18/5.19、不实现保存 API，也不宣称已完成持久化。

## 18. 未来 8.5 Persistence 边界

本契约只对未来 persistence 提出可验证能力，不规定表名、列名或 Migration：

- authoritative trip/plan revision 与原子 compare-and-swap；
- scoped idempotency 唯一性、payloadHash、terminal result 与 unknown-outcome reconciliation；
- ChangeSet、operation summary、actor/source、confirmation grant reference 与 fact provenance 的审计关联；
- current state、new revision、audit 与 outbox 同事务；
- 可生成 compensating ChangeSet 所需的有限历史/反向信息；
- RLS/default deny 与服务端可信 membership/permission 检查；
- 不把 raw Provider payload、credential、支付资料或 UI state 存入 Engine 公共记录。

具体 SQL Schema、RLS policy、隔离级别、锁策略、retention、outbox 和 DB error mapping 均归 8.5/4.22，未冻结前保留为 Open Decisions。4.20 不新建业务表或 Migration。

## 19. 安全与信息披露

- 所有写能力默认拒绝；未知 role/status/lock/booking/provider code 从不等于安全。
- ChangeSet 不携带 Service Role、session secret、OAuth token、DB credential、payment credential、raw authorization header。
- Engine issue 不回显原始输入、自由文本、异常堆栈或资源存在性差异。
- Preview URL/response 不得成为写 capability；confirmation grant 为不透明、短期、scope-bound reference。
- 审计日志记录安全摘要和引用；敏感订单标识只由拥有该域的服务控制。
- Rate limit、body-size 与 abuse control 属于未来 service/API，但不得因未定义而允许无限输入。

## 20. 契约样例

以下 JSON 均为**设计样例**，不是 runtime fixture、DB 测试或已部署接口证据。为避免重复，后续结果样例省略未变化的必填 envelope 字段。

### 20.1 正常：纯 Preview

```json
{
  "engineContractVersion": "0.1",
  "tripContractVersion": "1.0",
  "changeSetId": "chg-example-normal",
  "idempotencyKey": "idem-example-normal",
  "target": { "tripId": "example-trip", "planId": "example-plan" },
  "baseVersion": { "tripRevision": 4, "planRevision": 3 },
  "source": {
    "kind": "user",
    "actorRef": "actor-example",
    "correlationId": "corr-example",
    "proposalRef": null
  },
  "reason": "把未预约景点后移三十分钟",
  "operations": [
    {
      "operationId": "op-example-time",
      "op": "UPDATE_TIME",
      "reason": null,
      "itemId": "example-item",
      "schedule": {
        "start": "2027-04-10T10:30:00+09:00",
        "end": "2027-04-10T11:30:00+09:00",
        "startTimezone": "Asia/Tokyo",
        "endTimezone": "Asia/Tokyo"
      }
    }
  ],
  "factRefs": []
}
```

Preview 响应：`outcome="accepted"`、`transaction.status="not_started"`、`resultingVersion=null`，并返回 detached before/after。没有持久化。

### 20.2 需确认：费用与酒店

```json
{
  "outcome": "needsConfirmation",
  "issues": [
    {
      "code": "AMOUNT_CHANGE_CONFIRMATION_REQUIRED",
      "category": "budget",
      "severity": "confirmation"
    }
  ],
  "confirmationRequirements": [
    {
      "code": "HOTEL_AND_AMOUNT_CHANGE",
      "operationIds": ["op-replace-hotel"],
      "subjectRefs": ["hotel-item"],
      "summaryKey": "engine.confirm.hotel_and_amount",
      "expiresAt": null
    }
  ]
}
```

未取得 scope-bound grant 前 apply 不得开始；用户确认也不会自动执行真实酒店改订或付款。

### 20.3 阻断：硬时间冲突

```json
{
  "outcome": "blocked",
  "issues": [
    {
      "code": "HARD_TIME_CONFLICT",
      "category": "schedule",
      "severity": "blocking",
      "operationId": "op-move",
      "subjectRef": "confirmed-train-item",
      "retryable": false,
      "details": { "conflictingItemId": "confirmed-train-item" }
    }
  ]
}
```

Engine 保持原 snapshot；不得把冲突降级成“正常”。

### 20.4 锁定

```json
{
  "outcome": "blocked",
  "issues": [
    {
      "code": "SYSTEM_HARD_LOCKED",
      "category": "lock",
      "severity": "blocking",
      "operationId": "op-delete",
      "subjectRef": "system-anchor",
      "retryable": false,
      "details": { "lockLevel": "system_hard_lock" }
    }
  ]
}
```

若是允许用户覆盖的 `user_lock`，结果改为 `needsConfirmation`；AI/autopilot 仍不可自行覆盖。

### 20.5 过期版本

```json
{
  "outcome": "blocked",
  "observedVersion": { "tripRevision": 5, "planRevision": 4 },
  "resultingVersion": null,
  "issues": [
    {
      "code": "BASE_VERSION_STALE",
      "category": "version",
      "severity": "blocking",
      "retryable": true,
      "details": {
        "expectedTripRevision": 4,
        "actualTripRevision": 5,
        "expectedPlanRevision": 3,
        "actualPlanRevision": 4
      }
    }
  ]
}
```

Consumer 必须重新读取、Preview、确认；Engine 不自动合并旧 payload。

### 20.6 重复请求

首次请求已成功提交后，same key + same payload：

```json
{
  "outcome": "accepted",
  "resultingVersion": { "tripRevision": 5, "planRevision": 4 },
  "replay": {
    "duplicate": true,
    "originalChangeSetId": "chg-example-normal"
  },
  "transaction": { "status": "committed", "retryable": false }
}
```

不新增 revision/audit/event。若同一 key 的 schedule 改成另一个时间，则返回 `IDEMPOTENCY_KEY_REUSED` / blocked，不能把新 payload 当重试。

### 20.7 事务失败

```json
{
  "outcome": "blocked",
  "resultingVersion": null,
  "issues": [
    {
      "code": "TRANSACTION_FAILED",
      "category": "transaction",
      "severity": "blocking",
      "retryable": true,
      "details": { "failureClass": "serialization_conflict" }
    }
  ],
  "transaction": { "status": "rolled_back", "retryable": true }
}
```

Trip/Plan、revision、audit 与 outbox 均保持事务前状态。`failureClass` 是安全归一化 code，不是数据库异常原文。

### 20.8 缺少坐标

```json
{
  "outcome": "blocked",
  "issues": [
    {
      "code": "COORDINATES_REQUIRED",
      "category": "location",
      "severity": "blocking",
      "operationId": "op-route-sensitive-reorder",
      "subjectRef": "place-with-null-coordinates",
      "retryable": true,
      "details": { "requiredFor": "route_impact" }
    }
  ]
}
```

Engine 不使用城市中心、地图视口中心或 `0,0` 补造坐标。若 operation 与路线无关，可保留 null，不能无条件阻断所有文本更新。

### 20.9 过期路线事实

```json
{
  "outcome": "blocked",
  "issues": [
    {
      "code": "ROUTE_FACT_EXPIRED",
      "category": "provider_fact",
      "severity": "blocking",
      "operationId": "op-move",
      "subjectRef": "route-fact-example",
      "retryable": true,
      "details": {
        "provider": "example-provider",
        "expiresAt": "2027-04-10T00:05:00Z",
        "evaluatedAt": "2027-04-10T00:10:00Z"
      }
    }
  ]
}
```

Preview/apply 不隐式调用 Provider。Consumer 可请求 Provider-owned refresh，再以新 factRef 重新生成 ChangeSet/Preview。

## 21. Acceptance Matrix

以下矩阵的 Runtime 状态保留原4.20设计交付时点；2026-09-10的实际实现与冻结结论以§25为准。设计案例不转换为未运行的事务/DB验收证据。

| Acceptance                                                                                        | 契约证据                  | 预期结果                                                   | Runtime 状态        |
| ------------------------------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------- | ------------------- |
| TravelAssist Engine / Trip Engine 定义一致                                                        | `1`                       | 确定性变更层，不是 AI/Provider/UI/DB                       | 仅设计              |
| Producer / Consumer 与 Owner 明确                                                                 | `3`                       | A 主数据与 UI/AI/Provider 边界保留；B 产出 Engine Contract | 仅设计              |
| 4.17 是唯一 Schema                                                                                | `2`、`4`                  | Engine 引用 canonical types，无复制                        | 文档可审查          |
| ChangeSet 有 target、baseVersion、identity ref、source、reason、operations、factRefs、idempotency | `4`                       | 缺失/未知字段 fail closed                                  | parser 未实现       |
| Operation whitelist 严格且未实现项 unsupported                                                    | `5`                       | 未知 SQL/tool/op 不执行                                    | runtime 未实现      |
| validate 无副作用                                                                                 | `6.1`                     | 只读结果                                                   | runtime 未实现      |
| preview 无副作用                                                                                  | `6.2`、`13`、样例 20.1    | 无保存/预约/收费/持久 ID/revision                          | runtime 未实现      |
| apply 需权限、最新版本、确认、幂等                                                                | `6.3`、`9–12`             | 任一 gate 失败不写入                                       | 依赖 4.22/8.5       |
| rollback 边界明确                                                                                 | `6.4`                     | 事务回滚与历史恢复分离；外部副作用不可逆                   | 依赖 4.23/8.5       |
| accepted / needsConfirmation / blocked / unsupported 完整                                         | `7`                       | 使用最严格 outcome                                         | parser 未实现       |
| 权限 / 锁 / 预约保护                                                                              | `8`、`9`、样例 20.3–20.4  | default deny；未知不视为安全                               | 依赖 Auth/4.21/4.22 |
| 预算 / 时间冲突                                                                                   | `8`、`9`、样例 20.2–20.3  | 软风险确认，硬规则阻断                                     | 阈值待产品确认      |
| 坐标缺失 / Provider 事实过期                                                                      | `8`、`16`、样例 20.8–20.9 | 不伪造、不 all-clear、不付费刷新                           | 依赖 7.5            |
| optimistic concurrency                                                                            | `10`、样例 20.5           | trip/plan 任一 stale 即阻断                                | 依赖 8.5            |
| same key replay                                                                                   | `11`、样例 20.6           | same payload 重放原结果；different payload 冲突            | 依赖 8.5            |
| transaction failure 原子                                                                          | `12`、样例 20.7           | 明确 rolled back 或 outcome unknown；无半成品              | 依赖 4.22/8.5       |
| Planner / Detail 接口不消费私有 state                                                             | `14`                      | action adapter + canonical snapshot/result                 | UI 未修改           |
| AI 只能 proposal                                                                                  | `15`                      | 无 DB/Service Role/任意操作                                | AI 未修改           |
| B Save / History 边界                                                                             | `17`                      | canonical snapshot/result/resume；恢复生成新 ChangeSet     | 5.18/5.19 未修改    |
| 8.5 persistence 不被提前设计成表                                                                  | `18`                      | 只定义所需能力，不定义 SQL                                 | 8.5 未启动          |
| 正常/确认/阻断/锁定/stale/duplicate/transaction/coordinates/route-stale 样例                      | `20`                      | 设计案例齐全                                               | 不冒充 runtime test |
| Open Decisions 未伪装 frozen                                                                      | `22`                      | 每项有 owner/dependency/gate                               | 待 A/B/产品审查     |

## 22. Open Decisions

以下原始ID与未决事项完整保留。未决实现参数本身仍**不是 frozen spec**；§25逐项区分Contract Freeze Blocker与Deferred Implementation Decision。后者阻止对应能力启用，不再阻止已明确的v0.1公共语义冻结；禁止自行填默认值绕过依赖。

| ID               | 未确定事项                                                                                                        | 依赖 / 决策 Owner                   | 对后续的 gate                         |
| ---------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------------- |
| `OD-4.16-01`     | `UPDATE_ITEM` 可变字段、`duration`、transport 结构、skip/restore、MUST_DO/fixed/non-cancellable 的 canonical 表达 | A / 4.16，并可能需要 4.17 新版本    | 未关闭前相应 operation 为 unsupported |
| `OD-4.16-02`     | REPLACE/MOVE 后 stable item identity、跨 day identity 与 alternative promotion 规则                               | A / 4.16 + 4.17 Consumer review     | 4.21 operation semantics              |
| `OD-8.5-01`      | tripRevision/planRevision 的数据库分配与同事务递增规则                                                            | A / 8.5，B Engine review            | 4.22 apply                            |
| `OD-8.5-02`      | idempotency scope、canonical hash 算法、唯一约束、retention、retry/unknown-outcome 对账状态机                     | A/B / 8.5 + 4.22                    | apply/replay 实现                     |
| `OD-8.5-03`      | audit/history/outbox Schema、事务隔离级别、DB error → EngineIssue 映射                                            | A/B / 8.5 + 4.22                    | transaction acceptance                |
| `OD-8.5-04`      | history 保留窗口、生成 compensating ChangeSet 所需 before/after 信息与清理策略                                    | A/B / 8.5 + 4.23                    | rollback                              |
| `OD-7.5-01`      | normalized route fact payload、subject identity、路线 alternatives、TTL、confidence 和 provider fallback          | A / 7.5                             | route-sensitive 4.21 rules            |
| `OD-7.5-02`      | 何种 operation 必须有坐标/路线事实；离线或无 Provider 时可接受的降级                                              | A/产品 / 7.5                        | coordinates/provider issue severity   |
| `OD-PRODUCT-01`  | 预算 soft/hard 阈值、币种换算政策、金额变化最小确认单位                                                           | 产品                                | budget outcome                        |
| `OD-PRODUCT-02`  | Hotel、航班、长途铁路、预约、MUST_DO 的精确确认组合与是否存在不可覆盖项                                           | 产品 + Booking Owner                | confirmation policy                   |
| `OD-PRODUCT-03`  | USER/BOOKING/PAYMENT lock 的可覆盖角色、多人协作权限、grant 是否一次性及 TTL                                      | 产品/Auth/Booking                   | permission + confirmation             |
| `OD-PRODUCT-04`  | Level 3 Autopilot 可执行 operation、时间/金额/范围上限与撤销窗口                                                  | 产品/AI Owner/B                     | autopilot allowlist                   |
| `OD-BOOKING-01`  | 可信 booking fact、refundability、取消/修改状态机与 Provider-specific side-effect boundary                        | Booking Owner（尚未冻结）           | booking operations 保持 unsupported   |
| `OD-SAVE-01`     | 5.18/5.19 保存、历史、resume 与 Engine applied result 的正式 service handoff                                      | B + A Consumer review               | Save/History integration              |
| `OD-CONTRACT-01` | Engine v0.1 wire naming、payload caps、unknown enum forward-compatibility 与 parser 发布位置                      | B Producer + A Integration Reviewer | 冻结部分已审计；剩余发布决策见§25     |
| `OD-ERROR-01`    | 对外隐藏 not-found/permission 差异的统一 code、可观测性 correlation 与本地化 message catalog                      | Security/Auth/UI Owners             | service exposure                      |

## 23. 后续阶段与停止边界

- 4.20：Contract v0.1 Frozen；B / 已完成。本次Closeout PR仅提交最终审计及追踪，待用户确认，不自动合并。
- 4.21：确定性 rule/preview runtime子集，**已完成**；用户验收，PR #288已合入。
- 4.22：事务 apply/permission/idempotency/version/audit，**未启动**，且 8.5 未满足。
- 4.23：runtime event / local replan / rollback execution，**未启动**，且依赖 7.5。
- 4.24：回归、并发、失败、回放集成验收，**未启动**。

本次冻结不追加授权4.21新能力或启动4.22–4.24，也不授权 Planner/Detail/Start/Personal Center UI、4.16 runtime core、4.17 canonical schema、8.5 SQL Schema、业务表、Migration、API endpoint、Engine runtime、transaction apply、runtime rollback、AI runtime、Mapbox、Route Provider、Booking、Payment、Authentication 或任何付费 Provider 调用。

## 24. WBS 4.20.1 Amendment：行程合理性输出（Review Candidate）

标题保留原审查记录及链接锚点；本节现已作为Frozen v0.1的一部分，当前状态见§25。

### 24.1 增量范围与兼容性

Issue [#282](https://github.com/kanzakimy0/TravelAssist/issues/282)；Owner B；审计基线 `fe538e7093bd58e7d0fe7fd434bf907dd132277a`。本节是同一Engine v0.1的已验收增量，随§25冻结；不是新Engine或Trip Plan Schema。本节原始设计案例保持历史语境；runtime证据单独由4.21提供。

§1–23 的 ChangeSet、operation whitelist、validate/preview/apply/rollback、权限、确认、双 revision、幂等、事务、audit、rollback 与 Provider fact 边界继续有效。§7 的四种顶层 outcome 不改名、不新增第五种终态；`warning` 通过下述 assessment status 及既有 `issues[].severity="warning"` 明确区分。既有纯 v0.1 结果仍有效，但未携带 assessment **不等于完成合理性评估**。

新增的可选结果字段为 §7 `EngineResultV0_1.assessment?: ReasonablenessReportV0_1`，只有识别本 Amendment 的 Consumer 才能使用。缺字段表示未请求/未提供该能力；`coverage` 表示已请求的规则覆盖情况。启用规则的策略/能力协商属于可信 service boundary，不能由客户端关闭硬规则。未来 Consumer 要求 assessment 而能力不可用时必须返回 `unsupported`，不能退回裸 `accepted`。旧 Consumer 无法解析所需扩展时也 fail closed；v0.1冻结审计见§25（OD-ASSESSMENT-01）；后续具体A Consumer接线仍须单独review，不声称“任意旧 parser 自动兼容”。

### 24.2 输入归属与 duration 审计

| 输入                                   | 权威来源 / 用法                                                                    | 禁止                                                                             |
| -------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 景点多维评分（当前 43 字段方向）       | Attraction / Profile / Rule 输入；以版本化、可信 resolver 引用提供给 policyContext | 不把 43 字段、偏好向量或匹配公式复制到 ChangeSet；不把高匹配分当作可执行证明     |
| minimum / recommended duration         | 特定景点及明确 Visit Mode 的规则/profile；来源、版本、时效与适用条件可追踪         | 不把清水寺样例阈值作为全局常数，不自动换成 photo-stop 模式来通过检查             |
| 计划停留                               | 已校验 canonical `PlanItemV1.schedule` 的起止 instant；派生分钟数仅用于本次评估    | 不写回 Engine 私有 duration 字段；不把当地钟面时间直接相减                       |
| 实际停留 actual duration               | 未来可信执行事实（若具有正式拥有者和契约）；规划阶段只能使用计划区间作为预测依据   | 不把计划90分钟声称为已实际游览90分钟；事实来源尚未冻结时不伪造 observed duration |
| walking / physical intensity           | 标准 Visit Mode / 推荐时长下的负担基准，或版本化实测强度事实                       | 不把 walking=7 当作每次访问固定总疲劳7                                           |
| route / environment / party / recovery | 既有 Provider-owned normalized facts、可信参与者约束及未来规则上下文引用           | 无 raw payload、无未经授权的个人资料、无隐式外部查询                             |

审计 `src/shared/contracts/trips/index.ts`：当前 item 只有可空 schedule，**无独立 visit duration 或 observed-duration 字段**；TripDraftFacts 的 `dates.durationDays` 是旅行天数，不能代替 item duration。`UPDATE_DURATION` 继续命中 §5 `unsupported`（`OPERATION_UNSUPPORTED`），只接受现有 targetRef 形状；附加 duration payload 仍被 §4 拒绝。不得把这个 operation 静默翻译成 UPDATE_TIME。

显式 `UPDATE_TIME` 仍可使用 canonical schedule 做纯评估：完整 instant 区间能够导出30或90分钟，并不意味着独立 duration 编辑已启用。null schedule、缺失实际执行事实、排队/休息/游览分段无法区分时，以 unknown / insufficient inputs 表达，不能从推荐时长补出“实际时长”。区间与活动时长的区别、Visit Mode 绑定和分段规则由4.16/4.17及4.21协商，不在本 Amendment 写入 Plan。

审计参考：未合并的 [PR #266](https://github.com/kanzakimy0/TravelAssist/pull/266) 内 `poi-master-schema-v0.2.md`、`poi-scoring-spec-v0.2.md`、`itinerary-feasibility-spec-v0.1.md` 提出 Visit Profile、标准负担和单日/多日规则。其 schema、公式、阈值仍为候选；本 Amendment 只承接 #282 明确要求的语义，不将该分支导入或宣称冻结。具体43字段清单仍由其数据拥有者维护。

### 24.3 结构化 assessment / impact

以下声明引用现有canonical IDs与§8 issue，已由4.21在同一公共类型目录实现并通过AST一致性测试；本次冻结**不修改src类型或运行时实现**：

```ts
type AssessmentStatus =
  "accepted" | "warning" | "needsConfirmation" | "blocked" | "unsupported";

type AssessmentScope =
  | { kind: "item"; planId: OpaqueId; dayId: OpaqueId; itemId: OpaqueId }
  | { kind: "day"; planId: OpaqueId; dayId: OpaqueId }
  | { kind: "itinerary"; planId: OpaqueId; dayIds: OpaqueId[] };

type AssessmentEvidenceRef = {
  kind: "canonical_schedule" | "profile" | "rule" | "provider_fact" | "context";
  ref: OpaqueId;
  version: string;
};

type DurationEvidence = {
  basis: "planned_schedule" | "observed_fact" | "unknown";
  evaluatedMinutes: number | null;
  minimumMinutes: number | null;
  recommendedMinutes: number | null;
  visitModeRef: OpaqueId | null;
  sourceRefs: AssessmentEvidenceRef[];
};

type AssessmentImpact = {
  metric:
    "physical_load" | "fatigue_impact" | "schedule_conflict" | "day_overload";
  state: "evaluated" | "not_evaluated" | "insufficient_inputs" | "unsupported";
  direction: "increase" | "decrease" | "unchanged" | "unknown";
  value: number | null;
  unit: string | null;
  modelRef: OpaqueId | null;
  modelVersion: string | null;
  durationBasis: DurationEvidence["basis"];
  relatedItemIds: OpaqueId[];
  relatedDayIds: OpaqueId[];
  sourceRefs: AssessmentEvidenceRef[];
};

type RuleAssessment = {
  assessmentId: OpaqueId;
  scope: AssessmentScope;
  dimension:
    | "duration"
    | "physical_load"
    | "fatigue"
    | "schedule"
    | "day_capacity"
    | "itinerary_reasonableness";
  status: AssessmentStatus;
  reasonableness: "reasonable" | "unreasonable" | "undetermined";
  ruleRef: OpaqueId;
  ruleVersion: string;
  reasonCodes: string[];
  issueIndexes: number[];
  relatedAssessmentIds: OpaqueId[];
  duration: DurationEvidence | null;
  impacts: AssessmentImpact[];
  sourceRefs: AssessmentEvidenceRef[];
};

type ReasonablenessReportV0_1 = {
  amendment: "4.20.1";
  evaluatedAt: Instant;
  observedVersion: EngineResultV0_1["observedVersion"];
  contextFingerprint: string;
  policyRef: OpaqueId;
  policyVersion: string;
  status: AssessmentStatus;
  reasonableness: "reasonable" | "unreasonable" | "undetermined";
  coverage: {
    scope: AssessmentScope;
    dimension: RuleAssessment["dimension"];
    state:
      "evaluated" | "not_evaluated" | "insufficient_inputs" | "unsupported";
    assessmentIds: OpaqueId[];
  }[];
  assessments: RuleAssessment[];
};
```

约束：

1. `observedVersion` 必须与同一 EngineResult 一致；report 的 scope 全部属于 ChangeSet.target.planId。itinerary 指明确选中的 plan/day 集合，不能把不同备选 plan 拼成一趟旅行。item/day ID 引用 canonical snapshot，不创建新的身份体系。
2. `assessmentId` 只在本响应内唯一；`issueIndexes` 是同一不可变 EngineResult.issues 数组的零基索引，每项必须存在并与 scope / operation 相符。relatedAssessmentIds 同样只能引用本 report；不能让 Consumer 靠本地化文案推断关联。
3. 每个非 accepted assessment 必须对应至少一个既有形状的 EngineIssue；新增 reason code 使用下表，category 使用既有 `schedule`（行程可行性）、`input` 或 `provider_fact` 等适当域。warning/confirmation/blocking 映射不可由 UI 降级。未满足的 needsConfirmation 必须同时存在 §9 requirement；它不是一条普通提示。
4. `DurationEvidence` 是输出证据，不是 Plan 状态；分钟值为有限非负数，unknown 必须为 null；minimum 不得大于 recommended，规则/profile矛盾视为输入不足并阻止 all-clear。observed_fact 必须有可信事实引用；planned_schedule 必须有 canonical schedule/revision 引用。
5. value 不可用时为 null，**不是0**；非空值必须有公开的 unit、modelRef/version、sourceRefs。unit/model 标尺由4.21版本化，不在此冻结疲劳单位；不同单位或模型版本不得直接相加或比较。direction 相对于本次 before/after，无法比较时为 unknown，不能猜测。
6. coverage 必须逐一列出可信策略要求的 scope × dimension；未执行、输入不足、能力不支持均不得标为 evaluated。未覆盖的必要规则使总体 reasonableness=undetermined；已发现硬性不合理可仍为 unreasonable，但不能因未知而删除已发现风险。全部“已执行项通过”不能替代“全部必要项已执行”。
7. 单景点 duration pass 只证明该维度；单日需独立考虑转场、营业窗口、交通、用餐/休息/buffer、参与者约束与负荷；itinerary 需独立考虑跨日连续活动/恢复、日期线与整体节奏。子项全通过不推导父级通过；聚合逻辑/疲劳累计属于4.21。
8. `contextFingerprint` 绑定评价时间、profile/规则版本、实际使用的事实和上下文引用，以及本次 canonical before/after；它不是 credential 或用户原始资料。该绑定纳入 previewHash 和服务端确认有效性核验。事实/profile/规则/context 任一变化，旧 preview/确认不能复用；幂等 committed replay 仍返回原 terminal result，不重新计算并改写历史。
9. report 是只读返回数据，不写入 `PlanItemV1.assessment` 或 Save/History 表；canonical assessment code 仍由4.17拥有。未来审计只引用必要规则版本/证据和结果摘要，仍遵守§12/17/18事务及披露边界。
10. 拒绝未授权 snapshot 读取后不生成泄漏行程的 report；缺失能力或前置失败可无 report，但顶层 issue/outcome 必须明确 fail closed。

### 24.4 状态与稳定 reason codes

| Assessment status | 顶层兼容表达                                                  | 语义                                              |
| ----------------- | ------------------------------------------------------------- | ------------------------------------------------- |
| accepted          | accepted（若没有其他更严格 issue）                            | 此次请求的必要规则已评估且通过；不是已保存        |
| warning           | accepted + warning issues                                     | 有可展示的非强制确认风险；不是无风险 all-clear    |
| needsConfirmation | needsConfirmation + confirmation issues + requirements        | 策略允许覆盖的风险，必须有有效 scope-bound grant  |
| blocked           | blocked + blocking issues                                     | 硬约束、必要输入、权限或版本不满足；确认不能覆盖  |
| unsupported       | unsupported + OPERATION_UNSUPPORTED 或 ASSESSMENT_UNSUPPORTED | operation / 规则能力 / 输入表达未支持；不模拟通过 |

report 的 status 按 `unsupported > blocked > needsConfirmation > warning > accepted` 聚合；顶层继续按§7优先级聚合**所有** issue，不能由较宽松的 report 覆盖权限/锁/版本错误。reasonableness 与 status 分开：规则缺失是 undetermined，不是“已经证明不合理”；一个可确认的压缩游览也不等于已完成交易。已签发 grant 只能解除可覆盖确认门，不能抹去风险证据或改变硬约束；apply 仍须执行§6/9的重新校验，事务提交语义不变。

| Code                     | machine-readable 含义 / 典型 details                                                       | 策略边界                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| DURATION_TOO_SHORT       | evaluatedMinutes 小于 minimumMinutes；details 含三种分钟值、durationBasis、ruleRef/version | 硬 minimum 为 blocked；若产品定义为可覆盖的软下限则 needsConfirmation，不能静默 accepted |
| COMPRESSED_VISIT         | 达到 minimum 但低于 recommended                                                            | warning 或 needsConfirmation，由版本化策略决定                                           |
| DURATION_RULE_PASSED     | 该模式 duration 规则通过                                                                   | accepted assessment，无需制造成功 issue；仍有独立规则                                    |
| PHYSICAL_LOAD_IMPACT     | 本次访问或变更带来体力负荷影响                                                             | impacts 给出依据、durationBasis及关联refs；不输出固定POI最终疲劳                         |
| FATIGUE_IMPACT           | 单日/跨日活动及恢复影响                                                                    | 独立于匹配分和单景点强度；公式/阈值未冻结                                                |
| DAY_OVERLOADED           | 单日时间/负荷/休息容量不满足                                                               | 软风险需确认、硬容量 blocked；details 仅输出已知值及 ruleRef                             |
| ITINERARY_UNREASONABLE   | 整段规则发现不合理                                                                         | 引用相关 day/item assessments；不能靠平均景点评分掩盖超载日                              |
| ASSESSMENT_INPUT_MISSING | duration/profile/context缺失或矛盾                                                         | 必要规则 blocked；非必要规则 warning + coverage gap，不能 all-clear                      |
| ASSESSMENT_UNSUPPORTED   | 所需规则/能力/正式字段尚未支持                                                             | unsupported，details.dependency 指明4.17/4.21等依赖                                      |

schedule conflict **复用**§8的 `SOFT_TIME_CONFLICT` / `HARD_TIME_CONFLICT`，不新造同义 code；impact.metric=schedule_conflict 引用冲突项，拒绝推断/伪造 Route Provider 事实。单 item 的 unreasonable 使用 reasonableness 加 DURATION_TOO_SHORT 等具体 code；没有必要再创建一个同义总错误。

### 24.5 physical intensity × actual duration × context 的边界

未来规则层必须允许将**强度 × 本次活动时长 × route/environment/context**作为影响模型输入关系；这不是此处冻结的乘法公式。可考虑固定入场路径、可变活动、坡度/台阶、天气、同行人限制、已有负荷与恢复；不保证简单线性或时间缩短必然同比降低负荷。

同一 POI 在30/90分钟方案下必须能够产生不同 load/fatigue assessment，并说明采用 planned 还是 observed 时长。缺少模型、单位或上下文时输出 not_evaluated/unsupported + null，不能填 walking 原分数当最终疲劳。POI基准、访问负荷、路途步行和日疲劳是不同量，禁止重复累计。同一对照中较低体力负荷也不能抵消 duration-too-short。

4.21及后续拥有公式、权重、阈值、Visit Mode 规则库、活动分段、时间冲突算法、疲劳累计/恢复及多日聚合实现。4.20.1 只规定可追溯输出和 fail-closed 边界。

### 24.6 清水寺设计案例（不是营业事实或 runtime 证据）

仅测试设定：同一景点、同一 full-visit profile，minimumDuration=60min、recommendedDuration=90min；假定此测试策略把 minimum 定义为硬下限。值来自用户验收要求，不代表已核验清水寺官方建议。

A. canonical UPDATE_TIME 的 schedule 为 `2027-04-10T09:00:00+09:00` 至 `09:30:00+09:00`，两端 timezone 均为 Asia/Tokyo。派生计划停留30分钟，输出片段如下（沿用§20省略公共 envelope 的约定）：

```json
{
  "outcome": "blocked",
  "resultingVersion": null,
  "transaction": { "status": "not_started", "retryable": false },
  "issues": [
    {
      "code": "DURATION_TOO_SHORT",
      "category": "schedule",
      "severity": "blocking",
      "path": null,
      "operationId": "op-time",
      "subjectRef": "item-kiyomizu",
      "retryable": false,
      "details": {
        "evaluatedMinutes": 30,
        "minimumMinutes": 60,
        "recommendedMinutes": 90,
        "durationBasis": "planned_schedule",
        "ruleRef": "example-duration-minimum",
        "ruleVersion": "example-1"
      }
    }
  ],
  "confirmationRequirements": []
}
```

对应 `RuleAssessment` 片段：

```json
{
  "assessmentId": "assessment-kiyomizu-duration",
  "scope": {
    "kind": "item",
    "planId": "example-plan",
    "dayId": "example-day",
    "itemId": "item-kiyomizu"
  },
  "dimension": "duration",
  "status": "blocked",
  "reasonableness": "unreasonable",
  "ruleRef": "example-duration-minimum",
  "ruleVersion": "example-1",
  "reasonCodes": ["DURATION_TOO_SHORT"],
  "issueIndexes": [0],
  "relatedAssessmentIds": [],
  "duration": {
    "basis": "planned_schedule",
    "evaluatedMinutes": 30,
    "minimumMinutes": 60,
    "recommendedMinutes": 90,
    "visitModeRef": "example-full-visit",
    "sourceRefs": [
      {
        "kind": "canonical_schedule",
        "ref": "item-kiyomizu",
        "version": "plan-revision-3"
      },
      {
        "kind": "profile",
        "ref": "example-full-visit",
        "version": "example-1"
      }
    ]
  },
  "impacts": [],
  "sourceRefs": [
    {
      "kind": "rule",
      "ref": "example-duration-minimum",
      "version": "example-1"
    }
  ]
}
```

B. 同一 canonical schedule 结束改为 `10:30:00+09:00`：evaluatedMinutes=90，duration assessment 为 accepted / reasonable，reasonCodes=[DURATION_RULE_PASSED]、issueIndexes=[]。这只修改样例输入时间，不启用 UPDATE_DURATION。报告必须继续列出 schedule、physical_load、fatigue、day_capacity、itinerary_reasonableness 的 coverage。若必要路线/营业时间/交通/体力上下文尚缺，整体为 blocked / undetermined，带对应 missing-fact issue；所有独立规则均已评估通过时才允许整体 accepted / reasonable。

C. physical load 对照：30和90分钟均采用同一版本的标准强度/profile。未来模型分别消费该次duration及路线/环境/参与者refs；允许返回不同影响，不能固定两个结果均为 walking=7。此文未提供授权模型，设计结果为 physical_load state=unsupported、value/unit/modelRef/modelVersion=null、direction=unknown、durationBasis=planned_schedule，并通过 ASSESSMENT_UNSUPPORTED 指明4.21。这是与A的duration规则独立的能力案例；若同一请求要求两者，顶层按优先级为 unsupported，同时保留 DURATION_TOO_SHORT blocking issue，不能隐藏它。

### 24.7 Amendment Acceptance Matrix（补充§21）

所有案例是设计验收条件，不代表4.21已实现或已通过 runtime test。

| 案例                                                 | 必须可复核的结果                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 清水寺30 / minimum60 / recommended90，硬下限         | DURATION_TOO_SHORT，item unreasonable，blocked，无写入/确认绕过                                       |
| 清水寺60–89分钟，软 recommended                      | COMPRESSED_VISIT；策略分别测试 warning 和 needsConfirmation；后者必须包含 requirement，不能由UI自降级 |
| 清水寺90分钟，其他规则未检查                         | duration accepted；coverage保留缺口，整体不得all-clear                                                |
| 90分钟但路线过期或营业窗口硬冲突                     | ROUTE_FACT_EXPIRED / HARD_TIME_CONFLICT，blocked；duration pass仍保留                                 |
| 30 vs 90分钟，标准强度相同                           | 不把walking原分数当固定最终疲劳；duration依据和context可追踪，模型未就绪为unsupported/null            |
| 90分钟更高load、30分钟duration不足                   | 两个结论共存；低负荷不能抵消不合理短停留                                                              |
| 每个item时长通过，但转场/休息使day超载               | DAY_OVERLOADED；day scope + related item IDs，独立聚合判定                                            |
| 每天局部可行但连续多日恢复不足                       | ITINERARY_UNREASONABLE；itinerary scope + affected day refs，具体累计公式留4.21                       |
| schedule=null / profile缺失 / minimum大于recommended | 必要输入缺失blocked或能力unsupported；duration unknown/null，不能套用recommended当实际值              |
| 请求 UPDATE_DURATION 或私带43字段/duration字段       | 原 operation unsupported / 非法字段fail closed；canonical schema不变                                  |
| Profile / Rule / Provider事实在preview后变化         | 旧context绑定失效；重新validate/preview/confirm，既有baseVersion/transaction gate继续生效             |
| 同一幂等键重放已committed请求                        | 返回原terminal结果及原assessment，不重复评估写入或增加audit/revision                                  |
| 多issue：权限拒绝、duration warning、未支持规则      | 顶层按既有优先级保留全部安全issue；无权限时不披露私有assessment详情                                   |
| 未提供assessment或Consumer不支持扩展                 | 不宣称通过；必要能力unsupported，无第二套Schema或降级绕过                                             |

### 24.8 Open Decisions / dependencies（补充§22）

| ID               | Owner / dependency                                     | 发布或启用 gate                                                                                                   |
| ---------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| OD-DURATION-01   | A / 4.16 + 4.17，B Consumer review；细化既有OD-4.16-01 | 独立duration、planned/observed、Visit Mode、活动分段的唯一canonical表达及迁移未定；UPDATE_DURATION持续unsupported |
| OD-ASSESSMENT-01 | B Producer + A Consumer / 4.20 review                  | 冻结部分已核对，见§25；后续Consumer能力协商、生产输出parser及service caps仍待集成，不宣称已实现                   |
| OD-RULE-01       | 产品 + Attraction/Profile Owner + B / 4.21             | 43字段版本、profile provenance/TTL、minimum硬软策略、recommended压缩确认阈值、Visit Mode选择规则未冻结            |
| OD-LOAD-01       | B / 4.21 + 产品 + A context/Provider Owner             | 强度/活动时长/环境输入契约、模型单位与校准、固定/可变负荷、疲劳累计/恢复/多日公式；不得用固定评分替代             |
| OD-COVERAGE-01   | B / 4.21 + A canonical/Provider Consumer               | 各operation必要scope/维度、跨日依赖闭包、缺事实严重度与营业时间/路线时效规则需定义；缺口不得accepted all-clear    |

本Amendment已于2026-09-10经用户验收并通过PR #283合入develop，4.20.1已完成；4.21已通过PR #288实现验收子集。父4.20最终冻结依据和全部Open Decisions分类见§25；本次仅文档收尾，不新增评分器、规则库、Engine runtime、Plan字段、DB/API或UI实现。

## 25. Final Contract Freeze / Closeout（2026-09-10）

### 25.1 冻结结论与证据边界

**Engine Contract v0.1 = Frozen；WBS 4.20 = B / 已完成。A类未解决的Contract Freeze Blocker：0。**

本轮依据用户明确要求关闭父级Review Gate，审计基线为develop `2d3df8819da0e02b6b8449097dc2b95cd475f9d9`。4.20原始契约已通过PR #237进入develop；4.20.1经用户验收，PR #283 merge `f3af40c0b29ee3e50175902a5f94791d08cf8520`；4.21经用户验收，PR #288 merge `38e173df2601d099dc56fcde7a1f33d577981768`，PR #290完成追踪。

冻结对象是同一ChangeSet、EngineResult、状态/错误、assessment及副作用/权限/版本边界；不是承诺所有operation已启用，也不是冻结所有产品参数、DB设计或Provider商业条件。4.21证明该契约可实现，没有发现必须修改这些核心语义的阻塞问题；它没有证明apply、DB事务、持久化幂等或rollback已实现。

这是依据既有验收与当前授权的文档审计，不伪造一条新的A人工签字或Consumer生产验收。A的canonical/UI/Provider所有权保留；每个未来Consumer/service首次接线仍需0.9交接审查。最终Closeout PR供用户确认，不自动合并。历史Review Candidate、PENDING、原测试失败保留在各历史Result，当前结论以本节及最终Closeout Result为准。

### 25.2 核心语义一致性与冻结范围

| 审计面                 | 已冻结语义 / 当前证据                                                                                                                | 未实现能力的边界                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| ChangeSet / canonical  | §4原字段、18个operation code不变；公共类型为 `src/shared/contracts/engine/index.ts`；Trip Plan唯一来源仍为4.17                       | whitelist只表示可识别；UPDATE_DURATION及其余未启用动作unsupported，无43字段或第二套duration        |
| EngineResult / outcome | §7四种outcome不变；unsupported > blocked > needsConfirmation > accepted                                                              | accepted必须按requestKind解释，preview accepted不是已保存                                          |
| assessment             | §24.3同一可选report；五种status含warning；scope、coverage、issueIndexes、版本证据与null语义不变                                      | 必要能力缺失unsupported；缺关键事实blocked；不能因缺report或高匹配分宣称all-clear                  |
| validate / preview     | 4.21真实入口为 `validate(snapshot, changeSet, context)` / `preview(snapshot, changeSet, context)`；§6为领域参数说明，不是另一SDK签名 | 空operations可评估snapshot；仅UPDATE_TIME/REORDER_ITEMS内存候选；无DB/API/Provider调用             |
| 可信权限与确认         | 4.21检查可信调用方注入的access绑定、双revision及保护；确认风险生成requirements                                                       | 不是Auth查询或grant签发；没有写入授权；system hard lock阻断，未知booking/AI策略unsupported         |
| apply / rollback       | §6/9–12的事务重校验、原子版本/审计/outbox、幂等与补偿语义不变                                                                        | 4.21没有apply/rollback导出；调用能力应禁用/unsupported。未来4.22/4.23实现并通过4.24验收后方可启用  |
| replay / fingerprints  | 4.21纯重放、对象key顺序无关；before/after/context/policy/model版本绑定；变更使previewHash失效                                        | 当前replay.duplicate=false、transaction=not_started、resultingVersion=null；没有持久化terminal重放 |
| 三层合理性             | item、day、itinerary独立评估；duration/context负荷与路线事实fail closed；专项77/77已验收                                             | 评估模型不是生产校准标准，规则参数/生产Profile/observed事实不随冻结被补造                          |

OD-CONTRACT-01与OD-ASSESSMENT-01原先混合了公共语义和后续集成决策。公共语义部分已核对解决，不能将“暂无独立公开输出parser/API”解释为公共wire仍未定义：

- wire naming与类型：文档7个TypeScript块与4.21公共类型逐声明AST比对；此次不改变声明。服务端公开parseChangeSet由 `src/server/engine/index.ts` 导出，内部实现位于input.ts；canonical与Route parser复用原拥有者。
- 输入限制：现有4.21限制operations 100、factRefs 1000、scheduled items 1–1000；JSON深度30、访问节点100000、字符串200000、序列化2000000个JavaScript字符。它们是已实现的有界evaluation输入限制，不误称HTTP字节预算。各context集合限制以现有context.ts为准，不在此发明新的默认值。
- 未知值：未知version/op为unsupported；非法字段/非JSON/非法canonical输入blocked；未知必要assessment能力fail closed。Consumer不得自行将未知状态转accepted。未来新增wire能力按§2.2版本与handoff程序发布。
- 指纹：现有json.ts使用稳定对象key排序与SHA-256；payloadHash绑定ChangeSet，contextFingerprint绑定before/after、完整可信context及排序后的model registry标识/版本/单位，previewHash绑定payloadHash和contextFingerprint。该算法证据只描述现有纯评估实现，不自动冻结4.22的DB幂等编码、grant存储或HTTP协商协议。
- 对外EngineResult运行时parser、HTTP请求/响应预算、能力协商及A UI/AI接线尚未实现；按下表继续Open，不把类型测试当作完整生产Consumer测试。

### 25.3 Open Decisions完整分类

A = Contract Freeze Blocker：当前公共语义无法一致表达或存在必须先修改核心协议的矛盾。**未发现未解决A类项。**

B = Deferred Implementation Decision：仍未解决，必须在指定依赖/未来WBS交付时审查；当前能力保持unsupported / blocked / fail closed。下表保留§22全部16个ID及§24.8全部5个ID；没有删除、默默关闭或把未实现依赖标为完成。两个混合ID的冻结部分已解决，剩余部分仍为B。

| ID               | 分类 / 保留的未决问题                                                       | Owner                                           | Dependency / Future WBS                                                 | 当前行为 / 启用条件                                                                       |
| ---------------- | --------------------------------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| OD-4.16-01       | B：patch、transport、skip/restore、MUST_DO等canonical表达                   | A canonical；B Consumer                         | 4.16/4.17后续版本；4.22/4.23消费，4.24验收                              | 相关未启用operation unsupported；不得Engine私加字段                                       |
| OD-4.16-02       | B：替换/跨日移动identity、alternative promotion                             | A canonical；B Engine                           | 4.16/4.17；4.22动作启用、4.24回归                                       | MOVE/REPLACE等当前unsupported；不能从UI index造identity                                   |
| OD-8.5-01        | B：DB revision分配及多plan递增                                              | A 8.5；B 4.22                                   | 8.5 + 4.22；4.24并发验收                                                | apply未提供/unsupported；当前只校验双baseVersion                                          |
| OD-8.5-02        | B：持久化hash/scope、唯一性、retention及unknown-outcome对账                 | A/B                                             | 8.5 + 4.22；4.24失败/重放验收                                           | 无幂等存储；纯replay不冒充DB去重                                                          |
| OD-8.5-03        | B：audit/history/outbox、隔离与DB error映射                                 | A/B                                             | 8.5 + 4.22；4.24故障注入                                                | 事务未实现/unsupported；无部分accepted                                                    |
| OD-8.5-04        | B：历史保留与补偿数据/清理                                                  | A/B                                             | 8.5 + 4.23；5.18/5.19；4.24                                             | restore/rollback unsupported；不回退revision或外部订单                                    |
| OD-7.5-01        | B：剩余生产fact绑定/alternatives、TTL/confidence/授权fallback               | A Provider；B Consumer                          | 已完成7.5为基线；7.3/7.8/7.10/7.11后续Production Gate；4.24             | 复用现有RouteResponse；缺失/过期/不可信必要事实blocked，未支持能力unsupported，无隐式查询 |
| OD-7.5-02        | B：新增operation的路线/坐标依赖及离线降级政策                               | A/产品；B Consumer                              | 7.5基线 + 7.8/7.11；4.22动作启用、4.24                                  | 当前明确evaluation policy；生产策略未审查则fail closed，不猜坐标/分钟                     |
| OD-PRODUCT-01    | B：预算阈值、汇率及金额确认粒度                                             | 产品；B Engine                                  | 4.22预算动作；4.24；正式价格/汇率事实依赖待Owner交接                    | 当前未启用费用动作unsupported，amountDeltaMinor/currency为null；不得未知金额按0           |
| OD-PRODUCT-02    | B：酒店/硬交通/预约/MUST_DO精确确认组合                                     | 产品/Booking Owner；B Engine                    | 4.16/4.17 + Booking；4.22；4.24                                         | 现有保护与确认保留；硬约束blocked；booking能力unsupported，确认不等于改订                 |
| OD-PRODUCT-03    | B：lock覆盖、协作角色、grant一次性/TTL                                      | 产品/Auth/Booking；B服务                        | 8.3既有Auth基线 + 8.5/4.22；4.24                                        | 没有grant签发或事务授权；system lock blocked，未知权限fail closed                         |
| OD-PRODUCT-04    | B：Autopilot allowlist、范围和撤销窗口                                      | 产品/A AI/B Engine                              | 6.7/6.8/6.13 + 4.22/4.23；4.24                                          | AI/system/provider_event提案当前unsupported；宏操作不执行                                 |
| OD-BOOKING-01    | B：可信booking/refundability及外部状态机                                    | Booking领域Owner待正式指定；B维护Engine拒绝边界 | Booking/Payment独立工作包待登记，不虚构WBS编号；4.22/4.23消费，4.24验收 | LINK_BOOKING/UPDATE_BOOKING_STATUS及真实取消/付费操作unsupported                          |
| OD-SAVE-01       | B：Save/Read/History/Resume正式service handoff                              | B 5.18/5.19；A Consumer                         | 5.18/5.19 + 4.19/8.5；4.22/4.23/4.24                                    | 不接保存/历史；恢复必须未来补偿ChangeSet，不能覆盖current row                             |
| OD-CONTRACT-01   | B（冻结部分已解决）：剩余service caps、对外parser/API发布及Consumer rollout | B Producer；A Integration Reviewer              | 4.22公开service + 4.24；4.19/5.19 Consumer交接                          | 使用现有类型及输入parser；无生产API或输出parser就不宣称已支持，不自动兼容未知值           |
| OD-ERROR-01      | B：安全not-found/permission映射、correlation及本地化目录                    | Security/Auth/UI Owners；B服务                  | 8.3基线 + 4.22/4.24；9.9/9.10                                           | 当前拒绝未授权读取并隐藏raw errors；未来对外服务未审查不得发布                            |
| OD-DURATION-01   | B：独立duration、observed事实、Visit Mode/活动分段唯一表达                  | A 4.16/4.17；B Consumer                         | 4.16/4.17新版本；4.23执行事实，4.24                                     | UPDATE_DURATION unsupported；planned schedule派生不等于observed事实                       |
| OD-ASSESSMENT-01 | B（冻结部分已解决）：生产协商/输出parser/结果caps与grant绑定实现            | B Producer；A Consumer                          | 4.22服务/确认 + 4.24；4.19/5.19及6.x后续Consumer                        | 当前typed report及指纹已实现；缺必要report/未知能力fail closed，不提供写capability        |
| OD-RULE-01       | B：43字段/Visit Profile生产版本、provenance/TTL、阈值和mode政策             | 产品/A POI-Profile；B规则                       | 7.4/7.7/7.9后续规则输入 + 4.24集成；需要规则扩展另行授权                | 当前4.21版本化evaluation输入可运行；缺正式输入blocked/unsupported，不复制43字段           |
| OD-LOAD-01       | B：生产单位/校准、活动分段、恢复/多日模型参数                               | 产品/B规则；A context/Provider                  | 7.4/7.5输入基线及后续Profile；4.23 observed事实；4.24；模型变更另立任务 | 保留已验收evaluation模型；未知model/context unsupported/null，不把walking分数当总疲劳     |
| OD-COVERAGE-01   | B：生产和新operation的必要维度/闭包/营业与路线政策                          | B规则；A canonical/Provider；产品               | 7.5/7.8生产输入；4.22新动作、4.23事件、4.24                             | 当前三层独立coverage已实现；缺必要事实blocked/unsupported，不能all-clear                  |

表中Future WBS是交接归属，不表示已开工或该WBS已包办所有产品决策。4.22–4.24、8.5保持未开始；7.5保持已完成，7.8保持现有进行中/Production Gate未关闭；其他Owner状态一律不改变。

### 25.4 变更控制与停止边界

后续OD关闭须提供Owner确认、正式契约/版本、fixture和目标Consumer验收；涉及新增wire字段/operation payload或改变outcome/副作用语义时，按0.9及§2.2发布显式Amendment，不在已冻结v0.1下静默改义。仅实现现有事务/权限要求或选择已声明策略输入不需要重新否定整个4.20完成状态。

完整审计、检查记录及独立Closeout PR见 [Final Closeout Result](../tasks/RESULT-WBS-4.20-b-engine-contract-final-closeout.md)。本次只改文档/Tracking，不改4.21 runtime、不实现4.22、不接DB/API/AI/Booking/Payment。
