# TASK-050 Canonical POI pilot report

Status: PASS / ready for human review.

The provider-free pilot uses eight synthetic canonical POIs spanning urban landmark, religious/history, nature, onsen/experience, shopping/food/entertainment, temporary closure, permanent closure and merged duplicate states. The fixtures reference merged Region Graph identities and fixture-only POI allocations that are validated by the canonical Master Code registry parser. No fixture allocation is added to the production registry.

Coverage includes complete 43-key vectors with many explicit `null` values, a supported Visit Profile, no-Visit-Profile records, multiple Region relations, an Access Anchor, lifecycle history and a transient Provider photo observation excluded from canonical persistence.

The admission pilot covers all five outcomes and all 14 gates. Negative cases cover duplicate identity/code, namespace mismatch, identity substitution, unresolved Region, invalid lifecycle, incomplete/out-of-range 43D, null coercion to 0/5, invalid duration order, live fact leakage, dangling provenance, Provider raw payload, rights violations and unresolved evidence conflicts.

No live Provider call, DB write/migration, B-corpus mutation, Planner UI change or scoring parameter change is performed.
