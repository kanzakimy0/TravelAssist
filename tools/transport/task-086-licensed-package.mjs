import {
  admitNodes,
  generatePattern,
  hash,
  id,
  invariant,
  sourceAllowed,
} from "./task-086-model.mjs";

// Admit only a reviewed, hash-bound package at its declared phase. Exact GTFS
// boarding points stay distinct, including same-name arrival/departure stops.
export function prepareLicensedGtfsPackage(
  pack,
  binding,
  action,
  raw,
  nodes,
  sources,
  evidence,
  generatedAt,
) {
  const source = pack.source;
  const observed = action?.sourcesChecked.find(
    (s) =>
      s.url === source.url &&
      s.status === 200 &&
      s.rawPayloadRetained &&
      s.contentSha256 === source.contentSha256,
  );
  const licenseDecisions = {
    "CC BY 4.0": "PASS_CC_BY_4_0_ATTRIBUTION",
    "CC0 1.0": "PASS_CC0_1_0_PUBLIC_DOMAIN",
  };
  invariant(
    Object.hasOwn(licenseDecisions, source.license) &&
      source.license === (pack.selection.license ?? "CC BY 4.0") &&
      source.rightsDecision === licenseDecisions[source.license] &&
      (source.license !== "CC0 1.0" ||
        (source.licenseEvidence?.url === source.datasetUrl &&
          /^[a-f0-9]{64}$/.test(
            source.licenseEvidence?.observedResponseSha256 ?? "",
          ) &&
          hash(source.licenseEvidence) ===
            hash(pack.selection.licenseEvidence ?? null) &&
          action?.sourcesChecked.some(
            (s) =>
              s.purpose === "terms" &&
              s.status === 200 &&
              s.url === source.licenseEvidence.url &&
              s.contentSha256 === source.licenseEvidence.observedResponseSha256,
          ))),
    "LICENSED_GTFS_LICENSE_BINDING_MISMATCH",
  );
  invariant(
    binding.packageSha256 === hash(pack) &&
      binding.sourceActionId === action?.actionId &&
      ["RIGHTS_REVIEWED", "INGESTED"].includes(action?.state) &&
      action.rightsFindings.at(-1)?.rightsClass === "RAW_PERSISTENCE_ALLOWED" &&
      observed &&
      hash(raw) === source.contentSha256 &&
      sourceAllowed(source) &&
      source.persistenceAllowed === true &&
      source.retainedArchive &&
      pack.selection.archiveSha256 === source.contentSha256 &&
      pack.selection.sourceId === source.sourceId &&
      pack.selection.sourceActionId === action.actionId &&
      pack.selection.serviceDate >= source.validFrom &&
      pack.selection.serviceDate <= source.validTo &&
      pack.selection.serviceDate ===
        generatedAt.slice(0, 10).replaceAll("-", "") &&
      pack.transfers.length === 0,
    "LICENSED_GTFS_PACKAGE_REVIEW_MISMATCH",
  );
  invariant(
    pack.patterns.length === pack.selection.trips.length &&
      pack.selection.trips.every((t) =>
        pack.patterns.some(
          (p) =>
            p.sourceTripIds.length === 1 &&
            p.sourceTripIds[0] === t.sourceTripId,
        ),
      ),
    "LICENSED_GTFS_PACKAGE_TRIP_SCOPE_MISMATCH",
  );
  const admitted = admitNodes(pack.nodes, sources, evidence, [
    ...nodes.values(),
  ]);
  invariant(
    admitted.every(
      (n) => n.decision === "ADMIT_TASK_086_TOPOLOGY" && !nodes.has(n.nodeId),
    ),
    "LICENSED_GTFS_PACKAGE_NODE_ADMISSION_FAILED",
  );
  const nextNodes = new Map(nodes);
  for (const node of admitted) nextNodes.set(node.nodeId, node);
  const patterns = pack.patterns.map((p) => ({
    ...p,
    servicePatternId: id("pattern", p.sourcePatternKey),
    callingNodes: p.callingNodes.map((c) => ({
      ...c,
      nodeId: id("node", c.identityAnchor),
    })),
  }));
  const used = new Set(
    patterns.flatMap((p) => p.callingNodes.map((c) => c.nodeId)),
  );
  invariant(
    used.size === admitted.length && admitted.every((n) => used.has(n.nodeId)),
    "LICENSED_GTFS_PACKAGE_UNUSED_NODE",
  );
  const groups = patterns.map((pattern) => ({
    pattern,
    edges: generatePattern(pattern, nextNodes, sources, evidence, generatedAt),
  }));
  return { admitted, groups };
}
