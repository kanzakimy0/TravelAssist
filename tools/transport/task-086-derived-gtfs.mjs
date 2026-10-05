import {
  admitNodes,
  tokachiDerivedGtfsMode,
  reviewedDerivedGtfsComponent as reviewedDerivedGtfsComponentModel,
  canonical,
  exactRecordMap,
  generatePattern,
  gtfsServiceDateBound,
  hash,
  id,
  invariant,
  sourceAllowed,
  unique,
} from "./task-086-model.mjs";

export const DERIVED_GTFS_KIND = "TASK086_DERIVED_GTFS_STATIC_V1";
export const TOKACHI_GRANT_URL = "https://www.tokachibus.jp/rosenbus/opendata/";
const STOP_FIELDS = [
  "stop_id",
  "stop_name",
  "stop_lat",
  "stop_lon",
  "location_type",
  "parent_station",
  "platform_code",
];
const sha = (value) => /^[a-f0-9]{64}$/.test(value ?? "");
const text = (value) => typeof value === "string" && value.length > 0;
function keys(record, fields, label) {
  invariant(
    record &&
      !Array.isArray(record) &&
      canonical(Object.keys(record).sort()) === canonical([...fields].sort()),
    "DERIVED_GTFS_FIELDS:" + label,
  );
}
function strings(record) {
  return Object.values(record).every((v) => typeof v === "string");
}
function validSource(source, date) {
  keys(
    source,
    [
      "sourceId",
      "url",
      "datasetUrl",
      "contentSha256",
      "observedAt",
      "validFrom",
      "validTo",
      "feedVersion",
      "agency",
      "attribution",
      "license",
      "rightsClass",
      "rightsDecision",
      "rawPayloadRetained",
      "persistenceAllowed",
      "rawPersistenceAllowed",
      "rawRedistributionAllowed",
      "derivedDataAllowed",
      "derivedPersistenceAllowed",
      "redistributionAllowed",
      "derivedRedistributionScope",
      "rebuildBasis",
      "rawByteReproductionAvailable",
      "derivedProjectionSha256",
      "rightsReview",
    ],
    "source",
  );
  keys(source.agency, ["agency_id", "agency_name"], "agency");
  keys(
    source.rightsReview,
    [
      "scope",
      "termsUrl",
      "observedResponseSha256",
      "reviewedAt",
      "validFrom",
      "validTo",
      "reason",
      "usage",
      "sourceUrl",
      "sourceSha256",
    ],
    "rightsReview",
  );
  const r = source.rightsReview;
  invariant(
    tokachiDerivedGtfsMode(source) !== null &&
      source.datasetUrl === TOKACHI_GRANT_URL &&
      source.agency.agency_name.trim() === "十勝バス株式会社" &&
      text(source.agency.agency_id) &&
      source.license === "Tokachi Bus static GTFS route-guidance use grant" &&
      source.rightsClass === "DERIVED_STATIC_FACTS_ALLOWED" &&
      source.rightsDecision === "PASS_OPERATOR_ROUTE_GUIDANCE_STATIC_FACTS" &&
      sourceAllowed(source) &&
      [
        "rawPayloadRetained",
        "persistenceAllowed",
        "rawPersistenceAllowed",
        "rawRedistributionAllowed",
        "rawByteReproductionAvailable",
      ].every((k) => source[k] === false) &&
      [
        "derivedDataAllowed",
        "derivedPersistenceAllowed",
        "redistributionAllowed",
      ].every((k) => source[k] === true) &&
      source.derivedRedistributionScope ===
        "ROUTE_GUIDANCE_MINIMAL_STATIC_FACTS" &&
      source.rebuildBasis === "REVIEWED_DERIVED_STATIC_INPUT" &&
      sha(source.derivedProjectionSha256) &&
      text(source.feedVersion) &&
      text(source.attribution) &&
      r.scope === "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS" &&
      r.termsUrl === TOKACHI_GRANT_URL &&
      sha(r.observedResponseSha256) &&
      r.usage === "ROUTE_GUIDANCE" &&
      text(r.reason) &&
      Number.isFinite(Date.parse(r.reviewedAt)) &&
      Number.isFinite(Date.parse(source.observedAt)) &&
      r.sourceUrl === source.url &&
      r.sourceSha256 === source.contentSha256 &&
      [source.validFrom, source.validTo, r.validFrom, r.validTo, date].every(
        (v) => /^\d{8}$/.test(v),
      ) &&
      source.validFrom <= date &&
      date <= source.validTo &&
      r.validFrom <= date &&
      date <= r.validTo,
    "DERIVED_GTFS_GRANT_SCOPE_OR_VALIDITY",
  );
}

