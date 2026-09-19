# CODEX — TASK-072-A / WBS 9.11 Performance 最终收口

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#405

Existing implementation PR:
#245

Existing implementation branch:
`codex/a-performance-observability`

Task publication branch:
`task/a-security-performance-final-closeout`

本 Task 必须复用现有 PR #245 / `codex/a-performance-observability`。目标是对当前 develop 做最终性能与错误观测收口，不新建第二套 runtime。

开始前：
```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/a-performance-observability
git log --oneline -15 origin/develop
```

读取完整 Task：
```bash
git show origin/task/a-security-performance-final-closeout:docs/tasks/TASK-072-a-performance-final-closeout.md
```

同时读取：
- TASK-024-A / RESULT;
- TASK-028-A / RESULT;
- PR #245 当前 diff/body/checks;
- 当前 Planner Store / routing / error-state / deployment contracts;
- 当前 Master WBS。

禁止：
```text
新建第二个 performance/observability implementation PR
git rebase
git reset --hard
git clean -fd
git push --force
git push --force-with-lease
静默放宽 performance budget
把 TBT 当 INP
把 lab 数据当 production p75
把 fallback Map 当 live Mapbox performance
上传用户资料/偏好/精确位置/Trip/Provider payload
未经批准启用外部生产 Collector/RUM/Alerts
```

执行要求：
1. 切换现有 `codex/a-performance-observability`。
2. 正常 merge execution-time 最新 `origin/develop`。
3. 在同一机器、浏览器、production build、cache/network/CPU 条件下分别测 latest develop baseline 与 integrated head。
4. 覆盖 Home/Start/Planner/Detail × desktop/mobile，冷启动 >=3。
5. 复验 fixed performance budgets、JS 增量、320×740 overflow、Planner↔Detail >=20 轮生命周期。
6. 复验 browser/server error、cancellation、redaction、queue/sink failure。
7. disabled export 下外部观测请求必须为 0。
8. 若 live Mapbox 无真实成功样本，明确 Deferred。
9. 运行完整 repository QA 和 exact final-head hosted Quality Gate。
10. 更新 WBS 9.11、RESULT、QA evidence 与现有 PR #245。
11. 保持 #245 Draft/Open；不得自动 merge。

最终返回：
`# RESULT — TASK-072-A`

必须包含：
- old PR head / latest develop SHA / final head;
- conflicts resolved;
- baseline vs head environment metadata;
- route/view performance table and budget result;
- compact viewport result;
- 20-cycle lifecycle result;
- browser/server error/privacy result;
- external request count;
- full regression/lint/typecheck/build/deploy results;
- hosted Quality Gate;
- Issue #405 / PR #245 / WBS status;
- Deferred production RUM/Collector/Alerts/live-provider evidence.
