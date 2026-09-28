# TASK-086-B — TransportNode → TransportNode Japan Mobility Backbone

- Issue: #443
- Owner: B
- Execution role: Offline data production / graph data support
- Runtime / API / Planner owner: A (unchanged)
- Proposed WBS: 7.16
- Priority: P0
- Depends on: TASK-084-B PASS, 7.5 Route Schema
- Can run in parallel with TASK-085-B after TASK-084-B: Yes
- Branch when executing: `feature/b-transport-node-mobility-backbone`
- Batch size: 200 edges or route/service chunk
- Auto-next: Yes, only after batch QA PASS
- Auto-merge: No

## 2026-09-28 execution amendment

TASK-086-B requires TASK-084-B PASS but does **not** require PR #444 or Canonical POI admission. It may run in parallel with A's real POI→POI Phase A once 084 is accepted.

## 1. Goal

建立日本全国旅游规划所需的 TransportNode 交通骨架：

```text
TransportNode
   ↕
TransportNode
```

覆盖 rail / shinkansen / metro / bus / flight / ferry 等真实交通服务关系，为 Planner 后续组合：

```text
POI
→ TransportNode
→ TransportNode
→ POI
```

提供可路由的静态 / 准静态图基础。

本 Task 不负责实时路线 API，不负责实时延误，不负责 Planner 接线。

## TASK-082-A compatibility gate

开始实现前必须读取最新 A `TASK-082-A — POI Edge Graph Generation Pilot` 及其 Result/PR（如已存在）。

- 若 A 已冻结 TransportNode / Mobility Edge contract：B 必须复用，不得复制第二套 schema。
- 若 A 尚未冻结：B 只能在 task-owned data artifact 中使用最小 data-layer schema，并把 runtime contract integration 标记为 Deferred to A。
- 不允许 B 修改 A 的 Planner / Route runtime public contract 来迁就离线数据。

## 2. No N×N rule

严禁：

```text
all TransportNodes × all TransportNodes
```

只允许从真实线路 / service pattern / transfer structure 建立边。

优先边类型：

1. SERVICE_SEGMENT
2. HUB_TRANSFER
3. INTERCITY_DIRECT_SERVICE（有可信依据且确有必要时）

## 3. Edge semantics

### 3.1 SERVICE_SEGMENT

表示真实线路/服务模式中相邻调用点：

```text
Node A → Node B
```

必须有：

- line/service reference
- mode
- direction
- source/provenance

### 3.2 HUB_TRANSFER

表示同一枢纽内部不同 operator / line / terminal component 间换乘关系。

至少可表达：

- transfer walking duration
- accessibility
- indoor/outdoor transfer
- stairs/elevator evidence
- transfer complexity

### 3.3 INTERCITY_DIRECT_SERVICE

只在存在真实直达服务，且作为 shortcut 对 Planner 明显有价值时建立。

不得因为“两个城市之间经常有人去”就虚构 direct edge。

## 4. Modes

至少支持：

- rail
- shinkansen
- metro
- local_bus
- highway_bus
- airport_bus
- flight
- ferry
- ropeway
- cable_car

必要时可扩展，但必须枚举化、可验证。

## 5. Contract

至少表达：

```ts
type TransportMobilityEdge = {
  edgeId: string;

  fromTransportNodeId: string;
  toTransportNodeId: string;
  directed: true;

  edgeKind:
    | "service_segment"
    | "hub_transfer"
    | "direct_service";

  mode: string;

  operatorRef?: string;
  lineRef?: string;
  serviceRef?: string;
  servicePatternRef?: string;

  durationTypicalMin?: number;
  durationP90Min?: number;

  fareTypicalYen?: number;

  frequencyTypicalMin?: number;

  reservation:
    | "not_required"
    | "recommended"
    | "required"
    | "unknown";

  seatReservationAvailable?: boolean;

  firstDeparture?: string;
  lastDeparture?: string;

  validDays?: string[];
  seasonal?: boolean;

  reliabilityScore?: number;
  convenienceScore?: number;

  sourceRefs: string[];
  confidence: number;
  observedAt?: string;
  validFrom?: string;
  validTo?: string;
  generatedAt: string;
};
```