export function validateDerivedGtfsInput(doc) {
  keys(
    doc,
    ["schemaVersion", "kind", "source", "projection", "nativeAudit"],
    "document",
  );
  invariant(
    doc.schemaVersion === 1 && doc.kind === DERIVED_GTFS_KIND,
    "DERIVED_GTFS_SCHEMA",
  );
  const { source, projection: p, nativeAudit: audit } = doc;
  keys(
    p,
    ["serviceDate", "stops", "routes", "parents", "sections"],
    "projection",
  );
  validSource(source, p.serviceDate);
  invariant(
    source.derivedProjectionSha256 === hash(p),
    "DERIVED_GTFS_PROJECTION_HASH",
  );
  keys(
    audit,
    [
      "schemaVersion",
      "method",
      "extractorSha256",
      "nativeArchiveSha256",
      "grantResponseSha256",
      "derivedInputSha256",
      "parentNativeCallsSha256",
      "reviewedAt",
      "sourceActionId",
    ],
    "audit",
  );
  invariant(
    audit.schemaVersion === 1 &&
      audit.method === "NATIVE_GTFS_MINIMAL_PROJECTION_CHECKED" &&
      sha(audit.extractorSha256) &&
      audit.nativeArchiveSha256 === source.contentSha256 &&
      audit.grantResponseSha256 ===
        source.rightsReview.observedResponseSha256 &&
      audit.derivedInputSha256 ===
        hash({
          schemaVersion: doc.schemaVersion,
          kind: doc.kind,
          source,
          projection: p,
        }) &&
      audit.reviewedAt === source.rightsReview.reviewedAt &&
      text(audit.sourceActionId),
    "DERIVED_GTFS_AUDIT_BINDING",
  );
  invariant(
    [p.stops, p.routes, p.parents, p.sections].every(
      (a) => Array.isArray(a) && a.length > 0,
    ),
    "DERIVED_GTFS_EMPTY_SCOPE",
  );
  unique(p.stops, (s) => s.stop_id, "DERIVED_STOP");
  unique(p.routes, (r) => r.route_id, "DERIVED_ROUTE");
  unique(p.parents, (r) => r.trip.trip_id, "DERIVED_PARENT");
  unique(
    p.sections,
    (s) => canonical([s.tripId, s.fromStopSequence, s.toStopSequence]),
    "DERIVED_SECTION",
  );
  invariant(
    canonical(Object.keys(audit.parentNativeCallsSha256).sort()) ===
      canonical(p.parents.map((r) => r.trip.trip_id).sort()) &&
      Object.values(audit.parentNativeCallsSha256).every(sha),
    "DERIVED_GTFS_PARENT_NATIVE_HASHES",
  );
  for (const s of p.stops) {
    keys(s, STOP_FIELDS, "stop");
    invariant(
      strings(s) &&
        text(s.stop_id) &&
        text(s.stop_name) &&
        ["", "0"].includes(s.location_type) &&
        text(s.stop_lat) &&
        text(s.stop_lon) &&
        Number(s.stop_lat) >= 20 &&
        Number(s.stop_lat) <= 46 &&
        Number(s.stop_lon) >= 122 &&
        Number(s.stop_lon) <= 154,
      "DERIVED_GTFS_STOP_IDENTITY",
    );
  }
  for (const r of p.routes) {
    keys(
      r,
      ["route_id", "agency_id", "route_long_name", "route_type"],
      "route",
    );
    invariant(
      strings(r) &&
        text(r.route_id) &&
        text(r.route_long_name) &&
        r.route_type === "3" &&
        r.agency_id === source.agency.agency_id,
      "DERIVED_GTFS_ROUTE_IDENTITY",
    );
  }
  for (const parent of p.parents) {
    keys(
      parent,
      ["trip", "calls", "calendar", "exceptions", "serviceDate"],
      "parent",
    );
    keys(
      parent.trip,
      ["trip_id", "route_id", "service_id", "direction_id"],
      "trip",
    );
    invariant(
      strings(parent.trip) &&
        text(parent.trip.trip_id) &&
        text(parent.trip.service_id) &&
        ["", "0", "1"].includes(parent.trip.direction_id) &&
        p.routes.some((r) => r.route_id === parent.trip.route_id) &&
        parent.serviceDate === p.serviceDate &&
        Array.isArray(parent.calls) &&
        parent.calls.length >= 2,
      "DERIVED_GTFS_PARENT_IDENTITY",
    );
    for (const [i, c] of parent.calls.entries()) {
      keys(
        c,
        ["trip_id", "stop_id", "stop_sequence", "pickup_type", "drop_off_type"],
        "call",
      );
      invariant(
        strings(c) &&
          c.trip_id === parent.trip.trip_id &&
          text(c.stop_id) &&
          /^\d+$/.test(c.stop_sequence) &&
          Number.isSafeInteger(Number(c.stop_sequence)) &&
          (i === 0 ||
            Number(c.stop_sequence) >
              Number(parent.calls[i - 1].stop_sequence)) &&
          ["0", "1"].includes(c.pickup_type) &&
          ["0", "1"].includes(c.drop_off_type),
        "DERIVED_GTFS_NATIVE_CALL_RESTRICTIONS",
      );
    }
    if (parent.calendar) {
      keys(
        parent.calendar,
        [
          "service_id",
          "monday",
          "tuesday",
          "wednesday",
          "thursday",
          "friday",
          "saturday",
          "sunday",
          "start_date",
          "end_date",
        ],
        "calendar",
      );
      invariant(
        strings(parent.calendar) &&
          parent.calendar.service_id === parent.trip.service_id &&
          [
            "monday",
            "tuesday",
            "wednesday",
            "thursday",
            "friday",
            "saturday",
            "sunday",
          ].every((k) => ["0", "1"].includes(parent.calendar[k])) &&
          /^\d{8}$/.test(parent.calendar.start_date) &&
          /^\d{8}$/.test(parent.calendar.end_date),
        "DERIVED_GTFS_CALENDAR",
      );
    }
    invariant(
      Array.isArray(parent.exceptions) && parent.exceptions.length <= 1,
      "DERIVED_GTFS_CALENDAR_EXCEPTIONS",
    );
    for (const e of parent.exceptions) {
      keys(e, ["service_id", "date", "exception_type"], "calendar exception");
      invariant(
        e.service_id === parent.trip.service_id &&
          e.date === p.serviceDate &&
          ["1", "2"].includes(e.exception_type),
        "DERIVED_GTFS_CALENDAR_EXCEPTIONS",
      );
    }
    const date = new Date(
      `${p.serviceDate.slice(0, 4)}-${p.serviceDate.slice(4, 6)}-${p.serviceDate.slice(6, 8)}T00:00:00Z`,
    );
    invariant(
      Number.isFinite(date.valueOf()) &&
        date.toISOString().slice(0, 10).replaceAll("-", "") === p.serviceDate,
      "DERIVED_GTFS_DATE",
    );
    const day = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ][date.getUTCDay()];
    const active = parent.exceptions.length
      ? parent.exceptions[0].exception_type === "1"
      : parent.calendar &&
        parent.calendar.start_date <= p.serviceDate &&
        p.serviceDate <= parent.calendar.end_date &&
        parent.calendar[day] === "1";
    invariant(active, "DERIVED_GTFS_INACTIVE_SERVICE");
  }
  const used = new Set(),
    usedParents = new Set(),
    usedRoutes = new Set();
  for (const s of p.sections) {
    keys(
      s,
      [
        "tripId",
        "fromStopSequence",
        "toStopSequence",
        "reviewedStopIds",
        "expectedDirectionId",
        "parentStaticCallsSha256",
      ],
      "section",
    );
    const parent = p.parents.find((r) => r.trip.trip_id === s.tripId);
    invariant(
      parent &&
        Number.isSafeInteger(s.fromStopSequence) &&
        Number.isSafeInteger(s.toStopSequence),
      "DERIVED_GTFS_SECTION_PARENT",
    );
    const from = parent.calls.findIndex(
        (c) => Number(c.stop_sequence) === s.fromStopSequence,
      ),
      to = parent.calls.findIndex(
        (c) => Number(c.stop_sequence) === s.toStopSequence,
      );
    const direction =
      parent.trip.direction_id ||
      `ordered:${parent.calls[0].stop_id}>${parent.calls.at(-1).stop_id}`;
    invariant(
      from >= 0 &&
        to > from &&
        s.parentStaticCallsSha256 === hash(parent.calls) &&
        s.expectedDirectionId === direction &&
        canonical(s.reviewedStopIds) ===
          canonical(parent.calls.slice(from, to + 1).map((c) => c.stop_id)),
      "DERIVED_GTFS_NONCONTIGUOUS_SECTION",
    );
    for (const stop of s.reviewedStopIds) {
      invariant(
        p.stops.some((r) => r.stop_id === stop),
        "DERIVED_GTFS_SECTION_STOP_MISSING",
      );
      used.add(stop);
    }
    usedParents.add(s.tripId);
    usedRoutes.add(parent.trip.route_id);
  }
  invariant(
    used.size === p.stops.length &&
      usedParents.size === p.parents.length &&
      usedRoutes.size === p.routes.length,
    "DERIVED_GTFS_UNUSED_PROJECTION",
  );
  return doc;
}

