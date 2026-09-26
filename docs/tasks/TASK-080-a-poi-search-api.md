# TASK-080-A — WBS 7.6 Canonical POI Search API

> Issue: #430  
> WBS: 7.6 — 地点搜索 API  
> Owner: A  
> Priority: P0  
> Implementation branch: `codex/a-task-080-poi-search-api`  
> Parallel peer: TASK-081-A / WBS 7.7  
> Publication baseline develop: `85f5c62361d93f897423e92232547863d46ab0d1`  
> WBS 7.4 candidate: PR #417 / `codex/a-poi-canonical-schema` / observed head `875caf9e9130514fa99da95ce11d63fca2bf3b1d`

## 1. Goal

Implement the read-only canonical POI search API so the main TravelAssist system can find canonical places by name and safe filters without importing candidate-only POI artifacts into runtime and without duplicating the WBS 7.4 canonical model.

This Task may develop in parallel with TASK-081-A. Implementation is authorized now, but merge is hard-gated by WBS 7.4 acceptance/merge.

## 2. Hard dependency / merge gate

At publication time:

- WBS 7.2 = completed.
- WBS 7.4 implementation exists in Draft PR #417 but is not merged.
- PR #417 defines `CanonicalPoiV1`, strict validation, Candidate Admission and canonical → Planning projection.
- TASK-068–075 corpus still declares `CANDIDATE_ONLY_NO_CANONICAL_IMPORT`.
- `tools/poi/read-current-candidates.mjs` asserts `runtimeImportAuthorized === false`.

Therefore:

1. Start TASK-080 from execution-time latest clean `origin/develop`.
2. Fetch current `origin/codex/a-poi-canonical-schema`.
3. Merge the current PR #417 schema candidate into the implementation branch for development; do not copy/redefine its POI types.
4. Keep the PR Draft/Open.
5. Do not merge TASK-080 until PR #417 is accepted/merged and TASK-080 has been refreshed onto the resulting latest `develop`.
6. No candidate-only dataset may become runtime truth in this Task.

If PR #417 changes after publication, audit the new head before consuming it. If TASK-080 discovers a defect in the 7.4 contract, report it to #399/#417; do not fork a second canonical schema inside TASK-080.

## 3. Parallel file ownership

TASK-080 owns only the search surface. Prefer paths equivalent to:

- `src/shared/contracts/poi-search/**`
- `src/server/poi-search/**`
- `src/app/api/pois/search/route.ts`
- `tests/task-080-a-poi-search-api.test.mjs`
- `docs/qa/TASK-080/**`
- `docs/tasks/RESULT-TASK-080-a-poi-search-api.md`

Do not create or edit a shared POI barrel solely to make imports shorter. Do not edit TASK-081-owned detail modules.

TASK-081 owns `poi-details` / `/api/pois/[poiRef]`; avoid cross-branch edits.

## 4. Canonical model boundary

The only POI truth model is WBS 7.4 `CanonicalPoiV1`.

Must preserve:

`POI Internal ID != Master Code != candidateKey != Provider ID != Region ID != Transport Node ID`

Search results may expose `masterCode` as metadata, but canonical `internalId` is the POI reference.

Forbidden:

- treating candidateKey as `internalId`;
- treating Provider ID as `internalId`;
- silently allocating/rebinding Master Codes;
- importing `data/poi/full/**` candidate artifacts into runtime;
- bypassing `parseCanonicalPoiV1` or the current strict validator;
- fabricating missing names, coordinates, classifications or 43D values.

## 5. API surface

Preferred route:

`GET /api/pois/search`

If a stronger current repository convention is discovered, document the chosen route in Result and keep one stable endpoint.

### Query

Support a bounded deterministic query with:

- `q`: optional string, trimmed; max 120 characters.
- `locale`: optional bounded locale hint.
- `prefecture`: optional exact canonical filter.
- `municipality`: optional exact canonical filter.
- `classification`: optional WBS 7.4 classification enum.
- `regionRef`: optional canonical Region reference.
- `limit`: default 20, min 1, max 50.
- `cursor`: optional opaque bounded cursor.

Require either `q` or at least one meaningful filter. A completely unconstrained corpus dump is invalid.

Reject:

- control characters;
- oversized values/cursors;
- unknown classification values;
- malformed cursor;
- duplicated/ambiguous parameters where semantics would be unclear.

