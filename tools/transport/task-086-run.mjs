import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PARAMETERS,
  hash,
  id,
  compare,
  invariant,
  admitNodes,
  generatePattern,
  generateTransfer,
  validateEdges,
  growInventory,
  auditGraph,
  selectAction,
  adaptParameters,
  acceptance,
} from "./task-086-model.mjs";
import {
  readJson,
  readRows,
  atomicWrite,
  jsonBytes,
  jsonlBytes,
  executeBatches,
} from "./task-086-batches.mjs";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const base = "5123966f62dbe9587a3bbe38e877ccf3ea959b80";
const generatedAt = "2026-10-01T00:00:00Z"; // Fixed snapshot label; per-source observation dates stay separate.
const rel = (p) => path.join(root, p);
const upstream = "data/transport/nodes/task-084-b-v2-amendment-review/";
const countBy = (rows, key) =>
  Object.fromEntries(
    [...new Set(rows.map((r) => r[key]))]
      .sort(compare)
      .map((value) => [value, rows.filter((r) => r[key] === value).length]),
  );
export function run({
  output = rel("data/transport/network"),
  rerunBatch = null,
  repair = false,
} = {}) {
  const inputPaths = [
    upstream + "manifest.json",
    upstream + "rail-components.jsonl",
    upstream + "airport-planning-candidates.jsonl",
    upstream + "bus-candidate-official-review.jsonl",
    upstream + "hub-component-completeness-review.jsonl",
    "docs/qa/TASK-084-B/v2-user-acceptance-closeout.json",
    "data/transport/gtfs-source-license-registry.jsonl",
    "data/transport/network/sources/source-review.json",
  ];
  const sourceFiles = fs
    .readdirSync(rel("data/transport/network/sources"))
    .filter(
      (name) =>
        name.endsWith(".json") &&
        readJson(rel("data/transport/network/sources/" + name)).source,
    )
    .sort(compare);
  const packs = sourceFiles.map((name) => {
    const inputPath = `data/transport/network/sources/${name}`;
    inputPaths.push(inputPath);
    const pack = readJson(rel(inputPath));
    const rawPath = `data/transport/network/${pack.source.retainedArchive}`;
    inputPaths.push(rawPath);
    invariant(
      hash(fs.readFileSync(rel(rawPath))) === pack.source.contentSha256,
      "SOURCE_ARCHIVE_HASH_MISMATCH",
    );
    return pack;
  });
  const inputHashes = Object.fromEntries(
    inputPaths.map((p) => [p, hash(fs.readFileSync(rel(p)))]),
  );
  const generatorPaths = [
    "tools/transport/task-086-model.mjs",
    "tools/transport/task-086-batches.mjs",
    "tools/transport/task-086-run.mjs",
    "tools/transport/task-086-extract-gtfs.py",
  ];
  const generatorHashes = Object.fromEntries(
    generatorPaths.map((p) => [p, hash(fs.readFileSync(rel(p)))]),
  );
  const review = readJson(
    rel("data/transport/network/sources/source-review.json"),
  );
  const sources = new Map(packs.map((p) => [p.source.sourceId, p.source]));
  const evidence = new Map(
    packs.flatMap((p) => p.evidence).map((e) => [e.evidenceId, e]),
  );
  const candidates = packs.flatMap((p) => p.nodes);
  const priorNodesPath = path.join(output, "node-downstream-admission.jsonl");
  const priorNodes = fs.existsSync(priorNodesPath)
    ? readRows(priorNodesPath).filter(
        (n) => n.decision === "ADMIT_TASK_086_TOPOLOGY",
      )
    : [];
  const allAdmitted = admitNodes(candidates, sources, evidence, priorNodes);
  invariant(
    allAdmitted.every((n) => n.decision === "ADMIT_TASK_086_TOPOLOGY"),
    "SOURCE_NODE_ADMISSION_FAILED",
  );
  const nodeMap = new Map(allAdmitted.map((n) => [n.nodeId, n]));
  const patterns = packs.flatMap((pack) =>
    pack.patterns.map((pattern) => ({
      ...pattern,
      servicePatternId: id("pattern", pattern.sourcePatternKey),
      callingNodes: pattern.callingNodes.map((c) => ({
        ...c,
        nodeId: id("node", c.identityAnchor),
      })),
      metrics: {
        calendar: {
          value: pattern.calendarRecords,
          sourceId: pack.source.sourceId,
          sourceSha256: pack.source.contentSha256,
          observedAt: pack.source.observedAt,
          validFrom: pack.source.validFrom,
          validTo: pack.source.validTo,
          freshnessClass: pack.source.freshnessClass,
          rightsDecision: pack.source.rightsDecision,
        },
      },
    })),
  );
  const transfers = packs.flatMap((pack) =>
    pack.transfers.map((t) => ({
      ...t,
      from: id("node", t.fromAnchor),
      to: id("node", t.toAnchor),
      metrics: t.sourceTransfer.min_transfer_time
        ? {
            transferTimeMin: {
              value: Number(t.sourceTransfer.min_transfer_time) / 60,
              sourceId: pack.source.sourceId,
              sourceSha256: pack.source.contentSha256,
              observedAt: pack.source.observedAt,
              validFrom: pack.source.validFrom,
              validTo: pack.source.validTo,
              freshnessClass: pack.source.freshnessClass,
              rightsDecision: pack.source.rightsDecision,
            },
          }
        : {},
    })),
  );
  const rails = readRows(rel(upstream + "rail-components.jsonl"));
  const airports = readRows(
    rel(upstream + "airport-planning-candidates.jsonl"),
  );
  const buses = readRows(
    rel(upstream + "bus-candidate-official-review.jsonl"),
  ).filter((r) => ["T0", "T1"].includes(r.proposedNodeLevel));
  const hubScopes = readRows(
    rel(upstream + "hub-component-completeness-review.jsonl"),
  );
  const names = [
    "東京",
    "京都",
    "新大阪",
    "大阪",
    "河口湖",
    "三ノ宮",
    "奈良",
    "博多",
    "熊本",
    "札幌",
    "旭川",
    "函館",
  ];
  const selectedRails = rails.filter(
    (r) =>
      ["T0", "T1"].includes(r.proposedNodeLevel) ||
      r.modeFamily === "shinkansen" ||
      names.includes(r.canonicalNameJa),
  );
  const pending = [
    ...selectedRails.map((r) => ({
      key: r.proposedTransportNodeId,
      name: r.canonicalNameJa,
      tier: r.proposedNodeLevel,
      kind: r.nodeKind,
      mode: r.modeFamily,
      record: r,
      origin: upstream + "rail-components.jsonl",
    })),
    ...airports.map((r) => ({
      key:
        r.priorCandidateTransportNodeId ?? "official-airport:" + r.officialName,
      name: r.officialName,
      tier: r.proposedNodeLevel,
      kind: "airport",
      mode: "airport",
      record: r,
      origin: upstream + "airport-planning-candidates.jsonl",
    })),
    ...buses.map((r) => ({
      key: r.candidateReviewId,
      name: r.name,
      tier: r.proposedNodeLevel,
      kind: "bus_terminal",
      mode: "highway_bus",
      record: r,
      origin: upstream + "bus-candidate-official-review.jsonl",
    })),
  ].map((r) => ({
    nodeId: id("node", "review:" + r.key),
    discoveryCandidateRef: r.key,
    canonicalNameJa: r.name,
    nodeLevel: r.tier ?? "REVIEW_REQUIRED",
    nodeKind: r.kind,
    mode: r.mode,
    decision: "HOLD",
    reasons: ["INDEPENDENT_IDENTITY_AND_SERVICE_EVIDENCE_REQUIRED"],
    discoveryRecordSha256: hash(r.record),
    discoveryFile: r.origin,
    sourceRefs:
      r.record.sourceRefs ?? [r.record.identityEvidence?.url].filter(Boolean),
    origin: "TASK_084_V2_DISCOVERY_ONLY",
    runtimeImportAuthorized: false,
  }));
  const selectRail = (name) => {
    const match = selectedRails
      .filter((r) => r.canonicalNameJa === name)
      .sort(
        (a, b) =>
          Number(b.modeFamily === "conventional_rail") -
            Number(a.modeFamily === "conventional_rail") ||
          compare(a.proposedTransportNodeId, b.proposedTransportNodeId),
      )[0];
    return match ? id("node", "review:" + match.proposedTransportNodeId) : null;
  };
  const anchorNodeId = selectRail("東京");
  const inventoryProposed = [
    ...pending.map((n) => ({
      requirementId: "review:" + n.discoveryCandidateRef,
      nodeId: n.nodeId,
      name: n.canonicalNameJa,
      tier: n.nodeLevel,
      kind: n.nodeKind,
      admission: "HOLD",
      reason: "V2_HIGH_TIER_OR_NATIONAL_SERVICE_DISCOVERY_OBLIGATION",
      evidencePath: n.discoveryFile,
      evidenceSha256: n.discoveryRecordSha256,
    })),
    ...allAdmitted.map((n) => ({
      requirementId: n.nodeId,
      nodeId: n.nodeId,
      name: n.canonicalNameJa,
      tier: n.nodeLevel,
      kind: n.nodeKind,
      admission: n.decision,
      reason: "REAL_SERVICE_PATTERN_INTERMEDIATE_OR_GATEWAY",
      evidenceRefs: n.evidenceRefs,
    })),
  ];
  const oldInventoryPath = path.join(
    output,
    "required-backbone-inventory.json",
  );
  const oldInventory = fs.existsSync(oldInventoryPath)
    ? readJson(oldInventoryPath).nodes
    : [];
  const inventory = growInventory(oldInventory, inventoryProposed);
  const known = [
    ["東京", "京都"],
    ["東京", "大阪"],
    ["東京", "河口湖"],
    ["大阪", "京都"],
    ["大阪", "三ノ宮"],
    ["大阪", "奈良"],
    ["博多", "熊本"],
    ["札幌", "旭川"],
    ["札幌", "函館"],
  ].map(([a, b]) => ({
    corridorId: `${a}:${b}`,
    from: selectRail(a),
    to: selectRail(b),
    label: `${a} ↔ ${b}`,
    origin: "TASK_MANDATORY_QUERY_ONLY",
  }));
  const linePatterns = new Map();
  for (const pattern of patterns) {
    if (!linePatterns.has(pattern.lineRef))
      linePatterns.set(pattern.lineRef, []);
    linePatterns.get(pattern.lineRef).push(pattern);
  }
  // Each source pattern supplies an additional critical corridor; the query never inserts edges.
  for (const pattern of patterns)
    known.push({
      corridorId: `service:${pattern.servicePatternId}`,
      from: pattern.callingNodes[0].nodeId,
      to: pattern.callingNodes.at(-1).nodeId,
      mode: pattern.mode,
      origin: "REQUIRED_PATTERN_ENDPOINTS",
    });
  const persistentGaps = [
    ...review.gaps,
    ...hubScopes
      .filter((h) => h.expectedComponents.length > 1)
      .map((h) => ({
        deficitId: `hub-review:${h.proposedHubId}`,
        class: "HUB_TRANSFER_GAP",
        hubRef: h.proposedHubId,
        reason: "V2_COMPONENT_ADMISSION_AND_TRANSFER_REVIEW_PENDING",
        evidencePath: upstream + "hub-component-completeness-review.jsonl",
      })),
  ];
  const actions = [...linePatterns].map(([lineRef, items]) => ({
    actionId: `line:${lineRef}`,
    strategyFingerprint: hash([
      "REAL_GTFS_SEQUENCE",
      items[0].mode,
      items[0].evidenceRefs
        .map((ref) => evidence.get(ref).sourceId)
        .filter((value, index, array) => array.indexOf(value) === index),
    ]),
    triggerClasses: [
      "SERVICE_PATTERN_GAP",
      "AIRPORT_SURFACE_GAP",
      "ISLAND_FERRY_GAP",
      "HIGHWAY_BUS_GAP",
    ],
    requiredImpact: new Set(
      items.flatMap((p) => p.callingNodes.map((n) => n.nodeId)),
    ).size,
    corridorImpact: items.length,
    authority: 3,
    identityCertainty: 1,
    licenseUsability: 1,
    lineRef,
    type: "PARSE_LICENSED_SERVICE_PATTERNS",
    parameterChanges: {
      servicePatternExpansionDepth: Math.max(
        ...items.map((p) => p.callingNodes.length),
      ),
      maxNewNodesPerIteration: new Set(
        items.flatMap((p) => p.callingNodes.map((n) => n.nodeId)),
      ).size,
      maxNewEdgesPerIteration: items.reduce(
        (sum, p) => sum + p.callingNodes.length - 1,
        0,
      ),
      modeExpansionPriority: [
        items[0].mode,
        ...DEFAULT_PARAMETERS.modeExpansionPriority.filter(
          (m) => m !== items[0].mode,
        ),
      ],
    },
    expectedImprovement: {
      closeServicePatterns: items.length,
      connectPatternCorridors: items.length,
    },
  }));
  if (transfers.length)
    actions.push({
      actionId: "transfer:gtfs",
      strategyFingerprint: hash(["EXPLICIT_GTFS_TRANSFERS", transfers]),
      triggerClasses: ["HUB_TRANSFER_GAP"],
      requiredImpact: transfers.length,
      corridorImpact: 0,
      authority: 3,
      identityCertainty: 1,
      licenseUsability: 1,
      type: "REVIEW_OFFICIAL_TRANSFERS",
      parameterChanges: { hubTransferReviewDepth: transfers.length },
      expectedImprovement: { closeTransferGaps: transfers.length },
    });
  const activePatterns = [],
    activeNodes = new Map(),
    edges = [],
    history = [],
    groups = [];
  let parameters = { ...DEFAULT_PARAMETERS };
  const replay = () =>
    auditGraph({
      nodes: [...activeNodes.values()],
      patterns,
      transfers,
      edges,
      inventory,
      corridors: known,
      anchorNodeId,
      discoveryGaps: persistentGaps,
    });
  let audit = replay();
  while (true) {
    const action = selectAction(audit, actions, history);
    if (!action) break;
    const before = audit,
      oldEdges = edges.length,
      oldNodes = activeNodes.size;
    const adapted = adaptParameters(parameters, action, audit);
    parameters = adapted.next;
    const generatorSha256 = hash(generatorHashes);
    if (action.lineRef) {
      for (const pattern of linePatterns.get(action.lineRef)) {
        for (const call of pattern.callingNodes)
          activeNodes.set(call.nodeId, nodeMap.get(call.nodeId));
        const generated = generatePattern(
          pattern,
          nodeMap,
          sources,
          evidence,
          generatedAt,
        );
        edges.push(...generated);
        activePatterns.push(pattern);
        groups.push({
          groupId: pattern.servicePatternId,
          pattern,
          edges: generated,
          sources: [
            ...new Set(
              pattern.evidenceRefs.map((r) => evidence.get(r).sourceId),
            ),
          ].map((s) => sources.get(s)),
          nodes: [...new Set(pattern.callingNodes.map((n) => n.nodeId))].map(
            (n) => nodeMap.get(n),
          ),
          generatorSha256,
          nextActionDeficitSummary: before.counts,
        });
      }
    } else {
      for (const transfer of transfers) {
        const generated = generateTransfer(
          transfer,
          nodeMap,
          sources,
          evidence,
          generatedAt,
        );
        edges.push(generated);
        activeNodes.set(transfer.from, nodeMap.get(transfer.from));
        activeNodes.set(transfer.to, nodeMap.get(transfer.to));
        groups.push({
          groupId: transfer.transferId,
          pattern: transfer,
          edges: [generated],
          sources: [
            ...new Set(
              transfer.evidenceRefs.map((r) => evidence.get(r).sourceId),
            ),
          ].map((s) => sources.get(s)),
          nodes: [nodeMap.get(transfer.from), nodeMap.get(transfer.to)],
          generatorSha256,
          nextActionDeficitSummary: before.counts,
        });
      }
    }
    validateEdges(edges);
    executeBatches(output, groups, {
      chunkSize: parameters.routeChunkSize,
      rerunBatch: repair ? rerunBatch : null,
      repair,
      allowMissingRerun: true,
    });
    audit = replay();
    const actualImprovement = {
      hardDeficitsReduced: before.hardDeficitCount - audit.hardDeficitCount,
      disconnectedT0Delta:
        audit.tier.T0.required -
        audit.tier.T0.connected -
        (before.tier.T0.required - before.tier.T0.connected),
      disconnectedT1Delta:
        audit.tier.T1.required -
        audit.tier.T1.connected -
        (before.tier.T1.required - before.tier.T1.connected),
      corridorFailureDelta:
        audit.counts.CORRIDOR_UNREACHABLE - before.counts.CORRIDOR_UNREACHABLE,
      hubTransferGapDelta:
        audit.counts.HUB_TRANSFER_GAP - before.counts.HUB_TRANSFER_GAP,
      servicePatternGapDelta:
        audit.counts.SERVICE_PATTERN_GAP - before.counts.SERVICE_PATTERN_GAP,
      newlyConnectedRequiredNodes: audit.connected.filter(
        (n) => !before.connected.includes(n),
      ),
      addedNodes: activeNodes.size - oldNodes,
      addedEdges: edges.length - oldEdges,
      removedEdges: 0,
      falseEdgesRemoved: 0,
      unresolvedTopologyDelta: audit.hardDeficitCount - before.hardDeficitCount,
      metricOnlyUnresolvedDelta:
        audit.metricOnly.length - before.metricOnly.length,
      modeGapDelta: Object.fromEntries(
        [
          "AIRPORT_SURFACE_GAP",
          "ISLAND_FERRY_GAP",
          "HIGHWAY_BUS_GAP",
          "TOURISM_SPECIAL_MODE_GAP",
        ].map((k) => [k, audit.counts[k] - before.counts[k]]),
      ),
    };
    history.push({
      iteration: history.length + 1,
      actionId: action.actionId,
      strategyFingerprint: action.strategyFingerprint,
      actionType: action.type,
      triggerCounts: before.counts,
      parameterChanges: adapted.changes.map((c) => ({
        ...c,
        actualImprovement,
      })),
      expectedImprovement: action.expectedImprovement,
      actualImprovement,
      graphSha256: hash(edges),
      remainingDeficits: audit.counts,
    });
  }
  const batches = executeBatches(output, groups, {
    chunkSize: parameters.routeChunkSize,
    rerunBatch,
    repair,
  });
  const integrity = {
    noNxN: "PASS",
    directedEndpoints: "PASS",
    provenance: "PASS",
    serviceSequence: "PASS",
    checksum: "PASS",
    batchSize: batches.receipts.every((r) => r.edgeCount <= 200)
      ? "PASS"
      : "FAIL",
    deterministicRebuild: "NOT_RUN",
    resumeCorruptionInvalidation: "NOT_RUN",
  };
  const gate = acceptance(audit, [], (p) => fs.readFileSync(rel(p)), integrity);
  const files = new Map();
  const json = (name, value) => files.set(name, jsonBytes(value));
  const rows = (name, value) => files.set(name, jsonlBytes(value));
  json("required-backbone-inventory.json", {
    task: "TASK-086-B",
    policy: "MONOTONIC_NO_SILENT_SHRINK",
    candidateObligationsDoNotAuthorizeNodes: true,
    baselineFormalAcceptedV2: 0,
    nodes: inventory,
  });
  rows(
    "transport-lines.jsonl",
    packs.flatMap((p) => p.lines),
  );
  rows(
    "service-patterns.jsonl",
    activePatterns.sort((a, b) =>
      compare(a.servicePatternId, b.servicePatternId),
    ),
  );
  rows(
    "transport-node-edges.jsonl",
    edges.sort((a, b) => compare(a.edgeId, b.edgeId)),
  );
  for (const [name, kind] of [
    ["service-segment-edges", "service_segment"],
    ["hub-transfer-edges", "hub_transfer"],
    ["direct-service-edges", "direct_service"],
  ])
    rows(
      name + ".jsonl",
      edges.filter((e) => e.edgeKind === kind),
    );
  rows(
    "node-downstream-admission.jsonl",
    [...allAdmitted, ...pending].sort((a, b) => compare(a.nodeId, b.nodeId)),
  );
  rows("topology-unresolved.jsonl", audit.deficits);
  rows("dynamic-field-unresolved.jsonl", audit.metricOnly);
  rows("fixpoint-proofs.jsonl", []);
  rows(
    "next-source-actions.jsonl",
    review.reviews
      .filter((r) => r.ordinaryWorkRemaining)
      .map((r) => ({
        actionId: r.reviewId,
        action: "ACQUIRE_OR_REVIEW_DEFICIT_EVIDENCE",
        category: r.category,
        evidenceNeeded: r.nextEvidence,
        triggerDeficitIds: audit.deficits
          .filter(
            (d) =>
              d.class === "SOURCE_LICENSE_GAP" || d.class === "DISCONNECTED_T0",
          )
          .map((d) => d.deficitId),
        automaticNetworkExecution: false,
        reason:
          "This runner consumes explicitly licensed source packages; acquisition/rights review remains open",
      })),
  );
  json("source-rights.json", {
    sources: [...sources.values()],
    nationalSourceReviews: review.reviews,
    providers: {
      batch: "NOT_AUTHORIZED",
      cache: "NONE",
      retention: "NONE",
      productionLookupPerformed: false,
    },
    n03JoinPerformed: false,
    rejectedV1Used: false,
    task085Used: false,
  });
  json("connectivity-audit.json", {
    anchorNodeId,
    counts: audit.counts,
    tier: audit.tier,
    connectedRequiredNodes: audit.connected,
    disconnectedRequiredNodes: audit.disconnected,
    requiredNodeCount: inventory.length,
    admittedCount: allAdmitted.length,
    holdCount: pending.length,
    rejectedCount: 0,
    edgeCountsByKind: countBy(edges, "edgeKind"),
    edgeCountsByMode: countBy(edges, "mode"),
    edgeCountsByOperator: countBy(edges, "operatorRef"),
    servicePatterns: activePatterns.length,
    hubTransferAudit: {
      explicitTransfers: audit.transferResults,
      pendingV2Scopes: persistentGaps.filter(
        (g) => g.class === "HUB_TRANSFER_GAP",
      ).length,
    },
    dynamicMetrics: audit.metrics,
  });
  json("corridor-query-results.json", {
    graphSha256: hash(edges),
    results: audit.corridors,
  });
  json("adaptive-model-state.json", {
    parameters,
    iterationCount: history.length,
    converged: false,
    globalTopologyDiscoveryFixpoint: gate.globalTopologyDiscoveryFixpoint,
    stopReason:
      "AVAILABLE_LICENSED_PATTERNS_EXHAUSTED_NATIONAL_SOURCE_REVIEW_REQUIRED",
    remainingOrdinaryDiscovery: true,
    sourceReviewIds: review.reviews.map((r) => r.reviewId),
    remainingDeficits: audit.counts,
  });
  rows("adaptive-model-iterations.jsonl", history);
  json("final-acceptance-gate.json", gate);
  for (const [name, body] of files) atomicWrite(path.join(output, name), body);
  const manifest = {
    task: "TASK-086-B",
    baseDevelopSha: base,
    branch: "feature/b-transport-node-mobility-backbone",
    generatedAt,
    generatedAtMeaning: "FIXED_DATA_SNAPSHOT_LABEL_NOT_RETRIEVAL_TIME",
    status: gate.status,
    runtimeImportAuthorized: false,
    inputHashes,
    generatorHashes,
    requiredInventoryHash: hash(files.get("required-backbone-inventory.json")),
    artifactHashes: Object.fromEntries(
      [...files].map(([name, body]) => [name, hash(body)]),
    ),
    batchReceipts: batches.receipts,
    counts: {
      admitted: allAdmitted.length,
      hold: pending.length,
      rejected: 0,
      required: inventory.length,
      lines: linePatterns.size,
      servicePatterns: activePatterns.length,
      edges: edges.length,
      iterations: history.length,
    },
    sourceAttribution: packs.map((p) => p.source.attribution),
  };
  atomicWrite(path.join(output, "manifest.json"), jsonBytes(manifest));
  return {
    manifest,
    batchDispositions: countBy(batches.results, "disposition"),
  };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const args = process.argv.slice(2),
    value = (key) =>
      args.includes(key) ? args[args.indexOf(key) + 1] : undefined;
  console.log(
    JSON.stringify(
      run({
        output: value("--output"),
        rerunBatch: value("--batch"),
        repair: args.includes("--repair"),
      }),
      null,
      2,
    ),
  );
}
