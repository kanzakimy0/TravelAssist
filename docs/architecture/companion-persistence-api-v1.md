# TravelAssist — WBS 5.17 Companion Persistence API v1 设计书

> 文档版本：v1.0 / Implementation Baseline\
> 日期：2026-09-12\
> WBS：5.17 — Companion 持久化 API\
> Owner：B / Personal Center / Companion Data\
> 优先级：P1\
> 依赖：5.12 Companion Schema 已完成；8.1 DB Foundation 已完成\
> 复用模式：5.16 Preference Persistence API\
> 发布基线：`origin/develop@6750a50d9fc49e561e60d25e7ebfc90c76c60a60`\
> Tracking：Issue #324\
> 规格发布分支：`task/b-wbs-5-17-companion-persistence-api`\
> 计划实现分支：`codex/b-account-wbs-5-17-companion-persistence-api`\
> 状态：**TASK-047-B 实现及真实验收已完成；WBS 5.17 = 待审查；Draft PR #325 等待用户验收**

---

## 1. 目标

5.17 将 5.12 已冻结、已落库的 Companion Master 变成真实可使用的跨设备持久化能力：

```text
Personal Center Companion UI
        ↓
Companion / Group API
        ↓
Verified Supabase Auth user
        ↓
Repository / CAS layer
        ↓
companions
companion_groups
companion_group_members
        ↓
RLS-protected durable data
```

本任务负责：

- 非本人 Companion 的 authenticated owner-scoped CRUD；
- Companion Group 的 authenticated owner-scoped CRUD；
- Group 成员完整快照替换与顺序持久化；
- Companion / Group 的 revision compare-and-swap；
- Personal Center 既有同行人管理 UI 与服务器持久化接线；
- 跨设备 / 多标签页冲突保护；
- Local Supabase + Auth + API + Browser 的真实验收。

本任务不重新设计 Companion 数据模型，也不建立第二套 parser。

---

## 2. 唯一真源

### 2.1 Domain 真源

必须直接复用：

```text
src/features/companions/domain/companion-v1.ts
```

其中已经冻结 Companion v1 的：

- schema version；
- bounded enums；
- Companion / Group 数量上限；
- group member 数量上限；
- 旅行功能性需求 code；
- 输入校验与安全边界。

5.17 **禁止**复制一份 API 专用 Companion schema、UI 专用 server schema 或平行 parser。

### 2.2 DB 真源

必须继续使用 5.12 三表：

```text
public.companions
public.companion_groups
public.companion_group_members
```

不新增第二套 Companion Master 表。

如为原子 group mutation / CAS 必须新增 SQL helper 或 RPC，只允许增加**事务能力**，不得改变 5.12 已冻结的数据语义。

---

## 3. 核心不可变规则

### 3.1 本人不是 Companion row

本人不能写入：

```text
public.companions
```

本人继续来自 Profile / Preference 投影。

Group 是否包含本人，只由：

```text
includes_owner
```

表达。

禁止：

```text
companion_id = self-*
is_self = true
```

### 3.2 不持久化敏感自由文本

以下 UI / draft 字段不得进入 v1 DB：

```text
diningNote
privateNote
medical diagnosis
medication details
religion reason
other unbounded sensitive free text
```

API 必须拒绝未知 / 越界字段，不能静默把它们塞入 `travel_profile`。

### 3.3 不做人口属性推断

不得因为：

- child / senior；
- gender；
- relationship；

自动推断：

- 行动能力；
- 无障碍需求；
- 饮食需求；
- 活动偏好。

只有用户主动选择的 bounded functional codes 才能保存。

---

## 4. 身份与授权

### 4.1 Owner 身份来源

所有 owner-scoped 请求的用户身份只能来自**服务器验证后的 Supabase Auth session / bearer credential**。

客户端请求体不得提供可信的：

```text
ownerUserId
owner_user_id
userId as authorization authority
```

即便出现这些字段也不得用于授权，优先应直接拒绝未知字段。

### 4.2 禁止 service-role request path

正常用户请求链路不得用 service-role 绕过 RLS。

```text
browser
  ↓ user credential
server route
  ↓ verified user context
Supabase / PostgreSQL
  ↓ RLS
owner-scoped rows
```

若必须使用 SQL RPC 完成事务，优先 `SECURITY INVOKER`；如实现审计证明必须使用 `SECURITY DEFINER`，必须：

