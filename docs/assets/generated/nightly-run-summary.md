# Nightly Run Summary

Mode: resume. Required validation failures exit nonzero; unchanged upstream formatting failures are not relabeled Passed. Logs/checkpoint remain ignored in .cache/asset-pipeline. No automatic Git commit, Issue write or merge.

## Processing

```json
{
  "account": {
    "newBytes": 0,
    "written": 0,
    "skippedUnchanged": 1141,
    "resumeRecovered": 1141,
    "sourceChanged": 0,
    "unnecessaryRegenerated": 0,
    "previousLogicalCount": 3550
  },
  "protection": {
    "modified": 0,
    "deleted": 0,
    "renamed": 0,
    "protectedShaChanged": 0,
    "paths": []
  },
  "failure": null
}
```

## Validation

| Command                | Exit code |
| ---------------------- | --------- |
| assets:verify-variants | 0         |
| test:asset-variants    | 0         |
| assets:validate        | 0         |
| test:assets            | 0         |
| lint                   | 0         |
| build                  | 0         |
| typecheck              | 0         |
| format:check           | 1         |

## Tracking

TASK-013.1-A / Issue #116 / WBS 2.14; see Task Result for immutable delivery commits and Draft PR. Reports and review are generated even when project validation fails.
