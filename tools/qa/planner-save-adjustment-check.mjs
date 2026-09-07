import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const base = process.env.PLANNER_QA_URL || "http://127.0.0.1:3117";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const out = "docs/qa/planner-audit-fixes";
await mkdir(out, { recursive: true });
const b = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
try {
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  p.setDefaultTimeout(10000);
  await p.route("https://api.mapbox.com/**", (r) => r.abort());
  await p.goto(base + "/planner?view=detail&day=1");
  await p.locator("[data-detail-sidebar]").waitFor();
  const before = await p
    .locator("[data-detail-item]")
    .filter({ hasText: "浅草寺" })
    .innerText();
  await p.getByRole("button", { name: "调整后续行程", exact: true }).click();
  let popup = p.locator("#fixed-adjustment-preview");
  assert.match(await popup.innerText(), /10:00–11:30 → 10:15–11:45/);
  await popup.getByRole("button", { name: "保持原计划", exact: true }).click();
  assert.equal(
    await p
      .locator("[data-detail-item]")
      .filter({ hasText: "浅草寺" })
      .innerText(),
    before,
  );
  await p.getByRole("button", { name: "调整后续行程", exact: true }).click();
  await popup
    .getByRole("button", { name: "应用建议（本地）", exact: true })
    .click();
  await p.waitForFunction(() =>
    document
      .querySelector('[data-detail-item][title*="浅草寺"]')
      ?.textContent.includes("10:15"),
  );
  const savedKey = "travelassist.saved-workspace.v1";
  assert.equal(
    await p.evaluate((k) => localStorage.getItem(k), savedKey),
    null,
  );
  await p.getByRole("button", { name: "← 返回推荐", exact: true }).click();
  await p
    .getByRole("dialog", { name: "您有尚未保存的行程修改", exact: true })
    .waitFor();
  await p.getByRole("button", { name: "继续编辑", exact: true }).click();
  await p.getByRole("button", { name: "保存行程", exact: true }).click();
  await p.waitForFunction((k) => localStorage.getItem(k) !== null, savedKey);
  const first = await p.evaluate((k) => localStorage.getItem(k), savedKey);
  await p.getByRole("button", { name: "← 返回推荐", exact: true }).click();
  await p.waitForURL(base + "/planner");
  const depth = p.getByRole("button", { name: /深度体验之旅/ });
  await depth.click();
  await p.waitForFunction(
    () =>
      document
        .querySelector("[data-bottom-plan]")
        ?.getAttribute("data-bottom-plan") === "深度体验之旅",
  );
  await p.getByRole("button", { name: "进入行程详情", exact: true }).click();
  await p.waitForURL(/view=detail/);
  await p.getByRole("button", { name: "保存行程", exact: true }).click();
  let overwrite = p.getByRole("dialog", {
    name: "确认替换浏览器中的行程",
    exact: true,
  });
  await overwrite.waitFor();
  assert.equal(
    await p.evaluate((k) => localStorage.getItem(k), savedKey),
    first,
  );
  await overwrite.getByRole("button", { name: "取消", exact: true }).click();
  assert.equal(
    await p.evaluate((k) => localStorage.getItem(k), savedKey),
    first,
  );
  await p.getByRole("button", { name: "保存行程", exact: true }).click();
  await overwrite
    .getByRole("button", { name: "确认替换并保存", exact: true })
    .click();
  await p.waitForFunction(
    (k) =>
      JSON.parse(localStorage.getItem(k)).snapshot.currentPlanId === "depth",
    savedKey,
  );
  await p.screenshot({ path: out + "/overwrite-saved.png" });
  await p.reload();
  await p.waitForFunction(() =>
    document
      .querySelector("[data-browser-trip-actions]")
      ?.textContent.includes("已载入上次保存"),
  );
  await p.getByRole("button", { name: "← 返回推荐", exact: true }).click();
  await p.waitForURL(base + "/planner");
  await p.getByRole("button", { name: "全日", exact: true }).click();
  await p.getByRole("tab", { name: "旅行体检", exact: true }).click();
  await p.getByRole("button", { name: "定位 Day 3", exact: true }).click();
  await p.getByRole("button", { name: "进入行程详情", exact: true }).click();
  await p.waitForURL(/view=detail&day=3/);
  const result = {
    safeAdjustment: true,
    cancelNoChange: true,
    unsavedGuard: true,
    overwriteCancel: true,
    overwriteConfirm: true,
    refreshRestores: true,
    focusedDayEntry: true,
  };
  await writeFile(
    out + "/save-adjustment.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(result);
} finally {
  await b.close();
}
