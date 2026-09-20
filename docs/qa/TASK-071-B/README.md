# TASK-071-B — Official / SNS Evidence Expansion QA

TASK-071-B starts from the authoritative rerun at
`df6d253ecba58e28afa12b79751c72414315acb2`. It uses the existing
candidate-sidecar, provenance, locator, cache, checkpoint, and review QA
contracts; it does not create another POI truth model.

## Frozen priority populations

The phase manifests in `data/poi/full/manifests/task-071/` are the only
membership and ordering authority for this task. They are sorted by
`candidateKey` and contain 53 batches of at most 200 candidates.

| Phase | Pending reason | Candidates | Batches |
| --- | --- | ---: | ---: |
| A | `TARGET_IDENTITY_UNRESOLVED` | 6,049 | 31 |
| B | `IDENTITY_CONFLICT` | 165 | 1 |
| C | `REVIEWED_TARGET_NO_SUPPORTED_FACT` | 1,422 | 8 |
| D | `UNSUPPORTED_FIELDS_REMAIN_NULL` | 2,461 | 13 |

The frozen phase generator checks the complete 10,097-candidate population,
deterministic ordering, batch sizes, and all protected upstream checksums:

```powershell
python -X utf8 tools/poi/freeze-task-071-phases.py --check
```

## Per-batch acceptance

An enriched fact is accepted only after a target-scoped source has been
opened and read, its ownership tier is recorded, and its exact text locator
and hashes validate. Search snippets never count as evidence. An official SNS
post additionally needs preserved ownership proof before it may supply a
fact. Missing or insufficient evidence remains `null` with the search trail
and a future requery/manual-review reason.

No batch may modify a Master Code, Registry binding, candidate key, prior
supported field, or protected upstream checksum. The final report will list
all source-tier, identity, 43D, Visit Profile, Access Anchor, error-queue,
and deterministic-rebuild results.
