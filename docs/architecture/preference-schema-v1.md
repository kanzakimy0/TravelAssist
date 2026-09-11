# TravelAssist — WBS 5.11 Preference Schema 设计书

> 文档版本：v0.1 / Freeze Candidate  
> 日期：2026-09-11  
> WBS：5.11 — Preference Schema  
> Owner：B / Personal Center  
> 依赖：1.25 已完成；8.1 已完成  
> 当前状态：**设计候选；5.11 实装 Task 尚未启动，Master WBS 暂不标记完成**  
> 后续：5.13 Preference Preset、5.16 Preference Persistence API、5.14 Planner-readable Preference Contract

---

## 1. 设计目标

WBS 5.11 的任务不是把现有页面 state 原样塞进数据库，而是冻结一份可以长期演进的**用户长期旅行偏好事实模型**。

它必须同时服务：

1. Personal Center 的长期偏好编辑；
2. 新旅行创建时的默认继承；
3. 单次 Trip 的 Snapshot / Override；
4. 后续 Planner / Recommendation / AI 通过 5.14 读取；
5. 后续 Engine 将“用户容忍度”与景点 / 路线 / 时长 / 负荷事实做组合判断；
6. Web 与未来 Mobile App 共用同一套业务语义。

核心原则：

```text
Preference Schema = 用户明确表达的长期旅行偏好事实

不是：
- UI 组件 state
- Radar 图坐标
- 页面摘要文字
- Preset 名称
- 某次旅行的日期 / 目的地 / 同行人数量
- 景点自身的 43 字段画像
- Engine 计算结果
```

---

## 2. 本轮审计输入

本设计综合当前仓库与已确认的产品决策：

- `docs/ui/preference-center.md`：长期偏好与单次 Trip 临时条件分离；Radar / 旅行画像是派生展示，不是事实源。
- `docs/preferences/preference-system.md`：大 / 中 / 小三级结构；硬限制与软偏好必须区分。
- `src/features/preferences/*-preference-model.ts`：当前已上线 UI 的 Mobility / Attraction / Dining / Accommodation / Budget 内部模型。
- `src/features/start-flow/model/start-flow-draft.ts`：16 个兴趣、六条旅行风格滑轨、Trip-specific facts。
- `src/features/start-flow/components/interest-detail-modal.tsx`：当前兴趣三级细分项。
- `docs/architecture/cross-module-contract-handoff.md`：B 拥有 Preference 语义，A 只能通过正式 5.14 Contract 消费。
- Draft PR #221 / TASK-017-B：已有 Preference + Trip Draft 持久化服务器候选子集，仍为 Partial / Draft，不能视为 5.11/5.16 已完成。
- Engine 4.20.1：43 字段属于 Attraction/Profile/Rule 输入，不复制进 ChangeSet；景点合理性需要结合停留时长、physical load、fatigue 等信息。
- 近期偏好分类讨论：主界面只展示用户需要理解和修改的少量偏好；二级是快速设置；三级是详细设置；可以从其他事实推导的维度不要求用户重复填写。

---

## 3. 最重要的架构决策

### 3.1 一用户一份长期 Preference Root

采用：

```text
auth.users
   1
   │
   1
travel_preferences
```

`travel_preferences` 一用户最多一行。

原因：

- Preference 是用户级长期状态，不需要按每个字段建立大量关系表；
- 当前字段仍会继续演进，JSONB 比 30～50 个 nullable 列更稳定；
- 查询模式几乎总是“按当前用户读取整份偏好”，没有跨用户按某偏好筛选的产品需求；
- 避免每新增一个偏好都做数据库列级 migration。

### 3.2 关系型所有权 + 严格版本化 JSONB

冻结数据库形态：

```text
travel_preferences
├─ owner_user_id   uuid PK → auth.users.id ON DELETE CASCADE
├─ payload         jsonb NOT NULL
├─ revision        integer NOT NULL > 0
├─ created_at      timestamptz NOT NULL
└─ updated_at      timestamptz NOT NULL
```

