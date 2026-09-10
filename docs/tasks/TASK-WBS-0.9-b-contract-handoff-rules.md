# WBS-0.9-B — 跨模块 Contract 交接规则

## Metadata

- Task ID: `WBS-0.9-B`
- WBS ID: `0.9`
- Owner: `B`
- Responsibility: `Cross-module Contract Governance`
- Priority: `P0`
- Status: `已完成`（2026-09-10 用户授权队列整合及合并，PR #171 已合入）
- Depends On: `0.8`
- Dependency State at kickoff: `0.8 = 进行中`
- Dependency Override: `用户于 2026-09-07 明确要求立即启动 0.9；允许以“规则先行”方式与 0.8 并行，但不得借此改变 A/B 已有模块边界。`
- Repository: `https://github.com/kanzakimy0/TravelAssist.git`
- Workspace: `F:\TravelAssist`
- Base Branch: `develop`
- Authoring Base: `c38d8c87ab8acd2b10551e6dfefb0398968264ae` or newer `origin/develop`
- Implementation Branch: `feature/b-wbs-0-9-contract-handoff-rules`
- GitHub Issue: `#168`
- Task File: `docs/tasks/TASK-WBS-0.9-b-contract-handoff-rules.md`
- Target Spec: `docs/architecture/cross-module-contract-handoff.md`
- Result File: `docs/tasks/RESULT-WBS-0.9-b-contract-handoff-rules.md`

---

# 1. Objective

冻结 TravelAssist 中 A（旅行主系统）和 B（个人中心）之间的 **跨模块 Contract 交接规则**，让双方以后通过明确、版本化、可验证的公开 Contract 协作，而不是：

- 直接读取对方私有 Store / State；
- 跨 Owner 修改内部类型；
- 在两个模块复制同一份 Schema；
- 依赖 Provider 私有返回结构；
- 为赶进度同时修改高冲突共享文件。

本任务以规则、架构文档、交接清单和示例为主，不提前实现真实 DB / API / Provider / AI / Reservation。

---

# 2. Source of Truth

开始前完整读取最新 `origin/develop`：

```text
docs/project/WBS-TravelAssist.md
docs/tasks/TASK-WBS-0.9-b-contract-handoff-rules.md
```

并检查仓库中与以下主题相关的已有实现/文档：

```text
Preference / Profile / Companion
Planner / Trip Plan / Trip Library
src/features/**
src/app/**
src/types/**
src/shared/**（若存在）
src/server/**（若存在）
```

优先级：

```text
用户最新明确决定
> WBS v0.4 A/B 责任边界
> 已合入的正式设计书 / Task / Result
> 当前代码结构
> Codex 推导
```

---

# 3. Preflight

在 B 工作站执行：

