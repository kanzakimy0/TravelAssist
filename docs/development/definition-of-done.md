# TravelAssist Definition of Done

> Version: 1.0 candidate  
> WBS: 0.6  
> Owner: A / Project Governance  
> Status: 待验收  
> Updated: 2026-09-10

## 1. Purpose

This Definition of Done (DoD) is the repository-wide acceptance contract for design, implementation, integration, database, provider, security, performance, and deployment work. It prevents local, Mock, Partial, or Deferred evidence from being reported as a production-complete feature.

The minimum rule is:

> A task is done only when its required scope is implemented, validated with appropriate evidence, traceable through WBS/Issue/Task/Result/branch/commit/PR, merged into `develop`, and accepted by the user or named acceptance owner.

Passing tests alone is not completion. A merged PR alone is not completion when required acceptance is still missing.

## 2. Normative language

`MUST`, `MUST NOT`, `SHOULD`, and `MAY` are normative. When a Task has stricter acceptance rules, the stricter rule wins. A Task may narrow scope but may not weaken security, ownership, truthful-status, or production-safety rules without an explicit approved amendment.

## 3. Status model

| Task status | WBS status | Meaning | Allowed claim |
| --- | --- | --- | --- |
| 待开始 | 未开始 / 可开始 | Scope exists but implementation has not begun | Planned only |
| 进行中 | 进行中 | Work has started; evidence is incomplete | In progress |
| 阻塞 | 阻塞 | A hard dependency or required authority prevents safe progress | Blocked, with exact reason |
| 待验收 | 待审查 | Task-owned implementation and required local validation are complete; merge and/or acceptance is pending | Ready for review |
| 已完成 | 已完成 | Required validation passed, PR is in `develop`, and required user/owner acceptance is recorded | Completed |
| 取消 | 取消 | Work is intentionally stopped or superseded | Cancelled, with replacement if any |

### 3.1 State transitions

```text
待开始 → 进行中 → 待验收 → 已完成
                 ↘ 阻塞 ↗
任一未完成状态 → 取消
```

- A task MUST NOT move directly from local implementation to `已完成`.
- A Draft/Open PR MUST remain `待验收` / `待审查` even if every local gate passes.
- A merged PR with a failed required gate MUST be `阻塞`, not `已完成`.
- A historical completed row MUST NOT be rewritten in bulk. A regression receives its own Issue/Task unless the completion record itself was factually wrong.

## 4. Universal completion gates

Every task MUST satisfy all applicable gates:

1. **Scope:** Required acceptance items are enumerated and each is implemented, intentionally Deferred by the Task, or reported Blocked.
2. **Ownership:** The branch changes only task-owned files or records an approved cross-owner handoff.
3. **Source:** Work starts from the required current `origin/develop` or documented dependency commit, not an unmerged feature branch unless the Task explicitly authorizes stacking.
4. **Quality:** Task-required tests, lint, typecheck, format/diff, build, runtime, and browser checks pass or their exact failure is reported.
5. **Security:** No secret, unsafe trust expansion, or production-side effect is introduced.
6. **Regression:** Existing accepted behavior in scope is revalidated.
7. **Evidence:** Results are reproducible and identify command, environment, scope, result, and limitations.
8. **Tracking:** WBS, Issue, Task, Result, branch, commit, and PR agree.
9. **Integration:** The final reviewed tree is merged into `develop` without losing other owners’ work.
10. **Acceptance:** The user or named acceptance owner approves when required.

If any applicable gate is incomplete, the task is Partial, Deferred, Blocked, or Ready for Review—not completed.

## 5. Design-only DoD

A design-only task is ready for review when it has:

- a named canonical document, version/date, owner, WBS, and Issue;
- explicit goals, non-goals, responsive states, empty/loading/error states, accessibility expectations, and interaction behavior where applicable;
- a conflict audit against current accepted screens, design tokens, and runtime constraints;
- a source/decision matrix separating accepted rules, proposals, and unresolved user choices;
- objective inconsistencies corrected or listed as exact required amendments;
- downstream migration impact and acceptance evidence requirements;
- no claim that a concept image proves runtime behavior.