`payload` 不是任意 JSON，必须由 runtime parser + DB CHECK 双重验证。

### 3.3 Sparse Preference

新用户 canonical 数据：

```json
{
  "schemaVersion": "1.0",
  "values": {}
}
```

**缺少 key = 用户没有明确设置。**

以下语义必须严格区分：

```text
missing              = 未设置 / 继承
false                = 用户明确选择 false
neutral              = 用户明确选择中立
[]                   = 用户明确选择空集合
```

不得把 UI Mock 默认值保存成“用户选择”。

### 3.4 Preset 不是事实源

`轻松优先 / 平衡 / 效率优先` 属于 WBS 5.13 的 Preset。

冻结：

```text
用户点击 Preset
     ↓
5.13 将 Preset 展开成一组 Preference Patch
     ↓
5.11 只保存展开后的真实字段
```

因此 **`mobility.preset` 不进入 5.11 canonical payload**。

否则会出现：

```text
preset = relaxed
但具体字段后来已被用户单独改成高步行容忍度
```

形成双事实源。

### 3.5 `unset` 不是持久化值

冻结：

- `unset` 只是一种“删除 key / 恢复继承”的操作语义；
- 不把字符串 `"unset"` 存入 Preference 值；
- Attraction level 只允许真实选择值。

### 3.6 UI 文案不能作为 Domain Enum

当前 Start Flow 的 `自然风景 / 历史文化 / 美食` 等中文字符串属于展示层。

5.11 使用稳定 code；中文 / 日文 / 英文由 UI 本地化。

例如：

```text
nature_scenery  → 自然风景 / Nature & Scenery / 自然・景観
history_culture → 历史文化 / History & Culture / 歴史・文化
```

### 3.7 长期偏好与单次旅行完全分层

```text
Long-term Preference
        ↓ 创建 Trip 时复制
Trip Preference Snapshot（不可变）
        +
Trip Preference Override（稀疏、只影响本次）
        ↓
Effective Trip Preference
```

单次旅行的修改永远不能静默回写长期 Preference。

只有用户显式执行：

`保存为我的长期偏好`

才允许产生一笔独立的长期 Preference Patch。

---

## 4. 数据层级：什么保存，什么计算

| 信息 | 是否进入 5.11 | 原因 / 来源 |
|---|---:|---|
| 用户明确长期兴趣 | ✅ | Preference 事实 |
| 用户旅行风格 1–5 档 | ✅ | Preference 事实 |
| 少换乘 / 禁止某交通方式 | ✅ | Preference 事实 / 约束 |
| 步行容忍度 | ✅ | 用户侧容忍度，用于与路线/景点 load 组合 |
| 餐饮 / 住宿 / 预算倾向 | ✅ | Preference 事实 |
| 16 个兴趣的三级细分 | ✅ | 用户显式选择时保存 |
| Personal Center Radar 坐标 | ❌ | 由底层偏好计算 |
| “您的旅行画像”文案 | ❌ | 派生展示 |
| `轻松优先` Preset 名称 | ❌ | 5.13 展开为 Patch |
| 日期 / 行程长度 | ❌ | Trip facts |
| 目的地 | ❌ | Trip facts |
| 当前同行人数 | ❌ | Trip facts / 5.12 Companion |
| 家庭 / 情侣 / 独行 / 老人适配结论 | ❌ | 从 Party / Companion + Attraction Profile 推导 |
| 具体旅行总预算金额 | ❌ | Trip facts，必须带 currency |
| 航班 / 酒店 / 已预约活动 | ❌ | Trip facts / anchors |
| 景点 43 字段事实 | ❌ | Attraction/Profile/Rule 数据层 |
| 景点停留 30/60/90 分钟合理性 | ❌ | Engine 计算结果 |
| 疲劳累计结果 | ❌ | Engine 计算结果 |

