# TASK-039 Independent Blind Review Protocol

## Purpose

This protocol tests whether independent human travel judgments support the TASK-038 scoring candidate. It separates human evidence from the machine-authored calibration benchmark and from all candidate scores.

Current state: **Prepared / Awaiting Human Review**.

## Frozen review set

- 144 items total.
- 96 primary validation items: 8 for each of 12 traveler scenarios. Selection uses only stable POI identity, geography, neutral broad category, and a deterministic seed.
- 24 near-score diagnostic items: 2 for each scenario. Candidate score proximity is used internally only; these items never enter the primary pass/fail percentage.
- 12 machine-benchmark audit items: one for each scenario across available machine-confidence bands. Machine answers stay internal until Human Gold is frozen.
- 12 hidden repeat items: one primary item per scenario, repeated later under another blind ID.

Non-repeat canonical tasks are unique. Hidden repeats are the only intentional canonical duplicates.

## Procedural blinding

The project maintainer uses this internal protocol. Reviewers receive only:

1. `reviewer-guidance.md`;
2. their assigned reviewer pack;
3. a copy of `reviewer-response-template.json` populated with their pack's blind IDs.

Reviewers must not inspect `internal-review-map.json`, TASK-038 evidence, source code, another reviewer's response, or candidate output before both R1 and R2 responses are frozen. This repository is not a cryptographic secret store, so the separation is procedural.

## Independent collection

- Use reviewer codes only (`R1`, `R2`, and `R3` if adjudication is needed).
- Do not collect names, emails, or unrelated personal information.
- R1 and R2 work independently and cannot see each other's responses.
- Each response must cover all 144 blind IDs exactly once.
- Record the submitted response file SHA-256 before any analysis.
- Do not edit choices or confidence after checksum freeze.

## Analysis gate

The analysis tool normalizes each reviewer's displayed A/B orientation back to the canonical pair. It then measures hidden-repeat consistency, raw agreement, agreement excluding insufficient-information answers, per-scenario agreement, A/B-versus-tie disagreement, insufficient-information rate, and Cohen's kappa.

Review-quality gates are:

- hidden-repeat consistency at least 85% for each reviewer;
- raw inter-rater agreement at least 70%;
- Cohen's kappa at least 0.55 when computable.

If a gate fails, report `insufficient_human_agreement` and do not evaluate the candidate.

## Adjudication and Human Gold

Unresolved primary disagreements require a blind R3 adjudication pack that omits R1/R2 answers and all machine information. Codex, scripts, and other AI systems cannot adjudicate. Unresolved non-primary rows remain `UNRESOLVED`.

After agreement/adjudication is complete, freeze `human-gold-v1.json` and its SHA-256. Candidate evaluation is permitted only after that checksum exists and verifies. Candidate parameters cannot be changed in TASK-039.

## Candidate decision boundary

Primary metrics use only resolved Human Gold among the 96 primary rows. Fewer than 60 usable primary rows yields `insufficient_human_coverage`. Near-score and machine-audit rows remain diagnostics. No TASK-039 result freezes production parameters.

## Current stop condition

No real human responses were supplied during preparation. Therefore completed response files, Human Gold, candidate human evaluation, and machine-versus-human conclusions are intentionally absent.
