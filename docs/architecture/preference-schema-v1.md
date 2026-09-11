# TravelAssist — WBS 5.11 Preference Schema 设计书

> 文档版本：v0.2 / Field & UI Freeze Candidate\
> 日期：2026-09-11\
> WBS：5.11 — Preference Schema\
> Owner：B / Personal Center\
> 依赖：1.25 已完成；8.1 已完成\
> 当前状态：**设计候选；5.11 实装 Task 尚未启动，Master WBS 暂不标记完成**\
> 后续：5.13 Preference Preset / Default、5.16 Preference Persistence API、5.14 Planner-readable Preference Contract

---

## 1. 本版结论

WBS 5.11 冻结的是**用户长期、明确、可跨旅行复用的旅行偏好事实**，不是把当前 Personal Center、Start Flow 或 Planner 的页面 state 原样写入数据库。

本轮在 v0.1 的 30-key 候选上继续逐项审查后，做出一个重要收敛：

```text
v0.1 候选：30 keys
       ↓ 去掉重复事实源
v0.2 候选：23 canonical keys
```

减少的原因不是删功能，而是避免同一件事存两次：

- 删除 6 个 `attractions.*` summary keys：自然 / 历史 / 人文 / 艺术 / 摄影 / 活动体验应由详细兴趣事实计算，不再与 16 个兴趣形成双事实源；
- 删除 `experience.photoExperience`：摄影目的已经由 `photography` 兴趣及其细分表达；
- `interests.likes` + `interests.dislikes` 合并为一个稀疏 `interests.preferences` map，冲突从结构上消失；
- 新增 `style.planning`：长期旅行画像已有“计划”维度，现有 Start Flow 六条滑轨没有独立表达它，5.11 必须补齐长期事实。

最终原则：

> **字段数不是目标；唯一事实源、明确语义、可覆盖、可演进才是目标。**

---

## 2. 数据分层

```text
User Long-term Preference
我长期喜欢什么 / 能接受什么
        │
        ├───────────────┐
        │               │
        ↓               ↓
Trip / Companion      Attraction / Route Facts
这次谁去、何时去       景点是什么、怎么走、负荷如何
        │               │
        └───────┬───────┘
                ↓
              Engine
     可行性 / 合理性 / 疲劳 / 推荐
```

### 2.1 进入 5.11 的内容

- 长期交通偏好与明确交通排除；
- 长期步行容忍度；
- 长期餐饮 / 住宿 / 消费倾向；
- 长期兴趣正负信号与兴趣细分；
- 长期旅行风格与计划性。

### 2.2 不进入 5.11 的内容

- 日期、目的地、行程长度；
- 本次同行人数、儿童年龄、老人状态；
- 航班、酒店、已预约活动；
- 本次旅行具体总预算金额；
- 景点 43 字段事实；
- Radar 坐标、页面摘要文案；
- Preset 名称；
- Engine 的 fatigue / reasonableness / duration-too-short 等结果；
- AI 未经用户确认推断出的隐式偏好。

---

## 3. 一用户一份 Preference Root

冻结数据库根：

```text
auth.users
   1
   │
   1
travel_preferences
```

```text
travel_preferences
├─ owner_user_id   uuid PK → auth.users.id ON DELETE CASCADE
├─ payload         jsonb NOT NULL
├─ revision        integer NOT NULL > 0
├─ created_at      timestamptz NOT NULL
└─ updated_at      timestamptz NOT NULL
```

选择“一用户一行 + 严格版本化 JSONB”的原因：

1. Preference 的主要读取模式是读取当前用户整份长期偏好；
2. 当前不存在跨用户按偏好筛选的产品需求；
3. 字段仍会演进，JSONB 避免每增加一个 optional preference 都新增数据库列；
4. 所有权、revision、RLS 继续由关系型结构保证；
5. JSONB 不是任意 JSON，必须由 runtime parser + DB CHECK 双重校验。

---

## 4. Sparse / Missing 语义

新用户 canonical payload：

```json
{
  "schemaVersion": "1.0",
  "values": {}
}
```

冻结：

```text
missing = 用户没有明确设置
```

对于存在 explicit neutral / false 的字段，必须继续区分：

```text
missing  ≠ neutral
missing  ≠ false
```

注意兴趣域是特殊的“稀疏正负信号模型”：

- InterestCode 在 `interests.preferences` 中不存在 = 没有明确兴趣信号；
- 值只允许 `like | dislike`；
- UI 中的“未选择 / 无特别偏好”不得误写成一个假的 `neutral` 值。

