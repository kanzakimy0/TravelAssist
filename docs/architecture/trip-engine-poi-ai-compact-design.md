# TravelAssist Trip Engine / POI / AI Compact Context 设计书 v0.1

> 日期：2026-09-09  
> 状态：Design Candidate / 待审查  
> 范围：Trip Engine 算法层、Travel Region Graph、POI Master Feature、AI Compact Context、时间编码、Provider 数据归一化、成本控制  
> 不替代：`docs/architecture/travelassist-engine-contract.md`、Trip Plan Contract、Route Contract  
> 原则：Engine 负责“算对与筛选”，AI 负责“偏好判断、解释与少量高阶决策”。

---

## 1. 设计目标

TravelAssist 不应把 15,000+ POI、第三方 API 原始 JSON、完整路线、酒店、天气等直接发送给 AI。

目标架构：

```text
POI / Region / Route / Weather / Hotel / Restaurant / Trip DB
                           ↓
                    TravelAssist Engine
                           ↓
              规则计算 + 筛选 + 聚类 + 搜索
                           ↓
                    Compact Decision Context
                           ↓
                         OpenAI
                           ↓
                   选择 / 权衡 / 解释
                           ↓
                     Engine 再验证
                           ↓
                      Trip Plan
```

核心收益：

- 降低 token 与 OpenAI API 成本
- 提高规划稳定性与可解释性
- 防止 AI 猜测路线、价格、营业时间
- Provider 可替换
- 支持 15,000 → 50,000+ POI 扩展
- 为 Premium 实时监控与省钱功能提供统一计算层

---

## 2. 与现有 Engine Contract 的关系

仓库现有 WBS 4.20 Engine Contract 主要定义：

- ChangeSet
- validate / preview / apply / rollback 领域边界
- revision / idempotency
- Provider normalized facts
- 权限与安全边界
- AI proposal 不可直接写 Trip

本设计补充的是：

```text
“候选方案是怎么计算出来的”
“POI 怎么筛”
“宏观旅行线路怎么搜索”
“什么数据应该给 AI”
“如何把输入压缩”
```

因此两者职责：

```text
Algorithm / Decision Engine
        ↓
生成 Proposal / Candidate
        ↓
AI Orchestrator
        ↓
ChangeSet Proposal
        ↓
WBS 4.20 Engine Contract
validate / preview / apply
```

本设计不得绕过现有 Engine Contract 直接修改 Trip Plan。

---

# 3. Engine 核心职责

## 3.1 Engine 负责

确定性与可验证计算：

- 用户偏好向量化
- 地理范围筛选
- 营业时间判断
- 日期/季节判断
- 年龄/预约等硬约束
- 距离与交通时间
- 票价与预算
- 换乘次数
- 步行量
- 酒店更换次数
- 天气适配
- POI 匹配评分
- 区域聚类
- 旅行走廊搜索
- 路线可行性
- Daily Top-N
- 总旅行成本
- Premium Savings 计算
- AI Context 压缩
- AI 输出再验证

## 3.2 AI 负责

概率性与偏好判断：

- 自然语言意图理解
- “边走边停”“小众”“第一次日本”等旅行风格理解
- 多个合法候选中的偏好选择
- 复杂软约束权衡
- 用户解释
- 重新规划建议
- 非常规情况高级判断

原则：

> **Engine 负责算对，AI 负责选得像这个用户。**

---

# 4. Engine 三级旅行结构

## Level 1 — Travel Region / Macro Route

先回答：

> 这趟旅行应该经过哪里？

推荐日本建立约 300–500 个 Travel Region。

示例：

```text
东京
箱根
河口湖
热海
伊豆
松本
上高地
高山
白川乡
金泽
富山
福井
琵琶湖
京都
奈良
大阪
神户
...
```

Region 不是具体景点，而是“值得作为旅行停留节点”的区域。

## Level 2 — District / Stay Cluster

回答：

> 到这个城市后住哪里、每天在哪一片活动？

东京示例：

```text
浅草 / 上野
东京站 / 银座
涩谷 / 原宿
新宿
六本木 / 麻布
台场
吉祥寺
...
```

大阪示例：

```text
梅田
难波 / 道顿堀
心斋桥
天王寺
大阪城
湾区 / USJ
...
```

