# Codex Command — TASK-WBS-4.21-B

请在 TravelAssist 仓库完整执行 `TASK-WBS-4.21-B`。

Repository:
https://github.com/kanzakimy0/TravelAssist

Branch:
`feature/b-wbs-4-21-rule-feasibility-engine`

Task:
`docs/tasks/TASK-WBS-4.21-b-rule-feasibility-engine.md`

开始前执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

禁止执行：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

要求：

1. 从最新 `origin/develop` 核对 4.20 / 4.20.1 Contract、4.17 canonical Trip Plan、WBS、当前依赖与其他工作站最新合入内容。
2. 不覆盖任何其他 Task / WBS / Owner 的记录。
3. 4.21 只实现确定性 Rule / Feasibility Engine：validate、conflict detection、preview impact、item/day/itinerary reasonableness。
4. 不实现 4.22 DB transaction / persistence / idempotency storage / audit / rollback runtime。
5. 不创建第二套 Trip Plan Schema；runtime 类型必须实现现有 4.20.1 Contract。
6. 43 字段只作为版本化 POI/Profile/Rule 输入，不复制进 ChangeSet，也不能用高 matching score 抵消硬可行性约束。
7. `UPDATE_DURATION` 在 canonical 字段未冻结前继续 unsupported；schedule-derived planned duration 可用于评估。
8. 实现并测试 minimum/recommended duration、physical load × duration/context、time conflict、day overload、cross-day recovery/itinerary reasonableness。
9. Provider route fact 缺失或过期时 fail closed，不得伪造路程时间，也不得隐式调用付费 Provider。
10. 同输入 + 同规则版本必须得到相同结果，并提供 deterministic replay test。
11. 完成时生成 `docs/tasks/RESULT-WBS-4.21-b-rule-feasibility-engine.md`，WBS 4.21 设为 B / 待审查，创建 Draft PR -> develop，Issue 保持 Open 等待用户验收。
12. 完成后停止，不自动启动 4.22。

完整范围、案例和验收标准以 Task 文件为准。
