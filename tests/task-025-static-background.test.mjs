import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
const require = createRequire(import.meta.url);
const filename = fileURLToPath(
  new URL(
    "../src/features/home/components/immersive-background.tsx",
    import.meta.url,
  ),
);
const posterFile = fileURLToPath(
  new URL("../public/media/home/home-hero-poster.webp", import.meta.url),
);
const metadata = await sharp(posterFile).metadata();
// Only the build-time asset import and CSS are substituted; actual Next Image renders.
const poster = {
  src: "/_next/static/media/home-hero-poster.test.webp",
  width: metadata.width,
  height: metadata.height,
  blurWidth: 8,
  blurHeight: 5,
  blurDataURL:
    "data:image/webp;base64," +
    (await sharp(posterFile).resize(8).webp().toBuffer()).toString("base64"),
};
const compiled = { exports: {} };
const js = ts.transpileModule(readFileSync(filename, "utf8"), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
}).outputText;
new Function("require", "module", "exports", js)(
  (id) => {
    if (id.endsWith(".webp")) return poster;
    if (id.endsWith(".css"))
      return new Proxy(
        {},
        { get: (_, key) => (key === "__esModule" ? false : String(key)) },
      );
    return require(id);
  },
  compiled,
  compiled.exports,
);
const { PosterFallback, VideoBackground, ImmersiveBackground } =
  compiled.exports;
const render = (component, props) =>
  renderToStaticMarkup(React.createElement(component, props));
test("static background renders without video as a complete decorative layer", () => {
  const html = render(ImmersiveBackground);
  assert.match(html, /aria-hidden="true"/);
  assert.equal((html.match(/<img\b/g) || []).length, 1);
  assert.doesNotMatch(html, /<video|<source|home-hero\.(webm|mp4)/);
  assert.match(html, /class="warmOverlay"/);
  assert.match(html, /class="readabilityOverlay"/);
});
test("Next Image SSR supplies responsive preload, fill box and inline same-scene preview", () => {
  const html = render(PosterFallback);
  for (const pattern of [
    /rel="preload"/,
    /imageSrcSet=/i,
    /sizes="100vw"/,
    /alt=""/,
    /position:absolute/,
    /background-image:url\(/,
    /data:image\/svg\+xml/,
    /home-hero-poster\.test\.webp/,
  ])
    assert.match(html, pattern);
  assert.doesNotMatch(html, /loading="lazy"/);
});
test("existing optional video component keeps its source contract", () => {
  assert.equal(render(VideoBackground, { hasWebm: false, hasMp4: false }), "");
  const html = render(VideoBackground, { hasWebm: true, hasMp4: true });
  for (const attribute of ["autoplay", "muted", "loop", "playsinline"])
    assert.match(html.toLowerCase(), new RegExp(attribute));
  assert.match(html, /type="video\/webm"/);
  assert.match(html, /type="video\/mp4"/);
  assert.doesNotMatch(html, /controls=/);
});
test("approved production poster is unchanged, static and compact", () => {
  const bytes = readFileSync(posterFile);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "7464b34430b89ea9c010242bed05156e374aff347d1d7875d5bedbb57c4a5466",
  );
  assert.equal(bytes.length, 161854);
  assert.deepEqual([metadata.width, metadata.height], [1672, 941]);
  assert.ok(!metadata.pages || metadata.pages === 1);
});
