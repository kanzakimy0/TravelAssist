import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
import {
  CATALOG,
  json,
  read,
  parseCsv,
  csv,
  dimensions,
  measure,
  files,
} from "../tools/assets/asset-utils.mjs";
import {
  validateAsset,
  validateLibrary,
  svgErrors,
  validateDuplicates,
  protectedErrors,
} from "../tools/assets/validate-asset-library.mjs";
// Native Node tests resolve the bundler's extensionless imports only inside this module boundary.
const hook = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (
      context.parentURL?.includes("/src/data/assets/") &&
      /^\.\/[a-z-]+$/.test(specifier)
    )
      return nextResolve(specifier + ".ts", context);
    return nextResolve(specifier, context);
  },
});
const registry = await import("../src/data/assets/index.ts");
hook.deregister();
const {
  getAssetById,
  getDestinationPack,
  listAssetsByType,
  isRuntimeUsable,
  resolveAssetFallback,
} = registry;
const manifest = json(CATALOG + "asset-manifest.v1.json"),
  packs = json(CATALOG + "destination-packs.v1.json").packs;
const exemplar = manifest.assets[0],
  now = Date.parse("2026-09-07T00:00:00Z");
test("complete library passes file, schema, hash, rights and protected checks", () =>
  assert.deepEqual(validateLibrary().errors, []));
test("all 64 shared and 5 distinct destination SVGs are present", () => {
  assert.equal(files("public/media/shared").length, 64);
  assert.equal(files("public/media/destinations").length, 5);
  const local = manifest.assets.filter((a) => a.runtime.kind === "local");
  assert.equal(
    new Set(
      local
        .filter((a) => a.runtime.path.endsWith(".svg"))
        .map((a) => a.integrity.sha256),
    ).size,
    69,
  );
  for (const a of local) {
    const actual = measure("public" + a.runtime.path);
    assert.equal(actual.sha256, a.integrity.sha256);
    assert.equal(actual.bytes, a.integrity.bytes);
  }
});
test("unique stable IDs; no unknown raster introduced", () => {
  assert.equal(
    new Set(manifest.assets.map((a) => a.id)).size,
    manifest.assets.length,
  );
  assert.ok(
    [
      ...files("public/media/shared"),
      ...files("public/media/destinations"),
    ].every((p) => p.endsWith(".svg")),
  );
});
test("registry snapshots cannot change approved rights", () => {
  const a = getAssetById(exemplar.id);
  a.rights.cacheAllowed = false;
  assert.equal(getAssetById(exemplar.id).rights.cacheAllowed, true);
  assert.equal(getAssetById("bad"), undefined);
  assert.equal(getDestinationPack("bad"), undefined);
  assert.equal(listAssetsByType("poi-categories").length, 24);
});
test("five translated packs and exactly 125 requests, no invented provider IDs", () => {
  const rows = parseCsv(read(CATALOG + "acquisition-backlog.v1.csv"));
  assert.equal(rows.length, 125);
  for (const p of packs) {
    assert.equal(rows.filter((r) => r.pack_id === p.id).length, 25);
    for (const l of ["zh-CN", "ja-JP", "en"]) assert.ok(p.names[l]);
  }
  assert.ok(
    rows.every(
      (r) =>
        r.status === "acquisition_required" &&
        !r.provider &&
        !r.source_id &&
        !r.source_url,
    ),
  );
});
test("CSV escaping round trip supports quotes commas and newlines", () => {
  const rows = [{ a: 'name, "quoted"', b: "two\nlines" }];
  assert.deepEqual(parseCsv(csv(rows, ["a", "b"])), rows);
  assert.throws(() => parseCsv('a,b\n"unterminated'));
});
for (const [label, mutation] of [
  [
    "hash",
    (a) => {
      a.integrity.sha256 = "a".repeat(64);
    },
  ],
  [
    "dimensions",
    (a) => {
      a.presentation.width = 999;
    },
  ],
  [
    "focal",
    (a) => {
      a.presentation.focalPoint.x = 2;
    },
  ],
  [
    "license",
    (a) => {
      a.rights.license = "unknown-but-ok";
    },
  ],
  [
    "rights",
    (a) => {
      a.rights.cacheAllowed = false;
    },
  ],
  [
    "source",
    (a) => {
      a.source.sourceId = null;
    },
  ],
  [
    "expiry",
    (a) => {
      a.rights.expiresAt = "2020-01-01";
    },
  ],
  [
    "size",
    (a) => {
      a.integrity.bytes = 50001;
    },
  ],
  [
    "filename",
    (a) => {
      a.runtime.path = "/media/shared/Bad Name.svg";
    },
  ],
  [
    "traversal",
    (a) => {
      a.runtime.path = "/media/../../secret.svg";
    },
  ],
  [
    "secret",
    (a) => {
      a.source.sourceUrl = "https://example.org/image?token=not-a-real-secret";
    },
  ],
  [
    "private URL",
    (a) => {
      a.source.sourceUrl = "https://127.0.0.1/internal";
    },
  ],
  [
    "CC evidence",
    (a) => {
      a.rights.license = "CC BY-SA 4.0";
    },
  ],
  [
    "false documentary",
    (a) => {
      a.source.type = "ai_generated";
      a.authenticity = "documentary";
    },
  ],
  [
    "decorative alt",
    (a) => {
      a.presentation.decorative = true;
    },
  ],
  [
    "unknown status",
    (a) => {
      a.status = "looks-good";
    },
  ],
  [
    "acquisition runtime",
    (a) => {
      a.status = "acquisition_required";
    },
  ],
])
  test(`validator rejects ${label}`, () => {
    const a = structuredClone(exemplar);
    mutation(a);
    assert.ok(validateAsset(a, true, now).length);
  });
