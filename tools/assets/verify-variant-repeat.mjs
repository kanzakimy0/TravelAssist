import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import {
  ROOT,
  CATALOG,
  CACHE,
  REPORTS,
  sha256,
  safePath,
  readJson,
  atomicWrite,
  document,
} from "./variant-common.mjs";
import { walk } from "./build-full-catalog.mjs";
const paths = [
  ...walk(ROOT, CATALOG.slice(0, -1)).filter((p) =>
    /asset-(?:source-catalog|usage-map|variants)\.v1\.(?:json|csv)$/.test(p),
  ),
  ...walk(ROOT, REPORTS.slice(0, -1)).filter(
    (p) =>
      !p.endsWith("nightly-run-summary.md") &&
      !p.endsWith("variant-repeat-verification.json"),
  ),
  "assets/design/asset-library/previews/variant-review.html",
].sort();
const snapshot = () =>
  Object.fromEntries(
    paths.map((p) => [p, sha256(readFileSync(safePath(ROOT, p)))]),
  );
const runs = [];
let before = null;
for (const [label, args] of [
  ["first", []],
  ["second", []],
  ["resume", ["--resume"]],
]) {
  let exitCode = 0,
    log = "";
  try {
    log = execFileSync(
      process.execPath,
      ["tools/assets/run-assets-nightly.mjs", ...args],
      {
        cwd: ROOT,
        encoding: "utf8",
        timeout: 480000,
        maxBuffer: 16000000,
        stdio: ["pipe", "pipe", "pipe"],
      },
    );
  } catch (e) {
    exitCode = e.status ?? 1;
    log = String(e.stdout ?? "") + String(e.stderr ?? "");
  }
  atomicWrite(ROOT, CACHE + "/acceptance-" + label + ".log", log);
  const last = readJson(ROOT, CACHE + "/last-run.json");
  assert.equal(last.failure, null);
  assert.ok(
    last.validation
      .filter((v) => v.exitCode !== 0)
      .every((v) => v.command === "format:check"),
    "Unexpected required validation failure",
  );
  const current = snapshot(),
    changed = before ? paths.filter((p) => before[p] !== current[p]) : [];
  if (before) {
    assert.deepEqual(changed, []);
    assert.equal(last.account.sourceChanged, 0);
    assert.equal(last.account.unnecessaryRegenerated, 0);
    assert.ok(last.account.skippedUnchanged > 0);
  }
  runs.push({
    label,
    exitCode,
    account: last.account,
    protection: last.protection,
    validation: last.validation,
    canonicalFilesCompared: before ? paths.length : 0,
    canonicalFilesChanged: changed,
  });
  before = current;
  console.log(label, last.account, "canonical changes", changed.length);
}
await document(ROOT, REPORTS + "variant-repeat-verification.json", {
  note: "Nightly format:check exits 1 for verified upstream exceptions; never claimed green. Canonical no-op excludes volatile run summary.",
  runs,
  canonicalHashes: before,
});
