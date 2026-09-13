# TASK-059-B — WBS 9.6 Personal Center E2E

## 0. Task Metadata

- **Task ID:** TASK-059-B
- **WBS:** 9.6
- **Title:** Personal Center E2E
- **Owner:** B
- **Responsibility:** Personal Center / Account / Profile / Preferences / Companions / Trip Library browser QA
- **Priority:** P1
- **GitHub Issue:** #364
- **Publication branch:** `task/b-wbs-9-6-personal-center-e2e`
- **Publication baseline:** `5240ff8f7a91c1e36e90449d0f619de93f795472`
- **Planned implementation branch:** `codex/b-account-wbs-9-6-personal-center-e2e`
- **Result file:** `docs/tasks/RESULT-TASK-059-b-wbs-9-6-personal-center-e2e.md`
- **QA evidence root:** `docs/qa/TASK-059/`
- **Status at publication:** `未开始`

> Publication does **not** start implementation. WBS 9.6 changes to `进行中` only when Codex has completed the execution-time prerequisite gate and actually starts work from the latest clean `origin/develop`.

---

## 1. Objective

Establish the canonical, repeatable **end-to-end browser QA baseline** for the complete B-owned Personal Center experience.

TASK-055-B / WBS 9.5 already completed the unit/integration layer and explicitly deferred only full browser journeys to 9.6. This Task must close that boundary by proving continuity across real pages, navigation, browser sessions, Local Auth, persisted B-owned data, and account lifecycle.

The four mandatory journey classes inherited from TASK-055-B are:

1. complete registration/login → multiple Personal Center pages → logout → login again;
2. cross-page and cross-session persistence spanning B-owned modules;
3. complete desktop/mobile Personal Center navigation;
4. complete browser account lifecycle through deletion.

This is a **QA / E2E Task**, not a product redesign or a new Personal Center feature Task.

---

## 2. Authoritative Inputs

Before implementation, read the execution-time latest versions from `origin/develop` of at least:

- `docs/project/WBS-TravelAssist.md`
- `docs/tasks/TASK-055-b-wbs-9-5-personal-center-unit-integration-qa.md`
- `docs/tasks/RESULT-TASK-055-b-wbs-9-5-personal-center-unit-integration-qa.md`
- `docs/qa/TASK-055/README.md`
- `docs/qa/TASK-055/test-inventory.json`
- `docs/qa/TASK-055/coverage-matrix.json`
- `docs/qa/TASK-055/gap-report.md`
- current `package.json` and lockfile
- current E2E/browser test framework/harness files established by WBS 2.10 and accepted historical browser QA
- current WBS 9.12 responsive/accessibility Result/evidence
- current accepted Auth/Profile/Preference/Companion/Trip Library/Account Deletion Task/Result files as needed to understand UI and runtime contracts.

Do **not** copy historical test counts, browser availability, ports, commands, or paths without re-checking the execution-time repository/environment.

---

## 3. Prerequisite Gate

