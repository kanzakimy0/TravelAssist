# TravelAssist — Cache / Materialized View / Search Index / Data Serving Model

> 状态：建议冻结为数据服务与低延迟读取层 v1  
> 适用范围：Planner、AI Context Builder、地图、POI 搜索、推荐、实时状态、路线、天气、Booking / Order 查询  
> 上游依赖：
> - Data Governance / Data Version / Provenance / Freshness / Quality Gate Model
> - Planner / Ranking / Realtime Models
> - Event Bus / Background Worker
> - Observability / SLI / SLO

## 1. 总体原则

Canonical DB 是 Source of Truth；Cache 是加速副本；Materialized View 是预计算读模型；Search Index 是检索副本。任何副本都必须可丢弃、可重建、可版本切换。

完整读取链：

    Versioned Canonical Data
            ↓
    Data Serving Pipeline
            ↓
    Cache / Materialized View / Search Index
            ↓
    Planner / AI / Map / Search / Realtime

写入链：

    Canonical Mutation
            ↓
    Transactional Outbox
            ↓
    Cache Invalidate
    View Refresh
    Index Update

## 2. Cache 分层

建议：

    L0 Request Cache
    L1 Process Cache
    L2 Distributed Cache
    L3 Materialized View
    L4 Canonical DB
    L5 External Provider

Request Cache 用于一次请求内部重复读取。Process Cache 适合 Prompt、Tool Definition、Feature Flag Config 等低变动配置。Distributed Cache 用于 POI Serving Object、43D Vector、Preference Snapshot、Trip Snapshot、Route Result、Weather Snapshot。

### 2.1 Versioned Cache Key

禁止长期使用无版本 Key，例如 poi:123。

推荐：

    poi:v18:123
    poi43d:dataset_v7:123
    trip:version_21:trip_123
    weather:snapshot_abc

版本变化优先通过新 Key 切换，而不是依赖删除所有旧缓存。TTL 与 Version 必须同时存在。

### 2.2 Cache Freshness

Cache 命中必须同时检查：

- freshness_state
- valid_until
- dataset_version
- snapshot_version

Cache State 统一：

- fresh
- stale_servable
- expired
- miss

Stale-While-Revalidate 仅适用于允许旧数据短时服务的场景，如 POI 基础信息。Booking Availability、Payment State、Critical Transport Realtime、Current Price 默认不得使用不安全的 stale 数据。

### 2.3 Cache Safety

必须支持：

- Event-driven invalidation
- Single-flight / stampede protection
- Short negative cache
- Cache failure fallback
- Rate limit / load shedding 保护 Canonical DB

## 3. Materialized View

建议首批：

- planner_poi_serving_view
- planner_region_candidate_view
- map_poi_summary_view
- search_filter_counts_view
- trip_realtime_summary_view

Planner POI Serving View 预组合以下热字段：

- poi_id
- name
- coordinates
- category
- region
- 43D vector
- minimum_duration
- recommended_duration
- opening summary
- accessibility
- weather sensitivity
- quality state
- data bundle id

Planner 热路径不应为每个 Candidate 重复 Join 多张表。

每个 View 必须记录：

- view_schema_version
- source_dataset_versions
- built_at

支持 incremental、full rebuild、event-driven、scheduled 四种刷新策略。

重大 Dataset 更新采用 Blue/Green：

    planner_poi_view_v7
    planner_poi_view_v8
    build → validate → atomic switch

## 4. Search Index

Search Index 负责：

- keyword
- autocomplete
- alias
- romanization
- multilingual
- geo radius
- facet / filter
- retrieval ranking

不负责：

- 最终营业时间
- 最终 Booking 状态
- 最终实时价格
- 最终库存

POI Search Document 至少包含：

- canonical poi_id
- names / aliases / normalized names
- coordinates
- prefecture / city
- categories
- searchable tags
- iconic / hidden bucket
- quality state
- dataset version
- indexed_at

Search 命中只返回候选实体；详情必须回源 Data Serving API。

### 4.1 多语言 Alias

支持日文正式名、中文名、英文名、罗马字、简称、历史别名。Alias 仍属于受治理数据，不允许 Search 自行生成未验证别名。

### 4.2 Search Ranking 与 Planner Ranking 分离

Search Ranking 解决“搜索结果先出现什么”；Planner Ranking 解决“整个候选行程哪个整体更适合”。两者不得共用单一分数。

### 4.3 Geo Search

支持：

- nearby
- bounding box
- radius
- route corridor

用于附近 POI、替代 POI 和地图浏览。

