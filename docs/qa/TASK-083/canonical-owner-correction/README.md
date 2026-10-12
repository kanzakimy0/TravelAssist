# Canonical owner correction QA

The authoritative owner decisions are in `src/shared/data/canonical-poi-pilot100.access-adjudication.v1.json`, bound by the runtime manifest. See [Result](../../../tasks/RESULT-TASK-083-a-canonical-owner-correction.md) for the five decisions and B handoff.

## Reproduce

~~~sh
node --import ./tests/register-route-ts.mjs tools/qa/task-083-pilot100.mjs
node --import ./tests/register-route-ts.mjs tools/qa/task-083-owner-correction.mjs
python tools/poi/task-088-trusted-baseline.py --check
node --import ./tests/register-route-ts.mjs tools/qa/task-084-real-pilot100.mjs --check
node --import ./tests/register-route-ts.mjs --test tests/task-083-canonical-owner-correction.test.mjs tests/task-083-a-poi-runtime.test.mjs tests/task-088-a-trusted-baseline.test.mjs tests/task-084-a-real-pilot100.test.mjs
~~~

Owner audit requires the frozen develop base commit to be present in Git history. It checks membership/order, exactly five permitted record changes, original positions/identities, unchanged sample/registry/admission/Feature43 bytes, the LF/CRLF root cause and zero changes to B transport artifacts.

Tests cover real runtime loading, all 100 Detail requests, preserved graph admission, stale/missing/tampered authorization, rehashed invalid/duplicate/redirected owner decisions, explicit unavailable visitor endpoints and distinction between active code ownership and venue lifecycle. The 95 remaining assessment records are not asserted to have verified access merely because they are outside this adjudication.

Local final results and log hashes are in [local-validation.json](local-validation.json). Exact-head PR and merged-develop CI receipts are kept in the correction PR body so committed artifacts do not contain a self-referential head hash.

No transport topology generation, national source rediscovery, Provider request, change to PR #464, or TASK-086 work occurred.

## Local verification

- Focused: 20/20 PASS. Full regression: 2,829/2,829 PASS.
- Lint: 0 errors / 10 existing warnings. Typecheck and format:check:deploy PASS.
- Deployment validation, production build and artifact verification: PASS, 1,908 files.
- Read-only TASK-083 generator, owner correction audit and trusted baseline replay: PASS.
- Sample, registry, original admission receipt and Feature43 artifact: byte-identical.
- B Transport topology: zero changed files.
