# TASK-045-B — WBS 5.16 Preference Persistence API v1

## Metadata

- Task: `TASK-045-B`
- WBS: `5.16 — Preference 持久化 API`
- Owner: `B`
- Priority: `P0`
- Repository: `https://github.com/kanzakimy0/TravelAssist`
- Design: `docs/architecture/preference-persistence-api-v1.md`
- Spec branch: `task/b-wbs-5-16-preference-persistence-api`
- Implementation branch: `codex/b-account-wbs-5-16-preference-persistence-api`
- Base at publication: `origin/develop@6a8996330edebf5b0df8ea5fec28a41e11b27f6b`
- Dependencies: `5.11 已完成`, `8.1 已完成`
- Related legacy partial: Issue #207 / Draft PR #221 — read-only audit source, do not merge/cherry-pick
- Result: `docs/tasks/RESULT-TASK-045-b-preference-persistence-api.md`

---

## 1. Objective

Implement WBS 5.16 on top of the accepted 5.11 Preference Schema.

Deliver:

```text
GET /api/preferences
PATCH /api/preferences
POST /api/preferences/reset
```

plus:

- verified Auth;
- revision CAS;
- safe errors;
- cross-device consistency;
- Personal Center Preference UI wiring to the canonical 5.11 `PreferenceV1`.

Do not redesign the 23-key schema.

---

## 2. Start gate

Before work:

```bash
git status --short
git branch --show-current
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Read latest:

```text
docs/project/WBS-TravelAssist.md
docs/architecture/preference-schema-v1.md
docs/architecture/preference-persistence-api-v1.md
docs/tasks/TASK-045-b-preference-persistence-api.md

src/features/preferences/domain/preference-v1.ts
src/db/schema/travel-preferences.ts
supabase/migrations/20260911090000_create_travel_preferences.sql

