# TravelAssist — Data Governance / Data Version / Provenance / Freshness / Quality Gate Model

> 状态：建议冻结为 TravelAssist 数据可信控制面 v1
> 适用范围：POI 主数据、43维属性、营业时间、最低/推荐停留时长、路线/交通、天气、价格、库存、Booking / Order、Realtime Snapshot、Planner / Ranking / AI Context

## 1. 核心目标

任何关键事实进入 Planner / AI 前，都必须知道：来源、版本、获取/观察时间、Freshness、Quality、Confidence、适用范围以及冲突处理策略。

核心原则：

- AI 不拥有事实最终解释权。
- Canonical Data 不是“最新抓到什么就写什么”。
- 数据必须经过 Provenance + Quality + Freshness + Conflict Policy 才能进入生产事实层。
- 数据版本与 Planner 代码版本同等重要。

## 2. 数据生命周期

```text
Source
↓
Raw
↓
Normalize
↓
Identity Resolution
↓
Candidate Facts
↓
Provenance / Quality / Freshness
↓
Conflict Resolution
↓
Versioned Canonical Data
↓
Data Quality Gate
↓
Data Release Bundle
↓
Planner / Ranking / AI / Realtime
```

生产消费者默认只读取 approved / active canonical。

## 3. 数据分类

统一分为：Master Data、Derived Data、Realtime Data、Transactional Data、User Data、Experimental Data。

- Master：POI identity、名称、分类、坐标、地址、基础营业规则、最低/推荐停留时长。
- Derived：43D、Match Score、Iconic/Hidden、Fatigue、Ranking Features。必须记录算法版本和输入版本。
- Realtime：天气、交通晚点、停运、价格、库存、临时闭馆，必须有 retrieved_at / valid_until。
- Transactional：Booking、Order、Payment、Trip Mutation、Action Execution，Source of Truth 必须明确。
- User：偏好、must_keep、预算、步行偏好，区分 explicit / confirmed / inferred / temporary。
- Experimental：Shadow / Benchmark / Candidate Dataset，禁止直接覆盖 Production。

## 4. Data Source Registry

建立 data_sources，记录 source_key、source_type、provider、authority_level、domain、region_scope、refresh_policy、license_policy、status。

source_type：official / provider_api / internal / partner / licensed_dataset / public_web / user_supplied / derived。

authority_level：authoritative / primary / secondary / supporting / unverified。

不同字段采用不同 Source Policy：营业时间优先官方，实时列车优先交通 Provider，Booking 状态优先订单 Provider。

## 5. Provenance / Lineage

关键字段必须支持字段级 Provenance，回答：来自哪里、何时获得、经过哪个 Normalizer / Resolver / Algorithm、为何成为当前值。

例：name→official registry；coordinates→map provider；opening_hours→official；43D scenery→derived pipeline。

Derived Data 必须能回溯输入版本和算法版本。禁止只写“AI generated”。

## 6. Version Model

至少区分：Schema Version、Record Version、Dataset Version、Algorithm Version、Snapshot Version。

示例：poi.schema.v3、poi_123 record v18、poi-43d-japan-2026-09-v7、43d-generator-v7、weather_snapshot_xxx。

已进入生产的版本不可原地覆盖；修正时创建新版本。

## 7. Raw / Normalized / Candidate / Canonical

- Raw：保留原始输入，用于 Replay / Debug / Provenance，不直接进 Planner。
- Normalized：转换成 TravelAssist 标准 Schema。
- Candidate：多来源候选事实共存。
- Canonical：经过 Source Policy、Quality、Freshness、Conflict Resolution 后批准的正式值。

Canonical 必须记录 selected candidate、selection reason、policy version。

## 8. Conflict Resolution

默认来源优先级：Authoritative > Primary Provider > Trusted Internal Curated > Secondary > Supporting > Unverified；最终按字段级 Policy。

Recency 不自动压过 Authority。匿名网页昨天更新，不代表一定优于一周前官方数据。

临时闭馆等使用 temporary_override，并带 valid_from / valid_until / source / reason。

## 9. Freshness

统一 freshness_state：fresh / aging / stale / expired / unknown。

Freshness 与 Quality 分离。一条数据可以高质量但过期，也可以刚更新但来源不可信。

TTL 按 Domain 配置：POI identity/coordinates 长；opening hours 中；temporary closure 短；weather/transport realtime 很短；price/inventory 极短；booking webhook-driven。

超过 hard_expiry 的数据不得作为 Current Fact。

## 10. Freshness Fallback

- Opening Hours stale：标记需确认，Planner 降低置信度。
- Transport realtime stale：fallback static timetable。
- Hotel inventory stale：不得显示“当前可订”。
- Price stale：只能显示 cached / historical / estimated。

UI / AI 必须区分 live / cached / historical / estimated。

## 11. Data Quality State

统一：verified / accepted / provisional / quarantined / rejected。

