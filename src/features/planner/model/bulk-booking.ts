import { currentPlan, type TripState } from "./trip-model";

export type BookingReviewRow = {
  id: string;
  title: string;
  date: string;
  time: string;
  type: string;
  nights: number;
  selectedProviderId?: string;
  offers: { providerId: string; name: string; price: number; terms: string }[];
};
export type BookingReview = {
  day?: number;
  planId: string;
  planName: string;
  travelers: string;
  rows: BookingReviewRow[];
};

/** Unselected rows use the cheapest comparable fixture, never a live-price claim. */
export function selectedBookingOffer(row: BookingReviewRow) {
  return (
    row.offers.find((offer) => offer.providerId === row.selectedProviderId) ??
    [...row.offers].sort(
      (a, b) => a.price - b.price || a.providerId.localeCompare(b.providerId),
    )[0]
  );
}
export function selectBookingProviders(
  review: BookingReview,
  choices: Record<string, string>,
): BookingReview {
  return {
    ...review,
    rows: review.rows.map((row) => {
      const offer = selectedBookingOffer({
        ...row,
        selectedProviderId: choices[row.id],
      });
      return {
        ...row,
        ...(offer ? { selectedProviderId: offer.providerId } : {}),
      };
    }),
  };
}

// These are existing catalog fixtures, never live offers or a bookable quote.
// No reducer writes, network requests, checkout URLs, or payment side effects.
export function buildBookingReview(
  state: TripState,
  day?: number,
): BookingReview {
  const plan = currentPlan(state);
  const people = state.configuration.travelers;
  return {
    ...(day === undefined ? {} : { day }),
    planId: plan.id,
    planName: plan.name,
    travelers: `${people.adultMale + people.adultFemale} 成人 · ${people.seniors ?? 0} 老人 · ${people.child} 儿童 · ${people.infant} 婴儿`,
    rows: plan.items
      .filter(
        (item) =>
          (day === undefined || (item.day <= day && item.endDay >= day)) &&
          item.reservationRequired &&
          ["pending", "booking", "failed", "changed"].includes(
            item.reservationStatus,
          ),
      )
      .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime))
      .map((item) => ({
        id: item.id,
        title: item.title,
        date: item.date,
        time: item.startTime,
        type: item.type,
        nights: item.type === "hotel" ? item.endDay - item.day + 1 : 0,
        offers: (
          state.places.find((place) => place.id === item.placeId)
            ?.bookingOptions ?? []
        )
          .filter(
            (offer) =>
              offer.currency === "JPY" &&
              Number.isFinite(offer.price) &&
              offer.price! >= 0,
          )
          .map((offer) => ({
            providerId: offer.providerId,
            name: offer.name,
            price: offer.price!,
            terms: offer.cancellationSummary ?? "取消条款待确认",
          }))
          .sort(
            (a, b) =>
              a.price - b.price || a.providerId.localeCompare(b.providerId),
          ),
      })),
  };
}
