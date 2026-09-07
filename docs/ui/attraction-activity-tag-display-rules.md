# TravelAssist 景点与活动标签 / 主系统展示规则

> 文档版本：v1.0  
> 更新日期：2026-09-07  
> 对应 WBS：**1.10 景点与活动标签 / 主系统展示规则**  
> Owner：**B（用户明确单项改派）**  
> Responsibility：Main Travel System / Design Specification  
> 状态：**设计冻结候选 / 待用户审查**  
> 执行方式：ChatGPT 直接设计与规格冻结；**本 WBS 不需要 Codex 实装**  
> 关联：`docs/ui/trip-planner.md`、`docs/ui/planner-map-interaction-booking-mapbox.md`、`docs/ui/trip-detail.md`、`docs/ui/preference-center.md`、`docs/preferences/preference-system.md`

---

# 0. 文档目的与边界

本文件冻结 TravelAssist 主旅行系统中“景点 / 活动是什么、应该显示哪些标签、在哪个界面显示多少”的统一规则。

本设计解决三件事：

```text
POI Taxonomy
= 这个地点 / 活动本质上是什么

Experience Tags
= 为什么它值得这个用户关注

Operational Tags
= 安排行程时有哪些需要注意的执行条件
```

同时明确：

```text
Preference
= 用户长期喜欢什么

POI Taxonomy
= 地点 / 活动是什么

Display Tag
= 当前界面此刻最值得显示给用户什么
```

三者不得混成同一套枚举。

本 WBS **只冻结设计规格**，不实施：

- Places / POI Provider；
- POI 正式 Schema；
- 推荐打分；
- Preference Contract；
- 路线 / Transit；
- Booking；
- AI 行程生成；
- Auth / DB；
- Planner 页面布局改版。

后续 WBS 7.2 / 7.4 / 7.9 可把本文作为输入，但不得由本文提前冒充技术实现。

---

# 1. 设计原则

## 1.1 TravelAssist 自己拥有规范化语义

外部 Provider 的分类只用于映射和审计，不直接成为产品 UI 的事实源。

例如不同 Provider 可能分别返回：

```text
tourist_attraction
place_of_worship
shinto_shrine
historical_landmark
museum
point_of_interest
```

TravelAssist 必须统一映射为自己的稳定分类，再决定用户看到什么。

## 1.2 地图和时间轴保持低噪声

现有 Planner 已冻结：

- 地图是空间主体；
- 底部栏是时间 / 执行主体；
- 右栏是设置 / 方案主体。

因此标签不能变成一排彩色 Chip 覆盖地图。

原则：

> **默认少显示，选中后再解释，详情页再完整展开。**

## 1.3 动态事实不能静态化

以下不能作为静态 POI 标签冻结：

- 当前天气；
- 当前拥挤度；
- 实时排队时间；
- 当前票价；
- 今日营业状态；
- 当前库存；
- 实时交通时间；
- 预约余量。

这些只能由后续实时数据 / Provider / Trip State 在运行时提供。

## 1.4 标签必须解释“用户为什么需要知道”

标签不是后台数据 dump。

例如：

```text
Provider category: establishment
```

对用户没有意义，不显示。

而：

```text
神社
适合拍照
预约建议
```

才是有产品价值的标签。

---

# 2. 六层词汇体系

| 层 | 名称 | 用途 | 稳定性 | 默认用户可见 | 后续持久化建议 |
|---|---|---|---|---|---|
| L1 | `primary_category` | TravelAssist 顶层分类 | 稳定 | 条件显示 | 是 |
| L2 | `secondary_category` | 规范化具体类型 | 稳定，可扩展 | 是 | 是 |
| L3 | `experience_tags` | 旅行体验 / 推荐理由 | 半稳定 / 可派生 | 是 | 视来源 |
| L4 | `operational_tags` | 安排与执行注意事项 | 静态 + 动态混合 | 是，按优先级 | 是 / 运行时状态 |
| L5 | `provider_categories` | 外部 Provider 原始分类 | Provider 依赖 | 否 | 是，审计用 |
| L6 | `preference_dimensions` | 用户长期偏好映射目标 | 由 Preference 系统拥有 | 不作为 POI 类别显示 | 由 5.11 / 5.14 定义 |

## 2.1 L1 `primary_category`

回答：

> 这个地点 / 活动最主要属于哪一类？

规则：

- 每个实体只设 **1 个主分类**；
- 使用稳定英文 `snake_case` ID；
- 不能使用 Provider 专属枚举；
- 不因用户偏好变化而改变；
- UI 可按空间条件显示本地化名称。

## 2.2 L2 `secondary_category`

回答：

> 更具体是什么？

例如：

```text
heritage
└─ shrine

museum_gallery
└─ art_museum

entertainment
└─ aquarium
```

