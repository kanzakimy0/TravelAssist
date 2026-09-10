import test from "node:test";
import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import {
  ROOT,
  read,
  json,
  CATALOG,
  parseCsv,
  sha256,
} from "../tools/assets/asset-utils.mjs";
import {
  buildData,
  artifacts as parentArtifacts,
} from "../tools/assets/core-generation-common.mjs";
import {
  createResolution,
  validateResolution,
  artifacts,
  publishResolution,
  TYPES,
  MANIFEST,
  EVIDENCE,
  CONTRACT,
  toSimplified,
  auditOverlaps,
  inputs,
} from "../tools/assets/japan-destination-resolution.mjs";
import {
  values,
  prefectureMap,
  entityType,
} from "../tools/assets/japan-entity-candidates.mjs";
const baseline = buildData(),
  data = inputs(),
  result = createResolution(baseline.destinations, data);

test("300 frozen Japan destinations, 47 current prefectures, honest Partial gates", () => {
  validateResolution(result);
  assert.equal(result.summary.destination_rows, 300);
  assert.equal(result.summary.prefectures_covered, 47);
  assert.equal(
    result.summary.verified_destinations +
      result.summary.unresolved_destinations,
    300,
  );
  assert.equal(
    result.summary.status,
    result.summary.unresolved_destinations ? "Partial" : "Completed",
  );
  assert.deepEqual(
    result.rows.map((r) => r.destination_id),
    baseline.destinations.map((r) => r.destination_id),
  );
  assert(new Set(result.rows.map((r) => r.entity_type)).size > 5);
  assert(result.rows.every((r) => TYPES.includes(r.entity_type)));
});
test("current prefecture registry excludes former Hokkaido, Tokyo-fu and Kyoto placename", () => {
  const map = prefectureMap(data.snapshot.entities, data.official);
  assert.equal(map.size, 47);
  for (const id of ["Q11287110", "Q1189121", "Q740246"]) assert(!map.has(id));
  assert.equal(map.get("Q120730"), "kyoto");
  assert.equal(map.get("Q1490"), "tokyo");
});
test("Hakone stays town despite international tourism city designation", () =>
  assert.equal(
    result.rows.find((r) => r.destination_id === "jp-hakone").entity_type,
    "town",
  ));
test("Tokyo is metropolitan region, islands and hot springs are not municipal cities", () => {
  for (const [id, type] of [
    ["jp-tokyo", "region"],
    ["jp-ishigaki", "island"],
    ["jp-yakushima", "island"],
    ["jp-yufuin", "hot_spring_area"],
    ["jp-niseko", "resort_area"],
  ])
    assert.equal(
      result.rows.find((r) => r.destination_id === id).entity_type,
      type,
    );
  assert.equal(
    result.rows.find((r) => r.destination_id === "jp-dazaifu")
      .provider_entity_id,
    "Q728218",
  );
});
test("dissolved municipality and government agency cannot become current city", () => {
  for (const id of ["Q4701253", "Q144845", "Q11561412"])
    assert.equal(
      entityType(data.snapshot.entities[id], data.snapshot.entities),
      "other_review_required",
    );
});
test("preferred statements win and ended/deprecated statements are excluded", () => {
  const claim = (rank, id, ended = false) => ({
    rank,
    mainsnak: { datavalue: { value: { id } } },
    ...(ended ? { qualifiers: { P582: [{}] } } : {}),
  });
  const e = {
    claims: {
      P131: [
        claim("normal", "old"),
        claim("preferred", "current"),
        claim("preferred", "ended", true),
        claim("deprecated", "wrong"),
      ],
    },
  };
  assert.deepEqual(values(e, "P131"), [{ id: "current" }]);
});
test("cross-prefecture route keeps Toyama and Nagano; macro-region does not spread Nyuto across Tohoku", () => {
  const alpine = result.evidence.find(
    (e) => e.destination_id === "jp-tateyama-kurobe",
  );
  assert.deepEqual(
    [alpine.primary_prefecture, ...alpine.secondary_prefectures].sort(),
    ["nagano", "toyama"],
  );
  const nyuto = result.evidence.find(
    (e) => e.destination_id === "jp-nyuto-onsen",
  );
  assert.equal(nyuto.primary_prefecture, "akita");
  assert.deepEqual(nyuto.secondary_prefectures, []);
});
test("missing precision and competing P625 points remain blank, not fabricated rounded centers", () => {
  for (const id of ["jp-miyajima", "jp-beppu"]) {
    const row = result.rows.find((r) => r.destination_id === id);
    assert.equal(row.latitude, "");
    assert.equal(row.longitude, "");
    assert.equal(row.entity_status, "unresolved");
  }
});
test("missing names, resort coordinate and ambiguous boundary block downstream POIs", () => {
  for (const id of [
    "jp-niseko",
    "jp-akiu",
    "jp-gujo-hachiman",
    "jp-taketomi",
  ]) {
    const contract = result.contract.find((r) => r.destination_id === id);
    assert.equal(contract.entity_status, "unresolved");
    assert.match(contract.allowed_poi_boundary_policy, /^BLOCKED/);
  }
  assert.equal(toSimplified("銀山溫泉"), "银山温泉");
  assert.equal(toSimplified("Karuizawa"), "Karuizawa");
});
test("every row has evidence or explicit unresolved search/rejection evidence", () => {
  assert.equal(result.evidence.length, 300);
  for (const e of result.evidence) {
    assert(e.search.url.startsWith("https://www.wikidata.org/"));
    if (e.entity_status === "verified") {
      assert(e.source_url.includes("oldid="));
      assert(e.identity_verified);
      assert.equal(e.unresolved_reasons.length, 0);
    } else assert(e.unresolved_reasons.length);
  }
});
for (const [name, change] of [
  ["foreign country", (r) => (r.rows[0].country_code = "US")],
  ["foreign ID", (r) => (r.rows[0].destination_id = "us-tokyo")],
  ["fake provider", (r) => (r.rows[0].provider_entity_id = "Q999999999999")],
  [
    "invalid prefecture",
    (r) => (r.rows[0].prefecture_code = "fake-prefecture"),
  ],
  ["fake valid-range coordinate", (r) => (r.rows[0].latitude = "35.0000")],
  ["out-of-Japan coordinate", (r) => (r.rows[0].latitude = "0")],
  ["English copied as Chinese", (r) => (r.rows[0].name_zh = "Tokyo")],
  ["unsupported all-city type", (r) => (r.rows[0].entity_type = "city")],
  [
    "rights accidentally unlocked",
    (r) => (r.rows[0].rights_status = "approved"),
  ],
  [
    "promote unresolved without evidence",
    (r) => {
      const x = r.rows.find((x) => x.entity_status === "unresolved");
      x.entity_status = "verified";
    },
  ],
])
  test("reject " + name, () => {
    const r = structuredClone(result);
    change(r);
    assert.throws(() => validateResolution(r));
  });
