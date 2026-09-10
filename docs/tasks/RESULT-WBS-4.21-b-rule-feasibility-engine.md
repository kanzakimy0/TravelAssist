# TASK-WBS-4.21-B Result

## Status / Tracking

**Owner B / 待验收；WBS 4.21 = B / 待审查。**确定性 Rule / Feasibility Engine 已实现并通过专项验收，等待用户审查；不自动合并或启动4.22。

- Issue: [#287](https://github.com/kanzakimy0/TravelAssist/issues/287)，保持Open。
- Branch: `feature/b-wbs-4-21-rule-feasibility-engine`
- Execution base: `origin/develop@1fa38239df508683d5f1f522135233ad09e544f1`
- Task authoring base保留：`afed8292036d233b9336bcd02b8f5bd66f53037f`
- Implementation commit: `f34466819b6c0c1faa048744c1da0ac2dfa8abf0`（后续提交仅补追踪链接）。
- Draft PR: [#288](https://github.com/kanzakimy0/TravelAssist/pull/288) → develop，保持Draft。
- Task: [TASK-WBS-4.21-B](TASK-WBS-4.21-b-rule-feasibility-engine.md)
- Architecture: [Rule / Feasibility Engine](../architecture/rule-feasibility-engine.md)

按用户顺序执行status、branch、fetch、develop SHA和15条log，再读取指定远端Task、完整Codex指令及Issue #287。指定远端分支启动包已通过#285/#286进入develop；在独立worktree创建同名本地分支并ff-only至最新develop，没有覆盖原工作站。发布前再次fetch，develop未变化。

核对既有4.20/4.20.1 Task、Result、Contract及canonical4.17；与上次已读取的合并版本相比这些内容未变。父4.20整体freeze仍有Open Decisions，但用户和已合入启动包明确授权本次纯规则实现；未决生产依赖保持unsupported，不借启动授权冻结所有规则。

## Architecture / Rule Registry

- `src/shared/contracts/engine/index.ts`：实现原4.20/4.20.1伪TypeScript类型，不建立第二套协议。AST契约测试逐项比对文档声明。
- `src/server/engine/index.ts`：纯validate / preview入口、可信access绑定、双revision校验、operation能力门与detached canonical candidate。
- `input.ts` / `context.ts`：严格JSON / ChangeSet / versioned evaluation-context解析，复用canonical和公开Route parser。
- `registry.ts`：六条稳定ruleRef/version；可插拔、受信纯LoadModel及显式evaluation model。
- `rules.ts`：item、day、itinerary独立评估与关联；`report.ts`：统一issues、coverage、assessment、confirmation和impact聚合。
- `json.ts`：有界JSON检查、稳定key排序和SHA-256，拒绝getter/cycle/non-finite等非JSON值。

没有外部请求、时钟读取、随机数、文件业务写入、数据库或UI私有state。evaluationTime由调用者显式提供。入口仅导出validate、preview与工厂；不导出apply/rollback。

## Item Feasibility / Duration

从canonical schedule的instant差派生planned duration；Profile提供minimum/recommended、Visit Mode、版本和freshness。测试阈值来自fixture，未硬编码清水寺。

- 30 < minimum60：DURATION_TOO_SHORT、unreasonable；fixture硬下限blocked。
- 60–89 < recommended90：COMPRESSED_VISIT，按policy为warning或needsConfirmation。
- 90：duration accepted，但schedule/route/load/day/itinerary仍独立检查。
- null schedule、缺Profile、过期/冲突阈值、缺mode：coverage gap，不能拿recommended代替实际停留。

**UPDATE_DURATION仍unsupported。**没有添加canonical duration字段。真实observed duration来源仍待4.16/4.17/拥有者契约；当前不伪造已实际游览的时间。

## Physical Load / Fatigue

提供 `evaluation-duration-context@1` / `evaluation-load-v1`，按baseline walking/physical、planned minutes及坡度/台阶/环境/参与者context产生负荷。示例walking7/physical5、单位context时30min=3、90min=9；walking7不是固定最终疲劳7。

这是明确版本化的评估模型，不是永久产品公式或生理疲劳标准。模型函数为可信代码注册，不可由请求传入；metadata、单位和有限非负输出校验，输入冻结。缺模型/未知版本/抛错/NaN/修改输入均fail closed；缺context输出null而非0。

Visit load、Route walking和Day fatigue分开。Route按有时长事实的walking segment计算一次，不重复加steps或POI原始评分。Day fatigue汇总visit+route load；跨日使用显式priorLoad与recoveryBefore，不从“有餐厅/休息点”自动生成恢复值。priorLoad未知也不能假装从零开始。

## Schedule Conflicts / Provider Facts

检查同日所有item区间、canonical顺序、跨日区间/前后顺序、可信opening windows及相邻转场窗口。复用SOFT_TIME_CONFLICT / HARD_TIME_CONFLICT；已确认booking、canonical lock、硬交通类型和可信protected refs参与硬约束判定。

使用现有RouteResponse/validator及ProviderFactRef绑定；检查引用一致性、subject、端点、Provider、fetched/observed时间、confidence、expiry、已知模式/来源及duration/arrival一致性。缺失/过期路线为PROVIDER_FACT_MISSING / ROUTE_FACT_EXPIRED，不使用城市中心、0,0或默认分钟数补造。

未实现Provider TTL/retention生产决策、live fetch或新的Provider Schema。调用者必须在可信边界提供经过拥有者审查的事实及策略。当前context是versioned evaluation adapter输入，不声称POI/Profile/Provider生产接线已完成。

## Day Capacity

独立计算：

- scheduled duration；
- 已知transfer minutes；
- 显式buffer；
- day hard window；
- policy指定的meal/rest windows（重叠区间取并集，不双算）；
- visit+route physical load和day load limit。

输出DAY_OVERLOADED及相关item/day assessments。单项duration全部通过仍可因总容量或负荷超限而不合理。软风险保留warning/需确认，硬约束blocked，不被matchingScore抵消。

## Itinerary Reasonableness

独立检查跨日carry、recovery、连续高负荷、前一日coverage和跨日时间冲突。每日局部通过但连续3天恢复不足时返回ITINERARY_UNREASONABLE。

它还保留并关联item/day/schedule已发现风险与coverage缺口；不会用平均评分抹平超载日，不擅自将warning变blocked，也不把blocked降级。缺事实为undetermined；已有明确不合理证据不会因其他输入未知而被删除。

## Contract Compliance / Preview

- EngineResult / AssessmentStatus / Reasonableness / Coverage / DurationEvidence / impacts / reasonCodes / sourceRefs / issueIndexes / relatedAssessmentIds均按原Contract实现。
- 顶层outcome保留四种；warning表现为accepted + warning issues和assessment.status=warning。
- 同snapshot、ChangeSet、context及rule/model版本，重复20次及调整对象key顺序均得到相同序列化结果；注册表顺序不改变回放。
- profile/policy版本、evaluationTime或context变化改变contextFingerprint/previewHash。
- preview生成独立before/after，重新通过canonical parser；不改输入、revision、canonical assessment或任何持久状态。
- replay.duplicate=false、transaction.not_started、resultingVersion=null：这是纯确定性回放，不是4.22持久化幂等。
- permission/unsupported-op/canonical-invalid输入不产生preview；可解释的feasibility冲突可以返回canonical有效的候选用于说明风险。

## Unsupported / Open Decisions

明确能力范围：

- 可对现有snapshot评估；当前启用UPDATE_TIME和REORDER_ITEMS纯内存预览。
- 其他白名单operation保持可识别但unsupported，未偷偷启用ADD/DELETE/MOVE/booking/macro等动作。
- UPDATE_DURATION等待canonical正式表达；真实observed duration及production Visit Mode/Profile接线未实现。
- AI/system/provider_event proposal因确认/授权policy未关闭而unsupported。
- booking/payment依赖的变更和booking freshness规则保持unsupported；仍展示独立发现的硬冲突。
- system hard lock不能改，user lock及已知fixed/time敏感变更需要确认；未实现grant签发或事务权限。
- 可插拔模型是trusted code；运行时不可能证明任意JavaScript插件纯度，因此没有外部动态插件加载，模型需审查并按语义升级版本。
- 4.22数据库transaction、幂等存储、audit/outbox/history、apply/rollback及Booking/Payment副作用均不存在。

这些限制与missing/unsupported输出均有测试，不以完整fixture通过掩盖未就绪生产依赖。

## Test Matrix

新增 **77/77** 专项测试，涵盖Task A–H及边界：

| 范围              | 证据                                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| A/B/C duration    | 30/60/75/89/90分钟，硬/软minimum和warning/confirmation                                                                          |
| D load            | 30 vs90、context倍数、模型version/unit、NaN/修改输入、未知模型                                                                  |
| E day             | 独立item通过但时间/负荷超载，buffer、meal/rest窗口                                                                              |
| F itinerary       | 每天通过但恢复不足、连续高负荷、初始priorLoad未知                                                                               |
| G Provider        | 缺失、过期、未来时间、低confidence、错subject/端点、未知时长/模式/来源                                                          |
| H unknown         | schedule/Profile/mode/冲突阈值/context/model/recovery/booking未知                                                               |
| Safety            | access、双revision、locks、unsupported operations、43字段/私有duration注入、重复ID、非法timezone、cycle/getter/NaN/sparse input |
| Replay / Contract | 20次确定性回放、key/registry顺序、hash失效、原类型AST、完整结果refs、canonical preview、无副作用                                |

## Validation / Baseline Comparison

| 检查                        | 结果                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------ |
| npm ci                      | PASS；395 packages，0 vulnerabilities；锁文件未改                                    |
| npm run lint                | PASS                                                                                 |
| npm run build               | PASS；Next16.3.4 production                                                          |
| npm run typecheck           | PASS（build已生成Next环境类型；全新worktree最初缺图片声明的问题未通过源码/配置绕过） |
| 4.21专项                    | **77 tests / 77 pass / 0 fail**                                                      |
| develop baseline全仓        | **724 tests / 721 pass / 3 fail**                                                    |
| 当前分支全仓                | **801 tests / 798 pass / 3 fail**                                                    |
| 新增失败                    | **0**                                                                                |
| npm run format:check:deploy | PASS                                                                                 |
| 修改文件Prettier            | PASS；Master WBS按现有ignore约定，未整表格式化                                       |
| npm run format:check        | 47个既有未改文件失败；清单见下                                                       |
| git diff --check            | PASS                                                                                 |

命令：

```sh
node --import ./tests/register-route-ts.mjs --test tests/wbs-4-21-rule-feasibility.test.mjs
node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs
```

精确基线与候选的三项失败名称一致：

1. nightly --verify-only does not write canonical catalogs
2. complete library passes file, schema, hash, rights and protected checks
3. full scan has 100% catalog coverage

前两项为四个design SVG与legacy inventory byte/hash差异；第三项为TASK-031的40张QA WebP未登记source catalog。相关素材、工具、原测试和清单均未修改。对照日志保存在独立worktree的 `.cache/qa/wbs421/`；测试及合成fixture已随本任务提交，可直接复跑。没有声称全仓全绿。

## Native Node Quality-Gate Baseline

另按仓库workflow的原生命令 `node --test tests/*.test.mjs` 完整对照：

| 原生命令                               | Tests | Pass | Fail |
| -------------------------------------- | ----- | ---- | ---- |
| 独立、未修改的develop@1fa3823 checkout | 723   | 719  | 4    |
| 本分支                                 | 800   | 796  | 4    |

四项失败名称完全一致：三项素材基线，加既有 `tests/task-025-2-coral-palette.test.mjs` 的ERR_MODULE_NOT_FOUND（map-provider导入无扩展名route-color）。该文件及Planner均未修改。额外loader版本能运行该文件的两条测试，所以显示801项/798通过/3失败；原生命令把加载失败算成一项，因此总数少一项。新增77条在两种命令下全部通过。

新的4.21测试复用仓库register-route-ts helper并动态导入被测模块，本身兼容原生node --test；没有修改旧测试、workflow或package来隐藏问题。原生基线checkout与日志均保留，Result不声称现有CI全绿。

## Files Changed / WBS / Stop

- `src/shared/contracts/engine/index.ts`
- `src/server/engine/{index,input,context,json,registry,report,rules}.ts`
- `tests/wbs-4-21-rule-feasibility.test.mjs`
- `tests/fixtures/engine-feasibility.mjs`
- `docs/architecture/rule-feasibility-engine.md`
- `docs/tasks/TASK-WBS-4.21-b-rule-feasibility-engine.md`
- 本Result
- `docs/project/WBS-TravelAssist.md`

WBS4.21：B / 待审查；4.20父审查门、4.20.1已完成和其他工作站记录不变；4.22–4.24未启动。原4.20.1追踪中的“4.21未启动”保留为历史，本次最新4.21行及tracking为当前状态。

未修改Planner/Detail/Personal Center/Home UI、canonical Trip Plan/Route契约、DB/API/Auth服务、Provider、AI、Booking/Payment、assets、package或测试预期。停止等待用户验收，Draft PR不自动合并，不启动4.22。

## Existing Format Baseline

- `docs/ai/trip-judgement-two-phase.md`
- `docs/architecture/cross-module-contract-handoff.md`
- `docs/architecture/db-foundation-bootstrap-plan.md`
- `docs/architecture/db-orm-migration-standards.md`
- `docs/architecture/trip-plan-data-ai-takeover.md`
- `docs/assets/asset-library-strategy.md`
- `docs/assets/asset-variant-sizing-spec.md`
- `docs/assets/catalog/legacy-inventory.v1.json`
- `docs/assets/personal-center-generated-images-20260905.md`
- `docs/project/WBS-3.1-3.2-owner-correction.md`
- `docs/project/WBS-3.2-static-first-amendment.md`
- `docs/project/WBS-5.1-LOCAL-ASSET-COPY-MAP.md`
- `docs/project/WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md`
- `docs/qa/TASK-030/browser-report.json`
- `docs/qa/TASK-031/account-browser-report.json`
- `docs/qa/TASK-031/evidence.json`
- `docs/qa/TASK-031/geometry-report.json`
- `docs/qa/TASK-031/README.md`
- `docs/qa/TASK-031/test-report.json`
- `docs/qa/TASK-033/browser-report.json`
- `docs/qa/TASK-033/README.md`
- `docs/qa/TASK-033/screenshots.json`
- `docs/qa/TASK-033/test-report.json`
- `docs/README.md`
- `docs/tasks/RESULT-TASK-025-a-homepage-animated-background.md`
- `docs/tasks/RESULT-TASK-031-b-main-account-entry-closeout.md`
- `docs/tasks/RESULT-TASK-033-b-ai-floating-entry-closeout.md`
- `docs/tasks/TASK-009-a-db-foundation.md`
- `docs/tasks/TASK-014-b-wbs-1-10-attraction-activity-display-rules.md`
- `docs/tasks/TASK-025.2-a-homepage-concept-fidelity-amendment-v1.1.md`
- `docs/tasks/TASK-030-b-main-entry-closeout.md`
- `docs/tasks/TASK-031-b-main-account-entry-closeout.md`
- `docs/tasks/TASK-033-b-ai-floating-entry-closeout.md`
- `docs/tasks/TASK-WBS-0.9-b-contract-handoff-rules.md`
- `docs/tasks/TASK-WBS-5.1-b-visual-assets-integration.md`
- `docs/tasks/TASK-WBS-5.4-5.5-acceptance-closeout.md`
- `docs/tasks/TASK-WBS-5.4-b-personal-center-generated-assets-integration.md`
- `docs/tasks/TASK-WBS-5.4-b-profile-account-ui.md`
- `docs/tasks/TASK-WBS-5.5-b-preference-center-ui-amendment-local-assets.md`
- `docs/ui/attraction-activity-tag-display-rules.md`
- `docs/ui/companion-management.md`
- `docs/ui/navigation-flow.md`
- `docs/ui/personal-center-design-freeze-v1.md`
- `docs/ui/personal-center-responsive-states.md`
- `docs/ui/planner-map-interaction-booking-mapbox.md`
- `docs/ui/planner-right-panel-secondary-tabs.md`
- `docs/ui/trip-detail.md`
