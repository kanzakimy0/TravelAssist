# TravelAssist — WBS 5.12 Companion Schema 设计书

> 文档版本：v0.1 / Schema Freeze Candidate  
> 日期：2026-09-11  
> WBS：5.12 — Companion Schema  
> Owner：B / Personal Center / Companion Data  
> 依赖：1.26 已完成；8.1 已完成  
> 设计基线：`origin/develop@f10aded716719eabc94b81d9a3104b386c640946`  
> 当前状态：**Schema 设计候选；5.12 实装 Task 尚未启动**  
> 后续：5.17 Companion 持久化 API；5.18 Trip Companion Snapshot；8.6 B Personal Center Migration

---

## 1. 本版结论

5.12 只保存：

> **用户长期维护、可跨旅行复用的“非本人同行人资料 + 旅行相关功能性需求 + 常用出行组合”。**

本版冻结候选：

1. **本人不建立 Companion 数据库行。**本人卡由 Profile / Preference 投影。
2. Companion Master 只保存非本人长期旅伴。
3. 数据库三张表：
   - `companions`
   - `companion_groups`
   - `companion_group_members`
4. 基础身份用关系型列；旅行需求使用严格版本化 `travel_profile jsonb`。
5. DOB 与年龄层不双写：有 DOB 就派生年龄；无 DOB 才存 fallback age group。
6. 不根据儿童 / 长者 / 性别自动推断行动能力、无障碍、饮食等需求。
7. v1 只存功能性旅行需求 code，不存疾病、诊断、宗教原因。
8. 当前 UI 的 `diningNote` / `privateNote` 不进入 v1 DB。
9. 常用组合用 `includes_owner` 表示本人，不使用 `self-*` 假 Companion ID。
10. Trip 使用独立 Snapshot；修改 / 删除长期 Companion 不改历史旅行。

---

## 2. 为什么不能直接把 5.6 ViewModel 落库

当前 UI 近似：

```ts
CompanionViewModel {
  id
  displayName
  relationship
  dateOfBirth?
  ageGroup
  gender?
  avatarUrl?
  mobilityNeeds[]
  diningNeeds[]
  activityPreferences[]
  diningNote?
  privateNote?
  isSelf?
}
```

这是 Presentation / localStorage 模型，不是 DB Contract。

### 2.1 `isSelf` 会复制 Profile

如果创建 `companions.is_self=true`，会出现：

```text
profiles.birth_date = A
companions.birth_date = B
```

因此：

```text
本人 = Virtual Member
不是 companion row
```

### 2.2 中文 label 不能当 Domain Code

```text
少步行       -> reduce_walking
减少楼梯     -> reduce_stairs
需要婴儿车   -> stroller
素食         -> vegetarian
喜欢博物馆   -> museums
```

### 2.3 DOB + ageGroup 会过期

当前若保存：

```text
dateOfBirth = 2018-04-18
ageGroup = child
```

几年后 DOB 仍正确，`child` 已可能错误。

### 2.4 自由文本存在敏感信息风险

`diningNote/privateNote` 可能被写入病名、药物、过敏、宗教等；v1 暂不持久化。

---

## 3. 数据分层

```text
Auth / Profile
   │ virtual self
   ↓
Companion Master 5.12
   │ selected
   ↓
Trip Companion Snapshot
   │ + Trip-only override
   ↓
Planner / Engine
```

同时：

```text
User Preference 5.11 = 用户本人长期旅行偏好
Companion 5.12       = 非本人同行人的长期旅行资料
```

两者不能合并成一张事实表。

---

## 4. “本人”模型

### 4.1 本人不进入 `companions`

本人基础资料来自 `profiles`：

- display name
- birth date
- gender
- avatar

### 4.2 常用组合包含本人

不保存：

```text
companion_id = self-yuki
```

而是：

```text
includes_owner = true
```

例如：

```text
家庭出游
includes_owner = true
members = [Haru, Sora]
```

### 4.3 本人自己的需求

5.12 不建立第二套本人需求 Master。

未来接线：

```text
本人基础资料       -> 5.15 Profile API
本人长期 Preference -> 5.16 Preference API
本次临时需求       -> Trip layer
```

当前 5.6 UI 的本人编辑器后续必须做 adapter，不能写进 `companions`。

---

