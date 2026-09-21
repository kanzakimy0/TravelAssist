import {
  parseTripPlanSnapshot,
  type PlanItemV1,
  type TripPlanSnapshotV1,
} from "../../../shared/contracts/trips";
import type { DetailDraftState } from "./detail-workspace";
import {
  type PlaceType,
  type PlannerPlace,
  type ReservationStatus,
  type TripItem,
  type TripPlan,
  type TripState,
} from "./trip-model";

export class PlannerCanonicalAdapterError extends Error {
  readonly code:
    | "CANONICAL_TARGET_REQUIRED"
    | "EMPTY_CANONICAL_PLAN"
    | "UNSUPPORTED_STRUCTURE"
    | "INVALID_CANONICAL_PROJECTION";
  constructor(
    code:
      | "CANONICAL_TARGET_REQUIRED"
      | "EMPTY_CANONICAL_PLAN"
      | "UNSUPPORTED_STRUCTURE"
      | "INVALID_CANONICAL_PROJECTION",
  ) {
    super(code);
    this.code = code;
  }
}

const fallbackCoordinates: [number, number] = [139.767, 35.681];
const plannerTypes: Record<string, PlaceType> = {
  hotel: "hotel",
  meal: "restaurant",
  transport: "transport",
  train: "transport",
  car_rental: "transport",
  ferry: "transport",
  flight: "transport",
  activity: "activity",
};
const canonicalKinds: Record<PlaceType, string> = {
  attraction: "place",
  hotel: "hotel",
  restaurant: "meal",
  transport: "transport",
  activity: "activity",
};

function plannerType(item: PlanItemV1): PlaceType {
  return plannerTypes[item.kind] ?? "attraction";
}
function reservation(status: string): ReservationStatus {
  if (status === "not_required") return "not_required";
  if (status === "confirmed") return "booked";
  if (status === "cancelled") return "cancelled";
  if (status === "failed") return "failed";
  return "pending";
}
function booking(status: ReservationStatus, original: PlanItemV1["booking"]) {
  const next =
    status === "not_required"
      ? "not_required"
      : status === "booked" || status === "ticketed"
        ? "confirmed"
        : status === "cancelled"
          ? "cancelled"
          : status === "failed"
            ? "failed"
            : status === "pending" ||
                status === "booking" ||
                status === "changed"
              ? "needs_booking"
              : "unknown";
  // Confirmed Canonical bookings require prior evidence; the legacy Planner
  // cannot invent an order ID or verification time.
  if (next === "confirmed" && !original.referenceId) return original;
  return { ...original, status: next };
}
function placeId(item: PlanItemV1) {
  return item.place?.id ?? `canonical-place:${item.id}`;
}
function time(value: string | null, fallback: string) {
  return value ? value.slice(11, 16) : fallback;
}
function duration(item: PlanItemV1) {
  if (!item.schedule) return 60;
  return Math.max(
    15,
    Math.round(
      (Date.parse(item.schedule.end) - Date.parse(item.schedule.start)) / 60000,
    ),
  );
}
function makePlace(item: PlanItemV1, index: number): PlannerPlace {
  const coordinates = item.place?.coordinates
    ? ([item.place.coordinates.longitude, item.place.coordinates.latitude] as [
        number,
        number,
      ])
    : ([
        fallbackCoordinates[0] + ((index % 5) - 2) * 0.006,
        fallbackCoordinates[1] + ((index % 3) - 1) * 0.004,
      ] as [number, number]);
  return {
    id: placeId(item),
    name: item.place?.name ?? item.title,
    type: plannerType(item),
    coordinates,
    city: "已保存行程",
    image: "",
    duration: duration(item),
    hours: "以已保存行程为准",
    why: "来自已保存的 Canonical 行程",
    advice: "地图与推荐资料不写回 Canonical 行程。",
    tags: [],
    price: 0,
    bookingRequired: item.booking.status === "needs_booking",
    providerIds: {},
    bookingOptions: [],
  };
}
function projectItem(
  item: PlanItemV1,
  day: { dayNumber: number; localDate: string },
  placement: "scheduled" | "alternative",
): TripItem {
  const type = plannerType(item);
  return {
    id: item.id,
    placeId: placeId(item),
    day: day.dayNumber,
    endDay: day.dayNumber,
    date: day.localDate,
    startTime: time(item.schedule?.start ?? null, "09:00"),
    endTime: time(item.schedule?.end ?? null, "10:00"),
    title: item.title,
    type,
    reservationRequired: item.booking.status === "needs_booking",
    reservationStatus: reservation(item.booking.status),
    ...(item.booking.referenceId
      ? { reservationId: item.booking.referenceId }
      : {}),
    fixedTime: Boolean(item.schedule && item.lockLevel !== "none"),
    locked: item.lockLevel !== "none",
    ...(placement === "alternative" ? { planningPlaceholder: true } : {}),
  };
}

