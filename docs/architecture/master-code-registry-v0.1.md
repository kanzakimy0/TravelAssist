# TravelAssist Canonical Master Code Registry v0.1

> Status: Governance Candidate / pending human review  
> Owner: A — Shared Infrastructure / Architecture  
> Task: TASK-043-A / Issue #311 / WBS 2.18  
> Registry revision: `task-043-candidate-r1`

## 1. Audit conclusion

The repository already contains a reusable canonical namespace grammar: the
five-digit ranges inherited unchanged by
`trip-engine-poi-ai-provider-design-v0.3.md#8`. It did not contain an
entity-to-code allocation registry, resolver, lifecycle history, or transition
validator before TASK-043.

TASK-043 therefore does **not** create a second grammar. It reuses the existing
five-digit ranges and introduces the first repository-owned allocation source of
truth. The allocations and governance rules remain a candidate until human
review; this document does not declare them Frozen.

## 2. Identity boundary

Master Code is a stable, human-operable business code. It is not an identity
alias and is never derived from a mutable name.

```text
Master Code
!= regionId
!= destination_id
!= administrative code
!= transport-node ID
!= POI ID
!= AI local ID
!= database primary key
```

The removed `JP-RG-*`, `JP-PREF-*`, `JP-MACRO-*`, `jp-*` destination IDs, and
`JP` country code remain invalid as canonical Master Codes.

## 3. Canonical source of truth

`src/shared/data/master-code-registry.v1.json` is the only hand-maintained
allocation data source. `src/shared/master-code/` provides types, validation,
transition guards, and resolvers; it does not copy the allocation list.

Generated reports under `docs/qa/TASK-043/` are reproducible views and are not
registries. Consumers must import the public module rather than parsing a QA
report.

## 4. Reused namespace grammar

All codes are exactly five ASCII digits. Leading zeroes are significant.

| Range         | Meaning                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------- |
| `00000`       | Unknown / reserved sentinel; never an entity allocation                                      |
| `00001–00099` | Prefecture business codes                                                                    |
| `00100–00999` | City / large Region, including country root, macro areas, municipalities, and travel regions |
| `01000–01999` | District / tourism area                                                                      |
| `02000–02999` | Stay / lodging area                                                                          |
| `03000–03999` | Onsen / resort area                                                                          |
| `04000–04999` | Travel gateway business identity                                                             |
| `05000–09999` | Reserved                                                                                     |
| `10000–79999` | Existing POI category ranges                                                                 |
| `80000–89999` | Transport identity range                                                                     |
| `90000–99999` | Reserved for future expansion                                                                |

TASK-043 allocates only the 50 TASK-041 Region entities. It does not mass-assign
POIs or transport nodes. Prefecture candidates use `00051–00060`, deliberately
outside Japan's `01–47` prefecture-code values, so an administrative code is not
silently reused as a Master Code.

## 5. Registry entry

`MasterCodeEntryV1` records:

- `masterCode`;
- `entityType` and opaque `entityRef`;
- `lifecycleStatus`;
- `supersededBy`;
- `sourceRefs` and structured `provenance`;
- `allocationReason`;
- `createdRevision` and `updatedRevision`.

External names, aliases, administrative codes, provider IDs, and coordinates
belong to their owning data sets. They are not embedded in or inferred from a
Master Code.

## 6. Lifecycle and history

Allowed lifecycle values are:

```text
reserved -> reserved | active
active -> active | deprecated | superseded
deprecated -> deprecated
superseded -> superseded
```

Rules:

1. The registry is append-only: a known code cannot disappear.
2. Once allocated, `(entityType, entityRef)` for that code is immutable.
3. A deprecated code remains bound forever and cannot be recycled.
4. A superseded entry must point to an existing active code for the same entity.
5. Supersession targets cannot be missing, self-referential, or cyclic.
6. A new active code for an existing entity is only valid when the old code is
   retained as an explicit superseded history entry.
7. Every active entity has at most one active code.

`validateMasterCodeRegistryTransitionV1(previous, next)` enforces append-only,
immutability, no-recycling, and lifecycle-transition rules across revisions.

## 7. Allocation protocol

An allocation change must:

1. identify the canonical entity and its owning contract;
2. prove that it is not an alias of another identifier family;
3. select an unused code inside the inherited entity range;
4. add provenance, a reason, and revision metadata;
5. pass current-registry and previous-to-next transition validation;
6. regenerate dependent manifests;
7. receive human review before the candidate is treated as approved.

Renames and ordinary provider changes do not create a new code. Entity merge or
split proposals require explicit supersession/migration review.

## 8. Resolver behavior

- `resolveMasterCode(code)` returns the lifecycle entry or `null`.
- `resolveActiveMasterCodeByEntity(entityType, entityRef)` returns the single
  active allocation or `null`.
- Unknown, malformed, deprecated, or reserved values never silently resolve as
  active allocations.

The registry parser fails closed on unknown fields, enum values, malformed code,
unsafe entity references, namespace mismatch, duplicate code/entity allocation,
and invalid supersession state.

## 9. Region contract consumer decision

TASK-043 recommends, but does not freeze, **Option A**:

```ts
masterCode: string | null;
```

`null` means allocation pending and is permitted only in explicitly partial or
draft data. A production-complete Region graph must have zero null values and
every code must resolve to an active registry entry. This keeps the reviewed
TASK-041 contract compatible while still failing closed at publication.

Option B—non-null canonical nodes plus a separate unresolved/draft type—has
stronger type-level completeness, but is a breaking change for current parsers,
fixtures, persistence projections, and ingestion tooling. The complete impact
comparison is in `docs/qa/TASK-043/consumer-impact.json`.

No shared Region contract is changed by TASK-043. Human Consumer Review may
select Option B in a later, separately reviewed migration.

## 10. TASK-041 boundary

`region-allocation-50.json` is an allocation manifest generated from the
canonical registry and the 50 merged TASK-041 `regionId` values. TASK-043 does
not edit the TASK-041 graph, its PR history, or WBS 4.48.

After this candidate is reviewed and merged, TASK-041 must separately integrate
the allocations, rerun its graph regressions, and receive its own human review.
Until then WBS 4.48 remains Partial.

## 11. Non-goals

- Production database or migration
- POI mass allocation
- Provider ID migration
- Region graph topology or edge tuning
- UI or Candidate Pipeline work
- Automatic freezing or merging