## 5. 数据库拓扑

```text
auth.users
   │
   ├───────────────┐
   ↓               ↓
profiles        companions
                   │
                   ↓
          companion_group_members
                   ↑
                   │
            companion_groups
```

v1 新增：

```text
public.companions
public.companion_groups
public.companion_group_members
```

不新增：

```text
self_companions
medical_profiles
trip_companion_snapshots   # 5.18 / 后续
```

---

## 6. `companions` 表

```text
companions
├─ id                    uuid PK
├─ owner_user_id         uuid NOT NULL -> auth.users ON DELETE CASCADE
├─ display_name          text NOT NULL
├─ relationship_code     text NULL
├─ relationship_label    text NULL
├─ birth_date            date NULL
├─ age_group_fallback    text NULL
├─ gender_code           text NULL
├─ avatar_path           text NULL
├─ travel_profile        jsonb NOT NULL
├─ revision              integer NOT NULL
├─ created_at            timestamptz NOT NULL
└─ updated_at            timestamptz NOT NULL
```

### 字段语义

| 字段 | 必填 | Planner 输入 | 说明 |
|---|---:|---:|---|
| `display_name` | 是 | 展示 | 昵称 / 称呼 |
| `relationship_code` | 否 | 否 | 稳定分类 |
| `relationship_label` | 否 | 否 | 自定义展示称呼 |
| `birth_date` | 条件 | 是 | 用户主动提供 |
| `age_group_fallback` | 条件 | 是 | 无 DOB 时使用 |
| `gender_code` | 否 | **否** | 仅展示 |
| `avatar_path` | 否 | 否 | Storage path |
| `travel_profile` | 是 | 是 | 功能性旅行信息 |
| `revision` | 是 | 否 | CAS / 并发 |

---

## 7. Relationship

v1 stable code：

```text
family
partner
friend
colleague
other
```

允许：

```text
relationship_code = family
relationship_label = 母亲
```

Relationship 不参与 Planner 推断。

---

## 8. Gender

v1 可选 code：

```text
female
male
other
```

NULL = 未填写。

冻结：

- 只有用户主动填写才保存；
- 不用于推荐、活动、购物等偏好推断；
- Provider / Booking 如需证件性别，必须进入 Passenger / Booking Domain。

---

## 9. DOB 与 Age Group

### 模式 A：有 DOB

```text
birth_date = 2018-04-18
age_group_fallback = NULL
```

### 模式 B：不提供 DOB

```text
birth_date = NULL
age_group_fallback = child
```

DB 必须保证：

```text
birth_date XOR age_group_fallback
```

两者不能同时成为事实源。

### Planning age band

```text
0–2   -> infant
3–17  -> child
18–64 -> adult
65+   -> senior
```

这只是 TravelAssist 通用规划分类，不是机票、铁路、酒店、门票的票价规则。

如果 Trip 有精确出发日：

```text
age = ageAt(trip.departure)
```

长期 Master 不保存派生年龄。

---

## 10. 不从年龄推断特殊需求

即使：

```text
age_group = infant
```

也不能自动写：

```text
stroller
child_seat
more_rest
```

即使：

```text
age_group = senior
```

也不能自动写：

```text
reduce_walking
accessible_route
```

功能性需求只能来自用户明确输入。

---

## 11. `travel_profile` JSONB

v1：

```json
{
  "schemaVersion": "1.0",
  "mobilityNeeds": [],
  "diningNeeds": [],
  "activityInterests": []
}
```

规则：

- strict envelope；
- unknown key reject；
- duplicate code reject；
- JSON null reject；
- payload <= 8 KiB；
- runtime parser + SQL validator 双重校验。

空数组表示：

> 当前没有明确保存的信号。

不表示系统确认“绝对没有任何需求”。

---

## 12. MobilityNeedCode

```text
reduce_walking
reduce_stairs
stroller
child_seat
accessible_route
more_rest
```

| Code | UI | 语义 |
|---|---|---|
| `reduce_walking` | 少步行 | Soft constraint input |
| `reduce_stairs` | 减少楼梯 | Soft constraint input |
| `stroller` | 需要婴儿车 | Equipment/context requirement |
| `child_seat` | 需要儿童座椅 | Conditional hard requirement when car applies |
| `accessible_route` | 需要无障碍路线 | Hard functional requirement |
| `more_rest` | 需要更多休息 | Soft constraint input |

