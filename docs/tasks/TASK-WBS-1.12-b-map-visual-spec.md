# WBS-1.12-B — 地图视觉 / Pin / 区域 / 路线规范

- WBS ID：1.12
- Owner：B（用户明确单项改派；不改变 A 的主系统实现责任）
- 执行方式：ChatGPT 直接设计，无 Codex、无网页实装
- 状态：待审查（设计已交付，待用户验收与合并）
- 开始 / 交付日期：2026-09-07（Asia/Tokyo）
- Issue：#176，保持 Open
- PR：#177，保持 Draft / Open，不自动合并
- Branch：`docs/b-wbs-1-12-map-visual-spec`
- Base：`develop@85675375a52a1bb1adaf37d9b8ea0a48a467eae1`
- 设计 Commit：`687fa0644cbd5670fa92dfc3e43094b77e9188e7`
- WBS 更新 Commit：`236925985605cefe1ad2bc8d43899d14b4819b73`
- 前置：WBS 1.5 已完成。1.10 为相邻标签规格，保持其待审查状态，不代其验收。
- 设计书：`docs/ui/map-visual-pin-region-route-spec.md`
- Result：`docs/tasks/RESULT-WBS-1.12-b-map-visual-spec.md`

## 目标

把当前 Planner / Detail 地图视觉整理成可验收、可供后续实现引用的规格，消除旧文档之间的地图布局、日期颜色、Pin、区域和路线表达冲突。不重新设计已验收页面。

## 必读与对照

读取最新 Master WBS、A/B Task 和 Issue / PR，并核对：

- `docs/ui/planner-right-panel-secondary-tabs.md` v0.5：整体布局与视觉优先。
- `docs/ui/trip-planner.md` v0.3：规划范围、Pin 交互、地图与底栏联动。
- `docs/ui/trip-detail.md` v2.0：详情模式日期、灰线和执行状态。
- `docs/ui/planner-map-interaction-booking-mapbox.md`：空间与业务边界。
- `docs/ui/attraction-activity-tag-display-rules.md`：1.10 标签分层，只引用、不重新验收。
- `docs/ui/design-system.md`、`docs/ui/help-icons.md`：复用现有规则，不执行 1.13。
- 当前对话及可见项目共享摘要：记录覆盖范围，不声称读到了未提供的完整原始会话或原图。

## 本次产出

1. 设计书：底图与颜色、Pin 尺寸/内容/状态、聚合/重叠、区域、路线、日期/模式、图层与控件、交互、响应式、无障碍、fallback。
2. 设计书内包含来源与冲突裁决、待验收新增数值、后续实现边界、24 项验收矩阵。
3. Result：只记录实际完成的文档检查，区分未运行的网页/代码测试。
4. Master WBS：只改 1.12 Owner / 状态与本任务追踪，保留其他人的全文和状态；更新位于本 Draft PR，尚未合入 develop。

## 保护边界

不修改 `src/**`、`public/**`、`assets/**`、package/lockfile、workflow、环境变量、DB/API/Auth；不改变推荐卡、业务数据结构、偏好枚举、已确认订单和地图生命周期；不调用付费 Provider；不开始后续 WBS。

## 文档交付检查

- [x] 最新文档和可见会话的相关决定已对照，历史矛盾有明确裁决。
- [x] Planner 的单日/三日/全程与 Detail 的单日执行模式分别定义。
- [x] 日期、交通方式、地点类别、预约与风险分开定义。
- [x] Pin / 区域 / 路线的默认、选中、无数据与窄屏规则已写入。
- [x] 正式行程节点保留等价访问入口，聚合不去重正式访问次数。
- [x] 地图来源署名、点击安全区、键盘等价入口和触控目标已定义。
- [x] 外部技术依据使用 Mapbox / W3C 官方资料；设计目标不冒充运行时测试通过。
- [x] 设计文件通过 Markdown 结构检查，本地与远端 Git blob SHA 一致。
- [x] WBS 差异已核对，只有本任务三处局部变更。
- [ ] 用户设计验收。
- [ ] 用户授权后合入 develop，并最终同步完成态。

## 交付与安全

使用 `docs/` 独立文档分支和 Draft PR #177，正文使用 `Refs #176`，不自动关闭 Issue。已核对现有自动创建 PR 的工作流只匹配 `feature/**`，另一自动合并工作流只处理非 Draft PR；本任务不修改这些工作流。`[skip ci]` 不作为防合并保证，也不等于 CI 通过。

只有设计验收且合入 develop 后，才可将本项标记已完成。后续页面实现必须另立 A 的开发任务；本文件不能当作启动实现的授权。

## 给后续 Codex 的只读交接

本任务不要求 Codex 执行。将来需要读取时，先检查工作区并安全获取远端，读取本 Task、设计书、Result 和最新 WBS；只总结规范与当前代码差异，不修改文件、不启动实施、不更改 WBS，也不自动合并。若设计未验收或未合入 develop，明确标为输入草案。
