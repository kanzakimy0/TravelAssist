# TravelAssist Preference State / Merge Contract v0.1

> 日期：2026-09-10  
> 状态：Freeze Candidate / 待 Consumer Review  
> 分支：`design/a-trip-engine-poi-ai-architecture-v2`  
> 关联设计：`trip-engine-poi-ai-provider-design-v0.3.md`、`poi-feature-preference-codebook-v0.1.md`、`trip-plan-contract.md`  
> 关联既有持久化候选：TASK-017-B / PR #221 `step-preference-persistence.md`  
> 本文件冻结候选范围：长期偏好、Trip Snapshot、Trip Override、Runtime Context、Hard Constraint 的生命周期与合并规则，以及 1–9 / 5=中性 / omit-5 的持久化边界。  
> 本文件不修改 Master Code，不定义最终 Scoring 权重，不直接修改 TASK-017-B 的 SQL / TypeScript 实现。

---

# 1. 核心结论

TravelAssist 不应只有一个“Preference”对象。

正式区分五层：

```text
Long-term Preference
        ↓ snapshot at trip creation
Trip Preference Snapshot
        ↓
Trip Override
        ↓
Effective Preference
        +
Runtime Context
        +
Hard Constraint
        ↓
Trip Planning Engine
```

核心原则：

> **长期偏好回答“我平时喜欢什么”；Snapshot 回答“创建这次旅行时我默认喜欢什么”；Override 回答“这次旅行我特别想怎么改”；Runtime Context 回答“现在客观是什么情况”；Hard Constraint 回答“什么绝对不能违反”。**

这些层不得互相覆盖身份。

---

# 2. 与既有 TASK-017-B 的关系

TASK-017-B 已提出并部分实现：

```text
travel_preferences
trip_drafts
trip_preference_snapshots
trip_preference_overrides
```

其中以下边界继续保留：

- 一用户一个长期 Preference 根；
- 新 Trip / Draft 创建时复制当时长期偏好形成 Snapshot；
- Snapshot 不可变；
- Override 为当前 Trip 的稀疏覆盖层；
- 更新长期偏好不重写已有 Snapshot；
- 更新 Override 不回写长期偏好；
- 导入别人行程不得导入对方长期 Preference。

本设计是在这些正确边界上补充新的 43 维 Feature / Sparse Preference 1–9 语义。

重要兼容规则：

> TASK-017-B 当前候选 `PreferenceV1` 含 30 个 key，且部分风格滑轨仍为 1–5。不得把旧 V1 数据在没有迁移版本的情况下原地重新解释为新的 1–9。

---

# 3. 五层状态定义

## 3.1 Long-term Preference

长期默认旅行偏好，属于用户本人。

典型来源：

- Personal Center Preference Center 明确保存；
- 用户明确对 AI 表达“以后都这样”“我平时更喜欢……”并要求保存；
- 未来用户确认过的 Preference Learning Proposal。

不应包含：

- 本次旅行日期；
- 当前天气；
- 本次同行人数量；
- 某一餐厅预约；
- 当前行程实时状态；
- 单次旅行临时限制。

长期偏好是默认值，不是本次旅行事实。

## 3.2 Trip Preference Snapshot

创建新 Trip / Draft 时，从当时的 Long-term Preference 复制得到。

规则：

```text
Trip created at T1
Long-term revision = 12
↓
Snapshot stores revision 12 values
```

之后即使：

```text
Long-term revision 12 → 13 → 14
```

已有 Trip Snapshot 仍保持 revision 12 对应的内容。

Snapshot 是不可变旅行基线。

## 3.3 Trip Override

只影响当前 Trip。

例如：

```text
平时 walking=6
这次带老人 walking=2
```

应保存：

```text
Snapshot walking=6
Override walking=2
```

而不是修改 Long-term Preference。

Override 必须是稀疏层：只保存与 Snapshot 不同、或用户明确需要覆盖的值。

## 3.4 Runtime Context

由本次旅行当前事实动态产生，不属于用户 Preference 持久化层。

例如：

```text
party = 2 adults + 1 child
season = autumn
weather = rain
currentTime = 15:20
currentLocation = Kyoto
fatigueState = elevated
```

Runtime Context 可以改变：

```text
dayFit
weatherFit
routeFit
currentSuitability
```

但不得反向写入长期偏好。

## 3.5 Hard Constraint

不可被软评分覆盖的限制。

例如：

