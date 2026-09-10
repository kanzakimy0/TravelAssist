# TASK-017-B Result

## Status

**Partial / 进行中（服务器子集 Draft 交付，页面集成未完成）；不是 Completed，也不是 Ready for review。**

服务器持久化子集已实现并通过本地真实验证，已上传 Draft PR #221。实际 Step 页面尚未切换到服务器 autosave/resume；原有本地草稿未被替换。后续不自动开始 5.14 / 5.19 / 8.5 / WBS 5.3。

## 历史 Prerequisites（当前见末节）

- 实际 base：`0c21643d0f44ce599747007e25265c0e5219b5fb`。
- 发布时 develop 前进到 `18afee5f02ed45505b81636f7b25b568270b2bf9`（#218 Authentication Core + #220 登录用户流程 Task）。已普通 merge 整合，唯一冲突为 WBS 顶部记录，双方内容完整保留；package/lock/Auth 配置沿用 develop，不重写 #218。
- 新增复用 TASK-018 的 verified-user / public config / SSR request adapters，支持 Cookie 与 Bearer，并实测同源、跨站拒绝和双用户 Cookie 隔离。**8.3 已完成，不再作为阻塞原因**；WBS 5.3 页面流程尚未实现。
- TASK-015-A / PR #186 已合并：`24dff4e3b74dfe01c369d2c149d37eba86ad6472`；六项 DB Foundation 路径均在 develop。
- 4.17：PR #216 merge `ec9b06240040881b6fdc249bf0967f820ac2406b`；冻结收尾 PR #217 merge 为本次 base。已获得项目负责人明确批准，不伪记成独立 B review。
- TASK-016 Profile 已合并（#209），本 Task 不把 Profile 当成 Preference。
- 远端命令/Task 来源分支 `task/b-step-preference-trip-draft-persistence`，读取版本 `67587d5b55facfd0c773953e84daa9d3598a3ad5`。
- 原主工作树有 Planner 未提交修改；使用独立干净工作树，不覆盖旧目录，不重启 3113 预览。

## Tracking

