import { readFileSync, readdirSync, existsSync } from "node:fs";
import { extname, dirname, posix } from "node:path";
import sharp from "sharp";
import {
  dimensions,
  PROTECTED,
  csv,
  duplicateGroups,
  isMain,
} from "./asset-utils.mjs";
import { validateAsset } from "./validate-asset-library.mjs";
import {
  ROOT,
  CATALOG,
  OUTPUT,
  POLICY,
  sha256,
  ordered,
  safePath,
  readJson,
  document,
  acquireLock,
  options,
} from "./variant-common.mjs";
const extensions = new Set(
  "svg png jpg jpeg webp avif gif ico bmp tif tiff mp4 webm mov lottie woff woff2".split(
    " ",
  ),
);
const excluded = new Set([
  ".git",
  "node_modules",
  ".next",
  "coverage",
  "dist",
  "build",
  "tmp",
  ".cache",
]);
export function walk(root, dir = "") {
  const abs = dir ? safePath(root, dir) : root;
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .flatMap((e) => {
      const p = (dir ? dir + "/" : "") + e.name;
      if (e.isSymbolicLink() || excluded.has(e.name)) return [];
      return e.isDirectory() ? walk(root, p) : e.isFile() ? [p] : [];
    })
    .sort();
}
function mediaType(ext, data) {
  if (ext === "svg") return "svg";
  if (["mp4", "webm", "mov"].includes(ext)) return "video";
  if (["woff", "woff2"].includes(ext)) return "font";
  if (ext === "lottie") return "animation";
  if (ext === "json" || ext === "webmanifest")
    return Array.isArray(data?.layers) && typeof data.fr === "number"
      ? "animation"
      : "metadata";
  return "raster";
}
export function sourcePaths(root) {
  return walk(root).filter((p) => {
    if (p.startsWith(OUTPUT.split("/v1")[0] + "/")) return false;
    if (
      !/^(public\/|assets\/design\/|docs\/|src\/|app\/)/.test(p) &&
      p.includes("/")
    )
      return false;
    const ext = extname(p).slice(1).toLowerCase();
    if (extensions.has(ext)) return true;
    if (
      !["json", "webmanifest"].includes(ext) ||
      p.startsWith(CATALOG) ||
      p.startsWith("docs/assets/generated/")
    )
      return false;
    try {
      const j = JSON.parse(readFileSync(safePath(root, p), "utf8"));
      return (
        ext === "webmanifest" ||
        (Array.isArray(j.layers) && typeof j.fr === "number") ||
        /(?:asset[-.]manifest|\.manifest\.json|manifest\.webmanifest)/i.test(p)
      );
    } catch {
      return false;
    }
  });
}
export function eligibility(source, asset, now = Date.now()) {
  if (!asset) return "unmanifested-review-required";
  if (asset.runtime.kind !== "local")
    return asset.status === "provider_only"
      ? "provider-only"
      : "nonlocal-" + asset.status;
  if (asset.status !== "approved") return "status-" + asset.status;
  if (
    asset.rights.expiresAt !== null &&
    (!Number.isFinite(Date.parse(asset.rights.expiresAt)) ||
      Date.parse(asset.rights.expiresAt) <= now)
  )
    return "expired";
  if (asset.rights.cacheAllowed !== true) return "cache-forbidden";
  if (asset.rights.derivativesAllowed !== true) return "derivatives-forbidden";
  // The parent schema is authoritative. Missing focalPoint is the one permitted review-crop exception.
  const errors = validateAsset(asset, false, now).filter(
    (e) => !e.endsWith(": focalPoint"),
  );
  if (errors.length) return "parent-metadata-invalid";
  if (!source) return "source-missing";
  if (
    source.sha256 !== asset.integrity.sha256 ||
    source.bytes !== asset.integrity.bytes
  )
    return "source-integrity-mismatch";
  if (source.mediaType === "svg") return "vector-token-only";
  if (source.mediaType !== "raster") return source.mediaType + "-register-only";
  if (source.animated) return "animated-register-only";
  if (source.bytes > POLICY.sourceMaxBytes) return "source-byte-limit";
  if (source.width * source.height > POLICY.sourceMaxPixels)
    return "source-pixel-limit";
  if (!source.width || !source.height || source.decodeError)
    return "decode-failed";
  if (
    !["png", "jpg", "jpeg", "webp", "avif", "tif", "tiff"].includes(
      source.extension,
    )
  )
    return "unsupported-raster";
  if (!POLICY.rasterRoles[source.assetRole]) return "unknown-role";
  if (source.assetRole === "brand_mark" && !source.brandIconSource)
    return "brand-source-not-designated";
  return null;
}
export async function inspect(root, path, asset, legacy) {
  const buffer = readFileSync(safePath(root, path)),
    extension = extname(path).slice(1).toLowerCase();
  const data = ["json", "webmanifest"].includes(extension)
    ? JSON.parse(buffer.toString())
    : null;
  const type = mediaType(extension, data);
  let meta = {
      ...dimensions(buffer, "." + extension),
      hasAlpha: null,
      pages: null,
      space: null,
      orientation: null,
    },
    decodeError = null;
  if (
    type === "raster" &&
    buffer.length <= POLICY.sourceMaxBytes &&
    !["ico", "bmp"].includes(extension)
  ) {
    try {
      meta = await sharp(buffer, {
        limitInputPixels: POLICY.sourceMaxPixels,
        animated: true,
      }).metadata();
    } catch {
      decodeError = "metadata-decode-failed";
    }
  }
  const swapped = [5, 6, 7, 8].includes(meta.orientation);
  const width =
      (swapped ? (meta.pageHeight ?? meta.height) : meta.width) ?? null,
    height = (swapped ? meta.width : (meta.pageHeight ?? meta.height)) ?? null;
  const scope = path.startsWith("docs/")
    ? "documentation-only"
    : /\/previews?\//.test(path)
      ? "preview-only"
      : path.startsWith("assets/design/")
        ? "design-source"
        : PROTECTED.some((p) => path.startsWith(p))
          ? "legacy-protected"
          : path.startsWith("public/")
            ? "runtime-source"
            : "unknown-review-required";
  const role = asset
    ? (POLICY.roleAliases[asset.assetType] ?? asset.assetType)
    : null;
  const source = {
    sourceId: "source-" + sha256(path).slice(0, 20),
    assetId: asset?.id ?? "unregistered." + sha256(path).slice(0, 20),
    path,
    scope,
    mediaType: type,
    mimeType:
      type === "svg"
        ? "image/svg+xml"
        : type === "raster"
          ? "image/" + (extension === "jpg" ? "jpeg" : extension)
          : type === "metadata"
            ? "application/json"
            : type + "/" + extension,
    extension,
    bytes: buffer.length,
    sha256: sha256(buffer),
    width,
    height,
    aspectRatio: width && height ? Number((width / height).toFixed(6)) : null,
    orientation: meta.orientation ?? null,
    hasAlpha: meta.hasAlpha ?? (type === "svg" ? true : null),
    animated: type === "animation" || (meta.pages ?? 1) > 1,
    frameCount: meta.pages ?? (type === "raster" ? 1 : null),
    colorSpace: meta.space ?? null,
    entityType: asset?.entity.type ?? null,
    entityId: asset?.entity.id ?? null,
    assetRole: role,
    sourceType: asset?.source.type ?? null,
    rightsStatus: asset?.rights.license ?? "unknown",
    cacheAllowed: asset?.rights.cacheAllowed ?? null,
    derivativesAllowed: asset?.rights.derivativesAllowed ?? null,
    authenticity: asset?.authenticity ?? legacy?.authenticity ?? "unreviewed",
    manifestStatus:
      asset?.status ??
      (legacy ? "legacy_review_required" : "unknown-review-required"),
    protected: PROTECTED.some((p) => path.startsWith(p)),
    referenced: false,
    referenceCount: 0,
    referenceLocations: [],
    focalPoint: asset?.presentation.focalPoint ?? null,
    safeArea: asset?.presentation.safeArea ?? null,
    brandIconSource: asset?.presentation.brandIconSource === true,
    additionalProfiles: asset?.presentation.additionalProfiles ?? [],
    variantPolicyId: role,
    processingEligibility: false,
    processingBlockReason: null,
    duplicateGroup: null,
    decodeError,
    notes: [
      "Inventory is not rights approval. Unknown dimensions remain null; no originals are changed.",
    ],
  };
  source.processingBlockReason = eligibility(source, asset);
  source.processingEligibility = source.processingBlockReason === null;
  return source;
}
export function usageScan(root, sources) {
  const paths = new Set(sources.map((s) => s.path)),
    lookup = new Map(sources.map((s) => [s.path, s]));
  const references = [];
  const texts = walk(root).filter(
    (p) =>
      /^(src|app|docs|assets\/design|public)\//.test(p) &&
      /\.(?:tsx?|jsx?|mjs|css|scss|md|html|json|webmanifest)$/.test(p) &&
      !p.startsWith(CATALOG) &&
      !p.startsWith("docs/assets/generated/") &&
      !p.endsWith("variant-review.html") &&
      !/RESULT-TASK-013\.1|TASK-013\.1/.test(p),
  );
  const regex =
    /(?:["'`(])([^"'`<>\s()]+\.(?:svg|png|jpe?g|webp|avif|gif|ico|bmp|tiff?|mp4|webm|mov|lottie|woff2?)(?:[?#][^"'`<>\s)]*)?)/gi;
  for (const file of texts) {
    const text = readFileSync(safePath(root, file), "utf8");
    for (const match of text.matchAll(regex)) {
      const literal = match[1];
      if (/^(https?:|data:|blob:|file:)/.test(literal)) continue;
      const clean = literal.split(/[?#]/)[0];
      const candidates = clean.startsWith("/")
        ? ["public" + clean]
        : clean.startsWith("@/")
          ? ["src/" + clean.slice(2)]
          : [
              posix.normalize(
                posix.join(dirname(file).replaceAll("\\", "/"), clean),
              ),
              clean,
            ];
      const path = candidates.find((p) => paths.has(p)) ?? candidates[0];
      const s = lookup.get(path),
        line = text.slice(0, match.index).split("\n").length;
      const nearby = text.slice(Math.max(0, match.index - 100), match.index);
      const referenceType = file.endsWith(".css")
        ? "css-url"
        : /import|require\(|new URL\(/.test(nearby)
          ? "import"
          : file.endsWith(".md")
            ? "markdown"
            : file.endsWith(".html")
              ? "html"
              : "literal";
      references.push({
        assetId: s?.assetId ?? null,
        sourcePath: path,
        referenceType,
        route: file.startsWith("src/app/")
          ? file.slice(7).replace(/\/page\.tsx?$/, "")
          : null,
        component: /\.[jt]sx$/.test(file) ? file.split("/").at(-1) : null,
        sourceFile: file,
        line,
        usageRole: s?.assetRole ?? null,
        expectedProfile: null,
        resolved: !!s,
        reason: s
          ? null
          : literal.includes("${")
            ? "computed-reference"
            : "unresolved-local-reference",
      });
    }
  }
  for (const s of sources)
    if (!s.assetId.startsWith("unregistered."))
      references.push({
        assetId: s.assetId,
        sourcePath: s.path,
        referenceType: "manifest",
        route: null,
        component: null,
        sourceFile: CATALOG + "asset-manifest.v1.json",
        line: 1,
        usageRole: s.assetRole,
        expectedProfile: null,
        resolved: true,
        reason: null,
      });
  return references.sort(
    (a, b) =>
      a.sourceFile.localeCompare(b.sourceFile) ||
      a.line - b.line ||
      a.sourcePath.localeCompare(b.sourcePath),
  );
}
export async function buildCatalog(root = ROOT, { write = true } = {}) {
  const manifest = readJson(root, CATALOG + "asset-manifest.v1.json");
  if (manifest?.schemaVersion !== 1 || !Array.isArray(manifest.assets))
    throw Error("parent-schema-missing");
  const locals = new Map(
    manifest.assets
      .filter((a) => a.runtime.kind === "local")
      .map((a) => ["public" + a.runtime.path, a]),
  );
  if (
    locals.size !==
    manifest.assets.filter((a) => a.runtime.kind === "local").length
  )
    throw Error("duplicate-manifest-path");
  const legacy = new Map(
    readJson(root, CATALOG + "legacy-inventory.v1.json", {
      entries: [],
    }).entries.map((s) => [s.path, s]),
  );
  const paths = sourcePaths(root),
    sources = [];
  for (const path of paths)
    sources.push(await inspect(root, path, locals.get(path), legacy.get(path)));
  for (const path of locals.keys())
    if (!paths.includes(path)) throw Error("manifest-local-unmapped: " + path);
  const usages = usageScan(root, sources),
    duplicates = duplicateGroups(sources);
  for (const s of sources) {
    const refs = usages.filter((u) => u.sourcePath === s.path && u.resolved);
    s.referenceLocations = refs.map((u) => ({
      sourceFile: u.sourceFile,
      line: u.line,
      referenceType: u.referenceType,
    }));
    s.referenceCount = refs.length;
    s.referenced = refs.length > 0;
    s.duplicateGroup =
      duplicates.find((g) => g.paths.includes(s.path))?.sha256 ?? null;
  }
  const catalog = {
    schemaVersion: 1,
    scanSourceCount: paths.length,
    sourceCatalogUniquePathCount: new Set(paths).size,
    uncataloguedSourceCount: 0,
    scanPolicy:
      "All visual files in public/assets/design/docs/src/app and root; asset/Lottie metadata only. No symlinks. Generated variants tracked separately, not sources. Self-generated reports/catalogs excluded from usage scan; unresolved historical/dynamic references are reported, not guessed.",
    sources: ordered(sources, "path"),
    externalAssets: ordered(
      manifest.assets
        .filter((a) => a.runtime.kind !== "local")
        .map((a) => ({
          assetId: a.id,
          status: a.status,
          runtime: a.runtime,
          assetRole: POLICY.roleAliases[a.assetType] ?? a.assetType,
          processingBlockReason: eligibility(null, a),
          authenticity: a.authenticity,
        })),
      "assetId",
    ),
  };
  const usage = { schemaVersion: 1, references: usages };
  if (write) {
    await document(root, CATALOG + "asset-source-catalog.v1.json", catalog);
    await document(
      root,
      CATALOG + "asset-source-catalog.v1.csv",
      csv(
        sources.map((s) => ({
          ...s,
          referenceLocations: JSON.stringify(s.referenceLocations),
          focalPoint: JSON.stringify(s.focalPoint),
          safeArea: JSON.stringify(s.safeArea),
          notes: s.notes.join(" "),
        })),
        Object.keys(sources[0] ?? {}),
      ),
    );
    await document(root, CATALOG + "asset-usage-map.v1.json", usage);
  }
  return { catalog, usage };
}
if (isMain(import.meta.url)) {
  const opt = options(),
    release = opt.dryRun ? () => {} : acquireLock(ROOT);
  try {
    const { catalog } = await buildCatalog(ROOT, {
      write: !opt.dryRun && !opt.verifyOnly,
    });
    console.log({
      sources: catalog.sources.length,
      eligible: catalog.sources.filter((s) => s.processingEligibility).length,
    });
  } finally {
    release();
  }
}
