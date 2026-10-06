import assert from "node:assert/strict";
import {
  readFileSync,
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  combine,
  csvCell,
  generateOutputs,
} from "../tools/poi/combine-corpus.mjs";

import { reviewIdentities } from "../tools/poi/review-identities.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const inputPath = "data/poi/full/sources/identity-observations.v1.jsonl";
const observations = readFileSync(resolve(root, inputPath), "utf8")
  .trim()
  .split(/\r?\n/)
  .map(JSON.parse);
const decisions = JSON.parse(
  readFileSync(
    resolve(root, "data/poi/full/sources/identity-decisions.v1.json"),
    "utf8",
  ),
);
const empty = { decisions: [] };
const result = combine(observations, decisions);
const fixture = (id, code = "64426", address = "別の市") => ({
  sourceId: "test",
  sourceRecordId: id,
  nameJa: "同名神社",
  nameEn: null,
  prefecture: "京都府",
  address,
  codeClaims: [
    {
      masterCode: code,
      kind: "legacy_effective_not_canonical",
      sourceVersion: "fixture",
    },
  ],
  evidenceRefs: ["https://example.org/poi/" + id],
});

test("all 10,491 original observations and their exact claims/facts survive exactly once", () => {
  const members = result.rows.flatMap((row) => row.observations);
  assert.equal(members.length, 10491);
  const actual = new Map(
    members.map((member) => [member.sourceRecordId, member]),
  );
  assert.equal(actual.size, observations.length);
  for (const original of observations)
    assert.deepEqual(actual.get(original.sourceRecordId), original);
  assert.equal(result.rows.length, 10369);
  assert.equal(
    new Set(result.rows.map((row) => row.candidateKey)).size,
    result.rows.length,
  );
  for (const row of result.rows) {
    assert.equal(row.canonicalMasterCode, null);
    assert.ok(row.sourceRecordIds.includes(row.candidateKey));
  }
});

test("all 175 historical conflicting codes retain separate identities; no code-based union", () => {
  assert.equal(result.codeConflicts.length, 175);
  const conflict = result.codeConflicts.find(
    (row) => row.masterCode === "64426",
  );
  assert.equal(conflict.bindings.length, 2);
  assert.ok(
    conflict.bindings.some(
      (b) => b.candidateKey === "geoshape-nrct-poi:200000057800",
    ),
  );
  assert.ok(
    conflict.bindings.some(
      (b) => b.candidateKey === "geoshape-nrct-poi:230000107100",
    ),
  );
  const synthetic = combine([fixture("a"), fixture("b")], empty);
  assert.equal(synthetic.rows.length, 2);
  assert.equal(synthetic.codeConflicts.length, 1);
});

test("same name/prefecture with different addresses remains separate and enters review", () => {
  const synthetic = combine(
    [
      fixture("a", "60000", "甲市一番町1"),
      fixture("b", "60001", "乙市二番町2"),
    ],
    empty,
  );
  assert.equal(synthetic.rows.length, 2);
  assert.equal(synthetic.possibleDuplicates.length, 1);
});

test("only explicit evidence links merge candidate identities; changed evidence fails closed", () => {
  assert.equal(result.summary.explicitCandidateMergeLinks, 122);
  for (const decision of decisions.decisions) {
    assert.ok(
      result.rows.some(
        (row) =>
          row.sourceRecordIds.includes(decision.left) &&
          row.sourceRecordIds.includes(decision.right),
      ),
    );
  }
  const changed = structuredClone(decisions);
  changed.decisions[0].evidence[0].address = "changed";
  assert.throws(
    () => combine(observations, changed),
    /Stale decision evidence/,
  );
  const unknown = structuredClone(decisions);
  unknown.decisions[0].left = "unobserved";
  assert.throws(() => combine(observations, unknown), /Unknown\/self decision/);
});

test("missing historical mappings stay unknown; no inferred sequential allocation", () => {
  const original2979 = observations.filter((o) => o.prior2979);
  assert.equal(original2979.length, 2979);
  for (const row of original2979) assert.deepEqual(row.codeClaims, []);
  assert.equal(result.summary.canonicalAllocatedPois, 0);
  assert.equal(result.summary.occupiedCorpusLocked, false);
});

test("legacy claim boundaries are preserved as text without allocating reserved slots", () => {
  for (const code of ["00000", "00001", "99999"]) {
    const out = combine([fixture("a", code)], empty).rows[0];
    assert.equal(out.legacyCodeClaims[0].masterCode, code);
    assert.equal(out.canonicalMasterCode, null);
  }
  for (const code of ["100000", "-0001", "1234", "abcde", 64426]) {
    assert.throws(
      () => combine([fixture("a", code)], empty),
      /Invalid five-digit/,
    );
  }
});

