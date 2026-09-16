# TravelAssist Trip Planning / POI / AI / Provider 综合设计书 v0.3

> 日期：2026-09-10  
> 状态：Design Candidate / 待审查  
> 来源：v0.2 + 本次架构审查与 Token 优化讨论整理  
> 适用范围：日本首发版本的 Trip Planning Engine、Travel Region Graph、POI Master、AI Gateway / Compact Context、Route / Weather / Hotel / Restaurant Provider 边界、OpenAI 成本控制、Premium Savings  
> 关联既有设计：`docs/architecture/travelassist-engine-contract.md`、`docs/architecture/trip-plan-contract.md`、`docs/architecture/route-contract.md`  
> 本文件不替代既有 ChangeSet / Trip Contract / Route Contract，而是补充“候选方案怎么计算、POI 如何组织、什么数据进入 AI、如何控制成本”。

---

# 0. v0.3 相对 v0.2 的关键变化

1. 正式区分 `Trip Planning Engine` 与既有 WBS 4.20 `Trip Mutation Engine`，避免两个不同职责都叫 Engine。
2. 正式加入 `AI Gateway`：Context Builder、Input Adapter、Local ID Mapper、Prompt Builder、Model Router、Output Parser、Schema Validator、Output Adapter。
3. Region 图正式拆为 `RegionRelation`、`TravelEdge`、`Live Route Fact` 三层；TravelEdge 可包含多种典型交通 Variant。
4. `POIFeatureV1` 仍固定为完整 43 维，不删字段。
5. 43 维字段增加语义类别：`benefit / suitability / cost / risk`，禁止简单把 43 维直接做无方向点积。
6. 用户偏好 Compact 输入改为 **1–9 原值 + 5 省略**，不使用 `+1 / -1` 作为传输格式。
7. 增加 `ContextScope`、Sparse Preference、Pareto Pruning、Task Projection、Compact Patch、ReasonCode、Template Explanation、Progressive Context 等 Token 优化。
8. `TIME15 / DUR5` 可保留内部编码，但默认 AI Context 优先使用可直接理解的分钟数 / 时间，避免为了极少 Token 引入额外算术错误。
9. `Master Code` 编号体系 **本版不修改**。其生产与冻结由既有并行工作继续推进。
10. POI 自动审核比例改为 Pilot 目标，不作为永久架构常量。

---

# 1. 核心结论

TravelAssist 不应让 AI 从 15,000+ 景点和第三方 API 原始 JSON 中自由生成行程。

标准结构：

```text
POI / Region / Route / Weather / Hotel / Restaurant / Trip DB
                           ↓
                 Trip Planning Engine
                           ↓
          筛选 + 评分 + 图搜索 + 规则计算
                           ↓
                     Candidate Set
                           ↓
                       AI Gateway
                           ↓
                  Compact Decision Context
                           ↓
                         OpenAI
                           ↓
                 软偏好选择 / 高阶权衡
                           ↓
                Planning Engine Revalidate
                           ↓
                     Trip Proposal
                           ↓
                    ChangeSet Builder
                           ↓
             WBS 4.20 Trip Mutation Engine
                           ↓
             validate / preview / apply
                           ↓
                 Canonical Trip Plan
```

核心原则：

> **Planning Engine 负责“算对、筛掉不合法、控制候选与成本”；AI 负责“在少量合法候选中选得像这个用户”；Mutation Engine 负责“安全地修改 Trip”。**

---

# 2. 两个 Engine 的职责边界

## 2.1 Trip Planning Engine

负责“生成与优化候选方案”，包括：

- 用户偏好结构化 / 向量化
- 地区 / 城市 / 街区筛选
- Region Graph 搜索
- Macro Route / Travel Corridor 搜索
- POI Candidate Generation
- POI 用户匹配评分
- 区域聚类
- 营业时间与最后入场判断
- 日期 / 季节 / 年龄 / 预约等硬约束
- Route Feasibility
- 天气影响
- Daily Top-N
- Pareto Pruning
- 性价比与时间价值
- 酒店更换次数与预算
- 总旅行成本
- Premium Savings 计算
- AI Context 范围裁剪与压缩
- AI 输出再次验证
- 重规划候选生成

## 2.2 Trip Mutation Engine（既有 WBS 4.20）

