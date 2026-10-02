import { loadAcceptanceInputs } from "./task-086-acceptance-inputs.mjs";
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
  const proofInputs = loadAcceptanceInputs(
    path.join(root, "data/transport/network"),
  );
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
    const identities = path.join(scratch, "s12-identities.jsonl");
    const identityExtraction = spawnSync(
      process.platform === "win32" ? "python" : "python3",
      [
        "-X",
        "utf8",
        path.join(root, "tools/transport/task-086-extract-identities.py"),
        "--output",
        identities,
      ],
      { encoding: "utf8" },
    );
    assert.equal(identityExtraction.status, 0, identityExtraction.stderr);
    assert.equal(
      hash(fs.readFileSync(identities)),
      hash(
        fs.readFileSync(
          path.join(
            root,
            "data/transport/network/research/s12-identities.jsonl",
          ),
        ),
      ),
      "Raw S12 identity extraction differs",
    );
    const airportIdentities = path.join(scratch, "c28-identities.jsonl");
    const airportExtraction = spawnSync(
      process.platform === "win32" ? "python" : "python3",
      [
        "-X",
        "utf8",
        path.join(root, "tools/transport/task-086-extract-airports.py"),
        "--output",
        airportIdentities,
      ],
      { encoding: "utf8" },
    );
    assert.equal(airportExtraction.status, 0, airportExtraction.stderr);
    assert.equal(
      hash(fs.readFileSync(airportIdentities)),
      hash(
        fs.readFileSync(
          path.join(
            root,
            "data/transport/network/research/c28-identities.jsonl",
          ),
        ),
      ),
      "Raw C28 identity extraction differs",
    );
    const highwayIdentities = path.join(scratch, "p36-identities.jsonl");
    const highwayExtraction = spawnSync(
      process.platform === "win32" ? "python" : "python3",
      [
        "-X",
        "utf8",
        path.join(root, "tools/transport/task-086-extract-highway-stops.py"),
        "--output",
        highwayIdentities,
      ],
      { encoding: "utf8" },
    );
    assert.equal(highwayExtraction.status, 0, highwayExtraction.stderr);
    assert.equal(
      hash(fs.readFileSync(highwayIdentities)),
      hash(
        fs.readFileSync(
          path.join(
            root,
            "data/transport/network/research/p36-identities.jsonl",
          ),
        ),
      ),
      "Raw P36 identity extraction differs",
    );
    for (const selection of [
      "toei-train-selection.json",
      "toei-tram-liner-selection.json",
    ]) {
      const requestPath = path.join(
        root,
        "data/transport/network/research",
        selection,
      );
      const request = readJson(requestPath);
      const railPhase = request.phaseId + ".json";
      const railExtraction = spawnSync(
        process.platform === "win32" ? "python" : "python3",
        [
          "-X",
          "utf8",
          path.join(root, "tools/transport/task-086-extract-rail-gtfs.py"),
          requestPath,
          "--archive",
          path.join(
            root,
            "data/transport/network/sources/raw/toei-train-20261001.zip",
          ),
          "--output",
          path.join(scratch, railPhase),
        ],
        { encoding: "utf8" },
      );
      assert.equal(railExtraction.status, 0, railExtraction.stderr);
      const extractedPhase = readJson(path.join(scratch, railPhase));
      const retainedPhase = readJson(
        path.join(root, "data/transport/network/research/phases", railPhase),
      );
      assert.equal(retainedPhase.phaseId, request.phaseId);
      assert.deepEqual(
        retainedPhase.facts.filter(
          (fact) =>
            fact.kind === "service" && fact.sourceUrl === request.sourceUrl,
        ),
        extractedPhase.facts,
        "Raw rail GTFS trip extraction differs: " + selection,
      );
    }
    const busIdentities = path.join(scratch, "p11-identities.jsonl");
    const busExtraction = spawnSync(
      process.platform === "win32" ? "python" : "python3",
      [
        "-X",
        "utf8",
        path.join(root, "tools/transport/task-086-extract-bus-stops.py"),
        "--output",
        busIdentities,
      ],
      { encoding: "utf8" },
    );
    assert.equal(busExtraction.status, 0, busExtraction.stderr);
    assert.equal(
      hash(fs.readFileSync(busIdentities)),
      hash(
        fs.readFileSync(
          path.join(
            root,
            "data/transport/network/research/p11-identities.jsonl",
          ),
        ),
      ),
      "Raw selected P11 identity extraction differs",
    );
    const selectedGtfsPackages = [];
    for (const phaseFile of fs
      .readdirSync(path.join(root, "data/transport/network/research/phases"))
      .filter((n) => n.endsWith(".json"))
      .sort()) {
      const phase = readJson(
        path.join(root, "data/transport/network/research/phases", phaseFile),
      );
      for (const binding of phase.licensedGtfsPackages ?? []) {
        const packagePath = path.join(
          root,
          "data/transport/network/sources",
          binding.packageFile,
        );
        const pack = readJson(packagePath);
        const extractedPackage = path.join(scratch, binding.packageFile);
        const extraction = spawnSync(
          process.platform === "win32" ? "python" : "python3",
          [
            "-X",
            "utf8",
            path.join(
              root,
              "tools/transport/task-086-extract-selected-gtfs.py",
            ),
            path.join(
              root,
              "data/transport/network",
              pack.selection.requestPath,
            ),
            "--archive",
            path.join(
              root,
              "data/transport/network",
              pack.source.retainedArchive,
            ),
            "--output",
            extractedPackage,
          ],
          { encoding: "utf8" },
        );
        assert.equal(extraction.status, 0, extraction.stderr);
        assert.equal(
          hash(fs.readFileSync(extractedPackage)),
          hash(fs.readFileSync(packagePath)),
          "Selected GTFS extraction differs: " + binding.packageFile,
        );
        selectedGtfsPackages.push(binding.packageFile);
      }
    }
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
    assert.equal(
      loadAcceptanceInputs(path.join(root, "data/transport/network"))
        .proofInputSha256,
      proofInputs.proofInputSha256,
      "Rebuild mutated independent proof input",
    );
    assert.deepEqual(
      readRows(path.join(firstPath, "fixpoint-proofs.jsonl")),
      proofInputs.proofs,
      "Valid proof input lost in clean rebuild",
    );
    const receipt = {
      exceptionProofInputPreserved: "PASS",
      task: "TASK-086-B",
      status: "PASS",
      rawGtfsExtraction: "PASS",
      rawS12IdentityExtraction: "PASS",
      rawC28IdentityExtraction: "PASS",
      rawP36IdentityExtraction: "PASS",
      rawSelectedP11IdentityExtraction: "PASS",
      rawRailGtfsTripExtraction: "PASS",
      rawSelectedGtfsExtraction: {
        status: "PASS",
        packages: selectedGtfsPackages,
      },
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
          path.join(root, "tests/task-086-b-autonomous-remediation.test.mjs"),
          path.join(root, "tests/task-086-b-selected-gtfs.test.mjs"),
          path.join(root, "tests/task-086-b-stage-closeout.test.mjs"),
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
        proofInputs.proofs,
        (p) => fs.readFileSync(path.join(root, p)),
        {
          ...unverifiedGate.integrity,
          deterministicRebuild: "PASS",
          resumeCorruptionInvalidation: "PASS",
        },
        readRows(path.join(output, "next-source-actions.jsonl")),
        proofInputs.context,
      );
      gate.integrityEvidence = "docs/qa/TASK-086-B/deterministic-rebuild.json";
      atomicWrite(
        path.join(output, "final-acceptance-gate.json"),
        jsonBytes(gate),
      );
      const state = readJson(path.join(output, "adaptive-model-state.json"));
      Object.assign(state, {
        converged: gate.terminal,
        status: gate.status,
        remainingOrdinaryDiscovery: gate.ordinaryDiscoveryRemaining,
        globalTopologyDiscoveryFixpoint: gate.globalTopologyDiscoveryFixpoint,
        stopReason: gate.terminal ? gate.status : null,
        executionState: gate.terminal
          ? gate.status
          : "SOURCE_REMEDIATION_REQUIRED",
      });
      atomicWrite(
        path.join(output, "adaptive-model-state.json"),
        jsonBytes(state),
      );
      const manifest = readJson(path.join(output, "manifest.json"));
      manifest.status = gate.status;
      manifest.artifactHashes["adaptive-model-state.json"] = hash(
        fs.readFileSync(path.join(output, "adaptive-model-state.json")),
      );
      manifest.artifactHashes["final-acceptance-gate.json"] = hash(
        fs.readFileSync(path.join(output, "final-acceptance-gate.json")),
      );
      atomicWrite(path.join(output, "manifest.json"), jsonBytes(manifest));
    }
    const after = loadAcceptanceInputs(
      path.join(root, "data/transport/network"),
    );
    assert.equal(
      after.proofInputSha256,
      proofInputs.proofInputSha256,
      "Rebuild mutated independent exception proofs",
    );
    assert.deepEqual(
      readRows(path.join(firstPath, "fixpoint-proofs.jsonl")),
      proofInputs.proofs,
      "Proof materialization lost reviewed input",
    );
    receipt.exceptionProofInputPreserved = "PASS";
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
