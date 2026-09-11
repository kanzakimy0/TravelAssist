# CODEX Launcher — TASK-047-B / WBS 5.17 Companion Persistence API

将以下整段交给本地 Codex 执行。

```text
请在 TravelAssist 仓库中完整执行 TASK-047-B，实现 WBS 5.17 Companion Persistence API v1。

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#325
https://github.com/kanzakimy0/TravelAssist/issues/325

Authoritative specification branch:
task/b-wbs-5-17-companion-persistence-api

Planned implementation branch:
codex/b-account-wbs-5-17-companion-persistence-api

开始前执行：

git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop

禁止执行：

git clean -fd
git reset --hard
git push --force
git push --force-with-lease

先从远端规格分支读取完整设计、Task 与启动记录：

git show origin/task/b-wbs-5-17-companion-persistence-api:docs/architecture/companion-persistence-api-v1.md
git show origin/task/b-wbs-5-17-companion-persistence-api:docs/tasks/TASK-047-b-companion-persistence-api.md
git show origin/task/b-wbs-5-17-companion-persistence-api:docs/tasks/CODEX-TASK-047-b-companion-persistence-api.md
git show origin/task/b-wbs-5-17-companion-persistence-api:docs/project/WBS-5.17-companion-persistence-api-start.md

然后读取当前 origin/develop 的正式基础：

- docs/project/WBS-TravelAssist.md
- docs/architecture/companion-schema-v1.md
- src/features/companions/domain/companion-v1.ts
- docs/architecture/preference-persistence-api-v1.md
- WBS 5.12 的 migration / Result / tests
- WBS 5.16 的 implementation / Result / tests / Auth helper / API error helper
- 当前 Personal Center Companion 页面、state、adapter、tests
- 当前 Supabase/DB scripts 与 migration conventions

必须确认：

- WBS 5.12 = 已完成
- WBS 8.1 = 已完成
- Issue #325 = Open
- 当前 origin/develop 不存在另一份正在实施或已完成的 5.17；如发现冲突，停止并报告，不要重复实现

实现必须基于执行时最新 origin/develop，而不是 2026-09-12 的发布基线直接开发。

建议创建分支：

git switch develop
git pull --ff-only origin develop
git switch -c codex/b-account-wbs-5-17-companion-persistence-api

将规格分支的 4 个管理文档带入实现分支；如果 develop 已经包含，则不要重复：

git checkout origin/task/b-wbs-5-17-companion-persistence-api -- \
  docs/architecture/companion-persistence-api-v1.md \
  docs/tasks/TASK-047-b-companion-persistence-api.md \
  docs/tasks/CODEX-TASK-047-b-companion-persistence-api.md \
  docs/project/WBS-5.17-companion-persistence-api-start.md

严格按照 TASK-047-B 执行，不缩减验收范围。

关键实现要求：

1. 5.12 Companion Schema 和 src/features/companions/domain/companion-v1.ts 是唯一 Companion 真源；不得复制第二套 schema/parser。
2. 非本人 Companion 实现 authenticated owner-scoped CRUD；本人不建立 companion row。
3. Companion Group 实现 CRUD，并把 includesOwner + ordered memberIds 作为完整快照持久化。
4. Companion 与 Group mutation 使用真实 revision CAS；stale update/delete 返回 409，绝不 last-write-wins。
5. Group 更新必须原子替换 group + membership；不得 partial commit。若必须新增 SQL RPC/migration，只增加事务/CAS 能力，不改变 5.12 数据语义。
6. 身份只来自 verified Supabase Auth。请求体 owner id 不可信；正常请求路径禁止 service-role 绕过 RLS。
7. 至少两名真实 Local Supabase 用户验证 RLS/cross-user denial，并验证 anon denial。
8. 不持久化 diningNote/privateNote、医疗诊断、宗教原因或其他 unbounded sensitive free text。
9. 接入现有 Personal Center Companion UI，但不重设计页面。保留 draft/dirty guard；409 时保留本地 draft、提示冲突、禁止自动覆盖。
10. hard reload 后 create/edit/delete/group membership/order 必须保持真实服务器一致性。
11. 不实现 5.15、5.18、5.19、Planner/Engine companion mapping、AI、Booking、sharing。
12. 先建立未修改 develop baseline，再执行 implementation gates；既有 baseline failure 必须精确对照，不得伪报 PASS，也不得顺手修无关问题。

必须完成真实验收：

- npm ci
- lint
- typecheck
- build
- full repository tests
- TASK-047-specific tests
- Local Supabase clean/reset migration verification
- real Auth/API/RLS tests with User A / User B / Anon
- Companion CAS race
- Group CAS + atomic membership race
- browser acceptance on existing supported viewports
- console/page error = 0
- no unrelated visual geometry drift

完成后必须新增：

docs/tasks/RESULT-TASK-047-b-companion-persistence-api.md
docs/qa/TASK-047/...

并只更新 Master WBS 5.17 为：

待审查

不要覆盖其他人的 WBS 状态。

更新 Issue #325，关联 Result 和 Draft PR，但保持 Open。

Push implementation branch，并创建 Draft PR -> develop；PR 使用 Relates to #325。

不要自动 merge。
不要关闭 Issue #325。
不要把 WBS 5.17 写成已完成。
不要启动后续 Task。

最终返回：

# TASK-047-B Result

## Status
## Prerequisite / Baseline
## Tracking
## Architecture Reuse
## Companion API
## Companion Group API / Atomicity
## Auth / RLS
## CAS / Conflict Handling
## Personal Center Wiring
## Local Supabase Acceptance
## Browser Acceptance
## Quality Gates
## Changed Files
## Exceptions / Existing Baseline Failures
## Draft PR
## Manual Acceptance Steps
## Stop Confirmation
```
