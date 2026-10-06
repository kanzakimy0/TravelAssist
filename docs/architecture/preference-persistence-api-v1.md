# TravelAssist — WBS 5.16 Preference Persistence API v1 设计书

> 版本：v1.0 / Implementation Baseline
> 日期：2026-09-11
> WBS：5.16 — Preference 持久化 API
> Owner：B / Personal Center / Preference Data
> 依赖：5.11 已完成；8.1 已完成
> 基线：`origin/develop@6a8996330edebf5b0df8ea5fec28a41e11b27f6b`
> 下游：5.14 Planner-readable Preference Contract
> 状态：TASK-045-B 实现与真实 Local Supabase / UI 验收完成；WBS 5.16 = 待审查；等待用户验收与 Draft PR 合并

---

## 1. 目标

5.16 把已经冻结并落库的 `PreferenceV1` 变成真实可使用的长期偏好能力：

```text
Personal Center UI
      ↓
Preference API
      ↓
Auth verified user
      ↓
travel_preferences
      ↓
cross-device consistent long-term preference
```

负责：

- GET 当前长期 Preference；
- PATCH 稀疏 set/unset；
- RESET 清空长期显式 Preference；
- revision compare-and-swap；
- Cookie / Bearer 可信身份验证；
- 统一 API error；
- 跨设备冲突保护；
- Personal Center Preference UI wiring。

不负责：

- 5.13 Preset / Default 正式定义；
- 5.14 Planner 公共读取 Contract；
- Trip Preference Snapshot / Override；
- Start Flow / Trip Draft 持久化；
- AI / Engine / POI 消费；
- 修改 5.11 的 23-key Schema。

---

## 2. 已有真源

直接复用：

```text
src/features/preferences/domain/preference-v1.ts
```

其中已经冻结：

```text
PreferenceV1
PreferencePatchV1
emptyPreference()
parsePreferenceV1()
parsePreferencePatchV1()
applyPreferencePatch()
```

5.16 不建立第二套 Preference parser。

数据库继续复用：

```text
public.travel_preferences
```

字段：

```text
owner_user_id
payload
revision
created_at
updated_at
```

不新增 Preference 表，不修改 5.11 migration。

---

## 3. API

### 3.1 GET `/api/preferences`

返回当前登录用户长期 Preference。

新用户没有 DB row 时：

```json
{
  "ok": true,
  "data": {
    "preference": {
      "schemaVersion": "1.0",
      "values": {}
    },
    "revision": 0,
    "updatedAt": null
  }
}
```

GET 不为了读取而创建空 row。

### 3.2 PATCH `/api/preferences`

请求：

```json
{
  "expectedRevision": 3,
  "patch": {
    "schemaVersion": "1.0",
    "set": {
      "style.pace": 2
    },
    "unset": []
  }
}
```

成功：

```json
{
  "ok": true,
  "data": {
    "preference": {
      "schemaVersion": "1.0",
      "values": {
        "style.pace": 2
      }
    },
    "revision": 4,
    "updatedAt": "..."
  }
}
```

### 3.3 POST `/api/preferences/reset`

请求：

```json
{
  "expectedRevision": 4
}
```

语义：

```text
长期显式 Preference → emptyPreference()
```

不删除：

- Account；
- Companion；
- Trip；
- 其他个人数据。

RESET 不等于 5.13“恢复推荐默认值”。

---

## 4. Revision / CAS

API 的并发控制只有一个版本源：

```text
travel_preferences.revision
```

规则：

```text
no row              → revision 0
first successful write → revision 1
next write          → revision 2
...
```

PATCH / RESET 必须带：

```text
expectedRevision
```

如果服务器 revision 不一致：

```text
HTTP 409
code = STALE_PREFERENCE_REVISION
```

客户端不得自动覆盖。

正确交互：

```text
设备 A revision 5
设备 B revision 5

A 保存 → revision 6
B 保存 revision 5 → 409

B 必须重新读取 revision 6
```

不做 last-write-wins。

---

## 5. 原子写入

