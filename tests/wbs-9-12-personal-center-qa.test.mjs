import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import test from "node:test";

import {
  personalActionStateKinds,
  personalModuleStateKinds,
  personalPageStateKinds,
  personalResponsiveModes,
} from "../src/features/personal-center/states/personal-state-model.ts";

const read = (filePath) =>
  readFileSync(new URL("../" + filePath, import.meta.url), "utf8");

const routes = [
  "/personal-center",
  "/personal-center/trips",
  "/personal-center/preferences",
  "/personal-center/preferences/mobility",
  "/personal-center/preferences/attractions",
  "/personal-center/preferences/dining",
  "/personal-center/preferences/accommodation",
  "/personal-center/preferences/budget",
  "/personal-center/preferences/experience",
  "/personal-center/preferences/advanced",
  "/personal-center/companions",
  "/personal-center/account",
  "/personal-center/account/security",
  "/personal-center/account/privacy",
  "/personal-center/account/privacy/delete",
  "/personal-center/account/booking-sync",
];

const viewports = [
  [1920, 1080],
  [1440, 900],
  [1280, 720],
  [1279, 800],
  [1024, 768],
  [1023, 768],
  [768, 1024],
  [767, 900],
  [430, 932],
  [390, 844],
  [375, 812],
  [320, 740],
];

const shellCss = read(
  "src/features/personal-center/personal-center.module.css",
);
const stateCss = read(
  "src/features/personal-center/states/personal-state.module.css",
);
const shell = read(
  "src/features/personal-center/components/personal-center-shell.tsx",
);
const sidebar = read(
  "src/features/personal-center/components/personal-sidebar.tsx",
);

const topActions = read(
  "src/features/personal-center/components/personal-top-actions.tsx",
);
const navigationGuard = read(
  "src/features/personal-center/components/navigation-guard-context.tsx",
);
const companionCenter = read("src/features/companions/companion-center.tsx");
const profile = read("src/features/profile/profile-account.tsx");
const profileCss = read("src/features/profile/profile-account.module.css");
const trips = read("src/features/trip-library/trip-library-page.tsx");
const states = read("src/features/personal-center/states/personal-states.tsx");
const browserHarness = read("tests/wbs-9-12-personal-center-qa.browser.mjs");

test("the mandatory B-owned route and viewport matrices are exact", () => {
  assert.equal(routes.length, 16);
  assert.equal(new Set(routes).size, 16);
  assert.deepEqual(viewports, [
    [1920, 1080],
    [1440, 900],
    [1280, 720],
    [1279, 800],
    [1024, 768],
    [1023, 768],
    [768, 1024],
    [767, 900],
    [430, 932],
    [390, 844],
    [375, 812],
    [320, 740],
  ]);
  for (const route of routes) assert.match(browserHarness, new RegExp(route));
  for (const [width, height] of viewports)
    assert.match(
      browserHarness,
      new RegExp("\\[" + width + ", " + height + "\\]"),
    );
});

test("all mandatory route entry points exist without adding business routes", () => {
  const directRoutes = routes.filter(
    (route) => !route.startsWith("/personal-center/preferences/"),
  );
  for (const route of directRoutes) {
    const suffix = route.replace("/personal-center", "");
    const file =
      "src/app/(account)/personal-center" +
      (suffix ? suffix : "") +
      "/page.tsx";
    assert.equal(
      existsSync(new URL("../" + file, import.meta.url)),
      true,
      file,
    );
  }
  const preferenceRoute = read(
    "src/app/(account)/personal-center/preferences/[category]/page.tsx",
  );
  const preferenceModel = read("src/features/preferences/preference-model.ts");
  for (const category of [
    "mobility",
    "attractions",
    "dining",
    "accommodation",
    "budget",
    "experience",
    "advanced",
  ])
    assert.ok(
      preferenceRoute.includes('"' + category + '"') ||
        preferenceModel.includes('"' + category + '"'),
      category,
    );
});

test("route props typecheck independently of generated .next types", () => {
  const source = read(
    "src/app/(account)/personal-center/preferences/[category]/page.tsx",
  );
  assert.ok(source.includes("type PreferenceCategoryRouteProps"));
  assert.ok(source.includes("params: Promise<{ category: string }>"));
  assert.equal(source.includes("PageProps<"), false);
});