- 显式验证 `auth.uid()`；
- 固定安全 `search_path`；
- 对 owner / id / revision 全部做严格条件；
- 增加跨用户拒绝测试；
- 在 Result 中记录理由。

### 4.3 防枚举

访问不存在资源与访问其他用户资源，对客户端均应使用不可枚举语义：

```text
404 NOT_FOUND
```

不能通过 403 / 不同错误详情泄漏别人的 resource id 是否存在。

---

## 5. HTTP Contract

本版冻结以下 API。若仓库已有完全等价且已公开的 route convention，Codex 可以在实现前审计后沿用既有命名，但必须在 Result 记录映射，不能改变本文语义。

### 5.1 Companion list

```http
GET /api/companions
```

成功：

```json
{
  "ok": true,
  "data": {
    "companions": []
  }
}
```

列表只返回当前 authenticated owner 的 Companion。

### 5.2 Create Companion

```http
POST /api/companions
Content-Type: application/json
```

请求只包含可写 Domain 字段，不包含 owner / id / revision / timestamps。

成功：

```text
201 Created
revision = 1
```

服务端生成 UUID 与 timestamps。

### 5.3 Read one Companion

```http
GET /api/companions/{companionId}
```

成功 `200`；不存在或非 owner `404`。

### 5.4 Update Companion

```http
PUT /api/companions/{companionId}
If-Match: "<revision>"
```

PUT 使用**完整可写资源快照**，不是 UI 局部 patch。

成功：

```text
200 OK
revision = expectedRevision + 1
```

缺失 / 无效 `If-Match`：`400`。

当前 revision 与 `If-Match` 不一致：

```text
409 Conflict
code = STALE_COMPANION_REVISION
```

### 5.5 Delete Companion

```http
DELETE /api/companions/{companionId}
If-Match: "<revision>"
```

删除同样必须 CAS，避免旧页面删除已被另一设备修改的新版本。

成功：

```text
204 No Content
```

stale：

```text
409 Conflict
code = STALE_COMPANION_REVISION
```

采用 5.12 的 hard-delete 语义。相关 group membership 必须按 5.12 FK / cleanup 规则得到一致结果。

---

## 6. Companion Group HTTP Contract

### 6.1 List Groups

```http
GET /api/companion-groups
```

每个 group 返回：

```text
id
name
includesOwner
memberIds[]   # 有序
revision
createdAt
updatedAt
```

`memberIds` 只允许引用当前 owner 的 Companion。

### 6.2 Create Group

```http
POST /api/companion-groups
```

示意：

```json
{
  "name": "家庭出游",
  "includesOwner": true,
  "memberIds": ["<companion-a>", "<companion-b>"]
}
```

服务端必须在一个原子事务中完成：

```text
validate auth owner
validate group payload
validate every member belongs to same owner
validate duplicate / max-member rules
insert group
insert ordered membership snapshot
commit
```

成功：`201`，初始 `revision = 1`。

### 6.3 Update Group

```http
PUT /api/companion-groups/{groupId}
If-Match: "<revision>"
```

请求体是完整 group 可写快照：

```text
name
includesOwner
memberIds[] ordered snapshot
```

必须在一个事务中：

1. CAS group revision；
2. 验证所有 member ownership；
3. 原子替换 membership；
4. 保存最终顺序；
5. revision + 1；
6. 返回 committed resource。

中途任一步失败都必须 rollback，不能出现“group 已更新但 members 只写了一半”。

stale：

```text
409 Conflict
code = STALE_COMPANION_GROUP_REVISION
```

### 6.4 Delete Group

```http
DELETE /api/companion-groups/{groupId}
If-Match: "<revision>"
```

成功 `204`；只删除 group 与 membership，不删除 Companion Master。

stale：`409 STALE_COMPANION_GROUP_REVISION`。

---

## 7. Revision / CAS 语义

### 7.1 单一版本源

```text
companions.revision
companion_groups.revision
```

分别是各自资源的唯一并发版本源。

规则：

```text
create -> revision 1
successful mutation -> +1
stale mutation -> 409, zero write
```

禁止：

- last-write-wins；
- 收到 409 后客户端自动覆盖；
- 只在应用层读 revision、实际 UPDATE 不带 revision predicate；
- group 更新时只 CAS group 行而 membership 另行非事务写入。

### 7.2 Race 示例

