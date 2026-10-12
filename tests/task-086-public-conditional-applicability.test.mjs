import * as model from "../tools/transport/task-086-model.mjs";
import { createPublicConditionalApplicability } from "../tools/transport/task-086-public-conditional-applicability.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import { buildFixture } from "./fixtures/task-086-dynamic-od/fixture.mjs";
import {
  hash,
  publicConditionalApplicability,
  queryGraph,
} from "../tools/transport/task-086-model.mjs";
const F = buildFixture(),
  fresh = () => structuredClone(F);
function run(f, contexts = [f.context]) {
  const inventory = [
      {
        requirementId: "office",
        nodeId: f.office.nodeId,
        tier: "T3",
        kind: "public_pickup_facility",
      },
      {
        requirementId: "airport",
        nodeId: f.airport.nodeId,
        tier: "T1",
        kind: "airport",
      },
    ],
    deficits = [
      {
        deficitId: "connect:office",
        class: "MISSING_INTERMEDIATE_NODE",
        requirementId: "office",
      },
      {
        deficitId: "mode:airport",
        class: "AIRPORT_SURFACE_GAP",
        requirementId: "airport",
      },
      { deficitId: "mode:required-highway-gateways", class: "HIGHWAY_BUS_GAP" },
      { deficitId: "source:global", class: "SOURCE_LICENSE_GAP" },
    ];
  return publicConditionalApplicability({
    nodes: [f.office, f.airport],
    edges: f.edges,
    inventory,
    anchorNodeId: f.airport.nodeId,
    deficits,
    contexts,
    validationContext: f.validation,
  });
}
const qualified = (r) =>
  r.assessments.filter(
    (x) =>
      x.status === "STRUCTURALLY_CONNECTED_WITH_PUBLIC_RESERVATION_CONDITIONS",
  );
test("PUBLIC evidence yields structural office and real ground round trip while original default failures and global obligations remain", () => {
  const f = fresh(),
    r = run(f);
  assert.equal(qualified(r).length, 2);
  assert.equal(queryGraph(f.edges, f.office.nodeId, f.airport.nodeId), null);
  assert.equal(r.assessments.length, 4);
  assert(r.assessments.every((a) => a.defaultStatus === "FAIL"));
  assert.deepEqual(
    r.assessments.slice(2).map((a) => a.status),
    ["OPEN", "OPEN"],
  );
  assert.equal(r.reportsOnlyApplicableStructuralAssessments, true);
  assert.equal(r.consumedByAuditAndAcceptance, true);
  assert.equal(r.bookingConfirmed, false);
  assert.equal(r.timedItinerary, false);
  assert.equal(r.assessments[1].surfaceWitness.forward.edgeIds.length, 1);
  assert.equal(r.assessments[1].surfaceWitness.reverse.edgeIds.length, 1);
});
test("outgoing and return may require independent valid contexts, neither context alone qualifies both directions", () => {
  const f = fresh(),
    a = structuredClone(f.context),
    b = structuredClone(f.context);
  a.odReservationIntents.splice(1);
  b.odReservationIntents.splice(0, 1);
  b.odReservationIntents[0].requestAt = "2026-10-04T13:00:00+09:00";
  b.odReservationIntents[0].pickupAt = "2026-10-04T14:00:00+09:00";
  assert.equal(qualified(run(f, [a])).length, 0);
  assert.equal(qualified(run(f, [b])).length, 0);
  assert.equal(qualified(run(f, [a, b])).length, 2);
});
test("default contexts never confer public reservation eligibility", () =>
  assert.equal(qualified(run(fresh(), [])).length, 0));