test("duplicate source identities and unsupported canonical claim promotion fail closed", () => {
  assert.throws(
    () => combine([fixture("a"), fixture("a")], empty),
    /Duplicate\/missing source/,
  );
  const invalid = fixture("a");
  invalid.codeClaims[0].kind = "canonical";
  assert.throws(() => combine([invalid], empty), /Unsupported claim kind/);
});

test("candidate output is independent of input/decision ordering", () => {
  assert.deepEqual(
    combine([...observations].reverse(), {
      ...decisions,
      decisions: [...decisions.decisions].reverse(),
    }),
    result,
  );
});

test("regenerated files are byte-identical to the committed review artifacts", () => {
  const { outputs } = generateOutputs(root);
  for (const [path, content] of outputs) {
    if (path.endsWith(".csv"))
      assert.equal(
        content.includes("\r"),
        false,
        "CSV follows Git LF normalization",
      );
  }
  for (const [path, content] of outputs)
    assert.equal(readFileSync(resolve(root, path), "utf8"), content, path);
});

test("tampered normalized input is refused before output generation", () => {
  const dir = mkdtempSync(resolve(tmpdir(), "task068-checksum-"));
  try {
    mkdirSync(resolve(dir, "data/poi/full/sources"), { recursive: true });
    for (const name of [
      "identity-observations.v1.jsonl",
      "identity-decisions.v1.json",
      "source-manifest.v1.json",
    ]) {
      const path = "data/poi/full/sources/" + name;
      writeFileSync(resolve(dir, path), readFileSync(resolve(root, path)));
    }
    writeFileSync(
      resolve(dir, inputPath),
      readFileSync(resolve(dir, inputPath), "utf8") + "\n",
    );
    assert.throws(() => generateOutputs(dir), /checksum mismatch/);
  } finally {
    rmSync(dir, { recursive: true });
  }
});

test("CSV review cells quote embedded delimiters and neutralize formula prefixes", () => {
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  for (const value of ["=1+1", "+SUM(A1)", "-1", "@foo", "\t=1+1"])
    assert.ok(csvCell(value).startsWith("\"'"));
});

const readJson = (path) =>
  JSON.parse(readFileSync(resolve(root, path), "utf8"));
const sourceJson = (name) =>
  readJson("data/poi/full/sources/" + name + ".v1.json");
const baseline = sourceJson("identity-review-baseline");
const officialEvidence = sourceJson("identity-official-evidence");
const policy = sourceJson("identity-review-policy");
const review = reviewIdentities(
  result.rows,
  baseline,
  officialEvidence,
  policy,
);

test("every baseline name group is reviewed once, with unresolved candidates retained", () => {
  assert.equal(review.groups.length, 224);
  assert.deepEqual(
    new Set(review.groups.map((g) => g.groupKey)),
    new Set(baseline.groups.map((g) => g.groupKey)),
  );
  assert.equal(review.heldGroupCount, 63);
  assert.equal(review.heldCandidateKeys.length, 162);
  for (const group of review.groups) {
    for (const id of group.sourceRecordIds)
      assert.ok(result.rows.some((r) => r.sourceRecordIds.includes(id)));
    assert.equal(
      group.quarantinedFromEnrichment,
      group.status.startsWith("HOLD_"),
    );
  }
  assert.equal(review.canonicalAllocationsChanged, 0);
});

test("punctuation-only English names do not create identity or duplicate links", () => {
  const ignored = review.groups.filter(
    (g) => g.status === "IGNORED_PLACEHOLDER_NAME",
  );
  assert.equal(ignored.length, 2);
  for (const group of ignored) {
    assert.ok(group.currentCandidateKeys.length > 1);
    assert.ok(
      !result.possibleDuplicates.some(
        (g) => g.normalizedNameAndPrefecture === group.groupKey,
      ),
    );
  }
  const synthetic = combine(
    [
      { ...fixture("a"), nameJa: "甲", nameEn: "—" },
      { ...fixture("b"), nameJa: "乙", nameEn: "--" },
    ],
    empty,
  );
  assert.equal(synthetic.rows.length, 2);
  assert.equal(synthetic.possibleDuplicates.length, 0);
});