规则：

- 每个实体至少 1 个主 secondary；
- 后续 Schema 可允许附加 secondary，但 UI 默认只展示 1 个最主要类型；
- Provider 选型后可以扩展，但必须映射到稳定 canonical ID。

## 2.3 L3 `experience_tags`

回答：

> 用户在这里会得到什么样的旅行体验？

它不描述“地点是什么”，而描述：

- 看点；
- 体验方式；
- 适用人群；
- 摄影 / 夜景 / 当地感等旅行价值。

## 2.4 L4 `operational_tags`

回答：

> 放进行程时，有什么需要提前处理或注意？

如：

- 预约必需；
- 指定时段；
- 受天气影响；
- 步行较多。

运营标签必须带来源 / 时效概念，不能凭模型主观判断。

## 2.5 L5 `provider_categories`

仅用于：

- Provider Mapping；
- 数据审计；
- 调试；
- Provider 切换；
- 映射质量检查。

默认不向用户直接展示。

## 2.6 L6 `preference_dimensions`

WBS 5.8 已冻结长期景点偏好六维：

```text
自然
历史
人文
艺术
摄影
活动体验
```

这六项是**用户偏好轴**，不是六种 POI 类型。

特别冻结：

> **“摄影”永远不作为 primary_category。**

摄影属于：

- Preference Dimension；
- Experience Tag；
- 推荐匹配理由。

---

# 3. TravelAssist 顶层分类 v1

采用 **9 个正式主分类 + 1 个 fallback**。

| Canonical ID | 中文显示 | 定义 | 为什么独立 |
|---|---|---|---|
| `landmark_scenic` | 地标·观景 | 以标志性建筑、观景、城市景观为主要旅行价值 | 地图与经典路线中高频，和历史建筑需区分 |
| `nature` | 自然 | 自然地貌、公园、山海湖泊、保护区等 | 直接对应自然型旅行需求 |
| `heritage` | 历史·遗产 | 历史建筑、宗教场所、遗址、城堡、宫殿、历史街区 | 历史语义稳定且跨地区普遍 |
| `culture_local_life` | 人文·当地生活 | 街区、传统村落、当地生活、社区文化、文化空间 | 用于表达“当地感”，不等同于购物 |
| `museum_gallery` | 博物馆·艺术 | 博物馆、美术馆、设计 / 科学 / 专题展示空间 | Provider 中高频，且内容语义与普通历史遗产不同 |
| `entertainment` | 娱乐 | 主题乐园、水族馆、动物园、沉浸式娱乐、夜间娱乐等 | 行程时长与预约特性通常不同于普通 POI |
| `shopping_market` | 市场·购物 | 市场、商店街、商业街、购物中心、工艺集市等 | 对路线、停留、当地生活均有独立价值 |
| `activity_experience` | 活动·体验 | 手作、导览、文化体验、户外运动、游船、康养等参与式项目 | 实体本质是“做什么”，不是“看哪里” |
| `event_seasonal` | 节庆·限定 | 节庆、季节活动、展会、限定演出、赛事等时间型实体 | 时间约束强，必须与常驻 POI 分离 |
| `other` | 其他景点 | 暂无法可靠归类的实体 | 必须有稳定 fallback，不能猜分类 |

## 3.1 分类判定原则

优先按“实体的主要旅行功能”而不是知名度分类。

### 历史建筑 vs 地标

```text
姬路城
→ heritage

埃菲尔铁塔
→ landmark_scenic
```

判断：

- 核心价值是历史 / 宗教 / 遗产 → `heritage`；
- 核心价值是现代城市地标 / 观景 / 标志性结构 → `landmark_scenic`。

### 自然观景点 vs 人工观景台

```text
自然峡谷观景区域
→ nature

城市观景塔
→ landmark_scenic
```

### 博物馆 vs 历史建筑

如果实体主要作为：

- 收藏 / 展览 / 教育空间 → `museum_gallery`；
- 历史遗产本体 → `heritage`。

### 市场 vs 人文街区

- 主要功能为市场 / 购物 → `shopping_market`；
- 主要价值为街区生活 / 城市文化 → `culture_local_life`。

### 活动 vs 地点

如果用户购买 / 参加的是一个明确体验：

```text
茶道体验
皮划艇
导览
手作
```

优先 `activity_experience`，即使它发生在某个 POI 内。

---

# 4. Secondary Category v1

> 这是 TravelAssist v1 的规范化候选集合，不等于未来 Provider 的完整 Schema。WBS 7.2 / 7.4 可以扩展，但不能破坏现有 canonical ID 语义。

## 4.1 `landmark_scenic`

