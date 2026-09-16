# CODEX — TASK-062-B / WBS 8.5 Trip Plan Schema Integration / Acceptance Closeout

请在 `kanzakimy0/TravelAssist` 仓库中完整执行 `TASK-062-B`。

## Canonical Task

```bash
git show origin/task/b-wbs-8-5-trip-plan-schema-integration-closeout:docs/tasks/TASK-062-b-wbs-8-5-trip-plan-schema-integration-closeout.md
```

GitHub Issue: `#376`

现有实现必须复用：

- `TASK-019-A / Issue #226`
- `TASK-026-A / Issue #256`
- Branch: `codex/a-trip-plan-schema`
- Draft PR: `#227 -> develop`

**不要新建第二套 WBS 8.5 实现，不要创建替代 PR。**

A 已明确许可 B 执行本次 WBS 8.5 integration / acceptance closeout，但 WBS 8.5 canonical Owner 仍为 A。

## Before Anything Else

先执行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git rev-parse origin/codex/a-trip-plan-schema
git log --oneline -15 origin/develop
git log --oneline -15 origin/codex/a-trip-plan-schema
```

检查 GitHub：

- Issue #376
- Issue #226
- Issue #256
- PR #227
- 最新 `docs/project/WBS-TravelAssist.md`

若当前目录存在用户未提交修改，不得覆盖、删除或清理；新建独立 clean worktree。

## Hard Git Rules

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
git rebase  # canonical PR branch 不重写历史
```

不得直接在 `develop` 上开发。

## Execution Target

实际收口继续使用现有：

```text
codex/a-trip-plan-schema
```

在独立 clean worktree 中 checkout / track 该 branch，然后：

```bash
git merge origin/develop
```

必须是 normal merge。

不要从旧 `develop`、TASK-017 历史 branch、个人中心 feature branch 或新的替代实现 branch 开始。

## Conflict Resolution Rule

每个冲突逐个审查，目标是同时保留：

1. 最新 `origin/develop` 的全部已验收 A/B 工作；
2. PR #227 已实现并通过 focused Local DB 验收的 WBS 8.5 Trip Plan 语义。

尤其检查：

- `docs/project/WBS-TravelAssist.md`
- `package.json`
- `package-lock.json`
- `src/db/schema/**` exports
- `src/types/database.generated.ts`
- server/index exports
- tests / aggregate runners
- 新增 migration coexistence

不得用整份 ours/theirs 覆盖掉另一边的有效工作。

## Scope Freeze

必须保持现有 WBS 8.5 四表和语义：

```text
public.trips
public.trip_plans
public.trip_days
public.itinerary_items
```

以及：

- owner-only RLS
- revision / CAS
- transaction projection
- `TripPlanSnapshotV1` round-trip
- active-plan same-Trip integrity
- scheduled / alternative semantics
- timezone/local-date/date-line
- booking facts only
- account deletion cascade

不要修改 Region Graph、Master Code、Candidate Pipeline、Planner UI、POI、Route provider、AI、Booking、Payment、Engine 4.22–4.24。

B-owned Preference / Companion / Trip Library 必须保持独立；只允许为迁移共存、generated types、exports、tests 做必要机械整合。

## Mandatory Acceptance

必须真实执行当前仓库 canonical equivalents；不能把未执行项写 PASS。

至少：

```bash
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
```

要求：

- full migration chain 从空 Local Supabase 重放 PASS；
- 再次 reset/replay 或等效复验确定性；
- 再次生成 DB types，证明 zero drift / deterministic；
- SQL / Drizzle / generated types coherent；
- 只用 Local Supabase/Auth，不碰 Production/Staging。

### WBS 8.5 focused behavior

必须证明：

- minimum/full TripPlan fixture round-trip；
- multi-plan；
- multi-day；
- scheduled + alternative；
- timezone/date-line；
- booking facts；
- invalid Contract input fail closed；
- Trip stale revision rejection；
- Plan stale revision rejection；
- concurrent same-version writer accepted behavior；
- transaction rollback；
- Owner CRUD；
- second user cross-tree denial；
- child FK ownership escape denial；
- anon denial；
- active plan cannot cross Trip；
- owner account deletion cascade；
- other owner preserved。

### Current B coexistence regression

使用当前 canonical scripts / aggregate，证明至少这些 accepted B 模块不被 8.5 破坏：

- Profile
- Preference
- Companion
- Trip Library
- Personal Center migration
- account deletion
- Personal Center unit/integration aggregate（若当前仓库以它为 canonical gate）

不要为了数量复制测试。

### Repository gates

至少：

```bash
npm run lint
npm run typecheck
npm run build
git diff --check
```

并执行：

- canonical full Node regression；
- current deployment validate/build/artifact verification；
- TASK-owned/scoped format；
- exact final-head GitHub Quality Gate。

如果脚本名已经变化，读取当前 `package.json` 使用最新 canonical equivalent，并在 Result 记录映射。

## Historical Failure Rule

TASK-026 的 `709/712` 与三个旧 baseline failure 只是历史。

不要默认它们仍存在，也不要自动 waiver。

先在 execution-time latest clean `develop` 和候选 head 重新验证。当前失败必须按最新证据分类。

## WBS Tracking

WBS 8.5 canonical Owner 保持 `A`。

执行开始后把 8.5 真实同步为类似：

```text
进行中（#376 / TASK-062-B B-side integration closeout；existing Draft PR #227）
```

完成 integration + mandatory QA 后：

```text
待审查（#376 / TASK-062-B closeout；Draft PR #227）
```

禁止自动写 `已完成`。

禁止自动启动或修改：

```text
4.22
4.23
4.24
4.18
4.19
```

## Required Outputs

在现有 PR #227 branch 中生成：

```text
docs/tasks/RESULT-TASK-062-b-wbs-8-5-trip-plan-schema-integration-closeout.md
docs/qa/TASK-062/README.md
docs/qa/TASK-062/acceptance-evidence.json
```

必要时增加可重复 QA 文件。

更新：

```text
docs/project/WBS-TravelAssist.md
```

必要时更新 PR #227 body 以反映最新 exact head 与真实验收结果。

## Final Push / PR Behavior

完成后：

```bash
git status --short
git diff --check
# commit TASK-062 integration/result/QA/WBS
git push origin codex/a-trip-plan-schema
```

保持：

```text
PR #227 = Open / Draft
Issue #376 = Open
WBS 8.5 = 待审查
```

不要 merge PR #227。

不要关闭 Issue #376。

不要启动 4.22。

## Final Result Format

最终返回必须包括：

```text
TASK-062-B Result

Status
Prerequisite / Authorization
Latest develop SHA
PR #227 old head
PR #227 final head
Normal merge commit
Conflict audit
Schema / Migration
Generated types
Trip Plan focused tests
Real Local Auth/RLS/CAS tests
B coexistence regression
Full repository regression
lint / typecheck / build
Deployment gates
GitHub exact-head Quality Gate
WBS update
Issue #376 state
PR #227 state / mergeability
Secrets / Production boundary
Remaining limitations
Next permitted action
```

PASS 时使用：

```text
Completed / WBS 8.5 integration closeout ready for owner review
```

然后停止，等待用户验收和单独 merge 授权。
