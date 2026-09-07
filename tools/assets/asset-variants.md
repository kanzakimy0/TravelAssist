# Asset variants operator guide

Owner A / TASK-013.1-A / Issue #116. This is an additive asset-library API, not an application integration or an authorization workflow.

## Sources of truth

- Parent `docs/assets/catalog/asset-manifest.v1.json`: identity, provenance, rights, runtime and authenticity. Scanning never approves a legacy file.
- `asset-size-profiles.v1.json`: pixel dimensions, encoding, budgets and SVG display bounds.
- `asset-processing-policy.v1.json`: role-to-profile mapping, resource limits and processing rules. `assetType` aliases adapt the actual parent schema; no parallel migration/schema history.
- Source, usage and variant catalogs are generated. Never hand-edit generated catalogs to grant rights or enable a URL.

The inventory includes all visual files in public, assets/design, docs, src/app and the repository root. Documentation evidence is included even if orphaned. Only identifiable asset manifests, web manifests and Lottie JSON are visual metadata; ordinary JSON is not a source. Generated output is not recursively input. Symbolic links are excluded for path safety. Unresolved literal/historical references are reported, never assumed to be live broken pages.

## Operation

After an approved source has entered the parent manifest, use the existing npm scripts: `assets:catalog`, `assets:derive`, `assets:verify-variants`, `assets:review`, or `assets:nightly` for the complete offline workflow. `assets:nightly:resume` continues completed source work. `--dry-run`, `--verify-only` and `--rebuild` apply to the nightly entry. Verification-only does not regenerate output; rebuild cannot override permission, no-upscale or byte limits.

`ASSET_PIPELINE_CONCURRENCY=1..4` (default 2); `ASSET_PIPELINE_RESUME=1`; `ASSET_PIPELINE_REBUILD=1`; `ASSET_PIPELINE_MAX_NEW_BYTES` may only lower the 100 MiB hard budget. A single image/profile is retried at most once. Completed sources checkpoint individually. A lock can only be recovered automatically after 12 hours and when its local PID no longer exists; cross-host, malformed or live locks are not stolen.

Temporary writes are atomic and ignored by Git. Normal failures clean their own temporary file. An abrupt OS/process termination may leave an ignored temporary fragment; inspect it rather than blindly pruning unknown files. Unrecognized or obsolete generated files are reported. Existing original paths, bytes and names are never altered. Nightly compares every source with an ignored pre-run snapshot.

Nightly runs tests, parent validation, lint, build, typecheck and formatting without installation/network commands. Build precedes typecheck so Next's generated route types exist. Any required failure exits nonzero, including known upstream formatting exceptions. Logs and checkpoint stay in `.cache/asset-pipeline`; the committed summary accurately records failures. Issue/WBS/Result updates and Git publication remain explicit operator steps, not unattended external mutations.

## Optional presentation metadata

`presentation.safeArea = { x, y, width, height }` is a normalized rectangle. Cover cropping must include it; impossible crops are unavailable/review-required. Missing focal points can produce center crops for review but cannot create approved runtime URLs. Explicit `presentation.brandIconSource = true` is required for raster favicon/touch/PWA generation. A profile cover may request `additionalProfiles: ["background-mobile"]`; no other arbitrary profile injection is accepted.

Sources below target resolution are never enlarged. Generic dimensions are bounding boxes, not forced squares. Identical maximum sizes and identical encoded bytes share aliases. Special profiles that cannot be satisfied are unavailable and runtime lookup tries a safe generic variant, then the parent fallback. `share-og` is JPEG; other photo profiles are WebP, designated brand icons PNG. EXIF orientation is applied; GPS, serial numbers, XMP/IPTC and original EXIF are removed; only built-in sRGB ICC is attached.

## Runtime contract

Import from `src/data/assets/index.ts`: `getAssetSource`, `getAssetVariant`, `getResponsiveAsset`, `getResponsiveImageProps`, `getVectorDisplaySize`, `listMissingVariants`, `listAssetUsages`. All calls are offline and return snapshots. Resolution statuses distinguish exact, alias, degraded, fallback, review_required and unavailable. Review-only pixels are never exposed as runtime URLs. Aliases are bounded/cycle-checked and both grants are rechecked for expiry. Responsive srcSet contains unique actual widths and matching aspect ratios, not invented descriptors. SVG tokens are display bounds; consumers should preserve intrinsic aspect ratio (`object-fit: contain`).

No Home, Start, Planner or Personal Center component consumes the new APIs in this task. Other owners may adopt the additive contract in a separate reviewed task. No business state, Provider SDK, Auth, DB, image acquisition or cloud storage has been added.

## Acceptance

Run `test:asset-variants` for actual synthetic-image processing, controlled interruption, lock and rights tests. Fixtures live only in ignored `tmp/assets-nightly`, contain artificial solid colors, and are removed after tests. They are not destination photographs or production catalog entries. Optional `review-variant-browser.mjs` uses externally supplied existing Playwright/Chrome, never an additional package dependency. Browser screenshots remain ignored; the JSON audit is committed.
