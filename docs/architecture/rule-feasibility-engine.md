# WBS 4.21 — Rule / Feasibility Engine

## Boundary and entry point

`src/server/engine/index.ts` implements the existing [4.20 / 4.20.1 Contract](travelassist-engine-contract.md). Public entry points are `validate(snapshot, changeSet, context)`, `preview(snapshot, changeSet, context)`, and `createRuleEngine(trustedModels)`. There is no API route, UI integration, persistence, apply, rollback, booking/payment operation, or live Provider access.

`src/shared/contracts/engine/index.ts` contains the same document type declarations; an AST-based contract test compares every declaration. Canonical Trip/Plan/Day/Item/Schedule types and validation still come exclusively from `src/shared/contracts/trips`. Public RouteResponse and its validator are imported, not copied.

The module accepts **trusted service-supplied context**, not arbitrary browser claims. Its access binding is a prerequisite supplied by an authorized caller; it is not an Auth/membership lookup or a replacement for4.22 authorization. No endpoint exposes these booleans to clients.

## Capabilities

| Capability                          | 4.21 behavior                                                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Existing snapshot, empty operations | Evaluate the explicitly selected canonical plan                                                                                 |
| UPDATE_TIME                         | Replace schedule only in a detached candidate; re-run the canonical parser and all rules                                        |
| REORDER_ITEMS                       | Exact existing day permutation only; validate order, references and time constraints                                            |
| Other recognized operations         | OPERATION_UNSUPPORTED; no silent translation or partial simulation                                                              |
| UPDATE_DURATION                     | Always unsupported; 4.17 has no independent visit-duration field                                                                |
| AI/system/provider_event proposals  | Unsupported until their confirmation/authorization policies are implemented                                                     |
| Protected mutation                  | system_hard_lock blocked; user lock/fixed trusted contexts require confirmation; booking/payment-dependent mutation unsupported |
| Booking-dependent assessment        | Existing hard conflicts remain visible, but unavailable booking freshness/policy returns unsupported                            |
| Apply/rollback                      | No public runtime method; transaction always not_started, resultingVersion null                                                 |

A blocked feasibility preview may contain an otherwise canonical-valid detached candidate so the caller can explain the conflict. Permission, unsupported-operation and canonical-parser failures return no preview. Preview never writes `PlanItemV1.assessment`, revisions, audit, keys, cache or history.

## Evaluation context v1

`EvaluationContext.inputContractVersion = "4.21-evaluation-1"` is a **versioned evaluation adapter input**, not a new POI master, Profile database, Route schema or Trip Plan field. There is no production adapter yet. It contains:

- Injected evaluationTime, priorLoad, trusted actor/trip/plan access binding.
- Policy reference/version, ruleSetVersion, explicit hard/soft severity, required route/opening-hour checks, buffer, confidence threshold, model reference and cross-day limits.
- Per-item reviewed profile reference/version/freshness, visit mode, minimum/recommended minutes and baseline walking/physical intensity.
- Optional featureSetRef for externally owned43-dimensional data and an informational matchingScore. Matching is never read by feasibility rules.
- Day time window, load limit, explicitly supplied recovery credit, positive slope/stairs/environment/mobility factors, and optional meal/rest windows.
- Existing ProviderFactRef bindings to existing RouteResponse alternatives, plus trusted opening-hour intervals and protected item references.

Inputs are strict bounded JSON; unknown fields, cyclic/accessor/non-finite input, duplicate/dangling IDs and unsupported versions fail closed. Limits currently include100 operations,1000 scheduled items,2MB serialized input and depth30. These are evaluation capability limits, not universal product limits.

All time computations use explicit instants and offsets. Canonical schedule validation owns timezone/day consistency. Planned minutes are derived from schedule; no independent duration field is written. Real observed visit-duration inputs remain unsupported pending4.16/4.17/owned execution-fact contract.

Required context is not silently defaulted. Missing priorLoad is a coverage gap, not a zero-fatigue claim. An explicitly disabled recovery requirement grants no recovery credit when its optional value is absent; it does not infer real rest. Context/profile/model and version changes invalidate the preview fingerprint.

## Registry and rules

`registry.ts` identifies six independent version1 rules: visit-duration, visit-load, schedule-feasibility, day-capacity, day-fatigue, itinerary-recovery. New published semantics require a new rule/model version. The input cannot inject executable code.

