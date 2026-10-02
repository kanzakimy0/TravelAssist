import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hash,
  canonical,
  admitNodes,
  generatePattern,
  generateTransfer,
  validateEdges,
  anchorQueries,
} from "./task-086-model.mjs";
import {
  readJson,
  readRows,
  atomicWrite,
  jsonBytes,
  jsonlBytes,
} from "./task-086-batches.mjs";
import { safeSourceUrl } from "./task-086-log-safety.mjs";
const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  ),
  base = path.join(root, "data/transport/network");
// Expanded passenger-state SCCs respect boarding, alighting and continued rides.
export function passengerComponents(nodes, edges) {
  const adj = new Map(),
    rev = new Map();
  const add = (v) => {
    if (!adj.has(v)) {
      adj.set(v, []);
      rev.set(v, []);
    }
  };
  const arc = (a, b) => {
    add(a);
    add(b);
    adj.get(a).push(b);
    rev.get(b).push(a);
  };
  for (const n of nodes) add("g:" + n.nodeId);
  const segments = new Map(
    edges
      .filter((e) => e.edgeKind === "service_segment")
      .map((e) => [e.servicePatternRef + ":" + e.segmentIndex, e]),
  );
  for (const e of edges) {
    const a = "g:" + e.fromTransportNodeId,
      b = "g:" + e.toTransportNodeId;
    if (e.edgeKind === "service_segment") {
      const ride = "r:" + e.edgeId;
      add(ride);
      if (e.boardAllowed !== false) arc(a, ride);
      if (e.alightAllowed !== false) arc(ride, b);
      const next = segments.get(
        e.servicePatternRef + ":" + (e.segmentIndex + 1),
      );
      if (next && next.fromTransportNodeId === e.toTransportNodeId)
        arc(ride, "r:" + next.edgeId);
    } else if (e.boardAllowed !== false && e.alightAllowed !== false) arc(a, b);
  }
  const seen = new Set(),
    order = [];
  for (const start of adj.keys()) {
    if (seen.has(start)) continue;
    seen.add(start);
    const stack = [[start, 0]];
    while (stack.length) {
      const top = stack.at(-1),
        list = adj.get(top[0]);
      if (top[1] < list.length) {
        const n = list[top[1]++];
        if (!seen.has(n)) {
          seen.add(n);
          stack.push([n, 0]);
        }
      } else {
        order.push(top[0]);
        stack.pop();
      }
    }
  }
  const membership = new Map(),
    components = [];
  for (const start of order.reverse()) {
    if (membership.has(start)) continue;
    const idx = components.length,
      stack = [start],
      members = [];
    membership.set(start, idx);
    while (stack.length) {
      const v = stack.pop();
      if (v.startsWith("g:")) members.push(v.slice(2));
      for (const n of rev.get(v))
        if (!membership.has(n)) {
          membership.set(n, idx);
          stack.push(n);
        }
    }
    components.push(members.sort());
  }
  return new Map(
    nodes.map((n) => [
      n.nodeId,
      "component:" +
        hash(components[membership.get("g:" + n.nodeId)]).slice(0, 20),
    ]),
  );
}
export function validPath(ids, from, to, byEdge) {
  let node = from,
    pattern = null,
    index = null,
    canAlight = true;
  for (const id of ids ?? []) {
    const e = byEdge.get(id);
    if (!e || e.fromTransportNodeId !== node) return false;
    const continuing =
      e.edgeKind === "service_segment" &&
      pattern === e.servicePatternRef &&
      index + 1 === e.segmentIndex;
    if (!continuing && (!canAlight || e.boardAllowed === false)) return false;
    node = e.toTransportNodeId;
    pattern = e.servicePatternRef ?? null;
    index = e.segmentIndex ?? null;
    canAlight = e.alightAllowed !== false;
  }
  return Array.isArray(ids) && node === to && canAlight;
}
export function buildStageReport() {
  const j = (n) => readJson(path.join(base, n)),
    r = (n) => readRows(path.join(base, n)),
    scope = j("research/stage-scope.json"),
    inv = j("required-backbone-inventory.json").nodes,
    nodes = r("node-downstream-admission.jsonl"),
    edges = r("transport-node-edges.jsonl"),
    patterns = r("service-patterns.jsonl"),
    audit = j("connectivity-audit.json"),
    corridors = j("corridor-query-results.json").results,
    deficits = r("topology-unresolved.jsonl"),
    actions = r("next-source-actions.jsonl"),
    manifest = j("manifest.json");
  const byNode = new Map(nodes.map((n) => [n.nodeId, n])),
    byReq = new Map(inv.map((n) => [n.requirementId, n])),
    byEdge = new Map(edges.map((e) => [e.edgeId, e])),
    byCorridor = new Map(corridors.map((c) => [c.corridorId, c])),
    evidence = new Map(
      r("topology-evidence.jsonl").map((e) => [e.evidenceId, e]),
    ),
    sources = new Map(
      j("source-rights.json").sources.map((s) => [s.sourceId, s]),
    ),
    original = new Set(scope.originalRequirements.map((n) => n.requirementId)),
    connected = new Set(audit.connectedRequiredNodes),
    nodeReq = new Map(inv.map((x) => [x.nodeId, x])),
    core = new Set(scope.coreRequirementIds);
  const frozen = [
    ...scope.originalRequirements,
    ...scope.addedRequiredIntermediates,
  ];
  if (
    inv.length !== frozen.length ||
    frozen.some(
      (n) =>
        !byReq.has(n.requirementId) ||
        byReq.get(n.requirementId).nodeId !== n.nodeId ||
        byReq.get(n.requirementId).tier !== n.tier,
    )
  )
    throw Error("FROZEN_REQUIREMENTS_CHANGED");
  const checks = [],
    check = (name, fn) => {
      try {
        const detail = fn();
        checks.push({ name, status: "PASS", detail });
      } catch (e) {
        checks.push({ name, status: "FAIL", reason: e.message });
      }
    };
  check("identity_admission_all_retained_nodes", () => {
    const admitted = nodes.filter(
      (n) => n.decision === "ADMIT_TASK_086_TOPOLOGY",
    );
    const rebuilt = admitNodes(admitted, sources, evidence);
    const failed = rebuilt.filter(
      (n) => n.decision !== "ADMIT_TASK_086_TOPOLOGY",
    );
    if (failed.length)
      throw Error(
        canonical(
          failed.map((n) => ({ nodeId: n.nodeId, reasons: n.reasons })),
        ),
      );
    return admitted.length;
  });
  check("provenance_direction_duplicates", () => {
    validateEdges(edges);
    return edges.length;
  });
  check("actual_ordered_patterns_rights_and_boarding", () => {
    for (const p of patterns) {
      const actual = edges.filter(
        (e) =>
          e.edgeKind === "service_segment" &&
          e.servicePatternRef === p.servicePatternId,
      );
      const expected = generatePattern(
        p,
        byNode,
        sources,
        evidence,
        "2026-10-01T00:00:00Z",
      );
      if (
        hash(actual) !==
        hash(expected.sort((a, b) => a.edgeId.localeCompare(b.edgeId)))
      )
        throw Error("Pattern reconstruction mismatch " + p.servicePatternId);
    }
    return patterns.length;
  });
  check("public_transfer_evidence_endpoint_and_direction", () => {
    let count = 0;
    for (const e of edges.filter((e) => e.edgeKind === "hub_transfer")) {
      const rows = e.topologyEvidenceRefs.map((id) => evidence.get(id));
      const kind = rows.every((x) => x?.record?.from_stop_id !== undefined)
        ? "GTFS_TRANSFER"
        : "OFFICIAL_INTERCHANGE";
      generateTransfer(
        {
          from: e.fromTransportNodeId,
          to: e.toTransportNodeId,
          hubRef: e.hubRef,
          directed: true,
          evidenceKind: kind,
          evidenceRefs: e.topologyEvidenceRefs,
          sourceRefs: e.sourceRefs,
          metrics: {},
        },
        byNode,
        sources,
        evidence,
        e.generatedAt,
      );
      count++;
    }
    return count;
  });
  check("all_published_corridor_witnesses_obey_boarding_and_direction", () => {
    for (const c of corridors.filter((c) => c.status === "PASS"))
      if (
        !validPath(c.forwardEdgeIds, c.from, c.to, byEdge) ||
        !validPath(c.reverseEdgeIds, c.to, c.from, byEdge)
      )
        throw Error("Invalid witness " + c.corridorId);
    return corridors.filter((c) => c.status === "PASS").length;
  });
  check("raw_content_hashes_and_retained_input_versions", () => {
    let count = 0;
    for (const [p, h] of Object.entries(manifest.inputHashes)) {
      if (hash(fs.readFileSync(path.join(root, p))) !== h)
        throw Error("Input changed " + p);
      count++;
    }
    return count;
  });
  const components = passengerComponents(nodes, edges),
    anchorComponent = components.get(audit.anchorNodeId),
    query = anchorQueries(edges, audit.anchorNodeId);
  check("passenger_component_classification_matches_restricted_queries", () => {
    for (const n of nodes.filter(
      (n) => n.decision === "ADMIT_TASK_086_TOPOLOGY",
    )) {
      const actual =
        query(audit.anchorNodeId, n.nodeId) !== null &&
        query(n.nodeId, audit.anchorNodeId) !== null;
      if ((components.get(n.nodeId) === anchorComponent) !== actual)
        throw Error("Passenger SCC mismatch " + n.nodeId);
    }
    return nodes.length;
  });
  // Undirected grouping only joins related research, never establishes reachability.
  const parent = new Map(nodes.map((n) => [n.nodeId, n.nodeId]));
  const find = (x) => {
    let a = x;
    while (parent.get(a) !== a) a = parent.get(a);
    while (parent.get(x) !== x) {
      const next = parent.get(x);
      parent.set(x, a);
      x = next;
    }
    return a;
  };
  for (const e of edges) {
    const a = find(e.fromTransportNodeId),
      b = find(e.toTransportNodeId);
    if (a !== b) parent.set(a < b ? b : a, a < b ? a : b);
  }
  const nationalWeak = find(audit.anchorNodeId),
    roots = new Map(),
    nodeRoot = new Map();
  function addRoot(id, classification, reason) {
    if (!roots.has(id))
      roots.set(id, {
        rootCauseId: id,
        classification,
        status: "OPEN",
        reason,
        requirementIds: [],
        nodeIds: [],
        componentIds: [],
        routeIds: [],
        originalCheckIds: [],
        dependencies: [],
        evidenceRefs: [],
        sourceActionIds: [],
        requirementOrigins: [],
        nextActions: [],
      });
    return roots.get(id);
  }
  for (const req of inv) {
    const ds = deficits.filter((d) => d.requirementId === req.requirementId);
    if (!ds.length) continue;
    const n = byNode.get(req.nodeId),
      hold = n?.decision !== "ADMIT_TASK_086_TOPOLOGY";
    let key, category, reason;
    if (req.kind === "airport") {
      key = "root:airport:" + req.requirementId;
      category = hold ? "D" : "C";
      reason = hold
        ? "AIRPORT_IDENTITY_AND_CURRENT_PUBLIC_SURFACE_CHAIN_UNRESOLVED"
        : "CURRENT_PUBLIC_AIRPORT_SURFACE_SERVICE_OR_TRANSFER_EVIDENCE_MISSING";
    } else {
      const isolated = find(req.nodeId) !== nationalWeak;
      key = isolated
        ? "root:network:" + find(req.nodeId)
        : "root:direction:" + components.get(req.nodeId);
      category = hold ? "D" : isolated ? "B" : "C";
      reason = hold
        ? "INDEPENDENT_IDENTITY_OR_RIGHTS_UNRESOLVED"
        : isolated
          ? "EXISTING_LOCAL_PASSENGER_NETWORK_HAS_NO_NATIONAL_BRIDGE"
          : "DIRECTION_BOARDING_OR_PUBLIC_TRANSFER_CONTINUITY_UNPROVEN";
    }
    const row = addRoot(key, category, reason);
    row.requirementIds.push(req.requirementId);
    row.nodeIds.push(req.nodeId);
    row.componentIds.push(components.get(req.nodeId));
    row.evidenceRefs.push(...(n?.evidenceRefs ?? []));
    row.requirementOrigins.push(
      original.has(req.requirementId)
        ? "ORIGINAL_REQUIRED"
        : "ADDED_REQUIRED_INTERMEDIATE",
    );
    nodeRoot.set(req.nodeId, key);
  }
  const mappings = [];
  for (const d of deficits) {
    let ids = [];
    if (d.requirementId)
      ids = [nodeRoot.get(byReq.get(d.requirementId)?.nodeId)].filter(Boolean);
    if (d.corridorId) {
      const c = byCorridor.get(d.corridorId);
      ids = [nodeRoot.get(c?.from), nodeRoot.get(c?.to)].filter(Boolean);
    }
    if (d.deficitId === "mode:required-highway-gateways") {
      ids = [
        ...new Set(
          patterns
            .filter((p) => p.mode === "highway_bus")
            .flatMap((p) => p.callingNodes.map((n) => nodeRoot.get(n.nodeId)))
            .filter(Boolean),
        ),
      ];
    }
    if (!ids.length) {
      const row = addRoot(
        "root:obligation:" + d.deficitId,
        "C",
        d.reason ?? "EXPLICIT_OBLIGATION_REQUIRES_EVIDENCE_REVIEW",
      );
      ids = [row.rootCauseId];
      row.requirementOrigins.push("ORIGINAL_GLOBAL_OBLIGATION");
    }
    ids = [...new Set(ids)];
    for (const id of ids) roots.get(id).originalCheckIds.push(d.deficitId);
    mappings.push({
      deficitId: d.deficitId,
      class: d.class,
      rootCauseIds: ids,
    });
  }
  const nodesByName = new Map();
  for (const n of nodes.filter(
    (n) => n.decision === "ADMIT_TASK_086_TOPOLOGY",
  )) {
    if (!nodesByName.has(n.canonicalNameJa))
      nodesByName.set(n.canonicalNameJa, []);
    nodesByName.get(n.canonicalNameJa).push(n.nodeId);
  }
  for (const row of roots.values()) {
    row.routeIds = patterns
      .filter((p) => p.callingNodes.some((n) => row.nodeIds.includes(n.nodeId)))
      .map((p) => p.lineRef);
    row.affectedNodeNames = row.nodeIds.map(
      (id) => byNode.get(id)?.canonicalNameJa ?? nodeReq.get(id)?.name,
    );
    row.missingDirections = row.nodeIds.map((id) => ({
      nodeId: id,
      nationalToNode: query(audit.anchorNodeId, id) !== null,
      nodeToNational: query(id, audit.anchorNodeId) !== null,
      incidentServiceCalls: patterns.flatMap((p) =>
        p.callingNodes
          .filter((n) => n.nodeId === id)
          .map((n) => ({
            servicePatternId: p.servicePatternId,
            pickupType: n.pickupType ?? "0",
            dropOffType: n.dropOffType ?? "0",
          })),
      ),
    }));
    row.operators = [
      ...new Set(
        row.nodeIds.flatMap((id) => byNode.get(id)?.operatorRefs ?? []),
      ),
    ];
    row.originalRequiredCount = row.requirementIds.filter((id) =>
      original.has(id),
    ).length;
    row.coreRequiredCount = row.requirementIds.filter((id) =>
      core.has(id),
    ).length;
    const sourceIds = [
      ...new Set(
        row.evidenceRefs
          .map((id) => evidence.get(id)?.sourceId)
          .filter(Boolean),
      ),
    ];
    row.retainedSources = sourceIds.map((id) => ({
      sourceId: id,
      url: sources.get(id)?.url,
      contentSha256: sources.get(id)?.contentSha256,
      rightsClass: sources.get(id)?.rightsClass,
    }));
    row.sourceActionIds = actions
      .filter((a) =>
        a.sourcesChecked.some((s) =>
          row.retainedSources.some(
            (r) => r.url === s.url && r.contentSha256 === s.contentSha256,
          ),
        ),
      )
      .map((a) => a.actionId);
    row.researchBatchKey =
      "research:" + hash([row.operators, sourceIds]).slice(0, 20);
    row.sameNameCandidates = row.nodeIds.flatMap((id) => {
      const n = byNode.get(id);
      return (nodesByName.get(n?.canonicalNameJa) ?? [])
        .filter((other) => other !== id)
        .map((other) => ({
          from: id,
          candidate: other,
          scope: "DISCOVERY_ONLY_NOT_IDENTITY_OR_TRANSFER_PROOF",
        }));
    });
    row.nextActions =
      row.classification === "B"
        ? [
            "Reuse retained licensed trips and exact stop IDs for this component.",
            "Find a current official public interchange from a named existing station/terminal stop to an admitted national node.",
            "Review full directional connection chain before acquiring any missing evidence; import only scoped facts and replay.",
          ]
        : row.classification === "D"
          ? [
              "Resolve exact formal/current identity and same-operator location with primary source binding.",
              "Review current service and rights; preserve HOLD until all admission conditions pass.",
              "Bind both surface directions and public interchange to an admitted national node.",
            ]
          : [
              "Check existing normalized endpoints, retained evidence and direction-specific pickup/dropoff constraints.",
              "Acquire only the missing current service/public-transfer evidence for the complete connection chain.",
              "Keep unresolved directions open; never reverse a trip or infer a walk from distance.",
            ];
    if (row.rootCauseId.includes("required-special-tourism"))
      row.nextActions = [
        "Enumerate the required ropeway/cable/funicular gateways from the original task and candidate evidence; current monorail coverage does not settle this obligation.",
        "Obtain scope-owner acceptance for the enumerated mandatory list if existing task records do not determine it.",
        "Review exact identities, lawful current service and complete national access chains.",
      ];
    row.dependencies =
      row.classification === "D"
        ? [
            "IDENTITY_ADMISSION",
            "SOURCE_RIGHTS_REVIEW",
            "CURRENT_SERVICE",
            "PUBLIC_INTERCHANGE",
          ]
        : [
            "EXISTING_EVIDENCE_PREFLIGHT",
            "MISSING_CONNECTION_CHAIN_EVIDENCE",
            "SCOPED_VALIDATION",
          ];
    row.plannedConnectionChain = {
      startNodeIds: row.nodeIds,
      existingRouteIds: [...new Set(row.routeIds)],
      targetNationalAnchorNodeId: audit.anchorNodeId,
      missingLink: "PRIMARY_EVIDENCE_REQUIRED_BEFORE_ANY_NEW_EDGE",
    };
    for (const k of [
      "requirementIds",
      "nodeIds",
      "componentIds",
      "routeIds",
      "originalCheckIds",
      "dependencies",
      "evidenceRefs",
      "sourceActionIds",
      "requirementOrigins",
    ])
      row[k] = [...new Set(row[k])].sort();
  }
  const resolvedReviews = j("research/global-review.v1.json")
    .reviews.filter(
      (x) =>
        x.status === "REVIEWED_CLOSED" &&
        !deficits.some((d) => d.deficitId === x.deficitId),
    )
    .map((x) => ({
      rootCauseId: "root:stale-review:" + x.deficitId,
      classification: "A",
      status: "RESOLVED",
      reason:
        "HISTORICAL_REVIEW_REINJECTED_AFTER_QUALIFIED_SERVICE_DATA_EXISTED",
      originalCheckIds: [x.deficitId],
      inputBindings: x.inputBindings,
    }));
  const open = [...roots.values()].sort(
    (a, b) =>
      b.coreRequiredCount - a.coreRequiredCount ||
      b.originalRequiredCount - a.originalRequiredCount ||
      a.rootCauseId.localeCompare(b.rootCauseId),
  );
  const coreBlockers = deficits.filter(
    (d) =>
      (d.requirementId && core.has(d.requirementId)) ||
      d.class === "HUB_TRANSFER_GAP" ||
      d.class === "SERVICE_PATTERN_GAP" ||
      d.class === "SOURCE_LICENSE_GAP" ||
      (d.corridorId &&
        byCorridor.get(d.corridorId)?.origin === "TASK_MANDATORY_QUERY_ONLY"),
  );
  const verification = fs.existsSync(
    path.join(root, "docs/qa/TASK-086-B/deterministic-rebuild.json"),
  )
    ? readJson(path.join(root, "docs/qa/TASK-086-B/deterministic-rebuild.json"))
    : null;
  const cleanVerified =
    verification?.status === "PASS" &&
    hash(verification.generatorHashes) === hash(manifest.generatorHashes) &&
    hash(verification.inputHashes) === hash(manifest.inputHashes);
  const stage = {
    schemaVersion: 1,
    scopeId: scope.scopeId,
    stageGeneratorSha256: hash(fs.readFileSync(fileURLToPath(import.meta.url))),
    status:
      checks.every((x) => x.status === "PASS") &&
      coreBlockers.length === 0 &&
      cleanVerified
        ? "CORE_STAGE_PASS"
        : "VERIFIED_CORE_CHECKPOINT_WITH_BLOCKERS",
    nationwideComplete: false,
    scopeInputSha256: hash(
      fs.readFileSync(path.join(base, "research/stage-scope.json")),
    ),
    currentManifestSha256: hash(
      fs.readFileSync(path.join(base, "manifest.json")),
    ),
    requiredCount: inv.length,
    originalRequiredCount: original.size,
    addedRequiredCount: inv.length - original.size,
    originalConnectedCount: inv.filter(
      (n) => original.has(n.requirementId) && connected.has(n.requirementId),
    ).length,
    coreTier: audit.tier,
    coreBlockers,
    technicalChecks: checks,
    cleanDeterministicRebuildForCurrentInputs: cleanVerified,
    fullScope: {
      rawFailedChecks: deficits.length,
      uniqueOpenRoots: open.length,
      rootsByClass: Object.fromEntries(
        ["A", "B", "C", "D", "E"].map((c) => [
          c,
          open.filter((r) => r.classification === c).length,
        ]),
      ),
      airportSurfaceGaps: audit.counts.AIRPORT_SURFACE_GAP,
      disconnectedNodes: audit.disconnectedRequiredNodes.length,
      proofExceptions: 0,
    },
    runtimeImportAuthorized: false,
    productionIntegrationAuthorized: false,
  };
  atomicWrite(
    path.join(base, "residual-root-causes.jsonl"),
    jsonlBytes([...open, ...resolvedReviews]),
  );
  atomicWrite(
    path.join(base, "deficit-root-links.jsonl"),
    jsonlBytes(mappings),
  );
  atomicWrite(path.join(base, "core-stage-acceptance.json"), jsonBytes(stage));
  const acquisitionIndex = actions.map((a) => ({
    actionId: a.actionId,
    state: a.state,
    mode: a.mode,
    rightsScope: a.rightsFindings.at(-1)?.rightsClass ?? null,
    sources: a.sourcesChecked.map((s) => ({
      url: safeSourceUrl(s.url),
      contentSha256: s.contentSha256 ?? null,
      status: s.status,
      purpose: s.purpose,
    })),
    retryCondition:
      "RETRY_ONLY_AFTER_SOURCE_VERSION_PARSER_IDENTITY_OR_RIGHTS_INPUT_CHANGES",
    remainingResearchIsNotFixpoint: ![
      "INGESTED",
      "SUPERSEDED_BY_ALTERNATIVE",
    ].includes(a.state),
  }));
  atomicWrite(
    path.join(base, "research/acquisition-index.jsonl"),
    jsonlBytes(acquisitionIndex),
  );
  atomicWrite(
    path.join(base, "research/existing-connections.json"),
    jsonBytes({
      schemaVersion: 1,
      graphSha256: hash(edges),
      nodeIdsByExactName: Object.fromEntries([...nodesByName].sort()),
      directedTransfers: edges
        .filter((e) => e.edgeKind === "hub_transfer")
        .map((e) => ({
          from: e.fromTransportNodeId,
          to: e.toTransportNodeId,
          evidenceRefs: e.topologyEvidenceRefs,
        })),
      rule: "Lookup exact identities and directed existing relationships before research; same names do not establish transfers.",
    }),
  );
  atomicWrite(
    path.join(base, "execution-state.json"),
    jsonBytes({
      schemaVersion: 1,
      scopeId: scope.scopeId,
      phase: 162,
      stageStatus: stage.status,
      nationalStatus: j("final-acceptance-gate.json").status,
      counts: manifest.counts,
      inputVersion: hash(manifest.inputHashes),
      generatorVersion: hash(manifest.generatorHashes),
      completed: [
        "PRESERVED_PHASES_160_162",
        "PROOF_INPUT_PERSISTENCE",
        "GLOBAL_REVIEW_RECONCILIATION",
        "NORMALIZED_PREFLIGHT_INDEX",
        "ROOT_CAUSE_CLASSIFICATION",
        "SIGNED_URL_REDACTION",
      ],
      unresolvedRootCount: open.length,
      nextAction: "COMPLETE_STAGE_VALIDATION_AND_REPORT_THEN_STOP",
      newSourceAcquisitionAuthorized: false,
      optionalExpansionScope: [],
    }),
  );
  return stage;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const r = buildStageReport();
  console.log(
    JSON.stringify(
      {
        status: r.status,
        checks: r.technicalChecks,
        coreBlockers: r.coreBlockers.length,
        fullScope: r.fullScope,
      },
      null,
      2,
    ),
  );
}
