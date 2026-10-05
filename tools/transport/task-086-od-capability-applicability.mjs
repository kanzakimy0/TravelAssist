import {
  CAPABILITY_KIND,
  CAPABILITY_PREREQUISITES,
  capabilityPlain,
  capabilityAllows,
} from "./task-086-od-capability-context.mjs";
export function createODCapabilityApplicability({
  hash,
  canonical,
  admitNodes,
  validateEdges,
  queryGraph,
  allowsServiceAccess,
  priorAssess,
}) {
  const status = "STRUCTURALLY_CONNECTED_WITH_REVIEWED_OD_CAPABILITY";
  return function assess(args) {
    const selected = args.contexts.filter((c) => c.kind === CAPABILITY_KIND),
      prior = priorAssess({
        ...args,
        contexts: args.contexts.filter((c) => c.kind !== CAPABILITY_KIND),
      });
    if (!selected.length) return prior;
    const v = args.validationContext,
      byEdge = new Map(args.edges.map((e) => [e.edgeId, e])),
      byReq = new Map(args.inventory.map((r) => [r.requirementId, r])),
      assessments = prior.assessments.map((a) => ({ ...a })),
      reviews = [];
    for (const c of selected) {
      const r = c.capabilityReview;
      try {
        const need = (ok, code) => {
          if (!ok) throw Error(code);
        };
        need(
          r?.kind === "REVIEWED_PUBLIC_OD_STRUCTURAL_CAPABILITY_V1" &&
            !c.capabilityInputError,
          "CAPABILITY_REVIEW_OR_SOURCE_INVALID",
        );
        const req = byReq.get(r.requirementId),
          airport = v.nodes.get(r.airportNodeId),
          endpoint = v.nodes.get(r.endpointNodeId);
        need(
          req?.kind === "airport" &&
            req.nodeId === r.airportNodeId &&
            r.checkId === "mode:" + req.requirementId &&
            r.originalScopeBasis ===
              "TASK086_STATIC_TOPOLOGY_BROAD_RESERVATION_UNKNOWN_NOT_A_BOOKING",
          "CAPABILITY_ORIGINAL_SCOPE",
        );
        need(
          airport &&
            endpoint &&
            endpoint.identityAnchor === r.endpointIdentityAnchor,
          "CAPABILITY_ENDPOINT",
        );
        for (const node of [airport, endpoint]) {
          need(
            node.decision === "ADMIT_TASK_086_TOPOLOGY" &&
              node.identityAnchor &&
              node.identitySignature,
            "CAPABILITY_NODE_ADMISSION",
          );
          const again = admitNodes([node], v.sources, v.evidence, [], v)[0];
          need(
            again.decision === node.decision &&
              again.identitySignature === node.identitySignature,
            "CAPABILITY_NATIVE_RECHECK",
          );
        }
        need(
          r.odIds?.length === 2 &&
            new Set(r.odIds).size === 2 &&
            r.edgeIds?.length === 2 &&
            new Set(r.edgeIds).size === 2,
          "CAPABILITY_EXACT_OD_PAIR",
        );
        const pair = r.edgeIds.map((id) => byEdge.get(id)),
          ods = r.odIds.map((id) => v.dynamicODById.get(id));
        need(
          pair.every(Boolean) && ods.every(Boolean),
          "CAPABILITY_MISSING_DIRECTION",
        );
        need(
          canonical(
            pair
              .map((e) => [e.fromTransportNodeId, e.toTransportNodeId])
              .sort(),
          ) ===
            canonical(
              [
                [airport.nodeId, endpoint.nodeId],
                [endpoint.nodeId, airport.nodeId],
              ].sort(),
            ),
          "CAPABILITY_DIRECTION",
        );
        need(
          pair.every(
            (e) =>
              e.edgeKind === "dynamic_od_ride" &&
              e.mode === "demand_shared_taxi" &&
              r.odIds.includes(e.dynamicODRef) &&
              e.boardAllowed === true &&
              e.alightAllowed === true,
          ),
          "CAPABILITY_NOT_FIXED_CALLS",
        );
        need(
          ods.every((od) => capabilityAllows(c, od, v, { hash, canonical })),
          "CAPABILITY_CONTEXT_OR_BINDING",
        );
        need(
          canonical(c.capabilityPrerequisites) ===
            canonical(CAPABILITY_PREREQUISITES),
          "CAPABILITY_CONDITIONS",
        );
        const sourceIds = [
          ...new Set(
            [
              ...endpoint.evidenceRefs,
              ...pair.flatMap((e) => e.topologyEvidenceRefs),
            ].map((ref) => v.evidence.get(ref)?.sourceId),
          ),
        ].sort();
        need(
          canonical(sourceIds) ===
            canonical(r.sourceBindings.map((b) => b.sourceId).sort()),
          "CAPABILITY_SOURCE_SET",
        );
        need(!v.dynamicODValidationScope, "CAPABILITY_PARTIAL_VALIDATION");
        validateEdges(args.edges, v);
        const bound = { ...c, odValidationContext: v },
          persisted = { ...c };
        delete persisted.odValidationContext;
        delete persisted.evidenceContextSha256;
        function path(from, to, edges = args.edges) {
          const ids = queryGraph(edges, from, to, bound);
          let at = from,
            alight = true,
            previous = null,
            index = null;
          need(Array.isArray(ids), "CAPABILITY_NO_PATH");
          for (const id of ids) {
            const e = byEdge.get(id),
              continuing =
                e?.edgeKind === "service_segment" &&
                previous === e.servicePatternRef &&
                index + 1 === e.segmentIndex;
            need(
              e &&
                e.fromTransportNodeId === at &&
                allowsServiceAccess(e, bound) &&
                (continuing || (alight && e.boardAllowed !== false)),
              "CAPABILITY_PATH_DIRECTION_OR_BOARDING",
            );
            at = e.toTransportNodeId;
            alight = e.alightAllowed !== false;
            previous = e.servicePatternRef;
            index = e.segmentIndex;
          }
          need(at === to && alight, "CAPABILITY_PATH_END");
          return {
            edgeIds: ids,
            accessContext: persisted,
            conditionalEdgeIds: ids.filter(
              (id) => byEdge.get(id).conditionalTopology,
            ),
            interpretation:
              "Conditional service capability; no actual booking, dispatch or timed itinerary asserted",
          };
        }
        const round = (a, b, edges) => ({
            forward: path(a, b, edges),
            reverse: path(b, a, edges),
          }),
          surface = round(airport.nodeId, endpoint.nodeId, pair),
          national = new Map(
            [airport, endpoint].map((n) => [
              n.nodeId,
              round(args.anchorNodeId, n.nodeId),
            ]),
          );
        need(
          queryGraph(pair, airport.nodeId, endpoint.nodeId) === null &&
            queryGraph(pair, endpoint.nodeId, airport.nodeId, {
              ...bound,
              kind: "EXPLICIT_CONDITIONAL_PLANNING",
              publicStructureOnly: true,
              operatorConfirmed: true,
            }) === null,
          "CAPABILITY_DEFAULT_OR_FAKE_CONFIRMATION_LEAK",
        );
        const proof = {
          status,
          audience: "PUBLIC",
          view: "AUDITED_CONDITIONAL_SERVICE_CAPABILITY",
          actualBookingClaim: false,
          actualDispatchClaim: false,
          unrestrictedPublicWitness: false,
          reviewSha256: hash(r),
          unresolvedFields: ["currentMinimumLeadMinutes", "payment"],
          capabilityPrerequisites: CAPABILITY_PREREQUISITES,
        };
        for (const a of assessments) {
          const f = a.originalDefaultFailure;
          let witness = null,
            ground = null;
          if (f.deficitId === r.checkId && f.class === "AIRPORT_SURFACE_GAP") {
            witness = national.get(airport.nodeId);
            ground = surface;
          }
          const required = byReq.get(f.requirementId);
          if (
            f.deficitId === "connect:" + required?.requirementId &&
            [
              "DISCONNECTED_T0",
              "DISCONNECTED_T1",
              "MISSING_INTERMEDIATE_NODE",
            ].includes(f.class)
          )
            witness = national.get(required.nodeId) ?? null;
          if (f.class === "CORRIDOR_UNREACHABLE") {
            const inventoryReq = f.corridorId?.startsWith("inventory:")
              ? byReq.get(f.corridorId.slice(10))
              : null;
            if (inventoryReq)
              witness = national.get(inventoryReq.nodeId) ?? null;
            else {
              const corridor = args.corridors.find(
                (x) => x.corridorId === f.corridorId,
              );
              if (
                corridor &&
                r.odIds.some((id) => f.corridorId === "service:" + id) &&
                [airport.nodeId, endpoint.nodeId].includes(corridor.from) &&
                [airport.nodeId, endpoint.nodeId].includes(corridor.to) &&
                corridor.from !== corridor.to
              )
                witness = round(corridor.from, corridor.to, pair);
            }
          }
          if (witness)
            Object.assign(a, proof, {
              nationalOrCorridorWitness: witness,
              surfaceWitness: ground,
            });
        }
        reviews.push({
          ...proof,
          checkId: r.checkId,
          witnessNodeIds: [...national.keys()],
        });
      } catch (error) {
        reviews.push({
          checkId: r?.checkId,
          status: "OPEN",
          view: "AUDITED_CONDITIONAL_SERVICE_CAPABILITY",
          actualBookingClaim: false,
          reasons: [error.message],
        });
      }
    }
    return {
      ...prior,
      assessments,
      capabilityReviews: reviews,
      validationBindingSha256: hash({
        priorBinding: prior.validationBindingSha256,
        capabilities: selected.map((c) => ({
          context: capabilityPlain(c),
          review: c.capabilityReview,
          inputs: c.capabilityInputBindings,
          error: c.capabilityInputError,
        })),
        assessments,
      }),
      interpretation:
        prior.interpretation +
        " Separately source-audited OD capability predicates do not claim bookings, dispatch, numeric cutoff or ordinary passenger-query feasibility.",
    };
  };
}
