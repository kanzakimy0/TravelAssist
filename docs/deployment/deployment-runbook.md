# TravelAssist Deployment Runbook

## Current capability audit

At TASK-025-A start, GitHub contained no configured Environments and no Actions Secret names. The repository had only `auto-create-pr.yml` and `auto-merge.yml`; neither installed dependencies, ran the test suite, built an application artifact or deployed one. No Vercel, AWS, Cloudflare, Netlify or other approved platform project configuration was present.

PR #231 contains a separate, unmerged security baseline and is not copied here. PR #245 contains separate, unmerged observability work and is not a dependency of this local release chain.

## Repository quality gate

`.github/workflows/quality-gate.yml` runs on pull requests, pushes to `develop` and manual dispatch. It has read-only repository permission and receives no deployment Secret. It performs locked installation, environment contract validation, the real Node test suite, lint, typecheck, engineering-surface format check, standalone build, artifact audit and whitespace check.

Checkout uses full Git history because several accepted repository regression tests compare protected files against frozen historical commits. A shallow clone makes those tests fail and is not treated as an application regression or bypassed.

The repository-wide historical Markdown set does not currently pass Prettier. The deploy gate therefore runs `format:check:deploy` over source, tools, tests, workflows, deployment docs and root deployment files, without `continue-on-error`. The full `format:check` remains a required local audit and its existing-document failures are reported rather than silently ignored or bulk-reformatted.

An unreviewed pull request can therefore test code but cannot access a deployment credential or trigger an external deployment.

## Trusted release rehearsal

`.github/workflows/release-rehearsal.yml` is manual and local-only. It is permitted to run only when the workflow ref is `develop`. Its first job checks out `develop` without persisted credentials and requires the operator's full SHA to equal that exact checked-out head. Only that verified SHA proceeds to the build and smoke job.

The workflow does not select or call a cloud vendor. It builds and audits a Next standalone release, starts it inside the runner, exercises health and product routes, and uploads the audited artifact for three days. It does not use `pull_request_target`, an arbitrary PR checkout, a downloaded script, deployment credentials, OIDC or a privileged environment.

## Local executable chain

1. Install exactly the lockfile with `npm ci`.
2. Run `npm run deploy:validate:local`.
3. Run `npm run test:deployment` and the full repository quality commands.
4. Run `npm run deploy:build:local` to produce `.artifacts/task-025/releases/<sha>`.
5. Run `npm run deploy:verify-artifact` before consuming the release.
6. Run `npm run deploy:rehearse:local` to rebuild, start the standalone server and execute HTTP smoke.

The artifact includes the standalone Node runtime, `public`, `.next/static` and a non-sensitive release manifest. The audit rejects environment files, key material, HAR files, database dumps and credential-shaped content. No `.env`, Cookie store, database dump or working directory is uploaded.

## Health semantics

- `/api/health/live` reports only `{ "status": "ok" }`. It confirms the process can answer HTTP.
- `/api/health/ready` validates the committed environment contract and reports only `ready` or `unavailable`.
- Both routes use `Cache-Control: no-store, max-age=0`.
- Neither route contacts Supabase, Mapbox, Ekiworld or another paid service, writes a table, runs a migration, returns a version or exposes configuration details.

## External Preview gate

Before any real Preview request is authorized, all of the following must exist and be reviewed:

- named cloud platform/project, region, owner and cost approval;
- GitHub Environment protection and least-privilege credential strategy;
- exact Preview HTTPS origin and callback allowlist;
- isolated non-production Supabase project and synthetic data policy;
- Mapbox URL/usage restrictions when enabled;
- production-build-compatible routing mode; Evaluation remains disabled;
- external observability destination, retention, access and privacy approval when enabled;
- current exact SHA with passing required checks and applicable security scanning;
- immutable artifact/deployment ID, health checks and a known-good rollback target.

Until that matrix is approved, Preview policy remains disabled and the repository makes no external deployment request.

## Production gate

Production publication is not authorized by TASK-025-A. Do not create resources, alter DNS, enable Ekiworld Evaluation, run remote migrations or add production Secrets. Production requires a separate explicit approval, protected environment, current security review, backup/restore plan and release checklist.

## Rollback

Local release activation uses compare-and-swap state: promotion fails when the active SHA changed after the operator read it. A rollback can target only a release directory whose manifest SHA exactly matches the requested full SHA. The state transition is atomic and the stale-write/known-prior behavior is exercised by `test:deployment`.

For a future external platform:

1. Stop new promotion attempts and record the failed deployment ID and exact SHA without logging Secrets.
2. Select a previously smoke-tested immutable artifact/SHA.
3. Re-run environment and artifact validation for that target.
4. Switch application traffic using the platform's approved atomic rollback mechanism.
5. Recheck liveness, readiness and critical pages.
6. Do not automatically roll back SQL migrations or reset a database. Schema rollback/restore requires a separate database incident procedure and approval.

The current repository has no prior cloud artifact or target, so an external live rollback is Deferred rather than reported as successful.

## Failure handling

- Validation failure: correct the target policy/configuration; never weaken the check or substitute a hostname heuristic.
- Quality failure: deployment stops. `continue-on-error` is not used.
- Readiness 503: keep the release out of service and inspect only controlled local logs.
- Artifact audit failure: discard the local artifact and rotate any credential if exposure is suspected.
- Cloud target unavailable or unauthorized: stop before the first external write and update the Issue with the missing gate.
