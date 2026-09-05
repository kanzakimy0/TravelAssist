# Personal Center visual assets

This directory documents the visual assets used by the B-owned Personal Center module.

## WBS 5.1 — Shell / Navigation

### Production asset

- `public/media/personal-center/sidebar-torii-watercolor.svg`

Purpose: decorative artwork at the bottom of the Personal Center sidebar.

Frozen visual requirements inherited from `docs/ui/personal-center.md` and `docs/ui/personal-center-shell.md`:

- vermilion torii
- water / lake
- distant generic mountains
- restrained cherry blossoms
- subtle seigaiha / washi texture
- warm ivory / low-saturation palette
- no text, slogans, calligraphy, temple panorama, or dominant Mount Fuji composition
- artwork remains inside the Sidebar and may be cropped when vertical space is limited

The production SVG is also the canonical editable source for this asset to avoid design/runtime drift.

## Not image assets

The following WBS 5.1 visuals remain code-driven and must not be replaced by raster image files:

- navigation icons
- notification icon
- avatar shell / placeholder
- buttons and focus states
- active navigation state
- card borders, shadows and background gradients

Travel photos shown in the WBS 5.1 mock home continue to reuse the existing authorized Home poster until their owning Trip/Profile tasks define final content assets.
