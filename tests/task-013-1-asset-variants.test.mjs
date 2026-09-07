import assert from "node:assert/strict";
import test from "node:test";
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  existsSync,
  rmSync,
  realpathSync,
} from "node:fs";
import { resolve, join } from "node:path";
import { registerHooks } from "node:module";
import { hostname } from "node:os";
import { execFileSync } from "node:child_process";
import sharp from "sharp";
import {
  ROOT,
  CATALOG,
  CACHE,
  OUTPUT,
  PROFILES,
  POLICY,
  sha256,
  safePath,
  atomicWrite,
  readJson,
  document,
  acquireLock,
  options,
  sourceProtection,
  profilesFor,
  validateConfiguration,
} from "../tools/assets/variant-common.mjs";
import {
  sourcePaths,
  buildCatalog,
  inspect,
  eligibility,
  usageScan,
} from "../tools/assets/build-full-catalog.mjs";
import {
  derive,
  deriveSource,
  render,
  cropBox,
  budgetCheck,
  expectedProfiles,
} from "../tools/assets/generate-asset-derivatives.mjs";
import { verify } from "../tools/assets/verify-asset-derivatives.mjs";
import { review } from "../tools/assets/generate-variant-review.mjs";
const hook = registerHooks({
  resolve(specifier, context, next) {
    if (
      context.parentURL?.includes("/src/data/assets/") &&
      /^\.\/[a-z-]+$/.test(specifier)
    )
      return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});
const api = await import("../src/data/assets/index.ts");
hook.deregister();
const catalog = readJson(ROOT, CATALOG + "asset-source-catalog.v1.json"),
  variants = readJson(ROOT, CATALOG + "asset-variants.v1.json");
const exemplar = readJson(ROOT, CATALOG + "asset-manifest.v1.json").assets[0];
const tempParent = resolve(ROOT, "tmp/assets-nightly");
test("configuration schema rejects duplicate profiles and invalid mappings", () => {
  const p = structuredClone(PROFILES);
  p.profiles.push(p.profiles[0]);
  assert.throws(() => validateConfiguration(p, POLICY), /invalid-size-profile/);
  const policy = structuredClone(POLICY);
  policy.rasterRoles.poi_photo.push("invented");
  assert.throws(
    () => validateConfiguration(PROFILES, policy),
    /unknown-role-profile/,
  );
});
for (const flag of ["--dry-run", "--verify-only"])
  test(`nightly ${flag} does not write canonical catalogs`, () => {
    const before = readFileSync(
      resolve(ROOT, CATALOG + "asset-variants.v1.json"),
    );
    execFileSync(
      process.execPath,
      ["tools/assets/run-assets-nightly.mjs", flag],
      { cwd: ROOT, stdio: "pipe", timeout: 30000 },
    );
    assert.deepEqual(
      readFileSync(resolve(ROOT, CATALOG + "asset-variants.v1.json")),
      before,
    );
  });
test("identical separate sources canonicalize deterministically and resume as no-op", async (t) => {
  const f = await fixture(t, { count: 2, width: 120, height: 80 });
  const bytes = readFileSync(safePath(f.root, f.catalog.sources[0].path));
  writeFileSync(safePath(f.root, f.catalog.sources[1].path), bytes);
  f.assets[1].integrity = structuredClone(f.assets[0].integrity);
  await document(f.root, CATALOG + "asset-manifest.v1.json", {
    schemaVersion: 1,
    assets: f.assets,
  });
  const c = (await buildCatalog(f.root)).catalog;
  const first = await derive(f.root, { ...opts, concurrency: 2 }, c);
  assert.equal(
    first.result.variants.filter((v) => v.kind === "physical").length,
    1,
  );
  assert.deepEqual((await verify(f.root)).errors, []);
  const again = await derive(f.root, { ...opts, resume: true }, c);
  assert.equal(again.account.written, 0);
  assert.equal(again.account.resumeRecovered, 2);
});
mkdirSync(tempParent, { recursive: true });
const opts = {
  concurrency: 1,
  maxNewBytes: POLICY.batchHardBytes,
  resume: false,
  rebuild: false,
};
async function fixture(
  t,
  {
    width = 1000,
    height = 700,
    count = 1,
    role = "poi_photo",
    exif = false,
  } = {},
) {
  const root = mkdtempSync(join(tempParent, "test-"));
  t.after(() => {
    const checked = realpathSync(root);
    assert.ok(
      checked.startsWith(tempParent + "\\") ||
        checked.startsWith(tempParent + "/"),
    );
    rmSync(checked, { recursive: true });
  });
  const assets = [];
  for (let n = 0; n < count; n++) {
    let image = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 40 + n * 20, g: 140, b: 180, alpha: 0.8 },
      },
    });
    if (exif)
      image = image.withExif({
        IFD0: { Artist: "Synthetic test only" },
        IFD2: { BodySerialNumber: "TEST-NOT-A-REAL-SERIAL" },
        IFD3: {
          GPSLatitudeRef: "N",
          GPSLatitude: "1/1 2/1 3/1",
          GPSLongitudeRef: "E",
          GPSLongitude: "1/1 2/1 3/1",
        },
      });
    const bytes = await image.png().toBuffer(),
      path = `public/media/test/source-${n}.png`;
    atomicWrite(root, path, bytes);
    const asset = structuredClone(exemplar);
    asset.id = `test.synthetic.photo.source-${n}.001`;
    asset.assetType = role;
    asset.runtime = { kind: "local", path: path.slice(6) };
    asset.integrity = { sha256: sha256(bytes), bytes: bytes.length };
    asset.presentation = {
      alt: "Synthetic color test fixture",
      decorative: false,
      width,
      height,
      focalPoint: { x: 0.5, y: 0.5 },
    };
    asset.source = {
      type: "brand_owned",
      provider: "TravelAssist-test",
      sourceId: asset.id,
      sourceUrl: null,
    };
    assets.push(asset);
  }
  await document(root, CATALOG + "asset-manifest.v1.json", {
    schemaVersion: 1,
    assets,
  });
  const built = await buildCatalog(root);
  return { root, assets, ...built };
}
test("full scan has 100% catalog coverage", () =>
  assert.deepEqual(
    sourcePaths(ROOT),
    catalog.sources.map((s) => s.path),
  ));
