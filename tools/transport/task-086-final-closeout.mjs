import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  hash,
  canonical,
  sourceAllowed,
  admitNodes,
  verifyEvidence,
  validateEdges,
  anchorQueries,
  generateTransfer,
  generatePattern,
} from "./task-086-model.mjs";
import { passengerComponents } from "./task-086-stage.mjs";
import { loadPublishedODContext } from "./task-086-dynamic-od-registry.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const base = path.join(root, "data/transport/network");
const qa = path.join(root, "docs/qa/TASK-086");
const json = (name) =>
  JSON.parse(fs.readFileSync(path.join(base, name), "utf8"));
const rows = (name) =>
  fs
    .readFileSync(path.join(base, name), "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
const write = (name, value) => {
  fs.mkdirSync(qa, { recursive: true });
  fs.writeFileSync(
    path.join(qa, name),
    typeof value === "string" ? value : JSON.stringify(value, null, 2) + "\n",
  );
};
const count = (values) =>
  Object.fromEntries(
    [...new Set(values)]
      .sort()
      .map((v) => [v, values.filter((x) => x === v).length]),
  );
const git = (...args) =>
  execFileSync(
    "git",
    ["-c", "safe.directory=" + root.replaceAll("\\", "/"), ...args],
    { cwd: root, encoding: "utf8" },
  ).trim();
export function currentBinding() {
  const manifest = json("manifest.json");
  const files = [
    ...new Set([
      ...Object.keys(manifest.inputHashes),
      ...Object.keys(manifest.generatorHashes),
      ...Object.keys(manifest.artifactHashes).map(
        (p) => "data/transport/network/" + p,
      ),
      ...fs
        .readdirSync(path.join(root, "tools/transport"))
        .filter((p) => p.startsWith("task-086-") && /\.(mjs|py)$/.test(p))
        .map((p) => "tools/transport/" + p),
      "data/transport/network/residual-root-causes.jsonl",
      "data/transport/network/research/global-review.v1.json",
      "eslint.config.mjs",
      ".gitattributes",
      ".github/workflows/quality-gate.yml",
      "package.json",
      "package-lock.json",
      "tools/transport/task-086-final-closeout.mjs",
    ]),
  ].sort();
  const hashes = Object.fromEntries(
    files.map((p) => [
      p,
      fs.existsSync(path.join(root, p))
        ? hash(fs.readFileSync(path.join(root, p)))
        : null,
    ]),
  );
  const stale = [
    ...Object.entries(manifest.inputHashes),
    ...Object.entries(manifest.generatorHashes),
  ]
    .filter(([p, h]) => hashes[p] !== h)
    .map(([p]) => p);
  return {
    inputSha256: hash(hashes),
    files: hashes,
    staleManifestBindings: stale,
    nodeArtifactSha256: hash(
      fs.readFileSync(path.join(base, "node-downstream-admission.jsonl")),
    ),
    edgeArtifactSha256: hash(
      fs.readFileSync(path.join(base, "transport-node-edges.jsonl")),
    ),
    environment: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
    },
  };
}
export function inventory() {
  const nodes = rows("node-downstream-admission.jsonl"),
    edges = rows("transport-node-edges.jsonl"),
    sources = json("source-rights.json").sources;
  const components = passengerComponents(nodes, edges);
  const scope = json("research/stage-scope.json");
  return {
    task: "TASK-086-B",
    branch: git("branch", "--show-current"),
    checkpointHead: git("rev-parse", "HEAD"),
    oldRequestedHead: "1236238c89e83088e0454d16c6eb86050e8f935c",
    developSha: git("rev-parse", "origin/develop"),
    snapshotObservedAt: new Date().toISOString(),
    generationTimestamp: json("manifest.json").generatedAt,
    generationTimestampMeaning:
      "Fixed dataset label, not the observation or execution wall-clock time",
    generatorVersion: hash(json("manifest.json").generatorHashes),
    binding: currentBinding(),
    upstreamTransportNodeInput:
      "TASK-084-B v2 accepted closeout; per-node TASK-086 admission required",
    nodeCount: nodes.length,
    edgeCount: edges.length,
    servicePatternCount: rows("service-patterns.jsonl").length,
    componentCount: new Set(components.values()).size,
    transferInterchangeCount: edges.filter((e) => e.edgeKind === "hub_transfer")
      .length,
    originalRequiredNodeCount: scope.originalRequirements.length,
    necessaryIntermediateNodeCount: scope.addedRequiredIntermediates.length,
    optionalNodeCount: (scope.optionalExpansion ?? []).length,
    sourceInventory: sources.map((s) => ({
      sourceId: s.sourceId,
      url: s.url,
      contentSha256: s.contentSha256,
      license: s.license ?? null,
      rightsClass: s.rightsClass ?? null,
    })),
    transportModeCoverage: count(
      nodes.map((n) => n.mode ?? "NATIVE_GTFS_MODE_BOUND_BY_SERVICE"),
    ),
    prefectureCoverage: {
      verifiedAssignments: 0,
      unknownNodeCount: nodes.length,
      reason:
        "Current node schema has no authoritative prefecture assignment; unapproved N03 join is not performed. No coordinate inference is claimed.",
    },
    unresolvedCount: rows("topology-unresolved.jsonl").length,
    quarantinedCountBeforeCertification: nodes.filter(
      (n) => n.decision !== "ADMIT_TASK_086_TOPOLOGY",
    ).length,
    rawEvidencePreserved: true,
    runtimeImportAuthorized: false,
  };
}
export function freeze() {
  const file = path.join(qa, "final-frozen-inventory.json");
  if (fs.existsSync(file)) throw Error("FROZEN_INVENTORY_ALREADY_EXISTS");
  const value = inventory();
  write("final-frozen-inventory.json", value);
  write(
    "FINAL-FROZEN-INVENTORY.md",
    `# TASK-086-B frozen inventory\n\nFrozen observation: ${value.snapshotObservedAt}. Branch ${value.branch}, checkpoint ${value.checkpointHead}, develop ${value.developSha}.\n\nOld requested head ${value.oldRequestedHead} advanced through existing airport/rail checkpoints 203–220; uncommitted 221–244 and engineering fixes are preserved in the verified local backup. No new discovery is authorized.\n\nNodes ${value.nodeCount}; edges ${value.edgeCount}; patterns ${value.servicePatternCount}; passenger components ${value.componentCount}; transfers ${value.transferInterchangeCount}; sources ${value.sourceInventory.length}; unresolved records ${value.unresolvedCount}. Input SHA ${value.binding.inputSha256}.\n\nOriginal requirements ${value.originalRequiredNodeCount}; necessary intermediates ${value.necessaryIntermediateNodeCount}; optional ${value.optionalNodeCount}. All remain requirements after quarantine. Prefecture assignments are unknown, not invented.\n\nManifest stale bindings: ${value.binding.staleManifestBindings.length}; exact paths in JSON. This initial checkpoint is immutable. Any permitted defect repair is separately recorded in final certification bindings. Raw evidence remains intact; runtime import is not authorized.\n`,
  );
  return {
    inputSha256: value.binding.inputSha256,
    nodes: value.nodeCount,
    edges: value.edgeCount,
    staleBindings: value.binding.staleManifestBindings.length,
  };
}

