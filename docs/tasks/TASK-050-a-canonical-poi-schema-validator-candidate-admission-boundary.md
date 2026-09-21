# TASK-050-A — Canonical POI Schema / Validator / Candidate Admission Boundary

> WBS: 7.4 — POI Standard Schema  
> Owner: A — Main Travel System / Shared POI Architecture  
> Priority: P0  
> Tracking Issue: #399  
> Implementation branch: codex/a-poi-canonical-schema  
> Target: develop  
> Status: Ready to execute / no auto-merge

## Goal

Establish one canonical provider-independent POI v1 contract so Search, Candidate Pipeline, 43D scoring, Planner and the B-owned POI corpus converge on one validated production identity and admission boundary.

## Mandatory reuse

- docs/architecture/poi-master-schema-v0.2.md
- docs/architecture/poi-feature-preference-codebook-v0.1.md
- src/shared/contracts/planning/poi.ts
- src/shared/contracts/planning/features.ts
- src/shared/contracts/planning/facts.ts
- canonical Master Code Registry / 5-digit namespace
- merged Region Graph identities
- Fact Freshness / Provenance semantics
- B candidate/recovery/enrichment artifacts as read-only candidate inputs only
- docs/design/data-governance-data-version-provenance-freshness-quality-gate-model.md
- docs/design/cache-materialized-view-search-index-data-serving-model.md
- docs/audits/final-architecture-gap-audit-2026-09-21.md

Do not create a second 43D schema, Master Code system, Region identity system, Planning projection or Trip model.

## Identity separation

Preserve:

POI Internal ID != Master Code != candidateKey != asset/destination slot ID != Provider ID != Region ID != Transport Node ID != AI Local ID != DB PK.

Candidate records never become canonical POIs implicitly.

## Required canonical POI v1 scope

At minimum support:

1. stable internal POI identity;
2. Master Code reference according to lifecycle/admission;
3. multilingual names + aliases;
4. canonical provider-independent classification;
5. location/geometry with unknown-safe semantics;
6. lifecycle / merge / supersession;
7. governed canonical facts and source refs;
8. reuse of 43-key PoiFeatureV1 with 0..9|null;
9. reuse of Visit Profiles;
10. Region relations;
11. Access Anchor / transport references without live route facts;
12. provider/external IDs separated from canonical identity;
13. revision metadata;
14. asset references only;
15. deterministic projection to existing PoiPlanningProjectionV1.

## Candidate → Canonical admission

Create a separate admission envelope/result, not a second POI master.

Admission states should cover repository-compatible equivalents of:

- ADMIT
- REVIEW_REQUIRED
- BLOCKED
- MERGE_TARGET
- INSUFFICIENT_EVIDENCE

Mandatory gates include:

- canonical identity resolved;
- duplicate / merge disposition resolved;
- Japan location/Region validity or explicit unsupported state;
- canonical classification valid;
- provenance resolvable;
- no candidateKey/provider ID substituted for canonical identity;
- Master Code allocation obeys registry and POI namespace;
- lifecycle valid;
- 43D complete shape valid when present;
- null remains unknown and is never coerced to 0/5;
- Visit Profile duration/load semantics valid;
- no live timetable/weather/crowd facts in static master;
- persistence/rights policy valid;
- material evidence conflict blocks or requires review.

## Provider / rights boundary

- No live Provider calls.
- No Provider purchase/credentials.
- No raw Provider payload requirement.
- No assumption that photos/vendor fields can be persisted.
- Provider IDs and observations remain separate from canonical identity.

## Required deliverables

Suggested paths (adapt only if current repository conventions are stronger):

- src/shared/contracts/poi/
- canonical POI types + validator + public exports
- candidate admission types + validator/helper
- canonical → Planning projection adapter
- canonical positive/negative fixtures
- docs/architecture/poi-canonical-schema-v1.md
- docs/qa/TASK-050/schema-audit.json
- docs/qa/TASK-050/admission-fixtures.json
- docs/qa/TASK-050/compatibility-report.json
- docs/qa/TASK-050/pilot-report.md
- tests/task-050-a-poi-schema.test.mjs
- docs/tasks/RESULT-TASK-050-a-poi-schema.md
- Master WBS update

## Mandatory positive fixtures

- urban attraction
- temple/shrine/history POI
- nature/scenic POI
- onsen/resort POI
- shopping/food/entertainment POI
- temporarily closed POI
- permanently closed historical POI
- merged duplicate → canonical target
- partial features with many nulls
- supported Visit Profile
- no Visit Profile
- multiple Region relations
- Access Anchor linked POI
- provider-observed transient-only field excluded from persistence

## Mandatory negative tests

- duplicate internal ID
- duplicate active Master Code
- Master Code outside POI namespace
- candidateKey/provider ID used as canonical ID
- unresolved Region
- invalid lifecycle/merge target
- missing 43D key
- 43D value outside 0..9|null
- null coerced to 0 or 5
- invalid Visit Profile duration order
- exact live timetable/fare embedded in static POI
- dangling source/evidence ref
- forbidden Provider Raw payload
- restricted/transient field marked persistent
- unresolved identity conflict silently admitted

## Acceptance gates

- one canonical POI contract source of truth;
- public parsers fail closed;
- deterministic round-trip;
- deterministic admission;
- candidate-only identity cannot become canonical implicitly;
- deterministic valid Planning projection;
- 43D meaning compatible with current codebook;
- Region/Master Code refs resolve in fixtures;
- unknown semantics preserved;
- Provider raw leakage = 0;
- live fact leakage into static master = 0;
- production DB writes/migrations = 0;
- live Provider calls = 0;
- B corpus mutation = 0;
- Planner UI changes = 0;
- scoring parameter changes = 0.

## Explicitly out of scope

- importing/promoting the 10k+ B corpus;
- whole-corpus Master Code allocation;
- Places Search API / POI Detail API;
- scoring production freeze;
- DB persistence/migrations;
- Provider activation;
- image acquisition;
- Candidate Pipeline merge;
- AI / Planner UI / Booking / Payment / Route changes.

## Completion

Create one Draft PR to develop and stop.

PASS wording:

Completed / WBS 7.4 canonical POI schema ready for human review

Do not auto-merge and do not auto-start downstream WBS.