负责“安全修改 Canonical Trip”，包括：

```text
ChangeSet
↓
validate
↓
preview
↓
permission / protection / revision
↓
apply / rollback
```

任何 Planning Engine、AI、Provider、Planner 都不得绕过 ChangeSet / revision / permission 边界直接写 Trip。

## 2.3 完整关系

```text
Trip Planning Engine
↓
AI Gateway
↓
Trip Proposal
↓
ChangeSet Builder
↓
Trip Mutation Engine
↓
Canonical Trip Plan
```

---

# 3. AI 的职责

AI 负责：

- 自然语言意图理解
- “边走边停”“小众”“第一次日本”等旅行风格识别
- 多个合法方案中的软偏好选择
- 复杂偏好权衡
- 非标准需求判断
- 高阶重规划建议
- 用户可读解释
- 翻译与自然语言沟通

AI 不负责：

- 读取 15,000+ POI 全库
- 读取第三方 Provider Raw JSON
- 自己猜营业时间 / 交通 / 价格 / 天气事实
- 绕过硬约束
- 直接写 Canonical Trip
- 直接决定权限 / revision / booking / payment 保护规则

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

## 5.2 RegionRelation

`RegionRelation` 表示稳定的空间 / 行政 / 旅游结构关系，不等于旅行交通边。

```text
contains
part_of
adjacent
overlaps
gateway_of
```

例如：

```text
京都府 contains 京都市
京都市 contains 东山
东山 contains 祇园
```

## 5.3 TravelEdge

TravelEdge 表示：**两个 Region 是否适合作为连续旅行节点。**

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

但 `东京 → 白川乡` 一般不作为普通强边，而可通过：

```text
东京 → 松本 → 高山 → 白川乡
```

或：

```text
东京 → 金泽 → 白川乡
```

形成合理旅行逻辑。

## 5.4 Edge 数量

不要全连接。

```text
每个 Region 8–20 条合理方向边（Pilot 参考，不冻结）
300–500 Region（Pilot 参考，不冻结）
≈ 3,000–10,000 条 Travel Edge
```

## 5.5 TravelEdge 属性

TravelEdge 保存规划先验，不保存当日班次真相：

```text
from / to

detour_score
scenic_transition
slow_travel_fit
trip_compatibility
luggage_difficulty
reliability_prior
season_penalty
recommended_stay_after_arrival
source
last_updated
```

## 5.6 TravelEdgeVariant

同一 Region Edge 可能有多种典型移动方式：

```text
TravelEdge
Tokyo → Osaka
│
├─ rail
├─ air
├─ bus
└─ car
```

典型 Variant 可保存：

```text
mode
typical_duration_min
typical_cost_band
typical_transfers
typical_walk_min
frequency_band
reliability_prior
```

这些值只用于 Macro Planning / Candidate Search，不可冒充当天真实 Route Fact。

## 5.7 Live Route Fact

真实班次、当日费用、异常、运营状态由 Route Provider 运行时确认：

```text
Provider Raw Response
↓
Provider Adapter
↓
Canonical Route Contract
↓
Trip Planning Engine
```

因此：

> `RegionRelation ≠ TravelEdge ≠ Live Route Fact`

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

Planning Engine 先结构化，再从 Region Graph 生成候选：

```text
A 东京 → 箱根 → 京都 → 大阪 → 东京
B 东京 → 松本 → 高山 → 白川乡 → 金泽 → 大阪 → 东京
C 东京 → 河口湖 → 滋贺 → 京都 → 大阪 → 东京
```

Engine 只把 Top 3–5 合法 Corridor 给 AI 进行软偏好选择。

---

# 7. Corridor Score / Detour / Stop Value

初始 Corridor Score 参考：

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

Macro Route 搜索候选：

```text
Beam Search + Pareto Pruning
```

可辅以 A*、Yen's K-shortest paths、Dynamic Programming。

算法选择属于实现候选，不作为 v0.3 Frozen Contract。

---

# 8. Master Code 编号体系

> **本节继承 v0.2，不在 v0.3 修改。Master Code 已有并行工作进行生产 / 冻结，本设计不得借架构重构重新编号。**

Master Code 为可读业务码；数据库内部主键仍推荐 UUID / bigint。

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

# 9. POIFeatureV1 — 固定 43 维核心 Feature