字段可根据仓库 contract 调整。

## 6. Static / dynamic separation

### 可以静态持久化

- node sequence
- line association
- operator
- service class
- transfer relation
- route topology
- reservation requirement（稳定且有来源时）
- broad service availability
- permitted derived typical values with snapshot metadata

### 动态 / 高变字段

以下不得没有 freshness 就冒充 current truth：

- exact timetable
- exact fare
- temporary suspension
- delay
- platform
- real-time crowding
- temporary service change

必须为动态字段记录：

- observedAt
- validFrom / validTo（可得时）
- source version
- freshness class

## 7. Route/service representation

避免只保存“线路名”。

至少应有：

```text
Operator
  ↓
Line
  ↓
Service pattern / direction
  ↓
Ordered calling TransportNodes
  ↓
Directed edges
```

快速 / 特急 / 新干线不同停站模式不能简单用普通线路所有站相邻边代替。

例如一个 express 跳站，应依据其真实 calling pattern 表达。

## 8. Rail / Shinkansen rules

至少检查：

- direction
- service type
- ordered stops
- skipped stations
- through-service
- operator boundary
- reserved-seat rule
- transfer at hub

不得把轨道物理相邻误认为所有列车服务相邻。

## 9. Metro / local rail rules

可建立 topology edge，但：

- express/local 差异必须可表达
- through service 不得重复/断裂
- 同名站跨 operator 换乘用 HUB_TRANSFER 表达

## 10. Bus rules

Bus 不要求全国所有普通公交站。

优先：

- airport access bus
- major highway bus
- tourist intercity bus
- POI gateway bus route needed by canonical POIs

普通城市 local bus 仅在 POI access 或主骨架确有必要时加入。

## 11. Flight rules

连接：

```text
Airport → Airport
```

只为真实航线建立边。

不得把：

- code-share
- seasonal
- suspended route

无条件视为全年稳定。

至少记录：

- operator/service refs
- seasonal flag
- observed/freshness
- reservation semantics

## 12. Ferry rules

尤其覆盖：

- 离岛
- 北海道 / 九州 / 四国旅游相关
- 宫岛等关键旅游 access
- 跨海湾/重要港口

必须区分：

- passenger ferry
- vehicle ferry（如有需要）
- seasonal operation

## 13. Duration model

如果数据来源允许，至少：

- durationTypicalMin
- durationP90Min

P90 无数据时保持 empty。

不得自行把：

```text
typical + 固定百分比
```

伪造成真实 P90。

## 14. Fare model

fare 只有在：

- source permitted
- version/snapshot known
- route mapping明确

时写入。

否则：

```text
fareTypicalYen = unresolved
```

不得长期保存未经许可的 provider fare cache。

## 15. Frequency / first-last service

允许有：

- frequencyTypicalMin
- firstDeparture
- lastDeparture

但必须：

- 标 snapshot
- 标 weekday/weekend or service calendar
- 不冒充实时

建议支持未来 time bucket：

- weekday_morning
- weekday_daytime
- weekday_evening
- weekend_morning
- weekend_daytime
- weekend_evening

本 Task 可先冻结结构，不要求所有 edge 填满。

## 16. Convenience / reliability

不得纯人工拍分。

### convenience 可考虑

- travel duration
- frequency
- transfer need
- reservation friction
- station transfer complexity

### reliability 可考虑

- P90 spread
- service frequency
- known transfer dependency
- service type stability

必须保留 component trace。

## 17. Batch strategy

优先按：

```text
route / line / service pattern
```

分批，而不是随机切 edge。

单批建议最大：

```text
200 directed edges
```

大型线路可拆多个 deterministic chunks。

每批：

```text
source manifest
→ service pattern parse
→ node identity join
→ directed edge generation
→ dynamic-field boundary
→ validation
→ QA
→ receipt
→ checkpoint
→ auto-next
```