## Level 3 — POI / Daily Planning

最后才处理具体 POI：

```text
东京塔
浅草寺
Shibuya Sky
白须神社
大阪城
teamLab
...
```

15,000 个 POI 不直接进入 AI。

---

# 5. Travel Region Graph

## 5.1 Region Node

建议字段：

```text
region_id
region_type
prefecture_id
parent_region_id
lat
lng

scenery
hidden
food
history
shopping
onsen
family
night
nature

recommended_stay_min
recommended_stay_max

gateway_refs
seasonality
```

评分采用 0–9。

## 5.2 Travel Edge

Travel Edge 表示：

> 两个 Region 是否适合作为连续旅行节点。

不是简单“交通上是否能够到达”。

例如东京强/中强边可包含：

```text
东京 → 河口湖
东京 → 箱根 / 御殿场
东京 → 热海 / 伊豆
东京 → 松本
东京 → 名古屋
东京 → 金泽
东京 → 大阪
```

而：

```text
东京 → 白川乡
```

通常不作为普通强边，而应通过：

```text
东京 → 松本 → 高山 → 白川乡
```

或：

```text
东京 → 金泽 → 白川乡
```

形成旅行逻辑。

## 5.3 Edge 数量

不要做全连接图。

建议：

```text
每个 Region：8–20 条合理方向边
300–500 Region
≈ 3,000–10,000 条 Travel Edge
```

## 5.4 Travel Edge 属性

```text
from
to

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

注意：

```text
Travel Edge ≠ 实时交通路线
```

Travel Edge 是长期“旅行语义图”。真实班次和当日交通由 Route Provider / 駅すぱあと等运行时确认。

---

# 6. Macro Route / Travel Corridor Engine

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

Engine 先识别：

```text
trip_style = slow_moving / corridor
entry = Tokyo
exit = Tokyo
must_region = Osaka
days = 10
```

然后从 Region Graph 搜索候选走廊。

### Corridor A — 高效经典

```text
东京 → 箱根 → 京都 → 大阪 → 东京
```

### Corridor B — 山岳 / 北陆

```text
东京 → 松本 → 高山 → 白川乡 → 金泽 → 大阪 → 东京
```

### Corridor C — 富士 / 湖区

```text
东京 → 河口湖 → 滋贺 → 京都 → 大阪 → 东京
```

Engine 只把 Top 3–5 合法 Corridor 给 AI 比较。

---

# 7. Corridor 评分

推荐初始模型：

```text
CorridorScore =

用户偏好匹配      30%
+ 风景质量        20%
+ 小众价值        15%
+ 顺路程度        15%
+ 交通便利        10%
+ 天数适配        10%

- DetourPenalty
- HotelChangePenalty
- TransportRiskPenalty
```

权重必须配置化，不写死在 POI 数据。

---

# 8. Detour Budget

为了避免不合理的极端路线，需要设置相对最快合理路线的绕路预算。

建议初始档位：

```text
高效率       +10%
普通         +25%
边走边停     +50%
深度漫游     +80%
```

最终参数需要真实路线测试校准。

---

# 9. Stop Value

用于判断某个绕路节点是否“值得”。

```text
StopValue =
PreferenceMatch
× UniqueValue
× ScenicValue
× StayQuality
÷ DetourCost
```

例如风景 / 小众用户中，白川乡 StopValue 可高于名古屋，从而自然形成山岳 / 北陆线路。

---

# 10. Macro Route 搜索算法

不使用单一 Shortest Path。

推荐：

```text
Beam Search
+
Pareto Pruning
```

可搭配：

- A*
- Yen's K-shortest paths
- Dynamic Programming

Pareto 维度至少包括：

```text
时间
成本
风景
偏好
小众
酒店更换
移动负担
风险
```

---

# 11. POI Master Code

建议 Japan V1 使用五位 Master Code 作为可读稳定业务编码。

> 数据库物理主键仍建议 UUID / bigint。Master Code 不作为不可迁移的物理主键。

## 11.1 Region / Area

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

## 11.2 POI

```text
10000–19999  城市景观 / 地标
20000–29999  人文 / 历史
30000–39999  自然 / 山 / 海 / 湖
40000–49999  活动 / 娱乐 / 体验
50000–59999  博物馆 / 艺术 / 文化设施
60000–69999  寺社 / 城堡 / 历史遗迹
70000–79999  购物 / 市场 / 商店街
```

## 11.3 Transport

```text
80000–89999
车站 / 机场 / 港口 / 巴士总站 / 缆车站 / 渡轮节点
```

## 11.4 Reserved

```text
90000–99999
未来扩展
```

---

# 12. ID 的设计原则

ID 只回答：

> 它是什么实体 / 主类型。

不要通过 ID 表达摄影、情侣、小众、雨天、风景、历史等多维属性。

```text
ID            = 它是谁
Feature       = 它有什么属性
Relationship  = 它与谁相连
Engine Score  = 它对本次用户有多合适
```

---

# 13. POIFeatureV1

## 13.1 评分尺度

采用 0–9：

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

严禁用 0 表示 unknown。

## 13.2 完整 29 维 Feature

```text
scenery        0-9
history        0-9
architecture   0-9
photo          0-9
food           0-9
shopping       0-9
nature         0-9
night          0-9
onsen          0-9
art            0-9
entertainment  0-9

