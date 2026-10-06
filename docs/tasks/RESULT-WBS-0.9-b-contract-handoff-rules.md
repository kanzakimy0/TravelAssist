# RESULT — WBS-0.9-B 跨模块 Contract 交接规则

> 前部为原交付历史；当前结论见文末2026-09-10记录。

## 历史 Status（当前为 B / 已完成；见末节）

`待审查`

WBS 0.9 的规则制定与仓库审计已完成。最终收尾 PR 保持 Draft；在用户验收前不标记 `已完成`、不关闭 Issue #168。

## Tracking

- Task ID: `WBS-0.9-B`
- WBS ID: `0.9`
- Owner: `B`
- Responsibility: `Cross-module Contract Governance`
- Issue: `#168`（Open）
- Baseline: `develop@707bcc8d2af14a86032181be63573beb3aea3e17`
- Kickoff branch: `feature/b-wbs-0-9-contract-handoff-rules`
- Final review branch: `review/b-wbs-0-9-contract-handoff-finalize`
- Final review PR: `#171`（Draft → `develop`）
- Spec commit: `e8fbb45cf479814c6505f83bc719c4944288227e`
- Result commit: `300973dc7ca6ed7dfccbf31b2f5f283f922545b6`（initial Result）
- WBS sync commit: `ce93b5d8131508ad459bd5d73c38a9d44b421f61`
- Spec: `docs/architecture/cross-module-contract-handoff.md`
- Task: `docs/tasks/TASK-WBS-0.9-b-contract-handoff-rules.md`
- Result: `docs/tasks/RESULT-WBS-0.9-b-contract-handoff-rules.md`

## Dependency

Master WBS 原依赖 `0.8`，且 `0.8` 仍为 `进行中`。

用户于 2026-09-07 明确要求立即执行 0.9，因此本任务按“规则先行、与 0.8 并行”完成。执行没有重新划分 A/B Owner；如果 0.8 后续产生新的已合入边界，0.9 规则按最新 `develop` 修订。

## Repository Audit

已检查当前 `develop` 的跨模块相关结构：

```text
src/features/preferences/
src/features/companions/
src/features/profile/
src/features/planner/
src/features/trip-library/
src/types/
```

结论：

1. 当前没有 `src/shared/` 或 `src/shared/contracts/**`；
2. `src/types/` 当前只有 `.gitkeep`，没有正式共享 Contract；
3. Preference 当前模型位于 B feature 内，是内部状态/UI/domain helper，不是 Planner-readable Contract；
4. Planner 的 `planner-types.ts` 已明确标注为 presentation fixture，不是业务 Trip Plan / provider contract；
5. `planner-state.ts` 含当前页面 selected day、bottom tab、overlay 等 runtime/UI 状态，不能作为保存行程 Contract；
6. Trip Library 的 `TripCardViewModel`、`DraftTripViewModel`、`HistoryTripViewModel` 等是 B UI ViewModel，不能反向成为 A Trip Plan Schema。

## Canonical Contract Location Decision

本 Task 不为形式统一强行搬迁现有代码，也不提前建立空 runtime Contract。

冻结规则：

```text
每个正式 Contract 只有一个 canonical source。
现有 internal model 原地保留。
未来若没有更成熟的共享路径，首选 src/shared/contracts/<domain>/。
真正创建由对应 runtime Contract WBS 执行。
```

因此：

- `5.14` 负责 B → A Planner-readable Preference Contract；
- `4.17` 负责 A → B savable Trip Plan / Planner Contract；
- `5.19` 负责 B 的 Trip Save / Read / History Contract；
- 0.9 只冻结 governance，不提前完成上述 WBS。

## Ownership Matrix Frozen

| Contract                      | Producer | Consumer | 后续 WBS                             |
| ----------------------------- | -------- | -------- | ------------------------------------ |
| User / Session Public View    | B        | A        | `5.3` → `3.4`                        |
| Profile Public View           | B        | A        | `5.15` → main-system consumer        |
| Preference Contract           | B        | A        | `5.14` → `4.18`, `6.3`, `6.5`, `7.9` |
| Companion Contract            | B        | A        | `5.12`, `5.17` → Planner             |
| Trip Plan Contract            | A        | B        | `4.17` → `5.18`, `5.19`              |
| Planner Resume / Edit Handoff | A        | B        | `4.15`, `4.17` ↔ `5.10`, `5.19`      |
| Trip Save Invocation Contract | B        | A        | `5.19` → `4.19`                      |

