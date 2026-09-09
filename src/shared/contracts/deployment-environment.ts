export const appEnvironments = [
  "development",
  "preview",
  "production",
] as const;

export type AppEnvironment = (typeof appEnvironments)[number];
export type DatabaseTarget = "disabled" | "local" | "cloud";
export type AuthProviderMode = "disabled" | "supabase";
export type MapProviderMode = "fallback" | "mapbox";
export type ObservabilityExportMode = "disabled" | "approved";
export type RoutingProviderMode = "disabled" | "evaluation" | "production";

export interface EnvironmentTargetPolicy {
  enabled: boolean;
  targetIds: readonly string[];
  appOrigins: readonly string[] | "loopback";
  supabaseProjectRefs: readonly string[] | "local";
  observabilityTargetIds: readonly string[];
}

export type EnvironmentPolicy = Readonly<
  Record<AppEnvironment, EnvironmentTargetPolicy>
>;

/**
 * Preview and production remain deliberately disabled until a cloud target,
 * resource ownership and access policy are explicitly approved in-repository.
 */
export const repositoryEnvironmentPolicy: EnvironmentPolicy = {
  development: {
    enabled: true,
    targetIds: ["local"],
    appOrigins: "loopback",
    supabaseProjectRefs: "local",
    observabilityTargetIds: [],
  },
  preview: {
    enabled: false,
    targetIds: [],
    appOrigins: [],
    supabaseProjectRefs: [],
    observabilityTargetIds: [],
  },
  production: {
    enabled: false,
    targetIds: [],
    appOrigins: [],
    supabaseProjectRefs: [],
    observabilityTargetIds: [],
  },
};

export interface DeploymentEnvironmentReport {
  ok: boolean;
  errors: readonly string[];
  safe: {
    appEnvironment: AppEnvironment | "invalid";
    targetId: string | null;
    commitSha: string | null;
    appOrigin: string | null;
    supabaseProjectRef: string | null;
    databaseTarget: DatabaseTarget | "invalid";
    authProviderMode: AuthProviderMode | "invalid";
    mapProviderMode: MapProviderMode | "invalid";
    routingProviderMode: RoutingProviderMode | "invalid";
    observabilityExportMode: ObservabilityExportMode | "invalid";
  };
}

type Environment = Readonly<Record<string, string | undefined>>;

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const PUBLISHABLE_KEY_PATTERN = /^sb_publishable_[A-Za-z0-9_-]+$/;

function enumValue<T extends string>(
  value: string | undefined,
  allowed: readonly T[],
): T | "invalid" {
  const normalized = value?.trim().toLowerCase();
  return allowed.includes(normalized as T) ? (normalized as T) : "invalid";
}

