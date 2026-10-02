import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  admitNodes,
  canonical,
  exactRecordMap,
  unique,
  verifyEvidence,
  generatePattern,
  gtfsServiceDateBound,
  hash,
  id,
  invariant,
  sourceAllowed,
} from "./task-086-model.mjs";

export function assertBaselineGtfsPackage(pack) {
  invariant(
    pack.kind !== "TASK086_DERIVED_GTFS_STATIC_V1" &&
      !pack.selection?.existingAnchorReuse &&
      !pack.selection?.baseSource &&
      !pack.selection?.trips?.some((t) => t.section),
    "GTFS_EXTENSION_REQUIRES_REMEDIATION_REPLAY",
  );
}

function verifyNativePackage(pack, raw) {
  const result = spawnSync(
    process.platform === "win32" ? "python" : "python3",
    [
      "-B",
      "-X",
      "utf8",
      fileURLToPath(
        new URL("./task-086-extract-selected-gtfs.py", import.meta.url),
      ),
      "--verify-stdin",
    ],
    {
      input: JSON.stringify({ package: pack, archive: raw.toString("base64") }),
      encoding: "utf8",
      timeout: 60000,
      maxBuffer: 1024 * 1024,
    },
  );
  invariant(
    result.status === 0,
    "LICENSED_GTFS_NATIVE_PACKAGE_MISMATCH:" +
      (result.error?.message ?? result.stderr),
  );
}