```bash
cd F:\TravelAssist
git status --short --untracked-files=all
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop

gh issue view 168
git branch -a | findstr /I "b-wbs-0-9 contract-handoff"
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

必须保留本地未追踪素材及其他 Owner 的工作。

---

# 4. Start / Branch Gate

远端已建立：

```text
Issue #168
feature/b-wbs-0-9-contract-handoff-rules
```

本地执行：

```bash
git switch develop
git pull --ff-only origin develop
git switch --track origin/feature/b-wbs-0-9-contract-handoff-rules
```

若本地同名分支已存在：

```bash
git switch feature/b-wbs-0-9-contract-handoff-rules
git pull --ff-only
```

不得重新创建第二个等价 Task / Issue / Branch。

正式启动状态：

```text
WBS 0.9 = 进行中
Owner = B
Issue #168 = Open
Task = 进行中
```

---

# 5. Dependency Rule

Master WBS 当前为：

```text
0.8 A/B 主系统 / 个人中心责任边界固化 = 进行中
0.9 跨模块 Contract 交接规则 = depends on 0.8
```

本次用户明确授权 0.9 提前并行，因此：

1. 可以制定交接机制、版本规则、责任矩阵、模板与示例；
2. 不允许重新划分 A/B 业务 Owner；
3. 若 0.8 在本 Task 开发期间产生新边界，以最新合入 `develop` 为准同步规则；
4. 如出现无法兼容的边界冲突，将 0.9 标记 `阻塞` 并报告，不自行覆盖 0.8。

---

# 6. Required Deliverables

至少生成：

```text
docs/architecture/cross-module-contract-handoff.md
docs/tasks/RESULT-WBS-0.9-b-contract-handoff-rules.md
```

可以在确有必要时增加：

```text
docs/templates/contract-handoff-checklist.md
```

本 Task 默认 **不创建 runtime TypeScript Contract**；若发现仓库已经有明确的共享 Contract 目录，只记录并纳入规范，不擅自重构。

---

# 7. Contract Roles

正式文档必须定义至少三种角色：

## 7.1 Contract Owner / Producer

拥有业务语义并负责发布公开 Contract 的模块 Owner。

## 7.2 Consumer

只消费公开 Contract，不直接读取 Producer 私有实现。

## 7.3 Integration Reviewer

跨模块变更需要另一侧 Owner 或指定共享架构 Review，确认兼容性和迁移计划。

原则：

```text
谁拥有业务语义，谁拥有 Contract。
Consumer 不因“需要字段”而取得 Producer 私有模型的所有权。
```

---

# 8. Frozen Ownership Matrix

文档至少冻结以下交接方向：

| Contract                      | Producer / Owner | Consumer | 说明                                                                     |
| ----------------------------- | ---------------- | -------- | ------------------------------------------------------------------------ |
| User / Session Public View    | B                | A        | A 只读取规划所需的公开用户状态，不读取账户私有实现                       |
| Profile Public View           | B                | A        | 仅暴露主系统真正需要的数据                                               |
| Preference Contract           | B                | A        | Planner / Recommendation 消费长期偏好                                    |
| Companion Contract            | B                | A        | Planner 消费同行人摘要/约束                                              |
| Trip Plan Contract            | A                | B        | B 的保存/历史/Trip Library 消费 A 产生的可保存行程                       |
| Planner Resume / Edit Handoff | A                | B        | B 从 Trip Library 返回 Planner 时使用稳定入口/标识，不复制 Planner Store |

不要提前冻结尚未完成设计的 Reservation / Partner / Payment Contract 细节；只能预留扩展规则。

---

# 9. Public Contract vs Private Model

正式规范必须明确：

```text
Public Contract ≠ 数据库表
Public Contract ≠ React Component Props 全量
Public Contract ≠ Provider 原始响应
Public Contract ≠ 内部 Store
Public Contract ≠ UI ViewModel
```

Producer 可以拥有更复杂的内部模型，只把 Consumer 真正需要的稳定字段发布出去。

Consumer 禁止复制并长期维护平行版本。

---

# 10. Storage / Naming Rule

本 Task 需要结合当前仓库结构给出最终建议，但不得为了规则任务强行搬迁现有代码。

优先原则：

```text
共享 Contract 必须有唯一 canonical source；
按 domain 命名；
禁止 common.ts / misc.ts / types2.ts 之类无语义文件；
Contract 文件不得依赖 UI component、Map provider SDK 或 DB client。
```

如果未来采用共享目录，推荐文档层面统一为：

```text
src/shared/contracts/<domain>/...
```

若当前仓库已有更明确 canonical 路径，保留现状并在 Result 说明理由。

---

# 11. Versioning / Compatibility

必须制定并写入规范：

## Compatible / additive

- 新增 optional field；
- 新增 enum/union value（仅当 Consumer 有 unknown/fallback 策略）；
- 新增不影响旧 Consumer 的 metadata；
- 新增独立 Contract。

## Breaking

- 删除字段；
- rename 字段；
- optional → required；
- 改变字段类型/单位/时区语义；
- 改变 ID 稳定性；
- 改变枚举而 Consumer 没有 fallback；
- 改变 null / empty semantics。

Breaking change 必须包含：

```text
影响 Consumer
迁移方式
兼容窗口
旧版本弃用计划
测试/fixture 更新
关联 Issue / WBS / PR
```

---

# 12. Data Semantics Baseline

规范至少统一：

- ID：opaque stable string，不让 Consumer 推断格式；
- 日期时间：ISO 8601，必须明确 timezone / local-date 语义；
- Currency：金额与 ISO currency code 分离，禁止裸浮点金额语义不明；
- Locale：需要本地化时显式传递，不把展示文案当 domain enum；
- Optional / null / empty：必须在 Contract 中定义；
- Enum / status：Consumer 必须有未知值 fallback；
- Provider-specific fields：不得泄漏进跨模块 canonical Contract；
- Secrets：token、API key、credential、partner secret 永不进入客户端 Contract。

---

# 13. Handoff Workflow

正式文档必须冻结以下流程：

```text
1. Producer 提出 Contract change
2. Issue 标明 Producer / Consumer / WBS / impact
3. 先修改 canonical Contract + fixture/example
4. Producer 自测
5. Consumer Review compatibility
6. Contract PR 合入
7. Consumer 基于已合入 commit 接入
8. 集成测试
9. 旧版本按弃用计划清理
```

对 breaking change，优先两阶段：

```text
Phase 1：新增兼容字段/新版本，旧 Consumer 继续可用
Phase 2：Consumer 迁移后再删除旧接口
```

禁止“大爆炸式”同时重写 A/B 两侧。

---

# 14. PR / WBS / Issue Rules

每次跨模块 Contract 变更至少必须记录：

```text
Contract name/version
Producer
Consumer(s)
Affected WBS
Compatibility: additive / breaking
Migration required: yes/no
Fixture/example changed: yes/no
Integration test status
```

若只是 Consumer 内部适配且 Contract 未改变，不得修改 Producer Task 文件。

若确需双方改动，原则上拆分：

```text
Contract PR
→ Producer implementation PR
→ Consumer integration PR
```

根据实际风险可合并前两项，但必须保证 canonical Contract 先明确。

---

# 15. Fixture / Example Rule

每个正式 Contract 至少要有一个可读 example 或 fixture，展示：

- 最小有效数据；
- 常见完整数据；
- optional/null 边界；
- unknown enum / fallback（适用时）。

Fixture 必须服务验证，不得成为第二份业务真相。

---

# 16. Required Example A — Preference → Planner

规范必须完整展示：

```text
B owns Preference
B publishes Preference Contract
A consumes contract in Planner / recommendation
A不得直接读取 Personal Center form state / local component state
A需要新字段 → 通过 Contract change 请求 B
```

至少覆盖：旅行节奏、同行人/家庭、预算/住宿/餐饮/移动/活动中的代表性字段如何保持语义稳定，不要求在本 Task 实现这些字段代码。

---

# 17. Required Example B — Trip Plan → Trip Library

规范必须完整展示：

```text
A owns Trip Plan
A publishes savable Trip Plan Contract
B consumes it for save/read/history/library
B不得复制 Planner Store 作为自己的长期 schema
B需要恢复编辑 → 使用 Planner Resume Handoff
```

明确：Trip Library UI ViewModel 可以由 B 派生，但不能反过来定义 A 的 Trip Plan 核心 Schema。

---

# 18. Conflict Avoidance

必须写入：

- A/B 不同时修改同一高冲突 Contract 文件；
- 正在进行的 Contract PR 由一个 Owner 主写；
- 另一方通过 Review / follow-up commit 反馈；
- Consumer adapter 留在 Consumer 模块；
- 禁止 cherry-pick 未合入的对方功能实现来“抢跑”；
- 禁止覆盖其他 Owner Task / Result / WBS 追踪记录。

---

# 19. Validation

本任务为文档/规则任务，至少执行：

```bash
npm run format:check --if-present
npm run lint --if-present
npm run typecheck --if-present
```

如果全仓存在已知基线异常：

1. 记录命令结果；
2. 单独验证本 Task 新增/修改 Markdown；
3. 不越界修复无关文件；
4. Result 中列出 baseline vs task-introduced。

同时人工检查：

```text
责任矩阵完整
Preference → Planner 示例完整
Trip Plan → Trip Library 示例完整
breaking/additive 定义完整
迁移/弃用流程完整
无 token / secret / Provider leakage
没有重新划分 A/B Owner
```

---

# 20. WBS Update Rules

本 Task 开始时：

```text
0.9 Owner: B
0.9 Status: 进行中
```

实现完成但 PR 未合并：

```text
0.9 = 待审查
```

只有 PR 合入 `develop` 且用户验收通过后：

```text
0.9 = 已完成
```

WBS 追踪表新增/维护：

```text
WBS-0.9-B | 0.9 | B | 进行中/待审查/已完成 | #168 | Task File | Branch | Commit | PR
```

不得覆盖其他 Task 行。

---

# 21. Commit / Push / PR

完成后提交：

```bash
git status --short
git diff --check
git add docs/architecture/cross-module-contract-handoff.md \
        docs/tasks/TASK-WBS-0.9-b-contract-handoff-rules.md \
        docs/tasks/RESULT-WBS-0.9-b-contract-handoff-rules.md \
        docs/project/WBS-TravelAssist.md

