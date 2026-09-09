# TravelAssist Engine / Trip Engine Contract v0.1

> WBS: `4.20`
>
> Owner / Contract Producer: B
>
> Review status: Review Candidate / 待审查，**不是 frozen spec**
>
> Issue: [#201](https://github.com/kanzakimy0/TravelAssist/issues/201)
>
> Authoring base: `origin/develop@1af72af0d7151af4dd59073ee0b015a70b267064`
>
> Canonical Trip Plan Schema: `src/shared/contracts/trips/index.ts`，`contractVersion: "1.0"`
>
> Delivery note: repository automation created and merged PR [#237](https://github.com/kanzakimy0/TravelAssist/pull/237) immediately after the feature push. No user acceptance occurred; Draft review gate [#238](https://github.com/kanzakimy0/TravelAssist/pull/238) remains open. This contract is not frozen.

## 1. 定义、目标与非目标

本文件中的 **TravelAssist Engine** 与既有架构中的 **Trip Engine** 是同一个模块：它接收结构化 ChangeSet，在可信服务边界内执行确定性校验、影响预览、权限与保护规则判断，并在未来持久化能力就绪后原子应用变更。

它不是：

- AI 模型或 AI Orchestrator；
- Planner / Detail 的第二套 Store；
- Mapbox、Route Provider、Booking 或 Payment 服务；
- Trip Plan 的第二套 Schema；
- API endpoint、数据库表、Migration 或已经可运行的 Engine service。

本任务只发布契约设计。`validate`、`preview`、`apply`、`rollback` 是领域能力名称，不表示本 PR 已实现这些运行时能力。

## 2. 权威来源与兼容性

### 2.1 唯一 Schema 来源

Trip、Plan、Day、Item、Place、Schedule、Booking summary、Lock、Assessment 及 revision 的 wire shape 只来自 WBS 4.17 的 canonical source：

`src/shared/contracts/trips/index.ts`

Engine Contract 只引用 `TripPlanSnapshotV1` / `PlanItemV1` 及其稳定 ID、`trip.revision`、`plan.revision`。不得复制、改名或在 Engine 目录维护一份相似类型。4.17 validator 通过只证明结构合法，不证明调用者有权限、事实仍新鲜、预约真实或变更可执行。

### 2.2 版本

- `tripContractVersion` 必须等于当前已冻结的 `"1.0"`；未知版本返回 `unsupported`。
- 本文件提出的 `engineContractVersion: "0.1"` 仍处于 review candidate。A/B 审查及 Open Decisions 关闭前不得称为冻结版本。
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

以下是 review-candidate wire contract。伪 TypeScript 中的 canonical 类型均为**引用**，不是新 Schema：

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

路线 Provider / WBS 7.5 尚未冻结 normalized route fact shape、TTL、confidence 和替代路线语义，因此本文件不定义其 payload。

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

以下事项在关闭前均**不是 frozen spec**。实现者不得自行选择默认值后声称 4.20 已冻结。

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
| `OD-CONTRACT-01` | Engine v0.1 wire naming、payload caps、unknown enum forward-compatibility 与 parser 发布位置                      | B Producer + A Integration Reviewer | 4.20 freeze                           |
| `OD-ERROR-01`    | 对外隐藏 not-found/permission 差异的统一 code、可观测性 correlation 与本地化 message catalog                      | Security/Auth/UI Owners             | service exposure                      |

## 23. 后续阶段与停止边界

- 4.20：本文件、Task/Result/Tracking 交付；待审查。
- 4.21：确定性 rule/preview runtime，**未启动**。
- 4.22：事务 apply/permission/idempotency/version/audit，**未启动**，且 8.5 未满足。
- 4.23：runtime event / local replan / rollback execution，**未启动**，且依赖 7.5。
- 4.24：回归、并发、失败、回放集成验收，**未启动**。

本契约不授权 4.21–4.24，也不授权 Planner/Detail/Start/Personal Center UI、4.16 runtime core、4.17 canonical schema、8.5 SQL Schema、业务表、Migration、API endpoint、Engine runtime、transaction apply、runtime rollback、AI runtime、Mapbox、Route Provider、Booking、Payment、Authentication 或任何付费 Provider 调用。
