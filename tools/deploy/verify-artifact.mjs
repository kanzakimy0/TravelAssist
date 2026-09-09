import { readFile } from "node:fs/promises";
import { verifyRelease } from "./artifact.mjs";

const latest = JSON.parse(
  await readFile(".artifacts/task-025/latest.json", "utf8"),
);
const result = await verifyRelease(latest.target);
process.stdout.write(
  `${JSON.stringify(
    {
      status: result.ok ? "verified" : "rejected",
      commitSha: result.manifest.commitSha,
      fileCount: result.fileCount,
      failures: result.failures,
    },
    null,
    2,
  )}\n`,
);
if (!result.ok) process.exitCode = 1;
