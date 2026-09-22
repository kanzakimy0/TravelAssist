import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
const root = process.cwd();
const taskDir = path.join(
  root,
  "data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion",
);
const qaDir = path.join(root, "docs/qa/TASK-075-B");
const sha = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const readJsonl = (file) =>
  fs.readFileSync(file, "utf8").split(/\r?\n/).filter(Boolean).map(JSON.parse);
function packageRows(input, outDir, prefix, size) {
  fs.mkdirSync(outDir, { recursive: true });
  const rows = readJsonl(input);
  const files = [];
  for (let i = 0; i < rows.length; i += size) {
    const batchId = String(Math.floor(i / size) + 1).padStart(3, "0");
    const file = path.join(outDir, `${prefix}-${batchId}.jsonl`);
    fs.writeFileSync(
      file,
      rows
        .slice(i, i + size)
        .map((x) => JSON.stringify(x))
        .join("\n") + "\n",
      "utf8",
    );
    files.push({
      file: path.relative(root, file).replaceAll("\\", "/"),
      candidateCount: Math.min(size, rows.length - i),
      sha256: sha(file),
      bytes: fs.statSync(file).size,
    });
  }
  return {
    source: path.relative(root, input).replaceAll("\\", "/"),
    rowCount: rows.length,
    batchSize: size,
    batchCount: files.length,
    files,
  };
}
const identity = packageRows(
  path.join(taskDir, "identity-decisions-v2.3.jsonl"),
  path.join(taskDir, "identity-v2.3-batches"),
  "identity",
  200,
);
const decisions = packageRows(
  path.join(taskDir, "43d-decisions-v2.3.jsonl"),
  path.join(taskDir, "43d-v2.3-batches"),
  "43d",
  200,
);
const manifest = {
  schemaVersion: "task-075-b-v2.3-batch-package",
  identity,
  decisions,
  noOriginalInspectFile: true,
  noRegistryRebind: true,
  noMasterCodeAllocation: true,
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(taskDir, "v2.3-batch-package.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8",
);
fs.writeFileSync(
  path.join(qaDir, "v2.3-batch-package.json"),
  JSON.stringify(manifest, null, 2) + "\n",
  "utf8",
);
console.log(JSON.stringify(manifest, null, 2));
