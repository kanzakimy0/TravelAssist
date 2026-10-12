# Full quarantine re-certification

11556 typed prior exclusions recomputed. Transfers are a subset of edges. No sampling or old quarantine decisions reused.

| Kind | Before | Engine-only pass A | Final pass C | Engine recovery | New evidence recovery | Disabled |
|---|---:|---:|---:|---:|---:|---:|
| node | 1174 | 4060 | 4061 | 2886 | 1 | 0 |
| edge | 2460 | 9407 | 9409 | 6947 | 2 | 0 |
| transfer | 37 | 1072 | 1072 | 1035 | 0 | 0 |

Each old ID, old reason, new required-fact proof, exact supported source capability and new-evidence flag is retained in deterministic JSONL chunks indexed by quarantine-recertification-diff.json.
