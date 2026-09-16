# TravelAssist Trip Engine / POI / AI / Provider 综合设计书 v0.2

> 日期：2026-09-09  
> 状态：Design Candidate / 待审查  
> 来源：本次完整对话整理  
> 适用范围：日本首发版本的 Trip Engine、Travel Region Graph、POI Master、AI Compact Context、Route / Weather / Hotel / Restaurant Provider 边界、OpenAI 成本控制、Premium Savings  
> 关联既有设计：`docs/architecture/travelassist-engine-contract.md`、`docs/architecture/trip-plan-contract.md`、`docs/architecture/route-contract.md`  
> 本文件不替代既有 ChangeSet / Trip Contract / Route Contract，而是补充“候选方案怎么计算、POI 如何组织、什么数据进入 AI、如何控制成本”。

---

# 1. 核心结论

TravelAssist 不应让 AI 从 15,000+ 景点和第三方 API 原始 JSON 中自由生成行程。

标准结构：

```text
POI / Region / Route / Weather / Hotel / Restaurant / Trip DB
                           ↓
                    TravelAssist Engine
                           ↓
          筛选 + 评分 + 图搜索 + 规则计算 + 压缩
                           ↓
                  Compact Decision Context
                           ↓
                         OpenAI
                           ↓
                 软偏好选择 / 高阶权衡
                           ↓
                    Engine 再验证
                           ↓
                     Trip Proposal
                           ↓
             既有 Engine ChangeSet 边界
                           ↓
                     Trip Plan
```

核心原则：

> **Engine 负责“算对、筛掉不合法、控制成本”，AI 负责“选得像这个用户并解释”。**

---

# 2. Engine 与 AI 的职责

## 2.1 Engine 负责

- 用户偏好向量化
- 地区 / 城市 / 街区筛选
- 营业时间与最后入场判断
- 日期 / 季节 / 年龄 / 预约等硬约束
- 距离、交通时间、费用、换乘、步行
- 酒店更换次数与预算
- POI 用户匹配评分
- 区域聚类
- Macro Route / Travel Corridor 搜索
- Route Feasibility
- Daily Top-N
- 天气影响
- 性价比与时间价值
- 总旅行成本
- Premium Savings
- AI Context 压缩
- AI 输出再次验证

## 2.2 AI 负责

- 自然语言意图理解
- “边走边停”“小众”“第一次日本”等旅行风格识别
- 多个合法方案中的软偏好选择
- 复杂偏好权衡
- 非标准需求判断
- 高阶重规划建议
- 用户可读解释
- 翻译与自然语言沟通

---

# 3. 与 WBS 4.20 Engine Contract 的关系

现有 Engine Contract 主要处理：

```text
AI / Planner Proposal
↓
ChangeSet
↓
validate
↓
preview
↓
apply / rollback
```

本设计负责：

```text
用户需求
↓
候选 Region / Corridor / POI
↓
Decision Engine
↓
AI Soft Choice
↓
Trip Proposal
```

完整链路：

```text
Decision Engine
↓
AI Orchestrator
↓
Proposal
↓
ChangeSet
↓
WBS 4.20 Engine Contract
↓
Canonical Trip Plan
```

任何 AI / Decision Engine 都不得绕过 ChangeSet / revision / permission 边界直接写 Trip。

---

# 4. 三级旅行结构

## Level 1 — Travel Region / Macro Route

先决定：**这趟旅行应该经过哪些区域？**

日本首版建议建立约 300–500 个 Travel Region，例如：

```text
东京 / 箱根 / 河口湖 / 热海 / 伊豆 / 松本 / 上高地
高山 / 白川乡 / 金泽 / 富山 / 福井 / 琵琶湖
京都 / 奈良 / 大阪 / 神户 ...
```

Region 是“值得作为连续旅行节点”的区域，不是具体 POI。

## Level 2 — District / Stay Cluster

决定：**到这个 Region 后住哪里、每天活动在哪一片？**

东京示例：

```text
浅草 / 上野
东京站 / 银座
涩谷 / 原宿
新宿
六本木 / 麻布
台场
吉祥寺
```