/** Maps only the Canonical subset supported by the current Planner UI. */
export function plannerTripFromCanonical(
  source: unknown,
  seed: TripState,
): TripState {
  const parsed = parseTripPlanSnapshot(source);
  if (!parsed.ok)
    throw new PlannerCanonicalAdapterError("INVALID_CANONICAL_PROJECTION");
  const snapshot = parsed.value;
  if (!snapshot.plans.length)
    throw new PlannerCanonicalAdapterError("EMPTY_CANONICAL_PLAN");
  const seedDays = seed.plans[0]?.days;
  if (!seedDays?.length)
    throw new PlannerCanonicalAdapterError("INVALID_CANONICAL_PROJECTION");
  const places = new Map<string, PlannerPlace>();
  const itemBaselines: NonNullable<
    TripState["canonicalContext"]
  >["itemBaselines"] = {};
  let index = 0;
  const plans: TripPlan[] = snapshot.plans.map((plan) => {
    const days = plan.days.map((day, dayIndex) => {
      const visual = structuredClone(seedDays[dayIndex % seedDays.length]);
      const sourceItems = [
        ...day.items.map((item) => [item, "scheduled"] as const),
        ...day.alternatives.map((item) => [item, "alternative"] as const),
      ];
      for (const [item] of sourceItems) {
        if (!places.has(placeId(item)))
          places.set(placeId(item), makePlace(item, index++));
      }
      return {
        ...visual,
        day: day.dayNumber,
        date: day.localDate,
        title: `第 ${day.dayNumber} 天`,
        city: "已保存行程",
        coordinates: sourceItems[0]?.[0].place?.coordinates
          ? ([
              sourceItems[0][0].place.coordinates.longitude,
              sourceItems[0][0].place.coordinates.latitude,
            ] as [number, number])
          : fallbackCoordinates,
        movement: [],
        weather: ["以已保存行程为准"],
      };
    });
    const scheduled = plan.days.flatMap((day) =>
      day.items.map((item) => projectItem(item, day, "scheduled")),
    );
    const alternatives = plan.days.flatMap((day) =>
      day.alternatives.map((item) => projectItem(item, day, "alternative")),
    );
    for (const item of [...scheduled, ...alternatives]) {
      itemBaselines[item.id] = {
        day: item.day,
        date: item.date,
        startTime: item.startTime,
        endTime: item.endTime,
        title: item.title,
        type: item.type,
        placeId: item.placeId,
        placement: item.planningPlaceholder ? "alternative" : "scheduled",
      };
    }
    return {
      id: plan.id,
      name: plan.title,
      summary: "已从服务器读取的行程方案",
      days,
      items: scheduled,
      reserveItems: alternatives,
    };
  });
  const currentPlanId =
    snapshot.trip.activePlanId &&
    plans.some((plan) => plan.id === snapshot.trip.activePlanId)
      ? snapshot.trip.activePlanId
      : plans[0].id;
  const current = plans.find((plan) => plan.id === currentPlanId)!;
  const firstDate = current.days[0]?.date ?? seed.settings.startDate;
  const lastDate = current.days.at(-1)?.date ?? seed.configuration.returnDate;
  return {
    ...structuredClone(seed),
    canonicalContext: { snapshot: structuredClone(snapshot), itemBaselines },
    plans,
    places: [...places.values()],
    areas: [],
    workingPlanId: currentPlanId,
    settings: { ...seed.settings, startDate: firstDate },
    configuration: { ...seed.configuration, returnDate: lastDate },
    ui: {
      ...seed.ui,
      currentPlanId,
      selectedDay: 1,
      focusedDay: 1,
      threeDayStart: 1,
      selectedTripItemId: null,
      inspection: null,
      bookingOpen: false,
      isMoreSettingsOpen: false,
      isRightPanelOverlayOpen: false,
      isBottomPanelOverlayOpen: false,
    },
    notice: `已读取服务器行程 · 修订 ${snapshot.trip.revision}`,
  };
}

