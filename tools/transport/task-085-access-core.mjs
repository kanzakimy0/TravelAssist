import assert from "node:assert/strict";
import {
  candidateToUnresolvedEdge,
  applyLicensedObservation,
  straightDistanceM,
  validateMobilityEdge,
} from "../../src/shared/poi-edge-graph/index.ts";
import { sha256 } from "./task-085-gate0.mjs";

export const ordered = (value) =>
  Array.isArray(value)
    ? value.map(ordered)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, ordered(value[k])]),
        )
      : value;
export const stable = (value) => JSON.stringify(ordered(value));
export const jsonl = (rows) => rows.map((r) => stable(r) + "\n").join("");
export const digest = (value) => sha256(stable(value));
const lexical = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export const validPoint = (p) =>
  p &&
  Number.isFinite(p.latitude) &&
  Number.isFinite(p.longitude) &&
  p.latitude >= -90 &&
  p.latitude <= 90 &&
  p.longitude >= -180 &&
  p.longitude <= 180;
const hex = (value) =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const normalize = (value) => value.normalize("NFKC").replace(/\s/g, "");
export function validateConfig(c) {
  assert.equal(c.batchSize, 200);
  for (const k of [
    "targetMinNodesPerPoi",
    "targetMaxNodesPerPoi",
    "maxLocalNodesPerPoi",
    "maxMajorHubsPerPoi",
    "maxTourismGatewaysPerPoi",
    "maxSpecialNodesPerPoi",
    "maxTotalNodesPerPoi",
    "maxDiscoveryCandidatesPerPoi",
  ]) {
    assert.ok(Number.isInteger(c[k]) && c[k] > 0, k);
  }
  assert.ok(
    c.targetMinNodesPerPoi <= c.targetMaxNodesPerPoi &&
      c.targetMaxNodesPerPoi <= c.maxTotalNodesPerPoi,
  );
  assert.ok(c.maxTotalNodesPerPoi <= c.maxDiscoveryCandidatesPerPoi);
  assert.ok(
    c.targetMinNodesPerPoi >= 3 && c.targetMaxNodesPerPoi <= 8,
    "ACCEPTANCE_DENSITY_FLOOR",
  );
  assert.ok(
    c.stagedRadiiM.length > 0 &&
      c.stagedRadiiM.every(
        (v, i, a) => Number.isFinite(v) && v > 0 && (!i || v > a[i - 1]),
      ),
  );
  assert.ok(c.cellDegrees > 0 && c.localRadiusM <= c.stagedRadiiM.at(-1));
  assert.ok(Number.isFinite(Date.parse(c.generatedAt)));
}
function kindFor(record) {
  if (record.nodeKind === "bus_stop") return "bus_stop";
  if ([11, 12].includes(record.railClass)) return "railway_station";
  if (record.railClass === 13) return "funicular_station";
  if (record.railClass === 21)
    return record.operator === "大阪市高速電気軌道" ||
      (record.operator === "近畿日本鉄道" &&
        record.lines.includes("けいはんな線"))
      ? "railway_station"
      : "tram_stop";
  if ([14, 15, 16, 22, 23, 24, 25].includes(record.railClass))
    return "fixed_guideway_station";
  return null;
}
export function identityFor(record) {
  // The identity excludes the position. A changed position must pass an explicit
  // binding update, never silently create a nearby replacement for an old ID.
  const externalIds = record.sourceRows
    ? [...new Set(record.sourceRows.map((r) => String(r.stationCode)))].sort()
    : [record.externalId];
  const authority = record.sourceRows
    ? "mlit-s12"
    : record.sourceId.split(/-20/)[0];
  const identityKey = stable([authority, record.operator, externalIds]);
  const nodeId = "transport:task085:" + digest(identityKey).slice(0, 24);
  return {
    nodeId,
    identityKey,
    externalIds,
    bindingSha256: digest({
      identityKey,
      name: record.name,
      point: record.point,
      nodeKind: kindFor(record),
    }),
  };
}
export function makeBindings(records) {
  const grouped = new Map();
  for (const r of records) {
    const binding = identityFor(r),
      previous = grouped.get(binding.nodeId);
    grouped.set(
      binding.nodeId,
      previous && previous.bindingSha256 !== binding.bindingSha256
        ? {
            ...previous,
            bindingSha256: null,
            decision: "AMBIGUOUS_EXTERNAL_ID_HOLD",
          }
        : (previous ?? binding),
    );
  }
  return [...grouped.values()].sort((a, b) => lexical(a.nodeId, b.nodeId));
}
export function admitNodes(records, rights, bindings) {
  const grants = new Map(rights.sources.map((s) => [s.sourceId, s]));
  const frozen = new Map(bindings.map((b) => [b.nodeId, b]));
  assert.equal(frozen.size, bindings.length, "DUPLICATE_BINDING_ID");
  const ids = new Map();
  const names = new Map();
  for (const r of records) {
    const id = identityFor(r).nodeId;
    ids.set(id, (ids.get(id) ?? 0) + 1);
    const key = stable([r.operator, normalize(r.name)]);
    names.set(key, [...(names.get(key) ?? []), r]);
  }
  return records
    .map((r) => {
      const identity = identityFor(r),
        grant = grants.get(r.sourceId),
        nodeKind = kindFor(r),
        failures = [];
      if (!validPoint(r.point)) failures.push("INVALID_COORDINATE");
      if (
        !r.name?.trim() ||
        !r.operator?.trim() ||
        !nodeKind ||
        !identity.externalIds.length ||
        identity.externalIds.some((id) => !id)
      )
        failures.push("IDENTITY_INCOMPLETE");
      if (
        !hex(r.sourceRecordSha256) ||
        !hex(r.archiveSha256) ||
        r.archiveSha256 !== grant?.archiveSha256 ||
        r.sourceUrl !== grant?.sourceUrl
      )
        failures.push("PROVENANCE_MISMATCH");
      if (
        !grant?.rights ||
        ![
          "bulkDatasetDownload",
          "cache",
          "retention",
          "production",
          "derivativePersistence",
        ].every((k) => grant.rights[k] === true) ||
        !grant.licenseUrl ||
        !grant.attribution
      )
        failures.push("LICENSE_NOT_APPROVED");
      if (frozen.get(identity.nodeId)?.bindingSha256 !== identity.bindingSha256)
        failures.push("IDENTITY_REBIND_OR_UNREGISTERED");
      if (ids.get(identity.nodeId) !== 1) failures.push("DUPLICATE_IDENTITY");
      if (
        validPoint(r.point) &&
        names
          .get(stable([r.operator, normalize(r.name)]))
          .some(
            (other) =>
              other !== r &&
              validPoint(other.point) &&
              straightDistanceM(r.point, other.point) <= 500,
          )
      )
        failures.push("NEARBY_SAME_NAME_IDENTITY_REVIEW");
      if (
        r.sourceRows &&
        r.sourceRows.some(
          (row) =>
            !hex(row.featureSha256) ||
            row.name !== r.name ||
            row.operator !== r.operator,
        )
      )
        failures.push("SOURCE_ROW_IDENTITY_MISMATCH");
      return {
        ...identity,
        sourceRecordSha256: r.sourceRecordSha256,
        sourceId: r.sourceId,
        name: r.name,
        operator: r.operator,
        lines: r.lines,
        nodeKind,
        point: r.point,
        coordinateSemantics: r.coordinateSemantics,
        sourceRefs: [r.sourceUrl],
        archiveSha256: r.archiveSha256,
        decision: failures.length ? "HOLD" : "ADMIT_TASK_085_TOPOLOGY",
        downstream085Authorized: failures.length === 0,
        runtimeImportAuthorized: false,
        admissionScope: "TASK_085_LOCAL_TOPOLOGY_ONLY_NOT_USABLE_ACCESS",
        confidence: {
          identity: failures.length ? "unresolved" : "official_source_verified",
          operation: "unresolved",
          routeAccess: "unresolved",
        },
        failures,
        license: grant?.license ?? null,
        attribution: grant?.attribution ?? null,
        maxDailyPassengers: r.sourceRows?.some((s) =>
          Number.isFinite(s.passengersPerDay),
        )
          ? Math.max(
              ...r.sourceRows
                .filter((s) => Number.isFinite(s.passengersPerDay))
                .map((s) => s.passengersPerDay),
            )
          : null,
      };
    })
    .sort(
      (a, b) =>
        lexical(a.nodeId, b.nodeId) ||
        lexical(a.sourceRecordSha256, b.sourceRecordSha256),
    );
}
export function spatialIndex(nodes, cellDegrees) {
  const cells = new Map();
  for (const n of nodes)
    if (validPoint(n.point)) {
      const key =
        Math.floor(n.point.latitude / cellDegrees) +
        ":" +
        Math.floor(n.point.longitude / cellDegrees);
      cells.set(key, [...(cells.get(key) ?? []), n]);
    }
  return {
    query(point, radius) {
      const lat = radius / 110000,
        lon =
          radius /
          (110000 * Math.max(0.1, Math.cos((point.latitude * Math.PI) / 180)));
      const found = [];
      let examined = 0;
      for (
        let x = Math.floor((point.latitude - lat) / cellDegrees);
        x <= Math.floor((point.latitude + lat) / cellDegrees);
        x++
      )
        for (
          let y = Math.floor((point.longitude - lon) / cellDegrees);
          y <= Math.floor((point.longitude + lon) / cellDegrees);
          y++
        )
          for (const n of cells.get(x + ":" + y) ?? []) {
            examined++;
            const d = straightDistanceM(point, n.point);
            if (d <= radius) found.push({ node: n, straightDistanceM: d });
          }
      return { found, examined };
    },
  };
}
export function candidatesFor(poi, index, research, config) {
  const scan = index.query(poi.location.point, config.stagedRadiiM.at(-1));
  const gateways = new Set(research.gatewayNames.map(normalize));
  const special = research.barrierReviewTriggers.some((t) =>
    ["mountain_access", "island_ferry_access", "seasonal_service"].includes(t),
  );
  const rows = scan.found.map(({ node, straightDistanceM: distance }) => {
    const official = gateways.has(normalize(node.name));
    const role =
      ["funicular_station"].includes(node.nodeKind) ||
      (special && official && node.nodeKind === "bus_stop")
        ? "special_access"
        : official && special
          ? "tourism_gateway"
          : distance <= config.localRadiusM
            ? "local_node"
            : node.maxDailyPassengers >= config.majorHubMinDailyPassengers
              ? "major_hub"
              : "tourism_gateway";
    return {
      poiId: poi.internalId,
      nodeId: node.nodeId,
      sourceRecordSha256: node.sourceRecordSha256,
      accessRole: role,
      straightDistanceM: distance,
      sourceRefs: node.sourceRefs,
      officialGatewayMatched: official,
      walkability: "unresolved",
      barrierReviewTriggers: research.barrierReviewTriggers,
      usefulDistinctKey: stable([
        node.operator,
        normalize(node.name),
        node.lines,
      ]),
      rankComponents: {
        officialGateway: official ? 1 : 0,
        local: distance <= config.localRadiusM ? 1 : 0,
        special: role === "special_access" ? 1 : 0,
        operatorLines: node.lines.length,
        straightDistanceM: distance,
      },
      admitted: node.downstream085Authorized,
      node,
    };
  });
  rows.sort(
    (a, b) =>
      Number(b.admitted) - Number(a.admitted) ||
      Number(b.officialGatewayMatched) - Number(a.officialGatewayMatched) ||
      b.rankComponents.special - a.rankComponents.special ||
      b.rankComponents.local - a.rankComponents.local ||
      b.rankComponents.operatorLines - a.rankComponents.operatorLines ||
      a.straightDistanceM - b.straightDistanceM ||
      lexical(a.nodeId, b.nodeId),
  );
  const limits = {
    local_node: config.maxLocalNodesPerPoi,
    major_hub: config.maxMajorHubsPerPoi,
    tourism_gateway: config.maxTourismGatewaysPerPoi,
    special_access: config.maxSpecialNodesPerPoi,
  };
  const retained = [],
    decisions = [],
    used = new Set(),
    counts = {};
  for (let i = 0; i < rows.length; i++) {
    const { node, ...row } = rows[i];
    let reason;
    if (!row.admitted) reason = "NODE_NOT_ACCEPTED";
    else if (
      !row.officialGatewayMatched &&
      row.straightDistanceM > config.localRadiusM
    )
      reason = "REMOTE_NODE_WITHOUT_ACCESS_RELEVANCE";
    else if (i >= config.maxDiscoveryCandidatesPerPoi) reason = "DISCOVERY_CAP";
    else if (used.has(row.usefulDistinctKey))
      reason = "REDUNDANT_OPERATOR_LINE_GATEWAY";
    else if (retained.length >= config.maxTotalNodesPerPoi)
      reason = "TOTAL_ROLE_CAP";
    else if ((counts[row.accessRole] ?? 0) >= limits[row.accessRole])
      reason = "ACCESS_ROLE_CAP";
    else reason = "RETAIN_FOR_DIRECTIONAL_EVIDENCE_ONLY";
    const decision = {
      ...row,
      rank: i + 1,
      decision: reason.startsWith("RETAIN") ? "RETAIN" : "REJECT",
      reason,
      decisionId:
        "decision:" +
        digest([row.poiId, row.nodeId, row.sourceRecordSha256]).slice(0, 24),
    };
    decisions.push(decision);
    if (decision.decision === "RETAIN") {
      retained.push({ node, decision });
      used.add(row.usefulDistinctKey);
      counts[row.accessRole] = (counts[row.accessRole] ?? 0) + 1;
    }
  }
  return {
    retained,
    decisions,
    scan: {
      poiId: poi.internalId,
      spatialRecordsExamined: scan.examined,
      candidateCount: rows.length,
      stages: config.stagedRadiiM.map((radiusM) => ({
        radiusM,
        count: rows.filter((r) => r.straightDistanceM <= radiusM).length,
      })),
      walkabilityConfirmedCount: 0,
      sourceUniverseExhausted: false,
    },
  };
}
export function directedCandidate(poi, node, decision, direction, config) {
  const p = { kind: "poi", id: poi.internalId },
    n = { kind: "transport", id: node.nodeId };
  const graph = candidateToUnresolvedEdge(
    {
      schemaVersion: "1.0",
      from: direction === "POI_TO_NODE" ? p : n,
      to: direction === "POI_TO_NODE" ? n : p,
      directed: true,
      layer:
        direction === "POI_TO_NODE"
          ? "poi_transport_access"
          : "transport_poi_access",
      relation: "access_to_transport_node",
      straightDistanceM: decision.straightDistanceM,
    },
    config.generatedAt,
  );
  return {
    ...graph,
    edgeId: "access:" + digest([graph.from, graph.to]).slice(0, 24),
    poiId: poi.internalId,
    nodeId: node.nodeId,
    direction,
    accessRole: decision.accessRole,
    candidateDecisionId: decision.decisionId,
    sourceRefs: [...node.sourceRefs],
    admission: "UNCONFIRMED_CANDIDATE",
    provenance: {
      task: "TASK-085-B",
      nodeSourceRecordSha256: node.sourceRecordSha256,
      canonicalPoiRevision: poi.revision.recordRevision,
      method: "bounded_spatial_then_role_and_official_guidance",
    },
    walkingRouteDistanceM: null,
    walkingDurationMin: null,
    detourRatio: null,
  };
}
export function observationIssues(edge, observation, source, config) {
  const issues = [];
  if (
    !source ||
    source.routeAccessGrant !== true ||
    source.rights?.batchRouteQuery !== true ||
    !["cache", "retention", "production", "derivativePersistence"].every(
      (k) => source.rights[k] === true,
    )
  )
    issues.push("PROVIDER_RIGHTS_UNCONFIRMED");
  if (
    !source?.sourceUrl ||
    observation.sourceRef !== source.sourceUrl ||
    !hex(observation.evidenceSha256) ||
    !source?.routeEvidenceHashes?.includes(observation.evidenceSha256)
  )
    issues.push("ROUTE_PROVENANCE_UNVERIFIED");
  if (
    observation.poiId !== edge.poiId ||
    observation.nodeId !== edge.nodeId ||
    observation.direction !== edge.direction ||
    observation.fromId !== edge.from.id ||
    observation.toId !== edge.to.id
  )
    issues.push("IDENTITY_OR_DIRECTION_MISMATCH");
  if (!["walking", "transit", "taxi"].includes(observation.mode))
    issues.push("UNSUPPORTED_USABLE_MODE");
  if (
    observation.endpointBindingVerified !== true ||
    observation.completeLastMile !== true ||
    observation.currentPublicAccess !== true
  )
    issues.push("ENDPOINT_OR_PUBLIC_ACCESS_UNVERIFIED");
  const barriers = [
    "riverBridge",
    "railHighway",
    "mountain",
    "gated",
    "impossibleWalking",
  ];
  if (
    barriers.some(
      (k) =>
        !["clear", "verified_passage", "not_applicable"].includes(
          observation.barrierChecks?.[k],
        ),
    )
  )
    issues.push("BARRIER_REVIEW_INCOMPLETE");
  const m = observation.metrics;
  if (!m || !Number.isFinite(m.durationTypicalMin) || m.durationTypicalMin <= 0)
    issues.push("DURATION_UNVERIFIED");
  if (
    !Number.isFinite(observation.confidence) ||
    observation.confidence <= 0 ||
    observation.confidence > 1
  )
    issues.push("CONFIDENCE_MISSING");
  if (
    observation.measurementMethod === "geodesic" ||
    observation.measurementMethod === "estimated_speed" ||
    !observation.measurementMethod
  )
    issues.push("STRAIGHT_DISTANCE_OR_ESTIMATE_AS_ROUTE");
  if (observation.mode === "walking") {
    if (
      !m ||
      !Number.isFinite(m.distanceM) ||
      m.distanceM <= 0 ||
      m.walkDistanceM !== m.distanceM ||
      !Number.isFinite(m.walkDurationMin) ||
      m.walkDurationMin <= 0 ||
      m.walkDurationMin !== m.durationTypicalMin
    )
      issues.push("WALKING_ROUTE_DISTANCE_TIME_REQUIRED");
    if (
      m?.distanceM === edge.straightDistanceM &&
      observation.independentRouteGeometryVerified !== true
    )
      issues.push("STRAIGHT_DISTANCE_AS_ROUTE");
    if (m?.distanceM < edge.straightDistanceM * 0.95)
      issues.push("IMPOSSIBLE_WALKING_ROUTE");
    if (
      edge.straightDistanceM > 0 &&
      m?.distanceM / edge.straightDistanceM >= config.extremeDetourRatio &&
      observation.detourReviewed !== true
    )
      issues.push("EXTREME_DETOUR_UNREVIEWED");
  }
  return issues;
}
export function enrichDirection(edge, observations, rights, config, blocker) {
  const rejected = [];
  let result = edge;
  for (const obs of observations.filter(
    (o) =>
      o.poiId === edge.poiId &&
      o.nodeId === edge.nodeId &&
      o.direction === edge.direction,
  )) {
    const source = rights.sources.find((s) => s.sourceId === obs.sourceId);
    const issues = observationIssues(edge, obs, source, config);
    if (blocker?.allGeneralTouristModesBlocked)
      issues.push("CANONICAL_VENUE_PERMANENTLY_CLOSED");
    if (issues.length) {
      rejected.push({ edgeId: edge.edgeId, sourceRef: obs.sourceRef, issues });
      continue;
    }
    result = applyLicensedObservation(
      result,
      obs.mode,
      obs.metrics,
      obs.sourceRef,
      { batch: true, cache: true, retention: true, production: true },
    );
    result = {
      ...result,
      confidence: obs.confidence,
      sourceRefs: [...new Set([...result.sourceRefs, obs.sourceRef])],
      provenance: {
        ...result.provenance,
        routeEvidence: [
          ...(result.provenance.routeEvidence ?? []),
          {
            sha256: obs.evidenceSha256,
            sourceId: obs.sourceId,
            direction: obs.direction,
          },
        ],
      },
    };
  }
  const usable = ["walking", "transit", "taxi"].some(
    (k) => result.modes[k].status === "resolved",
  );
  const walk = result.modes.walking.metrics;
  result = {
    ...result,
    admission: usable ? "CONFIRMED_DIRECTION" : "UNCONFIRMED_CANDIDATE",
    walkingRouteDistanceM: walk?.distanceM ?? null,
    walkingDurationMin: walk?.walkDurationMin ?? null,
    detourRatio: walk?.detourRatio ?? null,
  };
  if (blocker?.allGeneralTouristModesBlocked) {
    for (const mode of ["walking", "driving", "transit", "taxi"])
      result.modes[mode] = {
        status: "unavailable",
        reason: "route_unavailable",
        metrics: null,
      };
    result = {
      ...result,
      admission: "UNCONFIRMED_CANDIDATE",
      confidence: null,
    };
  }
  assert.deepEqual(validateMobilityEdge(result), []);
  return { edge: result, rejected };
}
export function generateBatch(
  pois,
  admissions,
  researchRows,
  observations,
  rights,
  config,
  blockers,
) {
  const index = spatialIndex(admissions, config.cellDegrees),
    research = new Map(researchRows.map((r) => [r.poiId, r]));
  const edges = [],
    pending = [],
    decisions = [],
    unresolved = [],
    scans = [],
    traces = [],
    rejectedObservations = [];
  for (const poi of pois) {
    const r = research.get(poi.internalId);
    assert.ok(r, "RESEARCH_MISSING:" + poi.internalId);
    const blocker = blockers.find((b) => b.poiId === poi.internalId),
      selection = candidatesFor(poi, index, r, config);
    decisions.push(...selection.decisions);
    scans.push(selection.scan);
    let acceptedPairs = 0;
    for (const { node, decision } of selection.retained) {
      const pair = ["POI_TO_NODE", "NODE_TO_POI"].map((direction) => {
        const value = enrichDirection(
          directedCandidate(poi, node, decision, direction, config),
          observations,
          rights,
          config,
          blocker,
        );
        rejectedObservations.push(...value.rejected);
        return value.edge;
      });
      // A one-way observation cannot silently satisfy the required two directed
      // usable edges. Keep both candidates until each direction is evidenced.
      const pairAccepted = pair.every(
        (e) => e.admission === "CONFIRMED_DIRECTION",
      );
      if (pairAccepted) acceptedPairs++;
      for (const e of pair) {
        if (pairAccepted)
          edges.push({ ...e, admission: "ACCEPTED_USABLE_ACCESS" });
        else
          pending.push({
            ...e,
            admission: "UNCONFIRMED_CANDIDATE",
            pendingReason:
              e.admission === "CONFIRMED_DIRECTION"
                ? "REVERSE_DIRECTION_NOT_CONFIRMED"
                : "NO_LEGAL_COMPLETE_DIRECTIONAL_ROUTE",
          });
        traces.push({
          edgeId: e.edgeId,
          poiId: e.poiId,
          nodeId: e.nodeId,
          direction: e.direction,
          candidateDecisionId: e.candidateDecisionId,
          scores: e.scores,
          confidence: e.confidence,
          countedAsUsable: pairAccepted,
        });
      }
    }
    if (!acceptedPairs)
      unresolved.push({
        poiId: poi.internalId,
        masterCode: poi.masterCode,
        result: "NO_CONFIRMED_ACCESS",
        reviewStatus: blocker ? "HUMAN_REVIEW_REQUIRED" : "EVIDENCE_REQUIRED",
        candidateNodes: selection.retained.length,
        confirmedUsableNodes: 0,
        reasons: [
          ...(blocker ? [blocker.reason] : []),
          "NO_LEGAL_COMPLETE_DIRECTIONAL_ROUTE",
          ...(selection.retained.length ? [] : ["NO_ADMITTED_RELEVANT_NODE"]),
        ],
        officialSourceRefs: r.sourceRefs,
        barrierReviewTriggers: r.barrierReviewTriggers,
        explanation: r.finding,
        walking: null,
        localTransit: null,
        taxi: null,
      });
  }
  return {
    edges,
    pending,
    decisions,
    unresolved,
    scans,
    traces,
    rejectedObservations,
  };
}
export function qualityAnomalies(edges, pois, config) {
  const anomalies = [],
    seen = new Set(),
    byPoi = new Map(pois.map((p) => [p.internalId, []])),
    metricGroups = new Map(),
    hubs = new Map();
  for (const e of edges) {
    if (seen.has(e.edgeId))
      anomalies.push({ edgeId: e.edgeId, reason: "DUPLICATE_ACCEPTED_EDGE" });
    seen.add(e.edgeId);
    if (!byPoi.has(e.poiId))
      anomalies.push({ edgeId: e.edgeId, reason: "IDENTITY_MISMATCH" });
    else byPoi.get(e.poiId).push(e);
    if (
      e.accessRole === "major_hub" &&
      e.straightDistanceM > config.localRadiusM
    )
      hubs.set(e.nodeId, new Set([...(hubs.get(e.nodeId) ?? []), e.poiId]));
    for (const mode of ["walking", "transit", "taxi"])
      if (e.modes[mode].status === "resolved") {
        const m = e.modes[mode].metrics,
          k = stable([mode, m.distanceM, m.durationTypicalMin]);
        metricGroups.set(k, [...(metricGroups.get(k) ?? []), e.edgeId]);
        if (m.detourRatio >= config.extremeDetourRatio)
          anomalies.push({
            edgeId: e.edgeId,
            reason: "EXTREME_DETOUR",
            reviewed: true,
          });
        if (
          m.distanceM !== null &&
          m.distanceM % 100 === 0 &&
          m.durationTypicalMin % 5 === 0
        )
          anomalies.push({
            edgeId: e.edgeId,
            reason: "ROUND_NUMBER_METRICS_REQUIRE_REVIEW",
          });
      }
  }
  for (const [nodeId, p] of hubs)
    if (p.size / pois.length > config.maximumSharedRemoteHubFraction)
      anomalies.push({
        nodeId,
        reason: "SHARED_REMOTE_HUB",
        poiIds: [...p].sort(),
      });
  for (const [poiId, es] of byPoi)
    if (
      es.some((e) => e.accessRole === "major_hub") &&
      !es.some((e) => e.accessRole === "local_node")
    )
      anomalies.push({ poiId, reason: "LOCAL_MISSING_REMOTE_HUB_ONLY" });
  for (const [key, ids] of metricGroups)
    if (
      ids.length >= 6 &&
      ids.length / Math.max(1, edges.length) >=
        config.placeholderConcentrationFraction
    )
      anomalies.push({
        metricKey: key,
        edgeIds: ids,
        reason: "IDENTICAL_METRIC_CONCENTRATION",
      });
  const counts = [...byPoi.values()].map(
    (es) => new Set(es.map((e) => e.nodeId)).size,
  );
  for (const count of [3, 5, 8])
    if (
      counts.filter((n) => n === count).length >= 10 &&
      counts.filter((n) => n === count).length / pois.length >=
        config.placeholderConcentrationFraction
    )
      anomalies.push({ count, reason: "FIXED_NODE_COUNT_CONCENTRATION" });
  return anomalies;
}
