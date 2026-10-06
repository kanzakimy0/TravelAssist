# CODEX — TASK-063-B / WBS 4.22 Engine Transaction Apply

请在 `kanzakimy0/TravelAssist` 仓库中完整执行 `TASK-063-B`。

## Canonical Task

```bash
git show origin/task/b-wbs-4-22-engine-transaction-apply:docs/tasks/TASK-063-b-wbs-4-22-engine-transaction-apply.md
```

GitHub Issue: `#380`

## Before Anything Else

先执行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

然后读取：

```bash
git show origin/task/b-wbs-4-22-engine-transaction-apply:docs/tasks/TASK-063-b-wbs-4-22-engine-transaction-apply.md
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/project/WBS-8.5-owner-correction.md
git show origin/develop:docs/architecture/travelassist-engine-contract.md
git show origin/develop:docs/architecture/rule-feasibility-engine.md
git show origin/develop:docs/architecture/trip-plan-persistence.md
git show origin/develop:docs/tasks/RESULT-WBS-4.21-b-rule-feasibility-engine.md
git show origin/develop:docs/tasks/RESULT-TASK-062-b-wbs-8-5-trip-plan-schema-integration-closeout.md
```

以及当前：

```text
src/shared/contracts/engine/**
src/shared/contracts/trips/**
src/server/engine/**
src/server/trips/**
src/db/schema/**
supabase/migrations/**
src/types/database.generated.ts
```

## Hard prerequisites

必须重新确认：

```text
4.20   已完成 / Frozen
4.20.1 已完成
4.21   已完成
8.1    已完成
8.3    已完成
8.4    已完成
8.5    B / 已完成
```

`docs/project/WBS-8.5-owner-correction.md` 是 8.5 Owner 的权威修正。

若任一硬前置不满足，准确返回 Blocked，不绕过。

## Implementation branch

从执行时最新、干净的 `origin/develop` 建独立 worktree / branch：

```text
codex/b-wbs-4-22-engine-transaction-apply
```

禁止：

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
rebase / history rewrite
```

不要覆盖或删除用户现有未提交内容、worktree、outputs 或缓存。

## Core objective

实现真正的 server-only Engine `apply`：

```text
Auth user
  → parse ChangeSet
  → authoritative DB Trip/Plan lock/read
  → owner + actor + trip/plan base revision recheck
  → rerun accepted 4.21 validate/preview
  → only zero-blocking / zero-unsupported / zero-confirmation candidate
  → atomically persist canonical candidate
  → actual resulting revisions
  → persistent idempotency terminal record
  → minimal accepted audit
  → one pending outbox record
  → commit
```

不得接受 caller-provided snapshot 作为 authoritative apply state。

## Operation capability — strict

当前仅允许 apply 已被 4.21 实际支持的：

```text
UPDATE_TIME
REORDER_ITEMS
```

其他 4.20 whitelist operation 一律继续 unsupported，除非执行时最新 develop 已有独立已验收任务明确启用；若发生这种情况，先在 Result 记录证据再决定是否纳入。

不要自行启用 ADD/MOVE/DELETE/REPLACE/UPDATE_DURATION/booking/skip/restore/replan 等。

`source.kind` 当前只允许 `user` apply；AI/system/provider_event 不实现。

## Confirmation boundary

4.21 若产生任何 `confirmationRequirements`：

```text
return needsConfirmation
Trip mutation = 0
accepted audit = 0
outbox = 0
```

不要发明 `confirmed:true`、客户端 role、任意 grant JSON 或 UI flag 作为授权。

本 Task 不实现正式 confirmation-grant issuance/approval UI。

## Auth / permission

- 使用真实 request-scoped Auth。
- owner-only Trip persistence 不改变。
- `source.actorRef` 必须由可信服务边界绑定/核对真实 authenticated actor。
- cross-user / anonymous / actor mismatch fail closed。
- 不泄露另一用户 Trip 是否存在或内容。
- 不把 service-role secret 暴露到 client。
- 不弱化现有 Trip RLS 来换取实现方便。

## Version / transaction

apply transaction 内必须重新验证：

```text
tripRevision
planRevision
```

使用现有 8.5 SQL revision/CAS/ancestor trigger 语义；不得建立第二套 revision。

成功后返回的 `resultingVersion` 必须等于数据库真实最终 Trip / Plan revision。

任一 business mutation + revision + terminal idempotency + audit + outbox 必须同事务。

显式 transaction failure：完整 rollback；不得 partial accepted。

## Idempotency

至少实现：

```text
same actor + same key + same canonical payload hash
    → replay original terminal result
    → replay.duplicate=true
    → no second mutation/audit/outbox

