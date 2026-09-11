# TASK-042-B — WBS 5.11 Preference Schema v1

## Metadata

- Task ID: `TASK-042-B`
- WBS: `5.11`
- Owner: `B / Personal Center / Preference Data`
- Priority: `P0`
- GitHub Issue: `#307`
- Spec branch: `task/b-wbs-5-11-preference-schema`
- Implementation branch: `codex/b-account-wbs-5-11-preference-schema`
- Authoring baseline: `origin/develop@fede48bb2a4916bcc6070be325ec5b450fa6fbd1`
- Design source: `docs/architecture/preference-schema-v1.md`
- Related partial work: `TASK-017-B / Issue #207 / Draft PR #221`
- Publication state: `Ready / implementation not started`

> `codex/**` is intentional. Current repository workflow on `feature/**` creates a non-draft PR and immediately attempts merge. TASK-042-B is review-gated and must use a branch that can be published as Draft safely.

---

## 1. Objective

Implement the first canonical **long-term user Preference Schema v1** for TravelAssist.

The schema represents only durable user preference facts: what the user explicitly likes, dislikes, prioritizes, avoids, or can tolerate across trips. It must not become a dump of Personal Center UI state, Start Flow state, Planner state, trip facts, POI attributes, Engine results, Provider payloads, Radar coordinates, or display summaries.

The authoritative product design is `docs/architecture/preference-schema-v1.md` on this spec branch. Its v0.2 field/UI freeze supersedes the older 30-key candidate in Draft PR #221.

TASK-042-B delivers the internal B-owned Preference domain + DB schema required by later 5.13/5.16/5.14. It does **not** publish the A-facing Planner Preference Contract; that remains WBS 5.14.

---

## 2. Authority order

If sources disagree, use this order:

1. this Task;
2. `docs/architecture/preference-schema-v1.md`;
3. latest accepted `develop` DB/Auth/ownership conventions;
4. frozen product/UI docs;
5. Draft PR #221 only as an implementation reference.

Do not preserve an old candidate field merely because code already exists on #221.

---

## 3. Start gate

Before modifying code:

```bash
git status --short
git branch --show-current
git remote -v
git fetch --all --prune
git rev-parse origin/develop
git log --oneline -15 origin/develop
```

Confirm from latest `origin/develop`:

- WBS 1.25 completed;
- WBS 8.1 completed and DB foundation exists;
- TASK-016-B / User Profile Schema remains present;
- TASK-018-B / Authentication Core remains present;
- Issue #307 is Open;
- PR #221 live state is checked again.

If GitHub CLI is available:

```bash
gh issue view 307 --repo kanzakimy0/TravelAssist
gh pr view 221 --repo kanzakimy0/TravelAssist --json number,state,isDraft,headRefName,headRefOid,baseRefName,url
```

At publication #221 is expected to be Open / Draft / Partial, head `929529be302b60c84ace3a580461de95e04de461`.

### PR #221 gate

If #221 is still unmerged, continue from latest clean `origin/develop`, inspect it file-by-file, and selectively reproduce/rework only patterns that remain valid.

If #221 has been merged before execution and the old 30-key Preference semantics entered `develop`, return:

```text
Status: Blocked
Reason: TASK-042 assumptions changed because the old candidate Preference schema entered develop.
```

Do not silently write a destructive conversion migration. If #221 has merged but already matches this Task's 23-key semantics, document that fact and reduce work to the remaining audit/closeout needed for 5.11.

---

## 4. Worktree and branch safety

Do not switch branches inside another active A/B worktree with uncommitted work.

Preferred:

```bash
git worktree add ../TravelAssist-TASK-042-B -b codex/b-account-wbs-5-11-preference-schema origin/develop
cd ../TravelAssist-TASK-042-B
```

Forbidden:

```text
git reset --hard
git clean -fd
git push --force
git push --force-with-lease
```

Do not develop on `main` or `develop`. Do not rename the implementation branch to `feature/**`.

---

## 5. Mandatory reading

Read before implementation:

```bash
git show origin/task/b-wbs-5-11-preference-schema:docs/tasks/TASK-042-b-preference-schema-v1.md
git show origin/task/b-wbs-5-11-preference-schema:docs/architecture/preference-schema-v1.md
git show origin/develop:docs/project/WBS-TravelAssist.md
git show origin/develop:docs/architecture/db-orm-migration-standards.md
git show origin/develop:docs/architecture/cross-module-contract-handoff.md
git show origin/develop:docs/preferences/preference-system.md
git show origin/develop:docs/ui/preference-center.md
```

Also inspect:

