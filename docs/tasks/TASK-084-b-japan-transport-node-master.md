# TASK-084-B — Japan TransportNode Master / 日本全国交通节点主库

- Issue: #441
- Owner: B
- Execution role: Offline data production / graph data support
- Runtime / API / Planner owner: A (unchanged)
- Proposed WBS: 7.14
- Priority: P0
- Depends on: 7.4 Canonical POI schema (identity boundary), 7.5 Route Schema
- Branch when executing: `feature/b-japan-transport-node-master`
- Batch size: 200 nodes
- Auto-next: Yes, only after batch QA PASS
- Auto-merge: No

## 1. Goal

建立日本全国旅游规划使用的 TransportNode 主数据底座，供后续：

1. POI → TransportNode Access Edge；
2. TransportNode → TransportNode 全国交通骨架；
3. Planner 的跨区域 / 跨城市路径组合；
4. 后续动态时刻、票价、运营状态 runtime lookup。

本 Task 只负责 **TransportNode 身份与稳定/准稳定静态资料**，不负责 Planner、Route API、实时班次、实时票价、实时中断信息。

## 2. Ownership boundary

用户明确将本数据生产 Task 交给 B。

但仓库现有 A/B 边界保持：

- B：离线数据生产、节点身份解析、批次生成、QA、provenance、machine-readable artifact。
- A：Route runtime、Provider adapter、Route API、Planner、生产时动态查询、cache/retention 决策。

B 不得借本 Task 修改 A 的 Planner / Route runtime 业务逻辑。

## 3. Node scope

### 3.1 必须覆盖

第一阶段至少支持：

- railway_station
- shinkansen_station
- metro_station
- major_bus_terminal
- airport
- ferry_port

### 3.2 旅游区按需覆盖

当其对 Canonical POI 接入明显重要时，可纳入：

- ropeway_station
- cable_car_station
- funicular_station
- tourist_shuttle_terminal
- mountain_transport_terminal

### 3.3 不要求无差别收全

禁止为了“全国全量”而把每一个普通公交站全部抓入。

采用分层：

- T0: 全国 / 区域核心枢纽
- T1: 服务 Canonical POI 的主要节点
- T2: 连接 T0/T1 所需换乘节点
- T3: 后续按需求扩展的普通节点

本 Task 的“全国”是 **全国可规划骨架覆盖**，不是无边界抓取所有 stop。

## 4. TransportNode contract

在复用仓库现有 contract / master code 规范的前提下，定义或冻结最小 TransportNode 数据结构。

至少表达：

```ts
type TransportNode = {
  transportNodeId: string;

  nodeKind:
    | "rail_station"
    | "shinkansen_station"
    | "metro_station"
    | "bus_terminal"
    | "airport"
    | "ferry_port"
    | "ropeway_station"
    | "cable_car_station"
    | "other_tourism_transport";

  nodeLevel: "T0" | "T1" | "T2" | "T3";

  canonicalNameJa: string;
  canonicalNameEn?: string;
  aliases?: string[];

  latitude: number;
  longitude: number;

  prefectureCode?: string;
  municipalityCode?: string;

  parentHubId?: string;

  operatorRefs?: string[];
  lineRefs?: string[];
  serviceRefs?: string[];

  externalRefs?: Array<{
    source: string;
    id: string;
  }>;

  accessibility?: "good" | "mixed" | "poor" | "unknown";

  sourceRefs: string[];
  confidence: number;
  observedAt?: string;
  generatedAt: string;
};
```

字段名可按仓库规范调整，但语义不得丢失。

## 5. Hub / Stop identity rule

一个“东京站”可能包含多个 operator / line / platform / terminal。

不得简单按名称全部合并，也不得把每个入口都当独立全国节点。

至少支持：

```text
TransportHub
  ├─ operator stop / station component
  ├─ operator stop / station component
  └─ terminal component
```

可以通过 `parentHubId` 或仓库更合适的结构表达。

### Identity gate

合并两个节点前至少检查：

- 名称 / 别名
- 坐标距离
- operator
- line/service
- municipality
- official source identity
- known interchange relationship

存在冲突时必须：

```text
REVIEW_REQUIRED
```

不得只按同名自动合并。

## 6. Stable ID rules

`transportNodeId` 必须：

- deterministic
- immutable after acceptance
- 不依赖数组顺序
- 不依赖临时 batch number
- 不依赖易变 display name
- 可追溯到 source identity / internal identity decision

不得使用随机 UUID 作为无法复算的唯一依据，除非仓库 master-code 规范明确要求。

## 7. Source priority

优先级：

1. 官方交通 operator / 官方机场 / 官方港口
2. 政府 / 公共交通开放数据
3. 已批准 Provider
4. 高可信结构化公共来源
5. 其他来源仅作辅助证据

必须记录：

- source URL / source ID
- source type
- observed date
- license / usage note（如果适用）
- content hash / retained evidence reference（按仓库现有模式）

不得无控制抓取。

## 8. Static vs dynamic boundary

### 本 Task 可以保存

