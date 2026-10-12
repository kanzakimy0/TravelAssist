import type { CanonicalPoiDatasetV1 } from "../contracts/poi/types";
import { parseCanonicalPoiDatasetV1 } from "../contracts/poi/validation";
import type { MasterCodeRegistryV1 } from "../master-code/types";
import { parseMasterCodeRegistryV1 } from "../master-code/validation";

export const POI_EDGE_SCHEMA_VERSION = "1.0" as const;
export type GraphRef = { kind: "poi" | "transport"; id: string };
export type Coordinate = { longitude: number; latitude: number };
export type EdgeLayer =
  | "poi_local"
  | "poi_transport_access"
  | "transport_network"
  | "transport_poi_access";
export type EdgeRelation =
  | "nearby"
  | "same_area"
  | "same_city"
  | "regional"
  | "access_to_transport_node"
  | "special";
export type MobilityMode = "walking" | "driving" | "transit" | "taxi";
export type UnresolvedReason =
  | "provider_rights_unconfirmed"
  | "route_not_observed"
  | "route_unavailable"
  | "missing_coordinate"
  | "transport_network_unavailable";

export interface PoiGraphNode {
  poiId: string;
  masterCode: string;
  point: Coordinate;
  regionRef: string;
  cityRef: string | null;
  areaRef: string | null;
}

export interface TransportNodeV1 {
  nodeId: string;
  kind: "railway_station" | "airport" | "bus_terminal";
  point: Coordinate;
  regionRef: string;
  sourceRef: string;
}

export interface EdgeCandidateV1 {
  schemaVersion: typeof POI_EDGE_SCHEMA_VERSION;
  from: GraphRef;
  to: GraphRef;
  directed: true;
  layer: EdgeLayer;
  relation: EdgeRelation;
  straightDistanceM: number;
}

export interface EdgeModeMetricsV1 {
  durationTypicalMin: number;
  durationP90Min: number | null;
  distanceM: number | null;
  costMinYen: number | null;
  costTypicalYen: number | null;
  costMaxYen: number | null;
  walkDistanceM: number | null;
  walkDurationMin: number | null;
  transfers: number | null;
  frequencyMin: number | null;
  firstDeparture: string | null;
  lastDeparture: string | null;
  elevationGainM: number | null;
  stairs: boolean | null;
  accessibility: "good" | "mixed" | "poor" | "unknown" | null;
  detourRatio: number | null;
  timeBucket:
    | "weekday_morning"
    | "weekday_daytime"
    | "weekday_evening"
    | "weekend_morning"
    | "weekend_daytime"
    | "weekend_evening"
    | null;
}

export type ModeResolutionV1 =
  | {
      status: "unresolved" | "unavailable";
      reason: UnresolvedReason;
      metrics: null;
    }
  | { status: "resolved"; reason: null; metrics: EdgeModeMetricsV1 };

export interface ScoreTraceV1 {
  value: number;
  components: Record<string, number>;
  formula: string;
}

export interface PoiMobilityEdgeV1 extends EdgeCandidateV1 {
  modes: Record<MobilityMode, ModeResolutionV1>;
  scores: {
    mode: MobilityMode | null;
    convenience: ScoreTraceV1 | null;
    reliability: ScoreTraceV1 | null;
    difficulty: ScoreTraceV1 | null;
  };
  qualityFlags: ("extreme_walk_detour" | "walk_accessibility_unknown")[];
  confidence: number | null;
  source: {
    kind: "geodesic_candidate" | "licensed_route" | "fixture";
    ref: string;
  };
  generatedAt: string;
}

export interface CandidateGenerationConfig {
  nearestK: number;
  sameAreaK: number;
  sameCityK: number;
  maxDegree: number;
  maxStraightDistanceM: number;
  nearbyDistanceM: number;
  accessNodeK: number;
  accessRadiusM: number;
  extremeDetourRatio: number;
}

