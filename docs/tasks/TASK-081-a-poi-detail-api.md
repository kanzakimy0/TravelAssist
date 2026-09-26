# TASK-081-A — WBS 7.7 Canonical POI Detail API

> Issue: #431  
> WBS: 7.7 — POI 详情 API  
> Owner: A  
> Priority: P1  
> Implementation branch: `codex/a-task-081-poi-detail-api`  
> Parallel peer: TASK-080-A / WBS 7.6  
> Publication baseline develop: `85f5c62361d93f897423e92232547863d46ab0d1`  
> WBS 7.4 candidate: PR #417 / `codex/a-poi-canonical-schema` / observed head `875caf9e9130514fa99da95ce11d63fca2bf3b1d`

## 1. Goal

Implement a read-only, rights-safe POI detail API derived only from validated WBS 7.4 `CanonicalPoiV1`.

This Task runs in parallel with TASK-080-A but owns only the direct detail lookup surface.

## 2. Hard dependency / merge gate

Same WBS 7.4 gate as TASK-080:

- development may start now using the current PR #417 schema candidate;
- TASK-081 MUST NOT merge before PR #417 is accepted/merged;
- after #417 merges, refresh TASK-081 onto the resulting latest `develop` and rerun all affected validation;
- candidate-only TASK-068–075 artifacts are not runtime canonical truth.

Do not patch the canonical schema locally if a 7.4 defect is found. Report it to #399/#417.

## 3. Parallel file ownership

Prefer paths equivalent to:

- `src/shared/contracts/poi-details/**`
- `src/server/poi-details/**`
- `src/app/api/pois/[poiRef]/route.ts`
- `tests/task-081-a-poi-detail-api.test.mjs`
- `docs/qa/TASK-081/**`
- `docs/tasks/RESULT-TASK-081-a-poi-detail-api.md`

Do not edit TASK-080 search modules.

Avoid a shared barrel/package dependency change unless strictly required.

## 4. Identity rule

Preferred endpoint:

`GET /api/pois/[poiRef]`

The route path identity is **canonical POI internalId only**.

Never silently reinterpret:

- Master Code;
- candidateKey;
- Provider ID;
- Region ID;
- Transport Node ID

as the path POI identity.

`masterCode` may be returned as nullable metadata but is not an alternate path lookup in this Task.

Unknown internalId = 404. Malformed/oversized path identity = 400.

## 5. Canonical validation

Every record crossing the repository → service boundary must pass the current WBS 7.4 strict canonical parser/validator.

If the repository contains invalid canonical data:

- fail closed;
- do not partially emit the record;
- return a stable server/repository error;
- record the validation issue in QA without leaking sensitive raw payload.

No candidate record may be automatically promoted by the detail endpoint.

## 6. Detail DTO

Return a strict rights-safe DTO derived from canonical data.

Expected safe fields include:

### Identity / names
- `poiRef/internalId`;
- nullable `masterCode`;
- primary locale;
- localized names;
- aliases where canonically retained for redistribution/use.

### Classification
- primary;
- secondary;
- canonical safe tags.

### Location
- support status;
- country;
- safe canonical point if available;
- prefecture;
- municipality;
- postal code only if canonical policy already permits product exposure;
- geometry reference only if it is a stable public/product reference.

### Lifecycle
- status;
- merged/superseded target POI reference when present;
- statusChangedAt.

Merged/superseded records must remain explicit. Do not silently follow them and pretend the old POI is active.

### 43D
Return the canonical 43-key feature set when present.

Preserve exactly:

- integer 0..9;
- `null` as unknown.

Never coerce `null` to 0/5/default.

If the whole feature set is absent, represent that truthfully rather than manufacturing 43 defaults.

### Visit
Return validated static Visit Profiles already present in canonical data.

Do not infer missing duration/load values in this API Task.

### Region / Access
Return static canonical relations:

- Region relations;
- Access Anchor references and relationships.

Do not add live timetable, fare, delay, crowd, weather, real-time accessibility or route calculations.

### Assets / evidence
Return only product-safe references.

Do not expose:

- Provider raw payload;
- provider credentials;
- candidate-only review data;
- raw source documents;
- transient-only observations;
- restricted content merely because a source locator exists;
- internal licensing mechanics unnecessary for clients.

A minimal provenance summary may expose stable `sourceRef`, source kind, authority band, observedAt and attribution-required flag if safe; raw locator/content is not required for this Task.

External Provider IDs are internal canonical metadata and should not be exposed unless a current accepted product contract explicitly requires them.

## 7. Repository boundary

Create a narrow storage-agnostic read interface such as `getByInternalId`.

Provide:

- dependency injection;
- deterministic canonical fixture repository for tests;
- explicit repository-unavailable behavior;
- no candidate-file runtime adapter.

If an independently accepted runtime canonical repository exists at execution time, it may be wired only after confirming runtime authorization and documenting the source.

## 8. HTTP / lifecycle behavior

Use stable application errors:

- invalid identifier → 400;
- not found → 404;
- repository unavailable → 503;
- invalid canonical record → fail closed (5xx/503 according to current repository convention).

A merged/superseded canonical record may return 200 with explicit lifecycle/replacement metadata; do not issue a silent HTTP redirect unless a pre-existing accepted contract requires it.

Use conservative correctness headers until WBS 7.10.

No mutation/auth side effect/provider call.

## 9. Required tests

Positive:

- active POI;
- temporarily closed POI;
- permanently closed historical POI direct lookup;
- merged POI with merge target;
- superseded POI with replacement target;
- localized names and aliases;
- nullable masterCode;
- supported point / unknown point;
- exact 43D with zeros;
- exact 43D with many nulls;
- entire featureSet absent;
- multiple Visit Profiles;
- Region relations;
- Access Anchor refs;
- safe evidence summary.

Negative:

- malformed/oversized poiRef;
- unknown poiRef;
- candidateKey/provider ID/masterCode used as implicit alternate lookup;
- invalid canonical record;
- invalid 43D shape;
- invalid Visit Profile;
- Provider raw payload leakage;
- transient/restricted data leakage;
- live timetable/fare/weather/crowd leakage;
- repository unavailable.

Deterministic repeat must pass.

## 10. Validation

At minimum:

- TASK-081 focused tests;
- TASK-050 / PR #417 POI contract regression;
- directly affected Planning/Visit/feature contract tests;
- full Node regression where repository convention requires;
- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- deployment-format/artifact checks if current CI requires;
- `git diff --check`;
- exact-head GitHub Quality Gate.

## 11. WBS / Result

During implementation:

- WBS 7.7 = `进行中`.

After implementation/QA with Draft PR ready:

- WBS 7.7 = `待审查`.

Only after PR #417 is merged, TASK-081 is refreshed to latest develop, user accepts it, Quality Gate passes and the TASK-081 PR merges may WBS 7.7 become `已完成`.

Create:

- `docs/tasks/RESULT-TASK-081-a-poi-detail-api.md`
- QA evidence under `docs/qa/TASK-081/`

Do not auto-merge. Do not start WBS 7.9.