| ID | 显示 |
|---|---|
| `landmark` | 地标 |
| `monument_memorial` | 纪念建筑 |
| `observation_tower` | 观景塔 |
| `observation_deck` | 观景台 |
| `urban_viewpoint` | 城市观景点 |
| `bridge_landmark` | 地标桥梁 |
| `architecture_landmark` | 建筑地标 |
| `waterfront_scenic` | 滨水景观 |

## 4.2 `nature`

| ID | 显示 |
|---|---|
| `urban_park` | 城市公园 |
| `garden` | 园林·花园 |
| `mountain_hill` | 山岳 |
| `beach_coast` | 海滩·海岸 |
| `lake_river` | 湖泊·河川 |
| `waterfall` | 瀑布 |
| `forest` | 森林 |
| `nature_reserve` | 自然保护区 |
| `canyon_valley` | 峡谷·山谷 |
| `cave_geothermal` | 洞穴·地热 |
| `natural_viewpoint` | 自然观景点 |
| `botanical_garden` | 植物园 |

## 4.3 `heritage`

| ID | 显示 |
|---|---|
| `historic_building` | 历史建筑 |
| `castle_fortress` | 城堡·要塞 |
| `palace` | 宫殿 |
| `archaeological_site` | 遗址 |
| `heritage_district` | 历史街区 |
| `temple` | 寺院 |
| `shrine` | 神社 |
| `church_cathedral` | 教堂·大教堂 |
| `mosque` | 清真寺 |
| `other_religious_site` | 宗教场所 |
| `traditional_residence` | 传统宅邸 |

> 宗教具体传统可以作为独立属性 / Provider Mapping 信息保留，不应继续无限扩张顶层分类。

## 4.4 `culture_local_life`

| ID | 显示 |
|---|---|
| `cultural_district` | 人文街区 |
| `traditional_village` | 传统村落 |
| `local_neighborhood` | 当地街区 |
| `community_culture` | 社区文化 |
| `craft_district` | 工艺街区 |
| `cultural_center` | 文化空间 |
| `local_life_spot` | 当地生活 |

## 4.5 `museum_gallery`

| ID | 显示 |
|---|---|
| `art_museum` | 美术馆 |
| `history_museum` | 历史博物馆 |
| `science_museum` | 科学博物馆 |
| `specialty_museum` | 专题博物馆 |
| `gallery` | 艺廊 |
| `design_architecture_center` | 设计·建筑展馆 |
| `immersive_art` | 沉浸式艺术 |

## 4.6 `entertainment`

| ID | 显示 |
|---|---|
| `theme_park` | 主题乐园 |
| `aquarium` | 水族馆 |
| `zoo_wildlife_park` | 动物园·野生动物园 |
| `interactive_attraction` | 互动娱乐 |
| `gaming_arcade` | 游戏娱乐 |
| `live_entertainment_venue` | 现场娱乐 |
| `nightlife_venue` | 夜间娱乐 |

> “亲子”不是分类，而是 Experience Tag。

## 4.7 `shopping_market`

| ID | 显示 |
|---|---|
| `public_market` | 市场 |
| `shopping_street` | 商店街 |
| `shopping_center` | 购物中心 |
| `department_store` | 百货 |
| `craft_market` | 工艺集市 |
| `outlet` | 奥特莱斯 |
| `specialty_shopping_area` | 特色购物区 |

## 4.8 `activity_experience`

| ID | 显示 |
|---|---|
| `guided_tour` | 导览体验 |
| `cultural_workshop` | 文化·手作体验 |
| `food_experience` | 饮食文化体验 |
| `outdoor_adventure` | 户外探险 |
| `sport_activity` | 运动体验 |
| `boat_cruise_activity` | 游船·水上体验 |
| `wellness_activity` | 温泉·康养体验 |
| `performance_experience` | 演出体验 |
| `hands_on_experience` | 参与式体验 |

## 4.9 `event_seasonal`

| ID | 显示 |
|---|---|
| `festival` | 节庆 |
| `seasonal_event` | 季节活动 |
| `illumination_event` | 灯光·夜间限定 |
| `exhibition_event` | 限定展览 |
| `performance_event` | 演出活动 |
| `sport_event` | 体育赛事 |
| `fair_event` | 市集·展会 |

---

# 5. Experience Tags v1

Experience Tag 的数量可以比分类多，但 UI 必须按当前界面限量显示。

## 5.1 稳定 / 编辑型标签

