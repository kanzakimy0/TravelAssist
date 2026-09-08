/** Canonical proposed v1. Review status is documented, not a runtime flag. */
import {
  boolean,
  code,
  coordinates,
  instant,
  integer,
  invalid,
  list,
  localDate,
  nullable,
  object,
  oneOf,
  parse,
  refine,
  text,
  timeZone,
  uniqueIds,
} from "./validation";
import type { Parsed } from "./validation";

export const TRIP_CONTRACT_VERSION = "1.0" as const;
const version = oneOf([TRIP_CONTRACT_VERSION]);
const id = refine(text(160), (value, path) => {
  if (value.trim() !== value || /[\s\u0000-\u001f\u007f]/.test(value))
    invalid(path, "INVALID_ID");
});
const amount = nullable(integer());
const currency = refine(text(3), (value, path) => {
  if (!/^[A-Z]{3}$/.test(value)) invalid(path, "INVALID_CURRENCY_CODE");
});
const place = object({
  id: nullable(id),
  name: text(),
  coordinates: nullable(coordinates),
});

const approximateDate = object({
  year: integer(1, 9999),
  month: nullable(integer(1, 12)),
  part: oneOf([
    "whole",
    "early",
    "middle",
    "late",
    "spring",
    "summer",
    "autumn",
    "winter",
  ]),
});
const dates = refine(
  object({
    mode: oneOf(["exact", "planned", "undecided"]),
    departure: nullable(localDate),
    returning: nullable(localDate),
    plannedDeparture: nullable(approximateDate),
    plannedReturn: nullable(approximateDate),
    durationDays: nullable(integer(1, 3660)),
  }),
  (value, path) => {
    if (
      value.mode !== "exact" &&
      (value.departure !== null || value.returning !== null)
    )
      invalid(path, "INACTIVE_DATE_FIELDS");
    if (
      value.mode !== "planned" &&
      (value.plannedDeparture !== null || value.plannedReturn !== null)
    )
      invalid(path, "INACTIVE_DATE_FIELDS");
    if (value.departure && value.returning) {
      if (value.returning < value.departure) invalid(path, "REVERSED_DATES");
      const days =
        (Date.parse(value.returning) - Date.parse(value.departure)) / 86400000 +
        1;
      if (value.durationDays !== null && value.durationDays !== days)
        invalid(path, "DURATION_MISMATCH");
    }
    for (const planned of [value.plannedDeparture, value.plannedReturn]) {
      if (!planned) continue;
      const season = ["spring", "summer", "autumn", "winter"].includes(
        planned.part,
      );
      if (season !== (planned.month === null))
        invalid(path, "INVALID_APPROXIMATE_DATE");
    }
  },
);
const localTime = refine(text(5), (value, path) => {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value))
    invalid(path, "INVALID_LOCAL_TIME");
});
const anchors = object({
  flights: list(
    object({
      id,
      departureAirport: nullable(text()),
      inputMethod: oneOf(["manual", "lookup", "paste", "ai"]),
      arrivalAirport: nullable(text()),
      date: nullable(localDate),
      departureTime: nullable(localTime),
      timezone: nullable(timeZone),
      flightNumber: nullable(text(40)),
    }),
    100,
  ),
  hotels: list(
    refine(
      object({
        id,
        name: text(),
        city: nullable(text()),
        inputMethod: oneOf(["manual", "poi", "paste", "ai"]),
        address: nullable(text(1000)),
        checkIn: nullable(localDate),
        checkOut: nullable(localDate),
        location: nullable(place),
      }),
      (value, path) => {
        if (value.checkIn && value.checkOut && value.checkOut <= value.checkIn)
          invalid(path, "INVALID_STAY_DATES");
      },
    ),
    100,
  ),
  activities: list(
    object({
      id,
      name: text(),
      inputMethod: oneOf(["manual", "lookup", "paste", "ai"]),
      date: nullable(localDate),
      time: nullable(localTime),
      timezone: nullable(timeZone),
      location: nullable(place),
      fixed: boolean,
      nonCancellable: boolean,
    }),
    100,
  ),
});