存功能需求，不存原因：

```text
accessible_route        ✓
具体疾病名称              ✗
诊断                     ✗
伤残等级                  ✗
药物                     ✗
```

---

## 13. DiningNeedCode

v1：

```text
dietary_restriction
food_allergy_notice
vegetarian
child_meal
other_dietary_need
```

| Code | 语义 |
|---|---|
| `dietary_restriction` | 存在明确限制，后续需确认具体规则 |
| `food_allergy_notice` | 存在安全提醒，v1 不存具体过敏原 |
| `vegetarian` | 明确饮食要求 |
| `child_meal` | 儿童餐可用性输入 |
| `other_dietary_need` | 有其他需求，后续确认 |

### 为什么不存具体过敏自由文本

v1 不持久化当前 UI 的 `diningNote`，避免把高度敏感细节无边界地进入 Planner / AI / 分享流程。

---

## 14. ActivityInterestCode

当前 UI 五项冻结为：

```text
animals
outdoor
museums
photography
rides
```

全部是：

```text
soft_positive_signal
```

v1 不提供 companion-level dislike。

---

## 15. Companion Interest 与 5.11 不冲突

例如：

```text
我的 5.11:
photography = dislike

Haru:
activityInterests = [photography]
```

合法。

这是多人旅行中的偏好张力，应由 Planner 后续取舍，不由 Schema 拒绝。

---

## 16. v1 明确不保存的字段

```text
diningNote
privateNote
```

未来如果要持久化自由文本，必须单独冻结：

- 最大长度；
- 隐私级别；
- AI 是否可读；
- 是否进入 Snapshot；
- 是否分享；
- 删除 / 导出规则。

---

## 17. Avatar

DB 只保存：

```text
avatar_path
```

不保存：

```text
blob:https://...
```

当前 UI blob URL 仍只是浏览器预览。

---

## 18. `companion_groups`

```text
companion_groups
├─ id
├─ owner_user_id
├─ name
├─ description
├─ includes_owner
├─ revision
├─ created_at
└─ updated_at
```

`name` 必填 1–100 字符。

`description` 只用于展示，建议 <= 300。

`includes_owner` 是本人是否属于该常用组合的唯一事实。

---

## 19. `companion_group_members`

```text
companion_group_members
├─ owner_user_id
├─ group_id
├─ companion_id
├─ sort_order
└─ created_at
```

Unique：

```text
(group_id, companion_id)
(group_id, sort_order)
```

### 为什么 member 表也带 owner

用 Composite FK 强制：

```text
(group_id, owner_user_id)
 -> companion_groups(id, owner_user_id)

(companion_id, owner_user_id)
 -> companions(id, owner_user_id)
```

从 DB 层阻止跨用户错误关联。

---

## 20. 删除语义

删除 Companion：

```text
companions DELETE
↓
group membership cascade
```

不删除其他 Companion。

如果删除后某 Group：

```text
includes_owner = false
members = []
```

5.17 应在同一 transaction 删除或修复空 Group。

v1 采用 hard delete，不做 soft delete。

---

## 21. 常用组合不是 Trip

Group 只是：

> 创建旅行时快速选择人的模板。

进入 Trip 后：

- 可增删成员；
- 可加临时同行人；
- 可改本次需求；
- 不回写 Group；
- 不自动回写 Companion Master。

---

## 22. 临时同行人

用户无需先保存长期 Companion 才能参加旅行。

未来 Trip 层允许：

```text
temporary companion
```

它不进入长期 `companions`。

---

## 23. Revision / 并发

Companion：

```text
revision = 1
update -> old + 1
```

Group 同样有 revision。

Group 被视为 aggregate：

```text
name
description
includes_owner
members
```

5.17 修改成员时必须：

```text
CAS group revision
+
transaction 更新 memberships
+
revision + 1
```

---

## 24. RLS

三张表全部：

```text
RLS ENABLED
```

authenticated：

```text
SELECT own
INSERT own
UPDATE own
DELETE own
```

anon：

```text
no CRUD
```

v1 不支持跨账户共享 Companion。

---

## 25. Account Delete

```text
auth.users delete
↓
companions
companion_groups
companion_group_members
```

全部 cascade。

