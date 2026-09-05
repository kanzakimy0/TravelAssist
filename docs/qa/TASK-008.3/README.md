# TASK-008.3-A Browser Acceptance

Local production build, Chrome, 2026-09-05. `mapbox-*` uses the existing configured Mapbox base map; `fallback-*` deliberately blocks Mapbox requests. No new Provider / route / AI service was called. Screenshots are actual browser output, not reference-image claims.

## Five viewports

| Viewport | Mapbox                            | Fallback                            | Responsive state                      |
| -------- | --------------------------------- | ----------------------------------- | ------------------------------------- |
| 1600×900 | [Screenshot](mapbox-1600x900.png) | [Screenshot](fallback-1600x900.png) | Right 400px / 25%; bottom 225px / 25% |
| 1440×900 | [Screenshot](mapbox-1440x900.png) | [Screenshot](fallback-1440x900.png) | Right 360px / 25%; bottom 225px / 25% |
| 1280×800 | [Screenshot](mapbox-1280x800.png) | [Screenshot](fallback-1280x800.png) | Right 320px / 25%; bottom 200px / 25% |
| 1180×800 | [Screenshot](mapbox-1180x800.png) | [Screenshot](fallback-1180x800.png) | Right drawer; bottom 200px / 25%      |
| 390×844  | [Screenshot](mapbox-390x844.png)  | [Screenshot](fallback-390x844.png)  | Right drawer and bottom sheet         |

All five viewports have no document-level horizontal or vertical overflow. Right upper/lower remain 1:1. The mobile time band is horizontally scrollable to retain readable, duration-proportional geometry; it is not an equal-width card list.

## Interaction evidence

- Three parallel bands: [1600×900](mapbox-1600x900-comparison.png), [1440×900](mapbox-1440x900-comparison.png), [1280×800](mapbox-1280x800-comparison.png), [1180×800](mapbox-1180x800-comparison.png). The last row is asserted visible in every desktop viewport. The QA date edit extends the example to seven days; no stops are generated for the new dates.
- [More Settings](mapbox-more-settings.png): bounding box of the lower right panel is identical before/after opening. Budget/pace sliders and nested detail settings update the shared local state.
- [Three-level preferences](mapbox-preferences.png) and [mobile nested settings](mapbox-390x844-nested-preference.png): separate detail surface, viewport clamping, warm theme, nested Escape and focus restoration.
- [Map quick card](mapbox-morph-quick.png): accessible list and actual rendered Mapbox feature clicks use the same inspection state. Blank map, another object, Close and Escape dismiss/switch. Normal Morph and reduced-motion fade styles are asserted separately.
- [Stay recommendation area](mapbox-stay-area.png) → [confirmed hotel](mapbox-confirmed-hotel.png): real local Mock booking actions, one canonical TripItem, matching recommendation area disappears, pending count updates, next-day hotel anchor retained after Mock regeneration.
- [Mobile drawer](mapbox-390x844-drawer.png), [mobile sheet](mapbox-390x844-sheet.png), [1180px drawer](mapbox-1180x800-drawer.png). The same checks and corresponding screenshots exist with the `fallback-` prefix.

## Recorded results

[Mapbox checks](mapbox-checks.json) / [Fallback checks](fallback-checks.json): no application page errors. Production Mapbox only reports GPU screenshot / preload warnings; forced fallback reports the expected blocked-resource error. Raw URLs and tokens are scrubbed from recorded console text. Earlier development-only Mapbox container warnings are not claimed fixed by this task.

The browser suite exercises traveler counts, quick preferences/detail inputs, date-shortening protection, date extension, long-range number input, valid three-day windows, proportional widths, shared axes, map/timeline selection, hotel confirmation, regeneration, six tabs, nested settings and responsive surfaces. Pure model tests additionally cover all seven map object types, invalid dates, checkout boundaries, multi-night bookings, shared-axis offsets and protected state through plan switching.

## Repeat locally

The optional browser tool is external, not a new app dependency. Set `PLAYWRIGHT_MODULE` to an available Playwright module and `CHROME_EXE` to a local Chrome executable. Start the production build on a local port, then:

```powershell
$env:PLANNER_QA_URL='http://127.0.0.1:3002'
$env:PLANNER_QA_ENVIRONMENT='production'
$env:PLANNER_QA_OUTPUT='docs/qa/TASK-008.3'
node tools/qa/planner-v03-check.mjs
node tools/qa/planner-v03-check.mjs fallback
```

No token is passed on the command line. The app uses its existing local configuration. The script refuses non-local app URLs.
