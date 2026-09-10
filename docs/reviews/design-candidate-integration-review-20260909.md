# Design Candidate Integration Review — 2026-09-09

## Review scope

TASK-029-A audits four pending design candidates against `origin/develop@171900698180b80220017c9c4bec551b72792f27`. It does not approve a design, change runtime code, or change the original WBS owners.

## Source / version / PR matrix

| WBS | Candidate | Canonical reviewed source | Tracking | Result |
| --- | --- | --- | --- | --- |
| 0.9 | Cross-module Contract handoff rules | `docs/architecture/cross-module-contract-handoff.md` on `origin/develop` | Issue #168; Draft PR #171 remains open; kickoff PRs #169/#170 merged | **CHANGES_NEEDED** |
| 1.10 | Attraction/activity tag display rules | `docs/ui/attraction-activity-tag-display-rules.md` on `origin/develop` | Issue #158; PRs #163/#165 merged; user acceptance still pending | **CHANGES_NEEDED** |
| 1.12 | Map visual / Pin / region / route spec | `docs/ui/map-visual-pin-region-route-spec.md` at Draft PR #177 head `a21a66e` | Draft PR #177 open; user color-policy decision recorded 2026-09-10 | **CHANGES_NEEDED** |
| 1.13 | Main-system Design Tokens | `docs/ui/main-system-design-tokens.md` at Draft PR #179 head `95ccaec` | Draft PR #179 open; user accent decision recorded 2026-09-10 | **CHANGES_NEEDED** |

## Current runtime integration reality

- Shared public contracts now exist in `src/shared/contracts/trips` and `src/shared/contracts/routes`; authentication also exposes a public-view boundary in `src/lib/auth/contracts.ts`. Preference and Companion still use feature-private view models and do not yet have equivalent public contract packages.
- Planner explicitly distinguishes its internal trip model from the canonical cross-module contract. Map, timeline, and secondary panels already share selection state.
- The current merged map uses Mapbox `outdoors-v12`, warm/coral selected-route treatment (`#e95b4b`), fallback behavior, and accessible list equivalents.
- The latest accepted global visual baseline uses warm ivory surfaces and coral `#e95b4b` (`#d94738` hover). Current radius, font, and shadow scales are not identical to the pending 1.13 candidate.
- Home, Start, Planner/Detail, and Personal Center already consume portions of the shared warm/coral language, but do not consume one fully frozen 1.13 token registry.

## Conflict matrix

| Area | Candidate statement | Current accepted/runtime reality | Classification | Required action |
| --- | --- | --- | --- | --- |
| 0.9 contract inventory | Document still describes an earlier stage without a concrete shared-contract inventory and remains labelled Draft / in progress | Trips and Routes public contracts now exist; Auth has a public-view contract; Preference/Companion public contracts remain absent | Objective documentation drift | Add a dated canonical inventory and adapter/owner table; retain the principles and owners |
| 0.9 lifecycle | Final review PR #171 is still Draft/open | Kickoff/spec PRs are merged, but final acceptance has not occurred | Tracking gap | Update header/version/PR chain and keep 0.9 `待审查` |
| 1.10 taxonomy example | The Sagrada Família example places `architecture_landmark` in Experience Tags | `architecture_landmark` is defined as a Secondary Category, not an Experience Tag | Objective schema contradiction | Replace it with a defined Experience Tag or formally add and define a distinct `architecture_interest` ID; do not reuse a category ID across dimensions |
| 1.10 implementation bridge | Candidate leaves multi-secondary mapping, confidence thresholds, and registry placement open | No canonical POI taxonomy/provider schema exists yet | Deliberate downstream gap | Record these as 7.2/7.4 gates; do not invent runtime mappings in UI tasks |
| 1.12 route color | Candidate prefers route/day identity and states route blue must not be forced to the brand accent | Current accepted Planner displays selected/legacy routes in coral `#e95b4b` | Resolved product decision; implementation delta remains | Canonical rule is one route color per travel date/day. Amend the candidate and create a bounded migration task; the main-system coral remains an action/selection accent, not the universal route identity color |
| 1.12 map baseline | Candidate proposes a low-saturation warm map and detailed semantic pin/region states | Current Mapbox style is `outdoors-v12`; only a subset of the semantic states is implemented | Migration delta | After the color decision, create a bounded migration task with before/after evidence; do not silently rewrite the current map |
| 1.13 accent | Candidate specifies `#B95649` / `#A74739` / `#963E34` | Latest merged and user-accepted baseline uses `#e95b4b` / `#d94738` | Resolved product decision; specification delta remains | Keep the current main-system coral family headed by `#e95b4b`; amend the candidate token source and publish compatibility aliases/migration guidance |
| 1.13 primitives | Candidate radius/font/shadow scales differ from current global and Planner-local scales | Several accepted screens depend on current values | Migration and regression risk | Add token aliases/migration plan and visual-regression scope after the accent decision |

