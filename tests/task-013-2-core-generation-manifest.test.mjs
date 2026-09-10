import test from "node:test";
import assert from "node:assert/strict";
import {
  read,
  sha256,
  CATALOG,
  csv,
  parseCsv,
} from "../tools/assets/asset-utils.mjs";
import {
  assertInputs,
  assertMode,
  buildData,
  auditData,
  artifacts,
  validateFiles,
  SEED,
  BATCH_SEED,
  QUOTAS,
} from "../tools/assets/core-generation-common.mjs";

const data = buildData();
const seed = read(SEED),
  batches = read(BATCH_SEED);
test("frozen Japan-only seed and batches meet every total and ordering gate", () => {
  const input = assertInputs();
  assert.equal(input.seed.length, 300);
  assert.equal(input.batches.length, 40);
  assert.equal(data.destinations.filter((x) => x.tier === "S").length, 100);
  assert.equal(data.destinations.filter((x) => x.tier === "A").length, 200);
  assert.equal(data.attractions.length, 9000);
  assert.equal(data.jobs.length, 9300);
  assert.equal(data.variants.length, 9600);
});
for (const [name, from, to] of [
  ["foreign country", ",JP,", ",KR,"],
  ["foreign ID", "jp-tokyo", "kr-seoul"],
  ["foreign disguised as JP", "Tokyo", "Seoul"],
  ["foreign batch", "JP-S-01", "S-EU-01"],
  ["foreign region", ",kanto,", ",europe,"],
  ["quota mutation", ",40", ",39"],
  ["duplicate entity", "jp-kyoto", "jp-tokyo"],
])
  test(`reject ${name}`, () =>
    assert.throws(() => assertInputs(seed.replace(from, to), batches)));
test("reject changed batch capacity or sequence", () =>
  assert.throws(() => assertInputs(seed, batches.replace("420", "421"))));