export const tripDraftFactsV1 = refine(
  object({
    contractVersion: version,
    title: nullable(text()),
    defaultTimezone: nullable(timeZone),
    destinations: list(place, 100),
    dates,
    participants: object({
      adults: integer(0, 1000),
      children: integer(0, 1000),
      infants: integer(0, 1000),
      seniors: integer(0, 1000),
    }),
    participantNeeds: nullable(
      object({
        childAgeInput: nullable(text(100)),
        childSeat: boolean,
        infantAgeInput: nullable(text(100)),
        stroller: boolean,
        crib: boolean,
        seniorWalking: oneOf(["standard", "light", "limited"]),
        reduceStairs: boolean,
        restFrequency: oneOf(["standard", "often", "frequent"]),
      }),
    ),
    budget: nullable(
      object({
        currency,
        totalMinor: amount,
        perPersonMinor: amount,
        lodgingPerNightMinor: amount,
        diningPerDayMinor: amount,
      }),
    ),
    // Trip-only factual constraints, not Preference keys or a Companion Master.
    constraints: list(
      object({
        id,
        kind: oneOf([
          "participant_need",
          "mobility_limit",
          "driving_limit",
          "other",
        ]),
        note: text(2000),
      }),
      100,
    ),
    fixedArrangements: anchors,
  }),
  (value, path) => {
    uniqueIds(
      [
        ...value.fixedArrangements.flights,
        ...value.fixedArrangements.hotels,
        ...value.fixedArrangements.activities,
      ],
      `${path}.fixedArrangements`,
    );
    uniqueIds(value.constraints, `${path}.constraints`);
    uniqueIds(
      value.destinations.filter(
        (item): item is typeof item & { id: string } => item.id !== null,
      ),
      `${path}.destinations`,
    );
  },
);
export type TripDraftFactsV1 = Parsed<typeof tripDraftFactsV1>;

export const WIZARD_PHASES = [
  "familiarity",
  "preferences",
  "trip_basics",
  "generating",
  "plan_selection",
] as const;
export const wizardProgressV1 = object({
  contractVersion: version,
  phase: oneOf(WIZARD_PHASES),
  completedPhases: refine(list(oneOf(WIZARD_PHASES), 5), (value, path) => {
    if (new Set(value).size !== value.length) invalid(path, "DUPLICATE_PHASE");
  }),
});
export type WizardProgressV1 = Parsed<typeof wizardProgressV1>;

export const ITEM_KINDS = [
  "place",
  "activity",
  "transport",
  "meal",
  "hotel",
  "check_in",
  "check_out",
  "flight",
  "train",
  "car_rental",
  "ferry",
  "free_time",
  "custom",
] as const;
export const BOOKING_STATUSES = [
  "not_required",
  "unknown",
  "needs_booking",
  "pending",
  "confirmed",
  "cancelled",
  "failed",
] as const;
export const LOCK_LEVELS = [
  "none",
  "soft",
  "user_lock",
  "booking_lock",
  "payment_lock",
  "system_hard_lock",
] as const;
export const ASSESSMENTS = [
  "unknown",
  "ok",
  "info",
  "warning",
  "critical",
] as const;

