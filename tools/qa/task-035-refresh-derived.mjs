import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createHash } from "node:crypto";

// This orchestrator only runs existing certification algorithms in a staging
// checkout. No production input, historical input, or manual review is writable.
const closeout = "docs/qa/TASK-086/readmittable-closeout";
const repair = "docs/qa/TASK-086/certification-engine-repair";
const closeoutNames = [
  "route-disabled.jsonl",
  "root-dispositions.jsonl",
  "routing-eligibility.json",
  "closeout-summary.json",
  "terminal-entities.jsonl-index.json",
  ...[
    "nodes.jsonl",
    "edges.jsonl",
    "transfers.jsonl",
    "service-patterns.jsonl",
    "evidence.jsonl",
    "sources.json",
  ].map((name) => "route-enabled/" + name),
];
const repairNames = [
  "quarantine-recertification-diff.json",
  "corridor-cut-audit.json",
  "corridor-cut-audit.md",
  "tokyo-ueno-acceptance.json",
  "source-family-recovery-summary.json",
  "remaining-original-obligations.json",
  "recertification-summary.json",
  "quarantine-recertification-diff.md",
  "certification-engine-repair-audit.json",
  "certification-engine-repair-audit.md",
];
const metadata = {
  [`${closeout}/routing-eligibility.json`]: ["inputSha256"],
  [`${closeout}/closeout-summary.json`]: ["inputSha256", "eligibilitySha256"],
  [`${closeout}/terminal-entities.jsonl-index.json`]: ["inputSha256"],
  ...Object.fromEntries(
    [
      "quarantine-recertification-diff.json",
      "corridor-cut-audit.json",
      "tokyo-ueno-acceptance.json",
      "source-family-recovery-summary.json",
      "remaining-original-obligations.json",
      "recertification-summary.json",
    ].map((name) => [`${repair}/${name}`, ["inputSha256"]]),
  ),
};
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const originalRead = fs.readFileSync.bind(fs),
  originalWrite = fs.writeFileSync.bind(fs);
const json = (file) =>
  JSON.parse(originalRead(file, "utf8").replace(/^\uFEFF/, ""));
const git = (root, ...args) =>
  execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
const inside = (root, file) => {
  const relative = path.relative(root, file);
  return (
    relative !== "" &&
    !relative.startsWith(".." + path.sep) &&
    relative !== ".." &&
    !path.isAbsolute(relative)
  );
};
const hashes = (directory) =>
  Object.fromEntries(
    fs
      .readdirSync(directory, { recursive: true, withFileTypes: true })
      .filter((e) => e.isFile())
      .map((e) => {
        const file = path.join(e.parentPath, e.name);
        return [
          path.relative(directory, file).replaceAll("\\", "/"),
          digest(originalRead(file)),
        ];
      })
      .sort(([a], [b]) => a.localeCompare(b)),
  );
function save(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  originalWrite(file, JSON.stringify(data, null, 2) + "\n");
}

