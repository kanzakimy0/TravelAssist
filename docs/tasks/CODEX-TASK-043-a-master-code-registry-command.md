# CODEX — TASK-043-A

请在 TravelAssist 仓库中完整执行 **TASK-043-A — Canonical Master Code Registry / Allocation Governance**。

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#311

WBS:
2.18

Implementation Branch:
`codex/a-master-code-registry`

注意：TASK-042 已被 B 工作站使用，本任务正式编号为 TASK-043-A。

## 1. 开始前

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

主工作区可能存在未提交 Planner / Step 修改。
必须使用独立 clean worktree 或 clean clone。

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

## 2. 读取完整规格

```bash
git show origin/task/a-task-043-master-code-registry:docs/tasks/TASK-043-a-master-code-registry.md

git show origin/task/a-task-043-master-code-registry:docs/tasks/CODEX-TASK-043-a-master-code-registry-command.md

git show origin/task/a-task-043-master-code-registry:docs/project/WBS-2.18-master-code-registry-amendment.md
```

然后严格按完整 Task 执行。

## 3. Branch

从执行时最新：

`origin/develop`

建立：

`codex/a-master-code-registry`

PR target：

`develop`

不要 stack 在 PR #306 上。

## 4. Repository-wide Audit First

在定义任何编号 grammar 前，先审计最新 `develop`：

- Master Code / masterCode / master_code 引用
- identifier registries
- numbering / namespace conventions
- destination IDs
- administrative IDs
- Region / POI / Route / Asset identities
- reserved / deprecated / superseded semantics
- migration/history rules
- consumer contracts

必须先回答：

`仓库是否已经存在可复用的 canonical Master Code scheme？`

如果 Yes：复用。
如果 No：才能提出 Governance Candidate。

不得先拍脑袋设计编号再找证据。

## 5. Critical Identity Boundary

必须保持：

```text
Master Code
!= regionId
!= destination_id
!= administrative code
!= transport-node ID
!= POI ID
!= AI local ID
!= DB primary key
```

禁止恢复：

```text
JP-RG-*
JP-PREF-*
JP-MACRO-*
jp-* destination IDs
JP country code
```

作为 canonical Master Code。

## 6. Canonical Registry

建立唯一 canonical source of truth。

至少实现：

- MasterCodeEntryV1
- lifecycle: reserved / active / deprecated / superseded
- unique masterCode
- unique active `(entityType, entityRef)` allocation
- immutable active code
- no recycling after deprecation
- supersededBy validation
- supersession cycle protection
- provenance / reason / revision metadata
- resolver by code
- resolver by entity identity
- fail-closed validator

不要维护两份手写 registry 数据。

不要做 DB migration。

## 7. 50 Region Allocation

只读 PR #306 / branch `codex/a-region-graph-pilot` 的 50 个既有 regionId。

不得修改 PR #306。

输出 exactly 50 allocations：

`docs/qa/TASK-043/region-allocation-50.json`

要求：

- 50/50 unique
- regionId 原样
- 不复制 regionId
- 不复制 destination ID
- 不复制 admin code
- 不复制 transport ID
- 不恢复 rejected legacy prefixes
- assignment 有 provenance 和 allocation reason

## 8. Nullable Contract Decision

TASK-043 必须明确分析：

```ts
masterCode: string | null;
```

是否应该成为 canonical Region Contract 正式语义。

必须给出以下两种方案的 consumer impact：

1. nullable pending allocation
2. non-null canonical entity + separate unresolved/draft representation

不得自行宣布 Frozen。

如果修改共享 Contract：

- 单独标记 Consumer Review
- 运行所有相关 contract / fixture / regression tests
- 在 Result 中列出 breaking impact

## 9. Required Deliverables

至少：

```text
docs/architecture/master-code-registry-v0.1.md
docs/qa/TASK-043/master-code-audit.json
docs/qa/TASK-043/master-code-governance-decision.md
docs/qa/TASK-043/region-allocation-50.json
docs/qa/TASK-043/registry-validation.json
docs/qa/TASK-043/consumer-impact.json
canonical registry source
resolver / validator
focused tests
docs/tasks/RESULT-TASK-043-a-master-code-registry.md
```

并更新：

`docs/project/WBS-TravelAssist.md`

## 10. Required Negative Tests

至少：

- duplicate code
- duplicate active entity allocation
- recycling after deprecation
- missing superseded target
- supersession cycle
- invalid lifecycle
- malformed code
- invalid entityRef whitespace/control chars
- unknown Region allocation
- rejected legacy code used as canonical
- destination ID masquerading as Master Code
- administrative ID masquerading as Master Code

## 11. Validation

至少运行：

```text
TASK-043 focused tests
Planning contracts
Planning soak
Routing
Trip / Route / Engine contract regression
Full Node regression
npm run lint
npm run typecheck
npm run build
TASK-owned Prettier
git diff --check
```

## 12. TASK-041 Boundary

TASK-043 完成后：

不得修改 / merge PR #306。
不得直接把 WBS 4.48 改为完成。
不得启动 Candidate Pipeline。

TASK-041 只有在 TASK-043 自己经过人工审查并合入 develop 后，才允许重新执行其 50/50 registry resolution。

## 13. Finish

完成后：

- commit
- push
- 创建 Draft PR → develop
- 更新 Issue #311
- 更新 WBS 2.18
- 返回完整 Result

不得自动 merge。
返回 Result 后 STOP。
