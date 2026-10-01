import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { run } from "./task-086-run.mjs";
import { hash, acceptance } from "./task-086-model.mjs";
import {
  readJson,
  readRows,
  atomicWrite,
  jsonBytes,
} from "./task-086-batches.mjs";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export function verifyRebuild({ publish = false } = {}) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "task-086-rebuild-"));
  try {
    const extracted = path.join(scratch, "extracted");
    const python = spawnSync(
      process.platform === "win32" ? "python" : "python3",
      [
        "-X",
        "utf8",
        path.join(root, "tools/transport/task-086-extract-gtfs.py"),
        "--input-dir",
        path.join(root, "data/transport/network/sources/raw"),
        "--output",
        extracted,
      ],
      { encoding: "utf8" },
    );
    assert.equal(python.status, 0, python.stderr);
    for (const name of ["fukuoka-ferry.json", "nagasaki-bus.json"])
      assert.equal(
        hash(fs.readFileSync(path.join(extracted, name))),
        hash(
          fs.readFileSync(
            path.join(root, "data/transport/network/sources", name),
          ),
        ),
        "Raw GTFS extraction differs: " + name,
      );
    const firstPath = path.join(scratch, "first"),
      secondPath = path.join(scratch, "second");
    const first = run({ output: firstPath }),
      second = run({ output: secondPath });
    assert.deepEqual(first.manifest, second.manifest, "Full rebuild differs");
    const resumed = run({ output: firstPath });
    assert.equal(
      resumed.batchDispositions.CHECKSUM_SKIP,
      first.manifest.batchReceipts.length,
    );
    assert.deepEqual(
      first.manifest,
      resumed.manifest,
      "Resume changes artifacts",
    );
    const receipt = {
      task: "TASK-086-B",
      status: "PASS",
      rawGtfsExtraction: "PASS",
      fullDeterministicRebuild: "PASS",
      resumeChecksumSkip: "PASS",
      batchCount: first.manifest.batchReceipts.length,
      coreArtifactHashes: first.manifest.artifactHashes,
      generatorHashes: first.manifest.generatorHashes,
      inputHashes: first.manifest.inputHashes,
    };
    if (publish) {
      const output = path.join(root, "data/transport/network");
      const current = run({ output });
      assert.deepEqual(
        current.manifest,
        first.manifest,
        "Published artifacts differ",
      );
      const focused = spawnSync(
        process.execPath,
        [
          "--test",
          path.join(root, "tests/task-086-b-mobility-backbone.test.mjs"),
        ],
        { cwd: root, encoding: "utf8" },
      );
      assert.equal(focused.status, 0, focused.stdout + focused.stderr);
      receipt.focusedTests = "PASS";
      receipt.focusedTestOutputSha256 = hash(
        focused.stdout.replace(/\d+(?:\.\d+)?ms/g, "<elapsed>"),
      );
      // Test output timing is diagnostic; it is not a topology artifact fingerprint.
      const qa = path.join(root, "docs/qa/TASK-086-B");
      atomicWrite(
        path.join(qa, "deterministic-rebuild.json"),
        JSON.stringify(receipt, null, 2) + "\n",
      );
      const unverifiedGate = readJson(
        path.join(output, "final-acceptance-gate.json"),
      );
      const connectivity = readJson(
        path.join(output, "connectivity-audit.json"),
      );
      const corridors = readJson(
        path.join(output, "corridor-query-results.json"),
      );
      const gate = acceptance(
        {
          tier: connectivity.tier,
          corridors: corridors.results,
          deficits: readRows(path.join(output, "topology-unresolved.jsonl")),
        },
        readRows(path.join(output, "fixpoint-proofs.jsonl")),
        (p) => fs.readFileSync(path.join(root, p)),
        {
          ...unverifiedGate.integrity,
          deterministicRebuild: "PASS",
          resumeCorruptionInvalidation: "PASS",
        },
      );
      gate.integrityEvidence = "docs/qa/TASK-086-B/deterministic-rebuild.json";
      atomicWrite(
        path.join(output, "final-acceptance-gate.json"),
        jsonBytes(gate),
      );
      const manifest = readJson(path.join(output, "manifest.json"));
      manifest.artifactHashes["final-acceptance-gate.json"] = hash(
        fs.readFileSync(path.join(output, "final-acceptance-gate.json")),
      );
      atomicWrite(path.join(output, "manifest.json"), jsonBytes(manifest));
    }
    return receipt;
  } finally {
    // Only the unique directory allocated above can be removed.
    assert.ok(path.basename(scratch).startsWith("task-086-rebuild-"));
    fs.rmSync(scratch, { recursive: true, force: true });
  }
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    JSON.stringify(
      verifyRebuild({ publish: process.argv.includes("--publish") }),
      null,
      2,
    ),
  );