| ID | 中文 | 允许来源 | 备注 |
|---|---|---|---|
| `photo_friendly` | 适合拍照 | 编辑 / 可靠内容源 | 不等于实时光线好 |
| `family_friendly` | 亲子友好 | 官方 / Provider / 编辑审核 | 不凭类别自动猜 |
| `indoor` | 室内 | 实体属性 | 可用于雨天候选推导 |
| `outdoor` | 户外 | 实体属性 | 与天气敏感不是同义 |
| `night_view` | 夜景 | 编辑 / 官方 | 不表示今晚一定适合 |
| `sunset_spot` | 日落景观 | 编辑 / 官方 | 运行时仍需结合日落时间 / 天气 |
| `relaxed_walk` | 轻松散步 | 编辑 / 路线数据派生 | 未有步行数据时不显示 |
| `deep_culture` | 深度文化 | 编辑 | 推荐理由型标签 |
| `local_character` | 当地特色 | 编辑 | 避免滥用为所有本地 POI |
| `hands_on` | 可参与体验 | 类型 / 编辑 | 活动实体优先 |
| `iconic` | 经典代表 | 编辑 / 产品策划 | 不直接等于“热门” |
| `hidden_gem` | 小众发现 | 编辑 / 可靠热度数据 | 主观标签，必须有来源 |
| `seasonal_highlight` | 季节看点 | 官方 / 编辑 | 必须有适用季节信息 |
| `accessible_friendly` | 无障碍友好 | 官方 / 权威无障碍数据 | 不得由模型推断 |

## 5.2 上下文派生标签

这些不是永久事实，而是“当前 Trip Context 下成立”的显示结果：

| ID | 显示 | 依赖 |
|---|---|---|
| `rainy_day_option` | 雨天可选 | 室内属性 + 当前天气 / 规则 |
| `good_for_current_party` | 适合同行人 | Companion + 已验证设施 / 体验数据 |
| `preference_match` | 符合您的偏好 | Preference Contract + 后续推荐匹配 |
| `near_current_route` | 顺路 | Route / Matrix |
| `good_for_evening` | 适合晚间 | 营业 / 时间 / 类型 / Trip Context |

这些必须由运行时系统产生，不能写死进 POI Master。

## 5.3 明确禁止的伪静态标签

不得把以下内容保存成长期 Experience Tag：

```text
今天人少
现在不排队
当前天气很好
今天便宜
实时热门
还有票
现在开放
距离您12分钟
```

---

# 6. Operational / Planning Tags v1

Operational Tag 的意义高于普通体验标签，因为它会影响行程是否可执行。

| ID | 中文 | 类型 | 显示前提 |
|---|---|---|---|
| `reservation_required` | 预约必需 | 相对稳定 | 官方 / Provider 确认且在有效期内 |
| `reservation_recommended` | 建议预约 | 半稳定 | 可靠来源 / 产品规则 |
| `timed_entry` | 指定时段 | 相对稳定 | 官方 / Provider 确认 |
| `ticket_required` | 需要门票 | 相对稳定 | 官方 / Provider 确认；票价不静态显示 |
| `weather_sensitive` | 受天气影响 | 稳定属性 | 明确为户外 / 气象敏感活动 |
| `seasonal_operation` | 季节开放 | 稳定 + 时段 | 必须有有效季节 / 日期来源 |
| `high_walk_requirement` | 步行较多 | 派生 | Route / 实测 / 权威数据 |
| `steep_or_stairs` | 坡道 / 台阶较多 | 属性 | 权威 / 编辑审核 |
| `accessibility_unverified` | 无障碍信息待确认 | 信息状态 | 缺少可靠数据时只在相关详情中显示 |

## 6.1 运行时优先级更高的状态

未来 Trip / Execution 系统可能提供：

```text
已预约
预约未知
临时关闭
预计迟到
交通中断
天气风险
```

这些属于 **Trip State / Live Status**，优先级高于本文件中的静态标签。

例如：

```text
✓ 门票已确认
❗ 预计无法按预约时间到达
```

不能被“适合拍照”之类标签覆盖。

---

# 7. 标签来源与置信度

建议后续 7.4 每一个可显示标签至少保留：

```text
canonical_id
source_type
source_ref
confidence
verified_at
valid_from / valid_to（需要时）
```

来源优先级建议：

```text
官方 / 权威实体数据
> 已批准 Provider 结构化字段
> TravelAssist 人工策划 / 审核
> 可验证开放数据
> 推导规则
> 模型推测（不得作为事实标签直接展示）
```

## 7.1 置信度规则

- `high`：可直接展示；
- `medium`：详情层可展示，默认 Map / Timeline 不显示；
- `low / unknown`：不作为事实标签展示，可进入待审核队列。

---

# 8. Surface-by-Surface 展示冻结

## 8.1 Map Pin 默认态

目的：

> 一眼知道“这里是什么 / 是不是正式行程点”，而不是读标签。

显示：

- POI 图 / 类别 Icon；
- 名称；
- 正式节点顺序 / Day（已有规则）；
- 最多 `1` 个**关键状态标识**，仅在预约 / 执行语义必须提示时出现。

普通 Experience Tag：

```text
0 个
```

禁止：

