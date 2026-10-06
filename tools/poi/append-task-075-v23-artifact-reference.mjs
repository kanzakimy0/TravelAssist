import fs from "node:fs";
const file =
  "docs/tasks/RESULT-TASK-075-b-japan-poi-entity-resolver-43d-completion.md";
let text = fs.readFileSync(file, "utf8");
const marker = "### Published v2.3 artifact package";
if (!text.includes(marker)) {
  text += `\n${marker}\n\n- Compressed identity batches: data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/identity-v2.3-batches-gz/ (30 batches, 5,920 rows).\n- Compressed 43D batches: data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/43d-v2.3-batches-gz/ (52 batches, 10,369 rows / 445,867 decisions).\n- Package checksums: data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/v2.3-compressed-batch-package.json.\n- Local uncompressed working files remain outside the published package; the 200MB inspect NDJSON was not copied or committed.\n`;
  fs.writeFileSync(file, text, "utf8");
}
