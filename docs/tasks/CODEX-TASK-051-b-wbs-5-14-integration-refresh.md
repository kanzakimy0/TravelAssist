# CODEX — TASK-051-B / WBS 5.14 Integration Refresh

请在 TravelAssist 仓库中执行 **TASK-051-B**，修复现有 WBS 5.14 / TASK-046-B / PR #323 与最新 develop 的集成冲突，并完成最终复验。

## Repository

`https://github.com/kanzakimy0/TravelAssist`

## Tracking

- Original Issue: `#321`
- Review-Fix Issue: `#339`
- Existing Draft PR: `#323`
- Existing implementation branch: `codex/b-account-wbs-5-14-planner-preference-contract`
- Task spec branch: `task/b-wbs-5-14-integration-refresh`
- Target: `develop`

## 0. Preflight

必须先执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/b-account-wbs-5-14-planner-preference-contract
git log --oneline -15 origin/develop
git log --oneline -10 origin/codex/b-account-wbs-5-14-planner-preference-contract
```

禁止：

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

如果当前目录有未提交的用户工作，不得破坏；安全停止并报告。

## 1. 读取完整任务

```bash
git show origin/task/b-wbs-5-14-integration-refresh:docs/tasks/TASK-051-b-wbs-5-14-integration-refresh.md
git show origin/task/b-wbs-5-14-integration-refresh:docs/project/WBS-5.14-integration-refresh-start.md
```

同时重新读取原 5.14 设计 / Task / Result / handoff：

```bash
git show origin/codex/b-account-wbs-5-14-planner-preference-contract:docs/architecture/planner-preference-contract-v1.md
git show origin/codex/b-account-wbs-5-14-planner-preference-contract:docs/tasks/TASK-046-b-planner-preference-contract.md
git show origin/codex/b-account-wbs-5-14-planner-preference-contract:docs/tasks/RESULT-TASK-046-b-planner-preference-contract.md
git show origin/codex/b-account-wbs-5-14-planner-preference-contract:docs/contracts/preference-read-v1-handoff.md
```

## 2. 工作分支

继续使用现有 PR #323 的分支，不新建替代实现分支：

```bash
git switch codex/b-account-wbs-5-14-planner-preference-contract
```

若本地不存在：

```bash
git switch --track origin/codex/b-account-wbs-5-14-planner-preference-contract
```

确认本地 HEAD 与远端一致后，正常 merge 最新 develop：

```bash
git merge --no-ff origin/develop
```

**不要 rebase，禁止 force push。**

## 3. 冲突解决规则

已知重点：

### package.json

以最新 develop 为基础，保留所有后来任务脚本，并加入/保留：

```json
"test:preference-contract": "node --import ./tests/register-route-ts.mjs --test tests/task-046-preference-contract.test.mjs",
"test:preference-contract:local": "node --import ./tests/register-route-ts.mjs --test tests/task-046-preference-contract.runtime.mjs"
```

不得用旧 package.json 覆盖 TASK-047/048/049/050 或更新后的脚本。

### docs/project/WBS-TravelAssist.md

使用 merge 后最新完整 Master WBS，保留全部并发更新。

最终 QA 全部通过后，只把 5.14 设置为：

```text
待审查（#321 / TASK-046-B；Draft PR #323）
```

不要修改其他 WBS 行。

### 其他冲突

逐个审查语义，优先保留最新 develop 已验收行为，再最小重放 5.14 契约；禁止全局 `ours/theirs` 粗暴覆盖。

## 4. 语义复核

重点检查：

```text
src/server/preferences/http.ts
src/server/private-http.ts
src/features/preferences/domain/preference-v1.ts
src/features/preferences/persistence/preference-resource.ts
src/shared/contracts/preferences/**
src/server/preferences/public-read.ts
src/lib/preferences/client.ts
src/lib/preferences/read-response.ts
src/server/trip-library/**
```

必须证明：

- 最新 Cookie/Bearer/Auth/Origin/RLS 行为不回退；
- compatibility export 不复制 registry/parser；
- shared Preference contract browser-safe；
- GET Preference 失败不会被转为空 Preference；
- request-scoped read 正确保留 Set-Cookie/private/no-store/Vary；
- 5.19 Trip Library Preference snapshot/patch 兼容；
- 不修改 A `EffectivePreferenceV1` / 43-dimension scoring contract；
- 不实现 4.18 live Planner wiring。

## 5. QA

先在最新 origin/develop 做 baseline，记录 SHA 与完整测试数。

合并后 candidate 至少执行：

```bash
npm ci
npm run test:preference-contract
npm run test:preference-contract:local
npm run test:preferences
npm run test:preferences:db
npm run test:preference-api
npm run test:preference-api:local
npm run test:trip-library-api
npm run test:trip-library-api:local
npm run lint
npm run typecheck
npm run build
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
git diff --check
```

另外执行当前仓库完整测试套件，不能只跑 focused tests。

真实 Local Supabase/Auth/browser 场景不得 skip。

若 lint/format 有 baseline 历史债，必须提供 baseline/candidate 同源证据，并证明本次 changed files 无新增错误。

生产 browser/client bundle 必须证明 shared Preference contract 未带入 server-only、DB 或私有 Auth 实现。

## 6. Evidence / Result

更新现有 TASK-046 QA/Result 或新增清晰的 refresh evidence；不要删除旧证据。

创建/更新 TASK-051-B Result，至少记录：

- 执行时 develop SHA；
- 原 PR head；
- merge commit；
- 所有冲突文件及解决依据；
- baseline/candidate 全仓测试数；
- focused/Local QA；
- 最终 PR head；
- 最终 GitHub Quality Gate run；
- PR #323 mergeable 状态；
- Issue #321 / #339 / WBS 5.14 状态。

## 7. Push / PR

正常 push：

```bash
git push origin codex/b-account-wbs-5-14-planner-preference-contract
```

PR #323 必须继续保持：

```text
Open
Draft
base = develop
```

不得自动 merge。

最终 exact PR head 必须拥有自己的 GitHub Quality Gate PASS；如果 PASS 后又加了任何提交，必须等新 head 再 PASS。

## 8. 最终状态

成功后：

```text
WBS 5.14 = 待审查（#321 / TASK-046-B；Draft PR #323）
Issue #321 = Open
Issue #339 = Open
PR #323 = Open / Draft / mergeable
```

不要启动 4.18、5.13、5.21、8.6 或其他 Task。

最后把完整 **TASK-051-B Result** 返回给用户。