test("all 47 prefectures covered by evidence; unsupported assignments stay blank", () => {
  assert.equal(
    new Set(data.destinations.map((x) => x.prefecture_code).filter(Boolean))
      .size,
    47,
  );
  assert.equal(data.destinations.filter((x) => x.prefecture_code).length, 124);
  for (const d of data.destinations.filter((x) => x.prefecture_code))
    assert.ok(d.official_url.includes("/" + d.prefecture_code + "/"));
  const bad = structuredClone(data);
  bad.destinations
    .filter((d) => d.prefecture_code === "chiba")
    .forEach((d) => (d.prefecture_code = ""));
  assert.throws(() => auditData(bad), /47 Japan prefectures/);
});
test("unverified names are blank, existing translations are reused without English copying", () => {
  assert.equal(
    data.destinations.find((d) => d.destination_id === "jp-tokyo").name_ja,
    "東京",
  );
  assert.equal(
    data.destinations.find((d) => d.destination_id === "jp-tokyo").name_zh,
    "东京",
  );
  for (const d of data.destinations) {
    assert.notEqual(d.name_ja, d.name_en);
    assert.notEqual(d.name_zh, d.name_en);
    assert.equal(d.latitude, "");
    assert.equal(d.longitude, "");
  }
});
test("category quota and unresolved slot identity are exact per destination", () => {
  for (const d of data.destinations)
    for (const [cat, n] of Object.entries(QUOTAS[d.tier]))
      assert.equal(
        data.attractions.filter(
          (p) => p.destination_id === d.destination_id && p.category === cat,
        ).length,
        n,
      );
  for (const p of data.attractions) {
    assert.equal(
      p.poi_id,
      `unresolved:${p.destination_id}:${p.selection_order}`,
    );
    assert.equal(p.source_mode, "acquisition_required");
    assert.equal(p.provider_entity_id, "");
    assert.equal(p.name_en, "");
  }
});
test("fabricated POIs cannot pass validation", () => {
  const bad = structuredClone(data);
  bad.attractions[0].name_en = "Imaginary temple";
  assert.throws(() => auditData(bad), /Unverified POI/);
});
test("city illustrative provenance is not documentary authenticity", () => {
  const bad = structuredClone(data);
  bad.destinations[0].authenticity = "documentary";
  assert.throws(() => auditData(bad));
});
test("rights and execution cannot silently be approved", () => {
  const bad = structuredClone(data);
  bad.jobs[0].rights.commercialUseAllowed = true;
  assert.throws(() => auditData(bad));
});
test("all job/variant links and parent sizes are consistent", () => {
  const result = auditData(data);
  assert.equal(result.status, "Partial");
  assert.deepEqual(
    data.profiles.map((p) => [p.id, p.width, p.height, p.withoutEnlargement]),
    [
      ["sm", 480, 480, true],
      ["md", 960, 960, true],
      ["lg", 1600, 1600, true],
    ],
  );
  assert.equal(
    data.jobs.filter((x) => x.role === "destination_master").length,
    300,
  );
  assert.equal(data.jobs.filter((x) => x.role === "poi_photo").length, 9000);
  const bad = structuredClone(data);
  bad.jobs[0].expected_variant_ids = ["wrong"];
  assert.throws(() => auditData(bad));
});
test("execution modes never execute or acquire images", () => {
  assert.equal(assertMode({}), "manifest");
  assert.equal(
    assertMode({ RUN_MODE: "batch-prepare", BATCH_ID: "JP-S-01" }),
    "batch-prepare",
  );
  for (const env of [
    { RUN_MODE: "batch-execute" },
    { RUN_MODE: "batch-prepare" },
    { RUN_MODE: "batch-prepare", BATCH_ID: "GLOBAL-01" },
    { RUN_MODE: "batch-prepare", BATCH_ID: "JP-A-31" },
  ])
    assert.throws(() => assertMode(env));
});
test("CSV round-trip preserves quoted multilingual text and empty vs zero", () => {
  const rows = [{ name: '東京, "湾岸"', number: 0, unknown: "" }];
  assert.deepEqual(parseCsv(csv(rows, ["name", "number", "unknown"])), [
    { name: '東京, "湾岸"', number: "0", unknown: "" },
  ]);
});
test("all 55 outputs are deterministic across two independent builds", async () => {
  const first = await artifacts(),
    second = await artifacts();
  assert.equal(first.output.size, 55);
  assert.deepEqual(
    [...first.output].map(([p, s]) => [p, sha256(s)]),
    [...second.output].map(([p, s]) => [p, sha256(s)]),
  );
});
test("generated artifact corruption fails without changing fixtures", async () => {
  await assert.rejects(
    validateFiles((path) =>
      path.endsWith("core-source-jobs.v1.jsonl")
        ? read(path).replace('"blocked"', '"approved"')
        : read(path),
    ),
    /Stale\/corrupted/,
  );
});
test("stale overseas batch file fails", async () => {
  await assert.rejects(
    validateFiles(read, ["S-EU-01.json"]),
    /Exactly forty batch/,
  );
});
test("all forty batch files refer to their own jobs and variants", async () => {
  const { output } = await artifacts();
  for (const [path, text] of output)
    if (path.includes("/core-batches/")) {
      const b = JSON.parse(text);
      assert.equal(b.country_code, "JP");
      assert.equal(b.execution_allowed, false);
      assert.ok(b.expected.destinations <= 10);
      assert.ok(b.expected.variants <= 420);
      assert.equal(b.source_job_ids.length, b.expected.source_jobs);
      assert.equal(b.variant_ids.length, b.expected.variants);
      for (const id of b.source_job_ids)
        assert.equal(
          data.jobs.find((j) => j.job_id === id).batch_id,
          b.batch_id,
        );
    }
});
test("five prompt modes and unknown cost/storage are explicit", async () => {
  const { output } = await artifacts();
  const templates = JSON.parse(
    output.get(CATALOG + "core-generation-prompt-templates.v1.json"),
  ).templates;
  assert.equal(new Set(templates.map((t) => t.mode)).size, 5);
  assert.match(
    [...output].find(([p]) =>
      p.endsWith("core-generation-cost-estimate.md"),
    )[1],
    /Monetary total: unknown/,
  );
});
