import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import zlib from "node:zlib";
const root = process.cwd();
const taskDir = path.join(
  root,
  "data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion",
);
const sha = (file) =>
  crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
function compressDir(inputDir, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const files = [];
  for (const name of fs
    .readdirSync(inputDir)
    .filter((x) => x.endsWith(".jsonl"))
    .sort()) {
    const source = path.join(inputDir, name);
    const out = path.join(outputDir, `${name}.gz`);
    fs.writeFileSync(out, zlib.gzipSync(fs.readFileSync(source), { level: 9 }));
    files.push({
      file: path.relative(root, out).replaceAll("\\", "/"),
      sourceRows: fs.readFileSync(source, "utf8").split(/\r?\n/).filter(Boolean)
        .length,
      sha256: sha(out),
      bytes: fs.statSync(out).size,
    });
  }
  return { batchCount: files.length, files };
}
const identity = compressDir(
  path.join(taskDir, "identity-v2.3-batches"),
  path.join(taskDir, "identity-v2.3-batches-gz"),
);
const decisions = compressDir(
  path.join(taskDir, "43d-v2.3-batches"),
  path.join(taskDir, "43d-v2.3-batches-gz"),
);
const manifest = {
  schemaVersion: "task-075-b-v2.3-compressed-batch-package",
  identity,
  decisions,
  sourcePackage: "v2.3-batch-package.json",
  generatedAt: new Date().toISOString(),
};
fs.writeFileSync(
  path.join(taskDir, "v2.3-compressed-batch-package.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(root, "docs/qa/TASK-075-B/v2.3-compressed-batch-package.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
console.log(JSON.stringify(manifest, null, 2));