function exactOrigin(value: string | undefined) {
  try {
    const url = new URL(value ?? "");
    if (
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return null;
    return url;
  } catch {
    return null;
  }
}

function isLoopback(hostname: string) {
  return ["localhost", "127.0.0.1", "[::1]"].includes(hostname);
}

function valuePresent(environment: Environment, key: string) {
  return Boolean(environment[key]?.trim());
}

function databaseMatchesProject(urlValue: string, projectRef: string) {
  try {
    const url = new URL(urlValue);
    if (!["postgres:", "postgresql:"].includes(url.protocol)) return false;
    if (projectRef === "local") return isLoopback(url.hostname);
    return (
      url.hostname === `db.${projectRef}.supabase.co` ||
      (url.hostname.endsWith(".pooler.supabase.com") &&
        url.username.endsWith(`.${projectRef}`))
    );
  } catch {
    return false;
  }
}

export function validateDeploymentEnvironment(
  environment: Environment,
  policy: EnvironmentPolicy = repositoryEnvironmentPolicy,
): DeploymentEnvironmentReport {
  const errors: string[] = [];
  const appEnvironment = enumValue(environment.APP_ENV, appEnvironments);
  const targetId = environment.DEPLOYMENT_TARGET_ID?.trim() || null;
  const commitSha =
    environment.DEPLOYMENT_COMMIT_SHA?.trim().toLowerCase() || null;
  const originUrl = exactOrigin(environment.AUTH_SITE_URL);
  const databaseTarget = enumValue(environment.DATABASE_TARGET, [
    "disabled",
    "local",
    "cloud",
  ] as const);
  const authProviderMode = enumValue(environment.AUTH_PROVIDER_MODE, [
    "disabled",
    "supabase",
  ] as const);
  const mapProviderMode = enumValue(environment.MAP_PROVIDER_MODE, [
    "fallback",
    "mapbox",
  ] as const);
  const routingProviderMode = enumValue(environment.ROUTING_PROVIDER_MODE, [
    "disabled",
    "evaluation",
    "production",
  ] as const);
  const observabilityExportMode = enumValue(
    environment.OBSERVABILITY_EXPORT_MODE,
    ["disabled", "approved"] as const,
  );
  const projectRef = environment.SUPABASE_PROJECT_REF?.trim() || null;

  if (appEnvironment === "invalid") errors.push("app_env.invalid");
  if (!targetId) errors.push("deployment_target.missing");
  if (!commitSha || !SHA_PATTERN.test(commitSha))
    errors.push("deployment_commit.invalid");
  if (!originUrl) errors.push("auth_origin.invalid");
  if (databaseTarget === "invalid") errors.push("database_target.invalid");
  if (authProviderMode === "invalid") errors.push("auth_mode.invalid");
  if (mapProviderMode === "invalid") errors.push("map_mode.invalid");
  if (routingProviderMode === "invalid") errors.push("routing_mode.invalid");
  if (observabilityExportMode === "invalid")
    errors.push("observability_mode.invalid");

  const targetPolicy =
    appEnvironment === "invalid" ? null : policy[appEnvironment];
  if (targetPolicy && !targetPolicy.enabled)
    errors.push("deployment_target.unapproved_environment");
  if (targetPolicy && targetId && !targetPolicy.targetIds.includes(targetId))
    errors.push("deployment_target.unapproved_id");

  if (originUrl && appEnvironment !== "invalid" && targetPolicy) {
    if (
      appEnvironment === "development" &&
      (!isLoopback(originUrl.hostname) ||
        !["http:", "https:"].includes(originUrl.protocol))
    )
      errors.push("auth_origin.not_loopback");
    if (appEnvironment !== "development" && originUrl.protocol !== "https:")
      errors.push("auth_origin.https_required");
    if (
      targetPolicy.appOrigins !== "loopback" &&
      !targetPolicy.appOrigins.includes(originUrl.origin)
    )
      errors.push("auth_origin.not_allowlisted");
  }

  const platformEnvironment = environment.VERCEL_ENV?.trim().toLowerCase();
  if (
    platformEnvironment &&
    appEnvironment !== "invalid" &&
    platformEnvironment !== appEnvironment
  )
    errors.push("platform_environment.mismatch");
  if (
    environment.NODE_ENV &&
    !["development", "test", "production"].includes(environment.NODE_ENV)
  )
    errors.push("node_env.invalid");

  const supabaseNeeded =
    authProviderMode === "supabase" ||
    databaseTarget === "local" ||
    databaseTarget === "cloud";
  const publicSupabase = exactOrigin(environment.NEXT_PUBLIC_SUPABASE_URL);
  const serverSupabase = exactOrigin(environment.SUPABASE_URL);
  if (supabaseNeeded) {
    if (!projectRef) errors.push("supabase_project_ref.missing");
    if (!publicSupabase || !serverSupabase)
      errors.push("supabase_origin.missing_or_invalid");
    if (publicSupabase?.origin !== serverSupabase?.origin)
      errors.push("supabase_origin.public_server_mismatch");
    if (
      !PUBLISHABLE_KEY_PATTERN.test(
        environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
      )
    )
      errors.push("supabase_publishable_key.invalid");
  }
  if (projectRef && targetPolicy) {
    if (targetPolicy.supabaseProjectRefs === "local" && projectRef !== "local")
      errors.push("supabase_project_ref.not_local");
    if (
      targetPolicy.supabaseProjectRefs !== "local" &&
      !targetPolicy.supabaseProjectRefs.includes(projectRef)
    )
      errors.push("supabase_project_ref.not_allowlisted");
    if (projectRef !== "local" && !PROJECT_REF_PATTERN.test(projectRef))
      errors.push("supabase_project_ref.invalid");
  }
  if (
    projectRef === "local" &&
    publicSupabase &&
    !isLoopback(publicSupabase.hostname)
  )
    errors.push("supabase_origin.not_local");
  if (projectRef && projectRef !== "local" && publicSupabase) {
    if (publicSupabase.hostname !== `${projectRef}.supabase.co`)
      errors.push("supabase_origin.project_mismatch");
  }
  if (databaseTarget === "local" || databaseTarget === "cloud") {
    if (!valuePresent(environment, "SUPABASE_SECRET_KEY"))
      errors.push("supabase_secret.missing");
    if (
      !projectRef ||
      !databaseMatchesProject(
        environment.DATABASE_URL?.trim() ?? "",
        projectRef,
      )
    )
      errors.push("database_url.project_mismatch");
  }

  if (
    mapProviderMode === "mapbox" &&
    !valuePresent(environment, "NEXT_PUBLIC_MAPBOX_TOKEN")
  )
    errors.push("mapbox_token.missing");

  if (routingProviderMode === "disabled") {
    if (valuePresent(environment, "EKIWORLD_ACCESS_KEY"))
      errors.push("routing.credential_without_mode");
  } else {
    if (!valuePresent(environment, "EKIWORLD_ACCESS_KEY"))
      errors.push("routing.credential_missing");
    if (
      routingProviderMode === "evaluation" &&
      (appEnvironment !== "development" ||
        environment.NODE_ENV === "production")
    )
      errors.push("routing.evaluation_forbidden");
    if (
      routingProviderMode === "production" &&
      environment.ROUTING_EKIWORLD_PRODUCTION_APPROVED?.trim().toLowerCase() !==
        "true"
    )
      errors.push("routing.production_not_approved");
  }
  if (
    appEnvironment !== "development" &&
    environment.ROUTING_PLANNER_QUERY_ENABLED?.trim().toLowerCase() === "true"
  )
    errors.push("routing.planner_query_forbidden");

  if (observabilityExportMode === "approved") {
    const observationTarget = environment.OBSERVABILITY_TARGET_ID?.trim();
    if (
      !observationTarget ||
      !targetPolicy?.observabilityTargetIds.includes(observationTarget)
    )
      errors.push("observability_target.not_allowlisted");
  }

  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)].sort(),
    safe: {
      appEnvironment,
      targetId,
      commitSha: commitSha && SHA_PATTERN.test(commitSha) ? commitSha : null,
      appOrigin: originUrl?.origin ?? null,
      supabaseProjectRef: projectRef,
      databaseTarget,
      authProviderMode,
      mapProviderMode,
      routingProviderMode,
      observabilityExportMode,
    },
  };
}
