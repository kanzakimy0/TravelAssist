# TASK-086-B QA — phase167 full-original continuous execution

Latest full-original authorization supersedes the seven-airport stopping rule. Phase165–167 added Aomori, Akita and Matsuyama ground chains. Niigata and all remaining original roots stay active; a checkpoint/report never stops execution. See [current report](stage-closeout-report.md), [root index](residual-root-index.md), [validation](publication-validation.json), [rebuild receipt](deterministic-rebuild.json), and [preservation](phase167-preservation.json).

Input scope: `TASK086-FULL-ORIGINAL-PHASE167-v2`. VERIFIED_CORE_CHECKPOINT_WITH_BLOCKERS requires all nine technical checks plus a fresh code/input/scope-bound rebuild receipt. Missing/stale/expired/malformed proofs remain UNVERIFIED; technical/rebuild failures remain FAILED. Full task completion additionally requires all original applicable acceptance, without unresolved work. WBS7.16 remains in progress; PR466 remains Draft.

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

PowerShell sets `$env:TASK086_PUBLISH_VALIDATION='1'` first. CI omits publication and verifies in isolated scratch directories. `--final` continues to reject ordinary incomplete national work. Local full regression 2932/2932 PASS. CI separately records branch HEAD and actual checkout: PR merge testing is identified as merge testing; a matching workflow-dispatch checkout can be reported as direct HEAD testing. Historical159/162 CI cannot validate this new revision.