```text
src/features/preferences/**
src/features/start-flow/model/start-flow-draft.ts
src/features/start-flow/components/interest-detail-modal.tsx
src/db/**
src/types/database.generated.ts
supabase/migrations/**
```

Inspect #221 without merging it:

```bash
git show origin/feature/b-step-preference-trip-draft-persistence:src/shared/contracts/preferences/index.ts
git show origin/feature/b-step-preference-trip-draft-persistence:src/db/schema/travel-preferences.ts
git show origin/feature/b-step-preference-trip-draft-persistence:supabase/migrations/20260908130000_create_trip_preference_drafts.sql
git show origin/feature/b-step-preference-trip-draft-persistence:docs/architecture/step-preference-persistence.md
```

---

## 6. WBS tracking

Only when Codex actually begins implementation on the TASK-042 branch:

```text
5.11 = 进行中
```

Implementation + required real Local DB QA complete, PR unmerged:

```text
5.11 = 待审查
```

Only user acceptance + merge into `develop` may set:

```text
5.11 = 已完成
```

Preserve all other A/B WBS rows and history. Do not start 5.13, 5.14, 5.16, 5.18 or 8.6.

---

## 7. Canonical Preference envelope

Freeze:

```ts
type PreferenceV1 = {
  schemaVersion: "1.0";
  values: PreferenceValuesV1;
};
```

Canonical empty Preference:

```json
{"schemaVersion":"1.0","values":{}}
```

Semantics:

```text
missing key = no explicit long-term preference
missing != false
missing != neutral
missing != UI default
```

Payload is sparse. Do not persist a fake `unset` enum.

---

## 8. Canonical 23-key registry

Implement exactly these 23 dotted keys.

### Mobility — 5

```text
mobility.fewerTransfers
  boolean
  soft

mobility.walkingTolerance
  veryLow | low | standard | high | veryHigh
  soft_constraint_input

mobility.noPublicTransit
  boolean
  hard_when_true

mobility.noBus
  boolean
  hard_when_true

mobility.noFerry
  boolean
  hard_when_true
```

`mobility.preset` and `mobility.lessWalking` are forbidden old candidate keys. `noPublicTransit=true` semantically subsumes bus even if `noBus=false`; this combination must remain storable.

### Dining — 3

```text
dining.localCuisine
  deprioritize | neutral | prioritize

dining.smallShops
  deprioritize | neutral | prioritize

dining.queueTolerance
  low | medium | high
```

Do not keep UI-only `priority/notSpecial` as storage values.

### Accommodation — 3

```text
accommodation.transportConvenience
  deprioritize | neutral | prioritize

accommodation.comfort
  deprioritize | neutral | prioritize

accommodation.fewerHotelChanges
  deprioritize | neutral | prioritize
```

Do not keep UI-only `value/notSpecial` as storage values.

### Budget — 3

```text
budget.spendingTendency
  economical | moderate | flexible

budget.prioritizeAccommodation
  boolean

budget.prioritizeExperience
  boolean
```

Never store concrete per-trip amount/currency here.

### Interests — 2

```text
interests.preferences
  Partial<Record<InterestCode, "like" | "dislike">>

interests.details
  Partial<Record<InterestCode, InterestDetailCode[]>>
```

No `neutral` interest is stored; missing parent means no explicit signal.

### Travel Style — 7

All are integer `1..5`:

```text
style.pace
style.depth
style.discovery
style.movement
style.coverage
style.priority
style.planning
```

Reject 0, 6+, floats, numeric strings and non-numbers.

---

## 9. Field metadata registry

Create one canonical pure-TypeScript metadata registry for all 23 keys. It must not depend on React/browser APIs.

It must expose stable metadata equivalent to:

```ts
type PreferenceStrength = "soft" | "soft_constraint_input" | "hard_when_true";
type PreferenceUiTier = 2 | 3;
```

Only these three fields may be `hard_when_true`:

```text
mobility.noPublicTransit
mobility.noBus
mobility.noFerry
```

Do not persist hard/soft flags per user in JSON.

---

## 10. Stable InterestCode master

Canonical codes:

```text
nature_scenery
history_culture
food
photography
onsen_wellness
art_museums
anime_entertainment
shopping
urban_exploration
outdoor_activity
night_experience
family_activity
traditional_experience
theme_parks
rural_towns
seasonal_events
```

Chinese/Japanese/English labels are presentation only. Localized labels such as `自然风景`, `历史文化`, `美食`, `摄影` must not be canonical stored IDs.

---

## 11. Interest detail registry

Freeze parent/child codes exactly as the design:

