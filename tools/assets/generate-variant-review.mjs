import { relative, dirname } from "node:path";
import { csv, duplicateGroups, isMain } from "./asset-utils.mjs";
import {
  ROOT,
  CATALOG,
  REPORTS,
  OUTPUT,
  POLICY,
  readJson,
  document,
  html,
  acquireLock,
  options,
} from "./variant-common.mjs";
import { walk } from "./build-full-catalog.mjs";
export const counts = (items, key) =>
  Object.fromEntries(
    [...new Set(items.map((i) => i[key] ?? "unknown"))]
      .sort()
      .map((k) => [k, items.filter((i) => (i[key] ?? "unknown") === k).length]),
  );
function table(headers, rows) {
  return (
    [
      "| " + headers.join(" | ") + " |",
      "| " + headers.map(() => "---").join(" | ") + " |",
      ...rows.map(
        (r) =>
          "| " +
          r
            .map((v) =>
              String(v ?? "—")
                .replaceAll("|", "\\|")
                .replaceAll("\n", " "),
            )
            .join(" | ") +
          " |",
      ),
    ].join("\n") + "\n"
  );
}
export async function review(root = ROOT) {
  const c = readJson(root, CATALOG + "asset-source-catalog.v1.json"),
    u = readJson(root, CATALOG + "asset-usage-map.v1.json"),
    d = readJson(root, CATALOG + "asset-variants.v1.json");
  const sources = c.sources,
    variants = d.variants,
    physical = variants.filter((v) => v.kind === "physical"),
    groups = duplicateGroups(sources),
    oversize = sources.filter(
      (s) =>
        s.bytes > POLICY.sourceMaxBytes ||
        s.width * s.height > POLICY.sourceMaxPixels,
    );
  const missing = variants.filter(
      (v) => v.kind === "unavailable" || v.degraded,
    ),
    focal = variants.filter(
      (v) => v.focalPointDefaulted || v.errorCode?.includes("safe-area"),
    );
  const stale = walk(root, OUTPUT).filter(
    (p) => !variants.some((v) => v.path === p),
  );
  const stats = {
    sourceCount: sources.length,
    sourceBytes: sources.reduce((n, s) => n + s.bytes, 0),
    scope: counts(sources, "scope"),
    mediaType: counts(sources, "mediaType"),
    referenced: sources.filter((s) => s.referenced).length,
    orphan: sources.filter((s) => !s.referenced).length,
    manifested: sources.filter((s) => !s.assetId.startsWith("unregistered."))
      .length,
    protected: sources.filter((s) => s.protected).length,
    eligibleRaster: sources.filter((s) => s.processingEligibility).length,
    ineligibleByReason: counts(
      sources.filter((s) => !s.processingEligibility),
      "processingBlockReason",
    ),
    external: counts(c.externalAssets, "status"),
    logical: variants.length,
    kinds: counts(variants, "kind"),
    profiles: Object.fromEntries(
      [...new Set(variants.map((v) => v.profileId))].sort().map((p) => [
        p,
        counts(
          variants.filter((v) => v.profileId === p),
          "kind",
        ),
      ]),
    ),
    generatedBytes: physical.reduce((n, v) => n + v.bytes, 0),
    duplicateSourceGroups: groups.length,
    duplicateOutputGroups: duplicateGroups(physical).length,
    oversize: oversize.length,
    focalReview: focal.length,
    processingErrors: d.errors.length,
    unresolvedReferences: u.references.filter((r) => !r.resolved).length,
    staleOutputs: stale,
  };
  await document(root, REPORTS + "asset-variant-statistics.json", stats);
  const reports = {
    "all-assets-checklist.md":
      "# All Assets Checklist\n\nSources: " +
      sources.length +
      ". Catalog coverage: 100%. Includes documentation evidence; permission is not inferred.\n\n" +
      table(
        ["Source", "Type", "Size", "Bytes", "Status", "Eligible", "References"],
        sources.map((s) => [
          s.path,
          s.mediaType,
          `${s.width ?? "?"} × ${s.height ?? "?"}`,
          s.bytes,
          s.manifestStatus,
          s.processingBlockReason ?? "yes",
          s.referenceCount,
        ]),
      ),
    "asset-usage-report.md":
      "# Asset Usage\n\nLiteral import / require / URL / CSS / Markdown / HTML references and manifest declarations. Computed and historical unresolved paths are not guessed; orphan does not mean safe to delete.\n\n" +
      table(
        ["File", "Line", "Source", "Type", "Resolved"],
        u.references.map((r) => [
          r.sourceFile,
          r.line,
          r.sourcePath,
          r.referenceType,
          r.resolved,
        ]),
      ),
    "orphan-assets.md":
      "# Orphan Assets\n\nNo discovered literal or manifest reference; keep every original.\n\n" +
      table(
        ["Source", "Scope"],
        sources.filter((s) => !s.referenced).map((s) => [s.path, s.scope]),
      ),
    "asset-variant-matrix.md":
      "# Asset Variant Matrix\n\nExpected = physical + alias + vector-token + source-provided + unavailable = " +
      variants.length +
      ". Unknown-role rasters retain unresolved S/M/L; special mappings only use declared roles. Nonlocal acquisition requests remain in the external catalog, not fictitious source files.\n\n" +
      table(
        [
          "Asset",
          "Profile",
          "Kind",
          "Status",
          "Actual size",
          "Bytes",
          "Reason",
        ],
        variants.map((v) => [
          v.assetId,
          v.profileId,
          v.kind,
          v.status,
          `${v.width ?? "?"} × ${v.height ?? "?"}`,
          v.bytes,
          v.errorCode ?? v.aliasReason,
        ]),
      ),
    "missing-variants.md":
      "# Missing / Degraded Variants\n\nRights-blocked, undersized and unknown-role sources are explicit; no fake completion.\n\n" +
      table(
        ["Asset", "Profile", "Kind", "Reason"],
        missing.map((v) => [
          v.assetId,
          v.profileId,
          v.kind,
          v.errorCode ?? v.aliasReason,
        ]),
      ),
    "duplicate-report.md":
      "# Duplicate Report\n\nExact source SHA groups; originals are never merged or deleted. Physical derivative duplicates are canonical aliases.\n\n" +
      table(
        ["SHA", "Paths"],
        groups.map((g) => [g.sha256, g.paths.join("; ")]),
      ) +
      "\n## Stale generated files (report only)\n\n" +
      (stale.join("\n") || "None.") +
      "\n",
    "oversize-assets.md":
      "# Oversize Assets\n\nSource isolation limits: 50 MiB / 80 MP. Existing Git originals over 20 MiB are also reported, not modified.\n\n" +
      table(
        ["Source", "Bytes", "Pixels"],
        sources
          .filter(
            (s) =>
              s.bytes > POLICY.singleObjectMaxBytes ||
              s.width * s.height > POLICY.sourceMaxPixels,
          )
          .map((s) => [s.path, s.bytes, s.width * s.height]),
      ) +
      `\nGenerated total: ${stats.generatedBytes} bytes. Soft ${POLICY.batchSoftBytes}, hard ${POLICY.batchHardBytes}.\n`,
    "focal-point-review.md":
      "# Focal Point Review\n\nDefault-center cover crops are not runtime approved; impossible safe areas remain unavailable.\n\n" +
      table(
        ["Asset", "Profile", "Reason"],
        focal.map((v) => [
          v.assetId,
          v.profileId,
          v.errorCode ?? "default-center-review-required",
        ]),
      ),
    "asset-processing-errors.csv": csv(d.errors, [
      "sourceId",
      "profileId",
      "errorCode",
      "retryCount",
    ]),
  };
  for (const [file, content] of Object.entries(reports))
    await document(root, REPORTS + file, content);
  const preview = "assets/design/asset-library/previews/variant-review.html";
  const href = (path) => relative(dirname(preview), path).replaceAll("\\", "/");
  const cards = sources
    .filter(
      (s) =>
        s.processingEligibility ||
        (s.mediaType === "svg" &&
          s.processingBlockReason === "vector-token-only"),
    )
    .map(
      (s) =>
        `<article><h2>${html(s.assetId)}</h2><p>${html(s.rightsStatus)} · ${html(s.authenticity)} · ${html(s.manifestStatus)} · ${s.referenceCount} references</p><p>Focal ${html(JSON.stringify(s.focalPoint))}; safe area ${html(JSON.stringify(s.safeArea))}</p><div class="grid"><figure><img loading="lazy" src="${html(href(s.path))}" alt="Source ${html(s.assetId)}"><figcaption>Source · ${s.width} × ${s.height} · ${s.bytes} B</figcaption></figure>${variants
          .filter((v) => v.sourceId === s.sourceId)
          .map(
            (v) =>
              `<figure>${v.path ? `<img loading="lazy" src="${html(href(v.path))}" width="${v.width}" height="${v.height}" alt="${html(v.profileId)}">` : "<span>Unavailable</span>"}<figcaption>${html(v.profileId)} · ${html(v.kind)}<br>${v.width ?? "?"} × ${v.height ?? "?"} · ${v.bytes} B · ${html(v.format)}<br>${html(v.status)} ${html(v.errorCode ?? v.aliasReason ?? "")}</figcaption></figure>`,
          )
          .join("")}</div></article>`,
    )
    .join("");
  await document(
    root,
    preview,
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' file:; style-src 'unsafe-inline'"><title>TravelAssist asset variants</title><style>*{box-sizing:border-box}body{background:#fbf4ea;color:#344657;font:14px/1.5 system-ui;margin:0;padding:24px}h1{font:32px Georgia}h2{font-size:16px;overflow-wrap:anywhere}article{margin:24px 0;padding:20px;border:1px solid #e5d9cb;border-radius:16px;background:#fffaf3}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}figure{margin:0;min-width:0;padding:12px;background:#f1ece5;border-radius:10px;overflow-wrap:anywhere}img{display:block;max-width:100%;max-height:180px;object-fit:contain;margin:auto}figcaption{font-size:12px;margin-top:10px}@media(max-width:450px){body{padding:12px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}article{padding:10px}}</style></head><body><h1>TravelAssist / Asset variants</h1><p>${sources.length} sources · ${stats.eligibleRaster} eligible raster · ${physical.length} physical files · ${stats.generatedBytes} generated bytes.</p><p>Rights review is not bypassed. No approved photographs currently means no production raster derivatives, not a broken processor. Synthetic test fixtures are temporary and never part of this catalog.</p><p><a href="${href(REPORTS + "all-assets-checklist.md")}">All source checklist</a> · <a href="${href(REPORTS + "missing-variants.md")}">Unavailable variants</a></p>${cards}</body></html>`,
  );
  return stats;
}
if (isMain(import.meta.url)) {
  const opt = options();
  if (opt.dryRun || opt.verifyOnly)
    console.log("Read-only mode: no review written");
  else {
    const release = acquireLock(ROOT);
    try {
      console.log(await review());
    } finally {
      release();
    }
  }
}
