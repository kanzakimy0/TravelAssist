# Codex Command — TASK-016-B User / Profile Schema

请在 TravelAssist 仓库中完整执行 `TASK-016-B — User / Profile Schema`。

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#200
```

Spec branch:

```text
task/b-user-profile-schema
```

Expected implementation branch after prerequisite passes:

```text
feature/b-user-profile-schema
```

---

## 1. 开始前必须执行

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

如果当前工作区有其他 Task 的未提交修改，不要覆盖、reset、clean 或 stash 掉他人的工作。优先创建独立 worktree。

---

## 2. 禁止执行

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

禁止修改或提交真实 Secret。

禁止使用 `drizzle-kit push` / `drizzle-kit migrate` 作为正式数据库流程。

---

## 3. 读取远端完整 Task

```bash
git show origin/task/b-user-profile-schema:docs/tasks/TASK-016-b-user-profile-schema.md
```

读取业务数据库路线图：

```bash
git show origin/task/b-user-profile-schema:docs/architecture/business-data-schema-roadmap.md
```

读取 Issue：

```bash
# 使用 GitHub / gh / 可用连接读取 Issue #200 全文
```

---

## 4. 必须读取的设计与架构文件

从最新 `origin/develop` / prerequisite merged state 读取：

```text
docs/architecture/db-orm-migration-standards.md
docs/architecture/db-foundation-bootstrap-plan.md
docs/architecture/cross-module-contract-handoff.md
docs/ui/profile-account.md
docs/ui/authentication.md
docs/ui/account-security-data-privacy.md
docs/ui/personal-center-design-freeze-v1.md
docs/project/WBS-TravelAssist.md
```

同时读取 DB Foundation：

```text
docs/tasks/TASK-015-a-db-orm-migration-foundation.md
docs/tasks/RESULT-TASK-015-a-db-orm-migration-foundation.md
```

---

## 5. Hard Prerequisite — 第一优先检查

检查 PR #186：

```text
[TASK-015-A] Bootstrap Supabase / Drizzle database foundation
```

必须确认：

```text
PR #186 merged into develop
```

并确认 `origin/develop` 中存在：

```text
supabase/config.toml
supabase/migrations/
supabase/seed.sql
src/db/index.ts
src/db/schema/index.ts
drizzle.config.ts
tools/db/local.mjs
```

### 如果 PR #186 尚未合并

立即停止实现。

返回：

```markdown
# TASK-016-B Result

## Status
Blocked

## Reason
TASK-015-A / PR #186 has not been merged into origin/develop.

## Tracking
- Issue: #200
- implementation branch created: No
- business schema changes: No
- WBS final completion changed: No
```

不要：

- 从 `feature/a-db-orm-migration-foundation` 创建实现分支；
- cherry-pick TASK-015-A；
- 自己合并 #186；
- 修改 DB Foundation；
- 开始 Auth / Preference / Companion / Trip / POI。

---

## 6. Prerequisite 通过后的分支规则

确认 #186 已进入最新 `origin/develop` 后，从最新 develop 创建：

```bash
git switch --detach origin/develop
git switch -c feature/b-user-profile-schema
```

或使用等价、不会破坏现有 worktree 的安全方式。

记录 base SHA。

---

## 7. 实现范围

只实现：

```text
public.profiles
public.profile_settings
public.emergency_contacts
```

Supabase：

```text
auth.users
```

继续作为 authentication identity 唯一真源。

不要在 public Profile 表复制：

```text
password/hash
access token
refresh token
session
OAuth identity/secret
verified email/phone credential source-of-truth
service key
```

---

## 8. Migration

所有正式 Schema 通过：

```text
supabase/migrations/*.sql
```

创建可审查、可从空库重放的 SQL Migration。

按 Task 定义加入：

- PK / FK
- timestamps
- constraints
- indexes
- RLS enable
- owner-only policies

Profile / Settings / Emergency Contacts 都是私人数据，采用 default deny。

不得提前实现 Preference / Companion / Trip / POI schema。

---

## 9. Drizzle + Generated Types

SQL 完成并通过 reset 后：

1. 更新 `src/db/schema/**` Drizzle mirror；
2. 更新 schema barrel export；
3. 从真实 Local Supabase 运行 type generation；
4. 更新 `src/types/database.generated.ts`；
5. 不允许手工伪造 generated types。

---

## 10. Runtime / Test

Docker 可用时必须实际运行。

Windows PowerShell 可使用：

```powershell
npm.cmd ci
npm.cmd run db:start
npm.cmd run db:status
npm.cmd run db:reset
npm.cmd run db:types
```

其他 shell 可使用等价 `npm` 命令。

至少建立真实 RLS isolation 测试：

```text
User A own profile/settings/contact -> allowed
User A accessing User B -> denied
Anon -> denied
```

不能只字符串匹配 SQL policy 名称就声称 RLS 已验证。

然后：

```bash
npm run lint
npm run typecheck
npm run build
```

并运行全仓现有测试及本 Task 专项测试。

最后：

```bash
npm run db:status
npm run db:stop
```

如果使用 Windows PowerShell 且 `npm.ps1` 被 Execution Policy 阻挡，使用 `npm.cmd`，不要因为这个问题修改项目安全策略。

---

## 11. UI / Existing Feature Guard

不得修改 Personal Center 视觉设计。

不得把 UI Mock 提前接到真实数据库；Profile API 属于 WBS 5.15。

确保无远端 DB secret 时普通：

```text
lint
typecheck
build
```

仍然正常。

---

## 12. Tracking

实现过程中同步：

```text
Issue #200
docs/tasks/RESULT-TASK-016-b-user-profile-schema.md
docs/project/WBS-TravelAssist.md
```

建立 Draft PR：

```text
feature/b-user-profile-schema -> develop
```

不要未经用户验收自动声称 WBS 8.2 最终完成。

不要自动开始 WBS 8.3 Authentication Core。

---

## 13. 最终返回格式

```markdown
# TASK-016-B Result

## Status
Completed / Partial / Blocked

## Prerequisite
- PR #186 merged:
- origin/develop base:

## Tracking
- Issue: #200
- Branch:
- Commit:
- PR:
- WBS updated:

## Schema
- profiles:
- profile_settings:
- emergency_contacts:

## RLS
- profiles:
- profile_settings:
- emergency_contacts:
- cross-user isolation:
- anon isolation:

## Drizzle / Types
- Drizzle schema:
- generated database types:

## Runtime
- db:start:
- db:status:
- db:reset:
- db:types:
- db:stop:

## Validation
- tests:
- lint:
- typecheck:
- build:
- secret/client leakage check:

## Scope Guard
- Auth implemented: No
- Preference schema implemented: No
- Companion schema implemented: No
- Trip schema implemented: No
- POI schema implemented: No
- UI changed: No

## Known Limitations
...
```

完成 TASK-016-B 后停止，等待用户验收或下一条 Task。
