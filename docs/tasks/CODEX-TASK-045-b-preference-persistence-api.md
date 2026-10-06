# CODEX — TASK-045-B / WBS 5.16 Preference Persistence API v1

请完整执行 TravelAssist 的 TASK-045-B，仅执行 WBS 5.16。

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

开始前：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

读取远端正式规格：

```bash
git show origin/task/b-wbs-5-16-preference-persistence-api:docs/architecture/preference-persistence-api-v1.md
git show origin/task/b-wbs-5-16-preference-persistence-api:docs/tasks/TASK-045-b-preference-persistence-api.md
git show origin/task/b-wbs-5-16-preference-persistence-api:docs/tasks/CODEX-TASK-045-b-preference-persistence-api.md
```

同时读取最新 develop 的：

```text
docs/project/WBS-TravelAssist.md
docs/architecture/preference-schema-v1.md
src/features/preferences/domain/preference-v1.ts
src/db/schema/travel-preferences.ts
supabase/migrations/20260911090000_create_travel_preferences.sql
src/lib/auth/**
src/lib/supabase/**
src/features/preferences/**
```

只读审计 Issue #207 / Draft PR #221。禁止 merge / cherry-pick #221。

从执行时最新、干净的 `origin/develop` 创建：

```text
codex/b-account-wbs-5-16-preference-persistence-api
```

实现：

```text
GET   /api/preferences
PATCH /api/preferences
POST  /api/preferences/reset
```

并完成 Personal Center 长期 Preference UI 的 canonical persistence wiring。

必须严格复用 5.11：

```text
PreferenceV1
PreferencePatchV1
emptyPreference
parsePreferenceV1
parsePreferencePatchV1
applyPreferencePatch
```

不得恢复旧 30-key Schema，不得持久化：

```text
mobility.preset
mobility.lessWalking
attractions.*
experience.photoExperience
localized UI keys
Mock/default values
```

必须实现：

- verified Cookie/Bearer Auth；
- owner 从 Auth 唯一确定；
- same-origin Cookie mutation；
- private/no-store；
- 80 KiB HTTP cap；
- revision CAS；
- missing resource revision 0；
- first write revision 1；
- stale write 409；
- concurrent first write只有一个成功；
- reset；
- cross-device consistency；
- UI reload persistence；
- visible 409 conflict；
- network failure保留 draft；
- dirty guard / cancel 不回归。

必须使用真实 Local Supabase 和至少两名真实临时 Auth 用户完成 DB/API/RLS/CAS 验收。

必须跑：

```text
db:start
db:status
db:reset
db:types
5.11 preference tests
5.16 API tests
Preference UI tests
Profile regression
Companion regression
full repository tests
lint
typecheck
build
deploy local gates
changed-file format
git diff --check
db:stop
```

如果 Docker / Local Supabase 或必要的真实 UI/Auth 验收无法运行：

```text
Result = Partial / Blocked
```

不得伪报 PASS，不得把 5.16 推到待审查。

完成并通过后：

```text
WBS 5.16 = 待审查
Issue 保持 OPEN
```

创建：

```text
docs/tasks/RESULT-TASK-045-b-preference-persistence-api.md
```

Push 并创建 Draft PR：

```bash
git push -u origin codex/b-account-wbs-5-16-preference-persistence-api

gh pr create \
  --repo kanzakimy0/TravelAssist \
  --base develop \
  --head codex/b-account-wbs-5-16-preference-persistence-api \
  --draft \
  --title "[TASK-045-B] Implement Preference Persistence API v1" \
  --body "WBS 5.16 Preference Persistence API implementation; awaiting user acceptance. Do not auto-merge."
```

完成后停止。

禁止：

```text
自动合并
关闭 Issue
启动 5.13
启动 5.14
启动 5.17
启动 5.18
启动 8.6
修改 A Planner / Trip Contract / Engine / AI / POI
```
