# CODEX — TASK-065-B / WBS 4.24 Engine Integration Certification

请在 `kanzakimy0/TravelAssist` 仓库中完整执行 `TASK-065-B`。

## Canonical Task

```bash
git show origin/task/b-wbs-4-24-engine-integration-certification:docs/tasks/TASK-065-b-wbs-4-24-engine-integration-certification.md
```

GitHub Issue: `#387`

## Before Anything Else

先执行并记录：

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

然后读取完整 Task 与当前权威基线：

```bash
git show origin/task/b-wbs-4-24-engine-integration-certification:docs/tasks/TASK-065-b-wbs-4-24-engine-integration-certification.md
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/project/WBS-4.23-acceptance-closeout.md
git show origin/develop:docs/architecture/travelassist-engine-contract.md
git show origin/develop:docs/architecture/rule-feasibility-engine.md
git show origin/develop:docs/architecture/engine-transaction-apply.md
git show origin/develop:docs/architecture/engine-runtime-events-rollback.md
git show origin/develop:docs/tasks/RESULT-TASK-063-b-wbs-4-22-engine-transaction-apply.md
git show origin/develop:docs/tasks/RESULT-TASK-064-b-wbs-4-23-engine-runtime-recompute-rollback.md
```

并审计当前：

```text
src/shared/contracts/engine/**
src/shared/contracts/trips/**
src/shared/contracts/routes/**
src/server/engine/**
src/server/trips/**
src/db/schema/engine-apply.ts
src/db/schema/engine-runtime.ts
src/db/schema/trips.ts
supabase/migrations/**
src/types/database.generated.ts
tests/*engine*
tests/task-063*
tests/task-064*
```

## Hard prerequisites

必须确认：

```text
4.20 = B / 已完成 / Frozen
4.20.1 = B / 已完成
4.21 = B / 已完成
4.22 = B / 已完成
4.23 = B / 已完成
8.5 = B / 已完成
7.5 = 已完成
PR #382 = merged
PR #384 = merged
```

如执行时硬前置不成立，返回 `Blocked`，不要绕过。

## Worktree / Branch

从执行时最新干净 `origin/develop` 建独立 worktree：

```text
codex/b-wbs-4-24-engine-integration-certification
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

## Core rule

这是 **Engine v0.1 当前已合并子集的最终认证 Task**，不是功能扩展 Task。

当前认证范围只有：

```text
4.21 validate / preview
4.22 apply / reconcile
4.23 runtime recompute / compensating rollback
source.kind = user
operations = UPDATE_TIME / REORDER_ITEMS
```

不要开启任何其他 operation/source。

优先新增测试、fault harness、seeded fuzz 和证据。只有发现真实缺陷才做最小 runtime 修复。

如果修复需要：

```text
修改 Frozen public semantics
新增 operation
新增 confirmation grant
新增 Product/Auth/Booking policy
扩展 Provider capability
```

则保持 fail-closed，并在 Result 标记 deferred / requires amendment，不得偷偷实现。

## Mandatory certification A — deterministic / replay / fuzz

必须有固定 seed 的可回放 deterministic generator。

覆盖：

```text
accepted
blocked
needsConfirmation
unsupported
invalid input
stale version
invalid target
invalid schedule/order
unknown field/version/op
unsupported source
oversize / duplicate ID
key-order / whitespace invariance
semantic payload changes
```

至少：

```text
>= 5,000 deterministic generated/replayed pure Engine cases
```

记录 seed、分布、失败数和可重现 case。

## Mandatory certification B — apply concurrency

使用真实 Local PostgreSQL/Auth session。

必须验证：

```text
same actor + same key + same payload
  >=16 concurrent requests
  <=1 mutation/audit/outbox/preimage

same key + mixed payload
  deterministic conflict

different keys + same stale base
  >=16 concurrent requests
  no lost update

different Plans / same Trip
  root revision serialization

independent Trips
  both may commit

same key / different actors
  isolated

cross-user / anon / actor mismatch
  fail closed / no existence leak
```

总计：

```text
>= 100 real-DB apply concurrency rounds
```

## Mandatory certification C — transaction fault / unknown outcome

真实 transaction + deterministic fault boundary 覆盖：

```text
lost/ambiguous COMMIT acknowledgement
post-COMMIT terminal read failure
known COMMIT rejection
Trip write fault
receipt/audit fault
preimage fault
outbox fault
deferred/commit constraint failure
```

要求：

```text
unknown outcome 只用 original key/payload reconcile
known rollback 可用 original key retry
绝不建议换 key 绕过 unknown outcome
无 partial accepted state
```

不要伪称执行了未实际执行的 live network partition。

## Mandatory certification D — runtime outbox workers

创建真实 accepted outbox batch。

至少：

```text
>=100 outbox events
>=8 concurrent worker loops
```

证明：

```text
SKIP LOCKED / lease / fencing 正确
one terminal runtime result per event max
expired claim recoverable
stale token cannot publish
bounded retry / terminal exhaustion
repeat invocation idempotent
current authoritative revision used
recompute read-only
Route facts only through 7.5 validator
missing/stale/invalid facts fail closed
no live Provider call
```

必须包含明确 lease-expiry/recovery subset。

## Mandatory certification E — rollback races

覆盖：

```text
UPDATE_TIME
REORDER_ITEMS
```

证明：

```text
rollback = new forward apply/revision
never decrement/reset revision
original receipt/audit immutable
compensation own receipt/audit/outbox/preimage
exactly one original→compensation link
same retry idempotent
different rollback keys race => at most one success
second rollback cannot flip back
compensation receipt cannot start flip-flop chain
state drift => ROLLBACK_CONFLICT / no mutation
historical no-preimage => unsupported / no mutation
current lock/booking/payment/protection/context may block
```

另外必须测试：

```text
rollback vs normal apply race on same target
```

总计：

```text
>=100 rollback/concurrent-race rounds
```

## Mandatory certification F — DB invariant graph

每个 focused scenario 与 aggregate soak 后检查：

```text
accepted normal apply:
  exactly 1 accepted receipt
  exactly 1 audit
  exactly 1 outbox
  exactly 1 required preimage

