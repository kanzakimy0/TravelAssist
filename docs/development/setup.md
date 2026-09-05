# Web Development Setup

## Requirements

- Node.js 20.9 or newer
- npm
- Git

## Install

```bash
npm install
```

## Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in a browser.

## Planner Mapbox preview (TASK-008.1)

`/planner` uses Mapbox GL JS with local, hand-authored Trip / booking fixtures.
The optional public browser variable is `NEXT_PUBLIC_MAPBOX_TOKEN`:

1. Copy `.env.example` to an untracked `.env.local` if needed.
2. Set a **public** Mapbox token locally. Restrict its allowed URLs in your
   Mapbox account. Never put a secret token in a `NEXT_PUBLIC_` variable and
   never commit a real token or paste it into a Result / Issue / PR.
3. Restart the development server. Production browser variables are captured
   at build time, so rebuild after changing the token.

An empty token intentionally uses the interactive schematic map: range
selection, place / area details and manual booking demonstrations still work.
Unsupported WebGL, map loading errors or an 18-second initialization timeout
also fall back safely. Mapbox SDK error payloads are not logged because they
may contain token-bearing URLs. Token configuration is not required for build.

Mapbox uses three GeoJSON sources and role-based style layers. Range switches
update source data without creating a new map. The fallback is a diagram, not
a road map; approximate fixture coordinates, route lines, durations, prices,
opening hours, weather and availability must not be used for real travel.
Thumbnails are explicitly labeled local illustrations, not hotel photographs.

Booking channels are **Mock only**. “前往预约（演示）” selects a channel without
navigating or placing an order. “我已完成预约（手动标记）” only updates the local
TripItem, locks the confirmed time, and checks neighboring time slots with a
15-minute illustrative buffer. Each plan retains its own edits while switching;
this task adds no server persistence or real booking / payment / route / AI API.

Reference: [Mapbox npm setup](https://docs.mapbox.com/mapbox-gl-js/guides/get-started/),
[GeoJSON source updates](https://docs.mapbox.com/mapbox-gl-js/example/live-update-feature/).

Planner tests (no WebGL, token or provider network required):

```bash
node --experimental-strip-types --test tests/task-008-planner.test.mjs tests/task-0081-map-booking.test.mjs
```

## Validation

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

## Git Workflow

- `main` contains release-ready work.
- `develop` is the integration branch.
- `feature/*` branches contain new work based on `develop`.
- `fix/*` branches contain fixes based on the appropriate integration branch.

Merge feature and fix branches through review. Do not develop directly on `main`.
