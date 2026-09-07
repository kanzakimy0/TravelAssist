import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { ROOT, document } from "./variant-common.mjs";
const base = "707bcc8d2af14a86032181be63573beb3aea3e17";
let output = "",
  exitCode = 0;
try {
  output = execFileSync(
    process.execPath,
    [
      "node_modules/prettier/bin/prettier.cjs",
      "--check",
      "**/*.{ts,tsx,js,jsx,mjs,cjs,json,css,md}",
    ],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 16000000 },
  );
} catch (e) {
  exitCode = e.status;
  output = String(e.stdout ?? "") + String(e.stderr ?? "");
}
const paths = [
  ...output.matchAll(/\[warn\] (.+\.(?:md|json|mjs|tsx?|css))\r?$/gm),
].map((m) => m[1]);
const exceptions = [];
for (const path of paths) {
  const original = execFileSync("git", ["show", base + ":" + path], {
    cwd: ROOT,
    encoding: "utf8",
  });
  assert.equal(
    readFileSync(resolve(ROOT, path), "utf8").replaceAll("\r\n", "\n"),
    original.replaceAll("\r\n", "\n"),
    "Task introduced a format failure: " + path,
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
        input: original,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  } catch (e) {
    baselineExit = e.status;
  }
  assert.equal(baselineExit, 1);
  exceptions.push({
    path,
    unchangedFromBase: true,
    baselinePrettierExit: baselineExit,
  });
}
await document(ROOT, "docs/assets/generated/variant-format-baseline.json", {
  base,
  formatCheckExit: exitCode,
  baselineFormatExceptions: exceptions,
});
console.log({
  formatCheckExit: exitCode,
  unchangedExceptions: exceptions.length,
});
