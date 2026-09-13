# CODEX — TASK-057-B / WBS 4.48 Independent Acceptance Review / Regression Support

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#359
```

A implementation under review:

```text
TASK-045-A
Issue #349
Draft PR #352
branch: codex/a-task-041-master-code-integration
```

Spec branch:

```text
task/b-wbs-4-48-independent-acceptance-review
```

Planned B review branch:

```text
codex/b-wbs-4-48-independent-acceptance-review
```

## Execute

请完整执行：

`TASK-057-B — WBS 4.48 Independent Acceptance Review / Regression Support`

### 1. Preflight

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

### 2. Read the full Task

```bash
git show origin/task/b-wbs-4-48-independent-acceptance-review:docs/tasks/TASK-057-b-wbs-4-48-independent-acceptance-review.md
```

读取最新 Master WBS，但不要修改 4.48 Owner：

```bash
git show origin/develop:docs/project/WBS-TravelAssist.md
```

### 3. Critical ownership rule

WBS 4.48 **继续属于 A**。

B 只是独立验收 / QA 支援，不接管 WBS，不修改 Owner，不替代 TASK-045-A。

不要执行已经取消的旧 TASK-056-B / Issue #358。

### 4. Resolve the exact A candidate

重新 fetch 并确认 PR #352 当前最新 head。不要假设 publication-time head 仍是最新。

记录：

```text
PR #352 current head SHA
origin/develop current SHA
merge-base
A branch ahead/behind state
PR changed-file list
```

如果 PR #352 在 review 过程中更新，必须重新审查新 head；旧 review 不可继续作为最终 ACCEPT。

### 5. Hard no-conflict rule

B 不得修改 PR #352 当前 changed-file list 中的任何文件。

尤其不得修改：

```text
TASK-041 Region Graph data/evidence
TASK-045 evidence
A Region Graph tests
A Master Code integration tools
package.json
Master WBS 4.48 row
Region Graph / Master Code registry data
```

B 只允许提交：

```text
docs/qa/TASK-057/**
docs/tasks/RESULT-TASK-057-b-wbs-4-48-independent-acceptance-review.md
```

发现缺陷只报告，不在本 Task 修 A 文件。

### 6. Review the candidate

独立验证：

```text
Region nodes = 50
regionId preserved = 50/50
canonical Master Codes populated = 50/50
production null masterCode = 0
active canonical registry resolution = 50/50
duplicate codes = 0
unknown / deprecated-invalid / superseded-invalid = 0
legacy side-channel IDs = 0
RegionRelation semantic diff = 0
TravelEdge semantic diff = 0
TravelEdgeVariant semantic diff = 0
corridor reachability unchanged
Planning Prior / Live Route Fact boundary unchanged
unrelated scope changes = 0
```

不要直接信任 TASK-045 已提交的 JSON；重要指标必须独立重算或交叉验证。

### 7. Required tests

使用执行时仓库最新 canonical scripts，至少执行：

```text
npm ci
TASK-041 Region Graph focused tests
TASK-045 integration focused tests
Master Code Registry test / QA
Planning Contracts
Planning Soak / consistency QA
Routing focused regression
Trip / Engine relevant regression
full repository Node regression
lint
typecheck
build
deployment validate/build/artifact verification
scoped format for TASK-057 files
git diff --check
```

mandatory test 未执行 / skip 不得写 PASS。

### 8. Latest-develop compatibility

PR #352 的 base 可能落后于当前 develop。

必须用 disposable local review worktree / temporary local merge 方式检查：

```text
exact PR #352 head + latest origin/develop
```

不要 push 或改写 A branch。

如果最新 develop 集成冲突或集成后 regression 失败，则不能给 plain ACCEPT。

### 9. Evidence

生成：

```text
docs/qa/TASK-057/acceptance-evidence.json
docs/qa/TASK-057/acceptance-report.md
docs/tasks/RESULT-TASK-057-b-wbs-4-48-independent-acceptance-review.md
```

最终推荐只能为：

```text
ACCEPT
ACCEPT WITH REQUIRED CORRECTIONS
REJECT
PARTIAL / STALE
```

### 10. Final rules

- 不合并 PR #352。
- 不关闭 A Issue #349。
- 不修改 WBS 4.48 Owner=A。
- 不把 4.48 标记完成。
- 不启动 Candidate Pipeline / POI / AI / Engine 下游。
- B review branch 可建立 docs-only Draft PR → develop，但不能代替 A PR #352。

最终把完整 RESULT-TASK-057-B 返回给用户验收。
