# Canonical supporting hash audit

TASK-085-B / 2026-09-30 / amendment 41389de330df33091af9d33cc825ea8d4387a92d.

The mismatch originates in TASK-083-A's authorizing commit 32154893fc314844760d059d59a3ef141d462882; it is not later POI membership drift. Git history across all refs has one content commit for the runtime and sample manifests. Both committed blobs remain unchanged at the TASK-085 base develop and current branch.

| Representation | Bytes | SHA-256 |
| --- | ---: | --- |
| Committed sample, LF | 77980 | 6d6187e53f6235abc757795896b8ba441736ce078e1e5b3e0c70df14c4709d51 |
| Same content, reconstructed CRLF | 80089 | 77e239e0b5092f38e85f1d4e7035cf2ece2956128b5c01dbabdffc11b08d2c82 |

The declared runtime sampleManifestSha256 and TASK-083 pilot100-handoff.json equal the reconstructed CRLF hash exactly. tools/qa/task-083-pilot100.mjs reads the existing sample and hashes raw file bytes (runtime manifest construction, line 319); it does not rewrite that supporting file. Repository .gitattributes normalizes text to LF. This establishes an authoring-checkout line-ending hash that became stale on Git normalization. JSON content and membership are identical in the two representations.

B has changed neither upstream file nor the declared hash. The strict byte-integrity gate remains FAIL, with a diagnosed Canonical-owner correction: regenerate the authoritative runtime manifest and handoff receipt using the committed LF sample bytes, then have A validate/authorize the corrected supporting hash. Do not broaden membership, import candidate/workbook records, or suppress the comparison.

Machine audit: data/transport/access/inputs/canonical-supporting-hash-audit.json. Reproduce by reading the sample blob from the authorizing commit, hashing the bytes, then replacing each LF by CRLF and hashing again. No provider query is involved.
