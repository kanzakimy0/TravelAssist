import {
  fullSnapshotFixture,
  itemFixture,
} from "../../src/shared/contracts/trips/fixtures.ts";
import { minimalRailRouteFixture } from "../../src/shared/contracts/routes/fixtures.ts";
export const time = (day, hour, minute = 0) =>
  `2027-04-${String(day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+09:00`;
export function scenario(duration = 90, days = 1) {
  const snapshot = fullSnapshotFixture();
  snapshot.plans = snapshot.plans.slice(0, 1);
  snapshot.plans[0].days = Array.from({ length: days }, (_, index) => {
    const n = index + 10;
    const item = {
      ...itemFixture(),
      id: "item-" + index,
      booking: { status: "not_required", referenceId: null, verifiedAt: null },
      place: {
        id: "place-" + index,
        name: "合成景点",
        coordinates: { longitude: 135 + index / 100, latitude: 35 },
      },
      schedule: {
        start: time(n, 10),
        end: time(n, 10 + Math.floor(duration / 60), duration % 60),
        startTimezone: "Asia/Tokyo",
        endTimezone: "Asia/Tokyo",
      },
    };
    return {
      id: "day-" + index,
      dayNumber: index + 1,
      localDate: `2027-04-${n}`,
      timezone: "Asia/Tokyo",
      items: [item],
      alternatives: [],
    };
  });
  const context = {
    inputContractVersion: "4.21-evaluation-1",
    evaluationTime: "2027-04-01T00:00:00Z",
    priorLoad: 0,
    access: {
      actorRef: "actor-fixture",
      tripId: snapshot.trip.id,
      planId: "example-plan",
      canRead: true,
      canPropose: true,
    },
    policy: {
      ref: "fixture-policy",
      version: "1",
      ruleSetVersion: "1",
      minimum: "blocking",
      compressed: "warning",
      overload: "blocking",
      requireRoutes: false,
      requireOpeningHours: false,
      minimumFactConfidence: 0.5,
      bufferMinutes: 10,
      model: { ref: "evaluation-duration-context", version: "1" },
      itinerary: {
        maxCarryLoad: 25,
        highLoadThreshold: 15,
        maxConsecutiveHighDays: 2,
        requireRecovery: true,
      },
    },
    profiles: [],
    days: [],
    protectedItemIds: [],
    routes: [],
    openingHours: [],
  };
  for (const day of snapshot.plans[0].days) {
    for (const item of day.items) context.profiles.push(profile(item.id));
    context.days.push({
      dayId: day.id,
      window: {
        start: time(day.dayNumber + 9, 9),
        end: time(day.dayNumber + 9, 18),
      },
      loadLimit: 20,
      recoveryBefore: 12,
      context: {
        slopeFactor: 1,
        stairsFactor: 1,
        environmentFactor: 1,
        mobilityFactor: 1,
      },
      mealRestWindows: [],
    });
  }
  const change = {
    engineContractVersion: "0.1",
    tripContractVersion: "1.0",
    changeSetId: "change-fixture",
    idempotencyKey: "idem-fixture",
    target: { tripId: snapshot.trip.id, planId: "example-plan" },
    baseVersion: { tripRevision: 4, planRevision: 3 },
    source: {
      kind: "user",
      actorRef: "actor-fixture",
      correlationId: null,
      proposalRef: null,
    },
    reason: "可行性评估",
    operations: [],
    factRefs: [],
  };
  return { snapshot, change, context };
}
export function profile(itemId) {
  return {
    itemId,
    ref: "profile-" + itemId,
    version: "1",
    observedAt: "2027-03-01T00:00:00Z",
    expiresAt: "2027-05-01T00:00:00Z",
    minimumMinutes: 60,
    recommendedMinutes: 90,
    visitModeRef: "full-visit",
    walking: 7,
    physical: 5,
    featureSetRef: { ref: "43-dimensional-candidate", version: "candidate-2" },
    matchingScore: 100,
  };
}
export function addItem(s, start = 13, duration = 90) {
  const day = s.snapshot.plans[0].days[0],
    id = "item-extra-" + day.items.length;
  const item = structuredClone(day.items[0]);
  item.id = id;
  item.place.id = "place-" + id;
  item.schedule.start = time(10, start);
  item.schedule.end = time(
    10,
    start + Math.floor(duration / 60),
    duration % 60,
  );
  day.items.push(item);
  s.context.profiles.push(profile(id));
  return item;
}
export function route(s, from, to, travelMinutes = 20, mode = "rail") {
  s.context.policy.requireRoutes = true;
  const response = structuredClone(minimalRailRouteFixture),
    a = response.alternatives[0];
  const departure = from.schedule.end;
  const arrival = new Date(
    Date.parse(departure) + travelMinutes * 60000,
  ).toISOString();
  a.departure = { instant: departure, timezone: "Asia/Tokyo" };
  a.arrival = { instant: arrival, timezone: "Asia/Tokyo" };
  a.durationSeconds = travelMinutes * 60;
  a.fare = null;
  a.legs[0].origin.referenceId = from.place.id;
  a.legs[0].destination.referenceId = to.place.id;
  for (const part of [...a.legs, ...a.segments]) {
    part.departure = a.departure;
    part.arrival = a.arrival;
    part.durationSeconds = a.durationSeconds;
  }
  a.segments[0].mode = mode;
  a.steps[0].mode = mode;
  a.steps[0].durationSeconds = a.durationSeconds;
  response.source.fetchedAt = "2027-03-31T00:00:00Z";
  const fact = {
    factId: "fact-" + from.id + "-" + to.id,
    factKind: "route",
    subjectRef: from.id,
    provider: "fixture",
    observedAt: response.source.fetchedAt,
    expiresAt: "2027-04-02T00:00:00Z",
    confidence: 1,
  };
  const binding = {
    fromItemId: from.id,
    toItemId: to.id,
    fact,
    response,
    alternativeId: a.id,
  };
  s.context.routes.push(binding);
  s.change.factRefs.push(structuredClone(fact));
  return binding;
}
export function opening(s, windows) {
  const item = s.snapshot.plans[0].days[0].items[0];
  const fact = {
    factId: "opening-" + item.id,
    factKind: "opening_hours",
    subjectRef: item.id,
    provider: "fixture",
    observedAt: "2027-03-31T00:00:00Z",
    expiresAt: "2027-04-02T00:00:00Z",
    confidence: 1,
  };
  s.context.policy.requireOpeningHours = true;
  s.context.openingHours.push({ itemId: item.id, fact, windows });
  s.change.factRefs.push(structuredClone(fact));
}