## 18. Required unresolved reasons

至少：

- SOURCE_UNAVAILABLE
- LICENSE_BLOCKED
- NODE_IDENTITY_UNRESOLVED
- SERVICE_PATTERN_UNRESOLVED
- DIRECTION_UNRESOLVED
- DURATION_UNRESOLVED
- FARE_UNRESOLVED
- FREQUENCY_UNRESOLVED
- CALENDAR_UNRESOLVED
- SEASONALITY_UNRESOLVED
- TRANSFER_RELATION_UNRESOLVED
- PROVIDER_RUNTIME_ONLY

## 19. Graph QA

至少：

- from != to except explicitly valid transfer model
- both nodes accepted
- directed edge deterministic
- no duplicate same service edge
- route order valid
- service pattern references valid
- parentHub transfer valid
- no impossible operator/line reference
- no negative duration/fare
- no accidental N×N
- max graph growth guard
- disconnected T0/T1 hubs report
- prefecture/region connectivity report
- mode distribution
- deterministic rebuild
- batch resume

## 20. Connectivity audit

必须输出：

### National backbone

- T0 hub connectivity
- prefecture coverage
- island coverage
- airport coverage
- shinkansen corridor coverage
- major tourist corridor coverage

### Known corridor examples

用于 QA，不代表硬编码：

- Tokyo ↔ Kyoto / Osaka
- Tokyo ↔ Kawaguchiko area
- Osaka ↔ Kyoto / Kobe / Nara
- Fukuoka ↔ Kumamoto
- Hokkaido major hubs
- airport ↔ city access
- ferry-dependent tourism areas

必须通过图查询验证，不得用样例专门打补丁。

## 21. Outputs

建议：

```text
data/transport/network/
  transport-lines.jsonl
  service-patterns.jsonl
  transport-node-edges.jsonl
  hub-transfer-edges.jsonl
  dynamic-field-unresolved.jsonl
  score-traces.jsonl
  batch-receipts/
  manifest.json
```

## 22. Metrics

Result 至少：

- total accepted nodes referenced
- total directed edges
- service_segment count
- hub_transfer count
- direct_service count
- counts by mode
- counts by operator
- counts by prefecture/corridor
- duration coverage
- fare coverage
- frequency coverage
- reservation metadata coverage
- unresolved counts
- disconnected T0/T1 hubs
- batch count
- source/provenance coverage
- deterministic rebuild status
- exact-head QA

## 23. Acceptance

- [ ] 未生成 N×N
- [ ] 只生成真实线路/服务/换乘支持的边
- [ ] directed graph
- [ ] service patterns 可追溯
- [ ] express/local/shinkansen 停站语义不混淆
- [ ] hub transfer 可表达
- [ ] dynamic fields 有 freshness
- [ ] 未许可 Provider 数据未长期缓存
- [ ] nationwide backbone connectivity report 完成
- [ ] 200 edges/chunk 可恢复
- [ ] deterministic rebuild PASS
- [ ] 未修改 A Route/Planner runtime
- [ ] WBS/Result/QA 同步
- [ ] Draft PR only
- [ ] 未自动 merge

## 24. Stop conditions

必须 Partial/Blocked：

- TASK-084-B 未 PASS
- TransportNode IDs 不稳定
- source/license 不允许 persistence
- service pattern 无法可靠解析
- node join 大量失败
- runtime-only provider 是唯一可用来源而又无持久化授权
- graph generation 非 deterministic

## 25. Deliverables

至少：

- `docs/tasks/TASK-086-b-transport-node-mobility-backbone.md`
- `docs/tasks/RESULT-TASK-086-b-transport-node-mobility-backbone.md`
- `docs/qa/TASK-086-B/README.md`
- graph artifacts
- connectivity audit
- unresolved ledger
- batch receipts
- tests

完成后停止。全国骨架进入产品 runtime / Planner 前必须由 A 做独立 integration/acceptance。
