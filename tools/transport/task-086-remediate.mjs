import {
  DERIVED_GTFS_KIND,
  buildDerivedGtfsPackage,
  prepareDerivedGtfsPackage,
  reviewedDerivedGtfsComponent,
} from "./task-086-derived-gtfs.mjs";
import {
  loadAcceptanceInputs,
  reviewGlobalGaps,
  staticReviewInputHashes,
} from "./task-086-acceptance-inputs.mjs";
import {
  busStopCandidate,
  P11_ARCHIVE_SHA256,
} from "./task-086-bus-identities.mjs";
import fs from "node:fs";
import { prepareLicensedGtfsPackage } from "./task-086-licensed-package.mjs";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";
import {
  hash,
  exactRecordMap,
  factCallingRestrictions,
  factThroughOperators,
  reviewedRailTransition,
  reviewedGtfsComponent,
  RAIL_NODE_KIND_BY_MODE,
  id,
  canonical,
  compare,
  invariant,
  admitNodes,
  generatePattern,
  generateTransfer,
  validateEdges,
  growInventory,
  auditGraph,
  queryGraph,
  resolveCorridorEndpoints,
  acceptance,
  assertTerminalResult,
} from "./task-086-model.mjs";
import {
  readJson,
  readRows,
  atomicWrite,
  jsonBytes,
  jsonlBytes,
  executeBatches,
} from "./task-086-batches.mjs";
import {
  transitionAction,
  retainedExtractedFacts,
  reviewedFactAction,
  nextSourceAction,
} from "./task-086-source-actions.mjs";
import {
  airportCandidate,
  C28_ARCHIVE_SHA256,
} from "./task-086-airport-identities.mjs";
import {
  roadTerminalCandidate,
  roadStopCandidate,
  P36_ARCHIVE_SHA256,
} from "./task-086-road-identities.mjs";
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const networkRoot = path.join(root, "data/transport/network");
const upstream = path.join(
  root,
  "data/transport/nodes/task-084-b-v2-amendment-review",
);
const generatedAt = "2026-10-01T00:00:00Z";
const countBy = (rows, key) =>
  Object.fromEntries(
    [...new Set(rows.map((r) => r[key] ?? "unassigned"))]
      .sort(compare)
      .map((k) => [
        k,
        rows.filter((r) => (r[key] ?? "unassigned") === k).length,
      ]),
  );
const parseRows = (s) =>
  s.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);
