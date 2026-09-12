# TASK-043-A — Canonical Master Code Registry / Allocation Governance

## 1. Tracking

- Issue: #311
- WBS: 2.18
- Owner: A — Shared Infrastructure / Architecture
- Priority: P0
- Publication branch: `task/a-task-043-master-code-registry`
- Expected implementation branch: `codex/a-master-code-registry`
- Target: `develop`

## 2. Goal

建立 TravelAssist 首个 repository-owned canonical Master Code Registry、治理规则、resolver / validator，以及 TASK-041 的首批 50 个 Region allocation manifest。

本 Task 的核心目的不是“给 Region 随便补编号”，而是先建立一个可长期复用、不可旁路、可审计、可迁移的 Master Code 基础设施。

## 3. Problem Statement

TASK-041 / PR #306 已确认：仓库当前没有正式的 entity → Master Code allocation registry。

此前出现过以下非法替代：

- `JP-RG-*`
- `JP-PREF-*`
- `JP-MACRO-*`
- `jp-*` destination ID
- `JP` country code

这些都不得恢复或重新解释为 Master Code。

必须保持：

```text
Master Code
!= regionId
!= destination_id
!= administrative code
!= transport-node ID
!= POI ID
!= AI local ID
!= database primary key
```

## 4. Stage 1 — Repository-wide Governance Audit

实现前必须审计执行时最新 `origin/develop`：

- 所有 `Master Code` / `masterCode` / `master_code` 引用；
- registry-like 数据文件；
- numbering / namespace 约定；
- reserved / deprecated / migration 约定；
- consumer contracts；
- destination / POI / route / region / asset 等现有 identifier family；
- 是否存在已批准但未被 TASK-041 找到的 canonical grammar。

必须产出：

- `docs/qa/TASK-043/master-code-audit.json`
- `docs/qa/TASK-043/master-code-governance-decision.md`

若发现已有 canonical scheme：必须复用，不得建立第二套。

若不存在：才允许提出 v1 Governance Candidate。

## 5. Stage 2 — Governance Candidate

如果需要新建 grammar，它必须满足：

- registry 内全局唯一；
- 首次 active allocation 后 code immutable；
- 不把 mutable name / label 直接编码进 code；
- collision-safe；
- append-only active allocation；
- lifecycle 支持：
  - `reserved`
  - `active`
  - `deprecated`
  - `superseded`
- external IDs / aliases 与 Master Code 分离；
- 记录 entityType / entityRef / provenance / reason / revision；
- deprecated code 不可 recycling；
- supersession 必须可追溯且不能成环。

新 grammar 只能标为：

`Governance Candidate / pending human review`

不得自行称为 Frozen。

## 6. Canonical Registry Foundation

必须建立唯一 canonical source of truth。

禁止同时维护会漂移的 JSON registry + TS registry 两份手写数据。

至少定义：

```ts
MasterCodeEntryV1;
```

建议字段语义至少包括：

- `masterCode`
- `entityType`
- `entityRef`
- `lifecycleStatus`
- `supersededBy`
- `sourceRefs`
- `allocationReason`
- `createdRevision`
- `updatedRevision`

必须提供：

- resolver by `masterCode`
- resolver by `(entityType, entityRef)`
- registry validator
- uniqueness validation
- lifecycle validation
- supersession validation
- immutable-allocation guard

推荐路径由仓库现有结构决定；若无更强规范，可使用：

- `src/shared/master-code/`
- `src/shared/data/master-code-registry.*`

不得引入 Production DB / Migration。

## 7. Stage 3 — TASK-041 Region Allocation Batch

只读 PR #306 / branch `codex/a-region-graph-pilot` 中现有 50 个 `regionId` 作为 consumer requirement。

必须：

- exactly 50 Region entity refs；
- 保留 50 个 `regionId` 原样；
- 50/50 分配唯一 canonical Master Code；
- allocation 可重复验证；
- 不得复制 regionId / destination_id / admin code / transport ID；
- 不得恢复 rejected legacy prefixes；
- 输出独立 manifest：
  - `docs/qa/TASK-043/region-allocation-50.json`

