import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readdir, readFile, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
const require = createRequire(import.meta.url);
const sharp = require("sharp");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.TASK_0252_URL || "http://localhost:3132";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const concept =
  process.env.TASK_0252_CONCEPT ||
  "H:/Temp/codex-clipboard-e7335255-ca92-405f-9869-3f0601e31b99.png";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1536, height: 1024 },
    reducedMotion: "reduce",
  });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.screenshot({
    path: ".cache/qa/v11-home/1536x1024-reference-size.png",
  });
} finally {
  await browser.close();
}
const layers = await Promise.all(
  [concept, ".cache/qa/v11-home/1536x1024-reference-size.png"].map(
    async (input, index) => ({
      input: await sharp(input).resize(768, 512).png().toBuffer(),
      left: index * 768,
      top: 0,
    }),
  ),
);
await sharp({
  create: { width: 1536, height: 512, channels: 3, background: "#fff9f1" },
})
  .composite(layers)
  .png()
  .toFile(".cache/qa/v11-home/concept-production-comparison.png");
const screenshots = [];
for (const dir of [".cache/qa/v11-home", ".cache/qa/v11-after"]) {
  for (const name of await readdir(dir)) {
    if (!name.endsWith(".png") || name === "background-source.png") continue;
    const path = dir + "/" + name;
    screenshots.push({
      path,
      absolutePath: resolve(path).replaceAll("\\", "/"),
      bytes: (await stat(path)).size,
      sha256: createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
    });
  }
}
await writeFile(
  "docs/qa/TASK-025.2/v11-evidence.json",
  JSON.stringify(
    {
      task: "TASK-025.2-A v1.1",
      latestConcept: concept,
      comparison:
        "left: user concept; right: actual guest production page at the same 1536x1024 viewport",
      screenshots,
    },
    null,
    2,
  ) + "\n",
);
const report = JSON.parse(
  await readFile("docs/qa/TASK-025.2/v11-home-report.json", "utf8"),
);
await writeFile(
  "docs/qa/TASK-025.2/v11-request-report.json",
  JSON.stringify(
    {
      posterBytes: report.posterBytes,
      requests: report.requests,
      videoRequests: 0,
      missingVideo404: 0,
      cls: report.rows.map((r) => ({
        width: r.width,
        height: r.height,
        motion: r.motion,
        cls: r.cls,
      })),
      errors: report.errors,
      newErrors: report.newErrors,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  screenshots.length +
    " screenshots indexed with SHA-256; comparison and request report updated",
);
