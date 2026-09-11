# TravelAssist POI Expansion8000 consolidated v4.1

Generated from the v4.0 `old2979` recompute branch and the v4.0 `new5021` tertiary branch, using the retained v3.9 Expansion8000 master only to recover the original old2979 slot/master-code allocation.

## Result

- Expansion feature rows: **8,000 / 8,000**
- Unique expansion slots: **8,000**
- Unique effective master codes: **8,000**
- Unique source entry IDs: **8,000**
- `source_ready=true`: **2,426** (v3.9: 1,419; net **+1,007**)
  - old2979: **982**
  - new5021: **1,444**
- Modern-presence second review: **5,574**
- Feature schema: **POIFeatureV1.1-43D** on 8,000 / 8,000 rows
- 17,000 effective index retained; Expansion 8,000 rows refreshed
- Final validation: **PASS**

## Evidence policy

`source_ready=true` means current identity corroboration is sufficient for feature enrichment. It does **not** prove public access, opening hours, admission, reservations, or current visitor availability. Unknown deterministic fields remain unknown rather than being guessed. Record-level feature profiles remain `second_review` where subjective fields are not high-confidence.

## v3.9 -> v4.1 delta

- `source_ready`: 1,419 -> 2,426 (**+1,007**)
- Feature values changed: **30,091 cells / 3,803 records**
- Feature confidence changed: **117,974 cells**
- Two old2979 Japanese names differ only by bracket-glyph normalization (`〖〗` -> `【】`); source IDs, coordinates, prefectures, and types remain stable.

## Generated artifact

- File: `travelassist-poi-expansion8000-consolidated-v4.1.zip`
- SHA-256: `e95729269b5edca936e68d07a12ed1d65cda6d9ce5079cf18ebfbde34abb3a60`
- ZIP size: 4,329,068 bytes

The ZIP contains the consolidated Feature43 file, source-enriched master, source-ready subset, second-review queue, refreshed 17,000 effective master index, distribution, lineage, manifest, consolidation report, and final validation report.
