# WBS 1.10 / 1.12 / 1.13 Final Design Closeout

> Date: 2026-09-12
> Owner: B for these design-spec items only
> Authority: user explicitly approved processing these items according to the review recommendation
> Master WBS sync target: 1.10 / 1.12 / 1.13 = 已完成

## 1.10 — 景点与活动标签 / 主系统展示规则

Status: **已完成 / Frozen**

Primary design: `docs/ui/attraction-activity-tag-display-rules.md`
Amendment: `docs/ui/attraction-activity-tag-display-rules-amendment-v1.1.md`
Issue: #158

Final decision:

- 原 taxonomy / Surface display / Provider / dynamic fact 规则通过；
- 早期六维 Preference 改为高层兼容 / UI abstraction；
- 内部映射升级为 POI taxonomy / semantic attributes → versioned POI/Profile/Rule/Scoring dimensions（当前 43-field direction）→ user-facing preference abstraction；
- 1.10 不复制或拥有 43-field canonical schema，不冻结 scoring / fatigue / feasibility formula。

## 1.12 — 地图视觉 / Pin / 区域 / 路线规范

Status: **已完成 / Frozen v1.1**

Primary design: `docs/ui/map-visual-pin-region-route-spec.md`
Issue: #176
Prior PR: #177 (merged)

Final decision:

- 稳定旅行日 route identity color 与珊瑚 brand / transport / risk state 分离；
- Map / Timeline / Detail / Legend 同日一致；
- 保留 Mapbox outdoors-v12、既有 Planner / Detail 几何与无障碍/fallback/署名规则；
- live Mapbox / browser visual QA 属于后续实现验收，不再阻塞设计规格完成。

## 1.13 — 主系统 Design Token / 色彩 / 字体 / 圆角

Status: **已完成 / Frozen v1.1 + Accessibility Amendment v1.2**

Primary design: `docs/ui/main-system-design-tokens.md`
Amendment: `docs/ui/main-system-design-tokens-accessibility-amendment-v1.2.md`
Issue: #178
Prior PR: #179 (merged)

Final decision:

- 保留当前 shared/global token 单一来源与 `#E95B4B` / `#D94738` 珊瑚品牌基线；
- 不恢复旧红棕色，不建立平行 `--ta-*` Design System；
- 普通/小字号 white-on-coral 不得默认视为可访问性通过，必须组件级满足适用 contrast 要求或采用合规文字/背景；
- large text、gradient、photo/map/glass 继续按实际浏览器合成结果验收。

## Completion semantics

这里的 `已完成` 表示**设计规格已审查并冻结**，不等于所有网页、Mapbox 或组件都已按规格完成工程实装。

后续工程任务必须消费这些 frozen baseline 并完成对应 runtime / browser / accessibility QA。