完整 43 维永久保留，不因 AI Token 优化删除 Master Feature。

POI Feature 评分：

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

`0` 不得表示 unknown。

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

## F. 无障碍

```text
29 wheelchair       轮椅适配
30 stroller         婴儿车适配
```

如官方有明确无障碍事实，应优先保存 Facts，0–9 只作综合摘要。

## G. 时段适配

```text
31 morning          上午
32 daytime          白天
33 sunrise          日出
34 sunset           日落
```

`night` 已在 08。实际日出 / 日落时间由日期 + 经纬度动态计算。

## H. 天气适配

```text
35 rain             雨天
36 heat             炎热天气
37 cold             寒冷天气
38 snow             雪天 / 雪景
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

# 10. Feature 语义方向

43 维不能统一理解为“越高越好”。Codebook 必须记录 Feature Kind，Scoring Engine 不得直接做无方向点积。

建议：

```text
benefit      = 越强越可能形成正向体验价值
suitability  = 对特定人群 / 时段 / 情况的适配度
cost         = 越高代表负担越大
risk         = 越高代表风险 / 不确定性越大
```

初始分类：

## benefit

```text
01 scenery
02 history
03 architecture
04 photo
05 food
06 shopping
07 nature
08 night
09 onsen
10 art
11 entertainment
12 local
13 unique
14 hidden
15 iconic
```

## suitability

```text
16 family
17 senior
18 couple
19 solo
20 relax
21 adventure
22 educational
23 interactive
24 rest
29 wheelchair
30 stroller
31 morning
32 daytime
33 sunrise
34 sunset
35 rain
36 heat
37 cold
38 snow
40 spring
41 summer
42 autumn
43 winter
```

## cost

```text
25 walking
26 physical
```

## risk

```text
27 crowd
28 queue
39 weather_sensitive
```

Feature Kind 属于 Codebook 语义，可在 Pilot 中校准，但必须在 Scoring 实现前冻结。

---

# 11. Sparse Preference 43 — 用户偏好 1–9，5 省略

用户偏好与 POI Master Feature 是不同数据对象。

AI / Engine 的用户偏好 Compact 传输建议使用：

```text
1–9 = 用户对该维度的有效偏好 / 需求 / 容忍目标
5   = 中性 / 默认，不传
```

因此不使用：

```text
+1 / -1 / +3 / -2
```

作为 AI 传输格式。

原因：

- 1–9 保留强度信息；
- 与 Feature Codebook 尺度一致，模型更容易理解；
- `5` 可直接视为默认值并省略；
- 不需要在 Prompt 中解释正负号的额外含义；
- Engine 内部仍可按需要把 `1–9` 归一化为权重，不要求 AI 做转换。

示例：

```text
用户：
摄影很喜欢
美食喜欢
自然喜欢
不想走太多
讨厌拥挤

Sparse Preference:
04:9
05:8
07:8
25:3
27:2
```

Compact 可写为：

```text
P=4:9,5:8,7:8,25:3,27:2
```

其中没有出现的 38 个维度视为 `5`。

## 11.1 benefit / suitability 的解释

例如：

```text
04 photo=9
```

表示用户非常重视摄影价值；POI 的 `photo` 越高通常越有利。

低于 5 可以表示明确不重视 / 不偏好该体验，由 Engine 决定是否作为负权、弱权或排除条件。

## 11.2 cost / risk 的解释

成本 / 风险字段不能简单和 POI 值相乘。

例如：

```text
25 walking=2
```

表示用户希望低步行负担 / 步行容忍度较低。

```text
27 crowd=2
```

表示用户希望低拥挤 / 对拥挤容忍度较低。

这里用户值较高表示容忍度更高，不代表“高拥挤本身更好”。

Scoring 应采用 Feature-specific penalty / tolerance function，而不是简单：

```text
UserPreference × POIFeature
```

## 11.3 强约束不能伪装成偏好

例如：

```text
必须轮椅可达
绝对不能爬楼梯
18:00 必须到酒店
已经预约 13:00 餐厅
```

应进入 Constraint / Facts / Locked Anchor，而不是仅用 1–9 偏好表达。

---

# 12. Facts：不用 0–9 的真实数据

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

# 13. POI 数据生产

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
人工审核异常 / 核心 POI
```

