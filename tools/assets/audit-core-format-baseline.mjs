import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { format } from "prettier";
import { ROOT, read, write } from "./asset-utils.mjs";
const base =
  process.env.CORE_ACCEPTANCE_BASE ??
  "95311fcbdc3432eb4b75cb0644cad7783fad7415";
let log = "",
  exit = 0;
try {
  log = execFileSync(
    process.execPath,
    [
      "node_modules/prettier/bin/prettier.cjs",
      "--check",
      "**/*.{ts,tsx,js,jsx,mjs,cjs,json,css,md}",
    ],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 16000000 },
  );
} catch (e) {
  exit = e.status;
  log = String(e.stdout ?? "") + String(e.stderr ?? "");
}
assert.ok(exit === 0 || exit === 1, "Formatter execution failure");
const paths = [
  ...log.matchAll(/\[warn\] (.+\.(?:md|json|mjs|tsx?|css))\r?$/gm),
].map((m) => m[1]);
if (exit === 1) assert.ok(paths.length > 0, "Unclassified formatter failure");
for (const path of paths) {
  const original = execFileSync("git", ["show", base + ":" + path], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(
    read(path).replaceAll("\r\n", "\n"),
    original.replaceAll("\r\n", "\n"),
    "New or modified format failure: " + path,
  );
  let baselineExit = 0;
  try {
    execFileSync(
      process.execPath,
      [
        "node_modules/prettier/bin/prettier.cjs",
        "--check",
        "--stdin-filepath",
        path,
      ],
      {
        cwd: ROOT,
        encoding: "utf8",
        input: original,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  } catch (e) {
    baselineExit = e.status;
  }
  assert.equal(baselineExit, 1, "Not baseline format debt: " + path);
}
write(
  "docs/assets/generated/core-generation-format-baseline.json",
  await format(
    JSON.stringify({
      base,
      format_check_exit: exit,
      baseline_failures: paths.length,
      new_failures: 0,
      files: paths,
    }),
    { filepath: "report.json" },
  ),
);
console.log(
  JSON.stringify({
    format_check_exit: exit,
    unchanged_baseline_failures: paths.length,
    new_failures: 0,
  }),
);
