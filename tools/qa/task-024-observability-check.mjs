import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const baseUrl = process.env.TASK_024_QA_URL || "http://127.0.0.1:3124";
const origin = new URL(baseUrl).origin;
assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
const externalRequests = [];
let expectedBrowserErrors = 0;
page.on("request", (request) => {
  const url = new URL(request.url());
  if (
    (url.protocol === "http:" || url.protocol === "https:") &&
    url.origin !== origin
  )
    externalRequests.push({
      host: url.host,
      resourceType: request.resourceType(),
    });
});
page.on("pageerror", () => {
  expectedBrowserErrors += 1;
});

try {
  await page.goto(`${baseUrl}/planner`, { waitUntil: "networkidle" });
  await page.evaluate(() => {
    window.dispatchEvent(
      new ErrorEvent("error", {
        error: new Error(
          "Bearer private-canary person@example.test ?token=secret",
        ),
        message: "private-canary",
      }),
    );
    void Promise.reject(new DOMException("private cancellation", "AbortError"));
  });
  await page.waitForTimeout(400);
  const localEvents = await page.evaluate(() => {
    const value =
      globalThis[Symbol.for("travelassist.observability.local-buffer")];
    return Array.isArray(value) ? value : [];
  });
  assert.ok(
    localEvents.some((event) => event.code === "browser_uncaught_error"),
    "real window error entered the local test sink",
  );
  assert.ok(
    localEvents.some(
      (event) =>
        event.code === "browser_expected_cancellation" &&
        event.category === "cancelled" &&
        event.severity === "info",
    ),
    "expected cancellation stays informational",
  );
  assert.doesNotMatch(
    JSON.stringify(localEvents),
    /private-canary|private cancellation|example\.test|Bearer|token=/,
  );
  assert.equal(
    externalRequests.length,
    0,
    "disabled mode emits no external requests",
  );

  const serverResponse = await page.request.get(
    `${baseUrl}/api/observability-test-error`,
  );
  assert.equal(serverResponse.status(), 500);
  const body = await serverResponse.text();
  assert.doesNotMatch(body, /Task024ControlledServerError|stack|private/i);

  for (const path of [
    "/",
    "/start",
    "/planner",
    "/planner?view=detail&day=1",
  ]) {
    await page.goto(baseUrl + path, { waitUntil: "networkidle" });
    const geometry = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    assert.ok(geometry.scrollWidth <= geometry.clientWidth + 1);
  }

  const report = {
    task: "TASK-024-A",
    browser: browser.version(),
    actualBrowserErrorPath: "pass",
    actualExpectedCancellationPath: "pass",
    actualServerRequestErrorPath: "pass",
    localSanitizedEvents: localEvents.map((event) => ({
      type: event.type,
      code: event.code,
      category: event.category,
      severity: event.severity,
      routeTemplate: event.routeTemplate,
    })),
    externalObservationRequests: externalRequests.length,
    expectedBrowserErrors,
    productionFaultInjectionDefault:
      "disabled unless explicit local test env is set",
  };
  await mkdir("docs/qa/task-024", { recursive: true });
  await writeFile(
    "docs/qa/task-024/observability-runtime.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await context.close();
  await browser.close();
}
