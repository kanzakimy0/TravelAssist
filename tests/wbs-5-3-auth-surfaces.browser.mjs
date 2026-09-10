// Anonymous visual QA only. CDP forces CSS autofill states, not a saved account.
// No real Auth requests, mail, browser credentials or database cleanup.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CODEX_PLAYWRIGHT_PATH);
const sharp = createRequire(path.join(process.cwd(), "package.json"))("sharp");
const base = process.env.WBS_BASE_URL;
assert.equal(base, "http://127.0.0.1:3000");
const evidence = process.env.WBS_EVIDENCE_DIR;
assert.ok(evidence);
await mkdir(evidence, { recursive: true });
const browser = await chromium.launch(
  process.env.WBS_BROWSER === "edge"
    ? { channel: "msedge", headless: true }
    : { headless: true },
);
const context = await browser.newContext();
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send("DOM.enable");
await cdp.send("CSS.enable");
let authWrites = 0;
let errors = 0;
page.on("pageerror", () => errors++);
await page.route("**/auth/**", (route) => {
  if (route.request().method() === "POST") {
    authWrites++;
    return route.abort();
  }
  return route.continue();
});
const results = [];
async function raw(buffer) {
  return sharp(buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}
function pixel(image, x, y) {
  const offset = (y * image.info.width + x) * image.info.channels;
  return [...image.data.subarray(offset, offset + 3)];
}
try {
  for (const [width, height] of [
    [1440, 900],
    [1280, 720],
    [320, 740],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of ["/login", "/register", "/forgot-password"]) {
      await page.goto(base + route, { waitUntil: "networkidle" });
      if (route === "/login")
        await page.getByRole("tab", { name: "邮箱登录", exact: true }).click();
      const email = page.getByLabel("邮箱地址", { exact: true });
      const { root } = await cdp.send("DOM.getDocument");
      const { nodeId } = await cdp.send("DOM.querySelector", {
        nodeId: root.nodeId,
        selector: 'input[type="email"]',
      });
      assert.ok(nodeId);
      const states = [];
      async function checkInput(label, autofill) {
        const style = await email.evaluate((el) => {
          const css = getComputedStyle(el);
          return {
            autofill: el.matches(":autofill"),
            boxShadow: css.boxShadow,
            textColor: css.webkitTextFillColor,
            caretColor: css.caretColor,
            background: css.backgroundColor,
            autocomplete: el.autocomplete,
          };
        });
        assert.equal(style.autofill, autofill, label + " CSS state exercised");
        assert.equal(style.autocomplete, "email", "Autofill remains enabled");
        const pixels = await raw(await email.screenshot()); // In memory only; never persist entered values.
        const surface = pixel(pixels, Math.floor(pixels.info.width / 2), 5);
        assert.deepEqual(
          surface,
          [255, 253, 251],
          label + " same painted surface as input row",
        );
        if (autofill) {
          assert.match(style.boxShadow, /inset/);
          assert.equal(style.textColor, "rgb(23, 35, 50)");
          assert.equal(style.caretColor, "rgb(23, 35, 50)");
        }
        states.push({ label, ...style, paintedRGB: surface });
      }
      await checkInput("empty", false);
      await email.fill("surface-only@example.test");
      await checkInput("manually-filled", false);
      await cdp.send("CSS.forcePseudoState", {
        nodeId,
        forcedPseudoClasses: ["autofill"],
      });
      await checkInput("forced-autofill", true);
      await email.hover();
      await checkInput("autofill-hover", true);
      await email.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      assert.equal(
        await email.evaluate(
          (el) =>
            el === document.activeElement &&
            getComputedStyle(el).outlineWidth === "3px",
        ),
        true,
        "Keyboard focus remains visible",
      );
      await checkInput("autofill-keyboard-focus", true);
      await page.getByRole("heading", { level: 1 }).click();
      await checkInput("autofill-blur", true);
      await page.emulateMedia({ forcedColors: "active" });
      assert.equal(
        await email.evaluate((el) => getComputedStyle(el).boxShadow),
        "none",
        "Respect forced-colors palette",
      );
      await page.emulateMedia({ forcedColors: "none" });
      await cdp.send("CSS.forcePseudoState", {
        nodeId,
        forcedPseudoClasses: [],
      });
      await email.fill("");
      await page.getByRole("heading", { level: 1 }).click();
      await page.evaluate(() => window.scrollTo(0, 0));

      const card = page.locator("#auth-content");
      const ornament = card.locator(':scope > [aria-hidden="true"]');
      const geometry = await card.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const art = el.querySelector(':scope > [aria-hidden="true"]');
        const artRect = art.getBoundingClientRect();
        return {
          card: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
          },
          art: {
            x: artRect.x,
            y: artRect.y,
            width: artRect.width,
            height: artRect.height,
          },
          radius: parseFloat(getComputedStyle(el).borderTopRightRadius),
          clipRadius: parseFloat(getComputedStyle(art).borderTopRightRadius),
          artOverflow: getComputedStyle(art).overflow,
          cardOverflow: getComputedStyle(el).overflow,
          background: getComputedStyle(el.parentElement.parentElement)
            .backgroundImage,
        };
      });
      assert.equal(geometry.clipRadius, geometry.radius - 1);
      assert.equal(geometry.artOverflow, "hidden");
      assert.equal(
        geometry.cardOverflow,
        "visible",
        "Do not clip form focus outlines",
      );
      assert.match(
        geometry.background,
        /personal-center-surface-texture-v2\.png/,
      );
      await page.waitForFunction(() =>
        performance
          .getEntriesByType("resource")
          .some((entry) =>
            entry.name.includes("personal-center-surface-texture-v2.png"),
          ),
      );
      const visible = await raw(await page.screenshot());
      await ornament.evaluate((el) => {
        el.style.visibility = "hidden";
      });
      const hidden = await raw(await page.screenshot());
      await ornament.evaluate((el) => {
        el.style.visibility = "";
      });
      const { x, y, width: cardWidth } = geometry.card;
      const centerX = x + cardWidth - geometry.radius;
      const centerY = y + geometry.radius;
      let outsidePaint = 0;
      let paintedPixels = 0;
      for (
        let py = Math.ceil(geometry.art.y);
        py < Math.min(height, geometry.art.y + geometry.art.height);
        py++
      ) {
        for (
          let px = Math.ceil(geometry.art.x);
          px < Math.min(width, geometry.art.x + geometry.art.width);
          px++
        ) {
          const a = pixel(visible, px, py);
          const b = pixel(hidden, px, py);
          const changed = a.some((channel, i) => Math.abs(channel - b[i]) > 1);
          if (changed) paintedPixels++;
          if (
            changed &&
            px > centerX &&
            py < centerY &&
            Math.hypot(px + 0.5 - centerX, py + 0.5 - centerY) >
              geometry.radius + 1
          )
            outsidePaint++;
        }
      }
      assert.ok(
        paintedPixels > 100,
        "Decoration is present, not removed to pass clipping QA",
      );
      assert.equal(
        outsidePaint,
        0,
        "No painted branch outside card rounded corner",
      );
      await page.screenshot({
        path: path.join(
          evidence,
          `${width}x${height}${route.replaceAll("/", "-")}.png`,
        ),
        fullPage: true,
      });
      results.push({
        width,
        height,
        route,
        states,
        geometry,
        paintedPixels,
        outsidePaint,
      });
      console.log(
        `PASS ${width}x${height} ${route}: 6 input paint states and rounded-corner pixel check`,
      );
    }
  }
  assert.equal(authWrites, 0);
  assert.equal(errors, 0);
  await writeFile(
    path.join(evidence, "summary.json"),
    JSON.stringify(
      {
        status: "PASS",
        browser: browser.version(),
        autofillMechanism: "CDP CSS.forcePseudoState; not saved-credential E2E",
        accountDataTouched: false,
        results,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