It is completed only after the design PR is merged and user/design-owner acceptance is recorded. A design candidate or Draft PR is not frozen merely because it is detailed.

## 6. Frontend/runtime DoD

Applicable frontend work MUST:

- implement the specified behavior in the canonical route/component without duplicating business state;
- preserve server/client boundaries and follow the installed framework version’s repository documentation;
- handle loading, empty, error, retry, pending, and rapid/repeated activation where relevant;
- use semantic controls, visible focus, keyboard operation, sensible focus restoration, and stable URL/history behavior;
- avoid hydration, console, resource, and unhandled promise errors introduced by the task;
- verify required desktop/mobile viewports, overflow, responsive collapse, reduced motion, and touch targets;
- preserve accepted visual geometry outside the Task scope with screenshots or measured regression evidence when required;
- distinguish real data, local data, fixture data, and Mock behavior in UI and Result.

Static source-pattern tests alone MUST NOT be the only evidence for an interactive acceptance item.

## 7. Shared Contract and schema DoD

A public Contract/schema task MUST include:

- one canonical source and explicit Producer/Owner and Consumer list;
- stable ID, optional/null/empty/unknown, units, currency, local-date/instant/timezone, and enum fallback semantics as applicable;
- runtime validation, TypeScript types, minimum/full/boundary fixtures, negative tests, and version identifier;
- additive versus breaking classification;
- for breaking changes: compatibility window, migration steps, deprecation/removal condition, and Consumer validation;
- adapters at Producer/Consumer boundaries rather than leaked DB, Provider, React Props, or private Store shapes;
- a cross-owner review record before final freeze.

Contract completion does not imply persistence, UI integration, or Provider integration unless those are explicitly in scope and validated.

## 8. Database, migration, and RLS DoD

Applicable database work MUST:

- use `supabase/migrations/*.sql` as the only formal migration history and keep the Drizzle schema as a mirror/query layer;
- prove a clean Local Supabase start/status/reset and deterministic generated types;
- validate the migration from an empty database and any required upgrade path;
- test constraints, foreign keys, indexes, transactions, rollback, revision/CAS behavior, and deletion semantics required by the Task;
- test RLS using real authenticated identities: owner allow, cross-user deny, and anonymous deny;
- leave fixtures and local Auth/business tables clean after tests;
- run build with cloud DB variables absent unless the application explicitly requires them;
- keep staging/production migration and `drizzle-kit push` out of local completion unless explicitly authorized.

SQL existence, Drizzle typechecking, or a Mock database is not evidence that migrations/RLS work at runtime.

## 9. Provider and live-integration DoD

Provider work MUST distinguish:

- official documentation review;
- deterministic sanitized adapter fixtures;
- local Evaluation smoke;
- approved Production capability/licensing acceptance.

It MUST document capability, geography, platform, attribution, price/volume, cache/store/redisplay, retention, rate limits, timeout/retry, normalized errors, and production-use restrictions. Provider secrets remain server-only and must not appear in fixtures, logs, Result, Issue, PR, bundles, or screenshots.

Without a legal credential, fixture validation MAY complete an Evaluation adapter when the Task allows it; live smoke is then `Deferred`. Without confirmed production terms, the production integration MUST remain fail-closed and MUST NOT be reported production-ready.

## 10. AI DoD

AI work MUST define:

- input/output Contract and validation;
- model/provider boundary and secret handling;
- grounding/source/provenance expectations;
- deterministic fixture/evaluation cases and failure/fallback behavior;
- latency, cost, cancellation, timeout, retry, and rate-limit bounds;
- unsafe-content, prompt-injection, personal-data, and tool/action authorization boundaries;
- user-visible distinction between suggestions and committed actions;
- observability that does not transmit raw itinerary or personal content by default.

A scripted loading animation, hard-coded response, or prompt document is not proof of a working AI feature. Live production readiness requires an approved provider, real controlled evaluation, safety acceptance, and production deployment evidence.

## 11. Security and privacy DoD

Applicable work MUST:

- run the repository secret scan and relevant dependency/static/runtime checks;
- test positive and negative authorization paths at the enforcement boundary;
- minimize personal data, telemetry, logs, and external transmission;
- normalize/redact errors and use fingerprints instead of secret values;
- verify client bundles contain no server-only modules, credentials, or private environment variables;
- document threat assumptions, accepted risk, remediation owner, and expiry for every exception;
- preserve least-privilege workflow and deployment permissions.

Absence of a detected secret is not proof of complete security. Security scans, RLS, Auth, browser privacy, and operational controls are separate gates.

## 12. Performance and observability DoD

Applicable work MUST:

- record an unmodified baseline and the same measured path after changes;
- define budgets with metric, percentile/sample method, viewport/environment, and pass/fail threshold;
- separate unit instrumentation tests, laboratory browser measurements, and online monitoring capability;
- trigger at least one real browser error path and one real server error path when required;
- verify redaction at capture and export boundaries;
- keep external telemetry disabled by default until destination, consent, retention, and privacy approval exist;
- report noise, sampling, missing coverage, and environment limitations.

A pure formatter/redaction unit test alone does not prove end-to-end observability. Local Lighthouse/lab metrics are not production SLOs.

## 13. Browser, accessibility, and responsive DoD

Browser evidence MUST identify browser engine/version, build mode, URL, viewport, and whether data/services were live or fallback. As applicable it covers:

- required viewports and orientation;
- keyboard order, visible focus, Escape, focus trap/return, skip links, and browser back/forward;
- accessible name/role/state and screen-reader-relevant announcements;
- pointer and touch interactions, drag alternatives, minimum target size, and zoom/reflow;
- reduced motion and media fallback;
- overflow, fixed/sticky overlays, safe areas, and content occlusion;
- console, page, hydration, failed resource, and network errors;
- screenshots plus machine-readable measurements for geometry-sensitive work.

Desktop emulation is not a real-device claim. A screenshot is not interaction or accessibility evidence.

## 14. CI and deployment DoD

CI/deployment work MUST:

- use least-privilege permissions and prevent untrusted PR code from accessing secrets;
- run deterministic quality gates from a clean checkout;
- isolate Development, Preview, and Production configuration and resources;
- keep Evaluation providers fail-closed in Preview/Production when required;
- produce a verifiable artifact and rehearse the documented local deployment path;
- record the exact remote environment and immutable revision for any real deployment;
- verify health/rollback/monitoring expectations before a production-ready claim.

A local build or rehearsal is not a cloud deployment. A placeholder script that exits successfully is not deployment evidence. Publishing, DNS, paid resources, production migrations, or production secrets require explicit authority.

## 15. Evidence and Result requirements

Every Result MUST contain, as applicable:

- Status and scope completed;
- prerequisites and base SHA;
- branch, task commit(s), PR, Issue, WBS;
- files changed and ownership/conflict audit;
- exact validation commands and numeric pass/fail/skip counts;
- runtime/browser/database/provider environment;
- evidence paths or links and how to reproduce them;
- baseline failures separated from task regressions;
- Deferred, Partial, Blocked, non-goals, and known limitations;
- cleanup/final state (working tree, local services, test data);
- merge and user-acceptance status.

Evidence SHOULD be committed when it is small, non-sensitive, reproducible, and review-useful. Large binaries, credentials, raw personal data, provider payloads, and machine-specific caches MUST NOT be committed. External evidence must have a stable reference and must not be the sole source of critical acceptance facts.

## 16. Baseline debt versus new regression

When a required full-repository gate fails:

1. Run the same command on the exact unmodified base when feasible.
2. Record exact failing tests/files and compare failure sets.
3. Prove whether the Task added, removed, or changed each failure.
4. Fix any task-caused regression before review.
5. Report unchanged baseline debt truthfully; do not relabel the failed command `PASS`.

A Task may be `待验收` with proven, unchanged, out-of-scope baseline debt only when its Task explicitly permits this and all task-owned gates pass. A required hard gate that the Task does not exempt makes the Result Partial or Blocked.

## 17. Deferred, Partial, and Blocked rules

### Deferred

Use `Deferred` only for an explicitly out-of-scope or unavailable acceptance item that the Task permits deferring. Record reason, owner, follow-up WBS/Issue, and what claim is therefore prohibited.

