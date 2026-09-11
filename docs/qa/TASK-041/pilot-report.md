# TASK-041 Travel Region Graph Pilot Report

## Outcome

Partial / graph topology and evidence ready; canonical Master Code allocation
is blocked by the absence of a repository registry.

The pilot represents four Japan-first travel corridors with the existing
`TravelRegionGraphV1` contract and `parseTravelRegionGraphV1` parser. It is a
sparse planning reference graph, not a live route database.

## Measured dataset

- 50 region nodes.
- 53 RegionRelations: 40 `contains`, 9 `gateway_of`, 2 `adjacent`, and 2
  `overlaps`.
- 58 directional TravelEdges.
- 90 TravelEdgeVariants: rail 38, bus 22, mixed 16, car 8, and walk 6.
- 4/4 required corridor anchor groups represented.
- 5/5 required provider-free reachability checks passed.
- Node/relation/edge source-reference coverage: 50/50, 53/53, and 58/58.

The 50/53/58 graph topology is retained unchanged. It is not production-ready
until every node receives a canonical Master Code through the governed registry.

## Master Code audit

The review audited all 50 prior `masterCode` values against execution-time
`origin/develop` (`f10aded716719eabc94b81d9a3104b386c640946`). The repository
contains the numeric range codebook, but no canonical entity-to-code allocation
registry. A range definition is not an allocation record.

- 35 TASK-041 side-channel values (`JP-RG-*`, `JP-PREF-*`, `JP-MACRO-*`).
- 14 destination IDs (`jp-*`) incorrectly reused as Master Codes.
- 1 country code (`JP`) incorrectly reused as a Master Code.
- 0 values resolved to a canonical registry entry.
- 50 values were cleared to `null`; all existing `regionId` values are unchanged.

`master-code-audit.json` preserves the rejected values only as review evidence.
No rejected value remains assigned to a graph node. The public parser accepts
`null` only as an explicit unresolved state; a non-null unregistered value fails
the TASK-041 registry-resolution gate.

## Structural validation

The canonical Planning parser accepted the complete graph. Additional pilot
diagnostics report:

- duplicate node/relation/edge IDs: 0;
- duplicate Master Codes: 0;
- assigned noncanonical Master Codes: 0;
- unresolved Master Codes: 50 (tracked blocker, not represented as a fake code);
- dangling Region/Gateway references: 0;
- self relations and self TravelEdges: 0;
- `contains` cycles: 0;
- reverse duplicates for symmetric relations: 0;
- invalid range ordering: 0;
- planning-prior exact timetable/live fields: 0;
- missing evidence references: 0.

## Corridor coverage

1. Tokyo: Tokyo urban travel region, Shinjuku, Shibuya/Harajuku,
   Asakusa/Ueno, central Tokyo, stay clusters, Tokyo rail and Haneda gateways.
2. Hakone/Fuji: Odawara, Hakone, Hakone-Yumoto gateway, Fuji Five Lakes,
   Fujikawaguchiko and Kawaguchiko gateway.
3. Alpine/Hokuriku: Nagano, Matsumoto, Kamikochi, Takayama, Shirakawa-go,
   Kanazawa and representative gateway abstractions.
4. Kansai: Kyoto, Nara, Osaka, Kobe, selected districts/stay clusters and rail
   gateways.

## Evidence model

Identity and representative centers preferentially reuse the repository's
pinned Japan destination evidence. Tourism grouping and gateway context use
JNTO official destination material. Sparse compatibility values are explicitly
marked as TASK-041 human-curated pilot priors.

Evidence coverage means that every committed record resolves to an entry in
`evidence-index.json`; it does not mean every editorial score has been validated
as a production constant.

## Assumptions and unknowns

- District and stay-cluster boundaries are tourism/editorial groupings; precise
  polygons remain unknown and are not fabricated.
- Abstract gateways reference external transport-node identifiers but do not
  copy a Transport Master.
- Most duration/cost/transfer/walking ranges remain `null`. Only four broad
  duration priors supported by the cited JNTO context are populated.
- All costs, transfer counts, walking minutes, frequency bands and reservation
  priors remain unknown.
- Flight and ferry are valid contract modes but omitted because the current
  pilot evidence was insufficient to justify a specific planning-prior edge.
- Graph density and numeric priors are pilot candidates, not production
  constants.

## Semantic boundary

`RegionRelation`, `TravelEdge`, `TravelEdgeVariant`, and live Route facts remain
separate. No exact departure/arrival minute, live fare, availability, Provider
Raw, paid API result, booking fact or weather fact is present. Reachability is a
graph traversal only and must not be shown as a verified itinerary route.

## Negative coverage

Focused tests prove fail-closed behavior for dangling Region references,
`contains` cycles, reverse symmetric duplicates, duplicate IDs, invalid range
ordering, unknown enums, and exact timetable fields on a planning-prior
variant. They also prove that every non-null `masterCode` must resolve to the
canonical registry and that an injected `JP-RG-*` value is rejected.

## Completion boundary

This Partial pilot demonstrates safe topology, evidence and deterministic
validation of a sparse Japan Region Graph without inventing identifiers. The
remaining blocker is a governed canonical Master Code allocation registry and
assignments for these 50 identities. It does not establish nationwide
completeness, live route correctness, final edge density, licensing, Candidate
ranking quality or production readiness. Candidate Pipeline / TASK-042 was not
started by this work.
