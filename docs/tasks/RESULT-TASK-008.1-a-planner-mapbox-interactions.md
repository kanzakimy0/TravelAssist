# TASK-008.1-A Result

## Status

Completed — 本轮 Mapbox 边界与 Mock 交互实现完成；WBS 为待审查，尚未合入 develop。

## Prerequisite

- TASK-008 PR #59 merged: Yes；merge `1a4201b3181460977c4f16b0c34f60c353751687`，已验证为 origin/develop 祖先。
- base commit: `8159c177b732606c4d1bd7433241677c5fdd8a27`（clean working tree；严格按指定顺序同步后创建分支）。交付前同步最新 develop 的文档更新，集成记录见 Tracking。
- design source found: Yes；完整读取 Task、Issue #60、Mapbox 设计、trip-planner、design-system、TASK-008 Task / Result、WBS；实现前读取本地 Next.js 对应指南。

## Tracking

- Issue: [#60](https://github.com/kanzakimy0/TravelAssist/issues/60)
- Task File: `docs/tasks/TASK-008.1-a-planner-mapbox-interactions.md`
- Branch: `feature/a-planner-mapbox-interactions`
- Commit: 待实现提交后补齐。
- PR: 待创建 → develop；使用 Draft 保留审查，不自行合并。
- WBS updated: Yes；4.2–4.5、4.8–4.9、4.11–4.13、7.1 的本 Task 子集待审查；4.6 / 4.14 / 4.15 完整能力仍进行中。

## Mapbox

- mapbox-gl installed: Yes，3.30.0；补充 `@types/geojson`，package / lockfile 一致。
- token env: `NEXT_PUBLIC_MAPBOX_TOKEN`；仅在 .env.example 留空并记录本地配置方式。
- real token committed: No
- live Mapbox verified: No；Reason if No: token unavailable。
- fallback verified: Yes；生产构建无 Token 时仍能完成范围、地点 / 区域详情、预约与时间回写。SDK 初始化受 WebGL 检查、错误处理与 18 秒超时保护。
- map re-created on range switch: No；单一 mount / controller 生命周期，范围只更新三份 GeoJSON Source；13 个角色 Layer；adapter 测试验证 setData / fitBounds / easeTo / cleanup。未冒充 live SDK 验收。
- 实现参考：[Mapbox 初始化](https://docs.mapbox.com/mapbox-gl-js/guides/get-started/)、[GeoJSON 更新](https://docs.mapbox.com/mapbox-gl-js/example/live-update-feature/)。

## Range Modes

- 1-day: 当前日完整正式节点、路线、住宿 / 餐饮区和 3 个附近 / 雨天备选。
- adjacent context gray routes: 仅范围边界的前一日最后节点 → 本日首节点、末节点 → 下一日首节点；透明度 25%，线宽为主线 64%，无隐藏日期序号 / 全日路线。
- 3-day: 有效连续窗口，每天 3–4 个核心地点、住宿区、跨日衔接；底栏保留三天摘要并展开其中一天，不改变范围；5 天 fixture 覆盖所有有效窗口与边界。
- all-trip: 城市 / 天数 / 晚数、机场枢纽、城际移动与住宿结构；隐藏普通景点、餐厅、餐饮区、步行 / 市内线路；点击城市聚焦并可进入单日 / 三日。

## Details

- attraction quick card: 小型浮层，类型插画、名称、状态、时段、停留、营业示例、前后交通与标签；加入、预约、替换、锁定、移出、详细动作均可操作。
- attraction detail: 推荐理由结合当前偏好 / 同行人 / 天气；游览建议、当前行程影响、交通、票务与附近住宿餐饮。
- hotel area detail: 区域理由、适用日期、枢纽衔接、优缺点、价格和行程影响。
- hotel recommendations: 每区 3 家 canonical Mock 酒店；详情包含双床 / 早餐 / 停车 / 行李 / 无障碍确认、入住退房与多渠道；多晚住宿只创建一笔预约。
- food area detail: 用餐区域 / 时段、菜系预算、排队预约、前后节点与绕路说明。
- restaurant recommendations: 每区 3 家 Mock 餐厅；详情、建议菜品、时长、约束、加入预约并替换可编辑的同类占位项。
- 所有缩略图明确标注为类型示意插画，非实景照片；所有价格、开放时间、库存和路线影响均为示例。

## Reservation State

- add reservation: 创建或复用当前方案 TripItem；幂等，不重复预约；替换不覆盖固定 / 锁定项。
- bottom itinerary status: 加入酒店 / 餐厅后立即显示具体名称与待预约；景点 / 活动显示待购票。
- booking tab: 读取同一 TripItem；根据单日 / 三日 / 全行程调整颗粒度。
- current plan pending count: 派生统计；渠道选择不减少数量，手动确认才减少。
- complete booking CTA: 当前方案的“完成预约”打开按日期排列的清单；官方优先 / 联盟标识 / 价格取消摘要；全部确认后显示“✓ 关键预约已完成”。
- fixed time: 浏览器验证餐厅 12:30 → 19:00 回写并固定；检查前后停留与 15 分示例缓冲，冲突会提示。
- replan protection: Mock 刷新、范围切换、换方案再返回均保留固定时间、已预约状态与设置。不自动改动已有确认预约的旅行日期。
- “前往预约（演示）”不跳转、不下单；“我已完成预约（手动标记）”仅记录本地状态，没有真实订单 / 支付功能。

## State Integrity

- single source: 一个 TripState reducer；各方案独立 TripItem 列表；地图、底栏、右侧与详情从同一状态派生。既有 shell 控件只使用兼容投影，不维护第二份行程。
- tripItemId map/timeline sync: Yes；统一 selectedTripItemId，地图与底栏双向选中，滚动至选中项；范围不重建业务草稿。
- provider raw data leaked into map: No；GeoJSON 仅含白名单位置 / 类型 / 标签 / 状态 / tripItemId，无原始 Provider payload 或报价信息。

## Responsive

| Viewport | Result                                                                                |
| -------- | ------------------------------------------------------------------------------------- |
| 1600×900 | Passed；右栏 400px，上下各 418px；底栏 1200×225px                                     |
| 1440×900 | Passed；右栏 360px，上下各 418px；底栏 1080×225px                                     |
| 1280×800 | Passed；右栏 320px，上下各 368px；底栏 960×200px                                      |
| 1180×800 | Passed；右栏折叠为 420px Drawer；底栏 1180×200px                                      |
| 1024×768 | Passed；右栏折叠，底栏 1024×192px                                                     |
| 390×844  | Passed；双面板默认折叠；详情 366px 宽，最大高 820px；Sheet 520px 高；预约全流程可操作 |
| 1440×650 | Passed；底栏折叠，Sheet 422.5px；右栏 360px，上下各 293px                             |

上述尺寸均无 document 横向 / 纵向溢出。保留 <1200px 右栏折叠、<700px 高或 <768px 宽底栏折叠。弹层内部按需滚动，不撑大主布局。

原生 modal dialog 提供焦点约束；Escape / 关闭恢复到 HTML 或 SVG Trigger。移动端嵌套预约层关闭先恢复“完成预约”，再关闭 Drawer 回到入口。地图有等价键盘地点 / 区域列表；底栏 Tab 支持方向键。状态有文字 / 符号，不只依赖颜色。减少动态效果时 camera duration 为 0（adapter 测试）。

## Validation

- npm ci: Passed；362 packages，0 vulnerabilities。
- lint: Passed。
- typecheck: Passed。
- format: 本 Task 修改文件 Passed；全仓仅既有 `docs/ui/companion-management.md`、`docs/ui/planner-map-interaction-booking-mapbox.md` 失败，未改无关设计文档。
- tests: 50/50 Passed；`node --experimental-strip-types --test tests/task-007*.test.mjs tests/task-008*.test.mjs`。其中本 Task 20 项，既有向导 / Planner 30 项。
- build: Passed；/planner 无 Token 仍静态预渲染成功。
- diff-check: Passed。
- console/hydration: 生产 Chromium 实际交互 error / warn 为空；早期发现并修复 SVG title 多文本片段导致的 hydration mismatch，复验无此问题。
- 浏览器：单日 / 三日 / 全行程的六个 Tab、范围与城市聚焦、地图 ↔ 时间轴、景点两级详情及加入 / 替换 / 锁定 / 移出、酒店与餐厅区域 / 推荐 / 详情、加入预约、渠道选择、餐厅改时、全部预约完成、Mock 重新规划、方案切换、更多设置、Escape / 焦点恢复、七个指定视口已实测。

## Scope Preserved

- real Booking/Agoda not added: Yes
- real restaurant providers not added: Yes
- real attraction providers not added: Yes
- Directions/Matrix/Search/Isochrone not added: Yes
- Transit not added: Yes
- AI/Auth/DB not added: Yes
- B files untouched: Yes；未修改 /start 或个人中心业务；仅同步上游原有文档，不接下一任务。

## Problems / Blockers

- 无本 Task Mock 功能阻塞；live Mapbox 验收未执行，原因是本机没有 Token。已按 Task 的无 Token 路径验证，不硬编码凭证。
- 两份全仓 Prettier 基线文档例外如上；npm 既有 ESLint 版本退役提示、unrs-resolver 安装脚本审批提示、Node 测试的 MODULE_TYPELESS_PACKAGE_JSON 警告未通过修改无关配置掩盖。
- 本仓 feature push 会自动创建并合并 PR，非 Draft PR 也会自动合并。本次提交附 `[skip ci]`，PR 保持 Draft；本地质量验证照常执行，未修改工作流。远端 CI 跳过不能表述为 CI 已通过。
- 历史 Blocked Result 来自 PR #59 未合并阶段；本结果替换该过期状态，前置合并已核实。
- 验收环境为当前 Chromium 与 viewport 模拟；未声称其他浏览器 / 真实触屏 / live Provider 验收。localhost:3000 已重新启动当前 feature 代码预览，生产验收使用 localhost:3002。
- 完成后停止，不继续 Provider / Route / Transit / AI / Auth / DB 或 TASK-009。

## Ready For Review

Yes — 本轮代码与 Mock 验收可供审查；Draft 仅用于防止自动合并，不表示已验证真实 Mapbox 服务。
