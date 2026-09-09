import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

await import("./register-route-ts.mjs");

const { repositoryEnvironmentPolicy, validateDeploymentEnvironment } =
  await import("../src/server/environment/contract.ts");
const { GET: readiness } = await import("../src/app/api/health/ready/route.ts");
const { plannerRouteGatewayEnabled } =
  await import("../src/server/routing/config.ts");
const { verifyRelease } = await import("../tools/deploy/artifact.mjs");
const { activateRelease, readActiveRelease, rollbackRelease } =
  await import("../tools/deploy/release-state.mjs");

const sha = "a".repeat(40);
const projectRef = "abcdefghijklmnopqrst";
const approvedPolicy = {
  ...repositoryEnvironmentPolicy,
  preview: {
    enabled: true,
    targetIds: ["preview-jp"],
    appOrigins: ["https://preview.example.test"],
    supabaseProjectRefs: [projectRef],
    observabilityTargetIds: [],
  },
  production: {
    enabled: true,
    targetIds: ["production-jp"],
    appOrigins: ["https://travel.example.test"],
    supabaseProjectRefs: [projectRef],
    observabilityTargetIds: ["approved-local-test"],
  },
};

function localEnvironment(overrides = {}) {
  return {
    NODE_ENV: "production",
    APP_ENV: "development",
    DEPLOYMENT_TARGET_ID: "local",
    DEPLOYMENT_COMMIT_SHA: sha,
    AUTH_SITE_URL: "http://127.0.0.1:3132",
    DATABASE_TARGET: "disabled",
    AUTH_PROVIDER_MODE: "disabled",
    MAP_PROVIDER_MODE: "fallback",
    ROUTING_PROVIDER_MODE: "disabled",
    ROUTING_PLANNER_QUERY_ENABLED: "false",
    ROUTING_EKIWORLD_PRODUCTION_APPROVED: "false",
    OBSERVABILITY_EXPORT_MODE: "disabled",
    ...overrides,
  };
}

function cloudEnvironment(appEnvironment, overrides = {}) {
  const production = appEnvironment === "production";
  return {
    NODE_ENV: "production",
    APP_ENV: appEnvironment,
    DEPLOYMENT_TARGET_ID: production ? "production-jp" : "preview-jp",
    DEPLOYMENT_COMMIT_SHA: sha,
    AUTH_SITE_URL: production
      ? "https://travel.example.test"
      : "https://preview.example.test",
    DATABASE_TARGET: "cloud",
    AUTH_PROVIDER_MODE: "supabase",
    MAP_PROVIDER_MODE: "mapbox",
    ROUTING_PROVIDER_MODE: "disabled",
    ROUTING_PLANNER_QUERY_ENABLED: "false",
    ROUTING_EKIWORLD_PRODUCTION_APPROVED: "false",
    OBSERVABILITY_EXPORT_MODE: "disabled",
    SUPABASE_PROJECT_REF: projectRef,
    NEXT_PUBLIC_SUPABASE_URL: `https://${projectRef}.supabase.co`,
    SUPABASE_URL: `https://${projectRef}.supabase.co`,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_fixture_value",
    SUPABASE_SECRET_KEY: "fixture-server-value",
    DATABASE_URL: `postgresql://postgres:fixture@db.${projectRef}.supabase.co:5432/postgres`,
    NEXT_PUBLIC_MAPBOX_TOKEN: "fixture-public-map-token",
    ...overrides,
  };
}

test("repository policy allows only explicit local development", () => {
  const result = validateDeploymentEnvironment(localEnvironment());
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.safe.targetId, "local");
});

test("unknown environment, target and unsafe origin fail closed", () => {
  const unknown = validateDeploymentEnvironment(
    localEnvironment({ APP_ENV: "staging" }),
  );
  assert.equal(unknown.ok, false);
  assert.ok(unknown.errors.includes("app_env.invalid"));

  const mixed = validateDeploymentEnvironment(
    localEnvironment({
      DEPLOYMENT_TARGET_ID: "production-jp",
      AUTH_SITE_URL: "https://example.test/path?from=host",
    }),
  );
  assert.equal(mixed.ok, false);
  assert.ok(mixed.errors.includes("deployment_target.unapproved_id"));
  assert.ok(mixed.errors.includes("auth_origin.invalid"));
});

test("approved preview and production fixtures validate without leaking values", () => {
  const preview = validateDeploymentEnvironment(
    cloudEnvironment("preview"),
    approvedPolicy,
  );
  assert.equal(preview.ok, true);

  const production = validateDeploymentEnvironment(
    cloudEnvironment("production", {
      ROUTING_PROVIDER_MODE: "production",
      ROUTING_EKIWORLD_PRODUCTION_APPROVED: "true",
      EKIWORLD_ACCESS_KEY: "fixture-routing-value",
      OBSERVABILITY_EXPORT_MODE: "approved",
      OBSERVABILITY_TARGET_ID: "approved-local-test",
    }),
    approvedPolicy,
  );
  assert.equal(production.ok, true);
  const serialized = JSON.stringify(production);
  assert.doesNotMatch(serialized, /fixture-server-value/);
  assert.doesNotMatch(serialized, /fixture-routing-value/);
  assert.doesNotMatch(serialized, /fixture-public-map-token/);
});