历史 Trip 不能依赖 live Companion FK，因此 Companion 删除不能让历史旅行缺人。

---

## 26. Trip Companion Snapshot 边界

5.12 只冻结语义，不建立 Trip 表。

未来 Snapshot 推荐包含：

```text
sourceType: owner | companion | temporary
sourceCompanionId?
sourceRevision?
displayName
relationshipCode?
ageYearsAtTripStart?
ageGroupAtTripStart
travelProfile
```

### 数据最小化

Planner Snapshot 默认应保存：

```text
ageYearsAtTripStart
ageGroupAtTripStart
```

而不是把完整 DOB 复制到每个 Trip。

只有 Booking / Passenger 真需要 DOB 时，走相应 Domain。

---

## 27. Snapshot 不追随 Master

```text
Haru revision 4
↓ create trip
Snapshot sourceRevision = 4
↓
Haru master update -> revision 5
```

旧 Trip 仍保留 revision 4 快照。

删除 Haru Master 也不删除历史 Snapshot。

---

## 28. Trip Override 不回写长期资料

长期：

```text
reduce_walking
```

某次 Trip 临时取消：

```text
Trip Override only
```

不自动修改 Companion Master。

“保存本次修改为长期资料”必须是明确用户操作。

---

## 29. 与现有 A Trip Contract 的关系

当前 Trip Contract 已有：

```text
participants {
  adults
  children
  infants
  seniors
}

participantNeeds {
  childSeat
  stroller
  seniorWalking
  reduceStairs
  restFrequency
}
```

5.12 **不修改 A Contract**。

未来：

```text
Trip Companion Snapshots
       ↓ adapter / aggregate
participants + participantNeeds
       ↓
Planner
```

adapter 属于后续跨模块 Contract / Trip persistence。

同样，不能：

```text
child -> 自动 childSeat
senior -> 自动 limitedWalking
```

---

## 30. Current UI → Canonical Adapter

| Current UI | Canonical |
|---|---|
| string id | UUID |
| `displayName` | `display_name` |
| free `relationship` | code + label |
| `dateOfBirth` | `birth_date` |
| `ageGroup` | 无 DOB 时 fallback；有 DOB 时 derived |
| `女/男/其他` | `female/male/other` |
| `blob:` avatar | 不持久化 |
| 中文 mobility array | stable MobilityNeedCode[] |
| 中文 dining array | stable DiningNeedCode[] |
| 中文 activity array | stable ActivityInterestCode[] |
| `diningNote` | v1 不持久化 |
| `privateNote` | v1 不持久化 |
| `isSelf` | Virtual Self，不持久化 |

Group：

```text
[self-yuki, haru, sora]
```

转换为：

```text
includes_owner = true
members = [haru, sora]
```

---

## 31. DB Constraints

### Companion

```text
display_name non-empty <= 100
relationship_code allowlist
relationship_label <= 100
gender_code allowlist
birth_date <= current_date
birth_date XOR age_group_fallback
age_group_fallback allowlist
avatar_path <= 1024
travel_profile strict validator
travel_profile <= 8 KiB
revision > 0
owner immutable
```

### Group

```text
name non-empty <= 100
description <= 300
revision > 0
owner immutable
```

### Members

```text
same-owner composite FK
duplicate member reject
sort_order >= 0
```

---

## 32. Migration / ORM

5.12 实装时：

```text
supabase/migrations/<timestamp>_create_companion_schema.sql
```

SQL Migration 是唯一历史。

Drizzle 只做 mirror，例如：

```text
src/db/schema/companions.ts
```

`src/types/database.generated.ts` 必须由真实 Local Supabase 重新生成，禁止手改。

---

## 33. 隐私边界

Companion 是：

> 用户保存的第三方个人资料。

默认：

- Private；
- owner-only；
- 不公开搜索；
- 不默认分享；
- 不自动发送完整记录给 AI；
- AI / Planner 只读取完成任务所需最少字段。

尤其：

```text
birth_date
functional travel needs
```

应遵守数据最小化。

---

## 34. 5.12 / 5.17 / 5.18 / 8.6 边界

### 5.12

负责：

- 表结构；
- stable codes；
- Self / non-self 边界；
- age semantics；
- strict travel profile；
- RLS；
- lifecycle；
- revision；
- Group 模型；
- Snapshot 语义边界。