Pilot 可尝试：

```text
高比例自动通过
5–10% 二次 AI 审核
少量人工最终审核
```

但“90%+ 自动通过”等比例属于 Pilot 指标，不作为架构常量。

建议按重要度增加审核层级：

```text
Tier S  核心锚点 POI → 强复核
Tier A  高流量 / 高价值 POI → 双重验证
Tier B/C 长尾 POI → 自动验证 + 抽检
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

# 14. POIProfile5 — 5 维派生摘要

完整 43 维永久保留。在线 AI 可按任务使用派生摘要：

```text
A = 景观视觉
B = 人文文化
C = 体验消费
D = 舒适易游
E = 当前适配
```

例如：

```text
[8,6,4,7,8]
```

可对应旧展示形式：

```text
86478
```

但 AI 输入优先使用数组 / Tuple，避免前导零或把字符串误当数字的问题。

`POIProfile5` 必须可从 POIFeatureV1 重新计算；权重放 Engine Config，不写死在主数据。

---

# 15. 动态分数：性价比不写死

性价比不是 POI 静态属性。不同用户、路线、日期、天气结果不同。

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

Engine 内部保留 0–99 精度；普通 AI 决策可按需压缩为 0–9。只有分数接近、需要精细判别时才给 AI 0–99。

---

# 16. Master ID → AI Local ID

不要把 15,000 Master ID 字典塞给 AI。

数据库：

```text
10001 = 东京塔
10157 = ...
20684 = ...
```

本次调用：

```text
Local 0 → Master 10001
Local 1 → Master 10157
Local 2 → Master 20684
```

AI 只处理：

```text
0 / 1 / 2
```

返回后 AI Output Adapter 再映射到 Master ID / Domain ID。

Local ID 生命周期限定在单次 AI Context / Decision Run，不作为永久身份。

---

# 17. AI Gateway

AI Gateway 是 Planning Engine 与具体 LLM Provider 之间的唯一边界。

```text
Trip Planning Domain
        ↓
Context Builder
        ↓
Input Adapter
        ↓
Local ID Mapper
        ↓
Prompt Builder
        ↓
Model Router
        ↓
LLM Provider Adapter
        ↓
Output Parser
        ↓
Schema Validator
        ↓
Output Adapter
        ↓
Planning Engine Revalidate
```

## 17.1 Context Builder

负责决定：

> 本次 AI 到底需要看到什么？

不是“有什么数据就全部给 AI”。

## 17.2 Input Adapter

负责：

```text
Full Domain Object
↓
Task-specific Compact Context
```

## 17.3 Local ID Mapper

负责把长 Master / UUID 映射为本次短 ID。

## 17.4 Prompt Builder

Prompt 由稳定规则与动态数据分离：

```text
Stable:
- system rules
- codebooks
- reason codes
- output schema

Dynamic:
- current preference
- current trip scope
- candidates
- current weather / route summary
```

## 17.5 Model Router

低成本 / 中档 / 高档模型按任务复杂度选择，型号和价格不得写死在领域 Schema。

## 17.6 Output Parser

负责把 LLM 原始返回转为可验证结构，不负责业务合法性。

## 17.7 Schema Validator

所有 AI 输出必须先过版本化 Schema。

## 17.8 Output Adapter

负责：

```text
AI Local ID / Compact Operation
↓
Domain ID / Domain Proposal
```

AI 输出不得直接成为 Canonical Trip Plan。

---

# 18. AI Compact POI：Base + Task Projection

不要只有一种固定 POI Tuple。

## 18.1 Base

基础可用：

```text
[id,type,profile5,match,stayMin]
```

例如：

```text
[3,2,[8,6,4,7,8],9,90]
```

## 18.2 Task Projection

根据任务只传必要字段。

### 决定去不去

```text
[id,match,value,detour]
```

### 决定顺序

```text
[id,stayMin,area,open]
```

### 雨天替换

```text
[id,match,rain,indoor,detour]
```

### 老人同行

```text
[id,match,walk,physical,senior]
```

### 风景 + 小众 + 少走路

```text
[id,match,scenery,hidden,walking,crowd]
```

原则：

> **完整 43 维保存在 Master；AI 每次只看本次决策真正需要的投影。**

---

# 19. 时间编码

## 19.1 Master / Canonical

精确时间永远保留真实分钟 / Instant，不因 AI Compact 改变。

## 19.2 TIME15 / DUR5

`TIME15 / DUR5` 可作为内部缓存、索引或批处理编码：

```text
TIME15: 1 unit = 15min
DUR5:   1 unit = 5min
```

但默认 AI Context 不要求模型做额外换算。

例如推荐直接给：

```text
stay=90
open=[540,1020]
```

而不是：

```text
stay=18
open=[36,68]
```

如果某批量任务经过测试证明编码版稳定且显著节省 Token，再由 Task Projection 启用。

## 19.3 TIME1

铁路、公交、航班、船、固定预约班次保持分钟级精度。Canonical Route Fact 不得因 AI 压缩而改变。

---

# 20. POI 筛选流水线

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
Daily Top-N ≈ 10–20
↓
Pareto Pruning ≈ 5–10
↓
Task Projection
↓
AI
```

