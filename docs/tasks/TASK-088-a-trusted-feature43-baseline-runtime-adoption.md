# TASK-088-A — Trusted Feature43 Baseline Runtime Adoption for Pilot-100

- Issue: #455
- Owner: A
- WBS: 7.4.3
- Base: latest develop
- Branch: `feature/a-trusted-feature43-baseline-runtime`
- Dependencies: TASK-083-A admitted Pilot-100, TASK-087-B / PR #454 audit
- Related Drafts: TASK-081-B / PR #437, TASK-084-A / PR #451
- Auto-merge: No

## Objective

Adopt the existing internal v1.66 Feature43 values as the official trusted baseline scoring input for the fixed 100 admitted Canonical POIs. This is runtime adoption, not a new scoring exercise or a per-cell evidence promotion.

Expected state: exactly 100 Canonical POIs, 43 valid 0–9 values each, 4,300 baseline cells, and 100/100 at 43-of-43. Stop and report a discrepancy if the source, identity or 43-column semantic order does not match.

## Required contract

1. Bind by exact Canonical internalId, active Master Code and legacy UUID; use the frozen TASK-083 manifest and TASK-087 audit as identity inputs. Do not use fuzzy name/coordinate joins or candidateKey as authority.
2. Pin the v1.66 workbook revision and SHA-256, base Canonical dataset hash, runtime manifest hash, Feature43 registry version/hash, artifact hash and deterministic builder version.
3. Attach Feature43 as a separate server-only trusted layer. Keep the admitted identity dataset and Candidate-only import boundary unchanged.
4. Preserve `TRUSTED_INTERNAL_BASELINE != LIVE_FACT`; fresher supported current facts take precedence, while current closure/accessibility booleans remain hard constraints rather than invented 0–9 values.
5. Use the existing TASK-084-A scoring contract. Do not duplicate its scorer or claim calibration/Top-N quality.
6. Freeze and report PR #437's 17 comparisons as equal/different reference observations only. Never average or overwrite the baseline with them.
7. Keep TASK-087-B's historical conclusion intact; the user-approved policy change permits dataset-level internal runtime use without per-cell promotion.

## QA and delivery

Validate 100/100 exact IDs, codes and UUIDs; 4,300/4,300 valid cells; zero ambiguous or name-only joins, ID rebinds and unexplained mutations. Test candidate rejection, tamper/order/hash failure, current-over-baseline precedence, Canonical repository and scorer compatibility. Run targeted and full Node tests, lint, typecheck, build, deployment artifact checks, formatting and `git diff --check`.

Deliver the versioned artifact and manifest, deterministic rebuild tool, QA, Result, WBS update and Draft PR. WBS 7.4.3 is 进行中 during implementation, 待审查 in Draft, and 已完成 only after user acceptance and merge. Do not auto-merge.