const schedule = refine(
  object({
    start: instant,
    end: instant,
    startTimezone: timeZone,
    endTimezone: timeZone,
  }),
  (value, path) => {
    if (Date.parse(value.end) <= Date.parse(value.start))
      invalid(path, "INVALID_TIME_RANGE");
    // Instants carry an explicit offset; validate it against the named IANA zone.
    for (const [at, zone] of [
      [value.start, value.startTimezone],
      [value.end, value.endTimezone],
    ]) {
      const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: zone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
      }).formatToParts(new Date(at));
      const get = (type: Intl.DateTimeFormatPartTypes) =>
        parts.find((part) => part.type === type)?.value;
      const local = `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
      if (local !== at.slice(0, 19)) invalid(path, "TIMEZONE_OFFSET_MISMATCH");
    }
  },
);
const item = refine(
  object({
    id,
    kind: code,
    title: text(),
    place: nullable(place),
    schedule: nullable(schedule),
    lockLevel: code,
    assessment: code,
    booking: object({
      status: code,
      referenceId: nullable(id),
      verifiedAt: nullable(instant),
    }),
  }),
  (value, path) => {
    if (
      value.booking.status === "confirmed" &&
      (!value.booking.referenceId || !value.booking.verifiedAt)
    )
      invalid(path, "MISSING_BOOKING_EVIDENCE");
  },
);
const day = refine(
  object({
    id,
    dayNumber: integer(1, 3660),
    localDate,
    timezone: timeZone,
    items: list(item),
    alternatives: list(item),
  }),
  (value, path) => {
    for (const scheduled of value.items) {
      if (
        scheduled.schedule &&
        (scheduled.schedule.start.slice(0, 10) !== value.localDate ||
          scheduled.schedule.startTimezone !== value.timezone)
      )
        invalid(path, "DAY_SCHEDULE_MISMATCH");
    }
  },
);
const plan = refine(
  object({ id, title: text(), revision: integer(1), days: list(day, 3660) }),
  (value, path) => {
    uniqueIds(value.days, `${path}.days`);
    uniqueIds(
      value.days.flatMap((entry) => [...entry.items, ...entry.alternatives]),
      `${path}.items`,
    );
    if (
      new Set(value.days.map((entry) => entry.dayNumber)).size !==
      value.days.length
    )
      invalid(path, "DUPLICATE_DAY_NUMBER");
    if (value.days.some((entry, index) => entry.dayNumber !== index + 1))
      invalid(path, "INVALID_DAY_ORDER");
    // Dates need not strictly increase: crossing the date line can repeat a date.
  },
);
export const tripPlanSnapshotV1 = refine(
  object({
    contractVersion: version,
    provenance: oneOf(["user", "ai", "import", "fixture"]),
    trip: object({
      id,
      title: text(),
      status: code,
      defaultTimezone: timeZone,
      activePlanId: nullable(id),
      revision: integer(1),
    }),
    updatedAt: instant,
    plans: list(plan, 100),
  }),
  (value, path) => {
    uniqueIds(value.plans, `${path}.plans`);
    uniqueIds(
      value.plans.flatMap((entry) => entry.days),
      `${path}.days`,
    );
    uniqueIds(
      value.plans.flatMap((entry) =>
        entry.days.flatMap((entry) => [...entry.items, ...entry.alternatives]),
      ),
      `${path}.items`,
    );
    if (
      value.trip.activePlanId !== null &&
      !value.plans.some((entry) => entry.id === value.trip.activePlanId)
    )
      invalid(path, "DANGLING_ACTIVE_PLAN");
  },
);
export type TripPlanSnapshotV1 = Parsed<typeof tripPlanSnapshotV1>;
export type PlanItemV1 =
  TripPlanSnapshotV1["plans"][number]["days"][number]["items"][number];

export const parseTripDraftFacts = (input: unknown) =>
  parse(tripDraftFactsV1, input);
export const parseWizardProgress = (input: unknown) =>
  parse(wizardProgressV1, input);
export const parseTripPlanSnapshot = (input: unknown) =>
  parse(tripPlanSnapshotV1, input);

/** Read-side fallback only: unknown never means safe/normal or permission to act. */
export function knownCode<const T extends readonly string[]>(
  value: string,
  known: T,
): T[number] | "unknown" {
  return known.includes(value) ? value : "unknown";
}

export const plannerResumeV1 = object({
  contractVersion: version,
  tripId: id,
  planId: id,
  tripRevision: integer(1),
  planRevision: integer(1),
});
export type PlannerResumeV1 = Parsed<typeof plannerResumeV1>;
export const parsePlannerResume = (input: unknown) =>
  parse(plannerResumeV1, input);

/** Pure Consumer projection example; not wired to B's private Trip Library UI. */
export function summarizeTrip(input: unknown) {
  const result = parseTripPlanSnapshot(input);
  if (!result.ok) return result;
  const snapshot = result.value;
  const active = snapshot.plans.find(
    (entry) => entry.id === snapshot.trip.activePlanId,
  );
  const items = active?.days.flatMap((entry) => entry.items) ?? [];
  return {
    ok: true as const,
    value: {
      id: snapshot.trip.id,
      title: snapshot.trip.title,
      status: knownCode(snapshot.trip.status, [
        "draft",
        "planned",
        "pre_trip",
        "live",
        "completed",
        "archived",
      ]),
      dayCount: active?.days.length ?? 0,
      itemCount: items.length,
      needsAttention: items.filter((entry) => entry.assessment !== "ok").length,
      unconfirmedBookings: items.filter(
        (entry) =>
          !["not_required", "confirmed"].includes(entry.booking.status),
      ).length,
      resume: active
        ? ({
            contractVersion: TRIP_CONTRACT_VERSION,
            tripId: snapshot.trip.id,
            planId: active.id,
            tripRevision: snapshot.trip.revision,
            planRevision: active.revision,
          } satisfies PlannerResumeV1)
        : null,
    },
  };
}
