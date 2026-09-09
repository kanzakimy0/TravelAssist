import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  plannerArtwork,
  destinationArtwork,
  mapArtworkUrl,
} from "../src/features/planner/data/planner-artwork.ts";

test("editorial artwork is local, present, and distinguishes Skytree from Tokyo Tower", () => {
  for (const artwork of Object.values(plannerArtwork)) {
    assert.ok(artwork.src.startsWith("/media/planner/"));
    assert.ok(
      fs.existsSync(new URL("../public" + artwork.src, import.meta.url)),
    );
  }
  assert.equal(destinationArtwork("东京晴空塔"), plannerArtwork.skytree);
  assert.equal(destinationArtwork("河口湖湖畔"), plannerArtwork.mountain);
  assert.equal(destinationArtwork("浅草午餐"), undefined);
  assert.equal(destinationArtwork("东京站区域酒店"), undefined);
  assert.ok(mapArtworkUrl(plannerArtwork.skytree).startsWith("/_next/image?"));
});

test("concept polish does not change the fixed workspace tracks", () => {
  const css = fs.readFileSync(
    new URL("../src/features/planner/planner.module.css", import.meta.url),
    "utf8",
  );
  assert.match(css, /grid-template-columns: minmax\(0, 3fr\) minmax\(0, 1fr\)/);
  assert.match(css, /grid-template-rows: minmax\(0, 1fr\) 25dvh/);
  assert.match(css, /grid-template-rows: minmax\(0, 1fr\) minmax\(0, 1fr\)/);
});
