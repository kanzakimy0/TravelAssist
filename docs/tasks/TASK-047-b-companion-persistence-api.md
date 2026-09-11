# TASK-047-B — WBS 5.17 Companion Persistence API v1

> Owner：B / Personal Center / Companion Data  
> WBS：5.17 / P1  
> Issue：#325  
> Publication baseline：`develop@6750a50d9fc49e561e60d25e7ebfc90c76c60a60`  
> Spec branch：`task/b-wbs-5-17-companion-persistence-api`  
> Implementation branch：`codex/b-account-wbs-5-17-companion-persistence-api`  
> Target：`develop`  
> Status：Ready for Codex implementation

---

## 0. Authority / Source of Truth

执行优先级：

1. 本 Task；
2. `docs/architecture/companion-persistence-api-v1.md`；
3. `docs/architecture/companion-schema-v1.md`；
4. `src/features/companions/domain/companion-v1.ts`；
5. 当前 `develop` 中 5.16 Preference Persistence API 已验证的 Auth / API / CAS / error pattern；
6. Master WBS。

如果 UI mock/local state 与 5.12 Domain / DB Contract 冲突，以 5.12 为准，通过 adapter 接线，不修改 5.12 语义来迁就旧 ViewModel。

---

## 1. Goal

完整实现 WBS 5.17：

```text
Existing Personal Center Companion UI
        ↓
Authenticated Companion / Group API
        ↓
Owner-scoped repository + revision CAS
        ↓
5.12 Companion Schema / RLS
        ↓
Persistent cross-device Companion Master
```

实现完成时必须达到：

- 非本人 Companion 的真实持久化 CRUD；
- Companion Group 的真实持久化 CRUD；
- ordered membership 的原子保存；
- revision/CAS 冲突保护；
- 真实 Supabase Auth/RLS；
- 既有 Personal Center UI 接线；
- hard reload / cross-device consistency；
- 完整测试与 QA；
- Draft PR，等待用户验收。

---

## 2. Mandatory Preflight

开始前必须执行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

必须确认：

```text
WBS 5.12 = 已完成
WBS 8.1  = 已完成
Issue #325 = Open
```

并读取规格发布分支：

```bash
git show origin/task/b-wbs-5-17-companion-persistence-api:docs/architecture/companion-persistence-api-v1.md
git show origin/task/b-wbs-5-17-companion-persistence-api:docs/tasks/TASK-047-b-companion-persistence-api.md
git show origin/task/b-wbs-5-17-companion-persistence-api:docs/tasks/CODEX-TASK-047-b-companion-persistence-api.md
```

同时读取当前 develop 的：

```text
docs/architecture/companion-schema-v1.md
src/features/companions/domain/companion-v1.ts
docs/architecture/preference-persistence-api-v1.md
5.16 implementation/result/tests/auth helpers
5.12 migration/result/tests
existing Personal Center Companion UI/state/tests
current DB/Supabase scripts
```

不要只读设计摘要，必须审计真实实现。

---

## 3. Branch Setup

实现必须基于执行时最新 `origin/develop`，不能基于过时 publication baseline 直接开发。

建议：

```bash
git switch develop
git pull --ff-only origin develop
git switch -c codex/b-account-wbs-5-17-companion-persistence-api
```

然后将本次已发布的管理文档带入实现分支：

```bash
git checkout origin/task/b-wbs-5-17-companion-persistence-api -- \
  docs/architecture/companion-persistence-api-v1.md \
  docs/tasks/TASK-047-b-companion-persistence-api.md \
  docs/tasks/CODEX-TASK-047-b-companion-persistence-api.md \
  docs/project/WBS-5.17-companion-persistence-api-start.md
```

如果执行时 `origin/develop` 已包含这些文件，则不要重复 checkout。

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不得覆盖其他 Owner 的 Task / WBS 更新。

---

## 4. Baseline Audit Before Coding

先建立“未修改 develop baseline”，至少记录：

```text
npm ci
lint
typecheck
build
full repository tests
existing Companion-specific tests
existing Personal Center relevant tests
DB/Supabase baseline checks
```

若 baseline 已有失败：

- 精确记录；
- 实现后做 same-command 对照；
- 不顺手修无关失败；
- Result 中不得写成全绿。

同时审计：

1. 5.12 migration 中 revision / RLS / FK / group membership 的真实约束；
2. 是否已有 Companion repository / mapper / API shell；
3. 5.16 的 auth helper、error envelope、Cookie/Bearer policy；
4. 当前 Companion UI 是否仍以 mock/localStorage 为 persisted truth；
5. dirty guard / editor draft / group editor 当前行为；
6. 是否存在可复用 DB CAS helper / SQL RPC pattern。

先审计再新增代码，避免复制已有能力。

---

## 5. Implement Server Domain Adapter

必须直接复用：

```text
src/features/companions/domain/companion-v1.ts
```

建立最小 server mapping layer，集中完成：

