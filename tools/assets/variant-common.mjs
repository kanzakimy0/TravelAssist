import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  unlinkSync,
  lstatSync,
  realpathSync,
} from "node:fs";
import { dirname, resolve, relative, isAbsolute } from "node:path";
import { hostname } from "node:os";
import { randomUUID } from "node:crypto";
import { format } from "prettier";
import { ROOT, sha256, json, CATALOG } from "./asset-utils.mjs";
export { ROOT, sha256, CATALOG };
export const PROFILES = json(CATALOG + "asset-size-profiles.v1.json");
export const POLICY = json(CATALOG + "asset-processing-policy.v1.json");
export const OUTPUT = "public/media/generated/v1";
export const CACHE = ".cache/asset-pipeline";
export const REPORTS = "docs/assets/generated/";
export function validateConfiguration(profiles = PROFILES, policy = POLICY) {
  if (
    profiles.schemaVersion !== 1 ||
    policy.schemaVersion !== 1 ||
    !profiles.version ||
    !policy.version
  )
    throw Error("profile-policy-schema");
  const ids = new Set();
  for (const p of profiles.profiles) {
    if (
      ids.has(p.id) ||
      !/^[a-z0-9-]+$/.test(p.id) ||
      ![p.width, p.height, p.maxBytes].every(
        (n) => Number.isSafeInteger(n) && n > 0,
      ) ||
      !["webp", "jpeg", "png"].includes(p.format) ||
      !["inside", "cover", "contain"].includes(p.fit) ||
      p.withoutEnlargement !== true ||
      !(
        p.quality === null ||
        (Number.isInteger(p.quality) && p.quality >= 1 && p.quality <= 100)
      )
    )
      throw Error("invalid-size-profile");
    ids.add(p.id);
  }
  for (const list of Object.values(policy.rasterRoles))
    for (const id of list)
      if (!ids.has(id)) throw Error("unknown-role-profile");
  for (const list of Object.values(policy.vectorRoles))
    for (const id of list)
      if (!profiles.vectorTokens[id]) throw Error("unknown-vector-token");
  if (!["sm", "md", "lg"].every((id) => ids.has(id)))
    throw Error("missing-generic-profile");
}
validateConfiguration();
export const ordered = (items, key) =>
  [...items].sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0));
