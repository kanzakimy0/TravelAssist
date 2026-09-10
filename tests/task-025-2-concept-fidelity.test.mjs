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
// Render the actual TSX; only Next runtime adapters/assets are substituted.
function load(p, adapters = {}) {
  const filename = resolve(root, p);
  const js = ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const compiled = { exports: {} };
  const dependency = (p) =>
    load([p, p + ".tsx", p + ".ts"].find(existsSync) ?? p, adapters);
  const localRequire = (id) => {
    if (Object.hasOwn(adapters, id)) return adapters[id];
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
        delete imageProps.unoptimized;
        return React.createElement("img", imageProps);
      };
    if (id.startsWith("@/"))
      return dependency(resolve(root, id.replace("@/", "src/")));
    if (id.startsWith(".")) return dependency(resolve(dirname(filename), id));
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

// TASK-031-B uses this same TSX renderer and canonical Auth policy.
test("TASK-031-B: existing Start and Planner adapters render verified identity or a real Guest entry", () => {
  for (const path of ["/start", "/planner?view=detail&day=1"]) {
    const url = new URL(path, "https://local.invalid");
    const adapters = {
      "next/navigation": {
        usePathname: () => url.pathname,
        useSearchParams: () => url.searchParams,
      },
    };
    const Component = path.startsWith("/start")
      ? load(
          "src/features/start-flow/components/start-flow-header.tsx",
          adapters,
        ).StartFlowHeader
      : load("src/features/planner/components/workspace-header.tsx", adapters)
          .WorkspaceHeader;
    for (const viewer of [
      null,
      {
        name: "已验证旅人",
        avatar: "https://avatar.example.invalid/profile.webp",
      },
    ]) {
      const html = renderToStaticMarkup(
        React.createElement(Component, { viewer }),
      );
      assert.equal((html.match(/<header/g) || []).length, 1);
      assert.doesNotMatch(html, /Yuki|伪造 Cookie 身份/);
      if (viewer) {
        assert.match(html, /已验证旅人/);
        assert.match(html, /data-account-avatar/);
        assert.match(html, /https:\/\/avatar.example.invalid\/profile.webp/);
        assert.match(html, /alt=""/);
      } else if (path.startsWith("/start")) {
        assert.match(html, /href="\/login\?returnTo=%2Fstart"/);
        assert.doesNotMatch(html, /<img[^>]+profile.webp/);
      } else assert.match(html, /登录或个人中心菜单/);
    }
  }
});

test("TASK-031-B: one server verifier ignores cookie claims and fails safely to Guest", async () => {
  let calls = 0;
  let result = {
    data: {
      user: {
        user_metadata: {
          full_name: "已验证旅人",
          avatar_url: "http://unsafe.invalid/a.png",
        },
      },
    },
    error: null,
  };
  let present = true;
  let unavailable = false;
  const { readHomeViewer } = load("src/lib/auth/home-viewer.server.ts", {
    "server-only": {},
    "next/headers": {
      cookies: async () => ({
        getAll: () =>
          present
            ? [
                {
                  name: "sb-test-auth-token",
                  value: '{"full_name":"伪造 Cookie 身份"}',
                },
              ]
            : [],
      }),
    },
    "@/lib/auth/site": { authSiteOrigin: () => "https://local.invalid" },
    "@/lib/supabase/server": {
      createServerSupabaseClient: () => ({
        auth: {
          getUser: async () => {
            calls++;
            if (unavailable) throw Error("offline");
            return result;
          },
        },
      }),
    },
  });
  assert.deepEqual(await readHomeViewer(), {
    name: "已验证旅人",
    avatar: undefined,
  });
  assert.equal(calls, 1);
  for (const error of [
    null,
    { code: "bad_jwt" },
    { code: "session_expired" },
  ]) {
    result = {
      data: {
        user: error ? { user_metadata: { full_name: "must not leak" } } : null,
      },
      error,
    };
    assert.equal(await readHomeViewer(), null);
  }
  unavailable = true;
  assert.equal(await readHomeViewer(), null);
  present = false;
  const before = calls;
  assert.equal(await readHomeViewer(), null);
  assert.equal(calls, before);
});

test("TASK-031-B: existing login policy preserves page queries and rejects open redirects", () => {
  const { authHref } = load("src/features/auth/auth-ui-model.ts");
  for (const path of [
    "/",
    "/start",
    "/start?entry=preferences",
    "/planner",
    "/planner?view=detail&day=1",
  ]) {
    assert.equal(
      new URL(
        authHref("/login", path),
        "https://local.invalid",
      ).searchParams.get("returnTo"),
      path,
    );
  }
  for (const path of [
    "https://evil.invalid/",
    "//evil.invalid",
    "javascript:alert(1)",
    "/%2f%2fevil.invalid",
    "/login",
    "/auth/signout",
  ]) {
    assert.equal(
      new URL(
        authHref("/login", path),
        "https://local.invalid",
      ).searchParams.get("returnTo"),
      "/",
    );
  }
});

test("TASK-031-B: verified metadata accepts only safe HTTPS avatars and neutral missing profiles", () => {
  const { homeViewerFromVerifiedUser } = load("src/lib/auth/home-viewer.ts");
  assert.deepEqual(homeViewerFromVerifiedUser({ user_metadata: {} }), {
    name: "个人中心",
    avatar: undefined,
  });
  for (const avatar_url of [
    "http://example.invalid/a.png",
    "javascript:alert(1)",
    "//example.invalid/a.png",
    "https://user:secret@example.invalid/a.png",
    "data:image/png;base64,AAAA",
  ]) {
    assert.equal(
      homeViewerFromVerifiedUser({
        user_metadata: { full_name: "旅人", avatar_url },
      }).avatar,
      undefined,
    );
  }
  assert.equal(
    homeViewerFromVerifiedUser({
      user_metadata: {
        full_name: "旅人",
        avatar_url: "https://example.invalid/a.png",
      },
    }).avatar,
    "https://example.invalid/a.png",
  );
});
