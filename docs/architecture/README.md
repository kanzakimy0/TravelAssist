# 技术架构文档

本目录用于冻结 TravelAssist 的技术实现规格。

已建立：

- `web-architecture.md` — Web 工程边界与后续 App 共用原则
- `db-orm-migration-standards.md` — Supabase PostgreSQL / Drizzle / Migration / RLS / PostGIS 全局规范
- `trip-plan-data-ai-takeover.md` — Trip / Plan / Version / ChangeSet / Runtime / Booking / AI 接管与离线同步架构
- `trip-engine-poi-ai-provider-design-v0.3.md` — Trip Planning Engine / Region Graph / POI / AI Gateway / Provider / Token 优化综合设计候选
- `poi-feature-preference-codebook-v0.1.md` — POIFeatureV1 43维、Feature Kind、Sparse Preference 1–9 / omit-5、Context / Constraint 边界冻结候选
- `trip-engine-design-backlog-v0.1.md` — Trip Planning / POI / Region / AI Gateway 后续设计优先级、依赖与 Pilot 后校准项

计划补充：

- `system-overview.md` — Web / App / Backend / AI / Map 总体架构
- `preference-state.md` — Preference State 与偏好模型
- `api-design.md` — 核心 API 详细边界

其中原计划的 `trip-state.md` 核心内容已由 `trip-plan-data-ai-takeover.md` 覆盖；后续如需要，可再拆分为更细的数据库 Schema / API 专项文档。

在尚未冻结的专项设计完成前，Codex 不应自行把未确认的技术方案视为最终架构。
