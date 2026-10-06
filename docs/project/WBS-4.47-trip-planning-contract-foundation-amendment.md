# WBS 4.47 Amendment — Trip Planning Engine Contract Foundation

> 日期：2026-09-10  
> 状态：Task Created / 待实现分支并入 Master WBS  
> Task：`TASK-036-A`  
> Issue：#291  
> Owner：A  
> Responsibility：Main Travel System / Shared Planning Contracts

---

## Master WBS row

在最新 `docs/project/WBS-TravelAssist.md` 的 Planner / Planning Engine 区域新增唯一行：

```md
| 4.47 | Trip Planning Engine Contract / Validator / Fixtures Foundation | A | P0 | 4.17,2.7；P0 Design Candidate set | 进行中 / 待审查 / 已完成按 TASK-036 状态更新 |
```

不得重编号或覆盖：

```text
4.20–4.24  B-owned Trip Mutation Engine
4.25–4.46  已有 Planner / Detail 工作项
```

## Tracking

```text
Task: TASK-036-A
Issue: #291
Task file: docs/tasks/TASK-036-a-trip-planning-contract-foundation.md
Codex command: docs/tasks/CODEX-TASK-036-a-trip-planning-contract-foundation-command.md
Implementation branch: codex/a-trip-planning-contract-foundation
Design base: design/a-trip-engine-poi-ai-architecture-v2
Design PR: #266
```

## Integration rule

本 amendment 不替代 Master WBS。

原因：Task 创建时 `develop` 正在由其他工作站持续推进，最新已包含 B 4.21 收口；直接从较旧设计分支整份覆盖 `WBS-TravelAssist.md` 有丢失并行记录的风险。

因此 TASK-036 Codex 必须：

1. 先 `git fetch --all --prune`；
2. 在实现分支合入最新 `origin/develop`；
3. 读取最新 Master WBS；
4. 将 4.47 行和 TASK-036 tracking 以最小 diff 安全并入；
5. 保留所有其他工作站的新记录；
6. 最终 Result 前再次同步 status / Issue / branch / commit / Draft PR。

状态规则：

```text
Task only created             → 尚未把 Master 行误标为完成
implementation started        → 进行中
implementation done / PR open → 待审查
merged develop + accepted     → 已完成
```

TASK-036 不得因为 Contract Foundation 完成而把 6.x、7.4、7.9、8.5 或 B 4.20–4.24 自动标为完成。