- Item duration compares supplied minimum and recommended minutes. Hard minimum returns DURATION_TOO_SHORT/blocked; a soft minimum requires confirmation. A compressed visit uses policy warning/confirmation.90 minutes passing the duration rule does not prove schedule/load feasibility.
- Item load runs a reviewed pure LoadModel against duration and available context. Missing/invalid model or output returns unsupported/null; missing required profile/context returns insufficient_inputs/null.
- Schedule checks item order, all interval overlaps, canonical/trusted hard constraints, opening windows and route transfer windows. Cross-day overlaps/order are checked independently of each day's capacity.
- Day capacity includes scheduled durations, validated transfer minutes and explicit buffers. Meal/rest intervals are unioned so overlapping entries cannot double-count fulfilled rest.
- Day fatigue totals visit loads plus route walking load once; it never sums43-dimensional walking scores as fatigue.
- Itinerary evaluates initial carry, day load, recovery and consecutive high-load days. It also propagates lower-level risks and coverage gaps without turning a warning into a hard block or hiding a hard constraint.

Every assessment has scope, rule/version, reasons, issue indexes, related assessments and coverage. Non-passing assessments always link actual issues; confirmation issues create corresponding requirements. Overall status uses the existing strictness order; top-level warning remains accepted-with-warning, not a new EngineOutcome.

## Evaluation model, not a permanent product formula

The bundled `evaluation-duration-context@1` model uses unit `evaluation-load-v1`. Its explicit provisional formula is:

```text
visit load =
  mean(walking baseline, physical baseline)
  × planned minutes / 60
  × slope factor × stairs factor × environment factor × mobility factor
```

Results round to six decimals. With walking7/physical5 and unit factors,30min gives3 evaluation units;90min gives9. Neither equals a fixed walking7 fatigue total. This demonstrates duration/context coupling, not a clinically or empirically calibrated fatigue measure.

For known route walking segments, the same model uses normalized walking/physical intensity1 with that segment's actual supplied duration and destination-day context. Segments are counted once; their steps are not added again. Missing segmentation, unknown transport mode, unknown duration or missing load context prevents all-clear. This normalization is provisional evaluation-model behavior, not a Provider fact.

Day load = visit loads + route walking loads. Cross-day carry = max(0, prior carry - explicit recoveryBefore) + current day load. The model independently checks carry and consecutive high-load days; a recovery credit does not erase an independently configured consecutive-day limit. Carry and recovery values must use the selected model's unit. Meal/rest windows validate time provision; they do not mint a recovery credit automatically. Future calibrated models/units/limits require reviewed versions.

`createRuleEngine` accepts only a trusted developer-installed registry of pure functions. Model metadata and finite/nonnegative output are validated; inputs are frozen. The code cannot prove arbitrary injected JavaScript is pure, so only reviewed model code belongs in the registry; there is no dynamic code/plugin loading. Regression tests verify the bundled model, model replacement, exceptions/mutation/NaN failure and order-independent registry replay.

## Provider facts and unresolved production dependencies

No engine lookup/refresh is performed. Route bindings must match supplied ChangeSet.factRefs, subjects/endpoints, Provider identity and fetched/observed time. Confidence, evaluationTime expiry, known entitlement/freshness, selected alternative, segmentation, duration and departure/arrival are checked. Missing/expired facts cannot become guessed travel minutes, coordinates or zero load.

A route binding covers adjacent canonical items; same-day travel is charged to that day and cross-day travel to the destination day in this evaluation model. Hard-time/window checks still run. Complex transport-visit decomposition and alternative-specific visit modes require later adapter/rule review; no hidden transport store is created.

This consumes the public Route Contract as an evaluation input. It does **not** authorize production retention, TTL selection, paid routing, rights, or a new Provider normalized schema. Those remain Provider-owner decisions. The caller explicitly supplies source policy and expiry; the engine validates them, it does not invent them.

Other Open Decisions: owned POI/Profile production adapters and Visit Mode binding, observed duration, calibrated fatigue units/recovery/thresholds, protected/AI proposal policies,4.22 transaction/permissions/grants/storage. Current gaps return structured blocked/unsupported; runtime success with complete fixtures does not close these product decisions.

## Determinism and verification

No Date.now, random, network or state write. Ordered operations and canonical plan/day/item order are semantically significant. Object-key order is not: strict canonical serialization and SHA-256 bind payload, before/after, context, policy and registry versions. Repeated validate/preview with identical inputs produces identical results. This is **pure replay**, not persisted idempotency; replay.duplicate remains false.

See `tests/wbs-4-21-rule-feasibility.test.mjs` and `tests/fixtures/engine-feasibility.mjs`. Tests cover the task's A–H cases, boundary failures, exact contract declarations, complete result/reference structure, canonical preview parsing, immutability and replay. No browser acceptance is claimed because UI wiring is outside scope.
