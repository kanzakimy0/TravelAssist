# CODEX COMMAND — TASK-067-B / WBS 3.7

Execute TASK-067-B completely in `kanzakimy0/TravelAssist`.

## Repository

```text
https://github.com/kanzakimy0/TravelAssist
```

## Issue

```text
#391
```

## Required start checks

Run first and preserve the output in Task evidence:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Do not destroy or clean user work.

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
history rewrite / destructive rebase
```

## Read the authoritative publication files

```bash
git show origin/task/b-wbs-3-7-main-system-state-runtime:docs/tasks/TASK-067-b-wbs-3-7-main-system-state-runtime.md
git show origin/task/b-wbs-3-7-main-system-state-runtime:docs/project/WBS-3.7-owner-correction.md
```

Then read the accepted Frozen design from the **execution-time latest `origin/develop`**:

```bash
git show origin/develop:docs/ui/main-system-loading-empty-error-skeleton.md
```

Also inspect:

```text
docs/project/WBS-TravelAssist.md
WBS 1.13 accepted token/accessibility docs
current Home / Start / Planner / Detail / Route / AI shell source
current shared UI and existing state components/tests
```

If latest develop has advanced since Task publication, use the latest accepted code and record drift. Do not roll source back to the publication baseline.

## Execution branch

Create/use a dedicated clean worktree from the execution-time latest `origin/develop`:

```text
codex/b-wbs-3-7-main-system-state-runtime
```

Do not develop on the Task publication branch.

## WBS start update

When implementation actually begins, update only WBS 3.7:

```text
3.7 = B / 进行中（#391 / TASK-067-B；用户授权单项代做）
```

Do not reassign unrelated A work.

## Core mission

Implement WBS 1.20 Frozen v0.1 state presentation in the current main system:

```text
Loading
Skeleton
Empty / first use
Empty / no result
Recoverable Error
current-runtime invalid/blocking states
Retry pending / recovery
Partial Degradation
actual request/connection failures
```

Cover/audit:

```text
Home
Start
Planner shell
Planner Map
Recommendation / Right Rail
Timeline / Summary
Trip Detail
Route Preview
AI Visual Shell
Modal / Drawer / Popover
```

## Non-negotiable truthfulness rule

Only implement a production state when the current owning runtime can truthfully produce it.

Do NOT create fake production conditions, fake query switches, fake timers, fake network calls, fake AI thinking, fake Provider failures, fake remote Trip errors, or any production backdoor merely to make a Frozen matrix row testable.

Conditional design states that current runtime cannot produce must be classified in QA as conditional/unreachable, not fabricated and not called PASS.

## Expected implementation shape

Audit existing shared UI first, then create the smallest reusable state presentation layer necessary. Prefer existing shared UI boundaries; do not create a second design system.

The implementation should provide reusable equivalents for applicable current states such as:

```text
accessible loading/status text
structural skeleton
page/section state container
empty state
error/degraded state
optional safe action/retry
retry-pending behavior
compact Planner-panel variant
```

Use current accepted Design Tokens only.

## Frozen invariants

Must preserve:

```text
local failure -> local degradation where safe
preserve valid Start/Planner user state
permission/privacy safety over stale-content preservation
Empty != Error
Skeleton != Progress
no fake percentage / ETA
retry smallest real failed operation
no Retry without real retry capability
Map/Route/AI failure != Trip deleted
no raw SQL/Auth/Provider/stack/token leakage
pending action cannot duplicate-submit
closing loading UI != cancel/rollback/success
unknown write outcome cannot auto-resubmit with new identity
not connected/not supported != transient network failure
no Planner Grid/Drawer/Sheet/Detail redesign
```

## Route boundary

Improve presentation of the current truthful Route states only. Preserve existing Provider/production gates and canonical route data.

Do not enable 7.3/7.8 production Provider capability.

## AI boundary

If execution-time develop still has AI sending/runtime disabled, keep it disabled/not-connected.

Do not add AI requests, retry, streaming, fake thinking or fake error paths.

## Persistence boundary

Existing browser/local persistence errors may receive Frozen presentation.

Do not implement WBS 4.19 or a new remote Trip persistence/loading path.

## Accessibility

Implement and test:

```text
>=44x44 new state actions where applicable
keyboard reachable retry/back/close
visible focus
properly scoped aria-busy
appropriate status/alert live-region behavior
decorative skeleton hidden from accessibility tree
nonfocusable skeleton
reduced-motion static/no-shimmer behavior
focus retention/restoration after retry/overlay transitions
no local non-modal focus trap
existing host Escape/focus-return semantics preserved
```

## Responsive/browser coverage

Verify truthful reachable states at least at:

```text
>=1440 desktop
~1024 compact desktop/tablet
~390 mobile
~320 narrow mobile
current short-height Planner behavior where relevant
```

Use browser/E2E/screenshots only for deterministically reachable states without live/paid external providers.

## QA evidence

Create:

```text
docs/qa/TASK-067/README.md
```

Prefer also:

```text
docs/qa/TASK-067/state-runtime-matrix.json
```

Classify Frozen rows using explicit states such as:

```text
IMPLEMENTED_AND_TESTED
ALREADY_SATISFIED_UNCHANGED
CONDITIONAL_NOT_CURRENTLY_REACHABLE
OUTSIDE_CURRENT_RUNTIME_CAPABILITY
BLOCKED_BY_SEPARATE_OWNER
```

Do not equate design coverage with runtime PASS.

## Required tests/gates

Run and record applicable gates:

```text
focused TASK-067 tests
relevant existing Home/Start/Planner/Route tests
full Node suite
lint
typecheck
format check
build / local deployment validation required by Quality Gate
git diff --check
browser/E2E for reachable TASK-067 states
exact final-head GitHub Quality Gate
```

No live/paid Provider calls.
No Production/Staging DB.
DB/schema/migrations are out of scope; if they appear necessary, stop scope expansion and report it instead.

## Required result

Create:

```text
docs/tasks/RESULT-TASK-067-b-wbs-3-7-main-system-state-runtime.md
```

The Result must state exact base/head, changed files, runtime integrations, conditional/unreachable Frozen rows, accessibility/responsive/browser evidence, test counts, Quality Gate run, and confirm no out-of-scope capability expansion.

## Final WBS candidate state

After implementation + evidence + one Draft PR:

```text
3.7 = B / 待审查（#391 / TASK-067-B；Draft PR #...）
```

Do not mark completed before user acceptance and merge.

## Delivery

Push the execution branch and create exactly one Draft PR:

```text
codex/b-wbs-3-7-main-system-state-runtime -> develop
```

Do not auto-merge.
Do not close Issue #391 unless separately authorized.
Do not start another WBS item.

Return the complete TASK-067-B Result to the user for acceptance review.