- 多个彩色 Chip；
- Provider category；
- 评分 / 排名；
- 动态事实假标签。

## 8.2 Map Pin 选中态

Pin 放大 / Morph 前的选中态允许：

- 名称；
- 1 个 `secondary_category`；
- 最多 1 个关键 operational 状态。

总标签数量：

```text
最多 2
```

## 8.3 POI Mini Popup / Quick Card

与现有“正式景点 / 活动快速卡”对齐。

显示顺序：

1. 名称；
2. `secondary_category`：最多 1；
3. 最相关 Experience Tag：最多 2；
4. Operational Tag：最多 1；
5. 开放时间 / 预约 / 排队 / 雨天等已有信息区域按数据可得性显示，不重复为 Chip。

可见标签总数：

```text
最多 4
```

如果 operational 信息已经在“预约状态 / 开放时间”结构行显示，则不再重复 Chip。

## 8.4 POI Detail Panel

完整详情允许更丰富解释，但仍不展示 Provider 原始标签墙。

建议：

```text
主类型          1
Experience      0–4
Operational     0–3
```

额外采用正文区解释：

- 为什么推荐；
- 与当前偏好匹配点；
- 游玩建议；
- 当前行程影响；
- 预约 / 营业 / 交通。

详情层可以显示“更多标签”，但默认首屏不超过 `8` 个语义项。

## 8.5 Bottom Timeline Compact Item

时间轴的核心是：

```text
时间 + 地点 + 时长 + 移动 + 状态
```

因此冻结：

- 类别 Icon / 文字：最多 1；
- Operational / Reservation Badge：最多 1；
- Experience Tag：默认 `0`。

不允许时间轴因为“适合拍照 / 当地特色 / 经典”等标签变高。

## 8.6 Bottom Timeline Expanded / Detail Item

展开后：

- `secondary_category`：1；
- Experience：最多 2；
- Operational：最多 2；
- 当前 Trip / Reservation Status 另行显示，不占 Experience 配额。

优先展示：

> 对当前用户偏好最相关的体验标签。

## 8.7 Recommendation Plan 1 / 2 / 3

现有推荐方案卡几何与内容已经冻结，本 WBS **不得新增固定标签行**。

规则：

- 如果现有卡已有短摘要 / 理由槽，最多使用 2 个**方案级汇总标签**；
- 不把每个 POI 的标签塞入方案卡；
- 不因为本 WBS 改变方案卡尺寸、行高、按钮位置。

可用方案级摘要例：

```text
历史·人文
亲子轻松
摄影取景
活动体验丰富
```

这些是方案聚合说明，不是单个 POI taxonomy。

## 8.8 Trip Detail / Execution Workspace

Execution Mode 优先级：

```text
Live / Reservation / Risk
> 当前节点类别
> Experience
```

默认时间轴节点仍按 8.5 规则。

当用户点开节点详情时：

- 类别 1；
- Experience 最多 2；
- Operational 最多 2；
- Live Status 不受上述配额限制，但必须放在状态区，不混入普通标签。

例如：

```text
美术馆
艺术 · 室内
✓ 门票已确认
❗ 预计到达晚 20 分钟
```

## 8.9 Search / Candidate POI List

当前主规格未冻结一套独立的大型候选搜索列表，因此本项标记为：

```text
Future / Conditional Surface
```

未来若实现，每张候选卡建议：

- `secondary_category` 1；
- Experience 最多 2；
- Operational 最多 1；
- 总计不超过 4；
- Provider 原始类别不显示。

---

# 9. 确定性显示优先级

当标签多于 UI Slot 时，按以下顺序选择：

```text
P0  已验证且影响可执行性的 Operational / Live 状态
P1  最具体且不重复的 secondary_category
P2  与用户当前 Preference 最强匹配的 Experience Tag
P3  与当前 Trip Context 直接相关的体验标签
P4  产品策划型 Experience Tag
P5  其他低优先级标签
```

## 9.1 P0 例外

Live 状态由其他系统提供时拥有最高优先级，例如：

```text
临时关闭
预约冲突
预计迟到
天气风险
```

它们不能因为标签数量上限被截掉。

UI 应使用专门状态位，而不是和普通 Chip 抢同一个槽。

## 9.2 去重

### 类别与体验语义重复

如果 secondary 已经是：

```text
观景台
```

普通场景下不再显示：

```text
适合观景
```

除非后者对当前用户偏好有明确额外价值。

### 多 Provider 同义词

```text
scenic_viewpoint
observation_point
view_point
```

统一 canonical 后只显示一个。

### 主分类与细分类

如果显示：

```text
神社
```

紧凑 UI 不再同时显示：

```text
历史·遗产
```

详情页可在信息层级中体现父类，但不做两个并列 Chip。

## 9.3 冲突标签

例如同时得到：