test("previous structural result reopens when all supported service dates have expired", () => {
  const f = fresh();
  assert.equal(qualified(run(f)).length, 2);
  f.context.travelDate = "2027-02-01";
  for (const i of f.context.odReservationIntents) {
    i.requestAt = "2027-02-01T09:00:00+09:00";
    i.pickupAt = "2027-02-01T10:00:00+09:00";
  }
  assert.equal(qualified(run(f)).length, 0);
});
test("outside actual service hours reopens both structural checks", () => {
  const f = fresh();
  for (const i of f.context.odReservationIntents)
    i.pickupAt = "2026-10-04T18:00:00+09:00";
  assert.equal(qualified(run(f)).length, 0);
});
test("02:00 phone request is unavailable even if pickup and lead are valid", () => {
  const f = fresh();
  for (const i of f.context.odReservationIntents)
    i.requestAt = "2026-10-04T02:00:00+09:00";
  assert.equal(qualified(run(f)).length, 0);
});
test("planning at 02:00 can prove a future 09:30 request opportunity without asserting booking now", () => {
  const f = fresh();
  f.context.planningAt = "2026-10-04T02:00:00+09:00";
  assert.equal(qualified(run(f)).length, 2);
});
test("too late reservation reopens both structural checks", () => {
  const f = fresh();
  for (const i of f.context.odReservationIntents)
    i.requestAt = "2026-10-04T09:31:00+09:00";
  assert.equal(qualified(run(f)).length, 0);
});
test("resident and hotel user qualifications cannot substitute for PUBLIC visitor contract", () => {
  for (const profile of ["RESIDENT_ALL_VILLAGE", "HOTEL_GUEST"]) {
    const f = fresh();
    for (const i of f.context.odReservationIntents) i.profile = profile;
    assert.equal(qualified(run(f)).length, 0);
  }
});
test("revoked condition evidence fails closed rather than retaining prior structural success", () => {
  const f = fresh();
  assert.equal(qualified(run(f)).length, 2);
  const od = [...f.validation.dynamicODById.values()][0];
  f.validation.sources.get(
    f.validation.evidence.get(od.parameterEvidenceRefs.minimumLeadMinutes)
      .sourceId,
  ).rightsClass = "REVOKED";
  assert.throws(() => run(f));
});
test("wrong facility role and native coordinate tampering cannot create public witness", () => {
  for (const field of ["mode", "latitude"]) {
    const f = fresh();
    f.office[field] = field === "mode" ? "flight" : 0;
    assert.throws(() => run(f));
  }
});
test("one missing direction is rejected by independent complete registry", () => {
  const f = fresh();
  f.edges.pop();
  assert.throws(() => run(f), /OD_REGISTERED_EDGE_MISSING/);
});
test("removing registry together with all conditional edge markers cannot launder public walks", () => {
  const f = fresh();
  f.validation.dynamicODById.clear();
  for (const e of f.edges) {
    for (const k of [
      "dynamicODRef",
      "conditionalTopology",
      "accessContract",
      "accessContractSha256",
      "reservation",
    ])
      delete e[k];
    e.edgeKind = "hub_transfer";
  }
  assert.throws(() => run(f), /PUBLIC_STRUCTURE_OD_REGISTRY_STRIPPED/);
});
test("wrong boarding cannot be smuggled through conditional structure", () => {
  const f = fresh();
  f.edges[0].boardAllowed = false;
  assert.throws(() => run(f), /OD_EDGE_STRIPPED_OR_CHANGED/);
});
test("all conditional paths carry full registry fingerprint and independently replayable context", () => {
  const f = fresh(),
    r = run(f),
    p = r.assessments[0].nationalOrCorridorWitness.forward;
  assert.equal(
    p.accessContext.evidenceContextSha256,
    r.validationBindingSha256,
  );
  assert(p.evidenceRefs.length > 0);
  assert.deepEqual(
    queryGraph(f.edges, p.from, p.to, {
      ...p.accessContext,
      odValidationContext: f.validation,
    }),
    p.edgeIds,
  );
});
import { auditGraph, acceptance } from "../tools/transport/task-086-model.mjs";
function actualAudit(
  f,
  conditionalAccessContexts = [f.context],
  discoveryGaps = [],
) {
  return auditGraph({
    nodes: [f.airport, f.office],
    patterns: [],
    transfers: [],
    edges: f.edges,
    inventory: [
      {
        requirementId: "airport",
        nodeId: f.airport.nodeId,
        tier: "T0",
        kind: "airport",
      },
      {
        requirementId: "office",
        nodeId: f.office.nodeId,
        tier: "T1",
        kind: "public_pickup_facility",
      },
    ],
    corridors: [
      {
        corridorId: "required-public-pair",
        from: f.airport.nodeId,
        to: f.office.nodeId,
        origin: "TASK_MANDATORY_QUERY_ONLY",
      },
    ],
    anchorNodeId: f.airport.nodeId,
    discoveryGaps,
    validationContext: f.validation,
    conditionalAccessContexts,
  });
}
test("actual audit and acceptance consume structural conditions with all original IDs/default diagnostic retained", () => {
  const f = fresh(),
    defaultAudit = actualAudit(f, []),
    a = actualAudit(f);
  assert(defaultAudit.hardDeficitCount > 0);
  assert.equal(a.hardDeficitCount, 0);
  assert.equal(a.tier.T1.connected, 1);
  assert.equal(a.defaultDiagnostics.tier.T1.connected, 0);
  assert.deepEqual(
    new Set(a.structuralChecks.map((x) => x.checkId)),
    new Set(defaultAudit.deficits.map((x) => x.deficitId)),
  );
  assert(
    a.structuralChecks.every(
      (x) =>
        x.defaultDiagnostic === "FAIL" &&
        x.status === "PASS_WITH_PUBLIC_RESERVATION_CONDITIONS",
    ),
  );
  assert.equal(
    acceptance(
      a,
      [],
      () => {
        throw Error("No exemption");
      },
      { test: "PASS" },
    ).status,
    "PASS / READY_FOR_REVIEW",
  );
  assert.equal(queryGraph(f.edges, f.airport.nodeId, f.office.nodeId), null);
});
test("actual acceptance remains IN_PROGRESS for unchanged global source obligation", () => {
  const f = fresh(),
    gap = {
      deficitId: "source:global",
      class: "SOURCE_LICENSE_GAP",
      reason: "UNRESOLVED_OTHER_SOURCES",
    },
    a = actualAudit(f, [f.context], [gap]);
  assert.deepEqual(a.deficits, [gap]);
  const gate = acceptance(
    a,
    [],
    () => {
      throw Error("No exemption");
    },
    { test: "PASS" },
  );
  assert.equal(gate.status, "IN_PROGRESS_AUTO_REMEDIATION");
  assert.equal(gate.unprovedDeficitCount, 1);
  assert(
    a.structuralChecks.some(
      (x) => x.checkId === gap.deficitId && x.status === "FAIL",
    ),
  );
});
test("real audit and acceptance reopen formerly satisfied checks when reservation opportunity expires", () => {
  const f = fresh();
  assert.equal(actualAudit(f).hardDeficitCount, 0);
  for (const i of f.context.odReservationIntents)
    i.requestAt = "2026-10-04T09:31:00+09:00";
  const a = actualAudit(f);
  assert(a.hardDeficitCount > 0);
  assert(a.structuralChecks.every((x) => x.status === "FAIL"));
  assert.equal(
    acceptance(a, [], () => {}, { test: "PASS" }).status,
    "IN_PROGRESS_AUTO_REMEDIATION",
  );
});
test("real audit cannot consume previous success after provenance revocation", () => {
  const f = fresh();
  assert.equal(actualAudit(f).hardDeficitCount, 0);
  const od = [...f.validation.dynamicODById.values()][0];
  f.validation.sources.get(
    f.validation.evidence.get(od.parameterEvidenceRefs.minimumLeadMinutes)
      .sourceId,
  ).derivedDataAllowed = false;
  assert.throws(() => actualAudit(f));
});
test("conditional published corridors include independent directional context and full source fingerprint", () => {
  const f = fresh(),
    a = actualAudit(f),
    c = a.corridors.find((x) => x.corridorId === "required-public-pair");
  assert.equal(c.status, "PASS");
  assert.equal(c.defaultDiagnostic, "FAIL");
  assert.equal(
    c.connectivity,
    "STRUCTURALLY_CONNECTED_WITH_PUBLIC_RESERVATION_CONDITIONS",
  );
  assert.equal(
    c.validationBindingSha256,
    a.conditionalApplicability.validationBindingSha256,
  );
  for (const [from, to, ids, ctx] of [
    [c.from, c.to, c.forwardEdgeIds, c.forwardAccessContext],
    [c.to, c.from, c.reverseEdgeIds, c.reverseAccessContext],
  ])
    assert.deepEqual(
      queryGraph(f.edges, from, to, {
        ...ctx,
        odValidationContext: f.validation,
      }),
      ids,
    );
});
import { assertPublicStructuralConsumption } from "../tools/transport/task-086-stage.mjs";
function consumeFixture() {
  const f = fresh(),
    gap = {
      deficitId: "independently-reviewed-global",
      class: "TOURISM_SPECIAL_MODE_GAP",
    },
    a = actualAudit(f, [f.context], [gap]);
  return { f, a, gap };
}
test("stage conditional consistency permits a separately reviewed global closure without declaring it conditionally satisfied", () => {
  const { a, gap } = consumeFixture();
  assert.equal(
    a.conditionalApplicability.assessments.find(
      (x) => x.checkId === gap.deficitId,
    ).status,
    "OPEN",
  );
  assertPublicStructuralConsumption(
    a.conditionalApplicability,
    a.structuralChecks,
    [],
    new Set([gap.deficitId]),
  );
});
test("stage still rejects deleting an unqualified local structural failure", () => {
  const { f } = consumeFixture();
  for (const i of f.context.odReservationIntents)
    i.requestAt = "2026-10-04T09:31:00+09:00";
  const a = actualAudit(f);
  assert.throws(
    () =>
      assertPublicStructuralConsumption(
        a.conditionalApplicability,
        a.structuralChecks,
        [],
      ),
    /PUBLIC_STRUCTURAL_DEFICIT_STATE_MISMATCH/,
  );
});
test("stage prohibits granting a global gap conditional success even when marked independently reviewed", () => {
  const { a, gap } = consumeFixture(),
    r = structuredClone(a.conditionalApplicability),
    checks = structuredClone(a.structuralChecks);
  r.assessments.find((x) => x.checkId === gap.deficitId).status =
    "STRUCTURALLY_CONNECTED_WITH_PUBLIC_RESERVATION_CONDITIONS";
  checks.find((x) => x.checkId === gap.deficitId).status =
    "PASS_WITH_PUBLIC_RESERVATION_CONDITIONS";
  assert.throws(
    () =>
      assertPublicStructuralConsumption(
        r,
        checks,
        [],
        new Set([gap.deficitId]),
      ),
    /PUBLIC_CONDITIONS_CANNOT_CLOSE_GLOBAL/,
  );
});
test("stage refuses stripping a default check ID from the independent registry", () => {
  const { a } = consumeFixture();
  a.structuralChecks.pop();
  assert.throws(
    () =>
      assertPublicStructuralConsumption(
        a.conditionalApplicability,
        a.structuralChecks,
        a.deficits,
      ),
    /PUBLIC_STRUCTURAL_CHECK_REGISTRY_CHANGED/,
  );
});

