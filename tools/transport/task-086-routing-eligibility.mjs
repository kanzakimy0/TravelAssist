import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { certify, currentBinding } from "./task-086-final-closeout.mjs";
import { canonical, hash } from "./task-086-model.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const candidate = path.join(root, "data/transport/network");
export const closeoutDirectory = path.join(
  root,
  "docs/qa/TASK-086/readmittable-closeout",
);
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const rows = (p) =>
  fs
    .readFileSync(p, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
const sorted = (a) => [...new Set(a)].sort();
const write = (p, value) => {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, canonical(value) + "\n");
};
const stateFor = (audit, sources) => {
  if (audit.status === "CERTIFIED") return "ROUTE_ENABLED";
  if (audit.status === "REJECTED") return "ROUTE_DISABLED_REJECTED";
  if (
    (audit.sourceIds ?? []).some(
      (id) => sources.get(id)?.status !== "CERTIFIED",
    )
  )
    return "ROUTE_DISABLED_RIGHTS_UNVERIFIED";
  return "ROUTE_DISABLED_IDENTITY_UNRESOLVED";
};

// This is the WBS 7.16 export boundary, not a Planner or production integration.
// No alias, reverse, pattern, transfer or fallback expansion can confer authority.
export function eligibleExport(graph, eligibility) {
  const nodes = new Set(eligibility.routeEnabled.nodeIds);
  const edges = new Set(eligibility.routeEnabled.edgeIds);
  const transfers = new Set(eligibility.routeEnabled.transferIds);
  const allowedNodes = graph.nodes.filter((n) => nodes.has(n.nodeId));
  assert.equal(
    new Set(allowedNodes.map((n) => n.nodeId)).size,
    nodes.size,
    "Missing or duplicate certified node export",
  );
  const allowedEdges = graph.edges.filter((e) => edges.has(e.edgeId));
  assert.equal(
    new Set(allowedEdges.map((e) => e.edgeId)).size,
    edges.size,
    "Missing or duplicate certified edge export",
  );
  for (const edge of allowedEdges) {
    assert.ok(
      nodes.has(edge.fromTransportNodeId) && nodes.has(edge.toTransportNodeId),
      "Excluded endpoint in certified export",
    );
    if (edge.edgeKind === "hub_transfer") assert.ok(transfers.has(edge.edgeId));
  }
  // Exact payload binding rejects reversed/synthesized same-ID edges and aliases,
  // changed restrictions, invented metrics and fallback serialization changes.
  assert.equal(
    hash({ nodes: allowedNodes, edges: allowedEdges }),
    eligibility.projectionSha256,
    "Export differs from certified direction/access/metric payload",
  );
  return { nodes: allowedNodes, edges: allowedEdges };
}

export function loadEligibleGraph(directory = closeoutDirectory) {
  const eligibility = read(path.join(directory, "routing-eligibility.json"));
  assert.equal(
    eligibility.inputSha256,
    currentBinding().inputSha256,
    "Stale eligibility input",
  );
  assert.equal(
    hash(fs.readFileSync(path.join(directory, eligibility.exclusions.file))),
    eligibility.exclusions.sha256,
    "Changed exclusion manifest",
  );
  assert.equal(
    hash(
      fs.readFileSync(path.join(directory, eligibility.rootDispositions.file)),
    ),
    eligibility.rootDispositions.sha256,
    "Changed root decisions",
  );
  for (const [name, sha] of Object.entries(eligibility.exportHashes))
    assert.equal(
      hash(fs.readFileSync(path.join(directory, "route-enabled", name))),
      sha,
      "Changed certified export " + name,
    );
  const graph = {
    nodes: rows(path.join(directory, "route-enabled/nodes.jsonl")),
    edges: rows(path.join(directory, "route-enabled/edges.jsonl")),
  };
  return { eligibility, graph: eligibleExport(graph, eligibility) };
}

