import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const { chromium } = createRequire(import.meta.url)(
  process.env.PLAYWRIGHT_MODULE || "playwright",
);
const baseUrl = process.env.TASK_024_URL || "http://127.0.0.1:3124";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseUrl).hostname));
const output = process.env.TASK_024_OUTPUT || "docs/qa/task-024/head.json";
const runLabel = process.env.TASK_024_LABEL || "head";
const routes = [
  { id: "home", path: "/" },
  { id: "start", path: "/start" },
  { id: "planner", path: "/planner" },
  { id: "detail", path: "/planner?view=detail&day=1" },
];
const viewports = [
  { id: "desktop", width: 1440, height: 900 },
  { id: "mobile", width: 390, height: 844 },
];
const median = (values) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? null;
};
const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROME_EXE,
});
const samples = [];
const runtimeErrors = [];

async function installLabObservers(page) {
  await page.addInitScript(() => {
    window.__task024 = { cls: 0, lcp: null, inp: null };
    for (const [type, callback] of [
      [
        "largest-contentful-paint",
        (entry) => (window.__task024.lcp = entry.startTime),
      ],
      [
        "layout-shift",
        (entry) => {
          if (!entry.hadRecentInput) window.__task024.cls += entry.value;
        },
      ],
      [
        "event",
        (entry) => {
          if (
            entry.interactionId &&
            (!window.__task024.inp || entry.duration > window.__task024.inp)
          )
            window.__task024.inp = entry.duration;
        },
      ],
    ]) {
      try {
        new PerformanceObserver((list) =>
          list.getEntries().forEach(callback),
        ).observe(
          type === "event"
            ? { type, buffered: true, durationThreshold: 16 }
            : { type, buffered: true },
        );
      } catch {}
    }
  });
}

async function pageMetrics(page) {
  return page.evaluate(() => {
    const navigation = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    const bytes = (predicate) =>
      resources
        .filter(predicate)
        .reduce(
          (sum, item) => sum + (item.encodedBodySize || item.transferSize || 0),
          0,
        );
    return {
      ttfbMs: navigation?.responseStart ?? null,
      domContentLoadedMs: navigation?.domContentLoadedEventEnd ?? null,
      loadMs: navigation?.loadEventEnd ?? null,
      transferBytes: (navigation?.transferSize || 0) + bytes(() => true),
      jsTransferBytes: bytes(
        (item) =>
          item.initiatorType === "script" || /\.js(?:\?|$)/.test(item.name),
      ),
      fontTransferBytes: bytes((item) =>
        /\.(?:woff2?|ttf)(?:\?|$)/.test(item.name),
      ),
      mediaTransferBytes: bytes((item) =>
        /\.(?:png|jpe?g|webp|avif|svg|mp4|webm)(?:\?|$)/.test(item.name),
      ),
      mapboxTransferBytes: bytes((item) => /mapbox/i.test(item.name)),
      lcpMs: window.__task024?.lcp ?? null,
      cls: window.__task024?.cls ?? null,
      inpSampleMs: window.__task024?.inp ?? null,
      domNodes: document.getElementsByTagName("*").length,
    };
  });
}

