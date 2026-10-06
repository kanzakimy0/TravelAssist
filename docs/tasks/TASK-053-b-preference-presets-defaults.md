# TASK-053-B — WBS 5.13 Preference Presets / Defaults v1

## Status

Authorized / Ready for Codex implementation.

## Tracking

- WBS: `5.13 Preference Preset / 默认值`
- Owner: B / Personal Center
- Priority: P1
- Issue: #345
- Publication baseline: `develop@4da2b8883069cd415eee6e18129c874383286653`
- Spec branch: `task/b-wbs-5-13-preference-presets-defaults`
- Implementation branch: `codex/b-account-wbs-5-13-preference-presets-defaults`
- Hard dependency: WBS 5.11 — completed
- Related accepted contracts: WBS 5.14, 5.16
- Architecture: `docs/architecture/preference-presets-defaults-v1.md`

## 1. Objective

Implement a canonical, explicit Preference preset/default layer on top of the accepted sparse 23-key Preference model.

The task must make it impossible for UI convenience defaults to be mistaken for saved long-term user facts.

## 2. Frozen semantics

### 2.1 Implicit default

The only implicit long-term default is:

```ts
{ schemaVersion: "1.0", values: {} }
```

Missing remains unset.

Do not auto-write preset values on:

- account creation;
- first GET;
- route load;
- page mount;
- reset;
- Planner/Trip creation.

### 2.2 Preset application

A system preset is an explicit UI action backed by a canonical `PreferencePatchV1`.

Applying a preset:

1. changes the local canonical draft;
2. marks it dirty;
3. performs no network mutation;
4. preserves fields outside the preset patch;
5. requires the existing Save action to persist through WBS 5.16.

Preset IDs/labels/descriptions are never persisted.

### 2.3 Reset

Existing global reset remains canonical empty/unset.

Per-page clear removes that category's keys only.

Neither operation applies a preset.

## 3. Initial v1 preset catalog

Implement the following product presets exactly as canonical patches. These IDs are UI metadata only.

### Mobility

#### `mobility_easy`
Label: `轻松移动`

```json
{
  "schemaVersion": "1.0",
  "set": {
    "mobility.fewerTransfers": true,
    "mobility.walkingTolerance": "low"
  },
  "unset": [
    "mobility.noPublicTransit",
    "mobility.noBus",
    "mobility.noFerry"
  ]
}
```

#### `mobility_standard`
Label: `标准移动`

```json
{
  "schemaVersion": "1.0",
  "set": {
    "mobility.walkingTolerance": "standard"
  },
  "unset": [
    "mobility.fewerTransfers",
    "mobility.noPublicTransit",
    "mobility.noBus",
    "mobility.noFerry"
  ]
}
```

### Dining

#### `dining_local`
Label: `当地饮食优先`

```json
{
  "schemaVersion": "1.0",
  "set": {
    "dining.localCuisine": "prioritize",
    "dining.smallShops": "prioritize",
    "dining.queueTolerance": "medium"
  },
  "unset": []
}
```

#### `dining_flexible`
Label: `灵活用餐`

```json
{
  "schemaVersion": "1.0",
  "set": {
    "dining.localCuisine": "neutral",
    "dining.smallShops": "neutral",
    "dining.queueTolerance": "high"
  },
  "unset": []
}
```

### Accommodation

#### `accommodation_comfort`
Label: `舒适省心`

```json
{
  "schemaVersion": "1.0",
  "set": {
    "accommodation.transportConvenience": "prioritize",
    "accommodation.comfort": "prioritize",
    "accommodation.fewerHotelChanges": "prioritize"
  },
  "unset": []
}
```

#### `accommodation_neutral`
Label: `保持中性`

```json
{
  "schemaVersion": "1.0",
  "set": {
    "accommodation.transportConvenience": "neutral",
    "accommodation.comfort": "neutral",
    "accommodation.fewerHotelChanges": "neutral"
  },
  "unset": []
}
```

### Budget

#### `budget_economical`
Label: `节省预算`

