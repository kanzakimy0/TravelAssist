import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function checkClientBundle(directory) {
  const files = readdirSync(directory, { recursive: true }).filter((file) =>
    file.endsWith(".js"),
  );
  assert.ok(
    files.length > 0,
    "Build browser JS before running the leakage check",
  );
  for (const file of files) {
    assert.ok(
      !/DATABASE_URL|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|sb_secret_[A-Za-z0-9_-]+|postgres(?:ql)?:\/\/[^\s:/]+:[^\s@]+@|drizzle-orm|set_profile_audit_timestamps/.test(
        readFileSync(resolve(directory, file), "utf8"),
      ),
      `Server-only marker or credential pattern in browser chunk: ${file}`,
    );
  }
  return files.length;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = fileURLToPath(new URL("../", import.meta.url));
  console.log(
    `PASS: ${checkClientBundle(resolve(root, ".next/static"))} browser JS chunks checked`,
  );
}
