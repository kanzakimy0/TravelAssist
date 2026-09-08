import assert from "node:assert/strict";
import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { format } from "prettier";
import { createResolution } from "./japan-destination-resolution.mjs";
import {
  ROOT,
  CATALOG,
  read,
  json,
  csv,
  parseCsv,
  sha256,
  write,
} from "./asset-utils.mjs";

export const GENERATED = "docs/assets/generated/";
export const SEED = CATALOG + "core-destination-generation-seed.v1.csv";
export const BATCH_SEED =
  CATALOG + "core-destination-generation-batches.v1.csv";
export const SEED_HASH =
  "67c60cf45e9744ffcc48f4d9f2fee8bdd8cd4eb8164fc4b8ebfc584b331b5132";
export const BATCH_HASH =
  "c4dff4c0329b00fd12f545543be4b5ca35f687d64fc6e81f43c6c64a20083e48";
const REGIONS = [
  "hokkaido",
  "tohoku",
  "kanto",
  "chubu",
  "kansai",
  "chugoku",
  "shikoku",
  "kyushu-okinawa",
];
export const MODES = [
  "illustrative_city",
  "documentary_photo",
  "provider_only",
  "symbolic_placeholder",
  "acquisition_required",
];
export const QUOTAS = {
  S: {
    landmark: 10,
    museum_culture: 6,
    historic_religious: 6,
    nature_viewpoint: 5,
    family_theme: 4,
    district_neighborhood: 4,
    market_shopping: 3,
    food_culture_experience: 2,
  },
  A: {
    landmark: 7,
    museum_culture: 4,
    historic_religious: 4,
    nature_viewpoint: 3,
    family_theme: 2,
    district_neighborhood: 2,
    market_shopping: 2,
    food_culture_experience: 1,
  },
};
const PREFECTURE_JA = {
  hokkaido: "北海道",
  aomori: "青森県",
  iwate: "岩手県",
  miyagi: "宮城県",
  akita: "秋田県",
  yamagata: "山形県",
  fukushima: "福島県",
  ibaraki: "茨城県",
  tochigi: "栃木県",
  gunma: "群馬県",
  saitama: "埼玉県",
  chiba: "千葉県",
  tokyo: "東京都",
  kanagawa: "神奈川県",
  niigata: "新潟県",
  toyama: "富山県",
  ishikawa: "石川県",
  fukui: "福井県",
  yamanashi: "山梨県",
  nagano: "長野県",
  gifu: "岐阜県",
  shizuoka: "静岡県",
  aichi: "愛知県",
  mie: "三重県",
  shiga: "滋賀県",
  kyoto: "京都府",
  osaka: "大阪府",
  hyogo: "兵庫県",
  nara: "奈良県",
  wakayama: "和歌山県",
  tottori: "鳥取県",
  shimane: "島根県",
  okayama: "岡山県",
  hiroshima: "広島県",
  yamaguchi: "山口県",
  tokushima: "徳島県",
  kagawa: "香川県",
  ehime: "愛媛県",
  kochi: "高知県",
  fukuoka: "福岡県",
  saga: "佐賀県",
  nagasaki: "長崎県",
  kumamoto: "熊本県",
  oita: "大分県",
  miyazaki: "宮崎県",
  kagoshima: "鹿児島県",
  okinawa: "沖縄県",
};
const normalized = (text) => text.replaceAll("\r\n", "\n");
const total = (rows, key) =>
  rows.reduce((sum, row) => sum + Number(row[key]), 0);
const unique = (rows, key) => new Set(rows.map((row) => row[key])).size;
export const table = (headers, rows) =>
  [
    "| " + headers.join(" | ") + " |",
    "| " + headers.map(() => "---").join(" | ") + " |",
    ...rows.map(
      (row) =>
        "| " +
        row
          .map((x) =>
            String(x ?? "")
              .replaceAll("|", "\\|")
              .replaceAll("\n", " "),
          )
          .join(" | ") +
        " |",
    ),
  ].join("\n");