默认值、Preset 和 UI 初始占位不属于用户事实，除非用户明确触发保存。

---

## 5. Preset 不作为事实源

`轻松优先 / 平衡 / 效率优先` 等属于 WBS 5.13。

```text
用户点击 Preset
     ↓
5.13 将 Preset 展开为 Preference Patch
     ↓
5.11 只保存展开后的 canonical fields
```

因此：

- 不保存 `mobility.preset`；
- 不保存 `lastPreset = relaxed` 作为业务事实；
- 若未来需要分析“用户点击过哪个 Preset”，应进入 analytics / event log，不进入 Preference payload。

---

## 6. Canonical Payload v1.0

采用 flat dotted key，以便 sparse patch、精确 unset 与严格校验。

示例：

```json
{
  "schemaVersion": "1.0",
  "values": {
    "mobility.walkingTolerance": "low",
    "mobility.fewerTransfers": true,
    "dining.queueTolerance": "medium",
    "interests.preferences": {
      "nature_scenery": "like",
      "theme_parks": "dislike"
    },
    "style.pace": 2,
    "style.planning": 5
  }
}
```

---

## 7. v1.0 Canonical Registry — 23 keys

### 7.1 数量

```text
Mobility        5
Dining          3
Accommodation   3
Budget          3
Interests       2
Travel Style    7
-----------------
Total          23
```

### 7.2 Hard / Soft 的定义

5.11 不允许每个字段再额外保存一个用户自定义 `hard/soft` 标记；v1 使用**字段级静态语义**：

- `Hard when true`：启用后视为默认不可违反的长期排除，当前 Trip 可以显式覆盖；
- `Soft`：用于排序、惩罚、取舍，不因不能完全满足就阻塞方案；
- `Soft constraint input`：本身不是绝对禁止，但会进入可行性 / 疲劳 / 风险判断。

本版只有 3 个长期交通排除字段属于 Hard when true；其他字段均为 Soft 或 Soft constraint input。

---

## 8. 23 字段逐项冻结矩阵

> UI 层级：\
> **一级** = Preference Center 主界面，只做摘要 / Radar / 入口，不直接编辑字段。\
> **二级** = 高频快速设置。\
> **三级** = 低频详细设置、硬限制、完整 5 档或兴趣细化。

