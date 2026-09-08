import assert from "node:assert/strict";
import { format } from "prettier";
import {
  CATALOG,
  json,
  read,
  parseCsv,
  csv,
  sha256,
  write,
} from "./asset-utils.mjs";
import {
  assessCandidates,
  normalizeName,
  label,
  values,
  prefectureMap,
  entityType,
} from "./japan-entity-candidates.mjs";

export const TYPES = [
  "city",
  "town",
  "village",
  "ward",
  "island",
  "region",
  "hot_spring_area",
  "resort_area",
  "destination_cluster",
  "historic_district",
  "other_review_required",
];
export const MANIFEST = CATALOG + "core-destination-generation-manifest.v1.csv";
export const EVIDENCE = CATALOG + "japan-destination-entity-evidence.v1.jsonl";
export const REVIEW = CATALOG + "japan-destination-review.v1.json";
export const SNAPSHOT = CATALOG + "japan-destination-open-evidence.v1.json";
export const CONTRACT = CATALOG + "japan-destination-boundary-contract.v1.json";
const GEN = "docs/assets/generated/";
const municipal = new Set(["city", "town", "village", "ward"]);
// Script normalization only, not a translation or a source of new place names.
const simplified = Object.fromEntries(
  [
    ..."廣島岡長宮濱澤兒縣東關戶國溫鄉區灣嶼龍櫻葉樂見銀馬籠瀨內斷豐倉崎來豬奧礦禮爾線鵡圍變館產場會體邊戶東澤鄉鳥龜後須稻神廣薩門隱歸彌灘條當萬津鹽澀轉氣橋應壽廳廟燒淺藏",
  ].map((c, i) => [
    c,
    [
      ..."广岛冈长宫滨泽儿县东关户国温乡区湾屿龙樱叶乐见银马笼濑内断丰仓崎来猪奥矿礼尔线鹉围变馆产场会体边户东泽乡鸟龟后须稻神广萨门隐归弥滩条当万津盐涩转气桥应寿厅庙烧浅藏",
    ][i],
  ]),
);
export const toSimplified = (s) =>
  [...s].map((c) => simplified[c] ?? c).join("");
const sourceURL = (e) =>
  e && Number.isSafeInteger(e.revision) && e.revision > 0
    ? `https://www.wikidata.org/w/index.php?title=${e.id}&oldid=${e.revision}`
    : "";
const unique = (xs) => [...new Set(xs)];
const safeText = (s) =>
  String(s ?? "")
    .replaceAll("|", "/")
    .replaceAll("\n", " ");
const table = (headers, rows) =>
  "| " +
  headers.join(" | ") +
  " |\n| " +
  headers.map(() => "---").join(" | ") +
  " |\n" +
  rows.map((r) => "| " + r.map(safeText).join(" | ") + " |").join("\n");
const countBy = (xs) =>
  Object.fromEntries(
    unique(xs)
      .sort()
      .map((x) => [x, xs.filter((y) => y === x).length]),
  );

export function inputs() {
  return {
    snapshot: json(SNAPSHOT),
    review: json(REVIEW),
    official: json(CATALOG + "core-destination-evidence.v1.json"),
    seeds: parseCsv(read(CATALOG + "core-destination-generation-seed.v1.csv")),
  };
}

function scopeFor(type, name, id) {
  if (municipal.has(type))
    return `exact municipality: ${name} (${id}); current administrative boundary, not the wider marketing region`;
  if (type === "island")
    return `island-wide: ${name} (${id}); this island only, excluding other islands of its municipality`;
  if (type === "hot_spring_area")
    return `named hot-spring district: ${name} (${id}); named spa cluster only, not its entire municipality`;
  if (type === "resort_area")
    return `named resort cluster: ${name} (${id}); resort grounds only, not the entire host municipality`;
  if (type === "historic_district")
    return `historic district: ${name} (${id}); named historic settlement/heritage footprint only, not its entire municipality`;
  if (type === "destination_cluster")
    return `named tourism corridor: ${name} (${id}); documented route corridor only, not whole host prefectures`;
  if (type === "region")
    return `named geographic region: ${name} (${id}); entity footprint only; lake means lake, peninsula means peninsula, archipelago means listed islands`;
  return "";
}

