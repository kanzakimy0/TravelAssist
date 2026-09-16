import type {
  ChangeSetV0_1,
  EngineOperationV0_1,
} from "../../shared/contracts/engine";
import {
  integer,
  invalid,
  list,
  nullable,
  object,
  oneOf,
  parse,
  text,
} from "../../shared/contracts/trips/validation";
import type { Parser } from "../../shared/contracts/trips/validation";
import { factParser, id } from "./context";

export const OPERATIONS = [
  "ADD_ITEM",
  "UPDATE_ITEM",
  "MOVE_ITEM",
  "DELETE_ITEM",
  "SKIP_ITEM",
  "RESTORE_ITEM",
  "REPLACE_ITEM",
  "REPLACE_TRANSPORT",
  "UPDATE_TIME",
  "UPDATE_DURATION",
  "UPDATE_PLACE",
  "LINK_BOOKING",
  "UPDATE_BOOKING_STATUS",
  "LOCK_ITEM",
  "UNLOCK_ITEM",
  "REORDER_ITEMS",
  "REPLAN_DAY",
  "REPLAN_RANGE",
] as const;
// Fragments are validated by the canonical parser in the detached candidate,
// never by a second schedule/item schema.
const fragment: Parser<unknown> = (v) => v;
const operation: Parser<EngineOperationV0_1> = (v, p) => {
  const op = (v as { op?: unknown })?.op;
  if (typeof op !== "string" || !(OPERATIONS as readonly string[]).includes(op))
    invalid(p, "OPERATION_UNSUPPORTED");
  const base = {
    operationId: id,
    op: oneOf(OPERATIONS),
    reason: nullable(text(1000)),
  };
  const shapes: Record<string, Record<string, Parser<unknown>>> = {
    ADD_ITEM: { dayId: id, position: integer(), item: fragment },
    MOVE_ITEM: {
      itemId: id,
      toDayId: id,
      toPosition: integer(),
      schedule: fragment,
    },
    DELETE_ITEM: { itemId: id },
    REPLACE_ITEM: { itemId: id, replacement: fragment },
    UPDATE_TIME: { itemId: id, schedule: fragment },
    UPDATE_PLACE: { itemId: id, place: fragment },
    LOCK_ITEM: { itemId: id, toLockLevel: text(64) },
    UNLOCK_ITEM: { itemId: id, toLockLevel: text(64) },
    REORDER_ITEMS: { dayId: id, orderedItemIds: list(id, 1000) },
  };
  return object({ ...base, ...(shapes[op] ?? { targetRef: nullable(id) }) })(
    v,
    p,
  ) as EngineOperationV0_1;
};
const schema = object({
  engineContractVersion: oneOf(["0.1"]),
  tripContractVersion: oneOf(["1.0"]),
  changeSetId: id,
  idempotencyKey: id,
  target: object({ tripId: id, planId: id }),
  baseVersion: object({ tripRevision: integer(1), planRevision: integer(1) }),
  source: object({
    kind: oneOf(["user", "ai", "system", "provider_event"]),
    actorRef: id,
    correlationId: nullable(id),
    proposalRef: nullable(id),
  }),
  reason: text(1000),
  operations: list(operation, 100),
  factRefs: list(factParser, 1000),
});
export function parseChangeSet(input: unknown) {
  return parse(schema, input) as ReturnType<typeof parse<ChangeSetV0_1>>;
}
