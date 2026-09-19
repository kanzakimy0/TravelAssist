import type { RouteResponse } from "../../shared/contracts/routes";
import { validateRouteResponse } from "../../shared/contracts/routes/validation";
import type { Parsed, Parser } from "../../shared/contracts/trips/validation";
import {
  boolean,
  instant,
  integer,
  invalid,
  list,
  nullable,
  object,
  oneOf,
  parse,
  refine,
  text,
} from "../../shared/contracts/trips/validation";

export const id = refine(text(160), (v, p) => {
  if (/\s/.test(v)) invalid(p, "INVALID_ID");
});
export const number =
  (max = 1_000_000): Parser<number> =>
  (v, p) => {
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > max)
      invalid(p, "INVALID_NUMBER");
    return v;
  };
const factor = refine(number(10), (v, p) => {
  if (v === 0) invalid(p, "INVALID_CONTEXT_FACTOR");
});
export const reference = object({ ref: id, version: id });
export const factParser = object({
  factId: id,
  factKind: id,
  subjectRef: id,
  provider: id,
  observedAt: instant,
  expiresAt: instant,
  confidence: nullable(number(1)),
});
const interval = refine(object({ start: instant, end: instant }), (v, p) => {
  if (Date.parse(v.end) <= Date.parse(v.start))
    invalid(p, "INVALID_TIME_RANGE");
});
const routeResponse: Parser<RouteResponse> = (v, p) => {
  if (!validateRouteResponse(v).valid) invalid(p, "INVALID_ROUTE_CONTRACT");
  return v as RouteResponse;
};
export const contextParser = object({
  inputContractVersion: oneOf(["4.21-evaluation-1"]),
  evaluationTime: instant,
  priorLoad: nullable(number()),
  access: object({
    actorRef: id,
    tripId: id,
    planId: id,
    canRead: boolean,
    canPropose: boolean,
  }),
  policy: object({
    ref: id,
    version: id,
    ruleSetVersion: oneOf(["1"]),
    minimum: oneOf(["blocking", "confirmation"]),
    compressed: oneOf(["warning", "confirmation"]),
    overload: oneOf(["warning", "confirmation", "blocking"]),
    requireRoutes: boolean,
    requireOpeningHours: boolean,
    minimumFactConfidence: number(1),
    bufferMinutes: number(1440),
    model: nullable(reference),
    itinerary: object({
      maxCarryLoad: number(),
      highLoadThreshold: number(),
      maxConsecutiveHighDays: integer(1, 3660),
      requireRecovery: boolean,
    }),
  }),
  profiles: list(
    object({
      itemId: id,
      ref: id,
      version: id,
      observedAt: instant,
      expiresAt: instant,
      minimumMinutes: nullable(number(10080)),
      recommendedMinutes: nullable(number(10080)),
      visitModeRef: nullable(id),
      walking: nullable(number(9)),
      physical: nullable(number(9)),
      featureSetRef: nullable(reference),
      matchingScore: nullable(number(100)),
    }),
    1000,
  ),
  days: list(
    object({
      dayId: id,
      window: interval,
      loadLimit: number(),
      recoveryBefore: nullable(number()),
      context: nullable(
        object({
          slopeFactor: factor,
          stairsFactor: factor,
          environmentFactor: factor,
          mobilityFactor: factor,
        }),
      ),
      mealRestWindows: list(
        object({
          kind: oneOf(["meal", "rest"]),
          window: interval,
          minimumMinutes: number(1440),
        }),
        20,
      ),
    }),
    3660,
  ),
  protectedItemIds: list(id, 1000),
  routes: list(
    object({
      fromItemId: id,
      toItemId: id,
      fact: factParser,
      response: routeResponse,
      alternativeId: id,
    }),
    1000,
  ),
  openingHours: list(
    object({ itemId: id, fact: factParser, windows: list(interval, 50) }),
    1000,
  ),
});
export type EvaluationContext = Parsed<typeof contextParser>;
export type Profile = EvaluationContext["profiles"][number];
export type DayContext = EvaluationContext["days"][number];
export const parseEvaluationContext = (input: unknown) =>
  parse(contextParser, input);