test("four responsive bands retain their frozen boundaries", () => {
  assert.deepEqual(personalResponsiveModes, {
    wideDesktop: { min: 1280 },
    compactDesktop: { min: 1024, max: 1279 },
    tabletPortrait: { min: 768, max: 1023 },
    mobile: { max: 767 },
  });
  assert.ok(shellCss.includes("min-width: 1024px) and (max-width: 1279px"));
  assert.ok(shellCss.includes("min-width: 768px) and (max-width: 1023px"));
  assert.ok(shellCss.includes("max-width: 767px"));
});

test("Tab and Shift+Tab order has a visible skip target and no positive tabindex", () => {
  assert.ok(shell.includes('href="#personal-content"'));
  assert.ok(shell.includes("跳到主要内容"));
  assert.ok(shell.includes('id="personal-content"'));
  assert.ok(shell.includes("tabIndex={-1}"));
  assert.ok(shellCss.includes(":focus-visible"));
  assert.ok(shellCss.includes("outline: 3px solid var(--pc-focus-ring)"));

  const sourceRoots = [
    "src/app/(account)/personal-center",
    "src/features/personal-center",
    "src/features/profile",
    "src/features/preferences",
    "src/features/companions",
    "src/features/trip-library",
  ];
  for (const root of sourceRoots) {
    for (const entry of readdirSync(new URL("../" + root, import.meta.url), {
      recursive: true,
      withFileTypes: true,
    })) {
      if (
        !entry.isFile() ||
        (!entry.name.endsWith(".tsx") && !entry.name.endsWith(".ts"))
      )
        continue;
      const source = readFileSync(entry.parentPath + "/" + entry.name, "utf8");
      for (let index = 1; index <= 9; index += 1) {
        assert.equal(source.includes("tabIndex={" + index), false, entry.name);
        assert.equal(source.includes('tabIndex="' + index), false, entry.name);
      }
    }
  }
});

test("drawer and account popover expose complete keyboard focus lifecycles", () => {
  assert.ok(sidebar.includes('event.key === "Escape"'));
  assert.ok(sidebar.includes('event.key !== "Tab"'));
  assert.ok(sidebar.includes("event.shiftKey"));
  assert.ok(sidebar.includes("menuButtonRef.current?.focus"));
  assert.ok(sidebar.includes("aria-modal={drawerOpen ? true : undefined}"));
  assert.ok(sidebar.includes("inert={tabletDrawerMode && !drawerOpen"));
  assert.ok(topActions.includes("popoverTarget={popoverId}"));
  assert.ok(topActions.includes("aria-expanded={isOpen}"));
  assert.ok(topActions.includes('event.key !== "Escape"'));
  assert.ok(topActions.includes("triggerRef.current?.focus"));
});

test("native and custom dialogs support Escape, trap focus, and restore focus", () => {
  assert.ok(profile.includes("<dialog"));
  assert.ok(profile.includes("onCancel="));
  assert.ok(navigationGuard.includes("<dialog"));
  assert.ok(navigationGuard.includes("returnFocusRef"));
  assert.ok(companionCenter.includes('role="alertdialog"'));
  assert.ok(companionCenter.includes("closeDeleteConfirmation"));
  assert.ok(companionCenter.includes("closeDiscardConfirmation"));
  assert.ok(companionCenter.includes('event.key !== "Tab"'));
  assert.ok(companionCenter.includes("event.shiftKey"));
  assert.ok(companionCenter.includes("addCompanionRef.current?.focus"));
  assert.ok(trips.includes("<dialog"));
  assert.ok(trips.includes("onCancel="));
});

