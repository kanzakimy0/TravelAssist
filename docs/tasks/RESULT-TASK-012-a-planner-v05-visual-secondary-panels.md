# TASK-012-A Result

## Status

Blocked — 实现与自动化回归已交付，1180px 侧栏要求与推荐方案尺寸冻结的冲突尚待用户确认。暂时保留基线 Drawer，不擅自改变推荐卡。PR 保持 Draft，不自动合并。

## Prerequisite

- TASK-011 PR #102 merged: Yes；用户授权后已合并。
- Base commit: `4c1d9bbf1311a10b1e9db5bde00fe2e7b12fccab`。
- Design source: `docs/ui/planner-right-panel-secondary-tabs.md` v0.5；Task / trip-planner / Mapbox 附录 / trip-detail 已读取。
- 实现使用独立 worktree；用户主工作区的未提交改动未被覆盖，未更改 localhost:3000 服务。

## Tracking

- Issue: #111。
- Task File: `docs/tasks/TASK-012-a-planner-v05-visual-secondary-panels.md`。
- Branch: `feature/a-planner-v05-visual-secondary-panels`。
- Commits: `64e53b3b3d8c5adeaeb867d00e8d581384a6f2c2`（实现）；`f95a0aa`（PR 追踪）；`0b93d57d81fdf400f34178ef702219e2f60177f9`（安全集成最新 develop `e725d21`）；最终文档追踪见 PR head。
- Pull Request: [#124](https://github.com/kanzakimy0/TravelAssist/pull/124)（Draft → develop）。
- WBS updated: Yes；TASK-011 已完成，TASK-012 阻塞 / 实现待审查。
- TASK-011 最终集成验证提交 `b3d411b`，合并 `4c1d9bb`；其 Task / Result / WBS 合并状态同步纳入本次文档追踪。

## Implemented

- Top shell / gradient：地图实际铺到顶部；仅 Logo 返回首页；右上搜索 / 通知 / 头像菜单；搜索和通知明确为本地入口演示。向右 CSS Gradient 与底部 44px 向下 Gradient 均不接收点击。
- Map controls：六项窄图层栏（图层 / 景点 / 交通 / 酒店 / 美食 / 更多）、折叠与既有已订活动开关；原日期范围 / 数字选择保留。定位当前日、缩放、比例尺避开底部渐变。
- 修复浏览器发现的 Mapbox CSS 优先级冲突：SDK 的 relative 覆盖原 absolute 导致 host 高度为 0；现在 host 和真实 canvas 填满地图区，自动断言检查实际尺寸而非只看“已加载”状态。
- Right settings：96px 同行人 / 日期双卡，三张偏好卡和最多三条快速偏好摘要；更多设置与重新生成按钮同排同高。移除旧上半溢出遮挡，下半推荐组件不变。
- More settings：七分类工作台复用现有 PreferenceEditor；openingSnapshot / settingsDraft / dirty count；取消 / Esc / 外侧关闭恢复；保存只更新偏好；pending N 项变更；影响预览列出日期、普通节点、受保护预约 / 酒店 / 锁定与固定时间；确认使用原 Mock replan。增加原生 Dialog 的显式 Tab 焦点循环。
- Bottom tabs：原六名称、图标文字、均分分隔与珊瑚色下划线；桌面面板 clamp(200px,25dvh,252px)，所有 Tab 保持相同高度；既有一日 / 三日比例时间轴不重写，全日保留城市聚合与范围入口。
- Secondary panels：移动链与接驳缓冲、预约完成度 / 待办 / 手动确认、天气样例与安全替换预览、跨夜住宿与餐饮缺口、可解释的本地旅行体检。未获得的步行距离、换乘次数、票价等明确待核对，不伪造真实 Provider 结果。
- State and navigation preservation：纯 selector 从当前 TripState 派生范围、方案、选中、预约、住宿；地图选择不强制回到行程 Tab；二次点击已有详情入口；确认酒店和固定预约保护沿用既有 reducer；Planner → Detail 保留同一实际 Mapbox canvas。
- 无 /start、Personal Center、Auth、DB、Directions、Search Provider、AI、新依赖或真实订单 API 改动。

## Frozen Area Verification

- Recommendation component changed: No（源文件对基线逐字节断言）。
- Visible structure changed: No；区域和三张卡的尺寸、文字、顺序、图形、标签、选择语义未变。
- Screenshot regression: [六尺寸前后证据](../qa/TASK-012/recommendations-before-after.md)。
- 截图不宣称像素完全相同：基线中上半“进入行程详情”按钮和阴影曾溢出到推荐区顶部；修正上半布局后该遮挡消失，推荐卡自身未改版。

## Validation

- npm ci: Passed，362 packages；未改 package.json / package-lock.json。
- lint: Passed。
- typecheck: Passed。
- tests: `npm run test --if-present` 无现有 test script；额外运行全部 `tests/*.test.mjs`，114/114 Passed（新增 16 项）。原 TASK-010 静态导航断言更新为新的 WorkspaceHeader 入口，保留真实首页与个人中心链接验证。
- format: Changed files Passed；全仓 format:check 在集成最新 develop 后有 27 个未修改文件的既有告警；全部与当前 origin/develop 一致，与 PR 变更文件交集为零。初始干净基线为 25 个，本 Task 修复自身 Task 文档格式，未批量改无关文档。
- build: Passed；无 Token 的构建和使用本机公开 Mapbox Token 的测试构建均通过；不依赖真实数据库。
- diff-check: Passed。
- browser QA: 1600×900 / 1440×900 / 1280×800 / 1180×800 / 1024×768 / 390×844 的真实 Mapbox 与 forced fallback 均通过已实现行为断言；无应用 console / hydration error、无 document 横纵溢出。1180 使用既有 Drawer，**不是**桌面侧栏验收通过。
- 114 项 tests、六尺寸 [Mapbox](../qa/TASK-012/qa-mapbox.json) / [fallback](../qa/TASK-012/qa-fallback.json)、[交互验收](../qa/TASK-012/interaction-qa.json)、[TASK-011 Detail 回归](../qa/TASK-012/detail-regression/report.json)。
- 实际 Mapbox canvas 在范围、折叠、Planner → Detail 后不重建；上下渐变 computed pointer-events:none；焦点循环 / Esc / restore、草稿取消保存、影响预览、地图到移动 Tab、第二次点击详情、天气替换取消、预约渠道与手动确认、多日六 Tab 均已检查。
- Mapbox 初始网络沙盒拒绝访问时验证 fallback；允许联网的浏览器中验证真实底图。未提交 Token。

## Known Limitations

1. **1180px 规范冲突待确认**：基线在 <1200px 使用 Drawer，推荐区域宽 418px；按 v0.5 改为侧栏将改变冻结卡片尺寸。目前按硬性冻结保留 Drawer，已向用户请求选择。此项阻止宣称完整任务验收完成。
2. 全仓 27 个既有格式告警仍在，详见 [格式基线](../qa/TASK-012/format-baseline.md)；不属于本 Task 新增问题。
3. 路线、天气、价格、预约和重新生成继续为本地 Mock；搜索、通知、凭证上传和联系渠道没有连接真实服务。重新生成保留原有不改动正式路线的 Mock 语义，不显示假计算结果。
4. 本 Task 不创建 DB/Auth/Provider，不接 TASK-013，不合并此功能分支。

## Ready For Review

No — Draft 已供查看；1180px 规范冲突需确认后再完成正式验收。