PATCH 流程：

```text
verify auth
↓
read current resource
↓
expectedRevision check
↓
applyPreferencePatch(current, patch)
↓
DB CAS write
↓
return committed resource
```

已有 row：

```text
UPDATE ... WHERE owner_user_id = auth user
             AND revision = expectedRevision
SET payload = next,
    revision = expectedRevision + 1
```

更新 0 row：

```text
409 stale
```

首次写入：

```text
expectedRevision = 0
INSERT owner row revision = 1
```

并发首次 INSERT 只有一个成功；另一个必须映射为 409，而不是 500。

---

## 6. Reset 规则

存在 row：

```text
expectedRevision == current
↓
payload = emptyPreference()
revision + 1
```

不存在 row：

```text
revision 0 + reset
```

返回 empty / revision 0，不创建没有业务意义的空 row。

如果当前 row 已经 empty，显式 RESET 仍视为用户写操作：

```text
revision + 1
```

这样不同设备能够观察到 Reset 事件发生后的版本推进。

---

## 7. Map 字段冲突

这两个字段是完整 map value：

```text
interests.preferences
interests.details
```

Patch 对它们使用：

```text
whole-value replace
```

不是深度 merge。

因此：

```text
设备 A 修改 nature
设备 B 修改 food
```

即使逻辑上是不同 InterestCode，只要基于同一个旧 revision：

- 第一个保存成功；
- 第二个必须 409；
- 不静默 merge。

Personal Center UI 保存单个 Interest 时，应从当前服务器 resource 构造完整 map。

---

## 8. Auth

必须复用已合并 Auth Core：

```text
requireAuthUser()
createRequestSupabase()
publicSupabaseConfig()
```

身份只能来自：

```text
Supabase auth.getUser()
```

不得：

- 信任 request body 的 owner；
- 信任 query owner；
- 只 decode JWT 不验证；
- 使用 `getSession()` 代替授权验证。

### Cookie Web

GET：

- authenticated Cookie；
- private / no-store。

PATCH / RESET：

- authenticated Cookie；
- JSON Content-Type；
- Same-Origin / trusted site Origin 校验；
- CSRF fail closed。

### Bearer

支持：

```text
Authorization: Bearer <Supabase access token>
```

用于：

- future mobile app；
- native clients；
- integration tests。

Bearer 必须通过 Supabase `getUser()` 验证。

如果 Bearer 存在，则它是本次请求的显式认证方式；不得从 body owner 覆盖。

---

## 9. DB / RLS 使用方式

5.16 不绕过 5.11 RLS。

推荐：

```text
verified Supabase client
↓
travel_preferences owner RLS
```

写入仍受：

- owner-only RLS；
- SQL payload validator；
- revision trigger；
- owner immutable；
- DB timestamps。

不得为了 API 方便改成 service-role 全权写入。

如果实现使用 server-side Postgres transaction + authenticated RLS claims，也必须证明：

- verified user 是唯一 owner 来源；
- role / claims 只存在于 transaction；
- connection pool 不泄露身份；
- 与 5.11 RLS 行为完全等价。

优先简单方案，不新增第二套授权模型。

---

## 10. HTTP 安全

所有响应：

```text
Cache-Control: private, no-store
```

不得返回：

- access token；
- refresh token；
- DB URL；
- owner_user_id；
- SQL error 原文；
- stack trace。

请求 JSON 最大：

```text
80 KiB
```

超过：

```text
413 PAYLOAD_TOO_LARGE
```

Preference domain 自身仍保持 64 KiB 上限。

---

## 11. Error Contract

建议统一：

```json
{
  "ok": false,
  "error": {
    "code": "STALE_PREFERENCE_REVISION"
  }
}
```

v1 code：

```text
AUTH_REQUIRED              401
AUTH_UNAVAILABLE           503
FORBIDDEN                  403
INVALID_REQUEST            400
INVALID_PREFERENCE         400
PAYLOAD_TOO_LARGE          413
STALE_PREFERENCE_REVISION  409
PREFERENCE_UNAVAILABLE     503
```