for (const unsafe of [
  "<script>alert(1)</script>",
  '<image href="https://example.org/a.png"/>',
  '<path onload="bad()"/>',
  "<style>@font-face{src:url(x)}</style>",
  '<image href="data:image/png;base64,eA=="/>',
  "<foreignObject/>",
  '<path style="fill:red"/>',
])
  test(`SVG rejects ${unsafe.slice(0, 35)}`, () =>
    assert.ok(
      svgErrors(
        `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${unsafe}</svg>`,
      ).length,
    ));
test("duplicate hashes require an explicit report group", () => {
  const e = [
    { path: "a", sha256: "same" },
    { path: "b", sha256: "same" },
  ];
  assert.equal(validateDuplicates(e, { duplicateGroups: [] }).length, 1);
  assert.deepEqual(
    validateDuplicates(e, {
      duplicateGroups: [{ sha256: "same", paths: ["a", "b"] }],
    }),
    [],
  );
});
test("protected paths unchanged against frozen Git base", () =>
  assert.deepEqual(protectedErrors(), []));
test("approved local is returned with semantic / decorative alt", () => {
  const a = resolveAssetFallback({ assetId: exemplar.id, now });
  assert.equal(a.kind, "local");
  assert.equal(a.degraded, false);
  assert.ok(a.alt);
  assert.equal(
    resolveAssetFallback({ assetId: exemplar.id, decorative: true, now }).alt,
    "",
  );
});
test("provider-only is a reference, never a local path or cached binary", () => {
  const a = structuredClone(exemplar);
  a.id = "test.provider.reference";
  a.status = "provider_only";
  a.runtime = { kind: "provider_reference" };
  a.source = {
    type: "provider_reference",
    provider: "test-only",
    sourceId: "fixture",
    sourceUrl: null,
  };
  a.rights.cacheAllowed = false;
  a.integrity = { sha256: null, bytes: 0 };
  assert.deepEqual(validateAsset(a, false, now), []);
  const result = resolveAssetFallback(
    { assetId: a.id, now },
    {
      getAssetById: (id) => (id === a.id ? a : getAssetById(id)),
      getDestinationPack,
    },
  );
  assert.equal(result.kind, "provider_reference");
  assert.equal("path" in result, false);
  assert.equal(isRuntimeUsable(a, now), true);
  a.runtime.path = "/media/not-authorized.svg";
  assert.ok(validateAsset(a, false, now).length);
});
for (const status of [
  "acquisition_required",
  "rejected",
  "expired",
  "review_required",
  "draft",
])
  test(`${status} safely degrades`, () => {
    const a = { ...structuredClone(exemplar), status };
    assert.equal(isRuntimeUsable(a, now), false);
    const lookup = {
      getAssetById: (id) => (id === a.id ? a : getAssetById(id)),
      getDestinationPack,
    };
    const result = resolveAssetFallback(
      { assetId: a.id, category: "hotel", now },
      lookup,
    );
    assert.equal(
      result.assetId,
      "shared.global.placeholders.hotel.default.001",
    );
  });
