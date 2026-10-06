# CODEX-TASK-052-B — WBS 5.21 User Data / Account Deletion v1

请在 TravelAssist 仓库中完整执行 TASK-052-B。

## Repository

`https://github.com/kanzakimy0/TravelAssist`

## Tracking

- WBS: `5.21`
- Issue: `#342`
- Task: `docs/tasks/TASK-052-b-account-deletion.md`
- Architecture: `docs/architecture/account-deletion-v1.md`
- Spec branch: `task/b-wbs-5-21-account-deletion`
- Implementation branch: `codex/b-account-wbs-5-21-account-deletion`

## Preflight

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

工作区必须先确认安全。不要覆盖未提交工作。

## Read authoritative files

```bash
git show origin/task/b-wbs-5-21-account-deletion:docs/tasks/TASK-052-b-account-deletion.md
git show origin/task/b-wbs-5-21-account-deletion:docs/architecture/account-deletion-v1.md
git show origin/task/b-wbs-5-21-account-deletion:docs/project/WBS-5.21-account-deletion-start.md
```

然后读取执行时最新：

```text
docs/project/WBS-TravelAssist.md
src/server/private-http.ts
src/lib/auth/**
src/lib/supabase/**
src/features/profile/account-subpage.tsx
src/features/profile/profile-account.module.css
src/server/profile/**
src/server/preferences/**
src/server/companions/**
src/server/trip-library/**
src/db/schema/**
supabase/migrations/**
```

不要根据 Task 发布时的旧代码猜测执行时结构。

## Dependency verification

必须重新验证 5.15–5.19 的真实 GitHub / develop 状态。

特别注意：5.19 已实际验收和合并：

- PR #334 merged;
- PR #335 merged;
- Issue #333 Closed / Completed.

如果最新 Master WBS 5.19 仍显示旧 `待审查`，这是 tracking drift。

正式开始实现后，完整读取最新 Master WBS，并最小修改：

```text
5.19 -> 已完成（#333 / TASK-049-B；用户验收，PR #334 已合并）
5.21 -> 进行中（#342 / TASK-052-B）
```

若执行时 5.19 已被别人安全同步，则不要重复改写。

其他 WBS 行全部保留。

## Branch

从执行时最新 `origin/develop` 创建：

```bash
git switch -c codex/b-account-wbs-5-21-account-deletion origin/develop
```

如果同名分支已存在，先检查其历史与远端状态，不要强制覆盖。

## Core implementation

严格按正式 Task 执行。

关键冻结点：

1. API 为：

```text
DELETE /api/account
```

2. Request 必须严格为：

```json
{
  "schemaVersion": "1.0",
  "confirmation": "DELETE_ACCOUNT",
  "externalBookingsAcknowledged": true
}
```

3. Caller 绝不能提供目标 userId / ownerUserId。

4. 先通过现有 `verifiedPrivateRequest` / Auth Core 获取 verified current user。

5. Cookie DELETE 必须保留 Origin 防护；显式 Bearer 绝不能 fallback Cookie。

6. 只有 verified owner 可进入 narrow server-only Auth Admin 删除函数。

7. 新 privileged credential 使用：

```text
SUPABASE_SECRET_KEY
```

当前方向为 `sb_secret_...`。

禁止把 Secret Key 放入：

```text
NEXT_PUBLIC_*
client component
response
log
tracked fixture
QA JSON
screenshot
browser bundle
```

8. Admin client 仅用于：

```ts
supabase.auth.admin.deleteUser(verifiedOwner, false)
```

不要把它扩成通用 admin repository。

9. 不要用 Secret Key 读取/写入普通 Profile / Preference / Companion / Trip 数据。

10. 当前产品数据应通过 `auth.users` FK cascade 删除，不写手工逐表 delete chain。

11. 执行时必须用 Local catalog 验证所有用户数据 FK / cascade；如果新增表会残留，不能假装完成。

12. 检查 Supabase Storage。当前冻结设计没有用户 binary Storage；若执行时出现真实 user-owned Storage，按 Task 的 Storage Gate 处理，不得 broad delete。

## Existing UI

复用：

