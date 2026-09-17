# CODEX — TASK-064-B / WBS 4.23 Engine Runtime Events / Local Recompute / Compensating Rollback

请在 `kanzakimy0/TravelAssist` 仓库中完整执行 `TASK-064-B`。

## Canonical Task

```bash
git show origin/task/b-wbs-4-23-runtime-recompute-rollback:docs/tasks/TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md
```

GitHub Issue: `#383`

## Before Anything Else

先执行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

然后读取完整 Task 和权威基线：

```bash
git show origin/task/b-wbs-4-23-runtime-recompute-rollback:docs/tasks/TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/project/WBS-8.5-owner-correction.md
git show origin/develop:docs/architecture/travelassist-engine-contract.md
git show origin/develop:docs/architecture/rule-feasibility-engine.md
git show origin/develop:docs/architecture/engine-transaction-apply.md
git show origin/develop:docs/architecture/trip-plan-persistence.md
git show origin/develop:docs/tasks/RESULT-TASK-063-b-wbs-4-22-engine-transaction-apply.md
```

并审计当前：

```text
src/shared/contracts/engine/**
src/shared/contracts/trips/**
src/shared/contracts/routes/**
src/server/engine/**
src/server/trips/**
src/db/schema/engine-apply.ts
src/db/schema/trips.ts
supabase/migrations/**
src/types/database.generated.ts
```

## Hard gates

必须独立确认：

```text
4.20 = 已完成 / Frozen
4.20.1 = 已完成
4.21 = 已完成
4.22 = 已完成（PR #382 merged / Issue #380 completed）
7.5 = 已完成
8.5 = B / 已完成
```

如执行时任一硬前置不成立，准确返回 `Blocked`，不要绕过。

## Worktree / Branch

从执行时最新、干净的 `origin/develop` 建独立 worktree：

```text
codex/b-wbs-4-23-runtime-recompute-rollback
```

不要从 Task publication branch 开发。

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
rebase/history rewrite
```

## What 4.23 means

本 Task 有两条主线：

```text
A. 4.22 pending outbox
   → server-only local consumer
   → claim/lease/bounded retry
   → current authoritative Trip/Plan
   → 4.21 deterministic recompute
   → minimal runtime result

B. committed accepted apply
   → minimal reversible preimage
   → current-state rollback checks
   → trusted inverse ChangeSet
   → current revisions
   → 4.21 validation
   → 4.22-equivalent atomic apply
   → NEW revision / audit / outbox
```

### 绝对禁止“倒库式 rollback”

Business rollback 必须是 **compensating ChangeSet**。

禁止：

- revision decrement/reset；
- 用旧 snapshot 覆盖 current Trip；
- 删除/修改 original receipt/audit；
- 绕过当前权限/锁/规则；
- 冒充 Booking/Payment 外部副作用已撤回。

## Reversible operations only

当前只允许补偿：

```text
UPDATE_TIME
REORDER_ITEMS
```

不要开启其他 operation。

对未来 accepted apply，要原子保存最小 preimage：

```text
UPDATE_TIME:
  itemId
  beforeSchedule
  appliedSchedule

REORDER_ITEMS:
  dayId
  beforeOrder
  appliedOrder
