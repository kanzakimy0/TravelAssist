# Planner concept-image refinement — 2026-09-05

## Scope / status

User clarification: keep the existing 75% / 25% workspace split and bottom-panel height; bring the other visual elements closer to the supplied concept image. This is a local follow-up on `feature/a-planner-v03-interactions`, based on `175e1613fdefa80f111ae8166efaf5d9a3033328`. This follow-up is not committed, pushed or merged; the previously recorded PR #85 does not yet contain it.

## Implemented

- Stronger navy typography, coral-pink emphasis, warm-white rounded cards, softer borders/shadows and restrained native SVG blossom decoration.
- Larger torii brand/header controls; local example-directory search with empty results / details / Escape and focus restore. Bell reuses the existing pending-bookings dialog; account retains its existing route. No invented search provider or notification backend.
- Mapbox [Outdoors v12](https://docs.mapbox.com/map-styles/guides/classic-styles/) replaces Light v11, retaining its terrain/vegetation detail and using warmer roads, blue water and Chinese/Japanese place labels with fallback. No new provider, routing service, API integration or secret.
- Local editorial destination illustrations, larger white-ring map markers and transport capsules. AI illustration provenance and prompts are in `public/media/planner/README.md`; these are not documentary photographs. Line-art remains a Mapbox artwork-loading fallback.
- More legible traveler/date/preferences cards, structured summaries, illustrated plan rows, current-plan badge, compact tags and consistent primary action styling.
- Illustrated proportional timeline nodes with narrow-container image suppression to protect text. True duration widths, actual gaps and the three parallel shared-axis day bands remain unchanged.
- Fixed a production CSS-order conflict: `.mapCanvas .mapboxHost` explicitly fills its existing host, without modifying workspace tracks. Added a browser assertion that canvas geometry equals its host at all five sizes.

## Unchanged

- Desktop workspace 3:1, right panel upper/lower 1:1, bottom 25vh; existing drawer/sheet breakpoints.
- Trip State, date / traveler / preference edits, range selection, plan switching, six tabs, regeneration Mock, reservations/fixed times, Map ↔ Timeline, Morph/Escape/reduced motion.
- `/start`, Personal Center, configuration, dependencies, lockfile and environment files.

## Validation

- Lint / typecheck / build: passed. Build generated all existing routes without a cloud DB.
- Node tests: **66/66** passed (64 retained + 2 local visual-contract tests).
- Mapbox and blocked-network fallback: all five viewports and the full existing v0.3 interaction suite passed; no page errors or hydration failures.
- Additional local search / reminder / optimized image / canvas sizing / fixed-ratio checks: passed.
- Changed text-file formatting and `git diff --check`: passed. Whole-repository format check still reports the same **15 untouched baseline Markdown files** listed in the TASK-008.3 Result; not fixed outside this request.
- GPU readback/preload warnings remain non-fatal. The fallback run intentionally blocks Mapbox network requests.
- `npm ci` was not repeated for this follow-up: no dependency or lockfile change.

## Screenshots

Fresh, unedited three-day fixture (same composition mode across sizes):

- [1600×900](concept-three-day-1600x900.png)
- [1440×900](concept-three-day-1440x900.png)
- [1280×800](concept-three-day-1280x800.png)
- [1180×800](concept-three-day-1180x800.png)
- [390×844](concept-three-day-390x844.png)

`mapbox-*.png` and `fallback-*.png` additionally cover the default day view, comparison, settings, responsive drawer/sheet, nested popovers, Morph and hotel confirmation. The v0.3 regression suite deliberately edits the fixture; its later screenshots are interaction evidence, not concept-composition comparisons.

Machine-readable evidence: `mapbox-checks.json`, `fallback-checks.json`, `concept-checks.json`.

| Viewport | Right width | Bottom height | Result    |
| -------- | ----------- | ------------- | --------- |
| 1600×900 | 400px       | 225px         | unchanged |
| 1440×900 | 360px       | 225px         | unchanged |
| 1280×800 | 320px       | 200px         | unchanged |
| 1180×800 | drawer      | 200px         | unchanged |
| 390×844  | drawer      | sheet         | unchanged |

## Intentional differences from the concept

This is not a pixel-identical reproduction. Real map geometry and illustrative straight Mock connectors remain; no Directions service is added to mimic routed roads. Default Day 1 remains Day 1 rather than silently switching the user's range. v0.3 three-day parallel proportional bands are retained instead of reverting to the older concatenated concept timeline. Existing working navigation is retained; no nonfunctional inspiration/tools links or fake profile photograph were added.

## Repeat locally

Set `PLAYWRIGHT_MODULE` and `CHROME_EXE` to the existing external test runtime. Run the built app at `http://127.0.0.1:3002`; set `PLANNER_QA_URL` to that address, `PLANNER_QA_ENVIRONMENT=production`, `PLANNER_QA_OUTPUT=docs/qa/planner-concept-refinement`:

```text
node tools/qa/planner-v03-check.mjs
node tools/qa/planner-v03-check.mjs fallback
node tools/qa/planner-concept-check.mjs
node --test tests/*.test.mjs
```

The scripts only target localhost; they never save provider tokens.
