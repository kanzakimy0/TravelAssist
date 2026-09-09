import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";

const baselinePath =
  process.env.TASK_024_BASELINE || "docs/qa/task-024/baseline.json";
const headPath = process.env.TASK_024_HEAD || "docs/qa/task-024/head.json";
const outputPath =
  process.env.TASK_024_BUDGET || "docs/qa/task-024/budget.json";
const baseline = JSON.parse(await readFile(baselinePath, "utf8"));
const head = JSON.parse(await readFile(headPath, "utf8"));
const failures = [];
const observations = [];

for (const current of head.medians) {
  const base = baseline.medians.find(
    (candidate) =>
      candidate.route === current.route &&
      candidate.viewport === current.viewport,
  );
  assert.ok(base, `Missing baseline for ${current.viewport}/${current.route}`);
  const jsAllowance = Math.max(20 * 1024, base.median.jsTransferBytes * 0.05);
  if (
    current.median.jsTransferBytes >
    base.median.jsTransferBytes + jsAllowance
  )
    failures.push({
      gate: "first-load-js",
      route: current.route,
      viewport: current.viewport,
      baseline: base.median.jsTransferBytes,
      head: current.median.jsTransferBytes,
      allowance: jsAllowance,
    });
  const absoluteDelta = current.median.elapsedMs - base.median.elapsedMs;
  const relativeDelta = absoluteDelta / base.median.elapsedMs;
  if (absoluteDelta > 100 && relativeDelta > 0.15)
    failures.push({
      gate: "lab-elapsed-regression",
      route: current.route,
      viewport: current.viewport,
      baseline: base.median.elapsedMs,
      head: current.median.elapsedMs,
      absoluteDelta,
      relativeDelta,
    });
  if (current.median.lcpMs !== null && current.median.lcpMs > 2500)
    observations.push({
      gate: "lab-lcp-reference",
      result: "above-reference",
      current,
    });
  if (current.median.cls !== null && current.median.cls > 0.1)
    observations.push({
      gate: "lab-cls-reference",
      result: "above-reference",
      current,
    });
  if (current.median.inpSampleMs === null)
    observations.push({
      gate: "lab-inp-reference",
      route: current.route,
      viewport: current.viewport,
      result: "N/A-no-qualifying-interaction",
    });
  else if (current.median.inpSampleMs > 200)
    observations.push({
      gate: "lab-inp-reference",
      result: "above-reference",
      current,
    });
}

const newErrors = Math.max(
  0,
  head.runtimeErrors.length - baseline.runtimeErrors.length,
);
if (newErrors) failures.push({ gate: "new-runtime-errors", count: newErrors });
if (head.compactOverflow.some((item) => item.overflow))
  failures.push({ gate: "compact-horizontal-overflow" });
if (!head.workspaceCycles?.pass)
  failures.push({
    gate: "workspace-cycle-growth",
    details: head.workspaceCycles,
  });
if (
  /authorization|bearer|token=|password|cookie|precise|itinerary/i.test(
    JSON.stringify(head),
  )
)
  failures.push({ gate: "sensitive-canary" });

const result = {
  task: "TASK-024-A",
  status: failures.length ? "fail" : "pass",
  baseline: baseline.commit,
  head: head.commit,
  budgets: {
    firstLoadJs: "base + max(20 KiB, base x 5%)",
    labElapsed: ">15% and >100ms triggers failure",
    newUnhandledErrors: 0,
    compactOverflow: 0,
    workspaceCycles: 20,
  },
  failures,
  observations,
};
await writeFile(outputPath, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
