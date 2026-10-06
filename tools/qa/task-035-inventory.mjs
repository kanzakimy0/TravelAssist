import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { regressionInventory } from "./task-086-regression-lanes.mjs";

export const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
export const qa = "docs/qa/TASK-035/phase-2";
export const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
export const fileHash = (file) =>
  hash(fs.readFileSync(path.resolve(root, file)));
export function validatePartition(files, lanes) {
  assert.ok(files.length, "EMPTY_SELECTION");
  assert.equal(new Set(files).size, files.length, "DUPLICATE_FILE");
  const assigned = Object.values(lanes).flat();
  assert.equal(
    new Set(assigned).size,
    assigned.length,
    "DUPLICATE_LANE_MEMBER",
  );
  assert.deepEqual(
    [...assigned].sort(),
    [...files].sort(),
    "OMITTED_OR_EXTRA_FILE",
  );
}
export function discover(directory) {
  return fs
    .readdirSync(directory)
    .filter((p) => p.endsWith(".test.mjs"))
    .sort();
}
export function inventory() {
  const legacy = regressionInventory();
  validatePartition(legacy.files, legacy.lanes);
  const policy = readJson(path.join(root, qa, "execution-policy.json"));
  const entries = legacy.files.map((file) => {
    const review = policy.required.find((r) => r.path === file);
    assert.ok(review, `UNREVIEWED_REQUIRED_ENTRY: ${file}`);
    assert.equal(review.sha256, fileHash(file), `REVIEW_HASH_DRIFT: ${file}`);
    return {
      path: file,
      sha256: fileHash(file),
      lane: Object.keys(legacy.lanes).find((lane) =>
        legacy.lanes[lane].includes(file),
      ),
      profile: review.profile,
      owner: review.owner,
      evidence: review.evidence,
    };
  });
  assert.deepEqual(
    policy.required.map((r) => r.path).sort(),
    legacy.files,
    "POLICY_OMISSION_OR_DUPLICATE",
  );
  const indirect = policy.indirect.map((edge) => {
    assert.ok(legacy.files.includes(edge.parent), "INDIRECT_PARENT_MISSING");
    assert.ok(
      fs
        .readFileSync(path.join(root, edge.parent), "utf8")
        .includes(path.basename(edge.path)),
      "INDIRECT_EDGE_DRIFT",
    );
    return {
      ...edge,
      sha256: fileHash(edge.path),
      parentSha256: fileHash(edge.parent),
    };
  });
  assert.equal(
    new Set(indirect.map((e) => e.path)).size,
    indirect.length,
    "DUPLICATE_INDIRECT",
  );
  return {
    schemaVersion: 1,
    canonicalOwner: "A",
    executionSupport: "B",
    selection:
      "Current top-level tests/*.test.mjs; original TASK-086 round-robin partition",
    entries,
    indirect,
    lanes: legacy.lanes,
    counts: {
      directFiles: entries.length,
      indirectFiles: indirect.length,
      uniqueSelectedFiles: new Set([
        ...legacy.files,
        ...indirect.map((e) => e.path),
      ]).size,
      cases: null,
    },
  };
}
export function checkInventory() {
  const actual = inventory();
  assert.deepEqual(
    readJson(path.join(root, qa, "test-inventory.json")),
    actual,
    "INVENTORY_DRIFT",
  );
  return actual;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.includes("--write"))
    fs.writeFileSync(
      path.join(root, qa, "test-inventory.json"),
      JSON.stringify(inventory(), null, 2) + "\n",
    );
  else {
    assert.ok(
      process.argv.includes("--check"),
      "Use --check (read-only) or --write",
    );
    console.log(
      JSON.stringify({ status: "PASS", counts: checkInventory().counts }),
    );
  }
}