function assessCandidateSelfPath(node) {
  const f = fresh(),
    nodeId = node?.nodeId ?? "missing-candidate";
  // Standalone zero-edge identity fixture. There are no OD records or rides in this graph.
  const validation = {
    sources: f.validation.sources,
    evidence: new Map(
      [...f.validation.evidence].filter(
        ([, e]) => e.record?.kind !== "dynamic_od",
      ),
    ),
    patternById: new Map(),
    nodes: new Map(node ? [[nodeId, node]] : []),
  };
  return publicConditionalApplicability({
    nodes: node ? [node] : [],
    edges: [],
    inventory: [
      { requirementId: "candidate", nodeId, tier: "T0", kind: "airport" },
    ],
    anchorNodeId: nodeId,
    deficits: [
      {
        deficitId: "connect:candidate",
        class: "DISCONNECTED_T0",
        requirementId: "candidate",
      },
    ],
    contexts: [f.context],
    validationContext: validation,
  });
}
test("missing candidate selfpath stays OPEN without admission attempt", () => {
  assert.equal(qualified(assessCandidateSelfPath(undefined)).length, 0);
});
test("unadmitted discovery selfpath stays OPEN without undefined-anchor hashing", () => {
  const n = {
    nodeId: "discovery-hold",
    decision: "HOLD",
    canonicalNameJa: "Unresolved discovery",
  };
  assert.equal(qualified(assessCandidateSelfPath(n)).length, 0);
});
test("HOLD node with otherwise valid identity cannot gain conditional admission", () => {
  const n = { ...fresh().airport, nodeId: "hold-copy", decision: "HOLD" };
  assert.equal(qualified(assessCandidateSelfPath(n)).length, 0);
});
for (const field of ["identityAnchor", "identitySignature"])
  test("claimed ADMIT missing " + field + " remains OPEN", () => {
    const n = { ...fresh().airport, nodeId: "missing-" + field };
    delete n[field];
    assert.equal(qualified(assessCandidateSelfPath(n)).length, 0);
  });