export const DEFAULT_EDGE_CONFIG: CandidateGenerationConfig = {
  nearestK: 24,
  sameAreaK: 16,
  sameCityK: 16,
  maxDegree: 64,
  maxStraightDistanceM: 30_000,
  nearbyDistanceM: 2_000,
  accessNodeK: 6,
  accessRadiusM: 4_000,
  extremeDetourRatio: 3,
};

export interface RejectedNode {
  nodeId: string;
  reason: "missing_coordinate" | "invalid_coordinate" | "duplicate_id";
}

const CELL_DEGREES = 0.05;
const cellKey = (lat: number, lon: number) =>
  String(Math.floor(lat / CELL_DEGREES)) +
  ":" +
  String(Math.floor(lon / CELL_DEGREES));
const edgeKey = (from: GraphRef, to: GraphRef) =>
  from.kind + ":" + from.id + ">" + to.kind + ":" + to.id;

export function validCoordinate(point: unknown): point is Coordinate {
  if (!point || typeof point !== "object") return false;
  const candidate = point as Partial<Coordinate>;
  return (
    typeof candidate.latitude === "number" &&
    Number.isFinite(candidate.latitude) &&
    candidate.latitude >= -90 &&
    candidate.latitude <= 90 &&
    typeof candidate.longitude === "number" &&
    Number.isFinite(candidate.longitude) &&
    candidate.longitude >= -180 &&
    candidate.longitude <= 180
  );
}

export function straightDistanceM(a: Coordinate, b: Coordinate): number {
  const radians = Math.PI / 180;
  const latDelta = (b.latitude - a.latitude) * radians;
  const lonDelta = (b.longitude - a.longitude) * radians;
  const h =
    Math.sin(latDelta / 2) ** 2 +
    Math.cos(a.latitude * radians) *
      Math.cos(b.latitude * radians) *
      Math.sin(lonDelta / 2) ** 2;
  return Math.round(12_742_000 * Math.asin(Math.min(1, Math.sqrt(h))));
}

function checkedConfig(config: CandidateGenerationConfig) {
  for (const key of [
    "nearestK",
    "sameAreaK",
    "sameCityK",
    "maxDegree",
    "accessNodeK",
  ] as const)
    if (!Number.isInteger(config[key]) || config[key] < 0 || config[key] > 100)
      throw new TypeError("Invalid graph limit: " + key);
  if (config.maxDegree < 1 || config.maxDegree > 80)
    throw new TypeError("maxDegree must be 1..80");
  for (const key of [
    "maxStraightDistanceM",
    "nearbyDistanceM",
    "accessRadiusM",
    "extremeDetourRatio",
  ] as const)
    if (!Number.isFinite(config[key]) || config[key] <= 0)
      throw new TypeError("Invalid graph radius/ratio: " + key);
  if (config.nearbyDistanceM > config.maxStraightDistanceM)
    throw new TypeError("nearbyDistanceM exceeds local radius");
}

export function classifyPoiPair(
  from: PoiGraphNode,
  to: PoiGraphNode,
  distanceM: number,
  config: CandidateGenerationConfig = DEFAULT_EDGE_CONFIG,
): EdgeRelation {
  if (distanceM <= config.nearbyDistanceM) return "nearby";
  if (from.areaRef && from.areaRef === to.areaRef) return "same_area";
  if (from.cityRef && from.cityRef === to.cityRef) return "same_city";
  return "regional";
}

/**
 * Converts only an explicitly authorized Canonical dataset with active,
 * matching application Master Codes. Candidate workbooks have no path here.
 */
