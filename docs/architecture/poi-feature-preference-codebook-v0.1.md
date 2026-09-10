# TravelAssist POIFeatureV1 / Sparse Preference Codebook v0.1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 关联设计：`docs/architecture/trip-engine-poi-ai-provider-design-v0.3.md`  
> 本文件冻结候选范围：43 维 POI Feature 编号与语义、Feature Kind、Sparse Preference 1–9 / omit-5 规则、硬约束与运行时 Context 的边界。  
> 本文件**不修改 Master Code 编号体系**，也不定义数据库表、Migration、最终 Scoring 权重或 UI 层级。

---

# 1. 核心结论

TravelAssist 使用同一套 43 维 POI Feature 空间描述景点，但不得把 43 个维度全部理解为“用户长期偏好”。

应区分：

```text
POI Master Feature
= 景点本身的静态 / 半静态属性

Sparse Preference
= 用户明确偏好、旅行风格、容忍度等可稀疏表达的目标

Trip / Runtime Context
= 同行人、日期、时段、天气、位置等本次旅行条件

Hard Constraint
= 轮椅必须可达、预约时间、绝对不能爬楼梯等不可被软评分覆盖的条件
```

因此匹配链路为：

```text
POIFeatureV1
+
Sparse Preference
+
Trip / Runtime Context
+
Hard Constraints
↓
Trip Planning Engine
↓
matchScore / dayFit / weatherFit / seasonFit / riskPenalty
```

AI 只读取当前任务需要的 Compact Projection，不默认读取完整 43 维。

---

# 2. 评分尺度

## 2.1 POI Master Feature

POI Feature 使用：

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
null = unknown / 未确认
```

规则：

- `0` 是有效事实，不得表示 unknown；
- `null` 才表示未知；
- POI Master 必须保留完整 43 维语义，不因 AI Token 优化删字段；
- AI Compact Context 可以只投影本次任务实际需要的维度。

## 2.2 Sparse Preference

用户偏好 / 容忍目标使用：

```text
1–9 = 有效偏好 / 需求 / 容忍目标
5   = 中性 / 默认
```

Compact 传输规则：

> **值为 5 时不传；值不为 5 时直接传 1–9 原值。**

不使用 `+1 / -1 / +3 / -2` 作为 AI 传输格式。

原因：

- 直接保留强弱程度；
- 和 1–9 的 Feature / Preference 心智模型一致；
- `5` 可自然作为默认值省略；
- 不需要给 AI 增加正负号换算规则；
- Engine 内部需要时可自行归一化，不要求 AI 计算。

示例：

```text
P=4:9,5:8,7:8,25:3,27:2
```

表示：

```text
04 photo=9
05 food=8
07 nature=8
25 walking=3
27 crowd=2
```

未出现的维度视为 Sparse Preference 中性值 `5`，但**不能因此把 POI Master 的 unknown 当成 5**。

---

# 3. Feature Kind

43 维不得统一使用无方向点积。每个 Feature 必须带一个语义 Kind：

```text
benefit
suitability
cost
risk
```

含义：

```text
benefit
= 越高通常代表该体验价值越强

suitability
= 越高代表对某类人群 / 时段 / 天气 / 季节越适合

cost
= 越高代表体力 / 行动负担越大