---

## 5. 43 字段体系与 Preference 的关系

近期确定的 43 字段属于 Attraction / Profile / Rule 输入层，不应“为了统一”全部复制成用户偏好字段。

应分成三类理解：

### 5.1 可由用户偏好映射的景点价值维度

例如：

```text
scenery / history / architecture / photo / food / shopping
nature / night / onsen / art / entertainment
local / unique / hidden / iconic
relax / adventure / educational ...
```

这些是**景点有什么**或**景点适合什么风格**。

用户端只保存“我偏好什么”，后续 5.14 / 7.9 将用户偏好映射为这些 Attraction facts 的权重。

### 5.2 由上下文推导，不让用户重复填写

例如：

```text
family / senior / couple / solo
```

它们应主要来自：

```text
Trip Party
+ Companion Profile
+ 当前旅行场景
```

不应在长期 Preference 中再让用户声明“我是家庭/情侣/独行”。

### 5.3 景点负荷事实与用户容忍度必须分开

例如清水寺：

```text
景点事实：
- 推荐停留约 90 分钟
- 最低合理停留约 60 分钟
- 有坡度 / 台阶 / 步行负荷

用户事实：
- walkingTolerance = low / standard / high ...
```

Engine 后续计算：

```text
Attraction physical facts
× planned duration
× route movement
× party / companion constraints
× user tolerance
→ fatigue / overload / reasonableness
```

因此 5.11 存“容忍度”，**不存某景点的 walking=7 或 fatigue=6**。

---

## 6. Canonical Payload v1.0

采用 flat dotted key，便于：

- sparse patch；
- 精确 unset；
- CAS 更新；
- 不发生 nested-object merge 歧义；
- 对每个 key 做独立 parser / policy。

示例：

```json
{
  "schemaVersion": "1.0",
  "values": {
    "mobility.walkingTolerance": "low",
    "mobility.fewerTransfers": true,
    "attractions.nature": "veryLike",
    "dining.queueTolerance": "medium",
    "style.pace": 2,
    "interests.likes": ["nature_scenery", "history_culture"]
  }
}
```

---

## 7. v1.0 Canonical Key Registry

### 7.1 Mobility — 5 keys

| Key | Type | 语义 | Hard / Soft |
|---|---|---|---|
| `mobility.fewerTransfers` | boolean | 尽量减少换乘 | Soft |
| `mobility.walkingTolerance` | enum | 长期步行容忍度 | Soft / Constraint input |
| `mobility.noPublicTransit` | boolean | 明确不乘公共交通 | Hard when true |
| `mobility.noBus` | boolean | 明确不乘公交 | Hard when true |
| `mobility.noFerry` | boolean | 明确不乘船 / 渡轮 | Hard when true |

`mobility.walkingTolerance`：

```text
veryLow | low | standard | high | veryHigh
```

说明：

- 取代当前 UI 内部的 `lessWalking: boolean` 作为 canonical 事实；
- UI 的“少步行”可以映射为 `low`；
- 5 档有利于后续和 Engine 的 duration/load/fatigue 组合；
- 缺失仍表示“用户未设置”，不是自动等于 `standard`；默认由 5.13 决定。

### 7.2 Attraction / Activity — 6 keys

| Key | Type |
|---|---|
| `attractions.nature` | AttractionPreferenceLevel |
| `attractions.history` | AttractionPreferenceLevel |
| `attractions.culture` | AttractionPreferenceLevel |
| `attractions.art` | AttractionPreferenceLevel |
| `attractions.photography` | AttractionPreferenceLevel |
| `attractions.activityExperience` | AttractionPreferenceLevel |

`AttractionPreferenceLevel`：

```text
veryLike | like | neutral | dislike
```

冻结：**不允许持久化 `unset`**；未设置就是 key 不存在。

### 7.3 Experience — 1 key