export async function refresh(stagingRoot, outputRoot) {
  stagingRoot = path.resolve(stagingRoot);
  outputRoot = path.resolve(outputRoot);
  assert.ok(
    !inside(stagingRoot, outputRoot) && stagingRoot !== outputRoot,
    "Use output outside staging checkout",
  );
  assert.ok(
    !fs.existsSync(outputRoot),
    "Refuse reused generation output/cache",
  );
  assert.equal(
    git(stagingRoot, "status", "--porcelain"),
    "",
    "Staging checkout must initially be clean",
  );
  const load = (name) =>
    import(pathToFileURL(path.join(stagingRoot, "tools/transport", name)).href);
  const { certify, currentBinding } = await load("task-086-final-closeout.mjs");
  const { generateCloseout, loadEligibleGraph } = await load(
    "task-086-routing-eligibility.mjs",
  );
  const { generateRepairReport } = await load(
    "task-086-recertification-report.mjs",
  );
  const previous = originalRead(
    path.join(stagingRoot, repair, "previous-exclusions.jsonl"),
    "utf8",
  )
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean);
  const chunks = Array.from(
    { length: Math.ceil(previous.length / 1000) },
    (_, i) =>
      `quarantine-recertification-diff.${String(i).padStart(3, "0")}.jsonl`,
  );
  const planned = [
    ...closeoutNames.map((name) => ({
      path: `${closeout}/${name}`,
      generator: "generateCloseout",
    })),
    ...[...repairNames, ...chunks].map((name) => ({
      path: `${repair}/${name}`,
      generator: "generateRepairReport",
    })),
  ];
  const allowedRepair = new Set(
    planned
      .filter((e) => e.generator === "generateRepairReport")
      .map((e) => path.join(stagingRoot, e.path)),
  );
  const before = currentBinding(),
    oldOutputs = new Map(
      planned.map((e) => [
        e.path,
        originalRead(path.join(stagingRoot, e.path)),
      ]),
    );
  assert.deepEqual(before.staleManifestBindings, []);
  const reviewPath = path.join(stagingRoot, closeout, "reviewed-evidence.json");
  const review = json(reviewPath),
    capabilities = json(
      path.join(stagingRoot, repair, "capability-reviews.json"),
    );
  // The retained MLIT supplements predate engine repair. Pass A deliberately
  // excludes the later ODbL capability/terms supplement; final uses it unchanged.
  const calls = [
    {
      function: "certify",
      model: "pass-A / retained-only",
      sourceSupplements: `${closeout}/reviewed-evidence.json#/sourceSupplements`,
      capabilityReviews: [],
      reason: "Recompute engine-only pass before ODbL capability supplement",
    },
    {
      function: "generateCloseout",
      model: "final",
      sourceSupplements: `${closeout}/reviewed-evidence.json#/sourceSupplements`,
      capabilityReviews: `${repair}/capability-reviews.json#/reviews`,
      reason: "Unmodified generator uses these reviewed defaults",
    },
    {
      function: "generateRepairReport",
      model: "pass-A versus final",
      reason:
        "Two separately regenerated directories, never shared final cache",
    },
  ];
  fs.mkdirSync(outputRoot, { recursive: true });
  save(path.join(outputRoot, "input-output-plan.json"), {
    schemaVersion: 1,
    checkoutSha: git(stagingRoot, "rev-parse", "HEAD"),
    binding: before,
    calls,
    outputs: planned.map((e) => ({
      ...e,
      oldSha256: digest(oldOutputs.get(e.path)),
      allowedMetadataFields: metadata[e.path] ?? [],
    })),
    protectedInputs: [
      reviewPath,
      path.join(stagingRoot, repair, "capability-reviews.json"),
      path.join(stagingRoot, repair, "osm-terms-observation.json"),
      path.join(stagingRoot, repair, "previous-summary.json"),
      path.join(stagingRoot, repair, "previous-exclusions.jsonl"),
      path.join(stagingRoot, "docs/qa/TASK-086/final-blocker-inventory.json"),
    ].map((file) => ({
      path: path.relative(stagingRoot, file).replaceAll("\\", "/"),
      sha256: digest(originalRead(file)),
    })),
    sourceSupplementCount: review.sourceSupplements.length,
    finalCapabilityReviewCount: capabilities.reviews.length,
  });
  const reads = new Map(),
    writes = [],
    runs = [];
  fs.readFileSync = (input, ...args) => {
    const result = originalRead(input, ...args);
    if (typeof input === "string" || input instanceof URL) {
      const file = path.resolve(
        input instanceof URL ? fileURLToPath(input) : input,
      );
      if (
        inside(stagingRoot, file) &&
        !allowedRepair.has(file) &&
        !reads.has(file)
      )
        reads.set(file, digest(originalRead(file)));
    }
    return result;
  };
  fs.writeFileSync = (input, ...args) => {
    const file = path.resolve(
      input instanceof URL ? fileURLToPath(input) : input,
    );
    assert.ok(
      inside(outputRoot, file) || allowedRepair.has(file),
      `FORBIDDEN_GENERATOR_WRITE:${file}`,
    );
    writes.push(file);
    return originalWrite(input, ...args);
  };
  try {
    for (const round of ["first", "second"]) {
      const base = path.join(outputRoot, round),
        passA = path.join(base, "pass-a"),
        final = path.join(base, "final"),
        projected = path.join(base, "closeout"),
        startedAt = new Date().toISOString();
      console.log(
        JSON.stringify({
          stage: round,
          operation: "certify retained-only",
          startedAt,
        }),
      );
      const retained = certify({
        outputDirectory: passA,
        sourceSupplements: review.sourceSupplements,
        capabilityReviews: [],
      });
      console.log(
        JSON.stringify({ stage: round, operation: "generateCloseout final" }),
      );
      const result = generateCloseout({
        outputDirectory: projected,
        scratchDirectory: final,
      });
      console.log(
        JSON.stringify({ stage: round, operation: "generateRepairReport" }),
      );
      const report = generateRepairReport({
        finalDirectory: final,
        passADirectory: passA,
      });
      const copied = path.join(base, "repair");
      fs.mkdirSync(copied, { recursive: true });
      for (const name of [...repairNames, ...chunks])
        originalWrite(
          path.join(copied, name),
          originalRead(path.join(stagingRoot, repair, name)),
        );
      loadEligibleGraph(projected);
      runs.push({
        round,
        startedAt,
        endedAt: new Date().toISOString(),
        passADirectory: passA,
        finalDirectory: final,
        closeoutDirectory: projected,
        retainedResult: retained,
        finalResult: result.cert,
        repairSummary: report,
        hashes: {
          closeout: hashes(projected),
          repair: hashes(copied),
          passA: hashes(passA),
          final: hashes(final),
        },
      });
    }
  } finally {
    fs.readFileSync = originalRead;
    fs.writeFileSync = originalWrite;
  }
  const after = currentBinding();
  assert.deepEqual(after.files, before.files, "CERTIFICATION_INPUT_CHANGED");
  for (const [file, sha] of reads)
    assert.equal(
      digest(originalRead(file)),
      sha,
      `PROTECTED_READ_INPUT_CHANGED:${file}`,
    );
  const protectedStatus = git(stagingRoot, "diff", "--name-only")
    .split("\n")
    .filter(Boolean)
    .filter((file) => !allowedRepair.has(path.join(stagingRoot, file)));
  assert.deepEqual(protectedStatus, [], "UNRELATED_STAGING_WRITE");
  assert.deepEqual(
    runs[0].hashes,
    runs[1].hashes,
    "NONDETERMINISTIC_GENERATION",
  );
  const changes = [],
    semantic = [];
  for (const item of planned) {
    const name = item.path.slice(
        (item.generator === "generateCloseout" ? closeout : repair).length + 1,
      ),
      file = path.join(
        outputRoot,
        "second",
        item.generator === "generateCloseout" ? "closeout" : "repair",
        name,
      ),
      bytes = originalRead(file),
      prior = oldOutputs.get(item.path),
      fields = metadata[item.path] ?? [];
    let differences = [];
    if (!bytes.equals(prior)) {
      assert.ok(fields.length, `UNAPPROVED_SEMANTIC_BYTE_DIFF:${item.path}`);
      const old = JSON.parse(prior),
        now = JSON.parse(bytes);
      for (const field of fields) {
        if (old[field] !== now[field])
          differences.push({
            jsonPointer: "/" + field,
            before: old[field],
            after: now[field],
            reason:
              field === "inputSha256"
                ? "Existing generator recomputed currentBinding()"
                : "Hash of regenerated routing-eligibility.json",
          });
        if (field === "inputSha256")
          assert.equal(now[field], after.inputSha256);
        if (field === "eligibilitySha256")
          assert.equal(
            now[field],
            digest(
              originalRead(
                path.join(
                  outputRoot,
                  "second/closeout/routing-eligibility.json",
                ),
              ),
            ),
          );
        delete old[field];
        delete now[field];
      }
      assert.deepEqual(now, old, `BUSINESS_SEMANTICS_CHANGED:${item.path}`);
    }
    changes.push({
      ...item,
      oldSha256: digest(prior),
      newSha256: digest(bytes),
      changed: !bytes.equals(prior),
      differences,
      generatedFile: file,
    });
    semantic.push({
      path: item.path,
      result: "IDENTICAL_EXCEPT_EXPLICIT_BINDING_FIELDS",
      unchangedBytes: bytes.equals(prior),
      permittedDifferences: differences,
    });
  }
  // Full bytes bind IDs, state, rights/capabilities, required facts/reasons,
  // exact source-record hashes, directions, access conditions and metric values.
  const eligibility = json(
      path.join(outputRoot, "second/closeout/routing-eligibility.json"),
    ),
    summary = json(
      path.join(outputRoot, "second/repair/recertification-summary.json"),
    );
  save(path.join(outputRoot, "input-binding-before-after.json"), {
    schemaVersion: 1,
    before,
    after,
    identicalInputFiles: true,
    reads: [...reads].map(([file, sha256]) => ({
      path: path.relative(stagingRoot, file).replaceAll("\\", "/"),
      sha256,
      unchanged: true,
    })),
    writes: [...new Set(writes)].map((file) =>
      path.relative(stagingRoot, file).replaceAll("\\", "/"),
    ),
  });
  save(path.join(outputRoot, "generated-change-manifest.json"), {
    schemaVersion: 1,
    calls,
    runs,
    files: changes,
  });
  save(path.join(outputRoot, "semantic-diff.json"), {
    schemaVersion: 1,
    status: "PASS",
    sameProductionInputBytes: true,
    sameAllObservedGeneratorInputs: true,
    twoIndependentGenerationsIdentical: true,
    files: semantic,
    projectionSha256: eligibility.projectionSha256,
    routeEnabled: eligibility.routeEnabled,
    counts: summary.after,
    passACounts: summary.passA,
    passAFinalDistinct:
      JSON.stringify(summary.passA) !== JSON.stringify(summary.after),
    wholeBusinessPayloadsCompared: [
      "route-enabled files including evidence/sources/metrics/directions/boarding/access",
      "route-disabled and root dispositions",
      "quarantine-recertification chunks including each required fact, capability and reason",
      "national corridor directed paths and witnesses",
      "projectionSha256, source record hashes and all other unlisted fields",
    ],
    metadataPolicy: metadata,
  });
  console.log(
    JSON.stringify({
      status: "PASS",
      changed: changes.filter((e) => e.changed).map((e) => e.path),
      passA: summary.passA,
      final: summary.after,
      inputSha256: after.inputSha256,
    }),
  );
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  assert.equal(
    process.argv.length,
    4,
    "Usage: node tools/qa/task-035-refresh-derived.mjs STAGING_ROOT NEW_EXTERNAL_OUTPUT",
  );
  await refresh(process.argv[2], process.argv[3]);
}
