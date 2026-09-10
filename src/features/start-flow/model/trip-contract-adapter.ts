/** Producer adapter only. Opt-in; does not read storage or mutate the active UI. */
import {
  parseTripDraftFacts,
  parseWizardProgress,
} from "@/shared/contracts/trips";
import type { TripDraftFactsV1 } from "@/shared/contracts/trips";
import type { TripWizardDraft } from "./start-flow-draft";

export interface DraftContractContext {
  title: string | null;
  defaultTimezone: string | null;
  currency: string;
  // Caller must confirm the UI amount currency/exponent; legacy fields have no unit.
  minorUnitExponent: number;
  // The persistence owner supplies durable mappings; the adapter never invents IDs.
  resolveDestinationId: (labelOrPrefectureCode: string) => string | null;
  resolveAnchorId: (localId: string) => string;
}

const optionalText = (value: string) => value.trim() || null;
function minorAmount(value: string, exponent: number): number | null {
  if (!value.trim()) return null;
  const matched = /^(\d+)(?:\.(\d+))?$/.exec(value.trim());
  if (!matched || (matched[2]?.length ?? 0) > exponent)
    throw new Error("INVALID_MINOR_AMOUNT");
  const amount = Number(
    `${matched[1]}${(matched[2] ?? "").padEnd(exponent, "0")}`,
  );
  if (!Number.isSafeInteger(amount)) throw new Error("INVALID_MINOR_AMOUNT");
  return amount;
}
type ApproximateDate = NonNullable<
  TripDraftFactsV1["dates"]["plannedDeparture"]
>;
function approximateDate(value: string): ApproximateDate | null {
  if (!value.trim()) return null;
  const month = /^(\d{4})年(\d{1,2})月(上旬|中旬|下旬|整月)$/.exec(value);
  if (month)
    return {
      year: Number(month[1]),
      month: Number(month[2]),
      part: (
        { 上旬: "early", 中旬: "middle", 下旬: "late", 整月: "whole" } as const
      )[month[3] as "上旬" | "中旬" | "下旬" | "整月"],
    };
  const season = /^(\d{4})年(春季|夏季|秋季|冬季)$/.exec(value);
  if (season)
    return {
      year: Number(season[1]),
      month: null,
      part: (
        {
          春季: "spring",
          夏季: "summer",
          秋季: "autumn",
          冬季: "winter",
        } as const
      )[season[2] as "春季" | "夏季" | "秋季" | "冬季"],
    };
  throw new Error("UNSUPPORTED_PLANNED_DATE");
}

export function stepDraftToTripFacts(
  draft: TripWizardDraft,
  context: DraftContractContext,
) {
  try {
    if (
      !Number.isInteger(context.minorUnitExponent) ||
      context.minorUnitExponent < 0 ||
      context.minorUnitExponent > 6
    )
      throw new Error("INVALID_CURRENCY_EXPONENT");
    const needs = draft.travelerDetails;
    const names = [
      ...new Set([
        ...draft.destinations.filter((value) => value !== "更多地区"),
        ...draft.selectedPrefectures,
      ]),
    ];
    const location = (name: string) =>
      name.trim() ? { id: null, name: name.trim(), coordinates: null } : null;
    return parseTripDraftFacts({
      contractVersion: "1.0",
      title: context.title,
      defaultTimezone: context.defaultTimezone,
      destinations: names.map((name) => ({
        id: context.resolveDestinationId(name),
        name,
        coordinates: null,
      })),
      dates: {
        mode: draft.dateMode ?? "undecided",
        departure:
          draft.dateMode === "exact"
            ? optionalText(draft.exactDeparture)
            : null,
        returning:
          draft.dateMode === "exact" ? optionalText(draft.exactReturn) : null,
        plannedDeparture:
          draft.dateMode === "planned"
            ? approximateDate(draft.plannedDeparture)
            : null,
        plannedReturn:
          draft.dateMode === "planned"
            ? approximateDate(draft.plannedReturn)
            : null,
        durationDays: draft.durationDays,
      },
      participants: { ...draft.party },
      participantNeeds: {
        childAgeInput: optionalText(needs.childAge),
        childSeat: needs.childSeat,
        infantAgeInput: optionalText(needs.infantAge),
        stroller: needs.stroller,
        crib: needs.crib,
        seniorWalking: needs.seniorWalking,
        reduceStairs: needs.reduceStairs,
        restFrequency: needs.restFrequency,
      },
      budget: {
        currency: context.currency,
        totalMinor: minorAmount(
          draft.budgetDetails.totalBudget,
          context.minorUnitExponent,
        ),
        perPersonMinor: minorAmount(
          draft.budgetDetails.perPersonBudget,
          context.minorUnitExponent,
        ),
        lodgingPerNightMinor: minorAmount(
          draft.budgetDetails.lodgingPerNight,
          context.minorUnitExponent,
        ),
        diningPerDayMinor: minorAmount(
          draft.budgetDetails.diningPerDay,
          context.minorUnitExponent,
        ),
      },
      constraints: [],
      fixedArrangements: {
        flights: draft.anchors.flights.map((entry) => ({
          id: context.resolveAnchorId(entry.id),
          inputMethod: entry.source,
          departureAirport: optionalText(entry.departureAirport),
          arrivalAirport: optionalText(entry.arrivalAirport),
          date: optionalText(entry.date),
          departureTime: optionalText(entry.departureTime),
          timezone: null,
          flightNumber: optionalText(entry.flightNumber),
        })),
        hotels: draft.anchors.hotels.map((entry) => ({
          id: context.resolveAnchorId(entry.id),
          inputMethod: entry.source,
          name: entry.hotelName,
          city: optionalText(entry.city),
          address: optionalText(entry.address),
          checkIn: optionalText(entry.checkIn),
          checkOut: optionalText(entry.checkOut),
          location: null,
        })),
        activities: draft.anchors.activities.map((entry) => ({
          id: context.resolveAnchorId(entry.id),
          inputMethod: entry.source,
          name: entry.activityName,
          date: optionalText(entry.date),
          time: optionalText(entry.time),
          timezone: null,
          location: location(entry.location),
          fixed: entry.fixed,
          nonCancellable: entry.nonCancellable,
        })),
      },
    });
  } catch (error) {
    const safeCodes = [
      "INVALID_MINOR_AMOUNT",
      "UNSUPPORTED_PLANNED_DATE",
      "INVALID_CURRENCY_EXPONENT",
    ];
    return {
      ok: false as const,
      issue: {
        path: "$",
        code:
          error instanceof Error && safeCodes.includes(error.message)
            ? error.message
            : "ADAPTER_INPUT_INVALID",
      },
    };
  }
}

export function stepProgressToContract(
  currentStep: number,
  generationState: string,
) {
  const phases = ["familiarity", "preferences", "trip_basics"];
  const phase =
    currentStep === 3
      ? generationState === "complete"
        ? "plan_selection"
        : "generating"
      : phases[currentStep];
  // Visited views don't prove a user completed them. Completion is explicit later.
  return parseWizardProgress({
    contractVersion: "1.0",
    phase,
    completedPhases: [],
  });
}
