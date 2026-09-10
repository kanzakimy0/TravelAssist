import { activateRelease, rollbackRelease } from "./release-state.mjs";

const [operation, commitSha, expected = ""] = process.argv.slice(2);
if (!operation || !commitSha)
  throw new Error(
    "Usage: release-control.mjs <activate|rollback> <sha> [expected-sha]",
  );
const root = ".artifacts/task-025";
const result =
  operation === "activate"
    ? await activateRelease(root, commitSha, expected || null)
    : operation === "rollback"
      ? await rollbackRelease(root, commitSha, expected)
      : (() => {
          throw new Error("Unknown release operation.");
        })();
process.stdout.write(
  `${JSON.stringify({ status: operation, release: result }, null, 2)}\n`,
);
