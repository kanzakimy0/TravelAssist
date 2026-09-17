# TASK-067-B — WBS 3.7 Main System Loading / Empty / Error Runtime Implementation

## Metadata

- Task ID: `TASK-067-B`
- WBS: `3.7 — 主系统 Loading / Empty / Error`
- Owner: `B` — user-authorized single-item exception
- Priority: `P1`
- Status at publication: `Ready / not started`
- Dependencies:
  - `1.20 — 主系统 Loading / Empty / Error / Skeleton` — completed, **Frozen v0.1**
  - `3.1 — 全局 Main Layout / Header` — completed
- GitHub Issue: `#391`
- Publication baseline: `develop@3a2779aee65c7335413adcc53ee5b4f7135c654c`
- Task publication branch: `task/b-wbs-3-7-main-system-state-runtime`
- Planned execution branch: `codex/b-wbs-3-7-main-system-state-runtime`
- Design authority: `docs/ui/main-system-loading-empty-error-skeleton.md`

## 1. Purpose

Implement the accepted WBS 1.20 **Frozen v0.1** main-system state design in the current TravelAssist runtime.

The implementation must provide a coherent, reusable and accessible presentation layer for the main system's truthful runtime states:

- Loading
- Skeleton
- Empty / first use
- Empty / no result
- Recoverable Error
- Non-recoverable / invalid state when current runtime already exposes one
- Retry pending / recovery feedback
- Partial degradation
- Generic request/connection failure only where a real request exists

This Task is **presentation/runtime integration**, not a feature-capability expansion.

The implementation must not invent new domain facts, APIs, Provider access, AI behavior, persistence behavior, Planner architecture, or business outcomes merely to make a state visible.

## 2. Ownership and boundary gate

Read first:

- `docs/project/WBS-3.7-owner-correction.md`
- `docs/project/WBS-TravelAssist.md`
- `docs/ui/main-system-loading-empty-error-skeleton.md`
- WBS 1.20 final closeout / Frozen v0.1 tracking
- WBS 1.13 final token/accessibility documents

The user authorized only WBS 3.7 as a B-owned exception in this Task.

At actual execution start, synchronize only WBS 3.7 to:

```text
B / 进行中（#391 / TASK-067-B；用户授权单项代做）
```

Do not reassign unrelated A work.

## 3. Start gate

Before changing anything, record:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Use a dedicated clean worktree and create the execution branch from the **execution-time latest** `origin/develop`:

```text
codex/b-wbs-3-7-main-system-state-runtime
```

