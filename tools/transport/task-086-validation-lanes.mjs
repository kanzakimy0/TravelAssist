import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { run } from "./task-086-run.mjs";
import { hash } from "./task-086-model.mjs";
import {
  readJson,
  readRows,
  atomicWrite,
  executeBatches,
} from "./task-086-batches.mjs";
import { loadAcceptanceInputs } from "./task-086-acceptance-inputs.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const network = path.join(root, "data/transport/network");
export function validationBinding() {
  const manifest = readJson(path.join(network, "manifest.json"));
  const bound = {};
  for (const [name, expected] of Object.entries({
    ...manifest.inputHashes,
    ...manifest.generatorHashes,
  })) {
    const actual = hash(fs.readFileSync(path.join(root, name)));
    assert.equal(
      actual,
      expected,
      "Frozen input/code binding changed: " + name,
    );
    bound[name] = actual;
  }
  for (const name of [
    ".nvmrc",
    "tools/transport/task-086-validation.mjs",
    "tests/task-086-publication-recovery.test.mjs",
    "package.json",
    "package-lock.json",
    ".gitattributes",
    ".github/workflows/quality-gate.yml",
    "tools/transport/task-086-verify.mjs",
    "tools/transport/task-086-validation-lanes.mjs",
    "tools/qa/task-086-regression-lanes.mjs",
    "tests/task-086-b-rebuild.test.mjs",
  ])
    bound[name] = hash(fs.readFileSync(path.join(root, name)));
  const checkoutSha = execFileSync(
    "git",
    ["-c", "safe.directory=" + root.replaceAll("\\", "/"), "rev-parse", "HEAD"],
    { cwd: root, encoding: "utf8" },
  ).trim();
  if (process.env.GITHUB_SHA)
    assert.equal(
      checkoutSha,
      process.env.GITHUB_SHA,
      "Validation must check out the exact event HEAD",
    );
  return {
    checkoutSha,
    runId: process.env.GITHUB_RUN_ID ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    inputCodeSha256: hash(bound),
    bound,
    nodeVersion: process.version,
    platform: process.platform,
    proofInputSha256: loadAcceptanceInputs(network).proofInputSha256,
  };
}
export function assertLaneBinding(record, binding) {
  assert.equal(record.status, "PASS", "Lane did not complete");
  assert.deepEqual(
    record.binding,
    binding,
    "Lane HEAD/input/code/environment differs",
  );
}
function sealGraph(output, manifest) {
  const actual = {};
  for (const [name, expected] of Object.entries(manifest.artifactHashes)) {
    actual[name] = hash(fs.readFileSync(path.join(output, name)));
    assert.equal(actual[name], expected, "Generated artifact differs: " + name);
  }
  for (const receipt of manifest.batchReceipts) {
    const file = readJson(
      path.join(output, "batch-receipts", receipt.batchId + ".json"),
    );
    const { receiptSha256, ...unsigned } = file;
    assert.equal(hash(unsigned), receiptSha256);
    assert.equal(
      hash(
        fs.readFileSync(
          path.join(output, "batches", receipt.batchId + ".json"),
        ),
      ),
      receipt.outputSha256,
    );
    assert.deepEqual(file, receipt);
  }
  return actual;
}
export function assertSerializedManifestStable(beforeBytes, afterBytes) {
  assert.deepEqual(
    afterBytes,
    beforeBytes,
    "Resume changes serialized full manifest",
  );
  return JSON.parse(afterBytes.toString("utf8"));
}
export function graphLane(lane, directory) {
  assert.ok(["first", "second", "resume"].includes(lane));
  const binding = validationBinding();
  const startedAt = new Date().toISOString();
  const output = path.join(directory, lane === "resume" ? "first" : lane);
  let before;
  let beforeBytes;
  if (lane === "resume") {
    const first = readJson(path.join(directory, "first.receipt.json"));
    assertLaneBinding(first, binding);
    beforeBytes = fs.readFileSync(path.join(output, "manifest.json"));
    before = JSON.parse(beforeBytes.toString("utf8"));
    sealGraph(output, before);
  } else
    assert.ok(
      !fs.existsSync(output),
      "Clean lane output must not already exist",
    );
  const result = run({ output });
  const manifestBytes = fs.readFileSync(path.join(output, "manifest.json"));
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  if (lane === "resume") {
    assertSerializedManifestStable(beforeBytes, manifestBytes);
    assert.deepEqual(manifest, before, "Resume changes full manifest");
    assert.equal(
      result.batchDispositions.CHECKSUM_SKIP,
      before.batchReceipts.length,
    );
  }
  const artifactHashes = sealGraph(output, manifest);
  const proofs = loadAcceptanceInputs(network);
  assert.equal(proofs.proofInputSha256, binding.proofInputSha256);
  assert.deepEqual(
    readRows(path.join(output, "fixpoint-proofs.jsonl")),
    proofs.proofs,
  );
  const record = {
    lane,
    status: "PASS",
    binding,
    startedAt,
    endedAt: new Date().toISOString(),
    manifestSha256: hash(fs.readFileSync(path.join(output, "manifest.json"))),
    artifactHashes,
    batchDispositions: result.batchDispositions,
    exceptionProofInputPreserved: "PASS",
  };
  atomicWrite(
    path.join(directory, lane + ".receipt.json"),
    JSON.stringify(record, null, 2) + "\n",
  );
  return record;
}
export function corruptionProbe(directory) {
  // Exercise the real batch validator with a real ordinary service batch, in isolated scratch.
  const first = path.join(directory, "first");
  const sources = new Map(
    readJson(path.join(first, "source-rights.json")).sources.map((x) => [
      x.sourceId,
      x,
    ]),
  );
  const evidence = new Map(
    readRows(path.join(first, "topology-evidence.jsonl")).map((x) => [
      x.evidenceId,
      x,
    ]),
  );
  const batch = fs
    .readdirSync(path.join(first, "batches"))
    .sort()
    .map((n) => readJson(path.join(first, "batches", n)))
    .find(
      (x) =>
        x.input.servicePatternInput?.callingNodes &&
        !x.input.servicePatternInput.accessContract &&
        !x.input.dynamicODInput,
    );
  assert.ok(batch, "A real ordinary service batch is required");
  const input = batch.input;
  const group = {
    groupId: input.groupId,
    sources: input.sourceManifest,
    nodes: input.inputNodeManifest,
    pattern: input.servicePatternInput,
    edges: batch.edges,
    generatorSha256: input.generatorSha256,
    nextActionDeficitSummary: batch.nextActionDeficitSummary,
  };
  const context = {
    sources,
    evidence,
    patternById: new Map([[group.pattern.servicePatternId, group.pattern]]),
  };
  const output = path.join(directory, "corruption-probe");
  assert.ok(!fs.existsSync(output));
  const original = executeBatches(output, [group], {
    validationContext: context,
  });
  const batchId = original.receipts[0].batchId;
  const file = path.join(output, "batch-receipts", batchId + ".json");
  fs.writeFileSync(file, "deliberately-corrupt");
  assert.throws(
    () => executeBatches(output, [group], { validationContext: context }),
    /CORRUPTED_RECEIPT_OR_BATCH/,
  );
  const repaired = executeBatches(output, [group], {
    validationContext: context,
    repair: true,
    rerunBatch: batchId,
  });
  assert.equal(repaired.results[0].disposition, "REPAIRED_EXPLICIT_BATCH");
  assert.deepEqual(repaired.receipts, original.receipts);
  assert.equal(
    executeBatches(output, [group], { validationContext: context }).results[0]
      .disposition,
    "CHECKSUM_SKIP",
  );
  return {
    status: "PASS",
    batchId,
    detection: "PASS",
    explicitRepair: "PASS",
    repairedChecksumReplay: "PASS",
  };
}
export function verifyCompletedLanes(
  directory,
  { verifyPublished = false, receiptPath = null, publish = false } = {},
) {
  assert.equal(
    publish,
    false,
    "Sharded proof must not mutate frozen published inputs",
  );
  const binding = validationBinding();
  const records = Object.fromEntries(
    ["extract", "first", "second", "resume"].map((lane) => {
      const record = readJson(path.join(directory, lane + ".receipt.json"));
      assert.equal(record.lane, lane);
      assertLaneBinding(record, binding);
      return [lane, record];
    }),
  );
  const firstPath = path.join(directory, "first"),
    secondPath = path.join(directory, "second");
  const first = readJson(path.join(firstPath, "manifest.json"));
  const second = readJson(path.join(secondPath, "manifest.json"));
  assert.deepEqual(first, second, "Full rebuild differs");
  for (const [lane, output] of [
    ["first", firstPath],
    ["second", secondPath],
    ["resume", firstPath],
  ]) {
    assert.equal(
      hash(fs.readFileSync(path.join(output, "manifest.json"))),
      records[lane].manifestSha256,
    );
    assert.deepEqual(
      sealGraph(output, lane === "second" ? second : first),
      records[lane].artifactHashes,
    );
  }
  assert.equal(
    records.resume.batchDispositions.CHECKSUM_SKIP,
    first.batchReceipts.length,
  );
  const proofInputs = loadAcceptanceInputs(network);
  assert.deepEqual(
    readRows(path.join(firstPath, "fixpoint-proofs.jsonl")),
    proofInputs.proofs,
  );
  assert.deepEqual(
    readRows(path.join(secondPath, "fixpoint-proofs.jsonl")),
    proofInputs.proofs,
  );
  const receipt = {
    ...records.extract.extraction,
    task: "TASK-086-B",
    status: "PASS",
    binding,
    verifiedAt: new Date().toISOString(),
    verifierSha256: hash(
      fs.readFileSync(path.join(root, "tools/transport/task-086-verify.mjs")),
    ),
    scopeId: readJson(path.join(network, "research/stage-scope.json")).scopeId,
    fullDeterministicRebuild: "PASS",
    resumeChecksumSkip: "PASS",
    exceptionProofInputPreserved: "PASS",
    batchCount: first.batchReceipts.length,
    coreArtifactHashes: first.artifactHashes,
    generatorHashes: first.generatorHashes,
    inputHashes: first.inputHashes,
    laneReceipts: records,
  };
  if (verifyPublished) {
    const published = readJson(path.join(network, "manifest.json"));
    assert.deepEqual(first.inputHashes, published.inputHashes);
    assert.deepEqual(first.generatorHashes, published.generatorHashes);
    assert.deepEqual(
      sealGraph(network, published),
      first.artifactHashes,
      "Published bytes differ",
    );
    receipt.publishedArtifactComparison = "PASS";
  }
  const proofFile = path.join(directory, "corruption.receipt.json");
  let corruption;
  if (fs.existsSync(proofFile)) {
    corruption = readJson(proofFile);
    assertLaneBinding(corruption, binding);
  } else {
    corruption = {
      lane: "corruption",
      status: "PASS",
      binding,
      ...corruptionProbe(directory),
    };
    atomicWrite(proofFile, JSON.stringify(corruption, null, 2) + "\n");
  }
  assert.equal(corruption.detection, "PASS");
  assert.equal(corruption.explicitRepair, "PASS");
  assert.equal(corruption.repairedChecksumReplay, "PASS");
  receipt.resumeCorruptionInvalidation = "PASS";
  receipt.corruptionProof = corruption;
  if (receiptPath)
    atomicWrite(receiptPath, JSON.stringify(receipt, null, 2) + "\n");
  return receipt;
}