export function resolveRows(baseline, data = inputs()) {
  const { snapshot, review, official, seeds } = data;
  const prefs = prefectureMap(snapshot.entities, official);
  const prefEntities = new Map(
    [...prefs].map(([id, code]) => [code, snapshot.entities[id]]),
  );
  const evidence = [];
  const rows = baseline.map((base) => {
    const seed = seeds.find((s) => s.destination_id === base.destination_id);
    assert(seed, `Unknown destination ${base.destination_id}`);
    const choice = review.choices[base.destination_id];
    const candidates = assessCandidates(seed, snapshot, official);
    // Do not use rank as identity evidence. Prefer a unique current municipality or a unique exact geographic entity.
    const eligible = candidates.filter((c) => !c.reasons.length);
    const cities = eligible.filter(
      (c) => municipal.has(c.type) && /市$|町$|村$|区$/.test(c.ja),
    );
    const candidate = choice
      ? candidates.find((c) => c.id === choice.id)
      : cities.length === 1
        ? cities[0]
        : eligible.length === 1
          ? eligible[0]
          : null;
    const e = candidate ? snapshot.entities[candidate.id] : null;
    const reasons = candidate
      ? [...candidate.reasons]
      : ["ambiguous_or_no_reliable_candidate"];
    if (choice?.note && candidate) {
      const index = reasons.indexOf("name_alias_not_exact");
      if (index >= 0) reasons.splice(index, 1);
    }
    if (review.hold[base.destination_id]) reasons.push("manual_review_hold");
    const ja = label(e, "ja"),
      en = label(e, "en");
    const zhSource = label(e, "zh-cn")
      ? "zh-cn"
      : label(e, "zh-hans")
        ? "zh-hans"
        : "zh";
    const zh = toSimplified(label(e, zhSource));
    if (
      !ja ||
      !/[\u3040-\u30ff\u3400-\u9fff]/.test(ja) ||
      !zh ||
      !/[\u3400-\u9fff]/.test(zh) ||
      !en
    )
      reasons.push("missing_trilingual_names");
    const prefCodes = unique(candidate?.prefectures.map((p) => p.code) ?? []);
    if (
      prefCodes.length > 1 &&
      !["region", "destination_cluster", "island"].includes(candidate?.type)
    )
      reasons.push("unexpected_multiple_prefectures");
    const officialMatch =
      official.destinations.find(
        (d) => d.destination_id === base.destination_id,
      )?.candidates ?? [];
    const primary =
      prefCodes.find((code) =>
        officialMatch.some((m) => m.prefecture_code === code),
      ) ??
      prefCodes[0] ??
      "";
    const prefEntity = prefEntities.get(primary);
    const coords = candidate?.coordinates ?? [];
    if (
      coords.length > 1 &&
      coords.some(
        (c) =>
          Math.abs(c.latitude - coords[0].latitude) > 0.02 ||
          Math.abs(c.longitude - coords[0].longitude) > 0.02,
      )
    )
      reasons.push("conflicting_representative_coordinates");
    const sourceCoord = coords[0];
    if (
      sourceCoord &&
      (!Number.isFinite(sourceCoord.precision) || sourceCoord.precision <= 0)
    )
      reasons.push("unknown_coordinate_precision");
    const coord =
      !sourceURL(e) ||
      reasons.some((r) =>
        [
          "conflicting_representative_coordinates",
          "unknown_coordinate_precision",
        ].includes(r),
      )
        ? null
        : sourceCoord;
    const type = candidate?.type ?? "other_review_required";
    const scope = scopeFor(type, en, e?.id);
    if (!scope) reasons.push("coverage_scope_not_verified");
    const source = sourceURL(e);
    if (e && !source) reasons.push("unpinned_source_revision");
    const officialSource = officialMatch.find(
      (m) => m.prefecture_code === primary,
    );
    const officialUrl =
      officialSource?.destination_url ??
      officialSource?.official_url ??
      officialSource?.url ??
      "";
    const aliases = unique([
      seed.destination_name_en,
      ...["ja", "zh-cn", "zh-hans", "zh", "en"].flatMap((l) =>
        (e?.aliases?.[l] ?? []).map((a) => a.value),
      ),
    ]).filter(Boolean);
    const verified = reasons.length === 0;
    const digits = coord
      ? Math.max(0, Math.min(4, Math.floor(-Math.log10(coord.precision))))
      : 0;
    const row = {
      ...base,
      entity_type: type,
      name_ja: ja,
      name_zh: zh,
      name_en: en,
      canonical_name: ja,
      aliases: aliases.join("; "),
      prefecture_code: primary,
      prefecture_name_ja: label(prefEntity, "ja"),
      prefecture_name_zh: toSimplified(
        label(prefEntity, "zh-cn") ||
          label(prefEntity, "zh-hans") ||
          label(prefEntity, "zh"),
      ),
      prefecture_name_en:
        official.prefectures.find((p) => p.code === primary)?.name_en ?? "",
      latitude: coord ? coord.latitude.toFixed(digits) : "",
      longitude: coord ? coord.longitude.toFixed(digits) : "",
      provider_type: e ? "wikidata" : "",
      provider_entity_id: e?.id ?? "",
      coordinate_source_type: coord ? "wikidata_P625" : "",
      coordinate_source_url: coord ? source : "",
      official_source_type: officialUrl ? "JNTO_directory" : "",
      official_source_url: officialUrl,
      coverage_scope: scope,
      parent_destination_id: "",
      entity_status: verified ? "verified" : "unresolved",
      status: verified
        ? "entity_verified_rights_unresolved"
        : "entity_resolution_required",
      official_url: officialUrl,
      entity_provenance: EVIDENCE,
      coverage_note: scope,
      review_notes: [
        choice?.note ??
          "Exact name/alias, current geographic type and prefecture chain checked against pinned open-knowledge evidence.",
        review.hold[base.destination_id] ?? "",
        ...reasons,
      ]
        .filter(Boolean)
        .join(" "),
    };
    evidence.push({
      destination_id: row.destination_id,
      entity_id: e?.id ?? null,
      entity_revision: e?.revision ?? null,
      source_url: source || null,
      source_license: "CC0 metadata; no image rights",
      retrieved_date: snapshot.retrieved_date,
      identity_verified:
        !!candidate &&
        !!source &&
        !review.hold[base.destination_id] &&
        !candidate.reasons.some((r) =>
          [
            "type_or_historical_entity",
            "not_Japan",
            "seed_region_mismatch",
            "JNTO_prefecture_mismatch",
          ].includes(r),
        ) &&
        (candidate.exact || !!choice),
      entity_status: row.entity_status,
      unresolved_reasons: unique(reasons),
      selection_rule: choice
        ? "explicit_reviewed_binding"
        : cities.length === 1
          ? "unique_current_municipality"
          : "unique_exact_geographic_candidate",
      review_note: choice?.note ?? null,
      manual_hold: review.hold[base.destination_id] ?? null,
      primary_prefecture: primary || null,
      secondary_prefectures: prefCodes.filter((p) => p !== primary),
      prefecture_paths: candidate?.prefectures ?? [],
      source_priority: officialUrl
        ? "JNTO_directory_then_pinned_Wikidata_fields"
        : e
          ? "pinned_Wikidata_open_knowledge"
          : "search_only_unresolved",
      official_directory_matches: officialMatch,
      names: {
        ja: { value: ja, source_property: "labels.ja" },
        zh_cn: {
          value: zh,
          source_property: "labels." + zhSource,
          normalization:
            "explicit traditional-to-simplified character normalization; not machine translation",
        },
        en: { value: en, source_property: "labels.en" },
      },
      coordinate: coord
        ? {
            latitude: coord.latitude,
            longitude: coord.longitude,
            precision_degrees: coord.precision,
            globe: coord.globe,
            property: "P625",
            interpretation:
              "source representative point, rounded to at most 4 decimals, not a centroid computation or a POI boundary",
          }
        : null,
      coordinate_candidates: coords,
      entity_classes: candidate?.classes ?? [],
      search: {
        query: snapshot.searches[row.destination_id]?.query,
        supplemental_query:
          snapshot.searches[row.destination_id]?.supplemental_query ?? null,
        url:
          "https://www.wikidata.org/w/api.php?" +
          new URLSearchParams({
            action: "wbsearchentities",
            search: seed.destination_name_en,
            language: "en",
            format: "json",
          }),
      },
      candidates: candidates.map((c) => ({
        entity_id: c.id,
        name: c.name,
        type: c.type,
        prefectures: c.prefectures.map((p) => p.code),
        rejection_or_review_reasons:
          c.id === e?.id
            ? []
            : c.reasons.length
              ? c.reasons
              : ["different entity or scope; not selected"],
      })),
    });
    return row;
  });
  const byEntity = new Map(
    rows
      .filter((r) => r.provider_entity_id)
      .map((r) => [r.provider_entity_id, r]),
  );
  for (const row of rows) {
    if (review.hold[row.destination_id]) continue;
    const e = snapshot.entities[row.provider_entity_id];
    const queue = values(e, "P131").map((v) => v.id),
      seen = new Set();
    while (queue.length) {
      const id = queue.shift();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      if (byEntity.has(id) && byEntity.get(id) !== row) {
        row.parent_destination_id = byEntity.get(id).destination_id;
        break;
      }
      if (prefs.has(id) || values(snapshot.entities[id], "P576").length)
        continue;
      queue.push(...values(snapshot.entities[id], "P131").map((v) => v.id));
    }
  }
  return { rows, evidence, data };
}

