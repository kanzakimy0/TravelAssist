# TASK-082-A — POI Edge Graph Generation Pilot

- WBS: 7.13
- Owner: A
- Responsibility: Main Travel System / Route data foundation
- Priority: P0
- Issue: #439
- Branch: `feature/a-poi-edge-graph-generation-pilot`
- Base: latest `develop`
- Depends on: 7.4 POI 标准 Schema, 7.5 Route Schema
- Related: 7.8 Route API, 9.2 Planner/Map/Route QA

## 1. Objective

为 TravelAssist 建立可扩展的 POI mobility graph 基础。第一阶段不做全国 POI 两两全连，而是使用有界候选边（bounded candidate edges）+ TransportNode 分层图，并用真实 POI Pilot 验证数据模型、生成算法、QA 和 Planner 消费格式。

本 Task 的交付重点是：

1. 定义 canonical POI Edge contract。
2. 从真实 POI 坐标生成候选邻接边。
3. 建立 directed edge 语义。
4. 为候选边补 walking / driving / transit 等可用模式。
5. 引入 typical / P90、费用、换乘、首末段步行、便利度、可靠度、难度等字段。
6. 建立 POI → TransportNode 接入边的数据结构。
7. 跑一个城市级真实 Pilot，并输出统计、失败原因和扩容建议。
8. 提供 Planner 可直接读取的 edge lookup / graph query boundary。

## 2. Hard constraints

### 2.1 禁止全国 N×N

严禁生成：

```text
all POIs × all POIs
```

如有 N 个 POI，不允许默认生成 O(N²) 边。

第一版候选边目标：

```text
每 POI 约 40~80 条候选有向边
```

候选来源应优先包括：

- 最近邻 POI：20~30
- 同一旅游区域重要 POI：10~20
- 同城高关联 POI：10~20
- 最近 TransportNode：3~8
- 景区内部特殊连接：按需

以上数字是 Pilot 起始参数，不是永久常量；必须配置化。

### 2.2 长距离交通必须分层

跨城市 / 跨区域长距离移动优先采用：

```text
POI
  → TransportNode
  → Intercity / Regional transport graph
  → TransportNode
  → POI
```

不要为所有跨城 POI 直接维护专属边。

### 2.3 Edge 必须有方向

必须把：

```text
A → B
B → A
```

视为两条独立 edge。

不得假设路线时间、坡度、公交站位、首末段步行、班次和费用完全对称。

### 2.4 不复制 POI 43 字段

Canonical POI 43 维继续属于 POI 节点。

Edge 只保存移动/交通相关信息。

### 2.5 Provider / license fail-closed

如果现有 Route / Transit Provider 的：

- 批量查询权
- cache 权
- retention 权
- production 使用权
- rate limit
- 商业用途

尚未明确，则不得为了完成 Task 擅自进行违规抓取或长期持久化。

必须：

1. 检查仓库已有 Provider contract。
2. 在不合法或不明确时使用 mock / fixture / permitted local calculation。
3. 明确记录 deferred 字段。
4. 不得将 Evaluation-only 能力误写成 production-ready。

## 3. Target graph architecture

```text
POI ── Local POI Edge ── POI
 │
 ├── Access Edge ── Station
 │
 ├── Access Edge ── Bus Terminal
 │
 └── Access Edge ── Airport
                     │
                     ▼
             Transport Network
                     │
                     ▼
                TransportNode
                     │
                     ▼
                    POI
```

## 4. Canonical Edge Contract

建立一个明确的类型 / schema，名称可以按仓库约定调整，但语义至少覆盖：

```ts
type PoiMobilityEdge = {
  fromPoiId: string;
  toPoiId: string;
  directed: true;

  straightDistanceM: number;

  relation:
    | "nearby"
    | "same_area"
    | "same_city"
    | "regional"
    | "access_to_transport_node"
    | "special";

  modes: {
    walking?: EdgeModeMetrics;
    driving?: EdgeModeMetrics;
    transit?: TransitEdgeModeMetrics;
    taxi?: EdgeModeMetrics;
  };

  convenienceScore?: number;
  reliabilityScore?: number;
  difficultyScore?: number;

  source: EdgeSource;
  confidence: number;
  observedAt?: string;
  generatedAt: string;
};
```

基础 mode 至少考虑：