accepted compensation:
  own receipt/audit/outbox/preimage
  exactly 1 compensation relation

non-accepted:
  no accepted audit/outbox/preimage
  no Trip mutation

runtime event:
  <=1 runtime result

all revisions:
  positive and monotonic
  never decrease
  returned resultingVersion == DB actual

no orphan / duplicate Engine metadata
account deletion cascade safe
browser/anon/authenticated cannot forge/read internal metadata
```

## Mandatory certification G — data minimization / security

扫描 Engine 持久化数据，确认没有：

```text
full Trip snapshot
full trusted context
raw Provider response
token / Authorization / cookie
service credential
payment payload
private Booking payload
React / Mapbox / UI state
```

错误返回不得泄漏 raw SQL/provider/auth/foreign target detail。

## Mandatory certification H — regressions

必须保留并执行当前 canonical equivalents：

```text
4.21 focused suite
TASK-063 pure + Local
TASK-064 pure + Local
Trip Contract/parser/fixtures
npm run test:trip-plan
npm run test:trip-plan:runtime
npm run test:routing
8.5 Trip persistence/RLS/CAS
A+B persistence coexistence
Personal Center migration/account deletion Local regression
现有 Save/History coexistence tests（如当前仓库已有）
full repository Node baseline/candidate
```

不要因此接 Planner 4.18/4.19。

## Open decisions

读取 Frozen Contract §25。

对当前 runtime 真正涉及的项，在 certification report 中分类：

```text
CERTIFIED_FOR_CURRENT_SUBSET
DEFERRED_FAIL_CLOSED
REQUIRES_AMENDMENT
```

不要把尚缺 Product/Provider/Booking/AI Owner 决策的条目伪装成已解决。

## Required certification report

必须创建：

```text
docs/architecture/engine-v0.1-certification.md
```

必须包含：

```text
Certified now
Deferred / fail-closed
Defects discovered/fixed
Residual risks
Reproducible seeds / soak sizes / final evidence
```

如果没有发现 runtime bug，要明确写“没有为了制造改动而修改 runtime”。

## Mandatory QA

至少执行：

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
clean latest-develop full Node baseline
second reset/types deterministic replay
4.21 focused regression
TASK-063 pure + Local regression
TASK-064 pure + Local regression
TASK-065 >=5,000 seeded deterministic pure cases
TASK-065 >=100 apply concurrency rounds
TASK-065 >=100 events / >=8 runtime workers
TASK-065 >=100 rollback/race rounds
fault/unknown-outcome matrix
account deletion / PC / A+B coexistence
candidate full Node regression
Task-owned/scoped Prettier
git diff --check
synthetic fixture cleanup
exact final-head GitHub Quality Gate PASS
```

没有实际执行的 mandatory gate 不得写 PASS。

## Evidence

产出：

```text
docs/qa/TASK-065/README.md
docs/qa/TASK-065/<machine-readable evidence>.json
```

机器证据至少记录：

```text
execution base / final head
commands / exit codes / counts
seeds / distributions
apply concurrency rounds
outbox event + worker counts
rollback race rounds
fault cases
DB invariant results
migration/type replay hashes
cleanup results
exact final-head CI run/head
```

禁止在证据中写入 Secret/Token/credential/raw provider payload。

## WBS

Task publication 不等于开始执行。

Codex 实际开始时：

```text
4.24 = B / 进行中（#387 / TASK-065-B）
```

实现、QA、Draft PR 完成后：

```text
4.24 = B / 待审查（#387 / TASK-065-B；Draft PR #...）
```

只有用户明确验收 + merge develop 后才能：

```text
4.24 = B / 已完成
```

不要修改其他 WBS 状态/Owner。

## Required delivery

必须产出：

```text
docs/tasks/TASK-065-b-wbs-4-24-engine-integration-certification.md
docs/tasks/CODEX-TASK-065-b-wbs-4-24-engine-integration-certification.md
docs/tasks/RESULT-TASK-065-b-wbs-4-24-engine-integration-certification.md
docs/architecture/engine-v0.1-certification.md
docs/qa/TASK-065/README.md
docs/qa/TASK-065/<machine-readable evidence>.json
```

以及必要的新测试 / fault harness。只有真实 correctness bug 需要时才做最小 runtime/schema fix。

创建：

```text
Draft PR → develop
```

## Explicitly out of scope

禁止：

```text
new operation families
Frozen public semantic change without amendment
AI/system/provider_event apply
confirmation grant implementation
Booking/Payment/refund/rebooking
live/paid Provider call or Provider selection
Planner/Detail UI/HTTP product wiring
4.18 / 4.19 implementation
production cron/daemon/broker
Production/Staging DB mutation
historical migration rewrite
unrelated refactor
```

## Stop

完成后：

- 不自动 merge Draft PR；
- 不自动关闭 Issue #387；
- 不在用户验收前把 4.24 标记已完成；
- 返回完整 `TASK-065-B Result` 给用户验收。
