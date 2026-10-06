# TASK-051-B — WBS 5.14 Integration Refresh / Conflict Resolution

> Owner: **B / Personal Center Preference Producer**\
> WBS: **5.14 Planner 可读取的 Preference Contract**\
> Original Task: **TASK-046-B**\
> Original Issue: **#321**\
> Review-Fix Issue: **#339**\
> Existing Draft PR: **#323**\
> Existing implementation branch: `codex/b-account-wbs-5-14-planner-preference-contract`\
> Publication baseline: `develop@736d0004a4807721120b1ce3f29224a944045db6`\
> Status: **Ready for integration refresh; do not redesign the contract**

---

## 1. Objective

Refresh the already-implemented WBS 5.14 Preference producer contract onto the execution-time latest `origin/develop`, resolve all merge conflicts conservatively, prove semantic compatibility with the newer Preference/Auth/Trip code already merged after TASK-046-B, and return existing Draft PR #323 to a **mergeable, exact-head-verified, review-ready** state.

This Task is **not** a second implementation of WBS 5.14. The accepted TASK-046-B design remains the source of truth unless a current merged dependency makes a small compatibility correction necessary.

Do not broaden WBS 5.14.

---

## 2. Current audited state

At publication:

- latest `develop`: `736d0004a4807721120b1ce3f29224a944045db6`;
- PR #323 head: `5b6b0596e5b92915ef6874970864fea0b1d725cf`;
- merge base: `6750a50d9fc49e561e60d25e7ebfc90c76c60a60`;
- PR branch: 5 commits ahead / 40 commits behind latest develop;
- PR #323: Open / Draft / `mergeable=false`.

The latest develop includes later B work such as Companion persistence, Trip persistence/model/API, Profile API, and changes to the Preference HTTP/auth boundary.

The integration refresh must preserve all of those later accepted changes.

---

## 3. Existing 5.14 contract that must be preserved

TASK-046-B already established these boundaries:

1. one canonical browser-safe long-term Preference contract under `src/shared/contracts/preferences/**`;
2. existing B paths remain compatibility exports rather than duplicate implementations;
3. 23-key long-term Preference semantics remain distinct from A planning `EffectivePreferenceV1` / 43-dimension scoring input;
4. missing vs explicit false/neutral semantics remain intact;
5. public reads remain request-scoped, authenticated and non-cacheable;
6. authentication/network/validation failures never silently become empty/default Preference;
7. no live Planner integration in WBS 5.14;
8. no Preference preset/default implementation in WBS 5.14;
9. no DB schema/RLS/migration change is required by this contract extraction;
10. no cross-user cache, owner injection, service-role bypass, AI mapping or scoring mapping.

Do not reinterpret these rules during conflict resolution.

---

## 4. Required merge strategy

Work on the existing PR branch:

```text
codex/b-account-wbs-5-14-planner-preference-contract
```

After fetching latest remote state, merge the execution-time latest `origin/develop` **into** that branch with a normal merge commit.

Do **not** rebase the published branch because that would require rewriting the remote PR history.

Forbidden:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

If local uncommitted user work exists, do not destroy it. Stop safely and report the concrete blocker.

---

## 5. Conflict-resolution rules

### 5.1 `package.json`

This is a known overlapping file.

Resolution rule:

- start from the **latest develop** script set;
- preserve every script added by later accepted tasks, including Companion, Trip persistence, Trip Library, Profile and any task merged after publication;
- add/retain the TASK-046 scripts:

```json
"test:preference-contract": "node --import ./tests/register-route-ts.mjs --test tests/task-046-preference-contract.test.mjs",
"test:preference-contract:local": "node --import ./tests/register-route-ts.mjs --test tests/task-046-preference-contract.runtime.mjs"
```

Do not replace the current `package.json` with the older PR copy.

### 5.2 `docs/project/WBS-TravelAssist.md`

This is a known overlapping shared file.

Resolution rule:

1. read the **complete latest** file after merging latest develop;
2. preserve every unrelated A/B row exactly;
3. after all refresh QA passes, only WBS 5.14 may be moved to:

```text
待审查（#321 / TASK-046-B；Draft PR #323）
```

Do not roll back newer 5.15/5.16/5.17/5.18/5.19 or unrelated project tracking.

TASK-051-B is a review-fix Task and does not replace TASK-046-B as the canonical WBS implementation Task.

### 5.3 Any additional conflict

Do not resolve by blindly choosing `ours` or `theirs`.

For every additional conflict:

- identify which side contains the later accepted contract;
- preserve later merged behavior;
- reapply only the minimal 5.14 semantics needed;
- record the file and resolution rationale in the final Result.

---

## 6. Mandatory semantic compatibility audit

A clean textual merge is not enough.

### 6.1 Preference HTTP/Auth boundary

Latest develop now owns the accepted private HTTP/auth behavior.

Verify that the refreshed 5.14 contract does not regress:

- real Cookie authentication;
- explicit Bearer authentication;
- invalid/malformed Bearer never falls back to Cookie;
- owner identity comes from verified Auth;
- private/no-store behavior;
- current Preference GET/PATCH/reset wire contract;
- existing RLS behavior.