function sameBaseline(
  item: TripItem,
  baseline: NonNullable<TripState["canonicalContext"]>["itemBaselines"][string],
) {
  return (
    item.day === baseline.day &&
    item.date === baseline.date &&
    item.startTime === baseline.startTime &&
    item.endTime === baseline.endTime &&
    item.title === baseline.title &&
    item.type === baseline.type &&
    item.placeId === baseline.placeId
  );
}

const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function plusDays(date: string, days: number) {
  const next = new Date(`${date}T12:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}
function localParts(value: Date, zone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}:${get("second")}`,
  };
}
function offsetMinutes(at: number, zone: string) {
  const local = localParts(new Date(at), zone);
  return (Date.parse(`${local.date}T${local.time}Z`) - at) / 60000;
}
function offsetText(offset: number) {
  const sign = offset < 0 ? "-" : "+";
  const absolute = Math.abs(offset);
  return `${sign}${String(Math.floor(absolute / 60)).padStart(2, "0")}:${String(
    absolute % 60,
  ).padStart(2, "0")}`;
}
function zonedInstant(date: string, clock: string, zone: string) {
  const desired = Date.parse(`${date}T${clock}:00Z`);
  let at = desired;
  for (let count = 0; count < 3; count++)
    at = desired - offsetMinutes(at, zone) * 60000;
  const local = localParts(new Date(at), zone);
  if (local.date !== date || local.time.slice(0, 5) !== clock)
    throw new PlannerCanonicalAdapterError("UNSUPPORTED_STRUCTURE");
  return `${date}T${clock}:00${offsetText(offsetMinutes(at, zone))}`;
}
function dateAt(instant: string, zone: string) {
  return localParts(new Date(instant), zone).date;
}
function scheduleFor(
  item: TripItem,
  day: { localDate: string; timezone: string },
  original?: PlanItemV1,
  baseline?: NonNullable<
    TripState["canonicalContext"]
  >["itemBaselines"][string],
) {
  const endZone = original?.schedule?.endTimezone ?? day.timezone;
  const originalEndOffset =
    original?.schedule && baseline
      ? Math.round(
          (Date.parse(dateAt(original.schedule.end, endZone)) -
            Date.parse(baseline.date)) /
            86400000,
        )
      : 0;
  let endDate = plusDays(item.date, originalEndOffset);
  const start = zonedInstant(item.date, item.startTime, day.timezone);
  let end = zonedInstant(endDate, item.endTime, endZone);
  if (Date.parse(end) <= Date.parse(start)) {
    endDate = plusDays(endDate, 1);
    end = zonedInstant(endDate, item.endTime, endZone);
  }
  return {
    start,
    end,
    startTimezone: day.timezone,
    endTimezone: endZone,
  };
}
function canonicalPlace(
  item: TripItem,
  trip: TripState,
  original?: PlanItemV1,
) {
  const current = trip.places.find((place) => place.id === item.placeId);
  if (!current) throw new PlannerCanonicalAdapterError("UNSUPPORTED_STRUCTURE");
  if (original && original.place && item.placeId === placeId(original))
    return structuredClone(original.place);
  return {
    id: current.id.startsWith("canonical-place:") ? null : current.id,
    name: current.name,
    coordinates: {
      latitude: current.coordinates[1],
      longitude: current.coordinates[0],
    },
  };
}

/** Preserve an unchanged Canonical item byte-for-byte at the semantic level. */
function updateItem(
  item: TripItem,
  original: PlanItemV1,
  baseline: NonNullable<TripState["canonicalContext"]>["itemBaselines"][string],
  day: { localDate: string; timezone: string },
  trip: TripState,
) {
  if (sameBaseline(item, baseline)) return structuredClone(original);
  const scheduleChanged =
    item.date !== baseline.date ||
    item.startTime !== baseline.startTime ||
    item.endTime !== baseline.endTime;
  return {
    ...original,
    kind: canonicalKinds[item.type],
    title: item.title,
    place: canonicalPlace(item, trip, original),
    schedule:
      scheduleChanged && original.schedule
        ? scheduleFor(item, day, original, baseline)
        : original.schedule,
    booking: booking(item.reservationStatus, original.booking),
    lockLevel: item.locked
      ? original.lockLevel === "none"
        ? "user_lock"
        : original.lockLevel
      : "none",
  };
}

