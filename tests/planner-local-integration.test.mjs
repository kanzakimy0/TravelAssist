import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) =>
  readFileSync(
    new URL(`../src/features/planner/${path}`, import.meta.url),
    "utf8",
  );

test("cancelled SDK imports cannot create a second map in the same container", () => {
  const provider = read("map/map-provider.ts");
  const imported = provider.indexOf('await import("mapbox-gl")');
  const guard = provider.indexOf("if (!isCurrent()) return null;");
  const constructor = provider.indexOf("new mapbox.Map(");
  assert.ok(imported < guard && guard < constructor);
  const shell = read("components/planner-map-shell.tsx");
  assert.match(shell, /setAnchor,\s*\(\) => !cancelled,/);
  assert.match(shell, /cancelled = true;\s*session.current\?\.destroy\(\)/);
});

test("SVG artwork title has one text child for React hydration", () => {
  assert.match(
    read("components/planner-artwork.tsx"),
    /<title>\{`\$\{artwork.label\} · AI 插画，非实景照片`\}<\/title>/,
  );
});
