# CODEX — TASK-054-B / WBS 8.6 Personal Center Data Migration

Repository:

```text
https://github.com/kanzakimy0/TravelAssist
```

Issue:

```text
#351
```

Spec branch:

```text
task/b-wbs-8-6-personal-center-data-migration
```

Planned implementation branch:

```text
codex/b-account-wbs-8-6-personal-center-data-migration
```

## Execute

请在 TravelAssist 仓库中完整执行 `TASK-054-B — WBS 8.6 Personal Center Data Migration Integration v1`。

开始前先执行：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

禁止执行：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

先从远端规格分支读取完整 Task，不要从该规格分支直接开发：

```bash
git show origin/task/b-wbs-8-6-personal-center-data-migration:docs/tasks/TASK-054-b-wbs-8-6-personal-center-data-migration.md
```

再读取执行当时最新 `origin/develop` 上的完整权威资料，至少包括：

```bash
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/architecture/db-orm-migration-standards.md
git show origin/develop:package.json
```

并审计执行时最新：

```text
supabase/migrations/
src/db/schema/
src/types/database.generated.ts
tests/
```

确认 WBS 5.11、5.12、5.18、8.4 仍为已完成，且 DB Foundation / Local Supabase 能力仍存在。

如果前置满足：

1. 从**执行当时最新且干净的 `origin/develop`**创建：

```text
codex/b-account-wbs-8-6-personal-center-data-migration
```

2. 将 Master WBS 仅把 8.6 更新为：

```text
进行中（#351 / TASK-054-B）
```

不得覆盖其他 A/B 最新状态。

3. 按 Task 完成迁移链审计、两次真实 Local 空库 replay、generated types determinism、SQL/Drizzle/type agreement、两用户 RLS、账户删除 cascade 与全部要求回归。

4. **不要为了任务编号而制造新的 SQL migration。**
   - 如果现有已验收 migration chain 正确：只做 integration/drift tests、证据与 tracking 收口。
   - 如果发现真实缺陷：只能新增 narrowly-scoped corrective migration；禁止修改已合入 develop 的旧 migration。

5. 必须使用真实 Local Supabase 完成强制 DB 验收。若 Docker/Supabase runtime 不可用，不得伪报 PASS，返回 Partial/Blocked。

6. 完成后生成：

```text
docs/tasks/RESULT-TASK-054-b-wbs-8-6-personal-center-data-migration.md
docs/qa/TASK-054/README.md
```

并加入必要的 TASK-054 tests；只有发现真实 schema defect 时才新增 SQL migration/generated type change。

7. 完成 mandatory QA 后创建 Draft PR → `develop`，PR 写 `Refs #351`。

8. 将 WBS 8.6 更新为：

```text
待审查（#351 / TASK-054-B；Draft PR #<number>）
```

9. 最终 PR head 必须有 exact-head GitHub Quality Gate PASS。若 PASS 后又产生新 commit，必须以新的 exact head 重新 PASS。

10. 返回完整 Result，包括：

```text
Status
Execution baseline
Migration inventory + hashes
SQL migration changed: Yes/No
Fresh replay #1
Fresh replay #2
Generated types drift
SQL / Drizzle / generated types agreement
Two-user RLS
Account-deletion cascade
Focused regressions
Full repository regression
lint / typecheck / build / deploy checks
Known baseline debt vs new failures
Branch / commits
Draft PR
Quality Gate exact head
WBS status
Issue status
Production/Staging mutation: No
Downstream task started: No
```

不要自动合并 PR，不要把 WBS 8.6 标记为已完成，不要关闭 Issue #351，不要启动 8.7 / 8.8 / 4.22–4.24 或其他后续 Task。只有用户明确验收并授权合并后才能进行最终收尾。