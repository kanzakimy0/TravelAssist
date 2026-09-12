import { randomUUID } from "node:crypto";
import {
  fullDraftFixture,
  progressFixture,
  fullSnapshotFixture,
} from "../src/shared/contracts/trips/fixtures.ts";
import { emptyPreference } from "../src/features/preferences/domain/preference-v1.ts";
export const time = "2026-09-12T00:00:00.000Z";
export const profile = () => ({
  schemaVersion: "1.0",
  mobilityNeeds: [],
  diningNeeds: [],
  activityInterests: [],
});
export const member = () => ({
  sourceCompanionId: randomUUID(),
  displayName: "Synthetic companion",
  planningAgeGroup: "adult",
  travelProfile: profile(),
});
export const party = () => ({
  schemaVersion: "1.0",
  includesOwner: true,
  ageReferenceDate: "2027-04-10",
  members: [],
});
export const patch = (set = {}, unset = []) => ({
  schemaVersion: "1.0",
  set,
  unset,
});
export const preference = (values = {}) => ({ schemaVersion: "1.0", values });
export function record(state = "draft") {
  const plan = state === "draft" ? null : fullSnapshotFixture();
  return {
    id: randomUUID(),
    ownerUserId: randomUUID(),
    creationKey: randomUUID(),
    libraryState: state,
    canonicalTripId: plan?.trip.id ?? null,
    draftFacts: fullDraftFixture(),
    wizardProgress: progressFixture(),
    planSnapshot: plan,
    preferenceSnapshot: emptyPreference(),
    preferenceSourceRevision: 0,
    preferenceOverridePatch: patch(),
    partySnapshot: party(),
    storageRevision: 1,
    frozenAt: state === "history" ? time : null,
    createdAt: time,
    updatedAt: time,
  };
}
export const forbiddenPartyKeys = [
  "birthDate",
  "ageGroupFallback",
  "genderCode",
  "avatarPath",
  "relationshipCode",
  "relationshipLabel",
  "privateNote",
  "diningNote",
  "medicalDiagnosis",
  "medication",
  "religiousReason",
];
export function toRow(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [
      key.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase()),
      val,
    ]),
  );
}
export function fromRow(value) {
  return Object.fromEntries(
    Object.entries(value).map(([key, val]) => [
      key.replace(/_([a-z])/g, (_, c) => c.toUpperCase()),
      val instanceof Date ? val.toISOString() : val,
    ]),
  );
}
// Independent SQL JSONB text size oracle for fixture construction; key order does not affect length.
export function jsonbText(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(jsonbText).join(", ") + "]";
  return (
    "{" +
    Object.entries(value)
      .map(([k, v]) => JSON.stringify(k) + ": " + jsonbText(v))
      .join(", ") +
    "}"
  );
}

/** Canonical synthetic stress plan at an exact JSONB byte size, with 50 days and real items. */
export function planAtBytes(target) {
  const snapshot = record("saved").planSnapshot;
  snapshot.trip.title = "x";
  snapshot.trip.activePlanId = "stress-plan";
  snapshot.plans = [
    {
      id: "stress-plan",
      title: "x",
      revision: 1,
      days: Array.from({ length: 50 }, (_, i) => ({
        id: "stress-day-" + i,
        dayNumber: i + 1,
        localDate: new Date(Date.UTC(2027, 3, 10 + i))
          .toISOString()
          .slice(0, 10),
        timezone: "Asia/Tokyo",
        items: [],
        alternatives: [],
      })),
    },
  ];
  let bytes = Buffer.byteLength(jsonbText(snapshot)),
    n = 0;
  const days = snapshot.plans[0].days;
  while (true) {
    const day = days[Math.floor(n / 1000)];
    if (!day) throw Error("Stress fixture capacity exceeded");
    const item = {
      id: "stress-item-" + String(n).padStart(5, "0"),
      kind: "place",
      title: "x",
      place: null,
      schedule: null,
      lockLevel: "none",
      assessment: "unknown",
      booking: { status: "unknown", referenceId: null, verifiedAt: null },
    };
    const size =
      Buffer.byteLength(jsonbText(item)) + (day.items.length ? 2 : 0);
    if (bytes + size > target) break;
    day.items.push(item);
    bytes += size;
    n++;
  }
  let padding = target - bytes;
  for (const obj of [snapshot.trip, snapshot.plans[0]]) {
    const add = Math.min(199, padding);
    obj.title += "界".repeat(Math.floor(add / 3)) + "x".repeat(add % 3);
    padding -= add;
  }
  if (padding) throw Error("Stress fixture padding exhausted");
  assertSize(snapshot, target);
  return snapshot;
}
function assertSize(value, target) {
  if (Buffer.byteLength(jsonbText(value)) !== target)
    throw Error("Stress byte oracle mismatch");
}
