# TravelAssist — Planner Optimization / Constraint Solver / Search Strategy / Schedule Construction Model

> 状态：冻结为 Planner 求解核心 v1  
> 目标：将 Candidate Pool 转换为满足硬约束、体验质量高、可解释、可验证的正式行程候选。

## 1. 总体链路

```text
Candidate Pool
↓
Constraint Builder
↓
Anchor Placement
↓
Schedule Construction
↓
Route / Duration Evaluation
↓
Search / Optimization
↓
Feasibility Pruning
↓
Candidate Plans
↓
Validator
↓
Ranking
```

## 2. 求解原则

- Hard Constraint 永远先于 Soft Objective。
- Planner 只生成候选，不直接写 Trip。
- 不允许使用一个“总分”抵消不可执行条件。
- 初始规划与实时重规划使用不同 Search Budget 与 Stability Penalty。
- 对无解场景必须返回明确冲突，不硬造方案。

## 3. Constraint 分类

### Hard

```text
trip dates
day start/end
opening hours
last admission
reservation
fixed transport
minimum duration
must_keep
locked item
travel feasibility
hotel/cross-city anchor
```

### Soft

```text
recommended duration
user preference
walking
fatigue
cost
theme
diversity
iconic/local balance
buffer
route simplicity
```

## 4. Anchor Placement

先固定：

```text
paid reservation
fixed departure
must_keep locked time
hotel deadline
cross-city transport
```

再在 Anchor 之间填充可选项目。

## 5. Time Blocks

一天拆成：

```text
pre-anchor windows
anchor blocks
post-anchor windows
meal windows
break windows
transfer blocks
```

每个窗口独立构造，再全局校验。

## 6. Schedule Construction

每个 POI 至少考虑：

```text
earliest_start
latest_start
minimum_duration
recommended_duration
opening interval
transfer_in
transfer_out
```

## 7. Search Strategy v1

推荐混合：

```text
deterministic greedy seed
+
beam search
+
local improvement
```

而不是直接全组合暴力搜索。

## 8. Greedy Seed

快速生成若干合法起始方案，策略可包括：

```text
highest preference
closest next
anchor-aware
iconic-first
low-walking
```

## 9. Beam Search

每层仅保留 Top-N partial schedules。

Prune：

- hard constraint violation
- impossible transfer
- no remaining time
- dominated state
- excessive fatigue
- duplicate state

## 10. State

```ts
interface PlannerSearchState {
  currentTime: string;
  currentLocationId: string;
  visitedPoiIds: string[];
  remainingCandidateIds: string[];
  accumulatedUtility: number;
  walkingMeters: number;
  fatigueScore: number;
  costEstimate: number;
  nextAnchorId?: string;
}
```

## 11. Dominance Pruning

若两个 State：

```text
same current location
similar current time
same visited core set
```

且 A 在时间、成本、步行、utility 全面优于 B，则淘汰 B。

## 12. Duration Allocation

先给 minimum duration，再根据剩余时间与价值分配额外时长至 recommended duration。

禁止为了塞更多 POI 把所有项目压到 minimum。

## 13. Buffer

Planner 必须显式生成：

```text
transfer buffer
reservation buffer
meal flexibility
end-of-day buffer
```

而不是把全天排满。

## 14. Fatigue-aware Construction

越晚时：

- 高 walking / high intensity POI penalty 增大
- 连续重项目 penalty 增大
- 合理 break value 增大

## 15. Meal Construction

普通用餐是柔性窗口；有预约的餐厅作为硬 Anchor。

## 16. Route Evaluation

每次深度扩展不一定调用外部 Route API。

建议：

```text
cheap distance estimate
→ prune
→ selected edges route lookup
→ final route verification
```

## 17. Search Budget

配置：

```text
max states
max beam width
max route calls
max compute ms
max candidate depth
```

到预算时返回当前最佳合法候选，而不是无限搜索。

## 18. Initial vs Realtime

Initial Planner：

- 可探索更多组合
- 更重体验优化

Realtime Planner：

- Candidate 范围更小
- 强 Stability / Disruption penalty
- 优先局部调整
- Search Budget 更短

## 19. Local Improvement

对完整候选尝试：

```text
swap
2-opt geographic improvement
move
duration rebalance
transport substitution
```

每次修改后重新检查 Hard Constraints。

## 20. No-solution

输出：

```text
conflicting_constraints
blocking_anchors
minimum_required_time
available_time
suggested_relaxations
```

AI 可以解释，但不能自行放松硬约束。

## 21. Planner Candidate

每个候选包含：

```text
schedule
transfers
durations
buffers
feature summary
search provenance
planner_version
data_bundle_id
route_snapshot refs
```

## 22. Determinism

Benchmark 模式固定：

```text
seed
candidate order
data bundle
route fixtures
```

确保可重现。

## 23. Planner Trace

记录：

```text
candidate pool id
constraints
anchors
states explored
states pruned
route calls
termination reason
candidate count
latency
```

不记录私有 Chain-of-Thought。

## 24. Error Codes

```text
PLANNER_NO_SOLUTION
PLANNER_BUDGET_EXHAUSTED
PLANNER_ROUTE_UNAVAILABLE
PLANNER_CONSTRAINT_CONFLICT
PLANNER_DATA_INCOMPLETE
PLANNER_INTERNAL_ERROR
```

## 25. v1 验收 Gate

- Hard / Soft Constraint 分离
- Anchor-first construction
- minimum duration 不可违反
- 有 Search Budget
- 支持无解
- 生成多个合法候选
- 实时 Replan 有 Stability penalty
- Planner 与 Validator 分离
- Planner 输出有完整版本元数据

## 26. 最终冻结原则

> Planner 是约束求解与多目标优化器，不是 LLM 文本生成器。

> 先保证可执行，再优化体验。

> Anchor 决定骨架，Candidate POI 填充窗口，Route 与 Duration 决定可行性。

> 搜索必须有预算、剪枝和无解出口。

> Planner 生成候选，Validator 才决定是否允许进入 Ranking。
