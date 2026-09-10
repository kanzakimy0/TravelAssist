# 技术架构文档

本目录用于冻结 TravelAssist 的技术实现规格。

已建立：

- `web-architecture.md` — Web 工程边界与后续 App 共用原则
- `db-orm-migration-standards.md` — Supabase PostgreSQL / Drizzle / Migration / RLS / PostGIS 全局规范
- `trip-plan-data-ai-takeover.md` — Trip / Plan / Version / ChangeSet / Runtime / Booking / AI 接管与离线同步架构
- `trip-engine-poi-ai-provider-design-v0.3.md` — Trip Planning Engine / Region Graph / POI / AI Gateway / Provider / Token 优化综合设计候选
- `poi-feature-preference-codebook-v0.1.md` — POIFeatureV1 43维、Feature Kind、Sparse Preference 1–9 / omit-5、Context / Constraint 边界冻结候选
- `preference-state-v0.1.md` — Long-term / Snapshot / Override / Runtime / Hard Constraint 五层偏好状态与 Merge Contract 冻结候选
- `poi-scoring-spec-v0.2.md` — 取代 v0.1；43维匹配、Constraint Gate、Coverage / Confidence，并把 walking / physical 修正为标准游览负担基准，实际 Visit Load 按时长 / Visit Mode 动态计算
- `poi-master-schema-v0.2.md` — 取代 v0.1；POI Identity / Facts / 43维 Feature / Visit Mode / Duration Profile / Load Facts / Evidence / Lifecycle / Region / Asset Slot / JSONL 数据结构
- `itinerary-feasibility-spec-v0.1.md` — Item / Transition / Day / Trip 四层行程合理性、游览时长、转场、Buffer、疲劳累计、Deterministic Repair 与 AI 边界
- `travel-region-graph-codebook-v0.1.md` — Region / District / Stay Cluster / Gateway、RegionRelation、TravelEdge / Variant、方向性、规划先验、版本与图质量规则
- `candidate-pipeline-contract-v0.1.md` — Region / Corridor / POI 候选漏斗、Hard Filter、Scoring、Route / Itinerary Feasibility、Pareto、Diversity、Top-N、Fallback 与 AI 交接
- `ai-compact-context-v1.md` — AI Gateway 输入 wire contract；TaskType / ContextScope / TripCompactState / SparsePreference / CandidateProjection / Route / Weather / Constraint Compact、Local ID、Token Budget 与 Progressive Expansion
- `ai-decision-contract-v1.md` — AI Gateway 输出 wire contract；Decision Status、Choice / Ordering / Compact Patch / Semantic Preference、ReasonCode、Local ID 验证、Domain Proposal、Engine Revalidate 与 ChangeSet Builder 边界
- `trip-engine-design-backlog-v0.6.md` — 最新 Trip Planning / POI / Region / AI Gateway 后续设计顺序与 Pilot 后校准项

历史候选仍保留用于审查追踪：

- `poi-scoring-spec-v0.1.md`
- `poi-master-schema-v0.1.md`
- `trip-engine-design-backlog-v0.1.md`
- `trip-engine-design-backlog-v0.2.md`
- `trip-engine-design-backlog-v0.3.md`
- `trip-engine-design-backlog-v0.4.md`
- `trip-engine-design-backlog-v0.5.md`

计划补充：

- `system-overview.md` — Web / App / Backend / AI / Map 总体架构
- `api-design.md` — 核心 API 详细边界
- `replanning-contract-v0.1.md` — Trip Runtime / 事件触发 / 受影响范围 / 保护项 / Repair / AI / ChangeSet 的动态重规划契约
- `planning-fact-freshness-policy-v0.1.md` — 动态 Fact 的来源、有效期、刷新与降级规则
- `planning-decision-trace-v0.1.md` — 规划决策可解释性、候选淘汰、AI/Provider 成本与审计追踪

其中原计划的 `trip-state.md` 核心内容已由 `trip-plan-data-ai-takeover.md` 覆盖；后续如需要，可再拆分为更细的数据库 Schema / API 专项文档。

在尚未冻结的专项设计完成前，Codex 不应自行把未确认的技术方案视为最终架构。