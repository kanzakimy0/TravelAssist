# RESULT — TASK-067-B — WBS 3.7 Main System State Runtime

## Metadata

- Owner：B（用户授权单项代做）
- Issue：[#391](https://github.com/kanzakimy0/TravelAssist/issues/391)，保持 Open
- Execution base / 最新 develop：`3a2779aee65c7335413adcc53ee5b4f7135c654c`
- Publication head：`3bd28dc789bd54030a7768d7ac760a8f64c4fbf1`
- Execution branch：`codex/b-wbs-3-7-main-system-state-runtime`
- PR：[#392](https://github.com/kanzakimy0/TravelAssist/pull/392) → develop（已 normal merge）
- WBS 3.7：B / 已完成（#391 / TASK-067-B；用户验收，PR #392 normal merge）
- Accepted final head：`7b0fc11c5b5b2d181baf13c6daa85ad08d2dcbca`；[exact-head Quality gate 35218450350 — PASS](https://github.com/kanzakimy0/TravelAssist/actions/runs/35218450350)。
- Merge commit：`8eefe08268c95d761e382205122fd974a5953fe1`；2026-09-17T12:21:14Z；双parent normal merge，tree与验收候选一致。
- Closeout：[WBS 3.7验收收口](../project/WBS-3.7-acceptance-closeout.md)；post-closeout CI以其独立提交记录。

## 1. 完成的当前运行时集成

实现了最小共享状态层：`StateNotice`（Loading/Empty/Error/Degraded/Info、可选单次公告）、`StateSkeleton`（静态装饰结构）和`StateAction`（复用现有 Button、真实 pending 与同步防重复 guard）。全部复用已接受语义 token，没有新 palette、token 或布局系统。

| Surface                     | 当前交付                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Home                        | 公共 Hero/Header/CTA 和静态图基线保留；AI 状态提示复用共享层                                                       |
| Start                       | hydration Skeleton；显式“本地示例”准备态及返回修改；Storage错误保留输入/原记录；现有47都道府县搜索零结果与清除搜索 |
| Planner                     | 浏览器恢复前原壳内 Skeleton；局部读/存错误；空草稿目录，保留有效工作区                                             |
| Planner Map                 | 未启用/失败/fallback可读说明，示意图与列表保留，无无效重试                                                         |
| Recommendation / Right Rail | 审计后维持同步本地候选及原Drawer；不制造异步状态                                                                   |
| Timeline / Summary          | 当前景点/移动节点不足的局部Empty；保留其他日期与类别                                                               |
| Trip Detail                 | 共享Planner；Empty与保存/读取错误，dirty/覆盖/原记录保护不变                                                       |
| Route Preview               | disabled/loading/stale/no_route/unsupported/error/ready明确区分；安全最小重试、single-flight、焦点恢复             |
| AI Visual Shell             | 未接入说明，Send仍disabled，输入/关闭/焦点保留；关闭target达到44px                                                 |
| Modal / Drawer / Popover    | 状态继承现有host语义，不增加trap/inert，不给Tooltip加Retry                                                         |

本次没有拓展3.7以外运行能力。没有Planner Store/Day Plan重写、4.18/4.19接线、Provider/AI/Engine/Booking/Payment、HTTP/API、远端Trip persistence、schema/migration或环境能力变化。7.3/7.8与其他WBS Owner/status未改。Grid tracks/breakpoints和宿主模态控制不变。

## 2. Frozen验收映射与当前边界

[48行运行时矩阵](../qa/TASK-067/state-runtime-matrix.json)给出每行 currentEvidence 与 limits：

| 分类                                | 数量 |
| ----------------------------------- | ---: |
| IMPLEMENTED_AND_TESTED              |   31 |
| ALREADY_SATISFIED_UNCHANGED         |    3 |
| CONDITIONAL_NOT_CURRENTLY_REACHABLE |    9 |
| OUTSIDE_CURRENT_RUNTIME_CAPABILITY  |    5 |
| BLOCKED_BY_SEPARATE_OWNER           |    0 |

分类适用于每行**当前可达部分**，不等于31项完整未来组合或48项浏览器测试全部PASS。异步推荐/摘要、远端Trip缺失/权限、AI真实失败、unknown COMMIT等没有当前所属能力，不通过新增请求或debug开关“填满矩阵”。AC-42/48为TASK-066历史设计-only门禁，本次保留原Frozen证据，由TASK-067的运行时授权另行审计。

Route活动状态仅通过既有开发gate及浏览器7.5规范fixture验证；生产构建保持disabled。Map测试覆盖未配置时的真实fallback，没有调用真实Mapbox/Provider。Start沿用既有本地timer，仅去掉伪阶段完成展示。

## 3. 最小必要修复

1. Route未知error.message不再透传：只按稳定category产生安全文案，既有contract和Provider gate不变。
2. 同一Route pending重复点击不再abort/restart扇出：hook同步active guard和共享action guard，16次立即激活只产生1个query。
3. Storage未知异常不进UI；Start读失败/坏JSON不再删原记录、不自动覆写，保存失败准确提示未保存风险。格式/key和已有保存保护不变。
4. Start本地示例不再显示虚假AI/路线阶段；返回现有步骤保留字段。
5. 实际截图发现Planner宿主CSS覆盖新恢复按钮，修正shared class优先级与原footer换行；实际对比度和最窄视口复验。

复现、约束、最小修复与兼容性在[QA README](../qa/TASK-067/README.md)逐项记录。没有借此修复无关业务或历史布局。

## 4. QA与可访问性

| 验证                                                                        | 结果                                                     |
| --------------------------------------------------------------------------- | -------------------------------------------------------- |
| npm ci                                                                      | PASS；395 packages，0 vulnerabilities                    |
| 修改前latest-develop full Node baseline                                     | PASS 2598/2598，0 fail/skip                              |
| TASK-067 focused                                                            | PASS 37/37                                               |
| Home/AI/Start/Planner/Route/Browser Trip相关组合                            | PASS 83/83                                               |
| 最终candidate full Node                                                     | PASS 2635/2635，0 fail/skip                              |
| 开发模式真实本地浏览器                                                      | PASS；4视口，36组，32截图                                |
| 生产模式Route disabled                                                      | PASS；4视口，8组，8截图；无query/retry，页面错误0        |
| lint / typecheck / format:check:deploy                                      | PASS；最终实际命令/日志hash见gate-evidence.json          |
| build / deploy:validate:local / deploy:build:local / deploy:verify-artifact | PASS；最终实际命令/日志hash见gate-evidence.json          |
| Task-owned formatting / scope guard / local links / git diff --check        | PASS；证据见gate-evidence.json                           |
| exact final-head GitHub Quality gate                                        | PASS；35218450350，exact accepted head workflow_dispatch |

可访问性：状态公告与busy分离、Skeleton装饰且不可聚焦；reduce下无扫光/脉冲；状态恢复控件与AI close实测至少44×44；键盘Enter/Tab/Escape、重试焦点保留、取消回区域标题、modal关闭回trigger、清搜索回输入框。Route恢复按钮normal/hover/focus/pending共16项computed-style对比度实测，最小约10.64:1。

响应式：1440×900、1024×768、390×844、320×568（含当前矮屏模式），无新增页面横溢出；截图库与hash在browser证据中。Map element与rectangle在局部失败/重试中保持。没有物理设备软键盘或人工screen-reader听读验收，没有认证完整多语言与所有历史控件。

重试/竞态：error→retry→error→retry→ready由真实操作结果收尾；无自动循环。已取消的旧ready响应不能覆盖后续no_route。保存/读取错误保留原保存Trip字节和当前页面状态；未知SQL/Auth/Provider canary不显示；生产无fixture后门。

初次full Node 2634项有2失败：旧AI文案断言更新但功能约束保持；并行构建时asset dry-run既有30s子进程超时，停止构建后最终全仓独立重跑通过2635/2635，未放宽断言/timeout。浏览器早期harness origin和既有no_route保留行为的两次校准失败均记录，未伪报PASS。原有npm deprecation/allow-scripts与MODULE_TYPELESS警告记录保留。

## 5. 变更清单

Runtime：

- `src/components/ui/state-notice.tsx`、`state-action.tsx`、`state-notice.module.css`：最小共享层。
- `src/features/start-flow/components/`中的`start-flow-shell.tsx`、`generation-step.tsx`、`wizard-layout.tsx`、`more-regions-modal.tsx`。
- `src/features/planner/components/`中的`planner-page.tsx`、`planner-map-shell.tsx`、`planner-route-query.tsx`、`planner-route-board.tsx`、`planner-sight-timeline.tsx`、`detail-itinerary-board.tsx`、`use-browser-trip.ts`。
- `src/features/planner/model/browser-trip-error.ts`、`route-presentation.ts`；`browser-trip.module.css`、`planner-route-board.module.css`。
- `src/features/home/components/ai-conversation-panel.tsx`与对应CSS。

Tests：

- `tests/task-067-main-system-state.test.mjs`：实际React SSR、Route状态矩阵、sanitization及integration保护。
- `tests/task-067-ui-loader.mjs`：复用现有TypeScript依赖的测试TSX/CSS loader，无新package。
- `tests/task-067-main-system-state.browser.mjs`：仅本地浏览器fault/fixture与响应式证据。
- `tests/task-025-2-concept-fidelity.test.mjs`：既有AI未接入文案断言同步，disabled/语义检查保留。

Docs：

- 本Result、TASK/CODEX发布指令、3.7 Owner correction。
- Master WBS仅3.7状态/跟踪。
- `docs/qa/TASK-067/README.md`、`state-runtime-matrix.json`、`gate-evidence.json`、`browser-development.json`、`browser-production.json`。

[机器gate证据](../qa/TASK-067/gate-evidence.json)包含完整实际文件清单及受测runtime/test SHA-256。旧Frozen文档、历史migration、package/lock、API/Engine/Provider/部署配置均未改。

## 6. 交付与验收收口

开始：3.7 = B / 进行中（#391 / TASK-067-B；用户授权单项代做）。

实现、QA及Draft PR完成后：3.7 = B / 待审查（#391 / TASK-067-B；Draft PR #392）。

用户于2026-09-17明确授权normal merge与closeout，已按验收head合入develop并完成文档收口：**3.7 = B / 已完成**。Issue #391保持Open，未启动其他WBS。原Draft阶段“待审查”记录属于历史。

无需数据库更改，因此没有运行Local Supabase/DB gates；没有Production/Staging DB操作；没有live/paid Provider调用；没有部署。提交前重新fetch检查develop，无漂移，保留原工作区与用户文件。

[完整QA](../qa/TASK-067/README.md)与[逐行矩阵](../qa/TASK-067/state-runtime-matrix.json)属于原验收候选；[机器验收回执](../qa/TASK-067/acceptance-closeout.json)记录合并及原证据指纹。历史gate/matrix/browser JSON未修改，其待审查标签和hash不代表收口后仍待审查。本次仅更新文档，不新增runtime/browser/DB验收声明。

CI首轮exact-head 35217842652 因5张可选QA截图副本进入全仓资产扫描而失败2项目录测试（2633/2635）。已移除这些提交副本，保留本地原图/40张hash；不改资产目录或测试断言。重新执行完整Node与新final-head Quality gate，具体最终回执绑定PR正文。
