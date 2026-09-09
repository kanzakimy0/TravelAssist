import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE,
);
const base = "http://localhost:3132";
const review = process.env.TASK_0252_REVIEW_NAME || "v11";
assert.ok(/^[a-z0-9-]+$/.test(review));
const screenshots = `.cache/qa/${review}-home`;
await mkdir(screenshots, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const rows = [];
try {
  for (const width of [1672, 1440, 1024, 390, 320]) {
    for (const mode of ["verified", "neutral", "invalid"]) {
      const context = await browser.newContext({
        viewport: {
          width,
          height:
            width === 320
              ? 568
              : width === 390
                ? 844
                : width === 1024
                  ? 768
                  : width === 1672
                    ? 941
                    : 900,
        },
        reducedMotion: "reduce",
      });
      await context.addCookies([
        {
          name: "sb-127-auth-token",
          url: base,
          value:
            "base64-" +
            Buffer.from(
              JSON.stringify({
                access_token:
                  mode === "verified"
                    ? "task0252-verified-profile"
                    : mode === "neutral"
                      ? "task024-visual-fixture"
                      : "unverified-token",
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
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route(
        "https://avatar.example.invalid/verified.webp",
        (route) =>
          route.fulfill({
            path: "public/media/personal-center/travelassist-logo-torii.png",
            contentType: "image/png",
          }),
      );
      await page.goto(base, { waitUntil: "networkidle" });
      assert.equal(await page.getByText("伪造 Cookie 身份").count(), 0);
      assert.equal(await page.getByText("Yuki", { exact: false }).count(), 0);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      if (mode === "invalid")
        assert.ok(
          await page
            .getByRole("link", { name: "登录", exact: true })
            .isVisible(),
        );
      else {
        assert.equal(
          await page.getByRole("link", { name: "登录", exact: true }).count(),
          0,
        );
        const account = page
          .getByRole("main")
          .getByRole("link", {
            name: mode === "verified" ? "验收账户 · 个人中心" : "进入个人中心",
          })
          .filter({ visible: true });
        assert.equal(await account.count(), 1);
        assert.equal(await account.getAttribute("href"), "/personal-center");
        if (mode === "verified") {
          const image = account.locator("[data-account-avatar] img");
          assert.ok(await image.isVisible());
          assert.equal(
            await image.getAttribute("src"),
            "https://avatar.example.invalid/verified.webp",
          );
          await page.screenshot({
            path: screenshots + "/" + width + "-authenticated.png",
          });
          await image.evaluate((el) =>
            el.dispatchEvent(new Event("error", { bubbles: true })),
          );
          await account
            .locator("[data-account-avatar]")
            .getByText("旅", { exact: true })
            .waitFor();
        }
        await account.click();
        await page.waitForURL("**/personal-center");
        await page.locator("#personal-content").waitFor();
      }
      assert.deepEqual(errors, []);
      rows.push({
        width,
        mode,
        verifiedIdentity: true,
        noCookieIdentity: true,
        avatarFallback: true,
        errors,
      });
      await context.close();
    }
  }
  await writeFile(
    `docs/qa/TASK-025.2/${review}-auth-report.json`,
    JSON.stringify(
      {
        fixture:
          "Local verified/neutral/rejected sessions; synthetic avatar response, no real credentials",
        rows,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(
    rows.length + "/15 verified/neutral/invalid session viewport cases PASS",
  );
} finally {
  await browser.close();
}
