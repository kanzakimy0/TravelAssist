# TravelAssist Route Contract

## Ownership and version

TravelAssist owns the provider-independent contract in
`src/shared/contracts/routes`. Version `1.0` is the only accepted write
version. Planner, AI, Engine, and future native clients must consume this
contract rather than Google Routes, 駅すぱあと, Jorudan, NAVITIME, Mapbox, or any other provider response types.

The contract is additive on reads: an adapter maps a future provider mode to
`other` and preserves only its harmless source mode label. Unknown contract
versions are rejected so callers do not silently reinterpret changed semantics.

## Units and missing data

| Concept       | Canonical representation                                          |
| ------------- | ----------------------------------------------------------------- |
| Duration      | Non-negative integer seconds                                      |
| Distance      | Non-negative integer meters                                       |
| Fare          | Non-negative integer minor units plus uppercase ISO 4217 currency |
| Instant       | ISO 8601 instant/offset string plus an IANA timezone              |
| Local intent  | Explicit local date, local time, timezone, and absolute instant   |
| Geometry      | GeoJSON `LineString`, or `null`                                   |
| Unknown value | `null`; never a fabricated zero                                   |

Coordinates are GeoJSON order: longitude, latitude. A LineString needs at
least two valid positions. A fare of zero is meaningful only when the source
explicitly provides zero; an absent fare remains `null`.

## Graph model

A response contains alternatives. Each alternative owns legs, segments, and
steps. Legs reference segments and segments reference steps by stable IDs.
Runtime validation rejects duplicates and dangling references.

Modes cover walking, rail, subway, bus, tram, ferry, flight facts returned by a
provider, transfer, waiting, and `other`. Flight is informational only; this
contract does not provide flight search or booking.

Transit metadata can carry operator, line, route, service/train, stops,
platforms, direction, destination sign, stop count, fare component, and
informational reservation/seat facts. Optional data remains `null`.

## Error boundary

Public errors use stable codes:

- `invalid_request`, `unsupported_mode`, `no_route`
- `provider_unavailable`, `provider_timeout`,
  `provider_rate_limited`, `provider_auth`
- `provider_contract_error`, `normalization_error`, `unknown`

Each error declares whether retry is safe, a user-facing category, a safe
message, and an optional diagnostic fingerprint. Raw payloads, provider
SerializeData, credentials, URLs containing credentials, and private response
text are forbidden from the contract and are rejected by validation.

## Provider replacement

`RoutingProvider` is the seam for future Jorudan or NAVITIME adapters. A
replacement normalizes its data to Route Contract v1.0 and requires no Planner
model change. Provider-specific caching and entitlements stay server-side.

## Geometry and map-renderer gate

The public representation can carry canonical geometry when the provider and
license permit it. The current 駅すぱあと evaluation adapter returns `null`
geometry because this endpoint does not supply the approved display geometry
and mixed display rights have not been confirmed. Textual transit facts remain
usable without geometry. TASK-022-A did not wire provider geometry directly into Planner or a map SDK. The current production-provider selection is governed by `map-routing-poi-ai-provider-policy-v1.md`; provider-specific objects must still never leak into this contract.


## Current provider policy (2026-09-24)

Google Routes API is the default primary routing provider, normalized through `RoutingProvider` into Route Contract v1.0. Google Maps Platform is the default map renderer. TravelAssist POI identity and coordinates remain owned by TravelAssist; Google Places is not a core POI source. Existing 駅すぱあと evaluation support may remain as an explicit fallback / evaluation adapter.

This selection does not change the provider-independent wire contract. Caching, persistence, attribution, transit-leg handling, key security, and cost controls follow `map-routing-poi-ai-provider-policy-v1.md`.

Route provider invocation is selected by `route-policy-router-v1.md`. The Route Contract only normalizes a route result; it does not decide whether L0, L1, or L2 should be used and must never invoke Google Routes on its own.
