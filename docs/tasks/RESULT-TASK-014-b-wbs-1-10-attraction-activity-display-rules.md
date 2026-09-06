# TASK-014-B Result — WBS 1.10 景点与活动标签 / 主系统展示规则

## Status

`待审查`

设计规格已经完成并上传；仓库自动化在每次 feature branch push 后自动创建并合并 PR，因此主设计文件已进入 `develop`，但截至本 Result 写入时尚未取得用户对最终设计的明确验收确认，所以 WBS 1.10 **不得提前标记为已完成**。

---

## Metadata

- Task ID: `TASK-014-B`
- WBS ID: `1.10`
- Owner: `B`
- Responsibility: `Main Travel System / Design Specification`
- Owner Exception: 用户于 2026-09-07 明确把 WBS 1.10 从 A 单项改派给 B；不改变 v0.4 的长期 Main Travel System 默认归 A 规则。
- Execution Method: ChatGPT 直接完成设计与规格冻结；**不需要 Codex**。
- Issue: `#158`
- Branch: `feature/b-wbs-1-10-attraction-activity-display-rules`
- Initial Base: `efd4661867b239ef2f87a417b95fc7dab856822f`
- Design Commit: `c1bddd70a541a5f9a6ced7b3a82ec2cbff96b19b`
- Design Auto PR: `#163`
- Design Merge Commit: `e9c113d98290a45bee64b722d88d11b4f9e0e517`
- Primary Design: `docs/ui/attraction-activity-tag-display-rules.md`
- Task: `docs/tasks/TASK-014-b-wbs-1-10-attraction-activity-display-rules.md`
- Result: `docs/tasks/RESULT-TASK-014-b-wbs-1-10-attraction-activity-display-rules.md`

---

# 1. Completed Scope

完成并冻结：

1. POI / Activity 分类、体验、运营、Provider、Preference 六层语义边界；
2. TravelAssist 自有顶层 Taxonomy：9 个正式主分类 + `other` fallback；
3. 全球通用 Secondary Category v1；
4. Experience Tags v1；
5. Operational / Planning Tags v1；
6. 动态事实不得静态化的规则；
7. Map Pin / Selected Pin / Quick Card / Detail / Timeline / Recommendation / Trip Detail / Future Candidate List 的逐 Surface 展示数量与优先级；
8. 标签优先级、去重、冲突、置信度、fallback；
9. Localization / Accessibility；
10. WBS 5.8 六维长期 Preference 与 POI Taxonomy 的映射边界；
11. WBS 7.2 / 7.4 / 7.9 的 handoff；
12. 15 个跨地区 / 跨类型的规范化示例。

---

# 2. Taxonomy Summary

正式 Primary Category：

```text
landmark_scenic
nature
heritage
culture_local_life
museum_gallery
entertainment
shopping_market
activity_experience
event_seasonal
other
```

核心产品决定：

```text
摄影 ≠ POI Primary Category
```

摄影属于：

```text
Preference Dimension
+
Experience Tag
+
推荐匹配理由
```

这样可以避免把“用户喜欢什么”误写成“地点是什么”。

---

# 3. Preference Boundary

保持 WBS 5.8 已冻结六维：

```text
自然
历史
人文
艺术
摄影
活动体验
```

一个 POI 可以映射到多个 Preference Dimension，但只能有一个主 Primary Category。

例如：

```text
伏见稻荷大社
POI primary = heritage
Preference affinity = 历史 + 人文 + 摄影
```

本 Task 不冻结推荐权重，不实施 5.14 / 7.9。

---

# 4. Planner Display Rules

设计遵守已合入 Planner 规格，不修改页面几何。

主要冻结：

- Map Pin 默认态：Experience Tag = 0；只保留名称 / Icon / 行程状态；
- Pin Selected：类型 1 + 关键运营状态最多 1；
- Quick Card：Secondary 1 + Experience 最多 2 + Operational 最多 1；
- POI Detail：Secondary 1 + Experience 最多 4 + Operational 最多 3；
- Timeline Compact：Experience 0；
- Timeline Expanded：Secondary 1 + Experience 最多 2 + Operational 最多 2；
- Recommendation 1/2/3：不新增固定标签行，只允许现有摘要槽最多 2 个方案级汇总标签；
- Trip Detail：Live / Reservation / Risk 优先于普通 Experience Tag。

