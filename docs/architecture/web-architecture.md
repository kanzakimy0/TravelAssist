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

## Deferred Decisions

Map, AI, database, authentication, state-management, and mobile technologies are deliberately not selected in the foundation stage.
