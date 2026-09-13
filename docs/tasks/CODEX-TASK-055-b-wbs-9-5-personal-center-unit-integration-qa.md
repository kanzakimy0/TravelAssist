# CODEX — TASK-055-B / WBS 9.5 Personal Center Unit / Integration Test Baseline

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#355
```

Spec branch:

```text
task/b-wbs-9-5-personal-center-unit-integration-qa
```

Planned implementation branch:

```text
codex/b-account-wbs-9-5-personal-center-unit-integration-qa
```

## Execute

请在 TravelAssist 仓库中完整执行：

`TASK-055-B — WBS 9.5 Personal Center Unit / Integration Test Baseline`

开始前执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

读取远端完整 Task：

```bash
git show origin/task/b-wbs-9-5-personal-center-unit-integration-qa:docs/tasks/TASK-055-b-wbs-9-5-personal-center-unit-integration-qa.md
```

然后读取最新：

```text
docs/project/WBS-TravelAssist.md
package.json
tests/
src/features/
src/server/
src/app/api/
src/db/
supabase/migrations/
```

以及现有 B Personal Center 的 Task/Result/QA，重点包括 Profile、Auth、Preference、Companion、Trip Library、Account Deletion、TASK-054/WBS 8.6。

## Branch rule

实现必须从执行时最新且干净的 `origin/develop` 创建独立实现分支：

```bash
git switch -c codex/b-account-wbs-9-5-personal-center-unit-integration-qa origin/develop
```

不要从 spec/task 分支直接开发。

如果本地已有同名分支，先确认其来源、状态和是否为本 Task 的合法工作分支；不得通过 hard reset/force 方式覆盖未知工作。

## Mandatory task behavior

本 Task 是 WBS 9.5 的单元 / 集成测试基线收口，不是新增业务功能。

必须：

1. 审计 execution-time latest repository 中所有 B-owned Personal Center 测试；
2. 建立 machine-readable test inventory 与 coverage matrix；
3. 区分 unit / contract / API / DB / Auth-RLS / narrow browser-boundary / 9.6 E2E；
4. 找出真正关键覆盖缺口；
5. 对可在 9.5 层解决的缺口增加 focused tests；
6. 只能将 intrinsically full-journey 的缺口明确 Deferred 到 WBS 9.6；
7. 新增稳定 aggregate test command(s)，优先 `test:personal-center` 与必要时 `test:personal-center:local`；
8. aggregate 必须复用现有 accepted tests，不得复制整套测试刷数量；
9. real Local Supabase/Auth mandatory integration 必须真实执行，不得 skip 冒充 PASS；
10. 保证 synthetic users/data/processes 最终清理；
11. 不触碰 Production/Staging；
12. 最终 Draft PR exact head 必须有 GitHub Quality Gate PASS。

## Existing focused scripts to audit

Publication baseline 已有这些主要 B scripts；执行时以最新 package.json 为准：

```text
test:preferences
test:preferences:db
test:preference-api
test:preference-api:local
test:preference-contract
test:preference-contract:local
test:preference-presets
test:preference-presets:local
test:companions
test:companions:db
test:companion-api
test:companion-api:local
test:trip-persistence
test:trip-persistence:db
test:trip-library-api
test:trip-library-api:local
test:profile-api
test:profile-api:local
test:account-deletion
test:account-deletion:local
test:personal-center-migration
test:personal-center-migration:local
test:personal-center-migration:replay
```

还必须审计没有 npm alias 但属于 Auth/Profile/Personal Center 的现有测试；不得只看 package.json。

## Required QA minimum

必须完成并记录：

```text
npm ci
baseline full repository Node tests
Personal Center test inventory / gap audit
all relevant existing focused non-Local tests
all relevant mandatory Local DB/Auth/API integration tests
new TASK-055 focused tests for real gaps only
canonical aggregate command run #1
canonical aggregate command run #2
candidate full repository Node tests
npm run lint (or proven exact unchanged baseline debt + clean CI lint)
npm run typecheck
npm run build
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
scoped prettier checks
git diff --check
Local cleanup / db:status / db:stop
exact final-head GitHub Quality Gate
```

如果当前 canonical command 名称发生变化，使用 execution-time latest 等价命令，并在 Result 记录 mapping。

## Critical boundaries

不得把 WBS 9.6 的完整 E2E 用户流程提前塞进 9.5。

不得：

```text
新增业务功能来“制造测试对象”
重做已验收 API / Schema
修改历史 SQL migration
改 A-owned Planner / Map / Route / AI / Engine
大范围 refactor
大范围格式化无关文件
新增第二套测试框架
用 skip 代替 mandatory Local integration
连接 Production / Staging
```

若测试发现真实 B-owned defect：

- 只允许 narrow、backward-compatible、被测试直接证明必要的最小修复；
- 如果需要 schema redesign / migration semantics / product decision / cross-owner architecture，返回 Partial/Blocked，不要越权扩 Task。

## WBS tracking

开始实际实现后，只把最新 Master WBS 的 9.5 更新为：

```text
进行中（#355 / TASK-055-B）
```

完成实现 + mandatory QA + Draft PR 后，只把 9.5 更新为：

```text
待审查（#355 / TASK-055-B；Draft PR #<number>）
```

必须保留 execution-time latest WBS 中其他 A/B 的所有更新，不得用旧版 WBS 覆盖别人工作。

只有用户明确验收并合并后才能写 `已完成`。

## Required outputs

至少生成：

```text
docs/tasks/RESULT-TASK-055-b-wbs-9-5-personal-center-unit-integration-qa.md
docs/qa/TASK-055/test-inventory.json
docs/qa/TASK-055/coverage-matrix.json
docs/qa/TASK-055/gap-report.md
docs/qa/TASK-055/README.md
```

以及 audit 证明必要的 focused tests/helpers 和 aggregate command implementation。

## Git safety

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

不要破坏现有用户 worktree / 未提交文件。需要隔离时使用独立 worktree 或干净实现目录。

## Delivery

完成后：

1. push implementation branch；
2. 创建 Draft PR → `develop`；
3. PR body `Refs #355`，不要用会提前关闭 Issue 的 `Closes #355`；
4. exact final head 跑 GitHub Quality Gate；
5. 只有 exact final head PASS 才能作为 review candidate 返回；
6. Issue #355 保持 Open；
7. WBS 9.5 保持 待审查；
8. 不自动 merge；
9. 不自动开始 WBS 9.6；
10. 将完整 Result 返回给用户验收。