export function distanceKm(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const x =
    Math.sin(rad(+a.latitude - +b.latitude) / 2) ** 2 +
    Math.cos(rad(+a.latitude)) *
      Math.cos(rad(+b.latitude)) *
      Math.sin(rad(+a.longitude - +b.longitude) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(Math.max(0, 1 - x)));
}

export function auditOverlaps(rows) {
  const pairs = [];
  for (let i = 0; i < rows.length; i++)
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i],
        b = rows[j],
        reasons = [];
      if (a.provider_entity_id && a.provider_entity_id === b.provider_entity_id)
        reasons.push("same_entity_id");
      if (
        a.canonical_name &&
        a.canonical_name === b.canonical_name &&
        a.prefecture_code === b.prefecture_code
      )
        reasons.push("same_canonical_and_prefecture");
      const aliases = new Set(
        a.aliases.split("; ").filter(Boolean).map(normalizeName),
      );
      if (b.aliases.split("; ").some((x) => x && aliases.has(normalizeName(x))))
        reasons.push("shared_alias");
      const km = a.latitude && b.latitude ? distanceKm(a, b) : null;
      if (km !== null && km <= 5) reasons.push("centers_within_5km");
      if (
        a.parent_destination_id === b.destination_id ||
        b.parent_destination_id === a.destination_id
      )
        reasons.push("parent_child");
      if (!reasons.length) continue;
      const conflict =
        reasons.includes("same_entity_id") ||
        reasons.includes("same_canonical_and_prefecture");
      const nested = reasons.includes("parent_child");
      const separateMunicipalities =
        municipal.has(a.entity_type) &&
        municipal.has(b.entity_type) &&
        a.provider_entity_id !== b.provider_entity_id;
      const disjointPrefectures =
        a.prefecture_code &&
        b.prefecture_code &&
        a.prefecture_code !== b.prefecture_code &&
        municipal.has(a.entity_type) &&
        municipal.has(b.entity_type);
      const reviewed =
        !conflict && (nested || separateMunicipalities || disjointPrefectures);
      pairs.push({
        a: a.destination_id,
        b: b.destination_id,
        reasons,
        distance_km: km === null ? null : +km.toFixed(2),
        status: reviewed
          ? "reviewed_distinct_or_nested"
          : "unresolved_overlap_review",
        poi_rule: nested
          ? "Assign a future POI to the most specific verified child first; parent may reference that same stable POI ID but must not generate a duplicate entity."
          : reviewed
            ? "Separate current administrative boundaries: same alias/proximity does not merge identities; require municipality evidence for every future POI."
            : "Do not resolve overlapping-area POIs until exact footprints and a primary ownership rule are independently reviewed.",
      });
    }
  return pairs;
}