```text
nature_scenery:
  mountain, coast, lake, forest, flower_field
history_culture:
  shrine_temple, castle, museum, historic_district
food:
  sushi, ramen, regional_cuisine, dessert, sake
photography:
  street_photography, landscape, nightscape, architecture, people_culture
onsen_wellness:
  ryokan_onsen, open_air_bath, forest_wellness, sea_view_onsen
art_museums:
  contemporary_art, traditional_crafts, architecture, design_exhibition
anime_entertainment:
  anime_pilgrimage, gaming, themed_cafe, merchandise
shopping:
  department_store, vintage, drugstore, local_specialties
urban_exploration:
  distinctive_neighborhood, architecture_walk, cafe, city_nightscape
outdoor_activity:
  hiking, cycling, skiing, water_activity
night_experience:
  izakaya, nightscape, performance, night_walk
family_activity:
  zoo, science_museum, family_crafts, park
traditional_experience:
  tea_ceremony, kimono, crafts, traditional_performance
theme_parks:
  major_theme_park, character_park, aquarium, immersive_exhibition
rural_towns:
  historic_town, fishing_village, countryside, local_market
seasonal_events:
  cherry_blossom, autumn_leaves, snow_scenery, festival, fireworks
```

Validation rules:

- unknown parent rejected;
- child must belong to parent;
- duplicate child rejected;
- parent `dislike` + non-empty positive details rejected;
- missing parent + details allowed;
- parent `like` + details allowed;
- v1 has no detail-level dislike.

---

## 12. Runtime parser and patch semantics

Create strict runtime parsing/validation for `PreferenceV1` and patches. Reject unknown keys and wrong schema versions fail-closed.

Patch must support deterministic:

```text
set
unset
```

Rules:

- `unset` removes the dotted key from the sparse values object;
- same key cannot appear in both set/unset;
- duplicate unset entries rejected;
- whole-map fields such as `interests.preferences` and `interests.details` are replaced as one canonical field when set, not deep-merged invisibly;
- every patch result is fully reparsed before acceptance;
- do not introduce alternate UI/domain registries that can drift.

Old candidate keys must be rejected, including:

```text
mobility.preset
mobility.lessWalking
attractions.nature
attractions.history
attractions.culture
attractions.art
attractions.photography
attractions.activityExperience
experience.photoExperience
interests.likes
interests.dislikes
```

---

## 13. Database model

Create only the WBS 5.11 long-term Preference root:

```text
public.travel_preferences
├─ owner_user_id uuid PK -> auth.users.id ON DELETE CASCADE
├─ payload jsonb NOT NULL
├─ revision integer NOT NULL > 0
├─ created_at timestamptz NOT NULL
└─ updated_at timestamptz NOT NULL
```

A user has at most one row. The default payload may be the canonical empty Preference envelope if consistent with current migration conventions.

Do **not** create in this Task:

```text
trip_drafts
trip_preference_snapshots
trip_preference_overrides
saved/history itinerary tables
```

Those remain later WBS boundaries.

SQL under `supabase/migrations/**` is the only formal schema history. Drizzle mirrors SQL; do not create a second migration history or use `drizzle-kit push` as production history.

---

## 14. DB payload validation

The database must reject malformed/unknown Preference payloads, not merely rely on TypeScript.

The SQL validator/check must enforce at least:

- exact `schemaVersion = "1.0"`;
- `values` object;
- no unexpected envelope properties;
- max payload size consistent with current candidate (64 KiB unless current accepted DB standards require stricter);
- only 23 allowed dotted keys;
- correct booleans/enums/ranges;
- walking five-level enum;
- 7 style fields integer 1..5;
- valid InterestCode map keys;
- valid detail parent/child codes;
- no duplicate detail children;
- no `dislike` parent with non-empty positive details.

Do not accept old 30-key semantics for compatibility convenience. #221 is unmerged candidate data, not production data.

---

## 15. Revision / concurrency semantics

Reuse the valid #221 concept of a positive integer revision for optimistic concurrency readiness, but keep scope to schema correctness. Do not finish the WBS 5.16 HTTP API here.

Requirements:

- revision starts positive;
- owner identity is immutable;
- updates cannot silently change owner;
- timestamps follow existing DB conventions;
- exact server/API compare-and-swap interface remains 5.16 unless current DB convention requires minimal trigger enforcement.

Do not invent a second concurrency mechanism.

---

## 16. RLS / ownership

`travel_preferences` is private user data.

Required:

- RLS enabled;
- authenticated user can select/insert/update only own row;
- cross-user access denied;
- anon CRUD denied;
- ownership comes from trusted Auth identity, never client-supplied owner proof;
- account deletion cascades the preference root through the auth FK;
- no broad `using (true)` or equivalent bypass policy.

