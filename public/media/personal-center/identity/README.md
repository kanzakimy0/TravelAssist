# Personal Center identity SVG assets

> Owner: B · Related WBS: 5.1 · Date: 2026-09-05  
> Delivery: **PARTIAL — identity assets only; trip photographs are not included.**

## Files

| File | Dimensions | Purpose | State |
| --- | --- | --- | --- |
| `travelassist-mark-soft.svg` | 128 × 128 | Existing compass exported on a warm-pink circular surface | Ready as an asset; not integrated; not a newly approved final logo |
| `travelassist-mark-mono.svg` | 128 × 128 | Transparent single-ink variant of the same compass | Ready as an asset; not integrated |
| `avatar-traveler-default.svg` | 256 × 256 | Abstract default avatar when no user image is available | Ready as an asset; not integrated; not a real user's portrait |

These are **two independent asset groups in three SVG files**. Both mark files depict the same compass; do not count them as two different logos. SVG files are their own editable source, so no divergent design-directory duplicate is added.

![Soft compass export](travelassist-mark-soft.svg)
![Monochrome compass export](travelassist-mark-mono.svg)
![Default avatar](avatar-traveler-default.svg)

## Visual and provenance notes

The palette follows the existing Personal Center Shell: warm ivory, pale peach and muted coral. Compass geometry is retained from `src/features/personal-center/components/personal-icon.tsx`; it is an export of existing project artwork, not a claim of a new original or trademark-cleared brand. The avatar is a programmatically authored abstract silhouette, not AI-generated photography and not a likeness of Yuki or any actual person. No external images, font files or scripts are embedded.

Keep the TravelAssist name as accessible live page text. Do not replace navigation labels, buttons or entire cards with rasterized UI. These files do not automatically change any page.

## Integration boundaries

- Paths start with `/media/personal-center/identity/` at runtime; do not include `/public` in URLs.
- Preserve user-supplied avatars. Only use the default asset for missing images or an explicit fallback. Continue to show a user's accessible name outside decorative artwork.
- The soft mark already includes a circular surface; avoid placing a second opaque circular background behind it. Use the transparent variant when the component provides the surface.
- Keep explicit display dimensions; check the logo at 24/32px and avatar at 38/52px in the actual page.
- Use empty `alt` when an adjacent name conveys the same information. An image-only link/button needs an accessible name at the control level.
- Preserve the existing Sidebar artwork, main texture, five primary navigation items, avatar menu and all existing B work.
- Do not change Main Header, global favicon, A's homepage or Step 1–5 as part of this asset export.

## Remaining gaps

Three independent photographic scenes are still **NOT_GENERATED_OR_UPLOADED**: Izu, coast, and weekend travel. An Izu scene can supply both the Hero and Izu-card crops, resulting in four eventual photographic export files, not four independent scenes. Realistic photography remains required by `docs/ui/personal-center.md`; illustrative stand-ins are not an accepted substitute.

A distinct final logo is also **not declared frozen** by these exports. Real user portraits are user data, not generic website assets to invent.

See `manifest.json` for hashes and per-file status, and `docs/project/B-MISSING-ASSET-DELIVERY-2026-09-05.md` for the delivery record. No formal implementation Task is created by this package.
