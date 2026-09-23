# TravelAssist Map / Routing / POI / AI Provider Policy v1.0

> 日期：2026-09-24  
> 状态：**Frozen / 可作为开发依据**  
> 适用范围：Web、后续 iOS / Android、Trip Planning Engine、Route Provider、POI Master、AI Gateway、地图展示与成本治理  
> 优先级：本文件对“地图 / 路线 / POI / 默认 AI 模型 / POI 图片存储”的供应商选择，高于早期候选文档中的 Mapbox 或未定表述。Provider-independent Contract 本身不变。

---

## 1. 已冻结技术选择

| 能力 | 当前采用方案 | 边界 |
|---|---|---|
| Web 地图展示 | Google Maps Platform / Maps JavaScript API | 只承担地图展示与 TravelAssist 图层承载 |
| Android / iOS 地图展示 | Google Maps SDK | 只承担地图展示与 TravelAssist 图层承载 |
| 路线规划 | Google Routes API | 默认主 Route Provider；通过现有 `RoutingProvider` / Route Contract 适配 |
| POI Master | TravelAssist 自建 | Supabase PostgreSQL + PostGIS；TravelAssist 自有 Schema、ID、坐标、分类、43维 Feature、推荐数据 |
| Google Places | **核心产品禁用** | 不以 Places / Nearby Search / Text Search / Place Details 作为 TravelAssist POI 数据源 |
| 43维 Feature | TravelAssist 自建 | 不从 Google Maps Content 派生，不以 Google 路线/地图数据训练或补写 Feature |
| POI 图片对象存储 | Cloudflare R2 | 仅存储 TravelAssist 自有、取得授权或许可证允许长期保存的图片 |
| 默认 LLM | GPT-6 Luna | 经 AI Gateway / Model Router 调用；模型名与价格放 Config，不写入领域 Schema |
| 高能力 LLM | 可选高阶模型 | 仅由 Model Router 在明确质量阈值、预算门槛或人工批准下升级；不得成为默认隐式路径 |

数据库、Migration、RLS、PostGIS 细节继续遵循 `db-orm-migration-standards.md`。

---

## 2. Google Maps Platform 的职责范围

### 2.1 允许承担

Google API 在 TravelAssist 核心架构中只承担两类职责：

1. **地图展示**
   - 地图底图；
   - TravelAssist 自有 POI Marker / Region / Stay Cluster / Meal Area 的可视化承载；
   - 路线 Polyline 与交通结果展示。

2. **路线规划**
   - Drive；
   - Transit（覆盖可用时）；
   - Walk；
   - Bicycle / Two-wheeler 等未来明确启用的 mode；
   - Route Matrix（仅在候选已被 TravelAssist Engine 大幅缩小后按需使用）。

### 2.2 明确不承担

以下能力不得作为核心实现的默认依赖：

- Google Places API；
- Nearby Search；
- Text Search；
- Place Details；
- Google Rating / Review Count / Reviews；
- Google Opening Hours；
- Google Places Photos；
- 将 Google 地图中可见 POI Label 抽取后写入 TravelAssist POI Master；
- 使用 Google Maps Content 生成 TravelAssist 43维 Feature、TravelEdge Prior、训练集或模型改进数据。

Google 底图自身可能显示 Google 的地图标签 / POI 标签；它们只属于地图呈现层，**不得进入 TravelAssist 数据库、推荐、评分或 Master Data 管线**。

Geocoding 不属于当前核心依赖。TravelAssist 规划使用自有 POI Master 的经纬度；未来如确需自由地址解析，必须单独评审供应商、价格、授权与数据保留规则。

---

## 3. POI 与路线的数据流

标准链路：

```text
TravelAssist POI Master (PostgreSQL/PostGIS)
        │
        │ poi_id + TravelAssist-owned lat/lng
        ▼
Trip Planning Engine
        │
        ├─ 自有 Region / TravelEdge Prior 做大范围候选筛选
        │
        └─ 缩小到少量候选路线
                 │
                 ▼
          Google Routes API
                 │
                 ▼
          Google Provider Adapter
                 │
                 ▼
        Canonical Route Contract
                 │
        ┌────────┴────────┐
        ▼                 ▼
   Map / Timeline     Planning Fact
```

关键规则：

- Google 不负责“这个 POI 是什么”；Google 只接收 TravelAssist 已决定的坐标 / 路线请求。
- POI Identity、坐标、类型、43维 Feature、推荐分与区域关系的事实源是 TravelAssist 自有 Master。
- AI 不接触 Google Provider Raw JSON；只接收经过 Adapter 与 Policy 允许的最小 Route Summary。
- Canonical Route Contract 保持 Provider-independent，后续更换 Provider 不改变 Planner / AI / UI 的领域模型。