大阪示例：

```text
梅田
难波 / 道顿堀
心斋桥
天王寺
大阪城
湾区 / USJ
```

## Level 3 — POI / Daily Planning

最后才处理具体景点。15,000 个 POI 永远不整库直接交给 AI。

---

# 5. Travel Region Graph

## 5.1 Region Node

建议字段：

```text
region_id
region_type
prefecture_id
parent_region_id
lat / lng

scenery / hidden / food / history / shopping / onsen / family / night / nature
recommended_stay_min
recommended_stay_max
gateway_refs
seasonality
```

主观评分统一 0–9。

## 5.2 Travel Edge

Travel Edge 表示：**两个 Region 是否适合作为连续旅行节点。**

东京可能存在：

```text
东京 → 河口湖
东京 → 箱根 / 御殿场
东京 → 热海 / 伊豆
东京 → 松本
东京 → 名古屋
东京 → 金泽
东京 → 大阪
```

但 `东京 → 白川乡` 一般不作为普通强边，而应通过：

```text
东京 → 松本 → 高山 → 白川乡
```

或：

```text
东京 → 金泽 → 白川乡
```

形成合理旅行逻辑。

## 5.3 Edge 数量

不要全连接。

```text
每个 Region 8–20 条合理方向边
300–500 Region
≈ 3,000–10,000 条 Travel Edge
```

## 5.4 Travel Edge 属性

```text
from / to
base_travel_time
base_cost
transfers
walk
frequency

detour_score
scenic_transition
slow_travel_fit
trip_compatibility
luggage_difficulty
reliability
season_penalty
recommended_stay_after_arrival
source
last_updated
```

`Travel Edge ≠ Live Route`。真实班次、当日费用、异常由 Route Provider 运行时确认。

---

# 6. Macro Route / Travel Corridor

用户例：

```text
东京进 / 东京出
2大人
10天
边走边停
偏好小众
偏好风景
必须去大阪
```

Engine 先结构化，再从 Region Graph 生成候选：

```text
A 东京 → 箱根 → 京都 → 大阪 → 东京
B 东京 → 松本 → 高山 → 白川乡 → 金泽 → 大阪 → 东京
C 东京 → 河口湖 → 滋贺 → 京都 → 大阪 → 东京
```

Engine 只把 Top 3–5 合法 Corridor 给 AI 进行软偏好选择。

---

# 7. Corridor Score / Detour / Stop Value

初始 Corridor Score：

```text
用户偏好匹配      30%
风景质量          20%
小众价值          15%
顺路程度          15%
交通便利          10%
天数适配          10%

- DetourPenalty
- HotelChangePenalty
- TransportRiskPenalty
```

不同 Trip Style 使用不同配置，不写死。

初始 Detour Budget 参考：

```text
高效率旅行     +10%
普通旅行       +25%
边走边停       +50%
深度漫游       +80%
```

需要真实样本校准。

Stop Value 概念：

```text
StopValue =
PreferenceMatch
× UniqueValue
× ScenicValue
× StayQuality
÷ DetourCost
```

Macro Route 搜索推荐：

```text
Beam Search + Pareto Pruning
```

可辅以 A*、Yen's K-shortest paths、Dynamic Programming。

---

# 8. Master Code 编号体系

> Master Code 为可读业务码；数据库内部主键仍推荐 UUID / bigint。

## 8.1 Region / Area

```text
00000        Unknown / Reserved
00001–00099  都道府县
00100–00999  城市 / 大区域
01000–01999  街区 / 游览区
02000–02999  住宿区域
03000–03999  温泉 / 度假区域
04000–04999  Travel Gateway
05000–09999  Reserved
```

## 8.2 POI

```text
10000–19999  城市景观 / 地标
20000–29999  人文 / 历史
30000–39999  自然 / 山 / 海 / 湖
40000–49999  活动 / 娱乐 / 体验
50000–59999  博物馆 / 艺术 / 文化设施
60000–69999  寺社 / 城堡 / 历史遗迹
70000–79999  购物 / 市场 / 商店街
```

