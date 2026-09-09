export function task024PerformanceFixture(days, nodeCount) {
  if (![1, 3, 7].includes(days)) throw new RangeError("unsupported_days");
  if (![10, 50, 200].includes(nodeCount))
    throw new RangeError("unsupported_nodes");
  return {
    fixtureId: `task-024-${days}d-${nodeCount}n`,
    synthetic: true,
    days: Array.from({ length: days }, (_, index) => ({
      day: index + 1,
      nodeIds: [],
    })),
    nodes: Array.from({ length: nodeCount }, (_, index) => ({
      id: `synthetic-node-${String(index + 1).padStart(3, "0")}`,
      day: (index % days) + 1,
      kind: index % 5 === 0 ? "movement" : "attraction",
    })),
  };
}

export const task024FixtureMatrix = [
  [1, 10],
  [3, 50],
  [7, 200],
].map(([days, nodes]) => task024PerformanceFixture(days, nodes));

for (const fixture of task024FixtureMatrix)
  for (const node of fixture.nodes)
    fixture.days[node.day - 1].nodeIds.push(node.id);