export function buildDerivedGtfsPackage(doc) {
  validateDerivedGtfsInput(doc);
  const { source, projection: p, nativeAudit } = doc;
  const evidence = [],
    inputHash = nativeAudit.derivedInputSha256;
  function ev(kind, locator, record) {
    const row = {
      evidenceId:
        source.sourceId + ":derived:" + kind + ":" + hash(record).slice(0, 24),
      sourceId: source.sourceId,
      sourceSha256: source.contentSha256,
      locator,
      record,
      recordSha256: hash(record),
      derivedInputSha256: inputHash,
      derivedProjectionSha256: source.derivedProjectionSha256,
      evidenceKind: "REVIEWED_DERIVED_STATIC_INPUT",
    };
    evidence.push(row);
    return row.evidenceId;
  }
  const parentRefs = new Map(
    p.parents.map((parent) => [
      parent.trip.trip_id,
      ev("parent", "derived-static:parent:" + parent.trip.trip_id, parent),
    ]),
  );
  const patterns = p.sections.map((s) => {
    const parent = p.parents.find((r) => r.trip.trip_id === s.tripId),
      from = parent.calls.findIndex(
        (c) => Number(c.stop_sequence) === s.fromStopSequence,
      ),
      to = parent.calls.findIndex(
        (c) => Number(c.stop_sequence) === s.toStopSequence,
      );
    const calls = parent.calls.slice(from, to + 1),
      section = {
        fromStopSequence: s.fromStopSequence,
        toStopSequence: s.toStopSequence,
        fullParentCallsSha256: s.parentStaticCallsSha256,
        expectedDirectionId: s.expectedDirectionId,
        parentEvidenceRef: parentRefs.get(s.tripId),
      };
    const ref = ev("section", "derived-static:section:" + s.tripId, {
      ...parent,
      calls,
      section,
    });
    return {
      sourcePatternKey:
        source.sourceId +
        ":derived-section:" +
        s.tripId +
        ":" +
        s.fromStopSequence +
        ":" +
        s.toStopSequence +
        ":" +
        hash(calls).slice(0, 24),
      lineRef: source.sourceId + ":route:" + parent.trip.route_id,
      operatorRef: source.agency.agency_name,
      mode: tokachiDerivedGtfsMode(source),
      purpose: "airport",
      direction: s.expectedDirectionId,
      serviceClass: "not_specified_by_feed",
      sequenceEvidence: "REVIEWED_GTFS_STATIC_SEQUENCE",
      serviceState: "active",
      gtfsSection: section,
      derivedInputSha256: inputHash,
      derivedProjectionSha256: source.derivedProjectionSha256,
      callingNodes: calls.map((c) => ({
        identityAnchor: source.sourceId + ":stop:" + c.stop_id,
        sequence: Number(c.stop_sequence),
        pickupType: c.pickup_type,
        dropOffType: c.drop_off_type,
      })),
      segmentOperators: Array(calls.length - 1).fill(source.agency.agency_name),
      sourceRefs: [source.datasetUrl, source.url],
      evidenceRefs: [ref],
      sourceTripIds: [s.tripId],
    };
  });
  const lines = p.routes.map((r) => ({
    lineRef: source.sourceId + ":route:" + r.route_id,
    operatorRef: source.agency.agency_name,
    name: r.route_long_name,
    mode: tokachiDerivedGtfsMode(source),
    purpose: "airport",
    sourceRoute: r,
    evidenceRefs: [ev("route", "derived-static:routes.txt:" + r.route_id, r)],
    sourceRefs: [source.datasetUrl, source.url],
  }));
  const nodes = p.stops.map((r) => {
    const anchor = source.sourceId + ":stop:" + r.stop_id;
    return {
      identityAnchor: anchor,
      canonicalNameJa: r.stop_name,
      nodeKind: "bus_stop",
      nodeLevel: "T3",
      latitude: Number(r.stop_lat),
      longitude: Number(r.stop_lon),
      operatorRefs: [source.agency.agency_name],
      lineRefs: [
        ...new Set(
          patterns
            .filter((p) =>
              p.callingNodes.some((c) => c.identityAnchor === anchor),
            )
            .map((p) => p.lineRef),
        ),
      ],
      sourceRefs: [source.datasetUrl, source.url],
      evidenceRefs: [ev("stop", "derived-static:stops.txt:" + r.stop_id, r)],
      identityRecord: r,
      origin: "TASK_086_INDEPENDENT_GTFS",
      hubSemantics: "GTFS_STOP_POINT_NO_SAME_NAME_COLLAPSE",
      parentHubId: null,
      independentReview: {
        decision: "ADMIT_TASK_086_TOPOLOGY",
        recordSha256: hash(r),
        method: "EXACT_REVIEWED_DERIVED_GTFS_STOP",
        sourceArchiveSha256: source.contentSha256,
        derivedInputSha256: inputHash,
        derivedProjectionSha256: source.derivedProjectionSha256,
      },
    };
  });
  return {
    source,
    nodes,
    lines,
    patterns,
    transfers: [],
    evidence: [...exactRecordMap(evidence, "evidenceId", "EVIDENCE").values()],
    rebuildBasis: source.rebuildBasis,
    rawByteReproductionAvailable: false,
  };
}