function newItem(
  item: TripItem,
  day: { localDate: string; timezone: string },
  trip: TripState,
): PlanItemV1 {
  if (!uuid.test(item.id) || item.endDay !== item.day)
    throw new PlannerCanonicalAdapterError("UNSUPPORTED_STRUCTURE");
  const candidate: PlanItemV1 = {
    id: item.id,
    kind: canonicalKinds[item.type],
    title: item.title,
    place: canonicalPlace(item, trip),
    schedule: scheduleFor(item, day),
    lockLevel: item.locked ? "user_lock" : "none",
    assessment: "unknown",
    booking: {
      status: booking(item.reservationStatus, {
        status: "unknown",
        referenceId: null,
        verifiedAt: null,
      }).status,
      referenceId: null,
      verifiedAt: null,
    },
  };
  if (candidate.booking.status === "confirmed")
    throw new PlannerCanonicalAdapterError("UNSUPPORTED_STRUCTURE");
  return candidate;
}

/** Converts the current working copy back to the accepted Canonical subset. */
export function canonicalFromPlannerTrip(
  trip: TripState,
  draft: DetailDraftState,
): TripPlanSnapshotV1 {
  // Detail drafts are deliberately local-only. Keep the boundary explicit.
  void draft;
  const context = trip.canonicalContext;
  if (!context)
    throw new PlannerCanonicalAdapterError("CANONICAL_TARGET_REQUIRED");
  const source = context.snapshot;
  if (trip.plans.length !== source.plans.length)
    throw new PlannerCanonicalAdapterError("UNSUPPORTED_STRUCTURE");
  const plans = source.plans.map((originalPlan) => {
    const plan = trip.plans.find(
      (candidate) => candidate.id === originalPlan.id,
    );
    if (!plan || plan.days.length !== originalPlan.days.length)
      throw new PlannerCanonicalAdapterError("UNSUPPORTED_STRUCTURE");
    const originalById = new Map(
      originalPlan.days.flatMap((day) => [
        ...day.items.map((item) => [item.id, item] as const),
        ...day.alternatives.map((item) => [item.id, item] as const),
      ]),
    );
    const seen = new Set<string>();
    return {
      ...originalPlan,
      title: plan.name,
      days: originalPlan.days.map((day) => {
        const current = plan.days.find((entry) => entry.day === day.dayNumber);
        if (!current)
          throw new PlannerCanonicalAdapterError("UNSUPPORTED_STRUCTURE");
        const mapBucket = (items: TripItem[]) =>
          items.map((item) => {
            if (seen.has(item.id))
              throw new PlannerCanonicalAdapterError("UNSUPPORTED_STRUCTURE");
            seen.add(item.id);
            const original = originalById.get(item.id);
            if (!original) return newItem(item, day, trip);
            const baseline = context.itemBaselines[item.id];
            if (!baseline)
              throw new PlannerCanonicalAdapterError("UNSUPPORTED_STRUCTURE");
            return updateItem(item, original, baseline, day, trip);
          });
        return {
          ...day,
          localDate: current.date,
          items: mapBucket(
            plan.items.filter((item) => item.day === current.day),
          ),
          alternatives: mapBucket(
            (plan.reserveItems ?? []).filter(
              (item) => item.day === current.day,
            ),
          ),
        };
      }),
    };
  });
  const candidate = {
    ...source,
    trip: {
      ...source.trip,
      activePlanId: plans.some((plan) => plan.id === trip.ui.currentPlanId)
        ? trip.ui.currentPlanId
        : source.trip.activePlanId,
    },
    plans,
  };
  const parsed = parseTripPlanSnapshot(candidate);
  if (!parsed.ok)
    throw new PlannerCanonicalAdapterError("INVALID_CANONICAL_PROJECTION");
  return parsed.value;
}