```text
Device A loads companion revision 4
Device B loads companion revision 4

A saves -> revision 5
B saves If-Match 4 -> 409
```

B 必须：

1. 保留本地未提交 draft；
2. 告知数据已在其他位置更新；
3. 提供重新加载服务器版本；
4. 用户明确重新应用后才能再次保存。

---

## 8. Domain / DB Mapping

Server adapter 必须集中负责：

```text
HTTP input
  ↓ parse using companion-v1 domain
Domain resource
  ↓ DB mapper
5.12 relational columns + travel_profile
```

以及反向：

```text
DB row(s)
  ↓ mapper
Canonical Companion / Group API resource
```

禁止在多个 route / React component 内分别手写：

- age band 映射；
- mobility / dining / activity code 映射；
- `travel_profile` shape；
- group membership ordering；
- owner filtering。

DOB / fallback age group 继续遵守 5.12 的 XOR /派生规则。

---

## 9. Repository / Transaction 边界

建议结构以仓库实际架构审计后为准，但职责必须清楚：

```text
src/features/companions/domain/
  companion-v1.ts              # existing truth source

src/features/companions/server/
  companion-repository.ts      # owner-scoped DB operations
  companion-mapper.ts          # DB <-> domain
  companion-api-errors.ts      # shared error mapping if needed

app/api/companions/...
app/api/companion-groups/...
```

若仓库已有共享 Auth / API helper，必须复用 5.16 已验证模式，不复制新的 Cookie/Bearer parser。

---

## 10. Personal Center UI 接线

### 10.1 不重设计 UI

本任务是 data/API wiring，不修改已经验收的 Companion 页面信息架构、视觉系统或组件层级，除非为明确的：

- loading；
- save pending；
- API error；
- stale conflict；
- reload recovery；

所需的最小状态表现。

### 10.2 Load

进入同行人管理页后，服务器数据成为 persisted truth。

```text
GET companions
GET groups
↓
normalize to existing presentation model
↓
render
```

不得再把 localStorage/mock 作为跨设备数据真源。

若现有 UI 仍有 local draft，draft 只承担“未保存编辑态”。

### 10.3 Save

```text
edit local draft
↓
explicit save
↓
POST / PUT with revision
↓
server committed resource
↓
replace local persisted snapshot
```

保存成功后必须使用**服务器返回值**更新本地状态，不能假设客户端 draft 就是最终数据库值。

### 10.4 Dirty guard

切换 Companion、关闭编辑器、页面导航时，既有 dirty protection 必须保留。

### 10.5 409 冲突 UX

发生 stale 时：

- 不清空用户正在编辑的 draft；
- 不自动 retry 覆盖；
- 显示明确冲突信息；
- 用户可以 reload server version；
- 用户重新确认后才可基于新 revision 保存。

### 10.6 Reload consistency

以下流程必须一致：

```text
create -> hard reload -> still exists
edit -> hard reload -> latest saved value
create/update group -> hard reload -> membership/order preserved
delete -> hard reload -> remains deleted
```

---

## 11. Error Contract

优先复用 5.16 已有统一 API error envelope。

最低语义：

| HTTP | 语义                                                            |
| ---: | --------------------------------------------------------------- |
|  200 | GET / PUT success                                               |
|  201 | POST create success                                             |
|  204 | DELETE success                                                  |
|  400 | malformed JSON / invalid id / missing-invalid revision header   |
|  401 | unauthenticated                                                 |
|  404 | missing or not-owned resource                                   |
|  409 | stale revision / deterministic ownership-membership conflict    |
|  422 | 仅当仓库既有约定明确区分 domain validation 时使用；否则沿用 400 |
|  500 | unexpected server failure，不能泄漏 token / SQL / secrets       |

建议稳定错误 code：

```text
AUTH_REQUIRED
INVALID_COMPANION_INPUT
INVALID_COMPANION_GROUP_INPUT
COMPANION_NOT_FOUND
COMPANION_GROUP_NOT_FOUND
STALE_COMPANION_REVISION
STALE_COMPANION_GROUP_REVISION
COMPANION_GROUP_MEMBER_INVALID
```

实际命名若复用现有 shared error vocabulary，可调整，但 Result 必须列出最终 contract。

---

## 12. 数量与完整性规则

直接使用 domain 常量：

```text
MAX_COMPANIONS_PER_USER
MAX_COMPANION_GROUPS
MAX_COMPANION_GROUP_MEMBERS
```

