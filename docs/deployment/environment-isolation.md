# TravelAssist Environment Isolation

## Status and scope

TASK-025-A / Issue #236 establishes the repository-side contract for WBS 10.1. It does not approve or create a cloud account, deployment target, DNS record, production database, Provider entitlement or paid resource.

The current repository policy intentionally enables only a local target. Preview and production remain fail-closed until their exact target IDs, HTTPS origins, Supabase project references, observability destination and operator permissions are approved in a later reviewed change.

## Application environment versus Node mode

`APP_ENV` is the TravelAssist resource environment and must be one of `development`, `preview` or `production`. `NODE_ENV` remains a toolchain value and must only be `development`, `test` or `production`; it must never be set to `preview` or `staging`.

A production build does not imply a production resource environment. The local standalone rehearsal deliberately uses `NODE_ENV=production` with `APP_ENV=development`, so the optimized server can be tested without granting access to cloud resources or Evaluation routing.

## Committed target policy

| Environment | Current target | App origin policy        | Supabase policy                                                                | Routing                                                                       | External observation  |
| ----------- | -------------- | ------------------------ | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------- |
| Development | `local`        | Explicit loopback origin | Disabled by rehearsal; local project may be enabled with complete local config | Disabled by rehearsal; Evaluation is allowed only outside production builds   | Disabled              |
| Preview     | None approved  | No origin allowlisted    | No project allowlisted                                                         | Evaluation forbidden                                                          | No target allowlisted |
| Production  | None approved  | No origin allowlisted    | No project allowlisted                                                         | Evaluation forbidden; production entitlement still requires explicit approval | No target allowlisted |

The policy is code-reviewed in the server-only `src/server/environment/contract.ts`. Environment variables cannot add a trusted cloud target by themselves, and credential-bearing variable names do not enter a client-importable shared contract.

## Variable ownership and lifecycle

| Variable                               | Owner                 | Visibility              | Lifecycle          | Requirement                                                                 |
| -------------------------------------- | --------------------- | ----------------------- | ------------------ | --------------------------------------------------------------------------- |
| `APP_ENV`                              | Release               | Server                  | Build and runtime  | Always for deployment validation                                            |
| `DEPLOYMENT_TARGET_ID`                 | Release               | Server, non-secret      | Build and runtime  | Always; exact allowlist match                                               |
| `DEPLOYMENT_COMMIT_SHA`                | CI/Release            | Server, non-secret      | Build and manifest | Full 40-character SHA                                                       |
| `AUTH_SITE_URL`                        | Auth/Release          | Server, non-secret      | Runtime            | Always; exact canonical origin, never request headers                       |
| `DATABASE_TARGET`                      | DB/Release            | Server, non-secret      | Runtime            | `disabled`, `local` or `cloud`                                              |
| `AUTH_PROVIDER_MODE`                   | Auth/Release          | Server, non-secret      | Build and runtime  | `disabled` or `supabase`                                                    |
| `MAP_PROVIDER_MODE`                    | Map/Release           | Server, non-secret      | Build              | `fallback` or `mapbox`                                                      |
| `OBSERVABILITY_EXPORT_MODE`            | Observability/Release | Server, non-secret      | Runtime            | `disabled` or separately approved                                           |
| `NEXT_PUBLIC_MAPBOX_TOKEN`             | Map                   | Public build value      | Build              | Required only when Mapbox is enabled; URL/usage restrictions still required |
| `NEXT_PUBLIC_SUPABASE_URL`             | Auth/DB               | Public build value      | Build              | Required only when Supabase capability is enabled                           |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Auth/DB               | Public build value      | Build              | Required only when Supabase capability is enabled; not a server secret      |
| `SUPABASE_PROJECT_REF`                 | DB/Release            | Server, non-secret      | Build and runtime  | Required with Supabase; must match the allowlist                            |
| `SUPABASE_URL`                         | DB/Auth               | Server, non-secret      | Runtime            | Must match the public Supabase origin                                       |
| `SUPABASE_SECRET_KEY`                  | DB/Auth               | Secret                  | Runtime            | Required only for enabled DB access; secret store only                      |
| `DATABASE_URL`                         | DB                    | Secret                  | Runtime            | Required only for enabled DB access; must map to the approved project       |
| `ROUTING_PROVIDER_MODE`                | Routing/Release       | Server, non-secret      | Runtime            | `disabled`, `evaluation` or `production`                                    |
| `EKIWORLD_ACCESS_KEY`                  | Routing               | Secret                  | Runtime            | Required only for enabled routing; never a public variable                  |
| `ROUTING_EKIWORLD_PRODUCTION_APPROVED` | Product/Legal/Release | Server, non-secret gate | Runtime            | Must be explicitly true for production entitlement                          |
| `ROUTING_PLANNER_QUERY_ENABLED`        | Routing               | Server, non-secret gate | Runtime            | Development-only; forbidden in Preview/Production                           |

## Public build-time values

Next.js replaces direct `NEXT_PUBLIC_*` references at build time. A development artifact must not be promoted to Preview or Production with the expectation that changing runtime variables will replace those values. Each approved environment requires a distinct build from the exact trusted SHA, followed by environment validation and artifact audit.

The release manifest contains only commit, application environment, target ID, Node version and a hash of the sanitized configuration report. It never contains a Secret or a hash derived from a Secret.

## Validation behavior

Deployment validation rejects:

- unknown application or Node environments;
- disabled or unknown target IDs;
- non-canonical origins, paths, query strings, fragments and unapproved HTTP cloud origins;
- mismatched public/server Supabase origins, project references or database targets;
- missing values for an enabled capability;
- credentials present while routing is disabled;
- Evaluation routing in Preview, Production or any production build;
- a production routing mode without the independent approval gate;
- an external observation target not present in the committed allowlist;
- platform environment markers that conflict with `APP_ENV`.

Only controlled error codes and a safe configuration summary are emitted. Secret values are never returned by the validator.

## Auth, Cookie and database boundaries

`AUTH_SITE_URL` remains the only canonical application origin for callbacks and state-changing Auth requests. It is not derived from `Host`, `X-Forwarded-Host` or a user-provided return URL. Existing same-site and secure Cookie behavior is unchanged.

The local rehearsal disables Auth and database access. It does not start, reset or migrate Supabase. A future cloud target must use a separate non-production Supabase project, synthetic data, exact callback allowlists and credentials scoped to that environment. Production reset, remote migration and experiment data are prohibited by this Task.

## Commands

```text
npm run deploy:validate:local
npm run test:deployment
npm run deploy:build:local
npm run deploy:verify-artifact
npm run deploy:rehearse:local
```

`deploy:validate` without `:local` validates explicitly supplied environment variables and fails closed when required values are absent. No command loads or copies a personal `.env.local` file.