export function admittedGraphNodes(
  dataset: unknown,
  registry: unknown,
  authorization: {
    scope: "CANONICAL_POI_PILOT_100";
    runtimeImportAuthorized: true;
    internalIds: readonly string[];
  },
): { nodes: PoiGraphNode[]; rejected: RejectedNode[] } {
  if (
    authorization?.scope !== "CANONICAL_POI_PILOT_100" ||
    authorization.runtimeImportAuthorized !== true
  )
    throw new TypeError("Canonical runtime authorization required");
  const parsed = parseCanonicalPoiDatasetV1(dataset);
  const codes = parseMasterCodeRegistryV1(registry);
  if (!parsed.ok || !codes.ok)
    throw new TypeError("Canonical dataset or Master Code registry invalid");
  const byId = new Map(
    parsed.value.records.map((poi) => [poi.internalId, poi]),
  );
  const activeCodes = new Map(
    codes.value.entries
      .filter(
        (entry) =>
          entry.lifecycleStatus === "active" &&
          entry.entityType.startsWith("poi."),
      )
      .map((entry) => [entry.entityRef, entry]),
  );
  const ids = [...authorization.internalIds];
  if (new Set(ids).size !== ids.length || ids.length !== byId.size)
    throw new TypeError(
      "Authorized ID set must exactly match Canonical dataset",
    );
  const nodes: PoiGraphNode[] = [];
  const rejected: RejectedNode[] = [];
  for (const id of ids) {
    const poi = byId.get(id);
    if (!poi) throw new TypeError("Authorized Canonical ID missing");
    const code = activeCodes.get(id);
    if (
      !code ||
      code.masterCode !== poi.masterCode ||
      code.entityType !== "poi." + poi.classification.primary
    )
      throw new TypeError("Active Master Code binding missing");
    if (!poi.location.point) {
      rejected.push({ nodeId: id, reason: "missing_coordinate" });
      continue;
    }
    if (!validCoordinate(poi.location.point)) {
      rejected.push({ nodeId: id, reason: "invalid_coordinate" });
      continue;
    }
    const region = poi.regionRelations.find(
      (relation) => relation.primary && relation.relationType === "located_in",
    );
    if (!region) throw new TypeError("Primary region missing");
    const address = poi.location.address;
    nodes.push({
      poiId: id,
      masterCode: code.masterCode,
      point: poi.location.point,
      regionRef: region.regionRef,
      cityRef:
        address?.prefecture && address.municipality
          ? address.prefecture + "/" + address.municipality
          : null,
      areaRef: null,
    });
  }
  return { nodes, rejected };
}

