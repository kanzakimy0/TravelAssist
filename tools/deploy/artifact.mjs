import { createHash } from "node:crypto";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { checkEnvironment } from "./environment-check.mjs";
import {
  currentCommit,
  localDeploymentEnvironment,
} from "./local-environment.mjs";

const root = path.resolve(".artifacts", "task-025");
const releaseRoot = path.join(root, "releases");
const forbiddenName = /(^|\/)\.env(?:\.|$)|\.(?:pem|key|har)$/i;
const forbiddenUserFile =
  /(^|\/)(?:credentials?|cookies?|database-dump)(?:[._-]|$)/i;
const forbiddenContent = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /(?:postgres|postgresql):\/\/[^\s"']+:[^\s"']+@/i,
  /(?:SUPABASE_SECRET_KEY|EKIWORLD_ACCESS_KEY|DATABASE_URL)\s*=\s*[^\s"']+/,
  /Authorization\s*:\s*Bearer\s+[A-Za-z0-9._-]{12,}/i,
];

function assertInside(parent, target) {
  const relative = path.relative(parent, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative))
    throw new Error("Artifact target must be a child of the artifact root.");
}

async function walk(directory) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...(await walk(target)));
    else if (entry.isFile()) result.push(target);
  }
  return result;
}

async function copyRuntime(target) {
  const standalone = path.resolve(".next", "standalone");
  const server = path.join(standalone, "server.js");
  if (!(await stat(server).catch(() => null)))
    throw new Error("Standalone build is missing server.js.");
  await cp(standalone, target, { recursive: true });
  await cp(path.resolve("public"), path.join(target, "public"), {
    recursive: true,
  });
  await mkdir(path.join(target, ".next"), { recursive: true });
  await cp(
    path.resolve(".next", "static"),
    path.join(target, ".next", "static"),
    {
      recursive: true,
    },
  );
}

export async function verifyRelease(target) {
  assertInside(releaseRoot, target);
  const files = await walk(target);
  const failures = [];
  for (const file of files) {
    const relative = path.relative(target, file).replaceAll("\\", "/");
    if (
      forbiddenName.test(relative) ||
      (!relative.startsWith("node_modules/") &&
        forbiddenUserFile.test(relative))
    ) {
      failures.push({ file: relative, code: "forbidden_filename" });
      continue;
    }
    const details = await stat(file);
    if (details.size > 2_000_000) continue;
    const content = await readFile(file, "utf8").catch(() => "");
    if (forbiddenContent.some((pattern) => pattern.test(content)))
      failures.push({ file: relative, code: "sensitive_content" });
  }
  const manifestPath = path.join(target, "release-manifest.json");
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  if (manifest.commitSha !== path.basename(target))
    failures.push({ file: "release-manifest.json", code: "sha_mismatch" });
  return {
    ok: failures.length === 0,
    fileCount: files.length,
    failures,
    manifest,
  };
}

export async function buildLocalRelease({ port = 3132 } = {}) {
  const environment = localDeploymentEnvironment({ port });
  const validation = checkEnvironment(environment);
  if (!validation.ok)
    throw new Error(
      `Environment validation failed: ${validation.errors.join(",")}`,
    );

  const build = spawnSync(
    process.execPath,
    [path.resolve("node_modules", "next", "dist", "bin", "next"), "build"],
    {
      cwd: process.cwd(),
      env: environment,
      encoding: "utf8",
      stdio: "inherit",
    },
  );
  if (build.status !== 0) {
    const reason = build.error?.code ?? `exit_${build.status ?? "unknown"}`;
    throw new Error(`Production build failed (${reason}).`);
  }

  const commitSha = currentCommit();
  const target = path.join(releaseRoot, commitSha);
  assertInside(releaseRoot, target);
  await mkdir(releaseRoot, { recursive: true });
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await copyRuntime(target);

  const manifest = {
    schemaVersion: 1,
    artifactType: "next-standalone",
    commitSha,
    appEnvironment: validation.safe.appEnvironment,
    targetId: validation.safe.targetId,
    nodeVersion: process.version,
    configFingerprint: validation.fingerprint,
    createdAt: new Date().toISOString(),
  };
  await writeFile(
    path.join(target, "release-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  const verification = await verifyRelease(target);
  if (!verification.ok)
    throw new Error(
      `Artifact verification failed: ${verification.failures.map((item) => item.code).join(",")}`,
    );
  await mkdir(root, { recursive: true });
  await writeFile(
    path.join(root, "latest.json"),
    `${JSON.stringify({ commitSha, target }, null, 2)}\n`,
  );
  return { target, manifest, verification };
}

export function checksum(value) {
  return createHash("sha256").update(value).digest("hex");
}