## 8.3 Transport

```text
80000–89999
车站 / 机场 / 港口 / 巴士总站 / 缆车站 / 渡轮节点
```

## 8.4 Reserved

```text
90000–99999 未来扩展
```

编号原则：

```text
ID            = 它是谁
Feature       = 它有什么特征
Relationship  = 它与谁相连
Engine Score  = 它对本次旅行有多适合
```

---

# 9. POIFeatureV1 — 43 维核心 Feature

统一评分：

```text
0 = 完全没有 / 完全不适合
1 = 极低
2 = 很低
3 = 较低
4 = 略低
5 = 中等
6 = 略高
7 = 较高
8 = 很高
9 = 顶级
unknown = null
```

0 不得表示 unknown。

## A. 景点核心价值

```text
01 scenery          风景
02 history          历史
03 architecture     建筑
04 photo            摄影
05 food             美食
06 shopping         购物
07 nature           自然
08 night            夜间体验
09 onsen            温泉
10 art              艺术
11 entertainment    娱乐 / 活动
```

## B. 地方特色

```text
12 local            当地特色
13 unique           独特性
14 hidden           小众程度
15 iconic           代表性 / 必去程度
```

## C. 人群适配

```text
16 family           家庭
17 senior           老人
18 couple           情侣
19 solo             独行
```

## D. 旅行风格

```text
20 relax            放松
21 adventure        探索 / 冒险
22 educational      学习 / 教育
23 interactive      互动 / 参与
24 rest             恢复体力 / 休息价值
```

## E. 体力与拥挤

```text
25 walking          步行负担
26 physical         体力负担
27 crowd            拥挤程度
28 queue            排队风险
```

## F. 无障碍适配

```text
29 wheelchair       轮椅适配
30 stroller         婴儿车适配
```

如官方有明确无障碍事实，应优先保存 Facts，0–9 只作综合摘要。

## G. 时段适配

```text
31 morning          上午适配
32 daytime          白天适配
33 sunrise          日出价值
34 sunset           日落价值
```

`night` 已在 08。`sunset=9` 表示非常适合日落体验；实际日落时间由日期 + 经纬度动态计算。

## H. 天气适配

```text
35 rain             雨天适配
36 heat             炎热天气适配
37 cold             寒冷天气适配
38 snow             雪天 / 雪景价值
39 weather_sensitive 天气敏感度
```

## I. 季节适配

```text
40 spring           春
41 summer           夏
42 autumn           秋
43 winter           冬
```

---

# 10. Facts：不用 0–9 的真实数据

能够保存真实值的数据，不应改成主观评分：

```text
master_code
name_ja / name_zh_cn / name_en
primary_type / subtype
prefecture_id / city_id / district_id / region_id
latitude / longitude
official_url

opening_time
closing_time
last_entry_time
closed_days

stay_min_minutes
stay_max_minutes
adult_price_jpy
child_price_jpy
is_free
reservation_required

nearest_station_id
station_walk_min
nearest_bus_stop_id
bus_walk_min
indoor_ratio 0–100
```

---

# 11. POI 数据生产

15,000 POI 不人工逐条判断。

```text
原始 POI / 官方 Facts
↓
确定性字段清洗
↓
AI 批量 POIFeatureV1 打标
↓
规则一致性检查
↓
低置信度二次 AI Review
↓
人工只审核异常 / 核心 POI
```

目标：

```text
90%+ 自动通过
5–10% 二次 AI 审核
少量人工最终审核
```

每条 Feature 保存：

```text
feature_source
feature_confidence
model_version
review_status
updated_at
```

review_status：

```text
auto_approved
second_review
human_review
verified
rejected
```

一致性检查示例：

```text
纯户外高山景点 + rain=9       → 可疑
大型主题乐园 + crowd=0         → 可疑
全国著名地标 + iconic=1        → 可疑
高强度登山 + physical=1        → 可疑
普通地方小设施 + iconic=9      → 可疑
```

---

# 12. POIProfile5 — 5 位派生摘要

完整 43 维永久保留。在线 AI 通常只看派生摘要：