```json
{
  "schemaVersion": "1.0",
  "set": {
    "budget.spendingTendency": "economical"
  },
  "unset": [
    "budget.prioritizeAccommodation",
    "budget.prioritizeExperience"
  ]
}
```

#### `budget_moderate`
Label: `中等预算`

```json
{
  "schemaVersion": "1.0",
  "set": {
    "budget.spendingTendency": "moderate"
  },
  "unset": [
    "budget.prioritizeAccommodation",
    "budget.prioritizeExperience"
  ]
}
```

#### `budget_flexible`
Label: `预算灵活`

```json
{
  "schemaVersion": "1.0",
  "set": {
    "budget.spendingTendency": "flexible"
  },
  "unset": [
    "budget.prioritizeAccommodation",
    "budget.prioritizeExperience"
  ]
}
```

### Explicit non-catalog categories

Do **not** create v1 presets for:

- attractions/interests;
- interest details;
- style.pace/depth/discovery/movement/coverage/priority/planning.

Those require later product/scoring decisions.

## 4. Implementation architecture

### 4.1 Registry

Add a single B-owned browser-safe preset registry/helper, preferably under:

```text
src/features/preferences/presets/
```

Suggested shape:

```ts
PreferencePresetV1
preferencePresets
presetsForCategory(category)
applyPreferencePreset(current, presetId)
matchPreferencePreset(current, category)
```

Do not duplicate `preferenceFields`, parsers or enums.

Import canonical types/parsers from the accepted Preference contract.

### 4.2 Validation

At module/test boundary prove every preset:

- parses with `parsePreferencePatchV1`;
- applies with `applyPreferencePatch`;
- produces a `parsePreferenceV1`-valid result;
- contains only keys belonging to its declared category;
- has no duplicate set/unset membership;
- does not mutate its registry object.

### 4.3 Preset match

Preset selection state is derived only when the draft's relevant preset scope exactly equals that preset outcome.

No fuzzy matching.

If no exact match, UI displays `自定义` or no active preset.

### 4.4 Existing canonical editor

Integrate the preset selector into the existing canonical editor only for:

- mobility;
- dining;
- accommodation;
- budget.

Do not restore the old mock editors as persistence sources.

The preset UI must state that it is a quick template and does not save until `保存偏好`.

### 4.5 Legacy defaults

Audit:

- `mobility-preference-model.ts`;
- `attraction-activity-preference-model.ts`;
- `dining-accommodation-budget-preference-model.ts`;
- any other local default/preset source.

Do not silently map ambiguous old mock values into canonical persisted fields.

If legacy files are still used for historical/demo surfaces, preserve compatibility but make canonical persistence depend only on the accepted canonical editor/resource.

## 5. Persistence / API boundary

Reuse WBS 5.16 exactly.

No new API endpoint.
No new DB migration.
No new table/column.
No new RLS policy.
No new revision/CAS mechanism.

Preset application is local draft transformation; Save uses existing Preference persistence.

## 6. Cross-module boundary

### 5.14

`LongTermPreferenceReadV1` must contain only saved canonical Preference values and revision metadata.

No preset ID/label/match state may appear.

### 5.18/5.19

Trip Library Preference snapshot/patch continues to store canonical Preference only.

No preset metadata enters Trip rows.

### A planning contracts

Do not modify:

- `EffectivePreferenceV1`;
- 43-dimension scoring fields;
- A planning/scoring mappings.

No 23→43 conversion belongs to this task.

## 7. WBS update

At actual implementation start:

1. fetch latest `origin/develop`;
2. read the complete current `docs/project/WBS-TravelAssist.md`;
3. modify only WBS 5.13:

```text
未开始
→
进行中（#345 / TASK-053-B）
```

Preserve every unrelated A/B row, including the completed 5.14/5.15/5.19/5.21 tracking.

Before returning implementation Result:

```text
5.13 = 待审查（#345 / TASK-053-B；Draft PR #<number>）
```

Only explicit acceptance + merge may mark completed.

## 8. Required pure tests

At minimum prove:

1. empty canonical Preference is the only implicit default;
2. all 9 preset patches parse;
3. applying every preset to empty is valid;
4. applying every preset to a fully populated valid Preference is valid;
5. keys outside category scope remain unchanged;
6. preset application is deterministic;
7. same preset applied twice produces same value;
8. exact match identifies the preset;
9. one manual edit changes match to Custom;
10. preset IDs/labels do not appear in serialized canonical Preference;
11. reset/clear produces unset semantics;
12. no attraction/style preset exists in v1.

## 9. Real Local Supabase / browser acceptance

Use real Local Supabase with User A, User B and anon.

Required scenarios:

### Empty user

- A has no Preference row before first GET;
- GET returns empty resource with revision 0;
- no row is created by GET/page load;
- no preset is shown as already saved/selected.

### Apply without save

- click preset;
- draft changes;
- dirty state appears;
- zero mutation request occurs;
- reload/cancel returns server state.

### Save

- apply preset;
- save through existing 5.16 API;
- exact canonical fields persist;
- revision advances according to existing contract;
- reload reproduces exact values;
- preset metadata is absent from DB/wire.

### Preserve outside scope

Seed another category first, then apply/save a preset. The unrelated category must remain byte/semantic equivalent.

### Switch / custom

- switch from one preset to another deterministically;
- manually edit one controlled field;
- UI no longer claims exact preset match.

### Clear / reset

- clear page and save unsets category keys;
- global reset produces empty canonical Preference;
- reset does not apply any preset.

### Concurrency

Two sessions load same revision; one saves; stale second save must preserve current WBS 5.16 409 behavior and must not overwrite.

### Isolation

- B data never changes while A applies/saves presets;
- anon cannot use private Preference API.

## 10. Cross-module acceptance

After saved preset values:

- WBS 5.14 public read returns saved canonical fields and no preset metadata;
- create a Trip Library draft/save path as appropriate and verify Preference snapshot contains canonical saved values/source revision only;
- no preset ID/label appears in Trip Library JSON.

## 11. Quality gates

Baseline latest develop before implementation.

Candidate must run at least:

```text
npm ci
npm run test:preferences
npm run test:preferences:db
npm run test:preference-api
npm run test:preference-api:local
npm run test:preference-contract
npm run test:preference-contract:local
npm run test:trip-library-api
npm run test:trip-library-api:local
```

Add dedicated TASK-053 pure and browser/Local tests and scripts.

Also run:

```text
npm run lint
npm run typecheck
npm run build
npm run format:check:deploy
npm run deploy:validate:local
npm run deploy:build:local
npm run deploy:verify-artifact
git diff --check
```

Real Local:

```text
npm run db:start
npm run db:status
npm run db:reset
```

`db:types` is not required unless a migration/generated type actually changes; such a change is not expected and must be justified.

Full repository tests and clean browser bundle/server-boundary audit are mandatory.

The exact final PR head must receive its own GitHub Quality Gate PASS. Do not reuse CI from an earlier head.

## 12. Deliverables

- preset/default implementation;
- canonical editor integration;
- dedicated tests;
- `docs/qa/TASK-053/README.md`;
- sanitized machine evidence;
- `docs/tasks/RESULT-TASK-053-b-preference-presets-defaults.md`;
- Master WBS status update;
- Draft PR to develop;
- Issue #345 update.

## 13. Forbidden / out of scope

Do not:

- add or change canonical Preference fields;
- add DB migrations/RPCs/tables;
- persist preset IDs;
- auto-apply any preset;
- auto-save a preset click;
- infer presets from user history/companions;
- create attraction/style presets;
- modify Planner/AI/Engine/POI;
- implement 23→43 scoring mapping;
- start WBS 8.6/9.5/9.6 or another downstream task;
- auto-merge.

Git safety:

```text
git clean -fd
git reset --hard
git push --force
git push --force-with-lease
```

are forbidden.

## 14. Completion state

Implementation + mandatory QA => `待审查` only.

Keep:

- Issue #345 Open;
- PR Draft/Open;
- no downstream automatic start.
