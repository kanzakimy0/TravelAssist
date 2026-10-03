// Source-bound PUBLIC structural assessment. Default diagnostics remain; audit/acceptance consume only fully revalidated structural checks.
// Factory injection keeps graph/source validation authoritative and avoids module import cycles.
export function createPublicConditionalApplicability({
  canonical,
  hash,
  invariant,
  validateEdges,
  admitNodes,
  queryGraph,
  allowsServiceAccess,
  prepareConditionalQueries,
}) {
  const modes = new Set([
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
    "demand_shared_taxi",
  ]);
  const ride = (e) =>
    ["service_segment", "dynamic_od_ride"].includes(e.edgeKind) &&
    modes.has(e.mode);
  const surface = (n) =>
    modes.has(n?.mode ?? (n?.nodeKind === "bus_stop" ? "bus" : null));
  function assess({
    nodes,
    edges,
    inventory,
    anchorNodeId,
    deficits,
    corridors = [],
    contexts = [],
    validationContext,
  }) {
    const v = validationContext;
    invariant(
      v?.sources instanceof Map &&
        v.evidence instanceof Map &&
        v.patternById instanceof Map &&
        v.nodes instanceof Map,
      "PUBLIC_STRUCTURE_COMPLETE_REGISTRY_REQUIRED",
    );
    invariant(
      v.dynamicODValidationScope === undefined,
      "PUBLIC_STRUCTURE_PARTIAL_REGISTRY_FORBIDDEN",
    );
    const resolvedOD = [...v.evidence.values()]
      .map((e) => e.record)
      .filter((r) => r?.kind === "dynamic_od" && r.odId && r.sourceFactRef);
    invariant(
      resolvedOD.every((r) => v.dynamicODById?.has(r.odId)),
      "PUBLIC_STRUCTURE_OD_REGISTRY_STRIPPED",
    );
    validateEdges(edges, v);
    const byNode = new Map(nodes.map((n) => [n.nodeId, n])),
      byEdge = new Map(edges.map((e) => [e.edgeId, e])),
      byReq = new Map(inventory.map((r) => [r.requirementId, r])),
      byCorridor = new Map(corridors.map((c) => [c.corridorId, c])),
      nodeProof = new Map();
    invariant(
      nodes.every((n) => canonical(v.nodes.get(n.nodeId)) === canonical(n)),
      "PUBLIC_STRUCTURE_NODE_REGISTRY_MISMATCH",
    );
    const bindingSha256 = hash({
      sources: [...v.sources].sort(),
      evidence: [...v.evidence].sort(),
      nodes: [...v.nodes].sort(),
      patterns: [...v.patternById].sort(),
      dynamicOD: [...(v.dynamicODById ?? [])].sort(),
      nativeFacilities: [...(v.nativeFacilityByAnchor ?? [])].sort(),
    });
    const hasPublicConditionalEdge = edges.some(
      (e) => e.accessContract?.audience === "PUBLIC",
    );
    const views = contexts
      .filter(
        (c) =>
          hasPublicConditionalEdge &&
          c?.kind === "EXPLICIT_CONDITIONAL_PLANNING" &&
          c.publicStructureOnly === true,
      )
      .map((c) => {
        const { odValidationContext, ...plain } = c;
        const context = {
          ...plain,
          evidenceContextSha256: bindingSha256,
          odValidationContext: v,
        };
        const ground = edges.filter(
          (e) =>
            e.mode !== "flight" &&
            e.mode !== "ferry" &&
            e.edgeKind !== "direct_service",
        );
        return {
          context,
          queries: prepareConditionalQueries?.(edges, ground, context),
          contextSha256: hash({
            ...plain,
            evidenceContextSha256: bindingSha256,
          }),
          ground,
        };
      });
    function admitted(id) {
      if (!nodeProof.has(id)) {
        const n = byNode.get(id);
        if (
          !n ||
          n.decision !== "ADMIT_TASK_086_TOPOLOGY" ||
          typeof n.identityAnchor !== "string" ||
          !n.identityAnchor ||
          typeof n.identitySignature !== "string" ||
          !n.identitySignature
        ) {
          nodeProof.set(id, false);
          return false;
        }
        const rebuilt = admitNodes([n], v.sources, v.evidence, [], {
          nativeFacilityByAnchor: v.nativeFacilityByAnchor,
        })[0];
        nodeProof.set(
          id,
          !!n &&
            n.decision === "ADMIT_TASK_086_TOPOLOGY" &&
            rebuilt?.decision === "ADMIT_TASK_086_TOPOLOGY" &&
            rebuilt.nodeId === n.nodeId &&
            rebuilt.identitySignature === n.identitySignature,
        );
      }
      return nodeProof.get(id);
    }
    function proof(view, from, to, ground = false) {
      const ids = view.queries
        ? view.queries.query(from, to, ground)
        : queryGraph(ground ? view.ground : edges, from, to, view.context);
      if (ids === null) return null;
      let cursor = from;
      const path = [];
      if (!admitted(from)) return null;
      for (const edgeId of ids) {
        const e = byEdge.get(edgeId);
        invariant(
          e && e.fromTransportNodeId === cursor,
          "PUBLIC_STRUCTURE_PATH_CONTINUITY",
        );
        if (
          !admitted(e.toTransportNodeId) ||
          !(view.queries
            ? view.queries.allows(e)
            : allowsServiceAccess(e, view.context))
        )
          return null;
        if (e.accessContract && e.accessContract.audience !== "PUBLIC")
          return null;
        path.push(e);
        cursor = e.toTransportNodeId;
      }
      invariant(cursor === to, "PUBLIC_STRUCTURE_PATH_ENDPOINT");
      if (ground && !path.some(ride)) return null;
      return {
        from,
        to,
        edgeIds: ids,
        contextSha256: view.contextSha256,
        accessContext: (() => {
          const { odValidationContext, ...plain } = view.context;
          return plain;
        })(),
        conditionalEdgeIds: path
          .filter((e) => e.accessContract)
          .map((e) => e.edgeId),
        evidenceRefs: [
          ...new Set(path.flatMap((e) => e.topologyEvidenceRefs ?? [])),
        ],
        nodeIds: [from, ...path.map((e) => e.toTransportNodeId)],
      };
    }
    const find = (from, to, ground = false) =>
      views.map((view) => proof(view, from, to, ground)).find(Boolean) ?? null;
    function roundtrip(from, to, ground = false) {
      const forward = find(from, to, ground),
        reverse = find(to, from, ground);
      return forward && reverse ? { forward, reverse } : null;
    }
    function surfaceWitness(airport) {
      const candidates = [
        ...new Set(
          edges
            .filter((e) => e.accessContract?.audience === "PUBLIC" && ride(e))
            .flatMap((e) => [e.fromTransportNodeId, e.toTransportNodeId]),
        ),
      ]
        .filter((n) => n !== airport && surface(byNode.get(n)))
        .sort();
      for (const other of candidates) {
        const paths = roundtrip(airport, other, true);
        if (
          paths &&
          [
            ...paths.forward.conditionalEdgeIds,
            ...paths.reverse.conditionalEdgeIds,
          ].length
        )
          return { otherNodeId: other, ...paths };
      }
      return null;
    }
    const assessments = deficits.map((d) => {
      const requirement = byReq.get(d.requirementId);
      let pair = null,
        ground = null;
      if (
        [
          "DISCONNECTED_T0",
          "DISCONNECTED_T1",
          "MISSING_INTERMEDIATE_NODE",
        ].includes(d.class) &&
        d.deficitId === `connect:${d.requirementId}` &&
        requirement
      )
        pair = roundtrip(anchorNodeId, requirement.nodeId);
      if (d.class === "CORRIDOR_UNREACHABLE") {
        const c =
          byCorridor.get(d.corridorId) ??
          (d.corridorId?.startsWith("inventory:")
            ? {
                from: anchorNodeId,
                to: byReq.get(d.corridorId.slice(10))?.nodeId,
              }
            : null);
        if (c?.from && c?.to) pair = roundtrip(c.from, c.to);
      }
      if (
        d.class === "AIRPORT_SURFACE_GAP" &&
        d.deficitId === `mode:${d.requirementId}` &&
        requirement?.kind === "airport"
      ) {
        pair = roundtrip(anchorNodeId, requirement.nodeId);
        ground = surfaceWitness(requirement.nodeId);
        if (!ground) pair = null;
      }
      const conditional =
        pair &&
        [
          ...pair.forward.conditionalEdgeIds,
          ...pair.reverse.conditionalEdgeIds,
          ...(ground
            ? [
                ...ground.forward.conditionalEdgeIds,
                ...ground.reverse.conditionalEdgeIds,
              ]
            : []),
        ].length > 0;
      return {
        checkId: d.deficitId,
        originalDefaultFailure: structuredClone(d),
        defaultStatus: "FAIL",
        status: conditional
          ? "STRUCTURALLY_CONNECTED_WITH_PUBLIC_RESERVATION_CONDITIONS"
          : "OPEN",
        nationalOrCorridorWitness: conditional ? pair : null,
        surfaceWitness: conditional ? ground : null,
      };
    });
    return {
      schemaVersion: 1,
      assessments,
      originalCheckIdsPreserved: assessments.map((a) => a.checkId),
      originalDefaultDeficitsSha256: hash(deficits),
      validationBindingSha256: bindingSha256,
      defaultDeficitsUnchanged: true,
      unconditional: false,
      timedItinerary: false,
      bookingConfirmed: false,
      capacityGuaranteed: false,
      reportsOnlyApplicableStructuralAssessments: true,
      consumedByAuditAndAcceptance: true,
      interpretation:
        "Directed structural witnesses may use independent reservation request contexts. Default failures remain; source/identity/global obligations are never closed by this report.",
    };
  }
  return assess;
}
