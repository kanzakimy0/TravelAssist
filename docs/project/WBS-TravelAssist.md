# TravelAssist 可记录 WBS（Master）

## TASK-019-A 主系统 Trip Plan Schema（2026-09-09）

- 8.5 / A / Issue #226：待审查（非已完成）。基线 `74bc3cccf8bcfd603706e2b96d4072076191f308`，独立工作区 `codex/a-trip-plan-schema`；#216 / #186 已合并并验证祖先关系。Task 与 Result 同步；实现 `b8a5ad502d216b7ab9ebbd0c587ea158daf0fdcb`；[Draft PR #227](https://github.com/kanzakimy0/TravelAssist/pull/227)，Issue 保持 Open。
- 四层 Trip 主表、owner-only RLS、revision/CAS、事务 Contract 投影与真实 generated types 已验收；Local start/status/reset/types/stop、21 项 TASK-019 runtime、25 项 Profile runtime、16 项纯投影夹具通过。634 项全仓 tests、lint/typecheck/build 通过；28 份历史格式问题与 develop 一致，新增 0。
- 交付前重新 fetch，develop 仍为上述 SHA；#207 / #221 仍 Open / Draft / Partial，不引入其 B 表。无 UI、Saved Trips、Engine、POI/Route、Booking/Payment 扩展；只有用户验收并合并后才标记已完成。

## TASK-PLANNER-AUDIT-A 七项审计修复（2026-09-08）

