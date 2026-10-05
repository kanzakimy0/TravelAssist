import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  prepareRetainedGtfsTransfers,
  newlyAvailableGtfsTransfers,
} from "../tools/transport/task-086-licensed-package.mjs";
import { hash, id } from "../tools/transport/task-086-model.mjs";
import { assertPublishedGlobalReviewChecks } from "../tools/transport/task-086-stage.mjs";

const base = "data/transport/network";
const readJson = (name) =>
  JSON.parse(fs.readFileSync(path.join(base, name), "utf8"));
const readRows = (name) =>
  fs
    .readFileSync(path.join(base, name), "utf8")
    .trim()
    .split(/\r?\n/)
    .map(JSON.parse);
const packageRecord = readJson("sources/nagasaki-bus.json");
const nodes = new Map(
  readRows("node-downstream-admission.jsonl").map((n) => [n.nodeId, n]),
);
const edges = readRows("transport-node-edges.jsonl");
const priorEdges = edges.filter(
  (e) => e.edgeId !== "transport-edge:086:82ed0dd594061301415987c9aa2168f4",
);
const sources = new Map(
  readJson("source-rights.json").sources.map((s) => [s.sourceId, s]),
);
const evidence = new Map(
  readRows("topology-evidence.jsonl").map((e) => [e.evidenceId, e]),
);
const archive = (name) => ({
  path: path.resolve(base, name),
  bytes: fs.readFileSync(path.join(base, name)),
});

test("production retained-GTFS replay admits the exact directed 300-second cross-package transfer", () => {
  const extension = readJson("sources/nagasaki-local-sections184.json");
  const arrival = id("node", "gtfs:nagasaki-bus:stop:886085_01");
  assert(
    extension.nodes.some(
      (n) => n.identityAnchor === "gtfs:nagasaki-bus:stop:886085_01",
    ),
  );
  const before = new Set(nodes.keys());
  before.delete(arrival);
  const candidates = newlyAvailableGtfsTransfers(
    [packageRecord],
    before,
    nodes,
  );
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].transfers.length, 1);
  const prepared = prepareRetainedGtfsTransfers(
    candidates,
    nodes,
    sources,
    evidence,
    priorEdges,
    "2026-10-01T00:00:00Z",
    archive,
  );
  assert.equal(prepared.length, 1);
  const { edge } = prepared[0];
  assert.equal(
    edge.edgeId,
    "transport-edge:086:82ed0dd594061301415987c9aa2168f4",
  );
  assert.equal(
    edge.fromTransportNodeId,
    id("node", "gtfs:nagasaki-bus:stop:886085_04"),
  );
  assert.equal(
    edge.toTransportNodeId,
    id("node", "gtfs:nagasaki-bus:stop:886085_01"),
  );
  assert.equal(edge.directed, true);
  assert.equal(edge.metrics.transferTimeMin.value, 5);
  assert(
    !prepared.some(
      ({ edge: e }) =>
        e.fromTransportNodeId === edge.toTransportNodeId &&
        e.toTransportNodeId === edge.fromTransportNodeId,
    ),
  );
  assert.equal(
    prepareRetainedGtfsTransfers(
      [packageRecord],
      nodes,
      sources,
      evidence,
      [...priorEdges, edge],
      "2026-10-01T00:00:00Z",
      archive,
    ).length,
    0,
  );
});

test("retained-GTFS replay rejects a source row absent from the retained archive", () => {
  const forged = structuredClone(packageRecord);
  const transfer = forged.transfers.find(
    (t) => t.sourceTransfer.from_stop_id === "886085_04",
  );
  transfer.sourceTransfer.min_transfer_time = "301";
  assert.throws(
    () =>
      prepareRetainedGtfsTransfers(
        [forged],
        nodes,
        sources,
        evidence,
        priorEdges,
        "2026-10-01T00:00:00Z",
        archive,
      ),
    /GTFS_TRANSFER_NATIVE_ROW_MISMATCH/,
  );
});

test("formal global status requires the published result and current proof bytes", () => {
  const review = { gaps: [{ deficitId: "global:fixture" }] };
  const decision = {
    deficitId: "global:fixture",
    status: "REVIEWED_CLOSED",
    inputBindings: [{ path: "proof", sha256: hash("current") }],
  };
  const decisions = { reviews: [decision] };
  const published = [
    {
      checkId: decision.deficitId,
      status: "PASS",
      reviewDecisionSha256: hash(decision),
    },
  ];
  assert.equal(
    assertPublishedGlobalReviewChecks(
      review,
      decisions,
      [],
      published,
      () => "current",
    ),
    1,
  );
  assert.throws(
    () =>
      assertPublishedGlobalReviewChecks(
        review,
        decisions,
        [],
        published,
        () => "stale",
      ),
    /GLOBAL_REVIEW_INPUT_BINDING_INVALID/,
  );
  assert.throws(
    () =>
      assertPublishedGlobalReviewChecks(
        review,
        decisions,
        [{ deficitId: "global:fixture" }],
        published,
        () => "current",
      ),
    /PUBLISHED_GLOBAL_REVIEW_CHECKS_MISMATCH/,
  );
});
