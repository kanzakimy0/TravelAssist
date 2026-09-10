# TASK-017-B — Step Preference / Trip Draft Persistence Boundary

## 1. Metadata

- Task ID: `TASK-017-B`
- Status: 进行中（Partial / Draft；服务器子集已实现，Step 页面集成未完成）
- Actual implementation base: `0c21643d0f44ce599747007e25265c0e5219b5fb`
- Result: `docs/tasks/RESULT-TASK-017-b-step-preference-trip-draft-persistence.md`
- Implementation Commit: `f597933858b137a3929434e4d2d2d6c0444859ec`
- Verified integration Commit: `deb3d28c90ca1ed55e4eb95ea4427f25ba1e5755`
- Draft PR: [#221](https://github.com/kanzakimy0/TravelAssist/pull/221)（Open / Draft；Partial）
- Latest develop integrated: `18afee5f02ed45505b81636f7b25b568270b2bf9`；Auth Core #218 已复用，页面接线未完成。
- Issue: `#207`
- Owner: `B`
- Priority: `P0`
- WBS: `5.11 / 5.16 / 5.18`
- Related WBS: `5.14 / 5.19 / 8.5`
- Spec branch: `task/b-step-preference-trip-draft-persistence`
- Implementation branch: `feature/b-step-preference-trip-draft-persistence`
- Base at creation: `develop@6386c83c21ecd4b8172d9faa39aef2b01fdf315c`

---

## 2. Objective

把 Step 1–5 的服务器持久化边界正式冻结并实现，核心是严格分开：

```text
“我平时喜欢什么”
= User Travel Preference / 长期默认偏好

“这次旅行我要什么”
= Trip Draft / 本次旅行事实与限制
```

新建旅行时，长期偏好必须被复制为该 Trip 的 Preference Snapshot；本次旅行的修改只影响当前 Trip，不得自动回写长期偏好。

目标数据流：

```text
User Travel Preference
        ↓ snapshot at trip creation
Trip Preference Snapshot
        ↓ + per-trip overrides
Effective Trip Preference
        ↓
Planner / AI Generation
        ↓
Trip / Itinerary
```

同时保存 Wizard 当前进度，使用户关闭浏览器、换设备或重新登录后可以继续未完成的旅行草稿。

---

## 3. Hard Preconditions

开始实现前必须检查：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

### 3.1 DB Foundation

`TASK-015-A / PR #186` 必须已经合入 `origin/develop`，且至少存在：

```text
supabase/config.toml
supabase/migrations/
src/db/index.ts
src/db/schema/index.ts
drizzle.config.ts
src/types/database.generated.ts
```

如果 #186 未合并：

- `Status: Blocked`
- 不创建实现分支
- 不从 TASK-015 feature branch 叠分支
- 不修改业务代码
- 在 Result / Issue 记录实际 develop SHA 后停止

### 3.2 Trip Contract

完整实现 WBS 5.18 前，`WBS 4.17 Trip Plan / Planner Contract` 必须已经冻结并进入可依赖状态。

如果 4.17 未冻结：

- 不猜测 A 的 Trip Plan 主模型；
- 不创建与未来 `8.5 主系统 Trip Plan Schema` 重叠的 itinerary/day/item 表；
- 不把浏览器 Mock 当成正式服务器 Contract；
- Task 整体不得宣称 Completed。

### 3.3 TASK-016-B

`TASK-016-B User / Profile Schema` 不是本 Task 的数据模型替代品。

不得把旅行偏好字段塞进 `profiles` 或 `profile_settings`。即使 016 尚未完成，也要保持 User/Profile 与 Travel Preference 数据域分离。

---

## 4. Mandatory Sources

实现前完整读取并以当前仓库版本为准：

```text
docs/ui/preference-center.md
docs/preferences/preference-system.md
docs/ui/trip-library.md
docs/ui/trip-planner.md
docs/architecture/db-orm-migration-standards.md
docs/architecture/cross-module-contract-handoff.md
docs/project/WBS-TravelAssist.md
```

同时审计当前 `/start` Step 1–5 的代码、类型、Mock、测试及已有 TASK-005 / TASK-006 / TASK-007 Result。

不得根据本 Task 文档重新发明与现有 Preference Master Data 不兼容的枚举。

---

## 5. Frozen Data Ownership

### 5.1 Long-term Travel Preference

长期保存相对稳定、可复用于新旅行的偏好，例如：

- 景点 / 活动兴趣
- 旅行风格
- 节奏倾向
- 步行接受度
- 公共交通 / 移动倾向
- 餐饮偏好
- 住宿偏好
- 长期预算消费倾向
- 摄影 / 购物 / 当地文化等体验倾向
- 其他已由 Preference System 冻结的软偏好 / 默认限制

长期偏好是 Personal Center Preference 的事实源。

### 5.2 Trip Draft

只属于当前旅行的内容，例如：

- 目的地
- 出发 / 返回日期
- 旅行长度
- 本次同行人构成
- 成人 / 儿童 / 婴儿数量或当前 Trip 所需的同行摘要
- 已确定安排
- 本次旅行预算
- 本次特殊要求 / 硬限制
- 本次旅行对长期偏好的覆盖
- Wizard 当前 Step / 完成状态
- 草稿更新时间 / revision

### 5.3 Forbidden coupling

禁止：

- 修改一次 Trip 后直接覆盖长期 Travel Preference；
- 将“本次预算金额”写成用户长期预算金额；
- 将本次同行人直接改写成长期 Companion Master；
- 导入别人 Trip 时导入对方长期偏好；
- 将 Radar / 画像摘要文本作为新的事实源；
- 用一个无版本、无边界的大 JSON 同时充当用户画像、Trip Draft 与正式 Itinerary。

---

## 6. Required Persistence Model

最终命名可按仓库 SQL 命名规范微调，但领域必须能表达以下四层：

```text
travel_preferences
trip_drafts
trip_preference_snapshots
trip_preference_overrides
```

### 6.1 `travel_preferences`

一名用户的长期默认 Travel Preference 根记录。

要求：

- owner = auth user id；
- 支持 Preference System 当前三级结构；
- 可扩展但必须有 schema/version 概念；
- 不存本次目的地、日期、同行人、具体预算金额；
- 更新长期偏好时不得批量重写既有 Trip Snapshot。

具体是拆成 typed columns + item rows，还是稳定 JSONB + validated typed envelope，由 Codex 审计现有 Preference 数据结构后选择；选择理由必须写入 Result。禁止为了省事直接把当前 UI state 原样 dump 成无契约 JSON。

### 6.2 `trip_drafts`

保存一个尚未完成或尚未正式生成的 Trip 输入草稿。

至少应表达：

```text
id
owner_user_id
status
current_step
destination / destination reference
start_date
end_date
trip-specific budget / constraints
participant summary or trip-local participant input
fixed arrangements input
revision
created_at
updated_at
```

具体字段应服从当前 Step 1–5 和 4.17 Contract，不要提前创建正式 itinerary day/item 结构。

### 6.3 `trip_preference_snapshots`

创建 Trip Draft 时，从长期偏好复制一份基线快照。

规则：

- Snapshot 属于 Trip，不属于 User Profile；
- 后续用户修改长期偏好，不得静默改变已有 Trip 的 Snapshot；
- 必须保存可判断来源版本的信息，例如 source preference version / snapshot schema version；
- 生成 Planner 请求时可以稳定复现当时的偏好基线。

### 6.4 `trip_preference_overrides`

只记录当前 Trip 对 Snapshot 的覆盖。

有效偏好：

```text
Effective Trip Preference
= Snapshot + Trip Overrides
```

覆盖可以是 typed rows 或受验证的 sparse payload，但必须：

- 可区分“未覆盖”和“显式设为中性 / false / 0”；
- 可验证合法 Preference key / value；
- 不能改变长期 Preference；
- 能被后续 5.14 / 4.18 Contract 稳定读取。

---

## 7. Step 1–5 Mapping

Codex 必须先按当前真实 UI 审计 Step 字段，再生成最终 mapping table。最低原则如下：

| Step 数据              | 长期偏好 | Trip Draft / Snapshot                 |
| ---------------------- | -------- | ------------------------------------- |
| 目的地                 | No       | Trip Draft                            |
| 日期 / 天数            | No       | Trip Draft                            |
| 同行人员 / 年龄构成    | No       | Trip Draft；不得污染 Companion Master |
| 已确定安排             | No       | Trip Draft                            |
| 景点兴趣               | Yes      | Snapshot + optional override          |
| 旅行风格               | Yes      | Snapshot + optional override          |
| 节奏 / 步行 / 交通偏好 | Yes      | Snapshot + optional override          |
| 餐饮 / 住宿 / 体验倾向 | Yes      | Snapshot + optional override          |
| 长期消费倾向           | Yes      | Snapshot + optional override          |
| 本次预算金额           | No       | Trip Draft                            |
| 本次特殊要求           | No       | Trip Draft / constraint               |
| 当前 Wizard Step       | No       | Trip Draft progress                   |

如果真实 Step 顺序或字段已变化，以当前代码和冻结设计为准，同时在 Result 中记录差异。

---

## 8. Autosave / Resume Rules

Step 流程不得等到最后“生成方案”才首次保存。

推荐语义：

```text
首次进入并产生有效旅行输入
→ create Trip Draft

每一 Step 完成 / 关键字段改变
→ debounce/autosave Trip Draft

创建 Trip 时
→ create Preference Snapshot

本次偏好调整
→ update Trip Overrides

重新进入
→ load Trip Draft + effective preference
```

要求：

- 保存操作可重试；
- 避免重复创建多个相同 Draft；
- 使用 revision / updated_at 或等价机制防止明显的旧客户端覆盖新数据；
- API 不得返回数据库 secret；
- 未登录 / Auth 生命周期如何处理由 Auth Core 冻结，本 Task 不擅自建立匿名账户方案。

---

## 9. API / Service Boundary

WBS 5.16 至少提供明确的 server-side Preference persistence boundary，例如：

```text
getTravelPreference(user)
updateTravelPreference(user, patch)
createTripDraft(input)
getTripDraft(id)
updateTripDraft(id, patch/revision)
getEffectiveTripPreference(tripDraftId)
updateTripPreferenceOverrides(tripDraftId, patch)
```

函数名可调整，但必须满足：

- 客户端不能指定任意 owner_user_id 越权访问；
- ownership 从已认证身份推导；
- server/service 层和 browser-facing contract 分离；
- 后续 Planner 只能通过正式 Preference Contract 获取 effective preference；
- 本 Task 不直接实现 A 的 AI / Planner orchestration。

---

## 10. RLS / Security

所有用户私有业务表：

```text
RLS ON
Default Deny
```

至少真实验证：

- User A 可以读取 / 修改自己的长期偏好；
- User A 不能读取 / 修改 User B 的长期偏好；
- User A 可以读取 / 修改自己的 Trip Draft / Snapshot / Override；
- User A 不能访问 User B 的 Trip Draft；
- anon 不能访问私有行；
- 客户端不能通过传 owner id 绕过权限。

不得只用字符串搜索 policy SQL 代替真实权限测试。

---

## 11. Migration / Drizzle / Generated Types

正式 schema 变更只能进入：

```text
supabase/migrations/*.sql
```

并同步：

```text
src/db/schema/**
src/types/database.generated.ts
```

必须遵守 TASK-015 的 SQL Migration Truth；禁止新增第二套正式 Drizzle migration history，禁止 `drizzle-kit push` 作为正式部署方式。

在 Local Supabase 上真实执行：

```bash
npm.cmd run db:start
npm.cmd run db:reset
npm.cmd run db:types
```

生成 types 不得手工伪造。

---

## 12. Tests

至少覆盖：

1. Long-term preference 与 Trip data 物理/逻辑分离。
2. 创建 Trip 时 Snapshot 正确产生。
3. 修改长期偏好不会改变已有 Snapshot。
4. Trip override 改变 effective preference，但不改变长期偏好。
5. 可明确表达 false/0/neutral 与“未覆盖”的差异。
6. Step progress 可保存和恢复。
7. 重试 autosave 不重复创建 Draft。
8. stale revision 不应静默覆盖较新版本。
9. RLS 两用户隔离真实 PASS。
10. 不存在 Preference → Profile 字段污染。
11. 不存在本 Task 创建的正式 itinerary/day/item 主系统表。
12. lint / typecheck / build 与既有 Personal Center / Start / Planner 测试不回退。

---

## 13. Explicitly Out of Scope

- WBS 8.5 主系统 Trip Plan Schema
- WBS 4.16 / 4.17 主 Planner 模型实现
- AI 行程生成 / Provider 调用
- Companion Master Schema / API（5.12 / 5.17）
- Authentication Core（8.3）
- Profile / Account API（5.15）
- Trip Save / Read / History 对外 Contract（5.19，后续 Task）
- Planner 读取偏好 Contract（5.14 / 4.18，后续 Task）
- 正式 itinerary day/item 存储
- 订单 / 酒店 / 支付 / Membership
- UI 重设计

---

## 14. Tracking / Result

实现完成后创建：

```text
docs/tasks/RESULT-TASK-017-b-step-preference-trip-draft-persistence.md
```

Result 至少记录：

- Status
- prerequisites / actual base commit
- Issue / Branch / Commit / Draft PR
- Step 1–5 实际字段 mapping
- tables / columns / indexes / constraints
- Snapshot / Override merge semantics
- autosave / revision semantics
- RLS policies 与双用户隔离证据
- Migration / Drizzle / generated types
- Local Supabase reset/types 证据
- tests / lint / typecheck / build
- 与 4.17 / 8.5 的边界证明
- WBS 更新
- known limitations / deferred items

更新 Issue #207 与 `docs/project/WBS-TravelAssist.md`。用户验收 / 合并前不得擅自标记 WBS 为最终完成。

---

## 15. Git Safety

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不得覆盖其他 Owner 未提交工作。工作区 dirty 时优先使用独立 worktree。

---

## 16. Completion Gate

只有全部满足才可写 `Ready for review`：

- TASK-015-A / #186 已合入 develop；
- 4.17 已冻结，且没有猜测 A 主 Trip Schema；
- 长期 Preference 与 Trip Draft / Snapshot / Override 分离；
- 本次修改不会回写长期 Preference；
- Step 草稿可 autosave / resume；
- SQL Migration / Drizzle / generated types 同步；
- Local DB reset/types PASS；
- 真实 RLS 跨用户隔离 PASS；
- tests / lint / typecheck / build PASS；
- Result / WBS / Issue / Draft PR 同步。

完成后停止，不自动开始 5.14、5.19、8.5 或 AI / Planner 后续任务。

## 2026-09-10 最新 develop 整合 / 仍为 Partial

用户本轮授权解决 B 保留 Draft 的分支差异。原 head ae8b1e18ea713a2d86b1126178522e1752b1cb8d；本轮普通 merge 基线 develop@9c404d6dbc9299351a0363377422574bf00a1786，包含已合并 #171/#177/#179。没有 rebase/force push，没有覆盖其他工作站。

### 冲突与保护

- WBS 一段历史插入冲突：逐段保留 develop 新记录与 TASK-017 历史；主表 5.11/5.16/5.18 保持 develop 的正式状态，新增注释明确本 Draft 的服务器子集与 Partial 状态，不将未合并功能标为正式完成。
- package.json 一段 scripts 冲突：同时保留最新 deploy/quality scripts 与 test:preferences / test:preferences:db，依赖和 lockfile 与 develop 一致。
- B 原有 preference server/contract、autosave、SQL migration、generated types、TASK-017 tests 与原审计 head 完全一致；本轮没有修改 runtime 或数据库内容。
- 最新 develop 的 Home/Start 页面/Planner/Detail/PC、Auth/Supabase、Trips public contract 和 workflows 完整保留。
- PR #227 仍为 A 的独立 Draft（核对 head 81c8c104394fa5a94a35a0fe486ebd1998f428c1），没有合并。其 schema index/generated types/Profile tests/package 与本分支有共享文件，未来必须从 SQL truth 重新生成/验证组合模型；没有把 A 未合并 8.5 声称为已实现。本分支只增加输入草稿/偏好表，不建 itinerary/day/item 表。

### 本轮实际验证

| 检查                                                                  | 结果                                                                |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| npm ci                                                                | PASS；0 vulnerabilities；npm 既有 deprecated/allow-scripts 提示保留 |
| npm run lint                                                          | PASS                                                                |
| npm run typecheck                                                     | PASS                                                                |
| npm run build                                                         | PASS；动态 /api/travel-persistence 构建正常                         |
| node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs" | 811 / 811 PASS，0 fail、0 skip                                      |
| npm run test:preferences                                              | 9 / 9 PASS                                                          |
| npm run format:check:deploy                                           | PASS                                                                |
| git diff --check origin/develop                                       | PASS                                                                |
| npm run db:status                                                     | BLOCKED：local Docker daemon unavailable                            |
| Local DB / RLS / API runtime / reset / generated types regeneration   | 本轮未执行；不可把历史 15/25 项实测当本轮通过                       |
| Step/PC 跨设备浏览器验收                                              | 未执行；页面消费仍未接通                                            |

旧 630 tests、15 Local DB/API、25 Profile 和 28 格式告警均保留在历史段落，不替换为当前证据。当前静态/编译/全仓测试通过不等于满足 Task 的真实 DB 与页面完成 gate。

### 当前待补与停止点

5.3 Auth User Flow 已在 develop 完成，不再将其列为整个登录产品缺失；待补的是 TASK-017 的实际 StartFlowShell/PC 消费、完整 Step 问卷/兴趣细分/交通/付费体验/金额币种映射、登录/换用户/访客迁移以及跨设备恢复。还需可用 Local Docker 后重新验证 SQL/generated types/RLS/CAS/幂等。

本轮只整合现有成果并推送，PR #221 保持 Draft / Partial，Issue #207 保持 Open。WBS 5.14 / 5.19 / 8.5 未启动。最新 head 与推送结果以 PR 为准。
