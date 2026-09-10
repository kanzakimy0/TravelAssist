import { execFileSync } from "node:child_process";

const sensitiveKeys = [
  "DATABASE_URL",
  "EKIWORLD_ACCESS_KEY",
  "NEXT_PUBLIC_MAPBOX_TOKEN",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_URL",
];

export function currentCommit() {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    encoding: "utf8",
  }).trim();
}

export function localDeploymentEnvironment({ port = 3132 } = {}) {
  const environment = { ...process.env };
  for (const key of sensitiveKeys) delete environment[key];
  return {
    ...environment,
    NODE_ENV: "production",
    APP_ENV: "development",
    DEPLOYMENT_TARGET_ID: "local",
    DEPLOYMENT_COMMIT_SHA: currentCommit(),
    AUTH_SITE_URL: `http://127.0.0.1:${port}`,
    DATABASE_TARGET: "disabled",
    AUTH_PROVIDER_MODE: "disabled",
    MAP_PROVIDER_MODE: "fallback",
    ROUTING_PROVIDER_MODE: "disabled",
    ROUTING_PLANNER_QUERY_ENABLED: "false",
    ROUTING_EKIWORLD_PRODUCTION_APPROVED: "false",
    OBSERVABILITY_EXPORT_MODE: "disabled",
  };
}