src/lib/auth/**
src/lib/supabase/**
src/features/preferences/**
```

Audit PR #221 only as reference.

If a newer canonical 5.16 implementation has already merged, return Blocked.

Start from latest clean `origin/develop`, not PR #221.

---

## 3. Branch safety

Use:

```text
codex/b-account-wbs-5-16-preference-persistence-api
```

Do not use `feature/**`.

Forbidden:

```bash
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

Do not overwrite other WBS rows.

---

## 4. Canonical preference truth

Only use:

```text
src/features/preferences/domain/preference-v1.ts
```

Specifically:

```text
PreferenceV1
PreferencePatchV1
emptyPreference
parsePreferenceV1
parsePreferencePatchV1
applyPreferencePatch
```

Do not create a second Preference parser/registry.

Do not revive:

```text
mobility.preset
mobility.lessWalking
attractions.*
experience.photoExperience
old likes/dislikes schema
localized DB keys
```

---

## 5. Persistence table

Use the existing:

```text
public.travel_preferences
```

Do not create another Preference table.

Do not edit the accepted 5.11 migration unless a real defect is found that makes 5.16 impossible; if so, stop and report rather than silently rewriting history.

---

## 6. GET `/api/preferences`

Authenticated only.

Missing row returns:

```json
{
  "ok": true,
  "data": {
    "preference": {
      "schemaVersion": "1.0",
      "values": {}
    },
    "revision": 0,
    "updatedAt": null
  }
}
```

GET must not create a row.

Never return owner id.

---

## 7. PATCH `/api/preferences`

Body:

```json
{
  "expectedRevision": 0,
  "patch": {
    "schemaVersion": "1.0",
    "set": {},
    "unset": []
  }
}
```

Requirements:

- expectedRevision = non-negative integer;
- patch parsed by existing 5.11 parser;
- apply via existing `applyPreferencePatch`;
- merged result parsed again;
- owner comes only from verified Auth;
- CAS on revision;
- first write from revision 0 inserts revision 1;
- concurrent first write: exactly one succeeds; loser = 409;
- existing update must `WHERE revision = expectedRevision`;
- stale/no-op revision mismatch = 409;
- no last-write-wins.

---

## 8. RESET

Endpoint:

```text
POST /api/preferences/reset
```

Body:

```json
{
  "expectedRevision": 4
}
```

Existing row:

```text
payload = emptyPreference()
revision = revision + 1
```

Missing row + expected 0:

```text
return empty resource revision 0
do not create row
```

Existing already-empty row:

```text
explicit Reset is still a write
revision + 1
```

Reset never deletes Account / Companion / Trip.

---

## 9. Map fields

These are whole-value fields:

```text
interests.preferences
interests.details
```

No deep merge.

Cross-device stale changes must produce 409.

Do not implement hidden automatic merge.

---

## 10. Auth

Reuse accepted Auth Core.

Must verify via Supabase Auth `getUser()` / `requireAuthUser()`.

Support:

- web Cookie session;
- Bearer access token for native/future mobile/integration.

Do not accept owner id from request.

Cookie mutation requests must require:

- trusted same Origin;
- JSON Content-Type;
- CSRF fail closed.

Bearer request identity must be verified, not decoded-only.

---

## 11. DB authorization

Prefer user-context Supabase client and existing RLS.

Do not introduce service-role write bypass for normal API.

If using server Postgres transaction + authenticated claims, prove it is scoped safely and equivalent to RLS.

Keep:

- RLS;
- SQL payload validator;
- revision trigger;
- immutable owner;
- DB timestamps.

---

## 12. HTTP surface

Private no-store response headers.

HTTP request cap:

```text
80 KiB
```

Domain cap remains:

```text
64 KiB
```

Do not expose secrets / raw SQL / stack traces.

Error codes:

```text
AUTH_REQUIRED              401
AUTH_UNAVAILABLE           503
FORBIDDEN                  403
INVALID_REQUEST            400
INVALID_PREFERENCE         400
PAYLOAD_TOO_LARGE          413
STALE_PREFERENCE_REVISION  409
PREFERENCE_UNAVAILABLE     503
```

Use a stable `{ok:false,error:{code}}` shape.

---

## 13. Personal Center UI wiring

Wire the existing long-term Preference UI to the API.

The server canonical source is `PreferenceV1`; current page ViewModels remain presentation-only.

Required behavior:

- load resource after auth;
- missing = unset, not Mock defaults;
- saved/draft separation;
- Save → canonical patch;
- Cancel → latest saved resource;
- Reset → real API reset;
- success updates revision;
- network error keeps draft;
- 409 shows conflict and does not overwrite;
- dirty navigation guard remains;
- reload reads saved data.

Do not connect Start Flow / Trip Draft in this Task.

---

## 14. Adapter audit

Create a documented adapter audit for all current Preference pages.

Important corrections:

```text
mobility.preset       -> not persisted; 5.13 owns preset definition
mobility.lessWalking  -> mobility.walkingTolerance
attractions radar     -> derived from interests; not stored
experience photo      -> photography Interest
Chinese labels        -> stable InterestCode / DetailCode
```

Current Mock defaults must never silently become user facts.

If existing preset buttons alter a draft, only resulting canonical field values may eventually be saved after explicit user Save; preset identity must not persist and 5.16 must not freeze new preset definitions.

---

## 15. UI conflict UX

On 409:

- keep local draft;
- show clear “updated elsewhere” state;
- offer reload server version;
- no automatic overwrite;
- no silent map merge.

---

## 16. PR #221 audit

Audit these useful patterns:

```text
src/server/preferences/http.ts
src/server/preferences/repository.ts
src/server/preferences/service.ts
```

Possible reuse by reimplementation:

- verified Cookie/Bearer;
- no-store;
- bounded JSON;
- 409;
- repository/service separation;
- two-user DB/API QA.

Do not merge/cherry-pick PR #221.

Do not use its old Preference contract.

Do not bring into 5.16:

- trip_drafts;
- trip_preference_snapshots;
- trip_preference_overrides;
- StartFlow autosave;
- operation-multiplexed `/api/travel-persistence`.

Issue #207 / PR #221 stay unchanged.

---

## 17. Suggested files

Suggested:

```text
src/app/api/preferences/route.ts
src/app/api/preferences/reset/route.ts
src/server/preferences/resource.ts
src/server/preferences/repository.ts
src/server/preferences/http.ts
src/features/preferences/persistence/preference-client.ts
src/features/preferences/persistence/preference-adapter.ts
src/features/preferences/persistence/use-preference-resource.ts
```

Adjust to repository convention when justified.

Do not publish the 5.14 Planner public contract.

---

## 18. Real Local acceptance

Mandatory.

Use at least two real temporary Auth users.

Required API/DB cases:

- unauthenticated GET/PATCH/reset;
- Cookie GET/PATCH/reset;
- Bearer GET/PATCH/reset;
- missing GET revision 0;
- first write revision 1;
- sequential updates;
- stale update 409;
- concurrent first insert exactly one success;
- cross-user isolation;
- malformed input;
- >80 KiB request;
- invalid 5.11 key/value;
- map whole replacement;
- reset;
- stale reset;
- reset missing row;
- RLS regression;
- DB revision trigger regression;
- auth delete cascade regression;
- temporary fixture cleanup.

Do not fake real DB evidence.

---

## 19. Browser/UI acceptance

Use actual authenticated Local flow where repository tooling supports it.

Must prove at least:

1. user edits a long-term Preference page;
2. Save persists;
3. reload restores server value;
4. second session reads same value;
5. stale first session gets visible conflict;
6. Reset clears explicit Preference;
7. Guest/empty account does not write Mock defaults;
8. Cancel/dirty guard remain correct.

If full browser Auth fixture cannot run, Result must say Partial unless equivalent repository-approved integration coverage proves UI wiring.

---

## 20. Regression

Run:

```text
npm ci
5.11 preference pure tests
5.11 preference real DB tests
5.16 API tests
Preference UI tests
Profile DB regression
Companion DB regression
full repository tests
lint
typecheck
build
deploy local validation/build/artifact
changed-file Prettier
git diff --check
db:start/status/reset/types/stop
```

Separate existing baseline debt from Task regression.

---

## 21. Scope protection

Do not start or complete:

```text
5.13
5.14
5.17
5.18
8.6
4.18
6.x
7.9
```

Do not modify A Trip Contract / Planner / Engine / AI / POI.

---

## 22. Tracking

At execution start:

```text
5.16 = 进行中
```

After implementation + mandatory QA, before user acceptance:

```text
5.16 = 待审查
Issue remains OPEN
Draft PR
```

Only after user acceptance + merge:

```text
5.16 = 已完成
Issue Completed
```

Do not update unrelated WBS rows.

---

## 23. Result

Create:

```text
docs/tasks/RESULT-TASK-045-b-preference-persistence-api.md
```

Report:

- baseline/head;
- API routes;
- auth paths;
- repository/CAS behavior;
- UI adapter mapping;
- PR #221 audit;
- real DB/Auth/API counts;
- browser/cross-device evidence;
- regressions;
- changed files;
- WBS/Issue/PR;
- deferred scope;
- Ready for User Acceptance: Yes/No.

---

## 24. Final PR

Push:

```text
codex/b-account-wbs-5-16-preference-persistence-api
```

Create Draft PR to `develop`.

Title:

```text
[TASK-045-B] Implement Preference Persistence API v1
```

Do not merge, mark Ready, close Issue, or start 5.14 automatically.