test("source paths and IDs are unique", () => {
  for (const key of ["path", "sourceId"])
    assert.equal(
      new Set(catalog.sources.map((s) => s[key])).size,
      catalog.sources.length,
    );
});
test("generated directories never become sources", async (t) => {
  const f = await fixture(t);
  atomicWrite(
    f.root,
    OUTPUT + "/unknown/test.png",
    Buffer.from("not a source"),
  );
  assert.equal(sourcePaths(f.root).length, 1);
});
test("all parent local entries map to sources", () => {
  for (const a of readJson(
    ROOT,
    CATALOG + "asset-manifest.v1.json",
  ).assets.filter((a) => a.runtime.kind === "local"))
    assert.ok(
      catalog.sources.some(
        (s) => s.path === "public" + a.runtime.path && s.assetId === a.id,
      ),
    );
});
test("ordinary business JSON is not a visual source", async (t) => {
  const f = await fixture(t);
  atomicWrite(f.root, "src/business.json", '{"trips":[]}');
  assert.equal(sourcePaths(f.root).length, 1);
});
test("Lottie metadata is registered as animated", async (t) => {
  const f = await fixture(t);
  atomicWrite(f.root, "public/motion.json", '{"layers":[],"fr":30}');
  const s = await inspect(f.root, "public/motion.json");
  assert.equal(s.animated, true);
  assert.equal(s.processingEligibility, false);
});
test("relative import, CSS and unresolved references are recorded", async (t) => {
  const f = await fixture(t);
  atomicWrite(
    f.root,
    "src/a.tsx",
    'import img from "../public/media/test/source-0.png"; const a="/missing.png";',
  );
  atomicWrite(
    f.root,
    "src/a.css",
    'body{background:url("/media/test/source-0.png")}',
  );
  const u = usageScan(f.root, f.catalog.sources);
  assert.ok(u.some((r) => r.referenceType === "import" && r.resolved));
  assert.ok(u.some((r) => r.referenceType === "css-url" && r.resolved));
  assert.ok(u.some((r) => !r.resolved));
});
test("eligible source resolves S/M/L and all mapped special profiles", async (t) => {
  const f = await fixture(t);
  const { result } = await derive(f.root, opts, f.catalog);
  assert.equal(result.errors.length, 0);
  assert.deepEqual(
    result.variants.map((v) => v.profileId).sort(),
    POLICY.rasterRoles.poi_photo.toSorted(),
  );
  for (const p of ["sm", "md", "lg"])
    assert.notEqual(
      result.variants.find((v) => v.profileId === p).kind,
      "unavailable",
    );
});
test("small source produces one normalized generic file and aliases without upscale", async (t) => {
  const f = await fixture(t, { width: 120, height: 80 });
  const { result } = await derive(f.root, opts, f.catalog);
  const sml = result.variants.filter((v) =>
    ["sm", "md", "lg"].includes(v.profileId),
  );
  assert.equal(sml.filter((v) => v.kind === "physical").length, 1);
  assert.equal(sml.filter((v) => v.kind === "alias").length, 2);
  for (const v of sml) {
    assert.equal(v.width, 120);
    assert.equal(v.height, 80);
  }
  assert.ok(sml.filter((v) => v.kind === "alias").every((v) => v.degraded));
});
test("insufficient special profiles record unavailable, not exact", async (t) => {
  const f = await fixture(t, { width: 120, height: 80 });
  const { result } = await derive(f.root, opts, f.catalog);
  assert.equal(
    result.variants.find((v) => v.profileId === "card-wide").errorCode,
    "insufficient-source-resolution",
  );
});
test("identical special encodings share a physical file", async (t) => {
  const f = await fixture(t);
  const { result } = await derive(f.root, opts, f.catalog);
  const card = result.variants.find((v) => v.profileId === "card-wide"),
    popup = result.variants.find((v) => v.profileId === "map-popup");
  assert.equal(card.path, popup.path);
  assert.equal(popup.kind, "alias");
});
test("physical files really decode with matching dimensions, formats, SHA and bytes", async (t) => {
  const f = await fixture(t);
  await derive(f.root, opts, f.catalog);
  assert.deepEqual((await verify(f.root)).errors, []);
});
test("protected and all originals are unchanged after processing", async (t) => {
  const f = await fixture(t);
  const before = f.catalog.sources;
  await derive(f.root, opts, f.catalog);
  const after = (await buildCatalog(f.root, { write: false })).catalog.sources;
  assert.deepEqual(sourceProtection(before, after), {
    modified: 0,
    deleted: 0,
    renamed: 0,
    protectedShaChanged: 0,
    paths: [],
  });
});
test("safe output guard rejects absolute paths and traversal", () => {
  for (const p of [
    "../source.png",
    "public/../../source.png",
    resolve(ROOT, "package.json"),
  ])
    assert.throws(() => safePath(ROOT, p));
});
test("rights cannot be granted by cached catalog flags", async (t) => {
  const f = await fixture(t);
  f.assets[0].rights.derivativesAllowed = false;
  const out = await deriveSource(
    f.root,
    { ...f.catalog.sources[0], processingEligibility: true },
    f.assets[0],
    opts,
    { newBytes: 0, written: 0 },
  );
  assert.ok(
    out.variants.every(
      (v) =>
        v.kind === "unavailable" && v.errorCode === "derivatives-forbidden",
    ),
  );
});
for (const status of [
  "draft",
  "review_required",
  "rejected",
  "expired",
  "acquisition_required",
  "provider_only",
])
  test(`non-approved status ${status} never derives`, async (t) => {
    const f = await fixture(t);
    const asset = structuredClone(f.assets[0]);
    asset.status = status;
    assert.notEqual(eligibility(f.catalog.sources[0], asset), null);
  });
