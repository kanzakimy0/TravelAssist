import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const files = [
  "src/shared/contracts/ai-conversation/index.ts",
  "src/features/home/model/ai-conversation-stream.ts",
  "src/features/home/components/ai-conversation-runtime.tsx",
  "src/features/home/components/ai-conversation-panel.tsx",
];

test("TASK-077 browser boundary has no server provider, secret or mutation imports", () => {
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(
    source,
    /OPENAI_API_KEY|server\/ai|from\s+["']openai["']|service_role|SUPABASE_SERVICE|trip\.update|payment\.create|shell\.exec|raw provider/i,
  );
  assert.match(source, /\/api\/ai\/conversation/);
  assert.match(source, /turn\.completed/);
});

test("TASK-077 runtime remains ephemeral and does not persist conversation data", () => {
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(
    source,
    /localStorage|sessionStorage|indexedDB|document\.cookie/,
  );
  assert.match(source, /persistence:\s*"session_only"/);
});
