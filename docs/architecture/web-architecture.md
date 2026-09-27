# Web Architecture

TravelAssist Web uses Next.js, React, TypeScript, and Tailwind CSS. It uses the Next.js App Router under `src/app` and keeps TypeScript strict mode enabled.

## Source Boundaries

- `app/`: routes, route layouts, route-level loading and error states, and global styles.
- `components/`: reusable presentational UI, split into `ui`, `layout`, and `common`.
- `features/`: future domain-oriented product functionality. Task 1 intentionally leaves it empty.
- `lib/`: framework-independent helpers and integration infrastructure.
- `hooks/`: reusable React hooks.
- `types/`: shared TypeScript types and API contracts that are not owned by one feature.
- `data/`: static or local seed data; it does not select a database provider.
- `constants/`: stable, shared constants without UI behavior.
- `styles/`: shared style assets that do not belong in the global stylesheet.

Keep reusable business rules, models, validation, and API contracts independent from React pages where practical. This preserves a path for future sharing with a mobile app without introducing a monorepo prematurely.

## Selected External-Service Baseline

The foundation-stage deferral for map, AI, database, and authentication has been superseded by later frozen decisions:

- Map display: Google Maps Platform / Maps JavaScript API.
- Routing: Google Routes API behind the provider-independent Route Contract.
- POI: TravelAssist-owned Supabase PostgreSQL + PostGIS; Google Places is not a core POI source.
- AI default: GPT-6 Luna behind AI Gateway / Model Router.
- Authentication / database baseline: Supabase Auth + Supabase PostgreSQL / PostGIS.
- POI image object storage: Cloudflare R2.

Provider ownership, licensing, caching, cost controls, and Google-content exclusions are defined in `map-routing-poi-ai-provider-policy-v1.md`.

## Deferred Decisions

State-management implementation details, the final mobile framework, Japan transit fallback policy, and hotel / restaurant / weather production providers remain separate decisions.
