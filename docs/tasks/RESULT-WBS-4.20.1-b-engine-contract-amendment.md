# TASK-WBS-4.20.1-B Result

## Status / Tracking

**B / 待验收；WBS 4.20.1 = 待审查。**仅完成现有4.20 Contract的增量Amendment；等待用户验收，不自动合并。

- Issue: [#282](https://github.com/kanzakimy0/TravelAssist/issues/282)，保持Open。
- Branch: `codex/b-engine-contract-amendment`
- Execution base: `origin/develop@fe538e7093bd58e7d0fe7fd434bf907dd132277a`
- Amendment commit: `3117af3ca734a1eab1f18ed1d0d98131c05be09d`（后续提交仅同步追踪）。
- Draft PR: [#283](https://github.com/kanzakimy0/TravelAssist/pull/283) → develop，保持Draft。
- Task: [TASK-WBS-4.20.1-B](TASK-WBS-4.20.1-b-engine-contract-amendment.md)
- Contract: [现有Engine Contract §24](../architecture/travelassist-engine-contract.md#24-wbs-4201-amendment行程合理性输出review-candidate)

## Audit / Compatibility

执行用户要求的status、branch、fetch、develop SHA、15条log前置检查。原工作区干净、在既有 `feature/b-travelassist-engine-contract`；采用独立worktree从最新develop开展增量工作，未合入其他候选分支。

完整读取Issue #282、Master WBS、原4.20 Contract/Task/Result、canonical `src/shared/contracts/trips/index.ts`、协作与追踪规范、质量门。父4.20仍为待审查，#201 Open、#238 Draft；旧Result中未合入/PENDING是既有历史追踪，本轮保留，不能据其陈旧文字忽略已在develop中的真实Contract。

近期43字段、Visit Profile及load设计实际位于未合并PR #266，#268负责候选集成审查。读取其POI master/scoring v0.2与itinerary feasibility候选的相关章节；仅采纳用户及#282明确授权的输入/输出语义，不冻结或复制候选公式、Profile Schema、43字段清单。

- §1–23除在EngineResult添加可选assessment引用一行外，逐字保持（归一化换行后验证）。
- ChangeSet、operation whitelist、validate/preview/apply/rollback、权限/确认、baseVersion、幂等、transaction/audit/rollback、Provider fact与canonical边界均保留。
- 顶层EngineOutcome保持accepted / needsConfirmation / blocked / unsupported；warning通过新增assessment.status与原warning issues独立表达，避免打破已有终态语义。
- optional assessment不表示旧Consumer可盲目忽略必要规则；缺少必要能力必须unsupported，发布前仍有A/B Consumer review gate。

## Contract Amendment

| 新增能力                              | 输出与边界                                                                                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 多维景点评分                          | Attraction/Profile/Rule引用进入可信policyContext；不复制43字段或偏好向量进ChangeSet                                      |
| minimum / recommended / 实际时长      | 结果中DurationEvidence带分钟值、planned/observed/unknown来源、Visit Mode和版本化证据                                     |
| duration too short / compressed visit | DURATION_TOO_SHORT / COMPRESSED_VISIT；硬下限blocked，可覆盖风险needsConfirmation，推荐压缩可warning                     |
| physical load / fatigue impact        | typed impact带state、direction、nullable value/unit、模型版本及duration/context依据，不固定最终疲劳值                    |
| schedule conflict                     | 复用SOFT_TIME_CONFLICT / HARD_TIME_CONFLICT，不建立同义code                                                              |
| 单景点 / 单日 / itinerary             | 独立scope、dimension、coverage和related assessments；DAY_OVERLOADED / ITINERARY_UNREASONABLE                             |
| 结果聚合                              | assessment区分五种status，reasonableness单独区分reasonable / unreasonable / undetermined；顶层仍服从原安全优先级         |
| 未知和时效                            | 缺失/未执行/unsupported不作all-clear；rule/profile/fact/context变化使preview/确认绑定失效，已committed幂等重放保持原结果 |

所有数据模型仍为文档伪TypeScript；只扩展同一个Engine结果，不新增src类型、另一个Engine或Trip Plan Schema。report不写回canonical item.assessment或持久化表。具体评分公式、阈值政策、疲劳累计/恢复、冲突算法及景点规则库全部留4.21及后续。

## UPDATE_DURATION / Dependencies

实查PlanItemV1无独立duration；schedule可空，TripDraftFacts.dates.durationDays是旅行天数，不能借用。

**UPDATE_DURATION继续unsupported。**附带私有duration字段仍fail closed，不翻译为UPDATE_TIME。设计案例使用用户显式UPDATE_TIME的canonical起止instant计算计划区间；不声称已观测到真实游览时长。

新增OD-DURATION-01细化原OD-4.16-01，等待A的4.16/4.17单一canonical表达及Consumer review。另列OD-ASSESSMENT-01、OD-RULE-01、OD-LOAD-01、OD-COVERAGE-01；所有相关模型、单位、规则版本、能力协商与上下文契约仍需后续审查。

## Design Acceptance

| 场景                                               | 期望设计结果                                                                       |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 清水寺30min，minimum60/recommended90（本例硬下限） | DURATION_TOO_SHORT、item unreasonable、blocked；不能确认绕过或被低负荷抵消         |
| 60–89min压缩游览                                   | COMPRESSED_VISIT；warning或明确needsConfirmation，与策略版本绑定                   |
| 90min                                              | duration accepted / reasonable；仍需路线、营业时间、交通、体力、单日和整段规则     |
| 90min但必要路线过期/营业冲突                       | ROUTE_FACT_EXPIRED / HARD_TIME_CONFLICT；总体blocked，保留duration通过             |
| 同一强度下30/90min                                 | 允许不同load/fatigue影响；必须记录duration依据和context，不能两次固定输出walking=7 |
| 未提供正式load模型                                 | unsupported/null，而不是伪造疲劳分值；与duration不足共存时按严格优先级聚合         |
| 单项都可行但day超载                                | 独立DAY_OVERLOADED及关联项                                                         |
| 每日局部通过但跨日恢复不足                         | 独立ITINERARY_UNREASONABLE及关联日；不在此实现累计公式                             |
| null schedule / 缺Profile / 阈值矛盾               | unknown/输入不足；必要检查不得accepted all-clear                                   |
| Profile/Rule/事实改变或已提交重放                  | 前者重新评估和确认；后者按原幂等契约返回原terminal结果                             |

Contract §24.7共14项补充设计验收，保留原§21。清水寺数字仅为用户给定测试条件，非官方营业或旅游建议。

## Validation

| 检查                                    | 结果                                                                                               |
| --------------------------------------- | -------------------------------------------------------------------------------------------------- |
| npm ci                                  | PASS；395 packages，0 audit vulnerabilities；未修改锁文件                                          |
| npm run lint                            | PASS                                                                                               |
| npm run typecheck                       | 首次全新worktree缺少Next生成的图片类型声明而失败；build生成next-env后复跑PASS，没有改源码/tsconfig |
| npm run build                           | PASS；Next16.3.4 production build                                                                  |
| Node全仓                                | **724 tests / 721 pass / 3 fail**                                                                  |
| npm run format:check                    | 47个既有文件失败；全部未修改且与develop基线相同，清单见下                                          |
| npm run format:check:deploy             | PASS                                                                                               |
| npm run deploy:validate:local           | PASS；DB/Auth/Route关闭、Map fallback、遥测导出关闭；仅配置校验，无部署/调用                       |
| 修改文档Prettier                        | PASS；WBS按仓库既有.prettierignore忽略，仅增量登记，不全表重排                                     |
| git diff --check                        | PASS                                                                                               |
| 文档专项一致性                          | 原核心契约保留；11个JSON设计块全部解析；30/90分钟区间、DURATION_TOO_SHORT与assessment索引/阈值一致 |
| 非文档差异                              | src/tests/tools/assets/public/package与develop无差异；未修改canonical或运行时                      |
| 浏览器 / DB / Provider / Engine runtime | 未运行，不属于纯Contract Amendment验收                                                             |

Node命令：`node --import ./tests/register-route-ts.mjs --test tests/*.test.mjs`。文档专项是对文本/JSON及证据一致性的检查，不是4.21运行时测试。

三项既有资产失败（与已记录TASK-033基线一致，相关tests/tools/assets/public及清单均未改变）：

1. `nightly --verify-only does not write canonical catalogs`
2. `complete library passes file, schema, hash, rights and protected checks`
3. `full scan has 100% catalog coverage`

前两项为四个design SVG与legacy inventory字节/hash记录差异；第三项为TASK-031的40张QA WebP未登记source catalog。本任务不修改素材清单或测试预期以消除失败。

全仓格式失败清单将在下节保留；原4.20历史Result的27项是当时基线，本轮实际47项，不沿用旧数量。

## Files / WBS / Stop

仅四份文档：

- `docs/architecture/travelassist-engine-contract.md`
- `docs/tasks/TASK-WBS-4.20.1-b-engine-contract-amendment.md`
- `docs/tasks/RESULT-WBS-4.20.1-b-engine-contract-amendment.md`
- `docs/project/WBS-TravelAssist.md`

4.20.1从进行中更新为B / 待审查；父4.20保持原待审查，4.21–4.24状态不变。原4.20 Task/Result、其他工作站WBS行和所有历史命名保留。

没有Planner/Detail UI、Engine runtime、评分器/疲劳计算器、DB/API/AI/Mapbox/Booking/Payment或新依赖。停止等待用户验收；不合并，不启动4.21。

## Existing Format Baseline (47 files)

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