数字均为 Pilot 参考，不冻结。

AI 不负责第一轮淘汰。

---

# 21. Hidden Gem

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

第一次日本旅行可保留一定经典锚点，例如 20–40% 经典 + 60–80% 个性 / 小众；最终比例由 Trip Style 决定，Pilot 校准后再冻结。

---

# 22. Token 优化总原则

Token 优化顺序：

```text
范围裁剪
>
候选裁剪
>
字段裁剪
>
输出裁剪
>
格式微压缩
```

不应为了极少 Token 把格式压缩成难以稳定理解的编码。

目标参考：

```text
普通决策：Raw JSON 的约 5%–15%
复杂决策：Raw JSON 的约 10%–20%
```

实际值必须用真实调用做 Token / Cost / Quality Benchmark。

---

# 23. ContextScope — 最大 Token 节省点

每次 AI 请求必须有明确 Scope：

```text
trip
region
day
timeslot
item
event
```

例如用户说：

> 第 6 天下午想轻松一点。

不要发送 10 天完整 Trip。

只发送：

```text
TripCompactState
+
Day6 target scope
+
Day5 ending state
+
Day7 starting constraint
+
locked anchors
+
Day6 nearby candidates
```

默认采用最小满足原则：

> **需要一天，就不发十天；需要一个下午，就不发整天。**

---

# 24. TripCompactStateV1

为 AI Gateway 单独派生极简状态，不复制 Canonical Trip Schema。

示例：

```text
10d
Tokyo>Hakone>Kyoto>Osaka
P=4:9,5:8,7:8,25:3,27:2
party=2A
budget=M
style=slow
locked=d4r2,d7h1
```

它只用于 AI Context，不是持久化真相，也不是第二套 Trip Schema。

Canonical Trip Plan 仍是唯一持久化 / 交换权威结构。

---

# 25. Sparse Preference Token 规则

完整偏好可以有 43 维，但 AI 只传非中性项。

```text
5 = 默认 / 中性 → 省略
1–4 / 6–9       → 传原值
```

例如完整 43 维中只有 5 项有明显偏离：

```text
P=4:9,5:8,7:8,25:3,27:2
```

不再重复另外 38 个 `=5`。

如果稳定 Codebook 已在可缓存 Prompt 中定义，可直接使用字段编号 1–43，减少字段名重复。

---

# 26. Pareto Pruning — 不把被完全支配的候选给 AI

例如：

```text
A match=9 route=9 cost=3 walk=2
B match=7 route=7 cost=5 walk=4
```

如果 B 在关键维度上均不优于 A，且没有额外独特价值，则 B 不需要进入 AI Context。

```text
Top-N
↓
Pareto Dominance Filter
↓
Non-dominated Candidates
↓
AI
```

同样适用于：

- Macro Corridor
- POI Candidate
- Hotel Candidate
- Restaurant Candidate
- Route Alternative

---

# 27. 动态精度

Engine 内部可以保留：

```text
0–99
```

普通 AI 选择只需要：

```text
0–9
```

例如：

```text
match 93 → 9
routeFit 87 → 8
weatherFit 74 → 7
```

仅当候选非常接近、需要精细决策时，升级为 0–99。

```text
Engine Precision      0–99
AI Normal Precision   0–9
AI Fine Precision     0–99
```

---

# 28. Route Compact

完整 Route Contract 继续保存：

