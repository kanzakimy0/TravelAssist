// Independent TASK-057 reviewer. Run from the disposable candidate worktree:
// node --import ./tests/register-route-ts.mjs <this-file> <baseline> <develop> <output>
// Only the output argument is written. A's TASK-045 evidence/resolvers are not used.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const [baselineSha, developSha, output] = process.argv.slice(2);
assert.ok(
  baselineSha && developSha && output,
  "baseline develop output required",
);
const root = process.cwd();
const git = (...args) =>
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  }).trimEnd();
const historic = (sha, path) => JSON.parse(git("show", sha + ":" + path));
const current = (path) =>
  JSON.parse(fs.readFileSync(resolve(root, path), "utf8"));
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonical(value[key])]),
        )
      : value;
const stable = (value) => JSON.stringify(canonical(value));
const digest = (value) =>
  createHash("sha256").update(stable(value)).digest("hex");
const equal = (a, b) => stable(a) === stable(b);
const graphAt = (sha) => ({
  ...historic(sha, "docs/qa/TASK-041/region-nodes.json"),
  relations: historic(sha, "docs/qa/TASK-041/region-relations.json").relations,
  travelEdges: historic(sha, "docs/qa/TASK-041/travel-edges.json").travelEdges,
});
const base = graphAt(baselineSha);
const develop = graphAt(developSha);
const published = {
  ...current("docs/qa/TASK-041/region-nodes.json"),
  relations: current("docs/qa/TASK-041/region-relations.json").relations,
  travelEdges: current("docs/qa/TASK-041/travel-edges.json").travelEdges,
};
const { regionGraph, corridorDefinitions, evidenceIndex } = await import(
  pathToFileURL(resolve(root, "tools/qa/region-graph-pilot.mjs")).href
);
const registryPath = "src/shared/data/master-code-registry.v1.json";
const registry = current(registryPath);
const withoutCode = (node) =>
  Object.fromEntries(
    Object.entries(node).filter(([key]) => key !== "masterCode"),
  );
const edgesWithoutVariants = (graph) =>
  graph.travelEdges.map((edge) =>
    Object.fromEntries(
      Object.entries(edge).filter(([key]) => key !== "variants"),
    ),
  );
const variants = (graph) =>
  graph.travelEdges.flatMap((edge) =>
    edge.variants.map((variant) => ({ edgeId: edge.edgeId, ...variant })),
  );