test("resource mixing and missing enabled capability config are rejected", () => {
  const mixed = validateDeploymentEnvironment(
    cloudEnvironment("preview", {
      SUPABASE_URL: "https://zzzzzzzzzzzzzzzzzzzz.supabase.co",
      DATABASE_URL:
        "postgresql://postgres:fixture@db.zzzzzzzzzzzzzzzzzzzz.supabase.co:5432/postgres",
    }),
    approvedPolicy,
  );
  assert.equal(mixed.ok, false);
  assert.ok(mixed.errors.includes("supabase_origin.public_server_mismatch"));
  assert.ok(mixed.errors.includes("database_url.project_mismatch"));

  const missing = validateDeploymentEnvironment(
    cloudEnvironment("preview", {
      NEXT_PUBLIC_MAPBOX_TOKEN: "",
      SUPABASE_SECRET_KEY: "",
    }),
    approvedPolicy,
  );
  assert.ok(missing.errors.includes("mapbox_token.missing"));
  assert.ok(missing.errors.includes("supabase_secret.missing"));
});

test("Evaluation routing remains forbidden in production and preview", () => {
  for (const appEnvironment of ["preview", "production"]) {
    const result = validateDeploymentEnvironment(
      cloudEnvironment(appEnvironment, {
        ROUTING_PROVIDER_MODE: "evaluation",
        EKIWORLD_ACCESS_KEY: "fixture-routing-value",
      }),
      approvedPolicy,
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.includes("routing.evaluation_forbidden"));
  }
  assert.equal(
    plannerRouteGatewayEnabled({
      NODE_ENV: "production",
      APP_ENV: "development",
      ROUTING_PROVIDER_MODE: "evaluation",
      ROUTING_PLANNER_QUERY_ENABLED: "true",
    }),
    false,
  );
});

test("readiness reports only minimal status and never configuration details", async () => {
  const original = { ...process.env };
  Object.assign(process.env, localEnvironment());
  try {
    const response = readiness();
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store, max-age=0");
    assert.deepEqual(await response.json(), { status: "ready" });
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in original)) delete process.env[key];
    }
    Object.assign(process.env, original);
  }
});

test("release state uses CAS and can restore a known prior release", async () => {
  const root = path.resolve(".artifacts", "task-025-test-state");
  const first = "1".repeat(40);
  const second = "2".repeat(40);
  try {
    for (const commitSha of [first, second]) {
      const directory = path.join(root, "releases", commitSha);
      await mkdir(directory, { recursive: true });
      await writeFile(
        path.join(directory, "release-manifest.json"),
        JSON.stringify({ commitSha }),
      );
    }
    await activateRelease(root, first, null);
    await activateRelease(root, second, first);
    await assert.rejects(() => rollbackRelease(root, first, first), /changed/);
    await rollbackRelease(root, first, second);
    assert.equal((await readActiveRelease(root)).commitSha, first);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("artifact audit rejects credential-shaped content without echoing it", async () => {
  const commitSha = "3".repeat(40);
  const target = path.resolve(".artifacts", "task-025", "releases", commitSha);
  try {
    await mkdir(target, { recursive: true });
    await writeFile(
      path.join(target, "release-manifest.json"),
      JSON.stringify({ commitSha }),
    );
    await writeFile(
      path.join(target, "runtime.txt"),
      "DATABASE_URL=redacted-fixture",
    );
    const result = await verifyRelease(target);
    assert.equal(result.ok, false);
    assert.deepEqual(result.failures, [
      { file: "runtime.txt", code: "sensitive_content" },
    ]);
  } finally {
    await rm(target, { recursive: true, force: true });
  }
});

test("CI separates untrusted quality checks from trusted release rehearsal", () => {
  const quality = readFileSync(".github/workflows/quality-gate.yml", "utf8");
  const release = readFileSync(
    ".github/workflows/release-rehearsal.yml",
    "utf8",
  );
  assert.match(quality, /pull_request:/);
  assert.match(quality, /permissions:\s*\n\s*contents: read/);
  assert.doesNotMatch(quality, /pull_request_target|secrets\./);
  assert.match(release, /workflow_dispatch:/);
  assert.match(release, /github\.ref == 'refs\/heads\/develop'/);
  assert.match(release, /REQUESTED_SHA.*inputs\.commit_sha/);
  assert.match(release, /REQUESTED_SHA.*trusted_sha/s);
  assert.doesNotMatch(release, /pull_request_target|secrets\./);
});

test("deployment scripts do not use secret-bearing build args or fake deploys", () => {
  const files = [
    "tools/deploy/build-artifact.mjs",
    "tools/deploy/rehearse.mjs",
    ".github/workflows/release-rehearsal.yml",
  ];
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /--build-arg|echo .*deploy(?:ed|ment).*success/i);
  assert.doesNotMatch(source, /vercel deploy|aws .*deploy|supabase db push/i);
});