export function generatePoiCandidates(
  input: readonly PoiGraphNode[],
  config: CandidateGenerationConfig = DEFAULT_EDGE_CONFIG,
): { edges: EdgeCandidateV1[]; rejected: RejectedNode[] } {
  checkedConfig(config);
  const rejected: RejectedNode[] = [];
  const nodes: PoiGraphNode[] = [];
  const seen = new Set<string>();
  for (const node of input) {
    if (seen.has(node.poiId)) {
      rejected.push({ nodeId: node.poiId, reason: "duplicate_id" });
      continue;
    }
    seen.add(node.poiId);
    if (!validCoordinate(node.point)) {
      rejected.push({
        nodeId: node.poiId,
        reason: node.point ? "invalid_coordinate" : "missing_coordinate",
      });
      continue;
    }
    nodes.push(node);
  }
  nodes.sort((a, b) => a.poiId.localeCompare(b.poiId));
  const grid = new Map<string, PoiGraphNode[]>();
  for (const node of nodes) {
    const key = cellKey(node.point.latitude, node.point.longitude);
    const bucket = grid.get(key) ?? [];
    bucket.push(node);
    grid.set(key, bucket);
  }
  const edges: EdgeCandidateV1[] = [];
  for (const from of nodes) {
    const latitudeRadius = config.maxStraightDistanceM / 111_000;
    const longitudeRadius =
      config.maxStraightDistanceM /
      (111_000 *
        Math.max(0.1, Math.cos((from.point.latitude * Math.PI) / 180)));
    const nearby: { node: PoiGraphNode; distance: number }[] = [];
    for (
      let lat = Math.floor(
        (from.point.latitude - latitudeRadius) / CELL_DEGREES,
      );
      lat <= Math.floor((from.point.latitude + latitudeRadius) / CELL_DEGREES);
      lat += 1
    )
      for (
        let lon = Math.floor(
          (from.point.longitude - longitudeRadius) / CELL_DEGREES,
        );
        lon <=
        Math.floor((from.point.longitude + longitudeRadius) / CELL_DEGREES);
        lon += 1
      )
        for (const to of grid.get(String(lat) + ":" + String(lon)) ?? []) {
          if (to.poiId === from.poiId) continue;
          const distance = straightDistanceM(from.point, to.point);
          if (distance <= config.maxStraightDistanceM)
            nearby.push({ node: to, distance });
        }
    nearby.sort(
      (a, b) =>
        a.distance - b.distance || a.node.poiId.localeCompare(b.node.poiId),
    );
    const selected = new Map<string, (typeof nearby)[number]>();
    const add = (rows: (typeof nearby)[number][], count: number) => {
      let added = 0;
      for (const row of rows) {
        if (selected.size >= config.maxDegree || added >= count) break;
        if (selected.has(row.node.poiId)) continue;
        selected.set(row.node.poiId, row);
        added += 1;
      }
    };
    add(nearby, config.nearestK);
    if (from.areaRef)
      add(
        nearby.filter((row) => row.node.areaRef === from.areaRef),
        config.sameAreaK,
      );
    if (from.cityRef)
      add(
        nearby.filter((row) => row.node.cityRef === from.cityRef),
        config.sameCityK,
      );
    add(nearby, config.maxDegree);
    for (const { node: to, distance } of selected.values())
      edges.push({
        schemaVersion: POI_EDGE_SCHEMA_VERSION,
        from: { kind: "poi", id: from.poiId },
        to: { kind: "poi", id: to.poiId },
        directed: true,
        layer: "poi_local",
        relation: classifyPoiPair(from, to, distance, config),
        straightDistanceM: distance,
      });
  }
  return { edges, rejected };
}

export function generateTransportAccessCandidates(
  pois: readonly PoiGraphNode[],
  transport: readonly TransportNodeV1[],
  config: CandidateGenerationConfig = DEFAULT_EDGE_CONFIG,
): EdgeCandidateV1[] {
  checkedConfig(config);
  const edges: EdgeCandidateV1[] = [];
  const grid = new Map<string, TransportNodeV1[]>();
  const seenTransport = new Set<string>();
  for (const node of transport) {
    if (seenTransport.has(node.nodeId) || !validCoordinate(node.point))
      continue;
    seenTransport.add(node.nodeId);
    const key = cellKey(node.point.latitude, node.point.longitude);
    const bucket = grid.get(key) ?? [];
    bucket.push(node);
    grid.set(key, bucket);
  }
  for (const poi of pois) {
    if (!validCoordinate(poi.point)) continue;
    const latitudeRadius = config.accessRadiusM / 111_000;
    const longitudeRadius =
      config.accessRadiusM /
      (111_000 * Math.max(0.1, Math.cos((poi.point.latitude * Math.PI) / 180)));
    const nearby: { node: TransportNodeV1; distance: number }[] = [];
    for (
      let lat = Math.floor(
        (poi.point.latitude - latitudeRadius) / CELL_DEGREES,
      );
      lat <= Math.floor((poi.point.latitude + latitudeRadius) / CELL_DEGREES);
      lat += 1
    )
      for (
        let lon = Math.floor(
          (poi.point.longitude - longitudeRadius) / CELL_DEGREES,
        );
        lon <=
        Math.floor((poi.point.longitude + longitudeRadius) / CELL_DEGREES);
        lon += 1
      )
        for (const node of grid.get(String(lat) + ":" + String(lon)) ?? []) {
          const distance = straightDistanceM(poi.point, node.point);
          if (distance <= config.accessRadiusM) nearby.push({ node, distance });
        }
    const nearest = nearby
      .sort(
        (a, b) =>
          a.distance - b.distance || a.node.nodeId.localeCompare(b.node.nodeId),
      )
      .slice(0, config.accessNodeK);
    for (const { node, distance } of nearest) {
      for (const [from, to, layer] of [
        [
          { kind: "poi", id: poi.poiId },
          { kind: "transport", id: node.nodeId },
          "poi_transport_access",
        ],
        [
          { kind: "transport", id: node.nodeId },
          { kind: "poi", id: poi.poiId },
          "transport_poi_access",
        ],
      ] as const)
        edges.push({
          schemaVersion: POI_EDGE_SCHEMA_VERSION,
          from,
          to,
          directed: true,
          layer,
          relation: "access_to_transport_node",
          straightDistanceM: distance,
        });
    }
  }
  return edges;
}

