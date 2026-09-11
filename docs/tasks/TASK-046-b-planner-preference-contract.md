# TASK-046-B — WBS 5.14 Planner-readable Preference Contract v1

## 0. Tracking

| Item | Value |
| --- | --- |
| Owner | B — Personal Center / Preference Producer |
| Consumer / integration review | A or designated shared-architecture reviewer |
| WBS / Priority | 5.14 / P0 |
| Issue | #321 |
| Repository | kanzakimy0/TravelAssist |
| Spec branch | task/b-wbs-5-14-planner-preference-contract |
| Implementation branch | codex/b-account-wbs-5-14-planner-preference-contract |
| PR base | develop |
| Publication baseline | de83a1d6cf33eadc9107a529cb1e9590c95d43a4 |
| Design | docs/architecture/planner-preference-contract-v1.md |
| Result | docs/tasks/RESULT-TASK-046-b-planner-preference-contract.md |

Status at publication: specification/handoff preparation started; WBS 5.14 is being set to 进行中 in the actual Master table. No implementation or QA is claimed by publication. Execute only this Task.

## 1. Start gate

Run before editing:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Read all three files from the remote spec branch, not stale local copies:

```bash
git show origin/task/b-wbs-5-14-planner-preference-contract:docs/architecture/planner-preference-contract-v1.md
git show origin/task/b-wbs-5-14-planner-preference-contract:docs/tasks/TASK-046-b-planner-preference-contract.md
git show origin/task/b-wbs-5-14-planner-preference-contract:docs/tasks/CODEX-TASK-046-b-planner-preference-contract.md
```

Read latest develop:

- `docs/project/WBS-TravelAssist.md`;
- `docs/architecture/cross-module-contract-handoff.md`;
- `docs/architecture/preference-schema-v1.md` and `preference-persistence-api-v1.md`;
- `src/features/preferences/domain/preference-v1.ts`;
- `src/features/preferences/persistence/preference-resource.ts` and `preference-client.ts`;
- `src/server/preferences/http.ts`, `repository.ts`;
- `src/lib/auth/server-user.ts`, `src/lib/supabase/request.ts` and the associated request-scoped Auth helpers;
- `src/shared/contracts/planning/features.ts`, existing Trip/Engine public indexes;
- TASK-042 and TASK-045 tests/results, actual package.json and quality-gate workflow.

Verify 5.11 and 5.16 are 已完成 in Master, accepted implementations PR #309 and #319 are ancestors of latest develop, Issue #321 is Open, and no other canonical 5.14 implementation has since merged. Inspect PR #221 only read-only if needed; its old 30-key package is not the source of truth. If an existing canonical implementation conflicts, return Blocked rather than creating a parallel package.

## 2. Workspace safety

Use a clean independent worktree from execution-time latest `origin/develop` on:

```text
codex/b-account-wbs-5-14-planner-preference-contract
```

Preserve the original workspace. Never base from the spec branch or PR #221. Never use `feature/**` or enable auto-merge. Forbidden: `git clean -fd`, `git reset --hard`, force push and force-with-lease. Preserve other A/B changes and Task numbers.

Verify the remote Master 5.14 start row; if it already says 进行中, keep it. Do not regress 5.11/5.12/5.16 completion. Do not globally reformat Master WBS.

## 3. Objective

Deliver a real, versioned, browser-safe read contract and read facades for the already accepted long-term Preference data. A consumers must import the public boundary rather than B private forms/DB modules.

This is not a new persistence API, not Planner live integration and not a 23→43 scoring implementation.

## 4. Single-source extraction

Mechanically promote the existing pure 5.11 implementation into `src/shared/contracts/preferences/core.ts` (or one equivalently named canonical module). Leave the old `src/features/preferences/domain/preference-v1.ts` as a compatibility re-export.

Preserve exactly:

- all 23 keys, values, 16 InterestCodes and every allowed parent DetailCode;
- five walking levels, seven integer 1–5 styles, three hard_when_true exclusions;
- missing/false/neutral/map semantics and allowed soft tensions;
- strict plain-JSON descriptor validation and defensive copies;
- PreferenceValidationError behavior, 64 KiB limit;
- parsePreferenceV1, parsePreferencePatchV1, applyPreferencePatch behavior;
- patch whole-map replacement and final-result validation.

Do not copy the registry into a second independent file. Shared modules must never import features, UI or DB. If the 5.16 pure resource/envelope parser is needed by public projection, move it once to a shared compatibility module and keep its old path as a re-export too. The existing HTTP response/error and mutation behavior must remain unchanged.

Prove single-source reuse with exports/reference equivalence where possible and full behavioral vectors. Update historical source-path assertions only when needed; do not delete, skip or relax behavior assertions.

## 5. Public read contract

Implement the design's exact `LongTermPreferenceReadV1`:

```ts
{
  contractVersion: "1.0";
  scope: "long_term";
  sourceRevision: number;
  sourceUpdatedAt: string | null;
  preference: DeepReadonly<PreferenceV1>;
}
```

Provide:

- `PREFERENCE_READ_CONTRACT_VERSION` = "1.0";
- `parseLongTermPreferenceReadV1(unknown)`;
- `toLongTermPreferenceReadV1(unknown)` for existing 5.16 data resources;
- a typed read result/error union;
- static strength metadata derived from the one field registry;
- named, synthetic fixtures and JSON examples.

Exact five-field envelope. No owner/profile/DB/Trip/credentials/Radar fields. Revision 0 requires empty values and null time; persisted/reset-empty records may have positive revision and DB time. Reject non-integer/negative/out-of-range revisions, invalid/missing fields, malformed instants, wrong scope/version, malformed Preference. Preserve DB instant precision supported by its serialized ISO format.

Return detached deeply readonly/frozen data. Do not mutate caller input, silently normalize user values or fill defaults. Unknown contract/schema version must produce a distinguishable unsupported-version error; other invalid response content must remain a validation failure.

## 6. Explicit public exports

`src/shared/contracts/preferences/index.ts` must explicitly export the read model, parsers, needed readonly types/codes and static semantics. Do not export the entire core with `export *`.

The public read entry must not expose save/reset functions, mutation HTTP clients, DB helpers, React/ViewModels, environment secrets or UI-specific metadata. Pure patch helpers may remain in internal compatibility modules for existing B code; A's public root is read-only.

Validate the entire transitive import graph. Browser-safe means no server-only/Next server/Supabase/Drizzle/React or environment configuration imported through the pure contract. Keep server facade in a distinct server-only entry.

## 7. Existing HTTP API stays compatible

Do not change the accepted wire:

```text
GET /api/preferences -> {ok:true,data:{preference,revision,updatedAt}}
PATCH /api/preferences -> existing 5.16 request/response
POST /api/preferences/reset -> existing 5.16 request/response
```

Project GET `data` into the new read contract outside the wire. No duplicate read endpoint or operation-multiplexing route. No DDL, RLS/grant/trigger changes or new Preference table. No new migration or hand-edited generated types.

## 8. Browser read facade

Under `src/lib/preferences/client.ts`, provide a GET-only public reader accepting an optional AbortSignal. It must reuse the existing same-origin Cookie read path, private/no-store behavior and response validation without importing private UI code.

Return discriminated results. Required error distinctions:

```text
AUTH_REQUIRED
AUTH_UNAVAILABLE
PREFERENCE_UNAVAILABLE
INVALID_PREFERENCE_RESPONSE
UNSUPPORTED_PREFERENCE_VERSION
REQUEST_CANCELLED
```

Map unexpected upstream errors to safe failure; do not leak raw error details. Only authenticated success can produce an empty record. Do not turn 401/503/network failure/cancellation/unsupported JSON into empty Preference or neutral defaults. Do not accept owner IDs, store credentials, create module-global cross-user caches or implicitly call PATCH/reset.