```text
必须轮椅可达
不能爬楼梯
13:00 已预约餐厅
18:00 必须到酒店
某活动已付款锁定
某交通方式明确禁止
```

Hard Constraint 在 Candidate / Scoring 之前或期间 fail closed。

> Hard Constraint 优先于所有软 Preference，但“优先”是执行约束，不代表它把 Preference 数值改掉。

---

# 4. 1–9 持久化语义

新的 Sparse Preference 数值语义：

```text
1 = 很低 / 强烈不偏好 / 很低容忍
2 = 低
3 = 较低
4 = 略低
5 = 中性
6 = 略高
7 = 较高
8 = 高
9 = 很高 / 强烈偏好 / 高容忍
```

注意：具体含义仍由 Feature Kind 决定。

例如：

```text
photo=9
```

表示摄影价值非常重要。

```text
walking=2
```

表示步行负担容忍度低。

```text
crowd=2
```

表示拥挤容忍度低。

`walking=9` 不表示“越走越好”，只表示能接受较高步行负担。

---

# 5. `5 = 中性` 与 `未设置` 必须区分

这是本 Contract 最重要的持久化规则之一。

数据库 / Domain State 中：

```text
missing / unset
≠
explicit value 5
```

含义：

```text
missing
= 这一层没有意见 / 继承下层 / 使用默认

5
= 用户明确要求中性
```

例如：

```text
Snapshot food=9
```

如果 Trip Override：

```text
food missing
```

则 Effective：

```text
food=9
```

如果 Trip Override：

```text
food=5
```

则 Effective：

```text
food=5
```

这意味着用户明确把本次旅行的美食偏好恢复到中性。

因此：

> **持久化层不能为了省空间自动删除值 5。**

---

# 6. omit-5 只属于 AI Compact Context

`5` 可以省略的地方是：

```text
Effective Preference
↓
AI Input Adapter
↓
Sparse Compact Projection
```

因为在进入 AI 之前，Snapshot + Override 已经完成合并。

示例：

```text
Long-term:
04 photo=8
05 food=9
25 walking=4
27 crowd=3

Snapshot:
04=8,05=9,25=4,27=3

Trip Override:
05=5
25=2
```

Effective：

```text
04=8
05=5
25=2
27=3
```

AI Compact：

```text
P=4:8,25:2,27:3
```

`05=5` 在 AI Context 中省略是安全的，因为它已经成功覆盖了 Snapshot 的 `05=9`。

禁止：

```text
先 omit-5
再 Merge
```

正确顺序：

```text
Merge
↓
Resolve
↓
Task Projection
↓
omit-5
↓
AI
```

---

# 7. Merge 优先级

Preference 层的值合并优先级：

```text
Trip Override
>
Trip Preference Snapshot
>
Product / Engine Default
```

其中：

- Long-term Preference 不直接参加已创建 Trip 的实时 Merge；它只在创建 Snapshot 时被复制；
- Runtime Context 不覆盖 Preference value，而是作为独立 Engine 输入；
- Hard Constraint 不覆盖 Preference value，而是作为强约束执行。

因此完整计算不是：

```text
Override > Runtime > Snapshot > Long-term
```

而是：

```text
EffectivePreference = Snapshot ⊕ Override

PlanningInput =
EffectivePreference
+ RuntimeContext
+ HardConstraints
+ ProviderFacts
```

---

# 8. Product Default 的边界

当 Snapshot 与 Override 都没有某个用户可设偏好时，Engine 可以使用产品默认值。

推荐默认心智模型：

```text
Preference numeric default = 5
```

但 Product Default：

- 不是用户保存的数据；
- 不写入 Long-term Preference；
- 不冒充用户选择；
- 可以随 Engine Config / 版本调整；
- Decision Trace 必须能区分 `user_value` 与 `default_value`。

因此：

```text
missing
```

可以在 Effective Runtime View 中解析为：

```text
value=5
origin=default
```

但数据库仍保持 missing。

---

# 9. 推荐 Effective Preference 输出

Planning Engine 不应只拿一个没有来源的信息 Map。

建议逻辑输出：

```text
EffectivePreferenceV1
{
  values,
  origins,
  snapshotRef,
  overrideRevision
}
```

概念示例：

```text
values:
  04: 8
  05: 5
  25: 2
  27: 3

origins:
  04: snapshot
  05: override
  25: override
  27: snapshot
```

未设置值如需 materialize：