|   # | Canonical Key                        | Type / Value                                          | 强度                  | 一级如何体现            | 二级           | 三级              | 说明                                                                              |
| --: | ------------------------------------ | ----------------------------------------------------- | --------------------- | ----------------------- | -------------- | ----------------- | --------------------------------------------------------------------------------- |
|   1 | `mobility.fewerTransfers`            | boolean                                               | Soft                  | 移动摘要                | 直接 Toggle    | —                 | 尽量少换乘，不是绝对禁止换乘                                                      |
|   2 | `mobility.walkingTolerance`          | `veryLow\|low\|standard\|high\|veryHigh`              | Soft constraint input | 移动摘要                | 3 档快速选择   | 完整 5 档         | 与 Route / Attraction physical load / duration 组合                               |
|   3 | `mobility.noPublicTransit`           | boolean                                               | **Hard when true**    | 显示“交通限制”摘要      | 仅显示已有限制 | 直接 Toggle       | 禁止一般公共交通；不静默降级为 soft                                               |
|   4 | `mobility.noBus`                     | boolean                                               | **Hard when true**    | 同上                    | 仅显示已有限制 | 直接 Toggle       | 公交子类排除；父级 `noPublicTransit` 可覆盖它                                     |
|   5 | `mobility.noFerry`                   | boolean                                               | **Hard when true**    | 同上                    | 仅显示已有限制 | 直接 Toggle       | 船 / 渡轮排除，单独保留以适配岛屿旅行                                             |
|   6 | `dining.localCuisine`                | `deprioritize\|neutral\|prioritize`                   | Soft                  | 餐饮摘要                | 直接三档       | —                 | “当地料理”优先级，不代表饮食禁忌                                                  |
|   7 | `dining.smallShops`                  | `deprioritize\|neutral\|prioritize`                   | Soft                  | 餐饮摘要                | 直接三档       | —                 | 小店 / 在地店倾向                                                                 |
|   8 | `dining.queueTolerance`              | `low\|medium\|high`                                   | Soft constraint input | 餐饮摘要                | 直接三档       | —                 | 用于排队时间惩罚，不是硬性最大分钟数                                              |
|   9 | `accommodation.transportConvenience` | `deprioritize\|neutral\|prioritize`                   | Soft                  | 住宿摘要                | 直接三档       | —                 | 更重视交通便利度                                                                  |
|  10 | `accommodation.comfort`              | `deprioritize\|neutral\|prioritize`                   | Soft                  | 住宿摘要                | 直接三档       | —                 | 对住宿舒适度的长期优先级                                                          |
|  11 | `accommodation.fewerHotelChanges`    | `deprioritize\|neutral\|prioritize`                   | Soft                  | 住宿摘要                | 直接三档       | —                 | 与 `style.movement` 可以形成软冲突，不拒绝保存                                    |
|  12 | `budget.spendingTendency`            | `economical\|moderate\|flexible`                      | Soft                  | 预算摘要                | 直接三档       | —                 | 只表达长期消费倾向，不存具体金额                                                  |
|  13 | `budget.prioritizeAccommodation`     | boolean                                               | Soft                  | 预算摘要                | 直接 Toggle    | —                 | 同等预算下更愿意花在住宿                                                          |
|  14 | `budget.prioritizeExperience`        | boolean                                               | Soft                  | 预算摘要                | 直接 Toggle    | —                 | 同等预算下更愿意花在体验                                                          |
|  15 | `interests.preferences`              | `Partial<Record<InterestCode, "like"\|"dislike">>`    | Soft / Soft negative  | 景点 Radar + 景点摘要   | 16 兴趣卡      | —                 | missing parent = 无明确兴趣信号；UI 当前最多 3 喜欢 + 3 不喜欢，Schema 不写死为 3 |
|  16 | `interests.details`                  | `Partial<Record<InterestCode, InterestDetailCode[]>>` | Soft                  | 景点摘要可体现最显著项  | “已细化”状态   | 细分 Modal / Page | v1 只保存正向细分；父级明确 dislike 时禁止有正向 detail                           |
|  17 | `style.pace`                         | integer 1–5                                           | Soft                  | 旅行风格 Radar / 摘要   | 1–5 Slider     | —                 | 1 悠闲 → 5 紧凑                                                                   |
|  18 | `style.depth`                        | integer 1–5                                           | Soft                  | 旅行风格 Radar / 摘要   | 1–5 Slider     | —                 | 1 打卡优先 → 5 深度体验                                                           |
|  19 | `style.discovery`                    | integer 1–5                                           | Soft                  | 旅行风格 Radar / 摘要   | 1–5 Slider     | —                 | 1 经典必去 → 5 当地小众；是 Trip/路线取舍轴，不直接等于 Radar 两个独立分数        |
|  20 | `style.movement`                     | integer 1–5                                           | Soft                  | 旅行体验摘要            | 1–5 Slider     | —                 | 1 定点游玩 → 5 一路移动                                                           |
|  21 | `style.coverage`                     | integer 1–5                                           | Soft                  | 旅行体验摘要            | 1–5 Slider     | —                 | 1 单城深玩 → 5 多地巡游                                                           |
|  22 | `style.priority`                     | integer 1–5                                           | Soft                  | 预算 / 体验摘要         | 1–5 Slider     | —                 | 1 预算优先 → 5 体验优先；与预算分配字段语义不同                                   |
|  23 | `style.planning`                     | integer 1–5                                           | Soft                  | 旅行风格 Radar 的“计划” | 1–5 Slider     | —                 | 1 自由随性 → 5 计划明确；v0.2 新增，补齐长期画像缺失事实                          |

---

## 9. 一级 / 二级 / 三级页面冻结

### 9.1 一级：用户只需要“看懂自己”

一级不直接展示 23 个字段，也不出现技术枚举。

冻结为：

```text
旅行偏好
├─ 景点偏好 Radar（Derived）
├─ 旅行风格 Radar（Derived）
├─ 一句话旅行画像（Derived）
└─ 6 张摘要卡
   ├─ 移动
   ├─ 景点与活动
   ├─ 餐饮
   ├─ 住宿
   ├─ 预算
   └─ 旅行体验
```

一级只回答：

> “我现在大概是什么旅行偏好？”

不承担精确编辑。

### 9.2 二级：高频快速设置

二级直接编辑高频 Soft preference：

```text
移动
- 少换乘
- 步行量：尽量少 / 适中 / 可以多走
- 当前硬交通限制摘要 → 进入三级

景点与活动
- 16 个兴趣：喜欢 / 不喜欢 / 未选择
- 每项“细化” → 进入三级

餐饮
- 当地料理优先级
- 小店优先级
- 排队接受度

住宿
- 交通便利优先级
- 舒适度优先级
- 少换酒店优先级

预算
- 消费倾向
- 更愿意花在住宿
- 更愿意花在体验

旅行体验
- 悠闲 ↔ 紧凑
- 打卡 ↔ 深度
- 经典 ↔ 小众
- 定点 ↔ 移动
- 单城 ↔ 多地
- 预算 ↔ 体验
- 随性 ↔ 计划
```

