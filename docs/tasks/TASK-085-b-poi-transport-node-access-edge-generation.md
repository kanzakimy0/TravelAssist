# TASK-085-B — POI → TransportNode Access Edge Full Generation

- Issue: #442
- Owner: B
- Execution role: Offline data production / graph data support
- Runtime / API / Planner owner: A (unchanged)
- Proposed WBS: 7.15
- Priority: P0
- Depends on: TASK-084-B PASS, admitted Canonical POIs merged into develop, 7.5 Route Schema
- Branch when executing: `feature/b-poi-transport-node-access-edges`
- Batch size: 200 POIs
- Auto-next: Yes, only after batch QA PASS
- Auto-merge: No

## 2026-09-28 execution amendment

TASK-085-B must not start until both conditions are true:

1. TASK-084-B TransportNode Master is accepted.
2. A user-accepted Canonical POI corpus is merged into develop.

For the first run after PR #444, process the legally admitted 100 POIs. Do not wait for 500 and do not fill the shortfall with candidate-only rows.

## 1. Goal

为正式 Canonical POI 建立到 TransportNode 的可规划接入边，解决：

```text
POI
  ↕
Station / Bus Terminal / Airport / Ferry / Ropeway
```

本 Task 不生成全国 POI×POI，也不负责 TransportNode 之间的全国交通骨架。

## 2. Core principle

每个 POI 默认连接有限数量的高价值交通节点，而不是连接全部节点。

起始参数：

- nearest local nodes: 2~5
- useful major hubs: 1~3
- special tourism access nodes: 0~N
- target total: 3~8 nodes / POI

参数必须配置化，不得硬编码为永久规则。

## TASK-082-A compatibility gate

开始实现前必须读取最新 A `TASK-082-A — POI Edge Graph Generation Pilot` 及其 Result/PR（如已存在）。

- 若 A 已冻结 TransportNode / Mobility Edge contract：B 必须复用，不得复制第二套 schema。
- 若 A 尚未冻结：B 只能在 task-owned data artifact 中使用最小 data-layer schema，并把 runtime contract integration 标记为 Deferred to A。
- 不允许 B 修改 A 的 Planner / Route runtime public contract 来迁就离线数据。

## 3. Directionality

必须生成有向边：

```text
POI → TransportNode
TransportNode → POI
```

两者不得默认完全相同。

原因包括：

- uphill / downhill
- station entrance placement
- bus stop side
- one-way road
- taxi drop-off / pickup difference
- stairs / elevator routing
- service direction
- closing-hour access differences

## 4. Edge contract

至少表达：

```ts
type PoiTransportAccessEdge = {
  edgeId: string;

  fromType: "poi" | "transport_node";
  fromId: string;
  toType: "poi" | "transport_node";
  toId: string;

  directed: true;

  accessRole:
    | "nearest_local"
    | "major_hub"
    | "tourism_gateway"
    | "special_access";

  straightDistanceM: number;

  modes: {
    walking?: AccessModeMetrics;
    localTransit?: AccessTransitMetrics;
    taxi?: AccessModeMetrics;
  };

  detourRatio?: number;

  firstLastMileDifficulty?: number;
  luggageDifficulty?: number;
  accessibilityScore?: number;

  sourceRefs: string[];
  confidence: number;
  generatedAt: string;
  observedAt?: string;
};
```

字段名按仓库约定调整，但语义不得丢失。

## 5. AccessModeMetrics

至少支持：

- durationTypicalMin
- durationP90Min (if supported)
- routeDistanceM
- walkDistanceM
- walkDurationMin
- elevationGainM
- stairs
- costTypicalYen
- accessibility
- unresolved reason

不得为了 coverage 填假值。

## 6. Candidate node selection

候选 TransportNode 不能只按直线距离排序。

至少综合：

1. geographic distance
2. actual walkability
3. node level T0/T1/T2/T3
4. operator / line usefulness
5. POI tourism access relevance
6. barrier / detour
7. island / mountain / remote geography
8. known gateway semantics

例：

```text
直线 400m 的车站
但实际步行 2.8km
```

不能无条件优先于真正 700m 可直达节点。

## 7. Local node vs major hub

每 POI 应区分：

### local access node

例如：

- 最近地铁站
- 最近普通铁路站
- 景区巴士站
- ferry landing
- ropeway base

### major hub

例如：

- Kyoto Station
- Tokyo Station
- Shinjuku Station
- Hakata Station

Major hub 不要求每个 POI 都有直达公共交通边；若只能通过 local node 换乘，应明确：

```text
POI → local node → transport network → major hub
```

不得虚构 POI→major hub 直连。

## 8. Walking reality gate

必须同时保留：

- straightDistanceM
- walkingRouteDistanceM（可得时）
- walkingDuration
- detourRatio

```text
detourRatio =
walkingRouteDistanceM / straightDistanceM
```

QA 至少标记：

- extreme detour
- bridge/river barrier suspicion
- rail/highway barrier suspicion
- mountain access
- gated area
- impossible walking route

不能只凭 Haversine 距离认定“附近”。