const unresolved = (reason: UnresolvedReason): ModeResolutionV1 => ({
  status: "unresolved",
  reason,
  metrics: null,
});

export function candidateToUnresolvedEdge(
  candidate: EdgeCandidateV1,
  generatedAt: string,
): PoiMobilityEdgeV1 {
  if (!Number.isFinite(Date.parse(generatedAt)))
    throw new TypeError("generatedAt is invalid");
  return {
    ...candidate,
    modes: {
      walking: unresolved("route_not_observed"),
      driving: unresolved("provider_rights_unconfirmed"),
      transit: unresolved("provider_rights_unconfirmed"),
      taxi: unresolved("provider_rights_unconfirmed"),
    },
    scores: {
      mode: null,
      convenience: null,
      reliability: null,
      difficulty: null,
    },
    qualityFlags: [],
    confidence: null,
    source: { kind: "geodesic_candidate", ref: "local:haversine-v1" },
    generatedAt,
  };
}

export function calculateScoreTrace(
  mode: MobilityMode,
  metrics: EdgeModeMetricsV1,
): PoiMobilityEdgeV1["scores"] {
  const transfers = mode === "transit" ? metrics.transfers : 0;
  const walkDistanceM =
    mode === "walking" ? metrics.distanceM : metrics.walkDistanceM;
  const walkKm = walkDistanceM === null ? null : walkDistanceM / 1_000;
  const frequency = mode === "transit" ? metrics.frequencyMin : 0;
  const accessibilityPenalty =
    metrics.accessibility === "good"
      ? 0
      : metrics.accessibility === "mixed"
        ? 8
        : metrics.accessibility === "poor"
          ? 20
          : null;
  const sum = (parts: Record<string, number>) =>
    Object.values(parts).reduce((total, value) => total + value, 0);
  const round = (value: number) =>
    Math.round(Math.max(0, Math.min(100, value)) * 100) / 100;
  const conveniencePenalty =
    transfers === null ||
    walkKm === null ||
    frequency === null ||
    accessibilityPenalty === null
      ? null
      : {
          duration: Math.min(50, metrics.durationTypicalMin) * 0.6,
          transfers: transfers * 8,
          walking: Math.min(20, walkKm * 6),
          frequency: Math.min(15, frequency * 0.2),
          accessibility: accessibilityPenalty,
        };
  const convenience =
    conveniencePenalty === null
      ? null
      : {
          value: round(100 - sum(conveniencePenalty)),
          components: conveniencePenalty,
          formula:
            "100 - duration*0.6 - transfers*8 - walkKm*6 - frequencyMin*0.2 - accessibilityPenalty (capped)",
        };
  const reliability =
    metrics.durationP90Min === null || transfers === null || frequency === null
      ? null
      : {
          value: round(
            100 -
              Math.max(0, metrics.durationP90Min - metrics.durationTypicalMin) *
                2 -
              transfers * 5 -
              Math.min(15, frequency * 0.1),
          ),
          components: {
            p90Spread: Math.max(
              0,
              metrics.durationP90Min - metrics.durationTypicalMin,
            ),
            transfers,
            frequency,
          },
          formula:
            "100 - p90Spread*2 - transfers*5 - frequencyMin*0.1 (capped)",
        };
  const difficulty =
    walkKm !== null &&
    metrics.elevationGainM !== null &&
    metrics.stairs !== null &&
    metrics.accessibility !== null &&
    metrics.accessibility !== "unknown"
      ? {
          value: round(
            Math.min(60, walkKm * 12) +
              metrics.elevationGainM * 0.15 +
              (metrics.stairs === true ? 12 : 0) +
              accessibilityPenalty!,
          ),
          components: {
            walkKm,
            elevationGainM: metrics.elevationGainM,
            stairs: metrics.stairs === true ? 1 : 0,
            accessibility: accessibilityPenalty!,
          },
          formula:
            "walkKm*12 + elevationGainM*0.15 + stairs*12 + accessibilityPenalty (capped)",
        }
      : null;
  return { mode, convenience, reliability, difficulty };
}

