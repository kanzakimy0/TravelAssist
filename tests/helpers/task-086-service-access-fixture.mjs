import assert from "node:assert/strict";
import { hash, id, admitNodes } from "../../tools/transport/task-086-model.mjs";
import {
  generateConditionalPattern,
  validateConditionalEdges,
} from "./task-086-service-access-harness.mjs";
export function fixture(
  audience = "PUBLIC",
  directionalOperators = {
    outbound: "test-only-carrier",
    inbound: "test-only-carrier",
  },
) {
  const operators = [...new Set(Object.values(directionalOperators))];
  const source = {
    sourceId: "synthetic-test-only",
    url: "https://fixture.invalid/conditional",
    observedAt: "2026-10-03",
    contentSha256: hash("fixture"),
    persistenceAllowed: true,
    derivedDataAllowed: true,
    redistributionAllowed: true,
    rightsDecision: "TEST_ONLY",
  };
  const sources = new Map([[source.sourceId, source]]),
    evidence = new Map();
  const seal = (key, record) => {
    evidence.set(key, {
      evidenceId: key,
      sourceId: source.sourceId,
      sourceSha256: source.contentSha256,
      locator: "synthetic only",
      record,
      recordSha256: hash(record),
    });
    return key;
  };
  seal("condition-proof", {
    publicEligibility: audience === "PUBLIC",
    reservation: "prior-day17:00PHONE",
    noBookingNoDispatch: true,
    validFrom: "2026-09-01",
    validTo: "2026-10-20",
  });
  const contract = {
    schemaVersion: 1,
    kind: "BOOKABLE_PASSENGER_SERVICE",
    audience,
    eligibilityKeys:
      audience === "PUBLIC"
        ? []
        : ["hotel:synthetic-property:registered-guest"],
    reservation: {
      requirement: "REQUIRED",
      method: "PHONE",
      deadline: { daysBefore: 1, localTime: "17:00", timeZone: "Asia/Tokyo" },
      noBookingNoDispatch: true,
    },
    validFrom: "2026-09-01",
    validTo: "2026-10-20",
    operatingDays: "DAILY",
    sourceEvidenceRefs: ["condition-proof"],
  };
  const { sourceEvidenceRefs, ...accessTerms } = contract;
  seal("condition-proof", {
    kind: "REVIEWED_SERVICE_ACCESS_CONDITION",
    accessTerms,
  });
  const nodeRows = admitNodes(
    ["port", "bank", "airport"].map((name) => {
      const record = { name, operators };
      const ref = seal("identity:" + name, record);
      return {
        identityAnchor: "test:" + name,
        canonicalNameJa: name,
        nodeKind: "bus_stop",
        mode: "demand_shared_taxi",
        latitude: 35,
        longitude: 135,
        operatorRefs: operators,
        lineRefs: ["test-only-line"],
        sourceRefs: [source.url],
        evidenceRefs: [ref],
        identityRecord: record,
        independentReview: {
          decision: "ADMIT_TASK_086_TOPOLOGY",
          recordSha256: hash(record),
        },
        hubSemantics: "EXPLICIT_COMPONENT",
      };
    }),
    sources,
    evidence,
  );
  assert.ok(nodeRows.every((x) => x.decision === "ADMIT_TASK_086_TOPOLOGY"));
  const nodes = new Map(nodeRows.map((n) => [n.nodeId, n])),
    ids = Object.fromEntries(
      nodeRows.map((n) => [n.canonicalNameJa, n.nodeId]),
    );
  function pattern(direction, names, restrictions) {
    const operator = directionalOperators[direction];
    const components = names.map((name) => ({
      name,
      operator,
      line: "test-only-line",
      mode: "demand_shared_taxi",
    }));
    const calls = names.map((name, i) => ({
      nodeId: ids[name],
      sequence: i,
      ...restrictions[i],
    }));
    const fact = {
      kind: "service",
      operator,
      callingStations: names,
      callingComponents: components,
      callingRestrictions: restrictions,
      accessContract: structuredClone(contract),
      corroboratingConditionEvidenceRefs: ["condition-proof"],
    };
    const factRef = seal("fact:" + direction, fact);
    const resolved = {
      sourceFactRef: factRef,
      callingNodes: calls,
      lineRef: "test-only-line",
      operatorRef: operator,
      mode: "demand_shared_taxi",
      serviceClass: "airport reservation taxi",
      direction,
      accessContract: structuredClone(contract),
    };
    const ref = seal("pattern:" + direction, resolved);
    return {
      ...resolved,
      servicePatternId: "synthetic-" + direction,
      segmentOperators: Array(names.length - 1).fill(operator),
      sourceRefs: [source.url],
      evidenceRefs: [ref],
      sequenceEvidence: "OFFICIAL_CALLING_SEQUENCE",
      strictFactBinding: true,
      serviceState: "active",
      metrics: {},
    };
  }
  const outbound = pattern(
    "outbound",
    ["port", "bank", "airport"],
    [
      { pickupType: "0", dropOffType: "1" },
      { pickupType: "0", dropOffType: "1" },
      { pickupType: "1", dropOffType: "0" },
    ],
  );
  const inbound = pattern(
    "inbound",
    ["airport", "bank", "port"],
    [
      { pickupType: "0", dropOffType: "1" },
      { pickupType: "1", dropOffType: "0" },
      { pickupType: "1", dropOffType: "0" },
    ],
  );
  const generate = (p) =>
    generateConditionalPattern(p, nodes, sources, evidence, "2026-10-03");
  const patternById = new Map(
    [outbound, inbound].map((p) => [p.servicePatternId, p]),
  );
  const edges = [...generate(outbound), ...generate(inbound)];
  validateConditionalEdges(edges, sources, evidence, patternById);
  const context = {
    kind: "EXPLICIT_CONDITIONAL_PLANNING",
    travelDate: "2026-10-03",
    acceptedContracts: [hash(contract)],
    eligibilityKeys: [],
    publicStructureOnly: true,
    reservationIntents: [
      {
        contractSha256: hash(contract),
        travelDate: "2026-10-03",
        kind: "REQUEST_BEFORE_DEADLINE",
        planningAt: "2026-10-01T00:00:00Z",
      },
    ],
  };
  return {
    sources,
    evidence,
    seal,
    nodes,
    ids,
    contract,
    outbound,
    inbound,
    generate,
    edges,
    context,
    patternById,
  };
}