```text
HTTP input -> Companion v1 domain parse
Domain -> DB row / travel_profile
DB row -> canonical API resource
Group row + membership rows -> canonical group resource
```

要求：

- 不复制 enum/constants/parser；
- 不在 React component 内拼 DB payload；
- 不在多个 route 内重复 mapper；
- 不把 `diningNote` / `privateNote` 或未知自由文本写入 `travel_profile`；
- DOB / fallback age semantics 与 5.12 完全一致；
- self 仍是 virtual member，不创建 Companion row。

---

## 6. Implement Authenticated Companion Repository

建立 owner-scoped repository/service 层。

所有操作必须由 verified Auth user 得到 owner identity：

```text
listCompanions(authUser)
getCompanion(authUser, id)
createCompanion(authUser, input)
updateCompanion(authUser, id, expectedRevision, input)
deleteCompanion(authUser, id, expectedRevision)
```

核心要求：

- request body 不信任 owner id；
- normal request path 不用 service-role；
- RLS 是 backstop，但 application query 同样 owner-scoped；
- update/delete 必须将 revision 放入实际 DB predicate / transactional CAS；
- stale write/delete = 409；
- cross-user id = 404 semantics；
- create 初始 revision = 1；
- mutation 成功 revision +1。

---

## 7. Implement Companion HTTP API

按设计书实现：

```text
GET    /api/companions
POST   /api/companions
GET    /api/companions/{id}
PUT    /api/companions/{id}
DELETE /api/companions/{id}
```

若当前 Next.js repo route convention 使用不同但等价的 segment，允许沿用；必须在 Result 中列明最终 public route。

PUT/DELETE 使用 revision precondition：

```http
If-Match: "<revision>"
```

必须覆盖：

- 401 unauthenticated；
- 400 malformed / invalid id / invalid revision precondition；
- 404 missing or not-owned；
- 409 stale；
- domain validation；
- sanitized 500。

复用 5.16 shared error/auth helper；没有必要不得另建平行基础设施。

---

## 8. Implement Companion Group Repository + Atomic Mutation

必须提供：

```text
listGroups(authUser)
getGroup(authUser, id)      # route 是否公开可按实际需要
createGroup(authUser, input)
updateGroup(authUser, id, expectedRevision, input)
deleteGroup(authUser, id, expectedRevision)
```

Group input：

```text
name
includesOwner
memberIds[]  # ordered full snapshot
```

创建/更新必须验证：

- 每个 member id 都属于当前 authenticated owner；
- member 不重复；
- 不超过 Domain 常量限制；
- 不用 `self-*` member id 表示 owner；
- 顺序可稳定 round-trip。

### Atomicity

Group create/update 必须是一个原子事务：

```text
validate owner/members
CAS group resource where applicable
replace membership snapshot + order
commit all
```

不能出现 group 与 membership 的 partial commit。

如果 Supabase client 不能直接满足事务要求，允许新增最小 SQL migration/RPC；必须：

- 不改变 5.12 数据模型语义；
- clean `db reset` 可重复；
- 尽量使用 invoker semantics；
- 若使用 definer，满足设计书安全要求并增加跨用户测试；
- 不引入 service-role API shortcut。

---

## 9. Implement Companion Group HTTP API

实现：

```text
GET    /api/companion-groups
POST   /api/companion-groups
GET    /api/companion-groups/{id}      # 如 UI/route convention 需要
PUT    /api/companion-groups/{id}
DELETE /api/companion-groups/{id}
```

PUT / DELETE 必须带 `If-Match` revision。

稳定 stale code：

```text
STALE_COMPANION_GROUP_REVISION
```

Group delete 只删 group/membership，不删 Companion Master。

Companion hard delete 后不得留下 dangling group membership。

---

## 10. Wire Existing Personal Center Companion UI

目标：**接线，不重设计。**

先审计现有页面、state、adapter 与测试，然后：

### Load

- 页面从 authenticated API 获取 persisted Companion / Group；
- persisted server data 替代 mock/localStorage 真源；
- local state 只保留 presentation/draft 责任。

### Create / Update / Delete

- 显式 save 后调用 API；
- 成功后以 server returned canonical resource 覆盖 persisted snapshot；
- hard reload 后必须一致；
- delete 必须带当前 revision。

### Dirty protection

保持现有 unsaved-change guard，不因接 API 丢失。

### Conflict UX

409 时：

- 不丢 local draft；
- 不自动覆盖服务器；
- 提示另一位置已更新；
- 允许 reload server state；
- 用户重新确认后才能基于新 revision 保存。

### Self card

若现有 UI 有“本人”同行卡：

- 继续 virtual/presentation projection；
- 5.17 不把本人写进 `companions`；
- 不擅自实现 5.15 Profile API。

### Sensitive UI-only fields

若 UI 仍显示 `diningNote/privateNote`：

- 本 Task 不持久化到 v1 DB；
- 不得假装已经跨设备保存；
- 优先保留为明确 local draft/UI-only 状态，或按既有产品文案最小降级；
- 不重设计整页。