### 5.17

负责：

- CRUD API；
- revision CAS；
- Group transaction；
- UI adapter；
- avatar persistence；
- cross-device consistency。

### 5.18

负责：

- Trip Companion Snapshot 实际表；
- temporary companion；
- Trip-only override；
- 历史稳定性。

### 8.6

依赖：

```text
5.11 + 5.12 + 5.18 + 8.4
```

5.12 完成并不代表 8.6 自动完成。

---

## 35. Out of Scope

5.12 不实现：

- 5.17 API；
- UI server persistence；
- Trip Snapshot 表；
- temporary companion；
- Trip override；
- A Trip Contract 修改；
- Planner adapter；
- AI / Engine 行为；
- Passport / passenger identity；
- 手机 / 邮箱联系人；
- Companion sharing / invitation；
- 医疗档案；
- 具体过敏原自由文本；
- 8.6 总迁移收口。

---

## 36. 实装验收标准

### Schema

- [ ] `companions`
- [ ] `companion_groups`
- [ ] `companion_group_members`
- [ ] 不建立 self companion row
- [ ] Auth owner FK cascade
- [ ] Composite FK 防跨 owner 关联
- [ ] DOB / age fallback XOR
- [ ] stable relationship / age / gender codes

### Travel Profile

- [ ] version 1.0
- [ ] 6 Mobility codes
- [ ] 5 Dining codes
- [ ] 5 Activity codes
- [ ] unknown reject
- [ ] duplicate reject
- [ ] <= 8 KiB
- [ ] 中文 UI label 不做 DB enum
- [ ] diningNote / privateNote 不落库

### Security / lifecycle

- [ ] owner-only RLS
- [ ] anon no CRUD
- [ ] cross-user reject
- [ ] owner immutable
- [ ] account cascade
- [ ] companion delete membership cascade
- [ ] historical Trip 不依赖 live Companion FK

### Concurrency

- [ ] Companion revision
- [ ] Group revision
- [ ] revision 初始 1
- [ ] sequential +1
- [ ] membership change 后续按 Group aggregate CAS

### Tooling

- [ ] SQL Migration 唯一历史
- [ ] Drizzle mirror
- [ ] Local Supabase reset
- [ ] real generated types
- [ ] DB/RLS tests
- [ ] lint/typecheck/build/full regression
- [ ] 不修改 A Planner / Trip Contract
- [ ] 不启动 5.17 / 5.18 / 8.6

---

## 37. 需要产品确认的 12 项

生成正式 Codex Task 前，建议确认：

1. 本人不建立 Companion row。
2. Group 使用 `includes_owner`。
3. DOB 与 Age fallback 只保存一个真源。
4. Planning age band = 0–2 / 3–17 / 18–64 / 65+。
5. Gender 只展示，不参与推荐。
6. Mobility 使用 6 个 stable codes。
7. Dining v1 只存概括 code，不存具体敏感自由文本。
8. Activity 使用 5 个 positive codes。
9. `diningNote/privateNote` 延期。
10. Trip Snapshot 本 Task 只冻结边界，不实现。
11. Companion hard delete 不影响历史 Snapshot。
12. v1 不做跨用户共享 Companion。

---

## 38. 推荐实施顺序

```text
5.12 v0.1 Design
      ↓
产品审查 / 冻结
      ↓
生成 5.12 Codex Task
      ↓
SQL + domain parser + Drizzle + RLS + tests
      ↓
真实 Local Supabase
      ↓
用户验收 / merge
      ↓
5.17 API
      ↓
5.18 Trip Companion Snapshot
      ↓
8.6 Migration closeout
```

---

## 39. 一句话架构

> **5.12 只保存账户用户为旅行长期维护的非本人旅伴资料；本人继续由 Profile / Preference 负责，具体旅行把选中的人复制为独立 Snapshot，从结构上把长期资料与历史旅行解耦。**

---

## 40. 当前状态

本文件为：

```text
v0.1 / Schema Freeze Candidate
```

尚未：

- 创建 5.12 实现 Task；
- 创建 5.12 实现 Issue；
- 修改 Master WBS 5.12 为进行中；
- 创建 SQL Migration；
- 修改 runtime；
- 启动 5.17 / 5.18 / 8.6。