- 用户批准修复 A 范围审计的全部七项确认问题；Issue [#223](https://github.com/kanzakimy0/TravelAssist/issues/223)。基线 `18afee5f02ed45505b81636f7b25b568270b2bf9`；分支 `codex/a-planner-audit-fixes`。
- 4.2 / 4.25 / 4.26 / 4.32 / 4.42 / 4.46：本次七项审计修复已完成；用户明确批准合并，PR #224 合并提交 `654dad9b8a4dbd9afb909e46f375872a7ede69d6` 已进入 develop，文件树与已验收 head `3db5f71` 完全一致。631/631 tests、lint/typecheck/build、diff 检查通过；28 份历史格式问题与基线一致，未新增。
- 覆盖保存基线、向导/旧保存冲突、还原日期范围、交通冲突检查、取消后确认解除固定、完成检查缺失餐宿、真实 Mapbox 图层。保持布局和 B 任务边界，不接真实 AI/预约/云保存。
- Task：`docs/tasks/TASK-planner-audit-fixes.md`；Result：`docs/tasks/RESULT-planner-audit-fixes.md`。实现 `ecbf022`；[PR #224](https://github.com/kanzakimy0/TravelAssist/pull/224) Merged；Issue #223 Closed / 已完成。`codex/a-planner-audit-closeout` 仅同步验收记录，不继续下一任务。

## TASK-018-B Authentication Core（2026-09-08）

- 8.3 / B / #214：已完成；用户明确授权“开始现场验收，验收通过后自动合并并更新WBS”，本轮真实验收通过后 PR #218 已合入 develop。执行基线 `39890af8c2ed137712b90f3f9d2bfdef313cfef6`；独立 F 盘承载 WSL Worktree，分支 `feature/b-authentication-core`。状态按未开始 → 进行中 → 待审查 → 验收且合并后已完成推进。
- Supabase SSR / Next 16 Proxy、Cookie 刷新、可信 server user guard、邮箱密码、手机 OTP 自动注册、邮箱 OTP 禁止自动注册、找回密码、Google/Apple PKCE contract 与安全 returnTo 已实现。整合最新 develop `0c21643` 后真实 Auth Runtime 16/16、TASK-016 DB Runtime 25/25、全仓 Node 621/621、lint/typecheck/build 和 31 个生产客户端 JS / 64 模块检查通过。完整格式检查仍有 27 份逐字节与最新基线一致的历史文档失败，单独保留；真实外部 OAuth/SMS/email delivery 按 Task Deferred。
- Result：`docs/tasks/RESULT-TASK-018-b-authentication-core.md`。实现 `7e84dd0`；整合复验 `371191f`，仅文档验收记录 head `0e630a7`；[PR #218](https://github.com/kanzakimy0/TravelAssist/pull/218) 已合并，merge `7f805e0a1b3b6bc650293a33363c6c22cde6a360`，合并树与验收 head 一致；Issue #214 Closed。未声称存在独立 GitHub APPROVED review。
- 8.1 / 8.2 / 8.4 与既有 UI 已完成状态不变；5.3 / 5.15 / TASK-017-B 及其他后续 Task 未启动。下方此前 Auth 未启动描述为历史，以本节与当前 8.3 行为准。

## TASK-WBS-4.17-A 合并冻结（2026-09-08，最新）

- 项目负责人明确指示“合并并继续”，接受本次契约交接，替代等待独立 B 审查的门槛；未宣称存在 B/GitHub APPROVED 记录。
- PR #216 已合入 develop：`ec9b06240040881b6fdc249bf0967f820ac2406b`，合并树与验收 head `6e3c470` 一致。4.17 公开 v1.0 契约已完成；612 tests/lint/typecheck/build 证据有效，27 份既有格式问题保留。
- #207 / 5.18 的 4.17 前置解除，正式 TASK-017 仍须从最新 develop 重新检查启动；5.11/5.16/5.18 尚未实现。4.15/4.16 部分运行时及 8.5 主表不因契约完成而标记完成。下方待审查/阻塞描述为历史，以本节与当前 WBS 行为准。

## TASK-WBS-4.17-A 契约交接（2026-09-08）

- 用户明确授权先执行 A 的 4.17，完成契约冻结、审查与合并后再复检 TASK-017-B / #207。#215；分支 `codex/a-trip-plan-contract`；基线 `39890af8c2ed137712b90f3f9d2bfdef313cfef6`。
- 当前待审查：独立 canonical Trip Draft / Trip Plan 公开类型、校验、fixture、真实 Step 纯转换器和交接说明；不复制浏览器 Store，不建主系统表，不改 B 的 Preference Master。4.15/4.16 仍是部分本地实现，8.5 保持未开始。
- 正式冻结前必须取得 B 或指定集成审查人的审查记录；4.17 合并验收前 #207 / 5.18 不解除阻塞。Task：`docs/tasks/TASK-WBS-4.17-a-trip-plan-contract.md`；Result：`docs/tasks/RESULT-WBS-4.17-a-trip-plan-contract.md`；实现 `2021343`，后续仅同步追踪；[Draft PR #216](https://github.com/kanzakimy0/TravelAssist/pull/216) 未合并。612 tests、lint/typecheck/build 通过；27 份既有格式问题保留。

## TASK-016-B User / Profile Schema（2026-09-08）

- 8.2 / B / #200：已完成（用户最终验收通过且 PR #209 已合入 develop）。首次基线 `eccfd9e`；分支 `feature/b-user-profile-schema`；合并前整合最新 develop `dcb7cbe`，只解决 WBS 顶部记录冲突，完整保留双方记录。
- 仅新增 profiles / profile_settings / emergency_contacts；SQL 唯一历史、owner-only RLS、Drizzle mirror、真实 generated types。25 项真实数据库测试与真实类型再生成比对通过；整合后 565 项全仓 Node 测试、lint/typecheck/无 Secret build 与 31 个客户端 JS 泄漏检查通过。已验收 DB 实现不变；27 份既有格式问题保留。
- Result：`docs/tasks/RESULT-TASK-016-b-user-profile-schema.md`。实现 `27a7ba8`；整合复验 `0eab355`；[PR #209](https://github.com/kanzakimy0/TravelAssist/pull/209) 已按用户明确授权合并，merge `d118d4d0ad5b3b031e1bca6121f36b555c046216`，合并树与复验树一致；Issue #200 Closed。
- 8.1/8.4 及既有 UI 已完成状态不变；Auth / 8.3 / 5.3、Preference、Companion、Trip、POI 和其他 Task 均未启动。下方 8.2 可开始/未实施描述为启动前历史，以本节和当前追踪行为准。

## 当前整合发布（2026-09-08）

PR #211 已合入 develop：`13a316a408d2be58f8319efc68d88aa555e39884`，完整包含 PR #204 / #206（GitHub已确认两者Merged）。#203/#205/#210的UI与本地Mock范围已验收；4.37/4.38/4.40–4.46/7.12改为已完成。561测试及整合浏览器验收通过；27份未修改历史格式问题如实保留。数据库已完成、B Engine规划及日本素材Partial门槛不变。下方本地未上传/旧Draft记录为历史，以本节及追踪行优先。


## 独立滑轨与方案保存还原（2026-09-08）

- 追加五分钟吸附与拖拽时间预览、重叠卡置顶、三日餐宿区域分层、工作方案保护与浏览器草稿切换/恢复；544项测试及四尺寸验收。本轮仍仅本地，未上传，不标记已完成。

- TASK-PLANNER-TRACK-A，WBS 4.46，本地待审查；分支 `codex/planner-independent-tracks-plan-actions`，保留 `a2a537b` / PR #204、#206 UI 基线。Task/Result：`docs/tasks/TASK-planner-track-actions.md`、`docs/tasks/RESULT-planner-track-actions.md`。
- GitHub Issue / PR 均 PENDING：发布权限检查拦截，等待明确授权；未上传、未合并。不得因此把 4.46 标为已完成。此 UI 分支的历史 DB 条目不是最新 develop 的数据库合并记录；后续同步须保留 develop 的数据库收尾，不能回退 B 前置状态。

## 完成规划与出发准备（2026-09-08）

- TASK-TRIP-PREPARATION-A / #205，用户确认设计后实施，分支 `codex/trip-completion-flight-workspace`，基线 `c9589d1`（保留PR #204成果，未自动合并）。4.42–4.45待审查；532项测试及三尺寸浏览器验收通过，不修改B Engine责任。
- 本轮实现提交 `8e4a4972fae0950041e28e5cc152234c975f14f7`，Draft PR #206 → develop；Task/Result见`docs/tasks/TASK-trip-preparation.md`与`docs/tasks/RESULT-trip-preparation.md`，未标记已完成。
- 同行人库仅浏览器明确保存，航班仅录入/购票需求/自行确认；“完成”不等于旅行结束、真实出票或手机助手就绪。原5.6 B范围成果保留，本轮由用户授权A做跨页衔接。

## Planner 本地最新修改整合（2026-09-08）

- Task：TASK-PLANNER-INTEGRATION-A / [#203](https://github.com/kanzakimy0/TravelAssist/issues/203)；分支 `codex/planner-local-integration-20260908`，基线 `6386c83`。本轮将旧3113预览中未提交的时间轴、Detail操作、酒店三餐与范围面板迁入最新develop，待审查，尚未合并。
- 旧本地WBS4.20–4.36与已合入Engine4.20–4.24冲突：保留Engine不变，旧UI记录整体顺延为4.25–4.41（旧编号+5）；旧Result中的数字是历史编号，不代表转移Engine所有权。
- 旧2.16“AI插画接入”登记为2.17，保留2.16日本目的地验收；旧全球素材描述不恢复，始终Japan-only。旧3.9/3.10重复描述已完成3.6/3.8，不重复计数或更改B原Owner；手机追加仍见现有历史Result。
- 已合并UI/Mock与真实Provider分开记录；本地公开Mapbox配置已获明确授权，仅保存在忽略文件内，联网验收见本轮Result。原工作树及用户保存数据保留。

## TASK-015-A 已合并验收 / B前置解除（2026-09-08）

用户授权后PR #186已合入develop：`24dff4e3b74dfe01c369d2c149d37eba86ad6472`，
文件树与已验收head `c14ea30747f317d6222cab1019e95611049d8fd1`完全一致。
8.1/8.4已完成（TASK-015基础范围）；#173同步关闭。#200要求的7项路径及真实
generated types均在基线，8.2改为可开始但未实施，B须拉取并自行复检后启动。
保留无PostGIS、Vector辅助日志限制和27份历史格式债的如实说明，不影响当前
User/Profile基础依赖。下方合并前/旧Docker阻塞记录仅供历史审计。

## TASK-015-A 合并前复验（2026-09-08）

用户授权 #186 合并收尾。真实类型提交 `b212c31` 已回并，整合基线 `6386c83`，
冲突处理 `0b97f79` 保留最新素材与 B Engine 记录。503测试、lint/typecheck/build、
Local start/status/reset/types/stop及Drizzle查询通过；8.1/8.4待审查，合并后再改已完成。
PostGIS未启用（Task允许空历史）；Vector辅助日志采集网络限制单独记录。#200仍待
确认#186正式合并；本轮不实施B业务Schema。下方旧DB阻塞状态以此节及最终收尾为准。


## 合并状态校正与 Engine 交接（2026-09-08）

- 用户授权现有阶段成果合并：PR #199 已合入 develop，merge `fba4086775d54d3acfc8dd4bd472e2a7a8c89e46`。297条证据版本修复进入基线；目的地最终验收仍 Partial，按追踪规则记“阻塞 / 待补证”，#189/#194保持Open，TASK-013.4未解锁。
- 文档基线 `2d9734731dcece9f90db1779da06a7a3c9e9bab7` 同时包含其他工作站合并的PR #197；保留其WBS-5.10-B-FOLLOWUP-1已验收记录，不重复操作该PR。
- 8.1/8.4不再误记未开始：#173已记载真实本机DB验证通过，但PR #186仍Draft/未合并，故保持待审查；8.2 / TASK-016-B / #200等待其合并。
- 新增TravelAssist Engine（现有架构中的Trip Engine）4.20–4.24，用户明确指定B，仅规划未实施。现有A的UI/Map/AI/Trip Plan Schema责任不变，不把浏览器Mock记为服务器引擎完成。
- 主工作区和3113预览旧未提交内容未打包，其他未验收Draft未批量合并。旧Draft状态以本节及当前追踪表为准。


## TASK-013.3.1-A 补证收口阶段交付（2026-09-08）

用户授权合并复验 PR #198，merge `3ad62711be8ab54a0c4fa039f9bd426e30128946`。PR #192 也已合并，#189 保持 Open；2.15 已合并复验，仍不表示图片完成。2.16 沿用主项，Partial / 待收口。本次修复297个 `oldid=undefined` 来源链接并刷新对应事实/版本，保留父门槛254/46；新增动态最终门槛发现300行缺少已审查的官方边界来源及明确规则，严格 fully_passed=0。已建立目标清单、补证记录、最终验收报告、下游逐字节保护和独立测试。TASK-013.4 allowed: No。TASK-013.3.1-A / #194 / feature/a-japan-destination-evidence-closure；实现 Commit `1daafbc`；Draft PR [#199](https://github.com/kanzakimy0/TravelAssist/pull/199)，文档追踪head见PR/Issue。不改UI，不生成或下载图片，不解锁POI。以下旧Draft与旧计数为历史，以当前Result及实际合并状态为准。

## TASK-013.2-A 最新 develop 复验（2026-09-08）

2.15：已合并生产清单；复验已合并（Partial）。基线 `81d4f6d0e0603b39ecaa434d332c5b4c5033a69d`；原 PR #187 已合并。本次保持 Japan-only，300/9000/9300/9600/40 数量不变，保留 TASK-013.3-A 的254 verified /46 unresolved目的地。55产物重复生成 SHA/mtime 无变化；23+44+51测试、lint/typecheck/build通过；format:check 有29项与基线一致的格式债，新增0。Issue #152 / feature/a-core-destination-generation-manifest；补充复验已合并 PR [#198](https://github.com/kanzakimy0/TravelAssist/pull/198)。无新图片、无UI或依赖修改，用户批准后于本轮合并，merge `3ad6271`；后续仅继续 TASK-013.3.1-A，不启动 POI 批次。以下交付与阻塞段落保留为历史，以本节和对应任务最新 Result 为准。

## TASK-013.3-A Partial 交付 / 待审查（2026-09-08）

PR #187 实际已合并，develop `553b01480345a4e26bd2b7952cf917b2cbbaea4f` 包含 Japan-only 生产清单。2.15 继续为 Partial / planning manifest，不代表图片已完成。TASK-013.3-A / Issue #189 / `feature/a-japan-destination-entity-resolution`：300 行已审查，285 身份核验、284 县归属、47 县覆盖、281 三语名称、258 可信中心坐标；254 行通过全部门槛，46 unresolved。300 条证据/候选审计、别名、边界契约及五项报告已生成。2.16 待审查（Partial；未达到300/300最终验收），Draft PR #192，实现 Commit `f3b4313`。9000 POI、9300 source jobs、9600 variants 不变；不修改 UI，不生成/下载图片，不启动后续批次。专项26测试、父清单23测试、lint/typecheck/build通过；全仓28项既有格式债另列基线审计。

## TASK-013.2-A Japan-only 交付（2026-09-08）

2.15：待审查 / Partial。300日本目的地、9000 unresolved 景点槽位、9300 source jobs、9600基础 variant expectations、40 JP batches 已生成。JNTO 目录124个县级匹配覆盖47县，176个归属尚待复核，300目的地生产实体验收及9000 POI解析未完成。23专项测试、44父素材测试、51衍生测试、lint/typecheck/build通过；55产物重复生成 SHA/mtime 不变。全仓 format 有既有文档债，具体基线审计见 Result。Draft PR #187 保持 Draft；无新图片、无 Provider 调用、不自动 merge。Issue #152 与 Result 同步。以下开始/阻塞检查保留为历史。

### 开始执行记录

前置已解除：PR #172 合并并验收，最终记录 PR #188 已合入 develop `95311fcbdc3432eb4b75cb0644cad7783fad7415`。2.15 进入进行中；复用 Draft PR #187。以下阻塞检查保留为历史，不代表当前状态。

### 历史前置阻塞复核（2026-09-08）

- WBS 2.15 / Issue #152 / Branch `feature/a-core-destination-generation-manifest`：阻塞。actual develop `e98a715a11e4a4ee9bdc196854558a5a02b1753c`；远端 Japan-only 规格 `d587415`。
- 最新 develop 已包含 #112 / TASK-013-A 的合并验收、Result、Asset Manifest / Registry / rights 规则，2.13 已完成。#116 仍 Open；PR #172 仍 Open / Draft / 未合并，尺寸 Profile、Variant Registry、夜间流水线、013.1 Result 和 2.14 已完成记录仍缺失；旧 #112 阻塞描述不再适用。
- Japan-only Seed 300 / JP300 / non-JP0 / jp-ID300 / S100 / A200 / quota9000；JP 批次 CSV 40 / max10 / max420 / planned variants9600 只读验证通过。47 都道府县覆盖尚未验证。没有生成 Manifest / Jobs / Batch JSON，未开始实现。
- Result：`docs/tasks/RESULT-TASK-013.2-a-core-destination-generation-manifest.md`。仅文档记录提交，SHA 见 Issue #152；不创建实现 PR，不自动合并，不轮询等待。
- 既有自动化文档 PR #187 已由非 Draft 转为 Draft，防止阻塞期间自动合并；本轮未新建 PR，未开始实现。

## TASK-013.1-A 最终验收（2026-09-08）

用户授权验收合并。PR #172 已合入 develop，merge `b635465c623a4e628c9c9986253ee9266be39541`，文件树与验收 head `2cb487284572a24eaf6f4cc5ab98a5099501f23a` 相同。1,141 sources / 3,550 logical variants / 0 新增图片字节；406 全仓测试、素材校验、lint/typecheck/build、两次完整运行 no-op 和 resume、双尺寸浏览器验收通过。30 份既有 develop 文档格式问题如实记录，未伪报通过。2.14 / TASK-013.1-A 已完成；Issue #116 与 Result 同步。下方旧 Draft / 待审查描述为历史，由本记录及追踪表覆盖。013.2 须在此完成记录合入 develop 后单独开始，维持 Japan-only。

## WBS 9.12 用户验收与合并收尾（2026-09-07）

- 用户明确确认“验收通过”并随后授权合并；PR #184 已合入 develop，merge `89fd34aed29779ce15720d240727c7f65fd7b7bc`。
- WBS 9.12 的响应式 / 可访问性 QA 范围已完成，状态更新为“已完成（用户验收通过）”；Issue #181 按任务约束保持 Open。
- Firefox / WebKit 因当前环境无既有 runtime、Safari 因无真机而保留 Deferred，不将其写为 PASS；本收尾仅更新追踪文档，不扩大业务范围。
- 不继续 5.11 / 5.12 / 8.2 / 8.3 / 5.3 / 5.16 / 5.17 / 9.5 / 9.6。

## PR #139 用户授权合并收尾（2026-09-07）

- 用户在冲突解决后明确授权“合并”；PR #139 已合入 develop，merge `1b14963962138f452ff53d8008934d372e677b21`。Issue #135 / TASK-012-A follow-up 当前授权补修范围已完成；下方 Draft、待审查、未合并说明均为阶段历史，不代表最新状态。
- 最终验收 head `d0c3fd6ca28c2affd4702aacdaa2a753f8d06edf` 与 GitHub 合并提交的 Git tree 完全相同（`ab5e181374b2938b60611d49b65709f809de5eed`）；343 tests、lint / typecheck / build、素材校验及集成浏览器 smoke 结果适用于合并树。
- 未把未接入的真实路线 / 预约 / AI / DB 或真实 Mapbox 令牌配置标为完成；4.14 等更大业务项保持原状态。31 份基线格式问题仍保留。
- 交付 / 冲突 Result 已同步最终合并状态；仅做追踪文档收尾，不改业务代码，不继续后续 Task。

## PR #139 冲突解决与 develop 同步（2026-09-07）

- 用户授权“处理冲突”；将 `origin/develop` 的 `99f3ddb7d6bad0c5d1bf0937b310be6acc7bb031` 合入 `codex/planner-responsive-density`，合并提交 `ed86578a43096f0fd045f9cb19a1eb7c5d6ffffd`；保持 Draft PR #139，不合并 PR、不改 develop。
- 唯一冲突为本文件顶部双方新增记录；完整保留 Planner / Detail 各阶段记录，以及 develop 的 WBS-0.9-B / TASK-013-A 收尾与后续追踪表更新，没有选择整份 ours / theirs 覆盖。
- Planner / Start 业务代码与上传快照一致；个人中心 / 偏好 / 同行人 / 账户 / 旅行库 / 素材 Registry 和依赖清单与 develop 一致。
- 集成验证：343 tests、lint / typecheck / build、assets:validate、冲突文件格式与相对 develop 的 diff check 通过。31 个全仓格式异常及六份上游文档的 Markdown 换行尾空格保持原样。浏览器确认 Planner → Detail → 返回推荐、个人旅行库 → 新建旅程 Step 3 正常，未见 console / hydration 错误。
- 状态仍待验收 / 待审查；详细记录与已知限制见 `docs/tasks/RESULT-PR-139-develop-conflict-resolution.md`。下方快照阶段“冲突尚未处理”记录为历史，以本节为准。

## 当前 Planner / Detail 内容统一打包交付（2026-09-07）

- 用户授权将当前内容打包上传 GitHub；沿用 Issue #135、`codex/planner-responsive-density` 和 Draft PR #139 → develop，不自动合并。
- 汇总此前所有本地修正：共享项目详情、浏览器保存、详情总览 / 预约演示、方案 / 备用景点与交通联动、快捷菜单、Step 手机适配、背景与五张 AI 插画、配套测试和历次 QA 证据。
- 当前状态：待验收 / 待审查；770 个文件的快照提交 `28a1666012deb75e3ff5cc81c1d9412bc3da89ab` 已推送到 origin 同名分支。以下阶段记录的“未上传”属于当时历史状态，最新交付以 `docs/tasks/RESULT-planner-current-snapshot-2026-09-07.md` 为准。
- lint / typecheck / build / 243 tests / 本次文件格式 / diff check 通过；全仓仍有 25 个未修改的基线格式问题。PR 与最新 develop 有冲突，本次只交付快照，未处理集成冲突，不标记 develop 已完成。

## Planner 现有插画接入（2026-09-07，本地待审查）

- 按用户授权接入 5 张已有 AI 插画：东京塔、晴空塔、浅草寺、富士山 / 河口湖、箱根 / 芦之湖。覆盖匹配地图标记、三方案缩略图与共享项目详情；保留 AI 标识与缺图 fallback，不替换无明确匹配的酒店、餐厅或其他景点。
- 243 tests、lint / typecheck / build、本次文件格式与 diff check 通过；1280×720 浏览器验证图片加载、单日 / 全日、Planner / Detail 详情联动。预览仍缺 Mapbox Token，真实底图未浏览器实测，不将素材接入等同于底图恢复。
- 3113 已重建并重启；未提交 / 推送 / 合并，不改变 TASK-013 系列或既有 Issue / PR 状态。Result：`docs/tasks/RESULT-planner-artwork-integration.md`。

## 等大折叠卡与共享景点分栏追加（2026-09-06）

- 最新覆盖：下方提醒 / 预约向上展开为主卡同宽同高，不移动邻卡或增高底栏；Planner / Detail 地图统一保留 2/3，右侧 1/3 景点详情，手机保留浮层。
- 198 tests、lint / typecheck / build、两页五尺寸及保存保护回归通过。见 `docs/tasks/RESULT-shared-sight-panel.md`。3113 已更新；未提交 / 推送 / 合并，不改变正式任务状态。

## Detail 紧凑行程栏与景点分栏追加（2026-09-06）

- 覆盖下述三层常展开布局：底栏恢复 25dvh，卡宽缩为约 2/3，类别色区分；提醒 / 预约点击向上展开，无需预约及无可用渠道占位隐藏。
- 桌面景点点击后原地图等分为地图 / 景点详情，保持同一 Map 生命周期；手机用详情浮层，图层栏恢复 Planner 同款纵向样式。
- 198 tests、lint / typecheck / build 及五尺寸浏览器验收通过，保存保护回归通过。见 `docs/tasks/RESULT-detail-compact-board.md`。3113 已更新，未提交 / 推送 / 合并，不改变既有正式任务状态。

## Detail 等宽三层执行卡片追加（2026-09-06）

- 全部项目等距置于时间轴下，三层圆角方卡分别承载行程、提醒处理、预约；预约入列 / 手动确认 / 取消记录 / 消息草稿 / 受保护酒店替换已接入。仅详情展开栏加高，保留收起及返回 / 保存。
- 194 tests、lint / typecheck / build 通过；五尺寸卡片与预约 / 保存恢复验收、四尺寸保存保护回归通过。见 `docs/tasks/RESULT-detail-itinerary-board.md`。3113 已更新，未提交 / 推送 / 合并。

## Planner 快速设置深入菜单追加（2026-09-06）

- 保留五卡二级设计；景点 / 餐饮 / 住宿深入菜单改为分组点选，分别仅留 2 / 1 / 1 项可选手动填写。草稿取消、Esc、应用和旧值保留；同行人数和日历不变。
- 191 tests / lint / typecheck / build 通过，四尺寸菜单交互和五卡位置稳定性验证通过。Result：`docs/tasks/RESULT-planner-detail-choices.md`。3113 已更新，未提交 / 推送 / 合并，不改变既有 Issue / PR 状态。

## Planner / Detail 旅景玻璃背景追加（2026-09-06）

- 按用户图片复用现有高清樱花海岸富士山列车背景；外层面板与留白半透明、卡片维持高遮盖度，地图不替换为图片。范围仅共享 Planner / Detail 工作区。
- 四尺寸前后截图与几何比较通过，推荐卡尺寸完全一致；真实 Mapbox 显示、fallback 下六 Tab / 加号 / 设置 / Detail 入口回归通过。187 tests / lint / typecheck / build / 本轮格式 / diff-check 通过。
- 3113 已更新，本地未提交/未推送/未合并，保持既有 Issue / PR 状态。Result：`docs/tasks/RESULT-planner-scenery.md`；证据 `docs/qa/planner-scenery/`。

## Planner 职责拆分 / 底部内容重排追加（2026-09-06）

- 六选单最新交互：默认收起，点击当前选单等宽向上延伸；展开时不显示“详细信息”及重复图标，说明内容利用原标签空间，仅保留底部 28px 收起箭头区域。收起后恢复原选单名称与向上箭头。内容加入实际景点与指标解释，覆盖此前独立 330px 小窗规则。四尺寸六栏衔接和下方执行区尺寸回归通过，187 tests / lint / typecheck / build 通过；3113 已更新，仍未提交/合并。
- 时间轴追加：Planner 单日 / 三日只展示景点，与 Detail 共用时间卡轨道；Detail 保留完整项目并显示绿 ✓ / 黄 ! / 红 × 状态圆点。五尺寸浏览器检查、状态变化和冲突保护通过，188 tests / lint / typecheck / build 通过。见 `docs/tasks/RESULT-planner-shared-timeline.md`；3113 已更新，未提交/合并。

- 最新补修：摘要窗宽缩至 330px，说明默认折叠；移动段改为独立三等分卡片，每卡“接受 / 忽略 / 加号”，更多决定五项。四尺寸三等分、独立状态、弹窗尺寸与焦点验证通过，187 tests / lint / typecheck / build 通过；3113 已更新，仍未提交或合并。

- 用户追加范围：Planner 不办理预约，仅推荐区域与理由；酒店/餐厅候选与预约转入 Detail。同行人补老人；更多设置靠近入口；六 Tab 单日摘要改为可折叠浮层；移动三段、预约待购票筛选、备选影响预览、住宿餐饮三分区。
- 状态：本地实现并验收，尚未 commit / push / merge；分支 `codex/planner-responsive-density`。保留此前全部未提交改动，不改变 Issue #135 / Draft PR #139 已推送范围或任何正式 Task 完成状态。
- 验证：187 tests、lint / typecheck / build / 本次文件格式 / diff-check 通过；1440/1024/390/320 四尺寸六 Tab、老人、设置取消、嵌套 Escape、Planner → Detail 预约入口通过；四尺寸浏览器保存、放弃修改、并发写入/容量失败保护和 Map 生命周期回归通过。
- Result：`docs/tasks/RESULT-planner-panel-boundaries.md`；证据 `docs/qa/planner-panel-boundaries/`；生产预览已更新至 3113。

## 方案入口 / 快捷弹层稳定性追加（2026-09-06）

- 本地已实现，尚未 commit / push / merge；保持既有 PR 状态。方案卡单按钮先选择、再以“进入详细路线”进入 Planner；删除额外地图入口。固定侧向快捷弹层的打开基准位置，小屏搜索改为独立下方浮层。
- 已复现住宿详细分区切换导致 82px 跳动、390/320px 搜索覆盖 Logo；四尺寸修复验证与三方案 × 三尺寸跳转通过，184 tests / lint / typecheck / build / 改动文件格式 / diff-check 通过。
- Result：`docs/tasks/RESULT-plan-entry-popup-stability.md`；证据 `docs/qa/planner-stability/`；3113 已更新。

## Step 1–5 手机优化追加（2026-09-06）

- 用户追加范围：仅优化手机竖屏/横屏的向导布局、日期与弹窗可用性；保留横向四步、背景、兴趣/滑轨/目的地数量及草稿模型，不改 Planner 业务。
- 状态：本地实现并验收，尚未 commit / push / merge；不改变正式 Task / PR 的状态。
- 验证：30 张生产预览截图、四尺寸交互回归、184 tests、lint / typecheck / build / diff-check 通过；1440×900 Step 1/2/3/5 前后 PNG 完全一致。
- Result：`docs/tasks/RESULT-start-mobile.md`；证据：`docs/qa/start-mobile/production-layout/`、`docs/qa/start-mobile/production-interactions/`；预览 `http://127.0.0.1:3113/start`。

## Detail 浏览器保存追加（2026-09-06）

- 操作布局追加：返回/保存位于新增行程左侧；手动或响应式收起后保留贴底操作栏，支持展开。六尺寸布局验收与原保存保护回归；仍为本地未提交追加，不改 PR 合并状态。

- 用户确认先实现浏览器保存，不接数据库。状态：本地待验收，尚未 commit / push / merge；不改变任何正式数据库 WBS 的完成状态。
- 范围：详情显式保存、Planner 只应用调整、返回/放弃/保存失败保护、刷新与打开已保存副本。保持既有共享 Workspace / Map 生命周期和推荐方案结构。
- Result：`docs/tasks/RESULT-browser-trip-save.md`；证据 `docs/qa/browser-trip-save/`。前序 PR #139 / Issue #135 的已推送记录保持原状。

## TASK-012-A 响应式密度补修（2026-09-06）

- 子菜单重设计追加：同行人数量卡、日期区间日历、37 个快捷选项分组、54 个详细字段三分区表单；范围限五卡子菜单，模型/工作台/推荐卡不变。178 tests、五尺寸 × 双动效菜单编辑/日历草稿与保护检查通过；设计 `docs/ui/planner-quick-settings-menus.md`，证据 `docs/qa/planner-density/menu-redesign/`，仍待审查 / Draft PR #139。

- 用户复验补修：右栏五卡/三级偏好弹层移至 top layer，修正普通动效下 fixed 坐标越界；五尺寸 × 两种动效共 80 次真实可见/可点击/编辑/焦点检查通过，171 tests / lint / typecheck / build 通过；继续使用 Draft PR #139，状态待审查。原 reduced-motion/DOM 检查未覆盖该缺陷，完整更正与证据见 Result。

- Issue：#135；Owner：A；WBS：1.5 / 1.6 / 1.7 / 4.1 / 4.8 / 4.14（既有 Planner UI 补修）。
- 状态：待审查；历史 TASK-012-A / #111 / PR #124 的已合并状态不变。
- 基线：`c88d3381685615fcd0e1dd9e3217bd871e50c2ac`；分支：`codex/planner-responsive-density` → `develop`。
- 范围：实际 25dvh 贴边底栏、移除顶部 Day summary、响应式内容、紧凑日期菜单、图层控件、快速设置与全宽详情入口、搜索边界及右侧渐变；推荐方案冻结，无业务/API 扩展。
- Task / Result：`docs/tasks/RESULT-TASK-012-a-responsive-density-followup.md`；实现 `660af61`，集成验收 `bcc898f`（同步验证时 develop `4161a8a`）；170 tests / lint / typecheck / build、九视口双地图几何及截图、六视口 Detail 回归通过；[Draft PR #139](https://github.com/kanzakimy0/TravelAssist/pull/139)；不自动合并。

## WBS-0.9-B 执行记录（2026-09-07）

- 用户明确将 WBS 0.9「跨模块 Contract 交接规则」改派给 B 并要求立即执行；0.8 仍为进行中，因此 0.9 以“规则先行、与 0.8 并行”完成，不重新划分 A/B 业务 Owner。
- Owner：B；Status：待审查；Issue：#168（Open）。正式规范：`docs/architecture/cross-module-contract-handoff.md`；Result：`docs/tasks/RESULT-WBS-0.9-b-contract-handoff-rules.md`。
- Kickoff 分支 `feature/b-wbs-0-9-contract-handoff-rules` 因仓库 `feature/**` 自动化被自动创建并合入 PR #169/#170；#170 merge `707bcc8d2af14a86032181be63573beb3aea3e17` 只代表初稿进入 develop，不代表用户最终验收。
- 最终收尾使用 `review/b-wbs-0-9-contract-handoff-finalize`，Draft PR [#171](https://github.com/kanzakimy0/TravelAssist/pull/171) → develop，避免 `feature/**` 自动合并；在用户验收前不合并、不关闭 #168、不标记已完成。
- 仓库审计确认：当前无 `src/shared/contracts/**`；`src/types/` 仅 `.gitkeep`；Preference 模型、Planner runtime/presentation model、Trip Library ViewModel 均保持模块内部，0.9 不提前实现 5.14 / 4.17 / 5.19 runtime Contract。

## TASK-013-A 合并验收收尾（2026-09-07）

用户明确授权“合并后执行”TASK-013.1。父任务 PR #166 已合入 develop，merge `aee2eaec3ac841395de1737a3042a112ad6fa6ea`；与验收 head `34928c57cd4f0b3cc80bb27e93701b11021fb181` 文件树完全相同。assets:validate / 44 项专项测试合并前再次通过；原 267 tests、lint/typecheck/build、69 SVG 浏览器验证有效。2.13 / TASK-013-A 已完成；Issue #112 同步最终验收。下方初次交付记录保留为历史，当前状态以本条和追踪表为准。013.1 尚需单独执行，不提前标记其完成。

## TASK-010-B v1.1 — 全局 Logo / Personal Center 导航（2026-09-06）

- Merge closeout：用户明确授权后，PR #108 已合入 develop，merge `f105253b1f700f67fd97d8c9eb03a9c85000d699`；Issue #79 Closed。最终基线 `e052d93`，验收 head `a4306e2`，合并树相同；123 tests / 76 Logo QA / lint / typecheck / build / diff-check 复验通过。全仓格式 27 项均为核实过的基线异常（原 26 项加 TASK-WBS-5.8 文档）。下方历史基线记录保留，最新状态以本条为准。手机 Detail 返回入口仍是上游范围外缺口。

- WBS：3.1 / 5.1 / 5.10 / 5.20 的导航子集；Owner：A+B / Shared Navigation。
- Status：已完成（仅导航子集）；Issue：#79；Branch：`fix/shared-global-logo-navigation`；实现 Commit：`0e581513e72b5890b77bf74f6f369fc73f6538f0`；PR：[#108](https://github.com/kanzakimy0/TravelAssist/pull/108) → develop（已合并，用户明确授权）。
- Integrated develop：`8b83628f60e7dd2a07231a59ca448c4dc5af510d`；无冲突同步 `fcd934e6d13d21f9aea0736385038a8c1336a5fe`，复验提交 `fe17962532f705556c3ca69c0871f593d366acfa`；复用现有分支 / PR，未重复实现，上游业务不计本 Task 实现。
- Initial Base：`a567dffc5930523cb0917889abab9ac9b8cebf19`（origin/develop）；文档来源：Draft PR #106 / `533801b320f48371fda0dac4f3747594ec6df2f2`。未从文档分支开发。
- Scope：首页 Logo 链接化、Personal Center 双端 GuardedLink Logo → `/`、Personal Home / Trips 四个主流程出口。原 WBS 5.1 已合并成果不回退；5.10 / 5.20 的完整业务状态不因导航子集完成而提前完成。
- Dependency：TASK-010-A / #78 / PR #101、TASK-011-A / #86 / PR #102 均已合并；后者 merge `4c1d9bb` 是本基线祖先。Detail Logo 四尺寸通过，1440 / 1024 返回 Planner 保留 Map DOM；390 / 320 的上游导航隐藏，返回入口不可用，保留为受保护范围的遗留问题，不计通过。
- Conflict guard：不修改 Planner 目录、Planner page、`tests/task-010-navigation.test.mjs`；不 cherry-pick PR #102。
- Result：`docs/tasks/RESULT-TASK-010-b-personal-center-navigation.md`；验收证据：`docs/qa/TASK-010-B/`。不自动合并。
- Validation：npm ci / lint / typecheck / build / diff-check 通过；npm test --if-present 无配置测试（未运行），另外显式运行 123/123 Node tests；76/76 Logo QA、四动作 / Guard / 历史 / 键盘四尺寸通过，0 新 console / hydration error。全库格式 26 项既有基线异常逐项比对未变且独立复验失败，本任务文件通过（WBS 维持已有格式排除）。

> 版本：v0.4  
> 更新日期：2026-09-07
> 适用阶段：Web 优先，移动 App 后续  
> 开发方式：A 主开发约 70%，B 协作约 30%，ChatGPT / Codex 辅助开发  
> **v0.4 分工原则：A 负责旅行主系统（网站入口、地图、路线/行程生成、主规划画面及对应开发）；B 负责用户通过头像进入的个人中心（账户、个人管理、偏好、同行人、保存/历史等界面及对应开发）。**

---

## 1. 使用规则

### 1.1 状态枚举

| 状态     | 含义                           |
| -------- | ------------------------------ |
| `未开始` | 尚未进入开发                   |
| `待确认` | 需求、设计或依赖仍需确认       |
| `可开始` | 前置依赖已完成，可以创建 Task  |
| `进行中` | 已建立 feature 分支并开发      |
| `待审查` | 已完成代码，等待 Review / PR   |
| `阻塞`   | 因依赖、技术或其他原因无法继续 |
| `已完成` | 已合并到 `develop` 且验收通过  |
| `取消`   | 决定不再实施                   |

### 1.2 GitHub 记录原则

1. 每个正式工作项必须有唯一 WBS ID。
2. 进入开发前建立对应 `TASK-xxx-*.md`，统一存放在 `docs/tasks/`。
3. 生成新 Task 前，必须检查 GitHub 上最新 A/B Task、Issue、PR 和 `origin/develop`。
4. 每个开发 Task 原则上对应一个 GitHub Issue 和一个独立 feature 分支。
5. 不直接在 `develop` 上做功能开发。
6. Task、Result、WBS 都必须备份到 GitHub。
7. Codex 返回结果前必须更新本 WBS。
8. 实现完成但 PR 未合并：`待审查`；PR 合并并验收通过：`已完成`。
9. 新 Task 分配负责人时，必须先应用 v0.4 的“旅行主系统 / 个人中心”责任边界。
10. 本次 v0.4 明确覆盖 v0.3 中“所有客户可见界面都归 B”的旧规则。

---

# 2. A / B 长期责任边界（v0.4）

## 2.1 A：旅行主系统 Owner

A 负责用户进入网站后，用来“规划旅行”的主系统画面与对应开发工程。

### A 负责的画面

- 网站首页 / Landing / 动画背景
- 顶部主导航、主 App Shell
- 「让我们开始吧」入口
- 首页登录按钮 / 头像入口在主系统中的位置与触发
- 目的地输入、日期输入、开始规划入口
- 地图主画面
- 景点 Pin、住宿区、餐饮区等地图可视化
- 多日路线、步行/电车/公交等交通路线呈现
- 行程生成 / 路线生成主画面
- 底部时间轴
- 推荐方案 1/2/3
- 行程方案切换
- 主规划画面中的快速调整与临时设置
- AI 旅行助手主对话界面
- AI 修改行程、重新规划、推荐理由等主系统交互
- 主系统 Loading / Empty / Error / 响应式

### A 负责的开发工程

- Planner 状态模型 / Store / Day Plan Core
- Trip Plan / Route / POI 等主系统核心 Schema
- 地图 Provider、POI Provider、Route / Transit Provider
- 路线计算、地点搜索、POI 详情、缓存和降级
- 推荐排序与行程生成逻辑
- AI Prompt / Tool / Action / Agent / 行程生成修改逻辑
- 主系统对应 API、Service、Contract
- 主系统单元测试、集成测试和 E2E
- 全局工程架构、Node/npm/TypeScript、Lint、CI/CD
- 全局日志、安全、性能、监控、部署、发布

> 原则：**用户正在“规划旅行”的页面和功能，默认归 A。**

---

## 2.2 B：用户个人中心 Owner

B 负责用户点击头像后进入的“自己的界面”，以及个人资料、管理和长期偏好相关功能。

### B 负责的画面

- 头像菜单 / Personal Center 入口后的界面
- 登录、注册、忘记密码等账户流程页面
- 个人中心首页
- 用户资料 / Profile
- 账户设置 / 安全设置
- 偏好管理中心
- 旅行偏好大/中/小项目编辑
- 同行人资料管理
- 预算、住宿、餐饮、移动、活动等长期偏好设置
- 用户保存的行程
- 行程历史 / 草稿 / 收藏
- 用户自己的行程管理界面
- AI 会话历史（如果放在个人中心）
- 个人数据管理 / 删除账户
- 个人中心 Loading / Empty / Error / 响应式

### B 负责的开发工程

- User / Profile 模块
- Authentication 用户流程实现
- Preference Schema / Preset / 持久化
- Companion 数据与 API
- 用户账户 / 偏好 / 个人管理相关 API
- 保存行程 / 历史 / 草稿 / 收藏的持久化与个人管理 API
- Personal Center 状态管理
- B 模块自己的单元测试、集成测试和 E2E

> 原则：**用户点击头像后，为“管理自己”而使用的页面和功能，默认归 B。**

---

## 2.3 A/B 边界实例

### 首页 + 登录

```text
A：主页、Header、登录按钮/头像入口的位置和视觉
B：登录页、注册页、账户 Session 用户流程、个人中心
```

### 偏好

```text
B：偏好 Schema + 持久化 + 个人中心偏好编辑 UI
A：Planner 读取 B 提供的偏好 Contract，并用于行程生成/推荐
```

### 保存行程

```text
A：生成 Trip Plan，并定义可保存的 Trip Contract
B：保存/读取/历史/草稿/收藏，以及个人中心的行程管理 UI
A：Planner 中的“保存”按钮调用 B 提供的保存 Contract
```

### 地图与路线

```text
A：地图 UI + Provider + Route Schema + 路线生成 + 可视化 + 时间轴
B：不负责地图/路线主系统，除非未来个人中心需要一个只读小地图组件
```

### AI

```text
A：主系统 AI 对话、Prompt、Action、修改行程和推荐理由
B：个人中心中的 AI 历史/个人数据管理（如实现）
```

---

## 2.4 跨模块工程规则

1. 主系统和个人中心尽量分目录、分 Task、分 Branch。
2. A/B 不同时修改同一高冲突文件。
3. A 负责全局架构与共享基础设施。
4. B 可以独立拥有个人中心模块内部的前端、API、Schema 和测试。
5. A 主系统需要用户偏好/账户数据时，通过 B 模块公开 Contract 消费，不直接绕过模块边界。
6. B 保存行程时，通过 A 定义的 Trip Plan Contract 消费主系统数据。
7. 跨模块 Contract 变更必须在 Task 中明确双方影响。

建议目录方向：

```text
A Owner
src/app/(main)/
src/features/planner/
src/features/map/
src/features/routing/
src/features/ai/
src/core/
src/lib/maps/
src/lib/routing/
src/lib/ai/

B Owner
src/app/(account)/
src/features/personal-center/
src/features/profile/
src/features/preferences/
src/features/companions/
src/features/trip-library/

Shared / A architecture review
src/shared/
src/types/
src/server/
src/db/
```

---

# 3. 项目级里程碑

| Milestone | 名称                      | 目标                                | 负责人                | 状态   |
| --------- | ------------------------- | ----------------------------------- | --------------------- | ------ |
| M0        | 工程基础完成              | A/B 均可稳定开发、测试、PR          | A 主 / B 工作站初始化 | 进行中 |
| M1        | 画面与模块边界冻结 v1     | 主系统与个人中心设计边界明确        | A+B                   | 进行中 |
| M2        | 网站入口 / Main Shell     | 首页、导航、入口、头像跳转可用      | A                     | 未开始 |
| M3        | Planner / 地图 / 路线 MVP | 主规划系统可生成并展示行程          | A                     | 未开始 |
| M4        | 个人中心 MVP              | 账户、偏好、同行人、行程管理可用    | B                     | 未开始 |
| M5        | AI 助手 MVP               | AI 可生成并修改行程                 | A                     | 未开始 |
| M6        | A/B 数据联动完成          | 偏好输入 Planner、Trip 保存个人中心 | A+B                   | 未开始 |
| M7        | Web MVP 可发布            | 端到端主流程通过                    | A+B                   | 未开始 |
| M8        | Web Beta                  | 测试、安全、性能、监控完善          | A 主 / B 模块 QA      | 未开始 |
| M9        | Mobile App                | 延续相同 A/B 模块边界               | A+B                   | 未开始 |

---

# 4. Master WBS

## 0. 项目管理与协作

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
|---|---|---|---|---|---|
| 0.1 | GitHub 仓库与 `develop` 工作流建立 | A | P0 | - | 已完成 |
| 0.2 | A/B feature 分支规则 | A+B | P0 | 0.1 | 已完成 |
| 0.3 | Task 文件编号与存档规范 | A | P0 | 0.1 | 已完成 |
| 0.4 | WBS 主表建立 | A | P0 | 0.1 | 已完成 |
| 0.5 | GitHub Issue / PR 模板 | A | P1 | 0.3 | 已完成 |
| 0.6 | Definition of Done | A | P1 | 0.3 | 未开始 |
| 0.7 | Codex 自动更新 WBS 流程 | A+B | P0 | 0.4 | 已完成 |
| 0.8 | A/B 主系统 / 个人中心责任边界固化 | A | P0 | 0.4 | 进行中 |
| 0.9 | 跨模块 Contract 交接规则 | B | P0 | 0.8 | 待审查 |

### 当前 Task 追踪记录

TASK-013.1-A：2026-09-08 用户授权验收合并后继续 013.2。已安全整合 develop `e98a715`（无冲突）；重建清单为 1,141 sources / 3,550 logical variants / 0 新增图片字节，51 专项与父素材测试、lint/typecheck/build 通过，30 项既有 develop 格式例外逐份核实，重复运行与浏览器证据更新。当前仍待合并验收，完成后再进入 013.2。旧 311 sources / 1,060 variants 属于 2026-09-07 历史。Result：`docs/tasks/RESULT-TASK-013.1-a-asset-catalog-derivatives.md`；业务 UI 与原图未修改。

| Task ID | WBS ID | Owner | Status | GitHub Issue | Task File | Branch | Commit | Pull Request |
|---|---|---|---|---|---|---|---|---|
| TASK-019-A | 8.5 | A | 待审查（真实 Local 验收通过，未合并） | #226 Open | `docs/tasks/TASK-019-a-trip-plan-schema.md` / `docs/tasks/RESULT-TASK-019-a-trip-plan-schema.md` | `codex/a-trip-plan-schema` | `b8a5ad5`（实现）；后续仅追踪记录 | [#227](https://github.com/kanzakimy0/TravelAssist/pull/227) Draft → develop |
| TASK-013.2-A | 2.15 | A | 已合并生产清单（Partial；实体/图片待后续） | #152 | `docs/tasks/TASK-013.2-a-core-destination-generation-manifest.md` | `feature/a-core-destination-generation-manifest` | `d3fe001`（实现）；合入 `c28c14c`；复验 `5633deb` | [#187](https://github.com/kanzakimy0/TravelAssist/pull/187) Merged；[#198](https://github.com/kanzakimy0/TravelAssist/pull/198) Merged；合入 `3ad6271` |
| TASK-013.3-A | 2.16 | A | 已合并阶段实现（Partial；未最终验收） | #189 | `docs/tasks/TASK-013.3-a-japan-destination-entity-resolution.md` | `feature/a-japan-destination-entity-resolution` | `f3b4313`；合入 `2ea0bbf` | [#192](https://github.com/kanzakimy0/TravelAssist/pull/192) Merged |
| TASK-013.3.1-A | 2.16 | A | 阻塞 / Partial（版本修复已合并；最终补证未完成） | #194 / #189 | `docs/tasks/TASK-013.3.1-a-japan-destination-evidence-closure.md` | `feature/a-japan-destination-evidence-closure` | `1daafbc`（实现）；基线 `3ad6271` | [#199](https://github.com/kanzakimy0/TravelAssist/pull/199) Merged `fba4086` / Partial |
| TASK-WBS-4.20-B | 4.20（规划4.21–4.24） | B | 未开始 / 任务已定义 | #201 | `docs/tasks/TASK-WBS-4.20-b-travelassist-engine-contract.md` | `feature/b-travelassist-engine-contract`（计划） | PENDING（未实现） | PENDING（B实现PR未创建） |
| TASK-PLANNER-INTEGRATION-A | 4.37/4.38/4.40/4.41；7.12 | A | 已完成（UI/本地Mock） | #203 | `docs/tasks/TASK-planner-local-integration.md` | `codex/planner-local-integration-20260908` | `0006814`（实现；后续仅追踪同步） | [#204](https://github.com/kanzakimy0/TravelAssist/pull/204) Merged；随#211整合验收，561测试通过 |
| TASK-TRIP-PREPARATION-A | 4.42–4.45 | A | 已完成（本地Mock） | #205 | `docs/tasks/TASK-trip-preparation.md` | `codex/trip-completion-flight-workspace` | `8e4a497`；整合 `13a316a` | #206 / #211 Merged |
| TASK-PLANNER-TRACK-A | 4.46 | A | 已完成（本地Mock） | #210 | `docs/tasks/TASK-planner-track-actions.md` | `codex/planner-independent-tracks-plan-actions` | `5879444`；整合 `7c4bcbe`；合入 `13a316a` | #211 Merged |
| TASK-PLANNER-AUDIT-A | 4.2/4.25/4.26/4.32/4.42/4.46 | A | 已完成（七项审计修复合并验收） | #223 Closed | `docs/tasks/TASK-planner-audit-fixes.md` | `codex/a-planner-audit-fixes` | `ecbf022`（实现）；`654dad9`（合并）；后续仅文档收尾 | [#224](https://github.com/kanzakimy0/TravelAssist/pull/224) Merged |
| TASK-015-A | 8.1 / 8.4 | A | 已完成（基础范围；运行及整合验收通过） | #173 | `docs/tasks/TASK-015-a-db-orm-migration-foundation.md` / `docs/tasks/RESULT-TASK-015-a-db-orm-migration-foundation.md` | `feature/a-db-orm-migration-foundation` | `c14ea30`（验收）；`24dff4e`（合并） | [#186](https://github.com/kanzakimy0/TravelAssist/pull/186) Merged |
| TASK-016-B | 8.2 | B | 已完成（用户验收通过且已合并） | #200 Closed | `docs/tasks/TASK-016-b-user-profile-schema.md`（spec分支） | `feature/b-user-profile-schema` | 实现 `27a7ba8`；复验 `0eab355`；合并 `d118d4d` | [#209](https://github.com/kanzakimy0/TravelAssist/pull/209) Merged |
| TASK-018-B | 8.3 | B | 已完成（用户授权现场验收通过且已合并） | #214 Closed | `docs/tasks/TASK-018-b-authentication-core.md`（spec分支） / `docs/tasks/RESULT-TASK-018-b-authentication-core.md` | `feature/b-authentication-core` | 基线 `39890af`；实现 `7e84dd0`；复验 `371191f`；merge `7f805e0` | [#218](https://github.com/kanzakimy0/TravelAssist/pull/218) Merged；621 tests / Auth 16 / RLS 25 PASS；不启动下一 Task |


| WBS-0.9-B | 0.9 | B | 待审查 | #168 | `docs/tasks/TASK-WBS-0.9-b-contract-handoff-rules.md` | `review/b-wbs-0-9-contract-handoff-finalize`（kickoff: `feature/b-wbs-0-9-contract-handoff-rules`） | `e8fbb45`（最终规范）；`300973d`（Result） | [#171](https://github.com/kanzakimy0/TravelAssist/pull/171) Draft；[#169](https://github.com/kanzakimy0/TravelAssist/pull/169)/[#170](https://github.com/kanzakimy0/TravelAssist/pull/170) 为自动化 kickoff 历史 |
| TASK-013-A | 2.13 | A | 已完成 | #112 | `docs/tasks/TASK-013-a-asset-library-foundation.md` | `feature/a-asset-library-foundation` | `4c56dac`（实现）；`aee2eae`（合并） | [#166](https://github.com/kanzakimy0/TravelAssist/pull/166) 已合入 develop，用户授权并验收 |
| TASK-013.1-A | 2.14 | A | 已完成 | #116 | `docs/tasks/TASK-013.1-a-asset-catalog-derivatives.md` | `feature/a-asset-catalog-derivatives` | `2cb4872`（验收）；`b635465`（合并） | [#172](https://github.com/kanzakimy0/TravelAssist/pull/172) Merged |
| TASK-003-B | 0.7（关联 0.3、0.5） | B | 已完成 | #18 | `docs/tasks/TASK-003-b-tracking-integration.md` | `feature/task-003-b-tracking-integration` | `b591030` | #21 |
| TASK-004-A | 1.4 / 1.16 | A | 已完成 | #20 | `docs/tasks/TASK-004-a-homepage-final-visual.md` | `feature/a-homepage-final-visual` | `bfa5081` | #23 |
| TASK-005 | 3.6 / 3.8 | B | 已完成 | #28 | `docs/tasks/TASK-005-b-trip-wizard-step1-3.md` | `feature/b-trip-wizard-step1-3` | `70b08a8` | #29 |
| TASK-006 | 3.6 / 3.8（扩展），关联 1.11 / 1.18 / 4.13 / 4.14 | B | 已完成 | #31 | `docs/tasks/TASK-006-b-generation-and-modals.md` | `feature/b-generation-and-modals` | `31982a3` | #32 |
| TASK-007 | 3.6 / 3.8（Step 1–5 版式修正，含 v1.0～v1.3） | B | 已完成（定稿背景已接入；用户授权合并，21 项测试通过） | #35 | `docs/tasks/TASK-007-b-wizard-layout-polish.md` | `feature/b-wizard-layout-polish` | `a438b86`（布局）；`25a0805`（背景）；`28a0ec8`（合并） | #61 已合入 develop |
| WBS-5.1-B | 5.1 | B | 已完成 | #34 | `docs/tasks/TASK-WBS-5.1-b-personal-center-shell-navigation.md` | `feature/b-account-wbs-5-1-personal-center-shell` | `53525eb` | #36 |
| WBS-5.2-B | 5.2 | B | 已完成 | #50 | `docs/tasks/TASK-WBS-5.2-b-avatar-menu-navigation.md` | `feature/b-account-wbs-5-2-avatar-menu` | `6f25b25` | #52 |
| WBS-5.2-B-FOLLOWUP | 5.2（completed-task follow-up） | B | 已完成 | #56 | `docs/tasks/TASK-WBS-5.2-b-problem-cleanup-followup.md` | `fix/b-wbs-5-2-problem-cleanup` | `08a06a6` | #57 |
| WBS-5.4-B-V2 | 5.4（关联 5.1 / 5.2 completed-task visual refresh） | B | 已完成（用户视觉验收通过并授权合并） | #75 | `docs/tasks/TASK-WBS-5.4-b-personal-center-visual-rebuild-v2.md` | `feature/b-account-wbs-5-4-photoreal-rebuild-v2` | `7b47f05`（最终实现），`1082e10`（合并） | [#98](https://github.com/kanzakimy0/TravelAssist/pull/98) 已合入 develop |
| WBS-5.5-B | 5.5 | B | 已完成（用户验收通过） | #105 | `docs/tasks/TASK-WBS-5.5-b-preference-center-ui.md` | `feature/b-account-wbs-5-5-preference-center-ui` | `7484faf`（实现），`2acafe63`（合并） | [#109](https://github.com/kanzakimy0/TravelAssist/pull/109) 已合入 develop |
| WBS-5.6-B | 5.6 | B | 已完成（用户验收通过） | #107 | `docs/tasks/TASK-WBS-5.6-b-companion-management-ui.md` | `feature/b-account-wbs-5-6-companion-management-ui` | `ff9c933`（实现），`ff66aec1`（合并） | [#117](https://github.com/kanzakimy0/TravelAssist/pull/117) 已合入 develop |
| WBS-5.7-B | 5.7 | B | 已完成（用户验收通过） | #123 | `docs/tasks/TASK-WBS-5.7-b-mobility-preference-ui.md` | `feature/b-account-wbs-5-7-mobility-preference-ui`；`fix/wbs-5-7-checkbox-focus-scroll` | `ab79697`（实现），`ddf0aba`（验收修复），`8b83628` / `cabb487`（合并） | [#125](https://github.com/kanzakimy0/TravelAssist/pull/125) 实现、[#126](https://github.com/kanzakimy0/TravelAssist/pull/126) 验收修复，均已合入 develop |
| WBS-5.8-B | 5.8 | B | 已完成（用户验收通过） | #128 | `docs/tasks/TASK-WBS-5.8-b-attraction-activity-preference-ui.md` | `feature/b-account-wbs-5-8-attraction-activity-preference-ui`；`fix/wbs-5-8-attraction-detail-preferences` | `1c8effd`（实现），`4666db3`（验收修正），`c88d338` / `29a9528`（合并） | [#133](https://github.com/kanzakimy0/TravelAssist/pull/133) 实现、[#134](https://github.com/kanzakimy0/TravelAssist/pull/134) 验收修正，均已合入 develop |
| WBS-5.9-B | 5.9 | B | 已完成（用户验收通过；问题后续独立修正） | #138 | `docs/tasks/TASK-WBS-5.9-b-dining-accommodation-budget-ui.md` | `feature/b-account-wbs-5-9-dining-accommodation-budget-ui` | `060289f`（实现），`3abde3d`（合并） | [#140](https://github.com/kanzakimy0/TravelAssist/pull/140) 已合入 develop |
| WBS-5.10-B | 5.10 | B | 已完成（用户验收通过） | #143 | `docs/tasks/TASK-WBS-5.10-b-trip-library-ui.md` | `feature/b-account-wbs-5-10-trip-library-ui` | `e40141e`（实现），`9b58bb7`（Result），`5ad23e4`（合并） | [#144](https://github.com/kanzakimy0/TravelAssist/pull/144) 已合入 develop；Issue #143 已关闭 |
| WBS-5.20-B | 5.20 | B | 已完成（用户验收通过） | #146 | `docs/tasks/TASK-WBS-5.20-b-personal-center-responsive-states.md` | `feature/b-account-wbs-5-20-personal-center-responsive-states` | `d50d1f5`（实现），`24a273a`（Result），`8e04632`（合并） | [#147](https://github.com/kanzakimy0/TravelAssist/pull/147) 已合入 develop；Issue #146 已关闭 |
| WBS-5.20-B-FOLLOWUP | 5.20（completed-task UI follow-up；关联 5.4 / 5.5 / 5.6 / 5.10） | B | 已完成（用户验收通过） | #149 Closed | `docs/tasks/TASK-WBS-5.20-b-personal-center-concept-alignment-followup.md` | `fix/b-wbs-5-20-personal-center-concept-alignment` | `ea10d79`（实现），`0bc357a`（tracking），`9d36946`（合并），`d7bc976`（closeout） | [#150](https://github.com/kanzakimy0/TravelAssist/pull/150) 已合入 develop；[#151](https://github.com/kanzakimy0/TravelAssist/pull/151) closeout |
| TASK-WBS-9.12-B | 9.12 | B | 已完成（用户验收通过） | #181 | `docs/tasks/TASK-WBS-9.12-b-personal-center-responsive-accessibility-qa.md`（远端 Task 分支） | `fix/b-account-wbs-9-12-responsive-accessibility-qa` | `8285665`（实现与专项 QA），`492929f`（Result / tracking），`89fd34a`（合并） | [#184](https://github.com/kanzakimy0/TravelAssist/pull/184) 已合入 develop；Issue 保持 Open |
| TASK-008 | 1.5 / 1.6 / 1.7 / 1.11 / 1.14 / 1.17 / 1.18；4.1 / 4.8 / 4.13；4.14 UI shell | A | 已完成（UI shell 已合并；真实 Provider 不在范围） | #51 | `docs/tasks/TASK-008-a-trip-planner-shell.md` | `feature/a-trip-planner-shell-v2` | `e4648c0`（实现），`8920695`（集成验收），`1a4201b`（合并） | [#59](https://github.com/kanzakimy0/TravelAssist/pull/59) 已合入 develop |
| TASK-008.1 | 4.2–4.6 / 4.8–4.9 / 4.11–4.15；7.1（Mapbox / Mock 子集） | A | 已完成（Mapbox / Mock 子集） | #60 | `docs/tasks/TASK-008.1-a-planner-mapbox-interactions.md` | `feature/a-planner-mapbox-interactions` | `673ab6a`（实现），`8682ed2`（集成），`f5d5ef2`（合并） | [#69](https://github.com/kanzakimy0/TravelAssist/pull/69) 已合入 develop |
| TASK-008.2 | 1.5 / 1.6 / 1.7 / 1.14；4.1（Planner 纯视觉精修） | A | 已合并（用户确认的纯视觉范围；参考图限制留档） | #73 | `docs/tasks/TASK-008.2-a-planner-visual-fidelity-polish.md` | `feature/a-planner-visual-fidelity-polish` | `627b73a`（merge），`7e8db2a`（实现） | [#83](https://github.com/kanzakimy0/TravelAssist/pull/83) 已合入 develop；v0.3 新交互转 TASK-008.3 |
| TASK-008.3 | 1.5 / 1.6 / 1.7 / 1.14；4.1（Planner v0.3 交互） | A | 已完成 | #77 | `docs/tasks/TASK-008.3-a-planner-v03-interactions.md` | `feature/a-planner-v03-interactions` | `5893255`（实现），`004c40b`（同步），`f0c435a`（验收记录），`d5511f0`（合并） | [#85](https://github.com/kanzakimy0/TravelAssist/pull/85) 已合入 develop；64/64 tests、build、五尺寸 Mapbox/fallback 证据有效 |
| TASK-010-A | 1.2 / 1.16 / 3.1 / 3.6 / 4.13 | A | 已完成（主流程导航闭环已合入） | #78 | `docs/tasks/TASK-010-a-main-flow-navigation.md` | `feature/a-main-flow-navigation` | `2284591`（实现），`445150f`（追踪），`550a2b8`（合并） | [#101](https://github.com/kanzakimy0/TravelAssist/pull/101) 已合入 develop；Issue #78 已关闭 |
| TASK-011-A | 1.17 / 1.18 / 4.6 / 4.8 / 4.14 / 4.15 | A | 已合并（TASK-010-B 本轮仅复验导航；窄屏返回入口待对应任务复核） | #86 | `docs/tasks/TASK-011-a-planner-to-trip-detail-workspace.md` | `feature/a-planner-to-trip-detail-workspace` | `b3d411b`（合入 head），`4c1d9bb`（合并） | [#102](https://github.com/kanzakimy0/TravelAssist/pull/102) 已合入 develop；[#91](https://github.com/kanzakimy0/TravelAssist/pull/91) 为历史 blocked docs-only 记录 |
| TASK-012-A | 1.5 / 1.6 / 1.7 / 1.14 / 4.1 / 4.8 / 4.14 / 4.15（v0.5 UI 子集） | A | 已完成（用户授权当前实现范围；1180px Drawer 与原侧栏规格差异保留） | #111 | `docs/tasks/TASK-012-a-planner-v05-visual-secondary-panels.md` | `feature/a-planner-v05-visual-secondary-panels` | `e835e75`（验收 head），`66b7ca6`（合并，文件树相同） | [#124](https://github.com/kanzakimy0/TravelAssist/pull/124) 已合入 develop；139 tests、六尺寸双地图 QA、48 Logo QA 通过；冻结推荐卡未改 |
| TASK-014-B | 1.10 | B | 待审查（设计已上传并自动合入 develop，待用户验收） | #158 | `docs/tasks/TASK-014-b-wbs-1-10-attraction-activity-display-rules.md` | `feature/b-wbs-1-10-attraction-activity-display-rules` | `c1bddd70`（设计）；`e9c113d9`（自动合并） | [#163](https://github.com/kanzakimy0/TravelAssist/pull/163) 自动合入 develop |

> TASK-003-B 与 TASK-006 由用户明确分配给 B 执行；本记录不改变相关 WBS 工作项的既有 Owner。
>
> TASK-014-B / WBS 1.10 于 2026-09-07 由用户明确改派给 B。该单项例外只改变 WBS 1.10 的 Owner，不重写 v0.4 的长期“Main Travel System 默认归 A”规则。WBS 1.10 为设计规格项，由 ChatGPT 直接完成，不需要 Codex；主设计 PR #163 已被仓库自动化合并，但在用户验收前保持 `待审查`。

### TASK-008.1 执行记录（2026-09-05）

- 合并复验：用户授权合并 PR #69；无冲突且未落后 develop，lint / typecheck / 50 项 tests / diff-check 再次通过。合并树的实现、测试及依赖与已通过 build / 浏览器验收的 head 完全一致。只补齐本 Task 合并记录，不开始后续任务。

- Owner：A；Issue #60；Status：已完成（本轮 Mapbox / Mock 子集已合入 develop，验收通过）。
- Task：`docs/tasks/TASK-008.1-a-planner-mapbox-interactions.md`；Branch：`feature/a-planner-mapbox-interactions`；实现 Commit：`673ab6aa9a5a8aa58e8838f6200d5ca77981ea1e`；PR：[#69](https://github.com/kanzakimy0/TravelAssist/pull/69)，用户明确授权后已合并；验收 head `36c73c32f004fcb27e7b214d8d6278790c04373f`，merge `f5d5ef249022d74cc89c8300bb8622e85220eda5`。
- PR #59 合并提交 `1a4201b3181460977c4f16b0c34f60c353751687` 已是 origin/develop 祖先；从 clean 基线 `8159c177b732606c4d1bd7433241677c5fdd8a27` 创建分支。历史 Blocked 条件已解除。
- 交付前无冲突同步最新 develop `fd5e4492f202c07567593199baadd25425190367`，集成提交 `8682ed293d19115f173f81c995739f8199f1d33a`；保留其他 Owner 的最新文档状态，未启动后续 Task。
- 范围：4.2–4.6、4.8–4.9、4.11–4.15 的 Mapbox / Mock 交互子集，7.1 冻结 Mapbox；真实 POI / Route / Transit / Booking / AI / Auth / DB 不在范围，不误报完整业务能力完成。
- 4.2–4.5、4.8–4.9、4.11–4.13 与 7.1 的本次 UI / Mapbox 子集已完成；4.6 / 4.14 / 4.15 完整业务继续进行中，真实路线、重新规划、最终跨模块 Store / Contract 未完成。TASK-008 原 UI shell 已完成的历史记录不变。
- 3 个 GeoJSON Source / 13 个角色图层、单日 / 三日 / 城市全行程、两级地点 / 区域详情、统一 TripItem 预约与固定时段保护已实现。无 token fallback 全流程通过，live Mapbox 未验证（token unavailable）。
- 50 项 tests、lint / typecheck / build、七个视口与键盘 / Escape / 焦点恢复通过；npm ci 无漏洞。全仓格式有 7 份上游既有文档失败，本 Task 文件独立格式检查通过。最终证据与例外清单见 `docs/tasks/RESULT-TASK-008.1-a-planner-mapbox-interactions.md`。提交附 `[skip ci]`，未将远端 CI 跳过表述为通过。

## 1. 产品、交互与画面设计

### Planner 用户补充：方案 / 备用景点与移动重构（本地待审查）

- 对应 4.4 / 4.5 / 4.8 / 4.15 的本地交互子集；不将真实路线 Provider 或完整业务状态标记完成。
- 行程总览将餐宿两栏空间归入行程建议；四状态卡恢复柔和配色。单日餐宿、整体比例和 25dvh 底栏保留。
- Planner 行程采用上方方案景点 / 下方备用，可双向移动；交通页使用紧凑地点及可编辑移动段，保留锁定与预约保护。
- 最新视觉补充：交通框改为窄底长侧边的竖向长方形（约 0.74 宽高比，至少 72px 宽）；名称框仍为淡色小正方形并保留至少 44px 点击区域。缩小连接间距、取消行程组自动撑开，名称保留 11px / 500 字重；六尺寸比例与文字容纳检查通过，不修改功能或底栏高度。
- 交通颜色 / 联动补充：九种模式底色，问题卡保留半边交通色，另一半用红 / 黄对角区分本地冲突与待核对。时间修改重判风险，增删或换地点只作相邻连接失效；未连接收费路线 API，也未将本地检查标成真实路况。
- 备用与交通修改按方案隔离，地图联动，仅详情显式浏览器保存。未接实时路线 / 预约 / AI / 数据库。
- 239 项测试、lint / typecheck / build、本次格式和 diff 检查通过；六尺寸浏览器、双色风险切换及保存刷新复验通过。全仓格式仍有 52 份既有问题。
- Result：`docs/tasks/RESULT-planner-route-board-overview.md`；本轮未提交 / 推送 / 合并，保留用户工作区已有改动。

### 1A. 旅行主系统画面设计（A）

| WBS ID | 工作项                                    | 负责人 | 优先级 | 依赖              | 状态   |
| ------ | ----------------------------------------- | ------ | ------ | ----------------- | ------ |
| 1.1    | 产品定位与核心价值主张                    | A      | P0     | -                 | 进行中 |
| 1.2    | 用户旅程 / 核心使用流程                   | A      | P0     | 1.1               | 进行中 |
| 1.3    | 页面分类与 A/B 模块归属                   | A      | P0     | 1.2               | 进行中 |
| 1.4    | 网站首页设计冻结 v1                       | A      | P1     | 1.3               | 已完成 |
| 1.5    | Planner 主画面冻结 v1                     | A      | P0     | 1.3               | 已完成 |
| 1.6    | 底部时间轴设计冻结                        | A      | P0     | 1.5               | 已完成 |
| 1.7    | Planner 右侧临时设置 / 快速调整设计       | A      | P0     | 1.5               | 已完成 |
| 1.10   | 景点与活动标签 / 主系统展示规则           | B      | P1     | 1.5               | 待审查 |
| 1.11   | 推荐方案 1/2/3 展示结构                   | A      | P1     | 1.5               | 已完成 |
| 1.12   | 地图视觉 / Pin / 区域 / 路线规范          | B      | P0     | 1.5               | 待审查 |
| 1.13   | 主系统 Design Token / 色彩 / 字体 / 圆角  | B      | P1     | 1.4,1.5           | 待审查 |
| 1.14   | 主系统响应式布局规则                      | A      | P1     | 1.13              | 进行中 |
| 1.15   | MVP 功能范围冻结                          | A      | P0     | 1.1-1.14          | 未开始 |
| 1.16   | 网站入口详细画面设计                      | A      | P1     | 1.4,1.13          | 已完成 |
| 1.17   | 地图 + 时间轴 + 推荐右栏详细画面设计      | A      | P0     | 1.5,1.6,1.11,1.12 | 进行中 |
| 1.18   | 路线生成 / 重新规划 / 方案切换交互设计    | A      | P0     | 1.17              | 进行中 |
| 1.19   | AI 旅行助手主画面设计                     | A      | P1     | 1.5               | 未开始 |
| 1.20   | 主系统 Loading / Empty / Error / Skeleton | A      | P1     | 1.13              | 未开始 |

### 1B. 用户个人中心画面设计（B）

| WBS ID | 工作项                                | 负责人 | 优先级 | 依赖      | 状态   |
| ------ | ------------------------------------- | ------ | ------ | --------- | ------ |
| 1.21   | 个人中心 Information Architecture     | B      | P0     | 1.3       | 已完成 |
| 1.22   | 头像菜单 / Personal Center Shell 设计 | B      | P0     | 1.21      | 已完成 |
| 1.23   | 登录 / 注册 / 找回密码画面设计        | B      | P1     | 1.21      | 已完成 |
| 1.24   | Profile / 账户设置画面设计            | B      | P1     | 1.21      | 已完成 |
| 1.25   | 偏好管理中心画面设计                  | B      | P0     | 1.21      | 已完成 |
| 1.26   | 同行人管理画面设计                    | B      | P1     | 1.25      | 已完成 |
| 1.27   | 保存行程 / 历史 / 草稿 / 收藏管理设计 | B      | P0     | 1.21      | 已完成 |
| 1.28   | 账户安全 / 数据删除画面设计           | B      | P1     | 1.24      | 已完成 |
| 1.29   | 个人中心响应式 / 状态画面规范         | B      | P1     | 1.22-1.28 | 已完成 |
| 1.30   | 个人中心设计 Freeze v1                | A+B    | P0     | 1.22-1.29 | 已完成 |

## 2. 工程初始化与基础架构

> 跨模块基础设施默认由 A 负责；B 已开始的工作站初始化继续由 B 完成。

| WBS ID | 工作项                           | 负责人 | 优先级 | 依赖    | 状态   |
| ------ | -------------------------------- | ------ | ------ | ------- | ------ |
| 2.1    | A 工程初始化 Task                | A      | P0     | 0.3     | 已完成 |
| 2.2    | B 工程初始化 / 工作站验证        | B      | P0     | 0.2     | 已完成 |
| 2.3    | Node / npm / TypeScript 版本固定 | A      | P0     | 2.1     | 已完成 |
| 2.4    | ESLint / Prettier / EditorConfig | A      | P1     | 2.1     | 已完成 |
| 2.5    | 环境变量规范                     | A      | P0     | 2.1     | 已完成 |
| 2.6    | 目录架构 + A/B 模块边界冻结      | A      | P0     | 2.1,0.8 | 已完成 |
| 2.7    | Shared UI / Contract 基础        | A      | P1     | 2.6     | 已完成 |
| 2.8    | GitHub Actions CI                | A      | P1     | 2.3,2.4 | 已完成 |
| 2.9    | 单元测试框架                     | A      | P1     | 2.1     | 已完成 |
| 2.10   | E2E 测试框架                     | A      | P2     | 2.1     | 已完成 |
| 2.11   | Error / Logging 基础             | A      | P2     | 2.6     | 已完成 |
| 2.12   | Feature Flag 基础                | A      | P3     | 2.6     | 已完成 |
| 2.15 | 日本国内核心目的地素材生成单（300目的地 / 9,000景点） | A | P1 | 2.13,2.14 | 已合并生产清单（Partial；实体/图片待后续） |
| 2.16 | 日本300目的地实体解析与验收 | A | P1 | 2.15 | 阻塞 / Partial（父门槛254/300；官方边界最终验收未完成） |
| 2.17 | 已有AI插画接入Planner Marker / 方案 / 详情及真实性标识 | A | P1 | 2.13,4.3,4.13 | 已完成（PR139已合并范围） |

| 2.13   | 素材库 / Asset Registry 基础      | A      | P1     | 2.6,2.7 | 已完成 |
| 2.14   | 全量素材清单 + S/M/L / 特殊尺寸衍生流水线 | A | P1 | 2.13 | 已完成 |

## 3. 网站入口与主系统 Shell（A）

| WBS ID | 工作项                              | 负责人 | 优先级 | 依赖     | 状态   |
| ------ | ----------------------------------- | ------ | ------ | -------- | ------ |
| 3.1    | 全局 Main Layout / Header           | A      | P1     | 1.13,2.7 | 未开始 |
| 3.2    | 首页动画背景区域                    | A      | P1     | 1.16     | 未开始 |
| 3.3    | 「让我们开始吧」主入口              | A      | P0     | 3.1      | 未开始 |
| 3.4    | 登录按钮 / 头像入口在主系统中的实现 | A      | P1     | 3.1,5.3  | 未开始 |
| 3.5    | AI 悬浮入口                         | A      | P1     | 3.1      | 未开始 |
| 3.6    | 目的地 / 日期 / 开始规划入口        | A      | P0     | 3.1      | 已完成 |
| 3.7    | 主系统 Loading / Empty / Error      | A      | P1     | 1.20,3.1 | 未开始 |
| 3.8    | 主系统响应式 / 无障碍               | A      | P2     | 3.1-3.7  | 已完成 |

## 4. Planner / 地图 / 路线生成（A；Engine 单项交给 B）

| WBS ID | 工作项                        | 负责人 | 优先级 | 依赖         | 状态   |
| ------ | ----------------------------- | ------ | ------ | ------------ | ------ |
| 4.1    | Planner 页面整体 Grid         | A      | P0     | 1.17,3.1     | 已完成 |
| 4.2    | 地图容器与基础控件            | A      | P0     | 4.1,7.1      | 已完成 |
| 4.3    | 景点 Pin 组件                 | A      | P1     | 4.2,1.12     | 已完成 |
| 4.4    | 住宿区域覆盖层                | A      | P1     | 4.2,1.12     | 已完成 |
| 4.5    | 餐饮区域覆盖层                | A      | P1     | 4.2,1.12     | 已完成 |
| 4.6    | 多日路线视觉显示              | A      | P0     | 4.2,7.8      | 进行中 |
| 4.7    | 交通方式视觉显示              | A      | P0     | 4.6          | 已完成（本地交通分类视觉；非实时路线API） |
| 4.8    | 底部时间轴基础                | A      | P0     | 1.17,4.1     | 已完成 |
| 4.9    | 时间轴景点卡片                | A      | P1     | 4.8          | 已完成 |
| 4.10   | 时间轴交通段                  | A      | P1     | 4.8          | 已完成（交通段编辑/展示；估算与失效提示） |
| 4.11   | 时间轴餐饮段                  | A      | P1     | 4.8          | 已完成 |
| 4.12   | 时间轴住宿段                  | A      | P1     | 4.8          | 已完成 |
| 4.13   | 推荐方案列表                  | A      | P0     | 1.11,4.1     | 已完成 |
| 4.14   | 方案切换 / 重新规划交互       | A      | P0     | 4.13,4.6,4.8 | 进行中 |
| 4.15   | Planner 状态模型 / Store      | A      | P0     | 2.6,5.11     | 进行中 |
| 4.16   | Day Plan / Itinerary Core     | A      | P0     | 4.15,7.x     | 进行中（浏览器草案Core；正式服务器Contract未完成） |
| 4.17   | Trip Plan / Planner Contract  | A      | P0     | 4.15,4.16    | 已完成（#215 / #216；负责人批准的 v1.0 公开契约基线） |
| 4.18   | Planner 读取用户偏好 Contract | A      | P0     | 4.15,5.14    | 未开始 |
| 4.19   | Planner 调用保存行程 Contract | A      | P1     | 4.17,5.19    | 未开始 |

### 4A. 已有 Planner / Detail UI 及本地补修登记

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 4.25 | Planner / Detail 共享 Workspace、Map 生命周期与返回推荐 | A | P0 | 4.1,4.2,4.15 | 已完成（已合并UI/Mock） |
| 4.26 | Detail 显式浏览器保存 / 恢复 / 未保存与覆盖保护 | A | P0 | 4.25 | 已完成（已合并UI/Mock） |
| 4.27 | 共享项目详情框 / 地图 2:1 分栏 / 多卡切换与手机浮层 | A | P1 | 4.25,4.3 | 已完成（已合并UI/Mock） |
| 4.28 | 新增 / 编辑项目与目录匹配 / 手动坐标定位 | A | P1 | 4.27,4.15 | 已完成（已合并UI/Mock） |
| 4.29 | Detail 单日 / 全程总览、状态计数、餐宿与费用摘要 | A | P1 | 4.25,4.8 | 已完成（已合并UI/Mock） |
| 4.30 | Detail 餐厅 / 酒店候选选择、更换与预约入列（示例） | A | P1 | 4.27,4.29 | 已完成（已合并UI/Mock） |
| 4.31 | 预约清单 / 当日与全程 / 三秒确认 / 进度演示 | A | P1 | 4.30 | 已完成（已合并UI/Mock） |
| 4.32 | 本地时间冲突 / 缺失检查 / 调整预览 / 固定预约保护 | A | P0 | 4.15,4.25 | 已完成（已合并UI/Mock） |
| 4.33 | 五卡二级菜单 / 七分类更多设置 / 草稿与应用取消 | A | P1 | 4.1,4.15 | 已完成（已合并UI/Mock） |
| 4.34 | 六 Tab 上伸摘要 / 内容边界 / 响应式折叠及 25dvh | A | P1 | 4.1,4.8 | 已完成（已合并UI/Mock） |
| 4.35 | 方案与备用景点双向调整 / 空档分配 / 分方案隔离 | A | P0 | 4.9,4.15 | 已完成（已合并UI/Mock） |
| 4.36 | 移动段编辑 / 分类颜色 / 风险双色 / 相邻连接失效 | A | P1 | 4.10,4.35 | 已完成（已合并UI/Mock） |
| 4.37 | 紧凑双层景点时间轴 / 节点连线 / 待安排备用轨道 | A | P1 | 4.35 | 已完成（#211合并验收；UI/本地Mock范围，Token不上传） |
| 4.38 | 行程卡同意应用 / 无视隐藏提醒 / 空白大加号 / 名称框加高 | A | P1 | 4.32,4.36 | 已完成（#211合并验收；UI/本地Mock范围，Token不上传） |
| 4.39 | 旅景玻璃背景 / 固定栏位与覆盖展开 / 操作按钮密度 | A | P1 | 4.25,4.34 | 已完成（已合并UI/Mock） |
| 4.40 | 全天比例时间轴 / 上下拖拽插入 / 时间编辑与锁定 / 酒店三餐占位 | A | P1 | 4.35,4.37 | 已完成（#211合并验收；UI/本地Mock范围，Token不上传） |
| 4.41 | 行程交通酒店端点同步 / 1日3日全日面板与摘要 / 必要预约过滤 | A | P1 | 4.40,4.10,4.26 | 已完成（#211合并验收；UI/本地Mock范围，Token不上传） |
| 4.42 | 完成规划确认 / 全程待办 / 改名 / 本地保存与复检回执 | A | P1 | 4.26,4.32 | 已完成（#211合并验收；UI/本地Mock范围，Token不上传） |
| 4.43 | 同行人组合与单人跨页读取 / 临时成员 / 人数构成校验 | A | P1 | 5.6,4.42 | 已完成（#211合并验收；UI/本地Mock范围，Token不上传） |
| 4.44 | 总览航班设置 / 项目详情 / 购票需求与本地航班校验 | A | P1 | 4.27,4.31 | 已完成（#211合并验收；UI/本地Mock范围，Token不上传） |
| 4.45 | Planner单日餐宿覆盖与旅行体检内容增强 | A | P1 | 4.41 | 已完成（#211合并验收；UI/本地Mock范围，Token不上传） |
| 4.46 | 独立双滑轨与5分钟吸附 / 重叠卡 / 三餐区域与时段提醒 / 工作方案草稿切换 / 预约渠道选择 | A | P1 | 4.40,4.45 | 已完成（#211合并验收；UI/本地Mock范围，Token不上传） |

### 4B. TravelAssist Engine / Trip Engine

Engine是确定性行程变更执行层，不是AI Orchestrator或Provider。复用4.16/4.17/8.5，不建立第二套主模型；原工作项Owner不变。4.20先设计，发布前须A/B核对；后续依赖未满足不得执行。

| WBS ID | 工作项 | 负责人 | 优先级 | 依赖 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 4.20 | Engine Contract / ChangeSet操作与错误模型 | B | P1 | 0.9基线；A/B契约核对 | 未开始（#201，任务已定义） |
| 4.21 | 确定性约束校验 / 冲突检查 / 影响预览 | B | P1 | 4.20,4.17 | 未开始 |
| 4.22 | 事务应用 / 权限 / 幂等 / 版本与审计 | B | P1 | 4.21,8.1,8.3,8.4,8.5 | 未开始（前置未满足） |
| 4.23 | Runtime事件 / 局部重算 / 回滚契约 | B | P1 | 4.22,7.5 | 未开始 |
| 4.24 | Engine回归 / 并发 / 回放与集成验收 | B | P1 | 4.21,4.22,4.23 | 未开始 |

正式入口：[Issue #201](https://github.com/kanzakimy0/TravelAssist/issues/201)、`docs/tasks/TASK-WBS-4.20-b-travelassist-engine-contract.md`。4.21之后逐项建立独立Task，不自动执行。

## 5. 用户个人中心 / 管理 / 偏好（B 全责）

### 5A. Personal Center UI

| WBS ID | 工作项                                        | 负责人 | 优先级 | 依赖     | 状态   |
| ------ | --------------------------------------------- | ------ | ------ | -------- | ------ |
| 5.1    | Personal Center Shell / Navigation            | B      | P0     | 1.22,2.6 | 已完成 |
| 5.2    | 头像菜单与个人中心跳转目标                    | B      | P0     | 5.1      | 已完成 |
| 5.3    | 登录 / 注册 / Session 用户流程                | B      | P0     | 1.23,8.3 | 未开始 |
| 5.4    | Profile / 账户设置 UI                         | B      | P1     | 1.24,5.1 | 已完成 |
| 5.5    | 偏好管理中心 UI                               | B      | P0     | 1.25,5.1 | 已完成 |
| 5.6    | 同行人管理 UI                                 | B      | P1     | 1.26,5.5 | 已完成 |
| 5.7    | 移动偏好 UI                                   | B      | P1     | 5.5      | 已完成 |
| 5.8    | 景点 / 活动偏好 UI                            | B      | P0     | 5.5      | 已完成 |
| 5.9    | 餐饮 / 住宿 / 预算偏好 UI                     | B      | P1     | 5.5      | 已完成 |
| 5.10   | 保存行程 / 历史 / 草稿 / 收藏 UI              | B      | P0     | 1.27,5.1 | 已完成 |
| 5.20   | 个人中心 Loading / Empty / Error / Responsive | B      | P1     | 1.29,5.1 | 已完成 |

### 5B. Personal Center Data / API

| WBS ID | 工作项                               | 负责人 | 优先级 | 依赖      | 状态   |
| ------ | ------------------------------------ | ------ | ------ | --------- | ------ |
| 5.11   | Preference Schema                    | B      | P0     | 1.25,8.1  | 未开始 |
| 5.12   | Companion Schema                     | B      | P1     | 1.26,8.1  | 未开始 |
| 5.13   | Preference Preset / 默认值           | B      | P1     | 5.11      | 未开始 |
| 5.14   | Planner 可读取的 Preference Contract | B      | P0     | 5.11,5.16 | 未开始 |
| 5.15   | Profile / Account API                | B      | P1     | 8.2,8.3   | 未开始 |
| 5.16   | Preference 持久化 API                | B      | P0     | 5.11,8.1  | 未开始 |
| 5.17   | Companion 持久化 API                 | B      | P1     | 5.12,8.1  | 未开始 |
| 5.18   | 保存行程 / 历史 / 草稿数据模型       | B      | P0     | 4.17,8.1  | 可开始（#207；#186 / #216 已合并，实施前重新检查） |
| 5.19   | Trip Save / Read / History Contract  | B      | P0     | 5.18      | 未开始 |
| 5.21   | 用户数据删除 / 账户删除              | B      | P1     | 5.15-5.19 | 未开始 |

## 6. AI 旅行助手（A 全责，个人历史除外）

| WBS ID | 工作项                             | 负责人 | 优先级 | 依赖     | 状态   |
| ------ | ---------------------------------- | ------ | ------ | -------- | ------ |
| 6.1    | AI 能力边界定义                    | A      | P0     | 1.15     | 未开始 |
| 6.2    | 主系统 AI 对话消息模型             | A      | P0     | 3.5      | 未开始 |
| 6.3    | Prompt / System Instruction v1     | A      | P0     | 6.1,5.14 | 未开始 |
| 6.4    | AI API 接入层                      | A      | P0     | 2.5,6.3  | 未开始 |
| 6.5    | AI 读取用户偏好                    | A      | P0     | 5.14,6.4 | 未开始 |
| 6.6    | AI 修改 Planner / 临时条件 Action  | A      | P0     | 6.5,4.15 | 未开始 |
| 6.7    | AI 生成初始行程                    | A      | P0     | 6.4,7.x  | 未开始 |
| 6.8    | AI 局部修改行程                    | A      | P0     | 6.7,4.15 | 未开始 |
| 6.9    | 推荐原因展示                       | A      | P1     | 6.7,1.19 | 未开始 |
| 6.10   | AI Loading / Error / 降级          | A      | P1     | 6.4      | 未开始 |
| 6.11   | AI 成本 / Token 监控               | A      | P2     | 6.4      | 未开始 |
| 6.12   | AI 结果质量测试集                  | A      | P1     | 6.7      | 未开始 |
| 6.13   | AI 主对话 UI / 修改确认 / 成功反馈 | A      | P0     | 1.19,6.6 | 未开始 |
| 6.14   | 个人中心 AI 历史（可选）           | B      | P3     | 6.2,5.1  | 未开始 |

## 7. 地图、地点、路线与推荐（A 全责）

| WBS ID | 工作项                        | 负责人 | 优先级 | 依赖     | 状态   |
| ------ | ----------------------------- | ------ | ------ | -------- | ------ |
| 7.1    | 地图 Provider 选型            | A      | P0     | 1.12     | 已完成 |
| 7.2    | Places / POI Provider 选型    | A      | P0     | 1.10     | 未开始 |
| 7.3    | Route / Transit Provider 选型 | A      | P0     | 4.7      | 未开始 |
| 7.4    | POI 标准 Schema               | A      | P0     | 7.2      | 未开始 |
| 7.5    | Route Schema                  | A      | P0     | 7.3      | 未开始 |
| 7.6    | 地点搜索 API                  | A      | P0     | 7.2,7.4  | 未开始 |
| 7.7    | POI 详情 API                  | A      | P1     | 7.4      | 未开始 |
| 7.8    | 路线计算 API                  | A      | P0     | 7.3,7.5  | 未开始 |
| 7.9    | 推荐打分 v1                   | A      | P0     | 5.14,7.4 | 未开始 |
| 7.10   | 缓存策略                      | A      | P1     | 7.6-7.8  | 未开始 |
| 7.11   | Provider 失败降级             | A      | P1     | 7.6-7.8  | 未开始 |
| 7.12 | 当前预览Mapbox本地配置与真实底图复验 | A | P0 | 4.2,7.1 | 已完成（#211合并验收；UI/本地Mock范围，Token不上传） |

## 8. 数据库与认证基础

| WBS ID | 工作项                        | 负责人 | 优先级 | 依赖               | 状态   |
| ------ | ----------------------------- | ------ | ------ | ------------------ | ------ |
| 8.1    | DB / ORM / Migration 总体方案 | A      | P0     | 2.6                | 已完成（TASK-015基础范围；#186合并且运行验收通过） |
| 8.2    | User / Profile Schema         | B      | P0     | 8.1                | 已完成（TASK-016-B；用户验收通过；#209合并；#200关闭） |
| 8.3    | Authentication 核心           | B      | P0     | 8.1                | 已完成 |
| 8.4    | DB Migration 全局规范         | A      | P1     | 8.1                | 已完成（#186已合并；SQL唯一历史与空库重建验收） |
| 8.5    | 主系统 Trip Plan Schema       | A      | P0     | 4.17,8.1           | 待审查（TASK-019-A / #226；真实 DB 验收通过，未合并） |
| 8.6    | B 个人中心数据 Migration      | B      | P1     | 5.11,5.12,5.18,8.4 | 未开始 |
| 8.7    | AI 会话主系统存储策略         | A      | P2     | 6.2,8.1            | 未开始 |
| 8.8    | 个人 AI 历史关联              | B      | P3     | 6.14,8.2,8.7       | 未开始 |

## 9. 质量、测试、安全与性能

| WBS ID | 工作项                                  | 负责人 | 优先级 | 依赖            | 状态   |
| ------ | --------------------------------------- | ------ | ------ | --------------- | ------ |
| 9.1    | 测试框架与全局基线                      | A      | P1     | 2.9,2.10        | 未开始 |
| 9.2    | Planner / Map / Route 单元与集成测试    | A      | P1     | 4.x,7.x         | 未开始 |
| 9.3    | AI 集成测试                             | A      | P1     | 6.x             | 未开始 |
| 9.4    | 主系统 E2E                              | A      | P1     | 3.x,4.x,6.x,7.x | 未开始 |
| 9.5    | 个人中心单元 / 集成测试                 | B      | P1     | 5.x,8.2,8.3     | 未开始 |
| 9.6    | 个人中心 E2E                            | B      | P1     | 5.x             | 未开始 |
| 9.7    | 跨模块 E2E：偏好→Planner                | A+B    | P0     | 4.18,5.14       | 未开始 |
| 9.8    | 跨模块 E2E：Planner→保存→个人中心       | A+B    | P0     | 4.19,5.19       | 未开始 |
| 9.9    | API Rate Limit / Security Headers / CSP | A      | P1     | 6.4,7.x         | 未开始 |
| 9.10   | Secret 扫描 / 全局安全                  | A      | P1     | 2.8             | 未开始 |
| 9.11   | 性能预算 / 错误监控                     | A      | P2     | 2.11            | 未开始 |
| 9.12   | B 模块响应式 / 可访问性 QA              | B      | P2     | 5.20            | 已完成（用户验收通过） |

## 10. 发布与运营准备（A 主责）

| WBS ID | 工作项                    | 负责人 | 优先级 | 依赖     | 状态   |
| ------ | ------------------------- | ------ | ------ | -------- | ------ |
| 10.1   | Dev / Preview / Prod 环境 | A      | P0     | 2.5,8.1  | 未开始 |
| 10.2   | 自动部署                  | A      | P1     | 2.8,10.1 | 未开始 |
| 10.3   | Domain / HTTPS            | A      | P1     | 10.1     | 未开始 |
| 10.4   | Analytics                 | A      | P2     | 3.x      | 未开始 |
| 10.5   | SEO / Metadata            | A      | P2     | 3.x      | 未开始 |
| 10.6   | 隐私政策 / Terms          | A      | P1     | 5.21,8.x | 未开始 |
| 10.7   | Beta Feedback 流程        | A      | P2     | 10.1     | 未开始 |
| 10.8   | MVP Release Checklist     | A+B    | P0     | 9.x,10.x | 未开始 |

## 11. Mobile App（Web MVP 后）

> Mobile 延续相同分工，不再按“前端/后端”切，而按“主旅行系统/个人中心”切。

| WBS ID | 工作项                             | 负责人 | 优先级 | 依赖      | 状态   |
| ------ | ---------------------------------- | ------ | ------ | --------- | ------ |
| 11.1   | Mobile 技术方案选型 / Shared Core  | A      | P2     | M7        | 未开始 |
| 11.2   | Mobile 主旅行入口 / 地图 / Planner | A      | P1     | 11.1      | 未开始 |
| 11.3   | Mobile Route / AI 主系统           | A      | P1     | 11.1      | 未开始 |
| 11.4   | Mobile 个人中心 Shell              | B      | P2     | 11.1      | 未开始 |
| 11.5   | Mobile Profile / Account           | B      | P2     | 11.4      | 未开始 |
| 11.6   | Mobile Preferences / Companions    | B      | P2     | 11.4      | 未开始 |
| 11.7   | Mobile Saved Trips / History       | B      | P2     | 11.4      | 未开始 |
| 11.8   | Push / Native / Release 基础       | A      | P2     | 11.1      | 未开始 |
| 11.9   | App Store / Play 发布              | A      | P2     | 11.2-11.8 | 未开始 |

---

# 5. 新 Task 自动分配规则（v0.4）

生成任何新 Task 前按以下顺序判断：

1. 读取 GitHub 最新 WBS、Task、Issue、PR、`develop`。
2. 判断该工作属于“旅行主系统”还是“用户个人中心”。
3. **网站入口 / Planner / 地图 / 路线 / 行程生成 / 推荐 / 主 AI → A。**
4. **头像进入后的账户 / Profile / 管理 / 偏好 / 同行人 / 保存历史 → B。**
5. 对应模块的前端、API、Schema、状态、测试原则上由同一 Owner 负责。
6. 全局工程架构、CI/CD、安全、部署、共享基础设施默认 A。
7. 跨 A/B 模块的功能必须通过明确 Contract 连接。
8. 不允许因为“这是客户可见页面”就自动分给 B；必须看它属于主旅行系统还是个人中心。
9. 已创建但尚未真正执行的 Task，按 v0.4 重新分配；正在执行的 Task如与新边界严重冲突，应在下一 Task 切换到正确 Owner，并避免中途造成代码冲突。

### Task 命名建议

```text
TASK-xxx-a-main-<name>.md
TASK-xxx-b-account-<name>.md

feature/a-main-<name>
feature/b-account-<name>
```

---

# 6. Codex 返回结果时自动更新 WBS（强制）

```text
读取 Task
↓
检查 GitHub 最新 A/B Task / Issue / PR / develop
↓
读取 docs/project/WBS-TravelAssist.md
↓
确认 WBS ID 与 Owner 是否符合 v0.4
↓
执行开发 / 测试
↓
更新 WBS
↓
更新 Result
↓
git add / commit / push
↓
最后返回 Codex Result
```

### 状态映射

- 正式启动：`进行中`
- Blocked：`阻塞`
- 实现完成但 PR 未合并：`待审查`
- PR 合并 `develop` 且验收通过：`已完成`

### Mandatory WBS Update

```md
## Mandatory WBS Update

Before returning the final Task Result:

1. Read the latest `docs/project/WBS-TravelAssist.md`.
2. Confirm the Task owner using v0.4 responsibility rules:
   - A = main travel system (entry, planner, map, routing, itinerary, AI).
   - B = personal center (account, profile, management, preferences, companions, saved/history).
3. Update status, Issue, branch, commit, PR and blockers.
4. If implementation is complete but PR is not merged, set `待审查`.
5. Only set `已完成` after merge to `develop` and acceptance passes.
6. Commit and push the WBS update before returning the final result.

Do not return a complete Task Result without WBS synchronization.
```

---

# 7. v0.4 重新分配后的优先队列

| 顺序 | WBS ID  | 工作项                            | 负责人 |
| ---: | ------- | --------------------------------- | ------ |
|    1 | 2.1     | A 工程初始化 PR / 验收            | A      |
|    2 | 2.2     | B 工作站初始化 / 验证完成         | B      |
|    3 | 2.6     | 目录架构 + A/B 模块边界冻结       | A      |
|    4 | 1.15    | MVP Scope v1                      | A      |
|    5 | 1.16    | 网站入口详细设计                  | A      |
|    6 | 1.17    | Planner / 地图 / 时间轴详细设计   | A      |
|    7 | 1.18    | 路线生成 / 方案切换交互设计       | A      |
|    8 | 1.21    | 个人中心 IA                       | B      |
|    9 | 1.22    | 头像 / Personal Center Shell 设计 | B      |
|   10 | 1.25    | 偏好管理中心设计                  | B      |
|   11 | 1.27    | 保存行程 / 历史管理设计           | B      |
|   12 | 3.1     | Main Shell                        | A      |
|   13 | 4.15    | Planner State / Core              | A      |
|   14 | 7.1-7.3 | Map / POI / Route Provider 选型   | A      |
|   15 | 5.1     | Personal Center Shell 实现        | B      |
|   16 | 5.11    | Preference Schema                 | B      |
|   17 | 5.14    | Preference Contract               | B      |
|   18 | 4.18    | Planner 接入 Preference Contract  | A      |

### 并行开发模式

```text
A 主线：Website Entry → Planner → Map → Route → Itinerary → AI
B 主线：Avatar → Personal Center → Account → Preferences → Saved Trips
```

这样 A/B 可以长期并行，交叉点主要只有：

```text
B Preference Contract → A Planner
A Trip Plan Contract → B Saved Trips
B Auth/User Session → A Header/Avatar Entry
```

---

# 8. 单个 WBS / Task 记录模板

```md
## WBS Record

- WBS ID:
- Task ID:
- Title:
- Owner: A / B
- Responsibility: Main Travel System / Personal Center / Shared Infra
- Priority:
- Status:
- Dependency:
- Branch:
- GitHub Issue:
- Pull Request:
- Start Date:
- Completed Date:

### Scope

-

### Deliverables

-

### Acceptance Criteria

- [ ]
- [ ]
- [ ]

### Codex Result

- Status:
- Commit:
- Tests:
- Problems:
- WBS Updated: Yes / No
- Next Task:
```

---

# 9. 项目统一 Codex 工作原则

## WBS-5.10-B-FOLLOWUP-1 独立追踪

- Owner：B；Issue #193；PR #197；状态：已完成（2026-09-08 用户最终验收通过，授权合入 develop）。
- 范围：首页 / 我的旅行共享纯日期判定、全部旅行与草稿分页、同行人 / 账户大屏布局。
- Parent 5.1 / 5.4 / 5.6 / 5.10 / 5.20 保持已完成；5.3 保持未开始，不接 Auth。
- Task：`docs/tasks/TASK-WBS-5.10-b-personal-center-trip-status-large-screen-followup.md`。
- Result：`docs/tasks/RESULT-WBS-5.10-b-personal-center-trip-status-large-screen-followup.md`。

## 通用原则

1. 开始 Task 前检查最新 GitHub 状态。
2. 一个正式 Task 必须对应 WBS ID。
3. 原则上一个 Task 对应一个 Issue 和一个 feature 分支。
4. 不直接在 `develop` 上开发功能。
5. Task / Result / WBS 全部备份 GitHub。
6. Codex 最终返回前强制更新 WBS。
7. `待审查` 与 `已完成` 必须严格区分。
8. **A 默认处理主旅行系统：入口、Planner、地图、路线、行程生成、推荐、AI。**
9. **B 默认处理个人中心：账户、Profile、管理、偏好、同行人、保存/历史。**
10. 开发工程同样按照上述模块划分，不再简单按“前端 B / 后端 A”分配。
11. Shared Infra / CI / Deployment 默认 A。
12. 跨模块只通过明确 Contract 交接，减少 A/B 同文件冲突。

## TASK-008 验收与范围记录（2026-09-05）

- Owner：A；Issue #51；实现提交 `e4648c031817816fb1cbd0dc44552a542d108c91`。
- 初始基线 `96a8829`；开发期间安全快进同步至 `6e5132b323c5f215a6c1d430eb702c076d8915ac`。TASK-006 PR #32 合并提交 `5bf85a8` 为基线祖先；TASK-007 不是依赖。
- 正式规格：`docs/ui/trip-planner.md v0.2`。1.5 / 1.6 / 1.7 / 1.11 的页面结构设计已随 v0.2 合入；1.14 只验证本 Planner 的响应式，1.17 的真实地图细节、1.18 的真实重规划反馈仍待后续任务，保持进行中。
- 4.1 / 4.8 / 4.13：独立 `/planner` Grid、六 Tab 执行栏、三条推荐方案的 UI shell 已完成，并经用户明确授权通过 PR #59 合入 develop。
- 4.2 / 4.6 / 4.14：仅本地 SVG 地图、多日路线、方案切换与 Mock 刷新交互完成；真实 Map / Route Provider 和真实重规划未接入，保持进行中，不标记完整业务能力完成。
- 7 个指定视口均通过；1600×900 右栏 400px、1440×900 右栏 360px（均 25%）；右栏上下各 418px，底栏 225px。右栏在宽度 <1200px 折叠；底栏在高度 <700px 或宽度 <768px 折叠。
- npm ci / lint / typecheck / build / diff check 通过；9 项 Node 单元测试通过；生产预览无 console / hydration 错误。本 Task 修改文件格式通过；全仓仅最新 develop 的 `docs/ui/companion-management.md` 格式失败，不越界修改。
- 详细证据：`docs/tasks/RESULT-TASK-008-a-trip-planner-shell.md`。不修改 `/start`、B 账户文件或工程配置；不接真实 Provider / AI / Auth / DB；完成后停止。
- 发布历史：最初提交附 `[skip ci]` 并保留 Draft 防止误合并；用户后续明确授权后，先同步最新 develop 并完成整合验证，再解除 Draft 合并。未修改工作流、未 force push。
- 最终合并：PR #59，`1a4201b3181460977c4f16b0c34f60c353751687`；集成验收 head `8920695`。lint / typecheck / build / 30 项 tests / 本任务格式 / diff check 通过；Planner、向导、个人中心浏览器复验通过。当前全仓格式的三份基线文档例外详见 Result。未启动 TASK-008.1。