```

不保存完整 snapshot / full ChangeSet / full context / raw Provider / secrets。

历史 receipt 如果没有 preimage：

```text
unsupported / rollback history unavailable
Trip mutation = 0
```

## Rollback safety

rollback 前必须重新核验：

- real Auth；
- current owner / RLS；
- original accepted receipt/audit；
- compensation history；
- current target still exists；
- current value/order == original applied-after value；
- current revision；
- current locks/booking/protection；
- trusted current context；
- 4.21 validate/preview。

如果 current state 已被后续变更修改：

```text
ROLLBACK_CONFLICT
mutation = 0
```

成功 rollback 必须产生新 revision，并建立 original receipt → compensation receipt correlation。

重试/并发要求：

- same rollback retry 不能重复 apply；
- concurrent rollback 同一 original receipt 最多一次成功；
- 成功后再次 rollback 不能把状态翻回去；
- forced transaction failure 必须全回滚。

## Runtime outbox

4.22 的 `engine_apply_outbox` 目前是 pending accepted event。

TASK-064 实现 server-only callable consumer：

- multi-worker safe claim；
- lease/claim recovery；
- bounded retry；
- idempotent repeat invocation；
- processed / retryable failure / terminal failure 区分；
- safe error codes；
- no browser mutation；
- no daemon/cron/message broker deployment。

如果需要改变 outbox state/schema，只允许新增 migration；旧 migration 禁止修改。

## Local recompute

消费事件时：

- 读取 **current authoritative Trip/Plan**；
- 不使用历史 snapshot；
- 复用 4.21 rules；
- read-only，不改 Trip；
- trusted resolver 由 server 提供；
- Route facts 必须使用 7.5 contract/validator；
- missing/stale/invalid facts fail closed；
- 不自动调用真实/付费 Provider；
- 不创造 coordinates/duration/opening hours/route facts。

只保存最小 runtime metadata/fingerprint/status/reason summary。

## Provider boundary

```text
7.5 Route Schema = 可消费
7.3 Production Provider = 未最终确认
7.8 Production Gate = 未关闭
```

所以禁止 live route provider polling / automatic refresh。

## Mandatory focused acceptance

严格执行 Task §17–18 的全部 runtime + rollback acceptance，重点必须覆盖：

- pending outbox claim/processed；
- repeated processing idempotent；
- concurrent workers no double-process；
- expired lease recovery；
- bounded retry；
- current revision recompute；
- valid/stale Route fact behavior；
- no Trip write during recompute；
- UPDATE_TIME compensation；
- REORDER_ITEMS compensation；
- revision forward only；
- original audit immutable；
- state drift rollback conflict；
- cross-user/anon fail closed；
- current lock/booking/protection can block rollback；
- historical no-preimage safe unsupported；
- rollback retry/concurrency exactly-once effect；
- transaction failure atomic rollback；
- account deletion cascade。

## Mandatory regression / QA

至少执行当前 canonical equivalents：

```bash
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run test:trip-plan
npm run test:trip-plan:runtime
npm run test:routing
npm run lint
npm run typecheck
npm run build
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
npm run db:stop
```

以及：

```text
clean develop full Node baseline
second reset/types deterministic replay
4.21 focused regression
TASK-063 pure + Local regression
TASK-064 pure tests
TASK-064 real Local runtime/rollback tests
account deletion + Personal Center coexistence regression
candidate full Node regression
Task-owned/scoped Prettier
git diff --check
exact final-head GitHub Quality Gate PASS
```

没有实际运行的 mandatory gate 不得写 PASS。

## WBS

实际开始时只更新：

```text
4.23 = B / 进行中（#383 / TASK-064-B）
```

实现 + QA + Draft PR 后：

```text
4.23 = B / 待审查（#383 / TASK-064-B；Draft PR #...）
```

不要改 4.24 状态。

## Required delivery

必须产出：

```text
docs/tasks/TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md
docs/tasks/CODEX-TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md
docs/tasks/RESULT-TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md
docs/architecture/engine-runtime-events-rollback.md
docs/qa/TASK-064/README.md
docs/qa/TASK-064/<machine-readable evidence>.json
```

以及必要的：

```text
additive migration
Drizzle/generated types
runtime event contract/parser
server-only outbox consumer
server-only rollback service
focused tests + real Local tests
Master WBS update
```

创建一个 Draft PR → `develop`。

## Stop

完成后：

- 不自动 merge；
- 不关闭 Issue #383；
- 不标记 4.23 已完成；
- 不启动 4.24；
- 返回完整 TASK-064-B Result 给用户验收。