```text
family_friendly
high_walk_requirement
```

两者并不逻辑冲突，但在亲子 Trip 中应优先把步行负担作为 Operational 显示。

真正语义冲突时：

```text
indoor
outdoor
```

不能并列硬显示；必须检查实体是否是混合空间。

若无法确定：

- 降低 confidence；
- 不在紧凑 Surface 显示；
- 进入待审核 / 详情说明。

## 9.4 无本地化时

Fallback：

```text
当前语言 secondary label
↓
当前语言 primary label
↓
英文 secondary label
↓
通用“景点” / “活动”
```

永远不把：

```text
heritage_district
zoo_wildlife_park
```

这类内部 ID 直接显示给普通用户。

---

# 10. Preference Mapping 边界

## 10.1 六维长期偏好保持不变

```text
nature      自然
history     历史
humanity    人文
art         艺术
photography 摄影
activity    活动体验
```

本文只定义 POI → Preference 的未来映射方向。

## 10.2 一个 POI 可以映射多个偏好维度

例如：

```text
伏见稻荷大社
primary = heritage
secondary = shrine
experience = photo_friendly, deep_culture
```

可映射：

```text
历史        strong
人文        medium
摄影        medium
```

但它的 `primary_category` 仍然只是：

```text
heritage
```

## 10.3 推荐未来 Mapping Shape

仅作为 5.14 / 7.9 输入，不在本 WBS 实装：

```ts
interface PoiPreferenceAffinity {
  dimensionId:
    | "nature"
    | "history"
    | "humanity"
    | "art"
    | "photography"
    | "activity";

  relation: "primary" | "secondary" | "experience";
  strength: "strong" | "medium" | "weak";
  provenance: "canonical_rule" | "curated" | "provider";
}
```

注意：

- `strength` 不是用户最终推荐分数；
- 不在 1.10 冻结推荐权重；
- 后续 7.9 可以结合用户 Preference、同行人、路线、时间、预算计算实际推荐。

## 10.4 基础映射建议

| POI 语义 | 偏好映射方向 |
|---|---|
| `nature` | 自然 strong；摄影按 Experience 另算 |
| `heritage` | 历史 strong；人文 medium |
| `culture_local_life` | 人文 strong；摄影 / 历史按标签另算 |
| `museum_gallery/art_museum` | 艺术 strong |
| `museum_gallery/history_museum` | 历史 strong |
| `landmark_scenic` | 摄影 medium；经典倾向属于旅行风格，不属于六维景点轴 |
| `activity_experience` | 活动体验 strong |
| `event_seasonal` | 活动体验 medium/strong，具体依类型 |
| `shopping_market/public_market` | 人文 medium；购物不新增第 7 个景点偏好维度 |
| `entertainment` | 活动体验 medium；具体二级类型再补充 |

---

# 11. Provider / POI Schema Handoff

## 11.1 建议字段方向

WBS 7.4 可参考：

```text
poi_id
entity_kind                place | activity | event
primary_category
secondary_category
provider_categories[]
experience_tags[]
operational_traits[]
preference_affinities[]
localization_keys
provenance
confidence
verified_at
```

这是结构建议，不是本 WBS 的正式代码 Schema。

## 11.2 Provider Mapping 表

建议未来独立维护：

```text
src/data/poi/category-mapping/<provider>.ts
```

或等价数据目录。

原则：

```text
Provider Raw Category
→ TravelAssist Secondary Category
→ TravelAssist Primary Category
```

不得把映射散落在 UI 组件里。

## 11.3 保留原始 Provider 分类

即使已规范化，也保留 raw categories，原因：

- 后续修正错误映射；
- Provider 版本变更；
- 数据质量审计；
- Provider 切换对照。

## 11.4 Unknown

Provider 无法可靠映射时：

```text
primary_category = other
secondary_category = unknown
mapping_status = review_required
```

不得根据名称猜一个看似合理的类别然后标记高置信度。

## 11.5 版本化

建议分类版本：

```text
taxonomy_version = "1.0"
```

未来如果：

- 拆分类；
- 合并分类；
- ID 重命名；

必须提供 Migration Mapping，不直接静默改历史 Trip。

---

# 12. Localization 冻结

## 12.1 ID 与文案分离

代码存：

```text
observation_deck
```

UI 显示：

```text
zh-Hans: 观景台
ja: 展望台
en: Observation deck
```

禁止把中文文字直接当 Schema ID。

## 12.2 紧凑 Surface

Map / Timeline：

- 单行；
- 优先短名称；
- 不允许因德语 / 法语等长文案撑高节点；
- 必要时使用更短的 surface-specific label；
- 不能只靠 tooltip 承载重要运营信息，因为移动端无 Hover。

## 12.3 详情 Surface

POI Detail：

