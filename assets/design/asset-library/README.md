# TravelAssist Asset Library v1

TASK-013-A / Issue #112. This is a shared foundation, **not a page redesign or a completed photo library**.

## Original source and rights

`source/original-shapes.mjs` is the editable source for all 69 new SVGs. Shapes were authored as simple project-specific geometry for this task, without copying a third-party icon pack. `TravelAssist-original` records project usage permission for these drawings (commercial use, local caching and derivatives). It is not an assertion of exclusive copyright over commonplace geometry. Source type is `brand_owned` for icons and `placeholder` for fallback scenes; all are `symbolic`.

Warm ivory `#fbf4ea`, muted coral `#d97b70` and blue-grey `#475665` follow existing theme direction. SVGs contain no fonts, raster, animation, network references or scripts. Map warnings use a triangle/exclamation; errors use an octagon/cross; selected uses a check. Status is never conveyed by color alone.

## Reproduction and review

1. `node tools/assets/generate-foundation.mjs` generates original SVGs, manifest, five packs and procurement CSV from reviewed source definitions.
2. `npm run assets:inventory` scans legacy images without changing them.
3. `npm run assets:index` generates the index, reports and static light/dark contact sheet.
4. `npm run assets:validate` and `npm run test:assets` check contracts, rights, integrity and fallbacks.
5. Format task-owned text using the existing Prettier installation before committing. Re-index after changing asset bytes. Generators are offline and do not alter existing application code or protected images.

Open `previews/asset-library-preview.html` directly in a browser. Icons render inline for light/dark `currentColor` inspection. In applications, external SVG `<img>` does not inherit the parent's color; inline the reviewed SVG for tinting, or use its monochrome default. The caller supplies an accessible name, or empty alt / aria-hidden for decoration. Placeholders must retain their symbolic description, not a claim of documentary accuracy.

## Catalog and runtime contract

Canonical JSON lives in `docs/assets/catalog/`. TypeScript `src/data/assets` only reads those catalogs; it does not fetch or cache remote content. Snapshot-returning helpers prevent consumers from changing registry permissions. An approved local asset needs explicit commercial/cache/derivative permission and a nonexpired license. Provider-only resolution returns **provider/source IDs without a local path**; the future caller must use a licensed provider adapter or request a placeholder by category. CDN metadata is reserved; delivery is intentionally not enabled.

Fallback order is approved entity → destination category → destination generic → global category → no image. Destination-category maps are initially empty (no fake destination/category art is claimed); tests exercise future configured overrides. Hotel, restaurant and activity have different global drawings. Broken catalogs return `kind: none`, never recurse.

## Procurement, not fabricated entities

Five packs contain 25 requests each: desktop + mobile hero, 3 area covers, 8 S landmark-symbol requests and 12 A POI-photo/provider requests. Four landmark candidates occur in the existing Planner fixtures. These are **candidates**, not authoritative entity records; translations, entity identity and acquisition rights still need verification. All other entries explicitly remain unresolved role/area requests. No coordinates, provider IDs, photo URLs or rights are fabricated. Empty rights mean pending, not permitted. A request's symbolic metadata denotes its empty placeholder slot, not the eventual photo's authenticity.

No photographs were purchased, downloaded or generated in this task. No approval is inferred from an old filename, metadata file, user screenshot or source hash. All legacy entries remain `legacy_review_required`; metadata discovery and literal code-reference discovery are audit hints, not legal approval or a full usage graph. Original paths stay intact. Review before any subsequent migration or production photo acquisition.

## Next tasks

Page integration, real photo procurement, licensing approval, CDN, variants and unattended production are separate tasks. TASK-013.1 may begin only after this task is merged and accepted. Do not start TASK-013.2 based on a Draft PR.
