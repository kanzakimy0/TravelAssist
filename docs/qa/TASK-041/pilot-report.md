# TASK-041 Travel Region Graph Pilot Report

## Outcome

Completed / calibration-independent reference dataset ready for review.

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

## Structural validation

The canonical Planning parser accepted the complete graph. Additional pilot
diagnostics report:

- duplicate node/relation/edge IDs: 0;
- duplicate Master Codes: 0;
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
variant.

## Completion boundary

This pilot demonstrates safe representation and deterministic validation of a
sparse Japan Region Graph. It does not establish nationwide completeness, live
route correctness, final edge density, licensing, Candidate ranking quality or
production readiness. Candidate Pipeline / TASK-042 was not started.