const changed = (before, after, id) => {
  const a = new Map(before.map((row) => [row[id], row]));
  const b = new Map(after.map((row) => [row[id], row]));
  return [...new Set([...a.keys(), ...b.keys()])].filter(
    (key) => !equal(a.get(key), b.get(key)),
  );
};
function adjacency(graph) {
  const out = new Map(graph.nodes.map((n) => [n.regionId, new Set()]));
  for (const edge of graph.travelEdges)
    out.get(edge.fromRegionRef)?.add(edge.toRegionRef);
  return out;
}
function reachable(out, start) {
  const seen = new Set([start]),
    queue = [start];
  for (let index = 0; index < queue.length; index++)
    for (const next of out.get(queue[index]) ?? [])
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
  return seen;
}
const requiredPaths = {
  tokyo_to_hakone: ["region-tokyo", "region-hakone"],
  alpine_chain: [
    "region-tokyo",
    "region-matsumoto",
    "region-takayama",
    "region-kanazawa",
  ],
  kansai_chain: ["region-kyoto", "region-nara", "region-osaka", "region-kobe"],
  tokyo_to_kyoto: ["region-tokyo", "region-kyoto"],
  tokyo_to_osaka: ["region-tokyo", "region-osaka"],
};
function count(graph, rawRegistry) {
  const codes = graph.nodes.map((n) => n.masterCode);
  const ids = graph.nodes.map((n) => n.regionId),
    oldIds = base.nodes.map((n) => n.regionId);
  const rows = graph.nodes.map((node) => {
    const matches = rawRegistry.entries.filter(
      (entry) => entry.masterCode === node.masterCode,
    );
    const entry = matches.length === 1 ? matches[0] : null;
    const byEntity = rawRegistry.entries.filter(
      (item) =>
        item.entityType === "region." + node.regionType &&
        item.entityRef === node.regionId &&
        item.lifecycleStatus === "active",
    );
    return {
      regionId: node.regionId,
      regionType: node.regionType,
      masterCode: node.masterCode,
      registryMatches: matches.length,
      lifecycle: entry?.lifecycleStatus ?? null,
      identityMatches:
        entry?.entityType === "region." + node.regionType &&
        entry?.entityRef === node.regionId,
      uniqueActiveEntityMatch:
        byEntity.length === 1 && byEntity[0].masterCode === node.masterCode,
      governedProvenance:
        !!entry?.sourceRefs?.length &&
        !!entry?.provenance?.length &&
        !!entry?.allocationReason,
    };
  });
  const a = adjacency(base),
    b = adjacency(graph);
  const connectivity = (out) =>
    oldIds.flatMap((from) => {
      const seen = reachable(out, from);
      return oldIds.map((to) => seen.has(to));
    });
  const beforeReachability = connectivity(a),
    afterReachability = connectivity(b);
  const graphProjection = (g) => ({
    nodes: g.nodes.map(withoutCode),
    relations: g.relations,
    travelEdges: g.travelEdges,
  });
  const zeroes = {
    productionMasterCodeNull: codes.filter((code) => code === null).length,
    missingOrNonStringCodes: codes.filter((code) => typeof code !== "string")
      .length,
    duplicateMasterCodes: codes.length - new Set(codes).size,
    unknownAllocations: rows.filter((row) => row.registryMatches !== 1).length,
    deprecatedInvalid: rows.filter((row) => row.lifecycle === "deprecated")
      .length,
    supersededInvalid: rows.filter((row) => row.lifecycle === "superseded")
      .length,
    otherLifecycleInvalid: rows.filter(
      (row) =>
        row.lifecycle !== "active" &&
        !["deprecated", "superseded", null].includes(row.lifecycle),
    ).length,
    entityMismatch: rows.filter(
      (row) => !row.identityMatches || !row.uniqueActiveEntityMatch,
    ).length,
    legacySubstitutes: codes.filter(
      (code) =>
        typeof code !== "string" ||
        !/^\d{5}$/.test(code) ||
        /^JP-(RG|PREF|MACRO)-|^jp-/i.test(code) ||
        Number(code) === 0 ||
        (Number(code) >= 1 && Number(code) <= 47) ||
        Number(code) >= 5000,
    ).length,
    nodeSemanticDiffExcludingMasterCode: changed(
      base.nodes.map(withoutCode),
      graph.nodes.map(withoutCode),
      "regionId",
    ).length,
    regionRelationSemanticDiff: changed(
      base.relations,
      graph.relations,
      "relationId",
    ).length,
    travelEdgeSemanticDiff: changed(
      edgesWithoutVariants(base),
      edgesWithoutVariants(graph),
      "edgeId",
    ).length,
    travelEdgeVariantSemanticDiff: changed(
      variants(base),
      variants(graph),
      "variantId",
    ).length,
    allPairsReachabilityDiff: beforeReachability.filter(
      (value, index) => value !== afterReachability[index],
    ).length,
  };
  const corridors = Object.entries(requiredPaths).map(([name, path]) => ({
    name,
    requiredPath: path,
    reachableBefore: reachable(a, path[0]).has(path.at(-1)),
    reachableAfter: reachable(b, path[0]).has(path.at(-1)),
    everyRequiredEdgeBefore: path.every(
      (node, i) => i === 0 || a.get(path[i - 1])?.has(node),
    ),
    everyRequiredEdgeAfter: path.every(
      (node, i) => i === 0 || b.get(path[i - 1])?.has(node),
    ),
  }));
  const counts = {
    regionNodes: graph.nodes.length,
    regionIdsPreserved: oldIds.filter((id) => ids.includes(id)).length,
    canonicalMasterCodesPopulated: rows.filter(
      (row) =>
        row.registryMatches === 1 &&
        row.identityMatches &&
        row.uniqueActiveEntityMatch &&
        row.lifecycle === "active",
    ).length,
    activeRegistryResolution: rows.filter(
      (row) =>
        row.lifecycle === "active" &&
        row.identityMatches &&
        row.uniqueActiveEntityMatch,
    ).length,
    relations: graph.relations.length,
    travelEdges: graph.travelEdges.length,
    variants: variants(graph).length,
    ...zeroes,
  };
  const identities = {
    orderPreserved: equal(ids, oldIds),
    baselineIdsSha256: digest(oldIds),
    candidateIdsSha256: digest(ids),
  };
  const semantic = {
    method:
      "Independently sorted object keys; array order retained; only node.masterCode removed",
    baselineTopologySha256: digest(graphProjection(base)),
    candidateTopologySha256: digest(graphProjection(graph)),
    completeProjectionEqual: equal(
      graphProjection(base),
      graphProjection(graph),
    ),
    planningPriorsUnchanged: equal(
      base.travelEdges.map((edge) => edge.planningPrior),
      graph.travelEdges.map((edge) => edge.planningPrior),
    ),
    variantsAndAllTemporalFieldsUnchanged: equal(
      variants(base),
      variants(graph),
    ),
    allPairs: oldIds.length ** 2,
    reachabilityBeforeSha256: digest(beforeReachability),
    reachabilityAfterSha256: digest(afterReachability),
  };
  const passed =
    [
      counts.regionNodes,
      counts.regionIdsPreserved,
      counts.canonicalMasterCodesPopulated,
      counts.activeRegistryResolution,
    ].every((n) => n === 50) &&
    Object.values(zeroes).every((n) => n === 0) &&
    identities.orderPreserved &&
    semantic.completeProjectionEqual &&
    rows.every((row) => row.governedProvenance) &&
    corridors.every(
      (r) =>
        r.reachableBefore &&
        r.reachableAfter &&
        r.everyRequiredEdgeBefore &&
        r.everyRequiredEdgeAfter,
    );
  return {
    passed,
    counts,
    identities,
    semantic,
    corridors,
    allocationRows: rows,
  };
}
const measured = count(regionGraph, registry);
const controls = [
  [
    "null code",
    (g) => {
      g.nodes[0].masterCode = null;
    },
  ],
  [
    "legacy substitute",
    (g) => {
      g.nodes[0].masterCode = "JP-RG-JAPAN";
    },
  ],
  [
    "unknown allocation",
    (g) => {
      g.nodes[0].masterCode = "00999";
    },
  ],
  [
    "duplicate/cross-entity",
    (g) => {
      g.nodes[0].masterCode = g.nodes[1].masterCode;
    },
  ],
  [
    "deprecated allocation",
    (g, r) => {
      r.entries.find(
        (e) => e.masterCode === g.nodes[0].masterCode,
      ).lifecycleStatus = "deprecated";
    },
  ],
  [
    "superseded allocation",
    (g, r) => {
      r.entries.find(
        (e) => e.masterCode === g.nodes[0].masterCode,
      ).lifecycleStatus = "superseded";
    },
  ],
  [
    "Region ID drift",
    (g) => {
      g.nodes[0].regionId = "changed-identity";
    },
  ],
  [
    "relation semantic drift",
    (g) => {
      g.relations[0].confidence = -1;
    },
  ],
  [
    "edge prior drift",
    (g) => {
      g.travelEdges[0].planningPrior.tripCompatibility = -1;
    },
  ],
  [
    "variant drift",
    (g) => {
      g.travelEdges[0].variants[0].mode = "teleport";
    },
  ],
  [
    "removed corridor edge",
    (g) => {
      g.travelEdges = g.travelEdges.filter(
        (edge) =>
          !(
            edge.fromRegionRef === "region-tokyo" &&
            edge.toRegionRef === "region-hakone"
          ),
      );
    },
  ],
].map(([label, mutate]) => {
  const graph = structuredClone(regionGraph),
    raw = structuredClone(registry);
  mutate(graph, raw);
  const result = count(graph, raw);
  assert.equal(result.passed, false, label);
  return { label, rejected: true };
});
const publishedEqualsRuntime = equal(
  {
    graphDataRevision: regionGraph.graphDataRevision,
    nodes: regionGraph.nodes,
    relations: regionGraph.relations,
    travelEdges: regionGraph.travelEdges,
  },
  published,
);
const beforeCorridors = historic(
  baselineSha,
  "docs/qa/TASK-041/corridor-reachability.json",
).corridors;
const noProtectedSourceDiff =
  git(
    "diff",
    "--name-only",
    baselineSha,
    "HEAD",
    "--",
    "src",
    "supabase",
    "package-lock.json",
  ) === "";