test("9000 POI slots, source jobs and variants remain byte-identical to parent generation", async () => {
  assert.equal(
    sha256(read(CATALOG + "core-attraction-generation-manifest.v1.csv")),
    "908f15006b21755f7a933f21bb8e4c16333e5edbe9b2f659c89a605cabd56929",
  );
  const parent = await parentArtifacts();
  for (const path of [
    CATALOG + "core-attraction-generation-manifest.v1.csv",
    CATALOG + "core-source-jobs.v1.jsonl",
    CATALOG + "core-variant-output-matrix.v1.csv",
  ])
    assert.equal(
      read(path),
      parent.output ? parent.output.get(path) : parent.get(path),
    );
  assert.equal(baseline.jobs.length, 9300);
  assert.equal(baseline.variants.length, 9600);
  assert.equal(baseline.batches.length, 40);
});
test("parent regeneration preserves the child destination overlay", async () => {
  const parent = await parentArtifacts(),
    child = await artifacts(baseline.destinations);
  assert.equal(
    (parent.output ?? parent).get(MANIFEST),
    child.output.get(MANIFEST),
  );
});
test("duplicate IDs and nearby non-administrative areas require overlap review", () => {
  const a = result.rows.find((r) => r.entity_status === "verified");
  const b = { ...a, destination_id: "jp-test-copy" };
  assert(
    auditOverlaps([a, b]).some((p) => p.status === "unresolved_overlap_review"),
  );
  const c = {
    ...a,
    destination_id: "jp-test-area",
    provider_entity_id: "Q999",
    canonical_name: "別地域",
    aliases: "別地域",
    entity_type: "region",
  };
  assert(
    auditOverlaps([a, c]).some((p) => p.status === "unresolved_overlap_review"),
  );
});
test("parent/child ownership does not create duplicate POI entities", () => {
  const pair = result.overlaps.find(
    (p) => p.a === "jp-nikko" && p.b === "jp-kinugawa-onsen",
  );
  assert(pair);
  assert.match(pair.poi_rule, /same stable POI ID/);
});
test("persisted outputs and boundary contract match the source-backed canonical build", async () => {
  const { output } = await artifacts(baseline.destinations);
  for (const [path, text] of output) assert.equal(read(path), text, path);
  assert.equal(parseCsv(read(MANIFEST)).length, 300);
  assert.equal(read(EVIDENCE).trim().split("\n").length, 300);
  assert.equal(json(CONTRACT).destinations.length, 300);
});
test("resolver repeat is deterministic no-op including file modification times", async () => {
  const { output } = await artifacts(baseline.destinations);
  const before = [...output].map(([path]) => [
    path,
    sha256(read(path)),
    statSync(resolve(ROOT, path)).mtimeMs,
  ]);
  await publishResolution(baseline.destinations);
  await publishResolution(baseline.destinations, { check: true });
  assert.deepEqual(
    [...output].map(([path]) => [
      path,
      sha256(read(path)),
      statSync(resolve(ROOT, path)).mtimeMs,
    ]),
    before,
  );
});