二级是普通用户主要设置层。

### 9.3 三级：精细和低频设置

v1.0 三级只承载两组真正需要精确控制的内容：

```text
A. 移动硬限制
- 不乘公共交通
- 不乘公交
- 不乘船 / 渡轮
- 步行容忍度完整 5 档

B. 兴趣细化
- 16 个 InterestCode 各自的 DetailCode[]
```

冻结：不为了“看起来高级”把所有二级字段重复做一遍三级设置。

---

## 10. 二级 3 档步行 UI 与 Canonical 5 档映射

Canonical 必须保留 5 档，但普通用户二级设置保持简单。

### 10.1 二级快速值

```text
尽量少走 → low
适中     → standard
可以多走 → high
```

### 10.2 三级完整值

```text
veryLow   极少步行
low       尽量少走
standard  一般
high      可以多走
veryHigh  高步行接受度
```

### 10.3 为什么不继续 boolean `lessWalking`

例如清水寺：

```text
景点：坡度 / 台阶 / 步行负荷较高
推荐停留：90 min
最低合理：60 min
用户：walkingTolerance = low
实际计划：30 min
```

Engine 后续才能把：

```text
景点 physical load
× 计划停留时间
× 路线移动量
× 用户 walkingTolerance
× Companion / Party constraints
→ fatigue / overload / reasonableness
```

boolean `lessWalking=true` 无法提供足够细的容忍度信息。

---

## 11. Interest Master Data

### 11.1 InterestCode — 16 个

```text
nature_scenery
history_culture
food
photography
onsen_wellness
art_museums
anime_entertainment
shopping
urban_exploration
outdoor_activity
night_experience
family_activity
traditional_experience
theme_parks
rural_towns
seasonal_events
```

这些是 stable domain code；UI 文案本地化：

```text
nature_scenery
→ 自然风景
→ Nature & Scenery
→ 自然・景観
```

### 11.2 InterestPreferenceSignal

只允许：

```text
like | dislike
```

不保存 `neutral`：

```text
missing InterestCode = 未选择 / 无明确偏好
```

这与当前 Start Flow 的用户体验一致，也避免“未选择”和“明确一般”无法区分的问题。

### 11.3 UI 数量限制与 Schema 数量限制分离

当前快速 UI：

```text
喜欢最多 3 项
不喜欢最多 3 项
```

这是**当前交互策略**，不是 5.11 数据结构上限。

Schema 允许最多 16 个已登记 InterestCode，以便未来 Personal Center、导入或新 UI 扩展时不用升级数据版本。

5.14 / Planner 可以根据 Consumer 需求只消费 top signals；不要求数据库替 UI 做截断。

---

## 12. InterestDetailCode

### `nature_scenery`

```text
mountain
coast
lake
forest
flower_field
```

### `history_culture`

```text
shrine_temple
castle
museum
historic_district
```

### `food`

```text
sushi
ramen
regional_cuisine
dessert
sake
```

### `photography`

```text
street_photography
landscape
nightscape
architecture
people_culture
```

### `onsen_wellness`

```text
ryokan_onsen
open_air_bath
forest_wellness
sea_view_onsen
```

### `art_museums`

```text
contemporary_art
traditional_crafts
architecture
design_exhibition
```

### `anime_entertainment`

```text
anime_pilgrimage
gaming
themed_cafe
merchandise
```

### `shopping`

```text
department_store
vintage
drugstore
local_specialties
```

### `urban_exploration`

```text
distinctive_neighborhood
architecture_walk
cafe
city_nightscape
```

### `outdoor_activity`

```text
hiking
cycling
skiing
water_activity
```

### `night_experience`

```text
izakaya
nightscape
performance
night_walk
```

### `family_activity`

```text
zoo
science_museum
family_crafts
park
```

### `traditional_experience`

```text
tea_ceremony
kimono
crafts
traditional_performance
```

### `theme_parks`

```text
major_theme_park
character_park
aquarium
immersive_exhibition
```

### `rural_towns`

```text
historic_town
fishing_village
countryside
local_market
```

### `seasonal_events`

```text
cherry_blossom
autumn_leaves
snow_scenery
festival
fireworks
```

约束：