```text
alternatives
legs
segments
steps
operator
platform
geometry
fare
...
```

AI 默认只读决策摘要，例如：

```text
route=[durationMin,fareJPY,transfers,walkMin]
```

实例：

```text
r1=[32,580,0,6]
r2=[48,900,1,4]
```

除非任务需要，不发送 geometry、platform、完整 steps、Provider metadata。

---

# 29. Weather Compact

Provider Raw Weather 不给 AI。

Engine 可以先计算天气对行程的含义：

```text
heatRisk
rainRisk
outdoorFit
snowFit
weatherVolatility
```

AI Context 例如：

```text
WX=[heat8,rain7,outdoor3]
```

只有用户需要查看天气详情时，Presentation 层再使用完整 Weather Fact。

---

# 30. Decision AI 与 Explanation AI 分离

## Decision AI

只处理：

```text
ID
Score
Constraint Summary
Route Summary
ReasonCode
Compact Operation
```

推荐返回：

```text
selectedIds
order
backupIds
reasonCodes
operations
```

## Explanation AI

只拿最终少量实体，负责自然语言解释。

但 Explanation AI **默认不是必调**。

普通理由可以：

```text
ReasonCode
↓
UI Template
```

直接生成：

```text
✓ 符合您的风景偏好
✓ 顺路
✓ 相对小众
```

只有以下情况才调用 Explanation AI：

- 用户主动问“为什么”
- 行程总览需要高质量自然语言
- 特殊复杂权衡
- 对话式解释
- 翻译 / 沟通

---

# 31. ReasonCode

Decision AI 不自由输出长理由。

示例：

```text
R01 preference_match
R02 low_detour
R03 weather_fit
R04 hidden_value
R05 iconic_anchor
R06 low_fatigue
R07 route_continuity
R08 budget_fit
R09 time_fit
R10 accessibility_fit
```

返回：

```text
select=[3,7]
reason=[R01,R04,R07]
```

自然语言解释由 Template 或 Explanation AI 后置生成。

---

# 32. AI Output Contract — Patch 优先

AI 不返回完整 Trip。

推荐版本化输出：

```text
AiDecisionResponseV1
```

概念字段：

```text
version
decisionType
selectedIds
orderedIds
backupIds
reasonCodes
operations
needsMoreContext
```

例如 Day Patch：

```text
operations=[
  [DEL,3],
  [ADD,7,3],
  [MOVE,5,4]
]
```

流程：

```text
AI Compact Operation
↓
Schema Validator
↓
Local ID Resolver
↓
Output Adapter
↓
Domain Proposal
↓
Planning Engine Revalidate
↓
ChangeSet Builder
↓
Trip Mutation Engine
```

AI 不直接输出 / 覆盖 Canonical Trip Plan。

---

# 33. Omit Null / Omit Irrelevant

Canonical Contract 中 `null` 很重要，但 AI Compact Context 不复制 Canonical Wire Shape。

AI DTO 可规定：

```text
omitted = 本任务不可用 / 不相关
```

因此不发送大量：

```json
{
  "sunrise": null,
  "snow": null,
  "bus": null,
  "childPrice": null
}
```

AI DTO 与 Canonical Contract 必须明确分开。

---

# 34. Progressive Context Expansion

默认先给最小 Context。

例如调整 Day 5：

```text
TripCompact
+
Day5
+
Top8 candidates
```

只有确实需要更多信息时才扩展：

```text
needRouteDetail
needWeatherDetail
needHotelDetail
needAdjacentDay
```

由 AI Orchestrator / Gateway 控制最大扩展次数和预算，不能让模型无限自主加载数据。

---

# 35. Prompt Caching / 稳定 Codebook

适合稳定缓存：

```text
POIFeatureV1 Codebook
Feature Kind
ReasonCode
Output Schema
Planning Rules
Safety Rules
```

每次变化：

```text
Sparse Preference
TripCompactState
Candidates
Weather Summary
Route Summary
Current Constraint
```

原则：静态规则不要在每次调用中以不同文本反复发送。

---

# 36. 名称与语义按任务提供

纯数字多目标选择可以只用 Local ID：

```text
0:[9,8,2,9]
1:[8,4,1,9]
2:[7,9,4,6]
```

无需重复名称。

涉及：

