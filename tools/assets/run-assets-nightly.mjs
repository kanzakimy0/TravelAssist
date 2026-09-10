import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildCatalog } from "./build-full-catalog.mjs";
import { derive } from "./generate-asset-derivatives.mjs";
import { verify } from "./verify-asset-derivatives.mjs";
import { review } from "./generate-variant-review.mjs";
import {
  ROOT,
  CACHE,
  CATALOG,
  REPORTS,
  document,
  atomicWrite,
  readJson,
  sourceProtection,
  acquireLock,
  options,
} from "./variant-common.mjs";
const opt = options();
if (opt.dryRun) {
  const { catalog } = await buildCatalog(ROOT, { write: false });
  console.log({
    dryRun: true,
    sources: catalog.sources.length,
    eligible: catalog.sources.filter((s) => s.processingEligibility).length,
  });
} else if (opt.verifyOnly) {
  const result = await verify();
  console.log(result);
  if (result.errors.length) process.exitCode = 1;
} else {
  const release = acquireLock(ROOT),
    validation = [];
  let account = null,
    stats = null,
    protection = null,
    failure = null;
  try {
    console.log(
      "00 preflight / 01 parent schema / 02 inventory / 03 usage / 04 eligibility",
    );
    const { catalog } = await buildCatalog();
    const before = readJson(
      ROOT,
      CACHE + "/source-baseline.json",
      catalog.sources.map((s) => ({
        path: s.path,
        bytes: s.bytes,
        sha256: s.sha256,
        protected: s.protected,
      })),
    );
    atomicWrite(
      ROOT,
      CACHE + "/source-baseline.json",
      JSON.stringify(before, null, 2) + "\n",
    );
    protection = sourceProtection(before, catalog.sources);
    if (protection.modified || protection.deleted)
      throw Error("source-protection-failed");
    console.log("05 generic / 06 special / 07 catalog and aliases");
    const derived = await derive(ROOT, opt, catalog);
    account = derived.account;
    console.log("08 verification / 09 reports and review");
    const verification = await verify();
    validation.push({
      command: "assets:verify-variants",
      exitCode: verification.errors.length ? 1 : 0,
      errors: verification.errors,
    });
    stats = await review();
    console.log("10 project validation (offline, no package installation)");
    const commands = [
      [
        "test:asset-variants",
        ["--test", "tests/task-013-1-asset-variants.test.mjs"],
      ],
      ["assets:validate", ["tools/assets/validate-asset-library.mjs"]],
      ["test:assets", ["--test", "tests/task-013-assets.test.mjs"]],
      ["lint", ["node_modules/eslint/bin/eslint.js", "."]],
      ["build", ["node_modules/next/dist/bin/next", "build"]],
      ["typecheck", ["node_modules/typescript/bin/tsc", "--noEmit"]],
      [
        "format:check",
        [
          "node_modules/prettier/bin/prettier.cjs",
          "--check",
          "**/*.{ts,tsx,js,jsx,mjs,cjs,json,css,md}",
        ],
      ],
    ];
    for (const [command, args] of commands) {
      let log = "",
        exitCode = 0;
      try {
        log = execFileSync(process.execPath, args, {
          cwd: ROOT,
          encoding: "utf8",
          timeout: 240000,
          maxBuffer: 16000000,
          env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
        });
      } catch (e) {
        exitCode = Number.isInteger(e.status) ? e.status : 1;
        log = String(e.stdout ?? "") + String(e.stderr ?? "");
      }
      atomicWrite(
        ROOT,
        CACHE + "/" + command.replaceAll(":", "-") + ".log",
        log,
      );
      validation.push({ command, exitCode });
      console.log(
        `${command}: ${exitCode === 0 ? "passed" : "failed (see local log)"}`,
      );
    }
    const after = (await buildCatalog(ROOT, { write: false })).catalog;
    protection = sourceProtection(before, after.sources);
    if (protection.modified || protection.deleted)
      throw Error("source-protection-failed");
    // Canonical catalogs are checked against current files, never silently re-approved at night.
    const recorded = JSON.parse(
      readFileSync(
        resolve(ROOT, CATALOG + "asset-source-catalog.v1.json"),
        "utf8",
      ),
    );
    if (JSON.stringify(recorded.sources) !== JSON.stringify(after.sources))
      throw Error("catalog-changed-during-run");
  } catch (e) {
    failure = e.message;
    console.error("Nightly stopped:", failure);
  } finally {
    try {
      console.log(
        "11 Result / WBS / Git summary (no automatic external writes)",
      );
      const summary = {
        mode: opt.resume ? "resume" : opt.rebuild ? "rebuild" : "normal",
        account,
        stats,
        protection,
        validation,
        failure,
      };
      atomicWrite(
        ROOT,
        CACHE + "/last-run.json",
        JSON.stringify(summary, null, 2) + "\n",
      );
      await document(
        ROOT,
        REPORTS + "nightly-run-summary.md",
        `# Nightly Run Summary\n\nMode: ${summary.mode}. Required validation failures exit nonzero; unchanged upstream formatting failures are not relabeled Passed. Logs/checkpoint remain ignored in .cache/asset-pipeline. No automatic Git commit, Issue write or merge.\n\n## Processing\n\n\`\`\`json\n${JSON.stringify({ account, protection, failure }, null, 2)}\n\`\`\`\n\n## Validation\n\n| Command | Exit code |\n| --- | --- |\n${validation.map((v) => `| ${v.command} | ${v.exitCode} |`).join("\n")}\n\n## Tracking\n\nTASK-013.1-A / Issue #116 / WBS 2.14; see Task Result for immutable delivery commits and Draft PR. Reports and review are generated even when project validation fails.\n`,
      );
      if (failure || validation.some((v) => v.exitCode !== 0))
        process.exitCode = 1;
    } finally {
      release();
    }
  }
}