export function verifyDerivedGtfsReview(doc, binding, action, generatedAt) {
  validateDerivedGtfsInput(doc);
  const { source, nativeAudit: audit, projection } = doc;
  const last = action?.rightsFindings?.at(-1),
    review = action?.derivedGtfsReviews?.find(
      (r) => r.packageSha256 === hash(doc),
    );
  invariant(
    binding.packageSha256 === hash(doc) &&
      binding.nativeAuditSha256 === hash(audit) &&
      binding.derivedInputSha256 === audit.derivedInputSha256 &&
      binding.sourceActionId === audit.sourceActionId &&
      action?.actionId === audit.sourceActionId &&
      ["RIGHTS_REVIEWED", "INGESTED"].includes(action?.state) &&
      gtfsServiceDateBound(binding, projection.serviceDate, generatedAt) &&
      last?.rightsClass === "DERIVED_STATIC_FACTS_ALLOWED" &&
      last.termsUrl === TOKACHI_GRANT_URL &&
      action.sourcesChecked?.some(
        (s) =>
          s.url === TOKACHI_GRANT_URL &&
          s.purpose === "terms" &&
          s.status === 200 &&
          s.contentSha256 === audit.grantResponseSha256,
      ) &&
      action.sourcesChecked?.some(
        (s) =>
          s.url === source.url &&
          s.status === 200 &&
          s.contentSha256 === audit.nativeArchiveSha256 &&
          s.rawPayloadRetained === false,
      ) &&
      review?.decision === "ADMIT_REVIEWED_DERIVED_GTFS_STATIC_INPUT" &&
      review.nativeAuditSha256 === hash(audit) &&
      review.derivedInputSha256 === audit.derivedInputSha256 &&
      review.sourceArchiveSha256 === audit.nativeArchiveSha256 &&
      review.grantResponseSha256 === audit.grantResponseSha256 &&
      review.extractorSha256 === audit.extractorSha256 &&
      /^\d{8}$/.test(review.validFrom) &&
      /^\d{8}$/.test(review.validTo) &&
      review.validFrom <= projection.serviceDate &&
      projection.serviceDate <= review.validTo,
    "DERIVED_GTFS_VERSIONED_REVIEW_BINDING",
  );
  return {
    rebuildBasis: "REVIEWED_DERIVED_STATIC_INPUT",
    rawByteReproductionAvailable: false,
    packageSha256: hash(doc),
    derivedInputSha256: audit.derivedInputSha256,
    nativeAuditSha256: hash(audit),
  };
}