- 用户点名景点
- 文化 / 语义理解
- 高阶非数值判断
- Explanation

再提供名称和最少语义文本。

---

# 37. Route Provider

标准数据流：

```text
Provider Raw Response
↓
Provider Adapter
↓
Canonical Route Contract
↓
Trip Planning Engine
```

AI 不接触 Provider Raw JSON。

当前开发期 Provider 决策沿用 v0.2：

```text
Map / Drive / Walk       Mapbox
Transit                  駅すぱあと（开发期 Provisional / Evaluation）
```

生产 Provider 仍需独立确认价格、授权、覆盖率、缓存、再展示和 attribution。

长期可考虑：

```text
ODPT / GTFS / GTFS-RT
↓
OpenTripPlanner / 自建 Transit Graph
↓
TravelAssist Transit Capability
```

---

# 38. Weather / Hotel / Restaurant

## Weather

Provider Raw JSON 不给 AI；Planning Engine 先转为 Weather Decision Summary。

## Hotel

酒店核心变量高度动态：

```text
价格
库存
房型
取消政策
地点
交通
预算
```

流程：

```text
Trip Context
↓
Hotel Provider
↓
Canonical / Normalized Hotel Fact
↓
Planning Engine Filter + Score
↓
Top-N / Pareto
↓
AI Soft Choice / Explanation
```

## Restaurant

建议：

```text
Restaurant Master + Reservation / Availability API
```

Planning Engine 根据当天路线和时间窗筛 Top-N，再查实时空位。

---

# 39. Premium Savings Engine

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

第一阶段只做：

```text
发现
↓
Engine 计算
↓
AI / Template 解释
↓
用户确认
```

不默认自动取消 / 自动重新购买。

---

# 40. POI 数据库生产顺序

建议：

```text
100 POI Pilot
↓
1,000
↓
5,000
↓
15,000
```

优先生产完整：

```text
Facts
+
POIFeatureV1
+
confidence
+
reviewStatus
```

不要直接只生产 POIProfile5。

Engine 后续自行生成：

```text
POIProfile5
matchScore
Local ID
Task Projection
AI Compact Tuple
```

推荐 JSONL 分都道府县保存，并输出：

```text
low-confidence
conflict
coverage
missing-facts
review-needed
```

报告。

---

# 41. 建议冻结的 Codebook / Contract

实现前建议逐个冻结：

```text
1. POI-Type-Codebook
2. POIFeatureV1-Codebook（43维）
3. Feature-Kind-Codebook
4. Sparse-Preference-43-Spec
5. POIProfile5-Codebook
6. TravelRegion-Type-Codebook
7. RegionRelation-Codebook
8. TravelEdge-Codebook
9. TravelEdgeVariant-Spec
10. AI-Compact-Context-V1
11. ContextScope-Codebook
12. AI-Decision-Response-V1
13. ReasonCode-V1
14. TripStyle-Codebook
15. DetourBudget Profile
16. Dynamic Value Score Spec
17. TIME15 / DUR5 / TIME1（内部编码用途）
```

Master Code 编号体系由其既有并行工作继续，不在本文件重新设计。

---

# 42. 当前不应写死的参数

需要 Pilot / 实际数据校准：

- 43维属性最终判分边界
- Feature Kind 中个别字段的最终分类
- Sparse Preference → Engine Weight 的转换函数
- cost / risk tolerance penalty 函数
- POIProfile5 权重
- matchScore 权重
- CorridorScore 权重
- Detour Budget
- StopValue 公式
- Hidden Gem 公式
- Region 最终节点数
- 每 Region Edge 数量
- Daily Top-N 数量
- Pareto Pruning 阈值
- 首次日本经典 / 小众比例
- AI Compact 每类任务所需字段
- AI Normal/Fine Precision 切换阈值
- Context Expansion 最大次数
- Token Budget
- OpenAI 模型成本阈值
- Transit 最终生产 Provider
- Hotel / Restaurant 正式 Provider

---

# 43. 推荐实现顺序