same actor + same key + different payload hash
    → idempotency conflict
    → no mutation

concurrent same key
    → max one commit
```

canonical hash 必须与 object key 顺序无关。

不得存 raw provider payload、token、auth header、payment data、UI state。

unknown-commit 时用原 idempotency key 对账，不得让调用者换 key 盲重试。

## Audit / outbox

新增的 Engine DB 记录必须最小化、安全且可审计。

成功 transaction：

```text
Trip mutation
+ actual revisions
+ terminal idempotency
+ exactly 1 accepted audit
+ exactly 1 pending outbox
```

Outbox delivery/consume 不做，留给 4.23。

旧 migration 绝对不修改；新 DB 结构使用新 SQL migration。Drizzle 为 mirror；public schema 改动后真实运行 `db:types`。

## Existing persistence reuse

不要写第二套 Trip model / writer。

复用 8.5 的：

```text
src/server/trips/repository.ts
src/server/trips/projection.ts
src/db/schema/trips.ts
现有 Trip SQL revision/RLS trigger
```

如果需要同一 transaction 内复用，可重构 transaction-scoped internal primitives，但现有 8.5 行为与测试必须保持。

## Mandatory acceptance

至少真实 Local Supabase/Auth 验证 Task 中列出的 20 项 focused gates，包括：

- UPDATE_TIME / REORDER_ITEMS exactly-once apply
- canonical round-trip
- actual resulting revisions
- stale trip / stale plan
- cross-user / anonymous / actor mismatch
- locks / booking / unsupported / confirmation no-write
- same-key replay
- same-key different-payload conflict
- concurrent same-key
- concurrent stale-base different keys
- forced mid-transaction rollback
- exactly-one audit/outbox
- account deletion / no unsafe orphan records
- 8.5 + Personal Center coexistence regression

不要把未执行的 network unknown-commit 写成 PASS；可以做 deterministic fault boundary + real reconciliation test。

## Mandatory QA

完整执行 Task 中 QA 矩阵。至少包括：

```bash
npm ci
npm run db:start
npm run db:status
npm run db:reset
npm run db:types
npm run test:trip-plan
npm run test:trip-plan:runtime
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

- clean latest-develop full Node baseline
- existing 4.21 focused suite
- new TASK-063 pure tests
- new TASK-063 Local runtime tests
- relevant migration/account-deletion/A+B coexistence regression
- candidate full Node regression
- scoped Prettier / `git diff --check`
- exact final-head GitHub Quality Gate PASS

必须记录测试总数、pass/fail/skip 和初始失败的真实处理过程。

## WBS

实际开始后：

```text
4.22 = B / 进行中（#380 / TASK-063-B）
```

完成实现+QA+Draft PR 后：

```text
4.22 = B / 待审查（#380 / TASK-063-B；Draft PR #...）
```

只有用户验收并合入 develop 后才能写 `已完成`。

不要启动或修改 4.23 / 4.24。

## Required outputs

```text
docs/tasks/RESULT-TASK-063-b-wbs-4-22-engine-transaction-apply.md
architecture / DB transaction + idempotency + audit/outbox design update
new migration(s) if required
Drizzle/generated types as applicable
TASK-063 tests
docs/qa/TASK-063/README.md
docs/qa/TASK-063/* machine-readable evidence
docs/project/WBS-TravelAssist.md
Draft PR → develop
```

## Explicitly out of scope

- 4.23 event delivery/recompute/rollback execution
- 4.24 broad final acceptance campaign
- confirmation-grant UI/issuance without frozen policy
- unsupported Engine ops
- AI/system/provider-event apply
- Booking/Payment side effects
- live Provider calls
- Planner/Detail UI
- 4.18/4.19 wiring
- Production/Staging DB
- unrelated refactors

完成后停止在 Draft PR + Result。不要自动 merge，不要自动关闭 #380，不要启动 4.23/4.24。