export function createResolution(baseline, data = inputs()) {
  const result = resolveRows(baseline, data),
    overlaps = auditOverlaps(result.rows);
  for (const pair of overlaps.filter(
    (p) => p.status === "unresolved_overlap_review",
  ))
    for (const id of [pair.a, pair.b]) {
      const row = result.rows.find((r) => r.destination_id === id),
        e = result.evidence.find((e) => e.destination_id === id);
      row.entity_status = "unresolved";
      row.status = "entity_resolution_required";
      e.entity_status = "unresolved";
      e.unresolved_reasons = unique([
        ...e.unresolved_reasons,
        "overlap_boundary_review",
      ]);
      if (!row.review_notes.includes("overlap_boundary_review"))
        row.review_notes += " overlap_boundary_review";
    }
  const contract = result.rows.map((r) => ({
    destination_id: r.destination_id,
    scope_type: r.entity_type,
    parent_entity_ids: r.parent_destination_id ? [r.parent_destination_id] : [],
    prefecture_ids: unique(
      [
        r.prefecture_code,
        ...result.evidence.find((e) => e.destination_id === r.destination_id)
          .secondary_prefectures,
      ].filter(Boolean),
    ),
    cross_prefecture:
      result.evidence.find((e) => e.destination_id === r.destination_id)
        .secondary_prefectures.length > 0,
    coverage_note: r.coverage_scope || null,
    boundary_source: null,
    boundary_status: "official_scope_review_required",
    center_rule:
      result.evidence.find((e) => e.destination_id === r.destination_id)
        .coordinate?.interpretation ?? null,
    poi_inclusion_rule:
      "Require reviewed source-backed containment in the named entity; generic scope prose is not final evidence.",
    poi_exclusion_rule:
      "Exclude unproven containment and other islands/municipalities outside the reviewed scope; do not infer boundaries from center radius.",
    coverage_scope: r.coverage_scope || null,
    prefecture_code: r.prefecture_code || null,
    secondary_prefectures: result.evidence.find(
      (e) => e.destination_id === r.destination_id,
    ).secondary_prefectures,
    center: r.latitude
      ? {
          latitude: +r.latitude,
          longitude: +r.longitude,
          source_url: r.coordinate_source_url,
        }
      : null,
    parent_destination_id: r.parent_destination_id || null,
    entity_status: r.entity_status,
    allowed_poi_boundary_policy:
      r.entity_status === "verified"
        ? "Require source-backed containment in the named entity footprint. Radius around center is NOT a boundary. Prefer verified child ownership; references reuse a single POI ID. Cross-prefecture coverage is limited to the listed source-backed footprint. No scope redefinition by a batch."
        : "BLOCKED: destination identity, language, coordinate or boundary evidence is incomplete. Do not resolve POI slots or execute jobs for this destination.",
  }));
  const summary = {
    status: result.rows.every((r) => r.entity_status === "verified")
      ? "Completed"
      : "Partial",
    destination_rows: result.rows.length,
    verified_entity_identity: result.evidence.filter((e) => e.identity_verified)
      .length,
    verified_destinations: result.rows.filter(
      (r) => r.entity_status === "verified",
    ).length,
    unresolved_destinations: result.rows.filter(
      (r) => r.entity_status !== "verified",
    ).length,
    verified_prefecture: result.evidence.filter(
      (e) => e.identity_verified && e.primary_prefecture,
    ).length,
    unresolved_prefecture: result.evidence.filter(
      (e) => !e.identity_verified || !e.primary_prefecture,
    ).length,
    prefectures_covered: unique(
      result.evidence
        .filter((e) => e.identity_verified)
        .flatMap((e) => [e.primary_prefecture, ...e.secondary_prefectures])
        .filter(Boolean),
    ).length,
    three_language_names: result.evidence.filter(
      (e) =>
        e.identity_verified &&
        e.names.ja.value &&
        e.names.zh_cn.value &&
        e.names.en.value &&
        !e.manual_hold,
    ).length,
    valid_source_coordinates: result.evidence.filter(
      (e) =>
        e.identity_verified &&
        e.coordinate &&
        !e.unresolved_reasons.includes(
          "conflicting_representative_coordinates",
        ) &&
        !e.unresolved_reasons.includes("unknown_coordinate_precision"),
    ).length,
    coverage_scope: result.rows.filter((r) => r.coverage_scope).length,
    verified_coverage_scope: result.rows.filter(
      (r) => r.coverage_scope && r.entity_status === "verified",
    ).length,
    source_evidence_records: result.evidence.length,
    pinned_entity_evidence: result.evidence.filter((e) => e.source_url).length,
    unresolved_duplicate_or_overlap_pairs: overlaps.filter(
      (p) => p.status !== "reviewed_distinct_or_nested",
    ).length,
    duplicate_audit_complete: result.rows.every(
      (r) => r.entity_status === "verified",
    ),
    entity_types: countBy(result.rows.map((r) => r.entity_type)),
    evidence_distribution: countBy(
      result.evidence.map((e) => e.source_priority),
    ),
    poi_slots_unchanged: 9000,
    images_generated: 0,
    images_downloaded: 0,
  };
  return { ...result, overlaps, contract, summary };
}