test("copied legitimate anchor and evidence with forged node ID remains OPEN", () => {
  const n = { ...fresh().airport, nodeId: "forged-node-id" };
  assert.equal(qualified(assessCandidateSelfPath(n)).length, 0);
});
test("claimed ADMIT missing native evidence remains OPEN", () => {
  const n = { ...fresh().airport, evidenceRefs: [] };
  assert.equal(qualified(assessCandidateSelfPath(n)).length, 0);
});
test("claimed ADMIT with unbound native record remains OPEN", () => {
  const n = structuredClone(fresh().airport);
  n.identityRecord.latitude += 1;
  assert.equal(qualified(assessCandidateSelfPath(n)).length, 0);
});
test("claimed ADMIT with forged signature remains OPEN", () => {
  const n = { ...fresh().airport, identitySignature: "0".repeat(64) };
  assert.equal(qualified(assessCandidateSelfPath(n)).length, 0);
});

test("no public conditional edges skips futile searches while retaining registry validation and every failure", () => {
  const f = fresh();
  const validation = {
    ...f.validation,
    evidence: new Map(
      [...f.validation.evidence].filter(
        ([, e]) => e.record?.kind !== "dynamic_od",
      ),
    ),
    dynamicODById: new Map(),
  };
  const deficits = [
    {
      deficitId: "connect:missing",
      class: "MISSING_INTERMEDIATE_NODE",
      requirementId: "missing",
    },
  ];
  const input = {
    nodes: [...validation.nodes.values()],
    edges: f.priorEdges,
    inventory: [
      {
        requirementId: "missing",
        nodeId: "absent",
        tier: "T3",
        kind: "rail_station",
      },
    ],
    anchorNodeId: f.anchor,
    deficits,
    contexts: [f.context],
    validationContext: validation,
  };
  let queries = 0,
    edgeChecks = 0;
  const assess = createPublicConditionalApplicability({
    ...model,
    queryGraph: (...args) => {
      queries++;
      return model.queryGraph(...args);
    },
    validateEdges: (...args) => {
      edgeChecks++;
      return model.validateEdges(...args);
    },
  });
  const actual = assess(input);
  assert.equal(queries, 0);
  assert.equal(edgeChecks, 1);
  assert.deepEqual(actual.originalCheckIdsPreserved, ["connect:missing"]);
  assert.deepEqual(actual.assessments[0].originalDefaultFailure, deficits[0]);
  assert.equal(actual.assessments[0].status, "OPEN");
  assert.equal(actual.assessments[0].nationalOrCorridorWitness, null);
});