test("mobile controls preserve 44px sizing and safe-area clearance", () => {
  assert.ok(shellCss.includes("env(safe-area-inset-bottom)"));
  assert.ok(shellCss.includes("min-height: 52px"));
  assert.ok(shellCss.includes("min-height: 44px"));
  assert.ok(browserHarness.includes("assertMobileTouchTargets"));
  assert.ok(browserHarness.includes("rect.width < 44"));
  assert.ok(browserHarness.includes("rect.height < 44"));
  assert.ok(browserHarness.includes("fontSize) < 16"));
  assert.ok(profileCss.includes("visibility: hidden"));
  assert.ok(profileCss.includes("visibility: visible"));
  assert.ok(profileCss.includes(".accountPage .emergencyCard button"));
  assert.ok(profileCss.includes("min-width: 44px"));
});
test("semantic states cover loading empty error and live feedback", () => {
  assert.deepEqual(personalPageStateKinds, [
    "loading",
    "ready",
    "empty",
    "error",
    "offline",
    "authExpired",
    "permissionUnavailable",
  ]);
  assert.deepEqual(personalModuleStateKinds, [
    "loading",
    "partialError",
    "empty",
    "stale",
    "permissionUnavailable",
    "authExpired",
  ]);
  assert.deepEqual(personalActionStateKinds, [
    "idle",
    "submitting",
    "success",
    "error",
    "disabled",
  ]);
  assert.ok(
    read("src/app/(account)/personal-center/loading.tsx").includes(
      "PersonalPageSkeleton",
    ),
  );
  assert.ok(
    read("src/app/(account)/personal-center/error.tsx").includes("reset"),
  );
  assert.ok(states.includes('role={tone === "error" ? "alert" : "status"}'));
  assert.ok(states.includes('aria-live="polite"'));
  assert.ok(trips.includes('className={styles.emptyState} aria-live="polite"'));
  assert.ok(trips.includes('className={styles.feedback} role="status"'));
  assert.ok(companionCenter.includes('className={styles.toast} role="status"'));
});

test("reduced motion removes nonessential transitions and skeleton shimmer", () => {
  assert.ok(shellCss.includes("prefers-reduced-motion: reduce"));
  assert.ok(shellCss.includes("animation-duration: 0.01ms"));
  assert.ok(stateCss.includes("prefers-reduced-motion: reduce"));
  assert.ok(stateCss.includes("animation: none"));
  assert.ok(browserHarness.includes('reducedMotion: "reduce"'));
  assert.ok(browserHarness.includes("activeMotion"));
});

test("browser harness records real engine selection diagnostics and evidence", () => {
  for (const engine of ["edge", "chromium", "firefox", "webkit"])
    assert.ok(browserHarness.includes('"' + engine + '"'));
  assert.ok(browserHarness.includes("consoleProblems"));
  assert.ok(browserHarness.includes("pageerror"));
  assert.ok(browserHarness.includes("response.status() >= 400"));
  assert.ok(browserHarness.includes("assertNoOverflow"));
  assert.ok(browserHarness.includes("summary.json"));
  assert.ok(browserHarness.includes("pageScaleFactor: 2"));
  assert.ok(browserHarness.includes("visualViewport?.scale"));
  assert.ok(browserHarness.includes("size * 1.5"));
});
test("9.12 changes stay within B QA scope and add no integration work", () => {
  const changed = execFileSync(
    "git",
    ["status", "--porcelain=v1", "--untracked-files=all"],
    { encoding: "utf8" },
  )
    .trimEnd()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.slice(3));
  const allowed = [
    "docs/project/WBS-TravelAssist.md",
    "docs/tasks/RESULT-TASK-WBS-9.12-b-personal-center-responsive-accessibility-qa.md",
    "src/app/(account)/personal-center/preferences/[category]/page.tsx",
    "src/features/companions/companion-center.tsx",
    "src/features/profile/profile-account.module.css",
    "tests/wbs-9-12-personal-center-qa.browser.mjs",
    "tests/wbs-9-12-personal-center-qa.test.mjs",
  ];
  assert.deepEqual(
    changed.slice().sort(),
    changed.filter((file) => allowed.includes(file)).sort(),
  );
  const implementation =
    companionCenter +
    read("src/app/(account)/personal-center/preferences/[category]/page.tsx");
  for (const forbidden of [
    "fetch(",
    "XMLHttpRequest",
    "localStorage",
    "sessionStorage",
    "indexedDB",
    "supabase",
    "prisma",
    "drizzle",
    "serviceWorker.register",
  ])
    assert.equal(implementation.includes(forbidden), false, forbidden);
});
