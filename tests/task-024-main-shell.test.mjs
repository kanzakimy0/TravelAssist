import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("..", import.meta.url));
const read = (p) => readFileSync(resolve(root, p), "utf8");
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
test("shared Header renders one home link, accepted wordmark, navigation and adapter actions", () => {
  const { MainHeader } = load("src/components/layout/main-header.tsx");
  const html = renderToStaticMarkup(
    React.createElement(
      MainHeader,
      {
        className: "workspace",
        decoration: React.createElement("span", { "aria-hidden": true }),
      },
      React.createElement("a", { href: "/personal-center" }, "账户"),
    ),
  );
  assert.equal((html.match(/<header/g) || []).length, 1);
  assert.equal((html.match(/<nav/g) || []).length, 1);
  assert.match(html, /href="\/" aria-label="TravelAssist 首页"/);
  assert.match(html, /travelassist-logo-torii\.png/);
  assert.match(html, /href="\/personal-center"/);
  assert.doesNotMatch(html, /<main|sidebar|已登录/);
});
test("main route group includes Home, Start, and both workspace views while account stays outside", () => {
  for (const route of ["page.tsx", "start/page.tsx", "planner/page.tsx"]) {
    assert.ok(existsSync(resolve(root, "src/app/(main)/" + route)));
    assert.ok(!existsSync(resolve(root, "src/app/" + route)));
  }
  const layout = read("src/app/(main)/layout.tsx");
  assert.match(layout, /data-main-shell/);
  assert.doesNotMatch(layout, /PersonalCenter|<main|usePathname/);
  assert.match(
    read("src/app/(account)/personal-center/layout.tsx"),
    /verifyPersonalAccess/,
  );
  assert.match(
    read("src/features/planner/components/trip-workspace.tsx"),
    /<WorkspaceHeader/,
  );
});
test("Main and Personal Center consume the same palette without importing feature business modules", () => {
  const globals = read("src/app/globals.css");
  const pc = read("src/features/personal-center/personal-center.module.css");
  for (const [pcToken, globalToken] of [
    ["pc-bg-canvas", "color-bg-canvas"],
    ["pc-bg-card", "color-bg-elevated"],
    ["pc-text-primary", "color-text-primary"],
    ["pc-text-secondary", "color-text-secondary"],
    ["pc-accent-primary", "color-accent-primary"],
    ["pc-accent-soft", "color-bg-muted"],
    ["pc-border-subtle", "color-border-subtle"],
    ["pc-focus-ring", "color-focus-ring"],
    ["pc-shadow", "elevation-card"],
  ]) {
    assert.ok(pc.includes(`--${pcToken}: var(--${globalToken})`));
    assert.equal(
      (globals.match(new RegExp(`--${globalToken}:`, "g")) || []).length,
      1,
    );
  }
  for (const file of [
    "src/components/layout/main-header.tsx",
    "src/components/ui/brand-logo.tsx",
    "src/components/ui/account-avatar.tsx",
  ])
    assert.doesNotMatch(read(file), /from ["']@\/features\//);
  for (const host of ["avatar-popover.tsx", "personal-top-actions.tsx"])
    assert.match(
      read("src/features/personal-center/components/" + host),
      /<AccountAvatar src=\{mockPersonalUser.avatar\}/,
    );
  assert.ok(
    !existsSync(
      resolve(root, "src/features/home/components/compact-header.tsx"),
    ),
  );
});
test("guest avatar never implies authenticated identity and the existing menu retains its guard", () => {
  const { AccountAvatar } = load("src/components/ui/account-avatar.tsx");
  const html = renderToStaticMarkup(React.createElement(AccountAvatar));
  assert.match(html, /旅/);
  assert.doesNotMatch(html, /img|已登录/);
  const menu = read(
    "src/features/personal-center/components/avatar-popover.tsx",
  );
  assert.match(menu, /usePersonalNavigationGuard/);
  assert.match(menu, /authRequest\("signout"\)/);
  const main = read("src/features/planner/components/workspace-header.tsx");
  assert.match(main, /进入个人中心/);
  assert.doesNotMatch(main, /AvatarPopover|signOut|authRequest/);
});