test("historical entries sharing an estimated point remain distinct and quarantined", () => {
  const ids = [
    "geoshape-nrct-poi:210000143100",
    "geoshape-nrct-poi:210000204200",
  ];
  const group = review.groups.find((g) =>
    ids.every((id) => g.sourceRecordIds.includes(id)),
  );
  assert.equal(group.status, "HOLD_SOURCE_IDENTITY_AMBIGUITY");
  assert.equal(group.retainedSharedCoordinates, true);
  assert.equal(
    result.rows.filter((r) => ids.some((id) => r.sourceRecordIds.includes(id)))
      .length,
    2,
  );
});

test("same address attached to different historical points is not silently repaired", () => {
  const ids = [
    "geoshape-nrct-poi:240000091400",
    "geoshape-nrct-poi:240000098200",
  ];
  const group = review.groups.find((g) =>
    ids.every((id) => g.sourceRecordIds.includes(id)),
  );
  assert.equal(group.status, "HOLD_ADDRESS_COORDINATE_CONTRADICTION");
  assert.equal(group.retainedSharedAddress, true);
  assert.equal(group.retainedSharedCoordinates, false);
  assert.equal(group.currentCandidateKeys.length, 2);
});

test("partial three-way identity match does not absorb a same-name temple in another city", () => {
  const merged = result.rows.find((r) =>
    r.sourceRecordIds.includes("candidate:B_V1_PROPOSED:60447"),
  );
  assert.ok(merged.sourceRecordIds.includes("geoshape-nrct-poi:400000055400"));
  assert.ok(!merged.sourceRecordIds.includes("geoshape-nrct-poi:400000024900"));
  const group = review.groups.find((g) => g.groupKey === "ja:高知県:大日寺");
  assert.equal(group.currentCandidateKeys.length, 2);
  assert.equal(group.status, "KEEP_SEPARATE_DISTINCT_SOURCE_LOCATIONS");
});

test("officially corroborated links require retained primary-source location evidence", () => {
  const changed = structuredClone(decisions);
  const decision = changed.decisions.find(
    (d) =>
      d.method === "official_source_identity_review" &&
      d.evidence.some((e) => !e.address),
  );
  assert.ok(decision);
  decision.officialEvidence = [];
  assert.throws(
    () => combine(observations, changed),
    /Missing official identity evidence/,
  );
  decision.method = "editorial_bilingual_address_comparison";
  assert.throws(() => combine(observations, changed), /needs matching names/);
});

test("review rejects missing baseline identities and misbound official source evidence", () => {
  const badBaseline = structuredClone(baseline);
  badBaseline.groups[0].sourceRecordIds.push("unobserved");
  assert.throws(
    () => reviewIdentities(result.rows, badBaseline, officialEvidence, policy),
    /Baseline source disappeared/,
  );
  const badEvidence = structuredClone(officialEvidence);
  badEvidence.records[0].appliesToSourceRecordIds = ["unobserved"];
  assert.throws(
    () => reviewIdentities(result.rows, baseline, badEvidence, policy),
    /Official evidence has unknown source/,
  );
});

test("175 conflicting bindings have explicit lineage while 4846 agreements remain noncanonical", () => {
  const lineage = sourceJson("legacy-code-lineage");
  assert.equal(lineage.collisions.length, 175);
  assert.equal(new Set(lineage.collisions.map((c) => c.masterCode)).size, 175);
  const causes = {};
  for (const entry of lineage.collisions) {
    causes[entry.cause] = (causes[entry.cause] ?? 0) + 1;
    assert.notEqual(entry.priorSourceId, entry.laterSourceId);
    assert.equal(entry.canonicalMasterCodeAssigned, false);
    assert.equal(entry.resolution, "OWNER_GOVERNANCE_REQUIRED");
  }
  assert.deepEqual(
    Object.values(causes).sort((a, b) => a - b),
    [8, 167],
  );
  const agreed = readFileSync(
    resolve(root, "data/poi/full/registry/agreed-legacy-claims.v1.jsonl"),
    "utf8",
  )
    .trim()
    .split("\n")
    .map(JSON.parse);
  assert.equal(agreed.length, 4846);
  const conflicting = new Set(lineage.collisions.map((c) => c.masterCode));
  for (const row of agreed) {
    assert.match(row.masterCodeClaim, /^\d{5}$/);
    assert.ok(!conflicting.has(row.masterCodeClaim));
    const original = observations.find(
      (o) => o.sourceRecordId === row.sourceRecordId,
    );
    assert.ok(original);
    for (const version of ["v3.8", "v3.7.1"])
      assert.ok(
        original.codeClaims.some(
          (c) =>
            c.masterCode === row.masterCodeClaim && c.sourceVersion === version,
        ),
      );
    assert.equal(row.status, "VERSIONS_AGREE_NOT_CANONICAL_ALLOCATION");
  }
});