local          0-9
unique         0-9
hidden         0-9
iconic         0-9

family         0-9
senior         0-9
couple         0-9
solo           0-9

walking        0-9
physical       0-9
crowd          0-9
queue          0-9

rain           0-9
spring         0-9
summer         0-9
autumn         0-9
winter         0-9
```

完整 Feature 永久保留，不因 AI Context 压缩而丢弃。

---

# 14. POI 确定性字段

以下不应让 AI 猜：

```text
master_code
name_ja
name_zh_cn
name_en
primary_type
subtype
prefecture_id
city_id
district_id
region_id
latitude
longitude
official_url
opening_hours
last_entry
closed_days
adult_price_jpy
child_price_jpy
is_free
reservation_required
```

推荐停留时间可由 AI 辅助初判，但必须记录来源和 confidence。

---

# 15. POI 数据生产方式

15,000 POI 不人工逐条打标。

```text
原始 POI
↓
确定性数据清洗
↓
AI 批量 POIFeatureV1 enrichment
↓
规则一致性检查
↓
低置信度二次 AI Review
↓
人工只审核心/异常
```

目标：

```text
90%+ 自动通过
5–10% 二次审核
少量人工最终审核
```

建议保存：

```text
feature_source
feature_confidence
model_version
review_status
updated_at
```

---

# 16. POI 一致性检查

示例：

```text
纯户外高山景点 + rain=9       → 可疑
大型主题乐园 + crowd=0         → 可疑
全国著名地标 + iconic=1        → 可疑
高强度登山 + physical=1        → 可疑
普通地方小设施 + iconic=9      → 可疑
```

异常进入二次复核，不直接凭规则覆盖原值。

---

# 17. POIProfile5 — 5 位派生摘要码

完整 29 维用于 Engine 精算，给 AI 时不必全部发送。

Engine 生成：

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

每位 0–9。

例如：

```text
86478
```

含义：

```text
8 景观视觉
6 人文文化
4 体验消费
7 舒适易游
8 当前适配
```

POIProfile5 是派生值，必须能够从 POIFeatureV1 重新计算。权重在 Engine Config / Codebook 中管理，不写死在主数据。

---

# 18. 用户 Match Score

Engine 根据：

```text
User Preference Vector
× POIFeatureV1
× Trip Context
```

生成：

```text
matchScore = 0–99
```

AI 不需要重新从景点说明文字猜匹配度。

---

# 19. POI → AI Local ID

Master Code 不需要直接发送给 AI。

数据库：

```text
10001 = 东京塔
```

本次调用：

```text
Local 0 → Master 10001
```

AI 只看到 `0`，返回 Local ID 后 Engine 再映射回 Master ID。

---

# 20. AI Compact POI Tuple

推荐基础格式：

```text
[id,type,feature5,match,stay]
```

例如：

```json
[3,2,86478,94,18]
```

其中：

```text
3      Local POI ID
2      typeCode
86478  POIProfile5
94     matchScore
18     DUR5 = 90分钟
```

实际调用可根据任务继续裁剪，原则是：

> **只传本次决策实际需要的属性。**

---

# 21. 时间编码

不同业务使用不同精度。

## 21.1 营业时间 — TIME15

```text
1 unit = 15 min
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

