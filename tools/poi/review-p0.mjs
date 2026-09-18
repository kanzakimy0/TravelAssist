import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  renameSync,
  existsSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ROOT,
  PREFIX,
  INPUTS,
  hash,
  json,
  readInputs,
  buildDataset,
  generateArtifacts,
} from "./enrich-candidates.mjs";
import {
  parsePoiFeatureSetV1,
  parsePoiVisitProfileV1,
} from "../../src/shared/contracts/planning/validation.ts";
export const POPULATION = `${PREFIX}/manifests/p0-population.v1.json`;
export const EVIDENCE = `${PREFIX}/sources/p0-reviewed-evidence.v1.json`;
export const QA = "docs/qa/TASK-070";
export const TOOL = "tools/poi/review-p0.mjs";
export const CURRENT = `${PREFIX}/manifests/p0-current.v1.json`;
const states = [
  "REVIEWED_PARTIAL",
  "REVIEWED_NO_SUPPORTED_ATTRIBUTE",
  "REVIEW_BLOCKED_EVIDENCE_INSUFFICIENT",
  "REVIEW_BLOCKED_IDENTITY",
];
export const assert = (condition, message) => {
  if (!condition) throw Error(message);
};
export const jsonl = (rows) =>
  rows.map((r) => JSON.stringify(r) + "\n").join("");
const read = (root, path) => readFileSync(resolve(root, path));
const object = (root, path) => JSON.parse(read(root, path));
const lines = (root, path) =>
  read(root, path)
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean)
    .map(JSON.parse);
const same = (root, path, text) =>
  existsSync(resolve(root, path)) && hash(read(root, path)) === hash(text);
function atomic(root, path, text) {
  const target = resolve(root, path);
  mkdirSync(dirname(target), { recursive: true });
  const temp = target + ".tmp-" + process.pid;
  writeFileSync(temp, text);
  renameSync(temp, target);
}
const counts = (entries) =>
  Object.fromEntries(
    states.map((s) => [s, entries.filter((e) => e.status === s).length]),
  );