1. 每个 parent 的 detail 去重；
2. unknown parent / child fail closed；
3. parent = `dislike` 时不允许正向 detail；
4. parent missing 或 like 时允许 detail；
5. v1 细分只表示正向兴趣，不提供 detail-level dislike；
6. 未来需要“喜欢户外但不滑雪”等负向细分时，通过 v1.1+ 单独设计，不在 v1 偷塞语义。

---

## 13. 为什么删除 6 个 `attractions.*`

v0.1 曾候选保存：

```text
attractions.nature
attractions.history
attractions.culture
attractions.art
attractions.photography
attractions.activityExperience
```

本轮删除。

原因：这些轴已经能从 `interests.preferences + interests.details` 计算，如果继续存会出现：

```text
attractions.nature = dislike
interests.preferences.nature_scenery = like
```

数据库无法判断谁是真实事实。

因此冻结：

```text
16 兴趣 + 细分 = 用户事实
6 轴 Radar       = Derived View
```

Radar 点击某一轴时，跳到相关 InterestCode 分组，不直接编辑一个隐藏的第二套值。

---

## 14. 为什么删除 `experience.photoExperience`

摄影已经由：

```text
interests.preferences.photography
+
interests.details.photography[]
```

完整表达。

景点本身是否“适合拍照”由 Attraction 43 字段中的 `photo` 等事实表达。

正确关系：

```text
用户喜欢摄影
× 景点 photo / scenery / night / architecture 等事实
→ 推荐评分
```

不需要再存：

```text
experience.photoExperience = true
```

---

## 15. Attraction Radar 的计算边界

主界面固定六轴：

```text
自然
历史
人文
艺术
摄影
活动体验
```

但六轴值**不保存**。

v1.0 输入来源可按以下语义分组，具体 normalization / weight 留给展示层 / 5.14 / 7.9：

| Radar 轴 | 主要输入 InterestCode                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------- |
| 自然     | `nature_scenery`, `onsen_wellness`, `outdoor_activity`, `rural_towns`, `seasonal_events`                                |
| 历史     | `history_culture`, `traditional_experience`, `rural_towns`                                                              |
| 人文     | `history_culture`, `food`, `urban_exploration`, `night_experience`, `traditional_experience`, `rural_towns`             |
| 艺术     | `art_museums`, `traditional_experience`, `anime_entertainment` + architecture-related details                           |
| 摄影     | `photography` + `nature_scenery`, `urban_exploration`, `night_experience`, `seasonal_events` 的相关细分                 |
| 活动体验 | `outdoor_activity`, `traditional_experience`, `theme_parks`, `family_activity`, `anime_entertainment`, `onsen_wellness` |

5.11 只冻结输入事实与“不持久化 Radar”的边界，不在数据库层冻结展示公式。

---

## 16. Travel Style Radar 与 7 个 Style fields

主界面 Travel Style Radar：

```text
轻松
经典
计划
探索
参与
深度
```

Canonical 长期 style fields：

```text
pace
depth
discovery
movement
coverage
priority
planning
```

其中：

- `planning` 直接支持“计划”轴；
- `depth` 直接支持“深度”轴；
- “轻松”主要由低 pace + walkingTolerance + movement 等组合；
- “经典 / 探索”不能简单把一个 `discovery` slider 复制成两个互斥 Radar 分数，还应结合兴趣信号，因此允许两轴同时偏高；
- “参与”主要由活动类 InterestCode / details 与旅行风格共同派生。

这保持了 Preference Center 已冻结的原则：

> Radar 是长期偏好的可视化结果，而不是第二套事实源。

---

## 17. Style 字段详细语义

### `style.pace`

```text
1 悠闲
2 偏悠闲
3 平衡
4 偏紧凑
5 紧凑
```

影响每日密度、留白、连续活动安排。

### `style.depth`

```text
1 打卡优先
5 深度体验
```

影响单点停留时间、讲解 / 体验深度与景点数量权衡。

### `style.discovery`

```text
1 经典必去
5 当地小众
```

这是**路线选点的 trade-off 输入**，不是“经典 Radar 分数”和“探索 Radar 分数”的唯一来源。

### `style.movement`

```text
1 定点游玩
5 一路移动
```

影响跨城 / 跨住宿地频率。

### `style.coverage`

```text
1 单城深玩
5 多地巡游
```

与 movement 不相同：coverage 表达区域覆盖范围，movement 表达实际迁移频率。

### `style.priority`

```text
1 预算优先
5 体验优先
```

这是“发生取舍时的总体倾向”。

与：

```text
budget.prioritizeAccommodation
budget.prioritizeExperience
```

不同；后两者表达“在既定预算内部更愿意把钱花在哪里”。

### `style.planning`