---

## 4. Route Provider 策略

### 4.1 默认 Provider

Google Routes API 为默认主 Route Provider。

```text
Map / Drive / Walk / Transit
        → Google Maps Platform / Google Routes API
```

既有 駅すぱあと Evaluation Adapter 不删除，可继续作为日本公共交通的评估 / 明确启用的 fallback 能力；但它不是当前默认主 Provider。

### 4.2 Transit

Google Routes 当前支持 Transit。由于 Transit Route 不支持中间 Waypoint：

- 多 POI 一日行程按 **相邻行程节点逐 Leg** 计算；
- Candidate Pruning 可在必要时使用 Route Matrix；
- 最终展示使用每个 Leg 的 Canonical Route；
- 不为了减少 API 次数把多个 Transit Leg 错误合并为一条带中间点的请求。

### 4.3 Walk / Bicycle

如启用 Google 标记为 Beta 或要求额外提示的 travel mode：

- UI 必须显示 Google 要求的安全 / 路径完整性提示；
- 不得把 Beta 路径当作绝对安全事实；
- Planner 仍需保留自己的可行性与用户限制判断。

---

## 5. 缓存、持久化与授权边界

**不得把“降低 API 费用”建立在违规长期缓存 Google Maps Content 上。**

规则：

1. Google Routes / Maps 内容只按当前 Google Maps Platform 条款和 Documentation 允许的范围缓存或暂存。
2. Provider-specific cache 必须带：
   - provider；
   - observedAt；
   - expiresAt；
   - licensePolicyVersion；
   - cacheDisposition。
3. 未明确获得许可时：
   - 不长期持久化 Google Route Geometry；
   - 不把 Google 返回的距离 / 时间 /路线内容沉淀为 TravelAssist 永久 Master；
   - 不用 Google 结果生成永久 TravelEdge Prior；
   - 不把 Google 内容保存到 R2 作为自有数据资产。
4. Canonical Trip 的长期事实优先保存：
   - TravelAssist POI ID；
   - TravelAssist 自有坐标；
   - Route Intent；
   - Transport Mode；
   - 用户选择；
   - 自有 / 开放数据来源的 Planning Prior。
5. Google Route Result 属于 Runtime Provider Fact；是否可跨 Session 保存以及 TTL 必须由 Provider Policy 显式允许。
6. Google Routes Result 如显示在地图上，使用 Google Map，并遵守 attribution / branding 要求。

TravelAssist 的长期路线先验必须来自 **自有计算、允许长期保存的开放数据或独立授权数据源**，不能由 Google Maps Content 反向生产。

---

## 6. 成本控制原则

成本控制不靠牺牲数据所有权，也不靠违规缓存。

路线调用必须经过 `route-policy-router-v1.md`。关键词、GPT-6 Luna Intent、Trip 日期、Fact Freshness 和 Budget 只作为 Router 输入；**任何单一关键词或 LLM 输出都不得直接触发 Google Routes**。

### 地图

- Planner 页面生命周期内只初始化一个 Map Instance；
- React State / Trip State 更新不得重复销毁并创建地图；
- 隐藏 / 显示 Panel 不应触发新的 Map Load；
- 使用量、错误率、Quota、费用统一监控。

### 路线

大规模搜索先使用 TravelAssist 自有 Region Graph / TravelEdge Prior：

```text
大量候选
↓
自有规则 / Region Graph / 43维评分
↓
Pareto / Feasibility 筛选
↓
极少候选
↓
Google Routes
```

仅在以下场景调用付费 Route Provider：

- 生成最终候选方案需要真实路线验证；
- 用户改变关键行程节点 / 交通方式；
- 用户主动要求重新规划；
- 临近出行需要更新动态路线事实；
- Replanning Policy 判定旧 Route Fact 已不可用。

禁止：

- 每次 React render 调 Route API；
- AI 自主无限循环调用 Route API；
- 对 15,000+ POI 做全量 Route Matrix；
- 为同一 UI 动作无幂等控制地重复请求；
- 请求未使用的 Provider 字段。

必须：

- 使用 Field Mask / 最小响应字段；
- Request Coalescing / 幂等去重只在许可的临时范围内使用；
- AI Gateway 设置 tool-call 次数预算；
- Route Provider 设置日 / 月 Usage Budget、报警阈值和 Hard Cap。

---

## 7. GPT-6 Luna 基线

