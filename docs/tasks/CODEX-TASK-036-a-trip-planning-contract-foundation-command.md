# CODEX — TASK-036-A Trip Planning Contract Foundation

请在 TravelAssist 仓库中完整执行 **TASK-036-A — WBS 4.47 Trip Planning Contracts / Validators / Fixtures Foundation**。

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#291
```

Task source branch:

```text
origin/design/a-trip-engine-poi-ai-architecture-v2
```

Task file:

```text
docs/tasks/TASK-036-a-trip-planning-contract-foundation.md
```

## 1. 开始前强制检查

先执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/design/a-trip-engine-poi-ai-architecture-v2
git log --oneline -15 origin/develop
git log --oneline -15 origin/design/a-trip-engine-poi-ai-architecture-v2
```

禁止执行：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

如果当前工作区有无关未提交修改，不得删除；使用独立 worktree / branch。

## 2. 读取远端正式 Task

```bash
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/tasks/TASK-036-a-trip-planning-contract-foundation.md
```

必须完整阅读，不要只依赖本命令摘要。

## 3. 读取 P0 设计基线

依次读取：

```bash
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/poi-feature-preference-codebook-v0.1.md
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/preference-state-v0.1.md
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/poi-scoring-spec-v0.2.md
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/poi-master-schema-v0.2.md
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/itinerary-feasibility-spec-v0.1.md
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/travel-region-graph-codebook-v0.1.md
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/candidate-pipeline-contract-v0.1.md
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/ai-compact-context-v1.md
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/ai-decision-contract-v1.md
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/replanning-contract-v0.1.md
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/planning-fact-freshness-policy-v0.1.md
git show origin/design/a-trip-engine-poi-ai-architecture-v2:docs/architecture/planning-decision-trace-v0.1.md
```

并读取不可复制的现有 canonical contracts：

```bash
git show origin/develop:docs/architecture/trip-plan-contract.md
git show origin/develop:src/shared/contracts/trips/index.ts
git show origin/develop:docs/architecture/route-contract.md
git show origin/develop:docs/architecture/travelassist-engine-contract.md
```

审计当前 shared contract / test 结构：

```bash
find src/shared/contracts -maxdepth 3 -type f -print | sort
find tests -maxdepth 1 -type f -name '*contract*.test.mjs' -print | sort
cat package.json
```

## 4. 分支 / stacked implementation

PR #266 当前为 P0 设计 Draft。重新查询最新状态，不假设本命令创建时状态仍未变化。

如果 P0 设计尚未合入 `develop`：

```bash
git switch -c codex/a-trip-planning-contract-foundation origin/design/a-trip-engine-poi-ai-architecture-v2
git merge --no-ff origin/develop
```

发生冲突时只做保守、可解释的兼容整合；不得覆盖最新 develop 的 B Engine / WBS / canonical Trip / Route 成果。

如果 P0 设计已经正常合入 `develop`，则从最新：

```bash
origin/develop
```

创建同名实现分支。

禁止修改、关闭、合并或 force-update PR #266。

如果采用 stacked 模式，最终 Draft PR 先指向：

```text
design/a-trip-engine-poi-ai-architecture-v2
```

而不是 `develop`。

## 5. 实现范围

仅实现纯 TypeScript：

```text
Planning public contracts
Validators / Parsers
Positive fixtures
Negative fixtures
Contract tests
Public exports
```

建议入口：

```text
src/shared/contracts/planning/
```

至少覆盖：

```text
Feature / Preference primitives
POI planning / Visit Profile primitives
Region Graph
Scoring result / breakdown
Itinerary Feasibility
Candidate Pipeline
AI Compact Context V1
AI Decision / Patch V1
Replanning metadata
Fact Freshness / Provenance
Decision Trace / AI+Provider usage telemetry
```

严格遵守 Task 的 out-of-scope。

不得实现/接入：

