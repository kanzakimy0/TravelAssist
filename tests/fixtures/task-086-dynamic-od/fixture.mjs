import { publicODOfficeCandidate } from "../../../tools/transport/task-086-public-od-facility.mjs";
import { materializeDynamicODFact } from "../../../tools/transport/task-086-dynamic-od-intake.mjs";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  hash,
  id,
  canonical,
  invariant,
  admitNodes,
  dynamicOD,
  generateDynamicOD,
  validateEdges,
  queryGraph,
  anchorQueries,
  surfaceServiceRoundTrip,
} from "../../../tools/transport/task-086-model.mjs";
import {
  reviewedFactAction,
  validateCorroboratingEvidence,
} from "../../../tools/transport/task-086-source-actions.mjs";
const base = new URL("./", import.meta.url),
  frozen = new URL("./frozen211/", import.meta.url),
  read = (u) => JSON.parse(fs.readFileSync(u, "utf8")),
  rows = (u) =>
    fs.readFileSync(u, "utf8").trim().split(/\r?\n/).map(JSON.parse);
export function buildFixture() {
  const receipt = read(
      new URL("south-daito-office-p05-native-identity-review.json", base),
    ),
    flight = read(
      new URL("south-daito-existing-flight-dependency-review.json", base),
    ),
    news = read(new URL("minamidaito-current-mobi.metadata.json", base)),
    image = read(new URL("mobi-instructions-image.metadata.json", base)),
    terms = read(new URL("mobi-publisher-disclaimer.metadata.json", base));
  const nativeBytes = fs.readFileSync(
      new URL("P05-22_47.geojson", import.meta.url),
    ),
    archive = fs.readFileSync(new URL("p05-22-47-native.zip", base));
  invariant(
    hash(nativeBytes) === receipt.memberSha256 &&
      hash(archive) === receipt.sourceArchiveSha256,
    "P05_NATIVE_HASH",
  );
  const feature = JSON.parse(nativeBytes).features[858];
  invariant(
    hash(feature) === receipt.nativeFeatureCanonicalSha256,
    "P05_FEATURE_HASH",
  );
  const sourceRows = read(new URL("source-rights.json", frozen)).sources,
    sources = new Map(sourceRows.map((x) => [x.sourceId, x])),
    evidence = new Map(
      rows(new URL("topology-evidence.jsonl", frozen)).map((x) => [
        x.evidenceId,
        x,
      ]),
    ),
    nodes = new Map(
      rows(new URL("node-downstream-admission.jsonl", frozen)).map((x) => [
        x.nodeId,
        x,
      ]),
    ),
    priorEdges = rows(new URL("transport-node-edges.jsonl", frozen)),
    patterns = rows(new URL("service-patterns.jsonl", frozen));
  const actionId = "od:south-daito:public-visitor-phone:20261001",
    action = {
      actionId,
      state: "RIGHTS_REVIEWED",
      purpose: "airport",
      sourcesChecked: [
        news,
        {
          url: image.url,
          observedAt: image.observedAt,
          status: 200,
          contentSha256: image.contentSha256,
          bytes: image.bytes,
          privateReviewCacheRetained: true,
          retentionScope: "PRIVATE_IMAGE_EXCLUDED_FROM_PUBLISHED_PACKAGE",
        },
        terms,
      ],
      rightsFindings: [
        {
          rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED",
          termsUrl: terms.url,
          reason:
            "Joint publisher own announcement and instruction image: minimum independently structured public OD scope and required PHONE conditions only; no open raw license, artwork, fare table, prose or image published.",
          observedAt: terms.observedAt,
        },
      ],
    };
  const actions = [action];
  function add(record, key, observation = news, raw = false) {
    const sourceId = id("source", ["south-daito-od-private", key]),
      ref = id("evidence", ["south-daito-od-private", key]),
      source = {
        sourceId,
        url: observation.url,
        contentSha256: raw ? observation.contentSha256 : hash(record),
        evidenceContentSha256: observation.contentSha256,
        observedAt: observation.observedAt,
        rightsClass: raw
          ? "RAW_PERSISTENCE_ALLOWED"
          : "TOPOLOGY_FACT_ONLY_ALLOWED",
        rawPayloadRetained: raw,
        derivedDataAllowed: true,
        redistributionAllowed: true,
        rightsDecision: raw ? "CC_BY_4_0" : "MINIMUM_NONEXPRESSIVE_FACTS_ONLY",
        rightsReview: {
          scope: "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS",
          termsUrl: raw
            ? "https://nlftp.mlit.go.jp/ksj/other/agreement_01.html"
            : terms.url,
          reason: raw
            ? "Official P05-22 CC BY 4.0 native point; exact selection and attribution retained."
            : action.rightsFindings[0].reason,
        },
      };
    sources.set(sourceId, source);
    evidence.set(ref, {
      evidenceId: ref,
      sourceId,
      sourceSha256: source.contentSha256,
      record,
      recordSha256: hash(record),
      locator: key,
    });
    return ref;
  }
  const endpointRecord = {
    kind: "REVIEWED_PUBLIC_OD_ENDPOINTS",
    endpointNames: ["南大東村役場", "南大東空港"],
    sourceActionId: actionId,
    sourceUrl: news.url,
    observedResponseSha256: news.contentSha256,
    corroboratingEvidence: [
      {
        sourceActionId: actionId,
        url: image.url,
        observedResponseSha256: image.contentSha256,
      },
    ],
  };
  reviewedFactAction(
    { ...endpointRecord, factId: "south-daito-endpoints" },
    actions,
  );
  validateCorroboratingEvidence(endpointRecord, actions);
  const endpointRef = add(endpointRecord, "current-public-endpoints");
  const identityRecord = {
    dataset: "P05-22",
    nativeRecordId: "P05_858",
    archiveSha256: receipt.sourceArchiveSha256,
    memberSha256: receipt.memberSha256,
    feature,
    coordinateScope: receipt.coordinateScope,
  };
  const nativeObservation = read(
      new URL("p05-22-47-native.zip.metadata.json", base),
    ),
    nativeRef = add(
      identityRecord,
      "P05-exact-native-office",
      nativeObservation,
      true,
    );
  const { candidate, nativeFacilityByAnchor } = publicODOfficeCandidate({
    archiveBytes: archive,
    memberBytes: nativeBytes,
    review: receipt,
    currentEndpointEvidenceRef: endpointRef,
    sources,
    evidence,
    nativeIdentityEvidenceRef: nativeRef,
  });
  const office = admitNodes([candidate], sources, evidence, [], {
    nativeFacilityByAnchor,
  })[0];
  invariant(
    office.decision === "ADMIT_TASK_086_TOPOLOGY",
    "OFFICE_ADMISSION:" + office.reasons,
  );
  nodes.set(office.nodeId, office);
  const airport = nodes.get(flight.originalAirport.nodeId);
  const accessTerms = {
    audience: "PUBLIC",
    profile: "PUBLIC_VISITOR",
    channel: "PHONE",
    minimumLeadMinutes: 30,
    receptionStart: "07:00",
    receptionEnd: "18:00",
    serviceStart: "08:00",
    serviceEnd: "17:00",
    validFrom: "2026-10-01",
    validTo: "2027-01-31",
    plannedEnd: true,
    timeZone: "Asia/Tokyo",
    operatingDays: "DAILY",
    payment: "CASH",
    dispatchGuarantee: false,
  };
  const { minimumLeadMinutes, ...releaseClaims } = accessTerms,
    observations = [
      {
        conditionId: "visitor-phone-release",
        sourceActionId: actionId,
        sourceUrl: news.url,
        observedResponseSha256: news.contentSha256,
        locator:
          "Visitor service row, dates, operating/reception times, payment, authority; no guarantee asserted",
        claims: releaseClaims,
      },
      {
        conditionId: "visitor-phone-minimum-lead",
        sourceActionId: actionId,
        sourceUrl: image.url,
        observedResponseSha256: image.contentSha256,
        locator:
          "Personally reviewed visitor row PHONE at least 30 minutes before pickup",
        claims: { minimumLeadMinutes },
      },
    ];
  const dynamicODById = new Map(),
    facts = [],
    groups = [];
  for (const [from, to] of [
    [office, airport],
    [airport, office],
  ]) {
    const factId =
        "south-daito-phone:" + from.identityAnchor + ">" + to.identityAnchor,
      fact = {
        factId,
        kind: "dynamic_od",
        locator:
          "Official PUBLIC_VISITOR village office and airport bidirectional OD pair; no intermediate calling sequence",
        endpointIdentityAnchors: [from.identityAnchor, to.identityAnchor],
        sourceActionId: actionId,
        sourceUrl: news.url,
        observedResponseSha256: news.contentSha256,
        operator: "南大東村",
        endpointNames: [from.canonicalNameJa, to.canonicalNameJa],
        accessTerms: structuredClone(accessTerms),
        conditionObservations: structuredClone(observations),
        corroboratingEvidence: [
          {
            sourceActionId: actionId,
            url: image.url,
            observedResponseSha256: image.contentSha256,
          },
        ],
      };
    const materialized = materializeDynamicODFact(fact, {
      phaseId: "south-daito-public-phone-private",
      actions,
      sources,
      evidence,
      nodes,
      nativeFacilityByAnchor,
      generatedAt: "2026-10-03T14:00:00Z",
      factSource: (raw) => {
        const { observed, rights } = reviewedFactAction(raw, actions),
          sourceId = id("source", ["reviewed-dynamic-od-fact", raw.factId]),
          source = {
            sourceId,
            url: raw.sourceUrl,
            contentSha256: hash(raw),
            evidenceContentSha256: observed.contentSha256,
            observedAt: observed.observedAt,
            rightsClass: rights.rightsClass,
            rawPayloadRetained: false,
            derivedDataAllowed: true,
            redistributionAllowed: true,
            rightsDecision: "MINIMUM_NONEXPRESSIVE_FACTS_ONLY",
            rightsReview: {
              scope: "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS",
              termsUrl: rights.termsUrl,
              reason: rights.reason,
            },
          };
        sources.set(sourceId, source);
        return source;
      },
      makeEvidence: (source, record, locator, key) => {
        const evidenceId = id("evidence", key);
        evidence.set(evidenceId, {
          evidenceId,
          sourceId: source.sourceId,
          sourceSha256: source.contentSha256,
          record,
          recordSha256: hash(record),
          locator,
        });
        return evidenceId;
      },
    });
    dynamicODById.set(materialized.od.odId, materialized.od);
    groups.push({
      ...materialized.group,
      generatorSha256: hash("private typed OD prototype"),
    });
    facts.push(fact);
  }
  const validation = {
      sources,
      evidence,
      nodes,
      nativeFacilityByAnchor,
      patternById: new Map(patterns.map((p) => [p.servicePatternId, p])),
      dynamicODById,
    },
    edges = [...dynamicODById.values()].map((od) =>
      generateDynamicOD(od, validation, "2026-10-03T14:00:00Z"),
    );
  const context = {
    kind: "EXPLICIT_CONDITIONAL_PLANNING",
    publicStructureOnly: true,
    planningAt: "2026-10-03T00:00:00Z",
    travelDate: "2026-10-04",
    acceptedContracts: [hash(accessTerms)],
    odReservationIntents: [...dynamicODById.keys()].map((odId) => ({
      odId,
      kind: "REQUEST_BEFORE_PICKUP",
      channel: "PHONE",
      profile: "PUBLIC_VISITOR",
      payment: "CASH",
      requestAt: "2026-10-04T09:30:00+09:00",
      pickupAt: "2026-10-04T10:00:00+09:00",
    })),
    odValidationContext: validation,
  };
  return {
    actions,
    facts,
    groups,
    candidate,
    office,
    airport,
    edges,
    priorEdges,
    validation,
    context,
    accessTerms,
    anchor: read(new URL("connectivity-audit.json", frozen)).anchorNodeId,
  };
}