- 标签可换行；
- 正文解释可多行；
- 不使用过度缩小字体解决长文本。

---

# 13. Accessibility 冻结

1. 分类意义不能只通过颜色表达。
2. 有关键意义的图标必须配可读文本或 `aria-label`。
3. Map Pin 的无障碍名称至少包含：

```text
地点名 + 类型 + 当前行程状态（若有）
```

4. Operational 状态必须能被屏幕阅读器读取。
5. 红 / 黄 / 绿状态必须同时有：

- Icon；
- 文案；
- 状态语义。

6. Map / Timeline 限制标签数量是为了降低认知负担，不用缩小字体塞更多内容。
7. 键盘 Focus 后得到的信息不能少于 Mouse Hover。

---

# 14. 跨地区规范化示例

> 以下只演示分类与标签语义。动态营业、票价、排队、实时预约等信息一律不在示例中声称为当前事实。

| 示例 | Primary | Secondary | Experience 示例 | Operational | Preference 映射 | 紧凑显示示例 |
|---|---|---|---|---|---|---|
| 埃菲尔铁塔 | `landmark_scenic` | `observation_tower` | `photo_friendly`, `iconic` | 运行时 / 官方确认 | 摄影 medium | `观景塔 · 适合拍照` |
| 伏见稻荷大社 | `heritage` | `shrine` | `deep_culture`, `photo_friendly` | 未确认不显示 | 历史 strong、人文 medium、摄影 medium | `神社 · 深度文化` |
| 姬路城 | `heritage` | `castle_fortress` | `iconic`, `photo_friendly` | 未确认不显示 | 历史 strong、摄影 medium | `城堡·要塞 · 经典代表` |
| 圣家堂 | `heritage` | `church_cathedral` | `architecture_landmark`, `photo_friendly`* | 未确认不显示 | 历史 medium、艺术 medium、摄影 medium | `大教堂 · 适合拍照` |
| 卢浮宫 | `museum_gallery` | `art_museum` | `deep_culture`, `iconic` | 未确认不显示 | 艺术 strong、历史 medium | `美术馆 · 深度文化` |
| 纽约中央公园 | `nature` | `urban_park` | `outdoor`, `relaxed_walk` | 未确认不显示 | 自然 strong | `城市公园 · 轻松散步` |
| 大峡谷南缘观景区域 | `nature` | `natural_viewpoint` | `outdoor`, `photo_friendly` | `weather_sensitive` 需来源确认 | 自然 strong、摄影 strong | `自然观景点 · 适合拍照` |
| 大阪海游馆 | `entertainment` | `aquarium` | `indoor`, `family_friendly` | 未确认不显示 | 活动体验 medium | `水族馆 · 亲子友好` |
| 日本环球影城 | `entertainment` | `theme_park` | `family_friendly`, `hands_on` | 预约 / 票务依官方实时确认 | 活动体验 strong | `主题乐园 · 亲子友好` |
| Borough Market | `shopping_market` | `public_market` | `local_character` | 未确认不显示 | 人文 medium | `市场 · 当地特色` |
| 蒙马特街区 | `culture_local_life` | `cultural_district` | `local_character`, `photo_friendly` | 未确认不显示 | 人文 strong、摄影 medium | `人文街区 · 当地特色` |
| 京都茶道体验（活动实体） | `activity_experience` | `cultural_workshop` | `hands_on`, `deep_culture` | 预约要求由具体 Provider 决定 | 活动体验 strong、人文 strong | `文化体验 · 可参与` |
| 米尔福德峡湾游船（活动实体） | `activity_experience` | `boat_cruise_activity` | `outdoor`, `photo_friendly` | `weather_sensitive` 需来源确认 | 活动体验 strong、自然 strong、摄影 medium | `游船体验 · 户外` |
| 祇园祭（事件实体） | `event_seasonal` | `festival` | `seasonal_highlight`, `local_character` | 日期必须由官方数据确认 | 活动体验 strong、人文 strong | `节庆 · 季节看点` |
| 新加坡夜间野生动物园类型景点 | `entertainment` | `zoo_wildlife_park` | `family_friendly`, `outdoor` | 营业 / 票务依官方确认 | 活动体验 medium、自然 weak | `野生动物园 · 亲子友好` |

\* `architecture_landmark` 在示例中表达“建筑看点”的体验语义；若未来作为 Experience Tag 正式化，应使用独立 canonical tag（例如 `architecture_interest`），不要复用 Secondary ID。本例仅说明映射方向。

---

# 15. 示例暴露出的正式规则

## 15.1 一个实体只设一个 Primary

一个地点可以同时：

- 有历史；
- 适合拍照；
- 很经典；
- 有当地文化。

但不能因此有四个 Primary。

## 15.2 多偏好映射不等于多分类

例如：