```text
1 自由随性
2 偏灵活
3 平衡
4 偏计划
5 计划明确
```

影响：

- 是否倾向预先锁定每日结构；
- 是否接受更多临时替代候选；
- Planner 后续是否更积极给出备选与动态调整空间。

它不等于“是否允许 AI 修改行程”；AI 修改权限属于产品控制，不由 Preference 自动决定。

---

## 18. 允许存在的 Soft Conflict

Schema 不应把所有“看起来有张力”的组合判成非法。

以下组合都**允许保存**：

```text
style.movement = 5
accommodation.fewerHotelChanges = prioritize
```

含义：用户喜欢移动旅行，但又不喜欢频繁换酒店；Planner 应尝试日归 / 枢纽式路线，而不是拒绝数据。

```text
style.priority = 1
budget.prioritizeExperience = true
```

含义：用户总体重视预算，但在有限预算中愿意优先体验。

```text
style.depth = 5
style.coverage = 5
```

含义：用户希望既深度又多地，可能导致行程张力；Engine / Planner 应给出 overload 或取舍解释，不由 Schema 拒绝。

冻结原则：

> **Schema 只拒绝逻辑不可能 / 类型错误 / 同一事实直接互斥，不拒绝可由规划器权衡的软张力。**

---

## 19. Hard Constraint 冲突语义

### 19.1 父 / 子排除

```text
noPublicTransit = true
noBus = false
```

不代表公交被允许。

冻结：

```text
父级 hard exclusion 优先
```

`noBus=false` 只代表没有独立公交排除，不能取消 `noPublicTransit=true` 的更广泛限制。

UI 应在父级开启时对被覆盖的子项显示“已被上级限制包含”，但不必自动删除历史值。

### 19.2 Hard constraint 无可行方案

例如：

```text
noFerry = true
+
目的地只有渡轮可达
```

Planner / Engine 不得静默使用渡轮。

应返回：

```text
blocked / needsConfirmation
```

并说明：

- 哪个 hard constraint 导致不可行；
- 可选的显式覆盖方案；
- 用户确认后只写 Trip Override，不回写长期 Preference。

---

## 20. 43 字段体系与 5.11 的关系

43 字段描述的是：

```text
景点是什么
景点适合谁
景点有什么价值
景点的强度 / 负荷 / 时间特征
```

5.11 描述的是：

```text
用户长期喜欢什么
用户长期能接受什么
```

例如：

```text
User:
interests.preferences.nature_scenery = like
style.discovery = 4
walkingTolerance = low

Attraction:
nature = 9
hidden = 8
walking / slope load = high
recommendedDuration = 90
minimumReasonableDuration = 60

Engine:
先奖励 nature / hidden 匹配
再结合 walkingTolerance 与实际停留时长判断 physical load / fatigue
```

因此：

- `family / senior / couple / solo` 不复制成长期 Preference；主要由 Trip Party / Companion 与景点 suitability 组合；
- `scenery / history / architecture / photo / food / shopping / nature / night / onsen / art / entertainment / local / unique / hidden / iconic ...` 不直接复制成第二套用户字段；通过 Interest / Style → 5.14 / 7.9 mapping 消费；
- 景点自己的 walking / slope / duration / fatigue facts 永远不写进用户 Preference。

---

## 21. 长期 Preference 与 Trip Preference

冻结继承链：

```text
Long-term Preference
        ↓ 创建 Trip 时复制
Trip Preference Snapshot（不可变）
        +
Trip Preference Override（稀疏）
        ↓
Effective Trip Preference
```

### 21.1 Snapshot

- 创建 Trip / Draft 时复制当时的长期 Preference；
- 后续修改长期 Preference 不回写旧 Snapshot；
- 无长期 Preference 时 Snapshot 为空，source revision = 0。

### 21.2 Override

- 只保存本次旅行不同于 Snapshot 的字段；
- missing = 继承 Snapshot；
- 显式值 = 覆盖 Snapshot；
- 不允许自动回写长期 Preference。

### 21.3 显式保存回长期

未来如提供：

```text
“把本次设置保存为我的长期偏好”
```

必须是用户明确操作，并产生独立长期 Preference Patch。

---

## 22. Patch 模型

```json
{
  "schemaVersion": "1.0",
  "set": {
    "mobility.walkingTolerance": "low",
    "style.planning": 5,
    "interests.preferences": {
      "nature_scenery": "like",
      "theme_parks": "dislike"
    }
  },
  "unset": ["dining.queueTolerance"]
}
```

规则：

