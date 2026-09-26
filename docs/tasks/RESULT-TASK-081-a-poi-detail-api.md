# RESULT — TASK-081-A

## Status

**Implementation and local QA complete; Draft PR pending review.** WBS 7.7 is `待审查`. Merge is gated on WBS 7.4 PR #417.

- Repository: `kanzakimy0/TravelAssist`
- Issue: #431
- Branch: `codex/a-task-081-poi-detail-api`
- Base `origin/develop`: `85f5c62361d93f897423e92232547863d46ab0d1`
- Consumed schema head: `875caf9e9130514fa99da95ce11d63fca2bf3b1d` (same as published observed head)
- Draft PR: [#432](https://github.com/kanzakimy0/TravelAssist/pull/432) (Open/Draft)
- Latest `origin/develop` at precommit fetch: `85f5c62361d93f897423e92232547863d46ab0d1`; final branch head is recorded on PR #432 after the documentation closeout commit

## Architecture and endpoint

`GET /api/pois/[poiRef]` accepts only the WBS 7.4 canonical `internalId` grammar. It never interprets Master Code, candidateKey, Provider ID, Region ID or Transport Node ID as alternate lookup identities. It never redirects merged or superseded records; their original identity and explicit target remain in the response. Malformed IDs return 400, unknown IDs 404, unavailable storage 503, and invalid canonical records fail closed with a stable 503.

The server service depends on a narrow asynchronous `getByInternalId` repository interface. Every returned record passes `parseCanonicalPoiV1` before projection. The default production repository is explicitly unavailable because the candidate corpus has no runtime import authorization. Tests inject a deterministic fixture repository; the public route does not use fixtures.

## Product-safe DTO

The DTO allowlists canonical identity, multilingual names/aliases, classification, static point and locality, lifecycle, exact 43D values, static Visit Profiles, Region relations, Access Anchors, and a filtered evidence summary. It preserves integer `0` and unknown `null` in all 43 keys; an absent feature set remains `null`. It omits raw facts, Provider external IDs and payloads, source locators, restricted/transient evidence, assets, geometry references, postal code, internal revisions, licensing mechanics, and live timetable/fare/weather/crowd.

## Data source and rights

`data/poi/full/manifests/current-candidate-review.v1.json` remains `CANDIDATE_ONLY_NO_CANONICAL_IMPORT` with `runtimeImportAuthorized=false`. No candidate file is wired to the runtime. Before any later canonical runtime repository is enabled, its accepted import must prove the redistribution policy of names and aliases and the validity of records.

## Validation

- TASK-081 focused: 10/10 PASS.
- TASK-050 POI contracts: 24/24 PASS.
- Planning contracts: 21/21 PASS; soak 6/6 PASS.
- Full Node regression: 2744/2744 PASS.
- Lint: PASS with 0 errors and 9 unrelated existing warnings.
- Typecheck, deployment formatting, local environment validation: PASS.
- Production deployment build: PASS, including `/api/pois/[poiRef]`.
- Standalone artifact audit: PASS, 1,883 files, 0 failures.
- Production HTTP smoke: canonical-shaped ID → 503 unavailable; Master Code path → 400 invalid.
- Detailed matrix: [QA](../qa/TASK-081/README.md).
- Exact final-head GitHub Quality Gate: pending after final push.

## Scope and blockers

PR #417 is Open/Draft and unmerged, so this PR must remain Draft/Open. The canonical runtime datasource has not been separately accepted, so live detail reads correctly return 503 until authorized wiring is supplied. WBS 7.6 search modules and WBS 7.9 scoring were not modified. No Provider purchase, DB migration, mutation or automatic merge was performed.