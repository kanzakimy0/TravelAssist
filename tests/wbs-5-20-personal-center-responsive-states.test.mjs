import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  personalActionStateKinds,
  personalModuleStateKinds,
  personalPageStateKinds,
  personalResponsiveModes,
  personalStateCopy,
} from "../src/features/personal-center/states/personal-state-model.ts";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const shellCss = read(
  "src/features/personal-center/personal-center.module.css",
);
const stateCss = read(
  "src/features/personal-center/states/personal-state.module.css",
);
const states = read("src/features/personal-center/states/personal-states.tsx");
const sidebar = read(
  "src/features/personal-center/components/personal-sidebar.tsx",
);
const navigation = read(
  "src/features/personal-center/components/personal-primary-nav.tsx",
);

test("four frozen responsive modes retain exact breakpoint boundaries", () => {
  assert.deepEqual(personalResponsiveModes, {
    wideDesktop: { min: 1280 },
    compactDesktop: { min: 1024, max: 1279 },
    tabletPortrait: { min: 768, max: 1023 },
    mobile: { max: 767 },
  });
  assert.match(shellCss, /min-width: 1024px\) and \(max-width: 1279px/);
  assert.match(shellCss, /min-width: 768px\) and \(max-width: 1023px/);
  assert.match(shellCss, /max-width: 767px/);
});

test("primary navigation is exactly five routes with frozen mobile labels", () => {
  const source = read(
    "src/features/personal-center/constants/personal-navigation.ts",
  );
  assert.equal((source.match(/mobileLabel:/g) ?? []).length, 5);
  assert.deepEqual(
    [...source.matchAll(/mobileLabel: "([^"]+)"/g)].map((match) => match[1]),
    ["首页", "旅行", "偏好", "同行人", "账户"],
  );
  assert.doesNotMatch(source, /更多|Booking|AI/);
});

test("compact rail exposes visible hover and focus tooltips without title-only fallback", () => {
  assert.match(navigation, /role="tooltip"/);
  assert.match(navigation, /aria-describedby=\{tooltipId\}/);
  assert.match(navigation, /data-personal-nav-item/);
  assert.match(shellCss, /\.navLink:hover \.railTooltip/);
  assert.match(shellCss, /\.navLink:focus-visible \.railTooltip/);
  assert.match(shellCss, /overflow: visible/);
  assert.doesNotMatch(navigation, /title=/);
});

test("tablet drawer implements initial focus focus trap escape and focus return", () => {
  assert.match(
    sidebar,
    /querySelector<HTMLElement>\("\[data-personal-nav-item\]"\)/,
  );
  assert.match(sidebar, /event\.key !== "Tab"/);
  assert.match(sidebar, /event\.shiftKey/);
  assert.match(sidebar, /last\.focus\(\)/);
  assert.match(sidebar, /first\.focus\(\)/);
  assert.match(sidebar, /event\.key === "Escape"/);
  assert.match(sidebar, /menuButtonRef\.current\?\.focus\(\)/);
  assert.match(sidebar, /aria-modal=\{drawerOpen \? true : undefined\}/);
  assert.match(
    sidebar,
    /inert=\{tabletDrawerMode && !drawerOpen \? true : undefined\}/,
  );
});

test("drawer locks document and content scrolling then restores each value", () => {
  assert.match(
    sidebar,
    /document\.documentElement\.style\.overflow = "hidden"/,
  );
  assert.match(sidebar, /document\.body\.style\.overflow = "hidden"/);
  assert.match(sidebar, /content\.style\.overflow = "hidden"/);
  assert.match(sidebar, /previousDocumentOverflow/);
  assert.match(sidebar, /previousBodyOverflow/);
  assert.match(sidebar, /previousContentOverflow/);
});

