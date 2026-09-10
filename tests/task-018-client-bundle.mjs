// Explicit post-build audit; never print matching secret material.
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const require = createRequire(import.meta.url);
const { build } = require("esbuild");
const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
const forbidden = [
  /SUPABASE_SECRET_KEY/,
  /DATABASE_URL/,
  /sb_secret_[A-Za-z0-9_-]{16,}/,
  /-----BEGIN (?:RSA |EC )?PRIVATE KEY-----/,
  /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{16,}/,
  /getCurrentAuthUser|requireAuthUser|createRequestSupabase|authSiteOrigin/,
];
function checkText(text, label) {
  for (let i = 0; i < forbidden.length; i++)
    assert.ok(!forbidden[i].test(text), label + ": private boundary rule " + i);
}

const chunks = walk(resolve(root, ".next/static")).filter((file) =>
  file.endsWith(".js"),
);
assert.ok(chunks.length > 0);
for (const file of chunks)
  checkText(readFileSync(file, "utf8"), relative(root, file));

// The future browser Auth entry is deliberately not wired to WBS 5.3 UI yet.
// Independently compile its actual dependency graph so an unused client helper
// cannot hide a server import from the production chunk-only check.
const compiled = await build({
  absWorkingDir: root,
  stdin: {
    contents:
      'export { createBrowserSupabaseClient } from "./src/lib/supabase/browser"; export { createAuthCore } from "./src/lib/auth/core";',
    resolveDir: root,
    sourcefile: "task018-browser-audit.ts",
    loader: "ts",
  },
  bundle: true,
  minify: true,
  legalComments: "none",
  write: false,
  metafile: true,
  platform: "browser",
  format: "esm",
  logLevel: "silent",
  define: {
    "process.env.NEXT_PUBLIC_SUPABASE_URL": JSON.stringify(
      "https://public-config.example.test",
    ),
    "process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
      "sb_publishable_audit_placeholder",
    ),
    "process.env.NODE_ENV": JSON.stringify("production"),
  },
});
for (const input of Object.keys(compiled.metafile.inputs)) {
  assert.ok(
    !/src\/db\/|src\/lib\/auth\/(?:server-user|current-user|http|site)\.ts|src\/lib\/supabase\/(?:server|request)\.ts|server-only\//.test(
      input,
    ),
    "Browser graph excludes server-only modules",
  );
}
for (const output of compiled.outputFiles)
  checkText(output.text, "Browser Auth entry");
assert.ok(
  compiled.outputFiles.some((o) =>
    o.text.includes("sb_publishable_audit_placeholder"),
  ),
  "Publishable config is allowed in browser code",
);

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { cwd: root, encoding: "utf8" },
)
  .trim()
  .split(/\r?\n/);
const taskSources = files.filter(
  (file) =>
    /^(?:src\/lib\/(?:auth|supabase)\/|src\/app\/auth\/|src\/proxy\.ts|supabase\/templates\/|tests\/task-018-|docs\/tasks\/RESULT-TASK-018)/.test(
      file,
    ) && /\.(?:ts|mjs|md|html)$/.test(file),
);
for (const file of taskSources) {
  const text = readFileSync(resolve(root, file), "utf8");
  // Test placeholders and Local-only invalid SMS strings are not real secrets.
  for (const pattern of [forbidden[2], forbidden[3], forbidden[4]])
    assert.ok(
      !pattern.test(text),
      file + ": no hard-coded credential material",
    );
}
for (const file of [
  ".env",
  ".env.local",
  ".env.production",
  "supabase/signing_keys.json",
])
  assert.ok(
    !existsSync(resolve(root, file)),
    "No real credential file created for acceptance",
  );
console.log(
  JSON.stringify(
    {
      status: "PASS",
      productionBrowserChunks: chunks.length,
      browserAuthDependencyModules: Object.keys(compiled.metafile.inputs)
        .length,
      auditedTaskSourceFiles: taskSources.length,
      privateSecretsOrServerHelpersInClient: false,
      runtimeCredentialFilesCreated: false,
    },
    null,
    2,
  ),
);
