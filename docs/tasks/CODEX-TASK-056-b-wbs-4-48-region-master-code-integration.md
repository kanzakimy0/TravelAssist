# CODEX — TASK-056-B / WBS 4.48 Region Graph Master Code Integration / Revalidation

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#358
```

Spec branch:

```text
task/b-wbs-4-48-region-master-code-integration
```

Planned implementation branch:

```text
codex/b-wbs-4-48-region-master-code-integration
```

## Execute

请在 TravelAssist 仓库中完整执行：

`TASK-056-B — WBS 4.48 Region Graph Master Code Integration / Revalidation`

### 1. 开始前检查

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

### 2. 读取完整规格

```bash
git show origin/task/b-wbs-4-48-region-master-code-integration:docs/tasks/TASK-056-b-wbs-4-48-region-master-code-integration.md
```

读取 Owner correction：

```bash
git show origin/develop:docs/project/WBS-4.48-owner-correction.md
```

读取最新完整 Master WBS：

```bash
git show origin/develop:docs/project/WBS-TravelAssist.md
```

### 3. Owner 规则

用户已明确把 **WBS 4.48 Owner 从 A 改为 B**。

`docs/project/WBS-4.48-owner-correction.md` 是本单项的 canonical ownership override。

若 Master WBS 主表 4.48 行仍显示历史 Owner=A，必须在实际实现开始时最小同步为：

```text
Owner: B
Status: 进行中（#358 / TASK-056-B；承接已合并 TASK-041-A）
```

不要修改其他 WBS Owner。

### 4. 分支规则

必须从执行时最新且干净的 `origin/develop` 创建：

```bash
git switch --detach origin/develop
git switch -c codex/b-wbs-4-48-region-master-code-integration
```

不要从旧 TASK-041 分支、TASK-045-A 分支或 spec 分支直接开发。

旧 A 工作只能作为历史输入：

```text
TASK-041-A / #305 / PR #306 = 已合并 Region Graph producer
TASK-043-A / PR #326 = 已合并 Master Code registry/governance
TASK-044-A = governance acceptance evidence
TASK-045-A / #349 = 被 TASK-056-B 取代执行权；不得并行执行
```

### 5. 核心任务

只完成剩余 4.48 收口：

```text
50-node merged Region Graph
        +
50 governed canonical Master Code allocations
        ↓
50/50 canonical masterCode population
        ↓
0 null production masterCode
        ↓
0 graph topology semantic changes
        ↓
full revalidation
```

不得重做 Region taxonomy、重新编号 `regionId`、建立第二套 registry 或恢复旧 side-channel IDs。

### 6. Mandatory Gates

必须证明：

```text
Region count = 50
Region IDs preserved = 50/50
Canonical Master Codes = 50/50
Production masterCode nulls = 0
Active registry resolution = 50/50
Duplicate Master Codes = 0
Unknown/deprecated-invalid allocations = 0
Legacy JP-RG / JP-PREF / JP-MACRO / destination/admin/transport/POI/DB substitutes = 0
RegionRelation semantic topology diff = 0
TravelEdge semantic topology diff = 0
TravelEdgeVariant semantic topology diff = 0
Corridor reachability preserved
```

如果 canonical registry 与 Region Graph 无法在不改变已批准治理/语义的情况下兼容，必须 fail closed，返回 Partial/Blocked，不得猜测映射。

### 7. Required QA

按执行时最新 package scripts 使用 canonical equivalents，至少执行：

```text
npm ci
baseline full Node regression
TASK-041 Region Graph focused validation
Master Code Registry focused validation
Planning Contracts
Planning Soak / consistency QA
Routing focused regression
Trip / Engine relevant focused regression
TASK-056 focused validation
after-change full Node regression
lint
typecheck
build
deployment validate/build/artifact checks
scoped formatting
git diff --check
exact final-head GitHub Quality Gate
```

不得将 skipped / unexecuted mandatory tests 写为 PASS。

### 8. Evidence / Result

至少生成：

```text
docs/qa/TASK-056/README.md
docs/qa/TASK-056/region-master-code-integration.json
docs/qa/TASK-056/region-master-code-integration-report.md
docs/tasks/RESULT-TASK-056-b-wbs-4-48-region-master-code-integration.md
```

机器证据必须记录 before/after null count、50 Region IDs、50 Master Code resolutions、topology identity evidence、测试结果、final head、Quality Gate run URL/status。

### 9. 完成状态

实现 + Mandatory QA + Draft PR 后，只把 WBS 4.48 更新为：

```text
B / 待审查（#358 / TASK-056-B；Draft PR #<number>）
```

创建 Draft PR → `develop`。

不要自动合并，不要关闭 Issue #358，不要标记 4.48 已完成，不要启动 Candidate Pipeline、POI scoring、AI、Engine 4.22–4.24 或其他下游任务。

最终把完整 Result 返回给用户验收。
