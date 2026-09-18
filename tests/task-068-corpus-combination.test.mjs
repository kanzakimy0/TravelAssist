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
  assert.equal(result.rows.length, 10422);
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
  assert.equal(result.summary.explicitCandidateMergeLinks, 69);
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
