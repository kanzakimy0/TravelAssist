import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { verifyRawExtraction, verifyRebuild } from "./task-086-verify.mjs";
import { validationBinding, graphLane } from "./task-086-validation-lanes.mjs";
const [lane, directory] = process.argv.slice(2);
assert.ok(directory);
fs.mkdirSync(directory, { recursive: true });
if (lane === "extract") {
  const binding = validationBinding();
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "task086-extraction-"));
  const startedAt = new Date().toISOString();
  try {
    const extraction = verifyRawExtraction(scratch);
    const record = {
      lane,
      status: "PASS",
      binding,
      extraction,
      startedAt,
      endedAt: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(directory, "extract.receipt.json"),
      JSON.stringify(record, null, 2) + "\n",
    );
    console.log(JSON.stringify(record));
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
} else if (lane === "aggregate") {
  process.env.TASK086_VERIFIED_LANES_DIR = directory;
  console.log(
    JSON.stringify(
      verifyRebuild({
        verifyPublished: true,
        receiptPath: path.join(directory, "deterministic-recovery-proof.json"),
      }),
    ),
  );
} else console.log(JSON.stringify(graphLane(lane, directory)));
