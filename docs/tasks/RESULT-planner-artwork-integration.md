# Planner existing artwork integration

## Status

Implemented and verified locally on 2026-09-07. Preview: `http://127.0.0.1:3113/planner`.
Branch: `codex/planner-responsive-density`; HEAD: `1bcd820957cc6a6f0b58f4914e0a0110163304dc`.
No commit, push, PR update or merge in this follow-up. Existing uncommitted work is preserved.

## Scope

- Copied five existing originals and their provenance README from the original workspace into the active preview checkout. Copies were checked against source SHA-256 hashes; no image generation or modification of original pixels.
- Tokyo Tower, Skytree, Senso-ji, Fuji / Kawaguchi and Hakone / Ashi illustrations now populate matching map markers, the three recommendation thumbnails, and the shared Planner / Detail project artwork.
- Added an explicit shared artwork registry. Unknown destinations, hotels, restaurants and unrelated attractions keep their original symbolic artwork. Tokyo Tower and Skytree are separate identities.
- All five are AI illustrations, not documentary photographs. Cards display `AI 插画`; map markers display `AI`, with a visible map disclaimer and accessible descriptions.
- Next Image serves same-origin optimized variants. Existing card dimensions and selection handlers remain unchanged. The circular Skytree original is presented inside its existing detail frame without black corner wedges or cutting off the tower.
- Image errors retain the original symbolic fallback. Mapbox sprite installation also handles optional image failures and component unmount.

## Validation

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `node --test tests/*.test.mjs`: 243 passed, 0 failed. Four new tests cover the five local assets, precise matching, unchanged map coordinates/state, and Mapbox sprite success/failure/unmount handling.
- `npm run build`: passed.
- Prettier check: all files changed for this integration passed. No claim of a clean global formatting baseline; unrelated pre-existing formatting was not rewritten.
- `git diff --check`: passed.
- Browser QA at the existing 1280 × 720 viewport: all three recommendation images loaded; single-day temple / Skytree markers and full-trip Tokyo / Kawaguchi / Hakone markers displayed; both Planner and Detail opened exactly one shared project inspector with a loaded illustration; no horizontal page overflow; no console errors or warnings in the QA tab.
- Original user tab was not reloaded, and no browser save action was taken during QA. The 3113 preview was rebuilt and restarted.

## Limitations / Non-goals

- The preview still has no configured Mapbox token, so browser QA used the interactive fallback map. Real Mapbox sprite rendering is not browser-verified in this follow-up; the adapter path is covered by unit tests.
- No token, cloud secret, provider API, paid route calculation, asset acquisition or new dependency was introduced.
- This integrates five existing illustrations only; it does not complete TASK-013 / TASK-013.1 / TASK-013.2, produce the 9,000 attraction images, or assert licensed photographic coverage.
- Failure behavior was covered by unit tests; network failure was not forcibly injected into the live browser preview.

## Files in this follow-up

- `public/media/planner/`: five PNG originals and provenance README.
- `src/features/planner/data/planner-artwork.ts`.
- `src/features/planner/components/planner-artwork.tsx`.
- `src/features/planner/planner-artwork.module.css`.
- Artwork integration within `plan-recommendation-list.tsx`, `place-details.tsx`, `planner-map-shell.tsx`, `map/map-provider.ts`, and `map/map-visuals.ts`.
- `tests/planner-artwork.test.mjs`; existing map test import initialization and recommendation structure regression allowances adjusted for the explicitly authorized image replacement.
- This Result and the local follow-up note in Master WBS.