```ts
type EdgeModeMetrics = {
  durationTypicalMin: number;
  durationP90Min?: number;
  distanceM?: number;

  costMinYen?: number;
  costTypicalYen?: number;
  costMaxYen?: number;

  walkDistanceM?: number;
  walkDurationMin?: number;

  elevationGainM?: number;
  stairs?: boolean;
  accessibility?: "good" | "mixed" | "poor" | "unknown";
};
```

Transit mode 额外支持：

```ts
type TransitEdgeModeMetrics = EdgeModeMetrics & {
  transfers?: number;
  frequencyMin?: number;
  firstDeparture?: string;
  lastDeparture?: string;
};
```

字段是否 optional 必须根据真实数据可得性和仓库 strict contract 习惯设计，禁止用虚构数据填满。

## 5. Candidate generation

实现纯本地、确定性候选生成层。

### Stage A — geographic prefilter

使用 POI 经纬度建立空间索引。

至少支持：

- nearest K
- radius search
- same city / area filter
- max straight-line distance
- deduplication
- self-edge rejection

不得仅靠 POI name。

### Stage B — candidate classification

将候选分类为：

- nearby
- same_area
- same_city
- regional
- access_to_transport_node
- special

分类规则需要可测试、可配置。

### Stage C — route enrichment

对候选边调用合法 route source 或允许的本地计算补充：

- actual walking distance/time
- driving time
- transit time
- transfers
- first/last mile walk
- cost
- route variability / P90（若 source 支持）

如果某 mode 无数据，保持 unresolved / unavailable，不得伪造。

## 6. Walking-specific handling

“直线距离近”不能直接等价为“可步行邻接”。

应检查：

- real walking distance
- route detour ratio
- elevation gain
- stairs
- inaccessible barriers
- bridge / river / railway separation
- mountain / temple / shrine access characteristics

例如：

```text
straight = 500m
walking = 4.8km
```

这类边不得被标记为高质量 nearby walking edge。

建议提供：

```text
detourRatio = walkingDistance / straightDistance
```

并允许 QA 根据阈值发现异常。

## 7. Typical / P90

Edge Contract 应支持：

```text
durationTypicalMin
durationP90Min
```

P90 如果 Provider / sample 不支持，可以暂时空缺，但 contract 必须预留。

不得用单一时间数字代表所有场景。

## 8. Time buckets

Transit / driving 的时间相关性需要预留 bucket 结构。

第一阶段 Pilot 可以只做代表性窗口，但 contract 需要支持后续：

- weekday morning
- weekday daytime
- weekday evening
- weekend morning
- weekend daytime
- weekend evening

如本 Task 未获取真实动态数据，应只实现结构和 fixture，不得假称已建立实时模型。

## 9. Convenience / reliability / difficulty

三类分数不得纯人工拍脑袋输入。

需要实现可解释计算函数，输入至少可考虑：

### Convenience
- duration
- transfer count
- walking distance
- frequency
- first/last-mile complexity
- accessibility

### Reliability
- P90 vs typical spread
- mode variability
- transfer risk
- frequency

### Difficulty
- walking duration
- walking distance
- elevation gain
- stairs
- accessibility

分数范围应复用项目现有 conventions；若无统一规范，Task 中明确冻结一种并写测试。

必须输出 component breakdown 或足够 trace，不能只输出一个无法解释的 score。

## 10. Pilot scope

Pilot 必须使用真实 Canonical POI。

优先：

```text
Tokyo metropolitan / Tokyo city-level cluster
```

如果 Canonical Registry 中 Tokyo 数量不足，则选择实际数据最完整的单一城市 / 高密度区域。

### Target

默认目标：

```text
500 POIs
```

若正式 Canonical Registry 当前不足 500 条，则：

- 不得用 candidate / enrichment workbook 冒充 canonical。
- 使用实际可合法选取的最大数量。
- 明确记录 shortfall。

### Expected candidate scale

500 POI × 约 40~80 directed candidates：

```text
约 20,000 ~ 40,000 candidate directed edges
```

这是候选边规模，不要求每条所有 mode 均 resolved。

## 11. Pilot outputs

至少生成：

1. Pilot POI manifest
2. Candidate directed edge dataset
3. Enriched edge dataset / fixtures
4. unresolved reasons
5. summary report
6. QA report
7. machine-readable stats

统计至少包括：

- POI count
- edge count
- mean / median outgoing degree
- min / max outgoing degree
- distance distribution
- nearby / same_area / same_city / access 分类数量
- walking resolved rate
- driving resolved rate
- transit resolved rate
- invalid / rejected edge count
- extreme detour count
- symmetric pair coverage
- asymmetric duration examples
- unresolved reason distribution

