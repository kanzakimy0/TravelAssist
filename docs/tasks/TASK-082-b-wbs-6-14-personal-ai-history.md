# TASK-082-B — WBS 6.14 Personal Center AI History Surface / Read-only Projection

> Issue: #434  
> WBS: 6.14 — 个人中心 AI 历史（可选）  
> Owner: B  
> Priority: P3  
> Task publication branch: `task/b-wbs-6-14-personal-ai-history`  
> Planned implementation branch: `codex/b-wbs-6-14-personal-ai-history`

---

## 1. Status

**Published / Ready for Codex execution.**

This Task publication does **not** start implementation by itself.

Until Codex begins from the execution-time latest `origin/develop`:

```text
WBS 6.14 = 未开始
Issue #434 = Open
```

When Codex actually starts implementation, update only WBS 6.14 to:

```text
进行中（#434 / TASK-082-B）
```

After implementation + QA + Draft PR:

```text
待审查（#434 / TASK-082-B；Draft PR #<number>）
```

Only explicit user acceptance and merge into `develop` may mark WBS 6.14 `已完成`.

---

## 2. Goal

Implement the **Personal Center AI history product surface** using the already frozen WBS 6.2 AI conversation/message model and the existing Personal Center Shell.

The Task must deliver a reviewable, production-safe history UI and a narrow read-only projection boundary without creating durable AI-history storage ahead of WBS 8.7 / 8.8.

Required outcome:

```text
Personal Center
  ↓ secondary entry
AI History List
  ↓
Conversation Detail
  ↓
read-only display projection
  ↓
future durable source adapter seam
```

This Task must make the UI, projection, states, responsive behavior, security boundary and tests complete enough that WBS 8.8 can later connect real durable history without redesigning the Personal Center surface.

---

## 3. Hard Dependencies

Master WBS dependencies:

```text
6.2 主系统 AI 对话消息模型 = 已完成
5.1 Personal Center Shell / Navigation = 已完成
```

These dependencies are satisfied at publication.

Before implementation, re-read the latest Master WBS and re-confirm both remain accepted/completed.

If either is no longer valid due to an explicit later correction, stop before implementation and report the exact conflict.

---

## 4. Required Source of Truth

Before changing code, read the execution-time latest `origin/develop`.

At minimum:

```text
docs/project/WBS-TravelAssist.md
docs/project/AI-WBS-6.4-6.13-runtime-completion-plan.md
docs/tasks/TASK-076-a-ai-runtime-foundation.md
docs/tasks/TASK-077-a-ai-conversation-orchestrator.md
docs/tasks/TASK-WBS-5.1-b-personal-center-shell-navigation.md
docs/tasks/TASK-WBS-5.20-b-personal-center-responsive-states.md
```

Also locate and read the current frozen WBS 6.2 Conversation / Turn / Message / Block / Tool / Citation design/contracts and the current Personal Center implementation.

Audit current code under at least:

```text
src/app/(account)/personal-center/**
src/features/personal-center/**
src/features/**/ai**
src/shared/**
src/server/**
```

Do not assume publication-time file names remain current.

Priority:

```text
latest explicit user decision
>
latest accepted/frozen WBS 6.2 model
>
latest accepted Personal Center design/runtime
>
current develop implementation
>
Task recommendations
```

---

## 5. Critical Architecture Boundary

### 5.1 WBS ownership split

This Task is **not** the durable AI storage Task.

Canonical ownership:

```text
WBS 6.2
Conversation / Turn / Message / Block / Tool / Citation model
Owner: A
Status: completed/frozen
        ↓
WBS 6.14
Personal Center AI History surface + read-only projection
Owner: B
This Task
        ↓
WBS 8.7
AI conversation main-system storage strategy
Owner: A
        ↓
WBS 8.8
Personal AI history durable association
Owner: B
```

### 5.2 TASK-077-A boundary

TASK-077-A / WBS 6.13 owns:

- main-system AI conversation runtime;
- Orchestrator;
- Tool Router;
- streaming transport;
- main AI UI runtime.

TASK-082-B must not modify or duplicate that implementation.

Do not stack this Task on the TASK-077-A feature branch.

Start from latest `origin/develop`.

If TASK-077-A merges while TASK-082-B is in progress:

1. normal-merge the latest `origin/develop`;
2. reuse accepted canonical conversation/runtime types or renderers where appropriate;
3. remove any temporary duplicate display code made unnecessary by accepted upstream;
4. rerun all Task QA.

No rebase/force push.

---

## 6. Explicit Non-goals

Forbidden in TASK-082-B:

- DB tables for AI history;
- SQL migrations;
- Drizzle schema for AI history;
- generated Supabase type changes caused by AI history;
- durable conversation persistence;
- new AI persistence API routes;
- localStorage as production AI-history storage;
- IndexedDB as production AI-history storage;
- Cookie-based AI-history storage;
- Service Worker/PWA history cache;
- background sync;
- cross-device sync;
- retention policy implementation;
- history deletion API;
- account deletion schema changes;
- second Conversation / Turn / Message canonical model;
- second AI runtime;
- AI provider calls;
- OpenAI API changes;
- Planner mutation;
- Engine mutation;
- booking/payment;
- arbitrary Tool execution;
- copying provider raw payloads into UI;
- hidden reasoning / chain-of-thought storage or rendering.

Durable history remains WBS 8.7/8.8.

---

## 7. Product Placement

### 7.1 Do not add a sixth primary navigation item

Personal Center primary navigation is frozen at five items.

Do **not** add AI History to:

```text
Desktop Sidebar primary nav
Compact Rail primary nav
Tablet primary Drawer nav
Mobile 5-item Bottom Navigation
```

The mobile 5-item navigation must remain exactly five items.

### 7.2 Secondary entry

Add AI History as a **secondary Personal Center feature entry**.

Preferred location:

- Personal Center home "更多功能" / secondary utilities area; or
- the closest existing secondary feature surface discovered in current develop.

Recommended label:

```text
AI 助手历史
```

or the current product-language equivalent already used by the repository.

Do not redesign the Personal Center home.

### 7.3 Route

Preferred route:

```text
/personal-center/ai-history
```

If current route conventions strongly support another equivalent route, follow the repository convention and document it in Result.

The route must remain inside the existing Personal Center Shell.

---

## 8. Product Scope

Implement the minimum complete AI-history experience.

### 8.1 History list

The list surface must support:

- page title;
- short privacy/availability explanation;
- newest-first deterministic ordering;
- list item title/preview;
- last activity timestamp;
- small metadata only when derived safely from the canonical projection;
- open history detail;
- loading state;
- empty state;
- data-source-unavailable state;
- recoverable error state.

Do not fabricate conversation titles or facts.

If no explicit title exists, a UI-only derived title may use a bounded first-user-message preview.

Derived titles must:

- be display-only;
- not become a new canonical field;
- be safely truncated;
- never include hidden/system/tool-only content.

### 8.2 Conversation detail

Detail view must render only user-visible history.

Allowed content depends on the accepted 6.2 message/block contract.

At minimum support safe rendering of:

- user-visible user message text;
- user-visible assistant message text;
- safe citation display if the current contract marks it user-visible;
- safe structured blocks already approved for user presentation.

Tool activity may only be shown as a safe user-facing summary if such a summary already exists in the accepted contract.

Never render raw tool input/output.

### 8.3 No write actions

TASK-082-B is read-only.

Do not implement:

- continue conversation from history;
- retry AI generation;
- rename conversation;
- pin conversation;
- delete conversation;
- bulk delete;
- export;
- share;
- restore;
- sync.

These may be considered later after durable storage semantics exist.

---

## 9. Read-only Projection Contract

Create a **view projection**, not a second canonical AI model.

A narrow B-owned display contract is allowed, for example:

```text
PersonalAiHistoryListItemV1
PersonalAiHistoryDetailV1
PersonalAiHistoryPageV1
```

Names may change to match repository conventions.

The projection must be explicitly documented as:

```text
derived read-only Personal Center view
≠ canonical Conversation model
≠ persistence schema
```

### 9.1 Required principles

- canonical identity remains the existing conversation/message IDs;
- preserve stable ordering;
- preserve timestamps exactly when available;
- omit unsupported fields rather than inventing values;
- no provider-specific payload types;
- no secret/internal metadata;
- no user/account profile duplication;
- no new AI semantic state machine;
- no cross-user identifiers in client-visible payloads unless already required/safe;
- unknown remains unknown.

### 9.2 Safe allowlist

The projection must use an explicit allowlist.

Potentially safe fields:

- canonical conversation reference;
- canonical message reference where needed by UI;
- user-visible role;
- user-visible text/display block;
- user-visible citation summary;
- created/updated timestamp;
- bounded derived preview/title;
- safe count metadata derived from visible records.

Explicitly deny:

- system prompt;
- developer prompt;
- hidden instructions;
- hidden reasoning;
- chain-of-thought;
- provider raw response;
- provider request payload;
- provider secret/config;
- raw Tool arguments;
- raw Tool outputs;
- auth token/session material;
- server stack traces;
- internal error payloads.