原则：谁拥有业务语义，谁拥有 Contract；Consumer 不因需要字段而取得 Producer 私有模型所有权。

## Public vs Private Boundary Frozen

明确区分：

```text
Public Contract
Database Model
Internal Domain Model
Provider Response
React Props
UI ViewModel
Store State
Fixture / Mock
```

禁止将 UI ViewModel、DB table、Provider raw payload、Planner runtime state 直接当跨模块 Contract。

## Versioning Rules Frozen

### Additive / Compatible

- 新增 optional field；
- 新增独立 Contract；
- 新增不影响旧逻辑的 metadata；
- 新增 enum 值，仅在已有 Consumer 有 unknown fallback 时成立。

### Breaking

- 删除或 rename 字段；
- optional → required；
- 改变类型、单位、timezone；
- 改变 ID 稳定性；
- 改变 null / empty semantics；
- 增加 Consumer 无法处理的 enum/status；
- snapshot ↔ live semantics 改变。

Breaking change 必须两阶段迁移优先，并记录兼容窗口、弃用条件、fixture 与 Consumer validation。

## Handoff Workflow Frozen

```text
Producer Issue / change request
→ canonical Contract + fixture/example
→ Producer validation
→ Consumer / Integration Review
→ Contract PR merge to develop
→ Consumer integration from merged baseline
→ cross-module integration test
→ deprecation cleanup when safe
```

禁止依赖未合入 feature branch 形成事实接口，也禁止 A/B 同时大爆炸式重写。

## Required Examples Covered

### Preference → Planner

已明确：

- B owns Preference；
- B 将内部 FormState / UI model 映射为公开 Preference Contract；
- A 通过 Consumer Adapter 使用；
- A 不直接 import B 的 preference page state / private schema；
- 旅行节奏、移动、预算、住宿、餐饮、景点活动、同行人等仅冻结业务语义方向，不在 0.9 抢先冻结最终 TypeScript shape。

### Trip Plan → Trip Library

已明确：

- A owns Trip Plan；
- A 发布 savable Trip Plan Contract；
- B 数据层消费并派生 Trip Library ViewModel；
- B 不复制 Planner Store；
- `selectedDay`、`activeBottomTab`、overlay 状态、Map runtime object 等 UI/runtime 数据不得进入长期保存 Contract；
- 恢复编辑通过 Planner Resume / Edit Handoff，由 A 重建 Planner runtime state。

## Security Boundary

规范明确禁止公开跨模块客户端 Contract 携带：

```text
API key
OAuth access/refresh token
session secret
payment credential
partner secret
DB credential
raw auth header
Provider raw payload
不必要的个人敏感数据
```

本 Task 未新增任何 token、secret、Provider credential 或真实个人数据。

## Files Changed

最终收尾范围：

```text
docs/architecture/cross-module-contract-handoff.md
docs/tasks/RESULT-WBS-0.9-b-contract-handoff-rules.md
docs/project/WBS-TravelAssist.md
```

`docs/tasks/TASK-WBS-0.9-b-contract-handoff-rules.md` 保留启动时完整执行指令作为历史，不覆盖或重写其他 Owner Task。

## Validation

### Static / Repository Validation

- [x] 最新 `develop` 结构已审计；
- [x] Preference / Planner / Trip Library 的现有模型边界已核对；
- [x] ownership matrix 完整；
- [x] canonical source 决策完整；
- [x] additive / breaking 定义完整；
- [x] migration / deprecation 规则完整；
- [x] fixture/example 规则完整；
- [x] Preference → Planner 示例完整；
- [x] Trip Plan → Trip Library 示例完整；
- [x] Planner Resume 边界完整；
- [x] 无 secret / provider leakage；
- [x] 未重新划分 A/B Owner；
- [x] 未修改 runtime TypeScript / React / Provider 代码。