Do not restore the pre-refactor TASK-046 HTTP implementation if later develop contains a newer accepted implementation.

### 6.2 Compatibility exports

Verify these compatibility paths continue to work for all existing B consumers:

```text
src/features/preferences/domain/preference-v1.ts
src/features/preferences/persistence/preference-resource.ts
```

They should point at the one shared canonical implementation rather than duplicate it.

### 6.3 Browser-safe shared contract

`src/shared/contracts/preferences/**` must remain safe for A/browser consumers.

It must not import:

- `server-only` modules;
- DB/Drizzle code;
- Supabase server auth implementation;
- B UI feature code;
- private repository/service modules.

### 6.4 Request-scoped public read

Revalidate `readCurrentLongTermPreferenceForRequest` against the **current** `src/server/preferences/http.ts` behavior.

The composition must:

- preserve auth refresh cookies when present;
- remain request scoped;
- preserve private/no-store and `Vary: Authorization, Cookie` behavior;
- not clone or consume unrelated business request bodies;
- never convert auth/network/validation failures to empty Preference.

### 6.5 Downstream compatibility

Later merged code consumes Preference semantics, especially Trip Library snapshot capture.

The compatibility extraction must not break:

- WBS 5.16 Preference API;
- WBS 5.17 Companion code that imports Preference types/semantics if any;
- WBS 5.18/5.19 Trip Preference snapshot/patch behavior;
- Profile API or unrelated B APIs through package/build/import regressions.

No downstream semantic redesign is allowed in this Task.

---

## 7. Required tests and Quality Gates

First record a clean **latest-develop baseline**. Then run the post-merge candidate.

### 7.1 Baseline

At minimum:

```text
npm ci
full repository test suite
typecheck
build
```

Record exact latest `origin/develop` SHA and counts.

### 7.2 Candidate focused tests

Required:

```text
npm run test:preference-contract
npm run test:preference-contract:local
npm run test:preferences
npm run test:preferences:db
npm run test:preference-api
npm run test:preference-api:local
npm run test:trip-library-api
npm run test:trip-library-api:local
```

If current package scripts differ, use the equivalent accepted current commands and record them.

Real Local Supabase tests must actually run. Do not mark them skipped.

### 7.3 Candidate full gates

Run:

```text
full repository tests
npm run lint
npm run typecheck
npm run build
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
git diff --check
```

Also verify production/browser bundles do not contain server-only/DB/Auth-private implementation from the shared Preference contract.

If repository-wide lint or formatting has known baseline debt, prove exact baseline equivalence and separately show all TASK-046/TASK-051 changed files pass.

### 7.4 Exact final-head CI

Push the resolved branch normally.

PR #323's **exact final head** must receive a successful GitHub Quality Gate.

If any commit is added after a PASS—including Result/WBS/QA corrections—the new final head must receive its own successful gate. Never reuse a PASS from an older head.

---

## 8. QA / evidence update

Update the existing TASK-046 Result/QA evidence or add a clearly named refresh evidence file. Do not erase historical evidence.

The refresh evidence must record:

- old PR head;
- execution-time develop SHA;
- merge commit;
- every conflict resolved;
- baseline test counts;
- candidate test counts;
- focused Preference/Trip regressions;
- Local Supabase/Auth/browser results;
- exact final PR head;
- exact GitHub Quality Gate run;
- final PR mergeability;
- whether A/designated integration review is still pending.

---

## 9. Tracking state

During refresh, WBS 5.14 remains a review-stage task; do not mark it completed.

Successful TASK-051-B result must leave:

```text
WBS 5.14 = 待审查（#321 / TASK-046-B；Draft PR #323）
PR #323 = Open / Draft / mergeable
Issue #321 = Open
Issue #339 = Open
```

Only explicit user acceptance followed by merge may set WBS 5.14 to `已完成` and close the tracking issues.

---

## 10. Explicitly out of scope

Do not start or implement:

- WBS 4.18 live Planner Preference consumption;
- WBS 5.13 Preference presets/defaults;
- WBS 5.21 account/data deletion;
- WBS 8.6 B migration consolidation;
- AI prompt integration;
- Engine/scoring/POI mapping;
- UI redesign;
- new Preference DB schema/RPC/RLS;
- unrelated PR cleanup.

Do not modify or merge historical PR #221 / Issue #207 as part of this refresh.

---

## 11. Result format

Return a complete `TASK-051-B Result` containing:

1. execution baseline and final develop comparison;
2. old PR head and final PR head;
3. merge commit from latest develop;
4. exact conflict file list and resolution;
5. semantic compatibility audit;
6. test/gate table with real counts;
7. Local Supabase/Auth/browser evidence;
8. exact final-head GitHub Quality Gate URL/run ID;
9. PR #323 final Draft/Open/mergeable state;
10. WBS 5.14 / Issue #321 / Issue #339 status;
11. explicit statement that no downstream task was started.

Do not merge PR #323 automatically.