### 4.4 Tombstone

实体 retired / deleted 时：

    Canonical Tombstone
        ↓
    Search Remove Event
        ↓
    Cache Invalidate

防止幽灵 POI。

## 5. Data Serving API

建议建立：

- POI Serving API
- Planner Data API
- Realtime Snapshot API
- Search API

Planner 不直接访问任意数据库表。

建议内部接口：

    GET  /internal/planner/pois/:id
    POST /internal/planner/pois/batch
    POST /internal/planner/candidates
    GET  /internal/planner/data-bundle

必须提供 Batch Fetch，避免 N+1。

Serving DTO 只暴露消费者真正需要的字段，不向 Planner / AI 暴露 Raw Provenance、Admin Notes 或私有元数据。

AI Context Builder 读取 compact Serving DTO，不直接访问原始表。

## 6. Map Serving

地图默认加载轻量数据：

- poi_id
- lat/lng
- category
- marker style
- short label
- availability flag

点击 POI 后再读取 Full Detail，避免地图一次加载完整 43D 和全文数据。

## 7. Hot / Warm / Cold

Hot：

- active trip
- current realtime snapshots
- current city POIs
- popular POIs

Warm：

- Canonical POI
- 43D
- duration
- opening hours

Cold：

- Raw source
- retired dataset
- historical snapshot
- audit artifact

## 8. Prewarming

用户进入某个 Trip Day 时可以预热：

- current day POIs
- next transfer
- nearby alternatives
- weather

禁止因为用户打开东京而预热整个日本 POI。

## 9. 43D Serving

43维以 Compact Vector 提供，并绑定：

- feature_schema_version
- dataset_version

Search 先缩小候选集，Recommendation / Ranking 再使用 43D。Search Index 不负责完整个性化排序。

## 10. User / Trip / Realtime Cache

User-specific Cache 必须带 preference_version。

例如：

    recommendation:user_1:pref_v6:region_tokyo

Trip-specific Cache 必须带 trip_version。

Realtime Cache 使用 snapshot_id + valid_until。

## 11. Route / Weather / Price / Inventory Cache

Route Cache Key 至少包括：

- origin
- destination
- mode
- departure_time_bucket
- provider
- route_profile_version

实时交通变化后，旧 Route Cache 需要失效或降低 Confidence。

Weather Cache 必须绑定 location bucket、forecast window、provider run、valid_until。

Price / Inventory 使用极短 TTL，并保留 retrieved_at 与 live/cached 状态。支付或预约最终提交前必须重新确认。

## 12. Dataset Activation

推荐：

    Build Views / Indexes / Cache Seed
        ↓
    Quality Validation
        ↓
    Serving Smoke Test
        ↓
    Atomic Active Pointer Switch

发现数据污染时：

    Quarantine Dataset
        ↓
    Disable Active Pointer
        ↓
    Invalidate Cache
        ↓
    Switch Previous Approved Version

## 13. Data Bundle Consistency

一次 Planner Run 必须固定同一 data_bundle_id。

不得出现同一次 Run 中 POI Master、43D、Duration 使用不兼容版本。

Read Consistency 分三层：

Strong：
- Booking State
- Payment State
- Confirmation
- Action State

Version-consistent：
- Planner Data Bundle
- Trip
- Preference Snapshot

Eventually-consistent：
- Search Index
- Analytics View
- 非关键地图聚合

## 14. Fallback

通用层级：

    Fresh Cache
        ↓
    Serving View
        ↓
    Canonical DB
        ↓
    Safe stale cache（仅允许场景）
        ↓
    External Provider
        ↓
    Unavailable

Booking Inventory 等高风险数据禁止回退到明显过期数据并继续标记为可订。

Search Index 故障可以退化到 limited DB search、popular POI、recent entities。

Distributed Cache 故障时回源 View / DB，但必须启用 Rate Limit、Load Shedding、Request Coalescing，防止击穿数据库。

## 15. Search / View 发布

Search Index 使用：

    build new index
        ↓
    validate
        ↓
    alias switch

Materialized View 使用同样的 Blue/Green 模式。

Search Quality Gate 至少检查：

- document count
- missing ID
- duplicate ID
- geo validity
- alias coverage
- language analyzer
- top query smoke tests

Serving Quality Gate 至少检查：

- cache seed
- view row count
- search doc count
- referential integrity
- batch fetch
- latency
- version consistency

## 16. Serving Benchmark / SLI

Benchmark：

- single POI read
- 100 POI batch
- region candidate query
- nearby search
- planner data bundle
- realtime snapshot

Serving SLI：

