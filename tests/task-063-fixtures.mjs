import { randomUUID } from "node:crypto";
import { scenario, addItem, time } from "./fixtures/engine-feasibility.mjs";
export function applyScenario(
  actor,
  { reorder = false, otherPlan = false } = {},
) {
  let s = scenario();
  if (reorder) {
    addItem(s);
    s.snapshot.plans[0].days[0].items.reverse();
  }
  const ids = new Map();
  const remember = (id) => ids.set(id, randomUUID());
  remember(s.snapshot.trip.id);
  for (const plan of s.snapshot.plans) {
    remember(plan.id);
    plan.revision = 1;
    for (const day of plan.days) {
      remember(day.id);
      for (const item of [...day.items, ...day.alternatives]) remember(item.id);
    }
  }
  s = JSON.parse(
    JSON.stringify(s, (_key, value) =>
      typeof value === "string" && ids.has(value) ? ids.get(value) : value,
    ),
  );
  s.snapshot.trip.revision = 1;
  s.change.baseVersion = { tripRevision: 1, planRevision: 1 };
  s.change.source.actorRef = actor;
  s.context.access.actorRef = actor;
  s.change.changeSetId = randomUUID();
  s.change.idempotencyKey = randomUUID();
  const day = s.snapshot.plans[0].days[0];
  s.change.operations = [
    reorder
      ? {
          operationId: randomUUID(),
          op: "REORDER_ITEMS",
          reason: null,
          dayId: day.id,
          orderedItemIds: day.items.map((i) => i.id).reverse(),
        }
      : {
          operationId: randomUUID(),
          op: "UPDATE_TIME",
          reason: null,
          itemId: day.items[0].id,
          schedule: {
            ...day.items[0].schedule,
            start: time(10, 11),
            end: time(10, 12, 30),
          },
        },
  ];
  if (otherPlan) {
    const plan = structuredClone(s.snapshot.plans[0]);
    plan.id = randomUUID();
    for (const day of plan.days) {
      day.id = randomUUID();
      for (const item of day.items) item.id = randomUUID();
    }
    s.snapshot.plans.push(plan);
  }
  return s;
}
export function contextResolver(s) {
  return async () => {
    const context = structuredClone(s.context);
    delete context.access;
    return context;
  };
}
