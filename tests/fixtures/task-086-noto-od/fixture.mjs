import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  hash,
  id,
  invariant,
  canonical,
  admitNodes,
  generatePattern,
  factCallingRestrictions,
  dynamicOD,
  generateDynamicOD,
  queryGraph,
  validateEdges,
  surfaceServiceRoundTrip,
} from "../../../tools/transport/task-086-model.mjs";
import { buildReviewedFactSourceRecord } from "../../../tools/transport/task-086-remediate.mjs";
import { airportCandidate } from "../../../tools/transport/task-086-airport-identities.mjs";
import { publicODHospitalCandidate } from "../../../tools/transport/task-086-public-od-facility.mjs";
import { materializeDynamicODFact } from "../../../tools/transport/task-086-dynamic-od-intake.mjs";
import {
  reviewedFactAction,
  validateCorroboratingEvidence,
} from "../../../tools/transport/task-086-source-actions.mjs";
const root = process.cwd(),
  d = path.dirname(fileURLToPath(import.meta.url)),
  r = path.join(d, "data/noto-native"),
  old = path.join(d, "data/noto-flight"),
  read = (p) => JSON.parse(fs.readFileSync(p, "utf8").replace(/^\uFEFF/, "")),
  rows = (p) =>
    fs
      .readFileSync(p, "utf8")
      .trim()
      .split(/\r?\n/)
      .filter(Boolean)
      .map(JSON.parse),
  clone = structuredClone;