| Key | Type | 语义 |
|---|---|---|
| `experience.photoExperience` | boolean | 是否明确偏好以摄影为目的的体验 |

它与 `attractions.photography` 不同：

- `attractions.photography`：喜欢“适合拍照”的景点；
- `experience.photoExperience`：喜欢“以摄影本身为活动”的体验。

### 7.4 Dining — 3 keys

| Key | Type / Enum |
|---|---|
| `dining.localCuisine` | `priority \| neutral \| notSpecial` |
| `dining.smallShops` | `like \| neutral \| notSpecial` |
| `dining.queueTolerance` | `low \| medium \| high` |

### 7.5 Accommodation — 3 keys

| Key | Type / Enum |
|---|---|
| `accommodation.transportConvenience` | `value \| neutral \| notSpecial` |
| `accommodation.comfort` | `value \| neutral \| notSpecial` |
| `accommodation.fewerHotelChanges` | `value \| neutral \| notSpecial` |

### 7.6 Budget — 3 keys

| Key | Type / Enum |
|---|---|
| `budget.spendingTendency` | `economical \| moderate \| flexible` |
| `budget.prioritizeAccommodation` | boolean |
| `budget.prioritizeExperience` | boolean |

冻结：

- 这里只表达长期消费倾向；
- **不存具体金额**；
- 具体旅行金额属于 Trip facts，并使用 `amountMinor + ISO currency`，不能存无币种裸字符串。

### 7.7 Interest — 3 keys

| Key | Type |
|---|---|
| `interests.likes` | `InterestCode[]` |
| `interests.dislikes` | `InterestCode[]` |
| `interests.details` | `Partial<Record<InterestCode, InterestDetailCode[]>>` |

约束：

1. likes / dislikes 各自去重；
2. 同一个 InterestCode 不能同时出现在 likes 和 dislikes；
3. details 每个 parent 内去重；
4. details 不能包含未知 parent 或未知 child code；
5. parent 明确处于 dislikes 时，不允许再保存其正向 detail selections；
6. 空数组是明确清空；整条 key missing 是未设置。

#### InterestCode

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

#### InterestDetailCode

```text
nature_scenery:
  mountain, coast, lake, forest, flower_field

history_culture:
  shrine_temple, castle, museum, historic_district

food:
  sushi, ramen, regional_cuisine, dessert, sake

photography:
  street_photography, landscape, nightscape, architecture, people_culture

onsen_wellness:
  ryokan_onsen, open_air_bath, forest_wellness, sea_view_onsen

art_museums:
  contemporary_art, traditional_crafts, architecture, design_exhibition

anime_entertainment:
  anime_pilgrimage, gaming, themed_cafe, merchandise

shopping:
  department_store, vintage, drugstore, local_specialties

urban_exploration:
  distinctive_neighborhood, architecture_walk, cafe, city_nightscape

outdoor_activity:
  hiking, cycling, skiing, water_activity

night_experience:
  izakaya, nightscape, performance, night_walk

family_activity:
  zoo, science_museum, family_crafts, park

traditional_experience:
  tea_ceremony, kimono, crafts, traditional_performance

theme_parks:
  major_theme_park, character_park, aquarium, immersive_exhibition

rural_towns:
  historic_town, fishing_village, countryside, local_market

seasonal_events:
  cherry_blossom, autumn_leaves, snow_scenery, festival, fireworks
```

这些 code 是 domain key；UI 可以继续显示当前中文文案。

### 7.8 Travel Style — 6 keys

全部为整数 1–5：

| Key | 1 | 5 |
|---|---|---|
| `style.pace` | 悠闲 | 紧凑 |
| `style.depth` | 打卡优先 | 深度体验 |
| `style.discovery` | 经典必去 | 当地小众 |
| `style.movement` | 定点游玩 | 一路移动 |
| `style.coverage` | 单城深玩 | 多地巡游 |
| `style.priority` | 预算优先 | 体验优先 |

