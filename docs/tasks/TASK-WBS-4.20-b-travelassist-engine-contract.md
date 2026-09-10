# TASK-WBS-4.20-B — TravelAssist Engine 契约设计与分阶段交接

## Metadata

- Task ID: TASK-WBS-4.20-B
- Owner: B（2026-09-08 用户明确指定的 Engine 单项例外）
- Status: 已完成（Contract v0.1 Frozen；最终文档Closeout PR待用户确认）
- WBS: 4.20；后续规划 4.21–4.24
- GitHub Issue: [#201](https://github.com/kanzakimy0/TravelAssist/issues/201)
- Branch: `feature/b-travelassist-engine-contract`
- Depends On: 已合入的 0.9 Contract 交接基线；发布前须 A/B 核对 4.16 / 4.17 / 8.5
- Commit: `214d035681bdc45af27ebdbe64ec5dd2210fb3d7`（原契约设计）
- Pull Request: [#237](https://github.com/kanzakimy0/TravelAssist/pull/237)（原契约已合并）；历史Review Gate [#238](https://github.com/kanzakimy0/TravelAssist/pull/238)，本轮由独立Closeout PR承接，见最终Result。
- Authoring Base: `2d9734731dcece9f90db1779da06a7a3c9e9bab7`
- Execution Base: `1af72af0d7151af4dd59073ee0b015a70b267064`

## 1. 定义与目标

本任务中的 TravelAssist Engine 对应现有架构书的 Trip Engine：验证并执行结构化行程变更的确定性业务层。它不是 AI 模型、地图服务、路线 Provider、预约商户，也不是重新创建 Planner Store。

B 负责 Engine 工作包，A 保留 Planner / Detail UI、地图 / Route Provider、AI Orchestrator、Trip Plan 主数据契约与主系统 Schema 的现有责任。此例外不将主系统其余任务整体转给 B。

本轮交接仅定义任务，没有实现 Engine。开始执行后也只做 4.20 契约设计，不自动实施后续阶段。

## 2. 必读

- README.md、CONTRIBUTING.md、docs/README.md
- docs/project/WBS-TravelAssist.md
- docs/development/task-tracking.md
- docs/architecture/cross-module-contract-handoff.md（PR #171 未合并内容不得冒充冻结基线）
- docs/architecture/trip-plan-data-ai-takeover.md（重点 §14–17、18、41–45）
- docs/architecture/db-orm-migration-standards.md
- docs/ui/trip-planner.md、docs/ui/trip-detail.md
- Issue #201；执行时最新 4.16 / 4.17 / 8.5、TASK-015-A / #173 / PR #186 状态

## 3. 安全启动

检查 working tree、fetch origin、读取最新 origin/develop、现有 Task / Issue / PR，避免重复工作。保留其他工作站未提交内容，在干净独立 worktree 从最新 develop 创建功能分支。

不得复制未合并 DB / Planner feature 分支作为基线，不得 force push、reset --hard、clean -fd。

4.20 可以先进行契约设计，不需要真实数据库。涉及未冻结 Trip Plan 字段或产品判断规则时明确列为待确认，不擅自定义第二套 Schema。正式发布契约前须完成 A/B 核对。

## 4. 当前范围：4.20

交付 `docs/architecture/travelassist-engine-contract.md`，至少包括：

1. Producer/Consumer、唯一 Schema 来源、模块边界、版本和兼容策略。
2. ChangeSet 输入：身份上下文引用、base version、幂等键、操作列表、原因、来源；不得携带任意 SQL 或服务密钥。
3. 按现有架构冻结操作白名单；不自动启用未实现操作，明确 unsupported 行为。
4. preview / validate / apply / rollback 的输入输出和副作用边界：preview 不保存、不预约、不收费。
5. 权限、锁定、预约约束、预算、时间冲突、缺失/过期 Provider 信息的结构化错误与告警。
6. 用户确认规则：酒店变化、金额、取消预约、硬时间约束不得绕过授权；未知事实不能返回“正常”。
7. base-version 冲突、幂等重放、事务失败、版本/审计及同步事件的一致性。
8. A 的 Planner / Detail 消费适配接口，B 的保存/历史消费接口；不能直接消费私有组件 state。
9. 契约样例和验收矩阵：正常、需确认、阻断、锁定、过期版本、重复请求、事务失败、缺少坐标/交通事实。
10. 未确定产品规则、后续工程依赖和需要确认的接口；未确认内容不得写成已冻结。

不要求在本任务创建运行时目录、安装依赖或接入数据库。

## 5. 分阶段 WBS

| WBS  | Owner | 内容                                        | 前置                         | 当前状态            |
| ---- | ----- | ------------------------------------------- | ---------------------------- | ------------------- |
| 4.20 | B     | Engine Contract、操作白名单、错误与权限模型 | 0.9 已合入基线；A/B 合约核对 | 待验收              |
| 4.21 | B     | 纯规则校验、约束冲突和影响预览              | 4.20、4.17                   | 未开始              |
| 4.22 | B     | 原子应用、版本、幂等、权限及审计            | 4.21、8.1、8.3、8.4、8.5     | 未开始 / 前置未满足 |
| 4.23 | B     | 运行事件、局部重算与回滚执行契约            | 4.22、7.5                    | 未开始              |
| 4.24 | B     | Engine 回归、并发、回放与集成验收           | 4.21–4.23                    | 未开始              |

4.21–4.24 执行前分别建立独立 Task / Issue / 分支，不能以本交接作为一次全部实现的指令。4.22 必须等待真实 DB 验收和依赖合入，不能因为 Issue 记载本地验证通过就假定 PR #186 已合并。

## 6. 去重与跨模块边界

- 4.16：A 的 Day Plan / Itinerary 核心模型；不是另起 B 版本。
- 4.17：A 的 Trip Plan Contract；4.20 引用它，契约设计可先记录所需输入，不替代其最终交付。
- 4.15 / 4.18 / 4.19：A 的 UI 状态及偏好/保存适配，保持原 Owner。
- 5.18 / 5.19：B 的旅行库与保存接口，仍使用主系统契约；Engine 是变更执行层，不是第二个旅行库。
- 8.5：A 的 Trip Plan SQL Schema；4.22 通过其公开服务/事务边界使用。
- 6.x：A 的 AI 仅提出候选 ChangeSet；Engine 不提供模型直接写库路径。
- 7.x：A 的 Provider / Route 负责查询和缓存；Engine 消费带时效的结果，不偷偷增加付费调用。
- Booking / Payment 真实外部操作不属于此任务，模拟状态不得标为真实订单。

## 7. Non-goals

不修改 Planner、Detail、Start、Personal Center 的业务 UI；不重构现有地图生命周期；不新建云项目、业务表或第二套迁移；不接真实 AI / Route / Booking / Payment；不提交 Secret；不执行付费查询；不修改其他 Owner 的未合并任务。

## 8. 验证与交付

- 文档路径、WBS ID、依赖、Owner 和 Issue 链接一致。
- 提供可复核契约案例矩阵，明确哪些是设计案例、哪些为真实运行测试，不混淆。
- Markdown 格式与 git diff --check；如包含纯数据 fixtures，验证其解析和预期。
- 本任务不改业务代码时，不冒称完成 runtime / DB / UI 验收。
- 更新本 Task、Result、WBS、Issue；提交到自己的 feature 分支并创建 Draft PR → develop。
- 只有设计确认且 PR 合并后，4.20 才标记完成；其余阶段保持未开始。
- 完成后停止，不自动实施 4.21 或其他 WBS。

## Result Format

Status / Tracking / Contract / Ownership / Dependencies / Validation / Files Changed / WBS Update / Commit / Draft PR / Open Decisions / Non-goals。

## 9. Current Delivery

- Contract: `docs/architecture/travelassist-engine-contract.md`
- Result: `docs/tasks/RESULT-WBS-4.20-b-travelassist-engine-contract.md`
- Scope status: 4.20 Contract v0.1 Frozen；4.20.1与4.21均已验收合并；4.22–4.24未启动。

## 10. Final Contract Freeze / Closeout（2026-09-10）

- 本次用户明确授权最终审计并在无核心阻塞时冻结v0.1、将4.20记为B / 已完成；原契约及4.20.1已进入develop。本次独立文档PR待确认，不自动合并。
- 基线：`origin/develop@2d3df8819da0e02b6b8449097dc2b95cd475f9d9`；分支：`codex/b-engine-contract-final-freeze`。
- 4.20.1已由用户验收并通过PR #283合入；4.21已通过PR #288及#290实现验收、完成追踪。
- Contract §25完成全部21个Open Decision ID审计；未解决A类Contract Freeze Blocker为0。OD-CONTRACT-01/OD-ASSESSMENT-01的公共语义部分已解决，其余实现/发布部分归B；未删除任何OD。
- WBS 4.20 = B / 已完成；Issue #201按本次授权关闭为Completed。后续实现依赖继续Open，4.22–4.24及8.5未开始。
- 原§5阶段表和原交付指令保留为历史规划；当前阶段状态以最新Master WBS、本节及 [Final Closeout Result](RESULT-WBS-4.20-b-engine-contract-final-closeout.md) 为准。
- 本轮只有文档/Tracking，7个Contract TypeScript块与全部JSON样例保持不变；不修改4.21 runtime/测试/素材，不伪造A人工签字或生产Consumer验收。

- Final closeout：Commit `8912fb21e3272ab68223c22037499629adc4c8c9`；[Draft PR #292](https://github.com/kanzakimy0/TravelAssist/pull/292)；Issue #201已Closed / Completed；历史Review PR #238已关闭并由#292承接。