export async function artifacts(baseline) {
  const r = createResolution(baseline),
    out = new Map();
  out.set(MANIFEST, csv(r.rows, Object.keys(r.rows[0])));
  out.set(EVIDENCE, r.evidence.map((e) => JSON.stringify(e)).join("\n") + "\n");
  const aliases = r.rows.flatMap((row) =>
    row.aliases
      .split("; ")
      .filter(Boolean)
      .map((alias) => ({
        destination_id: row.destination_id,
        alias,
        canonical_name: row.canonical_name,
        provider_entity_id: row.provider_entity_id,
        source_url:
          r.evidence.find((e) => e.destination_id === row.destination_id)
            .source_url ?? "",
        status: row.entity_status,
      })),
  );
  out.set(
    CATALOG + "japan-destination-aliases.v1.csv",
    csv(aliases, Object.keys(aliases[0])),
  );
  out.set(
    CONTRACT,
    JSON.stringify(
      {
        schemaVersion: 1,
        version: "1.0.0",
        country_code: "JP",
        destinations: r.contract,
      },
      null,
      2,
    ) + "\n",
  );
  out.set(
    GEN + "japan-destination-resolution-summary.json",
    JSON.stringify(r.summary, null, 2) + "\n",
  );
  out.set(
    GEN + "japan-destination-input-provenance.json",
    JSON.stringify(
      {
        base_commit: "553b01480345a4e26bd2b7952cf917b2cbbaea4f",
        metadata_license: "CC0; no image rights",
        source_access:
          "Public Wikidata Action API, serial requests, descriptive User-Agent, maxlag=5; 429 halted and checkpointed before slower resumption. No image requests.",
        input_sha256: inputHashes(),
        poi_slots_sha256: sha256(
          read(CATALOG + "core-attraction-generation-manifest.v1.csv"),
        ),
      },
      null,
      2,
    ) + "\n",
  );
  const md = (name, title, body) =>
    out.set(GEN + name, "# " + title + "\n\n" + body + "\n");
  md(
    "japan-destination-resolution-summary.md",
    "Japan destination resolution",
    table(
      ["Metric", "Value"],
      Object.entries(r.summary).map(([k, v]) => [
        k,
        typeof v === "object" ? JSON.stringify(v) : v,
      ]),
    ) +
      "\n\nPartial is an evidence gate, not permission to start POI or image tasks. Parent TASK-013.2 reports remain the historical planning baseline; this report and boundary contract are the current entity audit.\n\n" +
      table(
        ["Destination", "Status", "Remaining evidence / review"],
        r.rows
          .filter((x) => x.entity_status !== "verified")
          .map((x) => [x.destination_id, x.entity_status, x.review_notes]),
      ),
  );
  md(
    "japan-destination-overlap-review.md",
    "Alias, duplicate and overlap review",
    "Checks cover stable entity IDs, canonical + prefecture, aliases, 5 km center proximity and P131 parent/child chains. Center distance does not prove polygon overlap. Unresolved geographic overlaps block both affected destinations; no silent auto-deduplication.\n\n" +
      table(
        ["A", "B", "Signals", "km", "Status", "POI ownership rule"],
        r.overlaps.map((p) => [
          p.a,
          p.b,
          p.reasons.join(", "),
          p.distance_km ?? "",
          p.status,
          p.poi_rule,
        ]),
      ),
  );
  md(
    "japan-destination-source-evidence.md",
    "Source evidence audit",
    "Priority: existing JNTO official directory evidence first; pinned Wikidata CC0 statements for identity, multilingual labels, P131 and P625 when no richer approved official entity source is available. A Wikidata P856 claim is not represented as a visited official URL. No Provider credentials, image licensing or paid APIs. Search candidates are evidence of an unresolved review, not a verified identity. Every Wikidata source links to its exact revision.\n\n" +
      table(
        [
          "Destination",
          "Identity verified",
          "Source",
          "Primary / secondary",
          "Open issues",
        ],
        r.evidence.map((e) => [
          e.destination_id,
          e.identity_verified,
          e.source_url ?? e.search.url,
          [e.primary_prefecture, ...e.secondary_prefectures]
            .filter(Boolean)
            .join(", "),
          e.unresolved_reasons.join(", "),
        ]),
      ),
  );
  const verifiedEvidence = r.evidence.filter((e) => e.identity_verified);
  md(
    "japan-destination-prefecture-audit.md",
    "47 prefecture audit",
    "Codes retain the parent JNTO slug convention, not invented ISO codes. Preferred current P131 claims take precedence; macro-regions and historical provinces are not traversed into every prefecture. Unverified identity candidates are excluded from verified coverage. Cross-prefecture scopes require explicit primary/secondary evidence, not a union guessed from a tourism label.\n\n" +
      table(
        ["Code", "English", "Primary", "Secondary", "Official source"],
        r.data.official.prefectures.map((p) => [
          p.code,
          p.name_en,
          verifiedEvidence.filter((e) => e.primary_prefecture === p.code)
            .length,
          verifiedEvidence.filter((e) =>
            e.secondary_prefectures.includes(p.code),
          ).length,
          p.official_url,
        ]),
      ) +
      "\n\n" +
      table(
        [
          "Destination",
          "Primary",
          "Secondary",
          "P131 evidence paths",
          "Verified identity",
        ],
        r.evidence.map((e) => [
          e.destination_id,
          e.primary_prefecture ?? "",
          e.secondary_prefectures.join(", "),
          e.prefecture_paths.map((p) => p.path.join(" → ")).join("; "),
          e.identity_verified,
        ]),
      ),
  );
  md(
    "japan-destination-coordinate-audit.md",
    "Representative coordinate audit",
    "All populated coordinates are source P625 points, WGS84/Earth, Japan coarse bounds 20..46 / 122..154. Output precision is capped at 4 decimals and never exceeds source precision. These are representative points, not computed geometric centroids, polygons, facility substitutions or evidence of POI containment. Missing/conflicting coordinates remain unresolved.\n\n" +
      table(
        [
          "Destination",
          "Latitude",
          "Longitude",
          "Source precision degrees",
          "Scope",
          "Pinned source",
          "Status",
        ],
        r.rows.map((row) => {
          const e = r.evidence.find(
            (e) => e.destination_id === row.destination_id,
          );
          return [
            row.destination_id,
            row.latitude,
            row.longitude,
            e.coordinate?.precision_degrees ?? "",
            row.coverage_scope,
            row.coordinate_source_url,
            row.entity_status,
          ];
        }),
      ),
  );
  for (const [path, text] of out)
    if (path.endsWith(".json") || path.endsWith(".md"))
      out.set(path, await format(text, { filepath: path }));
  return { output: out, result: r };
}