```text
origin=default
```

这样后续可以回答：

> “为什么这次行程减少步行？”

而不需要猜当前数值来自哪里。

---

# 10. Preference 与 43 维 Feature Space 的关系

43 维是 POI Feature Space，不等于 43 个长期 Preference 字段。

必须增加一层：

```text
Preference Binding / Projection
```

它负责把：

```text
UI / AI Intent / User Preference
```

映射到：

```text
POIFeatureV1 codes
```

例如：

```text
用户：很喜欢拍照
→ preference photo=9
→ Feature code 04
```

但是：

```text
Trip 日期在秋天
→ season context=autumn
→ 匹配 Feature code 42
```

不得保存为：

```text
Long-term autumn=9
```

同理：

```text
有儿童同行
→ Party Context
→ family suitability target
```

而不是自动修改长期 `family` 偏好。

### 10.1 推荐 Binding 元数据

每个可映射维度未来应声明：

```text
longTermAllowed
tripOverrideAllowed
runtimeDerived
hardConstraintEligible
```

这样 UI、AI、Engine 共用同一份映射规则。

---

# 11. AI 写入权限

AI 不得因为“推断到用户可能喜欢”就直接修改长期 Preference。

## 11.1 AI 可以直接转换的情况

用户在当前 Trip 中明确说：

> “这次不要走太多路。”

可转换为：

```text
Trip Override walking=2/3
```

具体数值映射由 Intent Normalizer / UI Contract 决定。

## 11.2 AI 可以请求长期保存的情况

用户明确说：

> “以后旅行都尽量少走路。”

可以产生：

```text
Long-term Preference Patch
source=user_explicit_via_ai
```

这是用户直接指令，不属于 AI 自主学习。

## 11.3 模糊表达默认只影响当前 Trip

例如用户在 Planner 中说：

> “我不喜欢排队。”

若没有明确“以后 / 平时 / 保存到偏好”的持久化意图，默认：

```text
Trip Override
```

而不是永久修改 Personal Center。

产品可以提示：

```text
“要同时保存为您的长期偏好吗？”
```

## 11.4 AI 推断不得直接持久化

例如系统发现：

```text
连续 5 次用户都删除购物景点
```

只能形成：

```text
PreferenceLearningProposal
```

不能直接把：

```text
shopping=2
```

写入 Long-term Preference。

---

# 12. Trip 完成后的学习规则

Trip 完成后可以生成学习证据：

```text
acceptedRecommendations
removedItems
manualAdds
repeatedOverrides
ratings / feedback
```

这些属于：

```text
Preference Evidence
```

不是 Preference 本身。

推荐流程：

```text
Trip Evidence
↓
Learning / Analysis
↓
PreferenceLearningProposal
↓
User Accept / Edit / Reject
↓
Long-term Preference Patch
```

第一阶段禁止：

```text
Trip completed
↓
automatically rewrite Long-term Preference
```

---

# 13. Reset / Neutral / Inherit 三种操作

UI 与 API 必须区分三种行为。

## 13.1 Set Neutral

```text
set key = 5
```

含义：当前层明确中性。

## 13.2 Inherit / Remove Override

```text
unset override key
```

含义：恢复 Snapshot。

例如：

```text
Snapshot photo=9
Override photo=5
```

执行：

```text
unset override photo
```

结果重新变为：

```text
photo=9
```

## 13.3 Reset Long-term

删除长期层该 key：

```text
Long-term key -> missing
```

对未来 Trip 使用 Product Default；已有 Trip Snapshot 不变。

---

# 14. Snapshot 不允许静默刷新

当用户修改长期偏好后，已有 Trip 不自动跟随。

例如：

```text
Trip A Snapshot created at revision 10
Long-term updated to revision 14
```

Trip A 仍使用 revision 10 基线。

如果未来需要“把当前长期偏好应用到已有 Trip”，不得直接改不可变 Snapshot。

候选方案：

```text
A. 生成一组 bulk Trip Overrides
B. 新建 versioned preference baseline / rebase operation
```

v0.1 不冻结 rebase 写入协议。

在没有正式协议前：

> **禁止静默重建或覆盖 Snapshot。**

---

# 15. 同行人 / Party Context

同行人不是 owner 的长期偏好覆盖项。

例如：

```text
用户平时 adventure=8
本次带老人
```

系统不应该自动把：

```text
Long-term adventure=3
```

而应：

