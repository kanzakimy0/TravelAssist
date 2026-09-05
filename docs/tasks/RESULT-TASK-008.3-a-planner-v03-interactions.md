# TASK-008.3-A Result

## Merge Preparation Addendum — 2026-09-06

用户已授权合并 #77。PR #85 已在隔离工作树安全同步最新 `origin/develop` `43c518d02acb45ff77fd6134c2837ea81e2523f5`，仅 `docs/project/WBS-TravelAssist.md` 发生冲突并保留双方正确追踪记录；应用代码无冲突。集成提交为 `004c40b`。重新验证结果：npm ci、lint、typecheck、build、64/64 Node tests、改动文件 Prettier、diff-check 全部通过。全仓 format-check 仍只有 17 份未由本 Task 修改的上游文档例外；最新 develop 相对原 PR 只增加文档，因此既有五尺寸真实 Mapbox / fallback 浏览器验收仍适用于相同应用树。

## Status

Completed — 实现与本地验收完成，待审查 / 未合并。全仓格式检查存在 15 份未修改的上游文档基线例外；本 Task 文件格式通过。未自动 merge，未继续 TASK-010。

## Prerequisite Check

TASK-008.2 / Issue #73 对应 PR [#83](https://github.com/kanzakimy0/TravelAssist/pull/83) 已按用户授权合入 develop，merge `627b73ae50697ad69ff979ea664ac2e1e60a14e7`。先验证 clean tree 与设计 v0.3，再从 develop 创建新分支，没有从 008.2 feature 继续叠加。Issue #73 已关闭；其原始参考图限制保留在合并附录，不追溯声称图像最终验收。

## Tracking