At execution start:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -20 origin/develop
```

Requirements:

1. working tree is clean;
2. implementation starts from execution-time latest `origin/develop`, **not** from the Task publication branch;
3. WBS still records:
   - B-owned 5.x scope needed by Personal Center as completed;
   - 8.2 completed;
   - 8.3 completed;
   - 8.6 completed;
   - 9.5 completed;
   - 9.6 not already completed by another Task;
4. no newer Task supersedes TASK-059-B;
5. Issue #364 is still the canonical tracking issue.

If the execution-time repository materially changes these assumptions, stop and report `Blocked` or adapt only where the new canonical state clearly supersedes this Task without changing its product boundary.

After the gate passes and actual work starts, update WBS 9.6 to:

```text
进行中（#364 / TASK-059-B）
```

Preserve every unrelated A/B WBS change.

---

## 4. Existing Baseline to Reuse

TASK-055-B is the unit/integration source of truth. Its accepted final baseline established:

- canonical non-Local Personal Center aggregate;
- canonical Local Supabase/Auth Personal Center aggregate;
- real ownership/RLS/cross-user/deletion checks;
- deterministic mandatory-child execution;
- no mandatory skips;
- exact-head GitHub Quality Gate evidence;
- an explicit list of browser journeys deferred to 9.6.

TASK-059-B must **reuse** that baseline rather than rebuilding the same API/unit coverage in a browser.

At publication time, `package.json` contains:

```text
test:personal-center
test:personal-center:local
```

Execution-time Codex must verify these still exist and remain authoritative.

---

## 5. Browser / E2E Framework Audit

Before writing tests, audit the repository's accepted WBS 2.10 E2E/browser testing approach and the browser harnesses already accepted by historical Personal Center/Auth/9.12 work.

Produce a short machine-readable browser harness inventory at:

```text
docs/qa/TASK-059/browser-harness-inventory.json
```

Record at least:

- framework/harness name;
- repository path;
- whether it is a declared dependency, repository helper, or environment-provided runtime;
- supported browser engine(s) actually available in this execution environment;
- executable/browser path resolution mechanism;
- server start/stop mechanism;
- Local Supabase/Auth requirement;
- supported desktop/mobile viewport behavior;
- trace/screenshot/video support;
- CI suitability;
- reason selected/rejected for TASK-059.

### Framework rule

- Reuse the canonical accepted framework/harness.
- Do **not** add a second E2E framework merely to complete this Task.
- Do not replace accepted browser infrastructure through a broad refactor.
- If a canonical framework exists but a browser runtime is unavailable, report it accurately. Do not call an unavailable engine PASS.
- WebKit emulation is **not** proof of real Safari; Chromium mobile viewport is **not** proof of a native mobile app.

A narrowly required dependency/lockfile correction is allowed only if the audit proves it is the repository's intended WBS 2.10 framework and the correction is necessary for reproducible execution. Explain it in the Result.

---

## 6. Mandatory E2E Journey Matrix

Create:

```text
docs/qa/TASK-059/e2e-matrix.json
```

Every mandatory behavior below must map to executable browser assertions and evidence. Documentation-only coverage does not count.

### J1. Anonymous / Private Route Guard

Prove in a fresh unauthenticated browser context:

- protected Personal Center routes do not expose private content;
- accepted login/return flow is used;
- no owner/user UUID can be supplied by URL/form to bypass ownership;
- no private data flashes before redirect/guard completion;
- no secret/admin credential appears in browser-visible payloads or client bundles.

Do not duplicate every 9.5 API auth test; prove the browser boundary and continuity.

### J2. Registration → Personal Center → Logout → Login Again

Using Local Supabase/Auth or the currently accepted deterministic Local Auth mechanism:

1. create/register a synthetic user through the accepted user-facing browser flow;
2. enter the authenticated Personal Center;
3. visit multiple B-owned pages;
4. verify authenticated navigation continuity;
5. logout through the user-facing flow;
6. prove protected routes are no longer available;
7. log in again;
8. prove the same account regains access to its persisted B-owned data.

External email/SMS/OAuth delivery that cannot be made deterministic locally must not be faked as a real provider success. Test the accepted deterministic local path and list external delivery as Deferred where appropriate.

### J3. Profile / Account Persistence

Through the real browser UI:

- open Profile/Account from Personal Center navigation;
- modify representative valid editable fields;
- save explicitly;
- navigate away and back;
- hard reload;
- logout/login again;
- verify persisted values remain;
- exercise at least one representative invalid edit and verify deterministic validation/error behavior;
- verify the browser cannot choose a different owner.

Do not duplicate Auth credential truth into product Profile merely for test convenience.

### J4. Preference Persistence / Preset / Reset

Through the real Personal Center preference UI, exercise representative values across the existing accepted categories, including the categories currently exposed for:

- mobility/walking;
- attraction/activity interests;
- dining/accommodation/budget;
- travel style/planning where exposed by the accepted UI.

Prove:

- edits do not become persisted merely by opening/selecting a preset if current semantics require explicit Save;
- explicit Save persists canonical values;
- navigation away/back and hard reload preserve the saved state;
- logout/login preserves saved state;
- reset follows accepted `unset` semantics rather than silently applying a preset;
- preset application preserves out-of-scope keys as defined by the accepted B contract.

Do **not** validate Planner consumption here; Preference → Planner is WBS 9.7.

### J5. Companion Lifecycle and Ownership

Through the real Personal Center companion UI:

- create at least one representative companion record using the accepted UI/domain model;
- edit and persist it;
- navigate/reload/logout/login and verify persistence;
- delete it through the accepted UI;
- verify removal persists;
- with a second synthetic user, prove no companion data leaks across users.

If groups are a required part of the currently accepted visible UI, cover representative group/member behavior. Do not invent a new group UI solely for this Task.

### J6. Trip Library Browser Journey

Cover the B-owned Personal Center Trip Library UI and accepted Draft/Saved/History semantics.

Important boundary:

- A WBS 8.5 Main-system Trip Plan Schema is not a prerequisite for 9.6 and must not be invented by this Task.
- Browser fixtures may seed accepted B-owned trip-library records through current B test helpers/API/contracts where a Planner creation journey would cross into A-owned scope.
- Do not count a mocked UI-only trip as persistence proof.

Prove as applicable to the accepted current UI:

- seeded/current-user Draft/Saved/History records render in the correct Personal Center areas;
- navigation and refresh preserve the view of owned records;
- a second user cannot see the first user's trips;
- browser-visible behavior matches the accepted B Trip Library contract.

Do **not** execute Planner → save → Personal Center; that belongs to WBS 9.8.

### J7. Complete Desktop / Mobile Personal Center Navigation

Reuse the canonical accepted viewport definitions from WBS 9.12/current repository rather than inventing a parallel breakpoint standard.

At minimum, prove one canonical desktop viewport and one canonical mobile viewport can complete the B-owned navigation journey:

```text
avatar/account entry
→ Personal Center shell
→ Profile/Account
→ Preferences
→ Companions
→ Trips/History/Drafts as exposed
→ data/account management entry
```

Requirements:

- no dead-end navigation;
- no unexpected full-page loss of session;
- no hidden mandatory action behind an inaccessible control;
- browser back/forward behavior does not expose another user's state;
- no uncaught page error or new unexpected console error.

WBS 9.12 already owns broad responsive/accessibility QA. TASK-059 should prove the **end-to-end journey at desktop/mobile sizes**, not repeat all 9.12 visual or WCAG checks.

### J8. Full Browser Account Deletion Lifecycle

Use a dedicated disposable synthetic account, distinct from any other journey account.

Before deletion, seed through accepted B flows/helpers enough owned data to prove meaningful cleanup, including representative Profile/Preferences/Companions/Trip Library data where supported.

Through the real browser deletion UI/flow:

- deletion targets the current verified user only;
- required confirmations/reauthentication accepted by current UI are exercised;
- arbitrary target user injection is impossible;
- successful deletion ends/invalidates the user session;
- protected Personal Center access fails afterward;
- the deleted account cannot regain access under the accepted Local Auth behavior;
- a second control user's data/account remains intact;
- B-owned persisted data is removed according to the accepted account-deletion contract;
- external booking/provider mutation count is zero.

Do not call a client-side logout alone “account deletion”.

---

## 7. Cross-User Isolation Requirement

At least **two distinct Local Auth users** are mandatory for TASK-059.

Browser-level assertions must prove that User A never observes User B's:

- Profile/account product data;
- Preferences;
- Companions;
- Trip Library data.

API/RLS assertions from 9.5 remain necessary regression evidence, but they do not replace the browser-level isolation assertions required here.

Use unique, deterministic test identities. Never use a developer's personal account or a shared Production/Staging account.

---

## 8. Browser Matrix

### Primary browser

The repository's currently accepted primary Chromium-family browser/runtime is mandatory for the complete journey matrix.

The **complete primary-browser suite must pass twice** on the final candidate to demonstrate determinism.

### Additional engines

Because 9.6 owns broad browser E2E, audit and execute other canonical browser engines supported by the repository's accepted framework/environment, such as Firefox/WebKit **when actually available**.

For each engine record one of:

- `PASS` — actually executed and passed;
- `FAIL` — actually executed and failed;
- `DEFERRED` — runtime/infrastructure genuinely unavailable, with exact reason/evidence;
- `NOT_APPLICABLE` — only when technically justified.

Do not silently skip an expected engine and call the browser matrix green.

If the Task cannot execute the mandatory primary browser, final status is `Blocked`/`Partial`, never PASS.

---

## 9. Test Data / Local Runtime Safety

Mandatory browser persistence journeys must use **Local** development/test infrastructure only.

Rules:

1. no Production/Staging mutation;
2. no external booking/provider mutation;
3. use existing repository Local DB wrappers;
4. do not wipe unrelated developer Local data;
5. prefer per-test/per-run unique synthetic identities;
6. isolate destructive account-deletion cases;
7. clean synthetic users and B-owned fixtures after the run;
8. terminate test web servers/browser processes started by the Task;
9. prove final Local cleanup state;
10. record final `db:status` and perform the accepted `db:stop` cleanup step where this Task started Local DB services.

If a destructive reset is truly required, justify it and ensure the runtime is an isolated disposable Local instance. Do not casually use `db:reset` against a developer-owned Local environment.

Test/admin credentials may exist only in server/test process scope. They must never leak to client bundles, screenshots, committed logs, Result files, or browser-visible storage.

---

## 10. Test Architecture and Selectors

Prefer stable, user-meaningful selectors already present in the UI: roles, labels, accessible names, route semantics, or stable domain text.

A small number of B-owned `data-testid` attributes may be added only when:

- no stable semantic selector exists;
- the selector is required for deterministic E2E;
- it does not change product behavior;
- it is narrowly scoped.

Do not perform a broad UI refactor just to make tests easier.

Page-object/helper abstractions are allowed only when they reduce real duplication and match repository conventions. Avoid a large testing architecture rewrite.

---

## 11. Aggregate E2E Entry Point

Create a stable repository entry point, preferably:

```text
npm run test:personal-center:e2e
```

The exact implementation may be a Node orchestrator if that matches TASK-055 and repository conventions.

Requirements:

- deterministic suite order where shared Local state/ports require it;
- non-zero exit on any mandatory journey failure;
- non-zero exit on mandatory skip/todo/cancel/no-test conditions;
- visible browser/viewport selection;
- no hidden conversion of browser launch failure into PASS;
- document exactly which journeys and browser(s) are included by default;
- do not include WBS 9.7/9.8 cross-module flows.

If a separate explicit matrix command is useful, it may be added, but avoid unnecessary script proliferation.

---

## 12. Evidence Deliverables

Create at least:

```text
docs/qa/TASK-059/README.md
docs/qa/TASK-059/browser-harness-inventory.json
docs/qa/TASK-059/e2e-matrix.json
docs/qa/TASK-059/journey-results.json
docs/qa/TASK-059/browser-matrix.json
docs/qa/TASK-059/quality-gates.json
```

Evidence must include:

- execution baseline SHA;
- final candidate SHA;
- exact commands;
- browser engine/version/executable source where available;
- viewport(s);
- journey IDs and assertions;
- run counts/pass/fail/skip/todo/cancel;
- two-run primary-browser determinism comparison;
- Local Auth/DB cleanup outcome;
- console/page error summary;
- fixture/user isolation strategy;
- any Deferred browser engines and exact reason;
- exact-head GitHub Quality Gate URL/status.

### Large artifacts

Do not commit large videos/traces/screenshots merely as proof.

- Prefer traces/screenshots on failure or a small representative evidence set.
- Keep bulky raw artifacts in ignored local/CI artifact storage.
- Record artifact path/hash/retention location without committing secrets or huge binary files.

---

## 13. Mandatory QA Sequence

Perform, at minimum, the following on the execution-time baseline/candidate as appropriate:

1. `npm ci`
2. verify exact clean execution baseline
3. read TASK-055 inventory/matrix/gap/Result and current browser/E2E infrastructure
4. capture baseline full repository test result using the repository's canonical command
5. run the accepted 9.5 non-Local Personal Center aggregate
6. start/verify isolated Local Supabase as required using repository wrappers
7. run the accepted 9.5 Local Personal Center aggregate or the execution-time canonical equivalent
8. run any existing relevant browser baseline/smoke before modifying it
9. implement TASK-059 browser harness/journeys with minimum necessary changes
10. execute mandatory J1–J8 on the primary browser
11. execute cross-user browser isolation
12. execute destructive account-deletion journey in isolated order
13. execute desktop + mobile viewport journey
14. execute supported additional browser engines
15. run `test:personal-center:e2e` primary-browser aggregate — **run #1**
16. clean/re-establish fixtures as required
17. run `test:personal-center:e2e` primary-browser aggregate — **run #2**
18. prove deterministic mandatory suite/test/journey counts across the two runs
19. run candidate full repository Node/unit/integration suite
20. rerun accepted 9.5 aggregate(s) to prove no regression
21. `npm run lint`
22. `npm run typecheck`
23. `npm run build`
24. run current canonical local deployment validation/build/artifact gates where present
25. scoped Prettier/format check for changed files
26. `git diff --check`
27. cleanup synthetic Auth/DB data, browser/server processes, and Local runtime; record final status
28. create/update Result and WBS tracking
29. push implementation branch and open **Draft PR** to `develop`
30. wait for exact final-head GitHub Quality Gate and record its URL/result
31. stop at `待审查`; do not merge.

If execution-time scripts differ, use their canonical replacements and document the mapping. Do not silently omit a mandatory gate.

---

## 14. Baseline Debt Rule

A failing check may be treated as pre-existing baseline debt only when all of the following are demonstrated:

1. the same failure is reproduced on the exact clean execution baseline;
2. the candidate failure is materially identical;
3. TASK-059 changed files do not cause, expand, or depend on the failure;
4. all TASK-059-specific mandatory tests pass;
5. the exact final-head clean GitHub Quality Gate passes when the repository workflow is the canonical arbiter, or the Result explicitly reports why that cannot be achieved.

Never hide a new E2E/browser failure under an old lint/format/test exception.

---

## 15. Allowed Changes

Allowed:

- E2E/browser tests;
- test-only browser runner/orchestrator;
- focused test fixtures and helpers;
- focused Local Auth/DB test setup/cleanup helpers;
- `package.json` scripts and lockfile only when genuinely required by the canonical E2E setup;
- narrowly scoped stable test selectors in B-owned UI;
- QA evidence/README/Result/WBS tracking;
- a minimal B-owned product defect fix only when the E2E test proves a real defect and the fix is narrow, backward-compatible, and does not change frozen product semantics.

If E2E discovers a defect requiring schema redesign, new migration semantics, cross-owner architecture, or new product decisions, do **not** smuggle that work into 9.6. Report `Partial`/`Blocked` and create a clear defect handoff recommendation.

---

## 16. Explicitly Out of Scope

Do not implement or claim completion of:

- WBS 9.7 Preference → Planner cross-module E2E;
- WBS 9.8 Planner → Save → Personal Center cross-module E2E;
- A-owned Planner/Map/Route/POI/Recommendation/AI behavior;
- A WBS 8.5 Trip Plan Schema;
- A 6.x main AI work;
- real external email/SMS/OAuth provider delivery unless already deterministically available in the accepted test environment;
- Production/Staging tests that mutate data;
- external booking/provider writes;
- broad responsive/accessibility re-audit already owned by WBS 9.12;
- native Mobile App WBS 11.x;
- broad UI redesign;
- new Personal Center business semantics;
- a second E2E framework.

---

## 17. Result Requirements

Create:

```text
docs/tasks/RESULT-TASK-059-b-wbs-9-6-personal-center-e2e.md
```

The Result must state, at minimum:

### Tracking

- execution baseline SHA;
- final head SHA;
- Issue #364;
- implementation branch;
- Draft PR number/URL;
- WBS final state.

### Harness

- selected E2E framework/harness and why;
- browser executable/runtime source;
- browser matrix actually executed;
- desktop/mobile viewport(s).

### Journey Coverage

For J1–J8:

- PASS/FAIL/DEFERRED;
- test/spec location;
- key assertions;
- fixture/user count;
- browser(s) run.

### Determinism

- primary aggregate run #1 counts/result;
- primary aggregate run #2 counts/result;
- comparison and any difference explanation;
- skip/todo/cancel/no-test counts.

### Regression

- baseline full repo count/result;
- candidate full repo count/result;
- 9.5 non-Local aggregate result;
- 9.5 Local aggregate result;
- lint;
- typecheck;
- build;
- deployment/local artifact gates;
- scoped format;
- `git diff --check`;
- baseline debt proof if any.

### Safety / Cleanup

- Production mutation = No;
- Staging mutation = No;
- external provider/booking mutation = No;
- synthetic Local users remaining = 0 (or exact justified exception);
- synthetic B-owned fixtures remaining = 0 (or exact justified exception);
- server/browser process cleanup;
- final Local DB status/stop evidence;
- secrets/tokens in committed evidence = No.

### CI

- exact final-head GitHub Quality Gate URL;
- final-head status.

### Downstream

Explicitly state:

```text
WBS 9.7 started: No
WBS 9.8 started: No
Other downstream B task started: No
```

---

## 18. WBS / Issue / PR State Rules

### At actual implementation start

```text
9.6 = 进行中（#364 / TASK-059-B）
```

### After implementation + mandatory QA + Draft PR

```text
9.6 = 待审查（#364 / TASK-059-B；Draft PR #<number>）
```

Issue #364 remains Open.

Use `Refs #364` in the Draft PR description; do not use auto-close wording such as `Closes #364` before user acceptance.

