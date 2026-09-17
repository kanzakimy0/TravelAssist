// Certification generator v1: case address = fixed seed + family + ordinal.
// No clock/random UUID/provider is used. Replay TASK065_CASE=<0..5119>.
import {
  scenario,
  addItem,
  route,
  opening,
  time,
} from "./fixtures/engine-feasibility.mjs";
export const SEED = 0x065b2026;
export const PER_FAMILY = 128;
export const FAMILIES = [
  "valid_time",
  "valid_reorder",
  "stale_trip",
  "stale_plan",
  "user_lock",
  "system_lock",
  "booking_lock",
  "payment_lock",
  "protected_item",
  "booking_confirmed",
  "source_ai",
  "source_system",
  "source_provider",
  "unknown_engine",
  "unknown_trip",
  "unknown_operation",
  "unsupported_delete",
  "unknown_field",
  "duplicate_operation",
  "missing_item",
  "invalid_schedule",
  "invalid_order",
  "duplicate_item",
  "missing_route",
  "stale_route",
  "invalid_route",
  "valid_route",
  "short_duration",
  "compressed_confirmation",
  "missing_profile",
  "expired_profile",
  "unknown_model",
  "missing_context",
  "access_mismatch",
  "oversize_operations",
  "oversize_reason",
  "opening_conflict",
  "low_confidence_route",
  "invalid_revision",
  "overload",
];
export function randomFor(index) {
  let state = (SEED ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  return (max) => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) % max;
  };
}
export function seededCase(index) {
  const family = FAMILIES[Math.floor(index / PER_FAMILY)],
    rand = randomFor(index);
  if (!family) throw Error("Invalid TASK065_CASE");
  const oneDay = /route|reorder|order|opening/.test(family);
  const s = scenario(90 + rand(20), oneDay ? 1 : 1 + rand(3));
  const day = s.snapshot.plans[0].days[0],
    item = day.items[0];
  s.snapshot.trip.revision = 1 + rand(100000);
  s.snapshot.plans[0].revision = 1 + rand(100000);
  s.change.baseVersion = {
    tripRevision: s.snapshot.trip.revision,
    planRevision: s.snapshot.plans[0].revision,
  };
  s.change.changeSetId = "cert-" + index;
  s.change.idempotencyKey = "cert-key-" + index;
  s.change.reason = "Synthetic seeded case " + index;
  s.context.policy.ref = "cert-policy-" + rand(31);
  for (const p of s.context.profiles) {
    p.walking = 2 + rand(5);
    p.physical = 2 + rand(5);
  }
  const minute = rand(25);
  s.change.operations = [
    {
      operationId: "op-" + index,
      op: "UPDATE_TIME",
      reason: null,
      itemId: item.id,
      schedule: {
        ...item.schedule,
        start: time(10, 11, minute),
        end: time(10, 12, minute + 30),
      },
    },
  ];
  const op = s.change.operations[0];
  let expected = "accepted",
    code = null;
  const reject = (outcome, issue) => {
    expected = outcome;
    code = issue ?? null;
  };
  if (family.includes("route")) {
    const second = addItem(s, 14);
    item.schedule = structuredClone(op.schedule);
    route(s, item, second, 15 + rand(20));
  }
  switch (family) {
    case "valid_reorder": {
      addItem(s);
      day.items.reverse();
      s.change.operations = [
        {
          operationId: op.operationId,
          op: "REORDER_ITEMS",
          reason: null,
          dayId: day.id,
          orderedItemIds: day.items.map((i) => i.id).reverse(),
        },
      ];
      break;
    }
    case "stale_trip":
      s.change.baseVersion.tripRevision--;
      reject("blocked", "BASE_VERSION_STALE");
      break;
    case "stale_plan":
      s.change.baseVersion.planRevision++;
      reject("blocked", "BASE_VERSION_STALE");
      break;
    case "user_lock":
      item.lockLevel = "user_lock";
      reject("needsConfirmation");
      break;
    case "system_lock":
      item.lockLevel = "system_hard_lock";
      reject("blocked");
      break;
    case "booking_lock":
      item.lockLevel = "booking_lock";
      reject("unsupported");
      break;
    case "payment_lock":
      item.lockLevel = "payment_lock";
      reject("unsupported");
      break;
    case "protected_item":
      s.context.protectedItemIds = [item.id];
      reject("needsConfirmation");
      break;
    case "booking_confirmed":
      item.booking = {
        status: "confirmed",
        referenceId: "synthetic-booking",
        verifiedAt: "2027-04-01T00:00:00Z",
      };
      reject("unsupported");
      break;
    case "source_ai":
      s.change.source.kind = "ai";
      reject("unsupported");
      break;
    case "source_system":
      s.change.source.kind = "system";
      reject("unsupported");
      break;
    case "source_provider":
      s.change.source.kind = "provider_event";
      reject("unsupported");
      break;
    case "unknown_engine":
      s.change.engineContractVersion = "99";
      reject("unsupported", "CONTRACT_VERSION_UNSUPPORTED");
      break;
    case "unknown_trip":
      s.change.tripContractVersion = "99";
      reject("unsupported", "CONTRACT_VERSION_UNSUPPORTED");
      break;
    case "unknown_operation":
      op.op = ["CERT_UNKNOWN", "update_time", "UPDATE_TIME ", "Update_Time"][
        rand(4)
      ];
      reject("unsupported", "OPERATION_UNSUPPORTED");
      break;
    case "unsupported_delete":
      s.change.operations = [
        {
          operationId: op.operationId,
          op: "DELETE_ITEM",
          reason: null,
          itemId: item.id,
        },
      ];
      reject("unsupported", "OPERATION_UNSUPPORTED");
      break;
    case "unknown_field":
      s.change.confirmed = true;
      reject("blocked", "INPUT_INVALID");
      break;
    case "duplicate_operation":
      s.change.operations.push(structuredClone(op));
      reject("blocked");
      break;
    case "missing_item":
      op.itemId = "absent-" + index;
      reject("blocked", "TARGET_NOT_FOUND");
      break;
    case "invalid_schedule":
      op.schedule.end = op.schedule.start;
      reject("blocked");
      break;
    case "invalid_order":
      s.change.operations = [
        {
          operationId: op.operationId,
          op: "REORDER_ITEMS",
          reason: null,
          dayId: day.id,
          orderedItemIds: [item.id, item.id],
        },
      ];
      reject("blocked");
      break;
    case "duplicate_item":
      day.items.push(structuredClone(item));
      reject("blocked", "INPUT_INVALID");
      break;
    case "missing_route":
      s.context.routes = [];
      s.change.factRefs = [];
      reject("blocked", "PROVIDER_FACT_MISSING");
      break;
    case "stale_route":
      s.context.routes[0].fact.expiresAt = "2027-03-31T12:00:00Z";
      s.change.factRefs = [structuredClone(s.context.routes[0].fact)];
      reject("blocked", "ROUTE_FACT_EXPIRED");
      break;
    case "invalid_route":
      s.context.routes[0].response.rawProvider = {
        canary: "TASK065_RAW_PROVIDER",
      };
      reject("blocked", "ASSESSMENT_INPUT_MISSING");
      break;
    case "short_duration":
      op.schedule.end = time(10, 11, minute + 20);
      reject("blocked", "DURATION_TOO_SHORT");
      break;
    case "compressed_confirmation":
      op.schedule.end = time(10, 12, minute);
      s.context.policy.compressed = "confirmation";
      reject("needsConfirmation", "COMPRESSED_VISIT");
      break;
    case "missing_profile":
      s.context.profiles = [];
      reject("blocked", "ASSESSMENT_INPUT_MISSING");
      break;
    case "expired_profile":
      s.context.profiles[0].expiresAt = "2027-03-02T00:00:00Z";
      reject("blocked", "ASSESSMENT_INPUT_MISSING");
      break;
    case "unknown_model":
      s.context.policy.model.version = "unknown";
      reject("unsupported", "ASSESSMENT_UNSUPPORTED");
      break;
    case "missing_context":
      s.context.days[0].context = null;
      reject("blocked", "ASSESSMENT_INPUT_MISSING");
      break;
    case "access_mismatch":
      s.context.access.actorRef = "foreign-actor";
      reject("blocked", "PERMISSION_DENIED");
      break;
    case "oversize_operations":
      s.change.operations = Array.from({ length: 101 }, (_, i) => ({
        ...op,
        operationId: "large-" + i,
      }));
      reject("blocked", "INPUT_INVALID");
      break;
    case "oversize_reason":
      s.change.reason = "x".repeat(1001 + rand(100));
      reject("blocked", "INPUT_INVALID");
      break;
    case "opening_conflict":
      opening(s, [{ start: time(10, 15), end: time(10, 17) }]);
      reject("blocked", "HARD_TIME_CONFLICT");
      break;
    case "low_confidence_route":
      s.context.routes[0].fact.confidence = 0.1;
      s.change.factRefs = [structuredClone(s.context.routes[0].fact)];
      reject("blocked", "PROVIDER_FACT_LOW_CONFIDENCE");
      break;
    case "invalid_revision":
      s.change.baseVersion.tripRevision = 0;
      reject("blocked", "INPUT_INVALID");
      break;
    case "overload":
      s.context.days[0].loadLimit = 0;
      reject("blocked", "DAY_OVERLOADED");
      break;
  }
  return { index, family, expected, code, ...s };
}
export function reverseKeys(value) {
  if (Array.isArray(value)) return value.map(reverseKeys);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .reverse()
        .map(([k, v]) => [k, reverseKeys(v)]),
    );
  return value;
}