git commit -m "docs: define WBS 0.9 cross-module contract handoff rules"
git push origin feature/b-wbs-0-9-contract-handoff-rules
```

创建 Draft PR：

```text
base: develop
head: feature/b-wbs-0-9-contract-handoff-rules
```

PR 使用：

```text
Relates to #168
```

在用户明确授权前：

- 不自动 merge；
- 不关闭 Issue；
- 不把 WBS 标记已完成。

---

# 22. Result Required

`RESULT-WBS-0.9-b-contract-handoff-rules.md` 至少报告：

```text
Status
Base commit
Branch
Issue
Files changed
Canonical contract location decision
Ownership matrix
Versioning rules
Handoff workflow
Examples covered
Validation
Baseline failures
Commit
PR
WBS state
Out-of-scope / deferred
```

---

# 23. Stop Conditions

遇到以下情况停止并报告：

- 最新 `develop` 已存在等价 0.9 完成任务；
- 0.8 新变更与本规则产生不可调和冲突；
- 需要修改 A 的 Planner / Route / Trip 核心实现才能继续；
- 需要删除或重写其他 Owner 的 Task / Result；
- 需要 force push / hard reset / clean 未追踪文件；
- 发现真实 secret/token 被要求写入 Contract。

否则继续完成本 Task，不因非关键歧义中断。
