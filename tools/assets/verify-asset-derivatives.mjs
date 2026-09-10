import { existsSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { isMain } from "./asset-utils.mjs";
import { sourcePaths, eligibility } from "./build-full-catalog.mjs";
import { expectedProfiles } from "./generate-asset-derivatives.mjs";
import {
  ROOT,
  CATALOG,
  OUTPUT,
  PROFILES,
  POLICY,
  readJson,
  safePath,
  sha256,
  profilesFor,
} from "./variant-common.mjs";
export async function verify(root = ROOT) {
  const c = readJson(root, CATALOG + "asset-source-catalog.v1.json"),
    d = readJson(root, CATALOG + "asset-variants.v1.json"),
    assets = readJson(root, CATALOG + "asset-manifest.v1.json").assets;
  const errors = [],
    fail = (code, id = "catalog") => errors.push({ code, id });
  if (!c || !d || c.schemaVersion !== 1 || d.schemaVersion !== 1)
    throw Error("catalog-schema-missing");
  const scan = sourcePaths(root),
    sourceMap = new Map(c.sources.map((s) => [s.sourceId, s])),
    byPath = new Map(c.sources.map((s) => [s.path, s])),
    byId = new Map(d.variants.map((v) => [v.variantId, v]));
  if (
    scan.length !== byPath.size ||
    c.scanSourceCount !== scan.length ||
    scan.some((p) => !byPath.has(p))
  )
    fail("source-coverage");
  if (byPath.size !== c.sources.length || sourceMap.size !== c.sources.length)
    fail("source-unique");
  if (byId.size !== d.variants.length) fail("variant-unique");
  let expected = 0,
    totalBytes = 0;
  const hashes = new Set();
  for (const s of c.sources) {
    if (
      !existsSync(safePath(root, s.path)) ||
      sha256(readFileSync(safePath(root, s.path))) !== s.sha256
    )
      fail("source-protection", s.path);
    const profiles = expectedProfiles(s);
    expected += profiles.length;
    for (const p of profiles)
      if (!byId.has(s.assetId + "::" + p))
        fail("missing-logical-profile", s.assetId + "::" + p);
  }
  if (
    expected !== d.expectedLogicalVariantCount ||
    expected !== d.variants.length
  )
    fail("expected-equation");
  for (const a of assets.filter((a) => a.runtime.kind === "local"))
    if (!byPath.has("public" + a.runtime.path)) fail("manifest-unmapped", a.id);
  for (const v of d.variants) {
    const s = sourceMap.get(v.sourceId),
      p = PROFILES.profiles.find((p) => p.id === v.profileId),
      asset = assets.find((a) => a.id === v.assetId);
    if (!s || v.sourceSha256 !== s.sha256) {
      fail("variant-source", v.variantId);
      continue;
    }
    if (!expectedProfiles(s).includes(v.profileId))
      fail("unexpected-profile", v.variantId);
    const blocked = eligibility(s, asset);
    if (
      v.kind !== "unavailable" &&
      blocked &&
      !(v.kind === "vector-token" && blocked === "vector-token-only")
    )
      fail("rights-bypass", v.variantId);
    if (v.kind === "unavailable") {
      if (v.path || v.runtimeUsable || !v.errorCode)
        fail("unavailable-path", v.variantId);
      continue;
    }
    if (v.status === "review_required" && v.runtimeUsable)
      fail("review-runtime", v.variantId);
    if (v.kind === "vector-token") {
      if (
        s.mediaType !== "svg" ||
        v.path !== s.path ||
        !profilesFor(s).includes(v.profileId) ||
        v.width !== PROFILES.vectorTokens[v.profileId]?.width ||
        v.height !== PROFILES.vectorTokens[v.profileId]?.height
      )
        fail("vector-token", v.variantId);
      continue;
    }
    if (v.kind === "alias") {
      const visited = new Set([v.variantId]);
      let target = byId.get(v.aliasOf);
      while (target?.kind === "alias") {
        if (visited.has(target.variantId)) {
          fail("alias-cycle", v.variantId);
          target = null;
          break;
        }
        visited.add(target.variantId);
        target = byId.get(target.aliasOf);
      }
      if (
        !target ||
        target.kind !== "physical" ||
        target.path !== v.path ||
        target.sha256 !== v.sha256 ||
        target.width !== v.width ||
        target.height !== v.height
      )
        fail("invalid-alias", v.variantId);
      continue;
    }
    if (
      v.kind !== "physical" ||
      !v.path?.startsWith(OUTPUT + "/") ||
      !/^public\/media\/generated\/v1\/[a-z0-9-]+\/[a-z0-9-]+\.(webp|jpg|png)$/.test(
        v.path,
      )
    ) {
      fail("output-path", v.variantId);
      continue;
    }
    if (!existsSync(safePath(root, v.path))) {
      fail("missing-output", v.variantId);
      continue;
    }
    const bytes = readFileSync(safePath(root, v.path));
    try {
      const meta = await sharp(bytes).metadata();
      await sharp(bytes).raw().toBuffer();
      if (meta.exif || meta.xmp || meta.iptc)
        fail("private-metadata", v.variantId);
      if (
        meta.width !== v.width ||
        meta.height !== v.height ||
        meta.format !== v.format ||
        bytes.length !== v.bytes ||
        sha256(bytes) !== v.sha256
      )
        fail("integrity", v.variantId);
      if (meta.width > s.width || meta.height > s.height)
        fail("upscale", v.variantId);
      if (
        bytes.length > p.maxBytes ||
        bytes.length > POLICY.singleObjectMaxBytes
      )
        fail("byte-budget", v.variantId);
      if (
        p.fit !== "inside" &&
        v.status === "exact" &&
        (v.width !== p.width || v.height !== p.height)
      )
        fail("not-exact", v.variantId);
      if (
        p.fit === "cover" &&
        !s.focalPoint &&
        (!v.focalPointDefaulted || v.status !== "review_required")
      )
        fail("focal-review", v.variantId);
      if (hashes.has(v.sha256)) fail("duplicate-physical", v.variantId);
      hashes.add(v.sha256);
      totalBytes += bytes.length;
    } catch {
      fail("decode-output", v.variantId);
    }
  }
  if (totalBytes > POLICY.batchHardBytes) fail("total-byte-budget");
  if (d.errors.length) fail("processing-errors");
  const paths = [
    ...c.sources.map((s) => s.path),
    ...d.variants.map((v) => v.path).filter(Boolean),
  ];
  if (paths.some((p) => /^(?:[A-Z]:[\\/]|\/|file:\/\/)/.test(p)))
    fail("absolute-local-path");
  return {
    sourceCount: c.sources.length,
    logicalCount: d.variants.length,
    physicalCount: d.variants.filter((v) => v.kind === "physical").length,
    totalBytes,
    errors,
  };
}
if (isMain(import.meta.url)) {
  const result = await verify();
  console.log(result);
  if (result.errors.length) process.exitCode = 1;
}
