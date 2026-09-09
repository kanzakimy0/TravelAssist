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
  assert.match(html, /href="\/personal-center"/);
  assert.match(html, /aria-describedby="start-flow-note"/);
});
test("guest capsule retains the disabled login boundary and neutral shared avatar", () => {
  const { HomeHero } = load("src/features/home/components/home-hero.tsx");
  const html = renderToStaticMarkup(React.createElement(HomeHero));
  assert.match(html, /游客 · 个人中心/);
  assert.match(html, /data-account-avatar/);
  assert.match(html, /登录（账号功能将在后续任务中接入）/);
  assert.match(html, /disabled=""/);
  assert.doesNotMatch(html, /Yuki|<img|已登录|demo-user/i);
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