```text
Effective Preference: adventure=8
Party Context: senior present
Hard / Soft mobility needs: current trip only
```

Planning Engine 在 Scoring 阶段综合。

如果未来同行人拥有自己的 Preference Profile：

```text
Traveler A Preference
Traveler B Preference
Traveler C Preference
```

应生成派生的：

```text
PartyPreferenceView
```

不得把多人的值永久平均后写回 owner Profile。

多人如何聚合留给 `poi-scoring-spec-v0.1.md` 冻结。

---

# 16. Hard Constraint 与 Soft Preference 冲突

示例：

```text
Preference:
adventure=9

Constraint:
no_stairs=true
```

不能因为 adventure 高就违反 no_stairs。

正确：

```text
Hard Filter
↓
剩余合法候选
↓
Preference Score
```

如果硬约束导致无合法候选：

```text
NO_VALID_CANDIDATE
```

并向用户解释哪个约束造成冲突。

禁止静默降低 Hard Constraint。

---

# 17. 同一层的并发与冲突

Preference State 必须使用 revision / optimistic concurrency。

例如：

```text
Device A reads revision 12
Device B reads revision 12
Device A writes → revision 13
Device B writes based on 12
```

Device B 必须：

```text
409 / revision conflict
```

不得 last-write-wins 静默覆盖。

AI 与 UI 同时修改同一 Trip Override 时同样适用。

AI 不拥有比用户 UI 更高的写优先级。

---

# 18. Provenance

至少需要能区分写入来源：

```text
user_ui
user_explicit_via_ai
user_confirmed_ai_proposal
legacy_migration
system_default
```

禁止把：

```text
ai_inferred
```

直接作为长期 Preference 的持久化最终来源。

Effective View 至少要暴露：

```text
originLayer:
snapshot / override / default
```

详细字段级审计是否单独建 Event / Audit 表由实现任务决定。

---

# 19. Legacy PreferenceV1 → 1–9 的兼容策略

TASK-017-B 当前候选 `PreferenceV1` 不是本设计的 1–9 wire schema。

未来升级时必须发布显式新版本，例如：

```text
PreferenceV1 旧 30-key / 1–5 + categorical
↓ migration adapter
PreferenceV2 1–9 / 新 Binding
```

不得：

```text
schemaVersion="1.0"
但偷偷把 3 的含义从旧中档变成新 1–9 的偏低
```

## 19.1 旧 1–5 数值候选映射

对于语义对称、明确为五档程度的旧数值字段，可使用：

```text
1 → 1
2 → 3
3 → 5
4 → 7
5 → 9
```

即：

```text
new = 2 * old - 1
```

优点：

- 旧中值 3 精确映射到新中值 5；
- 保留高低方向；
- 不制造虚假精度。

## 19.2 不能统一数值映射的字段

以下必须逐项 adapter：

```text
boolean
preset
categorical level
likes / dislikes arrays
budget enum
transport prohibitions
```

禁止：

```text
false → 1
true → 9
```

这种无语义依据的通用转换。

---

# 20. Persistence Ownership

推荐继续沿用 TASK-017-B 的四层所有权：

```text
travel_preferences
→ Long-term Preference

trip_preference_snapshots
→ immutable Trip baseline

trip_preference_overrides
→ sparse current-trip override

trip_drafts / Trip facts
→ Runtime-related trip facts / anchors
```

Hard Constraint 进入 Trip Draft / Trip Contract / Constraint-owned结构，不应塞进通用 Preference JSON 里。

`EffectivePreference` 是派生视图：

> **不作为新的权威数据库根。**

如果未来为了性能缓存 EffectivePreference，该缓存必须可从 Snapshot + Override 重建，并绑定 revision。

---

# 21. AI Compact Context

AI Input Adapter 应把不同来源明确分开：

```text
P = effective user preference
C = runtime context
H = hard constraints
```

示例：

```text
P=4:8,25:2,27:3
C=party:2A1C,season:autumn,wx:rain
H=booking:r3@13:00,no_stairs
```

不要把：

```text
season=autumn
```

伪装成：

```text
P=42:9
```

这样可以避免 Preference 与事实混淆，也能减少重复 Token。

---

# 22. 推荐 Merge 算法

概念伪代码：