```text
Phase 1  Schema / Codebook
         - POIFeatureV1 43
         - Feature Kind
         - Sparse Preference 1–9 / omit 5
         - RegionRelation / TravelEdge

Phase 2  100 POI Pilot

Phase 3  东京→中部→北陆→关西 Region Graph Pilot

Phase 4  AI Gateway
         - ContextScope
         - Local ID
         - Task Projection
         - TripCompactState
         - Input / Output Adapter

Phase 5  Decision AI
         - AI Decision Response
         - ReasonCode
         - Patch Output
         - Pareto / Token Budget

Phase 6  Explanation Template / Explanation AI Router

Phase 7  Route / Weather / Hotel / Restaurant 动态 Provider

Phase 8  Premium Savings
```

Region Graph Pilot 至少验证：

```text
东京 → 松本 → 高山 → 白川乡 → 金泽 → 大阪
东京 → 箱根 → 京都 → 大阪
```

是否能在不同用户偏好下得到合理排序。

---

# 44. 最终核心数据流

```text
用户自然语言
↓
Intent Normalizer
↓
Sparse Preference 43（1–9；5省略）
+
Hard Constraint / Anchor
↓
Trip Planning Engine
↓
Travel Region Graph
↓
Macro Corridor Search
↓
Top Corridor + Pareto Pruning
↓
AI Gateway / Compact Context
↓
AI Soft Choice
↓
Planning Engine Revalidate
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
Daily Top-N
↓
Pareto Pruning
↓
Task Projection
↓
Local ID + Compact Tuple
↓
Decision AI
↓
AI Decision Response / Compact Patch
↓
Output Adapter
↓
Planning Engine Revalidate
↓
Trip Proposal
↓
ChangeSet Builder
↓
Trip Mutation Engine
↓
Canonical Trip Plan
↓
ReasonCode Template / Explanation AI（按需）
↓
用户
```

---

# 45. Token Budget 漏斗

目标结构：

```text
15,000 POI
        ↓
Region / Date / Hard Filter
        ↓
300–500 Preference Relevant
        ↓
50–80 Route Feasible
        ↓
10–20 Daily Top-N
        ↓
5–10 Pareto Candidate
        ↓
Task Projection
        ↓
Local ID + Sparse Tuple
        ↓
AI
        ↓
IDs + ReasonCodes + Compact Ops
        ↓
Output Adapter
        ↓
Engine Revalidate
```

真正主要节省 Token 的不是极端数字编码，而是：

```text
AI 少看
+
AI 少想
+
AI 少说
```

对应：

```text
Context Scope
+
Candidate Pruning
+
Compact Output
```

---

# 46. 最终设计原则

1. AI 不当数据库。
2. AI 不背 15,000 个 POI 编号。
3. AI 不直接读取第三方 Raw JSON。
4. 能由代码确定的事实，不让 AI 猜。
5. 完整 43 维特征保存在数据库，AI 只看任务需要的投影。
6. 用户偏好 Compact 使用 1–9 原值；5 为中性默认并省略。
7. cost / risk 字段不与 POI Feature 做无方向简单点积。
8. 价格、时间、天气、路线等动态事实由 Provider / Engine 计算。
9. 性价比是用户与行程相关的动态结果，不是静态 POI 属性。
10. Region Graph 决定“去哪一带”，POI Planning 决定“具体玩什么”。
11. RegionRelation、TravelEdge、Live Route Fact 分层。
12. Macro Route 不是最短路径，而是带偏好与绕路预算的多目标路线。
13. Planning Engine 负责生成候选；Mutation Engine 负责修改 Trip。
14. AI Gateway 是 Domain 与 LLM Provider 的唯一适配边界。
15. AI 输出优先使用版本化 Patch / Operation，而不是完整 Trip。
16. Explanation 默认模板化，复杂解释才调用 AI。
17. Token 优化优先做范围、候选、字段、输出裁剪，不优先做难以理解的极端编码。
18. 最终修改 Trip 必须经过既有 ChangeSet / validate / preview / apply 边界。
19. Master Code 编号体系保持既有并行设计，本版不重构。

---

# 47. 一句话定义

> **TravelAssist Trip Planning Engine 的任务，是把日本几百个旅行区域、15,000+ POI、真实交通、天气、住宿、餐饮和成本，先通过规则、图搜索、评分、约束和 Pareto 筛选压缩成极少量合法候选；AI Gateway 再用最小必要 Context 让 AI 完成高阶软偏好选择，最终经 Planning Revalidate、ChangeSet 与 Trip Mutation Engine 安全写入 Canonical Trip Plan。**