- 身份
- 名称
- 坐标
- operator
- line association
- hub relationship
- prefecture / municipality
- node type
- stable accessibility metadata（有可信来源时）
- official external IDs
- service category

### 本 Task 不静态冒充实时保存

- 今日实时班次
- 今日延误
- 今日停运
- 当前票价（若来源/版本不稳定）
- 实时站台
- 当前拥挤
- 临时施工

动态字段只能在 contract 中预留或带明确 snapshot/freshness。

## 9. Coverage strategy

### Phase A — seed national backbone

先生成：

- 所有新干线主要站
- 全国主要机场
- 主要 ferry ports
- 主要跨城市 bus terminals
- 核心 JR / 私铁 / metro hub

### Phase B — POI-driven expansion

读取正式 Canonical POI，针对每个 POI 的地理区域寻找可用交通节点。

优先补：

- 最近 rail/metro station
- tourism access bus terminal
- transport hub
- island/ferry access
- mountain/ropeway access

### Phase C — connectivity completion

检查后续全国交通骨架所需的换乘节点。

没有必要服务 Planner 的普通小站可以 Deferred。

## 10. Batch execution

固定：

```text
200 TransportNodes / batch
```

流程：

```text
candidate discovery
→ identity resolution
→ metadata extraction
→ validation
→ QA
→ receipt
→ checkpoint
→ auto-next batch
```

每批必须生成：

- input manifest
- output records
- identity decisions
- unresolved/review list
- source/provenance ledger
- QA receipt
- checksum

只有当前 batch QA PASS 才允许自动进入下一批。

## 11. Resume / unattended requirements

必须支持：

- crash resume
- checksum skip
- deterministic rebuild
- single-batch rerun
- corrupted receipt detection
- changed source/rubric invalidation

夜间运行时：

- 不因单条失败停止整个 corpus
- 单条进入 explicit unresolved reason
- 但 schema / provenance / checksum systemic failure 必须停止

## 12. Required unresolved reasons

至少标准化：

- NO_AUTHORITATIVE_SOURCE
- IDENTITY_AMBIGUOUS
- DUPLICATE_SUSPECTED
- COORDINATE_CONFLICT
- OPERATOR_CONFLICT
- HUB_RELATION_UNRESOLVED
- LICENSE_BLOCKED
- SOURCE_UNAVAILABLE
- NOT_RELEVANT_TO_TOURISM_GRAPH

不得使用一个 generic `UNKNOWN` 覆盖全部原因。

## 13. QA

至少验证：

- unique transportNodeId
- stable deterministic IDs
- valid coordinates
- Japan geographic sanity
- no impossible prefecture mismatch
- no blind same-name merge
- parentHub does not self-reference
- no parent cycle
- valid nodeKind
- valid nodeLevel
- sourceRefs non-empty for accepted records
- confidence range valid
- no Canonical POI ID collision
- no Master Code rebind
- deterministic rebuild
- batch checksum repeat

## 14. Machine-readable outputs

建议输出：

```text
data/transport/nodes/
  transport-nodes.jsonl
  transport-node-aliases.jsonl
  transport-node-external-refs.jsonl
  transport-node-identity-decisions.jsonl
  transport-node-unresolved.jsonl
  batch-receipts/
  manifest.json
```

具体路径以仓库现有 data 规范为准。

## 15. Result metrics

Result 至少报告：

- total accepted nodes
- T0/T1/T2/T3 counts
- counts by nodeKind
- counts by prefecture
- parentHub count
- external ID coverage
- coordinate coverage
- operator coverage
- source provenance coverage
- unresolved count
- review-required count
- duplicate merge count
- rejected count
- batch count
- deterministic rebuild status
- exact-head tests / quality gate

## 16. Acceptance

- [ ] 全国规划骨架所需 T0/T1 节点已形成
- [ ] TransportNode 不冒充 POI
- [ ] identity 可追溯
- [ ] IDs deterministic
- [ ] hub/stop 关系可表达
- [ ] 200/batch 可恢复
- [ ] 全部 accepted 记录有 provenance
- [ ] 动态数据没有冒充实时静态数据
- [ ] 未修改 A Route/Planner runtime
- [ ] WBS / Result / QA 已同步
- [ ] Draft PR only
- [ ] 未自动 merge

## 17. Stop conditions

以下任一情况必须 Partial/Blocked：

- 正式数据许可不允许保存
- 无法区分 TransportNode 与 Canonical POI identity
- 大量坐标/名称冲突无法可靠裁决
- source rights 不明确且会影响持久化
- 仓库已有 canonical TransportNode contract，与本 Task 设计冲突但未审查

## 18. Deliverables

至少：

- `docs/tasks/TASK-084-b-japan-transport-node-master.md`
- `docs/tasks/RESULT-TASK-084-b-japan-transport-node-master.md`
- `docs/qa/TASK-084-B/README.md`
- machine-readable node artifacts
- batch receipts
- tests

完成后停止，不自动开始 TASK-085-B，除非执行指令明确授权“084 PASS 后自动启动 085”。
