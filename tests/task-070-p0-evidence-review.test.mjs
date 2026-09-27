import test from "node:test";
import assert from "node:assert/strict";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  existsSync,
  copyFileSync,
} from "node:fs";
import { resolve, dirname, relative, isAbsolute } from "node:path";
import { tmpdir } from "node:os";
import {
  ROOT,
  PREFIX,
  INPUTS,
  hash,
  json,
} from "../tools/poi/enrich-candidates.mjs";
import {
  load,
  compile,
  sidecars,
  batchPlan,
  validateEntry,
  parseArgs,
  run,
  POPULATION,
  EVIDENCE,
  TOOL,
  CURRENT,
} from "../tools/poi/review-p0.mjs";
import { audit } from "../tools/poi/audit-p0.mjs";
const ctx = load(),
  entries = ctx.evidence.entries,
  dataset = compile(ctx, entries),
  files = sidecars(ctx, dataset);
const clone = (x) => structuredClone(x);
const valid = (e) =>
  validateEntry(
    e,
    ctx.population.candidates[e.position - 1],
    ctx.input.articleIndex,
    ctx.input.rubric,
  );
const factEntry = entries.find((e) => e.features.length && e.anchors.length);

test("P0 selection is exactly frozen 200 + 122, ordered, unique and source matched", () => {
  assert.equal(entries.length, 322);
  assert.deepEqual(
    entries.map((e) => e.candidateKey),
    ctx.population.orderedCandidateKeys,
  );
  for (const [id, n] of [
    ["P0-0001", 200],
    ["P0-0002", 122],
  ]) {
    const p = batchPlan(ctx, dataset, entries, id, files);
    assert.equal(p.keys.size, n);
    assert.equal(p.receipt.candidateCount, n);
  }
  assert.throws(
    () => batchPlan(ctx, dataset, entries.slice(0, 321), "P0-0002", files),
    /Incomplete/,
  );
});
test("disk pipeline independently proves all 43 keys, provenance, protected rows and dynamic unknowns", () => {
  const r = audit();
  assert.equal(r.preservedPartitions, 208);
  assert.equal(r.known, 860);
  assert.equal(r.states.QUARANTINED, 162);
  assert.equal(r.states.SOURCE_UNAVAILABLE, 9859);
  assert.equal(r.credentialFindings, 0);
});
test("nulls cannot silently turn into default 0 or 5", () => {
  for (const e of entries) {
    const r = dataset.rows.find((r) => r.candidateKey === e.candidateKey);
    const allowed = new Map(e.features.map((f) => [f.code, f.value]));
    for (const [k, v] of Object.entries(r.featureSet.values))
      assert.equal(v, allowed.has(k) ? allowed.get(k) : null);
  }
});
test("all non-P0 feature, visit, link and neighbor rows preserve baseline objects", () => {
  const keys = new Set(entries.map((e) => e.candidateKey));
  for (let i = 0; i < dataset.rows.length; i++)
    if (!keys.has(dataset.rows[i].candidateKey))
      assert.deepEqual(dataset.rows[i], ctx.baseline.rows[i]);
});
test("identity, unsafe linkage, source hashes, duplicate facts and unsupported states fail closed", () => {
  for (const mutate of [
    (e) => (e.candidateKey += "x"),
    (e) => (e.sourceRef = "unrelated"),
    (e) => (e.contentSha256 = "0".repeat(64)),
    (e) => e.features.push(clone(e.features[0])),
    (e) => (e.status = "SOURCE_UNAVAILABLE"),
    (e) => (e.readComplete = false),
  ]) {
    const e = clone(factEntry);
    mutate(e);
    assert.throws(() => valid(e));
  }
});
test("locator bounds and provenance are mandatory; a valid-looking raw hash must match bytes", () => {
  for (const mutate of [
    (e) => (e.features[0].locator.offset = -1),
    (e) => (e.features[0].locator.length = e.targetContentEnd + 1),
    (e) => (e.features[0].confidence = 2),
    (e) => (e.features[0].reason = ""),
    (e) => (e.features[0].value = 10),
    (e) => (e.features[0].code = "44"),
  ]) {
    const e = clone(factEntry);
    mutate(e);
    assert.throws(() => valid(e));
  }
  const e = clone(factEntry),
    a = ctx.input.articleIndex.entries.find((a) => a.sourceRef === e.sourceRef);
  assert.throws(
    () =>
      validateEntry(
        e,
        ctx.population.candidates[e.position - 1],
        ctx.input.articleIndex,
        ctx.input.rubric,
        new Map([[a.url, { text: "changed" }]]),
      ),
    /raw source corruption/,
  );
});
test("blocked and no-attribute outcomes retain nulls and no visit or access additions", () => {
  for (const e of entries.filter((e) => e.status !== "REVIEWED_PARTIAL")) {
    const r = dataset.rows.find((r) => r.candidateKey === e.candidateKey);
    assert.equal(r.provenance.length, 0);
    assert.deepEqual(r.visitProfiles, []);
    assert.deepEqual(r.accessLinks, []);
  }
  const e = clone(factEntry);
  e.status = "REVIEW_BLOCKED_IDENTITY";
  assert.throws(() => valid(e), /contradiction/);
});
test("one candidate processing failure is queued and does not abort other candidates", () => {
  const d = compile(ctx, entries, { failCandidate: factEntry.candidateKey });
  assert.equal(d.errors.length, 1);
  assert.equal(d.errors[0].candidateKey, factEntry.candidateKey);
  for (const r of d.rows) {
    const normal = dataset.rows.find((x) => x.candidateKey === r.candidateKey);
    if (r.candidateKey === factEntry.candidateKey) {
      assert.equal(r.provenance.length, 0);
      assert.equal(r.accessLinks.length, 0);
    } else assert.deepEqual(r, normal);
  }
  const p = batchPlan(
    ctx,
    d,
    entries,
    factEntry.position <= 200 ? "P0-0001" : "P0-0002",
    sidecars(ctx, d),
  );
  const q = JSON.parse([...p.outputs.values()][0]);
  assert.equal(q.errorCount, 1);
  assert.equal(
    p.receipt.failureReviewQueueCount,
    q.outcomes.filter((r) => r.status !== "REVIEWED_PARTIAL").length,
  );
});
test("deterministic rebuild is byte-identical and evidence changes invalidate only affected input checksum", () => {
  assert.deepEqual([...sidecars(ctx, compile(ctx, entries))], [...files]);
  const changed = clone(entries);
  changed[210].reviewRationale += " Reviewed again.";
  for (const id of ["P0-0001", "P0-0002"]) {
    const a = batchPlan(ctx, dataset, entries, id, files),
      b = batchPlan(ctx, dataset, changed, id, files);
    assert.equal(
      a.receipt.inputChecksum === b.receipt.inputChecksum,
      id === "P0-0001",
    );
  }
});
test("CLI disallows unknown flags, conflicting modes and absent arguments", () => {
  assert.deepEqual(parseArgs(["--resume", "--batch", "P0-0001"]), {
    resume: true,
    batch: "P0-0001",
  });
  for (const args of [
    ["--reset"],
    ["--cache"],
    ["--check", "--resume"],
    ["--batch", "--resume"],
  ])
    assert.throws(() => parseArgs(args));
});
test("isolated actual writes enforce first batch, skip, corrupt/incomplete recovery and input invalidation", () => {
  const parent = resolve(tmpdir()),
    root = mkdtempSync(resolve(parent, "travelassist-task070-test-"));
  const read = (p) => readFileSync(resolve(root, p), "utf8");
  const write = (p, t) => {
    mkdirSync(dirname(resolve(root, p)), { recursive: true });
    writeFileSync(resolve(root, p), t);
  };
  try {
    for (const p of [...INPUTS, POPULATION, EVIDENCE, TOOL]) {
      mkdirSync(dirname(resolve(root, p)), { recursive: true });
      copyFileSync(resolve(ROOT, p), resolve(root, p));
    }
    assert.deepEqual(run({ dryRun: true }, root).writes, 0);
    assert.ok(!existsSync(resolve(root, CURRENT)));
    assert.throws(() => run({ batch: "P0-0002" }, root), /P0-0001 must PASS/);
    const first = run({ batch: "P0-0001", resume: true }, root);
    assert.equal(first.status, "BOUNDED_CHECKPOINT");
    assert.ok(!existsSync(resolve(root, CURRENT)));
    const p2keys = new Set(entries.slice(200).map((e) => e.candidateKey));
    for (const [p] of files)
      if (p.includes("/features/"))
        for (const r of read(p)
          .trim()
          .split("\n")
          .filter(Boolean)
          .map(JSON.parse))
          if (p2keys.has(r.candidateKey))
            assert.equal(r.status, "REVIEW_REQUIRED");
    const auto = run({ resume: true }, root);
    assert.deepEqual(
      auto.results.map((r) => r.status),
      ["SKIPPED_IDENTICAL", "WRITTEN_QA_PASS"],
    );
    const stable = hash(read(CURRENT));
    assert.ok(
      run({ resume: true }, root).results.every(
        (r) => r.status === "SKIPPED_IDENTICAL",
      ),
    );
    assert.equal(hash(read(CURRENT)), stable);
    const receipt = `${PREFIX}/manifests/P0-0002.json`;
    const good = read(receipt);
    for (const corrupt of [
      "{}",
      JSON.stringify({ ...JSON.parse(good), completedAt: "invalid-date" }),
    ]) {
      write(receipt, corrupt);
      assert.throws(() => run({ check: true }, root), /Invalid receipt/);
      assert.equal(
        run({ resume: true }, root).results[1].status,
        "WRITTEN_QA_PASS",
      );
    }
    const p = [...files.keys()].find(
      (p) =>
        p.includes("/features/") && read(p).includes(entries[210].candidateKey),
    );
    write(p, read(p) + "BROKEN_JSON");
    assert.throws(() => run({ check: true }, root));
    assert.ok(
      run({ resume: true }, root).results.some(
        (r) => r.status === "WRITTEN_QA_PASS",
      ),
    );
    assert.equal(hash(read(CURRENT)), stable);
    const rubric = INPUTS[3],
      saved = read(rubric);
    write(rubric, saved + " ");
    assert.throws(() => run({ resume: true }, root), /Frozen rubric/);
    write(rubric, saved);
    const ev = JSON.parse(read(EVIDENCE));
    ev.entries[210].reviewRationale += " Local repair test.";
    write(EVIDENCE, json(ev));
    const updated = run({ resume: true }, root);
    assert.deepEqual(
      updated.results.map((r) => r.status),
      ["SKIPPED_IDENTICAL", "WRITTEN_QA_PASS"],
    );
    write(TOOL, read(TOOL) + "\n// fixture code revision\n");
    assert.ok(
      run({ resume: true }, root).results.every(
        (r) => r.status === "WRITTEN_QA_PASS",
      ),
    );
    assert.equal(run({ check: true }, root).status, "P0_COMPLETE");
  } finally {
    const rel = relative(parent, root);
    assert.ok(
      rel &&
        !rel.startsWith("..") &&
        !isAbsolute(rel) &&
        rel.startsWith("travelassist-task070-test-"),
    );
    rmSync(root, { recursive: true, force: true });
    assert.ok(!existsSync(root));
  }
});