export function validateResolution(r) {
  assert.equal(r.rows.length, 300);
  assert.equal(new Set(r.rows.map((x) => x.destination_id)).size, 300);
  assert.equal(r.evidence.length, 300);
  assert.equal(r.contract.length, 300);
  const validPrefs = new Set(r.data.official.prefectures.map((p) => p.code));
  assert.equal(validPrefs.size, 47);
  assert.equal(
    prefectureMap(r.data.snapshot.entities, r.data.official).size,
    47,
    "Exactly 47 current prefecture entities; no historical prefectures or Kyoto city suffix match",
  );
  for (const row of r.rows) {
    assert.match(row.destination_id, /^jp-/);
    assert.equal(row.country_code, "JP");
    assert(TYPES.includes(row.entity_type));
    assert(!row.prefecture_code || validPrefs.has(row.prefecture_code));
    assert.equal(row.rights_status, "unresolved");
    const e = r.evidence.find((e) => e.destination_id === row.destination_id),
      c = r.contract.find((c) => c.destination_id === row.destination_id);
    assert(e && c);
    assert.equal(c.entity_status, row.entity_status);
    if (row.provider_entity_id) {
      assert.match(row.provider_entity_id, /^Q\d+$/);
      assert.equal(row.provider_type, "wikidata");
      assert(r.data.snapshot.entities[row.provider_entity_id]);
      const entity = r.data.snapshot.entities[row.provider_entity_id];
      assert.equal(
        row.entity_type,
        entityType(entity, r.data.snapshot.entities),
      );
      assert.equal(e.source_url, sourceURL(entity) || null);
      if (e.source_url) {
        assert(Number.isSafeInteger(entity.revision) && entity.revision > 0);
        assert.equal(e.entity_revision, entity.revision);
        assert.match(e.source_url, /[?&]oldid=[1-9][0-9]*$/);
      }
      assert.equal(row.prefecture_code, e.primary_prefecture ?? "");
      assert.equal(
        row.coverage_scope,
        scopeFor(row.entity_type, row.name_en, row.provider_entity_id),
      );
    }
    if (row.latitude) {
      assert(
        +row.latitude >= 20 &&
          +row.latitude <= 46 &&
          +row.longitude >= 122 &&
          +row.longitude <= 154,
      );
      assert(e.coordinate);
      assert(row.coordinate_source_url.includes("oldid="));
      const precision = e.coordinate.precision_degrees;
      assert(Number.isFinite(precision) && precision > 0);
      const digits = Math.max(
        0,
        Math.min(4, Math.floor(-Math.log10(precision))),
      );
      assert.equal(row.latitude, e.coordinate.latitude.toFixed(digits));
      assert.equal(row.longitude, e.coordinate.longitude.toFixed(digits));
      assert(
        values(r.data.snapshot.entities[row.provider_entity_id], "P625").some(
          (v) =>
            v.latitude === e.coordinate.latitude &&
            v.longitude === e.coordinate.longitude &&
            v.precision === precision,
        ),
      );
    }
    if (row.parent_destination_id)
      assert(
        r.rows.some(
          (x) => x.destination_id === row.parent_destination_id && x !== row,
        ),
      );
    if (row.entity_status === "verified") {
      assert.equal(e.unresolved_reasons.length, 0);
      assert(e.identity_verified);
      assert(e.source_url);
      assert(
        row.latitude &&
          row.longitude &&
          row.coverage_scope &&
          row.prefecture_code,
      );
      assert(/[\u3040-\u30ff\u3400-\u9fff]/.test(row.name_ja));
      assert(/[\u3400-\u9fff]/.test(row.name_zh));
      assert(row.name_en);
      assert.notEqual(row.entity_type, "other_review_required");
      assert.equal(row.name_ja, e.names.ja.value);
      assert.equal(row.name_zh, e.names.zh_cn.value);
      assert.equal(row.name_en, e.names.en.value);
      assert.equal(row.coordinate_source_url, e.source_url);
      assert.equal(row.provider_entity_id, e.entity_id);
      assert(!c.allowed_poi_boundary_policy.startsWith("BLOCKED"));
    } else {
      assert(e.unresolved_reasons.length);
      assert(c.allowed_poi_boundary_policy.startsWith("BLOCKED"));
    }
  }
  const pois = parseCsv(
    read(CATALOG + "core-attraction-generation-manifest.v1.csv"),
  );
  assert.equal(pois.length, 9000);
  assert.equal(
    sha256(read(CATALOG + "core-attraction-generation-manifest.v1.csv")),
    "908f15006b21755f7a933f21bb8e4c16333e5edbe9b2f659c89a605cabd56929",
    "9000 POI slots must remain byte-identical to the merged prerequisite",
  );
  const ids = new Set(r.rows.map((x) => x.destination_id));
  for (const p of pois) assert(ids.has(p.destination_id));
  return r.summary;
}

export async function publishResolution(baseline, { check = false } = {}) {
  const { output, result } = await artifacts(baseline);
  validateResolution(result);
  let changed = 0;
  for (const [path, text] of output) {
    if (check)
      assert.equal(read(path), text, "Non-canonical artifact: " + path);
    else {
      let old;
      try {
        old = read(path);
      } catch {
        old = null;
      }
      if (old !== text) changed++;
      write(path, text);
    }
  }
  console.log(
    JSON.stringify(
      { mode: check ? "validate" : "resolve", changed, ...result.summary },
      null,
      2,
    ),
  );
  return { output, result };
}

export const inputHashes = () =>
  Object.fromEntries(
    [
      REVIEW,
      SNAPSHOT,
      CATALOG + "core-destination-generation-seed.v1.csv",
      CATALOG + "core-destination-evidence.v1.json",
    ].map((p) => [p, sha256(read(p))]),
  );
