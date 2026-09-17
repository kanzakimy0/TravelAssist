# TASK-066-B — WBS 1.20 Main System Loading / Empty / Error / Skeleton Design Freeze

## Metadata

- Task ID: `TASK-066-B`
- WBS: `1.20 — 主系统 Loading / Empty / Error / Skeleton`
- Owner: `B` — user-authorized single-item exception
- Priority: `P1`
- Current execution status: 待审查（设计与静态 QA 完成；Draft PR #390）
- Pull Request: [Draft PR #390](https://github.com/kanzakimy0/TravelAssist/pull/390)
- Result: [TASK-066-B Result](RESULT-TASK-066-b-wbs-1-20-main-system-state-design-freeze.md)
- Status at publication: `Ready / not started`
- Dependency: `1.13 — 已完成`
- GitHub Issue: `#389`
- Publication baseline: `develop@f5e3ca6fe2989c846be062b5921d0b9527753917`
- Task publication branch: `task/b-wbs-1-20-main-system-state-design`
- Planned execution branch: `codex/b-wbs-1-20-main-system-state-design`
- Downstream WBS: `3.7 — 主系统 Loading / Empty / Error` — **do not start in this Task**

## 1. Purpose

Freeze an implementation-ready visual, interaction, content and accessibility specification for the main-system state experience:

- Loading
- Skeleton
- Empty
- Error
- retry/recovery affordances belonging to those states
- localized/partial degradation where a page remains usable

This is a **design/specification Task**, not a runtime implementation Task.

The design must fit the existing Home / Start / Planner / Trip Detail system and the accepted WBS 1.13 design-token baseline without changing Planner business logic, routing/provider behavior, AI runtime, Engine, persistence, or API contracts.

The design is intended to become the direct prerequisite for a later, separate WBS 3.7 implementation Task.

## 2. Ownership and boundary gate

Read first:

- `docs/project/WBS-1.20-owner-correction.md`
- `docs/project/WBS-TravelAssist.md`
- current WBS 1.13 closeout/specification
- current main-system visual/design documents

The user has authorized only WBS 1.20 as a B-owned exception. Do not use TASK-066-B to reassign unrelated A work.

At actual execution start, synchronize only WBS 1.20 to:

```text
B / 进行中（#389 / TASK-066-B；用户授权单项代做）
```

Do **not** modify WBS 3.7 Owner or status.

## 3. Start gate

Before changing anything, record:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Use a dedicated clean worktree and execution branch from the execution-time latest `origin/develop`:

```text
codex/b-wbs-1-20-main-system-state-design
```

Do not develop from the Task publication branch.

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
history rewrite / destructive rebase
```

Preserve user files and unrelated work.

## 4. Canonical sources to audit

Before designing, inspect the execution-time latest versions of relevant sources, including at minimum:

### Project / ownership / design

- `docs/project/WBS-TravelAssist.md`
- `docs/project/WBS-1.20-owner-correction.md`
- WBS 1.13 final token/design closeout documents
- `docs/ui/trip-planner.md`
- current Home / Start / Planner / Detail design documents under `docs/ui/`
- current responsive/accessibility rules

### Existing runtime/UI structure — read only unless evidence files need references

Audit current main-system surfaces so the spec reflects the product that actually exists:

- Home / main entry
- `/start` planning wizard
- Planner shell
- Planner map region
- recommendation/right rail
- bottom timeline/summary
- Trip Detail workspace
- route preview surfaces
- AI floating/panel visual shell
- shared modal/drawer/popover patterns

Also inspect existing shared tokens/components/styles only to identify reusable patterns. Do not implement or refactor them in TASK-066-B.

If historical design text conflicts with the currently accepted UI/token baseline, document the conflict and base the freeze on the current accepted baseline rather than reviving superseded styling.

## 5. Required deliverable — design specification

Create:

```text
docs/ui/main-system-loading-empty-error-skeleton.md
```

The document must be implementation-ready and contain all sections below.

## 6. State taxonomy

Define a stable taxonomy that distinguishes at least:

### 6.1 Initial page loading

Use when the primary resource required to meaningfully render the screen is not available yet.

Specify:

- full-page vs shell-preserving treatment;
- when blocking interaction is justified;
- when Header/navigation should remain visible;
- spinner/progress/skeleton choice;
- duplicate-action prevention.

### 6.2 Section loading

Use when the main shell is usable but a region is loading.

Examples may include map region, route preview, recommendation list, timeline summary, detail panel.

Freeze the rule that local loading should not unnecessarily blank the entire Planner.

### 6.3 Skeleton

Use when the final structure is known and data is expected shortly.

Freeze:

- geometry matching requirements;
- maximum visual complexity;
- animation behavior;
- reduced-motion behavior;
- accessibility-tree behavior;
- rules preventing misleading fake content.

Do not define invented progress percentages.

### 6.4 Empty / first use

Valid zero-data state where the user has not created or selected content yet.

Must include constructive next action and must not look like an error.

### 6.5 Empty / no result

Valid query/filter/search result of zero items.

Must distinguish from first-use and from a failed request.

### 6.6 Recoverable error

A retry can reasonably resolve the failure.

Freeze retry scope, action hierarchy and user-data preservation.

### 6.7 Non-recoverable / permission / invalid state

Retry is not the primary solution.

Define when the primary action is back, home, sign in, reopen trip, or another safe navigation action.

### 6.8 Partial degradation

A subordinate capability failed while the primary workflow can remain usable.

At minimum define visual behavior for:

- map unavailable;
- route unavailable;
- route facts unavailable/stale at the presentation layer;
- AI unavailable;
- recommendation section unavailable;
- non-critical summary/panel failure.

The design must strongly prefer localized degradation over replacing the whole Planner where safe.

### 6.9 Generic connection-loss presentation

Define only a generic connection/unavailable pattern supported by normal web failure handling.

Do not claim or design a full offline product capability.

## 7. Required surface matrix

For each applicable state, specify behavior for the current surfaces:

| Surface                   | Required design coverage                                                                       |
| ------------------------- | ---------------------------------------------------------------------------------------------- |
| Home / main entry         | page loading, temporary failure, auth-dependent fallback if applicable                         |
| Start wizard              | step data loading, submission/generation waiting, recoverable failure, preserving entered data |
| Planner shell             | shell loading, primary resource failure, partial degradation                                   |
| Planner map region        | loading, map unavailable, retry, keep non-map Planner usable                                   |
| Recommendation/right rail | loading/skeleton, empty, no result, error                                                      |
| Bottom timeline/summary   | loading/skeleton, empty, error without discarding Trip state                                   |
| Trip Detail               | primary trip loading, section loading, missing/not-found/permission-safe state                 |
| Route preview             | loading, no route/result, provider/route failure, retry                                        |
| AI visual shell           | temporary unavailable/loading presentation only; no AI runtime semantics                       |
| Modal/drawer/popover      | loading, inline error, retry, focus restoration                                                |

For every designed state/surface, specify:

- semantic trigger meaning;
- page-level vs section-level treatment;
- what existing content stays visible;
- what remains interactive;
- title pattern;
- body copy pattern;
- primary action;
- secondary action;
- retry scope;
- icon/illustration rule;
- geometry preservation;
- focus behavior;
- keyboard behavior;
- ARIA/status behavior;
- responsive behavior;
- reduced-motion behavior;
- prohibited misleading behavior.

## 8. Core UX invariants to freeze

The final specification must explicitly freeze these principles unless a currently accepted baseline requires a narrowly documented exception:

1. Prefer section-level degradation when only one dependency fails.
2. Do not discard user-entered Start/Planner state because a subordinate service fails.
3. Route/Map/AI failure must not imply the saved itinerary was deleted.
4. Empty is not an error.
5. Skeleton is not progress indication.
6. Do not show a fake percentage without measurable progress.
7. Retry must target the smallest failed operation where practical.
8. Full-page blocking is reserved for cases where the main resource cannot be safely rendered.
9. Loading controls must prevent accidental duplicate actions/submissions.
10. Technical/raw Provider/SQL/Auth errors are never user-facing copy.
11. Color alone cannot carry state meaning.
12. Existing navigation/safe escape routes remain available whenever the page can safely retain its shell.
13. State components may not change existing Planner map/timeline/right-rail geometry beyond the space they replace.
14. State UI may not invent business truth such as “route updated”, “booking confirmed”, “saved successfully” without the owning domain result.

## 9. Copy/content system

Define reusable copy patterns rather than hard-coding one-off strings.

At minimum include recommended Chinese copy patterns and localization-ready semantic keys/intent for future Japanese/English translation for:

- generic loading;
- preparing/generating itinerary;
- first-use empty;
- no-result empty;
- generic recoverable failure;
- generic blocking failure;
- map unavailable;
- route calculation unavailable/no route;
- session expired/sign-in required;
- trip missing/not accessible without leaking foreign existence;
- save/read failure visual presentation only;
- AI temporarily unavailable visual presentation only.

Copy rules:

- concise and action-oriented;
- no blame;
- no raw error codes unless a safe support/reference code is intentionally provided;
- no false real-time claims;
- no promise of automatic recovery unless it actually happens;
- distinguish retry from changing search/filter/input.

## 10. Visual language

Reuse the accepted WBS 1.13 / current main-system tokens. Do not create parallel token names or a second palette.

Specify how existing tokens map to:

- neutral loading surfaces;
- skeleton base/highlight;
- empty-state neutral container;
- non-blocking warning/degraded state;
- blocking error state;
- border/radius/shadow;
- heading/body/supporting text;
- action buttons;
- focus rings;
- overlays/backdrops only where blocking is justified.

Where current runtime/token names differ from old design docs, cite the current token source and document the mapping.

## 11. Accessibility freeze

At minimum define:

- interactive target size: minimum 44×44px where applicable;
- keyboard reachable retry/back/home/sign-in actions;
- visible focus state;
- `aria-busy` usage principles;
- when to use `role="status"` / polite live region;
- when a blocking error warrants alert semantics;
- avoid repeated announcements during skeleton animation;
- decorative skeletons hidden from the accessibility tree;
- screen-reader-visible loading/status text when needed;
- focus retention/restoration after retry or modal state transitions;
- reduced-motion behavior;
- contrast requirements consistent with accepted tokens;
- no focus trapping for non-modal loading overlays.

## 12. Responsive freeze

Cover at minimum:

- desktop `>=1440`;
- compact desktop/tablet around `1024`;
- mobile around `390`;
- narrow mobile around `320`.

Requirements:

- do not redesign Planner grid;
- state cards must fit existing regions;
- avoid horizontal overflow;
- critical actions stay reachable without hover;
- mobile error/empty layouts use compact copy hierarchy;
- full-page state keeps required safe-area/navigation behavior;
- section skeleton height should preserve current region geometry.

## 13. Interaction timing / motion

Freeze consistent behavior for:

- immediate local optimistic visual response vs actual server completion messaging;
- spinner/skeleton animation durations/style at the design-rule level;
- minimum-delay policy only if justified to avoid flashing — do not invent artificial latency requirements without evidence;
- retry pending state;
- repeated retry prevention;
- reduced-motion static alternative.

Do not alter runtime timing code in this Task.

## 14. Design acceptance matrix

The final design document must include a concrete acceptance matrix covering at least:

1. page-level loading;
2. section loading;
3. skeleton geometry;
4. first-use empty;
5. no-result empty;
6. recoverable error;
7. blocking/non-recoverable error;
8. partial degradation;
9. retry success transition;
10. retry failure transition;
11. session/auth-required state;
12. missing/not-accessible Trip state;
13. map unavailable;
14. route unavailable/no route;
15. AI unavailable visual state;
16. Home;
17. Start;
18. Planner;
19. Detail;
20. desktop;
21. tablet/compact desktop;
22. mobile;
23. narrow mobile;
24. keyboard/focus;
25. screen-reader/status announcement;
26. reduced motion;
27. no layout-shift/shell-destruction rule;
28. no false business-truth copy.

Each row should state the expected result clearly enough that WBS 3.7 can later turn it into implementation/browser QA.

## 15. Design audit evidence

Create:

```text
docs/qa/TASK-066/README.md
```

and, where useful, a machine-readable matrix JSON.

Evidence should show:

- latest develop audited;
- current token/design sources reviewed;
- current Home/Start/Planner/Detail surfaces audited;
- no runtime code changed;
- no business/API/schema behavior changed;
- acceptance matrix completeness;
- any current-state design conflicts and chosen authoritative source.

Do not fabricate browser validation if this design-only Task does not execute browser checks.

## 16. Required QA / checks

Because this is documentation/design work, mandatory checks are scoped to the actual changes. At minimum:

- current `origin/develop` recheck before final delivery;
- Task/design/owner-correction files formatted consistently;
- repository Markdown/link/reference sanity for modified files;
- `git diff --check`;
- verify no runtime/source/schema/migration files were changed;
- if repository CI runs for the Draft PR, record exact final-head status truthfully.

Do not run or claim expensive runtime/DB gates merely to decorate a design Result unless they are actually required by repository policy or affected files.

## 17. Required outputs

Create/update on the execution branch:

```text
docs/tasks/TASK-066-b-wbs-1-20-main-system-state-design-freeze.md
docs/tasks/CODEX-TASK-066-b-wbs-1-20-main-system-state-design-freeze.md
docs/tasks/RESULT-TASK-066-b-wbs-1-20-main-system-state-design-freeze.md
docs/ui/main-system-loading-empty-error-skeleton.md
docs/project/WBS-1.20-owner-correction.md
docs/qa/TASK-066/README.md
optional docs/qa/TASK-066/design-matrix.json
```

Synchronize Master WBS 1.20 Owner/status according to the execution phase.

Create one **Draft PR → develop**.

## 18. WBS status transitions

### At actual start

```text
1.20 | 主系统 Loading / Empty / Error / Skeleton | B | P1 | 1.13 | 进行中（#389 / TASK-066-B；用户授权单项代做）
```

### After design + evidence + Draft PR

```text
1.20 | ... | B | P1 | 1.13 | 待审查（#389 / TASK-066-B；Draft PR #...）
```

### Completion

Only explicit user acceptance plus merge to `develop` may produce:

```text
1.20 | ... | B | P1 | 1.13 | 已完成
```

Do not start or update WBS 3.7 in TASK-066-B.

## 19. Explicitly out of scope

- WBS 3.7 implementation;
- creating state React components;
- changing Home/Start/Planner/Detail runtime behavior;
- Planner Store / 4.15;
- Day Plan / 4.16;
- 4.18 / 4.19;
- Provider selection/Route behavior 7.3/7.8;
- AI runtime 6.x;
- Engine runtime;
- Booking/Payment;
- API/schema/migration changes;
- production/staging DB;
- deployment/environment changes;
- new UI layout redesign;
- unrelated token refactor;
- unrelated asset generation.

## 20. Completion behavior

After the design freeze candidate is complete:

- create/update the Result;
- update only WBS 1.20 tracking;
- push the execution branch;
- create one Draft PR → `develop`;
- do not auto-merge;
- do not start WBS 3.7;
- return the complete TASK-066-B Result for user review.
