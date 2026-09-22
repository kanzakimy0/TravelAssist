import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const staticRoot = resolve(root, ".next/static");
const files = readdirSync(staticRoot, { recursive: true }).filter((file) =>
  file.endsWith(".js"),
);
assert.ok(files.length > 0, "Build browser JS before running AI leakage audit");
for (const file of files) {
  const text = readFileSync(resolve(staticRoot, file), "utf8");
  assert.doesNotMatch(
    text,
    /OPENAI_API_KEY|api\.openai\.com\/v1\/responses|test-only-secret/,
    `AI server-only marker or credential leaked into browser chunk: ${file}`,
  );
}
console.log(`PASS: ${files.length} browser JS chunks checked for AI leakage`);