不能在 route 层写第二组 magic numbers。

Group 必须保证：

- 同一个 `memberId` 不重复；
- 每个 member 都属于同一个 authenticated owner；
- `includesOwner` 不需要也不能通过伪 member id 表示；
- 成员顺序 round-trip 稳定；
- 删除 Companion 后 group 不留下悬空引用。

---

## 13. 安全日志

日志允许：

- request correlation id；
- route / status；
- resource type；
- sanitized error code。

日志禁止：

- bearer token；
- auth cookie 原文；
- Supabase service key；
- `travel_profile` 全量 dump；
- birth date / private user data 的不必要原文；
- SQL secret / connection string。

---

## 14. 验收矩阵

### 14.1 Static / build

必须至少执行：

```text
npm ci
npm run lint
npm run typecheck
npm run build
full repository test command(s)
Task-specific Companion tests
```

已有 baseline failure 必须与未修改 baseline 对照，不得伪报通过，也不得顺手改无关模块。

### 14.2 Local Supabase / DB

必须用真实 Local Supabase：

```text
db start/status as repository defines
db reset / migrations
required DB verification
```

如新增 migration/RPC，必须从 clean reset 可重复建立。

### 14.3 Auth / RLS — 至少两个用户

准备：

```text
User A
User B
Anon
```

验证：

- A 只能 list/read/write/delete A 的 Companion；
- B 不能读写 A 的 Companion；
- A/B group 完全隔离；
- A 的 group 不能加入 B 的 companion id；
- anon 全部 mutation 被拒绝；
- 直接 DB/RLS 路径同样不能跨 owner。

### 14.4 Companion API

至少覆盖：

- create valid resource；
- reject invalid enum / unknown unsafe fields；
- read / list；
- update revision increments；
- stale update 409；
- two concurrent writers only one succeeds；
- stale delete 409；
- hard delete；
- max count boundary；
- non-owner id indistinguishable from not-found。

### 14.5 Group API

至少覆盖：

- create empty / non-empty valid group；
- `includesOwner` true/false；
- ordered member round-trip；
- duplicate member rejected；
- foreign-owner member rejected；
- max group / member boundary；
- update membership is atomic；
- stale group update 409 and membership unchanged；
- stale delete 409；
- delete group leaves Companion Master untouched；
- delete Companion leaves no dangling membership。

### 14.6 Browser acceptance

至少验证既有支持视口中的：

```text
load existing persisted companions
create companion
edit companion
hard reload persistence
delete companion
create/edit/delete group
member order persistence
includes-owner behavior
409 conflict UX
unauthenticated handling
```

要求：

```text
console error = 0
page error = 0
unexpected mutation request = 0
no unrelated visual geometry drift
```

---

## 15. 与其他 WBS 的边界

### 15.1 5.15 Profile / Account API

本人 Profile 的持久化不属于 5.17。

### 15.2 5.16 Preference Persistence API

只复用 Auth / API / CAS / error 经验；不得把 Companion 塞进 Preference payload。

### 15.3 5.18 / 5.19 Trip 数据

5.17 只维护长期 Companion Master。

以下不做：

```text
Trip Companion Snapshot
trip-only companion override
saved trip participant snapshot
trip history participant recovery
```

### 15.4 Planner / Engine

5.17 不定义 Planner / Engine 如何消费同行人资料，不修改 A-owned Planner/Trip/Engine contract。

### 15.5 AI / Booking / Sharing

不属于本 Task。

---

## 16. 交付物

Codex 实施必须至少产生：

```text
Companion server/repository implementation
Companion + Group API routes
required transactional DB helper/migration if necessary
Personal Center persistence wiring
task-specific tests
real Local Supabase/Auth evidence
docs/qa/TASK-047/
docs/tasks/RESULT-TASK-047-b-companion-persistence-api.md
```

并将本设计书、Task 与 Launcher 一并带入实现分支/PR。

---

## 17. 完成与停止条件

实现与自动验收完成后：

```text
WBS 5.17 = 待审查
Issue #324 = Open
PR = Draft -> develop
```

不得自行：

- 把 WBS 写成已完成；
- 合并 PR；
- 关闭 Issue #324；
- 启动 5.18 / 5.19 或其他后续任务。

只有用户明确完成视觉/功能验收并授权合并后，才能：

```text
merge accepted PR
WBS 5.17 = 已完成
close Issue #324
```
