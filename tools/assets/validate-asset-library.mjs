import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve, basename, extname } from "node:path";
import {
  BASE,
  ROOT,
  CATALOG,
  PROTECTED,
  IMAGE_EXT,
  files,
  read,
  json,
  measure,
  parseCsv,
  duplicateGroups,
  isMain,
} from "./asset-utils.mjs";
import {
  groups,
  prefix,
  sharedId,
  packPlaceholder,
  packSeeds,
  columns,
} from "./generate-foundation.mjs";
export function svgErrors(svg) {
  const errors = [];
  if (
    !/^\s*<svg\s[^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/i.test(svg) ||
    !/viewBox=["']0 0 [\d.]+ [\d.]+["']/.test(svg)
  )
    errors.push("svg-root/viewbox");
  // Allowlist rather than relying on a blacklist of executable constructs.
  const tags = [...svg.matchAll(/<\/?([\w:-]+)/g)].map((match) => match[1]);
  if (
    tags.some(
      (tag) =>
        ![
          "svg",
          "g",
          "path",
          "rect",
          "circle",
          "ellipse",
          "line",
          "polyline",
          "polygon",
        ].includes(tag),
    )
  )
    errors.push("svg-forbidden-element");
  if (
    /\bon\w+\s*=|(?:href|src)\s*=|url\s*\(|data:|base64|@font|<\?|<!|&#|[\u{1F300}-\u{1FAFF}]/iu.test(
      svg,
    )
  )
    errors.push("svg-active/external-content");
  if (/\bstyle\s*=|\bfont[-\w]*\s*=/i.test(svg)) errors.push("svg-style/font");
  return errors;
}
const sourceTypes = [
  "brand_owned",
  "ai_generated",
  "licensed_stock",
  "official_tourism",
  "wikimedia_commons",
  "public_domain",
  "provider_reference",
  "user_generated",
  "placeholder",
];
const statuses = [
  "draft",
  "review_required",
  "approved",
  "rejected",
  "expired",
  "acquisition_required",
  "provider_only",
];
export function validateAsset(asset, readLocal = true, now = Date.now()) {
  const errors = [],
    fail = (message) => errors.push(`${asset?.id ?? "missing-id"}: ${message}`);
  if (!asset || typeof asset !== "object") return ["asset must be an object"];
  if (
    typeof asset.id !== "string" ||
    !/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(asset.id)
  )
    fail("id");
  if (
    !asset.assetType ||
    !asset.entity?.id ||
    !asset.entity?.type ||
    !asset.locale
  )
    fail("identity fields");
  if (
    !statuses.includes(asset.status) ||
    !sourceTypes.includes(asset.source?.type) ||
    !["documentary", "illustrative", "symbolic"].includes(asset.authenticity)
  )
    fail("enums");
  const r = asset.rights,
    p = asset.presentation,
    rt = asset.runtime,
    source = asset.source;
  if (!r || !p || !rt || !source || !asset.integrity) {
    fail("required metadata");
    return errors;
  }
  if (!["local", "none", "cdn", "provider_reference"].includes(rt.kind))
    fail("runtime kind");
  for (const key of ["provider", "sourceId", "sourceUrl"])
    if (
      !(key in source) ||
      (source[key] !== null && typeof source[key] !== "string")
    )
      fail(`source ${key}`);
  for (const key of ["license", "credit", "expiresAt"])
    if (!(key in r) || (r[key] !== null && typeof r[key] !== "string"))
      fail(`rights ${key}`);
  for (const key of [
    "commercialUseAllowed",
    "cacheAllowed",
    "derivativesAllowed",
  ])
    if (![true, false, null].includes(r[key])) fail(`rights ${key}`);
  if (
    typeof p.alt !== "string" ||
    typeof p.decorative !== "boolean" ||
    (p.decorative && p.alt !== "") ||
    (!p.decorative && !p.alt?.trim())
  )
    fail("alt semantics");
  if (
    ![p.focalPoint?.x, p.focalPoint?.y].every(
      (n) => typeof n === "number" && Number.isFinite(n) && n >= 0 && n <= 1,
    )
  )
    fail("focalPoint");
  if (!Number.isInteger(asset.integrity.bytes) || asset.integrity.bytes < 0)
    fail("bytes");
  if (
    ![p.width, p.height].every(
      (n) =>
        n === null || (typeof n === "number" && Number.isFinite(n) && n > 0),
    )
  )
    fail("dimension metadata");
  if (r.license && /^(?:any-license|internet|unknown.*)$/i.test(r.license))
    fail("ambiguous license");
  const expired =
    r.expiresAt !== null &&
    (!Number.isFinite(Date.parse(r.expiresAt)) ||
      Date.parse(r.expiresAt) <= now);
  if (
    ["approved", "provider_only"].includes(asset.status) &&
    (expired ||
      !r.license?.trim() ||
      !r.credit?.trim() ||
      r.commercialUseAllowed !== true ||
      !source.sourceId ||
      !source.provider)
  )
    fail("approved/source/rights/expiry");
  if (
    asset.status === "approved" &&
    (!["local", "cdn"].includes(rt.kind) ||
      r.cacheAllowed !== true ||
      r.derivativesAllowed !== true)
  )
    fail("approved runtime permissions");
  if (
    asset.status === "approved" &&
    !["placeholder", "brand_owned"].includes(source.type) &&
    !source.sourceUrl?.startsWith("https://")
  )
    fail("approved source URL");
  if (
    ["ai_generated", "placeholder"].includes(source.type) &&
    asset.authenticity === "documentary"
  )
    fail("false documentary authenticity");
  if (
    asset.status === "acquisition_required" &&
    (rt.kind !== "none" ||
      rt.path ||
      rt.url ||
      asset.integrity.bytes !== 0 ||
      asset.integrity.sha256 !== null)
  )
    fail("acquisition runtime");
  if (
    asset.status === "provider_only" &&
    (rt.kind !== "provider_reference" ||
      rt.path ||
      rt.url ||
      source.type !== "provider_reference" ||
      r.cacheAllowed !== false ||
      asset.integrity.bytes !== 0 ||
      asset.integrity.sha256 !== null)
  )
    fail("provider cache/local path");
  if (rt.kind === "none" && (rt.path || rt.url)) fail("none runtime path");
  if (
    rt.kind === "provider_reference" &&
    (rt.path ||
      rt.url ||
      source.type !== "provider_reference" ||
      !source.sourceId ||
      !source.provider)
  )
    fail("provider identity/path");
  if (
    rt.kind === "cdn" &&
    (rt.path || !/^https:\/\//.test(rt.url ?? "") || r.cacheAllowed !== true)
  )
    fail("CDN metadata (adapter not enabled)");
  if (/CC[ -]BY/i.test(r.license ?? "")) {
    for (const key of [
      "author",
      "licenseVersion",
      "modificationNote",
      "attributionLocation",
    ])
      if (!r[key]) fail(`CC ${key}`);
    if (
      typeof r.modified !== "boolean" ||
      typeof r.shareAlike !== "boolean" ||
      !source.sourceUrl?.startsWith("https://") ||
      (/BY[ -]SA/i.test(r.license) && r.shareAlike !== true)
    )
      fail("CC license conditions");
  }
  if (rt.kind === "local") {
    if (
      !/^\/media\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(svg|png|jpe?g|webp|gif|avif)$/.test(
        rt.path ?? "",
      )
    ) {
      fail("local path / filename / extension");
      return errors;
    }
    if (![p.width, p.height].every((n) => Number.isFinite(n) && n > 0))
      fail("dimensions");
    if (!/^[0-9a-f]{64}$/.test(asset.integrity.sha256 ?? "")) fail("sha256");
    const cap =
      asset.assetType === "map-markers"
        ? 80000
        : extname(rt.path) === ".svg"
          ? 50000
          : 1000000;
    if (asset.integrity.bytes > cap || asset.integrity.bytes <= 0)
      fail("size budget");
    if (readLocal) {
      const path = "public" + rt.path;
      if (!existsSync(resolve(ROOT, path))) fail("local path missing");
      else {
        const actual = measure(path);
        if (
          actual.bytes !== asset.integrity.bytes ||
          actual.sha256 !== asset.integrity.sha256
        )
          fail("integrity mismatch");
        if (actual.width !== p.width || actual.height !== p.height)
          fail("dimension mismatch");
        if (extname(path) === ".svg")
          for (const message of svgErrors(read(path))) fail(message);
      }
    }
  } else if (asset.integrity.sha256 !== null || asset.integrity.bytes !== 0)
    fail("nonlocal integrity");
  if (
    /(?:[?&](?:token|key|sig|signature|auth|cookie|x-amz-[^=]+)=)|(?:github_pat_|ghp_|sk_live_|sb_secret_)|https?:\/\/[^\s/]+@|https?:\/\/(?:localhost|127\.|10\.|192\.168\.)/i.test(
      JSON.stringify(asset),
    )
  )
    fail("secret/private URL");
  return errors;
}
export function validateDuplicates(entries, aliases) {
  return duplicateGroups(entries)
    .filter(
      (group) =>
        !aliases.duplicateGroups?.some(
          (reported) =>
            reported.sha256 === group.sha256 &&
            group.paths.every((path) => reported.paths.includes(path)),
        ),
    )
    .map((g) => `unreported duplicate ${g.sha256}`);
}
export function protectedErrors() {
  const paths = execFileSync(
    "git",
    ["ls-tree", "-r", "--name-only", BASE, "--", ...PROTECTED],
    { cwd: ROOT, encoding: "utf8" },
  )
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const changed = execFileSync(
    "git",
    ["diff", "--name-only", BASE, "--", ...PROTECTED],
    { cwd: ROOT, encoding: "utf8" },
  ).trim();
  return [
    ...paths
      .filter((path) => !existsSync(resolve(ROOT, path)))
      .map((path) => `protected missing: ${path}`),
    ...(changed ? [`protected changed: ${changed}`] : []),
  ];
}
export function validateLibrary() {
  const errors = [],
    manifest = json(CATALOG + "asset-manifest.v1.json"),
    packs = json(CATALOG + "destination-packs.v1.json"),
    inventory = json(CATALOG + "legacy-inventory.v1.json"),
    aliases = json(CATALOG + "asset-aliases.v1.json"),
    rows = parseCsv(read(CATALOG + "acquisition-backlog.v1.csv"));
  for (const doc of [manifest, packs, inventory, aliases])
    if (doc.schemaVersion !== 1) errors.push("schemaVersion");
  if (inventory.baselineCommit !== BASE)
    errors.push("inventory baseline changed");
  const ids = new Set();
  for (const asset of manifest.assets) {
    if (ids.has(asset.id)) errors.push(`duplicate ID ${asset.id}`);
    ids.add(asset.id);
    errors.push(...validateAsset(asset));
  }
  const local = manifest.assets.filter(
    (asset) => asset.runtime.kind === "local",
  );
  const expected = [];
  for (const [group, shapes] of Object.entries(groups))
    for (const name of Object.keys(shapes)) {
      const path = `/media/shared/${group}/${prefix[group]}${name}.svg`;
      expected.push(path);
      if (
        !local.some(
          (a) => a.id === sharedId(group, name) && a.runtime.path === path,
        )
      )
        errors.push(`missing baseline ${path}`);
    }
  for (const seed of packSeeds) {
    expected.push(
      `/media/destinations/jp/${seed.slug}/placeholder-destination.svg`,
    );
    if (!ids.has(packPlaceholder(seed.slug)))
      errors.push(`missing pack placeholder ${seed.slug}`);
  }
  const actualRuntimeFiles = [
    ...files("public/media/shared"),
    ...files("public/media/destinations"),
  ];
  for (const path of actualRuntimeFiles)
    if (!local.some((asset) => "public" + asset.runtime.path === path))
      errors.push(`unregistered runtime ${path}`);
  for (const path of expected)
    if (!actualRuntimeFiles.includes("public" + path))
      errors.push(`missing output ${path}`);
  for (const path of actualRuntimeFiles)
    if (
      !IMAGE_EXT.has(extname(path)) ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z]+$/.test(basename(path))
    )
      errors.push(`filename ${path}`);
  if (local.reduce((n, asset) => n + asset.integrity.bytes, 0) > 2000000)
    errors.push("total runtime size budget");
  const allEntries = [
    ...inventory.entries,
    ...local.map((a) => ({
      path: "public" + a.runtime.path,
      sha256: a.integrity.sha256,
    })),
  ];
  errors.push(...validateDuplicates(allEntries, aliases), ...protectedErrors());
  for (const entry of inventory.entries) {
    if (!existsSync(resolve(ROOT, entry.path))) {
      errors.push(`inventory missing ${entry.path}`);
      continue;
    }
    const actual = measure(entry.path);
    if (actual.sha256 !== entry.sha256 || actual.bytes !== entry.bytes)
      errors.push(`inventory stale ${entry.path}`);
  }
  if (
    new Set(packs.packs.map((p) => p.id)).size !== 5 ||
    packs.packs.length !== 5
  )
    errors.push("five unique packs");
  if (new Set(rows.map((row) => row.request_id)).size !== rows.length)
    errors.push("duplicate acquisition request");
  for (const row of rows) {
    if (
      !columns.every((key) => key in row) ||
      !row.entity_id ||
      !row.display_name_zh ||
      !row.display_name_ja ||
      !row.display_name_en
    )
      errors.push("CSV required fields");
    if (
      !packs.packs.some((pack) => pack.id === row.pack_id) ||
      row.status !== "acquisition_required" ||
      !(+row.target_width > 0) ||
      !(+row.target_height > 0)
    )
      errors.push(`backlog invalid ${row.request_id}`);
    if (
      [
        "provider",
        "source_id",
        "source_url",
        "license",
        "credit",
        "commercial_use_allowed",
        "cache_allowed",
        "derivatives_allowed",
      ].some((key) => row[key] !== "")
    )
      errors.push(`unreviewed acquisition authorization ${row.request_id}`);
  }
  for (const pack of packs.packs) {
    if (!["zh-CN", "ja-JP", "en"].every((locale) => pack.names[locale]))
      errors.push(`missing translated pack ${pack.id}`);
    const quotas = {
      desktopHero: 1,
      mobileHero: 1,
      areaCovers: 3,
      landmarkSymbols: 8,
      poiImages: 12,
    };
    for (const [key, count] of Object.entries(quotas)) {
      if (pack.slots[key]?.length !== count)
        errors.push(`pack quota ${pack.id}/${key}`);
      for (const slot of pack.slots[key] ?? []) {
        const asset = manifest.assets.find((a) => a.id === slot.assetId),
          row = rows.find((r) => r.request_id === slot.requestId);
        if (
          !asset ||
          !row ||
          row.pack_id !== pack.id ||
          asset.status !== slot.status ||
          row.asset_role !== slot.role ||
          row.entity_id !== slot.entity.id
        )
          errors.push(`slot/backlog mismatch ${slot.requestId}`);
      }
    }
    if (rows.filter((row) => row.pack_id === pack.id).length < 25)
      errors.push(`pack backlog ${pack.id}`);
    for (const fallback of [
      pack.fallbacks.generic,
      ...Object.values(pack.fallbacks.categories),
    ])
      if (
        !local.some(
          (a) =>
            a.id === fallback &&
            a.status === "approved" &&
            a.authenticity === "symbolic",
        )
      )
        errors.push(`invalid fallback ${fallback}`);
    if (
      pack.completion.requestedAssets !== 25 ||
      pack.completion.acquiredAssets !== 0 ||
      pack.rightsSummary.acquisitionRequired !== 25
    )
      errors.push(`stale summary ${pack.id}`);
  }
  return {
    errors,
    counts: {
      assets: manifest.assets.length,
      local: local.length,
      packs: packs.packs.length,
      backlog: rows.length,
      legacy: inventory.entries.length,
    },
  };
}
if (isMain(import.meta.url)) {
  try {
    const result = validateLibrary();
    console.log(JSON.stringify(result, null, 2));
    if (result.errors.length) process.exitCode = 1;
  } catch (error) {
    console.error(`Asset validation failed: ${error.message}`);
    process.exitCode = 1;
  }
}