1. unknown key fail closed；
2. invalid enum / invalid type fail closed；
3. 同一 key 不能同时 set / unset；
4. patch 后完整 payload 再校验；
5. API 不接受客户端自报 owner id；
6. 5.16 使用 revision compare-and-swap；
7. `interests.preferences` / `interests.details` 作为完整 value 替换，由 revision CAS 防止跨设备无声覆盖；
8. UI 保存单个 InterestCode 时应先基于最新服务器 value 构造整个 map。

---

## 23. DB / Runtime Validation

至少验证：

```text
schemaVersion = "1.0"
values = plain object
payload <= 64 KiB
unknown key = reject
revision > 0
```

字段级：

- walkingTolerance 只允许 5 个 enum；
- queueTolerance 只允许 low / medium / high；
- priority-type enum 只允许 deprioritize / neutral / prioritize；
- style.* 只允许 integer 1–5；
- InterestCode / DetailCode 必须来自 canonical master；
- Interest map 不允许 duplicate key（JSON object 天然唯一，但 parser 仍按可信 plain JSON 处理）；
- dislike parent + positive details = reject；
- `attractions.*` / `experience.photoExperience` / `mobility.preset` = unknown key reject。

---

## 24. RLS / Security

仅 authenticated owner 可以：

- SELECT 自己的 Preference；
- INSERT 自己的 Preference；
- UPDATE 自己的 Preference。

客户端不直接 DELETE Preference Root；重置写回空 envelope。

```text
auth.users delete
→ ON DELETE CASCADE
→ travel_preferences delete
```

不保存系统推断出的敏感属性。

未来饮食限制 / 无障碍需求如进入 Preference，只保存用户明确提供的**功能性旅行需求 code**，不保存或推断背后的健康、宗教或其他敏感原因。

---

## 25. Reset 语义

重置长期偏好：

```json
{
  "schemaVersion": "1.0",
  "values": {}
}
```

并：

```text
revision = revision + 1
```

重置不删除：

- 账户；
- Companion；
- 已保存 Trip；
- 旧 Trip Preference Snapshot。

5.13 决定空 Preference 下的 UI / Planner fallback，但 fallback 不回写数据库。

---

## 26. Versioning

### v1.0

本设计 23 canonical keys。

### Additive

新增 optional key 仍应发布 contract version，如：

```text
1.0 → 1.1
```

因为 strict old parser 默认拒绝未知 key。

### Breaking

重命名、删除、改变值语义：

```text
1.x → 2.0
```

必须有 migrator、fixtures、Consumer review。

DB 表结构可不变，但 parser / DB validation / fixtures / API / 5.14 Contract 必须同步升级。

---

## 27. 对 Draft PR #221 的修正决定

#221 仍是可复用候选，不 blind merge，也不丢弃。

### 27.1 保留架构

- 一用户一 `travel_preferences` root；
- versioned strict JSONB；
- revision；
- owner-only RLS；
- 64 KiB 限制；
- sparse patch；
- Trip Snapshot / Override；
- Snapshot 不随长期 Preference 变化；
- Override 不回写长期；
- authenticated owner 来自可信 Session / auth context。

### 27.2 必须修改字段层

1. 删除 `mobility.preset`；
2. `mobility.lessWalking:boolean` → `mobility.walkingTolerance` 5 档；
3. 删除 canonical `attractions.nature/history/culture/art/photography/activityExperience`；当前 Attraction UI 必须通过 adapter 写入 Interest facts 或继续保持内部 UI state，不能成为第二套 DB schema；
4. 删除 `experience.photoExperience`；摄影统一由 `photography` Interest + details；
5. `interests.likes/dislikes` → `interests.preferences` sparse map；
6. 中文 Interest label → stable InterestCode；
7. 新增 `interests.details` typed map；
8. 新增 `style.planning`；
9. Dining / Accommodation 的内部 `priority/value/notSpecial` 等 UI enum 通过 adapter 统一映射到 canonical `deprioritize | neutral | prioritize`；
10. UI Mock/default 不得在首次登录时自动落库。

#221 尚未进入正式生产基线，因此这属于候选分支 schema 修正，不需要兼容线上已存 30-key 数据。

---

## 28. 5.11 与相关 WBS 的边界

### 5.11 — Schema

负责：

- canonical keys；
- type / enum；
- hard / soft static metadata；
- missing / neutral / false 语义；
- root shape；
- version；
- validation；
- RLS ownership boundary；
- patch semantics 基础；
- Trip Snapshot / Override 数据边界。

### 5.13 — Preset / Default

负责：

- 新用户 fallback；
- 轻松 / 平衡 / 效率等 Preset；
- Preset → 5.11 Patch。