Do not implement from the Task publication branch.

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
history rewrite / destructive rebase
```

Preserve user files, unrelated branches, worktrees and untracked content.

## 4. Mandatory revalidation before implementation

The Task was published from `3a2779a...`, but implementation must use the latest `origin/develop` available at execution time.

Before coding:

1. confirm WBS 1.20 is still `已完成 / Frozen v0.1`;
2. confirm the Frozen design document exists and has not been superseded;
3. confirm WBS 3.7 has not already been implemented or reassigned by another accepted change;
4. compare current Home / Start / Planner / Detail / Route / AI shell runtime with the Frozen audit;
5. record any legitimate drift in `docs/qa/TASK-067/README.md`.

If `develop` has advanced, integrate the latest accepted runtime rather than restoring publication-time source.

## 5. Canonical design authority

The runtime implementation is governed by:

```text
docs/ui/main-system-loading-empty-error-skeleton.md
```

Status on publication baseline: **Frozen v0.1**.

Do not reinterpret the design into a new taxonomy, palette, token system, or layout.

At minimum preserve the Frozen semantic classes:

- Initial page loading
- Section loading
- Skeleton
- Empty / first use
- Empty / no result
- Recoverable error
- Non-recoverable / permission / invalid
- Partial degradation
- Generic connection/request failure
- Retry pending

These are presentation semantics, not permission to add a new domain enum or API contract.

## 6. Critical truthfulness gate

**Only wire a state to production UI when the current owning runtime can truthfully determine that state.**

Do not add fake conditions, debug query parameters, fake timers, fake network calls, test-only production branches, or fabricated service results merely to satisfy the matrix.

Examples:

### Route

The current route query already has meaningful states such as disabled/loading/stale/no-route/unsupported/error where applicable. WBS 3.7 may improve their presentation according to Frozen v0.1.

It must not:

- enable a live/paid Provider;
- change Provider selection;
- change 7.5 route contract semantics;
- weaken existing production/development gates;
- invent live fare/timetable freshness.

### AI

If AI sending/runtime remains disabled, the UI must continue to represent **not connected / unavailable capability truthfully**.

Do not create:

- fake thinking/loading;
- fake retry;
- fake AI error from a capability that was never invoked;
- new AI requests or streaming.

### Trip Detail / remote persistence

Current Detail behavior must follow the current accepted runtime. If remote Trip missing/permission states are not yet available from an owning runtime, do not invent them.

Do not implement WBS 4.19 or remote Trip loading in this Task.

### Save / local browser persistence

Existing browser/local persistence errors may receive the Frozen presentation if those failures already exist.

Do not turn this Task into a new server persistence path.

## 7. Required shared state layer

Audit current shared UI and feature-local state components before adding files.

Create the **smallest reusable layer** necessary to prevent duplicate state implementations across Home / Start / Planner / Detail.

Prefer extending existing `src/components/ui/**` or an existing accepted shared presentation location.

The shared layer should support, as needed by current runtime:

- accessible status/loading text;
- structural skeleton primitives;
- page/section state container;
- empty state with optional safe primary/secondary actions;
- error/degraded state with optional safe retry/back actions;
- retry-pending semantics;
- shared icon/title/body/action arrangement;
- compact variants that fit Planner panels/Drawers/Sheets;
- full-region variants without creating a new full-page layout system.

Do not create a second design system or duplicate Button/Typography/token primitives.

## 8. Styling requirements

Reuse accepted WBS 1.13 tokens and current component aliases.

Do not add a second palette for Loading/Warning/Error.

Use the Frozen role-based mapping for:

- neutral loading/skeleton surfaces;
- empty-state containers;
- degraded/warning state;
- blocking error state;
- typography hierarchy;
- border/radius/shadow;
- focus ring;
- overlay/backdrop only where the existing host is blocking/modal.

New CSS must be scoped and minimal.

No broad visual refactor of Home/Start/Planner/Detail is allowed.

## 9. Geometry preservation

Do not redesign main-system geometry.

Hard requirements:

- Planner Grid stays on its current accepted tracks/breakpoints;
- Map viewport stays mounted when the current runtime can safely retain it;
- Right Rail/Drawer dimensions and opening model remain owned by the existing shell;
- Bottom Timeline/Summary rail geometry remains unchanged except content replacement inside an existing slot;
- Detail continues using its current accepted workspace model;
- Start keeps its current Wizard shell;
- Home Hero/Header/CTA composition is not redesigned;
- skeletons match the region they replace closely enough to prevent avoidable layout shift.

If an existing geometry defect unrelated to state presentation is found, document it; do not fix it inside TASK-067-B unless the defect directly prevents correct 3.7 behavior and the fix is narrowly scoped.

## 10. Required surface audit and integration

Audit all ten Frozen surfaces. Integrate only applicable, truthful current-runtime states.

### 10.1 Home

Audit:

- public Hero/CTA availability;
- viewer/account presentation;
- static background baseline;
- AI visual entry/shell.

Requirements:

- public Home must not become a full-page Auth error because viewer data is unavailable;
- decorative/video/background degradation must not disable Start CTA;
- current AI not-connected truth remains explicit;
- use shared state presentation only where there is a genuine current state to represent.

### 10.2 Start wizard

Audit current draft restoration, steps and generation/demo behavior.

Requirements:

- preserve user-entered values on recoverable state changes;
- do not replace the current local/demo generation truth with fake server progress;
- no invented percentage/ETA;
- duplicate submission/action prevention for touched pending actions;
- errors stay scoped to the step/operation when the Wizard can remain usable.

### 10.3 Planner shell

Requirements:

- local/section failure must not blank the entire workspace unnecessarily;
- preserve current valid Trip/plan/date/filter/selection state;
- blocking page state only when the main resource truly cannot be safely presented;
- do not create a second Planner store.

### 10.4 Planner Map

Audit current Mapbox/fallback behavior.

Requirements:

- if a current map failure/fallback is representable, use Frozen degraded-state treatment;
- keep other Planner surfaces usable;
- do not imply the itinerary was deleted;
- do not fabricate route geometry;
- do not enable Provider capability.

### 10.5 Recommendation / Right Rail

Requirements:

- structural skeleton only when there is a truthful pending state;
- empty state only after confirmed zero result;
- do not invent recommendation candidates;
- preserve current selection/settings and Drawer state.

### 10.6 Timeline / Summary

Requirements:

- section state replaces only the failing/unknown subregion;
- preserve known date/tab/item information;
- skeleton must not draw fake time proportions when duration is unknown;
- do not clear Trip state to recover a summary failure.

### 10.7 Trip Detail

Requirements:

- keep the current shared Planner-backed Detail model;
- preserve current safe data while a subordinate section is loading/failing;
- do not invent permanent remote Trip URLs or remote not-found/permission handling;
- local/browser persistence failure presentation may be improved only against existing behavior.

### 10.8 Route Preview

This is one of the strongest current-runtime integrations for 3.7.

Preserve distinct meanings for currently supported states, including as applicable:

- disabled/not opened;
- loading;
- stale;
- no route;
- unsupported;
- recoverable error;
- valid result.

Requirements:

- no raw Provider error;
- no fake timetable/fare/geometry;
- retry only where the existing operation is retryable;
- stale data must remain visibly stale and must not become a success state merely because it exists;
- repeated retry must not fan out duplicate requests.

### 10.9 AI Visual Shell

Requirements:

- retain current disabled/not-connected behavior unless execution-time `develop` contains an independently accepted AI runtime;
- if no runtime exists, do not add network retry/loading/error paths;
- existing input/close/focus behavior remains intact.

### 10.10 Modal / Drawer / Popover

Requirements:

- state content inherits the host's modal/non-modal semantics;
- loading must not accidentally create a focus trap in non-modal UI;
- modal focus trapping/return remains owned by the existing host;
- tooltips/read-only popovers must not gain interactive retry buttons if their host semantics do not support them.

## 11. Frozen UX invariants to enforce in code

The implementation must preserve at least these invariants:

1. Prefer section-level degradation when one dependency fails.
2. Do not discard valid Start/Planner user state because a subordinate capability failed.
3. Privacy/permission safety overrides stale-content preservation.
4. Empty is a successful zero-data result, not a request failure.
5. Skeleton is structural placeholder, not progress.
6. No fake percentage, ETA or stage completion.
7. Retry the smallest failed operation possible.
8. Do not render Retry without an actual authorized recovery action.
9. Route/Map/AI failure must not imply Trip deletion.
10. Raw SQL/Auth/Provider/stack/token details are never user-facing.
11. Color is supplementary; state meaning must be readable without color.
12. Existing navigation/safe escape remains usable whenever the shell can safely remain rendered.
13. Loading/pending state prevents duplicate activation of the same operation.
14. Disappearance/closure of a loading state does not equal success/rollback/cancel.
15. Unknown write outcome must not auto-resubmit under a new idempotency identity.
16. Not-supported / not-configured / not-connected is not automatically a transient network error.

## 12. Accessibility implementation requirements

This Task must implement and test accessibility behavior, not only document it.

At minimum:

- new interactive state actions are at least 44×44px where applicable;
- retry/back/close actions are keyboard reachable;
- visible focus uses existing accepted focus roles;
- `aria-busy` is scoped to the affected page/region, not the entire application by default;
- loading/status updates use an appropriate single status/polite announcement;
- blocking action failures use alert semantics only when interruption is warranted;
- decorative skeletons are `aria-hidden` / otherwise excluded from the accessibility tree;
- skeleton blocks are never focusable;
- reduced-motion disables shimmer/nonessential transitions;
- focus is retained or intentionally restored after retry completion/failure;
- no non-modal local state introduces a focus trap;
- overlays keep existing Escape/focus return behavior.

## 13. Responsive implementation requirements

Verify at least:

- desktop `>=1440`;
- compact desktop/tablet around `1024`;
- mobile around `390`;
- narrow mobile around `320`;
- current short-height Planner breakpoint where relevant.

Requirements:

- no new horizontal overflow;
- critical recovery action does not rely on hover;
- compact state copy wraps naturally;
- narrow/mobile state actions may stack vertically;
- Drawer/Sheet/Map controls remain reachable;
- safe-area/soft-keyboard behavior remains consistent with current host;
- state UI does not rewrite existing main-system breakpoints.

## 14. Retry and concurrency behavior

For every retry action implemented:

- retry must invoke the existing smallest operation, not refresh/replace the whole page unless that is the real recovery boundary;
- while pending, repeated activation is ignored/disabled by actual behavior, not only visual styling;
- completion must be derived from the real operation result;
- failure remains failure and can be retried again only according to the owning operation semantics;
- no automatic infinite retry/polling;
- no request fan-out;
- cancellation/closing must not be described as server cancellation unless the owning operation really supports it.

## 15. Error sanitization

User-facing state content may use stable safe domain/presentation categories.

Never render directly:

- raw exception message from unknown source;
- SQL error;
- stack trace;
- Provider payload/error body;
- access token/session/cookie data;
- database URL/project key;
- internal authorization reason that leaks another user's resource existence;
- unbounded serialized error objects.

If existing runtime already sanitizes errors, reuse it rather than creating a parallel sanitizer.

## 16. Tests — required pure/unit coverage

Add focused deterministic tests for the shared state layer and every changed feature integration.

At minimum cover:

### Shared state semantics

- Empty vs Error are distinct;
- first-use vs no-result can use distinct content/action intent;
- error action is optional and not invented;
- skeleton is decorative/noninteractive;
- reduced-motion variant stops shimmer/nonessential animation;
- state action disabled/pending semantics;
- no unsafe raw error interpolation.

### Route

Verify current supported route states remain distinct and truthful:

- disabled;
- loading;
- stale;
- no-route;
- unsupported/error as applicable;
- valid.

Verify state presentation changes do not modify canonical route data or Provider gating.

### Planner preservation

For touched Planner paths, verify state presentation does not mutate:

- active plan;
- selected day/range;
- selected stop where unrelated;
- user-edited settings/draft;
- route geometry/data;
- booking/confirmation status.

### AI

If runtime remains disabled, verify the Task does not enable Send/network behavior.

## 17. Browser / E2E acceptance

Use the repository's accepted browser/E2E harness for states that can be **deterministically and truthfully reached without live/paid external services**.

At minimum capture evidence for a representative set including:

- a page/section loading or skeleton state that is genuinely reachable/testable;
- one Empty state;
- one recoverable/local Error or degraded state;
- Route disabled and at least one other truthful Route state if test harness support exists;
- desktop 1440+;
- tablet/compact desktop ~1024;
- mobile ~390;
- narrow mobile ~320;
- keyboard focus path for a state action;
- reduced-motion behavior.

If a Frozen design row is conditional and current runtime cannot produce it, record it as **not currently executable** rather than adding a production backdoor or claiming PASS.

Screenshots/evidence should not contain secrets, tokens or private user data.

## 18. State QA matrix

Create/update evidence under:

```text
docs/qa/TASK-067/
```

At minimum:

```text
docs/qa/TASK-067/README.md
```

Prefer a machine-readable matrix such as:

```text
docs/qa/TASK-067/state-runtime-matrix.json
```

For each Frozen acceptance row, classify the execution-time result as one of:

- `IMPLEMENTED_AND_TESTED`
- `ALREADY_SATISFIED_UNCHANGED`
- `CONDITIONAL_NOT_CURRENTLY_REACHABLE`
- `OUTSIDE_CURRENT_RUNTIME_CAPABILITY`
- `BLOCKED_BY_SEPARATE_OWNER`

Do not mark conditional rows as PASS simply because their design exists.

## 19. Scope-diff guard

Before final delivery, explicitly audit changed files.

Expected changes may include:

- shared UI state components/styles;
- narrowly touched Home/Start/Planner/Route/AI-shell presentation code;
- focused tests;
- docs/QA/task/result/WBS tracking.

Unexpected changes requiring stop/review include:

- `supabase/migrations/**`;
- DB schema;
- public/private API contract expansion;
- new Provider SDK/network capability;
- new AI request/runtime;
- Engine contract/runtime semantic changes;
- Booking/Payment behavior;
- Planner Store architecture change;
- new persistent Trip path;
- deployment/environment capability expansion.

A bug fix discovered during 3.7 is allowed only when it is necessary for correct state presentation, has a deterministic reproduction, is minimal, and remains inside 3.7's presentation boundary. Otherwise document and defer it.

## 20. Quality gates

Final candidate must run and truthfully record applicable gates.

At minimum:

```text
npm ci                       # where clean install is required by repo policy
focused TASK-067 tests
relevant existing Home/Start/Planner/Route tests
full Node test suite
npm run lint
npm run typecheck
repository formatting check
repository build / local deployment validation used by Quality Gate
git diff --check
```

Also require:

- browser/E2E checks described in §17 for reachable states;
- no live/paid Provider calls for certification;
- no Production/Staging DB;
- no Local Supabase requirement unless an unexpected DB change is proposed — DB changes should instead trigger scope review;
- exact **final-head** GitHub `Quality gate` PASS.

CI warnings that pre-exist and do not fail the gate must be reported accurately, not silently described as new TASK-067 failures.

## 21. Required deliverables

Create/update on the execution branch:

```text
docs/tasks/TASK-067-b-wbs-3-7-main-system-state-runtime.md
docs/tasks/CODEX-TASK-067-b-wbs-3-7-main-system-state-runtime.md
docs/tasks/RESULT-TASK-067-b-wbs-3-7-main-system-state-runtime.md
docs/project/WBS-3.7-owner-correction.md
docs/project/WBS-TravelAssist.md
docs/qa/TASK-067/README.md
optional docs/qa/TASK-067/state-runtime-matrix.json
optional other bounded TASK-067 machine evidence
```

Plus only the runtime/shared UI/test files necessary to implement WBS 3.7.

Create one **Draft PR → `develop`**.

## 22. WBS status transitions

### At actual start

```text
3.7 | 主系统 Loading / Empty / Error | B | P1 | 1.20,3.1 | 进行中（#391 / TASK-067-B；用户授权单项代做）
```

### After implementation + QA + Draft PR

```text
3.7 | 主系统 Loading / Empty / Error | B | P1 | 1.20,3.1 | 待审查（#391 / TASK-067-B；Draft PR #...）
```

### Completion

Only explicit user acceptance plus merge to `develop` may produce:

```text
3.7 | 主系统 Loading / Empty / Error | B | P1 | 1.20,3.1 | 已完成
```

Do not change unrelated WBS ownership/status.

## 23. Explicitly out of scope

- Planner Store / WBS 4.15;
- Day Plan Core / WBS 4.16;
- Planner preference integration / WBS 4.18;
- Planner save integration / WBS 4.19;
- Route production Provider selection/enabling / WBS 7.3, 7.8;
- new AI runtime / WBS 6.x;
- Engine contract/runtime semantic expansion / WBS 4.20–4.24;
- Booking / Payment;
- new remote Trip persistence/loading;
- database schema or migration changes;
- Production/Staging DB;
- Service Worker / offline synchronization;
- new localization platform;
- main-system layout redesign;
- breakpoint redesign;
- unrelated Design Token changes;
- unrelated refactors;
- fake production debug state switches.

## 24. Result requirements

`RESULT-TASK-067-b-wbs-3-7-main-system-state-runtime.md` must report:

- exact execution base;
- exact final head;
- Issue/branch/Draft PR;
- changed-file inventory grouped into runtime/tests/docs;
- shared state components added/modified;
- which Frozen rows are implemented vs already satisfied vs conditional/unreachable;
- Home/Start/Planner/Map/Right Rail/Timeline/Detail/Route/AI/Overlay integration summary;
- accessibility evidence;
- responsive/browser evidence;
- retry/concurrency behavior;
- raw-error/data-leak checks;
- targeted/full test counts;
- lint/typecheck/format/build results;
- exact final-head Quality Gate run ID/result;
- whether any runtime capability outside 3.7 was added — expected `No`;
- whether DB/schema/migrations changed — expected `No`;
- whether live/paid Provider calls occurred — expected `No`;
- WBS 3.7 final candidate status `待审查`;
- explicit confirmation that no merge occurred.

## 25. Completion behavior

After the implementation candidate is complete:

1. re-fetch latest `origin/develop` and record drift truthfully;
2. complete scoped QA/evidence;
3. update Result and only WBS 3.7 tracking;
4. push execution branch;
5. create one Draft PR → `develop`;
6. bind final-head evidence to the actual immutable PR head;
7. require exact final-head Quality Gate PASS;
8. do **not** auto-merge;
9. do **not** close Issue #391 unless separately authorized;
10. do **not** start another WBS item.

Return the complete TASK-067-B Result for user acceptance review.