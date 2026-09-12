# CODEX — TASK-044-A

请在 TravelAssist 仓库中完整执行 TASK-044-A，对 TASK-043-A / PR #326 的 Canonical Master Code Registry 做独立治理验收。

Repository:
`https://github.com/kanzakimy0/TravelAssist`

Issue:
`#347`

Task:
`docs/tasks/TASK-044-a-master-code-governance-acceptance.md`

Upstream:
- TASK-043-A / Issue #311
- Draft PR #326
- expected reviewed head at task creation: `3cac68b89097db9853ae881b43c8675b329e12dd`

开始前执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
git rev-parse origin/codex/a-master-code-registry
```

禁止执行：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

读取完整 Task：

```bash
git show origin/develop:docs/tasks/TASK-044-a-master-code-governance-acceptance.md
```

必须使用独立 clean worktree / review branch，不得触碰其他工作区 Planner / Step 未提交修改。

核心要求：

- 独立复核 TASK-043，不得直接照抄其 Result；
- 确认唯一 canonical registry、五位数字既有 grammar、生命周期与不可回收/不可变约束；
- 复核 50/50 TASK-041 Region 分配，Region ID 原样保留，全部解析到 active registry entry；
- 禁止恢复或接受 `JP-RG-*`、`JP-PREF-*`、`JP-MACRO-*`、destination/admin/transport/POI/DB ID 作为 Master Code；
- 复核 Option A：`masterCode: string | null` 只能用于 Partial/draft，生产完整 Region 数据必须 0 null；若不安全则明确拒绝，不得静默冻结；
- 重跑 focused + relevant regression + lint + typecheck + build + diff-check + canonical full Node regression；
- 输出 `RESULT-TASK-044-a-master-code-governance-acceptance.md`、`docs/qa/TASK-044/acceptance-report.md`、`registry-invariant-check.json`；
- 最终只能给出 `ACCEPT` / `ACCEPT WITH REQUIRED CORRECTIONS` / `REJECT` 之一；
- PASS 时仍保持 PR #326 Draft/Open、Issue #311/#347 Open、WBS 2.18 待审查、WBS 4.48 Partial；
- 不自动合并，不启动 TASK-041 integration，不启动 Candidate Pipeline。

完成后把完整 Result 返回给我。