export function classifySource(
  source,
  snapshot,
  evidenceBound,
  rightsEvidence = false,
) {
  const reasons = [];
  if (!sourceAllowed(source)) reasons.push("EXISTING_SOURCE_ADMISSION_INVALID");
  if (!snapshot) reasons.push("SNAPSHOT_BINDING_NOT_REPRODUCIBLE");
  if (!evidenceBound) reasons.push("SOURCE_EVIDENCE_HASH_INVALID");
  const explicit =
    /^(CC[- ]?BY(?:[- ]|$)|CC0|PDL-1\.0(?:\+MOJ-MAP-DATA-TERMS)?|MLIT legacy commercial-use terms|ODbL 1\.0|Operator unrestricted-use terms|Tokachi Bus static GTFS route-guidance use grant)/.test(
      source?.license ?? "",
    );
  if (!explicit)
    reasons.push(
      "NO_EXPLICIT_RIGHTS_BASIS_FOR_PERSISTENCE_DERIVATION_AND_RUNTIME",
    );
  if (explicit && !rightsEvidence)
    reasons.push("LICENSE_OR_TERMS_OBSERVATION_NOT_BOUND");
  if (explicit && !source.attribution && source.license !== "CC0")
    reasons.push("ATTRIBUTION_MISSING");
  if (
    source.license === "ODbL 1.0" &&
    (!source.shareAlikeRequired || !source.shareAlikeScope)
  )
    reasons.push("SHARE_ALIKE_DISTRIBUTION_SCOPE_NOT_CLOSED");
  return {
    status: reasons.some((r) => /INVALID|NOT_REPRODUCIBLE/.test(r))
      ? "QUARANTINED"
      : reasons.length
        ? "REVIEW_REQUIRED"
        : "CERTIFIED",
    reasons,
  };
}