```text
function resolvePreference(snapshot, override, defaults):
    validate(snapshot)
    validate(override)

    keys = union(snapshot.keys, override.keys, defaults.keys)

    for key in keys:
        if override.has(key):
            value[key] = override[key]
            origin[key] = "override"
        else if snapshot.has(key):
            value[key] = snapshot[key]
            origin[key] = "snapshot"
        else:
            value[key] = defaults[key] ?? 5
            origin[key] = "default"

    return { value, origin }
```

然后：

```text
PlanningInput = {
  effectivePreference,
  runtimeContext,
  hardConstraints,
  providerFacts
}
```

AI Compact：

```text
project task-relevant keys
↓
omit value == 5
↓
encode Local / short field form
```

---

# 23. 生命周期示例

## 23.1 创建旅行

```text
Long-term revision 7
photo=8
food=9
walking=5
↓
Create Trip
↓
Snapshot revisionSource=7
photo=8
food=9
walking=5
↓
Override={}
```

AI 输入：

```text
P=4:8,5:9
```

walking=5 省略。

## 23.2 本次旅行临时修改

用户说：

> 这次少走一点，也不用特别安排美食。

Override：

```text
walking=2
food=5
```

Effective：

```text
photo=8
food=5
walking=2
```

AI：

```text
P=4:8,25:2
```

## 23.3 恢复继承

用户点击“恢复默认美食偏好”：

```text
unset Override food
```

Effective：

```text
food=9
```

## 23.4 修改长期偏好

用户在 Personal Center 把：

```text
photo 8 → 6
```

已有 Trip 不变。

新建 Trip 才复制：

```text
photo=6
```

---

# 24. UI 行为要求

UI 必须表达清楚：

```text
长期默认
当前旅行覆盖
继承默认
明确中性
硬限制
```

至少不能把以下两件事做成同一个操作：

```text
“设为一般 / 中性”
“恢复默认”
```

因为：

```text
中性 = override 5
恢复默认 = unset override
```

Personal Center 的“重置偏好”同样是删除长期用户值，不是写大量 `5`，除非产品明确设计为“全部设中性”。

---

# 25. 安全 / 隐私边界

- 不从 UI 接受 owner ID 作为授权；
- 长期 Preference 只在可信 Auth 边界持久化；
- AI Context 不需要携带 owner ID；
- AI 不应获得数据库 revision 之外的敏感账户元数据；
- Accessibility / Party Needs 等需要谨慎区分 Trip Context 与长期用户 Profile；默认不得因为一次旅行自动写入长期画像；
- 行为学习数据与已确认 Preference 应分开。

---

# 26. Freeze Candidate 决策

本 v0.1 建议冻结以下语义：

1. Long-term / Snapshot / Override / Runtime / Constraint 五层分离；
2. Snapshot 创建后不可变；
3. 当前 Trip 修改默认只进 Override；
4. Long-term 更新不反写旧 Snapshot；
5. Preference 1–9，`5` 为有效显式中性值；
6. persistent `5` 不得自动省略；
7. missing 与 explicit `5` 不同；
8. AI omit-5 只能在 Effective Merge 之后发生；
9. Override > Snapshot > Product Default；
10. Runtime Context 与 Hard Constraint 不并入 Preference value；
11. AI 推断不得自动写长期 Preference；
12. Trip 行为学习先生成 Proposal，用户确认后才能写长期 Preference；
13. legacy 1–5 必须显式版本迁移，不能原地重解释；
14. EffectivePreference 是派生视图，不是第二个权威数据根；
15. revision conflict 必须 fail closed，不能静默 last-write-wins。

---

# 27. 仍留给后续规格的内容

以下不在本文件写死：

```text
1–9 → Scoring 权重函数
多人 Preference 聚合算法
walking / crowd tolerance penalty 曲线
Preference Binding 的完整 UI key 列表
43 维哪些允许长期保存的最终 registry
PreferenceV2 最终 TypeScript wire schema
Migration SQL
Learning Proposal UI
AI Intent → 1–9 的具体自然语言映射阈值
```

分别由：

```text
poi-scoring-spec-v0.1.md
Preference Contract implementation task
AI Intent / Compact Context task
```

继续冻结。

---

# 28. 一句话定义

> **TravelAssist 的 Preference State 不是一份会不断被覆盖的用户参数，而是“长期默认 → 不可变旅行快照 → 当前旅行稀疏覆盖”的版本化软偏好，再与 Runtime Context 和 Hard Constraint 在规划时组合；这样一次旅行的临时需求不会污染长期画像，AI 也不能未经用户确认永久改变用户。**