因此：

```text
09:00–17:00 → [36,68]
```

## 21.2 推荐停留 — DUR5

```text
1 unit = 5 min
```

示例：

```text
30 min  = 6
45 min  = 9
60 min  = 12
90 min  = 18
120 min = 24
```

## 21.3 真实交通 — TIME1

铁路、公交、航班、船班、固定预约班次保持分钟级精度。

不能为了 AI 压缩改变事实。

## 21.4 时间例外

若营业/预约时间出现非 15 分钟倍数，不强制四舍五入：

```text
precision = exact_minute
```

Master 保留真实时间。

---

# 22. POI 筛选流水线

用户选择东京 + 大阪时示例：

```text
15000 POI
↓
地理筛选
≈ 2000
↓
营业 / 日期 / 季节 / 年龄硬筛选
≈ 1500
↓
用户偏好评分
≈ 300–500
↓
District / Region 聚类
≈ 100–200
↓
Route Feasibility
≈ 40–80
↓
每天 Top-N
≈ 10–20
↓
AI
```

AI 永远不直接处理 15,000 POI。

---

# 23. “小众”定义

小众不等于“越没人去越好”。

Hidden Gem 应综合：

```text
质量
独特性
当地特色
风景
相对低拥挤
可达性
用户匹配
- 过度商业化
- 过度曝光
```

首次日本用户可采用“经典锚点 + 个性 / 小众主体”的比例，但具体值应在 Pilot 后冻结。

---

# 24. Engine → AI 双层模型

## 24.1 Decision AI

输入：

```text
数字
Local ID
Score
Cost
Route
Constraint
```

输出：

```text
selected IDs
order
backup
reasonCode
```

不输出大段自然语言。

## 24.2 Explanation AI

只拿最终少量选中的实体：

```text
景点名称
特点
用户偏好
最终行程
```

负责用户可读解释。

---

# 25. Model Router

建议模型分流原则：

```text
便宜模型
→ 分类 / 提取 / POI 批量打标 / 小修改 / 简单选择

中档模型
→ 完整行程规划 / 多目标权衡 / 较复杂重规划

高档模型
→ 复杂跨城市 / 异常 / 多约束失败恢复
```

不要所有请求都使用最贵模型。

---

# 26. OpenAI 成本控制策略

架构目标：

```text
Provider raw payload 不进模型
只发送当前相关日期
只发送 Top-N
Local ID
数字枚举
Tuple
短结构
Prompt Cache
Structured Output
局部修改不重发全行程
```

目标：

```text
AI 输入 token = 原始数据方案的 10%–30%
```

API 定价属于动态商业信息，不作为设计常量写入 Engine；应由独立成本配置/监控维护。

---

# 27. Route Provider

当前开发期：

```text
公共交通 Evaluation Provider = 駅すぱあと
```

原则：

```text
Provider Raw Response
↓
Route Adapter
↓
Canonical Route Contract
↓
Engine
```

AI 不接触 Provider 私有 payload。

生产 Provider 仍受价格、缓存、保存/再展示、Mapbox 叠加、Web/iOS/Android 授权 Gate 约束。

---

# 28. Weather

Weather Provider 原始 JSON 不给 AI。

Engine 压缩为：

```text
[day,weather,tempHigh,tempLow,rainProbability]
```

天气影响由 Engine 先计算，再决定是否降低候选排名或触发 Premium 重规划。

---

# 29. 酒店推荐策略

酒店不建立与 POI 同等规模的全量人工 Feature Library。

原因：

```text
实时价格
库存
房型
取消政策
```

是主要变量。

流程：

```text
Trip Context
↓
住宿 API
↓
Engine
价格 / 地点 / 交通 / 取消政策 / 用户预算
↓
Top-N
↓
AI 排序 / 解释
```

可缓存相对稳定字段，但实际入住日期价格和库存必须实时确认。

---

# 30. 餐厅推荐策略

餐厅建议：

```text
Restaurant Master
+
实时 Reservation / Availability API
```

Restaurant Master 可保存：

```text
restaurantId
district
cuisine
priceLevel
lunch/dinner
localSpecialty
view
couple
family
solo
reservationDifficulty
queueRisk
```