冻结：

- 1–5 是用户表达档位，不是最终推荐算法权重；
- 7.9 / Engine 可做归一化，但不得反写原始用户值；
- missing ≠ 3；默认 3 属于 5.13 Preset / default policy。

### 7.9 v1.0 数量

```text
Mobility             5
Attraction/Activity  6
Experience           1
Dining               3
Accommodation        3
Budget               3
Interests            3
Travel Style         6
----------------------
Canonical Keys      30
```

这里的“30 keys”是 Preference Contract 的字段数量，与 Attraction/Profile 的“43 fields”不是同一个概念。

---

## 8. 为什么不直接把 43 字段全部变成 Preference

如果把 `family / senior / couple / solo / walking load / duration` 等都作为用户长期字段，会产生严重重复：

```text
用户说同行人里有老人
同时 Preference 又填 senior = high
景点本身又有 senior suitability
```

系统将无法判断谁是真实事实、谁是偏好、谁是计算结果。

正确模型：

```text
User Preference              我喜欢什么 / 能接受什么
Companion / Trip Context     这次谁一起去
Attraction Profile           这个景点是什么 / 负荷如何
Route / Schedule Facts       这次怎么走 / 停留多久
Engine                       将以上事实组合并判断
```

---

## 9. Main / Secondary / Tertiary UI 与数据映射

### 9.1 主界面

展示：

- 两个 Radar；
- 自然语言旅行画像；
- 6 张摘要卡。

这些全部是 **Derived View**，不直接存数据库。

### 9.2 二级快速设置

二级选项直接改 canonical key，或通过 5.13 Preset 一次修改多 key。

例如：

```text
“少换乘”
→ set mobility.fewerTransfers = true

“轻松优先”
→ 5.13 preset patch
→ set 多个真实字段
```

### 9.3 三级详细设置

三级页面只暴露需要精确控制的字段：

```text
InterestDetailCode[]
Walking tolerance
Hard transport exclusions
Queue tolerance
Accommodation priorities
...
```

三级 UI 可以更多，但仍不能自行创造未登记的 domain enum。

---

## 10. Patch 模型

冻结 patch 形态：

```json
{
  "schemaVersion": "1.0",
  "set": {
    "mobility.walkingTolerance": "low",
    "style.pace": 2
  },
  "unset": [
    "dining.queueTolerance"
  ]
}
```

规则：

1. 同一个 key 不能同时出现在 `set` 和 `unset`；
2. unknown key fail closed；
3. invalid enum fail closed；
4. patch 成功后整体 payload 再做完整校验；
5. API 不接受客户端自报 owner id；
6. 5.16 使用 revision CAS，防止跨设备覆盖。

---

## 11. Database Constraints / Security

### 11.1 RLS

仅当前 authenticated user 可以：

- SELECT 自己的 Preference；
- INSERT 自己的 Preference；
- UPDATE 自己的 Preference。

客户端不直接 DELETE Preference Root；“重置偏好”通过写回空 envelope 完成。

账户删除时：

```text
auth.users delete
→ ON DELETE CASCADE
→ travel_preferences delete
```

### 11.2 Payload Size

冻结上限：

```text
64 KiB
```

Preference 不是日志、AI conversation 或任意文本容器。

### 11.3 不存敏感推断

5.11 不保存系统推断出的：

- 疾病 / 医疗诊断；
- 宗教；
- 种族 / 民族；
- 政治属性；
- 其他受保护属性。

如果未来支持饮食限制、无障碍等，只保存用户明确提供的**功能性旅行需求 code**，不保存或推断其背后的健康 / 宗教原因。

---

## 12. Versioning

### 12.1 v1.0

本设计的 30 canonical keys。

### 12.2 Additive change

新增 optional key 仍需显式发布新 Contract 版本，例如：

```text
1.0 → 1.1
```

不能让旧严格 parser 突然收到未知 key。