- Issue: [#77](https://github.com/kanzakimy0/TravelAssist/issues/77)，Open / 待审查。
- Task: [TASK-008.3](TASK-008.3-a-planner-v03-interactions.md)。
- Design: [trip-planner.md v0.3](../ui/trip-planner.md)，本次执行期间正式规格未变。
- Original Base: `627b73ae50697ad69ff979ea664ac2e1e60a14e7`。
- Integrated develop: `d42fa5b0f7b0ba95698efaf64dea7a6890dc9dc3`；新增架构文档及索引，无应用代码变更。
- Feature Branch: `feature/a-planner-v03-interactions` → `develop`。
- Implementation Commit: `58932555d26b4ef5fd98848e836e985848508066`。
- Documentation Integration Commit: `871d2e1964d28bbeef43424394f157e2532c2247`。
- PR: [#85](https://github.com/kanzakimy0/TravelAssist/pull/85)，待合并。Result 与状态回填提交仅更新追踪文档；最新 head 以 PR Commits 为准。
- WBS: [Master WBS](../project/WBS-TravelAssist.md) TASK-008.3 行为待审查；没有把真实 Route / AI / DB 标为完成。

## Changed Files

- Model: `src/features/planner/model/trip-model.ts`；v0.3 配置、日期保护、比例时间数据、住宿推荐/出发锚点派生。
- Data: `src/features/planner/data/planner-preferences.ts`；正式 v0.3 偏好词表与本地预算/节奏档位。
- New components: `preference-editor.tsx`、`proportional-timeline.tsx`、`map-quick-card.tsx`。
- Existing Planner components: quick/more settings、right panel、day range、bottom panel、plan recommendation、map shell、place details、popover、page 的接线与局部样式。
- Map adapter: `map/map-provider.ts`；只增加屏幕锚点通知与空白点击关闭，保留原实例生命周期与 Provider 白名单。
- Styles: `planner-interactions.module.css`、`planner.module.css`。
- Tests: `tests/task-0083-interactions.test.mjs`，并修正原三晚酒店测试的退房日 fixture（增加空白退房日，不删减原预约断言）。
- QA: `tools/qa/planner-v03-check.mjs`、[生产浏览器证据目录](../qa/TASK-008.3/README.md)。
- Tracking: 本 Result、TASK-008.3、WBS；TASK-008.2 的 Task / Result 添加用户授权合并记录。

## Implemented

### 右侧设置与日期

四类同行人沿用 Step 3 的 `adultMale / adultFemale / child / infant` 语义，独立数量控制与摘要。出发/返回日期同步所有方案的天数与夜数；无效日期、反向区间、固定/已确认预约改期、酒店退房与 Day 越界均原子拒绝，不丢数据。示例支持 1–60 天，新增日期为空白，不伪造已生成行程。

景点 / 餐饮 / 住宿为摘要 → 多选 Chips → 独立详细设置浮层，词表来自 v0.3。预算 4 档、节奏 5 档与日均预算/地点数摘要；9 类高级分区都有摘要、快速项/预约核对入口与详细设置。详细字段是当前旅行的本地偏好值，不假装执行真实路线规则或解除已有预约锁。

浮层默认关闭；打开不移动主面板。支持嵌套 Esc、外部关闭、焦点恢复，修复嵌套 blur 裁切、层叠遮挡与移动侧栏边界；未依赖本机浏览器不支持的新 Popover API。

### 范围与时间带

单日“第N天”、三日“从第N天开始”，邻近数字快捷与输入；连续三日只允许有效窗口。使用现有 range state / reducer，不新增第二套选择状态。

活动按 `endTime - startTime` 比例定位；已有 `TripItem.next` 交通说明解析为比例细条，未知交通不捏造时长，冲突不通过压缩交通掩盖。空白/缓冲保留，准确时间可 hover / 查看选中安排。三条时间带共用最早开始/最晚结束横轴；各日展示活动、移动、已有步行、预约数、强度与明确标注的本地规则建议。四个桌面视口均完整显示第三条带；移动端可横向查看时间比例，不变成等宽卡片。

### 地图与住宿联动

地图内快速卡支持 7 类对象：itinerary-point、recommended-poi、recommended-dining-area、recommended-stay-area、confirmed-stay-point、confirmed-restaurant-point、transport-node。Mapbox 投影/示意图锚点驱动圆点反馈、约 1.18 倍扩张、卡片展开与内容渐入；reduced motion 降级淡入。地图空白、其他对象、Close、Esc 可收起/切换；地图列表、实际渲染图层和底栏使用同一 TripItem ID。

正式地点包含时段/时长/状态/风险、前后衔接、2–3 条本地 Mock 判断及详细入口；推荐地点有理由、插入示例时段、天气/同行人适配、加入/替换/备选。餐饮/住宿区先解释区域，再列 3 个现有候选，不直接把区域冒充酒店或餐厅。

酒店经现有手动 Mock 流程确认后，该晚推荐区消失，变为具体已定酒店点；底部住宿与待预约数同步。次日路线使用酒店坐标作出发锚点；若次日尚无路线，也保留明确出发点，不复制 TripItem 或虚构路段。多晚住宿仍是一笔预约。

## Test / Typecheck / Build Result

- `npm ci`: Passed，362 packages / 0 vulnerabilities；package 与 lock 未改。已有 ESLint deprecation / unrs-resolver 安装脚本审批提示留档。
- `npm run lint`: Passed。
- `npm run typecheck`: Passed。
- `npm run test --if-present`: 成功退出，仓库未定义 test script；额外 Node 回归 **64/64 Passed**。
- `npm run build`: Passed，10 个静态页面预渲染，不依赖新服务或云数据库。
- `git diff --check`: Passed。
- 本任务修改文件 Prettier check: Passed。
- 完整 `npm run format:check`: 已执行，15 份未修改上游文档不符合格式，详见下方。不改忽略配置或无关文档来掩盖基线问题。
- 本地生产 Mapbox 与强制离线 fallback：五视口、比例几何、三日共轴/可见性、日期保护、设置/二级浮层、实际地图点击、Morph/reduced-motion、空白/Esc/焦点、住宿确认与次日锚点、再生成保留预约、六 Tab 均通过。
- Console / hydration: 两种生产验收均无 application pageerror / hydration error。真实 Mapbox 无 console error，仅 GPU 截图 / preload warning；离线模式的主动阻断资源错误为预期。记录已去除 URL / Token。
- `localhost:3000` 已恢复运行当前 feature；生产验收使用独立本地端口。

## Screenshot Validation

实际页面证据：

- [1600×900](../qa/TASK-008.3/mapbox-1600x900.png)
- [1440×900](../qa/TASK-008.3/mapbox-1440x900.png)
- [1280×800](../qa/TASK-008.3/mapbox-1280x800.png)
- [1180×800](../qa/TASK-008.3/mapbox-1180x800.png)
- [390×844](../qa/TASK-008.3/mapbox-390x844.png)

[完整截图索引 / 复跑说明](../qa/TASK-008.3/README.md) 包含同尺寸 fallback、三日比较、Drawer/Sheet、三级偏好、快速卡与已确认酒店证据。保持桌面左右 75/25、右栏 1:1、底栏 25vh，无 document 级横纵溢出。

## Scope Preserved

保留 Mapbox Token/fallback、Trip State、预约/fixedTime、Map↔Bottom、Provider 边界、六 Tabs、Drawer/Sheet 与 TASK-008.2 暖色视觉。不修改 `/start`、B Personal Center、依赖或工程配置；不接新 Provider / API / AI / Auth / DB，不提交真实 Token。同步来的架构文档原样保留，未执行后续数据库或 TASK-010 工作。

## Blockers / Known Limitations

无实现阻塞。当前旅行偏好/备选仍仅保留于页面内存，与既有 Planner 生命周期一致；未声称刷新持久化或真实订单/路线计算。详细规则是可编辑本地字段，生成/判断仍为显式 Mock。长内容仅在浮层内滚动，主页面无纵向溢出。

格式基线例外（均与已集成 origin/develop 一致）：

1. `docs/ai/trip-judgement-two-phase.md`
2. `docs/architecture/db-orm-migration-standards.md`
3. `docs/architecture/trip-plan-data-ai-takeover.md`
4. `docs/assets/personal-center-generated-images-20260905.md`
5. `docs/README.md`
6. `docs/tasks/TASK-009-a-db-foundation.md`
7. `docs/tasks/TASK-010-a-main-flow-navigation.md`
8. `docs/tasks/TASK-010-b-personal-center-navigation.md`
9. `docs/tasks/TASK-WBS-5.4-b-personal-center-generated-assets-integration.md`
10. `docs/tasks/TASK-WBS-5.4-b-profile-account-ui.md`
11. `docs/ui/companion-management.md`
12. `docs/ui/navigation-flow.md`
13. `docs/ui/personal-center-responsive-states.md`
14. `docs/ui/planner-map-interaction-booking-mapbox.md`
15. `docs/ui/trip-detail.md`

## Ready For Review

Yes — 可进行人工代码与视觉审查。PR #85 保持 **Draft / 未合并** 以遵守用户“不自动 merge”：仓库现有 feature 自动合并工作流要求提交使用 `[skip ci]` 并保持 Draft。远端 CI 跳过不计为通过。完成后停止，不继续 TASK-010。