risk
= 越高代表拥挤、排队、天气敏感等风险越大
```

Scoring Engine 必须根据 Kind 使用不同匹配函数。

禁止：

```text
score = UserVector · POIFeatureVector
```

作为全部 43 维的统一算法。

---

# 4. 43 维 Codebook

| Code | Key | 中文 | Kind | 主要匹配来源 |
|---:|---|---|---|---|
| 01 | scenery | 风景 | benefit | 用户兴趣 |
| 02 | history | 历史 | benefit | 用户兴趣 |
| 03 | architecture | 建筑 | benefit | 用户兴趣 |
| 04 | photo | 摄影 | benefit | 用户兴趣 |
| 05 | food | 美食 | benefit | 用户兴趣 |
| 06 | shopping | 购物 | benefit | 用户兴趣 |
| 07 | nature | 自然 | benefit | 用户兴趣 |
| 08 | night | 夜间体验 | benefit | 用户兴趣 + 时段 |
| 09 | onsen | 温泉 | benefit | 用户兴趣 |
| 10 | art | 艺术 | benefit | 用户兴趣 |
| 11 | entertainment | 娱乐 / 活动 | benefit | 用户兴趣 |
| 12 | local | 当地特色 | benefit | 用户兴趣 / Trip Style |
| 13 | unique | 独特性 | benefit | 用户兴趣 / Trip Style |
| 14 | hidden | 小众程度 | benefit | 用户兴趣 / Trip Style |
| 15 | iconic | 代表性 / 必去程度 | benefit | 用户兴趣 / 首访策略 |
| 16 | family | 家庭 | suitability | Party Context |
| 17 | senior | 老人 | suitability | Party Context |
| 18 | couple | 情侣 | suitability | Party Context |
| 19 | solo | 独行 | suitability | Party Context |
| 20 | relax | 放松 | suitability | Travel Style |
| 21 | adventure | 探索 / 冒险 | suitability | Travel Style |
| 22 | educational | 学习 / 教育 | suitability | Travel Style |
| 23 | interactive | 互动 / 参与 | suitability | Travel Style |
| 24 | rest | 恢复体力 / 休息价值 | suitability | Travel Style / 当日体力 |
| 25 | walking | 步行负担 | cost | 用户容忍度 / Mobility Context |
| 26 | physical | 体力负担 | cost | 用户容忍度 / Mobility Context |
| 27 | crowd | 拥挤程度 | risk | 用户容忍度 / Runtime |
| 28 | queue | 排队风险 | risk | 用户容忍度 / Runtime |
| 29 | wheelchair | 轮椅适配 | suitability | Accessibility Need / Constraint |
| 30 | stroller | 婴儿车适配 | suitability | Party Need / Constraint |
| 31 | morning | 上午 | suitability | Schedule Context / 用户偏好 |
| 32 | daytime | 白天 | suitability | Schedule Context / 用户偏好 |
| 33 | sunrise | 日出 | suitability | Schedule Context / 用户偏好 |
| 34 | sunset | 日落 | suitability | Schedule Context / 用户偏好 |
| 35 | rain | 雨天 | suitability | Weather Context |
| 36 | heat | 炎热天气 | suitability | Weather Context |
| 37 | cold | 寒冷天气 | suitability | Weather Context |
| 38 | snow | 雪天 / 雪景 | suitability | Weather Context / 用户偏好 |
| 39 | weather_sensitive | 天气敏感度 | risk | Weather Context |
| 40 | spring | 春 | suitability | Trip Date / Season Context |
| 41 | summer | 夏 | suitability | Trip Date / Season Context |
| 42 | autumn | 秋 | suitability | Trip Date / Season Context |
| 43 | winter | 冬 | suitability | Trip Date / Season Context |

以上 Code / Key / 中文语义为 v0.1 Freeze Candidate，后续若改 Code 或 Key 视为 breaking change。

---

# 5. A–I 分组

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

## G. 时段适配

```text
31 morning          上午
32 daytime          白天
33 sunrise          日出
34 sunset           日落
```

`night` 已在 08。

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

# 6. Sparse Preference 的匹配语义

## 6.1 benefit

用户值：

```text
1–4 = 明确不偏好 / 低兴趣
5   = 中性，不传
6–9 = 越来越重视
```

例如：

```text
04 photo=9
```

表示非常重视摄影价值。

POI 的 `photo` 越高，通常越有利。

## 6.2 suitability

`suitability` 不能机械理解为长期偏好。

例如：

```text
16 family
17 senior
18 couple
19 solo
```

更常由 Party Context 生成目标，而不是要求用户手动打 1–9。

例如两位情侣旅行：

```text
18 couple=9
```

没有必要同时传：

```text
16 family=1
17 senior=1
19 solo=1
```

无关维度保持省略即可。

## 6.3 cost

`walking / physical` 的用户值表示**容忍目标**：

```text
25 walking=2
```

含义：希望步行负担很低 / 步行容忍度低。

```text
25 walking=8
```

含义：能够接受较高步行负担。

高容忍度不代表“步行越多越值得奖励”；它主要减少 penalty。

## 6.4 risk

`crowd / queue / weather_sensitive` 的用户值表示风险容忍度或动态风险敏感性。

例如：

```text
27 crowd=2
```

表示用户不希望拥挤。

POI `crowd=9` 在这种情况下应受到较大 penalty。

但用户 `crowd=9` 只表示高度容忍拥挤，不表示系统应该主动奖励拥挤景点。

---

# 7. 43 维不等于 43 项长期用户偏好

以下字段通常可以成为长期 / 当前旅行软偏好：

```text
01–15  兴趣与地方特色
20–24  旅行风格
25–28  体力 / 风险容忍
31–34  时段偏好（如用户明确表达）
38     雪景偏好（如用户明确表达）
```

以下字段更常来自 Context：

```text
16–19  Party Context
29–30  Accessibility / Party Need
31–34  当天 Schedule Context
35–39  Weather Context
40–43  Trip Date / Season Context
```

因此实现时不得建立一个 UI 强迫用户填写 43 项。

长期 Preference、Trip Preference、Runtime Context 可以映射到同一 Feature Space，但来源与生命周期必须分开保存。

---

# 8. Hard Constraint 边界

下列要求不得仅靠 1–9 软偏好表达：

```text
必须轮椅可达
绝对不能走楼梯
儿童年龄限制
18:00 必须到酒店
13:00 已预约餐厅
某活动必须参加
某日期闭馆
交通末班限制
```

应进入：

```text
Constraint
Fact
Locked Anchor
Booking / Reservation Fact
Route Fact
```

例如：

```text
wheelchair=9
```

可以表示“轮椅适配非常重要”的软目标；

但：

```text
requiresWheelchairAccess=true
```

若为实际硬需求，应由 Constraint Engine 直接淘汰不满足条件的候选。

---

# 9. Runtime Context 不伪装成 Preference

季节、天气、当前时段等运行时事实应直接保存真实 Context：

```text
season=autumn
slot=morning
weather=rain
```

Engine 再去读取对应 POI Feature：

```text
42 autumn
31 morning
35 rain
```

而不是每次把这些事实写成永久用户偏好。

例如秋季旅行：

```text
season=autumn
```

Engine 使用 POI `autumn` 维度计算 `seasonFit`。

它不意味着用户长期 Preference 中必须保存：

```text
42 autumn=9
```

只有用户明确表达“我特别喜欢红叶 / 秋季体验”时，才可另外产生相关软偏好。

---

# 10. AI Compact Projection

AI Gateway 默认不发送完整 43 维。

标准顺序：

```text
Full POIFeatureV1
↓
Trip Planning Engine 计算
↓
Task-specific Projection
↓
Local ID
↓
Compact Tuple
↓
AI
```

例如用户当前关心：

```text
摄影
自然
少走路
少拥挤
```

Sparse Preference：

```text
P=4:9,7:8,25:3,27:2
```

AI POI Projection 可以只给：

```text
schema=[id,match,stay,photo,nature,walking,crowd]
0=[9,90,8,9,8,2,3]
1=[8,60,7,8,9,5,2]
```

无需发送其余 39 个维度。

---

# 11. Preference 也采用 Task Projection

即使 Sparse Preference 已很短，也不要求每次把全部非 5 项都发给 AI。

例如用户长期偏好：

```text
P=4:9,5:8,7:8,9:7,10:8,14:9,20:8,25:3,27:2
```

如果当前任务只是“两个雨天室内候选怎么选”，AI Gateway 可以只投影与本任务相关部分，并由 Engine 提供已经计算好的 `matchScore / weatherFit / routeFit`。

原则：

> **Preference Storage ≠ AI Input。AI Input 永远按任务裁剪。**

---

# 12. 传输格式

## 12.1 可读调试格式

```text
P=4:9,5:8,7:8,25:3,27:2
```

## 12.2 Structured 格式

可用：

```json
{
  "4": 9,
  "5": 8,
  "7": 8,
  "25": 3,
  "27": 2
}
```

或数组：

```json
[[4,9],[5,8],[7,8],[25,3],[27,2]]
```

最终具体 wire format 由 `AI-Compact-Context-V1` 冻结；本 Codebook 只冻结语义：

```text
Code + 1–9 value
5 omitted
```

---

# 13. Validation Rules

实现前至少需要验证：

1. Feature Code 必须严格为 `01–43`；
2. 不得出现重复 Code；
3. POI Master Score 只能是 `0–9 | null`；
4. Sparse Preference 只能是 `1–9`；
5. Sparse Preference 序列化时值 `5` 必须省略；
6. Compact Preference 缺失项只代表“Preference 中性”，不能覆盖 POI Master `null`；
7. `walking / physical / crowd / queue / weather_sensitive` 不得使用 benefit 方向算法；
8. Hard Constraint 不得降级成软 Preference；
9. Runtime season / weather / time 不得默认写回长期 Preference；
10. AI 返回的 Local ID / Preference Code 必须经 Schema Validator 校验后再映射回 Domain；
11. 未知 Code 必须 fail closed，不得静默当作新 Feature；
12. Code / Key 变更必须发布新 Codebook Version。

---

# 14. 不在 v0.1 冻结的内容

以下内容仍需 Pilot / Consumer Review：

```text
每一维具体 0–9 判分边界
Preference 1–9 到 Engine 权重的数学映射
benefit 的负偏好惩罚曲线
cost / risk 的 tolerance penalty 曲线
各 Feature 权重
Party Context 自动映射强度
天气 / 季节 / 时段的动态公式
POIProfile5 派生权重
matchScore 最终公式
```

这些不得被 Codex 自行写死成“架构事实”。

---

# 15. Freeze Candidate Acceptance

本 Codebook 可在满足以下条件后升级为 Frozen：

```text
[ ] 43 个 Code / Key / 中文名无重复、无遗漏
[ ] A–I 分组与综合设计书 v0.3 一致
[ ] benefit / suitability / cost / risk 语义经 Planning Engine Consumer Review
[ ] Sparse Preference 1–9 / omit-5 规则经 Preference Consumer Review
[ ] Hard Constraint 与 Trip / Runtime Context 边界确认
[ ] AI Gateway Consumer 确认 Task Projection 可实现
[ ] 100 POI Pilot 不出现方向性评分系统错误
[ ] 至少覆盖高步行、高拥挤、轮椅、雨天、季节等反例 Fixture
```

---

# 16. 一句话定义

> **POIFeatureV1 用完整 43 维描述“景点是什么”；Sparse Preference 用 1–9 且省略 5 描述“用户在意什么”；Trip / Runtime Context 描述“这次旅行现在是什么条件”；Hard Constraint 决定“什么绝对不能违反”。**