export function runRemediation({
  output = networkRoot,
  rerunBatch = null,
  repair = false,
  terminal = false,
} = {}) {
  const origin = readJson(path.join(networkRoot, "checkpoints/origin.json"));
  const archive = fs.readFileSync(
    path.join(networkRoot, "checkpoints", origin.archive),
  );
  invariant(
    hash(archive) === origin.archiveSha256,
    "BASELINE_CHECKPOINT_HASH_MISMATCH",
  );
  const snapshot = JSON.parse(gunzipSync(archive));
  invariant(snapshot.checkpointHead === origin.head, "BASELINE_HEAD_MISMATCH");
  const old = snapshot.files,
    rows = (name) => parseRows(old[name]),
    obj = (name) => JSON.parse(old[name]);
  const oldManifest = obj("manifest.json");
  let legacySkipped = 0;
  for (const [name, body] of Object.entries(old).filter(
    ([n]) => n.startsWith("batches/") || n.startsWith("batch-receipts/"),
  )) {
    const target = path.join(output, name);
    if (fs.existsSync(target)) {
      if (hash(fs.readFileSync(target)) !== hash(body)) {
        invariant(
          repair && name.includes(rerunBatch),
          "CORRUPTED_PRESERVED_CHECKPOINT:" + name,
        );
        atomicWrite(target, body);
      } else if (name.startsWith("batches/")) legacySkipped++;
    } else atomicWrite(target, body);
  }
  const identities = readRows(
    path.join(networkRoot, "research/s12-identities.jsonl"),
  );
  const airportIdentities = readRows(
    path.join(networkRoot, "research/c28-identities.jsonl"),
  );
  const highwayIdentities = readRows(
    path.join(networkRoot, "research/p36-identities.jsonl"),
  );
  const busIdentities = readRows(
    path.join(networkRoot, "research/p11-identities.jsonl"),
  );
  const discovery = readRows(path.join(upstream, "rail-components.jsonl"));
  const hubScopes = readRows(
    path.join(upstream, "hub-component-completeness-review.jsonl"),
  ).filter((h) => h.expectedComponents.length > 1);
  const actions = readRows(path.join(networkRoot, "next-source-actions.jsonl"));
  const phaseFiles = fs
    .readdirSync(path.join(networkRoot, "research/phases"))
    .filter((n) => n.endsWith(".json"))
    .sort(compare);
  const phases = phaseFiles.map((n) =>
    readJson(path.join(networkRoot, "research/phases", n)),
  );
  const packs = fs
    .readdirSync(path.join(networkRoot, "sources"))
    .filter((n) => n.endsWith(".json"))
    .map((n) => readJson(path.join(networkRoot, "sources", n)))
    .filter((p) => p.source)
    .map((p) =>
      p.kind === DERIVED_GTFS_KIND ? buildDerivedGtfsPackage(p) : p,
    );
  const sources = exactRecordMap(
    packs.map((p) => p.source),
    "sourceId",
    "SOURCE",
  );
  const evidence = exactRecordMap(
    packs.flatMap((p) => p.evidence),
    "evidenceId",
    "EVIDENCE",
  );
  const nodes = new Map(
    rows("node-downstream-admission.jsonl").map((n) => [n.nodeId, n]),
  );
  const patterns = rows("service-patterns.jsonl"),
    lines = rows("transport-lines.jsonl"),
    edges = rows("transport-node-edges.jsonl");
  const history = rows("adaptive-model-iterations.jsonl"),
    originalHistoryLength = history.length;
  let inventory = obj("required-backbone-inventory.json").nodes;
  const originalInventory = structuredClone(inventory);
  const anchorNodeId = obj("connectivity-audit.json").anchorNodeId;
  const mandatory = obj("corridor-query-results.json")
    .results.filter((c) => c.origin === "TASK_MANDATORY_QUERY_ONLY")
    .map((c) =>
      Object.fromEntries(
        Object.entries(c).filter(
          ([key]) =>
            !["forwardEdgeIds", "reverseEdgeIds", "status"].includes(key),
        ),
      ),
    );
  const transfers = edges
    .filter((e) => e.edgeKind === "hub_transfer")
    .map((e) => ({
      transferId: e.edgeId,
      from: e.fromTransportNodeId,
      to: e.toTransportNodeId,
    }));
  const review = readJson(path.join(networkRoot, "sources/source-review.json"));
  const globalReviews = readJson(
    path.join(networkRoot, "research/global-review.v1.json"),
  );
  const acceptanceInputs = loadAcceptanceInputs(networkRoot);
  const reviewBytes = new Map(
    globalReviews.reviews
      .flatMap((r) => r.inputBindings)
      .map((r) => [r.path, fs.readFileSync(path.join(root, r.path))]),
  );
  const sourceFacts = phases.flatMap((p) => p.facts);
  for (const fact of sourceFacts) reviewedFactAction(fact, actions);
  const nodeReviews = [],
    hubReviews = [],
    groups = [],
    completed = [];
  const identityAction = actions.find((a) => a.actionId === "government-s12");
  const rawIdentity = identityAction.sourcesChecked.find(
    (s) => s.rawPayloadRetained && s.status === 200,
  );
  invariant(
    rawIdentity &&
      hash(fs.readFileSync(path.join(root, rawIdentity.retainedPath))) ===
        rawIdentity.contentSha256,
    "S12_ARCHIVE_BINDING",
  );
  const identitySource = {
    sourceId: "mlit:s12:25",
    url: rawIdentity.url,
    contentSha256: rawIdentity.contentSha256,
    observedAt: rawIdentity.observedAt,
    rightsClass: "RAW_PERSISTENCE_ALLOWED",
    persistenceAllowed: true,
    derivedDataAllowed: true,
    redistributionAllowed: true,
    rightsDecision: "CC_BY_4_0_ATTRIBUTION",
    attribution:
      "国土交通省 国土数値情報 駅別乗降客数 S12 FY2024; CC BY 4.0; geometry identity only",
    retainedArchive: "sources/raw/mlit-s12-25.zip",
  };
  sources.set(identitySource.sourceId, identitySource);
  const airportAction = actions.find(
    (a) => a.actionId === "government:c28:airport-identities",
  );
  const airportRaw = airportAction?.sourcesChecked.find(
    (s) => s.rawPayloadRetained && s.status === 200,
  );
  invariant(
    airportRaw &&
      airportRaw.contentSha256 === C28_ARCHIVE_SHA256 &&
      hash(fs.readFileSync(path.join(root, airportRaw.retainedPath))) ===
        C28_ARCHIVE_SHA256,
    "C28_ARCHIVE_BINDING",
  );
  const airportSource = {
    sourceId: "mlit:c28:21",
    url: airportRaw.url,
    contentSha256: C28_ARCHIVE_SHA256,
    observedAt: airportRaw.observedAt,
    rightsClass: "RAW_PERSISTENCE_ALLOWED",
    persistenceAllowed: true,
    derivedDataAllowed: true,
    redistributionAllowed: true,
    rightsDecision: "MLIT_C28_COMMERCIAL_USE_ATTRIBUTION_AND_LIMITATIONS",
    termsUrl: "https://nlftp.mlit.go.jp/ksj/other/agreement_02.html",
    attribution:
      "国土数値情報（空港 C28-21、2021-12-31時点）（国土交通省）をTravelAssistが加工して作成。商用可・旧国土情報利用約款。出典・加工者・権利と適用限界を継承。https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-C28-v3_0.html ; https://nlftp.mlit.go.jp/ksj/other/agreement_02.html",
    limitations:
      "Historical whole-airport reference coordinates may contain spatial/time errors. Not terminal entrances, precise navigation, current manager, current service or interchange evidence. Independently checked current passenger access is required.",
    retainedArchive: "sources/raw/mlit-c28-21.zip",
  };
  sources.set(airportSource.sourceId, airportSource);
  const highwayAction = actions.find(
    (a) => a.actionId === "government:p36:highway-stop-identities",
  );
  const highwayRaw = highwayAction?.sourcesChecked.find(
    (s) => s.rawPayloadRetained && s.status === 200,
  );
  invariant(
    highwayRaw &&
      highwayRaw.contentSha256 === P36_ARCHIVE_SHA256 &&
      hash(fs.readFileSync(path.join(root, highwayRaw.retainedPath))) ===
        P36_ARCHIVE_SHA256,
    "P36_ARCHIVE_BINDING",
  );
  const highwaySource = {
    sourceId: "mlit:p36:23",
    url: highwayRaw.url,
    contentSha256: P36_ARCHIVE_SHA256,
    observedAt: highwayRaw.observedAt,
    rightsClass: "RAW_PERSISTENCE_ALLOWED",
    persistenceAllowed: true,
    derivedDataAllowed: true,
    redistributionAllowed: true,
    rightsDecision: "CC_BY_4_0_ATTRIBUTION",
    termsUrl:
      "https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P36-2023.html",
    attribution:
      "国土交通省 国土数値情報 高速バス停留所 P36-23 (2023年度); CC BY 4.0; TravelAssist independently extracts operator-specific identity and explicit point-reference relationships.",
    limitations:
      "Source dates vary around November 2023. Representative operator stops, not individual platforms or precise navigation. No current service order or transfer inference. Same-place records remain distinct.",
    retainedArchive: "sources/raw/mlit-p36-23.zip",
  };
  sources.set(highwaySource.sourceId, highwaySource);

  const busAction = actions.find(
    (a) => a.actionId === "government:p11:reviewed-airport-bus-identities",
  );
  const busRaw = busAction?.sourcesChecked.find(
    (s) => s.rawPayloadRetained && s.status === 200,
  );
  invariant(
    busRaw &&
      busRaw.contentSha256 === P11_ARCHIVE_SHA256 &&
      hash(fs.readFileSync(path.join(root, busRaw.retainedPath))) ===
        P11_ARCHIVE_SHA256 &&
      ["RIGHTS_REVIEWED", "INGESTED"].includes(busAction.state) &&
      busAction.rightsFindings.at(-1)?.rightsClass ===
        "RAW_PERSISTENCE_ALLOWED",
    "P11_ARCHIVE_BINDING",
  );
  const busSource = {
    sourceId: "mlit:p11:22",
    url: busRaw.url,
    contentSha256: P11_ARCHIVE_SHA256,
    observedAt: busRaw.observedAt,
    rightsClass: "RAW_PERSISTENCE_ALLOWED",
    persistenceAllowed: true,
    derivedDataAllowed: true,
    redistributionAllowed: true,
    rightsDecision: "MLIT_P11_2022_OPEN_DATA_PDL_1_0_ATTRIBUTION",
    termsUrl: "https://nlftp.mlit.go.jp/ksj/other/agreement.html",
    attribution:
      "国土数値情報（バス停留所 P11-22、2022年度）（国土交通省）をTravelAssistが加工して作成。2022年度オープンデータ・PDL 1.0。https://nlftp.mlit.go.jp/ksj/gml/datalist/KsjTmplt-P11-v3_0.html",
    limitations:
      "Source combines same-road, same-operator, same-name directions. Historical representative operator-stop identity only; not a platform, entrance, route order, present service or transfer. Current independently reviewed service and passenger access required. The separate noncommercial 2010 edition is excluded.",
    retainedArchive: "sources/raw/mlit-p11-22.zip",
  };
  sources.set(busSource.sourceId, busSource);

  const makeEvidence = (source, record, locator, key) => {
    const row = {
      evidenceId: id("evidence", key),
      sourceId: source.sourceId,
      sourceSha256: source.contentSha256,
      record,
      recordSha256: hash(record),
      locator,
    };
    const prior = evidence.get(row.evidenceId);
    invariant(!prior || canonical(prior) === canonical(row), "EVIDENCE_REBIND");
    evidence.set(row.evidenceId, row);
    return row.evidenceId;
  };
  const factSource = (fact) => {
    const { observed, rights } = reviewedFactAction(fact, actions);
    if (observed.rawPayloadRetained)
      invariant(
        rights.rightsClass === "RAW_PERSISTENCE_ALLOWED" &&
          observed.retainedPath &&
          hash(fs.readFileSync(path.join(root, observed.retainedPath))) ===
            observed.contentSha256,
        "RETAINED_FACT_SOURCE_HASH_MISMATCH",
      );
    const recordSet = sourceFacts.filter(
      (f) =>
        f.sourceActionId === fact.sourceActionId &&
        f.sourceUrl === fact.sourceUrl,
    );
    const source = {
      sourceId: id("source", [fact.sourceActionId, fact.sourceUrl]),
      url: fact.sourceUrl,
      contentSha256: hash(recordSet),
      evidenceContentSha256: observed.contentSha256,
      evidenceFingerprintScope:
        observed.fingerprintScope ?? "RAW_RESPONSE_BYTES",
      observedAt: observed.observedAt,
      rightsClass: rights.rightsClass,
      rawPayloadRetained: observed.rawPayloadRetained === true,
      ...(observed.rawPayloadRetained
        ? {
            retainedArchive: path
              .relative(networkRoot, path.join(root, observed.retainedPath))
              .split(path.sep)
              .join("/"),
            retainedArchiveSha256: observed.contentSha256,
          }
        : {}),
      derivedDataAllowed: true,
      redistributionAllowed: true,
      metricPersistenceAllowed: false,
      rightsDecision: observed.rawPayloadRetained
        ? "LICENSED_RAW_WITH_REVIEWED_TOPOLOGY_DERIVATION"
        : "MINIMUM_NONEXPRESSIVE_FACTS_ONLY",
      rightsReview: {
        scope: "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS",
        termsUrl: rights.termsUrl,
        reason: rights.reason,
      },
      attribution:
        fact.sourceAttribution ??
        fact.sourceUrl +
          "; operator factual topology; reviewed " +
          observed.observedAt,
    };
    sources.set(source.sourceId, source);
    return source;
  };
  const bind = (selector, serviceEvidenceRef) => {
    if (selector.derivedGtfsIdentity) {
      invariant(
        evidence.get(serviceEvidenceRef)?.record.kind === "transfer",
        "DERIVED_GTFS_REUSE_TRANSFER_ONLY",
      );
      return reviewedDerivedGtfsComponent(selector, nodes, sources, evidence)
        .nodeId;
    }
    if (selector.gtfsIdentity) {
      invariant(
        evidence.get(serviceEvidenceRef)?.record.kind === "transfer",
        "GTFS_REUSE_TRANSFER_ONLY",
      );
      return reviewedGtfsComponent(selector, nodes, sources, evidence).nodeId;
    }
    if (selector.busIdentity) {
      const matches = busIdentities.filter(
        (r) => r.stopRecordId === selector.busIdentity.stopRecordId,
      );
      invariant(matches.length === 1, "P11_RAW_IDENTITY_NOT_UNIQUE");
      const record = matches[0];
      const ref = makeEvidence(
        busSource,
        record,
        "P11-22 exact operator-stop and point-reference join " +
          record.stopRecordId,
        ["p11", record],
      );
      const candidate = busStopCandidate(
        selector,
        record,
        [ref, serviceEvidenceRef],
        evidence.get(serviceEvidenceRef).record,
      );
      const admitted = admitNodes([candidate], sources, evidence, [])[0];
      invariant(
        admitted.decision === "ADMIT_TASK_086_TOPOLOGY",
        "P11_ADMISSION_FAILED",
      );
      const previous = nodes.get(admitted.nodeId);
      if (previous?.decision === "ADMIT_TASK_086_TOPOLOGY") {
        invariant(
          previous.identitySignature === admitted.identitySignature,
          "P11_ADMISSION_REBIND",
        );
        previous.evidenceRefs = [
          ...new Set([...previous.evidenceRefs, ref, serviceEvidenceRef]),
        ].sort(compare);
        return admitted.nodeId;
      }
      nodes.set(admitted.nodeId, admitted);
      nodeReviews.push({
        nodeId: admitted.nodeId,
        previousDecision: previous?.decision ?? "NOT_IN_REQUIRED_INVENTORY",
        decision: admitted.decision,
        identityRecordSha256: hash(record),
        rawIdentityEvidenceRef: ref,
        serviceEvidenceRef,
        matchedFields: [
          "stopRecordId",
          "stopName",
          "operator",
          "pointReferenceId",
        ],
        sameGroupNotInterchange: true,
      });
      return admitted.nodeId;
    }
    if (selector.airportIdentity) {
      const matches = airportIdentities.filter(
        (r) => r.referencePointId === selector.airportIdentity.referencePointId,
      );
      invariant(matches.length === 1, "AIRPORT_RAW_IDENTITY_NOT_UNIQUE");
      const record = matches[0];
      const requirement = originalInventory.find(
        (r) => r.requirementId === selector.airportIdentity.requirementId,
      );
      const ref = makeEvidence(
        airportSource,
        record,
        "C28-21 airport/reference-point join " + record.referencePointId,
        ["c28", record],
      );
      const candidate = airportCandidate(
        selector,
        record,
        requirement,
        [ref, serviceEvidenceRef],
        evidence.get(serviceEvidenceRef).record,
      );
      const admitted = admitNodes([candidate], sources, evidence, [])[0];
      invariant(
        admitted.decision === "ADMIT_TASK_086_TOPOLOGY",
        "AIRPORT_ADMISSION_FAILED",
      );
      const previous = nodes.get(admitted.nodeId);
      if (previous?.decision === "ADMIT_TASK_086_TOPOLOGY") {
        invariant(
          previous.identitySignature === admitted.identitySignature,
          "AIRPORT_ADMISSION_REBIND",
        );
        previous.evidenceRefs = [
          ...new Set([...previous.evidenceRefs, ref, serviceEvidenceRef]),
        ].sort(compare);
        return admitted.nodeId;
      }
      nodes.set(admitted.nodeId, admitted);
      nodeReviews.push({
        nodeId: admitted.nodeId,
        previousDecision: previous?.decision ?? "NOT_IN_REQUIRED_INVENTORY",
        decision: admitted.decision,
        identityRecordSha256: hash(record),
        rawIdentityEvidenceRef: ref,
        serviceEvidenceRef,
        discoveryCandidateRef: admitted.discoveryCandidateRef,
        matchedFields: [
          "referencePointId",
          "airportName",
          "reviewedRequirementId",
        ],
        sameGroupNotInterchange: true,
      });
      return admitted.nodeId;
    }
    if (selector.terminalIdentity || selector.roadStopIdentity) {
      invariant(
        !(selector.terminalIdentity && selector.roadStopIdentity),
        "P36_AMBIGUOUS_REVIEW_KIND",
      );
      const review = selector.terminalIdentity ?? selector.roadStopIdentity;
      const matches = highwayIdentities.filter(
        (r) => r.stopRecordId === review.stopRecordId,
      );
      invariant(matches.length === 1, "ROAD_TERMINAL_RAW_IDENTITY_NOT_UNIQUE");
      const record = matches[0];
      const requirement = originalInventory.find(
        (r) => r.requirementId === review.requirementId,
      );
      const ref = makeEvidence(
        highwaySource,
        record,
        "P36-23 exact operator-stop and point-reference join " +
          record.stopRecordId,
        ["p36", record],
      );
      const candidate = selector.roadStopIdentity
        ? roadStopCandidate(
            selector,
            record,
            [ref, serviceEvidenceRef],
            evidence.get(serviceEvidenceRef).record,
          )
        : roadTerminalCandidate(selector, record, requirement, [
            ref,
            serviceEvidenceRef,
          ]);
      const admitted = admitNodes([candidate], sources, evidence, [])[0];
      invariant(
        admitted.decision === "ADMIT_TASK_086_TOPOLOGY",
        "ROAD_TERMINAL_ADMISSION_FAILED",
      );
      const previous = nodes.get(admitted.nodeId);
      if (previous?.decision === "ADMIT_TASK_086_TOPOLOGY") {
        invariant(
          previous.identitySignature === admitted.identitySignature,
          "ROAD_TERMINAL_ADMISSION_REBIND",
        );
        previous.evidenceRefs = [
          ...new Set([...previous.evidenceRefs, ref, serviceEvidenceRef]),
        ].sort(compare);
        return admitted.nodeId;
      }
      nodes.set(admitted.nodeId, admitted);
      nodeReviews.push({
        nodeId: admitted.nodeId,
        previousDecision: previous?.decision ?? "NOT_IN_REQUIRED_INVENTORY",
        decision: admitted.decision,
        identityRecordSha256: hash(record),
        rawIdentityEvidenceRef: ref,
        serviceEvidenceRef,
        discoveryCandidateRef: admitted.discoveryCandidateRef,
        matchedFields: selector.roadStopIdentity
          ? ["stopRecordId", "stopName", "operator", "pointReferenceId"]
          : ["stopRecordId", "stopName", "reviewedRequirementId"],
        sameGroupNotInterchange: true,
      });
      return admitted.nodeId;
    }

    const serviceEvidence = evidence.get(serviceEvidenceRef);
    const transition = reviewedRailTransition(
      selector,
      serviceEvidence.record,
      sources.get(serviceEvidence.sourceId).observedAt,
    );
    const archivalOperator = transition?.fromOperator ?? selector.operator;
    const archivalLine = transition?.fromLine ?? selector.line;
    const possible = discovery.filter(
      (n) =>
        n.canonicalNameJa === selector.name &&
        n.operatorRefs.length === 1 &&
        n.operatorRefs[0] === archivalOperator &&
        n.modeFamily === selector.mode &&
        n.lineRefs.includes(archivalLine),
    );
    invariant(
      possible.length <= 1,
      "AMBIGUOUS_DISCOVERY_COMPONENT:" + canonical(selector),
    );
    const candidate = possible[0];
    const raw = identities.filter(
      (r) =>
        r.stationName === selector.name &&
        r.operator === archivalOperator &&
        r.line === archivalLine &&
        (!transition || r.stationCode === transition.stationCode) &&
        (!candidate ||
          r.stationCode ===
            (candidate.sourceStationRefs.find((r) => r.line === archivalLine)
              ?.stationCode ?? candidate.sourcePrimaryStationCode)),
    );
    invariant(
      raw.length > 0 && new Set(raw.map((r) => r.stationCode)).size === 1,
      "RAW_IDENTITY_NOT_UNIQUE:" + canonical(selector),
    );
    // Multiple geometries with the SAME station code are raw representations, not separate operator components.
    raw.sort((a, b) => compare(canonical(a), canonical(b)));
    const record = raw[0],
      ref = makeEvidence(
        identitySource,
        record,
        "S12-25_NumberOfPassengers.geojson station " +
          record.stationCode +
          " / " +
          record.operator +
          " / " +
          record.line,
        ["s12", record],
      );
    const anchor = candidate
      ? "review:" + candidate.proposedTransportNodeId
      : `s12:25:${record.stationCode}:${record.operator}:${selector.mode}`;
    const nodeId = id("node", anchor),
      previous = nodes.get(nodeId);
    if (previous?.decision === "ADMIT_TASK_086_TOPOLOGY") {
      invariant(
        previous.canonicalNameJa === record.stationName &&
          previous.operatorRefs.includes(selector.operator) &&
          canonical(previous.identityTransition ?? null) ===
            canonical(transition),
        "ADMISSION_REBIND",
      );
      previous.lineRefs = [
        ...new Set([...previous.lineRefs, selector.line]),
      ].sort(compare);
      previous.evidenceRefs = [
        ...new Set([...previous.evidenceRefs, ref, serviceEvidenceRef]),
      ].sort(compare);
      return nodeId;
    }
    const node = {
      identityAnchor: anchor,
      canonicalNameJa: record.stationName,
      nodeKind: RAIL_NODE_KIND_BY_MODE[selector.mode],
      nodeLevel: previous?.nodeLevel ?? candidate?.proposedNodeLevel ?? "T3",
      mode: selector.mode,
      operatorRefs: [selector.operator],
      lineRefs: [selector.line],
      ...(transition ? { identityTransition: transition } : {}),
      latitude: record.latitude,
      longitude: record.longitude,
      identityRecord: record,
      origin: "TASK_086_INDEPENDENT_S12_AND_OFFICIAL_SERVICE",
      evidenceRefs: [ref, serviceEvidenceRef],
      independentReview: {
        decision: "ADMIT_TASK_086_TOPOLOGY",
        recordSha256: hash(record),
        method:
          transition?.method ===
          "OFFICIAL_ARCHIVE_OPERATOR_LEGAL_FORM_CORRECTION"
            ? "EXACT_ARCHIVAL_STATION_CODE_AND_DUAL_PRIMARY_LEGAL_FORM_CORRECTION"
            : transition
              ? "EXACT_ARCHIVAL_STATION_CODE_AND_EVIDENCED_CURRENT_OPERATOR_TRANSITION"
              : "EXACT_RAW_STATION_CODE_OPERATOR_LINE_NAME_PLUS_PRIMARY_SERVICE_FACT",
        sourceArchiveSha256: identitySource.contentSha256,
      },
      hubSemantics: "PHYSICAL_OPERATOR_COMPONENT_NO_IMPLICIT_TRANSFER",
      parentHubId: null,
      runtimeImportAuthorized: false,
      discoveryCandidateRef: candidate?.proposedTransportNodeId ?? null,
    };
    const admitted = admitNodes([node], sources, evidence, [])[0];
    invariant(
      admitted.decision === "ADMIT_TASK_086_TOPOLOGY",
      "ADMISSION_FAILED:" + canonical(admitted.reasons),
    );
    nodes.set(nodeId, admitted);
    nodeReviews.push({
      nodeId,
      previousDecision: previous?.decision ?? "NOT_IN_REQUIRED_INVENTORY",
      decision: admitted.decision,
      identityRecordSha256: hash(record),
      rawIdentityEvidenceRef: ref,
      serviceEvidenceRef,
      discoveryCandidateRef: node.discoveryCandidateRef,
      matchedFields: ["stationCode", "stationName", "operator", "line"],
      sameGroupNotInterchange: true,
    });
    return nodeId;
  };
  const hubAudit = () =>
    hubScopes.map((h) => {
      const expected = h.expectedComponents
        .flatMap((c) => c.candidateTransportNodeIds)
        .map((n) => id("node", "review:" + n));
      const scoped = edges.filter(
        (e) => e.edgeKind === "hub_transfer" && e.hubRef === h.proposedHubId,
      );
      const admitted = expected.filter(
        (n) => nodes.get(n)?.decision === "ADMIT_TASK_086_TOPOLOGY",
      );
      const complete =
        expected.length > 1 &&
        admitted.length === expected.length &&
        expected.every(
          (n) =>
            queryGraph(scoped, expected[0], n) !== null &&
            queryGraph(scoped, n, expected[0]) !== null,
        );
      return {
        hubRef: h.proposedHubId,
        name: h.hubReviewName,
        expectedComponentIds: expected,
        admittedComponentIds: admitted,
        reviewedTransferEdgeIds: scoped.map((e) => e.edgeId),
        status: complete
          ? "COMPLETE"
          : scoped.length
            ? "PARTIAL_COMPONENT_PAIRS_REVIEWED"
            : "REVIEW_PENDING",
      };
    });
  const replay = () => {
    const pendingHubs = hubAudit().filter((h) => h.status !== "COMPLETE");
    return auditGraph({
      nodes: [...nodes.values()],
      patterns,
      transfers,
      edges,
      inventory,
      corridors: [
        ...mandatory.map((c) =>
          resolveCorridorEndpoints(c, [...nodes.values()]),
        ),
        ...patterns.map((p) => ({
          corridorId: "service:" + p.servicePatternId,
          from: p.callingNodes[0].nodeId,
          to: p.callingNodes.at(-1).nodeId,
          mode: p.mode,
          origin: "REQUIRED_PATTERN_ENDPOINTS",
        })),
      ],
      anchorNodeId,
      discoveryGaps: [
        ...review.gaps,
        ...pendingHubs.map((h) => ({
          deficitId: "hub-review:" + h.hubRef,
          class: "HUB_TRANSFER_GAP",
          hubRef: h.hubRef,
          reason: "REMAINING_COMPONENTS_REQUIRE_PRIMARY_INTERCHANGE_REVIEW",
        })),
      ],
    });
  };
  let audit = replay();
  const generatorPaths = [
    "task-086-model.mjs",
    "task-086-acceptance-inputs.mjs",
    "task-086-log-safety.mjs",
    "task-086-batches.mjs",
    "task-086-source-actions.mjs",
    "task-086-remediate.mjs",
    "task-086-extract-identities.py",
    "task-086-extract-airports.py",
    "task-086-airport-identities.mjs",
    "task-086-extract-highway-stops.py",
    "task-086-road-identities.mjs",
    "task-086-bus-identities.mjs",
    "task-086-extract-bus-stops.py",
    "task-086-extract-jreast.py",
    "task-086-extract-rail-gtfs.py",
    "task-086-extract-selected-gtfs.py",
    "task-086-licensed-package.mjs",
    "task-086-derived-gtfs.mjs",
    "task-086-extract-derived-gtfs.py",
  ];
  const generatorHashes = Object.fromEntries(
    generatorPaths.map((n) => [
      "tools/transport/" + n,
      hash(fs.readFileSync(path.join(root, "tools/transport", n))),
    ]),
  );
  for (const phase of phases) {
    const before = audit,
      oldEdges = edges.length,
      oldAdmitted = [...nodes.values()].filter(
        (n) => n.decision === "ADMIT_TASK_086_TOPOLOGY",
      ).length;
    const strategyFingerprint = hash(phase.strategy);
    const recent = history.slice(originalHistoryLength).slice(-2);
    invariant(
      !(
        recent.length === 2 &&
        recent.every(
          (h) =>
            h.strategyFingerprint === strategyFingerprint && !h.coreImprovement,
        )
      ),
      "STALLED_STRATEGY_MUST_CHANGE_SOURCE_OPERATOR_OR_METHOD",
    );
    for (const [inputKind, binding] of [
      ...(phase.licensedGtfsPackages ?? []).map((b) => ["raw", b]),
      ...(phase.derivedGtfsPackages ?? []).map((b) => ["derived", b]),
    ]) {
      invariant(
        /^[a-z0-9-]+\.json$/.test(binding.packageFile),
        "LICENSED_GTFS_PACKAGE_PATH_INVALID",
      );
      const pack = readJson(
        path.join(networkRoot, "sources", binding.packageFile),
      );
      const action = actions.find((a) => a.actionId === binding.sourceActionId);
      invariant(
        inputKind === "derived"
          ? pack.kind === DERIVED_GTFS_KIND
          : pack.kind !== DERIVED_GTFS_KIND,
        "GTFS_PACKAGE_INPUT_KIND_MISMATCH",
      );
      const prepared =
        inputKind === "derived"
          ? prepareDerivedGtfsPackage(
              pack,
              binding,
              action,
              nodes,
              sources,
              evidence,
              generatedAt,
              lines,
              patterns,
            )
          : prepareLicensedGtfsPackage(
              pack,
              binding,
              action,
              fs.readFileSync(
                path.join(networkRoot, pack.source.retainedArchive),
              ),
              nodes,
              sources,
              evidence,
              generatedAt,
              lines,
              patterns,
            );
      for (const node of prepared.updatedNodes) nodes.set(node.nodeId, node);
      for (const node of prepared.admitted) {
        nodes.set(node.nodeId, node);
        nodeReviews.push({
          nodeId: node.nodeId,
          previousDecision: "NOT_IN_REQUIRED_INVENTORY",
          decision: node.decision,
          identityRecordSha256: hash(node.identityRecord),
          rawIdentityEvidenceRef: node.evidenceRefs[0],
          matchedFields: [
            "exactFeedStopId",
            "exactLicensedStopRecord",
            "actualCurrentTrip",
          ],
          sameGroupNotInterchange: true,
        });
      }
      for (const line of prepared.lines) {
        const index = lines.findIndex((l) => l.lineRef === line.lineRef);
        if (index < 0) lines.push(line);
        else lines[index] = line;
      }
      for (const item of prepared.groups) {
        const pattern = item.pattern;
        patterns.push(pattern);
        edges.push(...item.edges);
        groups.push({
          groupId: pattern.servicePatternId,
          pattern,
          edges: item.edges,
          sources: [pack.source],
          nodes: [...new Set(pattern.callingNodes.map((c) => c.nodeId))].map(
            (n) => structuredClone(nodes.get(n)),
          ),
          generatorSha256: hash(generatorHashes),
          nextActionDeficitSummary: before.counts,
          ...(prepared.proof ? { rebuildProof: prepared.proof } : {}),
        });
      }
    }
    for (const fact of phase.facts) {
      const source = factSource(fact);
      const factRef = makeEvidence(source, fact, fact.locator, [
        "fact",
        phase.phaseId,
        fact.factId,
      ]);
      if (fact.kind === "service") {
        if (fact.parentCallingStations)
          invariant(
            canonical(
              fact.parentCallingStations.slice(
                fact.sectionStartIndex,
                fact.sectionStartIndex + fact.callingStations.length,
              ),
            ) === canonical(fact.callingStations),
            "NONCONTIGUOUS_OPERATOR_SECTION",
          );
        const restrictions = factCallingRestrictions(fact);
        const through = factThroughOperators(fact);
        const calls = fact.callingStations.map((name, i) => ({
          nodeId: bind(
            fact.callingComponents?.[i] ?? {
              name,
              operator: fact.operator,
              line: fact.line,
              mode: fact.mode,
            },
            factRef,
          ),
          sequence: i + 1,
          ...restrictions[i],
        }));
        const lineRef = id("line", [fact.operator, fact.line]);
        const resolved = {
          factId: fact.factId,
          callingNodes: calls,
          lineRef,
          operatorRef: fact.operator,
          mode: fact.mode,
          serviceClass: fact.serviceClass,
          direction: fact.direction,
          sourceFactRef: factRef,
          ...(through ?? {}),
          ...(fact.mode.includes("bus") ? { purpose: fact.purpose } : {}),
        };
        const resolvedRef = makeEvidence(source, resolved, fact.locator, [
          "resolved-pattern",
          phase.phaseId,
          fact.factId,
        ]);
        const pattern = {
          ...resolved,
          servicePatternId: id("pattern", [phase.phaseId, fact.factId]),
          evidenceRefs: [resolvedRef],
          sourceRefs: [source.url],
          sequenceEvidence: "OFFICIAL_CALLING_SEQUENCE",
          segmentOperators:
            through?.segmentOperators ??
            Array(calls.length - 1).fill(fact.operator),
          ...(through ? { throughServiceEvidenceRefs: [factRef] } : {}),
          serviceState: fact.serviceState,
          serviceStateScope: fact.serviceStateScope,
          metrics: {},
          strictFactBinding: true,
        };
        patterns.push(pattern);
        if (!lines.some((l) => l.lineRef === lineRef))
          lines.push({
            lineRef,
            name: fact.line,
            operatorRef: fact.operator,
            mode: fact.mode,
            evidenceRefs: [factRef],
            sourceRefs: [source.url],
          });
        const generated = generatePattern(
          pattern,
          nodes,
          sources,
          evidence,
          generatedAt,
        );
        edges.push(...generated);
        groups.push({
          groupId: pattern.servicePatternId,
          pattern,
          edges: generated,
          sources: [
            source,
            identitySource,
            ...(fact.callingComponents?.some((c) => c.airportIdentity)
              ? [airportSource]
              : []),
            ...(fact.callingComponents?.some((c) => c.busIdentity)
              ? [busSource]
              : []),
            ...(fact.callingComponents?.some((c) => c.terminalIdentity)
              ? [highwaySource]
              : []),
          ],
          nodes: [...new Set(calls.map((c) => c.nodeId))].map((n) =>
            structuredClone(nodes.get(n)),
          ),
          generatorSha256: hash(generatorHashes),
          nextActionDeficitSummary: before.counts,
        });
      } else if (fact.kind === "transfer") {
        const componentIds = fact.components.map((c) => bind(c, factRef));
        const candidate = discovery.find(
          (d) =>
            d.proposedTransportNodeId ===
            nodes.get(componentIds[0]).discoveryCandidateRef,
        );
        const hubRef = candidate?.proposedParentHubId ?? id("hub", fact.factId);
        const generated = [];
        for (const [fromIndex, toIndex] of fact.directions) {
          invariant(
            fromIndex !== toIndex &&
              componentIds[fromIndex] &&
              componentIds[toIndex],
            "TRANSFER_FACT_DIRECTION_INVALID",
          );
          const resolved = {
            from: componentIds[fromIndex],
            to: componentIds[toIndex],
            hubRef,
            sourceFactRef: factRef,
          };
          const resolvedRef = makeEvidence(source, resolved, fact.locator, [
            "resolved-transfer",
            phase.phaseId,
            fact.factId,
            fromIndex,
            toIndex,
          ]);
          const transfer = {
            ...resolved,
            transferId: id("transfer", [fact.factId, fromIndex, toIndex]),
            evidenceKind: "OFFICIAL_INTERCHANGE",
            directed: true,
            evidenceRefs: [resolvedRef],
            sourceRefs: [source.url],
            metrics: {},
            strictFactBinding: true,
          };
          const edge = generateTransfer(
            transfer,
            nodes,
            sources,
            evidence,
            generatedAt,
          );
          invariant(
            !edges.some((e) => e.edgeId === edge.edgeId),
            "DUPLICATE_TRANSFER_REVIEW",
          );
          transfers.push(transfer);
          edges.push(edge);
          generated.push(edge);
        }
        hubReviews.push({
          hubRef,
          factId: fact.factId,
          evidenceRef: factRef,
          reviewedComponentIds: componentIds,
          status: "COMPONENT_PAIRS_REVIEWED",
          reviewMethod: fact.reviewMethod,
          generatedEdgeIds: generated.map((e) => e.edgeId),
        });
        groups.push({
          groupId: "hub:" + fact.factId,
          pattern: fact,
          edges: generated,
          sources: [
            source,
            identitySource,
            ...(fact.components?.some((c) => c.airportIdentity)
              ? [airportSource]
              : []),
            ...(fact.components?.some((c) => c.busIdentity) ? [busSource] : []),
            ...(fact.components?.some((c) => c.terminalIdentity)
              ? [highwaySource]
              : []),
            ...[
              ...new Set(
                fact.components
                  .filter((c) => c.gtfsIdentity || c.derivedGtfsIdentity)
                  .map(
                    (c) => (c.gtfsIdentity ?? c.derivedGtfsIdentity).sourceId,
                  ),
              ),
            ].map((sourceId) => sources.get(sourceId)),
          ],
          nodes: componentIds.map((n) => structuredClone(nodes.get(n))),
          generatorSha256: hash(generatorHashes),
          nextActionDeficitSummary: before.counts,
        });
      } else throw new Error("UNKNOWN_FACT_KIND:" + fact.kind);
    }
    validateEdges(edges);
    const proposed = inventory.map((r) => ({
      ...r,
      admission: nodes.get(r.nodeId)?.decision ?? r.admission,
    }));
    for (const n of nodes.values())
      if (!proposed.some((r) => r.nodeId === n.nodeId))
        proposed.push({
          requirementId: n.nodeId,
          nodeId: n.nodeId,
          name: n.canonicalNameJa,
          tier: n.nodeLevel,
          kind: n.nodeKind,
          admission: n.decision,
          reason: "REVIEWED_REAL_SERVICE_INTERMEDIATE",
          evidenceRefs: n.evidenceRefs,
        });
    inventory = growInventory(inventory, proposed);
    audit = replay();
    const oldPass = before.corridors.filter(
      (c) => c.origin === "TASK_MANDATORY_QUERY_ONLY" && c.status === "PASS",
    ).length;
    const newPass = audit.corridors.filter(
      (c) => c.origin === "TASK_MANDATORY_QUERY_ONLY" && c.status === "PASS",
    ).length;
    const actualImprovement = {
      addedEdges: edges.length - oldEdges,
      addedNodes:
        [...nodes.values()].filter(
          (n) => n.decision === "ADMIT_TASK_086_TOPOLOGY",
        ).length - oldAdmitted,
      disconnectedT0Delta: before.tier.T0.connected - audit.tier.T0.connected,
      disconnectedT1Delta: before.tier.T1.connected - audit.tier.T1.connected,
      corridorPassGain: newPass - oldPass,
      hardDeficitsReduced: before.hardDeficitCount - audit.hardDeficitCount,
      hubTransferGapDelta:
        audit.counts.HUB_TRANSFER_GAP - before.counts.HUB_TRANSFER_GAP,
      servicePatternGapDelta:
        audit.counts.SERVICE_PATTERN_GAP - before.counts.SERVICE_PATTERN_GAP,
      reviewedHubComponentPairs: phase.facts.filter(
        (f) => f.kind === "transfer",
      ).length,
      newlyConnectedRequiredNodes: audit.connected.filter(
        (n) => !before.connected.includes(n),
      ),
    };
    const coreImprovement =
      actualImprovement.disconnectedT0Delta < 0 ||
      actualImprovement.disconnectedT1Delta < 0 ||
      actualImprovement.corridorPassGain > 0 ||
      actualImprovement.hubTransferGapDelta < 0 ||
      actualImprovement.servicePatternGapDelta < 0;
    history.push({
      iteration: history.length + 1,
      actionId: phase.phaseId,
      actionType: "ACQUIRE_REVIEW_BIND_ADMIT_GENERATE_REPLAY",
      strategyFingerprint,
      strategy: phase.strategy,
      coreImprovement,
      actualImprovement,
      triggerCounts: before.counts,
      remainingDeficits: audit.counts,
      graphSha256: hash(edges),
      phaseSha256: hash(phase),
      T0: audit.tier.T0,
      T1: audit.tier.T1,
      mandatoryCorridorsPassed: newPass,
      nextStrategyRequired:
        !coreImprovement && recent.at(-1)?.coreImprovement === false,
    });
    for (const actionId of phase.completedActionIds ?? [])
      completed.push({ actionId, phase });
  }
  for (const { actionId, phase } of completed) {
    const index = actions.findIndex((a) => a.actionId === actionId);
    invariant(index >= 0, "COMPLETED_ACTION_MISSING");
    const action = actions[index];
    const facts = phase.facts
      .filter(
        (f) =>
          f.sourceActionId === actionId ||
          f.corroboratingEvidence?.some((r) => r.sourceActionId === actionId),
      )
      .map((f) => f.factId);
    action.extractedFacts = [
      ...new Set([
        ...retainedExtractedFacts(action),
        ...facts,
        ...(phase.licensedGtfsPackages ?? [])
          .filter((p) => p.sourceActionId === actionId)
          .map((p) => "licensed-gtfs-package:" + p.packageSha256),
        ...(phase.derivedGtfsPackages ?? [])
          .filter((p) => p.sourceActionId === actionId)
          .map((p) => "derived-gtfs-package:" + p.packageSha256),
        ...(actionId === "government:c28:airport-identities"
          ? ["c28-identities:" + hash(airportIdentities)]
          : []),
        ...(actionId === "government:p36:highway-stop-identities"
          ? ["p36-identities:" + hash(highwayIdentities)]
          : []),
        ...(actionId === "government:p11:reviewed-airport-bus-identities"
          ? ["p11-identities:" + hash(busIdentities)]
          : []),
        ...(actionId === "government-s12"
          ? ["s12-identities:" + hash(identities)]
          : []),
      ]),
    ].sort(compare);
    if (action.state === "RIGHTS_REVIEWED")
      actions[index] = transitionAction(
        action,
        "INGESTED",
        {
          result: "FACTS_BOUND_ADMITTED_AND_GRAPH_REPLAYED",
          nextAction: "FOLLOW_REMAINING_PRIORITIZED_DEFICITS",
          phaseId: phase.phaseId,
          phaseSha256: hash(phase),
        },
        action.sourcesChecked.at(-1).observedAt,
      );
    else invariant(action.state === "INGESTED", "ACTION_NOT_INGESTIBLE");
  }
  for (const action of actions)
    action.extractedFacts = [
      ...new Set([
        ...retainedExtractedFacts(action),
        ...sourceFacts
          .filter((f) => f.sourceActionId === action.actionId)
          .map((f) => f.factId),
      ]),
    ].sort(compare);
  const batches = executeBatches(output, groups, {
    rerunBatch,
    repair,
    allowMissingRerun: true,
  });
  const receipts = [...oldManifest.batchReceipts, ...batches.receipts];
  const admitted = [...nodes.values()].filter(
    (n) => n.decision === "ADMIT_TASK_086_TOPOLOGY",
  );
  const inventoryCheck = growInventory(originalInventory, inventory);
  invariant(
    inventoryCheck.length >= origin.counts.required,
    "BASELINE_INVENTORY_LOST",
  );
  const connectedNodeIds = new Set(
    inventory
      .filter((r) => audit.connected.includes(r.requirementId))
      .map((r) => r.nodeId),
  );
  const currentGlobalGaps = reviewGlobalGaps(review, globalReviews, {
    inventory,
    nodes: [...nodes.values()],
    patterns,
    edges,
    connected: connectedNodeIds,
    readInput: (p) => reviewBytes.get(p),
  });
  const globalIds = new Set(review.gaps.map((g) => g.deficitId));
  audit.deficits = [
    ...audit.deficits.filter((d) => !globalIds.has(d.deficitId)),
    ...currentGlobalGaps,
  ];
  audit.hardDeficitCount = audit.deficits.length;
  for (const k of Object.keys(audit.counts))
    if (k !== "DYNAMIC_METRIC_ONLY_GAP")
      audit.counts[k] = audit.deficits.filter((d) => d.class === k).length;
  const gate = acceptance(
    audit,
    acceptanceInputs.proofs,
    (p) => fs.readFileSync(path.join(root, p)),
    {
      baselinePreservation: "PASS",
      identityEvidenceBinding: "PASS",
      batchReceipts: "PASS",
      deterministicRebuild: "NOT_RUN",
      resumeCorruptionInvalidation: "NOT_RUN",
    },
    actions,
    acceptanceInputs.context,
  );
  const files = new Map(),
    j = (n, v) => files.set(n, jsonBytes(v)),
    l = (n, v) => files.set(n, jsonlBytes(v));
  j("required-backbone-inventory.json", {
    ...obj("required-backbone-inventory.json"),
    nodes: inventory,
  });
  l(
    "node-downstream-admission.jsonl",
    [...nodes.values()].sort((a, b) => compare(a.nodeId, b.nodeId)),
  );
  l(
    "service-patterns.jsonl",
    patterns.sort((a, b) => compare(a.servicePatternId, b.servicePatternId)),
  );
  l(
    "transport-lines.jsonl",
    lines.sort((a, b) => compare(a.lineRef, b.lineRef)),
  );
  l(
    "transport-node-edges.jsonl",
    edges.sort((a, b) => compare(a.edgeId, b.edgeId)),
  );
  for (const [name, kind] of [
    ["service-segment-edges", "service_segment"],
    ["hub-transfer-edges", "hub_transfer"],
    ["direct-service-edges", "direct_service"],
  ])
    l(
      name + ".jsonl",
      edges.filter((e) => e.edgeKind === kind),
    );
  l("topology-unresolved.jsonl", audit.deficits);
  l("dynamic-field-unresolved.jsonl", audit.metricOnly);
  l("fixpoint-proofs.jsonl", acceptanceInputs.proofs);
  l("next-source-actions.jsonl", actions);
  l("independent-node-reviews.jsonl", nodeReviews);
  l("official-hub-reviews.jsonl", hubReviews);
  l("hub-component-review-state.jsonl", hubAudit());
  l(
    "topology-evidence.jsonl",
    [...evidence.values()].sort((a, b) => compare(a.evidenceId, b.evidenceId)),
  );
  j("source-rights.json", {
    ...obj("source-rights.json"),
    sources: [...sources.values()],
    nationalSourceReviews: actions.map((a) => ({
      actionId: a.actionId,
      state: a.state,
      rightsFindings: a.rightsFindings,
      ordinaryWorkRemaining: ![
        "INGESTED",
        "SUPERSEDED_BY_ALTERNATIVE",
      ].includes(a.state),
    })),
  });
  j("connectivity-audit.json", {
    anchorNodeId,
    counts: audit.counts,
    tier: audit.tier,
    connectedRequiredNodes: audit.connected,
    disconnectedRequiredNodes: audit.disconnected,
    requiredNodeCount: inventory.length,
    admittedCount: admitted.length,
    holdCount: nodes.size - admitted.length,
    rejectedCount: 0,
    edgeCountsByKind: countBy(edges, "edgeKind"),
    edgeCountsByMode: countBy(edges, "mode"),
    edgeCountsByOperator: countBy(edges, "operatorRef"),
    servicePatterns: patterns.length,
    hubTransferAudit: {
      explicitTransfers: audit.transferResults,
      pendingV2Scopes: hubAudit().filter((h) => h.status !== "COMPLETE").length,
      completedV2Scopes: hubAudit().filter((h) => h.status === "COMPLETE")
        .length,
      reviewedComponentPairs: hubReviews.length,
    },
    dynamicMetrics: audit.metrics,
  });
  j("corridor-query-results.json", {
    graphSha256: hash(edges),
    results: audit.corridors,
  });
  j("adaptive-model-state.json", {
    ...obj("adaptive-model-state.json"),
    iterationCount: history.length,
    converged: gate.terminal,
    status: gate.status,
    globalTopologyDiscoveryFixpoint: gate.globalTopologyDiscoveryFixpoint,
    stopReason: gate.terminal ? gate.status : null,
    executionState: gate.terminal ? gate.status : "SOURCE_REMEDIATION_REQUIRED",
    remainingOrdinaryDiscovery: gate.ordinaryDiscoveryRemaining,
    nextAction: nextSourceAction(actions),
    remainingDeficits: audit.counts,
  });
  // Retain the original ten iteration records byte-for-byte as the immutable prefix.
  files.set(
    "adaptive-model-iterations.jsonl",
    old["adaptive-model-iterations.jsonl"] +
      jsonlBytes(history.slice(originalHistoryLength)),
  );
  j("final-acceptance-gate.json", gate);
  j("checkpoint.json", {
    lastPassedBatchId: receipts.at(-1).batchId,
    receipts,
    complete: true,
    terminal: gate.terminal,
  });
  for (const [n, body] of files) atomicWrite(path.join(output, n), body);
  const inputPaths = [
    "research/exception-proofs.v1.json",
    "research/stage-scope.json",
    "research/task-revision.v2.json",
    "research/next-stage-scope.v1.json",
    "research/global-review.v1.json",
    "sources/source-review.json",
    "sources/raw/mlit-s12-25.zip",
    "sources/raw/mlit-c28-21.zip",
    "research/c28-identities.jsonl",
    "sources/raw/mlit-p36-23.zip",
    "research/p36-identities.jsonl",
    "sources/raw/mlit-p11-22.zip",
    "research/p11-identities.jsonl",
    "research/p11-selection.json",
    "sources/raw/toei-train-20261001.zip",
    "research/toei-train-selection.json",
    "research/toei-tram-liner-selection.json",
    "checkpoints/origin.json",
    "checkpoints/" + origin.archive,
    "research/s12-identities.jsonl",
    ...phases.flatMap((p) =>
      (p.licensedGtfsPackages ?? []).flatMap((b) => {
        const pack = readJson(path.join(networkRoot, "sources", b.packageFile));
        return [
          "sources/" + b.packageFile,
          pack.source.retainedArchive,
          pack.selection.requestPath,
        ];
      }),
    ),
    ...phases.flatMap((p) =>
      (p.derivedGtfsPackages ?? []).map((b) => "sources/" + b.packageFile),
    ),
    ...phaseFiles.map((n) => "research/phases/" + n),
  ];
  const inputHashes = {
    ...oldManifest.inputHashes,
    ...staticReviewInputHashes(
      reviewBytes,
      new Set(
        [...files.keys(), "manifest.json"].map(
          (n) => "data/transport/network/" + n,
        ),
      ),
    ),
    ...Object.fromEntries(
      inputPaths.map((n) => [
        "data/transport/network/" + n,
        hash(fs.readFileSync(path.join(networkRoot, n))),
      ]),
    ),
  };
  const manifest = {
    ...oldManifest,
    status: gate.status,
    checkpointOrigin: origin,
    inputHashes,
    generatorHashes,
    artifactHashes: Object.fromEntries(
      [...files].map(([n, b]) => [n, hash(b)]),
    ),
    requiredInventoryHash: hash(files.get("required-backbone-inventory.json")),
    batchReceipts: receipts,
    counts: {
      required: inventory.length,
      admitted: admitted.length,
      hold: nodes.size - admitted.length,
      rejected: 0,
      lines: lines.length,
      servicePatterns: patterns.length,
      edges: edges.length,
      iterations: history.length,
    },
    sourceAttribution: [...sources.values()].map((s) => s.attribution),
  };
  atomicWrite(path.join(output, "manifest.json"), jsonBytes(manifest));
  if (terminal) assertTerminalResult(gate, actions);
  const dispositions = countBy(batches.results, "disposition");
  dispositions.CHECKSUM_SKIP =
    (dispositions.CHECKSUM_SKIP ?? 0) + legacySkipped;
  return { manifest, batchDispositions: dispositions };
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  console.log(
    JSON.stringify(
      runRemediation({ terminal: process.argv.includes("--final") }).manifest
        .counts,
      null,
      2,
    ),
  );
