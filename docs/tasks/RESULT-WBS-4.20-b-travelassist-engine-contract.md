# TASK-WBS-4.20-B Result

## Status

待验收 / Contract Review Candidate。WBS 4.20 的契约设计已交付但尚未 frozen。仓库自动化在 feature push 后创建并立即合并 PR #237；该合并没有用户验收，因此不满足“已完成”条件。Issue #201 保持 Open；4.21–4.24 均未启动。

## Tracking

- Task: `TASK-WBS-4.20-B`
- Owner: B
- Issue: [#201](https://github.com/kanzakimy0/TravelAssist/issues/201)
- Base: `origin/develop@1af72af0d7151af4dd59073ee0b015a70b267064`
- Branch: `feature/b-travelassist-engine-contract`
- Implementation commit: `214d035681bdc45af27ebdbe64ec5dd2210fb3d7`
- Automated PR: [#237](https://github.com/kanzakimy0/TravelAssist/pull/237)，GitHub Actions 创建并合并为 `5383501192359abbd06c4585311d0362e9e7dbea`，不是用户验收
- Review-gate Draft PR: PENDING
- Prior handoff: PR #202 已合并，只包含 Task/WBS 文档交接，不是 Engine 实现

GitHub 查重确认 #201 是唯一正式 4.20 Issue。搜索中其他命中项属于 7.5/7.8 路线任务；没有第二个 4.20 实现 Issue。指定实现分支在开始时本地/远程均不存在，因此从执行时最新 `origin/develop` 创建，没有从未合并 feature 分支叠加。

原计划在 push 后立即创建 Draft PR，但 `auto-create-pr.yml` 对 `feature/**` push 自动创建 non-draft PR 并调用 merge；PR #237 在两秒内由 `app/github-actions` 创建并合并，人工 Draft 创建随后收到“no commits between”拒绝。未执行手动 merge、auto-merge 命令、force push 或历史重写，也不因这次自动合并把 4.20 标记已完成。后续只增加 review-gate tracking，不回滚 develop。

## Contract

交付 `docs/architecture/travelassist-engine-contract.md`，定义：

- TravelAssist Engine 与 Trip Engine 为同一确定性变更层；
- A/B Producer/Consumer 与 ownership；
- WBS 4.17 `src/shared/contracts/trips/index.ts` 为唯一 Trip Plan Schema；
- ChangeSet envelope、operation whitelist 与依赖能力的 unsupported 行为；
- validate / preview / apply / rollback 的输入输出和副作用边界；
- accepted / needsConfirmation / blocked / unsupported 统一结果；
- 权限、锁、预约、预算、时间、坐标、Provider freshness 错误；
- 服务端 scope-bound 用户确认 grant；
- trip + plan 双层 baseVersion、optimistic concurrency；
- idempotency/replay 及 same key + same/different payload；
- 原子 transaction failure、outcome unknown 和 rollback 边界；
- Planner / Detail、AI、Provider、B Save/History 与未来 8.5 接口；
- 九类设计样例、Acceptance Matrix 与 Open Decisions。

Preview 明确不保存、不预约、不收费、不写 audit/history/idempotency/event、不分配持久 revision，也不隐式调用付费 Provider。Apply/rollback 只是未来领域能力契约，本 Task 没有运行时实现。

## Ownership / Schema Review

已完整读取已合入 develop 的 4.17 Task、Result、handoff、canonical types、validator、fixtures 与 contract tests。4.17 v1.0 结构校验不证明权限、事实时效、预约真实性或变更可执行性；4.20 只增加 Engine 行为边界，不修改或复制其 Schema。

A 继续拥有 Planner/Detail、4.16、4.17、AI Orchestrator、Map/Route Provider 与 8.5 主系统 Schema。B 只交付 4.20 Engine Contract；B Save/History 未来只消费 canonical snapshot/result/resume，不将 Trip Library ViewModel 反向定义为主 Schema。

## Open Decisions

完整清单见 Contract `22。关键未冻结项：

- 4.16：UPDATE_ITEM/duration/transport/skip/restore/MUST_DO 等 canonical 表达与 identity 规则；
- 8.5：revision 分配、idempotency/hash/retention、事务/隔离/outbox/audit/history/rollback 数据；
- 7.5：normalized route fact、TTL/confidence、坐标与离线降级；
- 产品规则：预算阈值、酒店/预约/硬时间确认、lock override、Autopilot 上限；
- Booking：可信事实、退款/取消/修改状态机与外部副作用；
- 5.18/5.19：Save/History/Resume 的正式 service handoff；
- A/B review：Engine v0.1 wire naming、caps、unknown compatibility 与 parser 发布位置。

这些项目均保留为 Open Decisions，没有被写成 frozen spec；对应 operation 在依赖关闭前为 unsupported 或 blocked。

## Validation

| Check                                   | Result                                                                |
| --------------------------------------- | --------------------------------------------------------------------- |
| `npm ci`                                | PASS；395 packages；0 vulnerabilities；未改 package/package-lock      |
| `npm run lint`                          | PASS                                                                  |
| `npm run typecheck`                     | PASS                                                                  |
| `npm run build`                         | PASS；Next.js 16.3.4 production build，14/14 pages generated          |
| `npm run format:check`                  | BASELINE FAIL；27 个既有 Markdown 文件，与最新 develop 的历史清单一致 |
| Task-file Prettier check                | PASS：Contract、Task、Result、WBS                                     |
| `git diff --check`                      | PASS                                                                  |
| Fixtures                                | 未新增                                                                |
| Runtime / DB / API / browser / Provider | NOT RUN / out of scope；无实现或调用                                  |

全仓 format 失败文件均未被本 Task 修改；没有批量格式化无关文件。新建/修改的 4.20 文件单独通过 Prettier。

## Files Changed

- `docs/architecture/travelassist-engine-contract.md`
- `docs/tasks/TASK-WBS-4.20-b-travelassist-engine-contract.md`
- `docs/tasks/RESULT-WBS-4.20-b-travelassist-engine-contract.md`
- `docs/project/WBS-TravelAssist.md`

没有修改 Planner、Detail、Start、Personal Center、4.16 runtime、4.17 canonical contract、8.5 Schema、业务表、Migration、API、Engine runtime、AI、Mapbox、Route Provider、Booking、Payment、Authentication 或依赖配置。

## WBS Update

- 4.20：待审查，仅表示设计已交付等待验收/合并。
- 4.21：未开始。
- 4.22：未开始；8.5 前置未满足。
- 4.23：未开始；依赖 4.22/7.5。
- 4.24：未开始。

只有用户验收且 Draft PR 合入 `develop` 后，4.20 才可标记“已完成”并关闭 #201。