---

## 10. Read Adapter Boundary

Define a small read adapter/port that can later be implemented by WBS 8.8.

Example conceptual API:

```ts
listHistory(input): Promise<HistoryListResult>
readHistoryDetail(input): Promise<HistoryDetailResult>
```

Do not treat this exact signature as mandatory if repository conventions differ.

Required result semantics should distinguish at least:

```text
ready
empty
unavailable
error
```

If current Personal Center state contracts have a stronger equivalent, reuse them.

### 10.1 Production behavior in TASK-082-B

Until WBS 8.8 provides an accepted durable source, production must be truthful.

Allowed production behavior:

- return an explicit unavailable/not-connected state; or
- return an empty state only when the product wording clearly says no durable history source is connected.

Do not seed fake production history.

### 10.2 Fixture / test adapter

Add deterministic fixture/in-memory data only for:

- unit tests;
- component tests;
- browser QA harness;
- development-only guarded preview if necessary.

Fixture content must never masquerade as real user history.

Any development-only fixture path must be provably unavailable in production.

---

## 11. Auth / Privacy Boundary

Reuse the existing Personal Center auth boundary.

Do not implement a new authentication system.

Requirements:

- unauthenticated access follows current Personal Center behavior;
- a user can only ever view their own future history projection;
- no cross-user test shortcut in production;
- no user ID exposed unnecessarily in browser UI;
- errors do not reveal whether another user's conversation exists;
- no cache behavior that risks cross-user reuse;
- history page must not become publicly indexable if current account routes are private.

If a real data adapter does not yet exist, auth must still remain correct for route access.

---

## 12. Data Minimization

AI history can contain highly personal travel intent.

The UI and projection should retain only the minimum content needed for user-facing history.

Do not copy:

- account settings;
- full Preference object;
- full Trip object;
- raw Provider data;
- complete Context Builder payload;
- hidden Tool traces;
- usage telemetry;
- token counts;
- internal trace IDs;

unless an existing frozen user-facing design explicitly requires a safe subset.

TASK-082-B should not create an analytics/telemetry history view.

---

## 13. Personal Center State Integration

Reuse current Personal Center state primitives where possible.

Required states:

### Loading

Use existing Personal Center skeleton language.

Do not use a full-screen spinner.

### Empty

Example semantic intent:

```text
还没有可显示的 AI 对话记录
使用 AI 旅行助手后，已保存的历史会显示在这里。
```

However, do not promise durable saving before WBS 8.8 exists.

If durable history is not connected, prefer truthful wording such as:

```text
AI 历史尚未连接
个人中心的历史记录会在会话存储接入后显示。
```

Final wording should match current product copy conventions.

### Unavailable

Must be separate from empty if the source is intentionally not connected.

### Error

Recoverable UI:

- retry when a reader exists;
- return to Personal Center;
- no stack/provider message.

### Partial data

If projection can safely render some messages and omit unsupported blocks, it may show a non-alarming partial-data notice.

Never silently render malformed data as complete.

---

## 14. Responsive Requirements

Reuse WBS 5.20 four-mode Personal Center rules:

```text
Wide Desktop                  >= 1280px
Compact Desktop / Landscape   1024–1279px
Tablet Portrait               768–1023px
Mobile                        < 768px
```

Requirements:

- no document horizontal overflow;
- AI history entry does not alter frozen primary navigation;
- list becomes single-column on narrow screens;
- detail text remains readable;
- long messages wrap safely;
- citations/metadata do not force overflow;
- timestamps do not cause fixed-width truncation bugs;
- touch targets >=44×44 where interactive;
- content bottom spacing respects mobile bottom nav;
- safe-area behavior preserved.

---

## 15. Accessibility

Must support:

- semantic heading structure;
- keyboard navigation;
- visible focus;
- list/detail links with descriptive labels;
- `aria-current` only where appropriate;
- screen-reader-safe timestamps;
- no role/status meaning by color alone;
- reduced motion;
- text zoom / long English / Japanese expansion sanity;
- history messages readable without hover;
- no inaccessible icon-only controls.

Do not add unnecessary animation.

---

## 16. Rendering Security

AI text is untrusted content.

Do not render arbitrary HTML.

Requirements:

- text is escaped by default;
- existing safe markdown renderer may be reused only if already accepted and sanitized;
- external links must use existing safe-link conventions;
- citation URL handling must use current allowlisted/sanitized behavior;
- no inline script/style execution from message content;
- no `dangerouslySetInnerHTML` unless an already accepted sanitizer boundary exists and is reused.

Add tests against basic XSS-style payloads.