## 9. Difficulty fields

建议计算：

### firstLastMileDifficulty

输入：

- walking duration
- route distance
- elevation gain
- stairs
- path complexity

### luggageDifficulty

输入：

- stairs
- long walking
- elevation
- transfers
- no-elevator evidence

### accessibilityScore

必须由实际支持字段计算；没有资料时保持 unknown，不得把缺失当满分。

所有 score 必须有 component trace。

## 10. Source / routing boundary

优先使用：

- 合法 route provider
- official operator / official access guidance
- approved routing data
- permitted local route calculation

如果现有 provider 只允许 Evaluation / no persistence：

- 不得批量长期保存 raw provider payload
- 只保存允许保存的 derived/static facts
- 或输出 fixture / unresolved 状态
- Result 明确写 Provider/license decision

## 11. Batch scope

固定：

```text
200 Canonical POIs / batch
```

每批：

```text
load canonical POIs
→ select candidate TransportNodes
→ generate directed pairs
→ route/access enrichment
→ score/trace
→ validate
→ QA
→ receipt
→ checkpoint
→ auto-next
```

一个 POI 即使无可确认接入，也必须获得明确结果：

```text
NO_CONFIRMED_ACCESS
```

而不是静默丢失。

## 12. Required unresolved reasons

至少：

- NO_TRANSPORT_NODE_IN_RANGE
- NO_CONFIRMED_ACCESS
- ROUTING_PROVIDER_UNAVAILABLE
- LICENSE_BLOCKED
- WALK_ROUTE_UNRESOLVED
- LOCAL_TRANSIT_UNRESOLVED
- TAXI_UNRESOLVED
- ACCESSIBILITY_UNKNOWN
- IDENTITY_MISMATCH
- GEOGRAPHIC_BARRIER
- NODE_NOT_ACCEPTED
- POI_NOT_CANONICAL

## 13. Edge count guard

禁止 graph explosion。

至少配置：

- maxLocalNodesPerPoi
- maxMajorHubsPerPoi
- maxSpecialNodesPerPoi
- maxTotalNodesPerPoi

超限时必须 deterministic rank + truncate，并记录为什么保留/淘汰。

## 14. Canonical POI gate

只允许正式 Canonical POI。

不得使用：

- candidate-only POI
- unresolved identity rows
- enrichment workbook rows without canonical admission
- arbitrary external place without stable canonical mapping

如果 Canonical POI 数量低于预期，按实际合法数量跑并报告 shortfall。

## 15. QA

至少：

- no self-type identity confusion
- from/to type valid
- directed edge valid
- accepted POI only
- accepted TransportNode only
- duplicate edge removal
- max degree respected
- candidate ranking deterministic
- straight distance sanity
- walking route sanity
- detour anomaly detection
- no impossible negative duration/cost
- unknown accessibility preserved
- sourceRefs for accepted facts
- score component trace
- deterministic rebuild
- batch resume

## 16. Full-run metrics

至少：

- Canonical POI count processed
- POIs with >=1 access node
- POIs with local access
- POIs with major-hub access
- POIs with special tourism access
- total directed access edges
- mean/median edges per POI
- min/max edges per POI
- walking resolved rate
- transit resolved rate
- taxi resolved rate
- accessibility known rate
- extreme detour count
- unresolved POI count
- unresolved reason distribution
- prefecture coverage
- batch count

## 17. Output

建议：

```text
data/transport/access/
  poi-transport-access-edges.jsonl
  poi-access-unresolved.jsonl
  poi-access-score-traces.jsonl
  candidate-node-decisions.jsonl
  batch-receipts/
  manifest.json
```

## 18. Acceptance

- [ ] 全部正式 Canonical POI 被扫描一次
- [ ] 未使用 candidate-only POI 冒充 canonical
- [ ] 每 POI 有明确 access result
- [ ] directed edge 双向语义正确
- [ ] 3~8 nodes/POI 为 bounded target，而非 graph explosion
- [ ] walking 与 straight distance 区分
- [ ] detour anomaly 可审计
- [ ] score 有 trace
- [ ] unknown 不伪造
- [ ] provider/license 边界遵守
- [ ] 200 POI/batch 可恢复
- [ ] WBS/Result/QA 同步
- [ ] Draft PR only
- [ ] 未自动 merge

## 19. Stop conditions

必须 Partial/Blocked：

- TASK-084-B 未通过
- Canonical POI runtime/admission 来源无法证明
- Route provider persistence 权限不允许所需操作
- TransportNode identity 不稳定
- 大量 POI 坐标无效
- 生成器无法 deterministic reproduce

## 20. Deliverables

至少：

- `docs/tasks/TASK-085-b-poi-transport-node-access-edge-generation.md`
- `docs/tasks/RESULT-TASK-085-b-poi-transport-node-access-edge-generation.md`
- `docs/qa/TASK-085-B/README.md`
- machine-readable edge artifacts
- unresolved dataset
- batch receipts
- tests

完成后停止，不自动开始 TASK-086-B，除非执行指令明确授权前置通过后自动进入下一任务。
