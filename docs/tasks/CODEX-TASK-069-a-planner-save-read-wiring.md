# CODEX — TASK-069-A / WBS 4.19 Planner Save/Read 接线

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#403

Task publication branch:
`task/a-planner-save-read-wiring`

执行完整 TASK-069-A。开始前必须从 execution-time 最新、干净的 `origin/develop` 创建：
`codex/a-planner-save-read-wiring`

开始前：
```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

禁止：
```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
rebase / history rewrite
```

读取完整 Task：
```bash
git show origin/task/a-planner-save-read-wiring:docs/tasks/TASK-069-a-planner-save-read-wiring.md
```

同时读取并核对当前 develop 中的：
- WBS 4.15 Planner Store implementation / architecture / QA / Result；
- WBS 4.17 Canonical Trip Plan Contract；
- WBS 8.5 Trip Plan Schema、repository、RLS、CAS、transaction、runtime tests；
- Engine 4.20–4.24 frozen boundaries；
- 当前 Auth/session/server boundary；
- 当前 Loading/Empty/Error presentation；
- Master WBS。

核心目标：
```text
Canonical server Trip read
→ validate/adapt
→ PlannerStore canonical hydrate
→ local working edits
→ explicit Save
→ existing persistence + owner auth + CAS
→ canonical revision acknowledgement
→ Store reconcile / clean exact snapshot
```

必须复用既有 persistence，不得建立第二套 Trip repository/schema。不得 autosave。不得让 late read/save acknowledgement 覆盖更新的本地编辑。冲突/网络/Auth/invalid payload/localStorage failure 都必须保留安全 working state。

实现后完成 Task 指定全部 QA；真实 Local DB/RLS/CAS 场景不可用 mock 冒充。更新 WBS 4.19、生成 RESULT、QA evidence，并创建 **一个 Draft PR → develop**。

不要自动 merge。不要自动启动 4.18 或后续 Task。

最终返回完整：
`# RESULT — TASK-069-A`
并列出 Issue、branch、base/head SHA、Draft PR、实现范围、read/save contract、CAS/冲突策略、browser/server precedence、测试结果、Quality Gate、WBS 状态、剩余风险。