Follow current accepted Supabase/Drizzle conventions from develop.

---

## 17. Drizzle and generated types

Add/update the Drizzle mirror under current `src/db/schema/**` conventions. SQL remains authoritative.

Regenerate `src/types/database.generated.ts` from real Local Supabase after applying the migration. Do not hand-edit generated output.

Do not copy #221 generated types verbatim if they were generated from a different schema state.

---

## 18. UI / Preset boundary

Existing UI models may continue to use UI-specific enums/labels temporarily. Add explicit adapters only where needed to keep 5.11 build/testable; do not redesign Personal Center or Start Flow.

Important:

```text
relaxed / balanced / efficient preset
!= persisted fact
```

Preset expansion belongs WBS 5.13. 5.11 stores only canonical expanded preference facts.

Radar axes and natural-language travel profile summaries are derived presentation and are not persisted.

---

## 19. Trip / Planner / Engine boundary

Do not store dates, destination, party/companions, anchors, exact trip budgets or current-trip temporary changes in long-term Preference.

Do not copy POI 43-feature fields into Preference. Preference expresses the user's tolerance/interest; POI/route/profile/rule facts describe the world/trip; Engine combines them later.

Example boundary:

```text
Preference: mobility.walkingTolerance = low
POI: walking/steps/slope/duration facts
Route: movement facts
Trip: party/current conditions
Engine: reasonableness/fatigue assessment
```

TASK-042 implements only the Preference side.

---

## 20. PR #221 audit requirements

Result must classify #221 elements as `REUSE / REWORK / DEFER / SUPERSEDED`.

Minimum expected treatment:

| #221 concept | TASK-042 treatment |
|---|---|
| one user / one travel_preferences row | REUSE |
| versioned JSONB envelope | REUSE |
| 64 KiB bound | REUSE unless stricter current standard |
| owner-only RLS | REUSE |
| revision column | REUSE |
| sparse patch concept | REUSE / REWORK |
| mobility.preset | SUPERSEDED |
| mobility.lessWalking | SUPERSEDED |
| six attractions.* fields | SUPERSEDED |
| experience.photoExperience | SUPERSEDED |
| Chinese interest labels as IDs | SUPERSEDED |
| interests.likes/dislikes | SUPERSEDED |
| missing style.planning | REWORK |
| trip draft/snapshot/override tables | DEFER to 5.18/related |
| persistence HTTP endpoint | DEFER to 5.16 |
| autosave/UI wiring | DEFER to 5.16/UI integration |

Do not close or merge #221 automatically.

---

## 21. Pure domain tests

Add deterministic tests covering at least:

- empty envelope valid;
- wrong version rejected;
- unexpected envelope properties rejected;
- non-object values rejected;
- payload size bound;
- exactly 23 canonical keys;
- exactly 3 hard_when_true metadata entries;
- no forbidden old key;
- every metadata key has parser coverage;
- all five walking levels valid and invalid values rejected;
- three hard booleans valid;
- parent/sub transport hard combination not falsely rejected;
- every dining/accommodation/budget enum valid;
- old UI-only enum names rejected;
- explicit false preserved;
- neutral preserved;
- all 16 InterestCodes accepted;
- unknown interest rejected;
- like/dislike accepted, neutral rejected;
- every detail family positive case;
- unknown/foreign/duplicate detail rejected;
- dislike + positive details rejected;
- missing parent + details allowed;
- all 7 style fields accept integers 1..5 only;
- style.planning present;
- patch set/unset, duplicate unset, set+unset ambiguity, whole-map replacement and reparse semantics.

---

## 22. Real Local Supabase / Auth tests

With real Local Supabase and at least two temporary real Auth users, verify:

- migration from empty Local DB succeeds;
- table exists;
- user A insert/read/update own succeeds;
- user B cannot read/update A;
- anon cannot CRUD;
- auth-user deletion cascades;
- malformed JSON rejected at DB layer;
- old keys rejected at DB layer;
- invalid interest parent/child and duplicate details rejected;
- dislike + details rejected;
- invalid style/walking values rejected;
- revision constraint/enforcement works;
- empty envelope valid;
- reset to empty envelope valid.

Clean temporary fixtures.

Real acceptance requires repository-equivalent commands for:

```text
db:start
db:status
db:reset
db:types
Preference DB/RLS tests
db:stop
```

If Docker/Supabase Local is unavailable, do not fake success. Result must be `Partial / DB runtime verification blocked`, and 5.11 must not be advanced to `待审查` if required real DB acceptance is missing.

---

## 23. Repository validation