test("approved but expired or unlicensed runtime is unusable", () => {
  for (const expiresAt of ["bad-date", "2025-01-01"])
    assert.equal(
      isRuntimeUsable(
        { ...exemplar, rights: { ...exemplar.rights, expiresAt } },
        now,
      ),
      false,
    );
  assert.equal(
    isRuntimeUsable(
      { ...exemplar, rights: { ...exemplar.rights, license: null } },
      now,
    ),
    false,
  );
});
test("fallback order: destination-category then generic then global-category then no-image", () => {
  const pack = getDestinationPack("jp-tokyo");
  pack.fallbacks.categories.hotel =
    "shared.global.placeholders.hotel.default.001";
  const lookup = { getAssetById, getDestinationPack: () => pack };
  assert.equal(
    resolveAssetFallback(
      { destinationId: pack.id, category: "hotel", now },
      lookup,
    ).assetId,
    pack.fallbacks.categories.hotel,
  );
  delete pack.fallbacks.categories.hotel;
  assert.equal(
    resolveAssetFallback(
      { destinationId: pack.id, category: "hotel", now },
      lookup,
    ).assetId,
    pack.fallbacks.generic,
  );
  assert.equal(
    resolveAssetFallback({
      destinationId: "missing",
      category: "restaurant",
      now,
    }).assetId,
    "shared.global.placeholders.restaurant.default.001",
  );
  assert.equal(
    resolveAssetFallback({ category: "activity", now }).assetId,
    "shared.global.placeholders.activity.default.001",
  );
  assert.equal(
    resolveAssetFallback({ assetId: "unknown", category: "__proto__", now })
      .assetId,
    "shared.global.states.no-image.default.001",
  );
});
test("cyclic or entirely missing fallback lookup terminates safely", () => {
  const pack = getDestinationPack("jp-tokyo");
  pack.fallbacks.generic = "missing";
  pack.fallbacks.categories.hotel = "missing";
  let calls = 0;
  const result = resolveAssetFallback(
    { assetId: "missing", destinationId: pack.id, category: "hotel", now },
    {
      getAssetById: () => {
        calls++;
        return undefined;
      },
      getDestinationPack: () => pack,
    },
  );
  assert.equal(result.kind, "none");
  assert.ok(calls <= 3);
});
test("dimension extraction does not guess unreadable files", () => {
  assert.deepEqual(dimensions(Buffer.from("invalid"), ".png"), {
    width: null,
    height: null,
  });
  assert.deepEqual(
    dimensions(Buffer.from('<svg viewBox="0 0 24 24"/>'), ".svg"),
    { width: 24, height: 24 },
  );
});

test("legacy AI provenance remains illustrative, never documentary", () => {
  const entries = json(CATALOG + "legacy-inventory.v1.json").entries;
  const hero = entries.find(
    (entry) =>
      entry.path === "public/media/personal-center/hero-kyoto-sakura.webp",
  );
  assert.equal(hero.authenticity, "illustrative");
  assert.equal(hero.status, "legacy_review_required");
  assert.ok(hero.authenticityEvidence);
  assert.ok(entries.every((entry) => entry.authenticity !== "documentary"));
});
