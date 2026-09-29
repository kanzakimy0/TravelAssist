# TASK-088-A QA

- `coverage-and-identity.json`: 100 exact internalId/Master Code/UUID bindings, per-feature 100/100 coverage, domain and mutation audit.
- `pr437-reference.v1.json`: 17 frozen numeric observations from the unmerged Draft, copied as comparison-only pointers from TASK-087-B's audit.
- `pr437-comparison.json`: all 17 equal/different decisions; the trusted v1.66 baseline retains runtime authority.
- `scoring-compatibility.json`: actual PR #451 service smoke against the TASK-088 repository. This is a cross-branch data-path test, not proof that PR #451 has merged.

Rebuild the source-derived artifacts without network access:

```bash
python3 tools/poi/task-088-trusted-baseline.py --check
```

The builder pins the workbook bytes, checks the sole current Feature43 registry's 43 labels/order, joins exact frozen UUID and historical code to the 100 admitted internalIds and active Master Codes, validates all 4,300 integer 0–9 values, and recomputes the artifact/manifest/comparison. The original Canonical dataset and candidate manifest are never edited. The runtime loader independently checks the artifact, base dataset, runtime manifest, registry definition, membership/order and source workbook pin, then attaches the baseline server-side only.

The v1.66 source reference has restricted redistribution rights. The public Detail projection therefore keeps these internal baseline ratings null even though the server-only Canonical repository and scorer can read them. Current operational facts are never synthesized from baseline values.