---

# 5. Dynamic Fact Boundary

明确禁止把以下写成长期静态标签：

```text
当前天气
当前拥挤
实时排队
当前票价
今日营业
实时库存
实时交通时间
预约余量
```

Operational Tag 在显示事实性结论前必须有官方 / 已批准 Provider / 可验证产品数据来源。

---

# 6. Provider / Schema Handoff

WBS 7.2 后续负责选择真实 Places / POI Provider。

WBS 7.4 后续可将以下正式化：

```text
primary_category
secondary_category
provider_categories[]
experience_tags[]
operational_traits[]
preference_affinities[]
provenance
confidence
taxonomy_version
```

本 Task 没有选择 Provider、没有修改 API、没有写正式 Schema 代码。

---

# 7. Validation Performed

完成语义一致性检查：

- 对齐 `docs/ui/trip-planner.md` 的地图、Pin、Quick Card、Detail、Timeline 与推荐方案边界；
- 对齐 `docs/ui/planner-map-interaction-booking-mapbox.md` 的 1日 / 3日 / 全日与预约状态模型；
- 对齐 `docs/ui/trip-detail.md` 的 Execution / Reservation / Live Risk 优先级；
- 对齐 `docs/ui/preference-center.md` 的长期 Preference 定义；
- 对齐 `docs/preferences/preference-system.md` 的大 / 中 / 小三级偏好与“景点 / 活动比传统类别更细”的方向；
- 对齐已验收 WBS 5.8 的六维景点偏好与拍照体验；
- 确认未将 Provider taxonomy 当作 TravelAssist canonical taxonomy；
- 确认未将动态事实冻结成静态标签；
- 确认没有要求真实 Provider 才能成立；
- 确认没有修改 Planner 视觉几何、业务代码或 Personal Center 5.8 行为。

本轮通过 GitHub 文档操作完成，没有本地代码工作区，因此没有声称运行 npm / build / browser test。该 Task 为 docs-only 设计规格，未增加依赖、未修改代码。

---

# 8. Codex Cleanup

启动阶段曾误创建：

```text
docs/tasks/CODEX-TASK-014-b-wbs-1-10-command.md
```

用户指出 WBS 1.10 不需要 Codex 后，已删除该文件：

- delete commit: `b4719ad14002e87a206363cec4092cb2c3167f57`
- 自动 PR: `#162`

后续不得要求 B 工作站用 Codex 执行 WBS 1.10。

---

# 9. Repository Automation Note

仓库当前配置会在 feature branch push 后自动创建并合并 PR。

因此本 Task 的设计提交：

- `c1bddd70...`
- 自动 PR `#163`
- merge `e9c113d...`

已自动进入 `develop`，并非本次主动调用 merge。

这不改变状态规则：

```text
代码 / 文档进入 develop
+
用户验收通过
= 才允许 WBS 已完成
```

当前仍应保持：

```text
待审查
```

---

# 10. Non-blocking Future Decisions

以下留给后续技术任务，不阻塞 WBS 1.10 设计审查：

1. 一个实体是否持久化多个 Secondary Category；
2. Experience Tag 自动派生比例；
3. Provider Mapping 文件的真实工程位置；
4. taxonomy migration 工具；
5. confidence 具体数值阈值；
6. Event / Activity API 最终结构。

---

# 11. Next Dependency

用户验收本设计后：

```text
WBS 1.10 → 已完成
```

随后才满足 WBS：

```text
7.2 Places / POI Provider 选型
```

的设计依赖。

`7.4 POI 标准 Schema` 仍依赖 `7.2`，不得由本 Task 自动开始。

---

# 12. Final Tracking

- Design Spec: Completed
- Code Implementation: Not applicable
- Codex Required: No
- Provider Selected: No
- POI Schema Implemented: No
- WBS 1.10 Owner: B
- WBS 1.10 Target Status after this delivery: `待审查`
- User Acceptance: Pending
- Issue #158: Keep Open
- Next Task Automatically Started: No
