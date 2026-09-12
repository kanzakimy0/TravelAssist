# TravelAssist — Preference Presets / Defaults v1

Status: Freeze Candidate for WBS 5.13 / TASK-053-B  
Owner: B / Personal Center  
Publication baseline: `develop@4da2b8883069cd415eee6e18129c874383286653`

## 1. Purpose

WBS 5.13 defines how TravelAssist offers convenient Preference presets and default behavior **without turning UI suggestions into fabricated long-term user facts**.

The accepted WBS 5.11 canonical Preference model is sparse:

> Missing means unset.

WBS 5.14 exposes that saved canonical state to A consumers. WBS 5.16 persists it with revision/CAS semantics. WBS 5.13 sits above those accepted contracts and must not create a parallel Preference model.

## 2. Non-negotiable default semantics

The canonical long-term default is:

```ts
{
  schemaVersion: "1.0",
  values: {},
}
```

Therefore:

- a new account has no implied long-term preference;
- first GET must not create a row or write preset values;
- opening a Preference page must not write preset values;
- a visual slider midpoint is not a saved value until the user acts;
- reset means return to empty / unset, not apply a “balanced” profile;
- missing and explicit neutral/false remain distinct;
- downstream Planner/AI consumers must never infer “default preset selected” from missing data.

## 3. Preset definition

A preset is product-owned UI metadata plus one canonical `PreferencePatchV1`.

Conceptually:

```ts
interface PreferencePresetV1 {
  id: string;
  category: "mobility" | "dining" | "accommodation" | "budget";
  label: string;
  description: string;
  patch: PreferencePatchV1;
}
```

Rules:

1. `patch` is the only semantic payload.
2. Every preset must pass `parsePreferencePatchV1`.
3. Applying the patch to any valid Preference must produce a value accepted by `parsePreferenceV1`.
4. Fields not listed in `patch.set` or `patch.unset` are preserved exactly.
5. Preset ID, label and description are **not persisted**.
6. A preset is never auto-selected for a user.
7. A preset is applied only to the client draft. Existing WBS 5.16 Save performs persistence.

## 4. v1 category boundary

The v1 preset catalog is limited to categories where canonical semantics already exist and can be expressed without introducing scoring assumptions:

- mobility;
- dining;
- accommodation;
- budget.

The following categories deliberately have no v1 system preset:

- interests / attractions;
- interest details;
- seven style axes.

Reason: existing older UI models use coarser or different vocabularies (for example broad attraction dimensions and 4-level likes) than the canonical 5.11 registry. WBS 5.13 must not invent lossy mappings, weights or 23→43 scoring semantics.

## 5. Legacy UI audit rule

Several pre-canonical UI model files contain local `default...` objects or display-only preset labels. They are historical presentation state, not canonical long-term facts.

During implementation, each legacy value must be classified as one of:

- **lossless canonical mapping** — may be represented by a WBS 5.13 preset patch;
- **presentation-only** — remains local UI wording but may not be persisted as a canonical preset;
- **ambiguous / lossy** — must not be silently mapped.

No approximation is allowed merely to preserve an old mock default.

## 6. Draft / Save lifecycle

```text
server Preference resource
        ↓ load
canonical draft
        ↓ explicit Apply Preset
canonical draft + preset patch
        ↓
unsaved / dirty state
        ├─ Cancel → restore loaded server resource
        └─ Save → existing 5.16 PATCH + expectedRevision
                         ↓
                  saved PreferenceV1
```

Preset selection itself performs **zero network mutation**.

## 7. Preset matching

A UI may display that the current draft exactly matches a preset only when the canonical keys controlled by that preset equal the preset outcome exactly.

Do not fuzzy-match.

If the draft differs, display `自定义` / Custom or no selected preset.

A preset match is UI state only; it is not stored.

## 8. Reset and clear

Global reset continues to use the existing WBS 5.16 reset contract and results in an empty canonical Preference.

Per-category clear removes that page’s canonical keys and preserves all other categories.

Neither operation applies a preset automatically.

## 9. API / DB boundary

WBS 5.13 adds:

- no endpoint;
- no DB table;
- no migration;
- no RLS policy;
- no revision column;
- no preset ID column;
- no new Auth behavior.

It reuses WBS 5.16:

- GET Preference;
- PATCH Preference with expected revision;
- reset;
- existing Cookie/Bearer/Auth/RLS/CAS behavior.

## 10. A/B contract boundary

WBS 5.14 continues to expose only saved `LongTermPreferenceReadV1` canonical values.

It must not expose:

- preset ID;
- preset label;
- preset match state;
- UI recommended defaults.

Trip Library creation snapshots likewise capture only canonical saved Preference values and source revision. No preset metadata enters WBS 5.18/5.19 data.

## 11. UI integration

Use the existing canonical Preference editor and current Personal Center visual language.

Expected behavior on supported pages:

- show a compact preset area above/beside the canonical fields;
- clearly label presets as quick templates, not existing saved facts;
- clicking a preset updates the draft only;
- dirty state appears immediately;
- Cancel restores the loaded server state;
- Save uses the existing persistence flow;
- custom edits after applying a preset switch the display to Custom when it no longer exactly matches;
- no automatic Save after preset selection.

No redesign of the entire Preference Center is part of WBS 5.13.

## 12. Required acceptance

### Pure contract

- canonical empty preference is the only implicit default;
- every preset patch parses;
- every preset can apply to empty and populated Preference resources;
- fields outside patch scope are byte/semantic equivalent after application;
- applying the same preset twice is deterministic/idempotent at value level;
- no preset metadata appears in canonical Preference serialization;
- ambiguous legacy UI defaults are not promoted silently.

### Real Local API / Auth

With User A / User B / anon:

- new A reads empty/unset Preference with no row-creation side effect;
- applying a preset in UI creates no network mutation until Save;
- Save persists exact canonical values with 5.16 revision/CAS;
- reload reproduces saved values;
- Cancel produces zero server change;
- second session stale save returns existing 409 behavior;
- B is isolated;
- anon remains denied.

### Cross-module

- 5.14 read returns canonical saved values only;
- Trip Library snapshot captures canonical values/revision only;
- no preset ID/label leaks into Trip records;
- no 23→43 cast or scoring mapping is introduced.

### Build/bundle

- full tests and Preference regressions pass;
- lint/typecheck/build/deployment gates pass or unchanged baseline debt is proven;
- client bundle contains no server DB/Auth code;
- exact final PR head receives its own GitHub Quality Gate PASS.

## 13. Completion

Implementation completion moves WBS 5.13 to review only:

```text
待审查（#345 / TASK-053-B；Draft PR #<number>）
```

Only explicit user acceptance and merge may mark WBS 5.13 `已完成`.