Synthetic fetch injection is allowed for unit tests but does not replace real Local validation.

## 9. Server read facade

Under `src/server/preferences/public-read.ts`, expose an explicit request-scoped reader taking the current NextRequest (or an equivalent clearly documented trusted context), not an arbitrary owner ID.

Prefer reuse of existing `handlePreference(request, "get")` or a minimal behavior-preserving shared context extraction. Do not duplicate Auth verification logic. Existing verified Cookie/Bearer behavior, no invalid-Bearer fallback, owner RLS and safe errors remain intact.

Return a read result plus an explicit response finalizer/equivalent that forwards refreshed cookies and private/no-store headers. Document and test its use. Do not lose refresh cookies when composing this reader into an A server route. No service-role shortcuts, self-HTTP calls to arbitrary hosts or public Server Actions.

## 10. 23-key versus 43-dimension guard

Audit the existing `EffectivePreferenceV1` and `SparsePreferenceV1` in `src/shared/contracts/planning/features.ts` and write a clear compatibility matrix.

Do NOT:

- claim the 23-key read model is already the 43-dimensional score input;
- cast it to A's EffectivePreferenceV1;
- fabricate snapshotRef/overrideRevision;
- assign 1–9 values or weights for all 43 dimensions;
- fill unset fields with neutral 5;
- flatten hard transport exclusions into scores;
- change A's Planning/Trip/Engine contracts to make such a cast pass.

Long-term reading is delivered now. Trip snapshot/override persistence is 5.18/related work; Planner live consumption is 4.18; actual scoring mapping/calibration is downstream 7.9/related explicit design. An integration test demonstrating type separation is required; do not invent a production converter.

## 11. Semantic fixtures and tests

Include at least these independent cases:

1. authenticated missing record, revision 0;
2. persisted empty record after reset, positive revision;
3. missing vs explicit false for all applicable boolean families;
4. missing vs explicit neutral and middle style value 3;
5. all five walking levels and all seven style endpoints;
6. all 16 InterestCodes/details preserved, including details with absent parent;
7. valid parent hard exclusion plus false child exclusion;
8. whole-map payload remains whole-map; no renormalization;
9. unknown/legacy 30-key fields, wrong version, unexpected fields rejected;
10. invalid revision/time/scope/envelope rejected;
11. parser never mutates input; output detached and deeply frozen;
12. JSON round-trip and deterministic projection;
13. network/auth/format/version/cancel errors remain failures;
14. reader sends GET only with no owner parameter;
15. A-like consumer imports solely public contract plus read facade;
16. public entry's transitive import and export boundary checks;
17. old B imports and old 5.16 wire continue to work;
18. no bogus 43-vector/snapshot/defaults emitted.

## 12. Real Local integration QA — mandatory

Use an isolated resettable Local Supabase instance, never a remote database. Reuse existing Local helpers and real Next production test server. Run DB suites sequentially with at least two real temporary Auth users; clean them in finally.

Prove:

- empty reads through public Cookie and Bearer paths do not insert a row;
- user A and B yield separate results even at the same sourceRevision;
- write through the unchanged 5.16 PATCH, then public read sees the exact stored values/revision;
- stale PATCH/reset remain 409 (existing 5.16 regression);
- reset is visible as positive-revision empty, not revision 0;
- invalid explicit Bearer never falls back to Cookie;
- server composition forwards Auth refresh cookies and cache headers (deterministic unit checks plus real session read);
- canceled/failed browser read cannot be treated as a successful empty response;
- old Personal Center Save/reload/conflict behavior still passes TASK-045 real browser QA;
- original SQL/Drizzle/schema files remain unchanged; real generated types regenerate with no semantic diff.

Missing Docker/browser means Partial/Blocked; no skipping mandatory QA and no claiming tests ran on the user's machine. No real credentials, logs with tokens or user preferences in Git evidence.