运行时根据当天路线与餐饮时间窗先由 Engine Top-N，再用 Reservation API 检查空位，最后由 AI 解释。

---

# 31. Premium Savings Engine

Premium 不应只卖更多 AI 次数。

Engine 后续可统一负责：

```text
酒店降价监控
航班价格监控
免费取消期限
重新预订净节省
交通 Pass 优化
汇率
总旅行成本
天气 / 交通 / 航班异常
```

Engine 负责金额计算，AI负责解释与建议。

---

# 32. 建议核心模块

```text
Trip Decision Engine
│
├─ Intent Normalizer
├─ Preference Engine
├─ Travel Region Graph
├─ Macro Route / Corridor Engine
├─ Stay / District Engine
├─ POI Filter Engine
├─ POI Scoring Engine
├─ Route Feasibility Engine
├─ Daily Planner Engine
├─ Cost Engine
├─ Weather Impact Engine
├─ Savings Engine
├─ AI Context Compressor
└─ Model Router
```

这些是算法/决策职责，不表示必须全部做成独立微服务。

---

# 33. 最终运行流程

```text
用户自然语言
↓
Intent Normalizer
↓
结构化 Trip Request
↓
Travel Region Graph
↓
Macro Route / Corridor Search
↓
Top 3–5 合法 Corridor
↓
AI 做软偏好选择
↓
Engine 再验证
↓
Stay / District Engine
↓
按日确定活动区域
↓
POI Filter + Scoring
↓
Route Feasibility
↓
每天 Top 10–20
↓
AI Compact Decision
↓
Engine 再验证
↓
Trip Proposal
↓
ChangeSet Proposal
↓
WBS 4.20 validate / preview / apply 边界
↓
Canonical Trip Plan
↓
Explanation AI
↓
用户界面
```

---

# 34. 数据生产建议

POI 数据库建议由独立素材/数据账号批量生产：

```text
100 POI Pilot
↓
1000
↓
5000
↓
15000
```

必须同时交付：

```text
POIFeatureV1 Schema
Type Codebook
Region / District Mapping
Feature confidence
Conflict report
Coverage report
Generation version
可重复执行的 enrichment pipeline
```

不要只产出一次性 JSON。

---

# 35. 需要冻结的 Codebook

后续开发前建议正式冻结：

```text
1. POI-Type-Codebook
2. POIFeatureV1-Codebook
3. POIProfile5-Codebook
4. Time-Codebook (TIME15 / DUR5 / TIME1)
5. TravelRegion-Type-Codebook
6. TravelEdge-Codebook
7. AI-Compact-Context-V1
8. TripStyle / DetourBudget Profile
```

---

# 36. 仍待验证 / 不应现在写死

以下属于需要 Pilot / 数据实测后再冻结的参数：

- POIProfile5 的具体权重
- CorridorScore 权重
- Detour Budget 百分比
- Region 节点最终数量
- 每节点 Edge 数量
- Hidden Gem 公式
- 首次日本经典/小众比例
- Daily Top-N 数量
- AI 每次实际需要的 Compact 字段
- 0–9 属性评分分布是否偏斜
- TIME15 在真实营业数据中的覆盖率
- Restaurant Master 数据源
- Hotel Provider 最终生产合同
- Transit Provider 最终生产合同

---

# 37. 非目标

本设计不直接实现：

- 数据库 Migration
- Route Provider 正式采购
- Hotel / Restaurant 正式商务合同
- AI Prompt 最终文案
- ChangeSet apply runtime
- Planner UI
- POI 全量 15,000 数据
- Premium 后台任务调度

---

# 38. 最终原则

> **不要让 AI 从 15,000 个景点和大量原始 API 数据中“自由想行程”。**

应该：

```text
TravelAssist Engine
把日本的旅行世界
↓
压缩成少量合法候选
↓
AI 做偏好判断
↓
Engine 再验证
```

最终形成：

```text
精确数据
+
可解释规则
+
图搜索
+
动态 Provider Facts
+
紧凑 AI Context
+
模型分流
```

这将成为 TravelAssist 从“AI 旅行聊天工具”升级为“可计算、可维护、可扩展旅行规划系统”的核心基础。