对于 domain parser 的内部 path/code：

- 服务端日志可以保留安全分类；
- HTTP 不回显用户原始 payload；
- UI 可以根据统一 error code 展示提示。

---

## 12. UI Wiring 原则

当前 UI 里的：

```text
createDefaultPreferenceState()
createDefaultMobilityPreferenceState()
...
```

只是 Mock / ViewModel，不再作为“已保存用户事实”。

服务器事实始终是：

```text
PreferenceV1
```

建立 Adapter：

```text
PreferenceV1
   ↓
Personal Center ViewModel

UI draft
   ↓
PreferencePatchV1
```

不能：

```text
UI state
→ 原样 JSON
→ DB
```

---

## 13. 新用户 UI

服务器：

```text
revision = 0
values = {}
```

UI 应显示：

```text
未设置 / 尚未形成画像
```

不能把当前 Mock 示例：

```text
自然很喜欢
计划很喜欢
中等预算
少换乘
```

自动写成真实 Preference。

展示用 fallback 可以存在，但必须视觉上是：

```text
推荐默认 / 尚未保存
```

正式 5.13 才定义 Default / Preset。

---

## 14. Personal Center 页面接线

5.16 应接入已有长期 Preference 页面：

```text
/personal-center/preferences
/personal-center/preferences/mobility
/personal-center/preferences/attractions
/personal-center/preferences/dining
/personal-center/preferences/accommodation
/personal-center/preferences/budget
/personal-center/preferences/experience
/advanced（若当前路由存在）
```

要求：

- 初次 mount 读取 server Preference；
- saved state 来源于 server resource；
- draft state 来源于 saved adapter；
- Save 生成 patch；
- Cancel 回到最新 saved；
- Reset 调用真实 reset；
- 保存成功更新 revision；
- 409 显示冲突，不静默覆盖；
- 网络失败保留本地 draft；
- 页面离开 dirty guard 继续有效。

---

## 15. 5.11 已知 UI 字段迁移

### Mobility

不得继续 canonical 保存：

```text
mobility.preset
mobility.lessWalking
```

改为：

```text
mobility.fewerTransfers
mobility.walkingTolerance
mobility.noPublicTransit
mobility.noBus
mobility.noFerry
```

当前 `preset` UI：

- 不保存 preset id；
- 不创建 `mobility.preset`；
- 5.13 前不得把 Mock preset 当系统长期事实；
- 如果现有 preset 只是用户主动操作后改变 canonical draft，最终只能保存 canonical patch。

### Attraction

不得保存六个 Radar summary：

```text
attractions.nature
attractions.history
...
```

只能保存：

```text
interests.preferences
interests.details
```

Radar 由 canonical interests 派生。

### Experience

不得保存：

```text
experience.photoExperience
```

摄影来源：

```text
photography Interest + details
```

---

## 16. Save 策略

Personal Center 继续使用“显式保存”。

不在 5.16 引入全站 autosave。

原因：

- 已有 Save / Cancel / dirty guard UX；
- map whole-replace + revision CAS 更容易解释；
- 避免频繁 revision；
- 5.16 重点是可靠长期事实。

未来如果需要 autosave，必须建立在相同 CAS contract 上。

---

## 17. Conflict UX

409 时：

```text
“您的偏好已在其他设备或页面中更新。”
```

允许：

```text
重新加载服务器版本
```

不得：

```text
自动覆盖服务器
自动把本地旧 draft merge 到新 map
```

用户本地 draft 在错误提示期间保留，直到用户明确选择重新加载/取消。

---

## 18. Cross-device

同一账户：

```text
Device A save
↓
Device B reload / new page
↓
read same server Preference
```

必须证明：

- Web Cookie session；
- second session / Bearer session；
- revision 冲突；
- reload 后一致。

“跨设备一致”不等于实时 WebSocket 同步。

v1 只要求：

```text
request-time consistency + CAS
```

---

## 19. Reset UX

当前“重置偏好”弹窗语义继续保持：