export function assertInputs(
  seedText = read(SEED),
  batchText = read(BATCH_SEED),
) {
  const seed = parseCsv(seedText),
    batches = parseCsv(batchText);
  assert.equal(seed.length, 300, "Seed rows");
  assert.equal(
    unique(seed, "destination_id"),
    300,
    "Duplicate destination IDs",
  );
  for (const [i, s] of seed.entries()) {
    assert.equal(s.country_code, "JP", "Japan-only country gate");
    assert.match(
      s.destination_id,
      /^jp-[a-z0-9-]+$/,
      "Japan-only destination ID",
    );
    assert.match(s.batch_id, /^JP-[SA]-\d{2}$/, "Japan-only batch ID");
    assert.ok(REGIONS.includes(s.region), "Japan-only region");
    assert.ok(["S", "A"].includes(s.tier), "Tier");
    assert.equal(+s.priority_order, i + 1, "Priority order");
    assert.equal(
      +s.attraction_quota,
      s.tier === "S" ? 40 : 25,
      "Per-destination quota",
    );
  }
  assert.equal(seed.filter((s) => s.tier === "S").length, 100);
  assert.equal(seed.filter((s) => s.tier === "A").length, 200);
  assert.equal(total(seed, "attraction_quota"), 9000);
  // Names/IDs are pinned to the reviewed Japan-only input, not trusted merely because they say JP.
  assert.equal(
    sha256(normalized(seedText)),
    SEED_HASH,
    "Unreviewed seed identity/name change: Japan-only input pin",
  );
  assert.equal(
    sha256(normalized(batchText)),
    BATCH_HASH,
    "Frozen batch change",
  );
  assert.equal(batches.length, 40);
  assert.equal(unique(batches, "batch_id"), 40);
  for (const [i, b] of batches.entries()) {
    const expected =
      i < 10
        ? `JP-S-${String(i + 1).padStart(2, "0")}`
        : `JP-A-${String(i - 9).padStart(2, "0")}`;
    assert.equal(b.batch_id, expected, "Frozen Japan batch sequence");
    assert.equal(+b.execution_order, i + 1);
    const destinations = seed.filter((s) => s.batch_id === b.batch_id);
    assert.ok(destinations.length <= 10);
    assert.equal(destinations.length, +b.destinations);
    assert.ok(destinations.every((s) => s.tier === b.tier));
    assert.equal(total(destinations, "attraction_quota"), +b.attractions);
    assert.equal(+b.city_variant_files, destinations.length * 2);
    assert.equal(+b.attraction_variant_files, +b.attractions);
    assert.equal(
      +b.expected_variant_files,
      +b.attractions + 2 * destinations.length,
    );
    assert.ok(+b.expected_variant_files <= 420);
  }
  return { seed, batches };
}

export function assertMode(env = process.env) {
  const mode = env.RUN_MODE ?? "manifest";
  assert.ok(
    ["manifest", "batch-prepare"].includes(mode),
    "Image execution is not supported by TASK-013.2",
  );
  if (mode === "batch-prepare")
    assert.match(
      env.BATCH_ID ?? "",
      /^JP-(S-(0[1-9]|10)|A-(0[1-9]|[12]\d|30))$/,
      "Explicit valid Japan batch required",
    );
  return mode;
}