test("mobile bottom navigation has safe area non-color selection and touch sizing", () => {
  assert.match(
    shellCss,
    /grid-template-columns: repeat\(5, minmax\(0, 1fr\)\)/,
  );
  assert.match(shellCss, /env\(safe-area-inset-bottom\)/);
  assert.match(shellCss, /\.navLink\[aria-current="page"\]/);
  assert.match(shellCss, /border-color: #e9cfc4/);
  assert.match(shellCss, /min-height: 52px/);
  assert.match(
    shellCss,
    /:is\(button, a\[href\], summary, select\)[\s\S]*min-height: 44px/,
  );
});

test("page module and action presentation state vocabularies are explicit", () => {
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
});

test("loading route renders structural skeleton rather than a central spinner", () => {
  const loading = read("src/app/(account)/personal-center/loading.tsx");
  assert.match(loading, /<PersonalPageSkeleton variant="overview" \/>/);
  assert.match(states, /skeletonHeader/);
  assert.match(states, /skeletonCardGrid/);
  assert.match(states, /formSkeleton/);
  assert.match(states, /tripCardSkeleton/);
  assert.match(states, /radarSkeleton/);
  assert.doesNotMatch(loading + states, /spinner|京都|大阪|北海道|Yuki/);
});

test("radar skeleton is geometric and shimmer stops with reduced motion", () => {
  assert.match(stateCss, /\.radarSkeleton[\s\S]*border-radius: 50%/);
  assert.match(stateCss, /clip-path: polygon/);
  assert.match(stateCss, /prefers-reduced-motion: reduce/);
  assert.match(stateCss, /animation: none/);
  assert.match(
    shellCss,
    /prefers-reduced-motion: reduce[\s\S]*animation-duration: 0\.01ms/,
  );
});

test("empty state actions are optional and preserve caller-owned business copy", () => {
  assert.match(states, /primaryAction\?: ReactNode/);
  assert.match(states, /secondaryAction\?: ReactNode/);
  assert.match(states, /primaryAction \|\| secondaryAction/);
  assert.doesNotMatch(states, /还没有旅行|还没有保存的同行人|还没有收藏/);
});

test("page error is recoverable and never exposes the internal error", () => {
  const routeError = read("src/app/(account)/personal-center/error.tsx");
  assert.match(routeError, /onRetry=\{reset\}/);
  assert.match(states, /href="\/personal-center"/);
  assert.equal(personalStateCopy.pageError.title, "暂时无法加载这个页面");
  assert.equal(personalStateCopy.pageError.description, "您的数据没有丢失。");
  assert.doesNotMatch(
    states + routeError,
    /error\.message|error\.stack|digest\}/,
  );
});

test("partial module errors remain local presentation components", () => {
  assert.match(states, /data-module-state=\{kind\}/);
  assert.equal(personalStateCopy.partialError.title, "部分内容暂时不可用");
  assert.equal(
    personalStateCopy.partialError.description,
    "其他页面内容不受影响。",
  );
  assert.doesNotMatch(states, /throw new Error|reset\(\)/);
});

test("offline auth-expired and permission states are presentation-only", () => {
  assert.equal(personalStateCopy.offline.title, "当前处于离线状态");
  assert.equal(personalStateCopy.authExpired.action, "重新登录");
  assert.equal(personalStateCopy.permissionUnavailable.title, "权限暂时不可用");
  assert.match(states, /PersonalOfflineBanner\(\{ visible \}/);
  assert.match(states, /actionUnavailable/);
  assert.match(states, /disabled=\{!onRetry\}/);
});

test("action feedback is an accessible live region with distinct tones", () => {
  assert.match(states, /role=\{tone === "error" \? "alert" : "status"\}/);
  assert.match(states, /aria-live="polite"/);
  for (const tone of ["warning", "error", "info"])
    assert.match(stateCss, new RegExp(`data-tone="${tone}"`));
});

test("existing responsive navigation still uses the shared unsaved guard", () => {
  assert.match(navigation, /usePersonalNavigationGuard/);
  assert.match(navigation, /requestNavigation\(href, event\)/);
  assert.match(
    read("src/features/personal-center/components/guarded-link.tsx"),
    /requestNavigation/,
  );
});

test("business models for accepted 5.4 through 5.10 remain untouched", () => {
  const changed = execFileSync(
    "git",
    [
      "diff",
      "--name-only",
      "3ecb5be",
      "--",
      "src/features/profile",
      "src/features/preferences",
      "src/features/companions",
      "src/features/trip-library",
    ],
    { encoding: "utf8" },
  ).trim();
  assert.equal(changed, "");
});

test("5.20 source adds no API persistence auth service worker or booking integration", () => {
  const implementation = [
    states,
    sidebar,
    navigation,
    read("src/features/personal-center/states/personal-state-model.ts"),
    read("src/app/(account)/personal-center/loading.tsx"),
    read("src/app/(account)/personal-center/error.tsx"),
  ].join("\n");
  assert.doesNotMatch(
    implementation,
    /localStorage|sessionStorage|document\.cookie|fetch\(|XMLHttpRequest|indexedDB|supabase|prisma|drizzle|navigator\.serviceWorker|serviceWorker\.register/,
  );
  assert.doesNotMatch(
    implementation,
    /signIn\(|createSession|bookingApi|providerApi|reservationHub/,
  );
});