- p50 / p95 / p99
- cache_hit_rate
- view_hit_rate
- db_fallback_rate

Search SLI：

- search_success_rate
- search_p95
- index_lag
- zero_result_rate
- autocomplete_latency

Version SLI：

- active_bundle_consistency_rate
- stale_version_read_rate
- mixed_version_error_rate

不兼容混用返回：

    DATA_BUNDLE_VERSION_MISMATCH

## 17. Event Pipeline

Search：

    Canonical Event
        ↓
    Index Update Worker
        ↓
    Search Index
        ↓
    Index Ack
        ↓
    Lag Metric

View：

    Canonical Event
        ↓
    View Worker
        ↓
    View Refresh
        ↓
    Cache Invalidate

使用 at-least-once + idempotency。

通过 entity_id + record_version 防止旧 Event 覆盖新版本。

## 18. Data Serving Bundle

建议：

    DataServingBundle
      bundleId
      dataBundleId
      plannerViewVersion
      searchIndexVersion
      cacheNamespaceVersion
      servingSchemaVersion
      createdAt

Planner Release Bundle 必须声明兼容的 Data Serving Bundle 或兼容范围。

## 19. API Contract

Serving DTO 必须版本化，例如 v1 / v2。

Schema 演进优先：

    additive
    → dual-read / dual-write if needed
    → migrate
    → switch
    → retire old

## 20. Client / Offline Cache

Web / Mobile 可以缓存：

- UI-safe POI summary
- Trip read snapshot
- map assets
- offline itinerary

服务器 Planner 不得使用客户端缓存作为事实源。

Offline Bundle 应包含：

- trip snapshot
- selected POI summaries
- route summaries
- map assets
- booking summary
- generated_at
- data_version

实时交通、天气、营业状态、价格必须明确标记可能过期。

## 21. Privacy / Authorization

用户专属 Cache 不跨用户复用。

任何 Cache 命中仍必须先完成 Resource Permission Check。

Cache 禁止存放 API Secret、Payment Secret、OAuth Token 等凭证。

## 22. First-stage v1

实现：

- Versioned Cache Keys
- Request Cache
- Distributed Cache abstraction
- planner_poi_serving_view
- trip_realtime_summary_view
- POI Search Index
- Search Active Alias
- Data Serving API
- Batch POI API
- Serving Bundle
- Version Consistency Check
- Event-driven invalidation
- Basic prewarm
- Basic fallback

## 23. v2

增加：

- Blue/Green Materialized View
- Shadow Read
- advanced prewarming
- route cache
- weather cache
- search facets
- geo corridor search
- cache stampede protection

## 24. v3

增加：

- multi-region cache
- regional search shards
- adaptive cache TTL
- predictive prefetch
- semantic retrieval
- serving autoscaling

## 25. Cache 验收 Gate

必须满足：

- Key 带版本
- TTL / Freshness 明确
- 高风险实时数据不使用不安全 stale
- 支持 invalidation
- 支持 stampede protection
- Cache failure 可回源
- Cache 不是 Source of Truth

## 26. Materialized View 验收 Gate

必须满足：

- View 可重建
- 有 source version
- 有 schema version
- 支持全量/增量策略
- 新版本先 Build 再 Switch
- Planner 热路径不做无界复杂 Join

## 27. Search Index 验收 Gate

必须满足：

- Search Document 有 canonical poi_id
- Index 有 dataset version
- 支持多语言 / alias
- Detail 回源 Serving API
- Tombstone 删除幽灵实体
- Index lag 可观测
- Search 不成为最终事实源

## 28. Data Serving 验收 Gate

必须满足：

- Planner 通过明确 API / DTO 读取
- 支持 batch fetch
- Planner Run 固定 data bundle
- 禁止 mixed-version read
- Strong / Version / Eventual Consistency 分层
- Serving Bundle 可快速 rollback
- API Contract 版本化

## 29. 最终冻结原则

> 主数据库保存事实，Serving Layer 负责让事实读得快。

> Cache、View、Search 都必须可丢弃、可重建、可版本切换。

> Search 负责找候选，Planner / Data Serving 负责读取正式事实。

> 一次 Planner Run 必须固定同一个 Data / Serving Bundle，禁止混用版本。

> Versioned Key 与 Data Bundle 是防止旧缓存污染新 Planner 的核心机制。

> 实时、高风险数据优先正确性与 Freshness，不能为了缓存命中率牺牲事实准确性。

> Data Serving 是连接 Data Governance 与 Planner Runtime 的正式基础设施，不是简单“加 Redis”。