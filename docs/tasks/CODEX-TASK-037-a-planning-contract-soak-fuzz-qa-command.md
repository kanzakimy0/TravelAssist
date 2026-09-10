# Codex Command — TASK-037-A

请在 TravelAssist 仓库中完整执行 **TASK-037-A — Planning Contract Soak / Fuzz / Consistency QA**。

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#297
```

Task publication branch:

```text
task/a-task-037-planning-contract-soak-qa
```

Expected implementation branch:

```text
codex/a-planning-contract-soak-qa
```

## 开始前

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/a-trip-planning-contract-foundation
git log --oneline -20 origin/develop
git log --oneline -10 origin/codex/a-trip-planning-contract-foundation
```

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

读取远端完整 Task：

```bash
git show origin/task/a-task-037-planning-contract-soak-qa:docs/tasks/TASK-037-a-planning-contract-soak-fuzz-qa.md
```

## 分支规则

先检查 PR #293 是否已经合并到 develop。

如果 #293 **仍未合并**：

```bash
git switch -c codex/a-planning-contract-soak-qa origin/codex/a-trip-planning-contract-foundation
git merge origin/develop
```

正常解决冲突，必须保留 TASK-036 的三个 review invariants：

```text
EXPIRED 禁止 USE / USE_WITH_WARNING
PoiPlanningProjection root/FeatureSet/all VisitProfile poiRef 一致
planning_prior 禁止 exact arrival/departure minutes
```

TASK-037 Draft PR base 使用：

```text
codex/a-trip-planning-contract-foundation
```

如果 #293 **已经合并**：从最新 `origin/develop` 创建实现分支，Draft PR base 使用 `develop`。

不得修改、retarget、merge、close PR #293。

## 无人值守执行原则

这是夜间无人值守 QA Task：

- 不询问交互式选择；
- Task 内已定义的事项直接按规则执行；
- Task-owned 测试问题自行修复并重跑；
- 发现新的 canonical/frozen semantic conflict 时才停止为 Blocked；
- 不调用任何 Provider / LLM / 付费 API；
- 不修改生产数据；
- 不自动 merge；
- 不开始 100 POI Pilot。

## 核心交付

严格按 Task 实现：

```text
seeded deterministic mutation/fuzz harness
cross-contract invariant QA
JSON wire round-trip QA
repeated/soak determinism QA
synthetic scale observations
P0 design → contract → validator → fixture → test coverage matrix
full repository regression
```

不得通过新增大型测试框架依赖完成；优先复用 Node test 和现有 TS loader。

## 必须验证

至少执行：

```bash
npm ci
npm run test:planning-contracts
npm run test:routing
npm run lint
npm run typecheck
npm run build
```

执行仓库当前实际 Trip / Route / Engine 合同测试以及 canonical 全仓 Node 测试命令。

对 TASK-037 修改文件运行 Prettier check，并执行：

```bash
git diff --check
```

若全仓 format/check 有既有失败，必须和最新 base 比对并明确记录，不能把旧债写成 TASK-037 PASS，也不能大范围格式化无关文件。

## 完成前强制同步

更新 Master WBS，新增/更新：

```text
WBS 9.13 — Planning Contract Soak / Fuzz / Consistency QA
```

创建：

```text
docs/tasks/RESULT-TASK-037-a-planning-contract-soak-fuzz-qa.md
```

创建 QA 证据：

```text
docs/qa/TASK-037/planning-contract-coverage.md
docs/qa/TASK-037/planning-contract-coverage.json
docs/qa/TASK-037/soak-report.json
docs/qa/TASK-037/scale-report.json
```

按实际实现补充其他必要 QA 文件，但不要提交无价值的大型随机输出。

然后：

```text
commit
push
创建 Draft PR
```

PR 未合并前 WBS 9.13 = 待审查。

最后返回完整 TASK-037 Result，并停止。

**不得自动合并任何 PR，不得关闭 #291/#297，不得开始 100 POI Scoring Pilot。**