# CODEX — Execute TASK-084-A

Repository:
`https://github.com/kanzakimy0/TravelAssist`

Issue:
`#450`

Task publication branch:
`task/a-task-084-poi-recommendation-scoring-v1`

Task file:
`docs/tasks/TASK-084-a-poi-recommendation-scoring-v1.md`

## Command

请在 TravelAssist 仓库执行 **TASK-084-A — WBS 7.9 Recommendation Scoring v1 / Real POI Matching Pilot**。

开始前：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

读取远端正式 Task：

```bash
git show origin/task/a-task-084-poi-recommendation-scoring-v1:docs/tasks/TASK-084-a-poi-recommendation-scoring-v1.md
```

同时读取：

```bash
git show origin/develop:docs/architecture/poi-scoring-spec-v0.2.md
git show origin/develop:docs/architecture/poi-feature-preference-codebook-v0.1.md
git show origin/develop:docs/architecture/planner-preference-contract-v1.md
git show origin/develop:docs/architecture/preference-schema-v1.md
git show origin/develop:docs/design/planner-decision-candidate-ranking-tradeoff-explanation-model.md
```

然后：

1. 从**执行时最新** `origin/develop` 建立独立实现分支，建议：
   `codex/a-task-084-poi-recommendation-scoring-v1`。
2. 把正式 Task 文件带入实现分支，保留 Issue #450 追踪。
3. 先做 Phase 0 preflight；重新检查 #444 与 #437 当前状态。
4. 即使真实 Pilot 仍被 #444/#437 阻塞，也必须继续完成可独立实现的 deterministic scoring runtime、23-key→scoring mapping、contract tests、reason evidence 与版本化配置。
5. **真实100 POI Pilot 只能在正式 Canonical + 正式 Feature43 gate 都通过时执行。**
6. 禁止使用 candidate-only workbook Feature43 值假装 Real Pilot。
7. 禁止让 LLM 决定 runtime score、weights 或 reason evidence。
8. 实现完成后创建 Result、QA artifacts、更新 WBS 7.9 到真实状态，并创建 Draft PR。
9. 不自动 merge，不启用 auto-merge。
10. 如果 Runtime PASS 但真实数据 gate 仍未通过，Result 必须明确：
    `PARTIAL / PASS_RUNTIME / BLOCKED_REAL_PILOT`。

完成后汇报：

- BASE / FINAL commit；
- branch；
- Issue / Draft PR；
- Runtime status；
- Real Pilot status；
- #444 / #437 gate 状态；
- 23→43 mapping/version；
- scoring config version；
- tests / lint / typecheck / build / Quality Gate；
- 真实 Pilot 若执行：100 POI × benchmark personas 的结果摘要、deterministic hashes、pairwise benchmark；
- 未执行的内容必须明确写 `BLOCKED` / `NOT RUN`，不得写成 PASS。