```text
ABCDE
```

建议：

```text
A = 景观视觉
B = 人文文化
C = 体验消费
D = 舒适易游
E = 当前适配
```

例如：`86478` 表示景观很强、人文较强、体验一般、较易游、当前适配高。

`POIProfile5` 必须可从 POIFeatureV1 重新计算；权重放 Engine Config，不写死在主数据。

---

# 13. 动态分数：性价比不写死

性价比不是 POI 静态属性。不同用户、不同路线、不同时间结果不同。

Engine 动态计算：

```text
matchScore             0–99
experienceValue        0–99
moneyValue             0–99
timeValue              0–99
overallValue           0–99
routeFit               0–99
dayFit                 0–99
weatherFit             0–99
seasonFit              0–99
detourValue            0–99
stopValue              0–99
currentSuitability     0–99
```

ValueForMoney 概念：

```text
用户匹配价值
+ 独特性
+ 景观 / 体验价值
+ 时间利用效率
+ 顺路程度
- 门票成本
- 交通成本
- 排队成本
- 体力成本
- 绕路成本
```

---

# 14. Master ID → AI Local ID

不要把 15,000 Master ID 字典塞给 AI。

数据库：`10001 = 东京塔`。

本次调用：

```text
Local 0 → Master 10001
Local 1 → Master 10157
Local 2 → Master 20684
```

AI 只处理 0 / 1 / 2；返回后 Engine 再映射到 Master ID / 名称。

---

# 15. AI Compact POI Tuple

推荐基础格式：

```text
[id,type,feature5,match,stay]
```

例如：

```text
[3,2,86478,94,18]
```

含义：

```text
3      Local POI ID
2      typeCode
86478  POIProfile5
94     matchScore
18     DUR5 = 90分钟
```

特定任务继续裁剪，例如风景 + 小众 + 少走路：

```text
[id,match,stay,scenery,hidden,walking,crowd]
```

原则：只传本次决策实际需要的字段。

---

# 16. 时间编码

## TIME15 — 营业 / 最后入场

```text
1 unit = 15min
code = minuteOfDay / 15
```

示例：

```text
07:30 = 30
08:00 = 32
09:00 = 36
17:00 = 68
18:00 = 72
```

`09:00–17:00 → [36,68]`。如原始时间不是 15 分钟倍数，不错误四舍五入，Master 保留 exact-minute。

## DUR5 — 推荐停留

```text
1 unit = 5min
30min = 6
45min = 9
60min = 12
90min = 18
120min = 24
```

## TIME1 — 实际交通

铁路、公交、航班、船、固定预约班次保持分钟级精度。Canonical Route Fact 不得因 AI 压缩而改变。

---

# 17. POI 筛选流水线

东京 + 大阪示例：

```text
15000 POI
↓
地区筛选 ≈ 2000
↓
营业 / 日期 / 季节 / 年龄硬筛选 ≈ 1500
↓
用户偏好匹配 ≈ 300–500
↓
Region / District 聚类 ≈ 100–200
↓
Route Feasibility ≈ 40–80
↓
每天 Top-N ≈ 10–20
↓
AI
```

AI 不负责第一轮淘汰。

---

# 18. Hidden Gem

小众不等于“越没人去越好”。

```text
HiddenGem =
质量
+ 独特性
+ 当地特色
+ 景观
+ 相对低拥挤
+ 可达性
+ 用户匹配
- 过度商业化
- 过度曝光
```

第一次日本旅行可保留一定经典锚点，例如 20–40% 经典 + 60–80% 个性 / 小众，最终比例由 Trip Style 决定。

---

# 19. AI 输入压缩与 Model Router

节省优先顺序：

1. 不发送无关数据
2. Engine 先筛 Top-N
3. 只发送当前相关日期
4. 不重复静态信息
5. Local ID
6. 数字枚举
7. 数组 Tuple
8. Structured Output
9. Prompt Caching
10. Model Router

目标：

```text
AI Input Token ≈ 原始 Raw JSON 方案的 10%–30%
```

AI 分两层：