```text
live AI API
Provider API
POI DB / migrations
Trip persistence
Planner UI
Trip Mutation runtime
real scoring calibration
100 POI real pilot
booking/payment mutation
```

## 6. 绝对兼容规则

必须保持：

```text
Trip Planning Contract ≠ Canonical Trip Plan
Trip Planning Engine ≠ WBS 4.20+ Trip Mutation Engine
TravelEdge Prior ≠ Live Route Fact
AI Compact Op ≠ EngineOperation
Decision Trace ≠ hidden chain-of-thought
```

并保持：

```text
POI Feature 0 = known none
POI Feature null = unknown
Preference 5 = explicit neutral
AI Sparse Preference omits 5
walking/physical = recommended standard visit burden baseline
Actual Visit Load = dynamic
```

禁止新建 Master Code 编号体系。

## 7. 必测关键案例

至少包括：

```text
feature value 0 and null both round-trip correctly
feature 10 rejected
unknown feature code rejected
compact preference explicit 5 rejected
Visit Profile min > recommended rejected
30min full_visit vs min60 => CRITICAL / DURATION_TOO_SHORT fixture
duplicate Local ID rejected
AI wrong runId rejected
AI wrong task rejected
AI unknown/non-candidate Local ID rejected
AI decision + contextRequest rejected
AI abstain/no_valid_choice + ops rejected
Region contains cycle rejected
symmetric RegionRelation reverse duplicate detected
TravelEdge prior cannot masquerade as live timetable
score >99 rejected
invalid freshness state rejected
Engine-only DecisionRun accepted
AI+Provider DecisionRun accepted
Trace execution/raw/secret-like unsupported fields rejected by strict schema boundary
```

不要把最后一项做成泛化秘密内容扫描；验证 schema 边界即可。

## 8. WBS 强制更新

Task 启动时，在：

```text
docs/project/WBS-TravelAssist.md
```

新增/更新唯一 WBS：

```md
| 4.47 | Trip Planning Engine Contract / Validator / Fixtures Foundation | A | P0 | 4.17,2.7；P0 Design Candidate set | 进行中 |
```

不得重编号 4.20–4.46。

最终返回前必须再次同步：

```text
TASK-036-A
WBS 4.47
Issue #291
branch
commit
Draft PR
status
blockers/deferred
```

只在 PR 合并 `develop` 且用户验收后才能标 `已完成`；实现完成但 PR 未合并 = `待审查`。

不得借本 Task 把 6.x、7.4、7.9、8.5、B 4.20–4.24 标为完成。

## 9. Result

必须创建：

```text
docs/tasks/RESULT-TASK-036-a-trip-planning-contract-foundation.md
```

至少包含：

```text
Status
Base / design-base / develop integration
Issue #291
Branch
Commit
Draft PR
Files changed
Public contract entry point
Contract groups implemented
Validator coverage
Positive fixtures
Negative fixtures
Trip / Route compatibility
Tests exact outcomes
Known baseline failures
Deferred runtime work
WBS Updated: Yes/No
Recommended next task
```

## 10. 验证

至少执行：

```bash
npm run lint
npm run typecheck
npm run build
npm run test:planning-contracts
```

同时重新运行现有 Trip Contract 与 Route Contract 相关测试。

若仓库存在稳定的全量 Node 测试入口，则执行；如果不存在，列明实际执行的测试文件，不得伪称“全仓测试通过”。

`format:check` 若存在历史失败，必须和基线比较：TASK-036 新增格式失败必须为 0。

## 11. 最终交付

实现完成后：

```bash
git status --short
git diff --check
```

提交并 push：

```text
codex/a-trip-planning-contract-foundation
```

创建 Draft PR。

若采用 stacked implementation：

```text
base = design/a-trip-engine-poi-ai-architecture-v2
```

否则：

```text
base = develop
```

最后返回完整 `RESULT-TASK-036-a-trip-planning-contract-foundation.md` 摘要，不要自动合并 PR，不要自动开始下一 Task。