import test from "node:test";
import assert from "node:assert/strict";
import { statSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, read, sha256 } from "../tools/assets/asset-utils.mjs";
import {
  closureInput,
  buildClosure,
  pinnedEvidence,
  scopeAccepted,
  assertNoCycles,
  protectedSnapshot,
  closureArtifacts,
  publishClosure,
} from "../tools/assets/close-japan-destination-evidence.mjs";
import { buildData } from "../tools/assets/core-generation-common.mjs";
import {
  createResolution,
  artifacts as parentArtifacts,
  publishResolution,
} from "../tools/assets/japan-destination-resolution.mjs";

test("dynamic targets cover all seven gates and never assume exactly 46", () => {
  const data = closureInput(),
    result = buildClosure(data);
  assert.equal(result.audit.length, 300);
  assert.equal(new Set(result.audit.map((r) => r.destination_id)).size, 300);
  assert.equal(
    result.targets.length,
    result.audit.filter((r) => !r.fully_passed).length,
  );
  for (const row of result.audit) {
    assert.equal(row.fully_passed, Object.values(row.gates).every(Boolean));
    assert.deepEqual(
      row.missing_gates,
      Object.keys(row.gates).filter((k) => !row.gates[k]),
    );
    assert(
      row.current_source_evidence &&
        row.current_coordinate_evidence &&
        row.current_prefecture_evidence &&
        row.current_language_evidence &&
        row.current_scope_evidence &&
        row.alias_overlap_flags,
    );
  }
  assert.equal(
    result.summary.task_013_4_allowed,
    false,
    "Unmerged/incomplete closure must not unlock POIs",
  );
});

const pin = {
  entity_id: "Q1490",
  entity_revision: 123,
  source_url: "https://www.wikidata.org/w/index.php?title=Q1490&oldid=123",
};
const snapshot = { entities: { Q1490: { revision: 123 } } };
test("a matching positive revision is a valid pin", () =>
  assert(pinnedEvidence(pin, snapshot)));
for (const [name, patch] of [
  ["undefined revision", { entity_revision: undefined }],
  ["null revision", { entity_revision: null }],
  ["zero revision", { entity_revision: 0 }],
  ["negative revision", { entity_revision: -1 }],
  ["numeric string", { entity_revision: "123" }],
  ["undefined URL", { source_url: pin.source_url.replace("123", "undefined") }],
  ["mismatched revision", { entity_revision: 124 }],
  ["wrong entity URL", { source_url: pin.source_url.replace("Q1490", "Q999") }],
  [
    "lookalike domain",
    {
      source_url: pin.source_url.replace(
        "www.wikidata.org",
        "www.wikidata.org.example.com",
      ),
    },
  ],
])
  test("reject " + name, () =>
    assert.equal(pinnedEvidence({ ...pin, ...patch }, snapshot), false),
  );

test("parent resolver no longer promotes missing source revision", () => {
  const r = createResolution(buildData().destinations);
  const sample = r.data.snapshot.entities.Q1490;
  const saved = sample.revision;
  delete sample.revision;
  const changed = createResolution(buildData().destinations, r.data);
  sample.revision = saved;
  const e = changed.evidence.find((e) => e.destination_id === "jp-tokyo");
  assert.equal(e.identity_verified, false);
  assert.equal(e.source_url, null);
  assert(e.unresolved_reasons.includes("unpinned_source_revision"));
});

const acceptedScope = {
  scope_type: "route_corridor",
  parent_entity_ids: [],
  prefecture_ids: ["toyama", "nagano"],
  coverage_note: "Explicit corridor",
  boundary_source: "https://www.example.org/reviewed-boundary",
  center_rule: "Reviewed representative center",
  poi_inclusion_rule: "Inside named corridor",
  poi_exclusion_rule: "Exclude outside corridor",
  cross_prefecture: true,
};
const scopeSources = [
  {
    url: acceptedScope.boundary_source,
    accepted_gates: ["coverage_scope_verified"],
  },
];
test("complete explicitly cross-prefecture scope can pass independently", () =>
  assert(scopeAccepted(acceptedScope, scopeSources)));
test("generic prose or directory link is not an accepted boundary", () => {
  assert.equal(
    scopeAccepted({ coverage_scope: "some region" }, scopeSources),
    false,
  );
  assert.equal(scopeAccepted(acceptedScope, []), false);
  assert.equal(
    scopeAccepted({ ...acceptedScope, cross_prefecture: false }, scopeSources),
    false,
  );
  for (const field of [
    "scope_type",
    "coverage_note",
    "boundary_source",
    "center_rule",
    "poi_inclusion_rule",
    "poi_exclusion_rule",
  ])
    assert.equal(
      scopeAccepted({ ...acceptedScope, [field]: "" }, scopeSources),
      false,
    );
});
test("parent hierarchy cannot cycle or reference a missing destination", () => {
  assert.throws(() =>
    assertNoCycles([
      { destination_id: "a", parent_destination_id: "b" },
      { destination_id: "b", parent_destination_id: "a" },
    ]),
  );
  assert.throws(() =>
    assertNoCycles([{ destination_id: "a", parent_destination_id: "missing" }]),
  );
});
test("protected POI/jobs/variants and 40 batches equal merged base byte for byte", () => {
  const rows = protectedSnapshot();
  assert.equal(rows.length, 44);
  assert(rows.every((r) => r.unchanged));
});
test("types, prefectures and research are not silently promoted", () => {
  const data = closureInput();
  assert(new Set(data.rows.map((r) => r.entity_type)).size > 5);
  assert.equal(
    new Set(
      data.evidence
        .filter((e) => e.identity_verified)
        .flatMap((e) => [e.primary_prefecture, ...e.secondary_prefectures])
        .filter(Boolean),
    ).size,
    47,
  );
  const result = buildClosure(data);
  for (const row of result.audit.filter(
    (r) => r.supplemental_official_sources.length,
  )) {
    assert.equal(
      row.gates.evidence_verified,
      false,
      "Discovery is not final all-field acceptance",
    );
  }
  assert.equal(
    result.summary.fully_passed,
    0,
    "Current fixture has no reviewed final boundary sources",
  );
});
test("closure artifacts are canonical and contain no machine paths or secrets", async () => {
  const { output } = await closureArtifacts();
  for (const [path, content] of output) {
    assert.equal(read(path), content);
    assert(
      !/[A-Z]:[\\/]|[?&]oldid=undefined|ghp_[A-Za-z0-9]{20}/.test(content),
      path,
    );
  }
});
test("repeated closure preserves SHA and mtime", async () => {
  const { output } = await closureArtifacts();
  const snap = () =>
    [...output.keys()].map((path) => [
      path,
      sha256(read(path)),
      statSync(resolve(ROOT, path)).mtimeMs,
    ]);
  const before = snap();
  await publishClosure();
  await publishClosure({ check: true });
  assert.deepEqual(snap(), before);
});

test("resolver / closure / validator sequence is byte and mtime no-op", async () => {
  const baseline = buildData().destinations;
  const parent = await parentArtifacts(baseline);
  const child = await closureArtifacts();
  const paths = [...new Set([...parent.output.keys(), ...child.output.keys()])];
  const snap = () =>
    paths.map((path) => [
      path,
      sha256(read(path)),
      statSync(resolve(ROOT, path)).mtimeMs,
    ]);
  const before = snap();
  await publishResolution(baseline);
  await publishClosure();
  await publishResolution(baseline, { check: true });
  await publishClosure({ check: true });
  assert.deepEqual(snap(), before);
});
