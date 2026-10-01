# TASK-086-B validation

Status: **BLOCKED_NATIONAL_SOURCE_IDENTITY_COVERAGE**. This delivery is an executable offline regional source pipeline and an incomplete national dataset. It is not READY_FOR_REVIEW and is not an audited fixpoint acceptance.

The required inventory has 1038 entries: 327 independently admitted GTFS stops and 711 held national discovery obligations. V2 candidate tiers are preserved as review obligations; they are not accepted graph nodes. No TASK-084 v1 or TASK-085 node is imported. The application's Route API, Planner and public graph contract are unchanged.

## Reproduce

```text
python -X utf8 tools/transport/task-086-extract-gtfs.py
node tools/transport/task-086-run.mjs
node tools/transport/task-086-verify.mjs --publish
node --test tests/task-086-b-mobility-backbone.test.mjs tests/task-086-b-rebuild.test.mjs
node --import ./tests/register-route-ts.mjs --test --test-concurrency=1 "tests/*.test.mjs"
npm run lint
npm run typecheck
npm run format:check:deploy
npm run deploy:build:local
npm run deploy:verify-artifact
```

The parser defaults to the retained, attributed CC BY 4.0 archives, with no network request. Use `--input-dir` and `--output` to re-extract separately. The runner discovers licensed JSON source packages under `data/transport/network/sources`, preserves the required denominator, and selects replay actions by deficits. New source acquisition and rights review remain explicit open work; the runner does not automate external permission decisions.

Batches follow source/operator/route/pattern boundaries and have at most 200 directed edges. Every batch includes inputs, node decisions, evidence references, unresolved fields, output checksum and a sealed QA receipt. A changed source/generator fingerprint invalidates the corresponding batch; a mismatching receipt or output fails closed. `--batch <batch-id>` reruns a single batch, and `--batch <batch-id> --repair` explicitly repairs its corrupt receipt. Per-iteration QA passes before expansion proceeds. `checkpoint.json` records passed batches.

## Evidence

- [Deterministic extraction/rebuild receipt](deterministic-rebuild.json)
- [Connectivity report](connectivity-report.md)
- [Source/license summary](source-license-summary.md)
- [Adaptive report, including every parameter change](adaptive-model-report.md)
- [Acceptance gate](../../../data/transport/network/final-acceptance-gate.json)
- [Required inventory](../../../data/transport/network/required-backbone-inventory.json)
- [Input and output hashes](../../../data/transport/network/manifest.json)
- [Pending source actions](../../../data/transport/network/next-source-actions.jsonl)

Local dependency installation, typecheck, lint and standalone build/artifact verification passed. Local validation is recorded in [the publication receipt](publication-validation.json). Final exact-head CI is linked from the Draft PR description and final execution report after the commit exists. Test fixture flight, rail, Shinkansen and through-service behavior is never counted as real network coverage.