### Partial

Use `Partially Completed` when useful in-scope work is delivered but one or more non-bypassable completion gates remain. Enumerate complete and incomplete items separately. Partial MUST NOT update the WBS to `已完成`.

### Blocked

Use `Blocked` when a hard prerequisite, missing authority, unavailable required evidence, conflict, or safety constraint prevents safe progress. Record the exact current SHA/state, blocker owner, and unblocking condition. Do not poll, invent a workaround, or implement against guessed schemas.

## 18. A/B ownership and handoff

- The WBS owner remains authoritative unless the user explicitly reassigns a Task.
- Producers own domain semantics and publish canonical Contracts; Consumers own adapters and ViewModels.
- Consumers MUST NOT import another owner’s private Store/component/schema as the public interface.
- Cross-module changes require a named handoff, compatibility classification, fixtures, and integration review.
- Parallel branches MUST NOT be stacked or cherry-picked unless the Task explicitly authorizes it.
- Conflict resolution preserves both owners’ valid work and reruns affected acceptance gates.

## 19. Prohibited evidence claims

The following claims are forbidden:

- “All tests pass” when any required test failed or was not run.
- “Production-ready” based only on fixtures, Mock data, local build, or Evaluation credentials.
- “Deployed” for a local artifact/rehearsal or placeholder script.
- “RLS/Auth verified” from SQL/source inspection without required runtime identities and denial tests.
- “Accessible” based only on semantic markup or screenshots.
- “Responsive” from a single viewport.
- “No console errors” when the console was not observed.
- “No secrets” when only tracked files or only one scanner was checked contrary to the Task.
- “Deterministic” without a second generation/run and byte/state comparison.
- “Completed” while the PR is Draft/Open, the Result is Partial/Blocked, or user acceptance is required but absent.
- “Live Provider/AI/Map verified” when fallback or fixtures were used.
- presenting skipped, Deferred, or unavailable checks as passed.

## 20. Reusable acceptance checklist

Copy this checklist into future Task/PR Results and mark non-applicable items with a reason.

### Scope and ownership

- [ ] Required scope and non-goals are explicit.
- [ ] Base SHA and dependency gates are verified.
- [ ] Changed files are task-owned; cross-owner changes have an approved handoff.
- [ ] No unmerged dependency branch was silently stacked.

### Implementation and validation

- [ ] Acceptance items map to implementation and evidence.
- [ ] Unit/contract/integration/negative tests pass with exact counts.
- [ ] Lint and typecheck pass.
- [ ] Required format and diff checks pass.
- [ ] Production build passes without unauthorized live dependencies.
- [ ] Task-caused regressions are fixed; baseline debt is proven and listed.

### Runtime and experience

- [ ] Required real runtime path is exercised, not only source inspection.
- [ ] Loading/empty/error/retry/repeated-action behavior is covered.
- [ ] Browser, keyboard, focus, history, reduced-motion, and responsive gates pass where applicable.
- [ ] Console/hydration/resource errors are checked.
- [ ] Live, local, fixture, fallback, Mock, and Deferred evidence are labelled correctly.

### Security and operations

- [ ] Secrets and server/client boundaries are scanned.
- [ ] Authorization/privacy denial paths are tested where applicable.
- [ ] No unauthorized production, billing, DNS, migration, or external transmission occurred.
- [ ] Local services/test data are cleaned up and final state is recorded.

### Tracking and acceptance

- [ ] Task and Result are updated.
- [ ] WBS and Issue reflect the actual state.
- [ ] Branch, commit, and Draft/Open/Merged PR metadata agree.
- [ ] Deferred/Partial/Blocked items name owner and unblocking condition.
- [ ] PR is merged into `develop` before `已完成`.
- [ ] Required user/acceptance-owner approval is recorded before `已完成`.

## 21. WBS 0.6 acceptance

This candidate becomes the repository-wide DoD only after its Draft PR is reviewed, merged into `develop`, and accepted by the user. Until then WBS 0.6 remains `待审查`; it does not retroactively reclassify historical tasks.