export function buildNotoFixture() {
  const frozen = path.join(
      root,
      "tests/fixtures/task-086-dynamic-od/frozen211",
    ),
    sources = new Map(
      read(path.join(frozen, "source-rights.json")).sources.map((s) => [
        s.sourceId,
        s,
      ]),
    ),
    evidence = new Map(
      rows(path.join(frozen, "topology-evidence.jsonl")).map((e) => [
        e.evidenceId,
        e,
      ]),
    ),
    nodes = new Map(
      rows(path.join(frozen, "node-downstream-admission.jsonl")).map((n) => [
        n.nodeId,
        n,
      ]),
    ),
    priorEdges = rows(path.join(frozen, "transport-node-edges.jsonl")),
    patternById = new Map(
      rows(path.join(frozen, "service-patterns.jsonl")).map((p) => [
        p.servicePatternId,
        p,
      ]),
    );
  const observation = (p) => {
      const m = read(p);
      return {
        ...m,
        contentSha256: m.contentSha256 ?? m.observedResponseSha256,
      };
    },
    airportMeta = Object.fromEntries(
      [
        "airport-furusato-taxi",
        "airport-furusato-internet",
        "airport-rights",
        "airport-services",
        "airport-facilities",
        "airport-current-flights",
      ].map((k) => [k, observation(path.join(old, k + ".metadata.json"))]),
    ),
    townMeta = {
      faq: observation(
        path.join(r, "../town-hospital-endpoint219.metadata.json"),
      ),
      intro: observation(path.join(r, "hospital-introduction.metadata.json")),
      terms: observation(path.join(r, "town-terms.metadata.json")),
    },
    nativeMeta = observation(path.join(r, "p04-20-17-native.metadata.json")),
    licenseMeta = observation(path.join(r, "p04-2020-catalog.metadata.json"));
  const airportAction = {
      actionId: "od:noto:airport-flight-associated-public:221",
      purpose: "airport",
      state: "RIGHTS_REVIEWED",
      sourcesChecked: Object.values(airportMeta),
      rightsFindings: [
        {
          rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED",
          termsUrl: airportMeta["airport-rights"].url,
          observedAt: airportMeta["airport-rights"].observedAt,
          scope: "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS",
          reason:
            "Only independently structured public booking constraints, actual zone/operator and whole-terminal interface; no raw artwork, prose, timetable clocks or open raw licence. Flight-selected operation is not evidence of ticket-holder eligibility.",
        },
      ],
    },
    townAction = {
      actionId: "od:noto:town-hospital-current-public-endpoint:221",
      purpose: "airport",
      state: "RIGHTS_REVIEWED",
      sourcesChecked: Object.values(townMeta),
      rightsFindings: [
        {
          rightsClass: "TOPOLOGY_FACT_ONLY_ALLOWED",
          termsUrl: townMeta.terms.url,
          observedAt: townMeta.terms.observedAt,
          scope: "MINIMAL_NONEXPRESSIVE_TOPOLOGY_FACTS",
          reason:
            "Minimum independently structured named hospital passenger access and exact current name/address. Copyright reservation on expressive works is retained; no article, image or map republication licence claimed. Airport furusato service is separate from resident-only local taxi.",
        },
      ],
    };
  const nativeAction = {
    actionId: "identity:noto:p04-20-17-hospital:221",
    purpose: "airport",
    state: "RIGHTS_REVIEWED",
    sourcesChecked: [nativeMeta, licenseMeta],
    rightsFindings: [
      {
        rightsClass: "RAW_PERSISTENCE_ALLOWED",
        license: "CC_BY_4_0",
        termsUrl: licenseMeta.url,
        observedAt: licenseMeta.observedAt,
        attribution: "国土交通省 国土数値情報 医療機関データ 2020 P04-20_17",
        reason:
          "2020 P04 catalog explicitly CC BY 4.0; exact licensed archive/member/record retained, selected hospital only, no current clinical status inferred. Changes: one exact native record selected, coordinate scope labelled.",
      },
    ],
  };
  const actions = [
      ...rows(path.join(old, "flight-dependency-actions-private.jsonl")),
      airportAction,
      townAction,
      nativeAction,
    ],
    phaseId = "221-noto-public-flight-associated-od-national-chain";
  function put(source, record, key, locator) {
    const ref = id("evidence", key),
      row = {
        evidenceId: ref,
        sourceId: source.sourceId,
        sourceSha256: source.contentSha256,
        record,
        recordSha256: hash(record),
        locator,
      };
    invariant(
      !evidence.has(ref) || canonical(evidence.get(ref)) === canonical(row),
      "PRIVATE_EVIDENCE_CONFLICT",
    );
    evidence.set(ref, row);
    return ref;
  }
  function factSource(fact) {
    const { observed, rights } = reviewedFactAction(fact, actions);
    validateCorroboratingEvidence(fact, actions);
    const matches = phase.facts.filter(
        (f) =>
          f.sourceActionId === fact.sourceActionId &&
          f.sourceUrl === fact.sourceUrl,
      ),
      source = buildReviewedFactSourceRecord({
        fact,
        observed,
        rights,
        recordSet: matches.length ? matches : [fact],
        rootPath: root,
        networkRootPath: path.join(root, "data/transport/network"),
      });
    sources.set(source.sourceId, source);
    return source;
  }
  const phase = {
      phaseId,
      facts: clone(
        read(path.join(old, "flight-dependency-phase-private.json")).facts,
      ),
      completedActionIds: actions.map((a) => a.actionId),
    },
    flightPatterns = [],
    flightEdges = [],
    c28 = rows(path.join(d, "data/c28-selected.jsonl")),
    c28Source = sources.get("mlit:c28:21");
  for (const fact of phase.facts) {
    const source = factSource(fact),
      sourceFactRef = put(
        source,
        fact,
        ["fact", phaseId, fact.factId],
        fact.locator,
      ),
      restrictions = factCallingRestrictions(fact),
      callingNodes = fact.callingComponents.map((c, i) => {
        const native = c28.find(
            (r) => r.referencePointId === c.airportIdentity.referencePointId,
          ),
          nativeRef = put(
            c28Source,
            native,
            ["c28", native.referencePointId],
            fact.locator,
          ),
          q = {
            requirementId: c.airportIdentity.requirementId,
            name: c.airportIdentity.expectedRequirementName,
            kind: "airport",
            nodeId: id("node", c.airportIdentity.requirementId),
            tier:
              nodes.get(id("node", c.airportIdentity.requirementId))
                ?.nodeLevel ?? "T1",
          },
          candidate = airportCandidate(
            c,
            native,
            q,
            [nativeRef, sourceFactRef],
            fact,
          ),
          admitted = admitNodes([candidate], sources, evidence, [])[0];
        invariant(
          admitted.decision === "ADMIT_TASK_086_TOPOLOGY",
          "NOTO_AIRPORT:" + admitted.reasons,
        );
        const existing = nodes.get(admitted.nodeId);
        if (existing?.decision === "ADMIT_TASK_086_TOPOLOGY")
          invariant(
            existing.identitySignature === admitted.identitySignature,
            "AIRPORT_REBIND",
          );
        else nodes.set(admitted.nodeId, admitted);
        return { nodeId: admitted.nodeId, sequence: i + 1, ...restrictions[i] };
      });
    const resolved = {
        factId: fact.factId,
        callingNodes,
        lineRef: id("line", [fact.operator, fact.line]),
        operatorRef: fact.operator,
        mode: fact.mode,
        serviceClass: fact.serviceClass,
        direction: fact.direction,
        sourceFactRef,
      },
      ref = put(
        source,
        resolved,
        ["resolved-pattern", phaseId, fact.factId],
        fact.locator,
      ),
      p = {
        ...resolved,
        servicePatternId: id("pattern", [phaseId, fact.factId]),
        evidenceRefs: [ref],
        sourceRefs: [source.url],
        sequenceEvidence: "OFFICIAL_CALLING_SEQUENCE",
        segmentOperators: [fact.operator],
        serviceState: fact.serviceState,
        serviceStateScope: fact.serviceStateScope,
        metrics: {},
        strictFactBinding: true,
      };
    flightPatterns.push(p);
    patternById.set(p.servicePatternId, p);
    flightEdges.push(
      ...generatePattern(p, nodes, sources, evidence, "2026-10-01T00:00:00Z"),
    );
  }
  const ref = (action, m) => ({
      sourceActionId: action.actionId,
      url: m.url,
      observedResponseSha256: m.contentSha256,
    }),
    endpoint = {
      kind: "REVIEWED_PUBLIC_OD_ENDPOINTS",
      factId: "noto-public-hospital-endpoints221",
      endpointNames: ["能登空港", "公立宇出津総合病院"],
      currentHospitalAddress: "鳳珠郡能登町字宇出津タ字97番地",
      sourceActionId: townAction.actionId,
      sourceUrl: townMeta.faq.url,
      observedResponseSha256: townMeta.faq.contentSha256,
      corroboratingEvidence: [
        ref(townAction, townMeta.intro),
        ref(airportAction, airportMeta["airport-furusato-taxi"]),
      ],
      locator:
        "Hospital Q1 names airport furusato access separately from residents-only local taxi; current introduction exact name/address. Airport bidirectional requested boarding/alighting place coverage includes this named facility, subject to assignment/confirmation.",
    },
    endpointSource = factSource(endpoint),
    endpointRef = put(
      endpointSource,
      endpoint,
      "current-endpoint",
      endpoint.locator,
    ),
    review = read(path.join(r, "exact-hospital-native-identity.json")),
    archiveBytes = fs.readFileSync(path.join(r, "p04-20-17-native.zip")),
    memberBytes = fs.readFileSync(path.join(r, "P04-20_17.geojson")),
    gmlBytes = fs.readFileSync(path.join(r, "P04-20_17.xml")),
    feature = read(path.join(r, "p04-selected-hospital-records.json"))
      .matches[0],
    identityRecord = {
      dataset: "P04-20",
      nativeRecordId: "DE01_721",
      pointReferenceId: "pt721",
      archiveSha256: review.sourceArchiveSha256,
      memberSha256: review.geojsonMemberSha256,
      gmlMemberSha256: review.gmlMemberSha256,
      feature,
      coordinateScope: review.coordinateScope,
    },
    nativeSource = {
      sourceId: "mlit:p04:20:17:noto-hospital221",
      url: nativeMeta.url,
      contentSha256: hash(archiveBytes),
      observedAt: nativeMeta.observedAt,
      rightsClass: "RAW_PERSISTENCE_ALLOWED",
      rawPayloadRetained: true,
      derivedDataAllowed: true,
      redistributionAllowed: true,
      rightsDecision: "CC_BY_4_0",
      retainedArchive: "sources/raw/mlit-p04-20-17-noto-hospital.zip",
      rightsReview: {
        termsUrl: licenseMeta.url,
        licenseEvidenceSha256: licenseMeta.contentSha256,
        attribution: "国土交通省 国土数値情報 医療機関データ 2020 P04-20_17",
        changes:
          "One exact hospital record selected; native geometry unchanged; representative-point scope labelled.",
      },
    };
  sources.set(nativeSource.sourceId, nativeSource);
  const nativeRef = put(
      nativeSource,
      identityRecord,
      "native-P04-hospital",
      "Exact DE01_721 → pt721, linked GML and GeoJSON current name/address; historic clinical counts not asserted current.",
    ),
    factoryArgs = {
      archiveBytes,
      memberBytes,
      gmlBytes,
      review,
      currentEndpointEvidenceRef: endpointRef,
      sources,
      evidence,
      nativeIdentityEvidenceRef: nativeRef,
    },
    { candidate, nativeFacilityByAnchor } =
      publicODHospitalCandidate(factoryArgs),
    hospital = admitNodes([candidate], sources, evidence, [], {
      nativeFacilityByAnchor,
    })[0];
  invariant(
    hospital.decision === "ADMIT_TASK_086_TOPOLOGY",
    "HOSPITAL_ADMISSION:" + hospital.reasons,
  );
  nodes.set(hospital.nodeId, hospital);
  const airport = nodes.get(id("node", "review:official-airport:能登")),
    dynamicODById = new Map(),
    odEdges = [];
  for (const [from, to, index] of [
    [airport, hospital, 0],
    [hospital, airport, 1],
  ]) {
    const p = flightPatterns[index],
      f = evidence.get(p.sourceFactRef).record,
      accessTerms = {
        contractKind: "NOTO_FLIGHT_ASSOCIATED_PUBLIC_OD_V1",
        audience: "PUBLIC",
        profile: "PUBLIC_AIRPORT_SERVICE_REQUEST",
        channels: ["PHONE", "INTERNET"],
        reservationDeadline: {
          dayOffset: -1,
          localTime: "15:00",
          timeZone: "Asia/Tokyo",
        },
        timeZone: "Asia/Tokyo",
        payment: "CASH",
        operation: "FOLLOW_SELECTED_AIRPORT_FLIGHT_SERVICE",
        noReservationNoDispatch: true,
        divertedArrivalCancelsMatchingTaxi: true,
        capacityGuaranteed: false,
        dispatchGuarantee: false,
        assignedPlaceRequired: true,
        operatorConfirmationRequired: true,
        airportBoundConfirmation: "PREVIOUS_DAY_18:00",
        routePolicy: "MAJOR_ROADS_PROVIDER_SELECTED_POSSIBLE_SHARED_STOPS",
        validFrom: "2026-03-29",
        validTo: "2026-10-24",
        flightService: {
          servicePatternId: p.servicePatternId,
          sourceFactRef: p.sourceFactRef,
          flightCode: f.reviewedFlightCode,
          reviewedServiceDate: f.reviewedServiceDate,
        },
      },
      { validFrom, validTo, flightService, ...airportClaims } = accessTerms,
      observations = [
        {
          conditionId: "noto-public-booking-operation",
          sourceActionId: airportAction.actionId,
          sourceUrl: airportMeta["airport-furusato-taxi"].url,
          observedResponseSha256:
            airportMeta["airport-furusato-taxi"].contentSha256,
          claims: airportClaims,
          corroboratingEvidence: [
            ref(airportAction, airportMeta["airport-furusato-internet"]),
            ref(townAction, townMeta.faq),
          ],
          locator:
            "Current bidirectional requested pickup/drop-off places; phone/web previous-day15 deadline; flight-linked dispatch and assignment/capacity rules. PUBLIC profile is the bounded reviewed public service request, not ticket-holder or residency condition. ContractKind is derived protocol label, not quoted source.",
        },
        {
          conditionId: "noto-reviewed-flight-operation-association:" + index,
          sourceActionId: airportAction.actionId,
          sourceUrl: airportMeta["airport-current-flights"].url,
          observedResponseSha256:
            airportMeta["airport-current-flights"].contentSha256,
          claims: { validFrom, validTo, flightService },
          locator:
            "Own-airport current Mar29-Oct24 directional ANA service; source-bound internal pattern/fact association, not newly copied clocks or actual live-flight status.",
        },
      ],
      fact = {
        factId: "noto-public-od221:" + index,
        kind: "dynamic_od",
        sourceActionId: airportAction.actionId,
        sourceUrl: airportMeta["airport-furusato-taxi"].url,
        observedResponseSha256:
          airportMeta["airport-furusato-taxi"].contentSha256,
        operator: "株式会社恋路観光バス",
        endpointNames: [from.canonicalNameJa, to.canonicalNameJa],
        endpointIdentityAnchors: [from.identityAnchor, to.identityAnchor],
        accessTerms,
        conditionObservations: observations,
        corroboratingEvidence: [
          ref(townAction, townMeta.faq),
          ref(townAction, townMeta.intro),
          ref(airportAction, airportMeta["airport-services"]),
        ],
        locator:
          "Exact Nototown zone3 airport/hospital conditional public OD request in this direction; no fixed calls, guaranteed curb, route or confirmed booking. Published各地→airport supports requested hospital pickup; independent Q1 confirms named airport→hospital service.",
      };
    phase.facts.push(fact);
  }
  for (const fact of phase.facts.filter((f) => f.kind === "dynamic_od")) {
    const m = materializeDynamicODFact(fact, {
      phaseId,
      actions,
      sources,
      evidence,
      nodes,
      nativeFacilityByAnchor,
      patternById,
      generatedAt: "2026-10-01T00:00:00Z",
      factSource,
      makeEvidence: (source, record, locator, key) =>
        put(source, record, key, locator),
    });
    dynamicODById.set(m.od.odId, m.od);
    odEdges.push(m.edge);
  }
  const validation = {
      sources,
      evidence,
      nodes,
      nativeFacilityByAnchor,
      patternById,
      dynamicODById,
    },
    context = {
      kind: "EXPLICIT_CONDITIONAL_PLANNING",
      publicStructureOnly: true,
      planningAt: "2026-10-02T09:00:00+09:00",
      travelDate: "2026-10-03",
      acceptedContracts: [...dynamicODById.values()].map((od) =>
        hash(od.accessTerms),
      ),
      odReservationIntents: [...dynamicODById.values()].map((od) => ({
        odId: od.odId,
        kind: "REQUEST_BEFORE_PICKUP",
        channel: "PHONE",
        profile: "PUBLIC_AIRPORT_SERVICE_REQUEST",
        payment: "CASH",
        requestAt: "2026-10-02T15:00:00+09:00",
        pickupAt: "2026-10-03T11:00:00+09:00",
        flightCode: od.accessTerms.flightService.flightCode,
        flightServicePatternId: od.accessTerms.flightService.servicePatternId,
        flightServiceStatus: "PLANNED_OPERATING",
        acceptsOperatorAssignedPlace: true,
        requestsOperatorConfirmation: true,
        acceptsNoDispatchGuarantee: true,
      })),
      odValidationContext: validation,
    };
  return {
    phase,
    actions,
    factoryArgs,
    candidate,
    hospital,
    airport,
    flightPatterns,
    flightEdges,
    odEdges,
    edges: [...flightEdges, ...odEdges],
    validation,
    context,
    priorEdges,
    baseline: "frozen211-fixture-not-current-national-proof",
    facilityConfig: {
      facilityKind: "P04_HOSPITAL",
      archivePath: nativeSource.retainedArchive,
      memberPath: "sources/raw/mlit-p04-20-17-noto-hospital.geojson",
      gmlPath: "sources/raw/mlit-p04-20-17-noto-hospital.xml",
      review,
      nativeIdentityEvidenceRef: nativeRef,
      currentEndpointEvidenceRef: endpointRef,
      sourcePackagePaths: [
        "sources/noto-p04-hospital221.json",
        "sources/noto-public-hospital-endpoints221.json",
      ],
    },
    facilityPacks: [
      { source: nativeSource, evidence: [evidence.get(nativeRef)] },
      { source: endpointSource, evidence: [evidence.get(endpointRef)] },
    ],
    anchor: read(path.join(frozen, "connectivity-audit.json")).anchorNodeId,
  };
}