- Issue：[#207](https://github.com/kanzakimy0/TravelAssist/issues/207)，Open / Partial。
- Branch：`feature/b-step-preference-trip-draft-persistence` → `develop`。
- Implementation commit：`f597933858b137a3929434e4d2d2d6c0444859ec`；已验证 Auth 整合提交：`deb3d28c90ca1ed55e4eb95ea4427f25ba1e5755`；其后仅追踪文档同步见 PR commits。
- Draft PR：[#221](https://github.com/kanzakimy0/TravelAssist/pull/221)；保持 Draft，不合并。
- 旧仅前置阻塞记录 #213 将由本结果取代，不合并旧文档分支。
- 设计/接口说明：`docs/architecture/step-preference-persistence.md`。

## Step Mapping

审计的是实际 TripWizardDraft/StartFlowShell，不是同文件中的 legacy StartFlowDraft。当前四步导航的索引 3 同时承载动态生成和方案选择，恢复 phase 区分 generating / plan_selection，不引入 5/5。

| 实际输入                                             | 所有者 / 当前支持                                                      | 尚未完成                                             |
| ---------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------------- |
| Step 1 familiarity                                   | 当前浏览器草稿；不放 Profile                                           | 独立 typed 问卷上下文与 UI restore                   |
| Step 2 likes/dislikes，16 兴趣                       | 长期 Preference category.item + Snapshot/Override；复用现有 INTERESTS  | 实际 UI 显式编辑绑定，不能上传 Mock 默认值           |
| Step 2 六条 travelStyle 1–5                          | style.* 稀疏值，保持五档                                               | 实际 UI 编辑/恢复绑定                                |
| 兴趣细分 interestDetails                             | 已审计现有 Modal 的详细选项                                            | canonical typed 明细映射未完成，未静默丢弃后声称恢复 |
| 目的地、日期、天数                                   | A TripDraftFactsV1                                                     | 实际页面 resolver/恢复适配                           |
| 成人/儿童/婴儿/老人、需求                            | Draft participants/participantNeeds                                    | 不写 Companion Master；页面适配待接入                |
| Flight/Hotel/Activity anchors                        | Draft fixedArrangements；保留手动来源、时间、地址                      | durable ID 与 UI 还原接线                            |
| 本次具体金额                                         | Draft budget minor units，0 保留                                       | 旧字段缺币种/小数位，须明确上下文，不猜 JPY          |
| 交通与本次驾驶限制                                   | 已支持长期少步行/少换乘等 frozen keys；事实限制可由 A constraints 承载 | Step transportDetails 完整映射与硬软边界补齐         |
| 餐饮/住宿/长期消费倾向                               | 复用 Personal Center frozen key/value                                  | 现有 Preference UI 不自动改接服务器                  |
| 本次预算档位/付费景点/体验升级                       | 当前浏览器草稿                                                         | 与长期消费倾向的独立 typed mapping 待补              |
| 当前 Step / 完成状态                                 | A WizardProgressV1，服务器可存取                                       | 未把浏览器到达页面等同于已完成                       |
| 6 阶段定时进度、Mock generatedPlans / selectedPlanId | UI / Mock generation，不存正式计划                                     | 不把 Mock 方案当成服务器生成 Job 或 8.5 Trip Plan    |

## Preference Persistence

- 独立 `travel_preferences`；版本 1.0 的 30 个现有 category.item key/value，未设置不注入虚假偏好。
- 关系型 owner/revision/audit + JSONB typed envelope，拒绝日期、owner、UI/Radar 和未知字段，不是 UI dump。
- get/update server boundary；verified Supabase user → authenticated Drizzle transaction + RLS；可重试、版本冲突返回 409。
- schema/表/索引/约束清单见设计说明；SQL Migration 是唯一正式历史，未新增依赖或 Drizzle migration。

## Trip Draft / Snapshot / Override

- `trip_drafts` 消费冻结 A facts/progress，仅输入草稿，不建 itinerary/day/item。
- 创建触发器原子复制长期偏好和 revision，初始化空 Override；无长期偏好记录时来源版本为 0。
- Snapshot 不可变；更新长期偏好不修改既有快照；Override 只影响本次有效偏好。
- absent ≠ false/neutral/空列表；unset 删除覆盖恢复继承；未知 key/value 和组合冲突拒绝。
- 0 的具体预算保存为 0；现有五档滑轨 0 不合法，未擅自增加第六档。
- owner+creationKey 幂等，revision CAS，创建 key 与标识不可变，事务身份不会泄漏到连接池。
- 自动保存控制器支持 debounce、串行在途编辑、网络 retry、丢响应重试保护、冲突停写和显式 resume；尚未接通真实 Step UI。
- 导入仅接收新草稿 facts/progress，从当前用户偏好创建快照，不导入原作者偏好。

## RLS / Security

- 四表 RLS ON / Default Deny，anon 无 CRUD grants；owner 来自 Supabase `getUser` 真实认证。
- 真实验证 User A/B 双向隔离、跨用户写入拒绝、无 subject 无数据、不可变快照、Auth 删除级联和 Profile 不污染。
- 真实本地 Auth API 验证无效 token/伪造 owner 拒绝，同 key 并发创建仅一草稿，同版本并发更新仅一个成功；整合 #218 后补验 Cookie A/B 隔离、同源接受、跨站拒绝。
- 私有响应 no-store、192 KiB 请求上限、原始错误/数据库连接信息/Token 不返回。
- 未提交 Token/Secret、未接云端数据库、未构建匿名账号/登录产品流程。

## 历史 Validation（不作为本轮复测）

- `npm ci`：PASS，0 vulnerabilities。
- `db:start / db:status / db:reset / db:types`：PASS，真实 Local Supabase。重置前核验 Auth 与全部业务表为 0 行；安全审查要求复核时已重新只读核验，没有绕过。
- `npm run test:preferences`：9 PASS。
- `npm run test:preferences:db`：15 PASS，真实 SQL/Drizzle/RLS/认证接口/并发；测试用户逐一清理。
- TASK-016 Local runtime：25 PASS。
- 全仓测试：Auth 整合前 621 PASS；整合后最终复跑 **630 PASS**，无失败/跳过。
- 复用 Auth Core 后再次 npm ci/lint/typecheck/build 与 15 项 TASK-017 Local、25 项 TASK-016 Local 验证均 PASS；生产客户端检查 PASS（31 chunks / 64 Auth dependency modules，无私有凭据或 server helpers）。
- lint / typecheck / build：PASS。构建不需要数据库连接，新增 API 为动态 route，既有页面构建正常。
- format:check：**FAIL，最新 develop 基线 28 份文档格式告警**（原 27 + #220 新合入的 `docs/tasks/TASK-WBS-5.3-b-auth-user-flow.md`，本 Task 未修改）。本次新增/修改代码、测试与交付文档单独 Prettier check 全部 PASS，不改动无关文件。
- git diff --check：PASS。
- 实际 Step 跨设备浏览器 QA：**未通过 / 未实施**，原因是页面未接线，不用服务层测试代替 UI 验收。
- db:status / db:stop 最终收尾：PASS；本 Task 启动的 Local 服务已停止，数据库卷保留，未影响 3113 预览。

## Changed Files

- `supabase/migrations/20260908130000_create_trip_preference_drafts.sql`
- `src/db/schema/travel-preferences.ts`、schema index、真实 generated database types。
- `src/shared/contracts/preferences/{index,drafts}.ts`
- `src/server/preferences/{repository,service,http}.ts`
- `src/app/api/travel-persistence/route.ts`
- `src/features/start-flow/model/server-draft-autosave.ts`
- TASK-017 pure/runtime/API tests 与本地安全 fixture helper、测试 loader。
- 原 TASK-016 两个测试仅收窄到原三张 Profile 表，仍完整验证原域，不删除断言。
- package scripts；Task / Result / WBS / 持久化边界说明。
- 相对最新 develop 未修改 Planner/Detail/Personal Center/Start 的业务 UI、A 主 Trip 契约、环境文件或 package-lock。普通 merge 带入的 #218 文件不是本 Task 新增实现。

## Known Limitations

1. **整体不是完整实现**：Step 页面与 Personal Center 仍保持现有浏览器/内存存储。新 API 和 autosave 控制器尚未被这些页面调用。
2. Auth Core 已合并且 API 已复用；真正未完成的是 WBS 5.3 用户登录流程和 Step 的会话/切换用户接线，不把 8.3 误报 Blocked，也不自行建立匿名账户或假登录来凑完成。
3. Step 全字段映射尚不完整：familiarity、兴趣细分、交通详细设置、预算档位/付费体验、币种上下文及还原适配必须补齐后，才能启用页面云草稿；不能静默丢字段。
4. 本次 Preference 是已有键值子集的持久化候选；未实现新的 Master Data、Preset、详细高级规则、AI 或 Planner Preference 对外 Contract。
5. listDrafts 仅 active drafts 的有限恢复入口，不是分页保存行程库/历史系统。
6. 全仓已有格式告警另行处理，不以修格式为由改动无关业务。Issue #215 历史正文更正被权限审查拒绝，未绕过；该 Issue 已关闭，其完成评论及 #216/#217 实际合并状态仍可核验。

## Next Gate

- 先审查 Draft 中的数据库与服务子集；WBS 5.11/5.16 为子集待审查，5.18 为进行中/部分实现，页面接入待补，不写最终完成。原硬性前置 #186 / 4.17 均已满足。
- 基于已有 Auth Core 完成页面身份接线，并明确未登录/登录/换用户的实际 UI 流程及 Step 金额上下文，补齐剩余 typed mapping 后进行 autosave/resume 和浏览器跨设备验收。
- 本次停止，不自动 merge，不自动开始 5.14 / 5.19 / 8.5 或其他 WBS。

## 2026-09-10 最新 develop 整合 / 仍为 Partial

用户本轮授权解决 B 保留 Draft 的分支差异。原 head ae8b1e18ea713a2d86b1126178522e1752b1cb8d；本轮普通 merge 基线 develop@9c404d6dbc9299351a0363377422574bf00a1786，包含已合并 #171/#177/#179。没有 rebase/force push，没有覆盖其他工作站。

### 冲突与保护

- WBS 一段历史插入冲突：逐段保留 develop 新记录与 TASK-017 历史；主表 5.11/5.16/5.18 保持 develop 的正式状态，新增注释明确本 Draft 的服务器子集与 Partial 状态，不将未合并功能标为正式完成。
- package.json 一段 scripts 冲突：同时保留最新 deploy/quality scripts 与 test:preferences / test:preferences:db，依赖和 lockfile 与 develop 一致。
- B 原有 preference server/contract、autosave、SQL migration、generated types、TASK-017 tests 与原审计 head 完全一致；本轮没有修改 runtime 或数据库内容。
- 最新 develop 的 Home/Start 页面/Planner/Detail/PC、Auth/Supabase、Trips public contract 和 workflows 完整保留。
- PR #227 仍为 A 的独立 Draft（核对 head 81c8c104394fa5a94a35a0fe486ebd1998f428c1），没有合并。其 schema index/generated types/Profile tests/package 与本分支有共享文件，未来必须从 SQL truth 重新生成/验证组合模型；没有把 A 未合并 8.5 声称为已实现。本分支只增加输入草稿/偏好表，不建 itinerary/day/item 表。

### 本轮实际验证

| 检查                                                                  | 结果                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| npm ci                                                                | PASS；0 vulnerabilities；npm 既有 deprecated/allow-scripts 提示保留 |
| npm run lint                                                          | PASS                                                                |
| npm run typecheck                                                     | PASS                                                                |
| npm run build                                                         | PASS；动态 /api/travel-persistence 构建正常                         |
| node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs" | 811 / 811 PASS，0 fail、0 skip                                      |
| npm run test:preferences                                              | 9 / 9 PASS                                                          |
| npm run format:check:deploy                                           | PASS                                                                |
| git diff --check origin/develop                                       | PASS                                                                |
| npm run db:status                                                     | BLOCKED：local Docker daemon unavailable                            |
| Local DB / RLS / API runtime / reset / generated types regeneration   | 本轮未执行；不可把历史 15/25 项实测当本轮通过                       |
| Step/PC 跨设备浏览器验收                                              | 未执行；页面消费仍未接通                                            |

旧 630 tests、15 Local DB/API、25 Profile 和 28 格式告警均保留在历史段落，不替换为当前证据。当前静态/编译/全仓测试通过不等于满足 Task 的真实 DB 与页面完成 gate。

### 当前待补与停止点

5.3 Auth User Flow 已在 develop 完成，不再将其列为整个登录产品缺失；待补的是 TASK-017 的实际 StartFlowShell/PC 消费、完整 Step 问卷/兴趣细分/交通/付费体验/金额币种映射、登录/换用户/访客迁移以及跨设备恢复。还需可用 Local Docker 后重新验证 SQL/generated types/RLS/CAS/幂等。

本轮只整合现有成果并推送，PR #221 保持 Draft / Partial，Issue #207 保持 Open。WBS 5.14 / 5.19 / 8.5 未启动。最新 head 与推送结果以 PR 为准。