### npm Validation

`package.json` 已确认存在：

```text
npm run format:check
npm run lint
npm run typecheck
```

本会话通过 GitHub connector 执行，没有可运行仓库的本地 checkout，因此不能诚实声称已在工作站执行上述 npm 命令。

由于本 Task 最终仅修改 Markdown / WBS，未修改任何 runtime TypeScript、React 或配置：

- TypeScript compile surface：未改变；
- ESLint runtime surface：未改变；
- Markdown：已人工检查结构、表格、代码块和状态语义；
- npm 命令执行状态：`Not run in connector-only execution environment`。

这项限制不伪装成“通过”，并保留在 Review 证据中。

## Repository Automation Incident

Kickoff 阶段使用 `feature/b-wbs-0-9-contract-handoff-rules` 写入 Task/初稿后，仓库 `.github/workflows/auto-create-pr.yml` 自动：

1. 为 `feature/**` push 创建 PR；
2. 随即尝试 merge。

因此：

- PR #169：自动创建/处理 kickoff Task；
- PR #170：自动创建并合入规则初稿；
- #170 merge commit：`707bcc8d2af14a86032181be63573beb3aea3e17`。

这不是用户对 0.9 的最终验收，也不是手动授权合并。

最终收尾改用：

```text
review/b-wbs-0-9-contract-handoff-finalize
```

该分支不匹配 workflow 的 `feature/**` trigger，最终 PR #171 已保持 Draft。

## WBS State

最终收尾 PR 未合并时：

```text
WBS 0.9 Owner = B
WBS 0.9 Status = 待审查
Issue #168 = Open
PR #171 = Draft / Open
```

只有 PR #171 合入 `develop` 且用户验收通过后：

```text
WBS 0.9 = 已完成
Issue #168 = Close
```

## Out of Scope / Deferred

本 Task 不实现：

- `Preference Schema` / persistence；
- runtime `Preference Contract`；
- `Trip Plan Contract` runtime TypeScript；
- Trip DB / Save / Read API；
- Reservation / Partner / Payment Contract；
- Planner / Trip Library runtime integration；
- cross-module E2E implementation；
- A/B 责任边界重新划分。

## Result

WBS 0.9 的治理规则已具备进入 Review 的条件，状态为 **待审查**。

停止点：不 merge PR #171，不关闭 Issue #168，不标记 `已完成`，等待用户验收。

## 2026-09-10 最新develop整合与差异修正

用户授权解决保留Draft差异并合并符合条件的PR。从原head 46f00dcf003ba25cc00c93038752f36cdb1b3a30正常merge最新develop f14ac40d329d96d900a53e832ba40e8e4abe8cbd，没有rebase/force push。

WBS两段冲突均为本分支空段与develop新增历史；逐段保留上游新增及原0.9追踪，没有整份ours/theirs。更新Trips、Routes、Auth、Engine的真实canonical/Consumer清单，明确Preference/Companion公共包及Save/History缺口；旧“shared/server不存在”仅作为历史。

仅治理文档，Owner/canonical/权限/未知fallback/版本迁移原则不变，不改runtime/DB/API。文档检查与diff检查通过后按本轮授权合并；合并前WBS仍待审查，实际merge及完成状态在最终追踪记录。旧测试不改写为新测试。

## Final Acceptance / Merge Closeout — 2026-09-10

用户授权核查保留 Draft、解决差异并合并可交付项，涵盖本治理文档收尾。已更新最新 public Contract/Consumer 清单；未修改治理核心边界或 runtime。

- PR #171：已合入 develop。
- 最终 head：c75d7fcea922a9cab4fe5b0bd056b9f16374f83b。
- merge commit：88f9d338793dd21f81a3517be9c1ee55fc2d645b，已核实是 origin/develop 祖先。
- WBS 0.9 = B / 已完成；Issue #168 按本次授权关闭为 Completed。
- 修改文档格式及 diff 检查通过；GitHub Install, test and build 通过（run 34477130675）。未新增业务实现或代替未完成 Preference/Save/History 依赖。
- 原 Draft / 等待验收 / 旧目录现状记录保留为历史，不再表示当前状态。