### 12.3 Breaking change

重命名、删除、改变值语义：

```text
1.x → 2.0
```

必须提供 migrator / fixtures / Consumer review。

### 12.4 DB 与 Contract Version 分离

新增 Preference key 通常不需要改变 `travel_preferences` 表结构；
但仍需要更新：

- canonical parser；
- DB validation；
- fixtures；
- migration / upgrade function；
- 5.14 Consumer Contract；
- UI adapter。

---

## 13. 对 Draft PR #221 的处理决定

#221 不能直接丢弃，也不能直接合并。

### 13.1 保留

以下方向保留：

- 一用户一 `travel_preferences` root；
- strict versioned JSONB；
- `revision`；
- owner-only RLS；
- 64 KiB 限制；
- sparse set/unset patch；
- Snapshot / Override 分离；
- Snapshot 不随长期 Preference 后续变化而改写；
- Override 不回写长期 Preference；
- authenticated owner 从可信 Session 获取，不读客户端 owner。

### 13.2 需要修改

#221 当前候选实现需要按 5.11 设计修正：

1. 删除 canonical `mobility.preset`；Preset 归 5.13。
2. `mobility.lessWalking:boolean` 改为 `mobility.walkingTolerance` 五档；UI 用 adapter 兼容当前“少步行”。
3. Attraction level 去掉持久化 `unset`；missing 才是未设置。
4. `interests.likes/dislikes` 从中文 UI label 改成稳定 InterestCode。
5. 新增 `interests.details` typed mapping，解决当前 #221 明确缺失的兴趣细分持久化。
6. 任何现有本地 UI 默认值都不能在首次登录时自动写入长期 Preference。
7. #221 仍不得因此被当作 5.14 / 5.16 / 5.18 整体完成；实际 WBS 按独立 Task 验收。

由于 #221 尚未合入生产基线，本轮属于**候选分支修正**，不是线上数据 migration。

---

## 14. 5.11 与 5.13 / 5.14 / 5.16 的责任切分

### 5.11 — Schema

负责：

- canonical keys；
- type / enum；
- missing/null/empty 语义；
- DB root shape；
- version；
- constraints；
- RLS ownership boundary；
- patch semantics 基础。

### 5.13 — Preset / Default

负责：

```text
新用户默认体验
轻松优先
平衡
效率优先
其他预设
```

并把 Preset 转为 5.11 patch。

**5.13 不新增第二套 Preference 字段。**

### 5.16 — Persistence API

负责：

- get/update/reset；
- revision CAS；
- auth；
- API error；
- cross-device consistency；
- UI wiring。

### 5.14 — Planner-readable Contract

负责从 5.11 内部数据发布最小稳定跨模块读取面。

A Planner 不应直接：

- 查询 `travel_preferences` 表；
- import B 的 React/UI model；
- 解析 DB JSONB；
- 依赖 Preference 页面内部组件 state。

---

## 15. 读取与覆盖优先级

5.11 只冻结数据层级，不冻结最终推荐算法。

推荐后续统一优先级：

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

注意：

- `missing` 才会继续向下继承；
- 用户明确 `false` / `neutral` 不得被默认值覆盖；
- Engine 的可行性硬限制优先于推荐偏好，但必须给出解释，而不是静默丢条件。

---

## 16. Radar / Portrait 的计算边界

Personal Center 的两个 Radar 不保存。

### Attraction Radar

```text
自然 / 历史 / 人文 / 艺术 / 摄影 / 活动体验
```

直接从：

- `attractions.*`；
- 必要时辅以 `interests.*`；

生成展示值。

### Travel Style Radar

```text
轻松 / 经典 / 计划 / 探索 / 参与 / 深度
```

由 `style.*` + 其他已设置长期偏好派生。

Radar normalization、自然语言摘要规则不属于 5.11 的持久化字段。

---

## 17. Reset 语义

“重置偏好”不是删除用户数据表，而是：