---

## 11. Required Automated Tests

### Domain / mapper

至少覆盖：

- valid round-trip；
- enum validation；
- unknown unsafe fields rejected；
- DOB / fallback age rule；
- functional profile code mapping；
- UI-only sensitive note exclusion。

### Repository / API — Companion

至少覆盖：

- unauthenticated reject；
- create/list/read/update/delete；
- revision increments；
- stale update 409；
- two concurrent updates: exactly one commit；
- stale delete 409；
- cross-user read/write/delete unavailable；
- max count；
- invalid IDs/input。

### Repository / API — Group

至少覆盖：

- create/list/update/delete；
- includesOwner true/false；
- ordered member persistence；
- duplicate reject；
- foreign-owner member reject；
- max groups/members；
- atomic membership replacement；
- stale update leaves group + memberships unchanged；
- stale delete；
- deleting group leaves companions；
- deleting companion cleans membership according to 5.12 constraints。

### UI

至少覆盖：

- API hydration；
- create/edit/delete success；
- group save；
- dirty state；
- loading/error；
- stale conflict preserves local draft；
- reload recovery。

---

## 12. Required Real Local Supabase Acceptance

不能只用 mock。

必须在项目正式 Local Supabase runtime 上完成：

```text
clean/reset migrations
real auth users
real RLS
real API requests
real browser flow
```

至少建立：

```text
User A
User B
Anon
```

验证矩阵：

| Actor | A resource | B resource | Expected |
|---|---|---|---|
| A | A Companion/Group | — | CRUD allowed |
| B | A Companion/Group | — | read/write/delete unavailable |
| A | memberIds contains B Companion | — | reject, no partial write |
| Anon | any mutation | — | 401 / denied |

并完成 CAS race：

```text
A-device-1 rev N save -> N+1
A-device-2 rev N save -> 409
server data remains device-1 commit
```

Group race 同样必须验证 membership 没有 partial changes。

---

## 13. Browser / Visual Regression Acceptance

使用仓库既有 browser QA 工具与支持视口。

必须覆盖：

```text
Companion page load
create
edit
hard reload
stale conflict
delete
Group create/update/reorder/delete
includes owner
unauthenticated flow
```

并确认：

```text
console/page errors = 0
unexpected network mutation = 0
no unrelated page geometry drift
```

不得借 5.17 重做 Personal Center UI。

---

## 14. Quality Gates

实现末尾执行仓库正式命令，至少：

```text
lint
typecheck
build
full repository tests
TASK-047-specific tests
DB reset/migration verification
browser QA
```

若全仓存在 baseline failure：

- 给出 implementation baseline 前/后数量；
- 证明本 Task 没新增未解释失败；
- 不将已知 baseline failure 隐藏为 PASS。

---

## 15. Documentation / Tracking Updates

完成实现后新增：

```text
docs/tasks/RESULT-TASK-047-b-companion-persistence-api.md
docs/qa/TASK-047/...
```

Result 至少记录：

```text
Status
Base / integrated develop SHA
Issue
Branch
Commit(s)
Draft PR
Final routes
Auth approach
DB/RPC/migration changes
CAS semantics
UI wiring
RLS/cross-user evidence
real Local Supabase evidence
browser evidence
baseline failures / exceptions
changed files
out-of-scope confirmation
```

并更新 Master WBS：

```text
5.17 Companion 持久化 API = 待审查
```

只能修改 5.17 及本 Task 必需 tracking；不要覆盖其他人的并发 WBS 状态。

Issue #325 保持 Open，写入 Result / Draft PR 关联。

---

## 16. PR Rules

实施完成后：

1. 同步执行时最新 `origin/develop`；
2. 正常 merge/rebase 按仓库规则处理，但不得 force push；
3. 重新跑受影响 gates；
4. push `codex/b-account-wbs-5-17-companion-persistence-api`；
5. 创建 **Draft PR** → `develop`；
6. PR 使用 `Relates to #325`，不要自动关闭 Issue；
7. 报告用户验收入口与需要人工检查的页面/动作。

不得自动 merge。

---

## 17. Explicit Non-Goals

本 Task 禁止启动或实现：

```text
5.13 Preference Preset
5.15 Profile / Account API
5.18 Trip Companion Snapshot / Saved Trip data model
5.19 Trip Save / Read / History Contract
Planner/Engine companion mapping
AI inference
Booking passenger domain
real-time sharing
mobile app sync protocol
```

也不得修改 A-owned Planner/Trip/Engine contract 来“顺便接入” Companion。

---

## 18. Stop Condition

当且仅当以下全部完成：

```text
implementation complete
required tests/QA complete
Result committed
WBS 5.17 = 待审查
Issue #325 updated but Open
Draft PR created
```

立即停止并返回验收报告。

不要：

```text
merge PR
close Issue #325
mark WBS 5.17 已完成
start downstream task
```

等待用户明确验收与合并授权。