不新增第二套 Preference 字段。

### 5.16 — Persistence API

负责：

- get / update / reset；
- revision CAS；
- auth / API error；
- cross-device consistency；
- UI wiring。

### 5.14 — Planner-readable Contract

负责向 A 发布最小稳定消费面。

A 不应直接：

- 查询 `travel_preferences` 表；
- import B 的 React / UI model；
- 解析数据库 JSONB；
- 依赖 Personal Center 页面 state。

---

## 29. Effective Preference 优先级

```text
Trip Explicit Hard Constraint
        >
Trip Explicit Override
        >
Long-term Explicit Preference
        >
5.13 Default / Preset fallback
        >
System neutral fallback
```

规则：

- missing 才继续向下继承；
- explicit false / neutral 不被 fallback 覆盖；
- Hard feasibility conflict 必须解释；
- Soft conflict 由 Planner / Engine 权衡；
- Trip Override 不反写长期 Preference。

---

## 30. 5.11 实装验收标准

- [ ] `travel_preferences` 一用户一行，owner FK cascade。
- [ ] RLS owner-only；anon 无 CRUD。
- [ ] payload version = `1.0`。
- [ ] **23 个 canonical key** 完整 parser / metadata registry。
- [ ] unknown key fail closed。
- [ ] 不允许 canonical `mobility.preset`。
- [ ] 不允许 canonical `mobility.lessWalking`。
- [ ] `mobility.walkingTolerance` 完整 5 档。
- [ ] 3 个交通排除在 metadata 中标记 `Hard when true`。
- [ ] 其他字段为 Soft / Soft constraint input。
- [ ] 不允许 canonical `attractions.*` 六个重复 summary keys。
- [ ] 不允许 canonical `experience.photoExperience`。
- [ ] Interest 使用 stable code，不使用中文 label 作为 domain enum。
- [ ] `interests.preferences` 仅允许 `like | dislike`，missing parent 表示未设置。
- [ ] `interests.details` parent / child 校验、去重。
- [ ] dislike parent + 正向 details 必须拒绝。
- [ ] `style.pace/depth/discovery/movement/coverage/priority/planning` 只允许 integer 1–5。
- [ ] Dining / Accommodation canonical priority enum 统一为 `deprioritize | neutral | prioritize`。
- [ ] payload <= 64 KiB。
- [ ] empty Preference 合法。
- [ ] UI Mock / 5.13 fallback 不会在用户未确认时写入长期 Preference。
- [ ] Snapshot 创建时复制当时长期 Preference；后续长期更新不改旧 Snapshot。
- [ ] Override 不回写长期 Preference。
- [ ] revision CAS 所需字段保留，但完整 API 行为归 5.16。
- [ ] #221 逐项审计复用，不 blind cherry-pick。
- [ ] 不修改 A Planner / Engine / Trip Plan canonical schema。
- [ ] 不把 43 Attraction fields 复制进 Preference。

---

## 31. v1.0 暂不纳入

以下有价值，但不在 v1.0 提前冻结：

- 台阶容忍度 / 上坡容忍度独立字段；
- 无障碍功能性旅行需求；
- 天气敏感度；
- 行李移动敏感度；
- 到达日 / 离境日强度；
- 早起 / 深夜活动容忍度；
- detail-level dislike；
- 更细饮食限制；
- 酒店星级 / 房型；
- 具体金额预算；
- AI 自动学习出的隐式偏好；
- 每字段 provenance / confidence / learned score。

这些必须在有明确 UI、业务语义、隐私边界与 Consumer 需求后，通过 1.1+ 发布。

---

## 32. 下一步实施顺序

```text
5.11 v0.2 字段 / UI / Hard-Soft 设计确认
        ↓
生成独立 5.11 Codex Task
        ↓
从最新 develop 建立实现分支
        ↓
审计 #221 并选择性移植合理架构
        ↓
23-key parser / metadata / migration / DB validation / tests
        ↓
用户验收
        ↓
合入 develop
        ↓
5.13 Preset / Default
        ↓
5.16 Persistence API + UI wiring
        ↓
5.14 Public Preference Contract
        ↓
A 4.18 / 7.9 / AI / Engine 消费
```

5.11 完成前不把 5.13 / 5.14 / 5.16 标记为已完成。

---

## 33. 一句话架构

> **5.11 只保存用户长期明确的旅行偏好事实；主界面 Radar 与画像从这些事实计算，Trip 保存本次条件，Attraction 43 字段保存景点事实，Engine 再把用户偏好、同行人、路线、时长与景点负荷组合起来判断。**
