# TASK-091-A — WBS 4.18 Planner Preference Contract Integration

## WBS Record

- WBS ID: 4.18
- Task ID: TASK-091-A
- Title: Planner 读取用户偏好 Contract
- Owner: A
- Responsibility: Main Travel System
- Priority: P0
- Status: Published / prerequisite gate required before implementation
- Dependency: 4.15, 5.14
- Publication Base: `develop@5123966f62dbe9587a3bbe38e877ccf3ea959b80`
- GitHub Issue: #467
- Suggested implementation branch: `codex/a-task-091-planner-preference-contract`

## Objective

将主系统 Planner 接到现有且唯一的 WBS 5.14 Preference Contract，使 Planner 可以安全、确定性、只读地消费用户偏好。不得复制 Preference Schema，不得建立第二套偏好模型。

本 Task 与 TASK-085 / TASK-086 的交通数据链解耦，不读取或修改 TransportNode、POI Access Edge、Japan Mobility Backbone。

## Gate 0 — latest-develop prerequisite audit

实现前必须：

1. fetch 最新 `origin/develop`，记录 exact SHA。
2. 读取最新 Master WBS。
3. 找出 4.15 Planner State/Core 的实际代码、Contract、测试及其 merge 状态。
4. 找出 5.14 Preference Contract 的唯一 canonical implementation、public types/read API、测试及其 merge 状态。
5. 判断两者是否已在执行时的 `develop` 上形成可安全消费的接口。
6. WBS 文本与 Git/代码事实冲突时，以可验证 Git/代码事实为准，并在 Result 记录差异。
7. 若必要 artifact 只存在于未合并 PR/分支，不允许偷偷 cherry-pick 或复制；返回 `BLOCKED_PREREQUISITE`，列出缺失项和解除阻塞条件。

Gate 0 未通过，不进入实现。

## Scope

### A. Canonical Preference consumption

- 复用 WBS 5.14 的唯一 Preference Contract。
- Planner 侧只能建立最小 consumer adapter / selector / context projection。
- 保留 canonical field/code/enum 语义。
- 禁止在 Planner 内重新定义 Preference DTO、Schema 或业务真值。

### B. Semantic preservation

必须显式覆盖并测试：

- missing / absent
- false
- neutral
- unknown
- explicit user value

这些状态不得因为默认值、truthy/falsy、JSON serialization、selector 或 UI state normalization 而被错误合并。

### C. Deterministic fallback

当用户未登录、无 Preference、字段缺失或合法 unknown 时：

- Planner 必须有确定性 fallback。
- fallback 不得伪装成“用户明确偏好”。
- 相同输入必须得到相同 Planner-readable preference context。
- 不得因为 Preference 不存在导致 Planner 整体不可用。

### D. Ownership boundary

Planner = consumer。

不得：

- 从 Planner 修改用户 Preference；
- 绕过 Personal Center / Preference owner 的写入边界；
- 添加新的 Preference DB 写接口；
- 修改 B Personal Center UI；
- 把 Planner 临时条件永久写回用户 Preference。

### E. Planner integration

在现有架构允许范围内，把 canonical Preference Contract 接入 Planner 当前 state/context/read path。

优先复用已有：

- shared/public contract
- server-only reader
- existing auth/session boundary
- Planner state/core
- Planning contract/context projection

禁止为了完成本 Task 创建平行架构。

## Explicit non-scope

- TASK-085 / WBS 7.15
- TASK-086 / WBS 7.16
- TransportNode / Mobility Backbone
- POI → TransportNode edge
- POI 43D 数据补齐
- Recommendation score / WBS 7.9 修改
- Route Provider / WBS 7.3、7.8
- AI Conversation / WBS 6.x
- Planner Save mutation / 4.19
- Personal Center Preference 编辑 UI
- WBS 9.7 E2E 正式启动
- 新 DB migration

如果实现发现确实需要 migration 或 public Preference Contract breaking change：停止并返回设计/依赖 blocker，不自行扩大范围。

## Required tests

至少覆盖：

1. canonical Preference → Planner projection。
2. missing preference。
3. explicit false 不被当作 missing。
4. neutral 不被当作 missing/false。
5. unknown 保持 unknown。
6. explicit value round-trip。
7. deterministic fallback。
8. malformed/untrusted input fail-closed。
9. Planner 不产生 Preference mutation。
10. serialization/deserialization semantic preservation。
11. existing Planner state/core regression。
12. existing Preference Contract regression。

同时执行仓库适用的：

- focused tests
- relevant Planner tests
- relevant Preference tests
- lint
- typecheck
- production build
- repository quality/diff gates

若存在未修改基线失败，必须 clean-develop 对照证明，不得把 baseline failure 记为本 Task PASS。

## Acceptance Criteria

- [ ] Gate 0 prerequisite audit PASS。
- [ ] 使用唯一 WBS 5.14 canonical Preference Contract。
- [ ] 没有第二套 Preference model/schema。
- [ ] missing/false/neutral/unknown/explicit value 全部语义保持。
- [ ] 无 Preference 时 Planner deterministic degradation/fallback 正常。
- [ ] Planner 对 Preference 保持 read-only。
- [ ] 不触碰 085/086 / Mobility Graph。
- [ ] focused + relevant regression 通过。
- [ ] lint/typecheck/build 通过或有严格 baseline 对照。
- [ ] Result + QA evidence 完整。
- [ ] Master WBS 已同步。
- [ ] 创建 Draft PR，禁止 merge / auto-merge。

## Deliverables

- `docs/tasks/RESULT-TASK-091-a-planner-preference-contract-integration.md`
- `docs/qa/TASK-091/README.md`
- 最小必要 runtime implementation
- focused/regression tests
- `docs/project/WBS-TravelAssist.md` 状态同步

## Mandatory WBS Update

Codex 最终返回前必须重新读取最新 Master WBS，并记录：

- execution base SHA
- Issue #467
- implementation branch
- final commit
- Draft PR
- test result
- blocker（如有）

状态规则：

- Gate 0 通过并正式实现：`进行中`
- prerequisite 不满足：`阻塞`
- 实现完成、PR 未合并：`待审查`
- 只有用户验收且 PR 合入 develop 后：`已完成`

不得自行把 4.18 标记为已完成。

## Git / PR Rules

- 从执行时最新 `origin/develop` 建独立 implementation branch。
- 不直接开发在 task publication branch。
- 不 force-push shared branch。
- 不 merge。
- 不开启 auto-merge。
- 完成后只创建 Draft PR → develop。
- 不自动启动 WBS 9.7。

## Codex Final Result

最终必须给出：

1. Status: PASS / BLOCKED / PARTIAL
2. execution base SHA
3. prerequisite audit
4. exact canonical 5.14 artifacts reused
5. implementation summary
6. semantic matrix: missing / false / neutral / unknown / explicit
7. files changed
8. tests and exact counts
9. baseline comparison if needed
10. commit SHA
11. Draft PR
12. WBS update
13. remaining blockers / next allowed action
