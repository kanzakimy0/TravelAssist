# CODEX Command — TASK-017-B

请在 `kanzakimy0/TravelAssist` 仓库中执行 `TASK-017-B — Step Preference / Trip Draft Persistence Boundary`。

## Repository

```text
https://github.com/kanzakimy0/TravelAssist
```

## Tracking

```text
Issue: #207
Spec branch: task/b-step-preference-trip-draft-persistence
Implementation branch: feature/b-step-preference-trip-draft-persistence
Task: docs/tasks/TASK-017-b-step-preference-trip-draft-persistence.md
```

## 1. Start with repository safety checks

先执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不要覆盖任何用户或其他 Owner 的未提交修改。若当前工作目录 dirty，使用独立 worktree。

## 2. Read the remote Task completely

不要依赖聊天里的摘要，完整读取远端规格：

```bash
git show origin/task/b-step-preference-trip-draft-persistence:docs/tasks/TASK-017-b-step-preference-trip-draft-persistence.md
```

同时读取 Issue #207 完整内容。

## 3. Read mandatory project sources

完整读取：

```text
docs/ui/preference-center.md
docs/preferences/preference-system.md
docs/ui/trip-library.md
docs/ui/trip-planner.md
docs/architecture/db-orm-migration-standards.md
docs/architecture/cross-module-contract-handoff.md
docs/project/WBS-TravelAssist.md
```

并审计当前 `/start` Step 1–5 的真实代码、类型、Mock、测试，以及 TASK-005 / TASK-006 / TASK-007 对应 Result。

## 4. Hard prerequisite gate

### DB Foundation

确认 `TASK-015-A / PR #186` 已经合入 `origin/develop`，并确认 `origin/develop` 真实包含：

```text
supabase/config.toml
supabase/migrations/
src/db/index.ts
src/db/schema/index.ts
drizzle.config.ts
src/types/database.generated.ts
```

若 #186 尚未合并：

1. 输出 `Status: Blocked`；
2. 记录实际 `origin/develop` SHA 和 #186 状态；
3. 不创建 implementation branch；
4. 不从 TASK-015 feature branch 叠分支；
5. 不修改业务代码；
6. 同步 Issue #207 / Result 所需的阻塞证据后停止。

### Trip Contract

确认 WBS 4.17 `Trip Plan / Planner Contract` 已冻结并进入可依赖状态。

若 4.17 未冻结：

1. 不猜测 A 的主 Trip Plan Schema；
2. 不创建 itinerary/day/item 等主系统表；
3. 不把当前浏览器 Mock 当作服务器 Contract；
4. 输出 `Status: Blocked` 或 `Partial`，准确说明阻塞在 5.18；
5. 不宣称 TASK-017 完成。

只有前置满足时才从最新 clean `origin/develop` 创建：

```bash
git switch -c feature/b-step-preference-trip-draft-persistence origin/develop
```

## 5. Core implementation rule

必须实现并证明以下边界：

```text
Long-term Travel Preference
        ↓ snapshot at trip creation
Trip Preference Snapshot
        ↓ + per-trip overrides
Effective Trip Preference
        ↓
Planner / AI
```

严格保证：

- 长期偏好与本次旅行数据分开保存；
- 创建 Trip Draft 时复制长期偏好形成 Snapshot；
- 当前 Trip 修改只写 Override / Trip Draft；
- 当前 Trip 修改不得自动回写长期 Preference；
- 修改长期 Preference 不得静默改变既有 Trip Snapshot；
- Step progress 可服务器 autosave / resume；
- 导入 Trip 不得导入原作者长期 Preference；
- 不把 Preference 字段塞进 `profiles` / `profile_settings`；
- 不实现 A 负责的 WBS 8.5 主 Trip Plan Schema。

## 6. Required model domains

最终 SQL 命名可以按仓库规范调整，但必须表达：

```text
travel_preferences
trip_drafts
trip_preference_snapshots
trip_preference_overrides
```

有效偏好语义必须是：

```text
Effective Trip Preference = Snapshot + Trip Overrides
```

必须能区分：

```text
unset / not overridden
false
0
neutral/default-like explicit value
```

不得用一个无 schema/version 的大 JSON 同时承担 User Preference、Trip Draft 和正式 Itinerary。

## 7. Step mapping audit

先从真实 Step 1–5 代码生成完整 mapping table，再实现。

至少遵守：

```text
目的地 / 日期 / 天数 / 同行构成 / 已确定安排 / 本次预算 / 本次特殊要求
→ Trip Draft

景点兴趣 / 旅行风格 / 节奏 / 步行 / 交通 / 餐饮 / 住宿 / 体验等长期倾向
→ Long-term Preference
→ 新 Trip 时 Snapshot
→ 本次修改进入 Trip Override

Wizard current step / completion
→ Trip Draft progress
```

若当前 UI 与聊天中的旧 Step 顺序不同，以仓库当前冻结设计和实际代码为准，并在 Result 记录差异。

## 8. DB implementation requirements

遵守 SQL Migration Truth：

```text
supabase/migrations/*.sql
```

同步 Drizzle schema 和：

```text
src/types/database.generated.ts
```

禁止建立第二套正式 migration history；禁止用 `drizzle-kit push` / `drizzle-kit migrate` 作为正式生产迁移真源。

所有用户私有表：

```text
RLS ON
Default Deny
```

必须真实测试 User A / User B / anon 的隔离，不能只检查 policy 字符串。

## 9. Autosave / concurrency

实现可重试的 Step autosave / resume 语义。

至少处理：

- 同一草稿的重复 autosave 不重复创建多个 Draft；
- revision / updated_at 或等价机制避免旧客户端静默覆盖新状态；
- ownership 从认证身份推导，客户端不能通过传入 owner id 越权。

不要在本 Task 自行冻结匿名账号 / Auth 流程。

## 10. Validation

在可用 Local Supabase 上真实运行：

```bash
npm.cmd ci
npm.cmd run db:start
npm.cmd run db:status
npm.cmd run db:reset
npm.cmd run db:types
```

然后运行本 Task 专项测试和：

```bash
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run build
```

最后：

```bash
npm.cmd run db:status
npm.cmd run db:stop
```

非 Windows 环境可用等价 `npm` 命令。不得伪造 Local DB / generated types / RLS 通过结果。

## 11. Required Result and tracking

创建：

```text
docs/tasks/RESULT-TASK-017-b-step-preference-trip-draft-persistence.md
```

Result 至少包含：

```text
Status
Prerequisites
Base commit
Issue / Branch / Commit / Draft PR
Step 1–5 actual mapping
Schema / tables / columns / indexes / constraints
Snapshot semantics
Override merge semantics
Autosave / revision semantics
RLS isolation evidence
Migration / Drizzle / generated types
Local Supabase reset/types evidence
Tests / lint / typecheck / build
4.17 / 8.5 boundary proof
WBS update
Known limitations / deferred work
```

同步：

- Issue #207
- `docs/project/WBS-TravelAssist.md`
- Draft PR → `develop`

用户验收前不要把 WBS 写成最终完成，不自动合并，不自动开始 5.14 / 5.19 / 8.5 / AI / Planner 后续任务。

## 12. Final response format

最终返回：

```text
# TASK-017-B Result

## Status
## Prerequisites
## Tracking
## Step Mapping
## Preference Persistence
## Trip Draft / Snapshot / Override
## RLS / Security
## Validation
## Changed Files
## Known Limitations
## Next Gate
```