> 只重置长期旅行偏好，不删除账户、同行人或已保存旅行。

确认后：

```text
POST /api/preferences/reset
```

成功后：

```text
PreferenceV1 = empty
Radar / summary = 未设置
revision = server returned revision
```

不得恢复 Mock 示例值。

---

## 20. PR #221 复用规则

可参考：

- Cookie/Bearer verified auth pattern；
- no-store；
- bounded JSON request；
- 409 CAS error；
- RLS / two-user QA 思路；
- server repository/service 分层。

必须废弃 / 重做：

- old 30-key Preference contract；
- `src/shared/contracts/preferences/**` 旧字段；
- `POST /api/travel-persistence` operation multiplexing；
- Trip Draft / Snapshot / Override；
- StartFlow autosave；
- owner advisory lock（除非新实现证明必要）。

5.16 不 merge / cherry-pick PR #221。

Issue #207 / PR #221 继续保持原状态，供 5.18 以后审计。

---

## 21. 推荐文件边界

建议：

```text
src/app/api/preferences/route.ts
src/app/api/preferences/reset/route.ts

src/server/preferences/resource.ts
src/server/preferences/repository.ts
src/server/preferences/http.ts

src/features/preferences/persistence/preference-client.ts
src/features/preferences/persistence/preference-adapter.ts
src/features/preferences/persistence/use-preference-resource.ts
```

具体拆分可以按仓库 convention 调整。

禁止发布：

```text
src/shared/contracts/preferences/**
```

作为 5.14 公共 Contract。

5.16 API resource 仍是 B-owned internal surface。

---

## 22. API Resource Type

B-internal：

```ts
type PreferenceResourceV1 = {
  preference: PreferenceV1;
  revision: number;
  updatedAt: string | null;
};
```

约束：

```text
revision >= 0
revision 0 → updatedAt null
revision > 0 → DB row exists
```

不返回 owner。

---

## 23. Tests

### Pure

- resource parser；
- request parser；
- expectedRevision >= 0 integer；
- Patch 继续使用 5.11 parser；
- UI adapter round-trip；
- missing ≠ neutral / false；
- reset → empty；
- old UI keys fail closed。

### Real Local Supabase

至少两名真实 Auth 用户：

- GET missing = revision 0；
- first PATCH = revision 1；
- sequential PATCH；
- stale PATCH = 409；
- concurrent first write exactly one wins；
- RESET；
- stale RESET；
- owner A cannot access B；
- anon denied；
- Cookie auth；
- Bearer auth；
- malformed bearer；
- same-origin cookie mutation；
- cross-origin cookie mutation denied；
- DB RLS / revision trigger / validator regression；
- auth delete cascade regression。

### UI / Browser

至少验证：

1. 登录用户保存一个长期 Preference；
2. reload 后仍存在；
3. 第二 session 可读取；
4. 第一 session 更新后旧 revision 保存显示冲突；
5. Reset 后 reload 为空；
6. Guest 不把 Mock/default 写进 DB；
7. dirty guard / Cancel 行为保留。

---

## 24. Quality Gate

必须：

```text
npm ci
Preference pure tests
Preference real DB tests
5.16 API tests
Profile regression
Companion regression
full repository tests
lint
typecheck
build
deploy local checks
changed-file format
git diff --check
db:start/status/reset/types/stop
```

如果 Docker / Supabase Local 不可用：

```text
Partial / Blocked
```

不能伪报通过。

---

## 25. WBS 状态

现在：

```text
5.16 = 进行中
```

实现 + real DB/API/UI QA 完成、PR 未合并：

```text
5.16 = 待审查
```

用户验收 + merge：

```text
5.16 = 已完成
```

5.16 完成后：

```text
5.14
```

依赖满足，可开始。

---

## 26. 一句话架构

> 5.16 不再定义“用户喜欢什么”，而是负责把 5.11 已冻结的长期 Preference 用可信 Auth、严格 Patch、revision CAS 和 Personal Center Adapter 安全地保存、读取、重置并跨设备恢复。