```text
大峡谷
POI 分类 = nature
Preference = 自然 + 摄影
```

这正是把 Taxonomy 与 Preference 分开的意义。

## 15.3 操作条件必须有来源

即使常识上“很多热门景点需要票”，产品仍不能用模型记忆直接写：

```text
预约必需
```

必须等待：

- 官方；
- 已批准 Provider；
- 已验证产品数据。

---

# 16. 与 Planner 现有设计的冲突处理

## 16.1 地图 Pin

现有 Planner 已冻结 Pin：

- 图片 / 图标；
- 名称；
- 正式节点可有顺序 / Day；
- 推荐 POI 更轻；
- 选中后 Morph 成卡。

因此 1.10 **不新增默认 Pin 标签条**。

## 16.2 Quick Card

现有 Quick Card 已有：

- 名称；
- 类型；
- 开放时间；
- 门票；
- 预约；
- 排队；
- 雨天适配；
- 操作。

1.10 只规范“类型 / Experience / Operational”的来源和优先级，不重新设计卡片。

## 16.3 Timeline

现有 Timeline 重点是：

- 时间；
- 地点；
- 停留；
- 交通；
- 预约；
- 可调整性。

因此 Experience Tags 默认不进入 Compact Timeline。

## 16.4 Recommendation Cards

已有推荐方案结构冻结，不为 1.10 改几何。

---

# 17. 与 5.8 Personal Center 的边界

5.8 已完成：

```text
自然 / 历史 / 人文 / 艺术 / 摄影 / 活动体验
很喜欢 / 喜欢 / 一般 / 不喜欢
拍照体验
```

1.10 不修改这些 UI。

未来正确链路：

```text
B Personal Center Preference
       ↓
5.14 Preference Contract
       ↓
A Planner / Recommendation
       ↓
POI Taxonomy + Experience Tags
       ↓
7.9 Recommendation Scoring
```

禁止链路：

```text
“用户喜欢摄影”
→ 把 POI primary_category 改成 photography
```

---

# 18. 后续 WBS 交接

## 18.1 WBS 7.2 Places / POI Provider

可开始评估 Provider 是否能提供：

- 稳定实体 ID；
- 原始 categories；
- 坐标；
- 名称 / 多语言；
- 官方 / 运营字段；
- 可用于 TravelAssist Category Mapping 的信息。

Provider 不需要原生使用本文 taxonomy，只需要可以可靠映射。

## 18.2 WBS 7.4 POI Schema

应把本文：

- primary；
- secondary；
- raw provider categories；
- experience tags；
- operational traits；
- provenance / confidence；
- taxonomy version；

转成正式数据模型。

## 18.3 WBS 5.14 / 7.9

后续实现：

```text
User Preference
× POI Affinity
× Route / Time / Companion / Budget
→ Recommendation
```

1.10 不冻结权重。

---

# 19. WBS 1.10 Freeze Checklist

- [x] POI Taxonomy 与 Preference 分离。
- [x] Provider Raw Category 不直接展示。
- [x] 顶层分类冻结为 9 + fallback。
- [x] Secondary Category v1 建立。
- [x] 摄影明确为 Experience / Preference，而非 Primary Category。
- [x] Experience Tag 与 Operational Tag 分层。
- [x] 动态事实禁止静态化。
- [x] Map Pin 默认低噪声。
- [x] Quick Card / Detail / Timeline / Recommendation / Trip Detail 显示数量冻结。
- [x] 标签优先级 / 去重 / 冲突 / fallback 冻结。
- [x] Localization / Accessibility 规则冻结。
- [x] 5.8 Preference 映射边界冻结。
- [x] 7.2 / 7.4 handoff 明确。
- [x] 跨地区示例覆盖自然、遗产、博物馆、观景、亲子娱乐、市场、人文街区、活动、节庆。

---

# 20. 当前不需要继续决定的事项

以下不阻塞 1.10：

- 真实 Provider 选择；
- Provider category 的最终逐项 Mapping；
- Recommendation 权重；
- Preference Schema 数值；
- 实时拥挤 / 营业 / 天气数据源；
- Booking Provider；
- POI 数据库存储方式。

它们属于后续 WBS。

---

# 21. 待后续技术任务确认的扩展点

这些不是 1.10 blocker，但 7.2 / 7.4 实装时需要最终确认：

1. 一个实体是否允许多个 Secondary Category 持久化，还是一个 Primary Secondary + aliases；
2. Experience Tag 的人工策划与自动派生比例；
3. Provider Mapping 表的具体代码 / 数据文件位置；
4. taxonomy version 的迁移工具；
5. 置信度阈值具体数值；
6. Event 与 Activity 是否采用同一 POI API Endpoint。

无论最终技术实现如何，不能破坏本文冻结的产品语义边界。
