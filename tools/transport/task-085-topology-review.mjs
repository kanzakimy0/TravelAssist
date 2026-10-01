import { readFileSync, writeFileSync } from "node:fs";
import {
  digest,
  stable,
  jsonl,
  makeBindings,
  admitNodes,
  identityFor,
} from "./task-085-access-core.mjs";
import { straightDistanceM } from "../../src/shared/poi-edge-graph/index.ts";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
const fileSha = (f) =>
  createHash("sha256").update(readFileSync(f)).digest("hex");
import { auditGate0 } from "./task-085-gate0.mjs";
const root = "data/transport/access/inputs/";
const read = (f) => JSON.parse(readFileSync(root + f, "utf8"));
const lines = (f) =>
  readFileSync(root + f, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
const base = [
  ...lines("s12-source-records.jsonl"),
  ...lines("gtfs-source-records.jsonl"),
  ...lines("expanded-gtfs-source-records.jsonl"),
  ...lines("p11-source-records.jsonl"),
  ...lines("named-source-records.jsonl"),
  ...lines("supplemental-source-records.jsonl"),
];
const facts = read("gateway-fact-reviews.json");
const pois = JSON.parse(
  readFileSync(auditGate0().canonical.datasetPath, "utf8"),
).records;
const rights = read("source-rights.json"),
  oldBindings = lines("node-identity-bindings.jsonl");
const normalizedName = (s) => s.normalize("NFKC").replace(/\s+/gu, "");
const names = new Map();
for (const r of base) {
  const key = normalizedName(r.name);
  names.set(key, [...(names.get(key) ?? []), r]);
}
const additions = new Map(),
  evidence = [],
  decisions = [];
for (const fact of facts) {
  const poi = pois.find((p) => p.internalId === fact.poiId);
  if (!poi || fact.reviewStatus !== "OFFICIAL_GATEWAY_FACT_REVIEWED")
    throw Error("FACT_NOT_REVIEWED");
  assert.ok(
    [
      "OFFICIAL_VENUE_ACCESS",
      "OFFICIAL_OPERATOR_GOVERNMENT_ACCESS",
      "OFFICIAL_TOURISM_ACCESS",
      "GTFS_WITH_INDEPENDENT_GATEWAY",
      "LICENSED_ENDPOINT_ROUTE",
    ].includes(fact.evidenceType),
    "UNKNOWN_TOPOLOGY_EVIDENCE_TYPE",
  );
  for (const g of fact.gateways) {
    assert.ok(
      Object.keys(g).every((k) =>
        ["name", "kind", "maxJoinDistanceM", "operators"].includes(k),
      ),
      "UNRECOGNIZED_GATEWAY_FILTER",
    );
    let rows = (names.get(normalizedName(g.name)) ?? [])
      .filter(
        (r) =>
          (g.kind === "rail"
            ? !!r.sourceRows
            : g.kind === "bus"
              ? r.nodeKind === "bus_stop"
              : r.nodeKind === g.kind) &&
          (!g.operators || g.operators.includes(r.operator)),
      )
      .map((r) => ({ r, d: straightDistanceM(poi.location.point, r.point) }))
      .filter((x) => x.d <= (g.maxJoinDistanceM ?? 12000))
      .sort(
        (a, b) =>
          a.d - b.d ||
          a.r.sourceRecordSha256.localeCompare(b.r.sourceRecordSha256),
      );
    // Name disambiguation is confined to the nearest physical named cluster;
    // distant homonyms never inherit the POI's factual access assertion.
    if (rows.length) rows = rows.filter((x) => x.d <= rows[0].d + 750);
    const byOperator = new Map();
    for (const { r } of rows)
      byOperator.set(r.operator, [...(byOperator.get(r.operator) ?? []), r]);
    for (const [operator, components] of byOperator) {
      components.sort((a, b) =>
        a.sourceRecordSha256.localeCompare(b.sourceRecordSha256),
      );
      let r = components[0],
        method = "EXACT_OFFICIAL_NAME_OPERATOR_LOCALITY";
      if (
        components.length > 1 &&
        g.kind === "rail" &&
        fact.allowStationComplexJoin === true &&
        components.every((a) =>
          components.every((b) => straightDistanceM(a.point, b.point) <= 750),
        )
      ) {
        // Task-owned complex adapter, retaining every source component and its HOLD
        // decision. This is not a promotion of any TASK-084 reviewed node.
        const sourceRows = components
          .flatMap((c) => c.sourceRows)
          .sort((a, b) => stable(a).localeCompare(stable(b)));
        r = {
          ...r,
          identityAuthority: "mlit-s12-reviewed-station-complex",
          sourceRows,
          lines: [...new Set(components.flatMap((c) => c.lines))].sort(),
          componentSourceRecordSha256: components
            .map((c) => c.sourceRecordSha256)
            .sort(),
          coordinateSemantics:
            "representative_of_official_station_complex_components_not_entrance",
          point: {
            latitude:
              components.reduce((s, c) => s + c.point.latitude, 0) /
              components.length,
            longitude:
              components.reduce((s, c) => s + c.point.longitude, 0) /
              components.length,
          },
          adapterReview: {
            name: g.name,
            operator,
            decision: "TASK_085_OFFICIAL_GATEWAY_STATION_COMPLEX_JOIN",
            noSourceDecisionOverwritten: true,
          },
        };
        delete r.sourceRecordSha256;
        r.sourceRecordSha256 = digest(r);
        additions.set(r.sourceRecordSha256, r);
        method = "REVIEWED_OFFICIAL_OPERATOR_STATION_COMPLEX";
      }
      if (
        components.length > 1 &&
        g.kind === "bus" &&
        fact.allowBusStopClusterJoin === true &&
        components.every((c) => c.sourceRow?.stop_id) &&
        components.every((a) =>
          components.every(
            (b) =>
              a.sourceId === b.sourceId &&
              straightDistanceM(a.point, b.point) <= 150,
          ),
        )
      ) {
        r = {
          ...r,
          identityAuthority: "task085-reviewed-gtfs-stop-cluster",
          externalId: components
            .map((c) => c.externalId)
            .sort()
            .join("+"),
          componentSourceRecordSha256: components
            .map((c) => c.sourceRecordSha256)
            .sort(),
          componentSourceRows: components.map((c) => c.sourceRow),
          coordinateSemantics:
            "representative_of_reviewed_gtfs_stop_pair_not_directional_boarding_point",
          point: {
            latitude:
              components.reduce((s, c) => s + c.point.latitude, 0) /
              components.length,
            longitude:
              components.reduce((s, c) => s + c.point.longitude, 0) /
              components.length,
          },
          adapterReview: {
            name: g.name,
            operator,
            decision: "TASK_085_OFFICIAL_GATEWAY_BUS_STOP_CLUSTER_JOIN",
            noSourceDecisionOverwritten: true,
          },
        };
        delete r.sourceRecordSha256;
        r.sourceRecordSha256 = digest(r);
        additions.set(r.sourceRecordSha256, r);
        method = "REVIEWED_OFFICIAL_GTFS_STOP_CLUSTER";
      }
      const id = identityFor(r);
      const e = {
        poiId: poi.internalId,
        nodeId: id.nodeId,
        nodeSourceRecordSha256: r.sourceRecordSha256,
        gatewayName: g.name,
        operator,
        evidenceId:
          "topology-evidence:" +
          digest([poi.internalId, id.nodeId, fact.sourceRefs]).slice(0, 24),
        sourceRefs: fact.sourceRefs,
        evidenceType: fact.evidenceType,
        reviewStatus: fact.currentPublicAccess
          ? "APPROVED"
          : "REJECTED_INVALID_GATEWAY",
        gatewayRelationshipVerified: true,
        identityJoinVerified: true,
        identityJoinMethod: method,
        sourceFactReviewSha256: digest(fact),
        reviewedOn: fact.reviewedOn,
        currentPublicAccess: fact.currentPublicAccess,
        accessConditions: fact.accessConditions ?? [],
        factPersistenceDecision: "FACTUAL_TOPOLOGY_ONLY_NO_RAW_PAYLOAD",
        metricsAuthorized: false,
        finding: fact.finding,
      };
      evidence.push(e);
    }
    decisions.push({
      poiId: poi.internalId,
      gatewayName: g.name,
      kind: g.kind,
      sourceFactReviewSha256: digest(fact),
      sourceRefs: fact.sourceRefs,
      matchingComponents: rows.map((x) => ({
        sha256: x.r.sourceRecordSha256,
        operator: x.r.operator,
        straightDistanceM: x.d,
      })),
      status: !fact.currentPublicAccess
        ? "REJECTED_INVALID_OR_HISTORICAL_GATEWAY"
        : rows.length
          ? "JOIN_PROPOSED_REQUIRES_NODE_ADMISSION"
          : "NO_LICENSED_IDENTITY_JOIN",
    });
  }
}
const reviewed = [...additions.values()].sort((a, b) =>
  a.sourceRecordSha256.localeCompare(b.sourceRecordSha256),
);
const existing = new Map(oldBindings.map((b) => [b.nodeId, b]));
for (const b of makeBindings([...base, ...reviewed])) {
  if (existing.has(b.nodeId))
    assert.deepEqual(
      existing.get(b.nodeId),
      b,
      "EXISTING_IDENTITY_REBIND_REQUIRES_REVIEW",
    );
  else existing.set(b.nodeId, b);
}
const bindings = [...existing.values()].sort((a, b) =>
  a.nodeId.localeCompare(b.nodeId),
);
const admissions = admitNodes([...base, ...reviewed], rights, bindings);
const verified = evidence.filter((e) =>
  admissions.some(
    (n) =>
      n.nodeId === e.nodeId &&
      n.sourceRecordSha256 === e.nodeSourceRecordSha256 &&
      n.downstream085Authorized,
  ),
);
writeFileSync(root + "reviewed-source-records.jsonl", jsonl(reviewed));
writeFileSync(root + "node-identity-bindings.jsonl", jsonl(bindings));
writeFileSync(
  root + "topology-review.json",
  JSON.stringify(verified, null, 2) + "\n",
);
writeFileSync(
  root + "gateway-identity-decisions.json",
  JSON.stringify(decisions, null, 2) + "\n",
);
const dependencies = [
  "gateway-fact-reviews.json",
  "source-rights.json",
  "s12-source-records.jsonl",
  "gtfs-source-records.jsonl",
  "expanded-gtfs-source-records.jsonl",
  "p11-source-records.jsonl",
  "named-source-records.jsonl",
  "supplemental-source-records.jsonl",
];
const outputs = [
  "reviewed-source-records.jsonl",
  "node-identity-bindings.jsonl",
  "topology-review.json",
  "gateway-identity-decisions.json",
];
writeFileSync(
  root + "topology-review-seal.json",
  JSON.stringify(
    {
      schemaVersion: "1.0",
      implementationSha256: fileSha(
        "tools/transport/task-085-topology-review.mjs",
      ),
      canonicalDatasetFileSha256: auditGate0().canonical.datasetFileSha256,
      inputs: Object.fromEntries(
        dependencies.map((f) => [f, fileSha(root + f)]),
      ),
      outputs: Object.fromEntries(outputs.map((f) => [f, fileSha(root + f)])),
    },
    null,
    2,
  ) + "\n",
);
for (const p of pois) {
  const es = verified.filter((e) => e.poiId === p.internalId);
  console.log(
    p.names.localized[0].value +
      " | " +
      es.length +
      " | " +
      es.map((e) => e.gatewayName + ":" + e.operator).join("; "),
  );
}
