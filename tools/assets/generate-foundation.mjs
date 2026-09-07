// Rebuilds only TASK-013 owned outputs, never legacy images or application files.
import {
  poi,
  transport,
  marker,
  placeholder,
  state,
  destinations,
  icon,
  pin,
  scene,
} from "../../assets/design/asset-library/source/original-shapes.mjs";
import {
  CATALOG,
  write,
  writeJson,
  measure,
  csv,
  isMain,
} from "./asset-utils.mjs";
export const groups = {
  "poi-categories": poi,
  transport,
  "map-markers": marker,
  placeholders: placeholder,
  states: state,
};
export const prefix = {
  "poi-categories": "",
  transport: "",
  "map-markers": "marker-",
  placeholders: "placeholder-",
  states: "state-",
};
export const sharedId = (group, name) =>
  `shared.global.${group}.${name}.default.001`;
export const packPlaceholder = (slug) =>
  `destination.jp.${slug}.placeholder.default.001`;
export const packSeeds = [
  {
    slug: "tokyo",
    type: "city",
    names: { "zh-CN": "东京", "ja-JP": "東京", en: "Tokyo" },
    known: [
      ["sensoji", "浅草寺", "浅草寺", "Senso-ji"],
      ["tokyo-skytree", "东京晴空塔", "東京スカイツリー", "Tokyo Skytree"],
    ],
  },
  {
    slug: "kyoto",
    type: "city",
    names: { "zh-CN": "京都", "ja-JP": "京都", en: "Kyoto" },
    known: [],
  },
  {
    slug: "osaka",
    type: "city",
    names: { "zh-CN": "大阪", "ja-JP": "大阪", en: "Osaka" },
    known: [],
  },
  {
    slug: "fuji-hakone",
    type: "destination-cluster",
    names: {
      "zh-CN": "富士山—河口湖—箱根",
      "ja-JP": "富士山・河口湖・箱根",
      en: "Mount Fuji–Kawaguchiko–Hakone",
    },
    known: [
      ["lake-kawaguchi", "河口湖湖畔", "河口湖畔", "Lake Kawaguchi shore"],
      ["fuji-q-highland", "富士急乐园", "富士急ハイランド", "Fuji-Q Highland"],
    ],
  },
  {
    slug: "hokkaido",
    type: "region",
    names: { "zh-CN": "北海道", "ja-JP": "北海道", en: "Hokkaido" },
    known: [],
  },
];
export const columns =
  "request_id pack_id entity_type entity_id display_name_zh display_name_ja display_name_en asset_role poi_tier priority orientation target_width target_height source_policy status provider source_id source_url license credit commercial_use_allowed cache_allowed derivatives_allowed notes".split(
    " ",
  );
