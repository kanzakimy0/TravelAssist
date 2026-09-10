import { existsSync, readFileSync, unlinkSync } from "node:fs";
import sharp from "sharp";
import { isMain } from "./asset-utils.mjs";
import { eligibility } from "./build-full-catalog.mjs";
import {
  ROOT,
  CATALOG,
  CACHE,
  OUTPUT,
  POLICY,
  PROFILES,
  sha256,
  safePath,
  readJson,
  document,
  atomicWrite,
  fileKey,
  profilesFor,
  ordered,
  acquireLock,
  options,
} from "./variant-common.mjs";
sharp.cache({ memory: 64, files: 0, items: 64 });
sharp.concurrency(1);
const profileMap = new Map(PROFILES.profiles.map((p) => [p.id, p]));
export function cropBox(width, height, profile, focalPoint, safeArea) {
  const ratio = profile.width / profile.height;
  const w = Math.min(width, Math.floor(height * ratio)),
    h = Math.min(height, Math.floor(width / ratio));
  const focal = focalPoint ?? { x: 0.5, y: 0.5 };
  if (![focal.x, focal.y].every((n) => Number.isFinite(n) && n >= 0 && n <= 1))
    throw Error("invalid-focal-point");
  let minX = 0,
    maxX = width - w,
    minY = 0,
    maxY = height - h;
  if (safeArea) {
    const { x, y, width: sw, height: sh } = safeArea;
    if (
      ![x, y, sw, sh].every((n) => Number.isFinite(n) && n >= 0 && n <= 1) ||
      sw <= 0 ||
      sh <= 0 ||
      x + sw > 1 ||
      y + sh > 1
    )
      throw Error("invalid-safe-area");
    minX = Math.max(0, Math.ceil((x + sw) * width - w));
    maxX = Math.min(maxX, Math.floor(x * width));
    minY = Math.max(0, Math.ceil((y + sh) * height - h));
    maxY = Math.min(maxY, Math.floor(y * height));
    if (minX > maxX || minY > maxY) throw Error("safe-area-crop-unavailable");
  }
  return {
    left: Math.max(minX, Math.min(maxX, Math.round(focal.x * width - w / 2))),
    top: Math.max(minY, Math.min(maxY, Math.round(focal.y * height - h / 2))),
    width: w,
    height: h,
  };
}
export function baseVariant(source, profileId) {
  const profile = profileMap.get(profileId);
  return {
    variantId: source.assetId + "::" + profileId,
    assetId: source.assetId,
    sourceId: source.sourceId,
    profileId,
    kind: "unavailable",
    path: null,
    format: profile?.format ?? null,
    width: null,
    height: null,
    bytes: 0,
    sha256: null,
    fit: profile?.fit ?? "contain",
    crop: null,
    focalPointApplied: false,
    focalPointDefaulted: false,
    quality: profile?.quality ?? null,
    sourceSha256: source.sha256,
    profileVersion: PROFILES.version,
    runtimeUsable: false,
    status: "unavailable",
    errorCode: null,
    aliasOf: null,
    aliasReason: null,
    degraded: false,
  };
}
export function expectedProfiles(source) {
  const roles = profilesFor(source);
  // Even unmapped raster sources have explicit unresolved generic slots, never silently disappear.
  return roles.length
    ? roles
    : source.mediaType === "raster" && source.assetRole !== "brand_mark"
      ? ["sm", "md", "lg"]
      : [];
}
export function budgetCheck(bytes, total, opt) {
  if (bytes > POLICY.singleObjectMaxBytes) throw Error("single-object-budget");
  if (
    total + bytes >
    Math.min(opt.maxNewBytes ?? POLICY.batchHardBytes, POLICY.batchHardBytes)
  )
    throw Error("batch-byte-budget");
}
export async function render(sourceBytes, source, profile) {
  let input = sharp(sourceBytes, { limitInputPixels: POLICY.sourceMaxPixels })
    .autoOrient()
    .toColourspace("srgb");
  let crop = null;
  if (profile.fit === "cover") {
    crop = cropBox(
      source.width,
      source.height,
      profile,
      source.focalPoint,
      source.safeArea,
    );
    if (crop.width < profile.width || crop.height < profile.height)
      return { unavailable: "insufficient-source-resolution" };
    input = input.extract(crop);
  }
  if (
    profile.fit === "contain" &&
    (source.width < profile.width || source.height < profile.height)
  )
    return { unavailable: "insufficient-source-resolution" };
  const padding = Math.round(profile.width * (profile.safePadding ?? 0));
  input = input.resize({
    width: profile.width - 2 * padding,
    height: profile.height - 2 * padding,
    fit: profile.fit,
    withoutEnlargement: true,
    background: { r: 255, g: 255, b: 255, alpha: 0 },
  });
  if (padding)
    input = input.extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 255, g: 255, b: 255, alpha: 0 },
    });
  if (profile.format === "jpeg")
    input = input
      .flatten({ background: "#fff" })
      .jpeg({ quality: profile.quality, mozjpeg: true });
  else if (profile.format === "png") input = input.png({ compressionLevel: 9 });
  else input = input.webp({ quality: profile.quality });
  // sharp strips source EXIF/XMP/IPTC by default. Attach only the built-in sRGB ICC, not original metadata.
  const bytes = await input.withIccProfile("srgb").toBuffer();
  const meta = await sharp(bytes).metadata();
  await sharp(bytes).raw().toBuffer(); // Full decode, not a header-only success.
  if (meta.exif || meta.xmp || meta.iptc)
    throw Error("private-metadata-present");
  if (meta.width > source.width || meta.height > source.height)
    throw Error("upscale-detected");
  if (meta.format !== profile.format || bytes.length > profile.maxBytes)
    throw Error("profile-format-or-byte-budget");
  return {
    bytes,
    width: meta.width,
    height: meta.height,
    format: meta.format,
    crop,
  };
}
export async function deriveSource(root, source, asset, opt, account) {
  const expected = expectedProfiles(source),
    variants = [],
    errors = [];
  const actualReason = eligibility(source, asset);
  const sourcePath = safePath(root, source.path);
  if (
    !existsSync(sourcePath) ||
    sha256(readFileSync(sourcePath)) !== source.sha256
  )
    throw Error("source-changed-during-run");
  const geometry = new Map(),
    hashes = new Map();
  for (const profileId of expected) {
    let v = baseVariant(source, profileId);
    if (source.mediaType === "svg" && actualReason === "vector-token-only") {
      const token = PROFILES.vectorTokens[profileId];
      variants.push({
        ...v,
        kind: "vector-token",
        path: source.path,
        format: "svg",
        ...token,
        bytes: source.bytes,
        sha256: source.sha256,
        status: "exact",
        runtimeUsable: true,
      });
      continue;
    }
    if (actualReason) {
      variants.push({ ...v, errorCode: actualReason });
      continue;
    }
    const p = profileMap.get(profileId);
    if (!p) {
      variants.push({ ...v, errorCode: "unknown-profile" });
      continue;
    }
    // Generic profiles reaching the same source-limited dimensions share a single normalized file.
    const scale = Math.min(1, p.width / source.width, p.height / source.height);
    const geometryKey =
      p.fit === "inside"
        ? `${Math.round(source.width * scale)}x${Math.round(source.height * scale)}-${p.format}`
        : null;
    if (geometryKey && geometry.has(geometryKey)) {
      const original = geometry.get(geometryKey);
      variants.push({
        ...original,
        ...v,
        kind: "alias",
        aliasOf: original.variantId,
        aliasReason: "source-limited-no-upscale",
        path: original.path,
        format: original.format,
        width: original.width,
        height: original.height,
        bytes: original.bytes,
        sha256: original.sha256,
        quality: original.quality,
        degraded: true,
        status: "degraded",
        runtimeUsable: true,
      });
      continue;
    }
    for (let attempt = 0; attempt <= POLICY.retries; attempt++) {
      try {
        const result = await render(readFileSync(sourcePath), source, p);
        if (result.unavailable) {
          variants.push({
            ...v,
            errorCode: result.unavailable,
            degraded: true,
          });
          break;
        }
        const defaulted = p.fit === "cover" && !source.focalPoint;
        v = {
          ...v,
          width: result.width,
          height: result.height,
          crop: result.crop,
          focalPointApplied: p.fit === "cover" && !!source.focalPoint,
          focalPointDefaulted: defaulted,
          bytes: result.bytes.length,
          sha256: sha256(result.bytes),
          kind: "physical",
          runtimeUsable: !defaulted,
          status: defaulted ? "review_required" : "exact",
        };
        const twin = hashes.get(v.sha256);
        if (twin)
          variants.push({
            ...v,
            kind: "alias",
            path: twin.path,
            aliasOf: twin.variantId,
            aliasReason: "identical-encoded-bytes",
            status: defaulted ? "review_required" : "alias",
          });
        else {
          const path =
            OUTPUT +
            "/" +
            fileKey(source.assetId) +
            "/" +
            profileId +
            "." +
            (p.format === "jpeg" ? "jpg" : p.format);
          const target = safePath(root, path);
          const changed =
            !existsSync(target) || sha256(readFileSync(target)) !== v.sha256;
          if (changed) budgetCheck(v.bytes, account.newBytes, opt);
          if (changed) {
            atomicWrite(root, path, result.bytes);
            account.newBytes += v.bytes;
            account.written++;
          }
          v.path = path;
          hashes.set(v.sha256, v);
          variants.push(v);
          if (geometryKey) geometry.set(geometryKey, v);
        }
        break;
      } catch (e) {
        const code = /^[a-z-]+$/.test(e.message)
          ? e.message
          : "image-processing-failed";
        if (code === "safe-area-crop-unavailable") {
          variants.push({ ...v, errorCode: code, status: "review_required" });
          break;
        }
        if (attempt === POLICY.retries) {
          errors.push({
            sourceId: source.sourceId,
            profileId,
            errorCode: code,
            retryCount: attempt,
          });
          variants.push({ ...baseVariant(source, profileId), errorCode: code });
        }
      }
    }
  }
  return { variants, errors };
}
export async function derive(
  root = ROOT,
  opt = options(),
  catalog = readJson(root, CATALOG + "asset-source-catalog.v1.json"),
) {
  const assets = readJson(root, CATALOG + "asset-manifest.v1.json").assets;
  const policyHash = sha256(
    JSON.stringify({ PROFILES, POLICY, sharp: sharp.versions.sharp }),
  );
  let checkpoint = readJson(root, CACHE + "/checkpoint.json", null);
  if (!checkpoint || checkpoint.policyHash !== policyHash || opt.rebuild)
    checkpoint = {
      runId: policyHash.slice(0, 16),
      profileVersion: PROFILES.version,
      policyHash,
      sourceCursor: 0,
      completedSourceSha: {},
      completedProfiles: {},
      failedSourceAndProfile: [],
      retryCount: 1,
      tempOutput: [],
      results: {},
    };
  const prior = readJson(root, CATALOG + "asset-variants.v1.json", {
    variants: [],
  });
  const account = {
      newBytes: 0,
      written: 0,
      skippedUnchanged: 0,
      resumeRecovered: 0,
      sourceChanged: 0,
    },
    results = new Map();
  const sources = catalog.sources;
  let next = 0,
    completed = 0;
  async function worker() {
    while (next < sources.length) {
      const source = sources[next++],
        asset = assets.find((a) => a.id === source.assetId);
      const key = sha256(JSON.stringify({ source, asset, policyHash }));
      const old = checkpoint.results[source.sourceId];
      const valid =
        old?.key === key &&
        existsSync(safePath(root, source.path)) &&
        sha256(readFileSync(safePath(root, source.path))) === source.sha256 &&
        old.errors.length === 0 &&
        old.variants.every(
          (v) =>
            !v.path ||
            (existsSync(safePath(root, v.path)) &&
              sha256(readFileSync(safePath(root, v.path))) === v.sha256),
        );
      let result;
      if (valid && !opt.rebuild) {
        result = old;
        account.skippedUnchanged++;
        if (opt.resume) account.resumeRecovered++;
      } else {
        if (old?.sourceSha256 !== source.sha256) account.sourceChanged++;
        try {
          result = {
            key,
            sourceSha256: source.sha256,
            ...(await deriveSource(root, source, asset, opt, account)),
          };
        } catch (e) {
          result = {
            key,
            sourceSha256: source.sha256,
            variants: expectedProfiles(source).map((p) => ({
              ...baseVariant(source, p),
              errorCode: "source-processing-failed",
            })),
            errors: [
              {
                sourceId: source.sourceId,
                profileId: "all",
                errorCode:
                  e.message === "source-changed-during-run"
                    ? e.message
                    : "source-processing-failed",
                retryCount: 0,
              },
            ],
          };
        }
      }
      results.set(source.sourceId, result);
      checkpoint.results[source.sourceId] = result;
      checkpoint.completedSourceSha[source.sourceId] = source.sha256;
      checkpoint.completedProfiles[source.sourceId] = result.variants.map(
        (v) => v.profileId,
      );
      checkpoint.sourceCursor = ++completed;
      checkpoint.failedSourceAndProfile = Object.values(
        checkpoint.results,
      ).flatMap((r) => r.errors);
      atomicWrite(
        root,
        CACHE + "/checkpoint.json",
        JSON.stringify(checkpoint, null, 2) + "\n",
      );
      if (completed % 25 === 0)
        console.log(`Assets ${completed}/${sources.length}`);
      // Test-only callback permits a controlled interruption; not exposed as a runtime/environment bypass.
      if (opt.afterSource) await opt.afterSource(completed, source);
    }
  }
  await Promise.all(Array.from({ length: opt.concurrency ?? 2 }, worker));
  let variants = ordered(
    [...results.values()].flatMap((r) => r.variants),
    "variantId",
  );
  const physicalByHash = new Map();
  for (const v of variants)
    if (v.kind === "physical") {
      const duplicate = physicalByHash.get(v.sha256);
      if (duplicate) {
        // Only remove the exact newly-owned duplicate with verified hash; never prune unknown files.
        const p = safePath(root, v.path);
        if (
          !v.path.startsWith(OUTPUT + "/") ||
          sha256(readFileSync(p)) !== v.sha256
        )
          throw Error("duplicate-cleanup-guard");
        unlinkSync(p);
        v.kind = "alias";
        v.aliasOf = duplicate.variantId;
        v.aliasReason = "identical-encoded-bytes";
        v.path = duplicate.path;
        v.status = v.runtimeUsable ? "alias" : v.status;
      } else physicalByHash.set(v.sha256, v);
    }
  // Update checkpoint aliases so resume sees the canonical files, not removed duplicate paths.
  const canonical = new Map(variants.map((v) => [v.variantId, v]));
  for (const v of variants)
    if (v.kind === "alias") {
      const visited = new Set([v.variantId]);
      let target = canonical.get(v.aliasOf);
      while (target?.kind === "alias") {
        if (visited.has(target.variantId)) throw Error("alias-cycle");
        visited.add(target.variantId);
        target = canonical.get(target.aliasOf);
      }
      if (target) {
        v.aliasOf = target.variantId;
        v.path = target.path;
      }
    }
  for (const r of Object.values(checkpoint.results))
    r.variants = r.variants.map((v) => canonical.get(v.variantId) ?? v);
  atomicWrite(
    root,
    CACHE + "/checkpoint.json",
    JSON.stringify(checkpoint, null, 2) + "\n",
  );
  const errors = [...results.values()].flatMap((r) => r.errors);
  const result = {
    schemaVersion: 1,
    profileVersion: PROFILES.version,
    policyHash,
    processor: { name: "sharp", version: sharp.versions.sharp },
    expectedLogicalVariantCount: sources.reduce(
      (n, s) => n + expectedProfiles(s).length,
      0,
    ),
    variants,
    errors,
  };
  await document(root, CATALOG + "asset-variants.v1.json", result);
  account.unnecessaryRegenerated = account.written;
  account.previousLogicalCount = prior.variants.length;
  return { result, account };
}
if (isMain(import.meta.url)) {
  const opt = options();
  if (opt.dryRun || opt.verifyOnly)
    console.log(
      "No writes: use assets:catalog -- --dry-run or assets:verify-variants",
    );
  else {
    const release = acquireLock(ROOT);
    try {
      const r = await derive(ROOT, opt);
      console.log(r.account);
      if (r.result.errors.length) process.exitCode = 1;
    } finally {
      release();
    }
  }
}
