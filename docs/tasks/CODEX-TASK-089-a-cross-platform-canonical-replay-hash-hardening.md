# CODEX — TASK-089-A Cross-platform Canonical Replay Hash Hardening

Repository:
https://github.com/kanzakimy0/TravelAssist

Issue:
#459

Read:
```bash
git show origin/docs/task-089-a-cross-platform-replay-hash-hardening:docs/tasks/TASK-089-a-cross-platform-canonical-replay-hash-hardening.md
```

Start from latest develop on:
```text
fix/a-canonical-replay-cross-platform-hash
```

Do not change POI identity, sample membership/order, Master Codes, admission decisions, Feature43 baseline, or scoring.

Fix only the cross-platform replay/hash defect.

Current root cause:
TASK-083 hashes generated text using raw working-tree bytes. LF and CRLF materializations therefore produce different SHA-256 values despite identical semantic content.

Required:
- add versioned stable text hashing (UTF-8 + EOL normalization or canonical JSON/JSONL semantic hash);
- keep raw byte SHA for XLSX/binary files;
- update TASK-083 generator and replay;
- add correction audit for old CRLF-sensitive hash vs LF/current stable hash;
- prove 100 IDs / 100 Master Codes / order / admission unchanged;
- test LF and CRLF variants produce identical stable text hash;
- run full regression and exact-head Quality Gate.

Create Draft PR only. No auto-merge.