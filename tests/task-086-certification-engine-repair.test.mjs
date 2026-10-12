import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  hash,
  admitNodes,
  queryGraph,
} from "../tools/transport/task-086-model.mjs";
import {
  sourceCapabilities,
  applyCapabilityReviews,
  identityEvidenceRefs,
  certifyFact,
  segmentRequiredFacts,
  validateSegmentFact,
} from "../tools/transport/task-086-certification-facts.mjs";
import { loadEligibleGraph } from "../tools/transport/task-086-routing-eligibility.mjs";
import {
  currentBinding,
  classifySource,
} from "../tools/transport/task-086-final-closeout.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (name) =>
  JSON.parse(
    fs.readFileSync(path.join(root, "data/transport/network", name), "utf8"),
  );
const source = read("source-rights.json").sources.find(
  (s) => s.sourceId === "transport-source:086:3279cd1f3059f40460a74d780f0f8a8d",
);
test("reviewed JR East minimal service facts are certifiable without a raw reuse license", () => {
  assert.equal(classifySource(source, true, true, true).status, "CERTIFIED");
});

const rows = (name) =>
  fs
    .readFileSync(path.join(root, "data/transport/network", name), "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
const nodes = new Map(
  rows("node-downstream-admission.jsonl").map((n) => [n.nodeId, n]),
);
const evidence = new Map(
  rows("topology-evidence.jsonl").map((e) => [e.evidenceId, e]),
);
const sources = new Map(
  read("source-rights.json").sources.map((s) => [s.sourceId, s]),
);
const oldAudits = JSON.parse(
  fs.readFileSync(
    path.join(root, "docs/qa/TASK-086/final-source-certification.json"),
    "utf8",
  ),
).sources;
const context = {
  nodes,
  evidence,
  sources,
  sourceAudits: new Map(oldAudits.map((s) => [s.sourceId, s])),
};
const patterns = new Map(
  rows("service-patterns.jsonl").map((p) => [p.servicePatternId, p]),
);
const edges = rows("transport-node-edges.jsonl");
const tokyo = "transport-node:086:6832848b9e5f9e9b3f78a8985f265742",
  ueno = "transport-node:086:f8bcf2acb072ef28c107d613fe266f0e";
const outward = edges.find(
  (e) =>
    e.fromTransportNodeId === tokyo &&
    e.toTransportNodeId === ueno &&
    e.edgeKind === "service_segment",
);
const inward = edges.find(
  (e) =>
    e.fromTransportNodeId === ueno &&
    e.toTransportNodeId === tokyo &&
    e.edgeKind === "service_segment",
);
for (const [label, nodeId] of [
  ["Tokyo", tokyo],
  ["Ueno", ueno],
])
  test(
    label +
      " required canonical identity survives unrelated source dependencies",
    () => {
      const node = nodes.get(nodeId),
        refs = identityEvidenceRefs(node, evidence);
      assert.ok(refs.length);
      assert.ok(refs.length < node.evidenceRefs.length);
      assert.equal(
        certifyFact("REQUIRED_IDENTITY", "identityFact", refs, context).status,
        "PASS",
      );
      assert.equal(
        admitNodes([{ ...node, evidenceRefs: refs }], sources, evidence)[0]
          .decision,
        "ADMIT_TASK_086_TOPOLOGY",
      );
    },
  );
for (const [label, edge] of [
  ["Tokyo->Ueno", outward],
  ["Ueno->Tokyo", inward],
])
  test(label + " actual independent reviewed interval is valid", () => {
    assert.ok(edge);
    const p = patterns.get(edge.servicePatternRef);
    assert.equal(validateSegmentFact(edge, p, context), null);
    assert.ok(
      segmentRequiredFacts(edge, p, context).every((f) => f.status === "PASS"),
    );
    assert.equal(edge.boardAllowed, true);
    assert.equal(edge.alightAllowed, true);
  });
test("auxiliary/metric source failure cannot replace or disable independently valid identity", () => {
  const node = nodes.get(tokyo),
    ref = "fixture:auxiliary",
    ev = new Map(evidence);
  ev.set(ref, {
    evidenceId: ref,
    sourceId: "fixture:unreviewed",
    record: { kind: "amenity" },
    recordSha256: hash({ kind: "amenity" }),
    sourceSha256: "0".repeat(64),
    locator: "fixture",
  });
  const refs = identityEvidenceRefs(
    { ...node, evidenceRefs: [...node.evidenceRefs, ref] },
    ev,
  );
  assert.ok(!refs.includes(ref));
  assert.equal(
    certifyFact("REQUIRED_IDENTITY", "identityFact", refs, {
      ...context,
      evidence: ev,
    }).status,
    "PASS",
  );
  const broken = new Map(ev);
  for (const r of refs)
    broken.set(r, { ...ev.get(r), recordSha256: "0".repeat(64) });
  assert.equal(
    certifyFact("REQUIRED_IDENTITY", "identityFact", refs, {
      ...context,
      evidence: broken,
    }).status,
    "FAIL",
  );
});
test("remote unresolved calling node never blocks this independent interval", () => {
  const p = patterns.get(outward.servicePatternRef),
    nm = new Map(nodes),
    remote = p.callingNodes[0].nodeId;
  assert.notEqual(remote, tokyo);
  assert.notEqual(remote, ueno);
  nm.set(remote, {
    ...nodes.get(remote),
    decision: "HOLD",
    canonicalNameJa: "unresolved remote identity",
  });
  assert.equal(
    validateSegmentFact(outward, p, { ...context, nodes: nm }),
    null,
  );
  assert.notEqual(
    validateSegmentFact({ ...outward, toTransportNodeId: remote }, p, {
      ...context,
      nodes: nm,
    }),
    null,
  );
});
test("unreviewed public source has no derived or raw capabilities; reviewed fact policy has no raw/metric grant", () => {
  const caps = sourceCapabilities(source, true, true, true);
  assert.equal(caps.serviceTopologyFact.allowed, true);
  assert.equal(caps.rawRedistribution.allowed, false);
  assert.equal(caps.rawPersistence.allowed, false);
  assert.equal(caps.metricFact.allowed, false);
  for (const changed of [
    { rightsReview: null },
    { rightsDecision: "PUBLIC_ACCESS_ONLY" },
    { derivedDataAllowed: false },
    { rawPayloadRetained: true },
  ])
    assert.equal(
      sourceCapabilities({ ...source, ...changed }, true, true, true)
        .runtimeDerivedFact.allowed,
      false,
    );
  assert.equal(
    sourceCapabilities(source, false, true, true).runtimeDerivedFact.allowed,
    false,
  );
  assert.equal(
    sourceCapabilities(source, true, false, true).runtimeDerivedFact.allowed,
    false,
  );
});
test("wrong direction or boarding permissions still fail the exact service interval", () => {
  const p = patterns.get(outward.servicePatternRef);
  assert.equal(
    validateSegmentFact({ ...outward, direction: "southbound" }, p, context)
      .reason,
    "SERVICE_DIRECTION_UNRESOLVED",
  );
  assert.equal(
    validateSegmentFact({ ...outward, boardAllowed: false }, p, context).reason,
    "BOARDING_ALIGHTING_UNRESOLVED",
  );
  const ev = new Map(evidence),
    ref = p.evidenceRefs[0],
    old = ev.get(ref),
    record = { ...old.record, direction: "wrong" };
  ev.set(ref, { ...old, record, recordSha256: hash(record) });
  assert.equal(
    validateSegmentFact(outward, p, { ...context, evidence: ev }).reason,
    "SERVICE_DIRECTION_UNRESOLVED",
  );
});
test("invalid transfer evidence does not certify and fact-only metric failure leaves topology capability intact", () => {
  const transfer = edges.find(
      (e) => e.edgeKind === "hub_transfer" && e.fromTransportNodeId === tokyo,
    ),
    ref = transfer.topologyEvidenceRefs[0],
    ev = new Map(evidence);
  ev.set(ref, { ...ev.get(ref), recordSha256: "0".repeat(64) });
  assert.equal(
    certifyFact("REQUIRED_TRANSFER", "transferFact", [ref], {
      ...context,
      evidence: ev,
    }).status,
    "FAIL",
  );
  assert.equal(
    sourceCapabilities(source, true, true, true).metricFact.allowed,
    false,
  );
  assert.equal(
    sourceCapabilities(source, true, true, true).serviceTopologyFact.allowed,
    true,
  );
});
test("Tokyo and Otemachi keep distinct canonical identities; no proximity or zero-time merge", () => {
  const t = nodes.get(tokyo),
    os = [...nodes.values()].filter((n) => n.canonicalNameJa === "大手町");
  assert.ok(os.length);
  for (const o of os) {
    assert.notEqual(t.identityAnchor, o.identityAnchor);
    assert.notEqual(t.nodeId, o.nodeId);
    assert.equal(
      certifyFact(
        "REQUIRED_IDENTITY",
        "identityFact",
        identityEvidenceRefs(o, evidence),
        context,
      ).status,
      "PASS",
    );
  }
  const ids = new Set(os.map((n) => n.nodeId));
  for (const e of edges.filter(
    (e) =>
      (e.fromTransportNodeId === tokyo && ids.has(e.toTransportNodeId)) ||
      (e.toTransportNodeId === tokyo && ids.has(e.fromTransportNodeId)),
  ))
    assert.notEqual(e.metrics.transferTimeMin.value, 0);
});

test("reviewed current operator transitions remain required identity evidence, not auxiliary", () => {
  for (const node of nodes.values())
    if (node.identityTransition) {
      const refs = identityEvidenceRefs(node, evidence);
      assert.ok(refs.length >= 2);
      assert.equal(
        admitNodes([{ ...node, evidenceRefs: refs }], sources, evidence)[0]
          .decision,
        "ADMIT_TASK_086_TOPOLOGY",
        node.nodeId,
      );
    }
});
test("licensed native GTFS minimum-transfer metric retains the existing raw-policy capability", () => {
  const s = sources.get("gtfs:nagasaki-bus"),
    a = context.sourceAudits.get(s.sourceId);
  assert.equal(
    sourceCapabilities({ ...s, license: a.license }, true, true, true)
      .metricFact.allowed,
    true,
  );
});

test("line-specific reviewed orthographic variants use their own exact station-code evidence", () => {
  for (const e of edges.filter((e) => e.edgeKind === "service_segment")) {
    const p = patterns.get(e.servicePatternRef),
      r = evidence.get(p?.evidenceRefs?.[0])?.record,
      parent = evidence.get(r?.sourceFactRef)?.record;
    if (
      [e.segmentIndex, e.segmentIndex + 1].some(
        (i) => parent?.callingComponents?.[i]?.nameVariantReview,
      )
    )
      assert.equal(validateSegmentFact(e, p, context), null, e.edgeId);
  }
});

test("ODbL specific binding rejects source/hash/rights/scope/terms tampering", () => {
  const base = path.join(root, "data/transport/network"),
    s = sources.get("transport-source:086:42e9cf5907e9c4f7c9d328e18022b351");
  const obs = JSON.parse(
    fs.readFileSync(
      path.join(
        root,
        "docs/qa/TASK-086/certification-engine-repair/osm-terms-observation.json",
      ),
      "utf8",
    ),
  );
  const review = {
    kind: "EXISTING_ODBL_OBLIGATION_AND_TERMS_BINDING",
    sourceId: s.sourceId,
    sourceSha256: s.contentSha256,
    descriptorSha256: hash(s),
    attribution: s.attribution,
    shareAlikeScope:
      "OSM-derived database portion bound to this exact source and its audited retained facts; attribution and ODbL distribution obligations retained.",
    termsObservation: obs,
    termsObservationSha256: hash(obs),
    requiredEvidenceIds: [...evidence.values()]
      .filter((e) => e.sourceId === s.sourceId)
      .map((e) => e.evidenceId)
      .sort(),
  };
  assert.equal(
    applyCapabilityReviews([s], [review], [...evidence.values()], base)[0]
      .license,
    "ODbL 1.0",
  );
  for (const patch of [
    { sourceSha256: "0".repeat(64) },
    { descriptorSha256: "0".repeat(64) },
    { requiredEvidenceIds: [] },
    { shareAlikeScope: "all unrelated data exempt" },
    { attribution: "" },
    { termsObservation: { ...obs, url: "https://example.com" } },
  ])
    assert.throws(() =>
      applyCapabilityReviews(
        [s],
        [{ ...review, ...patch }],
        [...evidence.values()],
        base,
      ),
    );
  assert.throws(() =>
    applyCapabilityReviews(
      [{ ...s, license: "" }],
      [review],
      [...evidence.values()],
      base,
    ),
  );
});

test("formal certified export contains legal Tokyo/Ueno paths and no zero-time Tokyo/Otemachi collapse", () => {
  const { graph, eligibility } = loadEligibleGraph();
  const exportedNodes = new Map(graph.nodes.map((n) => [n.nodeId, n]));
  const exportedEdges = new Map(graph.edges.map((e) => [e.edgeId, e]));
  for (const pair of [
    [tokyo, ueno],
    [ueno, tokyo],
  ]) {
    const ids = queryGraph(graph.edges, ...pair);
    assert.ok(ids?.length, "Actual exported passenger path must exist");
    assert.ok(ids.every((id) => eligibility.routeEnabled.edgeIds.includes(id)));
    assert.equal(exportedEdges.get(ids[0]).boardAllowed, true);
    assert.equal(exportedEdges.get(ids.at(-1)).alightAllowed, true);
    assert.ok(
      ids.every(
        (id) =>
          exportedNodes.has(exportedEdges.get(id).fromTransportNodeId) &&
          exportedNodes.has(exportedEdges.get(id).toTransportNodeId),
      ),
    );
  }
  for (const n of graph.nodes.filter((n) => n.canonicalNameJa === "大手町")) {
    assert.notEqual(n.nodeId, tokyo);
    assert.notEqual(n.identityAnchor, exportedNodes.get(tokyo).identityAnchor);
    for (const e of graph.edges.filter(
      (e) =>
        e.edgeKind === "hub_transfer" &&
        [e.fromTransportNodeId, e.toTransportNodeId].includes(n.nodeId) &&
        [e.fromTransportNodeId, e.toTransportNodeId].includes(tokyo),
    ))
      assert.notEqual(e.metrics.transferTimeMin.value, 0);
  }
});

test("entire previous quarantine and each national corridor bind the current certified export", () => {
  const qa = path.join(root, "docs/qa/TASK-086/certification-engine-repair");
  const load = (name) =>
    JSON.parse(fs.readFileSync(path.join(qa, name), "utf8"));
  const report = load("recertification-summary.json");
  const index = load("quarantine-recertification-diff.json");
  assert.equal(report.inputSha256, currentBinding().inputSha256);
  assert.equal(index.inputSha256, report.inputSha256);
  const ids = new Set();
  let total = 0;
  for (const chunk of index.chunks) {
    const bytes = fs.readFileSync(path.join(qa, chunk.file));
    assert.equal(hash(bytes), chunk.sha256);
    const items = bytes
      .toString("utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map(JSON.parse);
    for (const row of items) {
      const key = row.kind + ":" + row.entityId;
      assert.ok(!ids.has(key));
      ids.add(key);
      total++;
      if (row.newStatus === "CERTIFIED" && row.kind !== "source_dependency") {
        assert.ok(row.requiredFacts.length);
        assert.ok(
          row.requiredFacts.every(
            (f) =>
              f.status === "PASS" && f.evidenceIds.length && f.sourceIds.length,
          ),
        );
      } else if (row.newStatus !== "CERTIFIED")
        assert.ok(row.newReasons.length);
    }
  }
  assert.equal(total, index.typedEntityCount);
  const prior = fs
    .readFileSync(path.join(qa, "previous-exclusions.jsonl"), "utf8")
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
  assert.equal(total, prior.length);
  assert.ok(prior.every((r) => ids.has(r.kind + ":" + r.entityId)));
  const { graph } = loadEligibleGraph();
  const corridors = load("corridor-cut-audit.json");
  assert.equal(corridors.inputSha256, report.inputSha256);
  for (const c of corridors.corridors)
    for (const d of c.directions) {
      const actual = queryGraph(graph.edges, d.from, d.to);
      assert.deepEqual(actual, d.certifiedPath);
      assert.ok(actual?.length, "Current frozen national corridor must pass");
    }
  const zero = [
    "danglingReferenceCount",
    "selfEdgeCount",
    "duplicateEdgeCount",
    "duplicateCanonicalIdentityCount",
    "invalidDirectionCount",
    "impossibleModeTransitionCount",
    "invalidEndpointSerializationCount",
    "orphanNodeCount",
  ];
  zero.forEach((k) => assert.equal(report.graphIntegrity[k], 0, k));
  const checkoutSha = execFileSync(
    "git",
    ["-c", "safe.directory=" + root.replaceAll("\\", "/"), "rev-parse", "HEAD"],
    { cwd: root, encoding: "utf8" },
  ).trim();
  if (process.env.GITHUB_SHA) assert.equal(checkoutSha, process.env.GITHUB_SHA);
  const receipt = {
    status: "PASS",
    checkoutSha,
    runId: process.env.GITHUB_RUN_ID ?? null,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT ?? null,
    inputSha256: report.inputSha256,
    entireQuarantineCount: total,
    actualNationalCorridors: corridors.corridors.length,
    tokyoUeno: "PASS_FORMAL_EXPORT_BOTH_DIRECTIONS",
    eightZeroIntegrityChecks: "PASS",
    counts: report.after,
    disabled: report.disabled,
    diffIndexSha256: hash(
      fs.readFileSync(path.join(qa, "quarantine-recertification-diff.json")),
    ),
    corridorAuditSha256: hash(
      fs.readFileSync(path.join(qa, "corridor-cut-audit.json")),
    ),
  };
  const dest = path.join(
    root,
    ".artifacts/ci/certification-engine-repair-receipt.json",
  );
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, JSON.stringify(receipt, null, 2) + "\n");
});