Inspect current scripts and run all applicable repository quality gates, including equivalents of:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
git diff --check
```

Run Preference-specific pure and DB/RLS tests. Existing baseline failures must be reproduced/separated honestly when practical; do not weaken unrelated tests or modify unrelated assets/Planner work just to make global checks green.

Security check:

- no `.env.local` or real secret committed;
- no service-role secret in browser code;
- no client owner ID treated as authorization proof;
- parser rejects unknown/non-plain structures as applicable;
- DB functions/policies follow current search_path/privilege conventions;
- no production/staging migration executed.

---

## 24. Explicitly out of scope

Do not implement or claim completion of:

- 5.13 Preference Preset/default expansion;
- 5.14 Planner-readable Preference public contract;
- 5.16 Preference persistence HTTP/UI wiring beyond minimum internal work required to prove schema correctness;
- 5.18 Trip save/history/draft completion;
- StartFlowShell/Personal Center persistence UI integration;
- Companion schema/persistence;
- Planner/Recommendation/AI/Engine behavior;
- POI 43-feature schema/scoring calibration/fatigue formulas;
- live route/weather/booking providers;
- production/staging DB or secrets.

---

## 25. Result / Issue / PR closeout

If implementation and required real DB QA pass:

1. update only WBS 5.11 to `待审查`;
2. leave 5.13 / 5.14 / 5.16 / 5.18 not started;
3. create `docs/tasks/RESULT-TASK-042-b-preference-schema-v1.md`;
4. update Issue #307 with exact Result summary and commit;
5. push `codex/b-account-wbs-5-11-preference-schema`;
6. create a **Draft** PR to `develop`;
7. stop.

Create the PR explicitly as Draft:

```bash
gh pr create \
  --repo kanzakimy0/TravelAssist \
  --base develop \
  --head codex/b-account-wbs-5-11-preference-schema \
  --draft \
  --title "[TASK-042-B] Implement Preference Schema v1" \
  --body "Refs #307. WBS 5.11 implementation and QA complete; awaiting user acceptance. Do not auto-merge."
```

Do not mark 5.11 `已完成`. Only user acceptance + merge to `develop` can do that.

When editing Master WBS, preserve all concurrent A/B history; never resolve a WBS conflict by taking the whole file from one side.

---

## 26. Definition of Done

TASK-042-B is ready for user review only when all are true:

- [ ] started from latest safe origin/develop;
- [ ] #221 audited without whole-branch merge/cherry-pick;
- [ ] canonical v1.0 sparse envelope exists;
- [ ] exactly 23 canonical keys;
- [ ] only 3 hard_when_true transport exclusions;
- [ ] five-level walkingTolerance;
- [ ] style.planning;
- [ ] 16 stable InterestCodes + stable detail registry;
- [ ] old 30-key candidate fields rejected;
- [ ] localized labels are not canonical IDs;
- [ ] missing/false/neutral semantics tested;
- [ ] deterministic patch set/unset semantics;
- [ ] one-user-one-row travel_preferences SQL migration;
- [ ] DB validator matches runtime semantics;
- [ ] owner-only RLS tested with two users;
- [ ] anon denial tested;
- [ ] Drizzle mirror complete;
- [ ] generated Supabase types regenerated from real Local DB;
- [ ] real Local reset/types/RLS tests pass;
- [ ] no trip draft/snapshot/override table added by this Task;
- [ ] no 5.13/5.14/5.16/5.18 completion claim;
- [ ] no Planner/AI/Engine/POI schema change;
- [ ] lint/typecheck/tests/build/diff checks honestly recorded;
- [ ] Result created;
- [ ] WBS 5.11 = 待审查, not 已完成;
- [ ] Issue #307 remains open;
- [ ] Draft PR created and remains Draft;
- [ ] #221 untouched unless separately authorized;
- [ ] no auto-merge;
- [ ] no downstream Task started.

---

## 27. Required Result structure

Create `docs/tasks/RESULT-TASK-042-b-preference-schema-v1.md` with sections:

```text
Status
Baseline
Dependency / PR #221 Gate
Canonical Schema
Old Candidate Supersession
Database
RLS
Runtime / Patch Validation
PR #221 Audit (REUSE/REWORK/DEFER/SUPERSEDED)
Real Local Supabase
Repository Validation
Scope Protection
Tracking
Remaining Work
Ready for User Acceptance
```

Record exact commits, migration path, test counts, DB commands, baseline failures and Draft PR URL. Never convert missing evidence into PASS.

---

## 28. Stop rule

After returning TASK-042-B Result, STOP.

Do not start 5.13, 5.14, 5.16, 5.18, 8.6, A 4.18, AI 6.x or Recommendation 7.9 unless the user explicitly starts a new Task.