export function prepareDerivedGtfsPackage(
  doc,
  binding,
  action,
  nodes,
  sources,
  evidence,
  generatedAt,
  existingLines = [],
  existingPatterns = [],
) {
  const proof = verifyDerivedGtfsReview(doc, binding, action, generatedAt),
    pack = buildDerivedGtfsPackage(doc);
  invariant(
    canonical(sources.get(pack.source.sourceId)) === canonical(pack.source) &&
      pack.evidence.every(
        (e) => canonical(evidence.get(e.evidenceId)) === canonical(e),
      ),
    "DERIVED_GTFS_SOURCE_EVIDENCE_CONFLICT",
  );
  invariant(
    pack.lines.every(
      (l) => !existingLines.some((old) => old.lineRef === l.lineRef),
    ) &&
      pack.patterns.every(
        (p) =>
          !existingPatterns.some(
            (old) => old.sourcePatternKey === p.sourcePatternKey,
          ),
      ),
    "DERIVED_GTFS_DUPLICATE_SERVICE",
  );
  invariant(
    pack.nodes.every((n) => !nodes.has(id("node", n.identityAnchor))),
    "DERIVED_GTFS_EXISTING_IDENTITY_REQUIRES_REVIEW",
  );
  const admitted = admitNodes(pack.nodes, sources, evidence, [
    ...nodes.values(),
  ]);
  invariant(
    admitted.every((n) => n.decision === "ADMIT_TASK_086_TOPOLOGY"),
    "DERIVED_GTFS_ADMISSION_FAILED",
  );
  const next = new Map(nodes);
  for (const n of admitted) next.set(n.nodeId, n);
  const groups = pack.patterns.map((p) => {
    const pattern = {
      ...p,
      ...(Object.hasOwn(binding, "reviewedServiceDate")
        ? { reviewedServiceDate: binding.reviewedServiceDate }
        : {}),
      servicePatternId: id("pattern", p.sourcePatternKey),
      callingNodes: p.callingNodes.map((c) => ({
        ...c,
        nodeId: id("node", c.identityAnchor),
      })),
    };
    return {
      pattern,
      edges: generatePattern(pattern, next, sources, evidence, generatedAt),
    };
  });
  return {
    admitted,
    reused: [],
    updatedNodes: [],
    lines: pack.lines,
    groups,
    proof,
  };
}

export function reviewedDerivedGtfsComponent(
  selector,
  nodes,
  sources,
  evidence,
) {
  const source = sources.get(selector.derivedGtfsIdentity?.sourceId);
  invariant(source, "DERIVED_GTFS_COMPONENT_REVIEW_REQUIRED");
  validSource(source, selector.derivedGtfsIdentity.serviceDate);
  return reviewedDerivedGtfsComponentModel(selector, nodes, sources, evidence);
}
