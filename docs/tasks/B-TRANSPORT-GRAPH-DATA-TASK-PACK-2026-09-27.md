# B Transport Graph Data Task Pack — 2026-09-27

用户明确将以下三项离线交通数据生产任务交给 B。

> A/B 边界：B 负责离线数据生产、批次、provenance、QA、可重建 artifact；A 保持 Route runtime / API / Planner / production provider integration 所有权。

## Task order

| Order | Task | Issue | Proposed WBS | Dependency | Batch |
|---:|---|---:|---:|---|---|
| 1 | TASK-084-B Japan TransportNode Master | #441 | 7.14 | 7.4 / 7.5 | 200 nodes |
| 2 | TASK-085-B POI→TransportNode Access Edge | #442 | 7.15 | TASK-084-B + Canonical POI | 200 POIs |
| 3 | TASK-086-B TransportNode→TransportNode Mobility Backbone | #443 | 7.16 | TASK-084-B + 7.5 | 200 edges / route chunk |

单 B worker 默认顺序：

```text
TASK-084-B
  ↓ PASS
TASK-085-B
  ↓ PASS
TASK-086-B
```

如果以后有第二个 B worker：

```text
TASK-084-B
  ↓ PASS
  ├─ TASK-085-B
  └─ TASK-086-B
```

085 与 086 在 084 PASS 后可并行。

## Global rules

### 1. No duplicate runtime contract

开始每项前读取最新：

- TASK-082-A
- TASK-084/085/086 preceding Result
- WBS
- Canonical POI Schema
- Route Schema
- current Route/Provider contract

如果 A 已冻结 TransportNode / Mobility schema，B 必须复用。

### 2. No N×N

禁止：

- POI × all TransportNodes
- all TransportNodes × all TransportNodes
- arbitrary nationwide all-pairs

只生成 bounded / topology-supported edges。

### 3. Data truth

任何字段：

- 无来源
- 无许可
- identity 不确定
- freshness 不足

必须 unresolved。

严禁为了 coverage 猜值。

### 4. Provider rights

若 batch query / cache / retention / commercial persistence 权限未确认：

- fail-closed
- 不保存 raw provider payload
- 使用允许的静态来源 / fixture / derived fields
- Result 明确 blocker

### 5. Batch

全部任务必须：

- checkpoint
- receipt
- checksum
- deterministic rebuild
- resume
- corrupted-batch detection
- auto-next after QA PASS

### 6. Git / merge

- 每项独立 feature branch
- 每项独立 Result / QA
- Draft PR
- 不自动 merge
- 不修改另一个 Owner runtime 范围

## TASK-084-B output

目标：全国旅游规划 TransportNode 主库。

至少产出：

- nodes
- aliases
- external refs
- hub/child relationships
- operator/line refs
- unresolved ledger
- provenance
- national coverage report

## TASK-085-B output

目标：全部正式 Canonical POI 的接入节点边。

至少产出：

- POI→Node
- Node→POI
- walking/access facts
- local vs hub role
- detour anomalies
- difficulty trace
- unresolved POIs
- prefecture coverage report

## TASK-086-B output

目标：全国 TransportNode 交通骨架。

至少产出：

- lines
- service patterns
- service segment edges
- hub transfer edges
- approved direct-service shortcuts
- freshness-aware dynamic field boundary
- national connectivity audit

## Definition of completion

三项全部完成后，数据层应支持：

```text
POI
↓
TransportNode
↓
National Transport Network
↓
TransportNode
↓
POI
```

同时保持：

- POI node data independent
- TransportNode independent
- Mobility Edge independent
- Planner/runtime integration owned by A
