import "server-only";
import {
  parseTripPlanSnapshot,
  type TripPlanSnapshotV1,
} from "../../shared/contracts/trips/index";
import type {
  trips,
  tripPlans,
  tripDays,
  itineraryItems,
} from "../../db/schema/trips";

export type TripRows = {
  trip: typeof trips.$inferSelect;
  plans: (typeof tripPlans.$inferSelect)[];
  days: (typeof tripDays.$inferSelect)[];
  items: (typeof itineraryItems.$inferSelect)[];
};
export type TripErrorCode =
  | "INVALID_CONTRACT"
  | "UUID_REQUIRED"
  | "INITIAL_REVISION_REQUIRED"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "STALE_TRIP"
  | "STALE_PLAN"
  | "INVALID_DB_STATE"
  | "CONSTRAINT_CONFLICT"
  | "DATABASE_FAILURE";
export class TripPersistenceError extends Error {
  readonly code: TripErrorCode;
  constructor(code: TripErrorCode) {
    super(code);
    this.code = code;
  }
}
export function requireUuid(value: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      value,
    )
  )
    throw new TripPersistenceError("UUID_REQUIRED");
  return value;
}
/** Validate first; legacy UI IDs require an explicit durable-ID migration, never an implicit hash. */
export function validatedSnapshot(input: unknown) {
  const parsed = parseTripPlanSnapshot(input);
  if (!parsed.ok) throw new TripPersistenceError("INVALID_CONTRACT");
  const s = parsed.value;
  [
    s.trip.id,
    ...s.plans.flatMap((p) => [
      p.id,
      ...p.days.flatMap((d) => [
        d.id,
        ...d.items.map((i) => i.id),
        ...d.alternatives.map((i) => i.id),
      ]),
    ]),
  ].forEach(requireUuid);
  return s;
}
export function itemToRow(
  item: TripPlanSnapshotV1["plans"][number]["days"][number]["items"][number],
  dayId: string,
  placement: "scheduled" | "alternative",
  position: number,
): typeof itineraryItems.$inferInsert {
  return {
    id: item.id,
    dayId,
    placement,
    position,
    kind: item.kind,
    title: item.title,
    placeReferenceId: item.place?.id ?? null,
    placeName: item.place?.name ?? null,
    latitude: item.place?.coordinates?.latitude ?? null,
    longitude: item.place?.coordinates?.longitude ?? null,
    startAt: item.schedule ? new Date(item.schedule.start) : null,
    endAt: item.schedule ? new Date(item.schedule.end) : null,
    startTimezone: item.schedule?.startTimezone ?? null,
    endTimezone: item.schedule?.endTimezone ?? null,
    lockLevel: item.lockLevel,
    assessment: item.assessment,
    bookingStatus: item.booking.status,
    bookingReferenceId: item.booking.referenceId,
    bookingVerifiedAt: item.booking.verifiedAt
      ? new Date(item.booking.verifiedAt)
      : null,
  };
}
/** PostgreSQL stores instants, not their original textual offset. Reconstruct in the stored IANA zone. */
export function zonedInstant(at: Date, zone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (key: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === key)!.value;
  const local = `${get("year").padStart(4, "0")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}`;
  const offset = Math.round(
    (Date.parse(local + "Z") - Math.floor(at.getTime() / 1000) * 1000) / 60000,
  );
  const sign = offset < 0 ? "-" : "+";
  return `${local}.${String(at.getUTCMilliseconds()).padStart(3, "0")}${sign}${String(Math.floor(Math.abs(offset) / 60)).padStart(2, "0")}:${String(Math.abs(offset) % 60).padStart(2, "0")}`;
}
export function rowsToSnapshot(rows: TripRows): TripPlanSnapshotV1 {
  try {
    const t = rows.trip;
    const result = parseTripPlanSnapshot({
      contractVersion: "1.0",
      provenance: t.provenance,
      trip: {
        id: t.id,
        title: t.title,
        status: t.status,
        defaultTimezone: t.defaultTimezone,
        activePlanId: t.activePlanId,
        revision: t.revision,
      },
      updatedAt: t.updatedAt.toISOString(),
      plans: [...rows.plans]
        .sort((a, b) => a.position - b.position)
        .map((p) => ({
          id: p.id,
          title: p.title,
          revision: p.revision,
          days: rows.days
            .filter((d) => d.planId === p.id)
            .sort((a, b) => a.dayNumber - b.dayNumber)
            .map((d) => {
              const bucket = (placement: string) =>
                rows.items
                  .filter((i) => i.dayId === d.id && i.placement === placement)
                  .sort((a, b) => a.position - b.position)
                  .map((i) => ({
                    id: i.id,
                    kind: i.kind,
                    title: i.title,
                    place:
                      i.placeName === null
                        ? null
                        : {
                            id: i.placeReferenceId,
                            name: i.placeName,
                            coordinates:
                              i.latitude === null || i.longitude === null
                                ? null
                                : {
                                    latitude: i.latitude,
                                    longitude: i.longitude,
                                  },
                          },
                    schedule:
                      i.startAt && i.endAt && i.startTimezone && i.endTimezone
                        ? {
                            start: zonedInstant(i.startAt, i.startTimezone),
                            end: zonedInstant(i.endAt, i.endTimezone),
                            startTimezone: i.startTimezone,
                            endTimezone: i.endTimezone,
                          }
                        : null,
                    lockLevel: i.lockLevel,
                    assessment: i.assessment,
                    booking: {
                      status: i.bookingStatus,
                      referenceId: i.bookingReferenceId,
                      verifiedAt: i.bookingVerifiedAt?.toISOString() ?? null,
                    },
                  }));
              return {
                id: d.id,
                dayNumber: d.dayNumber,
                localDate: d.localDate,
                timezone: d.timezone,
                items: bucket("scheduled"),
                alternatives: bucket("alternative"),
              };
            }),
        })),
    });
    if (!result.ok) throw new Error();
    return result.value;
  } catch {
    throw new TripPersistenceError("INVALID_DB_STATE");
  }
}
