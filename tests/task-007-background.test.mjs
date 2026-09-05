import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const asset = readFileSync(
  new URL(
    "../public/media/start/sakura-coast-fuji-train-sunset.png",
    import.meta.url,
  ),
);

test("the frozen wizard background is the unchanged user-provided PNG", () => {
  assert.equal(asset.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.equal(
    createHash("sha256").update(asset).digest("hex"),
    "b327122c271b02d8dcd42a8d241c89cc8da03c5a65c785d6c74335ab208705e0",
  );
});

test("all wizard steps inherit one fixed background instead of the home poster", () => {
  const page = readFileSync(
    new URL("../src/features/start-flow/start-page.tsx", import.meta.url),
    "utf8",
  );
  const css = readFileSync(
    new URL(
      "../src/features/start-flow/start-flow.module.css",
      import.meta.url,
    ),
    "utf8",
  );
  assert.equal(page.match(/className=\{styles\.backdrop\}/g)?.length, 1);
  const backdrop = css.match(/\.backdrop \{([^}]+)\}/)?.[1];
  assert.ok(backdrop);
  assert.match(
    backdrop,
    /url\("\/media\/start\/sakura-coast-fuji-train-sunset\.png"\)/,
  );
  assert.doesNotMatch(backdrop, /home-hero-poster/);
});