const union = (a, b) => [...new Set([...a, ...b])];
function stopBound(node, source, sources, evidence) {
  const record = node.identityRecord;
  return (
    record &&
    node.identityAnchor === `${source.sourceId}:stop:${record.stop_id}` &&
    node.origin === "TASK_086_INDEPENDENT_GTFS" &&
    node.nodeKind === "bus_stop" &&
    node.canonicalNameJa === record.stop_name &&
    node.latitude === Number(record.stop_lat) &&
    node.longitude === Number(record.stop_lon) &&
    ["", "0"].includes(record.location_type) &&
    node.parentHubId === null &&
    node.hubSemantics === "GTFS_STOP_POINT_NO_SAME_NAME_COLLAPSE" &&
    node.independentReview?.decision === "ADMIT_TASK_086_TOPOLOGY" &&
    node.independentReview.recordSha256 === hash(record) &&
    verifyEvidence(node.evidenceRefs, sources, evidence) &&
    node.evidenceRefs.some((ref) => {
      const row = evidence.get(ref);
      return (
        row.sourceId === source.sourceId &&
        row.sourceSha256 === source.contentSha256 &&
        row.locator === "stops.txt:" + record.stop_id &&
        row.recordSha256 === hash(record) &&
        canonical(row.record) === canonical(record)
      );
    })
  );
}
function mergeLine(line, existing, source, sources, evidence, reuse) {
  const bound = (row) =>
    row &&
    row.lineRef === `${source.sourceId}:route:${row.sourceRoute?.route_id}` &&
    row.name === row.sourceRoute.route_long_name &&
    source.agencies.some(
      (a) =>
        a.agency_id === row.sourceRoute.agency_id &&
        a.agency_name === row.operatorRef,
    ) &&
    verifyEvidence(row.evidenceRefs, sources, evidence) &&
    row.evidenceRefs.some((ref) => {
      const e = evidence.get(ref);
      return (
        e.sourceId === source.sourceId &&
        e.locator === "routes.txt:" + row.sourceRoute.route_id &&
        canonical(e.record) === canonical(row.sourceRoute)
      );
    });
  invariant(bound(line), "LICENSED_GTFS_LINE_SOURCE_MISMATCH");
  if (!existing) return line;
  const identity = (row) =>
    Object.fromEntries(
      Object.entries(row).filter(
        ([key]) => !["sourceRefs", "evidenceRefs"].includes(key),
      ),
    );
  invariant(
    reuse &&
      bound(existing) &&
      canonical(identity(existing)) === canonical(identity(line)),
    "LICENSED_GTFS_PACKAGE_DUPLICATE_LINE",
  );
  return {
    ...existing,
    sourceRefs: union(existing.sourceRefs, line.sourceRefs),
    evidenceRefs: union(existing.evidenceRefs, line.evidenceRefs),
  };
}

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
  existingLines = [],
  existingPatterns = [],
) {
  const source = pack.source;
  invariant(
    canonical(sources.get(source.sourceId)) === canonical(source),
    "LICENSED_GTFS_SOURCE_DESCRIPTOR_MISMATCH",
  );
  exactRecordMap(pack.evidence, "evidenceId", "EVIDENCE");
  invariant(
    pack.evidence.every(
      (e) => canonical(evidence.get(e.evidenceId)) === canonical(e),
    ),
    "LICENSED_GTFS_EVIDENCE_DESCRIPTOR_MISMATCH",
  );
  const reuse = pack.selection.existingAnchorReuse;
  const extension =
    reuse ||
    pack.selection.baseSource ||
    pack.selection.trips.some((t) => t.section);
  if (reuse || pack.selection.baseSource)
    invariant(
      reuse?.method === "EXACT_EXISTING_GTFS_ANCHOR_SAME_ARCHIVE" &&
        reuse.sourceDescriptorSha256 === hash(source) &&
        canonical(pack.selection.baseSource) === canonical(source),
      "LICENSED_GTFS_REUSE_SOURCE_MISMATCH",
    );
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
    "Operator unrestricted-use terms": "PASS_OPERATOR_UNRESTRICTED_USE",
  };
  invariant(
    Object.hasOwn(licenseDecisions, source.license) &&
      source.license === (pack.selection.license ?? "CC BY 4.0") &&
      source.rightsDecision === licenseDecisions[source.license] &&
      (source.license === "CC BY 4.0" ||
        ((source.license === "CC0 1.0"
          ? source.licenseEvidence?.url === source.datasetUrl
          : source.licenseEvidence?.scope ===
              "EXPLICIT_OPERATOR_GTFS_UNRESTRICTED_USE" &&
            source.licenseEvidence?.reviewedDatasetUrl === source.datasetUrl &&
            source.licenseEvidence?.publisher === pack.selection.operator &&
            source.licenseEvidence?.url ===
              action?.rightsFindings.at(-1)?.termsUrl &&
            /^https:\/\//.test(source.licenseEvidence?.url ?? "")) &&
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
      gtfsServiceDateBound(binding, pack.selection.serviceDate, generatedAt) &&
      pack.transfers.length === 0 &&
      pack.patterns.every((p) => !Object.hasOwn(p, "reviewedServiceDate")),
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
  if (extension || Object.hasOwn(binding, "reviewedServiceDate"))
    verifyNativePackage(pack, raw);
  unique(pack.nodes, (n) => n.identityAnchor, "NODE_ANCHOR");
  unique(pack.lines, (l) => l.lineRef, "LINE_REF");
  unique(pack.patterns, (p) => p.sourcePatternKey, "PATTERN_KEY");
  const reused = [],
    updatedNodes = [],
    fresh = [];
  for (const candidate of pack.nodes) {
    const nodeId = id("node", candidate.identityAnchor);
    const previous = nodes.get(nodeId);
    if (!previous) {
      fresh.push(candidate);
      continue;
    }
    invariant(
      reuse &&
        previous.nodeId === nodeId &&
        previous.decision === "ADMIT_TASK_086_TOPOLOGY" &&
        stopBound(candidate, source, sources, evidence) &&
        stopBound(previous, source, sources, evidence) &&
        canonical(candidate.identityRecord) ===
          canonical(previous.identityRecord) &&
        canonical(candidate.operatorRefs) ===
          canonical(previous.operatorRefs) &&
        candidate.operatorRefs.length === 1 &&
        candidate.operatorRefs[0] === pack.selection.operator &&
        source.agencies.some(
          (a) => a.agency_name === pack.selection.operator,
        ) &&
        previous.identitySignature ===
          hash([
            previous.identityAnchor,
            previous.canonicalNameJa,
            previous.nodeKind,
            previous.operatorRefs,
          ]) &&
        candidate.independentReview.sourceArchiveSha256 ===
          source.contentSha256,
      "LICENSED_GTFS_EXISTING_ANCHOR_MISMATCH",
    );
    reused.push(nodeId);
    updatedNodes.push({
      ...previous,
      lineRefs: union(previous.lineRefs, candidate.lineRefs),
      sourceRefs: union(previous.sourceRefs, candidate.sourceRefs),
      evidenceRefs: union(previous.evidenceRefs, candidate.evidenceRefs),
    });
  }
  invariant(!reuse || reused.length > 0, "LICENSED_GTFS_REUSE_ANCHOR_REQUIRED");
  const admitted = admitNodes(fresh, sources, evidence, [...nodes.values()]);
  invariant(
    admitted.every(
      (n) => n.decision === "ADMIT_TASK_086_TOPOLOGY" && !nodes.has(n.nodeId),
    ),
    "LICENSED_GTFS_PACKAGE_NODE_ADMISSION_FAILED",
  );
  const nextNodes = new Map(nodes);
  for (const node of [...admitted, ...updatedNodes])
    nextNodes.set(node.nodeId, node);
  const lines = pack.lines.map((line) =>
    mergeLine(
      line,
      existingLines.find((l) => l.lineRef === line.lineRef),
      source,
      sources,
      evidence,
      reuse,
    ),
  );
  const patterns = pack.patterns.map((p) => ({
    ...p,
    ...(Object.hasOwn(binding, "reviewedServiceDate")
      ? { reviewedServiceDate: binding.reviewedServiceDate }
      : {}),
    servicePatternId: id("pattern", p.sourcePatternKey),
    callingNodes: p.callingNodes.map((c) => ({
      ...c,
      nodeId: id("node", c.identityAnchor),
    })),
  }));
  invariant(
    patterns.every(
      (p) =>
        !existingPatterns.some(
          (old) =>
            old.servicePatternId === p.servicePatternId ||
            old.sourcePatternKey === p.sourcePatternKey,
        ),
    ),
    "LICENSED_GTFS_PACKAGE_DUPLICATE_PATTERN",
  );
  const used = new Set(
    patterns.flatMap((p) => p.callingNodes.map((c) => c.nodeId)),
  );
  invariant(
    used.size === admitted.length + reused.length &&
      admitted.every((n) => used.has(n.nodeId)) &&
      reused.every((nodeId) => used.has(nodeId)),
    "LICENSED_GTFS_PACKAGE_UNUSED_NODE",
  );
  const groups = patterns.map((pattern) => ({
    pattern,
    edges: generatePattern(pattern, nextNodes, sources, evidence, generatedAt),
  }));
  return { admitted, reused, updatedNodes, lines, groups };
}