test("expired and non-cacheable grants are blocked", async (t) => {
  const f = await fixture(t),
    a = structuredClone(f.assets[0]);
  a.rights.expiresAt = "2000-01-01";
  assert.equal(eligibility(f.catalog.sources[0], a), "expired");
  a.rights.expiresAt = null;
  a.rights.cacheAllowed = false;
  assert.equal(eligibility(f.catalog.sources[0], a), "cache-forbidden");
});
test("animation, video and font are registration-only", async (t) => {
  const f = await fixture(t);
  for (const type of ["video", "font", "animation"])
    assert.match(
      eligibility({ ...f.catalog.sources[0], mediaType: type }, f.assets[0]),
      /register-only/,
    );
  assert.equal(
    eligibility({ ...f.catalog.sources[0], animated: true }, f.assets[0]),
    "animated-register-only",
  );
});
test("unknown roles do not receive invented special policies", async (t) => {
  const f = await fixture(t);
  const s = { ...f.catalog.sources[0], assetRole: "not-real" };
  assert.equal(eligibility(s, f.assets[0]), "unknown-role");
  assert.deepEqual(expectedProfiles(s), ["sm", "md", "lg"]);
});
test("role mappings exclude hotel map pins and undesignated brand rasters", () => {
  assert.ok(!POLICY.rasterRoles.hotel_photo.includes("map-pin-thumb"));
  assert.deepEqual(
    profilesFor({ mediaType: "raster", assetRole: "brand_mark" }),
    [],
  );
  assert.equal(
    profilesFor({
      mediaType: "raster",
      assetRole: "brand_mark",
      brandIconSource: true,
    }).length,
    4,
  );
});
test("SVG uses original paths and complete vector tokens", () => {
  const v = variants.variants.filter((v) => v.kind === "vector-token");
  assert.equal(v.length, 364);
  for (const item of v) {
    assert.ok(item.path.endsWith(".svg"));
    assert.ok(!item.path.startsWith(OUTPUT));
    assert.equal(item.width, PROFILES.vectorTokens[item.profileId].width);
  }
});
test("missing focalPoint generates review-only cover, not approval", async (t) => {
  const f = await fixture(t);
  const s = { ...f.catalog.sources[0], focalPoint: null };
  const out = await deriveSource(f.root, s, f.assets[0], opts, {
    newBytes: 0,
    written: 0,
  });
  const cover = out.variants.find((v) => v.profileId === "card-wide");
  assert.equal(cover.focalPointDefaulted, true);
  assert.equal(cover.status, "review_required");
  assert.equal(cover.runtimeUsable, false);
});
test("safeArea survives cover crop; impossible safeArea returns a review failure", () => {
  const p = { width: 640, height: 360 };
  const box = cropBox(
    1000,
    1000,
    p,
    { x: 0.5, y: 0.9 },
    { x: 0.2, y: 0.4, width: 0.2, height: 0.2 },
  );
  assert.ok(box.top <= 400 && box.top + box.height >= 600);
  assert.throws(
    () => cropBox(1000, 1000, p, null, { x: 0, y: 0, width: 1, height: 1 }),
    /safe-area/,
  );
});
test("private EXIF and GPS are stripped from real encoded outputs", async (t) => {
  const f = await fixture(t, { exif: true });
  const input = readFileSync(safePath(f.root, f.catalog.sources[0].path));
  assert.ok((await sharp(input).metadata()).exif);
  const out = await render(input, f.catalog.sources[0], PROFILES.profiles[0]);
  const m = await sharp(out.bytes).metadata();
  assert.equal(m.exif, undefined);
  assert.equal(m.xmp, undefined);
  assert.equal(m.iptc, undefined);
  assert.ok(m.icc);
});
test("auto-orient records final dimensions and never upscales", async (t) => {
  const f = await fixture(t, { width: 200, height: 100 });
  const s = f.catalog.sources[0],
    path = safePath(f.root, s.path);
  const bytes = await sharp(readFileSync(path))
    .withMetadata({ orientation: 6 })
    .png()
    .toBuffer();
  writeFileSync(path, bytes);
  const measured = await inspect(f.root, s.path);
  assert.equal(measured.width, 100);
  assert.equal(measured.height, 200);
  const out = await render(bytes, measured, PROFILES.profiles[0]);
  assert.equal(out.width, 100);
  assert.equal(out.height, 200);
});
test("brand contain output adds safe padding only for explicitly designated sources", async (t) => {
  const f = await fixture(t, { role: "brand_mark", width: 600, height: 600 });
  const p = PROFILES.profiles.find((p) => p.id === "pwa-192");
  const out = await render(
    readFileSync(safePath(f.root, f.catalog.sources[0].path)),
    f.catalog.sources[0],
    p,
  );
  assert.equal(out.width, 192);
  assert.equal(out.height, 192);
  assert.equal(out.format, "png");
});
test("single file and batch hard budgets cannot be overridden", () => {
  assert.throws(() => budgetCheck(POLICY.singleObjectMaxBytes + 1, 0, opts));
  assert.throws(() => budgetCheck(200, 100, { maxNewBytes: 299 }));
  assert.throws(() =>
    options([], {
      ASSET_PIPELINE_MAX_NEW_BYTES: String(POLICY.batchHardBytes + 1),
    }),
  );
});
test("size breach reports error with one retry and leaves no output", async (t) => {
  const f = await fixture(t);
  const out = await derive(f.root, { ...opts, maxNewBytes: 0 }, f.catalog);
  assert.ok(out.result.errors.length > 0);
  assert.ok(out.result.errors.every((e) => e.retryCount === 1));
  assert.ok(out.result.variants.every((v) => v.kind === "unavailable"));
});
test("second run is byte-identical no-op with skip counts", async (t) => {
  const f = await fixture(t);
  await derive(f.root, opts, f.catalog);
  const before = readFileSync(
    safePath(f.root, CATALOG + "asset-variants.v1.json"),
  );
  const run = await derive(f.root, opts, f.catalog);
  assert.equal(run.account.written, 0);
  assert.equal(run.account.sourceChanged, 0);
  assert.equal(run.account.skippedUnchanged, 1);
  assert.deepEqual(
    readFileSync(safePath(f.root, CATALOG + "asset-variants.v1.json")),
    before,
  );
});
test("controlled interruption resumes without regenerating the completed source", async (t) => {
  const f = await fixture(t, { count: 2, width: 120, height: 80 });
  await assert.rejects(
    derive(
      f.root,
      {
        ...opts,
        afterSource: () => {
          throw Error("controlled-interruption");
        },
      },
      f.catalog,
    ),
  );
  const run = await derive(f.root, { ...opts, resume: true }, f.catalog);
  assert.equal(run.account.resumeRecovered, 1);
  assert.equal(run.account.written, 1);
  assert.deepEqual((await verify(f.root)).errors, []);
});
test("changed source cannot reuse old integrity permissions", async (t) => {
  const f = await fixture(t);
  await derive(f.root, opts, f.catalog);
  writeFileSync(safePath(f.root, f.catalog.sources[0].path), "changed");
  const run = await derive(f.root, opts, f.catalog);
  assert.equal(run.result.errors[0].errorCode, "source-changed-during-run");
});
test("lock excludes a second writer and releases cleanly", async (t) => {
  const f = await fixture(t);
  const release = acquireLock(f.root);
  assert.throws(() => acquireLock(f.root), /pipeline-locked/);
  release();
  const again = acquireLock(f.root);
  again();
});
test("a young or live lock is never stolen", async (t) => {
  const f = await fixture(t);
  const release = acquireLock(f.root, Date.now() - 13 * 3600000);
  assert.throws(() => acquireLock(f.root), /pipeline-locked/);
  release();
  atomicWrite(
    f.root,
    CACHE + "/pipeline.lock",
    JSON.stringify({
      pid: 2147483647,
      host: hostname(),
      startedAt: Date.now(),
    }),
  );
  assert.throws(() => acquireLock(f.root), /pipeline-locked/);
});
test("only a >12h dead local PID lock is recovered", async (t) => {
  const f = await fixture(t);
  atomicWrite(
    f.root,
    CACHE + "/pipeline.lock",
    JSON.stringify({
      pid: 2147483647,
      host: hostname(),
      startedAt: Date.now() - 13 * 3600000,
    }),
  );
  const release = acquireLock(f.root);
  release();
  assert.equal(existsSync(safePath(f.root, CACHE + "/pipeline.lock")), false);
});
test("concurrency is bounded 1–4 and modes are consistent", () => {
  assert.equal(options([], {}).concurrency, 2);
  for (const value of ["0", "5", "NaN"])
    assert.throws(() => options([], { ASSET_PIPELINE_CONCURRENCY: value }));
  assert.throws(() => options(["--rebuild", "--resume"], {}));
});
test("atomic writes leave no temporary fragments", async (t) => {
  const f = await fixture(t);
  atomicWrite(f.root, "docs/test.txt", "hello");
  assert.equal(atomicWrite(f.root, "docs/test.txt", "hello"), false);
  const { walk } = await import("../tools/assets/build-full-catalog.mjs");
  assert.ok(walk(f.root).every((p) => !p.includes("asset-tmp-")));
});
test("all required audit reports and offline HTML exist", async (t) => {
  const f = await fixture(t);
  await derive(f.root, opts, f.catalog);
  await review(f.root);
  for (const p of [
    "all-assets-checklist.md",
    "asset-usage-report.md",
    "orphan-assets.md",
    "asset-variant-matrix.md",
    "missing-variants.md",
    "duplicate-report.md",
    "oversize-assets.md",
    "focal-point-review.md",
    "asset-processing-errors.csv",
  ])
    assert.ok(existsSync(safePath(f.root, "docs/assets/generated/" + p)));
  const html = readFileSync(
    safePath(
      f.root,
      "assets/design/asset-library/previews/variant-review.html",
    ),
    "utf8",
  );
  assert.ok(!/(?:src|href)="https?:/.test(html));
});
test("catalog is sorted and contains no machine-absolute path", () => {
  assert.deepEqual(
    catalog.sources.map((s) => s.path),
    catalog.sources.map((s) => s.path).toSorted(),
  );
  assert.ok(catalog.sources.every((s) => !/^([a-z]:|\/)/i.test(s.path)));
});
test("offline pipeline has no network request implementation", () => {
  for (const file of [
    "variant-common",
    "build-full-catalog",
    "generate-asset-derivatives",
    "verify-asset-derivatives",
    "generate-variant-review",
    "run-assets-nightly",
  ])
    assert.ok(
      !/\bfetch\s*\(|node:https?|https?\.request|axios/.test(
        readFileSync(resolve(ROOT, "tools/assets/" + file + ".mjs"), "utf8"),
      ),
    );
});
test("registry exposes SVG tokens and detached snapshots", () => {
  const id = exemplar.id;
  assert.equal(api.getVectorDisplaySize(id, "icon-sm").width, 16);
  const source = api.getAssetSource(id);
  source.path = "bad";
  assert.notEqual(api.getAssetSource(id).path, "bad");
  assert.ok(api.listAssetUsages(id).length > 0);
  assert.equal(api.getAssetVariant("not-real", "sm").status, "fallback");
});
test("registry exact / alias / degraded / unavailable / fallback and responsive props", async (t) => {
  const f = await fixture(t);
  const { result } = await derive(f.root, opts, f.catalog);
  const lookup = {
    sources: f.catalog.sources,
    variants: result.variants,
    usages: [],
    asset: (id) => f.assets.find((a) => a.id === id),
    fallback: () => null,
  };
  const r = api.createVariantRegistry(lookup),
    id = f.assets[0].id;
  assert.equal(r.getAssetVariant(id, "sm").status, "exact");
  assert.equal(r.getAssetVariant(id, "map-popup").status, "alias");
  assert.equal(r.getAssetVariant(id, "hero-desktop").status, "degraded");
  assert.equal(r.getAssetVariant("none", "sm").status, "unavailable");
  const props = r.getResponsiveImageProps(id, "card-wide");
  assert.ok(props.src.endsWith(".webp"));
  assert.ok(props.srcSet.includes("640w"));
  assert.equal(props.width, 640);
  assert.equal(props.alt, "Synthetic color test fixture");
});
test("registry rejects alias cycles and expiry without exposing paths", async (t) => {
  const f = await fixture(t, { width: 120, height: 80 });
  const { result } = await derive(f.root, opts, f.catalog);
  const entries = structuredClone(result.variants);
  for (const v of entries) {
    v.kind = "alias";
    v.aliasOf = v.variantId;
  }
  const r = api.createVariantRegistry({
    sources: f.catalog.sources,
    variants: entries,
    usages: [],
    asset: () => f.assets[0],
    fallback: () => null,
  });
  assert.equal(r.getAssetVariant(f.assets[0].id, "sm").src, null);
  f.assets[0].rights.expiresAt = "2000-01-01";
  const r2 = api.createVariantRegistry({
    sources: f.catalog.sources,
    variants: result.variants,
    usages: [],
    asset: () => f.assets[0],
    fallback: () => null,
  });
  assert.equal(r2.getAssetVariant(f.assets[0].id, "sm").src, null);
});