export function applyLicensedObservation(
  edge: PoiMobilityEdgeV1,
  mode: MobilityMode,
  metrics: EdgeModeMetricsV1,
  sourceRef: string,
  rights: {
    batch: boolean;
    cache: boolean;
    retention: boolean;
    production: boolean;
  },
  config: CandidateGenerationConfig = DEFAULT_EDGE_CONFIG,
): PoiMobilityEdgeV1 {
  if (!Object.values(rights).every(Boolean))
    throw new TypeError("Route rights are not fully approved");
  if (!sourceRef.trim()) throw new TypeError("Route sourceRef is required");
  if (
    !Number.isFinite(metrics.durationTypicalMin) ||
    metrics.durationTypicalMin < 0
  )
    throw new TypeError("Invalid route duration");
  if (
    metrics.durationP90Min !== null &&
    (!Number.isFinite(metrics.durationP90Min) ||
      metrics.durationP90Min < metrics.durationTypicalMin)
  )
    throw new TypeError("Invalid P90 duration");
  if (
    metrics.distanceM !== null &&
    (!Number.isFinite(metrics.distanceM) ||
      metrics.distanceM < edge.straightDistanceM * 0.95)
  )
    throw new TypeError("Invalid actual route distance");
  if (
    mode === "walking" &&
    (metrics.distanceM === null ||
      metrics.walkDistanceM === null ||
      metrics.walkDurationMin === null ||
      Math.abs(metrics.walkDistanceM - metrics.distanceM) > 1)
  )
    throw new TypeError("Walking resolution requires an actual route");
  const ratio =
    mode === "walking" &&
    metrics.distanceM !== null &&
    edge.straightDistanceM > 0
      ? Math.round((metrics.distanceM / edge.straightDistanceM) * 100) / 100
      : null;
  const resolved = { ...metrics, detourRatio: ratio };
  const flags = [...edge.qualityFlags];
  if (ratio !== null && ratio >= config.extremeDetourRatio)
    flags.push("extreme_walk_detour");
  if (mode === "walking" && metrics.accessibility === null)
    flags.push("walk_accessibility_unknown");
  return {
    ...edge,
    modes: {
      ...edge.modes,
      [mode]: { status: "resolved", reason: null, metrics: resolved },
    },
    scores: calculateScoreTrace(mode, resolved),
    qualityFlags: [...new Set(flags)],
    confidence: null,
    source: { kind: "licensed_route", ref: sourceRef },
  };
}

