import type { DayContext } from "./context";

/** Evaluation-only model. These units/coefficients are not frozen product scores. */
export type LoadInput = Readonly<{
  walking: number;
  physical: number;
  minutes: number;
  context: NonNullable<DayContext["context"]>;
}>;
export interface LoadModel {
  readonly ref: string;
  readonly version: string;
  readonly unit: string;
  /** Pure, bounded, deterministic; no IO, clock or random access. */
  evaluate(input: LoadInput): number;
}
export const evaluationLoadModel: LoadModel = Object.freeze({
  ref: "evaluation-duration-context",
  version: "1",
  unit: "evaluation-load-v1",
  evaluate: ({ walking, physical, minutes, context }: LoadInput) =>
    Math.round(
      ((walking + physical) / 2) *
        (minutes / 60) *
        context.slopeFactor *
        context.stairsFactor *
        context.environmentFactor *
        context.mobilityFactor *
        1e6,
    ) / 1e6,
});
export const RULES = Object.freeze({
  duration: { ref: "visit-duration", version: "1" },
  physical_load: { ref: "visit-load", version: "1" },
  schedule: { ref: "schedule-feasibility", version: "1" },
  day_capacity: { ref: "day-capacity", version: "1" },
  fatigue: { ref: "day-fatigue", version: "1" },
  itinerary_reasonableness: { ref: "itinerary-recovery", version: "1" },
});
export const SUPPORTED_OPERATIONS = ["UPDATE_TIME", "REORDER_ITEMS"] as const;
