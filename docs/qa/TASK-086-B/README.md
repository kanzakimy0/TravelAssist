# TASK-086-B QA — phase164 fixed seven-airport checkpoint

**Verified checkpoint with four core airport blockers; nationwide incomplete.** Phase163 closes Kagoshima and Kitakyushu; phase164 closes Izumo through Matsue and Okayama. All original requirements and earlier phase files remain intact. See [six-part report](stage-closeout-report.md), [root index](residual-root-index.md), [validation](publication-validation.json), [rebuild receipt](deterministic-rebuild.json), and [preservation](phase164-preservation.json).

Input scope: `TASK086-CORE-AIRPORTS7-PHASE164-v1`. Core stage `VERIFIED_CORE_CHECKPOINT_WITH_BLOCKERS` is allowed only after all nine technical checks and a fresh input/code/scope-bound rebuild receipt pass. Missing, stale, expired or malformed receipts yield UNVERIFIED; technical/rebuild failure yields FAILED. Ordinary airport research is never an exception proof. WBS7.16 and nationwide work remain in progress; PR466 remains Draft.

## Reproduce

Run shared-output graph writers/validators serially, using writable TEMP/TMP. The full suite embeds independent extraction, two clean builds, checksum resume and corruption/invalidation negative tests. Do not repeat an identical graph-only verifier after it passes.

```sh
TASK086_PUBLISH_VALIDATION=1 node --import ./tests/register-route-ts.mjs --test --test-concurrency=2 "tests/*.test.mjs"
node tools/transport/task-086-stage.mjs
npm run lint
npm run typecheck
npm run format:check:deploy
npm run deploy:build:local
npm run deploy:verify-artifact
```

PowerShell sets `$env:TASK086_PUBLISH_VALIDATION='1'` first. CI omits publication and verifies in isolated scratch directories. `--final` continues to reject ordinary incomplete national work. Local full regression 2928/2928 PASS. CI separately records branch HEAD and actual checkout: PR merge testing is identified as merge testing; a matching workflow-dispatch checkout can be reported as direct HEAD testing. Historical159/162 CI cannot validate this new revision.