provisional 默认不得参与高风险事实决策；quarantined 不进入 Canonical Planner Input。

## 12. Quarantine

建立 data_quarantine。Reason Code 至少包括：IDENTITY_AMBIGUOUS、SCHEMA_INVALID、OUT_OF_RANGE、IMPOSSIBLE_VALUE、SOURCE_CONFLICT、STALE_BEYOND_LIMIT、SUSPICIOUS_JUMP、DUPLICATE_ENTITY、MISSING_REQUIRED_FIELD、DERIVATION_FAILED。

Quarantine 是隔离，不是删除，必须保留来源、检测时间和处理结果。

## 13. Quality Rules

统一检查：Schema、Semantic、Cross-field、Cross-source、Temporal、Distribution、Referential Integrity。

例：经纬度合法；minimum_duration > 0；minimum <= recommended；valid_until >= valid_from；43D poi_id 必须存在于 Canonical Registry。

Distribution Gate 用于发现单条合法但整批异常，例如 80% POI scenery 突然全部变成 10。

## 14. 43维专项 Governance

43D 必须记录 feature_schema_version、generator_version、input_dataset_versions、scoring_scale、generated_at、quality_state、provenance。

冻结规则：

- 主生产记录必须 43/43 覆盖。
- missing / unknown / not_applicable 与 0 分严格分开。
- 所有值必须在冻结范围。
- 大规模极端值和分布变化进入 Distribution Gate。
- 字段必须能回溯证据或生成链。

新 43D Dataset：Generate → Quality Gate → Planner Benchmark → Shadow → Partial Rollout → Canonical Promote。禁止生成完直接覆盖生产。

## 15. POI Duration

必须保存 minimum_duration、recommended_duration、duration_source、duration_version、confidence。

硬规则 minimum_duration <= recommended_duration；异常进入 Quarantine。

## 16. Opening Hours

必须支持 regular schedule、holiday exceptions、temporary exceptions、last admission、source、retrieved_at、validity。

旧网页来源不得伪装成官方当前营业时间。

## 17. Route / Transport

必须区分 static timetable、predicted travel time、realtime status、historical reliability。

Planner Run 引用 route_snapshot_id，并记录 provider、retrieved_at、mode、duration、distance、reliability。

## 18. Weather

Weather Snapshot 保存 provider、forecast_run、retrieved_at、forecast_for、valid_until、confidence（如有）。过期 Forecast 不触发高风险实时动作。

## 19. Price / Inventory

价格明确 currency、tax/fees、provider、retrieved_at、valid_until、price_state。

Inventory 使用极短 Freshness；过期后不得继续显示“可预订”。

## 20. Booking Status

Booking Source of Truth = verified Provider webhook/status API + TravelAssist mirror。AI 文本永远不是 Booking Status。

## 21. User Preference

优先级：Current Explicit Instruction > Trip Explicit Setting > Confirmed Long-term Preference > Inferred Preference。

每次 Planner Run 保存 preference_version。Inferred 不得覆盖 Explicit。

## 22. Data Quality Gate

Dataset 发布前至少执行：Schema、Completeness、Uniqueness、Range、Semantic、Conflict、Freshness、Distribution、Referential Integrity、Regression Benchmark。

结果：pass / pass_with_warning / review_required / fail。

Hard Fail 包括：Canonical Identity Duplicate、43D Range Violation、关键字段缺失超过阈值、Opening Hours Schema Corruption、minimum > recommended、严重 Source Conflict 未解决。

## 23. Distribution / Segment Regression

新 Dataset 与 Approved Baseline 比较 mean、median、percentiles、missing rate、extreme rate、category/region distribution。

并按 prefecture、city、POI category、source、pipeline batch 分段检查，避免总体正常但局部地区全部损坏。

## 24. Dataset Manifest

每个发布 Dataset 必须有：dataset_key、dataset_version、schema_version、record_count、source_versions、generator_versions、quality_gate_result、benchmark_result、checksum、status、created_at。

状态：draft / generated / validated / shadow / approved / active / retired / rolled_back。

## 25. Data Release Bundle

建议 Bundle 显式包含 poi_master_version、poi_43d_version、poi_duration_version、opening_hours_version、route_dataset_version。

Planner Release Bundle 必须引用 data_bundle_id，禁止隐式读取“latest”。

## 26. Data Shadow / Rollout / Rollback

新 Dataset：Quality Gate → Benchmark → Shadow Planner → Internal / Partial → Active。

Shadow 比较 Candidate、Ranking、Feasibility、Walking、Fatigue、Preference Match、Iconic Coverage。

必须保留上一 Approved Dataset 作为 Rollback Target。Rollback 只影响后续 Planner，不自动撤销历史 Trip。

## 27. Ingestion Run / Batch Manifest

建立 ingestion_runs，记录 input_count、success_count、warning_count、quarantine_count、failure_count、dataset_version、status。

例如 10,000 POI 有 300 失败时，禁止只报告“任务完成”；必须输出失败 ID、覆盖率和隔离清单。