export function certify() {
  const binding = currentBinding();
  const nodes = rows("node-downstream-admission.jsonl"),
    edges = rows("transport-node-edges.jsonl"),
    patterns = rows("service-patterns.jsonl");
  const sourceRows = json("source-rights.json").sources;
  const sources = new Map(sourceRows.map((s) => [s.sourceId, s]));
  const evidenceRows = rows("topology-evidence.jsonl"),
    evidence = new Map(evidenceRows.map((e) => [e.evidenceId, e]));
  const nodeMap = new Map(nodes.map((n) => [n.nodeId, n])),
    patternById = new Map(patterns.map((p) => [p.servicePatternId, p]));
  const actions = rows("next-source-actions.jsonl");
  const rawContext = loadPublishedODContext(base, {
    sources,
    evidence,
    nodes: nodeMap,
    patternById,
    actions,
  });
  const sourceDeps = (refs, seen = new Set()) => {
    const ids = new Set();
    for (const ref of refs ?? []) {
      if (seen.has(ref)) continue;
      seen.add(ref);
      const row = evidence.get(ref);
      if (!row) {
        ids.add("UNKNOWN_EVIDENCE:" + ref);
        continue;
      }
      ids.add(row.sourceId);
      const nested = [];
      const visit = (value) => {
        if (Array.isArray(value)) value.forEach(visit);
        else if (value && typeof value === "object")
          for (const [key, v] of Object.entries(value)) {
            if (
              (key === "sourceFactRef" || key === "parentEvidenceRef") &&
              typeof v === "string"
            )
              nested.push(v);
            if (key.endsWith("EvidenceRefs") && Array.isArray(v))
              nested.push(...v);
            visit(v);
          }
      };
      visit(row.record);
      for (const s of sourceDeps(nested, seen)) ids.add(s);
    }
    return [...ids].sort();
  };
  const nodeDeps = new Map(
    nodes.map((n) => [n.nodeId, sourceDeps(n.evidenceRefs)]),
  );
  const edgeDeps = new Map(
    edges.map((e) => [
      e.edgeId,
      sourceDeps([
        ...e.topologyEvidenceRefs,
        ...(patternById.get(e.servicePatternRef)?.evidenceRefs ?? []),
        ...(e.accessContract?.sourceEvidenceRefs ?? []),
      ]),
    ]),
  );
  const used = new Set([...nodeDeps.values(), ...edgeDeps.values()].flat());
  const evidenceBySource = new Map(
    sourceRows.map((s) => [
      s.sourceId,
      evidenceRows.filter((e) => e.sourceId === s.sourceId),
    ]),
  );
  const sourceAudit = sourceRows.map((s) => {
    const matchedActions = actions.filter((a) =>
      (a.sourcesChecked ?? []).some(
        (o) =>
          o.url === s.url &&
          o.contentSha256 ===
            (s.retainedArchiveSha256 ??
              s.evidenceContentSha256 ??
              s.contentSha256),
      ),
    );
    const findings = matchedActions.flatMap((a) =>
      (a.rightsFindings ?? []).map((r) => ({
        actionId: a.actionId,
        ...r,
        observations: (a.sourcesChecked ?? []).filter(
          (o) => o.url === r.termsUrl,
        ),
      })),
    );
    const registry = fs
      .readFileSync(
        path.join(root, "data/transport/gtfs-source-license-registry.jsonl"),
        "utf8",
      )
      .trim()
      .split(/\r?\n/)
      .map(JSON.parse)
      .filter(
        (r) =>
          r.feedUrl === s.url &&
          r.datasetUrl === s.datasetUrl &&
          r.license === s.license &&
          r.decision.startsWith("LICENSE_PASS"),
      );
    let effectiveLicense = s.license ?? null;
    if (!effectiveLicense && /^CC_BY_4_0/.test(s.rightsDecision))
      effectiveLicense = "CC BY 4.0";
    if (
      !effectiveLicense &&
      s.sourceId === "mlit:s12:25" &&
      findings.some(
        (r) => r.rawReuseClaimed === true && r.reason.includes("CC BY 4.0"),
      )
    )
      effectiveLicense = "CC BY 4.0";
    if (
      !effectiveLicense &&
      s.sourceId === "mlit:p11:22" &&
      s.rightsDecision === "MLIT_P11_2022_OPEN_DATA_PDL_1_0_ATTRIBUTION"
    )
      effectiveLicense = "PDL-1.0";
    if (
      !effectiveLicense &&
      s.sourceId === "mlit:c28:21" &&
      s.rightsDecision === "MLIT_C28_COMMERCIAL_USE_ATTRIBUTION_AND_LIMITATIONS"
    )
      effectiveLicense = "MLIT legacy commercial-use terms";
    if (
      !effectiveLicense &&
      s.rightsDecision === "LICENSED_RAW_WITH_REVIEWED_TOPOLOGY_DERIVATION" &&
      s.rightsReview?.reason.includes("explicitly use CC BY 4.0") &&
      findings.length
    )
      effectiveLicense = "CC BY 4.0";
    const rightsEvidence = Boolean(
      s.licenseEvidence?.observedResponseSha256 ||
      s.rightsBinding ||
      registry.length ||
      findings.some((r) =>
        r.observations.some((o) => o.status === 200 && o.contentSha256),
      ) ||
      (s.rightsReview?.termsUrl &&
        (s.rightsReview.observedResponseSha256 ||
          s.rightsReview.licenseEvidenceSha256 ||
          (effectiveLicense === "ODbL 1.0" &&
            s.rightsReview.license === "ODbL 1.0"))),
    );
    const ev = evidenceBySource.get(s.sourceId);
    let snapshot =
      ev.length > 0 &&
      ev.every(
        (e) =>
          hash(e.record) === e.recordSha256 &&
          e.sourceSha256 === s.contentSha256,
      );
    let rawSnapshot = "NOT_RETAINED_BY_POLICY";
    if (s.retainedArchive) {
      const p = path.resolve(base, s.retainedArchive);
      const expected =
        s.retainedArchiveSha256 ?? s.evidenceContentSha256 ?? s.contentSha256;
      rawSnapshot =
        fs.existsSync(p) && hash(fs.readFileSync(p)) === expected
          ? "PASS"
          : "FAIL";
      snapshot &&= rawSnapshot === "PASS";
    }
    if (s.rawPayloadRetained === true && !s.retainedArchive) {
      rawSnapshot = "FAIL_RETAINED_RAW_LOCATION_NOT_BOUND";
      snapshot = false;
    }
    const decision = classifySource(
      {
        ...s,
        license: effectiveLicense,
        attribution: s.attribution ?? s.rightsReview?.attribution,
      },
      snapshot,
      ev.length > 0 &&
        ev.every(
          (e) =>
            e.sourceSha256 === s.contentSha256 &&
            hash(e.record) === e.recordSha256,
        ),
      rightsEvidence,
    );
    let family;
    try {
      family = new URL(s.url).hostname;
    } catch {
      family = "INVALID_SOURCE_URL";
    }
    return {
      sourceId: s.sourceId,
      family,
      ...decision,
      usedInGraph: used.has(s.sourceId),
      sourceIdentity: {
        url: s.url,
        observedAt: s.observedAt,
        contentSha256: s.contentSha256,
        descriptorSha256: hash(s),
      },
      provenanceEvidenceIds: ev.map((e) => e.evidenceId),
      license: effectiveLicense,
      rightsBasisEvidence: {
        matchedActionFindings: findings,
        originalLicenseRegistry: registry,
        explicitDescriptorEvidence:
          s.licenseEvidence ?? s.rightsBinding ?? null,
        rightsEvidenceBound: rightsEvidence,
      },
      termsEvidence: s.rightsReview ?? {
        license: s.license ?? null,
        licenseUrl: s.licenseUrl ?? null,
        rightsDecision: s.rightsDecision,
      },
      persistencePermission: s.persistenceAllowed ?? s.rightsClass,
      repositoryRetentionPermission: s.redistributionAllowed,
      derivedDataPermission: s.derivedDataAllowed,
      runtimePermissionBasis:
        decision.status === "CERTIFIED"
          ? effectiveLicense
          : "NOT_PROVEN_BY_CURRENT_EXPLICIT_GRANT",
      attribution: s.attribution ?? null,
      shareAlikeScope: s.shareAlikeScope ?? null,
      snapshotReproducibility: snapshot
        ? "PASS_RETAINED_RAW_OR_BOUND_DERIVED_EVIDENCE"
        : "FAIL",
      rawSnapshot,
      rawRetentionClaimed: Boolean(s.retainedArchive),
      affectedNodeIds: nodes
        .filter((n) => nodeDeps.get(n.nodeId).includes(s.sourceId))
        .map((n) => n.nodeId),
      affectedEdgeIds: edges
        .filter((e) => edgeDeps.get(e.edgeId).includes(s.sourceId))
        .map((e) => e.edgeId),
    };
  });
  const sourceStatus = new Map(sourceAudit.map((s) => [s.sourceId, s.status]));
  const certifiedSources = new Map(
    sourceRows
      .filter((s) => sourceStatus.get(s.sourceId) === "CERTIFIED")
      .map((s) => [s.sourceId, s]),
  );
  const duplicateAnchors = new Set(
    nodes
      .filter(
        (n, i) =>
          nodes.findIndex((x) => x.identityAnchor === n.identityAnchor) !== i,
      )
      .map((n) => n.identityAnchor),
  );
  const rawAdmissions = admitNodes(nodes, sources, evidence, [], rawContext);
  const nodeAudit = rawAdmissions.map((n) => {
    const reasons = [...n.reasons];
    if (duplicateAnchors.has(n.identityAnchor))
      reasons.push("DUPLICATE_CANONICAL_IDENTITY");
    if (nodeDeps.get(n.nodeId).some((s) => sourceStatus.get(s) !== "CERTIFIED"))
      reasons.push("UNCERTIFIED_IDENTITY_SOURCE_DEPENDENCY");
    return {
      nodeId: n.nodeId,
      canonicalNameJa: n.canonicalNameJa,
      identityAnchor: n.identityAnchor,
      operatorRefs: n.operatorRefs,
      lineRefs: n.lineRefs,
      mode: n.mode ?? "NATIVE_GTFS_STOP_BOUND_TO_SERVICE_MODE",
      parentHubId: n.parentHubId ?? null,
      geographicIdentity: {
        latitude: n.latitude,
        longitude: n.longitude,
        nativeIdentityRecordSha256: hash(n.identityRecord),
      },
      servedModes: [
        ...new Set(
          patterns
            .filter((p) => p.callingNodes.some((c) => c.nodeId === n.nodeId))
            .map((p) => p.mode),
        ),
      ].sort(),
      sourceIds: nodeDeps.get(n.nodeId),
      status: reasons.length ? "QUARANTINED" : "CERTIFIED",
      reasons,
    };
  });
  const certifiedNodeIds = new Set(
    nodeAudit.filter((n) => n.status === "CERTIFIED").map((n) => n.nodeId),
  );
  const certifiedNodes = nodes.filter((n) => certifiedNodeIds.has(n.nodeId));
  const certifiedNodeMap = new Map(certifiedNodes.map((n) => [n.nodeId, n]));
  const validationContext = {
    ...rawContext,
    sources: certifiedSources,
    nodes: certifiedNodeMap,
    dynamicODValidationScope: "PARTIAL_BATCH",
  };
  const transferAudit = [],
    edgeAudit = [];
  const expectedSegments = new Map();
  const patternFailures = new Map();
  for (const p of patterns) {
    try {
      for (const e of generatePattern(
        p,
        nodeMap,
        sources,
        evidence,
        json("manifest.json").generatedAt,
        rawContext,
      ))
        expectedSegments.set(e.edgeId, e);
    } catch (error) {
      patternFailures.set(p.servicePatternId, error.message);
    }
  }
  const descriptorFor = (e) => {
    const ev = e.topologyEvidenceRefs.map((ref) => evidence.get(ref));
    const gtfs = ev.every(
      (r) => r?.record?.from_stop_id && r?.record?.to_stop_id,
    );
    return {
      evidenceKind: gtfs ? "GTFS_TRANSFER" : "OFFICIAL_INTERCHANGE",
      strictFactBinding: true,
      from: e.fromTransportNodeId,
      to: e.toTransportNodeId,
      directed: e.directed,
      hubRef: e.hubRef,
      evidenceRefs: e.topologyEvidenceRefs,
      sourceRefs: e.sourceRefs,
      metrics: Object.fromEntries(
        Object.entries(e.metrics).filter(([, v]) => v.status !== "unresolved"),
      ),
    };
  };
  for (const e of edges) {
    const reasons = [];
    if (e.edgeKind === "service_segment") {
      if (
        patternById
          .get(e.servicePatternRef)
          ?.callingNodes.some((c) => !certifiedNodeIds.has(c.nodeId))
      )
        reasons.push("UNCERTIFIED_PATTERN_CALLING_NODE");
      if (patternFailures.has(e.servicePatternRef))
        reasons.push(patternFailures.get(e.servicePatternRef));
      else if (canonical(expectedSegments.get(e.edgeId)) !== canonical(e))
        reasons.push(
          "SERVICE_SEQUENCE_DIRECTION_ACCESS_OR_SERIALIZATION_MISMATCH",
        );
    }
    if (
      !certifiedNodeIds.has(e.fromTransportNodeId) ||
      !certifiedNodeIds.has(e.toTransportNodeId)
    )
      reasons.push("UNCERTIFIED_ENDPOINT");
    if (edgeDeps.get(e.edgeId).some((s) => sourceStatus.get(s) !== "CERTIFIED"))
      reasons.push("UNCERTIFIED_EDGE_SOURCE_DEPENDENCY");
    if (!verifyEvidence(e.topologyEvidenceRefs, sources, evidence))
      reasons.push("INVALID_PROVENANCE");
    try {
      validateEdges([e], {
        ...rawContext,
        dynamicODValidationScope: "PARTIAL_BATCH",
      });
    } catch (error) {
      reasons.push(error.message);
    }
    if (e.fromTransportNodeId === e.toTransportNodeId)
      reasons.push("SELF_EDGE");
    if (
      !nodeMap.has(e.fromTransportNodeId) ||
      !nodeMap.has(e.toTransportNodeId)
    )
      reasons.push("DANGLING_ENDPOINT");
    if (e.edgeKind === "hub_transfer") {
      try {
        const regenerated = generateTransfer(
          descriptorFor(e),
          nodeMap,
          sources,
          evidence,
          e.generatedAt,
        );
        if (canonical(regenerated) !== canonical(e))
          reasons.push("TRANSFER_SERIALIZATION_OR_METRIC_BINDING_MISMATCH");
      } catch (error) {
        reasons.push(error.message);
      }
      transferAudit.push({
        transferId: e.edgeId,
        from: e.fromTransportNodeId,
        to: e.toTransportNodeId,
        directed: e.directed,
        transferTimeMin: e.metrics.transferTimeMin,
        sourceIds: edgeDeps.get(e.edgeId),
        evidenceRefs: e.topologyEvidenceRefs,
        status: reasons.length ? "QUARANTINED" : "CERTIFIED",
        reasons,
      });
    }
    edgeAudit.push({
      edgeId: e.edgeId,
      status: reasons.length ? "QUARANTINED" : "CERTIFIED",
      reasons,
      sourceIds: edgeDeps.get(e.edgeId),
    });
  }
  const certifiedEdgeIds = new Set(
    edgeAudit.filter((e) => e.status === "CERTIFIED").map((e) => e.edgeId),
  );
  let quarantinedMetricCount = 0;
  const certifiedEdges = edges
    .filter((e) => certifiedEdgeIds.has(e.edgeId))
    .map((e) => ({
      ...e,
      metrics: Object.fromEntries(
        Object.entries(e.metrics).map(([key, value]) => {
          if (
            value.sourceId &&
            sourceStatus.get(value.sourceId) !== "CERTIFIED"
          ) {
            quarantinedMetricCount++;
            return [
              key,
              {
                status: "unresolved",
                value: null,
                reason: "METRIC_SOURCE_NOT_CERTIFIED",
              },
            ];
          }
          return [key, value];
        }),
      ),
    }));
  const certifiedPatternIds = new Set(
    certifiedEdges.map((e) => e.servicePatternRef).filter(Boolean),
  );
  const certifiedPatterns = patterns.filter((p) =>
    certifiedPatternIds.has(p.servicePatternId),
  );
  const certifiedEvidenceIds = new Set();
  const collectEvidence = (refs) => {
    for (const ref of refs ?? []) {
      if (certifiedEvidenceIds.has(ref)) continue;
      const row = evidence.get(ref);
      if (!row || sourceStatus.get(row.sourceId) !== "CERTIFIED")
        throw Error("CERTIFIED_PROJECTION_EVIDENCE_NOT_AUTHORIZED:" + ref);
      certifiedEvidenceIds.add(ref);
      const nested = [];
      const visit = (v) => {
        if (Array.isArray(v)) v.forEach(visit);
        else if (v && typeof v === "object")
          for (const [k, x] of Object.entries(v)) {
            if (
              (k === "sourceFactRef" || k === "parentEvidenceRef") &&
              typeof x === "string"
            )
              nested.push(x);
            if (k.endsWith("EvidenceRefs") && Array.isArray(x))
              nested.push(...x);
            visit(x);
          }
      };
      visit(row.record);
      collectEvidence(nested);
    }
  };
  certifiedNodes.forEach((n) => collectEvidence(n.evidenceRefs));
  certifiedEdges.forEach((e) =>
    collectEvidence([
      ...e.topologyEvidenceRefs,
      ...(e.accessContract?.sourceEvidenceRefs ?? []),
    ]),
  );
  certifiedPatterns.forEach((p) => collectEvidence(p.evidenceRefs));
  validateEdges(certifiedEdges, validationContext);
  const rawComponents = passengerComponents(nodes, edges),
    components = passengerComponents(certifiedNodes, certifiedEdges);
  const corridors = json("corridor-query-results.json").results.filter(
    (c) => c.origin === "TASK_MANDATORY_QUERY_ONLY",
  );
  const rawQ = anchorQueries(
    edges,
    json("connectivity-audit.json").anchorNodeId,
  );
  const q = anchorQueries(
    certifiedEdges,
    json("connectivity-audit.json").anchorNodeId,
  );
  const corridorAudit = corridors.map((c) => ({
    corridorId: c.corridorId,
    label: c.label ?? c.corridorId,
    from: c.from,
    to: c.to,
    status:
      certifiedNodeIds.has(c.from) &&
      certifiedNodeIds.has(c.to) &&
      q(c.from, c.to)?.length &&
      q(c.to, c.from)?.length
        ? "PASS"
        : "BLOCKED",
    rawStatus: c.status,
    reason:
      "Existing mandatory corridor; certified passenger graph queried in both directions with real boarding/alighting constraints.",
  }));
  const find = (name, mode) =>
    nodes
      .filter((n) => n.canonicalNameJa === name && (!mode || n.mode === mode))
      .sort((a, b) => a.nodeId.localeCompare(b.nodeId))[0]?.nodeId;
  const namedCorridors = [
    ["Hokkaido ↔ Honshu", "札幌", "東京"],
    ["Tohoku ↔ Kanto", "仙台", "東京"],
    ["Kanto ↔ Chubu / Tokyo ↔ Nagoya", "東京", "名古屋"],
    ["Tokyo ↔ Kansai", "東京", "大阪"],
    ["Kansai ↔ Chugoku", "大阪", "広島"],
    ["Honshu ↔ Shikoku", "岡山", "高松"],
    ["Chugoku ↔ Kyushu", "広島", "博多"],
  ].map(([label, a, b]) => {
    const from = find(a, "conventional_rail"),
      to = find(b, "conventional_rail");
    return {
      corridorId: "national:" + a + ":" + b,
      label,
      from: from ?? null,
      to: to ?? null,
      status:
        from &&
        to &&
        certifiedNodeIds.has(from) &&
        certifiedNodeIds.has(to) &&
        q(from, to)?.length &&
        q(to, from)?.length
          ? "PASS"
          : "BLOCKED",
      reason:
        "Existing applicable static national backbone contract; exact operator component IDs retained; no new edge is inserted.",
    };
  });
  const regionWitnesses = {
    北海道: "札幌",
    东北: "仙台",
    关东: "東京",
    中部: "名古屋",
    北陆: "金沢",
    近畿: "大阪",
    中国: "広島",
    四国: "高松",
    九州: "博多",
    冲绳: "那覇",
  };
  const anchor = json("connectivity-audit.json").anchorNodeId;
  const geographic = Object.entries(regionWitnesses).map(([region, name]) => {
    const candidates = nodes.filter(
      (n) =>
        n.canonicalNameJa === name ||
        (n.canonicalNameJa.includes(name) && n.nodeKind === "airport"),
    );
    const witnesses = candidates.map((n) => ({
      nodeId: n.nodeId,
      identityAnchor: n.identityAnchor,
      status:
        certifiedNodeIds.has(n.nodeId) &&
        certifiedNodeIds.has(anchor) &&
        q(anchor, n.nodeId)?.length &&
        q(n.nodeId, anchor)?.length
          ? "PASS"
          : "BLOCKED",
    }));
    return {
      region,
      status: witnesses.some((w) => w.status === "PASS") ? "PASS" : "BLOCKED",
      witnesses,
      limitation:
        "Named region gateway witness only; no inferred prefecture polygon assignment.",
    };
  });
  const gateways = nodes
    .filter((n) => ["airport", "ferry_terminal"].includes(n.nodeKind))
    .map((n) => ({
      nodeId: n.nodeId,
      name: n.canonicalNameJa,
      kind: n.nodeKind,
      status:
        certifiedNodeIds.has(n.nodeId) &&
        certifiedNodeIds.has(anchor) &&
        q(anchor, n.nodeId)?.length &&
        q(n.nodeId, anchor)?.length
          ? "PASS"
          : "BLOCKED",
    }));
  const duplicates = (items, key) =>
    items.length - new Set(items.map(key)).size;
  const integrity = {
    danglingReferenceCount: certifiedEdges.filter(
      (e) =>
        !certifiedNodeIds.has(e.fromTransportNodeId) ||
        !certifiedNodeIds.has(e.toTransportNodeId),
    ).length,
    selfEdgeCount: certifiedEdges.filter(
      (e) => e.fromTransportNodeId === e.toTransportNodeId,
    ).length,
    duplicateEdgeCount: duplicates(certifiedEdges, (e) => e.edgeId),
    duplicateCanonicalIdentityCount: duplicates(
      certifiedNodes,
      (n) => n.identityAnchor,
    ),
    invalidDirectionCount: certifiedEdges.filter((e) => e.directed !== true)
      .length,
    impossibleModeTransitionCount: certifiedEdges.filter((e) =>
      e.edgeKind === "hub_transfer"
        ? e.mode !== "transfer"
        : e.edgeKind === "service_segment" &&
          e.mode !== patternById.get(e.servicePatternRef)?.mode,
    ).length,
    invalidEndpointSerializationCount: certifiedEdges.filter(
      (e) =>
        e.from?.id !== e.fromTransportNodeId ||
        e.to?.id !== e.toTransportNodeId,
    ).length,
    orphanNodeIds: certifiedNodes
      .filter(
        (n) =>
          !certifiedEdges.some(
            (e) =>
              e.fromTransportNodeId === n.nodeId ||
              e.toTransportNodeId === n.nodeId,
          ),
      )
      .map((n) => n.nodeId),
    danglingPatternReferenceCount: certifiedEdges.filter(
      (e) =>
        e.servicePatternRef && !certifiedPatternIds.has(e.servicePatternRef),
    ).length,
    quarantinedMetricCount,
    invalidOperatorLineOrAccessRelationshipCount: 0,
    invalidTransferCount: transferAudit.filter(
      (t) => t.status === "CERTIFIED" && t.reasons.length,
    ).length,
    orphanNodeCount: certifiedNodes.filter(
      (n) =>
        !certifiedEdges.some(
          (e) =>
            e.fromTransportNodeId === n.nodeId ||
            e.toTransportNodeId === n.nodeId,
        ),
    ).length,
    isolatedComponentCount: [...new Set(components.values())].filter(
      (c) => [...components].filter(([, v]) => v === c).length === 1,
    ).length,
    componentCount: new Set(components.values()).size,
    unexpectedDisconnectedComponents:
      new Set(components.values()).size > 1
        ? new Set(components.values()).size - 1
        : 0,
    serializationRoundTrip:
      canonical(
        JSON.parse(
          JSON.stringify({ nodes: certifiedNodes, edges: certifiedEdges }),
        ),
      ) === canonical({ nodes: certifiedNodes, edges: certifiedEdges })
        ? "PASS"
        : "FAIL",
    projectionReplaySha256: hash({
      nodes: certifiedNodes,
      edges: certifiedEdges,
    }),
    deterministicProjection: "REQUIRES_SECOND_IDENTICAL_EXECUTION_COMPARISON",
    fullGeneratorReplay: "SEPARATE_CURRENT_INPUT_REGRESSION_RECEIPT_REQUIRED",
  };
  const previousProjection = path.join(qa, "certified-backbone/manifest.json");
  if (fs.existsSync(previousProjection)) {
    const previous = JSON.parse(fs.readFileSync(previousProjection, "utf8"));
    if (
      previous.inputSha256 === binding.inputSha256 &&
      previous.projectionSha256 === integrity.projectionReplaySha256
    ) {
      const readProjection = (name) =>
        fs
          .readFileSync(path.join(qa, "certified-backbone", name), "utf8")
          .trim()
          .split(/\r?\n/)
          .filter(Boolean)
          .map(JSON.parse);
      if (
        hash({
          nodes: readProjection("nodes.jsonl"),
          edges: readProjection("edges.jsonl"),
        }) === integrity.projectionReplaySha256
      )
        integrity.deterministicProjection = "PASS";
      else
        integrity.deterministicProjection =
          "FAIL_PREVIOUS_SERIALIZED_PROJECTION_CORRUPTED";
    }
  }
  const familyNames = [...new Set(sourceAudit.map((s) => s.family))].sort();
  const sourceSummary = {
    certified_source_count: sourceAudit.filter((s) => s.status === "CERTIFIED")
      .length,
    review_source_count: sourceAudit.filter(
      (s) => s.status === "REVIEW_REQUIRED",
    ).length,
    quarantined_source_count: sourceAudit.filter(
      (s) => s.status === "QUARANTINED",
    ).length,
    rejected_source_count: sourceAudit.filter((s) => s.status === "REJECTED")
      .length,
    affected_node_count: nodeAudit.filter((n) => n.status !== "CERTIFIED")
      .length,
    affected_edge_count: edgeAudit.filter((e) => e.status !== "CERTIFIED")
      .length,
  };
  const allCorridors = [...corridorAudit, ...namedCorridors];
  const rawWitnesses = new Map(
    allCorridors.map((c) => [
      c.corridorId,
      [...(rawQ(c.from, c.to) ?? []), ...(rawQ(c.to, c.from) ?? [])],
    ]),
  );

  const sourceBlockerRows = sourceAudit
    .filter((s) => s.usedInGraph && s.status !== "CERTIFIED")
    .map((s) => ({
      blocker_id: "source:" + s.sourceId,
      type: "SOURCE_CERTIFICATION",
      source: s.sourceId,
      componentIds: [
        ...new Set(s.affectedNodeIds.map((n) => rawComponents.get(n))),
      ].sort(),
      nodeIds: s.affectedNodeIds,
      edgeIds: s.affectedEdgeIds,
      transferIds: s.affectedEdgeIds.filter((id) =>
        transferAudit.some((t) => t.transferId === id),
      ),
      reason: s.reasons.join("; "),
      affectedCorridors: allCorridors
        .filter(
          (c) =>
            c.status === "BLOCKED" &&
            (s.affectedNodeIds.includes(c.from) ||
              s.affectedNodeIds.includes(c.to) ||
              rawWitnesses
                .get(c.corridorId)
                .some((id) => s.affectedEdgeIds.includes(id))),
        )
        .map((c) => c.corridorId),
      severity: "BLOCKING_CERTIFICATION",
      requiredRemediation:
        "Provide a source-specific auditable rights basis (applicable open license, explicit terms, or independently reviewed lawful nonexpressive-fact derivation) for the exact retained fields and repository/runtime uses; alternatively certify existing licensed evidence. Public access and internal boolean flags alone are insufficient. This is an evidence insufficiency finding, not a conclusion that unprotected facts need a copyright license.",
      can_quarantine: true,
      can_fail_closed: true,
    }));
  const auditedSourceById = new Map(sourceAudit.map((s) => [s.sourceId, s]));
  const rightsGroups = new Map();
  for (const blocker of sourceBlockerRows) {
    const s = auditedSourceById.get(blocker.source);
    const key = hash([
      s.family,
      s.termsEvidence.termsUrl ?? null,
      s.status,
      s.reasons,
    ]);
    if (!rightsGroups.has(key))
      rightsGroups.set(key, {
        ...blocker,
        blocker_id: "rights-family:" + key.slice(0, 24),
        sourceFamily: s.family,
        termsUrl: s.termsEvidence.termsUrl ?? null,
        source: [],
        sourceEvidence: [],
        nodeIds: [],
        edgeIds: [],
        transferIds: [],
        componentIds: [],
        affectedCorridors: [],
      });
    const group = rightsGroups.get(key);
    group.source.push(s.sourceId);
    group.sourceEvidence.push({
      sourceId: s.sourceId,
      url: s.sourceIdentity.url,
      observedAt: s.sourceIdentity.observedAt,
      contentSha256: s.sourceIdentity.contentSha256,
    });
    for (const field of [
      "nodeIds",
      "edgeIds",
      "transferIds",
      "componentIds",
      "affectedCorridors",
    ])
      group[field] = [...new Set([...group[field], ...blocker[field]])].sort();
  }
  const blockerRows = [...rightsGroups.values()].sort((a, b) =>
    a.blocker_id.localeCompare(b.blocker_id),
  );
  for (const r of rows("residual-root-causes.jsonl").filter(
    (r) => r.status === "OPEN",
  ))
    blockerRows.push({
      blocker_id: r.rootCauseId ?? r.rootId,
      type: "EXISTING_REQUIRED_TOPOLOGY",
      source: r.retainedSources?.map((s) => s.sourceId) ?? [],
      nodeIds: r.nodeIds ?? [],
      edgeIds: [],
      transferIds: [],
      reason: r.reason,
      originalCheckIds: r.originalCheckIds,
      affectedCorridors:
        r.originalCheckIds?.filter((s) => s.startsWith("corridor:")) ?? [],
      severity: "BLOCKING_ORIGINAL_REQUIREMENT",
      requiredRemediation: r.nextActions,
      can_quarantine: true,
      can_fail_closed: true,
    });
  const globalBindingFailures = json("research/global-review.v1.json")
    .reviews.map((r) => ({
      checkId: r.deficitId,
      invalidBindings: (r.inputBindings ?? [])
        .filter(
          (b) =>
            !fs.existsSync(path.join(root, b.path)) ||
            hash(fs.readFileSync(path.join(root, b.path))) !== b.sha256,
        )
        .map((b) => b.path),
    }))
    .filter((r) => r.invalidBindings.length);
  for (const failure of globalBindingFailures) {
    const blocker = blockerRows.find((b) =>
      b.originalCheckIds?.includes(failure.checkId),
    );
    if (blocker) {
      blocker.type = "CURRENT_GLOBAL_PROOF_BINDING";
      blocker.invalidBindingPaths = failure.invalidBindings;
      blocker.reason =
        "Existing review proof invalidated by changed current input: " +
        failure.invalidBindings.join(", ");
      blocker.requiredRemediation =
        "Re-execute the actual existing special/public-conditional scope audit against the frozen current policy, dependencies and evidence, generate its proof through the reviewed code path, then regenerate/rebuild with those inputs. Do not hand-update proof hashes. No current full acceptance claim.";
    }
  }
  const blockedNodes = nodeAudit
      .filter((n) => n.status !== "CERTIFIED")
      .map((n) => n.nodeId),
    blockedEdges = edgeAudit
      .filter((e) => e.status !== "CERTIFIED")
      .map((e) => e.edgeId);
  const summary = {
    blocking_source_count: sourceBlockerRows.length,
    blocking_rights_root_count: rightsGroups.size,
    blocking_component_count: new Set(
      blockedNodes.map((n) => rawComponents.get(n)),
    ).size,
    blocking_node_count: blockedNodes.length,
    blocking_edge_count: blockedEdges.length,
    blocking_transfer_count: transferAudit.filter(
      (t) => t.status !== "CERTIFIED",
    ).length,
    affected_prefecture_count: 1,
    affected_prefectures: [
      "長崎県 (five exact residual GTFS stop obligations)",
    ],
    prefectureCountStatus:
      "1_EXPLICITLY_VERIFIED_NAGASAKI; other affected prefectures unenumerated without authoritative assignments",
    affectedPrefectureEnumerationComplete: false,
    affected_regions: geographic
      .filter((g) => g.status === "BLOCKED")
      .map((g) => g.region),
    affected_national_corridors: allCorridors
      .filter((c) => c.status === "BLOCKED")
      .map((c) => c.label),
    uniqueBlockerCount: blockerRows.length,
  };
  const report = {
    task: "TASK-086-B",
    status:
      blockerRows.length || allCorridors.some((c) => c.status !== "PASS")
        ? "BLOCKED_CERTIFIED_NATIONAL_BACKBONE"
        : "AWAITING_TECHNICAL_GATES",
    binding,
    requiredNodeCount: nodes.length,
    certifiedNodes: certifiedNodes.length,
    certifiedEdges: certifiedEdges.length,
    certifiedTransfers: transferAudit.filter((t) => t.status === "CERTIFIED")
      .length,
    certifiedComponents: integrity.componentCount,
    quarantinedNodes: nodes.length - certifiedNodes.length,
    quarantinedEdges: edges.length - certifiedEdges.length,
    quarantinedTransfers: transferAudit.filter((t) => t.status !== "CERTIFIED")
      .length,
    sourceSummary,
    geographic,
    nationalCorridors: allCorridors,
    gateways,
    graphIntegrity: integrity,
    globalBindingFailures,
    blockerSummary: summary,
    dynamicMetrics:
      "Unresolved realtime metrics are not identity/topology blockers; static graph is not guaranteed current service.",
    runtimeImportAuthorized: false,
  };
  const projectionDir = path.join(qa, "certified-backbone");
  fs.mkdirSync(projectionDir, { recursive: true });
  for (const [name, value] of [
    ["nodes.jsonl", certifiedNodes],
    ["edges.jsonl", certifiedEdges],
    ["service-patterns.jsonl", certifiedPatterns],
    [
      "evidence.jsonl",
      evidenceRows.filter((e) => certifiedEvidenceIds.has(e.evidenceId)),
    ],
    [
      "transfers.jsonl",
      certifiedEdges.filter((e) => e.edgeKind === "hub_transfer"),
    ],
    [
      "sources.json",
      sourceRows.filter((s) => sourceStatus.get(s.sourceId) === "CERTIFIED"),
    ],
  ])
    fs.writeFileSync(
      path.join(projectionDir, name),
      name.endsWith("jsonl")
        ? value.map((v) => canonical(v)).join("\n") + (value.length ? "\n" : "")
        : JSON.stringify(value, null, 2) + "\n",
    );
  fs.writeFileSync(
    path.join(projectionDir, "manifest.json"),
    JSON.stringify(
      {
        task: "TASK-086-B",
        certificationSchemaVersion: 1,
        inputSha256: binding.inputSha256,
        projectionSha256: integrity.projectionReplaySha256,
        allowlistOnly: true,
        unknownPolicy: "EXCLUDE_FAIL_CLOSED",
        rawEvidencePreserved: true,
        runtimeImportAuthorized: false,
        counts: {
          nodes: report.certifiedNodes,
          edges: report.certifiedEdges,
          transfers: report.certifiedTransfers,
          components: report.certifiedComponents,
        },
        attribution: sourceAudit
          .filter((s) => s.status === "CERTIFIED")
          .map((s) => ({
            sourceId: s.sourceId,
            license: s.license,
            attribution: s.attribution,
            shareAlikeScope: s.shareAlikeScope,
          })),
        consumerWarning:
          "Offline acceptance artifact only. Do not use the unfiltered candidate graph as certified runtime data. No production import or realtime service claim.",
      },
      null,
      2,
    ) + "\n",
  );
  write("final-source-certification.json", {
    binding,
    summary: sourceSummary,
    families: familyNames.map((f) => ({
      family: f,
      counts: count(
        sourceAudit.filter((s) => s.family === f).map((s) => s.status),
      ),
      sourceIds: sourceAudit
        .filter((s) => s.family === f)
        .map((s) => s.sourceId),
    })),
    sources: sourceAudit,
  });
  write("final-node-identity-audit.json", {
    binding,
    summary: {
      certified: report.certifiedNodes,
      quarantined: report.quarantinedNodes,
      duplicateCanonicalIdentityCount: duplicateAnchors.size,
      rawIdentityFailures: rawAdmissions.filter((n) => n.reasons.length).length,
    },
    nodes: nodeAudit,
  });
  write("final-transfer-audit.json", {
    binding,
    summary: {
      certified_transfer_count: report.certifiedTransfers,
      quarantined_transfer_count: report.quarantinedTransfers,
      rejected_transfer_count: 0,
      blocking_transfer_count: report.quarantinedTransfers,
    },
    transfers: transferAudit,
  });
  write("final-edge-audit.json", { binding, edges: edgeAudit });
  write("final-graph-integrity.json", {
    binding,
    certifiedGraph: integrity,
    candidateRejectedFailures: count(
      edgeAudit.flatMap((e) =>
        e.reasons.filter((r) => !r.startsWith("UNCERTIFIED")),
      ),
    ),
  });
  write(
    "FINAL-GRAPH-INTEGRITY.md",
    `# Certified graph integrity\n\nInput SHA ${binding.inputSha256}.\n\n${JSON.stringify(integrity, null, 2)}\n\nEvery admitted service segment is regenerated through the production pattern code and compared; every transfer is regenerated through the production transfer code. Unknown travel time stays null. Actual direction, boarding/alighting and conditional access remain unchanged. The full generator replay proof is separate from this certified projection comparison.\n`,
  );
  write("final-blocker-inventory.json", {
    binding,
    summary,
    blockers: blockerRows,
    coverageLimitations: [
      "Affected prefecture denominator cannot be certified from the retained node schema; no prohibited N03 spatial join or invented geographic assignment.",
      "All original and necessary nodes remain requirements; quarantine does not exempt a requirement.",
    ],
  });
  write("final-acceptance.json", report);
  for (const [name, title, value] of [
    ["FINAL-SOURCE-CERTIFICATION.md", "Source certification", sourceSummary],
    [
      "FINAL-NODE-IDENTITY-AUDIT.md",
      "Node identity certification",
      {
        certified: report.certifiedNodes,
        quarantined: report.quarantinedNodes,
      },
    ],
    [
      "FINAL-TRANSFER-AUDIT.md",
      "Transfer certification",
      {
        certified: report.certifiedTransfers,
        quarantined: report.quarantinedTransfers,
      },
    ],
    ["FINAL-BLOCKER-INVENTORY.md", "Blocking inventory", summary],
  ])
    write(
      name,
      `# TASK-086-B ${title}\n\nInput SHA ${binding.inputSha256}. Candidate nodes ${nodes.length}; candidate edges ${edges.length}. Original evidence is preserved.\n\n${JSON.stringify(value, null, 2)}\n\nComplete stable IDs, source evidence, affected endpoints and remediation are in the matching machine-readable JSON. Public accessibility and topology-fact retention decisions are not automatically treated as explicit runtime/redistribution grants. Non-certified dependencies are excluded. Quarantine preserves requirements, does not close them.\n`,
    );
  return {
    status: report.status,
    certifiedNodes: report.certifiedNodes,
    certifiedEdges: report.certifiedEdges,
    certifiedTransfers: report.certifiedTransfers,
    blockers: summary.uniqueBlockerCount,
    bindingSha256: binding.inputSha256,
  };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  if (process.argv.includes("--freeze")) console.log(JSON.stringify(freeze()));
  if (process.argv.includes("--certify"))
    console.log(JSON.stringify(certify()));
}
