import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE,
);
const browser = await chromium.launch({ channel: "msedge", headless: true });
const base = process.env.TASK_031_URL || "http://localhost:3134",
  phase = process.env.QA_PHASE || "baseline";
const out = `.cache/qa/task031/${phase}`;
if (!["baseline", "current"].includes(phase)) throw Error("Invalid QA phase");
await mkdir(out, { recursive: true });
const rows = [];
for (const [width, height] of [
  [1440, 900],
  [1024, 768],
  [390, 844],
  [320, 568],
]) {
  for (const state of ["guest", "verified"]) {
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    if (state === "verified")
      await context.addCookies([
        {
          name: "sb-127-auth-token",
          url: base,
          value:
            "base64-" +
            Buffer.from(
              JSON.stringify({
                access_token: "task0252-verified-profile",
                refresh_token: "fixture",
                expires_at: 4102444800,
                expires_in: 3600,
                token_type: "bearer",
                user: {
                  id: "00000000-0000-4000-8000-000000000024",
                  user_metadata: { full_name: "伪造 Cookie 身份" },
                },
              }),
            ).toString("base64url"),
        },
      ]);
    await context.route("https://avatar.example.invalid/verified.webp", (r) =>
      r.fulfill({
        path: "public/media/personal-center/avatar-yuki.webp",
        contentType: "image/webp",
      }),
    );
    const page = await context.newPage();
    for (const [name, path] of [
      ["home", "/"],
      ["start", "/start"],
      ["planner", "/planner"],
      ["detail", "/planner?view=detail&day=1"],
      ...(state === "verified" ? [["personal", "/personal-center"]] : []),
    ]) {
      const errors = [];
      const listener = (e) => errors.push(e.message);
      page.on("pageerror", listener);
      await page.goto(base + path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      if (name === "start")
        await page.getByRole("radio", { name: /第一次去日本/ }).waitFor();
      if (name === "detail") {
        const confirm = page.getByRole("button", {
          name: "保存到浏览器并进入详情",
          exact: true,
        });
        if (await confirm.isVisible()) await confirm.click();
        await page.locator("dialog[open]").waitFor({ state: "hidden" });
      }
      const geometry = await page.evaluate(() =>
        Object.fromEntries(
          [
            "#home-heading",
            'main a[href="/start"]',
            'main a[href="/personal-center"]',
            "[data-wizard-panel]",
            "[data-wizard-content]",
            "[data-map-workspace]",
            "[data-right-panel]",
            "[data-bottom-panel]",
            "[data-detail-sidebar]",
            "[data-detail-column]",
            "[data-timeline-rail]",
            "[class*=bottomSlot]",
            "#personal-content",
            "aside",
          ].flatMap((s) => {
            const e = document.querySelector(s);
            if (!e) return [];
            const r = e.getBoundingClientRect();
            return [[s, { x: r.x, y: r.y, width: r.width, height: r.height }]];
          }),
        ),
      );
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      );
      const screenshot = `${out}/${width}-${state}-${name}.png`;
      await page.screenshot({ path: screenshot });
      rows.push({
        width,
        height,
        state,
        name,
        path,
        geometry,
        overflow,
        errors,
        screenshot,
      });
      page.off("pageerror", listener);
    }
    await context.close();
  }
}
await browser.close();
await writeFile(`${out}/report.json`, JSON.stringify(rows, null, 2));
console.log(`${phase}: ${rows.length} pages captured`);