### Search semantics

Search only validated canonical fields:

- primary/localized names;
- aliases;
- explicit canonical address municipality/prefecture;
- classification;
- region relations.

Use Unicode NFKC and conservative punctuation/spacing/case normalization. Japanese text remains Japanese. Do not invent romanization/transliteration not already present as canonical names/aliases.

Deterministic lexical precedence should be equivalent to:

1. exact primary name;
2. exact localized/alias;
3. primary prefix;
4. localized/alias prefix;
5. bounded substring/token match;
6. stable deterministic tie-break.

This is **search relevance only**. Do not use long-term Preference, 43D preference weights, personalized score, popularity score, AI judgment or WBS 7.9 recommendation ranking.

### Lifecycle

Default search visibility:

- `active`
- `temporarily_closed`

Exclude `permanently_closed`, `merged`, and `superseded` from ordinary search unless a clearly justified explicit internal mode is required. Do not silently return obsolete identities as active results.

## 6. Search response

Use a strict response contract. Each result should contain only search-card-safe fields such as:

- canonical `poiRef/internalId`;
- `masterCode` nullable metadata;
- resolved display name + locale;
- matched canonical name/alias and match kind where useful;
- primary classification;
- prefecture / municipality when known;
- canonical point when supported;
- lifecycle status;
- region refs needed for display/filtering.

Do not return in search cards:

- Provider raw payload;
- provider credentials;
- candidate-only fields;
- raw source documents;
- restricted/transient observations;
- recommendation score/reason;
- full 43D feature payload.

## 7. Repository boundary

Create a storage-agnostic read boundary that consumes validated `CanonicalPoiV1`.

The production adapter must not be invented by reading candidate files.

At minimum provide:

- a narrow repository interface sufficient for search;
- deterministic test/in-memory fixture implementation using WBS 7.4 canonical fixtures;
- dependency injection for HTTP/service tests;
- an explicit unavailable/not-configured result when no runtime-authorized canonical repository exists.

An in-memory fixture scan is acceptable in tests only. Do not claim an O(N) fixture scan as the production indexing strategy.

If, at execution time, a runtime-authorized canonical dataset has been separately accepted into `develop`, it may be wired only after verifying that authorization and recording the exact source in Result.

## 8. HTTP / safety

Read-only public canonical POI search should not gain a new user-auth dependency solely in this Task unless current main-system architecture already requires it.

Use conservative response headers until WBS 7.10 defines cache policy. No persistent/search cache implementation here.

Must fail closed with stable application errors for:

- invalid request;
- canonical repository unavailable;
- canonical validation failure.

No provider call, DB write or mutation may occur.

## 9. Required tests

Positive:

- exact Japanese primary name;
- English/localized name;
- alias match;
- prefix/substring behavior;
- prefecture/municipality filters;
- classification filter;
- region filter;
- active + temporarily closed visibility;
- deterministic sort/tie-break;
- stable pagination/cursor;
- `masterCode = null` preserved;
- coordinates absent preserved as unknown.

Negative:

- empty unconstrained query;
- oversized q/filter/cursor;
- control characters;
- invalid classification;
- malformed cursor;
- candidateKey/provider ID substitution attempt;
- permanently closed/merged/superseded leakage into ordinary search;
- provider raw/transient leakage;
- repository returns invalid canonical record;
- repository unavailable.

Deterministic repeat must pass.

## 10. Validation

At minimum:

- TASK-080 focused tests;
- TASK-050 / PR #417 POI contract regression;
- directly affected shared Planning contract tests;
- full Node regression where repository convention requires;
- `npm run lint`;
- `npm run typecheck`;
- `npm run build`;
- deployment-format/artifact checks if current CI requires;
- `git diff --check`;
- exact-head GitHub Quality Gate.

## 11. WBS / Result

During implementation:

- WBS 7.6 = `进行中`.

When implementation passes locally/hosted and Draft PR is ready:

- WBS 7.6 = `待审查`, not `已完成`.

Only after explicit user acceptance, PR #417 has already merged, TASK-080 is refreshed to latest develop, final Quality Gate passes, and TASK-080 itself is merged may 7.6 become `已完成`.

Create:

- `docs/tasks/RESULT-TASK-080-a-poi-search-api.md`
- QA evidence under `docs/qa/TASK-080/`

Do not auto-merge and do not start WBS 7.9.
