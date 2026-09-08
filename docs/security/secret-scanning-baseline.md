# Secret scanning / global security baseline

TASK-020-A · WBS 9.10 · Owner A · 2026-09-09 · Issue #228

## Purpose and boundaries

This is a repeatable local/CI leakage baseline, not proof that the repository is
universally secure. It adds no dependency, UI, route provider, DB table, cloud
environment, credential rotation or WBS 9.9/9.11/10.x implementation. The SQL-only
migration and existing Auth/DB ownership boundaries remain unchanged.

All findings contain only a safe path, rule category, severity, SHA-256
fingerprint, line number, optional Git object/short commit and remediation.
Never print match groups, surrounding source, raw exception objects or captured
compiler/Git output. Fingerprints of weak values can still permit guessing:
treat the reports as security metadata, not as an anonymization guarantee.

## Reproduce

Use a clean worktree with Node 24 and the existing lockfile. Do not copy private
environment files into it. Stage intended new files first: tracked mode scans
the **working contents of Git-index-listed paths**, not arbitrary untracked
files or the index blob. CI checks out committed contents.

```sh
npm ci
npm run test:security
npm run security:scan
npm run security:history
npm run security:boundary
npm run lint
npm run typecheck
node --experimental-strip-types --test tests/*.test.mjs
npm run security:build
npm run security:bundle
git diff --check
```

JSON reports are regenerated locally in ignored `.cache/security/`.
No source snippets or original values are stored. Reports have no timestamps,
random finding IDs or machine-absolute paths. Unchanged inputs, refs and
allowlist/expiry date produce identical reports. CLI exit: 0 PASS, 1 findings,
2 incomplete/error. Missing build, empty browser output, shallow Git, unsafe
symlink, unreadable file, invalid/expired allowlist and metadata failures do not
claim a clean audit. The build wrapper returns nonzero on any unsuccessful gate.

## Detection

Rules include PEM private-key blocks; GitHub PAT/App token forms; AWS access IDs;
Google API/OAuth markers; Azure shared keys/SAS; Supabase secret/publishable and
legacy role-aware JWTs; Mapbox public versus secret; payment secret keys;
credential-bearing URLs; generic password/API-key/secret/bearer values; env
templates and forbidden public server-secret aliases.

No entropy-only verdict. Exact obvious placeholders are ignored; merely putting
“test”, “fake”, or “example” inside a value is not a blanket bypass. Generic
assignment detection uses a minimum eight-character value. Unquoted JS/TS
assignments are expressions rather than hard-coded string literals; env/YAML/text
unquoted assignments still scan. Vendor signatures apply in every textual file.
Quoted values beginning with a variable-like prefix are not excluded. Detection
is heuristic and does not perform data-flow analysis or deobfuscation.

## Exact allowlist policy

`tools/security/allowlist.json` has a version and 42 reviewed, expiring entries.
Each entry requires **scope + exact path + category + SHA-256 fingerprint +
specific review reason + ISO expiry**. Unknown categories, wildcard paths,
traversal, duplicate keys, absent/short reasons and expired entries fail closed.
Current fixture/prose exceptions expire 2026-12-09; review, do not automatically
extend them. No whole test directory, provider category or all public tokens are
exempted.

Public Mapbox/publishable/anon configuration is not a server secret, but is still
reported for review. Approval of a public fingerprint cannot suppress a secret
category, different value, path or scope. Do not add real secrets to the
allowlist. Investigate locally without exposing the value; if genuine, remove
the exposure and ask the owner to authorize rotation. History cleanup is a
separate explicitly authorized task. No external “is this key valid?” requests.

Existing legacy test literals are grandfathered narrowly with documented
reasons rather than rewriting other tasks. New TASK-020 fake credential material
is assembled in memory; no production-looking complete key is stored in its
fixtures. Historical prose/method labels are separately identified false
positives, not credential approvals.

## Scan coverage / resource limits

- Tracked: Git-listed regular files only; never follow symlinks outside the
  worktree. Ignored private env files and external credential stores are not read.
- History: all blob/commit/tag objects reachable from locally available refs
  after fetch. Includes deleted content and commit/tag messages. Trees are
  metadata, not text. Reflog-only/dangling objects, remote refs not fetched and
  external LFS payloads are outside coverage. A deduplicated blob gets one
  representative path and an associated short commit, not every historical
  rename/location.
- Read object sizes before requesting contents; persistent Git batch reads one
  object at a time. Maximum text object/file is 4 MiB, metadata command output
  128 MiB, individual metadata command 120 seconds, history batch 10 minutes.
  Binary/NUL or invalid UTF-8 is skipped with explicit reason; BOM UTF-16 is
  supported. No archive extraction, image OCR or blanket generated-directory
  exclusion.