export function requireEligibleTraversal(graph, eligibility, nodeIds, edgeIds) {
  const projection = eligibleExport(graph, eligibility);
  const nodes = new Set(projection.nodes.map((n) => n.nodeId));
  const edges = new Map(projection.edges.map((e) => [e.edgeId, e]));
  if (
    !nodeIds.length ||
    edgeIds.length !== nodeIds.length - 1 ||
    nodeIds.some((id) => !nodes.has(id))
  )
    return {
      status: "UNAVAILABLE_UNVERIFIABLE_EXCLUSION",
      traversalPermitted: false,
    };
  for (let i = 0; i < edgeIds.length; i++) {
    const e = edges.get(edgeIds[i]);
    if (
      !e ||
      e.fromTransportNodeId !== nodeIds[i] ||
      e.toTransportNodeId !== nodeIds[i + 1]
    )
      return {
        status: "UNAVAILABLE_UNVERIFIABLE_EXCLUSION",
        traversalPermitted: false,
      };
  }
  return {
    status: "ELIGIBLE_TOPOLOGY_ONLY",
    traversalPermitted: true,
    passengerAccessAndScheduleValidationRequired: true,
  };
}

export function generateCloseout({
  outputDirectory = closeoutDirectory,
  scratchDirectory,
} = {}) {
  const reviewPath = path.join(closeoutDirectory, "reviewed-evidence.json");
  const review = read(reviewPath);
  assert.equal(
    review.authorityCommit,
    "03520a3a404ad0165664f46b9be6e2e98fd571ba",
  );
  assert.ok(
    review.newUniqueOfficialPageCount <= review.newUniqueOfficialPageLimit,
  );
  const binding = currentBinding();
  assert.deepEqual(
    binding.staleManifestBindings,
    [],
    "Candidate production manifest stale",
  );
  const scratch =
    scratchDirectory ??
    path.join(root, ".cache/task-086/readmittable-certification");
  const cert = certify({
    outputDirectory: scratch,
    sourceSupplements: review.sourceSupplements,
  });
  const audits = {
    node: read(path.join(scratch, "final-node-identity-audit.json")).nodes,
    edge: read(path.join(scratch, "final-edge-audit.json")).edges,
    transfer: read(path.join(scratch, "final-transfer-audit.json")).transfers,
    source: read(path.join(scratch, "final-source-certification.json")).sources,
  };
  const acceptance = read(path.join(scratch, "final-acceptance.json"));
  const originalRoots = read(
    path.join(root, "docs/qa/TASK-086/final-blocker-inventory.json"),
  ).blockers.filter((r) => !r.blocker_id.startsWith("engineering:"));
  assert.equal(originalRoots.length, 251);
  const rawNodes = rows(
    path.join(candidate, "node-downstream-admission.jsonl"),
  );
  const rawEdges = rows(path.join(candidate, "transport-node-edges.jsonl"));
  const rawSources = read(path.join(candidate, "source-rights.json")).sources;
  const sourceMap = new Map(audits.source.map((s) => [s.sourceId, s]));
  const nodeMap = new Map(rawNodes.map((n) => [n.nodeId, n]));
  const edgeMap = new Map(rawEdges.map((e) => [e.edgeId, e]));
  // The old special-scope blocker had no entity IDs. Recover its retained
  // applicability mapping without changing the historical blocker record.
  const special = read(
    path.join(candidate, "research/global-review.v1.json"),
  ).reviews.find((r) => r.deficitId === "mode:required-special-tourism");
  for (const obligation of originalRoots) {
    if (
      obligation.blocker_id === "root:obligation:mode:required-special-tourism"
    ) {
      obligation.nodeIds = sorted(special.requiredNodeIds);
      obligation.edgeIds = sorted(
        rawEdges
          .filter(
            (e) =>
              obligation.nodeIds.includes(e.fromTransportNodeId) ||
              obligation.nodeIds.includes(e.toTransportNodeId),
          )
          .map((e) => e.edgeId),
      );
      obligation.transferIds = obligation.edgeIds.filter(
        (id) => edgeMap.get(id).edgeKind === "hub_transfer",
      );
      obligation.source = sorted(
        [
          ...audits.node.filter((n) => obligation.nodeIds.includes(n.nodeId)),
          ...audits.edge.filter((e) => obligation.edgeIds.includes(e.edgeId)),
        ].flatMap((e) => e.sourceIds),
      );
    }
  }
  const rootRefs = (kind, id) =>
    originalRoots
      .filter((r) =>
        (kind === "node"
          ? r.nodeIds
          : kind === "source"
            ? r.source
            : kind === "transfer"
              ? r.transferIds
              : r.edgeIds
        )?.includes(id),
      )
      .map((r) => r.blocker_id)
      .sort();
  const entities = [];
  for (const [kind, list] of Object.entries(audits))
    for (const audit of list) {
      const id =
        audit.nodeId ?? audit.edgeId ?? audit.transferId ?? audit.sourceId;
      const raw =
        kind === "node"
          ? nodeMap.get(id)
          : kind === "source"
            ? null
            : edgeMap.get(id);
      const sourceIds = kind === "source" ? [id] : audit.sourceIds;
      const state =
        kind === "source"
          ? audit.status === "CERTIFIED"
            ? "ROUTE_ENABLED"
            : audit.status === "REJECTED"
              ? "ROUTE_DISABLED_REJECTED"
              : "ROUTE_DISABLED_RIGHTS_UNVERIFIED"
          : stateFor(audit, sourceMap);
      entities.push({
        entityId: id,
        kind: kind === "source" ? "source_dependency" : kind,
        state,
        certification: audit.status,
        reasonCodes: audit.reasons ?? [],
        sourceIds,
        evidenceRefs:
          raw?.evidenceRefs ??
          raw?.topologyEvidenceRefs ??
          audit.provenanceEvidenceIds ??
          [],
        endpointIds: raw?.fromTransportNodeId
          ? [raw.fromTransportNodeId, raw.toTransportNodeId]
          : [],
        historicalRootIds: rootRefs(kind, id),
        runtimeImportAllowed: state === "ROUTE_ENABLED",
        traversalPermitted: state === "ROUTE_ENABLED" && kind !== "source",
        readmittable:
          state !== "ROUTE_ENABLED" && state !== "ROUTE_DISABLED_REJECTED",
        readmissionRequirement:
          state === "ROUTE_ENABLED"
            ? null
            : "Dedicated source-specific re-certification with fresh content/rights/identity/direction/transfer bindings and complete dependency/export checks; never a flag-only change.",
      });
    }
  entities.sort((a, b) =>
    (a.kind + ":" + a.entityId).localeCompare(b.kind + ":" + b.entityId, "en"),
  );
  assert.equal(
    new Set(entities.map((e) => e.kind + ":" + e.entityId)).size,
    entities.length,
  );
  assert.equal(audits.node.length, rawNodes.length);
  assert.equal(audits.edge.length, rawEdges.length);
  assert.equal(audits.source.length, rawSources.length);
  assert.equal(
    audits.transfer.length,
    rawEdges.filter((e) => e.edgeKind === "hub_transfer").length,
  );
  const excluded = entities.filter((e) => !e.runtimeImportAllowed);
  const enabled = (kind) =>
    entities
      .filter((e) => e.kind === kind && e.runtimeImportAllowed)
      .map((e) => e.entityId)
      .sort();
  const dispositions = originalRoots
    .map((r) => {
      const sourceIds = Array.isArray(r.source) ? r.source : [];
      const affected = entities.filter((e) =>
        e.historicalRootIds.includes(r.blocker_id),
      );
      // Five native platforms remain certified with their real one-way service.
      // Their unproven extra direction/walk is a coverage exclusion, not a reason
      // to destroy a valid platform identity or invent a transfer.
      const rightsClosed =
        r.type === "SOURCE_CERTIFICATION" &&
        sourceIds.length > 0 &&
        sourceIds.every((id) => sourceMap.get(id)?.status === "CERTIFIED");
      const applicableObservations = review.officialObservations.filter((o) =>
        sourceIds.some((id) => {
          const s = sourceMap.get(id);
          if (!s) return false;
          return (
            s.family === new URL(o.url).hostname ||
            s.termsEvidence?.termsUrl === o.url
          );
        }),
      );
      return {
        rootId: r.blocker_id,
        historicalType: r.type,
        disposition: rightsClosed
          ? "CLOSED_AS_CERTIFIED_SOURCE_BINDING"
          : "CLOSED_AS_READMITTABLE_EXCLUSION",
        acceptancePending: false,
        sourceIds,
        nodeIds: r.nodeIds ?? [],
        edgeIds: r.edgeIds ?? [],
        transferIds: r.transferIds ?? [],
        originalCheckIds: r.originalCheckIds ?? [],
        affectedCorridors: r.affectedCorridors ?? [],
        certifiedEntityIds: affected
          .filter((e) => e.runtimeImportAllowed)
          .map((e) => e.entityId),
        disabledEntityIds: sorted(
          affected
            .filter((e) => !e.runtimeImportAllowed)
            .map((e) => e.entityId),
        ),
        coverageRelationshipExcluded: r.type !== "SOURCE_CERTIFICATION",
        attempt: {
          method: "RETAINED_EVIDENCE_AND_SHARED_OFFICIAL_RIGHTS_REVIEW",
          priority:
            r.affectedCorridors?.length ||
            r.type === "CURRENT_GLOBAL_PROOF_BINDING"
              ? "NATIONAL_CORRIDOR_OR_GATEWAY"
              : "SHARED_SOURCE_FAMILY",
          retainedSourceFindings: sourceIds.map((id) => ({
            sourceId: id,
            sourceIdentity: sourceMap.get(id)?.sourceIdentity ?? null,
            retainedEvidenceIds: sourceMap.get(id)?.provenanceEvidenceIds ?? [],
            snapshotResult:
              sourceMap.get(id)?.snapshotReproducibility ?? "NO_SOURCE_ENTITY",
            license: sourceMap.get(id)?.license ?? null,
            termsEvidence: sourceMap.get(id)?.termsEvidence ?? null,
            currentReasons: sourceMap.get(id)?.reasons ?? [],
          })),
          officialObservations: applicableObservations,
          priorNativePlatformReview:
            r.type === "SOURCE_CERTIFICATION"
              ? null
              : "Reused phase244/245 retained GTFS direction and four external map observations, plus existing scope audit. No fresh map visit claimed; no complete public walk/reverse boarding evidence supplied. Stale proofs are not rebound or promoted.",
          decision: rightsClosed
            ? "Matched actual retained P05-22 archive, native dataset review, catalog and explicit CC BY terms; descriptor defect repaired."
            : r.type === "SOURCE_CERTIFICATION"
              ? "Current retained rights/snapshot/identity audit still insufficient. No applicable exact-field grant or independently reviewed lawful reuse basis established in bounded pass; stop equivalent retries."
              : "Retained truthful platform/service identity remains certified where applicable; absent connection/changed audit proof cannot establish the extra scope relationship. Accept unavailable relationship under new policy, not under historical national PASS gate.",
        },
        futureReadmission: rightsClosed ? null : r.requiredRemediation,
        historicalReason: r.reason,
      };
    })
    .sort((a, b) => a.rootId.localeCompare(b.rootId, "en"));
  const integrity = acceptance.graphIntegrity;
  for (const key of [
    "danglingReferenceCount",
    "selfEdgeCount",
    "duplicateEdgeCount",
    "duplicateCanonicalIdentityCount",
    "invalidDirectionCount",
    "impossibleModeTransitionCount",
    "invalidEndpointSerializationCount",
    "invalidTransferCount",
    "danglingPatternReferenceCount",
    "invalidOperatorLineOrAccessRelationshipCount",
  ])
    assert.equal(integrity[key], 0, key);
  assert.equal(integrity.serializationRoundTrip, "PASS");
  const exclusionsText =
    excluded.map(canonical).join("\n") + (excluded.length ? "\n" : "");
  const rootText = dispositions.map(canonical).join("\n") + "\n";
  fs.mkdirSync(outputDirectory, { recursive: true });
  fs.writeFileSync(
    path.join(outputDirectory, "route-disabled.jsonl"),
    exclusionsText,
  );
  fs.writeFileSync(
    path.join(outputDirectory, "root-dispositions.jsonl"),
    rootText,
  );
  const eligibility = {
    schemaVersion: 1,
    task: "TASK-086-B",
    authorityCommit: review.authorityCommit,
    inputSha256: binding.inputSha256,
    reviewedEvidenceSha256: hash(fs.readFileSync(reviewPath)),
    frozenCandidateHashes: {
      nodes: binding.nodeArtifactSha256,
      edges: binding.edgeArtifactSha256,
      sources: hash(
        fs.readFileSync(path.join(candidate, "source-rights.json")),
      ),
    },
    projectionSha256: integrity.projectionReplaySha256,
    routeEnabled: {
      nodeIds: enabled("node"),
      edgeIds: enabled("edge"),
      transferIds: enabled("transfer"),
      sourceIds: enabled("source_dependency"),
    },
    exclusions: {
      file: "route-disabled.jsonl",
      sha256: hash(exclusionsText),
      count: excluded.length,
    },
    rootDispositions: {
      file: "root-dispositions.jsonl",
      sha256: hash(rootText),
      count: dispositions.length,
      openCount: 0,
    },
    unknownPolicy: "EXCLUDE_FAIL_CLOSED",
    rawEvidencePreserved: true,
    routeBoundaryOnly: true,
    productionIntegrationPerformed: false,
  };
  const graph = {
    nodes: rows(path.join(scratch, "certified-backbone/nodes.jsonl")),
    edges: rows(path.join(scratch, "certified-backbone/edges.jsonl")),
  };
  eligibleExport(graph, eligibility);
  const exportPath = path.join(outputDirectory, "route-enabled");
  fs.mkdirSync(exportPath, { recursive: true });
  const exportHashes = {};
  for (const name of [
    "nodes.jsonl",
    "edges.jsonl",
    "transfers.jsonl",
    "service-patterns.jsonl",
    "evidence.jsonl",
    "sources.json",
  ]) {
    const bytes = fs.readFileSync(
      path.join(scratch, "certified-backbone", name),
    );
    fs.writeFileSync(path.join(exportPath, name), bytes);
    exportHashes[name] = hash(bytes);
  }
  eligibility.exportHashes = exportHashes;
  write(path.join(outputDirectory, "routing-eligibility.json"), eligibility);
  const corridorState = (item) => ({
    ...item,
    status:
      item.status === "PASS"
        ? "SUPPORTED_BY_CERTIFIED_GRAPH"
        : item.rawStatus === "FAIL"
          ? "UNAVAILABLE_COVERAGE_GAP"
          : "UNAVAILABLE_UNVERIFIABLE_EXCLUSION",
  });
  const historical = read(
    path.join(root, "docs/qa/TASK-086/final-acceptance.json"),
  );
  const newlyCertified = (kind, oldName, key) => {
    const previous = read(path.join(root, "docs/qa/TASK-086", oldName))[key];
    const prior = new Set(
      previous
        .filter((r) => r.status === "CERTIFIED")
        .map((r) => r.nodeId ?? r.edgeId ?? r.transferId ?? r.sourceId),
    );
    return enabled(kind).filter((id) => !prior.has(id));
  };
  const corridors = acceptance.nationalCorridors.map(corridorState);
  const summary = {
    task: "TASK-086-B",
    status: "COMPLETE_WITH_READMITTABLE_UNVERIFIED_EXCLUSIONS",
    implementationComplete: true,
    finalAcceptance: "REQUIRES_FINAL_EXACT_HEAD_QUALITY_GATE_AND_NORMAL_MERGE",
    inputSha256: binding.inputSha256,
    eligibilitySha256: hash(canonical(eligibility) + "\n"),
    candidates: {
      nodes: rawNodes.length,
      edges: rawEdges.length,
      transfers: audits.transfer.length,
      sources: rawSources.length,
    },
    routeEnabled: {
      nodes: enabled("node").length,
      edges: enabled("edge").length,
      transfers: enabled("transfer").length,
      sources: enabled("source_dependency").length,
    },
    routeDisabled: {
      nodes: rawNodes.length - enabled("node").length,
      edges: rawEdges.length - enabled("edge").length,
      transfers: audits.transfer.length - enabled("transfer").length,
      sources: rawSources.length - enabled("source_dependency").length,
    },
    newlyCertified: {
      nodeIds: newlyCertified(
        "node",
        "final-node-identity-audit.json",
        "nodes",
      ),
      edgeIds: newlyCertified("edge", "final-edge-audit.json", "edges"),
      transferIds: newlyCertified(
        "transfer",
        "final-transfer-audit.json",
        "transfers",
      ),
      sourceIds: newlyCertified(
        "source_dependency",
        "final-source-certification.json",
        "sources",
      ),
    },
    terminalRoots: dispositions.length,
    terminalExclusionRoots: dispositions.filter(
      (r) => r.disposition === "CLOSED_AS_READMITTABLE_EXCLUSION",
    ).length,
    pendingRoots: dispositions.filter((r) => r.acceptancePending).length,
    readmittableEntityCount: excluded.filter((e) => e.readmittable).length,
    recoveredCorridors: corridors
      .filter(
        (c) =>
          c.status === "SUPPORTED_BY_CERTIFIED_GRAPH" &&
          historical.nationalCorridors.find(
            (old) => old.corridorId === c.corridorId,
          )?.status !== "PASS",
      )
      .map((c) => c.corridorId),
    nationalCorridors: corridors,
    regions: acceptance.geographic.map(corridorState),
    gateways: acceptance.gateways.map(corridorState),
    graphIntegrity: {
      ...integrity,
      deterministicProjection:
        "VERIFIED_BY_SEPARATE_GENERATION_COMPARISON_REQUIRED",
    },
    retainedHistoricalCertificationRoots: 251,
    retainedHistoricalStatus: historical.status,
    research: {
      newUniqueOfficialPageCount: review.newUniqueOfficialPageCount,
      sourcesReviewed: audits.source.length,
      retainedSourceAuditCount: sourceMap.size,
      tokenUsage: "UNKNOWN",
      billing: "UNKNOWN",
    },
    staticTopologyIsNotRealtimeService: true,
    automaticDiscoveryAuthorized: false,
  };
  assert.equal(summary.pendingRoots, 0);
  write(path.join(outputDirectory, "closeout-summary.json"), summary);
  // bind each terminal state, not just aggregate metrics, in the replay receipt.
  write(path.join(outputDirectory, "terminal-entities.jsonl-index.json"), {
    schemaVersion: 1,
    inputSha256: binding.inputSha256,
    entityCount: entities.length,
    terminalStateSha256: hash(entities),
    enabledEntityCount: entities.length - excluded.length,
    disabledEntityCount: excluded.length,
    countsReconcile:
      entities.length ===
      rawNodes.length +
        rawEdges.length +
        audits.transfer.length +
        rawSources.length,
  });
  return { summary, eligibility, entities, cert };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const result = generateCloseout();
  console.log(
    JSON.stringify({
      status: result.summary.status,
      enabled: result.summary.routeEnabled,
      disabled: result.summary.routeDisabled,
      newlyCertified: Object.fromEntries(
        Object.entries(result.summary.newlyCertified).map(([k, v]) => [
          k,
          v.length,
        ]),
      ),
      terminalRoots: result.summary.terminalRoots,
      pendingRoots: result.summary.pendingRoots,
      input: result.summary.inputSha256,
    }),
  );
}
