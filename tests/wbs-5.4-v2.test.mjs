import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("approved concept assets are wired to the Personal Center visual layer", () => {
  const sidebar = read(
    "src/features/personal-center/components/personal-sidebar.tsx",
  );
  const home = read(
    "src/features/personal-center/components/personal-home-preview.tsx",
  );
  const shellStyles = read(
    "src/features/personal-center/personal-center.module.css",
  );

  assert.match(sidebar, /sidebar-torii-watercolor-v2\.png/);
  assert.match(sidebar, /sidebar-shell-ornament-top\.png/);
  assert.match(sidebar, /travelassist-logo-torii\.png/);
  const identity = read(
    "src/features/personal-center/constants/personal-navigation.ts",
  );
  assert.match(identity, /avatar-yuki\.webp/);
  assert.match(sidebar, /mockPersonalUser\.avatar/);
  assert.match(shellStyles, /personal-center-surface-texture-v2\.png/);
  assert.match(shellStyles, /personal-center-corner-decorations\.png/);
  assert.match(home, /hero-kyoto-sakura\.webp/);
  assert.match(home, /trip-kyoto-gion\.webp/);
  assert.match(home, /trip-osaka-castle\.webp/);
  assert.match(home, /trip-hokkaido-winter\.webp/);
  for (const name of ["inspiration", "favorites", "discovery"]) {
    assert.match(home, new RegExp(`feature-card-${name}-bg\\.png`));
  }
  assert.doesNotMatch(home, /home-hero-poster\.webp/);
  assert.doesNotMatch(
    `${sidebar}\n${home}\n${shellStyles}`,
    /personal-center\/photoreal-v3/,
  );
});

test("desktop home keeps a floating sidebar and first-screen feature modules", () => {
  const shellStyles = read(
    "src/features/personal-center/personal-center.module.css",
  );

  assert.match(shellStyles, /@media \(min-width: 1280px\)/);
  assert.match(
    shellStyles,
    /grid-template-columns: clamp\(216px, 15\.5vw, 288px\)/,
  );
  assert.match(shellStyles, /\.sidebar \{[\s\S]*?border-radius: 22px/);
  assert.match(
    shellStyles,
    /\.home > \.pageHeading \{[\s\S]*?clip-path: inset\(50%\)/,
  );
  assert.match(
    shellStyles,
    /\.nextTrip \{[\s\S]*?min-height: clamp\(245px, 34vh, 360px\)/,
  );
  assert.match(
    shellStyles,
    /\.tripCard \{[\s\S]*?min-height: clamp\(170px, 24vh, 250px\)/,
  );
  assert.match(
    shellStyles,
    /\.featureCard \{[\s\S]*?min-height: clamp\(96px, 13vh, 135px\)/,
  );
  assert.match(shellStyles, /\.main::before \{[\s\S]*?display: none/);
  assert.match(
    shellStyles,
    /@media \(min-width: 1280px\) and \(max-height: 780px\)/,
  );
});

test("Profile Account remains explicit in-memory UI with required flows", () => {
  const account = read("src/features/profile/profile-account.tsx");
  const route = read("src/app/(account)/personal-center/account/page.tsx");

  assert.match(route, /<ProfileAccount/);
  assert.match(account, /管理您的个人资料与基本设置/);
  assert.match(account, /更换头像/);
  assert.match(account, /删除头像/);
  assert.match(account, /恢复默认头像/);
  assert.match(account, /已验证/);
  assert.match(account, /添加紧急联系人/);
  assert.match(account, /登录与安全/);
  assert.match(account, /数据与隐私/);
  assert.match(account, /预订与账户同步/);
  assert.match(account, /data-account-page/);
  assert.match(
    account,
    /管理您的个人资料与基本设置，让 TravelAssist 更好地为您服务。/,
  );
  assert.doesNotMatch(account, /管理登录与安全设置/);
  assert.match(account, /<p>其他设置<\/p>/);
  assert.doesNotMatch(account, /localStorage|fetch\(|supabase|cookie/i);
});

test("unsaved edits guard sidebar, avatar links and browser unload", () => {
  const guard = read(
    "src/features/personal-center/components/navigation-guard-context.tsx",
  );
  const nav = read(
    "src/features/personal-center/components/personal-primary-nav.tsx",
  );
  const popover = read(
    "src/features/personal-center/components/avatar-popover.tsx",
  );

  assert.match(guard, /beforeunload/);
  assert.match(guard, /navigationType !== "traverse"/);
  assert.match(guard, /您有尚未保存的修改/);
  assert.match(nav, /requestNavigation/);
  assert.match(popover, /requestNavigation/);
});

test("account management entries have dedicated non-business routes", () => {
  for (const route of ["security", "privacy", "booking-sync"]) {
    const source = read(
      `src/app/(account)/personal-center/account/${route}/page.tsx`,
    );
    assert.match(source, /AccountSubpage/);
  }
  const subpage = read("src/features/profile/account-subpage.tsx");
  assert.match(subpage, /不会连接 Auth、API 或数据库/);
  assert.match(
    read("src/app/(account)/personal-center/account/privacy/delete/page.tsx"),
    /kind="deleteAccount"/,
  );
  for (const title of [
    "账户保护",
    "登录方式",
    "登录设备",
    "最近安全活动",
    "您的数据",
    "导出我的数据",
    "数据管理",
    "危险区域",
    "Booking.com",
    "确认邮件",
    "导入已有预订",
    "永久删除账户",
  ]) {
    assert.match(subpage, new RegExp(title));
  }
  assert.doesNotMatch(
    subpage,
    /fetch\(|localStorage|sessionStorage|supabase|createSession/i,
  );
});