### Only after explicit user acceptance and explicit merge authorization

- merge accepted PR to `develop`;
- update WBS 9.6 to `已完成`;
- complete closeout tracking;
- close Issue #364 according to the accepted workflow.

Do not auto-start WBS 9.7, 9.8, 4.22, 6.14, 8.8, or any other downstream Task.

---

## 19. Git Safety

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not rebase a published shared branch unless explicitly authorized.

Do not overwrite unrelated Task/WBS changes from A or other B work.

Do not develop from the Task publication branch. The publication branch contains the specification only.

---

## 20. Definition of Done for TASK-059-B Candidate

A candidate may be returned as `待审查` only when:

- prerequisite gate passed;
- canonical E2E/browser harness was audited and reused;
- J1–J8 mandatory journeys are implemented and primary browser actually passes them;
- at least two Local users prove browser-level cross-user isolation;
- desktop and mobile Personal Center navigation journey passes;
- full account-deletion browser lifecycle passes on a disposable user;
- B Trip Library journey is tested without inventing A 8.5 or performing WBS 9.8;
- primary E2E aggregate passes twice with deterministic mandatory counts;
- supported additional browser engines are actually run or accurately reported Deferred;
- 9.5 unit/integration baseline remains green or any exact baseline debt is proven;
- full candidate regression, lint/typecheck/build/current local deployment gates and diff checks are complete;
- synthetic data/processes are cleaned;
- no Production/Staging/external-provider mutation occurred;
- Draft PR targets `develop` and remains unmerged;
- exact final-head GitHub Quality Gate result is recorded;
- Result and WBS tracking are committed and pushed;
- WBS 9.6 remains `待审查` pending user acceptance;
- no downstream Task was started.

If mandatory primary-browser E2E cannot be executed, or a real blocker prevents J1–J8 from completing, return `Partial`/`Blocked` with precise evidence instead of weakening the acceptance criteria.