export function safePath(root, path) {
  if (isAbsolute(path) || /(^|[\\/])\.\.([\\/]|$)/.test(path))
    throw Error("path-escape");
  const base = resolve(root),
    target = resolve(base, path);
  if (
    target === base ||
    (!target.startsWith(base + "/") && !target.startsWith(base + "\\"))
  )
    throw Error("path-escape");
  let cursor = target;
  while (cursor !== base) {
    if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink())
      throw Error("symlink-disallowed");
    cursor = dirname(cursor);
  }
  if (existsSync(base) && realpathSync(base) !== base)
    throw Error("root-symlink-disallowed");
  return target;
}
export function atomicWrite(root, path, bytes) {
  const target = safePath(root, path);
  if (existsSync(target) && readFileSync(target).equals(Buffer.from(bytes)))
    return false;
  mkdirSync(dirname(target), { recursive: true });
  const temporary = target + `.asset-tmp-${process.pid}-${randomUUID()}`;
  try {
    writeFileSync(temporary, bytes, { flag: "wx" });
    renameSync(temporary, target);
  } finally {
    if (existsSync(temporary)) unlinkSync(temporary);
  }
  return true;
}
export async function document(root, path, data) {
  const parser = path.endsWith(".json")
    ? "json"
    : path.endsWith(".md")
      ? "markdown"
      : path.endsWith(".html")
        ? "html"
        : null;
  const raw = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const content = parser
    ? await format(raw, {
        parser,
        printWidth: 80,
        tabWidth: 2,
        proseWrap: "preserve",
      })
    : raw;
  return atomicWrite(root, path, content);
}
export function readJson(root, path, fallback) {
  const target = safePath(root, path);
  return existsSync(target)
    ? JSON.parse(readFileSync(target, "utf8"))
    : fallback;
}
export function acquireLock(root, now = Date.now()) {
  const path = safePath(root, CACHE + "/pipeline.lock");
  mkdirSync(dirname(path), { recursive: true });
  if (existsSync(path)) {
    const lock = JSON.parse(readFileSync(path, "utf8"));
    let absent = false;
    if (
      Number.isInteger(lock.pid) &&
      lock.pid > 0 &&
      lock.host === hostname()
    ) {
      try {
        process.kill(lock.pid, 0);
      } catch (e) {
        absent = e.code === "ESRCH";
      }
    }
    if (!(now - lock.startedAt > POLICY.staleLockHours * 3600000 && absent))
      throw Error("pipeline-locked");
    unlinkSync(path);
  }
  const owner = {
    pid: process.pid,
    host: hostname(),
    startedAt: now,
    nonce: randomUUID(),
  };
  writeFileSync(path, JSON.stringify(owner), { flag: "wx" });
  return () => {
    if (
      existsSync(path) &&
      JSON.parse(readFileSync(path, "utf8")).nonce === owner.nonce
    )
      unlinkSync(path);
  };
}
export function options(args = process.argv.slice(2), env = process.env) {
  const concurrency = Number(
    env.ASSET_PIPELINE_CONCURRENCY ?? POLICY.concurrency,
  );
  const maxNewBytes = Number(
    env.ASSET_PIPELINE_MAX_NEW_BYTES ?? POLICY.batchHardBytes,
  );
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 4)
    throw Error("invalid-concurrency");
  if (
    !Number.isSafeInteger(maxNewBytes) ||
    maxNewBytes < 0 ||
    maxNewBytes > POLICY.batchHardBytes
  )
    throw Error("invalid-byte-budget");
  const result = {
    concurrency,
    maxNewBytes,
    resume: args.includes("--resume") || env.ASSET_PIPELINE_RESUME === "1",
    rebuild: args.includes("--rebuild") || env.ASSET_PIPELINE_REBUILD === "1",
    verifyOnly: args.includes("--verify-only"),
    dryRun: args.includes("--dry-run"),
  };
  if (
    (result.resume && result.rebuild) ||
    (result.verifyOnly && result.rebuild)
  )
    throw Error("incompatible-modes");
  return result;
}
export function profilesFor(source) {
  const list =
    source.mediaType === "svg"
      ? POLICY.vectorRoles[source.assetRole]
      : POLICY.rasterRoles[source.assetRole];
  if (
    source.mediaType !== "svg" &&
    source.assetRole === "brand_mark" &&
    !source.brandIconSource
  )
    return [];
  return [
    ...new Set([
      ...(list ?? []),
      ...(source.additionalProfiles ?? []).filter(
        (p) =>
          source.assetRole === "profile_cover" && p === "background-mobile",
      ),
    ]),
  ];
}
export function sourceProtection(before, after) {
  const map = new Map(after.map((s) => [s.path, s]));
  const deleted = before.filter((s) => !map.has(s.path));
  const modified = before.filter(
    (s) => map.has(s.path) && map.get(s.path).sha256 !== s.sha256,
  );
  const renamed = deleted.filter((s) =>
    after.some((n) => n.sha256 === s.sha256),
  );
  return {
    modified: modified.length,
    deleted: deleted.length,
    renamed: renamed.length,
    protectedShaChanged: modified.filter((s) => s.protected).length,
    paths: [...modified, ...deleted].map((s) => s.path),
  };
}
export const publicUrl = (path) =>
  path?.startsWith("public/") ? path.slice(6) : null;
export const fileKey = (id) =>
  id
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 110) +
  "-" +
  sha256(id).slice(0, 10);
export const html = (value) =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
export const repoRelative = (root, file) =>
  relative(root, file).replaceAll("\\", "/");