TASK-043 不修改 PR #306。

## 8. Shared Contract Decision

PR #306 临时提出：

```ts
masterCode: string | null;
```

TASK-043 必须单独分析并明确推荐：

### Option A

Canonical Region Contract 允许 allocation pending 时 `null`。

### Option B

Canonical Region Contract 保持 non-null；draft/unresolved entity 使用独立表示。

必须记录：

- affected consumers；
- migration impact；
- validator impact；
- fixture impact；
- persistence impact；
- production completeness semantics。

不得未经人工审查自行冻结该选择。

若本 Task 需要修改 shared contract，必须在 Result 与 PR 中单独列为 Breaking/Consumer Review 项。

## 9. Required Deliverables

至少生成：

- `docs/architecture/master-code-registry-v0.1.md`
- `docs/qa/TASK-043/master-code-audit.json`
- `docs/qa/TASK-043/master-code-governance-decision.md`
- `docs/qa/TASK-043/region-allocation-50.json`
- canonical registry data source
- resolver / validator implementation
- focused tests
- `docs/tasks/RESULT-TASK-043-a-master-code-registry.md`
- `docs/project/WBS-TravelAssist.md` update

建议增加：

- `docs/qa/TASK-043/registry-validation.json`
- `docs/qa/TASK-043/consumer-impact.json`

## 10. Required Negative Tests

必须 fail closed：

1. duplicate Master Code
2. duplicate active entity allocation
3. code recycling after deprecation
4. superseded target missing
5. supersession cycle
6. unknown lifecycle enum
7. malformed code
8. entityRef whitespace/control characters
9. Region allocation references unknown Region
10. legacy side-channel codes cannot become canonical merely because they are strings
11. destination ID cannot masquerade as Master Code
12. administrative code cannot masquerade as Master Code

## 11. TASK-041 Unblock Gate

TASK-043 完成不等于 TASK-041 自动完成。

必须按顺序：

```text
TASK-043 registry implementation
→ human review
→ merge to develop
→ TASK-041 integrate canonical allocations
→ 50/50 resolution
→ TASK-041 full regression + CI
→ TASK-041 separate human review
→ only then PR #306 merge decision
```

WBS 4.48 在上述完成前保持 Partial。

## 12. Out of Scope

禁止：

- 修改 / merge PR #306；
- Candidate Pipeline；
- TASK-041 topology/edge tuning；
- candidate-0457 / Human Gold；
- POI production mass allocation；
- Production DB / migration；
- Provider identifier migration；
- UI；
- 全仓 identifier mass renumber；
- 自动 merge。

## 13. Validation

至少运行：

- TASK-043 focused tests
- Planning contract tests
- Planning soak tests
- routing tests
- Trip / Route / Engine contract regression
- full Node regression
- `npm run lint`
- `npm run typecheck`
- `npm run build`
- TASK-owned Prettier
- `git diff --check`

若 shared contract 有任何修改，必须额外运行所有相关 consumer contract / fixture tests。

## 14. Git / Workspace Safety

主工作区可能存在未提交 Planner / Step 修改。

必须使用独立 worktree 或 clean clone。

开始前：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

从执行时最新 `origin/develop` 建立：

`codex/a-master-code-registry`

## 15. Completion States

允许：

- `Completed / Registry candidate ready for human review`
- `Partial / Existing scheme conflict requires governance decision`
- `Blocked / Canonical identity prerequisites unavailable`

不得为追求 Completed 而编造 numbering scheme 或绕过 registry。

## 16. Finish

完成后：

- commit
- push
- 创建 Draft PR → `develop`
- 更新 Issue #311
- 更新 WBS 2.18
- 生成完整 Result

不得自动 merge。
不得修改/merge PR #306。
不得启动 Candidate Pipeline。
返回 Result 后 STOP。