export function buildData() {
  const { seed, batches } = assertInputs();
  const evidence = json(CATALOG + "core-destination-evidence.v1.json");
  assert.equal(evidence.seed_sha256, SEED_HASH);
  assert.equal(evidence.destinations.length, 300);
  assert.equal(unique(evidence.destinations, "destination_id"), 300);
  assert.deepEqual(
    evidence.prefectures.map((p) => p.code).sort(),
    Object.keys(PREFECTURE_JA).sort(),
  );
  const packs = json(CATALOG + "destination-packs.v1.json").packs;
  const profiles = json(
    CATALOG + "asset-size-profiles.v1.json",
  ).profiles.filter((p) => ["sm", "md", "lg"].includes(p.id));
  assert.equal(profiles.length, 3);
  for (const p of profiles) {
    assert.equal(p.fit, "inside");
    assert.equal(p.withoutEnlargement, true);
  }
  const parentAssets = json(CATALOG + "asset-manifest.v1.json").assets;
  // Existing packs contain acquisition requests, not a verified POI master. Never reinterpret those as real places.
  const destinations = seed.map((s) => {
    const e = evidence.destinations.find(
      (d) => d.destination_id === s.destination_id,
    );
    assert.equal(
      e?.name_en,
      s.destination_name_en,
      "Evidence identity mismatch",
    );
    const prefCodes = [...new Set(e.candidates.map((c) => c.prefecture_code))];
    const p =
      prefCodes.length === 1
        ? evidence.prefectures.find((p) => p.code === prefCodes[0])
        : null;
    for (const c of e.candidates) {
      const prefecture = evidence.prefectures.find(
        (p) => p.code === c.prefecture_code,
      );
      assert.ok(
        prefecture && c.official_url.startsWith(prefecture.official_url),
        "Official prefecture provenance",
      );
      assert.equal(new URL(c.official_url).hostname, "www.japan.travel");
    }
    const pack = packs.find((p) => p.id === s.destination_id);
    return {
      destination_id: s.destination_id,
      batch_id: s.batch_id,
      tier: s.tier,
      region: s.region,
      country_code: "JP",
      prefecture_code: p?.code ?? "",
      prefecture_name_ja: p ? PREFECTURE_JA[p.code] : "",
      prefecture_name_en: p?.name_en ?? "",
      entity_type: pack?.type ?? "entity_resolution_required",
      name_zh: pack?.names["zh-CN"] ?? "",
      name_ja: pack?.names["ja-JP"] ?? "",
      name_en: s.destination_name_en,
      canonical_name: s.destination_name_en,
      aliases: "",
      latitude: "",
      longitude: "",
      provider_type: "",
      provider_entity_id: "",
      attraction_quota: +s.attraction_quota,
      source_mode: "illustrative_city",
      source_job_id: `source:${s.destination_id}:master`,
      md_variant_id: `variant:${s.destination_id}:md`,
      lg_variant_id: `variant:${s.destination_id}:lg`,
      status: "entity_resolution_required",
      authenticity: "illustrative",
      rights_status: "unresolved",
      official_url: p ? e.candidates[0].official_url : "",
      entity_provenance: pack ? CATALOG + "destination-packs.v1.json" : SEED,
      coverage_note: p
        ? `JNTO directory primary prefecture: ${p.name_en}. Tourism area is not an administrative boundary. Cross-prefecture extent and exact subject require review.`
        : "Prefecture/administrative scope unresolved; not counted toward coverage. Seed region is not sufficient evidence.",
      review_notes:
        "Resolve center coordinates, exact entity/cluster extent, trilingual names and image rights before execution. Blank coordinates/provider IDs are unknown, not zero.",
    };
  });
  const attractions = destinations.flatMap((d) => {
    let order = 0;
    return Object.entries(QUOTAS[d.tier]).flatMap(([category, count]) =>
      Array.from({ length: count }, () => {
        order++;
        return {
          poi_id: `unresolved:${d.destination_id}:${order}`,
          destination_id: d.destination_id,
          batch_id: d.batch_id,
          tier: d.tier,
          country_code: "JP",
          prefecture_code: d.prefecture_code,
          selection_order: order,
          category,
          name_zh: "",
          name_ja: "",
          name_en: "",
          canonical_name: "",
          aliases: "",
          latitude: "",
          longitude: "",
          provider_type: "",
          provider_entity_id: "",
          official_url: "",
          source_mode: "acquisition_required",
          source_job_id: `source:${d.destination_id}:poi:${order}`,
          sm_variant_id: `variant:${d.destination_id}:poi:${order}:sm`,
          rights_status: "unresolved",
          status: "entity_resolution_required",
          authenticity: "unknown",
          quota_exception_reason: "",
          review_notes:
            "Unresolved quota slot, not a real POI. Resolve against official/approved entity source, verify Japan location, deduplicate globally, and obtain rights before acquisition.",
        };
      }),
    );
  });
  const rights = {
    license: null,
    credit: null,
    commercialUseAllowed: null,
    cacheAllowed: null,
    derivativesAllowed: null,
    expiresAt: null,
  };
  const jobs = [...destinations, ...attractions].map((e) => {
    const city = !e.poi_id;
    return {
      job_id: e.source_job_id,
      destination_id: e.destination_id,
      entity_id: e.poi_id ?? e.destination_id,
      batch_id: e.batch_id,
      country_code: "JP",
      role: city ? "destination_master" : "poi_photo",
      source_mode: e.source_mode,
      preferred_modes: city
        ? ["illustrative_city"]
        : ["documentary_photo", "provider_only"],
      authenticity: e.authenticity,
      status: "blocked",
      block_reasons: [
        "entity_resolution_required",
        "rights_unresolved",
        "provider_unselected",
        "budget_unapproved",
        "storage_unapproved",
      ],
      source: {
        type: city ? "ai_generated" : "acquisition_required",
        provider: null,
        model: null,
        sourceId: null,
        sourceUrl: null,
        provenance: e.official_url || e.entity_provenance || SEED,
      },
      rights: { ...rights },
      rights_status: "unresolved",
      review_status: "pending",
      generatedAt: null,
      prompt_version: "1.0.0",
      prompt_template: city
        ? "destination-illustrative-v1"
        : "poi-acquisition-v1",
      prompt_variables: {
        destination_id: e.destination_id,
        destination_name: city
          ? e.name_en
          : destinations.find((d) => d.destination_id === e.destination_id)
              .name_en,
        subject: city ? e.name_en : null,
        category: e.category ?? null,
        country: "Japan",
      },
      minimum_source: city
        ? {
            width: 2048,
            height: 1365,
            orientation: "landscape",
            safe_crop_center: 0.7,
          }
        : { width: 640, height: 480 },
      expected_variant_ids: city
        ? [e.md_variant_id, e.lg_variant_id]
        : [e.sm_variant_id],
      execution_allowed: false,
      provider_reference_must_not_imply_cache_permission: true,
    };
  });
  const variants = jobs.flatMap((j) =>
    j.expected_variant_ids.map((variant_id) => {
      const profile_id = variant_id.split(":").at(-1),
        p = profiles.find((p) => p.id === profile_id);
      return {
        variant_id,
        source_job_id: j.job_id,
        entity_id: j.entity_id,
        destination_id: j.destination_id,
        batch_id: j.batch_id,
        country_code: "JP",
        profile_id,
        max_width: p.width,
        max_height: p.height,
        fit: p.fit,
        without_enlargement: p.withoutEnlargement,
        format: p.format,
        max_bytes: p.maxBytes,
        status: "expected_only",
        physical_path: "",
        physical_bytes: "",
        parent_profile_file: CATALOG + "asset-size-profiles.v1.json",
      };
    }),
  );
  const coverage = evidence.prefectures.map((p) => {
    const ds = destinations.filter((d) => d.prefecture_code === p.code);
    return {
      ...p,
      name_ja: PREFECTURE_JA[p.code],
      count: ds.length,
      S: ds.filter((d) => d.tier === "S").length,
      A: ds.filter((d) => d.tier === "A").length,
    };
  });
  assert.equal(
    coverage.filter((p) => p.count > 0).length,
    47,
    "Japan prefecture coverage gate",
  );
  return {
    seed,
    batches,
    destinations,
    attractions,
    jobs,
    variants,
    coverage,
    profiles,
    evidence,
    parentAssetCount: parentAssets.length,
  };
}

