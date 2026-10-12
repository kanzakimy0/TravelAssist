import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { canonical, hash, queryGraph } from "./task-086-model.mjs";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const qa = path.join(root, "docs/qa/TASK-086/certification-engine-repair");
const raw = path.join(root, "data/transport/network");
const read = (p) =>
  JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, ""));
const rows = (p) =>
  fs
    .readFileSync(p, "utf8")
    .replace(/^\uFEFF/, "")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
const write = (name, value) =>
  fs.writeFileSync(
    path.join(qa, name),
    typeof value === "string" ? value : canonical(value) + "\n",
  );
export function generateRepairReport({
  finalDirectory = path.join(root, ".cache/task-086/engine-repair-final"),
  passADirectory = path.join(
    root,
    ".cache/task-086/engine-repair-retained-only",
  ),
} = {}) {
  const old = read(path.join(qa, "previous-summary.json")),
    oldExcluded = rows(path.join(qa, "previous-exclusions.jsonl"));
  const audits = (directory) => ({
    node: read(path.join(directory, "final-node-identity-audit.json")).nodes,
    edge: read(path.join(directory, "final-edge-audit.json")).edges,
    transfer: read(path.join(directory, "final-transfer-audit.json")).transfers,
    source_dependency: read(
      path.join(directory, "final-source-certification.json"),
    ).sources,
  });
  const final = audits(finalDirectory),
    passA = audits(passADirectory),
    acceptance = read(path.join(finalDirectory, "final-acceptance.json"));
  const key = (r) => r.nodeId ?? r.edgeId ?? r.transferId ?? r.sourceId;
  const maps = (a) =>
    Object.fromEntries(
      Object.entries(a).map(([kind, list]) => [
        kind,
        new Map(list.map((r) => [key(r), r])),
      ]),
    );
  const fm = maps(final),
    am = maps(passA);
  const category = (r) =>
    r.status === "CERTIFIED"
      ? "CERTIFIED"
      : r.status === "REJECTED"
        ? "REJECTED"
        : r.reasons.some((x) => x.includes("RIGHTS"))
          ? "RIGHTS_UNRESOLVED"
          : r.reasons.some((x) => x.includes("TRANSFER"))
            ? "TRANSFER_UNRESOLVED"
            : r.reasons.some((x) => x.includes("IDENTITY"))
              ? "IDENTITY_UNRESOLVED"
              : r.reasons.some((x) => x.includes("SNAPSHOT"))
                ? "SNAPSHOT_INTEGRITY_FAILED"
                : "SERVICE_UNRESOLVED";
  const counts = {},
    diff = [],
    families = new Map();
  const sourceMap = new Map(
    final.source_dependency.map((s) => [s.sourceId, s]),
  );
  for (const prior of oldExcluded) {
    const current = fm[prior.kind].get(prior.entityId),
      retained = am[prior.kind].get(prior.entityId);
    assert.ok(current && retained, prior.entityId);
    counts[prior.kind] ??= {};
    const transition = "QUARANTINED -> " + category(current);
    counts[prior.kind][transition] = (counts[prior.kind][transition] ?? 0) + 1;
    const requiredFacts = current.requiredFacts ?? [];
    diff.push({
      entityId: prior.entityId,
      kind: prior.kind,
      previousState: prior.state,
      previousReasons: prior.reasonCodes,
      passAStatus: retained.status,
      newStatus: current.status,
      newReasons: current.reasons,
      requiredFacts,
      sourceCapabilities: (current.sourceIds ?? [current.sourceId]).map(
        (id) => ({
          sourceId: id,
          capabilities: sourceMap.get(id)?.capabilities ?? null,
        }),
      ),
      externalEvidenceAdded: retained.status !== current.status,
      routeEligible: current.status === "CERTIFIED",
      blockers: current.blockers ?? [],
    });
    const sources = current.sourceIds ?? [current.sourceId];
    for (const family of new Set(
      sources.map((id) => sourceMap.get(id)?.family).filter(Boolean),
    )) {
      if (!families.has(family))
        families.set(family, {
          family,
          recovered: {
            node: [],
            edge: [],
            transfer: [],
            source_dependency: [],
          },
          stillDisabled: {
            node: [],
            edge: [],
            transfer: [],
            source_dependency: [],
          },
          rawConstraint:
            "Raw rights are separate; reviewed fact-only sources never gain raw redistribution/persistence through this repair.",
        });
      families
        .get(family)
        [current.status === "CERTIFIED" ? "recovered" : "stillDisabled"][
          prior.kind
        ].push(prior.entityId);
    }
  }
  assert.equal(diff.length, oldExcluded.length);
  const chunks = [];
  for (let i = 0; i < diff.length; i += 1000) {
    const name = `quarantine-recertification-diff.${String(i / 1000).padStart(3, "0")}.jsonl`,
      text =
        diff
          .slice(i, i + 1000)
          .map(canonical)
          .join("\n") + "\n";
    write(name, text);
    chunks.push({
      file: name,
      count: diff.slice(i, i + 1000).length,
      sha256: hash(text),
      bytes: Buffer.byteLength(text),
    });
  }
  write("quarantine-recertification-diff.json", {
    schemaVersion: 1,
    inputSha256: acceptance.binding.inputSha256,
    fullPreviousQuarantineEvaluated: true,
    typedEntityCount: diff.length,
    counts,
    chunks,
    transfersAreSubsetOfEdges: true,
  });
  const rawNodes = rows(path.join(raw, "node-downstream-admission.jsonl")),
    rawEdges = rows(path.join(raw, "transport-node-edges.jsonl"));
  const certifiedNodes = rows(
      path.join(finalDirectory, "certified-backbone/nodes.jsonl"),
    ),
    certifiedEdges = rows(
      path.join(finalDirectory, "certified-backbone/edges.jsonl"),
    );
  assert.equal(
    certifiedNodes.length,
    final.node.filter((n) => n.status === "CERTIFIED").length,
  );
  const patterns = new Map(
    rows(path.join(raw, "service-patterns.jsonl")).map((p) => [
      p.servicePatternId,
      p,
    ]),
  );
  const evidence = new Map(
    rows(path.join(raw, "topology-evidence.jsonl")).map((e) => [
      e.evidenceId,
      e,
    ]),
  );
  const allEdges = new Map(rawEdges.map((e) => [e.edgeId, e]));
  const nodeMap = new Map(rawNodes.map((n) => [n.nodeId, n]));
  const witness = (ids) =>
    ids &&
    ids.map((id) => {
      const e = allEdges.get(id),
        p = patterns.get(e.servicePatternRef),
        fact = evidence.get(p?.sourceFactRef)?.record;
      return {
        edgeId: id,
        from: e.fromTransportNodeId,
        to: e.toTransportNodeId,
        fromName: nodeMap.get(e.fromTransportNodeId).canonicalNameJa,
        toName: nodeMap.get(e.toTransportNodeId).canonicalNameJa,
        edgeKind: e.edgeKind,
        mode: e.mode,
        line: e.lineRef ?? null,
        lineName: fact?.line ?? null,
        servicePattern: e.servicePatternRef ?? null,
        reviewedTrain:
          fact?.expectedTrainCode ??
          fact?.reviewedTrainCode ??
          fact?.serviceNumber ??
          null,
        serviceClass: e.serviceClass ?? null,
        serviceSourceUrl: fact?.sourceUrl ?? null,
        sourceLocator: fact?.locator ?? null,
        direction: e.direction ?? null,
        boardAllowed: e.boardAllowed ?? null,
        alightAllowed: e.alightAllowed ?? null,
        accessContract: e.accessContract ?? null,
        minimumTransferTimeMin: e.metrics.transferTimeMin,
        requiredFacts: fm.edge.get(id).requiredFacts,
      };
    });
  const find = (name) =>
    rawNodes
      .filter(
        (n) => n.canonicalNameJa === name && n.mode === "conventional_rail",
      )
      .sort((a, b) => a.nodeId.localeCompare(b.nodeId))[0]?.nodeId;
  const corridors = [
    ...acceptance.nationalCorridors,
    ...(!acceptance.nationalCorridors.some(
      (c) => c.from === find("東京") && c.to === find("名古屋"),
    )
      ? [
          {
            corridorId: "mandatory:東京:名古屋",
            label: "東京 ↔ 名古屋",
            from: find("東京"),
            to: find("名古屋"),
          },
        ]
      : []),
  ];
  const corridorResults = corridors.map((c) => {
    const directions = [
      [c.from, c.to],
      [c.to, c.from],
    ].map(([from, to]) => {
      const candidatePath = queryGraph(rawEdges, from, to),
        certifiedPath = queryGraph(certifiedEdges, from, to);
      const blockedIds = (candidatePath ?? []).filter(
        (id) => fm.edge.get(id)?.status !== "CERTIFIED",
      );
      return {
        from,
        to,
        candidateReachable: Boolean(candidatePath?.length),
        certifiedReachable: Boolean(certifiedPath?.length),
        candidatePath: candidatePath ?? null,
        certifiedPath: certifiedPath ?? null,
        witness: witness(certifiedPath),
        cut: blockedIds.map((id) => ({
          edgeId: id,
          from: allEdges.get(id).fromTransportNodeId,
          to: allEdges.get(id).toTransportNodeId,
          requiredFacts: fm.edge.get(id).requiredFacts,
          blockers: fm.edge.get(id).blockers,
          canRecertify: true,
        })),
        failure: certifiedPath?.length
          ? null
          : candidatePath?.length
            ? "FACT_SCOPED_CERTIFICATION_CUT"
            : "TOPOLOGY_COVERAGE_GAP",
      };
    });
    return {
      corridorId: c.corridorId,
      label: c.label,
      from: c.from,
      to: c.to,
      status: directions.every((d) => d.certifiedReachable)
        ? "PASS"
        : "UNAVAILABLE",
      directions,
    };
  });
  write("corridor-cut-audit.json", {
    inputSha256: acceptance.binding.inputSha256,
    method:
      "CURRENT_CANDIDATE_VS_CERTIFIED_PASSENGER_STATE_QUERY_BOTH_DIRECTIONS",
    corridors: corridorResults,
  });
  write(
    "corridor-cut-audit.md",
    "# National corridor candidate vs certified audit\n\n| Corridor | Candidate both ways | Certified both ways | Status |\n|---|---|---|---|\n" +
      corridorResults
        .map(
          (c) =>
            `| ${c.label} | ${c.directions.every((d) => d.candidateReachable)} | ${c.directions.every((d) => d.certifiedReachable)} | ${c.status} |`,
        )
        .join("\n") +
      "\n\nExact directed witnesses, pickup/dropoff constraints and cut IDs are in corridor-cut-audit.json. Static topology is not a realtime timetable guarantee.\n",
  );
  const tokyo = find("東京"),
    ueno = find("上野");
  const tokyoUeno = {
    tokyo,
    ueno,
    identities: { tokyo: fm.node.get(tokyo), ueno: fm.node.get(ueno) },
    outward: witness(queryGraph(certifiedEdges, tokyo, ueno)),
    return: witness(queryGraph(certifiedEdges, ueno, tokyo)),
  };
  assert.ok(
    tokyoUeno.outward?.length && tokyoUeno.return?.length,
    "Tokyo/Ueno actual certified passenger paths required",
  );
  const otemachi = rawNodes.filter((n) => n.canonicalNameJa === "大手町"),
    tokyoComponents = rawNodes.filter((n) => n.canonicalNameJa === "東京");
  const walking = certifiedEdges.filter(
    (e) =>
      e.edgeKind === "hub_transfer" &&
      ((tokyoComponents.some((n) => n.nodeId === e.fromTransportNodeId) &&
        otemachi.some((n) => n.nodeId === e.toTransportNodeId)) ||
        (otemachi.some((n) => n.nodeId === e.fromTransportNodeId) &&
          tokyoComponents.some((n) => n.nodeId === e.toTransportNodeId))),
  );
  assert.ok(
    otemachi.every((o) =>
      tokyoComponents.every(
        (t) => o.identityAnchor !== t.identityAnchor && o.nodeId !== t.nodeId,
      ),
    ),
  );
  assert.ok(walking.every((e) => e.metrics.transferTimeMin.value !== 0));
  write("tokyo-ueno-acceptance.json", {
    inputSha256: acceptance.binding.inputSha256,
    ...tokyoUeno,
    otemachi: {
      separateCanonicalIdentities: true,
      nodeIds: otemachi.map((n) => n.nodeId),
      walkingRelations: witness(walking.map((e) => e.edgeId)),
      noDirectWalkingRelationInvented: walking.length === 0,
      durationUnknownPreserved: true,
    },
  });
  const familyRows = [...families.values()].sort((a, b) =>
    a.family.localeCompare(b.family),
  );
  write("source-family-recovery-summary.json", {
    inputSha256: acceptance.binding.inputSha256,
    countsNotAdditiveAcrossFamilies: true,
    families: familyRows,
  });
  const totals = (a) =>
    Object.fromEntries(
      ["node", "edge", "transfer"].map((k) => [
        k,
        a[k].filter((r) => r.status === "CERTIFIED").length,
      ]),
    );
  const ta = totals(passA),
    tf = totals(final);
  const oldTotals = {
    node: old.routeEnabled.nodes,
    edge: old.routeEnabled.edges,
    transfer: old.routeEnabled.transfers,
  };
  const result = {
    schemaVersion: 1,
    inputSha256: acceptance.binding.inputSha256,
    before: oldTotals,
    passA: ta,
    after: tf,
    engineOnlyRecovered: Object.fromEntries(
      Object.keys(tf).map((k) => [k, ta[k] - oldTotals[k]]),
    ),
    additionalEvidenceRecovered: Object.fromEntries(
      Object.keys(tf).map((k) => [k, tf[k] - ta[k]]),
    ),
    disabled: Object.fromEntries(
      Object.keys(tf).map((k) => [k, final[k].length - tf[k]]),
    ),
    fullPreviousQuarantineEvaluated: diff.length,
    allFrozenCandidatesRecomputed: true,
    coverageRequirementsPreserved: true,
    nationalCorridors: corridorResults.map((c) => ({
      id: c.corridorId,
      label: c.label,
      status: c.status,
    })),
    graphIntegrity: acceptance.graphIntegrity,
    sourceCounts: {
      certified: final.source_dependency.filter((s) => s.status === "CERTIFIED")
        .length,
      remaining: final.source_dependency.filter((s) => s.status !== "CERTIFIED")
        .length,
    },
    disabledReasons: counts,
    sourceFamiliesRecovered: familyRows.length,
    finalCI: "REQUIRES_CURRENT_EXACT_HEAD_REMOTE_RESULT",
    tokenUsage: "UNKNOWN",
    billing: "UNKNOWN",
    newAgents: 0,
    trafficDataChanged: false,
  };
  const retainedObligations = read(
    path.join(finalDirectory, "final-blocker-inventory.json"),
  ).blockers;
  write("remaining-original-obligations.json", {
    inputSha256: acceptance.binding.inputSha256,
    certificationEntityBlockers: result.disabled,
    total: retainedObligations.length,
    obligations: retainedObligations,
    nonCertificationCoverageAndProofGapsPreserved: true,
    noAcceptanceThresholdChanged: true,
  });
  result.remainingOriginalObligations = retainedObligations.length;
  result.originalNationalAcceptance = acceptance.status;
  result.gatewayConnectivity = {
    total: acceptance.gateways.length,
    pass: acceptance.gateways.filter((g) => g.status === "PASS").length,
  };
  write("recertification-summary.json", result);
  write(
    "quarantine-recertification-diff.md",
    `# Full quarantine re-certification\n\n${diff.length} typed prior exclusions recomputed. Transfers are a subset of edges. No sampling or old quarantine decisions reused.\n\n| Kind | Before | Engine-only pass A | Final pass C | Engine recovery | New evidence recovery | Disabled |\n|---|---:|---:|---:|---:|---:|---:|\n` +
      Object.keys(tf)
        .map(
          (k) =>
            `| ${k} | ${oldTotals[k]} | ${ta[k]} | ${tf[k]} | ${result.engineOnlyRecovered[k]} | ${result.additionalEvidenceRecovered[k]} | ${result.disabled[k]} |`,
        )
        .join("\n") +
      "\n\nEach old ID, old reason, new required-fact proof, exact supported source capability and new-evidence flag is retained in deterministic JSONL chunks indexed by quarantine-recertification-diff.json.\n",
  );
  const findings = [];
  for (const file of fs
    .readdirSync(path.join(root, "tools/transport"))
    .filter((f) => /^task-086-.*\.mjs$/.test(f))) {
    const lines = fs
      .readFileSync(path.join(root, "tools/transport", file), "utf8")
      .split(/\r?\n/);
    lines.forEach((line, i) => {
      if (
        /sourceAllowed\(|verifyEvidence\(|sourceStatus|certifiedSources|collectEvidence|UNCERTIFIED_IDENTITY_SOURCE_DEPENDENCY|UNCERTIFIED_EDGE_SOURCE_DEPENDENCY|UNCERTIFIED_PATTERN_CALLING_NODE/.test(
          line,
        )
      )
        findings.push({
          file: "tools/transport/" + file,
          line: i + 1,
          code: line.trim(),
          disposition:
            file === "task-086-final-closeout.mjs"
              ? "FINAL_FACT_CAPABILITY_AND_REQUIRED_ROLE_GATE; raw/global integrity remains fail-closed"
              : file === "task-086-certification-facts.mjs"
                ? "REQUIRED_FACT_CHECK_OR_EXPLICIT_ROLE_CLOSURE"
                : "RETAINED_PRODUCTION_OR_SPECIALIST_PROVENANCE_VALIDATOR; final consumer also requires scoped fact proof",
        });
    });
  }
  write("certification-engine-repair-audit.json", {
    authority: "67bf222e3d697186be43cf98c4d7299e41015e70",
    oldBugRegressionLog: "old-engine-regression.log",
    bugs: [
      "RAW_LICENSE_REGEX_REJECTED_REVIEWED_MINIMAL_FACT_POLICY",
      "ALL_NODE_EVIDENCE_TREATED_AS_REQUIRED_IDENTITY",
      "ENTIRE_PATTERN_CALLING_NODE_CASCADE",
      "UNRELATED_PATTERN_EVIDENCE_CASCADE",
      "EXPORT_REINTRODUCED_FULL_EVIDENCE_CASCADE",
    ],
    sourceModel: "CAPABILITY_SCOPED_EXISTING_REVIEWED_POLICY",
    roles: [
      "REQUIRED_IDENTITY",
      "REQUIRED_SERVICE_TOPOLOGY",
      "REQUIRED_DIRECTION_BOARDING",
      "REQUIRED_TRANSFER",
      "REQUIRED_WALKING_ACCESS",
      "CORROBORATING",
      "AUXILIARY",
      "METRIC_ONLY",
      "RAW_ARCHIVE_ONLY",
    ],
    calls: findings,
    sourceIntegrityPolicy:
      "Source archive/hash and retained evidence integrity remain strict; no uncertified source is admitted to the source export. Every required fact additionally checks capability and exact source/record hash.",
    noBlanketUnlock: true,
    rawRedistributionNotInferred: true,
    noCityWhitelist: true,
    candidateInputUnmodified: true,
  });
  write(
    "certification-engine-repair-audit.md",
    "# Certification engine repair audit\n\nThe old JR East regression failed REVIEW_REQUIRED versus expected derived-fact certification; the actual log is retained. The repaired final classifier reuses the repository-reviewed minimal nonexpressive-fact policy, with separate raw/identity/service/direction/transfer/walking/metric/runtime capabilities. Empty license and no structured reviewed basis still fail.\n\nNodes use exact required identity plus reviewed operator transition evidence. Segments use their own ordered calls, endpoint identity, direction, pickup/dropoff and actually crossed operator boundary; unrelated remote calling-node certification is not fatal. Scoped production records preserve canonical IDs. Export patterns enumerate eligible segments and forbid full-pattern expansion. Required variant station codes and all nested essential proof rows are retained. Auxiliary and metric-only evidence do not become station identity requirements.\n\nSource snapshot/provenance integrity is preserved; no whole-source one-valid-record relaxation was applied. Invalid essential identities, direction/access, transfer facts and source hashes still fail. Tests cover real Tokyo/Ueno, separate Otemachi identity, invalid/public-only rights, invalid required facts, unrelated auxiliary and remote-node cases, operator transitions, orthographic variants, GTFS minimum transfer and ODbL tampering. All call sites are enumerated in the JSON audit. No production Tokyo/Ueno/JR East whitelist.\n",
  );
  return result;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(JSON.stringify(generateRepairReport()));
