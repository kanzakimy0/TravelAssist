import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) =>
  readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("photoreal-v3 assets are wired to the Personal Center visual layer", () => {
  const sidebar = read(
    "src/features/personal-center/components/personal-sidebar.tsx",
  );
  const home = read(
    "src/features/personal-center/components/personal-home-preview.tsx",
  );
  const shellStyles = read(
    "src/features/personal-center/personal-center.module.css",
  );

  assert.match(sidebar, /sidebar-torii-photo\.webp/);
  assert.match(sidebar, /sidebar-sakura-photo-overlay\.png/);
  assert.match(shellStyles, /personal-center-paper-surface\.webp/);
  assert.match(shellStyles, /personal-center-photo-corners\.png/);
  for (const name of ["inspiration", "favorites", "discovery"]) {
    assert.match(home, new RegExp(`feature-card-${name}-photo\\.png`));
  }
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
});
