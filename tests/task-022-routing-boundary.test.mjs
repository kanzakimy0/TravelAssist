import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");

test("routing provider implementation is server-only and absent from client source graph", () => {
  for (const file of [
    "src/server/routing/index.ts",
    "src/server/routing/config.ts",
    "src/server/routing/service.ts",
    "src/server/routing/types.ts",
    "src/server/routing/providers/ekiworld.ts",
  ])
    assert.match(read(file), /^import "server-only";/);

  for (const directory of ["src/app", "src/features"]) {
    const files = readdirSync(resolve(root, directory), {
      recursive: true,
    }).filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file));
    for (const file of files) {
      if (
        directory === "src/app" &&
        file.replaceAll("\\", "/") === "api/routes/calculate/route.ts"
      )
        continue;
      assert.doesNotMatch(
        read(resolve(directory, file)),
        /src\/server\/routing|server\/routing|providers\/ekiworld/,
        `Client-reachable source imports routing server code: ${file}`,
      );
    }
  }
});

test("committed environment template documents placeholders without a credential", () => {
  const environment = read(".env.example");
  assert.match(environment, /^ROUTING_PROVIDER_MODE=$/m);
  assert.match(environment, /^EKIWORLD_ACCESS_KEY=$/m);
  assert.match(environment, /^ROUTING_EKIWORLD_PRODUCTION_APPROVED=$/m);
  assert.doesNotMatch(environment, /EKIWORLD_ACCESS_KEY=\S+/);
  assert.doesNotMatch(environment, /NEXT_PUBLIC_EKIWORLD|NEXT_PUBLIC_.*ROUT/);
});

test("built browser chunks contain neither adapter code nor server variable names", () => {
  const directory = resolve(root, ".next/static");
  if (!existsSync(directory)) return;
  const files = readdirSync(directory, { recursive: true }).filter((file) =>
    file.endsWith(".js"),
  );
  assert.ok(files.length > 0);
  for (const file of files) {
    const content = readFileSync(resolve(directory, file), "utf8");
    assert.doesNotMatch(
      content,
      /EKIWORLD_ACCESS_KEY|ROUTING_EKIWORLD_PRODUCTION_APPROVED|search\/course\/extreme|EkiworldTransitAdapter/,
      `Routing server boundary leaked into browser chunk: ${file}`,
    );
  }
});