关键 43D 主生产 Dataset 可要求 required-field coverage = 100%。

## 28. Unknown ≠ Zero

冻结：unknown != 0。Schema 必须区分 null / unknown / not_applicable / not_collected。

## 29. AI-generated Data

AI 可生成 candidate classification / attribute suggestion / summary，但默认是 derived / provisional。

必须记录 model、prompt_version、input_snapshot、generated_at、post_validation。

AI-generated 永远不自动等于 authoritative。

## 30. Manual Curation

人工修改必须记录 editor、reason、before、after、reviewed_at。临时 Manual Override 还需要 scope / expiry / reviewer。

## 31. Data Contract

模块通过版本化 Contract：PlannerPOIInput v2、RouteSnapshot v1、WeatherSnapshot v2、BookingStatus v1。

禁止跨服务直接读取未经定义的内部字段；不兼容升级必须有 Compatibility Window / Migration。

## 32. Context Builder

Context Builder 只向 LLM 注入必要元数据：value、source_class、freshness、confidence、snapshot_id，而不是完整 Provenance 链。

关键事实 stale / low-confidence 时，AI 不得把它写成已确认事实。

## 33. Observability / SLI

数据管线监控：ingestion success、freshness lag、canonical completeness、quarantine rate、source conflict rate、identity ambiguity rate、invalid record rate、schema drift、dataset rollout。

高优先级告警：43D completeness sudden drop、POI duplicate spike、Opening Hours stale spike、Route Provider stale、Booking state mismatch。

## 34. Schema Drift

Provider Schema 变化必须：Normalizer Fail → Quarantine → Alert。禁止静默将错误解析结果写入 Canonical。

## 35. Data Incident / Correction

生产数据污染流程：Quarantine → Stop Promotion → Rollback Dataset → Identify affected records → Regenerate / Repair → Quality Gate → Re-release。

事故必须能通过 data_bundle_id / dataset_version / snapshot_id / trace_id 反查：哪些 Planner Run、哪些 Trip、哪些用户、哪些 Action 受影响。

## 36. Retention / Privacy

Raw、Normalized、Canonical History、Provenance、Realtime Snapshot、Quarantine 分别制定 Retention。位置与隐私数据采用更严格最小化和较短保留。

## 37. v1

优先实现：Data Source Registry、Dataset Manifest、Data Version、Field Provenance、Freshness State、Quality State、Quarantine、Quality Gate、Active Dataset Pointer、Planner Data Bundle Reference、Ingestion Run Manifest。

首批 Domain：POI Master、43D、POI Duration、Opening Hours、Route Snapshot、Weather Snapshot、Booking Status。

## 38. v2 / v3

v2：Distribution Drift、Source Health、Schema Drift、Data Shadow、Partial Rollout、Price/Inventory Governance、Manual Review UI。

v3：Lineage Graph、Advanced Anomaly Detection、Cross-provider Consensus、Data Trust Scoring、Automated Repair Proposal、Multi-region Governance。

## 39. 验收 Gate

POI/43D Gate：Canonical ID 存在、Required Fields 完整、43维完整、值域合法、Unknown 不转 0、Feature Version 明确、Provenance 可追踪、Distribution 正常、Planner Benchmark 无关键 Regression。

Freshness Gate：每个实时字段有 TTL Policy；stale/expired 可识别；Hard Expired 不冒充实时；Fallback 明确；AI/UI 能区分 live/cached/historical/estimated。

Provenance Gate：关键字段可追踪来源；Derived 可追踪算法版本；AI-generated 记录 Model/Prompt；Manual Override 有操作者与原因；Dataset 可追溯 Ingestion Run。

Data Release Gate：Schema PASS、Completeness PASS、Uniqueness PASS、Semantic PASS、Conflict PASS/Reviewed、Distribution PASS、Benchmark PASS、Manifest Complete、Rollback Target Exists。

## 40. 最终冻结原则

> 任何进入 Planner / AI 的关键事实都必须有来源、版本与时间语义。

> Freshness 与 Quality 是两个独立维度。

> 新数据不能因为“抓取得更晚”就自动覆盖更权威来源。

> Raw、Normalized、Candidate、Canonical 必须分层。

> Canonical Value 由确定性 Policy 选择，不由 LLM 临时决定。

> 43维、推荐时长、营业时间、路线 Snapshot 等数据版本与 Planner 代码版本同等重要。

> Unknown 不等于 0，Stale 不等于 Current，Cached 不等于 Live。

> AI-generated Data 默认是 Derived / Provisional，不是 Authoritative Source。

> 数据发布必须经过 Quality Gate、Benchmark、Versioning 与 Rollback。

> 数据事故必须能够反查受影响 Planner Run、Trip 与 Action。

> TravelAssist 的智能质量上限最终取决于输入数据可信度，因此 Data Governance 属于核心产品架构，而不是后台清洗附属流程。