function localAsset(id, assetType, path, alt, symbolicPlaceholder, entity) {
  const { bytes, sha256, width, height } = measure("public" + path);
  return {
    id,
    assetType,
    entity,
    locale: "und",
    runtime: { kind: "local", path },
    source: {
      type: symbolicPlaceholder ? "placeholder" : "brand_owned",
      provider: "TravelAssist",
      sourceId: id,
      sourceUrl: null,
      provenance: "assets/design/asset-library/source/original-shapes.mjs",
    },
    rights: {
      license: "TravelAssist-original",
      credit: "TravelAssist — original geometric SVG, TASK-013-A",
      commercialUseAllowed: true,
      cacheAllowed: true,
      derivativesAllowed: true,
      expiresAt: null,
    },
    presentation: {
      alt,
      decorative: false,
      width,
      height,
      focalPoint: { x: 0.5, y: 0.5 },
    },
    integrity: { sha256, bytes },
    authenticity: "symbolic",
    status: "approved",
  };
}
export function generate() {
  const assets = [],
    packs = [],
    backlog = [];
  for (const [group, shapes] of Object.entries(groups))
    for (const [name, body] of Object.entries(shapes)) {
      const path = `/media/shared/${group}/${prefix[group]}${name}.svg`;
      const svg =
        group === "map-markers"
          ? pin(body, name)
          : ["placeholders", "states"].includes(group)
            ? scene(body)
            : icon(body);
      write("public" + path, svg);
      assets.push(
        localAsset(
          sharedId(group, name),
          group,
          path,
          `${name.replaceAll("-", " ")} — ${group === "placeholders" ? "symbolic placeholder, not a photograph" : "symbolic icon"}`,
          group === "placeholders",
          { type: "category", id: name },
        ),
      );
    }
  for (const seed of packSeeds) {
    const id = "jp-" + seed.slug,
      fallbackId = packPlaceholder(seed.slug);
    const path = `/media/destinations/jp/${seed.slug}/placeholder-destination.svg`;
    write("public" + path, scene(destinations[seed.slug], true));
    assets.push(
      localAsset(
        fallbackId,
        "destination_placeholder",
        path,
        `${seed.names.en} — symbolic destination placeholder; not a photograph or geographic map`,
        true,
        { type: seed.type, id },
      ),
    );
    const slots = {
      desktopHero: [],
      mobileHero: [],
      areaCovers: [],
      landmarkSymbols: [],
      poiImages: [],
    };
    const specs = [
      ["desktopHero", "desktop-hero", 1, 1920, 1080, "", "P0"],
      ["mobileHero", "mobile-hero", 1, 1080, 1440, "", "P0"],
      ["areaCovers", "area-cover", 3, 960, 640, "", "P1"],
      ["landmarkSymbols", "landmark-symbol", 8, 640, 640, "S", "P1"],
      ["poiImages", "poi-image", 12, 640, 360, "A", "P2"],
    ];
    for (const [key, role, count, width, height, tier, priority] of specs)
      for (let i = 0; i < count; i++) {
        const sequence = String(i + 1).padStart(3, "0"),
          requestId = `${id}-${role}-${sequence}`;
        const assetId = `destination.jp.${seed.slug}.${role}.request.${sequence}`;
        // Existing mock names are procurement hints, NOT verified provider entities or coordinates.
        const known = role === "landmark-symbol" ? seed.known[i] : undefined;
        const entity = known
          ? { type: "poi_candidate", id: `${id}-${known[0]}` }
          : { type: "asset_request", id: requestId };
        const names = known
          ? { "zh-CN": known[1], "ja-JP": known[2], en: known[3] }
          : {
              "zh-CN": `${seed.names["zh-CN"]} · ${role} 需求 ${i + 1}`,
              "ja-JP": `${seed.names["ja-JP"]} · ${role} 素材枠 ${i + 1}`,
              en: `${seed.names.en} · ${role} request ${i + 1}`,
            };
        const notes = known
          ? "Candidate name occurs in src/features/planner/data/planner-catalog.ts at baseline; translations and identity require editorial verification. No coordinate/provider ID asserted."
          : "Unresolved role/area requirement, NOT a real POI entity. Pack destination is supported by start-flow generated-plans/japan-regions and trip-library fixtures; identify subject and verify names before acquisition.";
        const sourcePolicy =
          role === "landmark-symbol"
            ? "original_symbolic_only_not_documentary"
            : role.includes("hero")
              ? "licensed_documentary_or_explicitly_approved_illustrative"
              : "licensed_documentary_or_provider_reference_no_scraping";
        const slot = {
          requestId,
          assetId,
          role,
          names,
          entity,
          resolution: known ? "candidate_requires_verification" : "unresolved",
          target: { width, height },
          status: "acquisition_required",
          notes,
        };
        slots[key].push(slot);
        assets.push({
          id: assetId,
          assetType: role,
          entity,
          locale: "und",
          runtime: { kind: "none" },
          source: {
            type: "placeholder",
            provider: null,
            sourceId: null,
            sourceUrl: null,
          },
          rights: {
            license: null,
            credit: null,
            commercialUseAllowed: null,
            cacheAllowed: null,
            derivativesAllowed: null,
            expiresAt: null,
          },
          presentation: {
            alt: `${names.en} — image not acquired`,
            decorative: false,
            width: null,
            height: null,
            focalPoint: { x: 0.5, y: 0.5 },
          },
          integrity: { sha256: null, bytes: 0 },
          authenticity: "symbolic",
          status: "acquisition_required",
        });
        backlog.push({
          request_id: requestId,
          pack_id: id,
          entity_type: entity.type,
          entity_id: entity.id,
          display_name_zh: names["zh-CN"],
          display_name_ja: names["ja-JP"],
          display_name_en: names.en,
          asset_role: role,
          poi_tier: tier,
          priority,
          orientation:
            width > height
              ? "landscape"
              : width < height
                ? "portrait"
                : "square",
          target_width: width,
          target_height: height,
          source_policy: sourcePolicy,
          status: "acquisition_required",
          notes,
        });
      }
    packs.push({
      id,
      country: "JP",
      type: seed.type,
      names: seed.names,
      description:
        "Phase 1 fallback and procurement pack; no verified documentary photos acquired.",
      theme: {
        surface: "#fbf4ea",
        accent: "#d97b70",
        ink: "#475665",
        gradient: ["#fbf4ea", "#f4dfd9"],
      },
      slots,
      fallbacks: { generic: fallbackId, categories: {} },
      completion: {
        approvedPlaceholders: 1,
        requestedAssets: 25,
        acquiredAssets: 0,
      },
      rightsSummary: { approved: 1, providerOnly: 0, acquisitionRequired: 25 },
      lastReviewedAt: "2026-09-07",
    });
  }
  writeJson(CATALOG + "asset-manifest.v1.json", { schemaVersion: 1, assets });
  writeJson(CATALOG + "destination-packs.v1.json", { schemaVersion: 1, packs });
  write(CATALOG + "acquisition-backlog.v1.csv", csv(backlog, columns));
  return {
    assets: assets.length,
    local: assets.filter((a) => a.runtime.kind === "local").length,
    packs: packs.length,
    requests: backlog.length,
  };
}
if (isMain(import.meta.url)) console.log(generate());
