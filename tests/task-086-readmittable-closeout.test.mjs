import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { hash } from "../tools/transport/task-086-model.mjs";
import { applyRetainedSourceSupplements } from "../tools/transport/task-086-final-closeout.mjs";
import {
  generateCloseout,
  eligibleExport,
  requireEligibleTraversal,
  loadEligibleGraph,
  closeoutDirectory,
} from "../tools/transport/task-086-routing-eligibility.mjs";
const root = path.resolve(closeoutDirectory, "../../../..");
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const rows = (p) =>
  fs
    .readFileSync(p, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
const edge = {
  edgeId: "AB",
  edgeKind: "service_segment",
  fromTransportNodeId: "A",
  toTransportNodeId: "B",
  directed: true,
  boardAllowed: true,
  alightAllowed: false,
  metrics: { duration: { status: "unresolved", value: null } },
};
const certified = { nodes: [{ nodeId: "A" }, { nodeId: "B" }], edges: [edge] };
const eligibility = {
  routeEnabled: { nodeIds: ["A", "B"], edgeIds: ["AB"], transferIds: [] },
  projectionSha256: hash(certified),
};
test("excluded entity cannot enter an export through aliases, patterns, transfer expansion or fallback", () => {
  for (const method of [
    "alias",
    "pattern",
    "transfer",
    "fallback",
    "reverse-synthesis",
  ]) {
    const graph = {
      nodes: [...certified.nodes, { nodeId: "X", alias: "A" }],
      edges: [
        ...certified.edges,
        {
          ...edge,
          edgeId: "X-B-" + method,
          fromTransportNodeId: "X",
          expansion: method,
        },
      ],
    };
    assert.deepEqual(eligibleExport(graph, eligibility), certified);
    assert.equal(
      requireEligibleTraversal(
        graph,
        eligibility,
        ["X", "B"],
        ["X-B-" + method],
      ).traversalPermitted,
      false,
    );
  }
  assert.equal(
    requireEligibleTraversal(certified, eligibility, ["alias-A", "B"], ["AB"])
      .traversalPermitted,
    false,
  );
});
test("same-ID reversal, payload replacement and access/metric invention fail closed", () => {
  for (const changes of [
    { fromTransportNodeId: "B", toTransportNodeId: "A" },
    { alightAllowed: true },
    { edgeKind: "hub_transfer" },
    { metrics: { duration: { status: "resolved", value: 1 } } },
  ])
    assert.throws(() =>
      eligibleExport(
        { nodes: certified.nodes, edges: [{ ...edge, ...changes }] },
        eligibility,
      ),
    );
  assert.equal(
    requireEligibleTraversal(certified, eligibility, ["B", "A"], ["AB"])
      .traversalPermitted,
    false,
  );
  const out = JSON.parse(
    JSON.stringify(eligibleExport(certified, eligibility)),
  );
  assert.equal(out.edges[0].metrics.duration.value, null);
  assert.equal(out.edges[0].alightAllowed, false);
  assert.equal(
    requireEligibleTraversal(out, eligibility, ["A", "B"], ["AB"])
      .passengerAccessAndScheduleValidationRequired,
    true,
  );
});
test("retained snapshot supplement rejects wrong source, archive, missing terms and wrong catalog scope", () => {
  const base = path.join(root, "data/transport/network");
  const sources = read(path.join(base, "source-rights.json")).sources;
  const actions = rows(path.join(base, "next-source-actions.jsonl"));
  const review = read(path.join(closeoutDirectory, "reviewed-evidence.json"))
    .sourceSupplements[0];
  const updated = applyRetainedSourceSupplements(
    sources,
    [review],
    actions,
    base,
  );
  assert.equal(
    updated.find((s) => s.sourceId === review.sourceId).license,
    "CC BY 4.0",
  );
  assert.equal(
    sources.find((s) => s.sourceId === review.sourceId).retainedArchive,
    undefined,
  );
  for (const change of [
    { sourceSha256: "0".repeat(64) },
    { sourceId: "missing" },
    { retainedArchive: "../outside.zip" },
    {
      termsObservation: {
        ...review.termsObservation,
        contentSha256: "0".repeat(64),
      },
    },
    {
      catalogObservation: {
        ...review.catalogObservation,
        url: "https://example.org/unrelated",
      },
    },
  ])
    assert.throws(() =>
      applyRetainedSourceSupplements(
        sources,
        [{ ...review, ...change }],
        actions,
        base,
      ),
    );
});
const treeHashes = (dir) => {
  const result = {};
  const visit = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const file = path.join(p, e.name);
      if (e.isDirectory()) visit(file);
      else
        result[path.relative(dir, file).replaceAll("\\", "/")] = hash(
          fs.readFileSync(file),
        );
    }
  };
  visit(dir);
  return result;
};
test(
  "full frozen inventory has deterministic terminal decisions and no excluded export leaks",
  { timeout: 240000 },
  (t) => {
    const temp = fs.mkdtempSync(path.join(os.tmpdir(), "task086-terminal-"));
    t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
    const first = generateCloseout({
      outputDirectory: path.join(temp, "first"),
      scratchDirectory: path.join(temp, "cert-first"),
    });
    const second = generateCloseout({
      outputDirectory: path.join(temp, "second"),
      scratchDirectory: path.join(temp, "cert-second"),
    });
    assert.deepEqual(
      treeHashes(path.join(temp, "first")),
      treeHashes(path.join(temp, "second")),
    );
    assert.deepEqual(
      treeHashes(path.join(temp, "first")),
      Object.fromEntries(
        Object.keys(treeHashes(path.join(temp, "first"))).map((name) => [
          name,
          treeHashes(closeoutDirectory)[name],
        ]),
      ),
      "Tracked closeout artifacts differ from current production certification path",
    );
    const dispositions = rows(path.join(temp, "first/root-dispositions.jsonl"));
    assert.equal(
      dispositions.find(
        (r) => r.rootId === "root:obligation:mode:required-special-tourism",
      ).nodeIds.length,
      152,
    );
    assert.equal(first.summary.terminalRoots, 251);
    assert.equal(first.summary.pendingRoots, 0);
    assert.equal(first.entities.length, 4061 + 9409 + 1072 + 734);
    assert.ok(
      first.entities.every(
        (e) =>
          e.state === "ROUTE_ENABLED" || e.state.startsWith("ROUTE_DISABLED_"),
      ),
    );
    const enabled = new Set(first.eligibility.routeEnabled.nodeIds);
    assert.ok(
      first.entities
        .filter((e) => e.kind === "node" && !e.runtimeImportAllowed)
        .every((e) => !enabled.has(e.entityId)),
    );
    const { graph, eligibility: actual } = loadEligibleGraph(
      path.join(temp, "first"),
    );
    const native = graph.edges.filter((e) => e.edgeKind === "service_segment");
    assert.ok(
      native.some((e) => e.boardAllowed === false || e.alightAllowed === false),
      "Native GTFS restrictions disappeared",
    );
    const corrupted = read(path.join(temp, "first/routing-eligibility.json"));
    corrupted.inputSha256 = "0".repeat(64);
    fs.writeFileSync(
      path.join(temp, "first/routing-eligibility.json"),
      JSON.stringify(corrupted),
    );
    assert.throws(
      () => loadEligibleGraph(path.join(temp, "first")),
      /Stale eligibility/,
    );
    fs.writeFileSync(
      path.join(temp, "first/routing-eligibility.json"),
      JSON.stringify(actual),
    );
    fs.appendFileSync(path.join(temp, "first/route-disabled.jsonl"), "{}\n");
    assert.throws(
      () => loadEligibleGraph(path.join(temp, "first")),
      /Changed exclusion/,
    );
    const checkoutSha = execFileSync(
      "git",
      [
        "-c",
        "safe.directory=" + root.replaceAll("\\", "/"),
        "rev-parse",
        "HEAD",
      ],
      { cwd: root, encoding: "utf8" },
    ).trim();
    if (process.env.GITHUB_SHA)
      assert.equal(checkoutSha, process.env.GITHUB_SHA);
    const receipt = {
      status: "PASS",
      checkoutSha,
      inputSha256: second.summary.inputSha256,
      eligibilitySha256: second.summary.eligibilitySha256,
      runId: process.env.GITHUB_RUN_ID ?? null,
      runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
      deterministicGeneration:
        "PASS_TWO_INDEPENDENT_FULL_CERTIFICATION_PROJECTIONS",
      serializedFiles: treeHashes(path.join(temp, "second")),
      terminalRoots: 251,
      pendingRoots: 0,
      entityCount: second.entities.length,
      graphIntegrity: second.summary.graphIntegrity,
      counts: second.summary.routeEnabled,
      unknownMetricsAndGTFSRestrictions: "PASS",
      failClosedBoundary: "PASS",
    };
    const destination = path.join(
      root,
      ".artifacts/ci/routing-eligibility-receipt.json",
    );
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, JSON.stringify(receipt, null, 2) + "\n");
  },
);