`/personal-center/account/privacy/delete`

现有 UI 已有：

- checkbox；
- 输入 `删除账户`；
- danger warning；
- cancel；
- demo submit。

需要：

- 把 demo submit 接到真实 DELETE API；
- loading/error 防双击；
- 成功后 best-effort 清理本地 session 并离开私有页面；
- 删除假的 `2 次未来旅行 / 6 个有效外部预订` 和 provider 数量；
- 不允许 mock 数据导出按钮继续声称导出成功；
- 保留“外部平台订单不会被取消”的说明；
- 不重做视觉设计。

## Session security

删除前保存 User A 的真实 Cookie / Bearer 测试凭据。

删除成功后必须证明这些旧凭据无法访问：

```text
/api/profile
/api/preferences
/api/companions
/api/companion-groups
/api/trip-library
```

以及当前其他 B private endpoints。

不要把任何 private API 改成只信任 decoded JWT。

## Mandatory Local data matrix

至少创建：

```text
User A = deletion target
User B = isolation control
anon
```

A 和 B 均填充代表性数据。

User A 必须包含：

```text
profile
profile_settings
emergency_contacts
travel_preferences
companions >= 2
companion_group + members
trip draft
trip saved
trip history
```

删除 A 后证明：

```text
A auth user = 0
A all B-owned rows = 0
B auth user = unchanged
B all rows = unchanged
old A cookie/bearer = rejected
external provider calls = 0
```

## Required negative tests

必须覆盖：

- anon delete;
- wrong/missing Cookie Origin;
- malformed Bearer + valid Cookie no fallback;
- owner/userId injection;
- wrong/missing schemaVersion;
- wrong/missing confirmation;
- externalBookingsAcknowledged != true;
- unknown key;
- body over limit;
- missing Secret Key;
- malformed Secret Key;
- Storage blocker behavior;
- double click / duplicate UI submission;
- sanitized error output。

## Regression suites

至少重跑当前接受的：

```text
TASK-050 Profile API
TASK-045 Preference API
TASK-047 Companion API
TASK-049 Trip Library API
TASK-016 Profile/Auth Schema/RLS/FK
Preference DB
Companion DB
Trip persistence DB
```

并执行全仓 tests。

## Quality gates

先在执行时最新 develop 做 baseline，再做 Candidate：

```bash
npm ci
npm run lint
npm run typecheck
npm run build
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
git diff --check
```

Local：

```bash
npm run db:start
npm run db:status
npm run db:reset
```

只有 migration / generated type 真正变化时才执行 `db:types`，并证明 deterministic。不要手改 generated types。

如果全仓存在旧 lint/format debt，必须提供 baseline/candidate 证据，并证明 changed files clean。

## Client leakage gate

生产构建后扫描浏览器 JS / HTML / source maps / standalone artifact：

- Secret Key value 不得出现；
- `SUPABASE_SECRET_KEY` server-only implementation 不得被 client import；
- admin delete implementation 不得进入 client graph；
- DB/server/private Auth markers 不得因本 Task 泄漏。

## Result / QA

必须生成：

```text
docs/tasks/RESULT-TASK-052-b-account-deletion.md
docs/qa/TASK-052/README.md
```

以及不含 secret / token / PII 的 machine-readable evidence。

最终返回必须包含：

- execution baseline；
- implementation/final head；
- exact changed files；
- deletion API contract；
- Auth Admin/Secret Key boundary；
- Local cascade inventory；
- Storage audit；
- A/B/anon results；
- pre-delete old Cookie/Bearer post-delete rejection；
- browser results；
- full/focused test counts；
- lint/typecheck/build/deploy/diff；
- WBS change；
- Issue；
- Draft PR；
- exact-head Quality Gate。

## WBS completion stage

实现 + mandatory QA + Draft PR 后：

```text
5.21 = 待审查（#342 / TASK-052-B；Draft PR #<number>）
```

不要标记已完成。

Issue #342 保持 Open。

PR 必须 Draft/Open。

不要 auto-merge。

不要启动 5.13 / 8.6 / 9.5 / 9.6 或其他后续 Task。

## Forbidden Git operations

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```
