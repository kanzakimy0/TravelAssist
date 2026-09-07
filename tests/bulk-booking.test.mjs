import assert from "node:assert/strict";
import test from "node:test";
import { registerHooks } from "node:module";
registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (error) {
      if (specifier.startsWith(".") && !/\.[a-z]+$/i.test(specifier))
        return nextResolve(specifier + ".ts", context);
      throw error;
    }
  },
});
const { initialPlannerSettings, plannerMockPlans } =
  await import("../src/features/planner/data/planner-mock-data.ts");
const { makePlannerCatalog } =
  await import("../src/features/planner/data/planner-catalog.ts");
const { makeTripState, currentPlan } =
  await import("../src/features/planner/model/trip-model.ts");
const { buildBookingReview } =
  await import("../src/features/planner/model/bulk-booking.ts");
const fixture = () => {
  const { places, areas } = makePlannerCatalog(plannerMockPlans);
  return makeTripState(plannerMockPlans, places, areas, initialPlannerSettings);
};

test("bulk review sorts existing JPY sample offers and leaves state untouched", () => {
  const state = fixture(),
    before = JSON.stringify(state);
  const review = buildBookingReview(state);
  assert.ok(review.rows.length);
  for (const row of review.rows)
    assert.deepEqual(
      row.offers.map((o) => o.price),
      row.offers.map((o) => o.price).sort((a, b) => a - b),
    );
  assert.equal(JSON.stringify(state), before);
  assert.match(review.travelers, /老人/);
});
test("unknown/invalid currencies and prices never become free or comparable offers", () => {
  const state = fixture(),
    row = buildBookingReview(state).rows[0];
  const item = currentPlan(state).items.find((i) => i.id === row.id);
  const place = state.places.find((p) => p.id === item.placeId);
  place.bookingOptions = [
    { providerId: "bad", name: "unknown", currency: "USD", price: 1 },
    { providerId: "negative", currency: "JPY", price: -2 },
    { providerId: "missing", currency: "JPY" },
    { providerId: "nan", currency: "JPY", price: NaN },
  ];
  assert.equal(
    buildBookingReview(state).rows.find((r) => r.id === row.id).offers.length,
    0,
  );
});
test("confirmed and cancelled reservations are excluded from bulk retry", () => {
  const state = fixture();
  currentPlan(state).items.forEach((item, index) => {
    item.reservationRequired = true;
    item.reservationStatus = index % 2 ? "booked" : "cancelled";
  });
  assert.equal(buildBookingReview(state).rows.length, 0);
});
test("zero sample price is preserved and a review snapshot does not follow edits", () => {
  const state = fixture();
  const first = buildBookingReview(state).rows[0];
  const item = currentPlan(state).items.find((i) => i.id === first.id);
  const place = state.places.find((p) => p.id === item.placeId);
  place.bookingOptions = [
    { providerId: "zero", name: "free example", currency: "JPY", price: 0 },
  ];
  const review = buildBookingReview(state);
  item.title = "changed";
  place.bookingOptions[0].price = 999;
  const row = review.rows.find((r) => r.id === first.id);
  assert.equal(row.title, first.title);
  assert.equal(row.offers[0].price, 0);
});