export function auditData(d) {
  const covered = new Set(
    d.destinations.map((x) => x.prefecture_code).filter(Boolean),
  );
  assert.deepEqual(
    [...covered].sort(),
    Object.keys(PREFECTURE_JA).sort(),
    "47 Japan prefectures, no missing/foreign prefecture",
  );
  assert.equal(d.destinations.length, 300);
  assert.equal(d.attractions.length, 9000);
  assert.equal(d.jobs.length, 9300);
  assert.equal(d.variants.length, 9600);
  for (const [rows, key] of [
    [d.destinations, "destination_id"],
    [d.attractions, "poi_id"],
    [d.jobs, "job_id"],
    [d.variants, "variant_id"],
  ])
    assert.equal(unique(rows, key), rows.length, `Duplicate ${key}`);
  for (const rows of [d.destinations, d.attractions, d.jobs, d.variants])
    for (const e of rows) {
      assert.equal(e.country_code, "JP");
      assert.ok(
        d.seed.some((s) => s.destination_id === e.destination_id),
        "Unknown Japan destination",
      );
      assert.equal(
        e.batch_id,
        d.seed.find((s) => s.destination_id === e.destination_id).batch_id,
        "Batch relationship",
      );
    }
  for (const e of d.destinations) {
    assert.equal(
      e.name_en,
      d.seed.find((s) => s.destination_id === e.destination_id)
        .destination_name_en,
      "No foreign name substitution",
    );
    assert.equal(e.latitude, "");
    assert.equal(e.longitude, "");
    assert.equal(e.provider_entity_id, "");
    assert.equal(e.source_mode, "illustrative_city");
    assert.equal(e.authenticity, "illustrative");
    for (const [category, n] of Object.entries(QUOTAS[e.tier]))
      assert.equal(
        d.attractions.filter(
          (p) =>
            p.destination_id === e.destination_id && p.category === category,
        ).length,
        n,
        "Category quota",
      );
  }
  for (const p of d.attractions) {
    assert.equal(
      p.poi_id,
      `unresolved:${p.destination_id}:${p.selection_order}`,
    );
    assert.equal(p.status, "entity_resolution_required");
    assert.equal(p.source_mode, "acquisition_required");
    assert.equal(p.rights_status, "unresolved");
    for (const f of [
      "name_zh",
      "name_ja",
      "name_en",
      "canonical_name",
      "latitude",
      "longitude",
      "provider_type",
      "provider_entity_id",
      "official_url",
    ])
      assert.equal(p[f], "", "Unverified POI facts must stay blank");
  }
  for (const j of d.jobs) {
    assert.equal(j.execution_allowed, false);
    assert.equal(j.status, "blocked");
    assert.equal(j.rights.commercialUseAllowed, null);
    assert.equal(j.rights.cacheAllowed, null);
    assert.equal(j.rights.derivativesAllowed, null);
    assert.equal(j.generatedAt, null);
    const expected = d.variants
      .filter((v) => v.source_job_id === j.job_id)
      .map((v) => v.variant_id);
    assert.deepEqual(j.expected_variant_ids, expected, "Job/variant linkage");
  }
  for (const [profile, n] of [
    ["sm", 9000],
    ["md", 300],
    ["lg", 300],
  ])
    assert.equal(d.variants.filter((v) => v.profile_id === profile).length, n);
  for (const v of d.variants) {
    assert.equal(v.physical_path, "");
    assert.equal(v.physical_bytes, "");
    assert.equal(v.status, "expected_only");
  }
  return {
    status: "Partial",
    japan_seed_destinations: 300,
    non_JP_rows: 0,
    verified_prefecture_assignments: d.destinations.filter(
      (x) => x.prefecture_code,
    ).length,
    missing_prefectures: d.coverage.filter((p) => !p.count).length,
    unresolved_destination_entities: 300,
    unresolved_attraction_slots: 9000,
    sources: 9300,
    variants: 9600,
    batches: 40,
    physical_image_files: 0,
    execution_allowed: false,
  };
}