---

## 17. Recommended File Boundary

Exact paths depend on current develop.

Preferred B-owned area:

```text
src/features/personal-center/ai-history/**
src/app/(account)/personal-center/ai-history/**
```

Potential minimal integration:

```text
src/features/personal-center/**
```

Only touch shared AI contract/rendering files if necessary to reuse an already accepted canonical type or renderer.

Do not move A-owned AI runtime files into B modules.

---

## 18. Files / Areas To Avoid

Default forbidden unless a narrow compile-safe reuse change is absolutely required:

```text
src/features/planner/**
src/features/map/**
src/features/start-flow/**
src/server/ai/provider/**
src/server/ai/orchestrator/**
src/server/ai/tools/**
src/db/**
supabase/migrations/**
.github/workflows/**
```

Also avoid:

```text
package.json
package-lock.json
```

No new third-party package should be necessary.

If implementation appears to require a DB/API/provider/package change, stop and classify it as a downstream WBS 8.7/8.8 dependency instead of crossing the boundary.

---

## 19. Implementation Audit Before Coding

Codex must first answer in its Result/evidence:

1. Where is the current frozen 6.2 message model represented?
2. Is there already a user-visible message renderer in `develop`?
3. Has TASK-077-A merged by execution time?
4. Is there already an AI-history route/component?
5. Is there already an AI-history storage table/API?
6. Is any existing storage authoritative and accepted under WBS 8.7/8.8?
7. Where is the best secondary Personal Center entry without changing the five primary nav items?
8. Which current Personal Center state primitives can be reused?

Do not duplicate existing accepted code.

---

## 20. Unit / Contract Tests

At minimum test:

1. history projection is explicitly read-only;
2. list projection uses canonical identifiers, not new identity;
3. unsafe/internal message blocks are not exposed;
4. system/developer/internal content is not rendered;
5. provider raw payload is not exposed;
6. Tool raw input/output is not exposed;
7. visible user/assistant text is preserved;
8. timestamps/order are deterministic;
9. derived title/preview is bounded and safe;
10. empty vs unavailable are distinct;
11. error state is recoverable;
12. no production fixture history;
13. no localStorage/IndexedDB/Cookie persistence;
14. no DB/migration/API for AI history;
15. no sixth primary Personal Center nav item;
16. existing five-item mobile bottom nav unchanged;
17. XSS-like text is escaped;
18. long content wraps safely;
19. keyboard/focus semantics exist;
20. reduced motion/current Personal Center accessibility behavior is preserved.

If current architecture supports more precise focused tests, add them.

---

## 21. Browser QA

Required viewports:

```text
1920×1080
1440×900
1280×720
1279×800
1024×768
1023×768
768×1024
767×900
390×844
320×740
```

At minimum verify:

### Personal Center home

- existing layout unchanged;
- secondary AI History entry visible;
- five primary nav items unchanged.

### AI History list

- loading;
- unavailable;
- empty;
- fixture list in test harness;
- newest-first ordering;
- open detail;
- back navigation.

### Detail

- long user message;
- long assistant message;
- citation/safe block if supported;
- omitted unsafe block;
- no raw Tool/provider data;
- mobile wrapping;
- keyboard navigation.

### Global

- no hydration errors;
- no blocking console errors;
- no document horizontal overflow;
- no new mutation requests;
- no persistent storage writes;
- existing Personal Center navigation guard remains unaffected.

---

## 22. Regression Freeze

TASK-082-B must not change existing Personal Center business semantics.

Regression check at least:

```text
/personal-center
/personal-center/trips
/personal-center/preferences
/personal-center/companions
/personal-center/account
```

And current mobile/desktop primary navigation.

No redesign of:

- Profile;
- Preferences;
- Companions;
- Trip Library;
- Account;
- Authentication.

---

## 23. Validation

Use current repository canonical commands discovered at execution time.

Expected baseline:

```bash
npm ci
npm run lint
npm run typecheck
npm run format:check
npm run test --if-present
node --test tests/*.test.mjs
npm run build
git diff --check
```

Also run:

- focused TASK-082 tests;
- relevant Personal Center tests;
- relevant AI contract/message tests;
- current deployment validation/build/artifact checks if present;
- current browser QA harness.

If the repository has a known unchanged baseline failure, prove it against clean latest develop and do not disguise it as a Task success.

TASK-owned files must pass targeted format/lint/typecheck.

---

## 24. Git Safety

Start from execution-time latest clean `origin/develop`.

Required:

```bash
git status --short --untracked-files=all
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Implementation branch:

```text
codex/b-wbs-6-14-personal-ai-history
```

Forbidden:

```text
git clean -fd
git reset --hard
git rebase
git push --force
git push --force-with-lease
direct push to develop/main
auto-merge
```

Normal merge of latest `origin/develop` is allowed when needed.

Stage only Task-owned files.

---

## 25. WBS Tracking Rules

At actual start:

```text
6.14 = 进行中（#434 / TASK-082-B）
```

After implementation + QA + Draft PR:

```text
6.14 = 待审查（#434 / TASK-082-B；Draft PR #<number>）
```

Do not update:

```text
8.7
8.8
6.13
6.6
6.8
```

Do not claim durable AI history is complete.

Only user acceptance + merge permits:

```text
6.14 = 已完成
```

---

## 26. Required Result

Create:

```text
docs/tasks/RESULT-TASK-082-b-wbs-6-14-personal-ai-history.md
```

Use at least:

```md
# RESULT — TASK-082-B

## Status

## Base / Tracking
- execution-time origin/develop:
- branch:
- Issue:
- Draft PR:
- final head:

## Dependency Gate
- WBS 6.2:
- WBS 5.1:
- duplicate AI history implementation:
- TASK-077-A merge state at execution:

## Architecture Reuse
- canonical 6.2 model source:
- reused renderer/types:
- B projection:
- second canonical model created:
- durable store created:

## Product Surface
- Personal Center secondary entry:
- primary navigation count:
- route:
- list:
- detail:
- back navigation:

## Read-only Projection
- list DTO:
- detail DTO:
- identity reuse:
- safe allowlist:
- unsafe/internal omission:
- empty/unavailable/error semantics:

## Storage Boundary
- DB table:
- migration:
- persistence API:
- localStorage:
- IndexedDB:
- Cookie:
- service worker:
- production fixture:
- WBS 8.7 touched:
- WBS 8.8 touched:

## Privacy / Security
- auth reuse:
- cross-user isolation boundary:
- system/developer prompt exposure:
- hidden reasoning exposure:
- provider raw exposure:
- Tool raw exposure:
- XSS/safe rendering:

## Responsive / Accessibility
- 1920×1080:
- 1440×900:
- 1280×720:
- 1279×800:
- 1024×768:
- 1023×768:
- 768×1024:
- 767×900:
- 390×844:
- 320×740:
- keyboard:
- focus:
- reduced motion:
- horizontal overflow:

## Regression
- Personal Center home:
- Trips:
- Preferences:
- Companions:
- Account:
- five primary nav items:
- mobile five-item bottom nav:

## Tests
- npm ci:
- focused TASK-082:
- Personal Center regression:
- AI contract/message regression:
- full tests:
- lint:
- typecheck:
- format:
- build:
- deploy validation:
- diff-check:
- browser QA:

## WBS
- start state:
- final candidate state:
- unrelated WBS changed:

## Deferred
- durable AI conversation storage:
- cross-device history:
- history delete/retention:
- WBS 8.7:
- WBS 8.8:

## Problems

## Final
PASS / PARTIAL / BLOCKED
```

---

## 27. Acceptance Criteria

TASK-082-B can enter **待审查** when all are true:

- Personal Center has a secondary AI History entry;
- five primary nav items remain unchanged;
- AI History list/detail surface exists;
- list/detail use a narrow read-only projection;
- projection is derived from/reconciled with the frozen 6.2 model;
- no second canonical Conversation model exists;
- no durable AI-history store exists;
- production fixture history is absent;
- empty/unavailable/error/loading states are truthful;
- hidden/system/provider/tool raw content cannot render;
- auth boundary is reused;
- responsive/accessibility QA passes;
- existing Personal Center behavior regresses cleanly;
- focused tests + full applicable repo tests pass;
- lint/typecheck/build/deployment checks pass;
- exact final-head GitHub Quality Gate passes;
- Draft PR is open for review;
- no auto-merge occurred by Codex action.

---

## 28. Deferred Follow-up Contract

TASK-082-B must leave a clean seam for:

### WBS 8.7 — A

Define/implement the authoritative main-system AI conversation durable storage strategy.

### WBS 8.8 — B

Connect the durable user-scoped history source to the TASK-082-B read projection.

WBS 8.8 should be able to replace the unavailable/fixture reader with a real authorized reader without redesigning the AI History page.

---

## 29. Stop Rule

After Result + Draft PR + exact-head gate:

**Stop.**

Do not automatically start:

- WBS 8.7;
- WBS 8.8;
- another B Task;
- AI provider/runtime changes;
- history persistence;
- history delete/export/share;
- Mobile AI history.

No auto-merge.