## 12. TransportNode foundation

本 Task 不需要完成日本全国交通网络，但必须定义最小 TransportNode contract / interface，并验证 POI access edge 可以表达：

- railway station
- airport
- bus terminal

至少在 Pilot 中为部分 POI 关联若干真实 transport nodes 或严格 fixtures。

TransportNode 不能复制成普通 POI 43 维实体。

## 13. Planner integration boundary

提供只读查询边界，例如：

```ts
getPoiEdges(fromPoiId)
getPoiEdge(fromPoiId, toPoiId)
findMobilityOptions(fromPoiId, toPoiId, context)
```

Planner 需要能计算：

```text
POI stay duration
+ transfer duration
+ safety buffer
= earliest feasible next start
```

但本 Task 不负责重写整个 Planner。

## 14. Tests

至少覆盖：

- no self edge
- directed semantics
- deterministic generation
- max-degree bound
- nearest-neighbor correctness
- radius filter
- same-city classification
- duplicate removal
- missing coordinates fail-closed
- invalid coordinate rejection
- detour anomaly
- optional mode handling
- score determinism
- score trace
- unresolved mode preservation
- TransportNode access edge
- serialization / validation
- fixture replay

运行仓库现有：

```text
lint
typecheck
relevant tests
build (if repository gate requires)
```

并记录 baseline failures，不得把既有失败算作本 Task 新失败。

## 15. Deliverables

至少：

```text
docs/tasks/TASK-082-a-poi-edge-graph-generation-pilot.md
docs/tasks/RESULT-TASK-082-a-poi-edge-graph-generation-pilot.md
docs/qa/TASK-082-a-poi-edge-pilot-qa.md
```

以及按仓库结构放置：

- edge contracts
- candidate generator
- scoring / classification logic
- tests
- pilot machine-readable artifacts

如生成体积较大的 Pilot 数据，遵循仓库现有 artifact / git size 规范；不要把不适合 Git 的海量原始 Provider 响应直接提交。

## 16. Acceptance criteria

- [ ] 未构建全国 N×N POI 图
- [ ] Canonical POI 来源可证明
- [ ] Edge 是 directed
- [ ] candidate generation deterministic
- [ ] degree 有上限且可配置
- [ ] local / city / transport-node 分层明确
- [ ] walking 实际路线与直线距离区分
- [ ] typical / P90 contract 就绪
- [ ] mode 可部分 unresolved
- [ ] convenience / reliability / difficulty 可解释
- [ ] Provider / cache / retention 权限合规
- [ ] Pilot 统计完整
- [ ] Planner lookup boundary 可用
- [ ] tests 通过或与 baseline 明确区分
- [ ] WBS 已同步
- [ ] Result 已写入 GitHub
- [ ] 未自动 merge

## 17. Mandatory WBS update

开始执行后：

```text
7.13 = 进行中
```

实现完成但 PR 未合并：

```text
7.13 = 待审查
```

只有 PR 合并 develop 且用户验收通过：

```text
7.13 = 已完成
```

Codex 最终返回前必须同步最新 `docs/project/WBS-TravelAssist.md`。

## 18. Stop conditions

出现以下情况不要猜：

- 无足够 Canonical POI
- Provider 不允许批量 / cache
- required secrets 缺失
- route provider production gate 未开
- canonical ID 无法稳定映射
- Pilot 数据来源与 canonical provenance 不一致

应返回 Partial / Blocked，并给出机器可审计的 blocker。

## 19. Result format

最终 Result 至少报告：

- base develop SHA
- branch
- final commit
- PR
- Pilot POI count
- candidate edge count
- enriched edge count
- per-mode resolution
- rejected edges
- degree stats
- Provider/license decision
- tests
- baseline failures
- WBS status
- next recommended scaling step

不得自动 merge。


## 20. 2026-09-28 Resume amendment

Current execution is governed by:

`docs/tasks/AMENDMENT-TASK-082-a-parallel-local-edge-transport-integration-v1.md`.

Key changes:

- Do not wait for TASK-084-B to run the real POI→POI local-edge Pilot.
- The real Pilot resumes only after a refreshed, user-accepted TASK-083-A / PR #444 is merged into develop.
- First legal real run is expected to use 100 admitted POIs and report 100/500 with shortfall 400.
- TransportNode integration remains a later phase after B's accepted transport artifacts.
- Passing the 100-POI local Pilot alone does not mark WBS 7.13 complete.
- Provider modes remain unresolved when batch/cache/retention/production rights are not established.