## Candidate conclusions and minimum amendments

### WBS 0.9 — CHANGES_NEEDED

The principles are compatible with the current architecture, but the document is stale relative to the repository. Amend it without changing ownership:

1. Add a dated inventory for Trips, Routes, Auth, Preference, and Companion contract status.
2. Name canonical source paths and feature adapters for each implemented public contract.
3. Explicitly identify missing Preference/Companion public contracts instead of implying no shared contracts exist.
4. Update the Draft/status and PR-chain metadata. Keep 0.9 `待审查` until user acceptance.

### WBS 1.10 — CHANGES_NEEDED

The information architecture and low-noise display limits are compatible with current product surfaces. Before acceptance:

1. Correct the cross-dimension use of `architecture_landmark` in the example.
2. Freeze whether the replacement is an existing Experience Tag or a newly defined `architecture_interest` tag with label, provenance, and fallback rules.
3. Assign the unresolved registry/mapping/confidence decisions to 7.2/7.4; UI code must not become the taxonomy source of truth.

### WBS 1.12 — CHANGES_NEEDED

Most state, hierarchy, accessibility, and interaction rules are compatible. The user resolved the color-policy conflict on 2026-09-10:

- Each travel date/day has one stable route identity color.
- The same date/day color must remain consistent across the map, timeline, detail views, legends, and related route affordances.
- Transport mode and status must use icons, line treatment, labels, or other redundant signals; they must not silently replace the date/day identity color.
- The current coral family remains the main-system action/selection accent and is not the universal route color.

Update the candidate’s route palette, accessible contrast/redundancy rules, Mapbox style baseline, clustering rules, and migration evidence. Keep 1.12 `待审查` until those amendments and visual regression evidence are accepted; do not silently rewrite the merged Planner in this audit.

### WBS 1.13 — CHANGES_NEEDED

The semantic token structure is useful, and the user resolved the accent conflict on 2026-09-10: the current accepted main-system coral headed by `#e95b4b` remains canonical; the current hover value is `#d94738`. The older candidate family headed by `#B95649` must not replace it. Before acceptance:

1. Rebase the candidate source/version matrix on the current Home/Start/Planner/Detail/Personal Center baseline.
2. Publish compatibility aliases and a staged migration for radius, type, shadow, and glass primitives.
3. Add cross-page visual-regression evidence before declaring 1.13 frozen.

## Downstream impact

| Downstream WBS | Safe now | Gate / risk |
| --- | --- | --- |
| 1.14 Responsive layout | Continue geometry and accessibility work against current accepted screens | Use the current coral family; token-dependent responsive visuals still require the amended 1.13 source and regression evidence |
| 1.17 Planner detail design | Continue validated interaction/geometry fixes | Preserve one stable route color per date/day across Planner and Detail; implement migration only through an explicit delta task |
| 1.20 Loading/Empty/Error/Skeleton | Define behavior and semantics using the current coral family | Final radii, shadows, aliases, and non-accent primitives still depend on the amended 1.13 source |
| 7.2 POI provider selection | Use 1.10 provenance and capability requirements in the provider matrix | Do not freeze provider-to-taxonomy mapping until the 1.10 inconsistency and 7.4 registry decisions are resolved |
| 4.x runtime | Treat merged behavior as the regression baseline | Create explicit delta tasks for accepted 1.12/1.13 migrations; do not retroactively relabel completed implementation as failed |

## User decisions recorded

1. WBS 1.12: route identity uses one stable color per travel date/day.
2. WBS 1.13: the main system keeps the current accepted coral family headed by `#e95b4b` (`#d94738` hover).

These decisions remove the two `USER_DECISION_REQUIRED` gates, but they do not themselves amend the candidate branches or migrate runtime code. WBS 1.12 and 1.13 therefore move to `CHANGES_NEEDED`; all four reviewed items retain their existing owners and `待审查` status.
