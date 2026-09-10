// Isolated presentation QA using the actual CSS. Does not log in or touch Auth data.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH);
const css = readFileSync(
  new URL(
    "../src/features/personal-center/personal-center.module.css",
    import.meta.url,
  ),
  "utf8",
);
const icons = readFileSync(
  new URL(
    "../src/features/personal-center/components/personal-icon.tsx",
    import.meta.url,
  ),
  "utf8",
);
const logoutPath = icons.match(/logout: "([^"]+)"/)[1];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.setContent(
      `<style>${css}</style><div class="shell"><div class="avatarPopover" style="top:24px;left:14px"><button class="avatarLogout" aria-label="退出登录"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="${logoutPath}"/></svg><span>退出登录</span></button></div></div>`,
    );
    const button = page.getByRole("button", { name: "退出登录" });
    const appearance = () =>
      button.evaluate((el) => {
        const s = getComputedStyle(el),
          r = el.getBoundingClientRect();
        return {
          background: s.backgroundColor,
          cursor: s.cursor,
          outline: s.outlineWidth,
          shadow: s.boxShadow,
          opacity: s.opacity,
          width: r.width,
          height: r.height,
        };
      });
    await page.mouse.move(0, 0);
    const rest = await appearance();
    assert.ok(rest.width >= 44 && rest.height >= 44);
    assert.equal(rest.cursor, "pointer");
    await button.hover();
    const hover = await appearance();
    assert.notEqual(hover.background, rest.background);
    await page.mouse.down();
    assert.notEqual((await appearance()).shadow, "none");
    await page.mouse.up();
    await button.evaluate((el) => el.blur());
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    assert.equal(
      await button.evaluate((el) => document.activeElement === el),
      true,
    );
    assert.ok(parseFloat((await appearance()).outline) >= 3);
    await button.evaluate((el) => {
      el.disabled = true;
    });
    assert.equal((await appearance()).cursor, "wait");
    assert.ok(parseFloat((await appearance()).opacity) < 1);
    console.log(
      `PASS ${width}px: 44px target, hover, pressed, keyboard focus and disabled feedback`,
    );
  }
} finally {
  await browser.close();
}