try {
  for (const viewport of viewports) {
    for (const route of routes) {
      for (let run = 1; run <= 3; run += 1) {
        const context = await browser.newContext({
          viewport,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        await installLabObservers(page);
        page.on("pageerror", (error) =>
          runtimeErrors.push({
            route: route.id,
            kind: "pageerror",
            name: error.name,
          }),
        );
        page.on("console", (message) => {
          if (message.type() === "error")
            runtimeErrors.push({ route: route.id, kind: "console-error" });
        });
        const cdp = await context.newCDPSession(page);
        await cdp.send("Network.enable");
        await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
        const start = performance.now();
        await page.goto(baseUrl + route.path, {
          waitUntil: "networkidle",
          timeout: 45_000,
        });
        const elapsedMs = performance.now() - start;
        await page
          .locator("body")
          .click({ position: { x: 8, y: 8 } })
          .catch(() => {});
        await page.waitForTimeout(600);
        samples.push({
          viewport: viewport.id,
          route: route.id,
          run,
          elapsedMs,
          ...(await pageMetrics(page)),
        });
        await context.close();
      }
    }
  }

  const compact = await browser.newContext({
    viewport: { width: 320, height: 740 },
    reducedMotion: "reduce",
  });
  const compactPage = await compact.newPage();
  const compactOverflow = [];
  for (const route of routes) {
    await compactPage.goto(baseUrl + route.path, {
      waitUntil: "networkidle",
      timeout: 45_000,
    });
    compactOverflow.push({
      route: route.id,
      ...(await compactPage.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
        overflow:
          document.documentElement.scrollWidth >
          document.documentElement.clientWidth + 1,
      }))),
    });
  }
  await compact.close();

  const medians = viewports.flatMap((viewport) =>
    routes.map((route) => {
      const group = samples.filter(
        (item) => item.viewport === viewport.id && item.route === route.id,
      );
      return {
        viewport: viewport.id,
        route: route.id,
        runs: group.length,
        median: Object.fromEntries(
          [
            "elapsedMs",
            "ttfbMs",
            "domContentLoadedMs",
            "loadMs",
            "transferBytes",
            "jsTransferBytes",
            "fontTransferBytes",
            "mediaTransferBytes",
            "mapboxTransferBytes",
            "lcpMs",
            "cls",
            "inpSampleMs",
            "domNodes",
          ].map((key) => [key, median(group.map((item) => item[key]))]),
        ),
      };
    }),
  );

  const cycleContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const cyclePage = await cycleContext.newPage();
  let requests = 0;
  cyclePage.on("request", (request) => {
    if (new URL(request.url()).origin === new URL(baseUrl).origin)
      requests += 1;
  });
  await cyclePage.goto(`${baseUrl}/planner`, { waitUntil: "networkidle" });
  const cycleSamples = [];
  let cycleError = null;
  try {
    for (let cycle = 1; cycle <= 20; cycle += 1) {
      await cyclePage.goto(`${baseUrl}/planner?view=detail&day=1`, {
        waitUntil: "networkidle",
      });
      await cyclePage.goto(`${baseUrl}/planner`, { waitUntil: "networkidle" });
      cycleSamples.push(
        await cyclePage.evaluate(
          ({ cycle, requests }) => ({
            cycle,
            requests,
            domNodes: document.getElementsByTagName("*").length,
            heapBytes: performance.memory?.usedJSHeapSize ?? null,
            mapCanvases: document.querySelectorAll(".mapboxgl-canvas").length,
          }),
          { cycle, requests },
        ),
      );
    }
  } catch (error) {
    cycleError = error instanceof Error ? error.name : "UnknownError";
  }
  const first = cycleSamples[0];
  const last = cycleSamples.at(-1);
  const workspaceCycles = {
    requested: 20,
    completed: cycleSamples.length,
    method: "production App routes; fallback map; full navigation lifecycle",
    first,
    last,
    error: cycleError,
    pass:
      cycleSamples.length === 20 &&
      !cycleError &&
      last.domNodes <= first.domNodes * 1.2 &&
      last.mapCanvases <= 1,
    limitations: [
      "Fallback mode has no live Mapbox instance; bindMap lifecycle is covered by repository unit tests.",
      "Heap is a Chromium laboratory trend only and does not prove absence of every leak.",
    ],
  };
  await cycleContext.close();

  const result = {
    task: "TASK-024-A",
    label: runLabel,
    commit: process.env.TASK_024_COMMIT || "unknown",
    generatedAt: new Date().toISOString(),
    browser: `Chrome ${browser.version()}`,
    environment: {
      node: process.version,
      productionBuild: true,
      mapMode: "fallback",
      cache: "disabled for cold-load samples",
      reducedMotion: true,
      networkThrottling: "none",
      cpuThrottling: "none",
      fixture:
        "merged app defaults; synthetic scale fixtures tested separately",
    },
    samples,
    medians,
    compactOverflow,
    workspaceCycles,
    runtimeErrors,
    limitations: [
      "Laboratory samples are not real-user p75.",
      "TBT is not substituted for INP; unsupported/unobserved INP is null.",
      "Fallback measurements do not represent real Mapbox performance.",
    ],
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(result, null, 2) + "\n");
  console.log(
    JSON.stringify(
      {
        output,
        medians,
        compactOverflow,
        workspaceCycles,
        runtimeErrorCount: runtimeErrors.length,
      },
      null,
      2,
    ),
  );
} finally {
  await browser.close();
}
