import { createHash } from "node:crypto";

export const DEFICITS = [
  "DISCONNECTED_T0",
  "DISCONNECTED_T1",
  "CORRIDOR_UNREACHABLE",
  "MISSING_INTERMEDIATE_NODE",
  "SERVICE_PATTERN_GAP",
  "HUB_TRANSFER_GAP",
  "AIRPORT_SURFACE_GAP",
  "ISLAND_FERRY_GAP",
  "HIGHWAY_BUS_GAP",
  "TOURISM_SPECIAL_MODE_GAP",
  "NODE_IDENTITY_GAP",
  "SOURCE_LICENSE_GAP",
  "DYNAMIC_METRIC_ONLY_GAP",
];
export const RAIL_NODE_KIND_BY_MODE = Object.freeze({
  shinkansen: "shinkansen_station",
  conventional_rail: "rail_station",
  metro: "metro_station",
  private_rail: "private_rail_station",
  fixed_guideway: "other_tourism_transport",
  tram: "other_tourism_transport",
});
export const METRICS = [
  "durationTypicalMin",
  "durationP90Min",
  "fareTypicalYen",
  "frequencyTypicalMin",
  "firstDeparture",
  "lastDeparture",
  "calendar",
  "reservation",
  "seasonal",
  "transferTimeMin",
  "accessibility",
];
export const DEFAULT_PARAMETERS = Object.freeze({
  maxNewNodesPerIteration: 100,
  maxNewEdgesPerIteration: 200,
  servicePatternExpansionDepth: 1,
  routeChunkSize: 200,
  hubTransferReviewDepth: 1,
  modeExpansionPriority: [
    "shinkansen",
    "rail",
    "metro",
    "private_rail",
    "airport_bus",
    "ferry",
    "highway_bus",
    "local_bus",
    "flight",
    "ropeway",
    "cable_car",
  ],
  regionalSearchScope: "national",
});
export const canonical = (value) =>
  JSON.stringify(value, function (_key, item) {
    return item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(
          Object.entries(item).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : item;
  });
export const hash = (value) =>
  createHash("sha256")
    .update(
      typeof value === "string" || Buffer.isBuffer(value)
        ? value
        : canonical(value),
    )
    .digest("hex");
export const id = (kind, anchor) =>
  `transport-${kind}:086:${hash(anchor).slice(0, 32)}`;
export const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
export function invariant(condition, message) {
  if (!condition) throw new Error(message);
}
export function unique(rows, key, label) {
  invariant(new Set(rows.map(key)).size === rows.length, `DUPLICATE_${label}`);
}
export const SOURCE_RIGHTS = [
  "RAW_PERSISTENCE_ALLOWED",
  "DERIVED_STATIC_FACTS_ALLOWED",
  "TOPOLOGY_FACT_ONLY_ALLOWED",
  "REFERENCE_ONLY_DISCOVERY",
  "LICENSE_BLOCKED",
];
export function factCallingRestrictions(fact) {
  const rows =
    fact.callingRestrictions ??
    fact.callingStations.map(() => ({ pickupType: "0", dropOffType: "0" }));
  invariant(
    Array.isArray(rows) &&
      rows.length === fact.callingStations.length &&
      rows.every(
        (r) =>
          r &&
          ["0", "1"].includes(r.pickupType) &&
          ["0", "1"].includes(r.dropOffType),
      ),
    "INVALID_FACT_BOARDING_RESTRICTIONS",
  );
  return rows.map(({ pickupType, dropOffType }) => ({
    pickupType,
    dropOffType,
  }));
}
// A through train may cross an operator boundary between passenger calls.
// Keep both operators on that interval without inventing a passenger stop.
export function factThroughOperators(fact) {
  if (!fact.segmentOperatorRefs && !fact.throughServiceReview) return null;
  const review = fact.throughServiceReview;
  const components = fact.callingComponents;
  invariant(
    Array.isArray(components) &&
      components.length === fact.callingStations.length &&
      components.every((c) => typeof c.operator === "string" && c.operator),
    "THROUGH_COMPONENT_OPERATORS_REQUIRED",
  );
  const expected = components
    .slice(0, -1)
    .map((from, i) => [
      ...new Set([from.operator, components[i + 1].operator]),
    ]);
  const operators = [...new Set(components.map((c) => c.operator))];
  const proof = review?.evidence;
  invariant(
    operators.length > 1 &&
      canonical(fact.segmentOperatorRefs) === canonical(expected) &&
      review?.kind === "EXPLICIT_CURRENT_THROUGH_TRAIN" &&
      review.passengerInterchangeRequired === false &&
      typeof review.serviceIdentifier === "string" &&
      !!review.serviceIdentifier &&
      review.serviceIdentifier === fact.reviewedTrainCode &&
      canonical(review.operatorRefs) === canonical(operators) &&
      review.boundaryScope === "BETWEEN_CONSECUTIVE_PASSENGER_CALLS" &&
      typeof proof?.url === "string" &&
      /^[a-f0-9]{64}$/.test(proof.observedResponseSha256 ?? "") &&
      fact.corroboratingEvidence?.some(
        (e) =>
          e.url === proof.url &&
          e.observedResponseSha256 === proof.observedResponseSha256 &&
          e.sourceActionId === proof.sourceActionId,
      ),
    "THROUGH_OPERATOR_FACT_NOT_BOUND",
  );
  return {
    segmentOperatorRefs: expected,
    segmentOperators: expected.map((operators) => operators.join("・")),
    throughServiceReview: review,
  };
}
export function sourceAllowed(source) {
  const decision =
    source?.rightsClass ??
    (source?.persistenceAllowed === true ? "RAW_PERSISTENCE_ALLOWED" : null);
  const minimumFacts = [
    "DERIVED_STATIC_FACTS_ALLOWED",
    "TOPOLOGY_FACT_ONLY_ALLOWED",
  ].includes(decision);
  return (
    (decision === "RAW_PERSISTENCE_ALLOWED" ||
      (minimumFacts &&
        source?.rawPayloadRetained === false &&
        source?.rightsReview?.scope ===
          "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS" &&
        source?.rightsReview?.termsUrl &&
        source?.rightsReview?.reason)) &&
    source?.derivedDataAllowed === true &&
    source?.redistributionAllowed === true &&
    /^[a-f0-9]{64}$/.test(source?.contentSha256 ?? "") &&
    !!source?.url &&
    !!source?.observedAt &&
    !!source?.rightsDecision
  );
}
export function verifyEvidence(refs, sources, evidence) {
  return (
    refs?.length > 0 &&
    refs.every((ref) => {
      const row = evidence.get(ref);
      const source = sources.get(row?.sourceId);
      return (
        row &&
        sourceAllowed(source) &&
        row.sourceSha256 === source.contentSha256 &&
        !!row.locator &&
        row.record &&
        hash(row.record) === row.recordSha256
      );
    })
  );
}
// A current operator/line may differ from archival S12 only through a reviewed,
// dated merger fact. Station codes stay exact; this is not a fuzzy name alias.
export function reviewedRailTransition(selector, fact, observedAt) {
  const review = selector.operatorTransitionReview;
  if (!review) return null;
  const matches = (fact.operatorTransitions ?? []).filter(
    (t) => t.transitionId === review.transitionId,
  );
  invariant(matches.length === 1, "RAIL_TRANSITION_NOT_UNIQUE");
  const transition = matches[0];
  invariant(
    transition.method === "OFFICIAL_MERGER_SAME_PHYSICAL_STATIONS" &&
      transition.fromOperator &&
      transition.fromLine &&
      transition.toOperator === selector.operator &&
      transition.toLine === selector.line &&
      /^\d{6}$/.test(review.stationCode ?? "") &&
      /^\d{4}-\d{2}-\d{2}$/.test(transition.effectiveDate ?? "") &&
      Number.isFinite(Date.parse(transition.effectiveDate)) &&
      Number.isFinite(Date.parse(observedAt)) &&
      Date.parse(transition.effectiveDate) <= Date.parse(observedAt) &&
      transition.fromOperator !== transition.toOperator &&
      transition.evidence?.sourceActionId &&
      transition.evidence?.url &&
      /^[a-f0-9]{64}$/.test(
        transition.evidence?.observedResponseSha256 ?? "",
      ) &&
      (fact.corroboratingEvidence ?? []).some(
        (r) => canonical(r) === canonical(transition.evidence),
      ),
    "RAIL_TRANSITION_REVIEW_REQUIRED",
  );
  return { ...transition, stationCode: review.stationCode };
}
function railTransitionBound(node, sources, evidence) {
  if (!node.identityTransition) return false;
  return (
    node.evidenceRefs?.some((ref) => {
      if (!verifyEvidence([ref], sources, evidence)) return false;
      const row = evidence.get(ref),
        fact = row.record;
      return (fact.callingComponents ?? fact.components ?? []).some(
        (selector) => {
          try {
            const t = reviewedRailTransition(
              selector,
              fact,
              sources.get(row.sourceId)?.observedAt,
            );
            return (
              t &&
              canonical(t) === canonical(node.identityTransition) &&
              selector.name === node.canonicalNameJa &&
              selector.mode === node.mode &&
              t.stationCode === node.identityRecord.stationCode &&
              t.fromOperator === node.identityRecord.operator &&
              t.fromLine === node.identityRecord.line &&
              node.operatorRefs.length === 1 &&
              node.operatorRefs[0] === t.toOperator &&
              node.lineRefs.length === 1 &&
              node.lineRefs[0] === t.toLine
            );
          } catch {
            return false;
          }
        },
      );
    }) ?? false
  );
}
// Reuse only an already admitted, exact licensed GTFS boarding point. This
// does not collapse parent stations or infer access from matching names.
export function reviewedGtfsComponent(selector, nodes, sources, evidence) {
  const review = selector.gtfsIdentity;
  invariant(
    review &&
      review.method === "EXACT_LICENSED_GTFS_STOP_AND_CURRENT_INTERCHANGE" &&
      review.currentPassengerAccessReview &&
      selector.mode === undefined,
    "GTFS_COMPONENT_REVIEW_REQUIRED",
  );
  const source = sources.get(review.sourceId);
  const anchor = `${review.sourceId}:stop:${review.stopId}`;
  const node = nodes.get(id("node", anchor));
  invariant(
    sourceAllowed(source) &&
      source.persistenceAllowed === true &&
      source.retainedArchive &&
      source.contentSha256 === review.sourceArchiveSha256 &&
      source.agencies?.some((a) => a.agency_name === selector.operator),
    "GTFS_COMPONENT_SOURCE_MISMATCH",
  );
  invariant(
    node &&
      node.decision === "ADMIT_TASK_086_TOPOLOGY" &&
      node.origin === "TASK_086_INDEPENDENT_GTFS" &&
      node.identityAnchor === anchor &&
      ["bus_stop", "ferry_port"].includes(node.nodeKind) &&
      node.nodeKind === selector.nodeKind &&
      node.canonicalNameJa === selector.name &&
      node.operatorRefs.includes(selector.operator) &&
      node.lineRefs.includes(selector.line) &&
      selector.line.startsWith(review.sourceId + ":route:") &&
      node.identityRecord.stop_id === review.stopId &&
      node.identityRecord.stop_name === selector.name &&
      node.identityRecord.platform_code === review.expectedPlatformCode &&
      hash(node.identityRecord) === review.recordSha256 &&
      node.latitude === Number(node.identityRecord.stop_lat) &&
      node.longitude === Number(node.identityRecord.stop_lon) &&
      node.evidenceRefs.some((ref) => {
        const row = evidence.get(ref);
        return (
          verifyEvidence([ref], sources, evidence) &&
          row.sourceId === review.sourceId &&
          row.locator === "stops.txt:" + review.stopId &&
          row.recordSha256 === review.recordSha256 &&
          canonical(row.record) === canonical(node.identityRecord)
        );
      }),
    "GTFS_COMPONENT_IDENTITY_MISMATCH",
  );
  return node;
}
export function admitNodes(candidates, sources, evidence, prior = []) {
  unique(candidates, (n) => n.identityAnchor, "NODE_ANCHOR");
  const previous = new Map(prior.map((n) => [n.nodeId, n]));
  return candidates
    .map((node) => {
      const nodeId = id("node", node.identityAnchor);
      const identitySignature = hash([
        node.identityAnchor,
        node.canonicalNameJa,
        node.nodeKind,
        node.operatorRefs,
      ]);
      const reasons = [];
      if (
        node.origin === "TASK_086_INDEPENDENT_GTFS" &&
        (Number(node.identityRecord.stop_lat) !== node.latitude ||
          Number(node.identityRecord.stop_lon) !== node.longitude ||
          node.identityRecord.stop_name !== node.canonicalNameJa ||
          !node.identityAnchor.endsWith(":stop:" + node.identityRecord.stop_id))
      )
        reasons.push("IDENTITY_SOURCE_BINDING_MISMATCH");
      if (
        node.origin === "TASK_086_INDEPENDENT_S12_AND_OFFICIAL_SERVICE" &&
        (node.nodeKind !== RAIL_NODE_KIND_BY_MODE[node.mode] ||
          node.canonicalNameJa !== node.identityRecord.stationName ||
          node.latitude !== node.identityRecord.latitude ||
          node.longitude !== node.identityRecord.longitude ||
          (node.identityTransition
            ? !railTransitionBound(node, sources, evidence)
            : node.operatorRefs.length !== 1 ||
              node.operatorRefs[0] !== node.identityRecord.operator ||
              !node.lineRefs.includes(node.identityRecord.line)))
      )
        reasons.push("IDENTITY_SOURCE_BINDING_MISMATCH");

      if (
        node.origin === "TASK_086_INDEPENDENT_C28_AND_CURRENT_ACCESS" &&
        (node.canonicalNameJa !== node.identityRecord.airportName ||
          node.latitude !== node.identityRecord.latitude ||
          node.longitude !== node.identityRecord.longitude ||
          node.nodeKind !== "airport" ||
          node.mode !== "flight" ||
          node.operatorRefs.length !== 1 ||
          node.operatorRefs[0] !==
            "airport-facility:" + node.identityRecord.referencePointId ||
          node.lineRefs.length !== 1 ||
          node.lineRefs[0] !==
            "airport:" + node.identityRecord.referencePointId)
      )
        reasons.push("IDENTITY_SOURCE_BINDING_MISMATCH");
      if (
        node.origin ===
          "TASK_086_INDEPENDENT_P36_AND_CURRENT_TERMINAL_ACCESS" &&
        (node.canonicalNameJa !== node.identityRecord.stopName ||
          node.latitude !== node.identityRecord.latitude ||
          node.longitude !== node.identityRecord.longitude ||
          node.nodeKind !== "bus_terminal" ||
          node.mode !== "highway_bus" ||
          node.operatorRefs.length !== 1 ||
          node.operatorRefs[0] !== node.identityRecord.operator ||
          node.lineRefs.length !== 1 ||
          node.lineRefs[0] !== "p36-stop:" + node.identityRecord.stopRecordId)
      )
        reasons.push("IDENTITY_SOURCE_BINDING_MISMATCH");
      if (
        node.origin === "TASK_086_INDEPENDENT_P11_AND_CURRENT_SERVICE" &&
        (node.identityAnchor !== "p11:22:" + node.identityRecord.stopRecordId ||
          node.canonicalNameJa !== node.identityRecord.stopName ||
          node.latitude !== node.identityRecord.latitude ||
          node.longitude !== node.identityRecord.longitude ||
          node.nodeKind !== "bus_stop" ||
          !["airport_bus", "local_bus"].includes(node.mode) ||
          node.mode !== node.independentReview?.mode ||
          node.operatorRefs.length !== 1 ||
          node.operatorRefs[0] !== node.identityRecord.operator ||
          node.lineRefs.length !== 1 ||
          node.lineRefs[0] !== "p11-stop:" + node.identityRecord.stopRecordId)
      )
        reasons.push("IDENTITY_SOURCE_BINDING_MISMATCH");
      if (node.origin === "TASK_084_V1" || node.rejectedV1Identity)
        reasons.push("REJECTED_V1");
      if (
        !node.independentReview ||
        node.independentReview.decision !== "ADMIT_TASK_086_TOPOLOGY" ||
        node.independentReview.recordSha256 !== hash(node.identityRecord)
      )
        reasons.push("INDEPENDENT_REVIEW_REQUIRED");
      if (
        !node.identityAnchor ||
        !node.canonicalNameJa ||
        !node.nodeKind ||
        !node.operatorRefs?.length ||
        !node.lineRefs?.length
      )
        reasons.push("IDENTITY_FIELDS_MISSING");
      if (
        !Number.isFinite(node.latitude) ||
        !Number.isFinite(node.longitude) ||
        node.latitude < -90 ||
        node.latitude > 90 ||
        node.longitude < -180 ||
        node.longitude > 180
      )
        reasons.push("INVALID_COORDINATES");
      if (
        !verifyEvidence(node.evidenceRefs, sources, evidence) ||
        !node.evidenceRefs?.some(
          (ref) =>
            evidence.get(ref)?.recordSha256 === hash(node.identityRecord),
        )
      )
        reasons.push("SOURCE_LICENSE_OR_PROVENANCE");
      if (!node.hubSemantics || (node.parentHubId && !node.hubEvidenceRef))
        reasons.push("HUB_SEMANTICS_MISSING");
      if (
        previous.has(nodeId) &&
        previous.get(nodeId).identitySignature !== identitySignature
      )
        reasons.push("IDENTITY_REBIND");
      return {
        ...node,
        nodeId,
        identitySignature,
        decision: reasons.length
          ? reasons.some((r) =>
              [
                "REJECTED_V1",
                "IDENTITY_REBIND",
                "INVALID_COORDINATES",
              ].includes(r),
            )
            ? "REJECT"
            : "HOLD"
          : "ADMIT_TASK_086_TOPOLOGY",
        reasons,
      };
    })
    .sort((a, b) => compare(a.nodeId, b.nodeId));
}
export function metricFields(values, sources) {
  return Object.fromEntries(
    METRICS.map((field) => {
      const item = values?.[field];
      if (item?.value !== null && item?.value !== undefined) {
        const source = sources.get(item.sourceId);
        invariant(
          sourceAllowed(source) &&
            (!source.rightsClass ||
              source.metricPersistenceAllowed === true ||
              source.rightsClass === "RAW_PERSISTENCE_ALLOWED") &&
            item.sourceSha256 === source.contentSha256 &&
            item.observedAt &&
            item.validFrom &&
            item.validTo &&
            item.freshnessClass &&
            item.rightsDecision === source.rightsDecision,
          `METRIC_PROVENANCE:${field}`,
        );
        if (
          [
            "durationTypicalMin",
            "durationP90Min",
            "fareTypicalYen",
            "frequencyTypicalMin",
            "transferTimeMin",
          ].includes(field)
        )
          invariant(
            Number.isFinite(item.value) && item.value >= 0,
            `INVALID_METRIC:${field}`,
          );
        return [field, { status: "resolved", ...item }];
      }
      return [
        field,
        {
          status: "unresolved",
          value: null,
          reason: "NO_LICENSED_FIELD_OBSERVATION",
        },
      ];
    }),
  );
}
export function generatePattern(
  pattern,
  nodes,
  sources,
  evidence,
  generatedAt,
) {
  invariant(
    pattern.direction !== null &&
      pattern.direction !== undefined &&
      pattern.direction !== "unknown",
    "PATTERN_DIRECTION_UNRESOLVED",
  );
  invariant(
    pattern.lineRef &&
      pattern.operatorRef &&
      pattern.serviceClass &&
      pattern.servicePatternId,
    "PATTERN_IDENTITY_MISSING",
  );
  invariant(
    verifyEvidence(pattern.evidenceRefs, sources, evidence),
    "PATTERN_EVIDENCE_INVALID",
  );
  invariant(
    Array.isArray(pattern.callingNodes) && pattern.callingNodes.length >= 2,
    "PATTERN_SEQUENCE_INVALID",
  );
  invariant(
    pattern.sequenceEvidence === "GTFS_TRIP_STOP_SEQUENCE" ||
      pattern.sequenceEvidence === "OFFICIAL_CALLING_SEQUENCE",
    "PHYSICAL_ADJACENCY_NOT_SERVICE_PATTERN",
  );
  invariant(
    ["active", "seasonal", "inactive", "suspended"].includes(
      pattern.serviceState,
    ),
    "SERVICE_STATE_MISSING",
  );
  if (["inactive", "suspended"].includes(pattern.serviceState)) return [];
  if (pattern.sequenceEvidence === "GTFS_TRIP_STOP_SEQUENCE") {
    const rows = pattern.evidenceRefs.map((ref) => evidence.get(ref));
    invariant(
      rows.every((row) => {
        const { trip, calls } = row.record;
        if (
          !trip ||
          !Array.isArray(calls) ||
          calls.length !== pattern.callingNodes.length
        )
          return false;
        const direction =
          trip.direction_id ||
          `ordered:${calls[0].stop_id}>${calls.at(-1).stop_id}`;
        return (
          pattern.lineRef === `${row.sourceId}:route:${trip.route_id}` &&
          pattern.direction === direction &&
          calls.every((call, index) => {
            const admittedCall = pattern.callingNodes[index];
            return (
              admittedCall.nodeId ===
                id("node", `${row.sourceId}:stop:${call.stop_id}`) &&
              admittedCall.sequence === Number(call.stop_sequence) &&
              admittedCall.pickupType === (call.pickup_type || "0") &&
              admittedCall.dropOffType === (call.drop_off_type || "0")
            );
          })
        );
      }) &&
        canonical([...pattern.sourceTripIds].sort(compare)) ===
          canonical(rows.map((row) => row.record.trip.trip_id).sort(compare)),
      "GTFS_PATTERN_SOURCE_BINDING_MISMATCH",
    );
  }
  if (
    pattern.sequenceEvidence === "OFFICIAL_CALLING_SEQUENCE" &&
    (pattern.strictFactBinding ||
      pattern.evidenceRefs.some((ref) =>
        ["DERIVED_STATIC_FACTS_ALLOWED", "TOPOLOGY_FACT_ONLY_ALLOWED"].includes(
          sources.get(evidence.get(ref).sourceId)?.rightsClass,
        ),
      ))
  ) {
    invariant(
      pattern.evidenceRefs.every((ref) => {
        const record = evidence.get(ref).record;
        const fact = evidence.get(record.sourceFactRef)?.record;
        const through = fact ? factThroughOperators(fact) : null;
        return (
          canonical(pattern.segmentOperators) ===
            canonical(
              through?.segmentOperators ??
                Array((fact?.callingStations?.length ?? 1) - 1).fill(
                  fact?.operator,
                ),
            ) &&
          canonical(pattern.segmentOperatorRefs ?? null) ===
            canonical(through?.segmentOperatorRefs ?? null) &&
          canonical(record.segmentOperatorRefs ?? null) ===
            canonical(through?.segmentOperatorRefs ?? null) &&
          canonical(pattern.throughServiceReview ?? null) ===
            canonical(through?.throughServiceReview ?? null) &&
          canonical(record.throughServiceReview ?? null) ===
            canonical(through?.throughServiceReview ?? null) &&
          (!through ||
            (canonical(record.segmentOperators) ===
              canonical(through.segmentOperators) &&
              canonical(pattern.throughServiceEvidenceRefs) ===
                canonical([record.sourceFactRef]))) &&
          canonical(record.callingNodes) === canonical(pattern.callingNodes) &&
          record.lineRef === pattern.lineRef &&
          record.operatorRef === pattern.operatorRef &&
          record.mode === pattern.mode &&
          record.serviceClass === pattern.serviceClass &&
          record.direction === pattern.direction &&
          verifyEvidence([record.sourceFactRef], sources, evidence) &&
          evidence.get(record.sourceFactRef).record.kind === "service" &&
          (!pattern.mode.includes("bus") ||
            (pattern.purpose === record.purpose &&
              pattern.purpose ===
                evidence.get(record.sourceFactRef).record.purpose)) &&
          canonical(
            factCallingRestrictions(evidence.get(record.sourceFactRef).record),
          ) ===
            canonical(
              pattern.callingNodes.map(({ pickupType, dropOffType }) => ({
                pickupType,
                dropOffType,
              })),
            ) &&
          evidence
            .get(record.sourceFactRef)
            .record.callingStations.every((sourceName, i) => {
              const fact = evidence.get(record.sourceFactRef).record;
              const selector = fact.callingComponents?.[i] ?? {
                name: sourceName,
                operator: fact.operator,
                line: fact.line,
                mode: fact.mode,
              };
              const node = nodes.get(pattern.callingNodes[i]?.nodeId);
              if (
                !node ||
                node.canonicalNameJa !== selector.name ||
                !node.operatorRefs.includes(selector.operator) ||
                !node.lineRefs.includes(selector.line) ||
                node.mode !== selector.mode
              )
                return false;
              if (sourceName === selector.name) return true;
              const review = selector.nameVariantReview;
              return (
                [
                  "JAPANESE_SMALL_KE",
                  "JAPANESE_DIGIT_WIDTH",
                  "JAPANESE_PAREN_WIDTH",
                ].includes(review?.kind) &&
                review.sourceName === sourceName &&
                node.evidenceRefs?.some((identityRef) => {
                  const identity = evidence.get(identityRef)?.record;
                  return (
                    verifyEvidence([identityRef], sources, evidence) &&
                    identity?.stationCode === review.stationCode &&
                    identity.stationName === selector.name &&
                    identity.operator === selector.operator &&
                    identity.line === selector.line
                  );
                }) &&
                (review.kind === "JAPANESE_SMALL_KE"
                  ? sourceName.replaceAll("ヶ", "ケ") ===
                    selector.name.replaceAll("ヶ", "ケ")
                  : review.kind === "JAPANESE_PAREN_WIDTH"
                    ? sourceName.replaceAll("（", "(").replaceAll("）", ")") ===
                      selector.name.replaceAll("（", "(").replaceAll("）", ")")
                    : sourceName.replace(/[０-９]/g, (digit) =>
                        String.fromCharCode(digit.charCodeAt(0) - 0xfee0),
                      ) ===
                      selector.name.replace(/[０-９]/g, (digit) =>
                        String.fromCharCode(digit.charCodeAt(0) - 0xfee0),
                      ))
              );
            }) &&
          evidence.get(record.sourceFactRef).record.callingStations.length ===
            pattern.callingNodes.length
        );
      }),
      "OFFICIAL_PATTERN_SOURCE_BINDING_MISMATCH",
    );
  }
  invariant(
    pattern.segmentOperators?.length === pattern.callingNodes.length - 1,
    "OPERATOR_BOUNDARY_MISSING",
  );
  invariant(
    pattern.callingNodes.every(
      (n) => nodes.get(n.nodeId)?.decision === "ADMIT_TASK_086_TOPOLOGY",
    ),
    "ENDPOINT_NOT_ADMITTED",
  );
  if (pattern.mode.includes("bus"))
    invariant(
      ["airport", "highway", "tourism", "required_gateway"].includes(
        pattern.purpose,
      ),
      "BUS_EXPANSION_NOT_BOUNDED",
    );
  if (new Set(pattern.segmentOperators).size > 1)
    invariant(
      pattern.throughServiceEvidenceRefs?.length &&
        verifyEvidence(pattern.throughServiceEvidenceRefs, sources, evidence),
      "THROUGH_SERVICE_EVIDENCE_MISSING",
    );
  return pattern.callingNodes.slice(0, -1).map((from, index) => {
    const to = pattern.callingNodes[index + 1];
    invariant(
      from.nodeId !== to.nodeId && from.sequence < to.sequence,
      "INVALID_ORDERED_SEQUENCE",
    );
    return {
      edgeId: id("edge", [
        pattern.servicePatternId,
        index,
        from.nodeId,
        to.nodeId,
      ]),
      from: { kind: "transport", id: from.nodeId },
      to: { kind: "transport", id: to.nodeId },
      fromTransportNodeId: from.nodeId,
      toTransportNodeId: to.nodeId,
      layer: "transport_network",
      directed: true,
      topologyStatus: "CONFIRMED",
      edgeKind: "service_segment",
      mode: pattern.mode,
      operatorRef: pattern.segmentOperators[index],
      ...(pattern.segmentOperatorRefs
        ? {
            operatorRefs: pattern.segmentOperatorRefs[index],
            ...(pattern.segmentOperatorRefs[index].length > 1
              ? {
                  operatorBoundaryScope: "BETWEEN_CONSECUTIVE_PASSENGER_CALLS",
                }
              : {}),
          }
        : {}),
      lineRef: pattern.lineRef,
      servicePatternRef: pattern.servicePatternId,
      segmentIndex: index,
      serviceClass: pattern.serviceClass,
      direction: pattern.direction,
      boardAllowed: from.pickupType !== "1",
      alightAllowed: to.dropOffType !== "1",
      topologyEvidenceRefs: pattern.evidenceRefs,
      sourceRefs: pattern.sourceRefs,
      confidence: 1,
      metrics: metricFields(pattern.metrics, sources),
      generatedAt,
    };
  });
}
export function generateTransfer(
  transfer,
  nodes,
  sources,
  evidence,
  generatedAt,
) {
  invariant(
    transfer.evidenceKind === "OFFICIAL_INTERCHANGE" ||
      transfer.evidenceKind === "GTFS_TRANSFER",
    "SAME_NAME_NOT_INTERCHANGE",
  );
  invariant(
    verifyEvidence(transfer.evidenceRefs, sources, evidence),
    "TRANSFER_EVIDENCE_INVALID",
  );
  if (transfer.evidenceKind === "GTFS_TRANSFER")
    invariant(
      transfer.evidenceRefs.every((ref) => {
        const row = evidence.get(ref),
          record = row.record;
        return (
          transfer.from ===
            id("node", `${row.sourceId}:stop:${record.from_stop_id}`) &&
          transfer.to ===
            id("node", `${row.sourceId}:stop:${record.to_stop_id}`) &&
          ["0", "1", "2", ""].includes(record.transfer_type ?? "") &&
          !["from_route_id", "to_route_id", "from_trip_id", "to_trip_id"].some(
            (key) => record[key],
          )
        );
      }),
      "GTFS_TRANSFER_SOURCE_BINDING_MISMATCH",
    );
  if (
    transfer.evidenceKind === "OFFICIAL_INTERCHANGE" &&
    (transfer.strictFactBinding ||
      transfer.evidenceRefs.some((ref) =>
        ["DERIVED_STATIC_FACTS_ALLOWED", "TOPOLOGY_FACT_ONLY_ALLOWED"].includes(
          sources.get(evidence.get(ref).sourceId)?.rightsClass,
        ),
      ))
  ) {
    invariant(
      transfer.evidenceRefs.every((ref) => {
        const record = evidence.get(ref).record;
        if (
          record.from !== transfer.from ||
          record.to !== transfer.to ||
          record.hubRef !== transfer.hubRef ||
          !verifyEvidence([record.sourceFactRef], sources, evidence)
        )
          return false;
        const fact = evidence.get(record.sourceFactRef).record;
        return (
          fact.kind === "transfer" &&
          fact.directions.some(([a, b]) => {
            const match = (selector, nodeId) => {
              if (selector.gtfsIdentity) {
                try {
                  return (
                    reviewedGtfsComponent(selector, nodes, sources, evidence)
                      .nodeId === nodeId
                  );
                } catch {
                  return false;
                }
              }
              const node = nodes.get(nodeId);
              return (
                node &&
                node.canonicalNameJa === selector.name &&
                node.operatorRefs.includes(selector.operator) &&
                node.lineRefs.includes(selector.line) &&
                node.mode === selector.mode
              );
            };
            return (
              match(fact.components[a], transfer.from) &&
              match(fact.components[b], transfer.to)
            );
          })
        );
      }),
      "OFFICIAL_TRANSFER_SOURCE_BINDING_MISMATCH",
    );
  }
  invariant(
    nodes.get(transfer.from)?.decision === "ADMIT_TASK_086_TOPOLOGY" &&
      nodes.get(transfer.to)?.decision === "ADMIT_TASK_086_TOPOLOGY",
    "ENDPOINT_NOT_ADMITTED",
  );
  invariant(
    transfer.from !== transfer.to && transfer.directed === true,
    "TRANSFER_DIRECTION_INVALID",
  );
  return {
    edgeId: id("edge", [
      "transfer",
      transfer.from,
      transfer.to,
      transfer.hubRef,
    ]),
    from: { kind: "transport", id: transfer.from },
    to: { kind: "transport", id: transfer.to },
    fromTransportNodeId: transfer.from,
    toTransportNodeId: transfer.to,
    layer: "transport_network",
    directed: true,
    topologyStatus: "CONFIRMED",
    edgeKind: "hub_transfer",
    mode: "transfer",
    hubRef: transfer.hubRef,
    topologyEvidenceRefs: transfer.evidenceRefs,
    sourceRefs: transfer.sourceRefs,
    confidence: 1,
    metrics: metricFields(transfer.metrics, sources),
    generatedAt,
  };
}
export function generateDirect(
  shortcut,
  pattern,
  serviceEdges,
  sources,
  generatedAt,
) {
  invariant(
    shortcut.evidenceKind === "REAL_THROUGH_SERVICE" &&
      shortcut.plannerValue &&
      shortcut.servicePatternRef === pattern.servicePatternId,
    "DIRECT_SERVICE_UNPROVEN",
  );
  const first = pattern.callingNodes.findIndex(
    (n) => n.nodeId === shortcut.from,
  );
  const last = pattern.callingNodes.findIndex(
    (n, i) => i > first && n.nodeId === shortcut.to,
  );
  invariant(
    first >= 0 &&
      last > first &&
      serviceEdges.filter(
        (e) =>
          e.servicePatternRef === pattern.servicePatternId &&
          e.segmentIndex >= first &&
          e.segmentIndex < last,
      ).length ===
        last - first,
    "DIRECT_SERVICE_UNDERLYING_GAP",
  );
  return {
    ...serviceEdges.find(
      (e) =>
        e.servicePatternRef === pattern.servicePatternId &&
        e.segmentIndex === first,
    ),
    edgeId: id("edge", ["direct", pattern.servicePatternId, first, last]),
    edgeKind: "direct_service",
    boardAllowed: pattern.callingNodes[first].pickupType !== "1",
    alightAllowed: pattern.callingNodes[last].dropOffType !== "1",
    from: { kind: "transport", id: shortcut.from },
    to: { kind: "transport", id: shortcut.to },
    fromTransportNodeId: shortcut.from,
    toTransportNodeId: shortcut.to,
    metrics: metricFields(shortcut.metrics, sources),
    generatedAt,
  };
}
export function validateEdges(edges) {
  unique(edges, (e) => e.edgeId, "EDGE_ID");
  unique(
    edges,
    (e) =>
      canonical([
        e.edgeKind,
        e.servicePatternRef ?? e.hubRef,
        e.segmentIndex ?? null,
        e.fromTransportNodeId,
        e.toTransportNodeId,
      ]),
    "SAME_SERVICE_EDGE",
  );
  invariant(
    edges.every((e) => e.directed === true && e.topologyEvidenceRefs?.length),
    "EDGE_PROVENANCE_OR_DIRECTION",
  );
}
export function growInventory(previous, proposed, removals = []) {
  unique(proposed, (n) => n.requirementId, "REQUIREMENT");
  const next = new Map(proposed.map((n) => [n.requirementId, n]));
  for (const old of previous) {
    const replacement = next.get(old.requirementId);
    if (replacement)
      invariant(
        replacement.nodeId === old.nodeId && replacement.tier === old.tier,
        "INVENTORY_REBIND_OR_TIER_CHANGE",
      );
  }
  for (const old of previous)
    if (!next.has(old.requirementId)) {
      const removal = removals.find(
        (r) => r.requirementId === old.requirementId,
      );
      invariant(
        removal &&
          ["REJECTED", "DEPRECATED"].includes(removal.decision) &&
          /^[a-f0-9]{64}$/.test(removal.evidenceSha256 ?? "") &&
          removal.evidencePath,
        "INVENTORY_SHRINK_FORBIDDEN",
      );
    }
  return [...next.values()].sort((a, b) =>
    compare(a.requirementId, b.requirementId),
  );
}
// Reachability retains the onboard service state: pickup/drop-off restrictions never
// create a spurious interchange at an intermediate stop. No all-pairs edge generation.
export function queryGraph(edges, from, to) {
  if (!from || !to) return null;
  const adjacency = new Map();
  for (const edge of edges) {
    if (!adjacency.has(edge.fromTransportNodeId))
      adjacency.set(edge.fromTransportNodeId, []);
    adjacency.get(edge.fromTransportNodeId).push(edge);
  }
  for (const values of adjacency.values())
    values.sort((a, b) => compare(a.edgeId, b.edgeId));
  const queue = [
    { node: from, pattern: null, index: null, canAlight: true, path: [] },
  ];
  const seen = new Set();
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i];
    const key = canonical([
      state.node,
      state.pattern,
      state.index,
      state.canAlight,
    ]);
    if (seen.has(key)) continue;
    seen.add(key);
    if (state.node === to && state.canAlight) return state.path;
    for (const edge of adjacency.get(state.node) ?? []) {
      const continuing =
        edge.edgeKind === "service_segment" &&
        state.pattern === edge.servicePatternRef &&
        state.index + 1 === edge.segmentIndex;
      if (!continuing && (!state.canAlight || edge.boardAllowed === false))
        continue;
      queue.push({
        node: edge.toTransportNodeId,
        pattern: edge.servicePatternRef ?? null,
        index: edge.segmentIndex ?? null,
        canAlight: edge.alightAllowed !== false,
        path: [...state.path, edge.edgeId],
      });
    }
  }
  return null;
}
// Traverse once per anchor direction, retaining the same onboard restrictions.
export function reachablePaths(edges, from) {
  const adjacency = new Map();
  for (const e of edges) {
    if (!adjacency.has(e.fromTransportNodeId))
      adjacency.set(e.fromTransportNodeId, []);
    adjacency.get(e.fromTransportNodeId).push(e);
  }
  for (const items of adjacency.values())
    items.sort((a, b) => compare(a.edgeId, b.edgeId));
  const queue = [
      { node: from, pattern: null, index: null, canAlight: true, path: [] },
    ],
    seen = new Set(),
    paths = new Map();
  for (let i = 0; i < queue.length; i++) {
    const state = queue[i],
      key = canonical([
        state.node,
        state.pattern,
        state.index,
        state.canAlight,
      ]);
    if (seen.has(key)) continue;
    seen.add(key);
    if (state.canAlight && !paths.has(state.node))
      paths.set(state.node, state.path);
    for (const e of adjacency.get(state.node) ?? []) {
      const continuing =
        e.edgeKind === "service_segment" &&
        state.pattern === e.servicePatternRef &&
        state.index + 1 === e.segmentIndex;
      if (!continuing && (!state.canAlight || e.boardAllowed === false))
        continue;
      queue.push({
        node: e.toTransportNodeId,
        pattern: e.servicePatternRef ?? null,
        index: e.segmentIndex ?? null,
        canAlight: e.alightAllowed !== false,
        path: [...state.path, e.edgeId],
      });
    }
  }
  return paths;
}
export function anchorQueries(edges, anchor) {
  // Direct shortcuts have different start/end segment indexes; use the general
  // forward query for those graphs until their reverse state is represented.
  const forward = reachablePaths(edges, anchor);
  const backward = edges.some((e) => e.edgeKind === "direct_service")
    ? null
    : reachablePaths(
        edges.map((e) => ({
          ...e,
          fromTransportNodeId: e.toTransportNodeId,
          toTransportNodeId: e.fromTransportNodeId,
          boardAllowed: e.alightAllowed,
          alightAllowed: e.boardAllowed,
          segmentIndex:
            e.segmentIndex === undefined ? undefined : -e.segmentIndex,
        })),
        anchor,
      );
  return (from, to) =>
    !from || !to
      ? null
      : from === anchor
        ? (forward.get(to) ?? null)
        : to === anchor && backward
          ? backward.has(from)
            ? [...backward.get(from)].reverse()
            : null
          : queryGraph(edges, from, to);
}
// Resolve only previously absent query endpoints from independently admitted rail
// components. This creates a QA query, never an edge or an identity admission.
export function resolveCorridorEndpoints(corridor, nodes) {
  const names = String(corridor.corridorId).split(":");
  const result = { ...corridor };
  for (const [index, key] of [
    [0, "from"],
    [1, "to"],
  ]) {
    if (result[key] !== null && result[key] !== undefined) continue;
    const matches = nodes.filter(
      (n) =>
        n.decision === "ADMIT_TASK_086_TOPOLOGY" &&
        n.canonicalNameJa === names[index] &&
        ["conventional_rail", "private_rail"].includes(n.mode),
    );
    if (matches.length === 1) result[key] = matches[0].nodeId;
  }
  return result;
}
export function auditGraph({
  nodes,
  patterns,
  transfers,
  edges,
  inventory,
  corridors = [],
  anchorNodeId,
  discoveryGaps = [],
}) {
  const query = anchorQueries(edges, anchorNodeId);
  const deficits = discoveryGaps.map((d) => ({ ...d }));
  const byId = new Map(nodes.map((n) => [n.nodeId, n]));
  const surfaceModes = new Set([
    "shinkansen",
    "conventional_rail",
    "private_rail",
    "metro",
    "fixed_guideway",
    "tram",
    "bus",
    "local_bus",
    "airport_bus",
    "highway_bus",
  ]);
  // Licensed GTFS bus stops predate the optional mode field. Their admitted
  // nodeKind still establishes surface transport; do not infer it for ports or
  // generic tourism facilities, and preserve any explicit mode classification.
  const isSurfaceNode = (node) =>
    surfaceModes.has(
      node?.mode ?? (node?.nodeKind === "bus_stop" ? "bus" : null),
    );
  const connected = [],
    disconnected = [];
  const tier = {
    T0: { required: 0, connected: 0 },
    T1: { required: 0, connected: 0 },
    other: { required: 0, connected: 0 },
  };
  for (const requirement of inventory) {
    const group = tier[requirement.tier] ?? tier.other;
    group.required++;
    const node = byId.get(requirement.nodeId);
    const accepted = node?.decision === "ADMIT_TASK_086_TOPOLOGY";
    const reachable =
      accepted &&
      anchorNodeId &&
      query(anchorNodeId, node.nodeId) !== null &&
      query(node.nodeId, anchorNodeId) !== null;
    if (reachable) {
      group.connected++;
      connected.push(requirement.requirementId);
    } else {
      disconnected.push(requirement.requirementId);
      deficits.push({
        deficitId: `connect:${requirement.requirementId}`,
        class:
          requirement.tier === "T0"
            ? "DISCONNECTED_T0"
            : requirement.tier === "T1"
              ? "DISCONNECTED_T1"
              : "MISSING_INTERMEDIATE_NODE",
        requirementId: requirement.requirementId,
        nodeId: requirement.nodeId,
        reason: accepted
          ? "NO_BIDIRECTIONAL_NATIONAL_PATH"
          : "NODE_ADMISSION_REQUIRED",
      });
    }
    const modeDeficit = {
      airport: "AIRPORT_SURFACE_GAP",
      ferry_port: "ISLAND_FERRY_GAP",
      bus_terminal: "HIGHWAY_BUS_GAP",
    }[requirement.kind];
    const surfacePeers = new Set(
      (requirement.kind === "airport" ? edges : [])
        .filter(
          (e) =>
            e.fromTransportNodeId === requirement.nodeId &&
            e.mode !== "flight" &&
            e.mode !== "ferry" &&
            byId.get(e.toTransportNodeId)?.decision ===
              "ADMIT_TASK_086_TOPOLOGY" &&
            isSurfaceNode(byId.get(e.toTransportNodeId)),
        )
        .map((e) => e.toTransportNodeId),
    );
    const airportSurfaceConnected =
      requirement.kind !== "airport" ||
      edges.some(
        (e) =>
          e.toTransportNodeId === requirement.nodeId &&
          e.mode !== "flight" &&
          e.mode !== "ferry" &&
          surfacePeers.has(e.fromTransportNodeId),
      );
    if (modeDeficit && (!reachable || !airportSurfaceConnected))
      deficits.push({
        deficitId: `mode:${requirement.requirementId}`,
        class: modeDeficit,
        requirementId: requirement.requirementId,
        reason: !reachable
          ? "REQUIRED_GATEWAY_NOT_CONNECTED_TO_NATIONAL_BACKBONE"
          : "AIRPORT_BIDIRECTIONAL_SURFACE_CONNECTION_REQUIRED",
      });
    if (!accepted)
      deficits.push({
        deficitId: `identity:${requirement.requirementId}`,
        class: "NODE_IDENTITY_GAP",
        requirementId: requirement.requirementId,
        reason: "NO_INDEPENDENT_NODE_ADMISSION",
      });
  }
  const generatedCorridors = inventory
    .filter((r) => r.nodeId !== anchorNodeId)
    .map((r) => ({
      corridorId: `inventory:${r.requirementId}`,
      from: anchorNodeId,
      to: r.nodeId,
      origin: "REQUIRED_INVENTORY",
    }));
  const results = [...corridors, ...generatedCorridors].map((c) => {
    const forward = query(c.from, c.to),
      reverse = query(c.to, c.from);
    const pass = forward !== null && reverse !== null;
    if (!pass)
      deficits.push({
        deficitId: `corridor:${c.corridorId}`,
        class: "CORRIDOR_UNREACHABLE",
        corridorId: c.corridorId,
      });
    return {
      ...c,
      status: pass ? "PASS" : "FAIL",
      forwardEdgeIds: forward,
      reverseEdgeIds: reverse,
    };
  });
  for (const pattern of patterns)
    if (
      !["inactive", "suspended"].includes(pattern.serviceState) &&
      edges.filter(
        (e) =>
          e.servicePatternRef === pattern.servicePatternId &&
          e.edgeKind === "service_segment",
      ).length !==
        pattern.callingNodes.length - 1
    )
      deficits.push({
        deficitId: `pattern:${pattern.servicePatternId}`,
        class: "SERVICE_PATTERN_GAP",
        servicePatternId: pattern.servicePatternId,
      });
  const transferResults = transfers.map((t) => ({
    transferId: t.transferId,
    pass: edges.some(
      (e) =>
        e.edgeKind === "hub_transfer" &&
        e.fromTransportNodeId === t.from &&
        e.toTransportNodeId === t.to,
    ),
  }));
  for (const t of transferResults.filter((r) => !r.pass))
    deficits.push({
      deficitId: `transfer:${t.transferId}`,
      class: "HUB_TRANSFER_GAP",
      transferId: t.transferId,
    });
  const metrics = Object.fromEntries(
    METRICS.map((field) => [
      field,
      {
        resolved: edges.filter((e) => e.metrics[field].status === "resolved")
          .length,
        total: edges.length,
      },
    ]),
  );
  const metricOnly = edges.flatMap((e) =>
    METRICS.filter((f) => e.metrics[f].status === "unresolved").map(
      (field) => ({
        deficitId: `metric:${e.edgeId}:${field}`,
        class: "DYNAMIC_METRIC_ONLY_GAP",
        edgeId: e.edgeId,
        field,
        reason: e.metrics[field].reason,
      }),
    ),
  );
  const counts = Object.fromEntries(
    DEFICITS.map((key) => [
      key,
      key === "DYNAMIC_METRIC_ONLY_GAP"
        ? metricOnly.length
        : deficits.filter((d) => d.class === key).length,
    ]),
  );
  unique(deficits, (d) => d.deficitId, "DEFICIT");
  return {
    deficits,
    counts,
    tier,
    connected,
    disconnected,
    corridors: results,
    transferResults,
    metrics,
    metricOnly,
    hardDeficitCount: deficits.length,
    anchorNodeId: anchorNodeId ?? null,
  };
}
const priority = {
  DISCONNECTED_T0: 0,
  DISCONNECTED_T1: 1,
  MISSING_INTERMEDIATE_NODE: 2,
  SERVICE_PATTERN_GAP: 2,
  HUB_TRANSFER_GAP: 3,
  AIRPORT_SURFACE_GAP: 4,
  ISLAND_FERRY_GAP: 4,
  HIGHWAY_BUS_GAP: 4,
  TOURISM_SPECIAL_MODE_GAP: 5,
  CORRIDOR_UNREACHABLE: 1,
  NODE_IDENTITY_GAP: 2,
  SOURCE_LICENSE_GAP: 2,
  DYNAMIC_METRIC_ONLY_GAP: 7,
};
export function selectAction(audit, actions, history) {
  const classes = new Set(audit.deficits.map((d) => d.class));
  const tried = new Set(history.map((h) => h.actionId));
  const failedStrategies = new Set(
    history
      .filter((h) => h.actualImprovement.hardDeficitsReduced <= 0)
      .map((h) => h.strategyFingerprint),
  );
  return (
    actions
      .filter(
        (a) =>
          !tried.has(a.actionId) &&
          a.triggerClasses.some((c) => classes.has(c)) &&
          !failedStrategies.has(a.strategyFingerprint),
      )
      .sort(
        (a, b) =>
          Math.min(
            ...a.triggerClasses
              .filter((c) => classes.has(c))
              .map((c) => priority[c]),
          ) -
            Math.min(
              ...b.triggerClasses
                .filter((c) => classes.has(c))
                .map((c) => priority[c]),
            ) ||
          b.requiredImpact - a.requiredImpact ||
          b.corridorImpact - a.corridorImpact ||
          b.authority - a.authority ||
          b.identityCertainty - a.identityCertainty ||
          b.licenseUsability - a.licenseUsability ||
          compare(a.actionId, b.actionId),
      )[0] ?? null
  );
}
export function adaptParameters(previous, action, audit) {
  const next = { ...previous, ...action.parameterChanges };
  invariant(
    Number.isInteger(next.routeChunkSize) &&
      next.routeChunkSize > 0 &&
      next.routeChunkSize <= 200,
    "BATCH_HARD_CAP",
  );
  invariant(
    Object.keys(action.parameterChanges ?? {}).every((k) =>
      Object.hasOwn(DEFAULT_PARAMETERS, k),
    ),
    "ACCEPTANCE_THRESHOLD_MUTATION_FORBIDDEN",
  );
  const trigger = audit.deficits
    .filter((d) => action.triggerClasses.includes(d.class))
    .map((d) => d.deficitId);
  const changes = Object.keys(action.parameterChanges ?? {})
    .sort()
    .filter((k) => canonical(previous[k]) !== canonical(next[k]))
    .map((parameter) => ({
      parameter,
      previousValue: previous[parameter],
      newValue: next[parameter],
      triggerDeficitIds: trigger,
      expectedImprovement: action.expectedImprovement,
    }));
  return { next, changes };
}
export function validateFixpoint(proof, deficit, readEvidence) {
  if (
    !proof ||
    proof.type !== "SOURCE_LICENSE_IDENTITY_FIXPOINT_PROOF" ||
    proof.deficitId !== deficit.deficitId ||
    !proof.externalBlocker ||
    !proof.invalidateWhen ||
    !proof.repeatSearchReason ||
    proof.ordinaryWorkRemaining !== false ||
    !Array.isArray(proof.searches)
  )
    return false;
  const { proofSha256, ...body } = proof;
  if (hash(body) !== proofSha256) return false;
  const categories = [
    "official_operator",
    "government_open_data",
    "licensed_static",
    "mode_specific",
    "identity",
    "alternative_connection",
  ];
  return categories.every((category) =>
    proof.searches.some(
      (s) =>
        s.category === category &&
        s.outcome &&
        s.evidencePath &&
        hash(readEvidence(s.evidencePath)) === s.evidenceSha256,
    ),
  );
}
export function acceptance(
  audit,
  proofs,
  readEvidence,
  integrity,
  actions = [],
) {
  const validExceptions = audit.deficits.filter((d) =>
    proofs.some((p) => validateFixpoint(p, d, readEvidence)),
  );
  const unproved = audit.deficits.length - validExceptions.length;
  const integrityPass = Object.values(integrity).every((v) => v === "PASS");
  const nationalCorridors = (audit.corridors ?? []).filter(
    (c) => c.origin === "TASK_MANDATORY_QUERY_ONLY",
  );
  const nationalCore =
    audit.tier.T0.connected > 0 &&
    audit.tier.T1.connected > 0 &&
    nationalCorridors.length > 0 &&
    nationalCorridors.every((c) => c.status === "PASS");
  const openActions = actions.filter(
    (a) => !["INGESTED", "SUPERSEDED_BY_ALTERNATIVE"].includes(a.state),
  );
  const ordinaryDiscoveryRemaining =
    unproved > 0 ||
    openActions.some((a) => a.state !== "EXTERNAL_APPROVAL_REQUIRED");
  const converged =
    integrityPass && nationalCore && unproved === 0 && openActions.length === 0;
  return {
    status: !converged
      ? "IN_PROGRESS_AUTO_REMEDIATION"
      : validExceptions.length
        ? "READY_FOR_USER_ACCEPTANCE_WITH_AUDITED_FIXPOINT_EXCEPTIONS"
        : "PASS / READY_FOR_REVIEW",
    globalTopologyDiscoveryFixpoint: converged ? "PROVEN" : "NOT_PROVEN",
    integrity,
    nationalCoreConnected: nationalCore,
    unresolvedTopologyCount: audit.deficits.length,
    unprovedDeficitCount: unproved,
    validatedExceptionCount: validExceptions.length,
    ordinaryDiscoveryRemaining,
    terminal: converged,
    openSourceActionCount: openActions.length,
    runtimeImportAuthorized: false,
  };
}

export function assertTerminalResult(gate, actions = []) {
  invariant(
    gate.terminal === true &&
      gate.ordinaryDiscoveryRemaining === false &&
      gate.globalTopologyDiscoveryFixpoint === "PROVEN" &&
      !actions.some((a) =>
        [
          "PENDING_RESEARCH",
          "RESEARCHING",
          "SOURCE_FOUND",
          "RIGHTS_REVIEWED",
          "NO_SOURCE_FOUND",
        ].includes(a.state),
      ),
    "TERMINAL_RESULT_FORBIDDEN_ORDINARY_REMEDIATION_REMAINS",
  );
  return true;
}
