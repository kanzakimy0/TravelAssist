import "server-only";
import type {
  ChangeSetV0_1,
  EngineOperationV0_1,
} from "../../shared/contracts/engine";
import {
  canonicalScheduleV1,
  type TripPlanSnapshotV1,
} from "../../shared/contracts/trips";
import {
  invalid,
  list,
  nullable,
  object,
  oneOf,
  parse,
  refine,
  type Parser,
} from "../../shared/contracts/trips/validation";
import { runtimeUuid } from "../../shared/contracts/engine/runtime";
import { canonicalJson, detached } from "./json";
const order = refine(list(runtimeUuid, 1000), (v, p) => {
  if (new Set(v).size !== v.length) invalid(p, "DUPLICATE_ID");
});
const timeEntry = object({
  op: oneOf(["UPDATE_TIME"]),
  itemId: runtimeUuid,
  beforeSchedule: nullable(canonicalScheduleV1),
  appliedSchedule: nullable(canonicalScheduleV1),
});
const orderEntry = object({
  op: oneOf(["REORDER_ITEMS"]),
  dayId: runtimeUuid,
  beforeOrder: order,
  appliedOrder: order,
});
type Entry = ReturnType<typeof timeEntry> | ReturnType<typeof orderEntry>;
const entry: Parser<Entry> = (v, p) => {
  const d =
    v && typeof v === "object"
      ? Object.getOwnPropertyDescriptor(v, "op")
      : undefined;
  return d && "value" in d && d.value === "UPDATE_TIME"
    ? timeEntry(v, p)
    : orderEntry(v, p);
};
const schema = refine(
  object({ version: oneOf(["4.23-preimage-1"]), entries: list(entry, 100) }),
  (v, p) => {
    const keys = v.entries.map(
      (e) => e.op + ("itemId" in e ? e.itemId : e.dayId),
    );
    if (!keys.length || new Set(keys).size !== keys.length)
      invalid(p, "INVALID_HISTORY");
    for (const e of v.entries)
      if (
        e.op === "REORDER_ITEMS" &&
        canonicalJson([...e.beforeOrder].sort()) !==
          canonicalJson([...e.appliedOrder].sort())
      )
        invalid(p, "INVALID_HISTORY");
  },
);
export type ApplyPreimageV1 = ReturnType<typeof schema>;
export const parsePreimage = (input: unknown) => parse(schema, input);
export function capturePreimage(
  before: TripPlanSnapshotV1,
  after: TripPlanSnapshotV1,
  change: ChangeSetV0_1,
): ApplyPreimageV1 {
  const a = before.plans.find((p) => p.id === change.target.planId)!;
  const b = after.plans.find((p) => p.id === change.target.planId)!;
  const entries: Entry[] = [];
  const seen = new Set<string>();
  for (const op of change.operations) {
    if (op.op !== "UPDATE_TIME" && op.op !== "REORDER_ITEMS")
      throw Error("UNSUPPORTED_HISTORY");
    const key = op.op + (op.op === "UPDATE_TIME" ? op.itemId : op.dayId);
    if (seen.has(key)) continue;
    seen.add(key);
    if (op.op === "UPDATE_TIME") {
      const x = a.days.flatMap((d) => d.items).find((i) => i.id === op.itemId);
      const y = b.days.flatMap((d) => d.items).find((i) => i.id === op.itemId);
      if (!x || !y) throw Error("INVALID_HISTORY");
      entries.push({
        op: op.op,
        itemId: op.itemId,
        beforeSchedule: x.schedule,
        appliedSchedule: y.schedule,
      });
    } else {
      const x = a.days.find((d) => d.id === op.dayId),
        y = b.days.find((d) => d.id === op.dayId);
      if (!x || !y) throw Error("INVALID_HISTORY");
      entries.push({
        op: op.op,
        dayId: op.dayId,
        beforeOrder: x.items.map((i) => i.id),
        appliedOrder: y.items.map((i) => i.id),
      });
    }
  }
  const parsed = parsePreimage(
    detached({ version: "4.23-preimage-1", entries }),
  );
  if (!parsed.ok) throw Error("INVALID_HISTORY");
  return parsed.value;
}
export function inverseOperations(
  snapshot: TripPlanSnapshotV1,
  planId: string,
  history: unknown,
): EngineOperationV0_1[] | null {
  const p = parsePreimage(history);
  if (!p.ok) return null;
  const plan = snapshot.plans.find((p) => p.id === planId);
  if (!plan) return null;
  const ops: EngineOperationV0_1[] = [];
  for (const [i, e] of p.value.entries.entries()) {
    const base = { operationId: "inverse-" + i, reason: null };
    if (e.op === "UPDATE_TIME") {
      const item = plan.days
        .flatMap((d) => d.items)
        .find((x) => x.id === e.itemId);
      if (
        !item ||
        canonicalJson(item.schedule) !== canonicalJson(e.appliedSchedule)
      )
        return null;
      ops.push({
        ...base,
        op: e.op,
        itemId: e.itemId,
        schedule: detached(e.beforeSchedule),
      });
    } else {
      const day = plan.days.find((d) => d.id === e.dayId);
      if (
        !day ||
        canonicalJson(day.items.map((x) => x.id)) !==
          canonicalJson(e.appliedOrder)
      )
        return null;
      ops.push({
        ...base,
        op: e.op,
        dayId: e.dayId,
        orderedItemIds: [...e.beforeOrder],
      });
    }
  }
  return ops;
}