- Browser: recursively scans `.next/static/**`, maximum 16 MiB per file.
  Oversized browser files fail incomplete; binary/font assets receive skip
  reasons. All emitted textual chunks, CSS and manifests are included.
- Ordinary tracked/history oversize skips are **coverage exclusions**, not
  “clean contents”. The evidence report names the excluded large catalogs/archive.
  Review growing exclusions rather than increasing limits without bounds.

## Env / server / client boundary

The explicit public-name set is only
`NEXT_PUBLIC_MAPBOX_TOKEN`, `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
New names require a reviewed change to `boundary.mjs`; empty env-template
assignments are checked too. `.env.example` remains blank/placeholders.
Ignore rules cover all other `.env*`, credential JSON names and PEM/key files.
Ignore rules alone do not protect already tracked content: scan remains required.

The existing TypeScript compiler parses runtime static/dynamic/re-export imports,
skips type-only edges, resolves tsconfig aliases and follows transitive graphs
from every `use client` source entry. Private env references require
`server-only`; DB/server/private packages in client graphs fail.
Computed env aliases and nonliteral client imports fail closed. Server Actions
are treated as a Next server reference boundary only with `server-only`.
AST scanning is a guardrail, not complete interprocedural information-flow
analysis; deliberate aliases of globals or unrecognized logging frameworks need
manual review.

Existing lazy DB connection and guarded Auth/Supabase server modules are retained.
Only production public config is available to browser code. The real unused
browser Auth entry is additionally compiled by the existing
`tests/task-018-client-bundle.mjs` audit so tree-shaking cannot conceal it.

## Actual production canary build

`security:build` runs the same installed Next production build entry as
`npm run build`. It refuses root private env files, forwards only a small OS
environment allowlist and injects five **random synthetic** server values into
DB, Supabase, OAuth and private Mapbox variables. The DB URL is deliberately
unreachable loopback. No real cloud connection is required. Captured build
logs are withheld even on failure; failure output is an exit status and hash.

After a successful build, search every browser asset for exact injected values,
private env names and known secret signatures. Only hashes/counts are written.
The separate `security:bundle` command can audit a pre-existing build with static
rules; it cannot recreate the previous in-memory canaries. Prefer
`security:build` for acceptance evidence. These canaries are not vendor keys and
are never external authentication requests.

## Logs and minimal remediation

Reviewed Mapbox config, public Supabase config, request/server clients, Auth
HTTP/errors/user/site helpers, lazy DB entry and the Local DB CLI wrapper.
Runtime application code does not log full auth headers/cookies/env/DB settings.
Local DB tooling already captures CLI output and exposes validated loopback
service URLs only; normalized Auth errors do not forward raw SDK errors.

The AST audit flags direct console/logger calls with credential/config/raw
error arguments. Fixed the older TASK-016 bundle assertion to test a boolean
rather than passing the complete browser chunk to an assertion printer. The new
scanner/build CLI uses fixed error codes/hashes. Do not bypass this by dumping
a failed report's source, process environment or compiler output to CI.

## CI

`.github/workflows/security.yml`: PR, selected branch pushes and manual runs,
Node 24, 15-minute job, read-only contents permission, full checkout history,
no persisted checkout credentials, no production secrets, no external source
upload or report artifact upload. Tracked/history/boundary/scanner tests/full
Node tests/lint/typecheck/canary production build/browser scan are failing steps.
Format is enforced for new security tools; existing unrelated document debt is
reported separately rather than silently reformatted.

Full reachable history was fast locally (about 6 seconds); no truncated history
strategy is used. CI sees its checkout's fetched refs, which can differ from a
developer's local refs. Resource timeout is a failure, not a clean result.
This adds a workflow check; repository branch protection is **not** changed or
claimed to require it remotely. Existing auto-PR/auto-merge workflows are
unchanged; this implementation PR remains Draft.

## Response procedure

1. Stop publication of any new suspected credential; keep reports redacted.
2. Review exact path/category/fingerprint locally with the owner. Never copy the
   value to a comment, chat, fixture or external validation service.
3. Remove a genuine exposure and obtain separate authorization for revoke/rotate.
4. If historical, record affected commit/object and rotation recommendation.
   Do not rewrite history or force-push.
5. Rerun all gates. Only explicit, scoped non-secret/public-fixture exceptions
   may enter the expiring allowlist.
6. Keep WBS 9.10 待审查 and Issue #228 Open until user acceptance and develop merge.
