# TravelAssist Canonical POI Schema v1

> Status: Review candidate  
> Owner: A — Main Travel System / Shared POI Architecture  
> Task: TASK-050-A / WBS 7.4

## Decision

`src/shared/contracts/poi/` is the canonical provider-independent POI v1 contract and admission boundary. It reuses the existing Planning, 43D, Fact, Region Graph and Master Code contracts. It does not define a second scoring vector, Region identity, Master Code grammar, Planning projection or Trip model.

## Identity model

The following identifiers are deliberately separate:

```text
Canonical POI internalId (`poi:*`)
!= five-digit Master Code
!= candidateKey
!= Provider externalId
!= assetRef / destination slot
!= Region ID
!= transportNodeRef
!= AI local ID
!= database primary key
```

`internalId` is the stable production identity. Rename, Provider-ID change and temporary closure do not replace it. A merged or superseded identity remains in history and points to a canonical POI; old IDs are not reused. Master Code is a registry allocation, not an alias of `internalId`.

## Canonical record

`CanonicalPoiV1` contains:

- multilingual names and governed aliases;
- one provider-independent primary classification plus secondary classifications and tags;
- Japan support state, country, point/geometry and unknown-safe address fields;
- lifecycle and explicit merge/supersession targets;
- static governed `PlanningFactRefV1` references;
- optional existing `PoiFeatureSetV1` (all 43 keys when present, each `0..9|null`);
- existing `PoiVisitProfileV1` records;
- one or more Region Graph relations;
- access-anchor references to transport nodes, with no route/timetable facts;
- Provider/external identifiers isolated from canonical identity;
- asset references only, never embedded Provider media payloads;
- field-family revisions and timestamps;
- source/provenance references with persistence and redistribution rights.

Unknown is represented by `null`. It is never converted to `0` or `5`. A missing feature set is valid canonical data but cannot be projected to Planning until a complete 43-key set is available.

## Static fact boundary

The canonical master accepts only these existing Planning fact kinds:

```text
poi_identity
poi_location
poi_operational_calendar
poi_reservation_policy
poi_accessibility
poi_visit_profile
```

Realtime closure observations, exact timetable/fare, weather, live crowd/queue, price, inventory, booking and runtime state remain in snapshot/runtime systems. Unknown fields fail closed, so `providerRaw`, exact live values and vendor-specific payloads cannot enter the canonical object.

## Master Code and Region reuse

Canonical structure checks that a non-null Master Code is a five-digit POI-range value (`10000–79999`). Admission additionally validates the supplied canonical `MasterCodeRegistryV1`, requires an active allocation, requires `entityRef === internalId`, and requires the registry POI entity type to match the canonical primary classification.

Region relations use merged Region Graph `regionId` values. Admission receives the active Region identity set and blocks dangling references. `japan_supported` requires `countryCode=JP`, a primary Region relation and a point or geometry reference. `unsupported_outside_japan` is explicit but blocked from Japan admission; unresolved location produces insufficient evidence rather than invented coordinates.

## Candidate admission boundary

`CandidateAdmissionEnvelopeV1` is not a second POI master. It carries candidate identity-resolution evidence, duplicate disposition, normalized Provider observation metadata, 43D evidence mappings, rights intent and material conflicts. Raw Provider payloads are not part of the schema.

The evaluator returns exactly one state:

- `ADMIT` — every mandatory gate passes; only this state returns `canonicalPoiRef`;
- `REVIEW_REQUIRED` — structurally safe but a human/governance decision remains;
- `BLOCKED` — a hard safety, identity, rights, reference or conflict failure exists;
- `MERGE_TARGET` — the candidate resolves to an existing canonical POI;
- `INSUFFICIENT_EVIDENCE` — identity/location/provenance is not adequate.

The 14 gates run in a fixed order:

1. canonical identity;
2. duplicate/merge disposition;
3. Japan location and Region validity;
4. classification;
5. provenance/evidence resolution;
6. identity-family separation;
7. Master Code registry/lifecycle/entity match;
8. POI lifecycle and merge target;
9. complete 43D shape when present;
10. unknown/null preservation;
11. Visit Profile duration/load semantics;
12. static-fact boundary;
13. persistence/rights policy;
14. material evidence conflicts.

Outcome precedence is deterministic: hard block, merge target, insufficient evidence, review, then admit. Candidate data never becomes canonical implicitly.

## Planning compatibility

`projectCanonicalPoiToPlanningV1` emits the existing `PoiPlanningProjectionV1` exactly:

```text
internalId -> poiRef
PoiFeatureSetV1 -> featureSet
PoiVisitProfileV1[] -> visitProfiles
Region relations -> regionRefs
PlanningFactRefV1[] -> factRefs
```

The adapter calls the existing Planning parser before returning. Names, Provider IDs, rights, assets and other canonical-only metadata do not leak into Planning. No scoring, duration or null default is introduced.

## Explicit non-goals

No DB table or migration, Provider call/purchase/credential, B-corpus mutation, corpus import, whole-corpus Master Code allocation, UI change, scoring change, Route change, Trip change, Search API or Detail API is included.