export function validateEntry(e, p, index, rubric, raw) {
  assert(
    p && e.candidateKey === p.candidateKey && e.position === p.position,
    "P0 identity corruption",
  );
  assert(
    p.matchedSourceRefs.length === 1 && p.matchedSourceRefs[0] === e.sourceRef,
    "Unsafe source/candidate linkage",
  );
  const a = index.entries.find((x) => x.sourceRef === e.sourceRef);
  assert(
    a &&
      a.contentSha256 === e.contentSha256 &&
      a.targetContentEnd === e.targetContentEnd,
    "Frozen source/hash corruption",
  );
  assert(
    e.readComplete === true &&
      /^[a-f0-9]{64}$/.test(e.targetContentSha256) &&
      Number.isFinite(Date.parse(e.reviewedAt)) &&
      e.reviewRationale,
    "Incomplete editorial review",
  );
  assert(states.includes(e.status), "Unknown outcome");
  assert(
    new Set(e.features.map((f) => f.code)).size === e.features.length,
    "Duplicate feature evidence",
  );
  const facts = [...e.features, ...e.anchors, ...(e.visit ? [e.visit] : [])];
  assert(
    (e.status === "REVIEWED_PARTIAL") === facts.length > 0,
    "Outcome/attribute contradiction",
  );
  for (const f of facts) {
    const l = f.locator;
    assert(
      l &&
        Number.isInteger(l.offset) &&
        l.offset >= 0 &&
        Number.isInteger(l.length) &&
        l.length > 0 &&
        l.offset + l.length <= a.targetContentEnd &&
        /^[a-f0-9]{64}$/.test(l.locatorSha256),
      "Frozen locator corruption",
    );
    assert(
      f.reason &&
        Number.isFinite(f.confidence) &&
        f.confidence >= 0 &&
        f.confidence <= 1,
      "Missing fact provenance",
    );
  }
  for (const f of e.features) {
    assert(
      rubric.definitions.some((d) => d.code === f.code) &&
        Number.isInteger(f.value) &&
        f.value >= 0 &&
        f.value <= 9 &&
        f.annotationMethod === "editorial_calibration",
      "Rubric/schema contradiction",
    );
  }
  if (raw) {
    const text = raw.get(a.url)?.text;
    assert(
      typeof text === "string" &&
        hash(text) === a.contentSha256 &&
        hash(text.slice(0, a.targetContentEnd)) === e.targetContentSha256,
      "Frozen raw source corruption",
    );
    for (const f of facts)
      assert(
        hash(
          text.slice(f.locator.offset, f.locator.offset + f.locator.length),
        ) === f.locator.locatorSha256,
        "Raw locator hash corruption",
      );
  }
  return e;
}
export function load(root = ROOT, cache) {
  const input = readInputs(root),
    population = object(root, POPULATION),
    evidence = object(root, EVIDENCE);
  const baseline = buildDataset(
    input.candidates,
    input.articleIndex,
    input.reviewed,
    input.rubric,
    input.heldKeys,
  );
  const selected = baseline.rows.filter((r) => r.status === "REVIEW_REQUIRED");
  assert(
    selected.length === 322 &&
      new Set(selected.map((r) => r.candidateKey)).size === 322,
    "Frozen P0 population corruption",
  );
  assert(
    json(population.orderedCandidateKeys) ===
      json(selected.map((r) => r.candidateKey)) &&
      hash(json(population.orderedCandidateKeys)) ===
        population.orderedKeysSha256,
    "Frozen P0 order corruption",
  );
  assert(
    population.candidateCount === 322 && population.candidates.length === 322,
    "Frozen population size",
  );
  for (const [path, sha256] of Object.entries(population.identityHashes))
    assert(
      hash(read(root, path)) === sha256,
      "Frozen identity/Registry corruption",
    );
  assert(
    hash(read(root, INPUTS[3])) === population.rubricSha256 &&
      hash(read(root, INPUTS[1])) === population.evidenceIndexSha256,
    "Frozen rubric/index corruption",
  );
  for (const [n, r] of selected.entries()) {
    const p = population.candidates[n];
    assert(
      p.position === n + 1 &&
        p.batchId === (n < 200 ? "P0-0001" : "P0-0002") &&
        p.upstreamStatus === "REVIEW_REQUIRED" &&
        p.baselineRowSha256 === hash(JSON.stringify(r)) &&
        p.identityInputChecksum === r.identityInputChecksum &&
        json(p.matchedSourceRefs) === json(r.matchedSourceRefs),
      "Upstream candidate linkage corruption",
    );
  }
  assert(
    evidence.rubricVersion === input.rubric.rubricVersion,
    "P0 rubric contradiction",
  );
  assert(
    new Set(evidence.entries.map((e) => e.candidateKey)).size ===
      evidence.entries.length,
    "Duplicate P0 review",
  );
  let raw;
  if (cache) {
    const bytes = readFileSync(cache);
    assert(
      hash(bytes) === population.sourceCacheSha256,
      "Frozen cache SHA corruption",
    );
    raw = new Map(JSON.parse(bytes).map((r) => [r.url, r]));
    for (const a of input.articleIndex.entries)
      assert(
        hash(raw.get(a.url)?.text ?? "") === a.contentSha256,
        "Frozen cache content corruption",
      );
  }
  for (const e of evidence.entries)
    validateEntry(
      e,
      population.candidates[e.position - 1],
      input.articleIndex,
      input.rubric,
      raw,
    );
  const hashes = [
    ...input.inputHashes,
    { path: POPULATION, sha256: hash(read(root, POPULATION)) },
    { path: TOOL, sha256: hash(read(root, TOOL)) },
  ];
  return {
    root,
    input,
    population,
    evidence,
    baseline,
    hashes,
    rawVerified: !!raw,
  };
}
// Only frozen P0 candidates can gain facts. Existing TASK-068 evidence is never replaced.
export function compile(ctx, entries, { failCandidate } = {}) {
  const { input, baseline } = ctx;
  const accepted = entries.filter((e) => e.status === "REVIEWED_PARTIAL");
  const oldRefs = new Set(input.reviewed.entries.map((e) => e.sourceRef));
  assert(
    accepted.every((e) => !oldRefs.has(e.sourceRef)),
    "Attempted overwrite of upstream evidence",
  );
  const merged = {
    ...input.reviewed,
    entries: [...input.reviewed.entries, ...accepted],
  };
  const built = buildDataset(
    input.candidates,
    input.articleIndex,
    merged,
    input.rubric,
    input.heldKeys,
  );
  const byId = new Map(entries.map((e) => [e.candidateKey, e])),
    errors = [];
  const rows = built.rows.map((r, n) => {
    const e = byId.get(r.candidateKey);
    if (!e) return baseline.rows[n];
    try {
      if (failCandidate === r.candidateKey)
        throw Error("INJECTED_CANDIDATE_PROCESSING_FAILURE");
      assert(parsePoiFeatureSetV1(r.featureSet).ok, "Feature contract invalid");
      for (const p of r.visitProfiles)
        assert(parsePoiVisitProfileV1(p.profile).ok, "Visit contract invalid");
      return {
        ...r,
        status: e.status,
        provenance: r.provenance.map((p) => ({
          ...p,
          rationale: p.facts.map((f) => f.reason).join(" "),
        })),
        neighbors: baseline.rows[n].neighbors,
        p0Review: {
          batchId: e.position <= 200 ? "P0-0001" : "P0-0002",
          sourceRef: e.sourceRef,
          status: e.status,
          reviewRationale: e.reviewRationale,
        },
        reviewReasons: [
          ...r.reviewReasons.filter(
            (x) => x !== "ATTRIBUTE_SOURCE_NOT_EDITORIALLY_REVIEWED",
          ),
          e.status,
        ],
      };
    } catch (error) {
      // Frozen input violations have already failed globally above. Local processing failures retain nulls.
      errors.push({
        candidateKey: r.candidateKey,
        errorCode:
          error.message === "INJECTED_CANDIDATE_PROCESSING_FAILURE"
            ? "INJECTED_CANDIDATE_PROCESSING_FAILURE"
            : "CANDIDATE_PROCESSING_ERROR",
      });
      return {
        ...baseline.rows[n],
        status: "REVIEW_BLOCKED_EVIDENCE_INSUFFICIENT",
        p0Review: {
          batchId: e.position <= 200 ? "P0-0001" : "P0-0002",
          status: "REVIEW_BLOCKED_EVIDENCE_INSUFFICIENT",
          reviewRationale:
            "Processing failed; baseline nulls retained. See error queue.",
        },
      };
    }
  });
  const used = new Set(
    rows.flatMap((r) => r.accessLinks.map((l) => l.anchorRef)),
  );
  const anchors = built.anchors.filter((a) => used.has(a.anchorRef));
  return { ...built, rows, anchors, errors };
}
export function sidecars(ctx, dataset) {
  const generated = generateArtifacts(
    dataset,
    "P0_CURRENT_SEPARATE_CHECKPOINT",
    ctx.input.rubric.rubricVersion,
  );
  // Neighbors intentionally retain the TASK-068 graph. No out-of-scope row is recomputed.
  return new Map(
    [...generated.files].filter(
      ([p]) =>
        p.startsWith(PREFIX + "/features/") ||
        p.startsWith(PREFIX + "/visit-profiles/") ||
        p.startsWith(PREFIX + "/transport-anchors/"),
    ),
  );
}
function projection(text, keys, anchorRefs) {
  return jsonl(
    text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(JSON.parse)
      .filter((r) =>
        r.candidateKey ? keys.has(r.candidateKey) : anchorRefs.has(r.anchorRef),
      )
      .map((r) =>
        r.candidateKey
          ? r
          : {
              ...r,
              sourceRefs: r.sourceRefs.filter((s) =>
                anchorRefs.get(r.anchorRef).has(s),
              ),
            },
      ),
  );
}
export function batchPlan(ctx, dataset, entries, id, files) {
  const batch = entries.filter(
      (e) => (e.position <= 200 ? "P0-0001" : "P0-0002") === id,
    ),
    keys = new Set(batch.map((e) => e.candidateKey));
  const expected = ctx.population.candidates.filter((p) => p.batchId === id);
  assert(
    batch.length === expected.length &&
      json(batch.map((e) => e.candidateKey)) ===
        json(expected.map((p) => p.candidateKey)),
    `Incomplete ${id}`,
  );
  const refs = new Map();
  for (const r of dataset.rows.filter((r) => keys.has(r.candidateKey)))
    for (const a of r.accessLinks) {
      if (!refs.has(a.anchorRef)) refs.set(a.anchorRef, new Set());
      a.sourceRefs.forEach((s) => refs.get(a.anchorRef).add(s));
    }
  const projections = [...files].map(([path, text]) => ({
    path,
    serialization:
      "LF JSONL filtered by orderedCandidateKeys; anchors filtered by referenced source",
    sha256: hash(projection(text, keys, refs)),
  }));
  const outcomes = dataset.rows
    .filter((r) => keys.has(r.candidateKey))
    .map((r) => ({
      candidateKey: r.candidateKey,
      status: r.status,
      reviewRationale: r.p0Review.reviewRationale,
      newNonNullFeatures: r.provenance.length,
      visitProfiles: r.visitProfiles.length,
      accessLinks: r.accessLinks.length,
    }));
  const qa = {
    schemaVersion: "task070-batch-qa-v1",
    batchId: id,
    status: "PASS",
    candidateCount: batch.length,
    counts: counts(outcomes),
    shapeChecked: batch.length,
    sourceLocators: batch.reduce(
      (n, e) => n + e.features.length + e.anchors.length + (e.visit ? 1 : 0),
      0,
    ),
    newNonNullFeatures: outcomes.reduce((n, r) => n + r.newNonNullFeatures, 0),
    visitProfiles: outcomes.reduce((n, r) => n + r.visitProfiles, 0),
    accessLinks: outcomes.reduce((n, r) => n + r.accessLinks, 0),
    blocked: outcomes.filter((r) => r.status.startsWith("REVIEW_BLOCKED"))
      .length,
    errorCount: dataset.errors.filter((e) => keys.has(e.candidateKey)).length,
    outcomes,
  };
  const outputs = new Map([[`${QA}/${id}.json`, json(qa)]]);
  const receipt = {
    schemaVersion: "task070-p0-receipt-v1",
    batchId: id,
    candidateCount: batch.length,
    orderedCandidateKeys: [...keys],
    first: batch[0].candidateKey,
    last: batch.at(-1).candidateKey,
    inputChecksum: hash(json({ hashes: ctx.hashes, entries: batch })),
    rubricVersion: ctx.input.rubric.rubricVersion,
    rubricSha256: ctx.population.rubricSha256,
    evidenceIndexSha256: ctx.population.evidenceIndexSha256,
    outputs: [...outputs].map(([path, text]) => ({ path, sha256: hash(text) })),
    sidecarProjections: projections,
    resultCounts: qa.counts,
    failureReviewQueueCount: qa.blocked + qa.errorCount,
    status: "PASS",
  };
  return { id, entries: batch, keys, refs, outputs, receipt };
}
const receiptPath = (id) => `${PREFIX}/manifests/${id}.json`;
export function receiptMatches(root, plan, files) {
  try {
    const { startedAt, completedAt, ...data } = object(
      root,
      receiptPath(plan.id),
    );
    if (
      !Number.isFinite(Date.parse(startedAt)) ||
      Date.parse(completedAt) < Date.parse(startedAt) ||
      json(data) !== json(plan.receipt)
    )
      return false;
    if (![...plan.outputs].every(([p, t]) => same(root, p, t))) return false;
    return [...files].every(
      ([path, text]) =>
        hash(projection(read(root, path).toString(), plan.keys, plan.refs)) ===
        hash(projection(text, plan.keys, plan.refs)),
    );
  } catch {
    return false;
  }
}
export function coverage(ctx, dataset, entries) {
  const count = (rows) => ({
    scoredPois: rows.filter((r) => r.provenance.length).length,
    nonNull: rows.reduce((n, r) => n + r.provenance.length, 0),
    visitProfiles: rows.reduce((n, r) => n + r.visitProfiles.length, 0),
    accessLinks: rows.reduce((n, r) => n + r.accessLinks.length, 0),
  });
  const before = count(ctx.baseline.rows),
    after = count(dataset.rows),
    p0 = dataset.rows.filter((r) =>
      ctx.population.orderedCandidateKeys.includes(r.candidateKey),
    );
  return {
    schemaVersion: "task070-aggregate-v1",
    status: entries.length === 322 ? "P0_COMPLETE" : "BOUNDED_NOT_COMPLETE",
    reviewed: entries.length,
    unprocessed: 322 - entries.length,
    before: { ...before, anchors: ctx.baseline.anchors.length },
    after: { ...after, anchors: dataset.anchors.length },
    added: Object.fromEntries(
      Object.keys(before).map((k) => [k, after[k] - before[k]]),
    ),
    anchorsAdded: dataset.anchors.length - ctx.baseline.anchors.length,
    p0Counts: counts(p0),
    p0RemainingNulls:
      322 * 43 - p0.reduce((n, r) => n + r.provenance.length, 0),
    corpusRemainingNulls: 10369 * 43 - after.nonNull,
    errors: dataset.errors,
    blocked: p0.filter((r) => r.status.startsWith("REVIEW_BLOCKED")).length,
    identityRegistryHashesBefore: ctx.population.identityHashes,
    identityRegistryHashesAfter: Object.fromEntries(
      Object.keys(ctx.population.identityHashes).map((p) => [
        p,
        hash(read(ctx.root, p)),
      ]),
    ),
    formalAllocationsChanged: 0,
    registryRebindings: 0,
    productionWrites: 0,
    providerCalls: 0,
    sourceDiscovery: 0,
    p1Started: false,
    independentHumanGold: false,
  };
}
export function run(opts = {}, root = ROOT) {
  const ctx = load(root, opts.cache),
    results = [];
  assert(
    !opts.batch || ["P0-0001", "P0-0002"].includes(opts.batch),
    "Unknown batch",
  );
  const entries = ctx.evidence.entries;
  const dataset = compile(ctx, entries),
    files = sidecars(ctx, dataset);
  const selected = ["P0-0001", "P0-0002"].filter(
    (id) => !opts.batch || opts.batch === id,
  );
  if (opts.dryRun)
    return {
      mode: "DRY_RUN",
      writes: 0,
      selected,
      reviewed: entries.length,
      complete: false,
    };
  for (const id of selected) {
    const plan = batchPlan(ctx, dataset, entries, id, files),
      startedAt = new Date().toISOString();
    if (id === "P0-0002")
      assert(
        receiptMatches(
          root,
          batchPlan(ctx, dataset, entries, "P0-0001", files),
          files,
        ),
        "P0-0001 must PASS before P0-0002",
      );
    const valid = receiptMatches(root, plan, files);
    if (opts.check) {
      assert(valid, `Invalid receipt/output ${id}`);
      results.push({ id, status: "CHECK_PASS" });
      continue;
    }
    if (opts.resume && valid) {
      results.push({ id, status: "SKIPPED_IDENTICAL" });
      continue;
    }
    // Rebuild from frozen inputs, never parse corrupted sidecars as authoritative data.
    // Retain other completed batches only when their full input/receipt metadata still matches.
    const committed = new Set(plan.keys);
    for (const other of ["P0-0001", "P0-0002"].filter((x) => x !== id)) {
      try {
        const otherPlan = batchPlan(ctx, dataset, entries, other, files);
        const {
          startedAt: started,
          completedAt: completed,
          ...metadata
        } = object(root, receiptPath(other));
        if (
          Number.isFinite(Date.parse(started)) &&
          Date.parse(completed) >= Date.parse(started) &&
          json(metadata) === json(otherPlan.receipt)
        ) {
          for (const key of otherPlan.keys) committed.add(key);
        }
      } catch {
        /* Absent/incomplete other batch must not be materialized. */
      }
    }
    const currentFiles = sidecars(
      ctx,
      compile(
        ctx,
        entries.filter((e) => committed.has(e.candidateKey)),
      ),
    );
    for (const [path, text] of currentFiles)
      if (!same(root, path, text)) atomic(root, path, text);
    for (const [p, t] of plan.outputs) atomic(root, p, t);
    // Read back projected outputs before publishing the last-written receipt.
    for (const o of plan.receipt.sidecarProjections)
      assert(
        hash(
          projection(read(root, o.path).toString(), plan.keys, plan.refs),
        ) === o.sha256,
        "Batch write/readback failure",
      );
    atomic(
      root,
      receiptPath(id),
      json({
        ...plan.receipt,
        startedAt,
        completedAt: new Date().toISOString(),
      }),
    );
    results.push({ id, status: "WRITTEN_QA_PASS" });
  }
  if (!opts.batch) {
    assert(entries.length === 322, "Incomplete full P0");
    for (const [p, t] of files)
      assert(same(root, p, t), "Current sidecar drift " + p);
    const report = coverage(ctx, dataset, entries),
      queue = dataset.rows
        .filter((r) => r.p0Review && r.status !== "REVIEWED_PARTIAL")
        .map((r) => ({
          candidateKey: r.candidateKey,
          status: r.status,
          reason: r.p0Review.reviewRationale,
        }));
    const extras = new Map([
      [`${QA}/aggregate.json`, json(report)],
      [`${QA}/review-error-queue.jsonl`, jsonl([...queue, ...dataset.errors])],
    ]);
    const manifest = {
      schemaVersion: "task070-current-checkpoint-v1",
      upstreamHead: ctx.population.upstreamHead,
      inputHashes: [
        ...ctx.hashes,
        { path: EVIDENCE, sha256: hash(read(root, EVIDENCE)) },
      ],
      outputs: [...files, ...extras].map(([path, text]) => ({
        path,
        sha256: hash(text),
      })),
      historicalAudit:
        "docs/qa/TASK-068 remains immutable; current sidecars are certified by this checkpoint",
      candidateCount: 10369,
      reviewed: 322,
      p0Batches: 2,
    };
    extras.set(CURRENT, json(manifest));
    if (opts.check) {
      for (const [p, t] of extras)
        assert(same(root, p, t), "Aggregate checkpoint drift " + p);
    } else
      for (const [p, t] of extras) if (!same(root, p, t)) atomic(root, p, t);
  }
  return {
    status: opts.batch ? "BOUNDED_CHECKPOINT" : "P0_COMPLETE",
    rawLocatorsVerified: ctx.rawVerified,
    results,
  };
}
export function parseArgs(args) {
  const o = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (["--check", "--resume", "--dry-run"].includes(a))
      o[a === "--dry-run" ? "dryRun" : a.slice(2)] = true;
    else if (["--batch", "--cache"].includes(a)) {
      assert(args[i + 1] && !args[i + 1].startsWith("--"), "Missing " + a);
      o[a.slice(2)] = args[++i];
    } else throw Error("Unknown argument " + a);
  }
  assert(!(o.check && (o.resume || o.dryRun)), "Incompatible modes");
  return o;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    console.log(json(run(parseArgs(process.argv.slice(2)))));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
