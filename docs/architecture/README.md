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
- `replanning-contract-v0.1.md` — Runtime Overlay、Trigger、Impact Analysis、Earliest Mutable Boundary、最小 Scope、Deterministic Repair、AI Soft Choice、revision / companion sync 与 ChangeSet 动态重规划契约
- `planning-fact-freshness-policy-v0.1.md` — Fact / Prior / Inference、来源/权威、有效区间、CURRENT/AGING/STALE/EXPIRED/UNKNOWN、DecisionUse、事件失效、冲突解析、刷新/降级与 Provider 缓存权利边界
- `planning-decision-trace-v0.1.md` — DecisionRun、候选漏斗、Score / Fact / Feasibility / Repair Trace、AI / Provider 使用、成本/延迟、ChangeSet 关联、用户解释与隐私边界
- `trip-engine-design-backlog-v0.9.md` — P0 Design Complete；下一阶段转入 Contract / Validator / Fixtures、100 POI / Region Graph / Feasibility / AI / Replanning Pilot 与参数校准

历史候选仍保留用于审查追踪：

- `poi-scoring-spec-v0.1.md`
- `poi-master-schema-v0.1.md`
- `trip-engine-design-backlog-v0.1.md`
- `trip-engine-design-backlog-v0.2.md`
- `trip-engine-design-backlog-v0.3.md`
- `trip-engine-design-backlog-v0.4.md`
- `trip-engine-design-backlog-v0.5.md`
- `trip-engine-design-backlog-v0.6.md`
- `trip-engine-design-backlog-v0.7.md`
- `trip-engine-design-backlog-v0.8.md`

计划补充：

- `system-overview.md` — Web / App / Backend / AI / Map 总体架构
- `api-design.md` — 核心 API 详细边界

其中原计划的 `trip-state.md` 核心内容已由 `trip-plan-data-ai-takeover.md` 覆盖；后续如需要，可再拆分为更细的数据库 Schema / API 专项文档。

P0 架构设计已形成闭环，但各 Freeze Candidate 在完成 Schema / Validator / Fixtures、Reference Implementation、Pilot、Consumer Review 和参数校准前，不应宣称全部 Frozen v1。