export function validateMobilityEdge(value: PoiMobilityEdgeV1): string[] {
  const issues: string[] = [];
  if (value.schemaVersion !== POI_EDGE_SCHEMA_VERSION)
    issues.push("schemaVersion");
  if (value.directed !== true) issues.push("directed");
  if (value.from.kind === value.to.kind && value.from.id === value.to.id)
    issues.push("self_edge");
  if (!Number.isFinite(value.straightDistanceM) || value.straightDistanceM < 0)
    issues.push("straightDistanceM");
  if (
    value.layer === "poi_local" &&
    (value.from.kind !== "poi" || value.to.kind !== "poi")
  )
    issues.push("poi_local_refs");
  if (
    value.layer === "poi_transport_access" &&
    (value.from.kind !== "poi" || value.to.kind !== "transport")
  )
    issues.push("poi_transport_access_refs");
  if (
    value.layer === "transport_poi_access" &&
    (value.from.kind !== "transport" || value.to.kind !== "poi")
  )
    issues.push("transport_poi_access_refs");
  if (
    value.layer === "transport_network" &&
    (value.from.kind !== "transport" || value.to.kind !== "transport")
  )
    issues.push("transport_network_refs");
  for (const mode of ["walking", "driving", "transit", "taxi"] as const) {
    const resolution = value.modes[mode];
    if (!resolution) {
      issues.push("missing_mode:" + mode);
      continue;
    }
    if (resolution.status !== "resolved" && resolution.metrics !== null)
      issues.push("unresolved_metrics:" + mode);
    if (
      resolution.status === "resolved" &&
      (!resolution.metrics ||
        !Number.isFinite(resolution.metrics.durationTypicalMin) ||
        resolution.metrics.durationTypicalMin < 0)
    )
      issues.push("resolved_metrics:" + mode);
    if (
      resolution.status === "resolved" &&
      resolution.metrics &&
      resolution.metrics.durationP90Min !== null &&
      resolution.metrics.durationP90Min < resolution.metrics.durationTypicalMin
    )
      issues.push("p90:" + mode);
  }
  if (!Number.isFinite(Date.parse(value.generatedAt)))
    issues.push("generatedAt");
  return issues;
}

export function createPoiEdgeLookup(edges: readonly PoiMobilityEdgeV1[]) {
  const byOrigin = new Map<string, PoiMobilityEdgeV1[]>();
  const byPair = new Map<string, PoiMobilityEdgeV1>();
  for (const edge of edges) {
    const issues = validateMobilityEdge(edge);
    if (issues.length) throw new TypeError("Invalid edge: " + issues.join(","));
    const key = edgeKey(edge.from, edge.to);
    if (byPair.has(key)) throw new TypeError("Duplicate directed edge");
    byPair.set(key, edge);
    if (edge.from.kind === "poi") {
      const list = byOrigin.get(edge.from.id) ?? [];
      list.push(edge);
      byOrigin.set(edge.from.id, list);
    }
  }
  return {
    getPoiEdges(fromPoiId: string) {
      return [...(byOrigin.get(fromPoiId) ?? [])];
    },
    getPoiEdge(fromPoiId: string, toPoiId: string) {
      return (
        byPair.get(
          edgeKey({ kind: "poi", id: fromPoiId }, { kind: "poi", id: toPoiId }),
        ) ?? null
      );
    },
    findMobilityOptions(
      fromPoiId: string,
      toPoiId: string,
      context: { avoidStairs?: boolean } = {},
    ) {
      const edge = this.getPoiEdge(fromPoiId, toPoiId);
      if (!edge) return [];
      return (["walking", "driving", "transit", "taxi"] as const)
        .filter((mode) => {
          const item = edge.modes[mode];
          return (
            item.status === "resolved" &&
            !(
              mode === "walking" &&
              edge.qualityFlags.includes("extreme_walk_detour")
            ) &&
            (!context.avoidStairs || item.metrics.stairs !== true)
          );
        })
        .map((mode) => ({ mode, metrics: edge.modes[mode].metrics }))
        .sort(
          (a, b) =>
            (a.metrics?.durationTypicalMin ?? Infinity) -
            (b.metrics?.durationTypicalMin ?? Infinity),
        );
    },
  };
}

export type AuthorizedCanonicalDataset = CanonicalPoiDatasetV1;
export type ActiveCodeRegistry = MasterCodeRegistryV1;