const provenance = {
  rawRegistryPath: registryPath,
  registryBlobAtBaseline: git("rev-parse", baselineSha + ":" + registryPath),
  registryBlobAtDevelop: git("rev-parse", developSha + ":" + registryPath),
  registryBlobAtCandidate: git("rev-parse", "HEAD:" + registryPath),
  registryRevision: registry.registryRevision,
  registryGovernanceLabel: registry.governanceStatus,
  regionGraphDataRevision: regionGraph.graphDataRevision,
  productionGeneratorUsesDirectRegistryResolver: fs
    .readFileSync(resolve(root, "tools/qa/region-graph-pilot.mjs"), "utf8")
    .includes("resolveActiveMasterCodeByEntity"),
  noQaManifestAuthority: !fs
    .readFileSync(resolve(root, "tools/qa/region-graph-pilot.mjs"), "utf8")
    .includes("region-allocation-50.json"),
};
const evidence = {
  task: "TASK-057-B",
  reviewedTreeHead: git("rev-parse", "HEAD"),
  baselineSha,
  developSha,
  independentlyRecomputed: true,
  aTask045EvidenceUsed: false,
  ...measured,
  publishedEqualsRuntime,
  latestDevelopBaselineGraphEqual: equal(base, develop),
  corridorDefinitionsUnchanged: equal(beforeCorridors, corridorDefinitions),
  evidenceAndSourcePolicyUnchanged: equal(
    historic(baselineSha, "docs/qa/TASK-041/evidence-index.json"),
    evidenceIndex,
  ),
  sourceRuntimeDbLockDiffEmpty: noProtectedSourceDiff,
  provenance,
  negativeControls: controls,
};
evidence.passed &&=
  publishedEqualsRuntime &&
  evidence.latestDevelopBaselineGraphEqual &&
  evidence.corridorDefinitionsUnchanged &&
  evidence.evidenceAndSourcePolicyUnchanged &&
  noProtectedSourceDiff &&
  provenance.registryBlobAtBaseline === provenance.registryBlobAtCandidate &&
  provenance.registryBlobAtDevelop === provenance.registryBlobAtCandidate;
fs.writeFileSync(output, JSON.stringify(evidence, null, 2) + "\n");
console.log(
  JSON.stringify(
    {
      passed: evidence.passed,
      counts: evidence.counts,
      negativeControls: controls.length,
      publishedEqualsRuntime,
      semantic: evidence.semantic,
    },
    null,
    2,
  ),
);
if (!evidence.passed) process.exitCode = 1;