export async function artifacts() {
  const d = buildData(),
    summary = auditData(d),
    output = new Map();
  const add = (path, value) =>
    output.set(
      path,
      typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
    );
  const addCsv = (name, rows) =>
    add(CATALOG + name, csv(rows, Object.keys(rows[0])));
  // TASK-013.3 owns the entity overlay; parent jobs, POI slots and variants stay frozen.
  addCsv(
    "core-destination-generation-manifest.v1.csv",
    createResolution(d.destinations).rows,
  );
  addCsv("core-attraction-generation-manifest.v1.csv", d.attractions);
  add(
    CATALOG + "core-source-jobs.v1.jsonl",
    d.jobs.map((j) => JSON.stringify(j)).join("\n") + "\n",
  );
  addCsv("core-variant-output-matrix.v1.csv", d.variants);
  add(CATALOG + "core-generation-policy.v1.json", {
    schemaVersion: 1,
    scope: "Japan-only",
    seed_sha256: SEED_HASH,
    batch_sha256: BATCH_HASH,
    run_mode: "manifest",
    execution_allowed: false,
    prerequisite_base: "95311fcbdc3432eb4b75cb0644cad7783fad7415",
    parent_issues: [112, 116],
    parent_prs: [166, 172, 188],
    source_priority: [
      "repository_verified_poi_master",
      "approved_provider",
      "official_tourism_or_entity_site",
      "compatible_open_knowledge",
      "manual_review",
    ],
    modes: MODES,
    category_quotas: QUOTAS,
    region_ids: REGIONS,
    prefecture_code_scheme:
      "JNTO English prefecture slug; NOT an ISO numeric code",
    authenticity_rules: {
      illustrative_city: "illustrative",
      documentary_photo: "verified_real_photo",
      provider_only: "provider_reference",
      symbolic_placeholder: "symbolic",
      acquisition_required: "unknown",
    },
    execution_gates: [
      "accepted_parents",
      "resolved_Japan_entities",
      "approved_provider",
      "verified_rights",
      "budget_approval",
      "storage_approval",
      "approved_child_task",
    ],
    prohibited_image_sources: [
      "Google Images",
      "Google Maps screenshots",
      "Tripadvisor",
      "Booking",
      "Agoda",
      "Instagram",
      "Xiaohongshu",
      "Weibo",
    ],
    no_images_downloaded: true,
    no_secrets: true,
    unknown_values: "null in JSON; empty in CSV, never a fabricated zero",
    parent_schema_files: [
      "asset-manifest.v1.json",
      "asset-variants.v1.json",
      "asset-size-profiles.v1.json",
      "asset-processing-policy.v1.json",
    ].map((name) => ({
      path: CATALOG + name,
      sha256: sha256(normalized(read(CATALOG + name))),
    })),
  });
  add(CATALOG + "core-generation-prompt-templates.v1.json", {
    schemaVersion: 1,
    version: "1.0.0",
    templates: [
      {
        id: "destination-illustrative-v1",
        mode: "illustrative_city",
        authenticity: "illustrative",
        requires_resolved_subject: true,
        template:
          "Illustrative travel atmosphere inspired by {{destination_name}}, Japan, using only reviewed destination references. Warm restrained palette, natural light, landscape composition, subject in central 70%. No text, logo, watermark or UI. Not a documentary photograph or evidence of an actual landmark. Do not invent a recognizable landmark. Minimum 2048 x 1365.",
        negative:
          "No overseas setting, fabricated signs, fake documentary claims, watermarks, booking screenshots or brand logos.",
      },
      {
        id: "poi-acquisition-v1",
        mode: "acquisition_required",
        authenticity: "unknown",
        image_generation: false,
        template:
          "Resolve {{destination_id}} category {{category}} to a verified Japanese POI, record official identity evidence and deduplicate. Acquire a legally licensed real photograph or approved provider reference. Confirm commercial/cache/derivative rights, creator credit, capture location and source quality >=640 x 480. Never generate a fake photograph.",
      },
      {
        id: "poi-documentary-review-v1",
        mode: "documentary_photo",
        authenticity: "verified_real_photo",
        image_generation: false,
        template:
          "Review real photograph against resolved entity and rights evidence. Record creator, license, provenance, attribution and expiry. Reject mismatched or synthetic scenes.",
      },
      {
        id: "provider-reference-review-v1",
        mode: "provider_only",
        authenticity: "provider_reference",
        image_generation: false,
        template:
          "Record approved provider entity and photo reference under its current terms. No binary caching or derivatives without explicit permission.",
      },
      {
        id: "symbolic-placeholder-v1",
        mode: "symbolic_placeholder",
        authenticity: "symbolic",
        template:
          "A clearly simplified symbolic {{category}} illustration; never a real attraction photograph. Label symbolic. Prefer existing approved category SVG from parent registry.",
      },
    ],
  });
  for (const b of d.batches) {
    const ds = d.destinations.filter((x) => x.batch_id === b.batch_id),
      jobs = d.jobs.filter((x) => x.batch_id === b.batch_id),
      vs = d.variants.filter((x) => x.batch_id === b.batch_id);
    add(GENERATED + `core-batches/${b.batch_id}.json`, {
      schemaVersion: 1,
      batch_id: b.batch_id,
      execution_order: +b.execution_order,
      tier: b.tier,
      country_code: "JP",
      run_mode: "manifest",
      execution_allowed: false,
      expected: {
        destinations: ds.length,
        attractions: +b.attractions,
        source_jobs: jobs.length,
        variants: vs.length,
      },
      destination_ids: ds.map((x) => x.destination_id),
      source_job_ids: jobs.map((x) => x.job_id),
      variant_ids: vs.map((x) => x.variant_id),
      prerequisites: [
        "entity resolution",
        "rights approval",
        "provider and budget approval",
        "storage approval",
        "separate child task",
      ],
      unresolved_attractions: +b.attractions,
      source_jobs_file: CATALOG + "core-source-jobs.v1.jsonl",
      variant_matrix_file: CATALOG + "core-variant-output-matrix.v1.csv",
    });
  }
  const md = (name, title, body) =>
    add(GENERATED + name, `# ${title}\n\n${body}\n`);
  md(
    "core-generation-summary.md",
    "Japan-only core generation summary",
    table(["Metric", "Value"], Object.entries(summary)) +
      `\n\n300 frozen seed destinations are planning identities, not 300 fully resolved production entities. 9,000 slots are explicitly unresolved, not verified attractions. Original images/parent registries are unchanged. Existing parent manifest has ${d.parentAssetCount} assets; none is converted from a symbolic asset request into a POI.\n\nPrefecture names and URLs were checked against [JNTO destinations](https://www.japan.travel/en/destinations/). Names, exact cluster boundaries, center coordinates and translations still need review. No provider IDs or prices were fabricated.`,
  );
  md(
    "prefecture-coverage.md",
    "Japan prefecture coverage",
    `Prefecture count: 47. missing_prefectures: 0. Counts below use only unambiguous JNTO directory matches; ${300 - summary.verified_prefecture_assignments} unassigned seed destinations are excluded. This is coverage evidence, not complete entity resolution. Codes are JNTO slugs, not ISO codes. Cross-prefecture clusters must be reviewed before execution.\n\n` +
      table(
        ["Code", "日本語", "English", "S", "A", "Total", "Gap", "Source"],
        d.coverage.map((p) => [
          p.code,
          p.name_ja,
          p.name_en,
          p.S,
          p.A,
          p.count,
          p.count ? 0 : 1,
          `[JNTO](${p.official_url})`,
        ]),
      ),
  );
  md(
    "unresolved-destinations.md",
    "Destination resolution queue",
    `All 300 need production-entity acceptance. Blank fields are deliberate; three existing parent pack translations are reused, never English copied into Japanese/Chinese.\n\n` +
      table(
        ["ID", "Name", "Prefecture", "Remaining work", "Evidence"],
        d.destinations.map((x) => [
          x.destination_id,
          x.name_en,
          x.prefecture_code || "unresolved",
          "exact entity/extent; center; translations; rights",
          x.official_url ? `[JNTO](${x.official_url})` : "frozen seed only",
        ]),
      ),
  );
  md(
    "unresolved-attractions.md",
    "Unresolved attraction slots",
    `9000 unresolved slots, 0 verified POI entities. The CSV contains every slot ID. Ranges below are inclusive; category allocations remain exactly frozen. Selection must deduplicate a real POI across overlapping destinations before acquiring one source.\n\n` +
      table(
        ["Destination", "First unresolved ID", "Last unresolved ID", "Count"],
        d.destinations.map((x) => [
          x.destination_id,
          `unresolved:${x.destination_id}:1`,
          `unresolved:${x.destination_id}:${x.attraction_quota}`,
          x.attraction_quota,
        ]),
      ),
  );
  const officialGroups = new Map();
  for (const x of d.destinations)
    if (x.official_url)
      officialGroups.set(x.official_url, [
        ...(officialGroups.get(x.official_url) || []),
        x.destination_id,
      ]);
  const overlaps = [...officialGroups].filter(([, ids]) => ids.length > 1);
  md(
    "duplicate-entities.md",
    "Duplicate entity review",
    `Duplicate technical destination IDs: 0. Duplicate slot/job/variant IDs: 0. Verified POIs available for semantic deduplication: 0 (not proof of no real-world duplicates).\n\nShared official-area URLs: ${overlaps.length}. These are overlap candidates, not automatic duplicate merges. Broader/subordinate areas can also overlap without sharing a URL; all cluster boundaries require review.\n\n` +
      table(
        ["Source", "Destination IDs"],
        overlaps.map(([url, ids]) => [`[JNTO](${url})`, ids.join(", ")]),
      ),
  );
  md(
    "rights-blocked-jobs.md",
    "Rights-blocked source jobs",
    `9300 / 9300 source jobs are blocked; commercial use, caching and derivative permissions are unresolved. A public tourism page is identity evidence, not an image license. Every job has structured block reasons.\n\n` +
      table(
        ["Batch", "Destination jobs", "POI jobs", "Total blocked"],
        d.batches.map((b) => [
          b.batch_id,
          b.destinations,
          b.attractions,
          +b.destinations + +b.attractions,
        ]),
      ),
  );
  md(
    "core-generation-batch-index.md",
    "Japan batch index",
    `40 manifest-only batches. JP-S-01 is first preparable, not executable. No batch automatically creates a child task or acquires images.\n\n` +
      table(
        [
          "Order",
          "Batch",
          "Destinations",
          "POI slots",
          "Source jobs",
          "Variants",
          "State",
        ],
        d.batches.map((b) => [
          b.execution_order,
          `[${b.batch_id}](core-batches/${b.batch_id}.json)`,
          b.destinations,
          b.attractions,
          +b.destinations + +b.attractions,
          b.expected_variant_files,
          "blocked for execution",
        ]),
      ),
  );
  const budgets = d.profiles.map((p) => {
    const count = d.variants.filter((v) => v.profile_id === p.id).length;
    return [p.id, count, p.maxBytes, count * p.maxBytes];
  });
  md(
    "core-generation-cost-estimate.md",
    "Cost and storage estimate",
    `No provider/model or paid plan has been chosen. Monetary total: unknown, not zero. No paid operation was performed.\n\nFormula: 300 × city generation unit cost × reviewed retry factor + 9000 × licensed photo acquisition unit cost + provider reference fees + storage/egress. Provider-only jobs may prohibit stored variants; resolve terms before estimating physical outputs. Unit costs, currency and retry factor require approval; no invented live prices.\n\nVariant budget ceiling (parent maxBytes, not measured files):\n\n` +
      table(["Profile", "Count", "Max bytes each", "Ceiling bytes"], budgets) +
      `\n\nTotal variant ceiling: ${budgets.reduce((s, r) => s + r[3], 0)} bytes (decimal). Masters: unknown (codec/provider not selected); total including masters is unknown. Actual new image storage: 0 bytes. Source dimensions: city >=2048×1365, POI >=640×480. Preserve originals, no upscaling. Batch child tasks must set an approved currency budget and storage ceiling before execution.`,
  );
  md(
    "core-generation-validation.md",
    "Core generation structural validation",
    `Structural checks: PASS. Production readiness: Partial. ${summary.verified_prefecture_assignments} primary prefecture matches / 47 covered / 0 missing. Unresolved entities remain: 300 destinations and 9000 POI slots.\n\nChecked: frozen Japan-only name/ID hash; country/region gates; 300 unique destination IDs; S100/A200; category quotas; 40 ordered JP batches; batch capacities; 9300 unique jobs; md300/lg300/sm9000; 9600 unique variant expectations; job/batch/variant foreign keys; no physical files; no approved rights or execution; parent inside/no-upscale profiles.\n\nThis report is regenerated offline from pinned seed, official metadata snapshot and accepted parent registries. The validation command compares every generated artifact with canonical output; mutation tests cover invalid country/name/batch, rights escalation, fabricated POIs and corruption. Command execution evidence is recorded separately in the Task Result, never inferred from this report.`,
  );
  for (const [path, content] of output)
    if (/\.(json|md)$/.test(path))
      output.set(path, await format(content, { filepath: path }));
  return { data: d, summary, output };
}

