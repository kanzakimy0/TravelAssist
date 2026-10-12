// Independently reviewed qualified structural coverage; never an unrestricted PUBLIC route.
export function createQualifiedAirportApplicability({
  hash,
  canonical,
  admitNodes,
  validateEdges,
  queryGraph,
  allowsServiceAccess,
  publicAssess,
}) {
  const plain = (c) => {
    const {
      odValidationContext,
      evidenceContextSha256,
      qualificationReview,
      qualifiedInputBindings,
      qualificationInputError,
      ...p
    } = c;
    return p;
  };
  function valid(ids, from, to, map, c) {
    let at = from,
      pattern = null,
      index = null,
      alight = true;
    for (const id of ids ?? []) {
      const e = map.get(id);
      if (!e || e.fromTransportNodeId !== at || !allowsServiceAccess(e, c))
        return false;
      const continuing =
        e.edgeKind === "service_segment" &&
        pattern === e.servicePatternRef &&
        index + 1 === e.segmentIndex;
      if (!continuing && (!alight || e.boardAllowed === false)) return false;
      at = e.toTransportNodeId;
      pattern = e.servicePatternRef;
      index = e.segmentIndex;
      alight = e.alightAllowed !== false;
    }
    return Array.isArray(ids) && at === to && alight;
  }
  return function assess(args) {
    const qualified = args.contexts.filter(
        (c) => c.publicStructureOnly === false,
      ),
      pub = publicAssess({
        ...args,
        contexts: args.contexts.filter((c) => c.publicStructureOnly === true),
      });
    if (!qualified.length) return pub;
    const v = args.validationContext,
      edgeMap = new Map(args.edges.map((e) => [e.edgeId, e])),
      byReq = new Map(args.inventory.map((r) => [r.requirementId, r])),
      assessments = pub.assessments.map((a) => ({ ...a })),
      reviews = [];
    for (const context of qualified) {
      const review = context.qualificationReview;
      let proof;
      try {
        const need = (x, m) => {
          if (!x) throw Error(m);
        };
        need(
          review?.kind === "REVIEWED_QUALIFIED_AIRPORT_SURFACE_V1" &&
            !context.qualificationInputError,
          "QUALIFIED_REVIEW_OR_SOURCE_INVALID",
        );
        const requirement = byReq.get(review.requirementId),
          airport = v.nodes.get(review.airportNodeId),
          endpoint = v.nodes.get(review.endpointNodeId);
        need(
          requirement?.kind === "airport" &&
            requirement.nodeId === review.airportNodeId &&
            review.checkId === "mode:" + requirement.requirementId,
          "QUALIFIED_ORIGINAL_REQUIREMENT",
        );
        need(
          review.originalScopeBasis ===
            "TASK086_17_6_WHERE_SERVICE_EXISTS_NO_PUBLIC_ONLY_QUALIFIER" &&
            review.inputBindings.length >= 3 &&
            review.inputBindings.every(
              (b) =>
                new Map(context.qualifiedInputBindings).get(b.path) ===
                b.sha256,
            ),
          "QUALIFIED_REVIEW_INPUTS_CHANGED",
        );
        need(
          context.kind === "EXPLICIT_CONDITIONAL_PLANNING" &&
            context.publicStructureOnly === false &&
            hash(plain(context)) === review.contextSha256 &&
            canonical(context.eligibilityKeys) ===
              canonical(review.eligibilityKeys) &&
            review.eligibilityKeys.length > 0,
          "QUALIFIED_CONTEXT_CHANGED",
        );
        need(
          airport &&
            endpoint &&
            endpoint.identityAnchor === review.endpointIdentityAnchor,
          "QUALIFIED_EXACT_ENDPOINT",
        );
        for (const n of [airport, endpoint]) {
          need(
            n.decision === "ADMIT_TASK_086_TOPOLOGY" &&
              n.identityAnchor &&
              n.identitySignature,
            "QUALIFIED_ADMISSION",
          );
          const again = admitNodes([n], v.sources, v.evidence, [], {
            nativeFacilityByAnchor: v.nativeFacilityByAnchor,
          })[0];
          need(
            again.decision === n.decision &&
              again.identitySignature === n.identitySignature,
            "QUALIFIED_IDENTITY_REVALIDATION",
          );
        }
        need(
          review.patternIds.length === 2 &&
            new Set(review.patternIds).size === 2 &&
            review.edgeIds.length === 2 &&
            new Set(review.edgeIds).size === 2,
          "QUALIFIED_EXACT_PAIR_SCOPE",
        );
        const pair = review.edgeIds.map((id) => edgeMap.get(id));
        need(pair.every(Boolean), "QUALIFIED_EDGE_MISSING");
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
          "QUALIFIED_BOTH_DIRECTIONS",
        );
        for (const e of pair)
          need(
            e.edgeKind === "service_segment" &&
              [
                "airport_bus",
                "local_bus",
                "bus",
                "demand_shared_taxi",
              ].includes(e.mode) &&
              e.accessContract?.audience === "ELIGIBILITY_RESTRICTED" &&
              canonical(e.accessContract.eligibilityKeys) ===
                canonical(review.eligibilityKeys) &&
              review.contractSha256s.includes(hash(e.accessContract)),
            "QUALIFIED_SERVICE_SCOPE",
          );
        need(
          canonical(
            [...new Set(pair.map((e) => e.servicePatternRef))].sort(),
          ) === canonical([...review.patternIds].sort()),
          "QUALIFIED_PATTERN_SCOPE",
        );
        const refs = [
          ...endpoint.evidenceRefs,
          ...pair.flatMap((e) => [
            ...e.topologyEvidenceRefs,
            ...e.accessContract.sourceEvidenceRefs,
          ]),
        ];
        const ids = [
          ...new Set(refs.map((ref) => v.evidence.get(ref)?.sourceId)),
        ].sort();
        need(
          canonical(ids) ===
            canonical(review.sourceBindings.map((b) => b.sourceId).sort()) &&
            review.sourceBindings.every((b) => {
              const s = v.sources.get(b.sourceId);
              return s?.url === b.url && s.contentSha256 === b.contentSha256;
            }),
          "QUALIFIED_SOURCE_SCOPE_OR_VERSION",
        );
        need(!v.dynamicODValidationScope, "QUALIFIED_PARTIAL_VALIDATION");
        validateEdges(args.edges, v);
        const bound = { ...context, odValidationContext: v },
          accessContext = plain(context);
        const path = (from, to, scope = args.edges) => {
          const ids = queryGraph(scope, from, to, bound);
          need(
            valid(ids, from, to, edgeMap, bound),
            "QUALIFIED_DIRECTION_OR_BOARDING",
          );
          return {
            edgeIds: ids,
            accessContext,
            conditionalEdgeIds: ids.filter(
              (id) => edgeMap.get(id).conditionalTopology,
            ),
          };
        };
        const round = (a, b, scope) => ({
            forward: path(a, b, scope),
            reverse: path(b, a, scope),
          }),
          ground = round(airport.nodeId, endpoint.nodeId, pair),
          national = new Map(
            [airport, endpoint].map((n) => [
              n.nodeId,
              round(args.anchorNodeId, n.nodeId),
            ]),
          );
        need(
          queryGraph(pair, airport.nodeId, endpoint.nodeId) === null &&
            queryGraph(pair, endpoint.nodeId, airport.nodeId) === null &&
            queryGraph(pair, airport.nodeId, endpoint.nodeId, {
              ...bound,
              publicStructureOnly: true,
            }) === null,
          "QUALIFIED_PUBLIC_DEFAULT_LEAK",
        );
        proof = {
          status: "STRUCTURALLY_CONNECTED_WITH_REVIEWED_QUALIFICATION",
          audience: "ELIGIBILITY_RESTRICTED",
          publicServiceClaim: false,
          reviewSha256: hash(review),
          qualificationKeys: review.eligibilityKeys,
          unrestrictedPublicWitness: false,
        };
        for (const a of assessments) {
          const d = a.originalDefaultFailure;
          let witness = null,
            surfaceWitness = null;
          if (
            d.deficitId === review.checkId &&
            d.class === "AIRPORT_SURFACE_GAP"
          ) {
            witness = national.get(airport.nodeId);
            surfaceWitness = ground;
          }
          const req = byReq.get(d.requirementId);
          if (
            d.deficitId === "connect:" + req?.requirementId &&
            [
              "DISCONNECTED_T0",
              "DISCONNECTED_T1",
              "MISSING_INTERMEDIATE_NODE",
            ].includes(d.class)
          )
            witness = national.get(req.nodeId) ?? null;
          if (d.class === "CORRIDOR_UNREACHABLE") {
            const c = args.corridors.find((c) => c.corridorId === d.corridorId);
            const inventoryReq = d.corridorId?.startsWith("inventory:")
              ? byReq.get(d.corridorId.slice(10))
              : null;
            if (inventoryReq)
              witness = national.get(inventoryReq.nodeId) ?? null;
            else if (
              c &&
              review.patternIds.some(
                (id) => d.corridorId === "service:" + id,
              ) &&
              [airport.nodeId, endpoint.nodeId].includes(c.from) &&
              [airport.nodeId, endpoint.nodeId].includes(c.to) &&
              c.from !== c.to
            )
              witness = round(c.from, c.to, pair);
          }
          if (witness)
            Object.assign(a, proof, {
              nationalOrCorridorWitness: witness,
              surfaceWitness,
            });
        }
        reviews.push({
          ...proof,
          checkId: review.checkId,
          witnessNodeIds: [...national.keys()],
        });
      } catch (e) {
        reviews.push({
          checkId: review?.checkId,
          status: "OPEN",
          audience: "ELIGIBILITY_RESTRICTED",
          publicServiceClaim: false,
          reasons: [e.message],
        });
      }
    }
    return {
      ...pub,
      assessments,
      qualifiedReviews: reviews,
      validationBindingSha256: hash({
        publicBinding: pub.validationBindingSha256,
        qualified: qualified.map((c) => ({
          context: plain(c),
          review: c.qualificationReview,
          inputs: c.qualifiedInputBindings,
          error: c.qualificationInputError,
        })),
        assessments,
      }),
      interpretation:
        pub.interpretation +
        " Separately audited eligibility-restricted services retain their own audience and never satisfy PUBLIC/default routing.",
    };
  };
}
