# CODEX — TASK-075-B Correction v2.2

继续现有 TASK-075-B / Issue #416。不要新建 TASK-076。

Repository: kanzakimy0/TravelAssist

先执行：

git status --short
git branch --show-current
git fetch --all --prune

然后读取并严格执行：

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/AMENDMENT-TASK-075-b-correction-v2.2-candidate-recall-rescue.md

同时读取：

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/AMENDMENT-TASK-075-b-correction-v2.1-path-semantic-review.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/AMENDMENT-TASK-075-b-resolver-43d-real-execution-correction-v2.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/TASK-075-b-japan-poi-entity-resolver-43d-completion.md

git show origin/task/b-task-075-japan-poi-entity-resolver-43d-completion:docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md

最新 v2.2 publication head：

ccddc6fa317d534ec0b9c75a03ca96ca8d538cc4

优先级：

Correction v2.2
>
Correction v2.1
>
Correction v2
>
原 TASK-075

本轮重点：

1. 先修 metric accounting，所有 Recall/Accuracy/Precision 同时输出 numerator/denominator、micro、macro。
2. 不再把已经反复查看的旧 holdout 当最终 blind。
3. 建立 >=1200 known identities：
   - >=600 tuning
   - >=300 development validation
   - >=300 final blind
4. development 的 Recall@5 miss 必须分类并修 candidate generation，一律修 general rule，禁止 candidateKey-specific whitelist。
5. Candidate generation 必须 union：
   - municipality exact
   - municipality fuzzy
   - alias
   - address/locality
   - historical municipality
   - official URL/domain
   - category-assisted
   - Access/context
   - external authoritative discovery
6. 单独统计 expected target 是否进入 local pool / alias / historical / address / URL / context / external discovery 后的 candidate set。
7. development PASS：
   - Recall@5 micro >=99%
   - Top1 micro >=98.5%
   - HIGH precision >=99%
   - MEDIUM >=98%
   - PROVISIONAL >=97%
   - hard-conflict auto-match=0
8. development PASS 后冻结 resolver，再运行 >=300 final blind。
9. final blind FAIL 时：
   - 做 failure taxonomy
   - 只修 general rule
   - 建新的 replacement blind >=300
   - 禁止反复调同一 blind
10. final blind PASS 后才正式重跑 5920 identity。
11. inspect 仍按 v2.1：
   - 文件可见时 5920/5920 streamed lookup
   - 不可见时 PRECOMPUTED_AUDIT fallback
   - no-match 必须继续 external discovery
12. identity 完成后必须继续 semantic write-through canary：
   - >=50 accepted POIs
   - canonical new non-null >=100
   - >=10 feature codes
   - candidatesWithNewSupported >=30
   - provenance complete
   - unexplained delta=0
13. Canary 失败时必须自己诊断 source/query/semantic/rubric/projector/canonical 并重跑，不要返回等待用户。
14. Canary PASS 后全量 accepted-POI semantic review；所有 final null 必须有 field-level semanticReviewRef 和 saturation audit。
15. near-zero batch 自动抽样、修策略、重跑。

继续使用 TASK-075 的无人值守授权：
- auto-next
- routine self-healing
- failed-unit rerun
- bounded retries
- ordinary non-force push
- safe normal merge without history rewrite

禁止：
- force push
- history rewrite
- destructive reset/clean
- develop/main direct push
- auto-merge
- Master Code allocation
- Registry rebind
- production import

持续更新：

docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md

最终只有 Amendment v2.2 中全部 completion gates PASS，才能：

TASK-075-B = COMPLETE / READY FOR USER REVIEW

现在从 metric accounting + development Recall@5 miss taxonomy 开始，无人值守继续到最终完成。