export async function publish(kind = "manifest") {
  const mode = assertMode(),
    { data, summary, output } = await artifacts();
  let changed = 0;
  for (const [path, content] of output) {
    const isBatch =
      path.includes("/core-batches/") ||
      path.endsWith("core-generation-batch-index.md");
    const isCost = path.endsWith("core-generation-cost-estimate.md");
    if (
      kind === "batches"
        ? !isBatch
        : kind === "estimate"
          ? !isCost
          : isBatch || isCost
    )
      continue;
    if (!existsSync(resolve(ROOT, path)) || read(path) !== content) changed++;
    write(path, content);
  }
  console.log(
    JSON.stringify({ kind, mode, changed_files: changed, ...summary }),
  );
  if (mode === "batch-prepare")
    console.log(
      JSON.stringify({
        batch_id: process.env.BATCH_ID,
        destinations: data.destinations
          .filter((x) => x.batch_id === process.env.BATCH_ID)
          .map((x) => x.destination_id),
        execution_allowed: false,
      }),
    );
  return changed;
}

export async function validateFiles(readArtifact = read, batchFiles = null) {
  assertMode();
  const { output, summary } = await artifacts();
  assert.deepEqual(
    (
      batchFiles ?? readdirSync(resolve(ROOT, GENERATED + "core-batches"))
    ).sort(),
    [...output.keys()]
      .filter((p) => p.includes("/core-batches/"))
      .map((p) => p.split("/").at(-1))
      .sort(),
    "Exactly forty batch files, no stale/global extras",
  );
  for (const [path, expected] of output)
    assert.equal(
      normalized(readArtifact(path)),
      expected,
      `Stale/corrupted generated artifact: ${path}`,
    );
  console.log(
    JSON.stringify({
      validation: "PASS",
      files: output.size,
      planning_baseline: summary,
      current_destination_resolution: createResolution(buildData().destinations)
        .summary,
    }),
  );
  return summary;
}