## 13. Repository quality gates

Read actual package scripts; add task-specific commands without renaming existing ones. Expected coverage:

```text
npm ci
new TASK-046 contract/facade/consumer tests
npm run test:preferences
npm run test:preferences:db
npm run test:preference-api
npm run test:preference-api:local
Profile/Companion real DB regression using existing commands
full tests/*.test.mjs using the repository CI loader
npm run lint
npm run typecheck
npm run build
applicable deploy:validate:local / deploy:build:local / deploy:verify-artifact
changed-file Prettier
git diff --check
Local db:start/status/reset/types/stop, in the correct sequence
```

Local DB destructive reset is limited to the dedicated disposable test instance after preflight verifies localhost/project identity and no real data. Do not reset an arbitrary existing developer database. Test runner/browser paths are environment-specific, not a hardcoded universal Windows path.

Report actual counts and heads, not inherited counts from TASK-045. Existing format debt is separate; prove zero new regressions without mass-formatting WBS.

## 14. Required handoff and review

Create `docs/contracts/preference-read-v1-handoff.md` with:

- Producer/Consumer ownership and explicit public imports;
- browser and server read examples, including finalizer;
- synthetic JSON fixtures and error behavior;
- 5.11 core/5.16 resource path migration table and compatibility shims;
- 23-key/43-dimension boundary matrix;
- missing/default/snapshot/version rules;
- A/designated reviewer checklist.

Update the relevant Preference entry in the existing cross-module handoff inventory without rewriting other domains/history. Automated consumer tests are not A's human approval. Report A review as Pending until a real reviewer accepts it; do not forge approval or move downstream WBS states.

## 15. Allowed scope / prohibited work

Allowed: shared Preference contract; compatibility shims; read-only lib/server facades; strictly necessary 5.16 import/refactoring with unchanged behavior; tests; Task/design/handoff docs; WBS 5.14 tracking.

Forbidden: 5.13 presets; 4.18 real Planner integration; 5.17/5.18/5.19/8.6 implementation; scoring/AI/POI/Engine changes; new SQL; UI redesign; changing or merging PR #221 / Issue #207. Do not change the runtime of A Planner merely to demonstrate consumption: use an independent consumer fixture/test.

## 16. Delivery and exact WBS rule

After code and mandatory QA pass: edit the actual `docs/project/WBS-TravelAssist.md` 5.14 status cell to 待审查 in the implementation branch, preserving every other row. Do not use a closeout/sync side document as a replacement for updating Master.

Create `docs/tasks/RESULT-TASK-046-b-planner-preference-contract.md` with status, actual baseline/head, single-source proof, public exports, read/error/finalizer behavior, 23/43 distinction, QA counts, actual file diff, UI/DB compatibility, consumer review status, remaining work, Issue/PR/WBS links. Mark Ready for User Acceptance only consistently with actual QA; A integration review must remain explicit.

Copy the formal Task/design/launcher into the implementation PR if absent from develop. Update this design's current-stage header and the Result once at delivery; original publication baseline stays historical. Do not repeatedly re-open code work merely for old phase prose.

Push the implementation branch and create/reuse one Draft PR to develop:

```bash
gh pr create --repo kanzakimy0/TravelAssist --base develop --head codex/b-account-wbs-5-14-planner-preference-contract --draft --title "[TASK-046-B] Publish Planner-readable Preference Contract v1" --body "Refs #321. WBS 5.14 producer implementation and required QA; cross-module review and user acceptance tracked in Result. Do not auto-merge."
```

Issue #321 remains Open. Update its body/comment with Result and PR, not merely the local report. Keep Draft, do not mark Ready, merge or close the Issue. No next Task starts.

Final completion later requires user acceptance plus reviewed merge; then physically update Master 5.14 to 已完成 and re-fetch develop to confirm. No downstream WBS is automatically completed by this contract.
