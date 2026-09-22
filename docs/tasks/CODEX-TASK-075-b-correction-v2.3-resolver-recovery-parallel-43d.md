# CODEX — TASK-075-B Correction v2.3

继续现有 TASK-075-B / Issue #416。不要新建 TASK-076。

先执行：

git status --short
git branch --show-current
git fetch --all --prune

读取并严格执行：

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/AMENDMENT-TASK-075-b-correction-v2.3-resolver-recovery-parallel-43d.md

并同时读取：

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/AMENDMENT-TASK-075-b-correction-v2.2-candidate-recall-rescue.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/AMENDMENT-TASK-075-b-correction-v2.1-path-semantic-review.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/AMENDMENT-TASK-075-b-resolver-43d-real-execution-correction-v2.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/TASK-075-b-japan-poi-entity-resolver-43d-completion.md

最新 v2.3 publication commit：

0a2da57ce4caf719af6302f7a9b1c52df844be14

优先级：

v2.3 > v2.2 > v2.1 > v2 > 原 Task

关键要求：

1. development resolver gate FAIL 不是 terminal BLOCKED。
2. 对每个 Recall@5 miss 做 row-level taxonomy。
3. Candidate generation 先扩展到最多50个候选，再 rerank Top1/Top5。
4. Candidate pool 必须 union：
   - municipality exact
   - municipality fuzzy
   - alias/English/romanization
   - historical municipality
   - address/locality
   - official URL/domain
   - category-assisted
   - station/access/context
   - inspect registry
   - external official/government/tourism/operator/SNS/reference discovery
5. 本地/structured pool miss 后必须执行 external authoritative discovery，不能直接 provisional。
6. development 要持续自动修 general rules，直到：
   - Recall@5 micro >=99%
   - Top1 micro >=98.5%
   - HIGH precision >=99%
   - MEDIUM >=98%
   - PROVISIONAL >=97%
   - hard-conflict auto-match=0
   - deterministic PASS
7. 同时报告 Recall@20 / Recall@50 / expanded-pool target presence。
8. benchmark ground truth 只有在确实无法从 provenance/inspect/authoritative source 验证时才允许标记为 unverifiable，并必须同 strata 补一个新的 unseen row。
9. development PASS 后建立全新的 >=300 final blind；blind FAIL 时只能修 general rules并换新 blind，不能在同一 blind 上反复调。
10. Resolver 修复期间，立即并行运行 >=50 条 accepted high-confidence POI 的 semantic write-through canary。
11. Canary 必须走真实生产链：
    search/open → retain → model_semantic_review_v2_1 → rubric → projection → canonical apply → reconcile
12. Canary PASS：
    - candidates >=50
    - semanticAnnotationAttempted=candidates
    - candidatesWithNewSupported >=30
    - canonical new non-null >=100
    - >=10 feature codes
    - provenance complete
    - unexplained delta=0
    - deterministic PASS
13. Canary FAIL 不得回来问用户，必须自动修 source/query/semantic/rubric/projector/canonical 并重跑。
14. 只有 resolver development PASS + final blind PASS + semantic canary PASS 后，才正式重跑 5920 identity。
15. 5920 identity 全部最终裁决后，立即 enrich accepted identities，并执行全 accepted-POI semantic 43D sweep。
16. 所有 final null 必须 field-level semanticReviewRef + saturation audit。
17. exact current-head GitHub Quality Gate PASS 后才允许 COMPLETE。

继续 TASK-075 无人值守授权：
- auto-next
- routine self-healing
- failed-unit rerun
- bounded retry
- ordinary non-force push
- safe normal merge without history rewrite
- Result/QA/PR update

禁止：
- force push
- history rewrite
- reset/clean
- direct push develop/main
- auto-merge
- Master Code allocation
- Registry rebind
- production import

持续更新：

docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md

不要返回“development gate failed, waiting for user”。
development gate failed 时必须进入 resolver recovery loop。

现在从 development miss taxonomy + expanded candidate generation 开始，并并行启动 semantic write-through canary。