```text
Decision AI
→ 数字 / ID / Score / Route / Constraint
→ 输出 selectedIds / order / backup / reasonCode

Explanation AI
→ 只拿最终少量实体
→ 输出用户可读自然语言
```

模型分流：

```text
低成本模型：分类 / 提取 / POI批量打标 / 小修改 / 简单选择
中档模型：完整行程 / 多目标权衡 / 跨日调整
高档模型：超复杂长行程 / 异常恢复 / 多约束失败处理
```

OpenAI 型号与 API 价格是动态商业配置，不写死到领域 Schema。价格变化由独立监控维护。

---

# 20. Route Provider 结论

本次调研结论：

- **Google**：当前不作为日本 Transit 核心 Provider。
- **Mapbox**：继续用于地图、步行、驾车、Geometry；不承担日本 Transit。
- **日本 Transit 候选**：駅すぱあと、Jorudan、NAVITIME。
- **ODPT + GTFS**：作为长期自建路线方向。

开发期决定：

```text
日本 Transit 开发 Provider = 駅すぱあと Provisional / Evaluation
```

生产 Provider 仍待确认：价格、调用规模、Web / iOS / Android、Mapbox 混合展示、保存 / 再展示、缓存期限、attribution、时刻表与巴士范围。

标准数据流：

```text
Provider Raw Response
↓
Provider Adapter
↓
Canonical Route Contract
↓
Engine
```

AI 不接触 Provider Raw JSON。

---

# 21. ODPT + GTFS / OpenTripPlanner 长期方案

长期可考虑：

```text
ODPT / GTFS / GTFS-RT
↓
OpenTripPlanner / 自建 Transit Graph
↓
TravelAssist Transit Engine
```

战略：

```text
短期：駅すぱあと快速开发
中期：东京等区域做 ODPT + OTP PoC
长期：自建 Transit + 商业 Provider fallback
```

优势是高调用量后边际成本低；难点是全国数据覆盖、License、多运营商站点对齐、Fare、时刻表、实时数据运维。

---

# 22. Weather / Hotel / Restaurant

## Weather

Provider Raw JSON 不给 AI。Engine 压缩成：

```text
[day,weather,tempHigh,tempLow,rainProbability]
```

再结合 `rain / heat / cold / snow / weather_sensitive` 算 `weatherFit`。

## Hotel

酒店不建立与 POI 同级的全量静态 Feature Library。核心变量高度动态：价格、库存、房型、取消政策。

```text
Trip Context
↓
Hotel API
↓
Engine：价格 / 地点 / 交通 / 房型 / 取消政策 / 预算
↓
Top-N
↓
AI解释 / 排序
```

稳定信息可缓存，实时价格和库存运行时确认。

## Restaurant

餐厅建议：

```text
Restaurant Master + 实时 Reservation / Availability API
```

Restaurant Master 可保存地区、料理、价格级别、午晚餐、当地特色、情侣/家庭/独食、预约难度、排队风险等。Engine 根据当天路线和时间窗筛 Top-N，再查实时空位。

---

# 23. Premium Savings Engine

Premium 不只卖“更多 AI 次数”，而是：

```text
省钱 + 省时间 + 降风险
```

可实现：

- 酒店降价监控
- 航班价格监控
- 免费取消期限
- 重新预订净节省
- 交通 Pass 优化
- 汇率
- 总旅行成本优化
- 天气异常
- 交通异常
- 航班异常
- 自动重规划建议

第一阶段只做“发现 → Engine 计算 → AI解释 → 用户确认”，不默认自动取消 / 自动重新购买。

---

# 24. 其他 API 分层

建议：

```text
Map / Drive / Walk       Mapbox
Transit                  駅すぱあと（开发期）
AI                       OpenAI
Weather                  Weather Provider
Hotel                    Booking / 住宿 Provider
Membership Payment       Stripe / App Store / Google Play

后续：
Flight status / price
FX
活动 / 租车
灾害 / 运行异常
```

原则：**外部 API 提供事实，Engine 计算意义，AI 输出判断与解释。**

---

# 25. POI 数据库交给独立账号生产

