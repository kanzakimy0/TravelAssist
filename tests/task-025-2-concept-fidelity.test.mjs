import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("..", import.meta.url));
// Render the actual TSX; only Next runtime adapters/assets are substituted.
function load(p) {
  const filename = resolve(root, p);
  const js = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const compiled = { exports: {} };
  const localRequire = (id) => {
    if (id.endsWith(".css"))
      return new Proxy(
        {},
        { get: (_, k) => (k === "__esModule" ? false : String(k)) },
      );
    if (id === "next/link")
      return function TestLink({ children, ...props }) {
        return React.createElement("a", props, children);
      };
    if (id === "next/image")
      return function TestImage(props) {
        const imageProps = { ...props };
        delete imageProps.priority;
        delete imageProps.fill;
        return React.createElement("img", imageProps);
      };
    if (id.startsWith("@/")) return load(id.replace("@/", "src/") + ".tsx");
    if (id.startsWith("."))
      return load(resolve(dirname(filename), id) + ".tsx");
    return require(id);
  };
  new Function("require", "module", "exports", js)(
    localRequire,
    compiled,
    compiled.exports,
  );
  return compiled.exports;
}

test("concept Hero preserves the real start and protected account destinations", () => {
  const { HomeHero } = load("src/features/home/components/home-hero.tsx");
  const html = renderToStaticMarkup(React.createElement(HomeHero));
  assert.equal((html.match(/<h1/g) || []).length, 1);
  assert.match(html, /aria-labelledby="home-heading"/);
  assert.match(html, /id="home-heading"/);
  assert.match(html, /下一站，去哪里？/);
  assert.match(html, /规划行程 · 对话调整/);
  assert.match(html, /href="\/start"/);
  assert.match(html, /href="\/login\?returnTo=%2F"/);
  assert.match(html, /aria-describedby="start-flow-note"/);
});
test("guest uses a real login link; verified viewer gets the shared account avatar", () => {
  const { HomeHero } = load("src/features/home/components/home-hero.tsx");
  const guest = renderToStaticMarkup(React.createElement(HomeHero));
  assert.match(guest, /游客/);
  assert.match(guest, /href="\/personal-center"/);
  assert.match(guest, /data-account-avatar/);
  assert.match(guest, /href="\/login\?returnTo=%2F"/);
  assert.doesNotMatch(guest, /Yuki|disabled=|demo-user/i);
  const member = renderToStaticMarkup(
    React.createElement(HomeHero, { viewer: { name: "真实账户" } }),
  );
  assert.match(member, /真实账户/);
  assert.match(member, /href="\/personal-center"/);
  assert.match(member, /data-account-avatar/);
  assert.doesNotMatch(member, /href="\/login/);
});
test("default Home header reuses the single canonical BrandLogo and native language details", () => {
  const { MainHeader } = load("src/components/layout/main-header.tsx");
  const html = renderToStaticMarkup(React.createElement(MainHeader));
  assert.equal((html.match(/<header/g) || []).length, 1);
  assert.equal((html.match(/<nav/g) || []).length, 1);
  assert.match(html, /href="\/" aria-label="TravelAssist 首页"/);
  assert.match(html, /travelassist-logo-torii\.png/);
  assert.match(html, /<details/);
  assert.match(html, /语言选项，当前为简体中文/);
  assert.match(html, /更多语言即将开放/);
});
test("AI entry retains an accessible native button and controlled expanded state", () => {
  const { AIEntryButton } = load(
    "src/features/home/components/ai-entry-button.tsx",
  );
  for (const expanded of [false, true]) {
    const html = renderToStaticMarkup(
      React.createElement(AIEntryButton, {
        "aria-expanded": expanded,
        "aria-controls": "home-ai-conversation-panel",
        "aria-label": expanded ? "AI 助手已展开" : "打开 AI 助手",
      }),
    );
    assert.match(html, /<button/);
    assert.match(html, /type="button"/);
    assert.ok(html.includes('aria-expanded="' + expanded + '"'));
    assert.match(html, /aria-controls="home-ai-conversation-panel"/);
  }
});

test("skip link focuses the existing main without a hash-only history entry", () => {
  const { HomeSkipLink } = load(
    "src/features/home/components/home-skip-link.tsx",
  );
  const link = HomeSkipLink();
  assert.equal(link.props.href, "#home-content");
  const original = globalThis.document;
  let prevented = false,
    focused = false;
  try {
    globalThis.document = {
      getElementById(id) {
        assert.equal(id, "home-content");
        return {
          focus(options) {
            assert.deepEqual(options, { preventScroll: true });
            focused = true;
          },
        };
      },
    };
    link.props.onClick({
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, true);
    assert.equal(focused, true);
    prevented = false;
    focused = false;
    link.props.onClick({
      ctrlKey: true,
      preventDefault() {
        prevented = true;
      },
    });
    assert.equal(prevented, false);
    assert.equal(focused, false);
  } finally {
    if (original === undefined) delete globalThis.document;
    else globalThis.document = original;
  }
});

test("runtime uses the user-concept background with traceable approval and intact legacy poster", () => {
  const manifest = JSON.parse(
    readFileSync(
      resolve(root, "docs/assets/catalog/asset-manifest.v1.json"),
      "utf8",
    ),
  );
  const asset = manifest.assets.find(
    (a) => a.id === "home.global.background.sakura-sunset.concept.001",
  );
  assert.equal(asset.status, "approved");
  assert.equal(asset.authenticity, "illustrative");
  assert.equal(asset.source.type, "ai_generated");
  assert.equal(asset.presentation.decorative, true);
  assert.equal(asset.presentation.alt, "");
  assert.equal(asset.rights.derivativesAllowed, true);
  const source = readFileSync(
    resolve(root, "src/features/home/components/immersive-background.tsx"),
    "utf8",
  );
  assert.ok(source.includes(asset.runtime.path));
  assert.doesNotMatch(source, /home-hero-poster/);
  assert.equal(
    require("node:crypto")
      .createHash("sha256")
      .update(
        readFileSync(resolve(root, "public/media/home/home-hero-poster.webp")),
      )
      .digest("hex"),
    "7464b34430b89ea9c010242bed05156e374aff347d1d7875d5bedbb57c4a5466",
  );
});

// TASK-030-B extends the existing real-TSX harness instead of duplicating it.
test("TASK-030-B: shared CTA stays a native /start link without a manual navigation handler", () => {
  const { HeroStartButton } = load(
    "src/features/home/components/hero-start-button.tsx",
  );
  const button = HeroStartButton();
  assert.equal(button.type.name, "ButtonLink");
  assert.equal(button.props.href, "/start");
  for (const prop of ["onClick", "onNavigate", "disabled", "replace"])
    assert.equal(button.props[prop], undefined);
  const link = button.type(button.props);
  assert.equal(link.type.name, "TestLink"); // existing Next Link adapter
  assert.equal(link.props.href, "/start");
  const html = renderToStaticMarkup(button);
  assert.match(html, /^<a\b/);
  assert.doesNotMatch(html, /<button|role="button"|href="\/(?:login|planner)/);
});

test("TASK-030-B: guest and verified viewers each get exactly one identical primary Start link", () => {
  const { HomeHero } = load("src/features/home/components/home-hero.tsx");
  let expected;
  for (const viewer of [null, { name: "验收资料" }, { name: "个人中心" }]) {
    const html = renderToStaticMarkup(
      React.createElement(HomeHero, { viewer }),
    );
    const links = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)].map(
      (m) => m[0],
    );
    const ctas = links.filter((link) => link.includes("让我们开始吧"));
    assert.equal(ctas.length, 1);
    assert.equal(links.filter((link) => /href="\/start"/.test(link)).length, 1);
    assert.match(ctas[0], /href="\/start"/);
    assert.doesNotMatch(
      ctas[0],
      /disabled|aria-disabled|href="\/login|[?]entry/,
    );
    if (expected) assert.equal(ctas[0], expected);
    expected = ctas[0];
  }
});

test("TASK-030-B: CTA label and description remain meaningful and uniquely connected", () => {
  const { HomeHero } = load("src/features/home/components/home-hero.tsx");
  const html = renderToStaticMarkup(React.createElement(HomeHero));
  const cta = [...html.matchAll(/<a\b[^>]*>[\s\S]*?<\/a>/g)]
    .map((m) => m[0])
    .find((link) => /href="\/start"/.test(link));
  const visibleName = cta
    .replace(/<span aria-hidden="true">[\s\S]*?<\/span>/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
  assert.equal(visibleName, "让我们开始吧");
  assert.match(cta, /aria-describedby="start-flow-note"/);
  assert.equal((html.match(/id="start-flow-note"/g) || []).length, 1);
  assert.match(html, /id="start-flow-note">进入旅行需求填写流程<\/span>/);
});