GPT-6 Luna 作为 TravelAssist 默认 AI Runtime：

```text
User / Trip State
↓
Context Builder
↓
Compact Context
↓
Model Router
↓
GPT-6 Luna (default)
↓
Schema Validator
↓
Planning Engine Revalidate
↓
ChangeSet
```

规则：

- `GPT-6 Luna` 是默认配置，不写死在 Trip / POI / Route Schema；
- 具体 API Model ID、价格、Token Limit、fallback model 写入环境 / 配置层；
- 低风险解释、偏好理解、候选选择优先 Luna；
- 更高成本模型只能经明确 Router Policy 升级；
- AI 不读取全量 POI，不读取 Provider Raw JSON；
- Provider Route Fact 进入 AI 前必须压缩为任务所需最小 Summary；
- Google Maps Content 不用于训练、测试、验证、微调或生成 TravelAssist 的长期 43维 Master Data。

---

## 8. Cloudflare R2 边界

R2 作为 POI 图片 / 静态资产对象存储的当前默认：

可以保存：

- TravelAssist 自制图片；
- 用户明确授权内容；
- 公有领域 / 开放许可证允许的图片；
- 商业授权允许长期保存与再展示的素材。

不得保存：

- 从 Google Maps / Places / Street View 等服务抓取并当成自有素材的内容；
- 许可证不允许长期保存或再分发的第三方内容。

数据库只保存 Asset Metadata / Object Key / License / Source / Provenance，不把大图片二进制塞入 PostgreSQL。

---

## 9. Provider 失败时的降级

Google Routes 不可用、Rate Limited 或预算达到 Hard Cap 时：

- 不伪造当前 Route Fact；
- 可使用 TravelAssist 自有 TravelEdge Prior 做“规划级估算”，但必须标记为非实时 / 低置信；
- 需要真实路线才能安全确定的决策进入 warning / blocked / refresh；
- 如果未来明确启用 駅すぱあと 等 fallback Provider，则由 Provider Router 显式切换并重新归一化到 Canonical Route Contract；
- AI 不得自行把 Prior 描述成实时路线。

---

## 10. 安全

- Google server-side credential 不进入浏览器；
- Web API Key 必须启用 HTTP Referrer 与 API Restriction；
- Android / iOS Key 使用对应 App / Package / Bundle Restriction；
- Route Server 调用通过服务端 Provider Adapter；
- Provider credential 不写数据库业务表、不写 AI Context、不写日志正文；
- Usage / Billing 监控使用独立安全指标。

---

## 11. 开发验收条件

任何 Google Maps / Routes 接入至少满足：

- [ ] 不调用 Google Places 作为 POI Master 数据源；
- [ ] POI 坐标来自 TravelAssist Master；
- [ ] Provider Raw JSON 不泄漏到 Planner / AI / UI 公共 Contract；
- [ ] Google Routes 归一化为 Canonical Route Contract；
- [ ] 关键词 / AI Intent 不直接触发 Google Routes，必须经过 Route Policy Router；
- [ ] Map Instance 不因普通状态更新重复初始化；
- [ ] Transit 多节点按 Leg 处理；
- [ ] 必要的 Google attribution / warning 已实现；
- [ ] 缓存 / 持久化通过 Provider Policy 检查；
- [ ] 不由 Google Content 生成 43维、TravelEdge Prior 或训练数据；
- [ ] API Key / Service Credential 完成最小权限与域 / App 限制；
- [ ] Quota、预算报警与 Hard Cap 可配置；
- [ ] GPT-6 Luna 仍通过 Model Router，不在领域层硬编码。

---

## 12. 与既有文档关系

- `route-contract.md`：继续作为 Provider-independent Route Wire Contract。
- `route-policy-router-v1.md`：冻结 L0 / L1 / L2 路线解析层级、RouteNeedScore、Hard Override、短生命周期去重与 Google Call 决策。
- `trip-engine-poi-ai-provider-design-v0.3.md`：保留整体 Planning / Provider 设计；其中早期 Mapbox 主 Provider 选择由本文件覆盖。
- `planning-fact-freshness-policy-v0.1.md`：继续控制 Route Fact freshness / provenance / fallback。
- `db-orm-migration-standards.md`：继续控制 Supabase PostgreSQL / PostGIS / RLS / Migration。
- `poi-master-schema-v0.2.md`：继续控制 POI Master 与 43维数据结构。
- `ai-compact-context-v1.md`、`ai-decision-contract-v1.md`：继续控制 AI 输入输出边界。

本文件冻结的是 **供应商与数据所有权边界**，不改变以上 Provider-independent Domain Contract。
