import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3113";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out =
  process.env.PLANNER_QA_OUT || "docs/qa/planner-density/quick-popovers";
await mkdir(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_EXE,
  headless: true,
});
const results = [],
  errors = [];

async function visibleSurface(surface, page) {
  await surface.waitFor({ state: "visible" });
  const actual = await surface.evaluate((e) => {
    const r = e.getBoundingClientRect();
    return {
      x: r.x,
      y: r.y,
      right: r.right,
      bottom: r.bottom,
      width: r.width,
      topLayer: e.matches(":popover-open"),
      hit: e.contains(
        document.elementFromPoint(
          r.x + r.width / 2,
          r.y + Math.min(30, r.height / 2),
        ),
      ),
    };
  });
  const viewport = page.viewportSize();
  assert.ok(
    actual.topLayer && actual.hit,
    "surface must be on screen and receive pointer input",
  );
  assert.ok(
    actual.x >= 0 &&
      actual.y >= 0 &&
      actual.right <= viewport.width + 1 &&
      actual.bottom <= viewport.height + 1,
    JSON.stringify(actual),
  );
  return actual;
}

try {
  for (const reducedMotion of ["no-preference", "reduce"]) {
    for (const [width, height] of [
      [1440, 900],
      [1280, 800],
      [1024, 768],
      [390, 844],
      [320, 740],
    ]) {
      const page = await browser.newPage({
        viewport: { width, height },
        reducedMotion,
      });
      page.setDefaultTimeout(12000);
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("https://api.mapbox.com/**", (r) => r.abort("failed"));
      await page.goto(base + "/planner");
      await page
        .getByText("底图暂不可用 · 已切换可操作示意地图", { exact: true })
        .waitFor();
      // Exercise the finished entry animation too: its fill-mode retains transform.
      await page.waitForTimeout(300);
      if (width < 1200)
        await page
          .getByRole("button", { name: "旅行设置与方案", exact: true })
          .click();
      for (const [key, title] of [
        ["travelers", "同行人"],
        ["dates", "旅行日期"],
        ["sights", "景点偏好"],
        ["food", "餐饮偏好"],
        ["stay", "住宿偏好"],
      ]) {
        const trigger = page
          .locator("[data-right-upper]")
          .getByRole("button", { name: new RegExp("^" + title) });
        await trigger.click();
        const surface = page.locator("#quick-" + key);
        await visibleSurface(surface, page);
        if (reducedMotion === "no-preference" && [1440, 390].includes(width))
          await page.screenshot({ path: `${out}/${width}-${key}-quick.png` });
        if (key === "travelers") {
          const count = surface.getByLabel("成人男性人数", { exact: true });
          const n = Number(await count.innerText());
          await surface
            .getByRole("button", { name: "增加成人男性", exact: true })
            .click();
          assert.equal(Number(await count.innerText()), n + 1);
          await surface
            .getByRole("button", { name: "减少成人男性", exact: true })
            .click();
        } else if (key === "dates") {
          if (
            width === 1440 &&
            (await surface.locator("[data-date]").count())
          ) {
            const departureInput = surface.getByLabel("出发日期", {
              exact: true,
            });
            const returnInput = surface.getByLabel("返回日期", { exact: true });
            const originalDeparture = await departureInput.inputValue();
            const originalReturn = await returnInput.inputValue();
            const originalSummary = await trigger.innerText();
            const later = new Date(originalReturn + "T12:00:00Z");
            later.setUTCDate(later.getUTCDate() + 2);
            const extended = later.toISOString().slice(0, 10);
            await surface.locator(`[data-date="${originalDeparture}"]`).click();
            await surface.locator(`[data-date="${originalReturn}"]`).focus();
            await page.keyboard.press("ArrowRight");
            await page.keyboard.press("ArrowRight");
            await page.keyboard.press("Enter");
            assert.equal(await returnInput.inputValue(), extended);
            assert.equal(
              await trigger.innerText(),
              originalSummary,
              "calendar edits stay draft",
            );
            await page.keyboard.press("Escape");
            await trigger.click();
            assert.equal(
              await returnInput.inputValue(),
              originalReturn,
              "closing without apply discards date draft",
            );
            await returnInput.fill(originalDeparture);
            await surface
              .getByRole("button", { name: "应用日期区间", exact: true })
              .click();
            assert.match(await surface.innerText(), /超出/);
            assert.equal(
              await trigger.innerText(),
              originalSummary,
              "protected dates retained",
            );
            await returnInput.fill(originalReturn);
            await surface
              .getByRole("button", { name: "下个月", exact: true })
              .click();
            assert.equal(
              await surface
                .locator('[data-date][tabindex="0"]:enabled')
                .count(),
              1,
              "calendar keeps a keyboard entry after month change",
            );
            await surface
              .getByRole("button", { name: "上个月", exact: true })
              .click();
          }
          await surface.getByLabel("出发日期", { exact: true }).focus();
          await surface
            .getByRole("button", { name: "应用日期区间", exact: true })
            .click();
        } else {
          const choice = surface.locator("button[aria-pressed]").first();
          const pressed = await choice.getAttribute("aria-pressed");
          await choice.click();
          assert.notEqual(await choice.getAttribute("aria-pressed"), pressed);
          await choice.click();
          const detailTrigger = surface.getByRole("button", {
            name: /更多设置/,
          });
          await detailTrigger.click();
          const detail = page.locator("#preference-detail-" + key);
          await visibleSurface(detail, page);
          const sections = detail
            .getByRole("group", { name: "详细设置分区" })
            .locator("button");
          if (await sections.count()) {
            const initialField = detail.locator("input").first();
            const initialValue = await initialField.inputValue();
            await initialField.fill("跨分区保留测试");
            await sections.last().click();
            await sections.first().click();
            assert.equal(await initialField.inputValue(), "跨分区保留测试");
            await initialField.fill(initialValue);
            const fieldLabels = new Set();
            for (let index = 0; index < (await sections.count()); index++) {
              await sections.nth(index).click();
              await visibleSurface(detail, page);
              const fields = detail.locator("input");
              for (let i = 0; i < (await fields.count()); i++) {
                const field = fields.nth(i);
                fieldLabels.add(
                  await field.evaluate((e) => e.parentElement.textContent),
                );
                const old = await field.inputValue();
                await field.fill("分区编辑验证");
                await field.fill(old);
              }
            }
            assert.equal(
              fieldLabels.size,
              key === "stay" ? 20 : 17,
              "all original fields remain reachable",
            );
            await sections.first().click();
          }
          const input = detail.locator("input").last();
          const original = await input.inputValue();
          await input.fill("弹层交互验收");
          assert.equal(await input.inputValue(), "弹层交互验收");
          await input.fill(original);
          await input.scrollIntoViewIfNeeded();
          await page.screenshot({
            path: `${out}/${width}-${reducedMotion}-${key}.png`,
          });
          await page.keyboard.press("Escape");
          assert.equal(await detail.count(), 0);
          assert.ok(
            await detailTrigger.evaluate((e) => e === document.activeElement),
          );
          await visibleSurface(surface, page);
        }
        await page.keyboard.press("Escape");
        assert.equal(await surface.count(), 0);
        assert.ok(await trigger.evaluate((e) => e === document.activeElement));
      }
      // Use the viewport edge, outside the popover's guaranteed 12px inset.
      await page
        .locator("[data-right-upper]")
        .getByRole("button", { name: /同行人/ })
        .click();
      await page.mouse.click(width - 3, height - 3);
      assert.equal(await page.locator("#quick-travelers").count(), 0);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      results.push({
        width,
        height,
        reducedMotion,
        quickCards: 5,
        nestedDetails: 3,
        visibility: "in viewport and hit tested",
        edit: "passed",
        escapeAndFocus: "passed",
      });
      await page.close();
    }
  }
  assert.deepEqual(errors, []);
} finally {
  await browser.close();
  await writeFile(
    `${out}/report.json`,
    JSON.stringify({ results, errors }, null, 2) + "\n",
  );
}
console.log(JSON.stringify({ results, errors }));