```text
payload = {
  schemaVersion: "1.0",
  values: {}
}
revision = revision + 1
```

然后 5.13 的 default policy 决定 UI / Planner 的 fallback。

这样可以清晰区分：

```text
用户无明确长期偏好
vs
用户明确选择 neutral / false
```

---

## 18. 5.11 实装验收标准

后续 Codex Task 至少必须覆盖：

- [ ] `travel_preferences` 一用户一行；owner FK cascade。
- [ ] RLS owner-only；anon 无 CRUD。
- [ ] 30 个 v1.0 canonical key 完整 parser。
- [ ] unknown key fail closed。
- [ ] missing / false / neutral / [] 语义测试。
- [ ] 不允许持久化 attraction `unset`。
- [ ] InterestCode / InterestDetailCode 使用稳定 code，不使用中文 label 作为 domain enum。
- [ ] likes / dislikes 冲突拒绝。
- [ ] details parent/child 验证与去重。
- [ ] `mobility.walkingTolerance` 5 档。
- [ ] 不持久化 `mobility.preset`。
- [ ] payload ≤ 64 KiB。
- [ ] versioned envelope。
- [ ] revision > 0。
- [ ] empty Preference 合法。
- [ ] UI Mock/default 不会在未确认时写入长期 Preference。
- [ ] #221 可复用部分逐项审计，不 blind cherry-pick。
- [ ] 不启动 5.13 / 5.14 / 5.16 的完整业务。
- [ ] 不修改 A Planner / Engine / Trip Plan schema。

---

## 19. 本轮冻结结论

### 冻结

1. Preference = 用户长期明确偏好，不是 Trip facts / UI state / Attraction facts。
2. 一用户一 root + strict versioned sparse JSONB。
3. missing 是唯一 canonical “未设置”语义。
4. Preset 不存；5.13 转 patch。
5. UI label 不作为 domain enum。
6. `walkingTolerance` 使用 5 档，取代 canonical `lessWalking:boolean`。
7. v1.0 30 canonical keys。
8. 16 个 Interest 使用稳定 code，并支持 typed detail selections。
9. Trip Snapshot / Override 与长期 Preference 分离。
10. 43 Attraction/Profile/Rule fields 不复制到 Preference；后续由 5.14 / 7.9 / Engine 映射组合。
11. Companion / Party 适配维度由 5.12 / Trip context 提供，不冗余存成 Preference。
12. DB 内部模型不等于 5.14 Public Contract。

### 暂不纳入 v1.0，留给后续版本

以下方向已有产品价值，但不在 v1.0 为了“凑字段数”提前冻结：

- 台阶 / 上坡的独立长期 tolerance；
- 天气敏感度；
- 行李移动敏感度；
- 到达日 / 离境日强度；
- 早起 / 深夜活动容忍度；
- 更细的饮食限制；
- 酒店星级 / 房型；
- 具体金额预算；
- AI 自动学习出的隐式偏好。

它们应在有明确 UI、业务语义、隐私边界和 Consumer 需求后，通过 `1.1+` 增量发布。

---

## 20. 推荐后续顺序

```text
5.11 Preference Schema 设计确认
        ↓
生成独立 5.11 Codex Task
        ↓
审计并复用 #221 合理子集
        ↓
Schema / parser / migration / DB tests
        ↓
用户验收 + 合入 develop
        ↓
5.13 Preset / Default
        ↓
5.16 Persistence API / 页面接线
        ↓
5.14 Public Preference Contract
        ↓
A 4.18 Planner 消费
        ↓
7.9 Recommendation / 6.5 AI / Engine context
```

---

## 21. 一句话架构

> **5.11 保存“用户长期明确喜欢什么、能接受什么”，43 字段保存“景点是什么、负荷如何”，Companion / Trip 保存“这次谁去、什么条件”，Engine 再把这些事实组合起来判断和推荐。**
