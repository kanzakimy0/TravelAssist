import { randomUUID } from "node:crypto";
import { applyScenario } from "./task-063-fixtures.mjs";
export function rollbackRequest(actor, receipt) {
  return {
    rollbackContractVersion: "4.23-rollback-1",
    requestId: randomUUID(),
    idempotencyKey: randomUUID(),
    originalReceiptId: receipt,
    actorRef: actor,
    correlationId: null,
    reason: "Synthetic compensation",
  };
}
export function reversibleReorder(actor) {
  const s = applyScenario(actor, { reorder: true });
  const day = s.snapshot.plans[0].days[0];
  day.items.reverse(); // Valid chronological preimage.
  const [a, b] = day.items;
  s.change.operations = [
    {
      operationId: randomUUID(),
      op: "UPDATE_TIME",
      reason: null,
      itemId: a.id,
      schedule: structuredClone(b.schedule),
    },
    {
      operationId: randomUUID(),
      op: "UPDATE_TIME",
      reason: null,
      itemId: b.id,
      schedule: structuredClone(a.schedule),
    },
    {
      operationId: randomUUID(),
      op: "REORDER_ITEMS",
      reason: null,
      dayId: day.id,
      orderedItemIds: [b.id, a.id],
    },
  ];
  return s;
}
