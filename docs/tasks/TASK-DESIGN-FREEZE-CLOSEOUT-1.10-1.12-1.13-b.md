# TASK-DESIGN-FREEZE-CLOSEOUT — WBS 1.10 / 1.12 / 1.13

## Metadata

- Owner: B（设计收尾；不改变长期主系统实现责任）
- Status: 进行中
- Branch: `docs/b-wbs-1-10-1-12-1-13-design-closeout`
- Base: `origin/develop@b1a2c138bc50ed702792eb2d5b961ef863d5c205`
- Scope: 仅设计文档、Result、WBS 与 Issue 收尾

## Goal

按用户于 2026-09-12 的明确授权完成三项设计审查：

- WBS 1.10：PASS with minor amendment。保留现有 POI taxonomy / display 规则，更新 Preference mapping 边界，使其适配当前 43-field / Profile / Rule / Scoring 体系；1.10 不拥有或复制 43 字段定义。
- WBS 1.12：PASS。v1.1 地图视觉 / Pin / 区域 / 路线规范正式验收冻结。
- WBS 1.13：Conditional PASS；本收尾补充 white-on-coral 小字可访问性限制后冻结。珊瑚主色不重做。

## Required updates

1. 新增 1.10 amendment：`docs/ui/attraction-activity-tag-display-rules-amendment-v1.1.md`。
2. 新增 1.13 accessibility amendment：`docs/ui/main-system-design-tokens-accessibility-amendment-v1.2.md`。
3. 新增统一 Closeout Result。
4. WBS 1.10 / 1.12 / 1.13 → `已完成`。
5. Issue #158 / #176 / #178 → Closed / Completed。

## Non-goals

- 不修改 runtime / CSS / Planner / Mapbox。
- 不选择 POI Provider，不实现 7.2 / 7.4 / 7.9。
- 不实现新的 43-field schema 或 scoring formula。
- 不重做品牌颜色。
- 不把设计验收冒充浏览器视觉 / Mapbox live / E2E 验收。

## Acceptance

完成后，三项 WBS 都作为后续实现的 frozen design baseline；实现阶段仍需按真实浏览器、Mapbox、字体、透明背景和组件对比度要求做工程 QA。