另一个 ChatGPT / Codex 账号适合负责：

```text
15,000 POI Master Feature Library
```

但先生产完整：

```text
Facts + POIFeatureV1 + confidence + reviewStatus
```

不要直接只产 `POIProfile5`。

Engine 后续自行生成：

```text
POIProfile5
matchScore
Local ID
AI Compact Tuple
```

生产顺序：

```text
100 POI Pilot → 1,000 → 5,000 → 15,000
```

推荐 JSONL 分都道府县保存，并输出 low-confidence、conflict、coverage 等报告。

---

# 26. 建议冻结的 Codebook

后续实现前建议逐个冻结：

```text
1. POI-Type-Codebook
2. POIFeatureV1-Codebook
3. POIProfile5-Codebook
4. TIME15 / DUR5 / TIME1
5. TravelRegion-Type-Codebook
6. TravelEdge-Codebook
7. AI-Compact-Context-V1
8. TripStyle-Codebook
9. DetourBudget Profile
10. Dynamic Value Score Spec
```

---

# 27. 当前不应写死的参数

需要 Pilot / 实际数据校准：

- 43维属性的最终判分边界
- POIProfile5 权重
- matchScore 权重
- CorridorScore 权重
- Detour Budget
- StopValue 公式
- Hidden Gem 公式
- Region 最终节点数
- 每 Region Edge 数量
- Daily Top-N 数量
- 首次日本经典 / 小众比例
- TIME15 对真实营业时间的覆盖率
- AI Compact 每类任务所需字段
- OpenAI 模型成本阈值
- Transit 最终生产 Provider
- Hotel / Restaurant 正式 Provider

---

# 28. 推荐实现顺序

```text
Phase 1  Schema / Codebook
Phase 2  100 POI Pilot
Phase 3  东京→中部→北陆→关西 Region Graph Pilot
Phase 4  Compact Context（Local ID / Feature5 / Match / Time）
Phase 5  Decision AI / Explanation AI Router
Phase 6  Route / Weather / Hotel / Restaurant 动态 Provider
Phase 7  Premium Savings
```

Region Graph Pilot 应至少验证：

```text
东京 → 松本 → 高山 → 白川乡 → 金泽 → 大阪
东京 → 箱根 → 京都 → 大阪
```

是否能在不同用户偏好下得到合理排序。

---

# 29. 最终核心数据流

```text
用户自然语言
↓
Intent Normalizer
↓
Preference Vector
↓
Travel Region Graph
↓
Macro Corridor Search
↓
Top 3–5 Corridor
↓
AI Soft Choice
↓
Engine Validate
↓
District / Stay Cluster
↓
POI 15000
↓
Hard Filter
↓
Preference Score
↓
Route Feasibility
↓
Daily Top 10–20
↓
Local ID + Compact Tuple
↓
AI Decision
↓
Engine Revalidate
↓
Trip Proposal
↓
ChangeSet
↓
Canonical Trip Plan
↓
Explanation AI
↓
用户
```

---

# 30. 最终设计原则

1. AI 不当数据库。
2. AI 不背 15,000 个 POI 编号。
3. AI 不直接读取第三方 Raw JSON。
4. 能由代码确定的事实，不让 AI 猜。
5. 完整特征保存在数据库，AI 只看任务需要的压缩特征。
6. 价格、时间、天气、路线等动态事实由 Provider / Engine 计算。
7. 性价比是用户与行程相关的动态结果，不是静态 POI 属性。
8. Region Graph 决定“去哪一带”，POI Engine 决定“具体玩什么”。
9. Macro Route 不是最短路径，而是带偏好与绕路预算的多目标路线。
10. 最终修改 Trip 必须经过既有 Engine ChangeSet / validate / preview / apply 边界。

---

# 31. 一句话定义

> **TravelAssist Engine 的任务，是把日本几百个旅行区域、15,000+ POI、真实交通、天气、住宿、餐饮和成本，压缩成少量合法、可解释、与用户高度匹配的候选；AI 只在这些候选中完成高阶偏好选择和解释。**
