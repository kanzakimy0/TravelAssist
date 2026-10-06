import { randomUUID } from "node:crypto";
import {
  minimalSnapshotFixture,
  fullSnapshotFixture,
  itemFixture,
} from "../src/shared/contracts/trips/fixtures.ts";

export function snapshotFixture(full = true) {
  const s = full ? fullSnapshotFixture() : minimalSnapshotFixture();
  const ids = new Map();
  const id = (old) => {
    if (!ids.has(old)) ids.set(old, randomUUID());
    return ids.get(old);
  };
  s.trip.id = id(s.trip.id);
  s.trip.activePlanId = s.trip.activePlanId ? id(s.trip.activePlanId) : null;
  s.trip.revision = 1;
  for (const p of s.plans) {
    p.id = id(p.id);
    p.revision = 1;
    for (const d of p.days) {
      d.id = id(d.id);
      for (const i of [...d.items, ...d.alternatives]) i.id = id(i.id);
    }
  }
  return s;
}
export function boundaryFixture() {
  const s = snapshotFixture();
  s.trip.status = "future_status";
  const item = s.plans[0].days[0].items[0];
  item.place = {
    id: "opaque-example-place",
    name: "Synthetic place",
    coordinates: { latitude: 35, longitude: 139 },
  };
  item.kind = "future_kind";
  item.lockLevel = "user_lock";
  item.assessment = "critical";
  item.booking = {
    status: "confirmed",
    referenceId: "synthetic-only-no-booking",
    verifiedAt: "2026-09-08T03:00:00.125+09:00",
  };
  s.plans[0].days[1] = {
    id: randomUUID(),
    dayNumber: 2,
    localDate: "2027-11-07",
    timezone: "America/New_York",
    items: [
      {
        ...itemFixture(),
        id: randomUUID(),
        schedule: {
          start: "2027-11-07T01:30:00.123-04:00",
          end: "2027-11-07T01:30:00.123-05:00",
          startTimezone: "America/New_York",
          endTimezone: "America/New_York",
        },
      },
    ],
    alternatives: [],
  };
  s.plans[0].days[2] = {
    id: randomUUID(),
    dayNumber: 3,
    localDate: "2027-11-07",
    timezone: "Pacific/Honolulu",
    items: [
      {
        ...itemFixture(),
        id: randomUUID(),
        kind: "flight",
        schedule: {
          start: "2027-11-07T10:00:00-10:00",
          end: "2027-11-08T06:00:00+09:00",
          startTimezone: "Pacific/Honolulu",
          endTimezone: "Asia/Tokyo",
        },
      },
    ],
    alternatives: [],
  };
  return s;
}
export function semanticSnapshot(s) {
  const result = structuredClone(s);
  delete result.updatedAt;
  for (const p of result.plans)
    for (const d of p.days)
      for (const i of [...d.items, ...d.alternatives]) {
        if (i.schedule) {
          i.schedule.start = new Date(i.schedule.start).toISOString();
          i.schedule.end = new Date(i.schedule.end).toISOString();
        }
        if (i.booking.verifiedAt)
          i.booking.verifiedAt = new Date(i.booking.verifiedAt).toISOString();
      }
  return result;
}
