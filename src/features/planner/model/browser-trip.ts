import type { DetailDraftState } from "./detail-workspace";
import { validDetailLocation } from "./detail-workspace";
import { validMovementEdit, movementKey } from "./planner-route";
import { routineSlots, validDraftClock } from "./planner-timeline";
import { validPreparations } from "./trip-preparation";
import type { TripConfiguration, TripState } from "./trip-model";

export const SAVED_TRIP_KEY = "travelassist.saved-workspace.v1";

// Browser-only MVP: one explicitly saved workspace, not cloud storage or orders.
export type TripSnapshot = Pick<
  TripState,
  "plans" | "settings" | "configuration" | "pendingSettingsBaseline"
> & {
  currentPlanId: string;
  draft: DetailDraftState;
};
export type SavedTrip = { version: 1; savedAt: string; snapshot: TripSnapshot };

export function tripSnapshot(
  trip: TripState,
  draft: DetailDraftState,
): TripSnapshot {
  return structuredClone({
    plans: trip.plans,
    settings: trip.settings,
    configuration: trip.configuration,
    ...(trip.pendingSettingsBaseline
      ? { pendingSettingsBaseline: trip.pendingSettingsBaseline }
      : {}),
    currentPlanId: trip.ui.currentPlanId,
    draft,
  });
}

export function restoreTrip(
  trip: TripState,
  snapshot: TripSnapshot,
): TripState {
  return {
    ...trip,
    plans: structuredClone(snapshot.plans),
    settings: structuredClone(snapshot.settings),
    configuration: structuredClone(snapshot.configuration),
    pendingSettingsBaseline: structuredClone(snapshot.pendingSettingsBaseline),
    ui: {
      ...trip.ui,
      currentPlanId: snapshot.currentPlanId,
      selectedTripItemId: null,
      inspection: null,
      bookingOpen: false,
      isMoreSettingsOpen: false,
      isRightPanelOverlayOpen: false,
      isBottomPanelOverlayOpen: false,
    },
    notice: "本地行程已载入 · 未连接云端",
  };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, item]) => [key, canonical(item)]),
    );
  }
  return value;
}
export function sameTrip(a: TripSnapshot, b: TripSnapshot) {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

const record = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string =>
  typeof value === "string" && value.length <= 10000;
const integer = (value: unknown, min: number, max: number) =>
  typeof value === "number" &&
  Number.isInteger(value) &&
  value >= min &&
  value <= max;
const texts = (value: unknown) =>
  Array.isArray(value) && value.length <= 2000 && value.every(text);
const date = (value: unknown) =>
  text(value) &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value;
const time = (value: unknown) =>
  text(value) && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

// Validate the JSON boundary before any data reaches the renderer/reducer.
function shape(value: unknown, template: unknown): boolean {
  if (Array.isArray(template))
    return (
      Array.isArray(value) &&
      value.length <= 2000 &&
      value.every((item) =>
        template.length ? shape(item, template[0]) : text(item),
      )
    );
  if (record(template))
    return (
      record(value) &&
      Object.entries(template).every(([key, item]) => shape(value[key], item))
    );
  return (
    typeof value === typeof template &&
    (typeof value !== "number" || Number.isFinite(value))
  );
}
function configuration(value: unknown): value is TripConfiguration {
  return (
    record(value) &&
    record(value.travelers) &&
    (value.movementAdvice === undefined ||
      (record(value.movementAdvice) &&
        Object.values(value.movementAdvice).every((response) =>
          ["accepted", "ignored", "later"].includes(String(response)),
        ))) &&
    (value.travelers.seniors === undefined ||
      integer(value.travelers.seniors, 0, 20)) &&
    ["adultMale", "adultFemale", "child", "infant"].every((key) =>
      integer((value.travelers as Record<string, unknown>)[key], 0, 20),
    ) &&
    date(value.returnDate) &&
    integer(value.budget, 0, 3) &&
    integer(value.pace, 0, 4) &&
    texts(value.alternatives) &&
    record(value.preferences) &&
    Object.values(value.preferences).every(
      (group) =>
        record(group) &&
        texts(group.quick) &&
        record(group.details) &&
        Object.values(group.details).every(text),
    )
  );
}

export function parseSavedTrip(
  raw: string | null,
  seed: TripState,
): SavedTrip | null {
  if (!raw || raw.length > 4000000) return null;
  try {
    const saved: unknown = JSON.parse(raw);
    if (
      !record(saved) ||
      saved.version !== 1 ||
      !text(saved.savedAt) ||
      !Number.isFinite(Date.parse(saved.savedAt)) ||
      !record(saved.snapshot)
    )
      return null;
    const s = saved.snapshot;
    if (
      !Array.isArray(s.plans) ||
      s.plans.length !== seed.plans.length ||
      !text(s.currentPlanId) ||
      !shape(s.settings, seed.settings) ||
      !record(s.settings) ||
      !date(s.settings.startDate) ||
      !configuration(s.configuration) ||
      (s.pendingSettingsBaseline !== undefined &&
        !configuration(s.pendingSettingsBaseline))
    )
      return null;
    const totalDays =
      Math.round(
        (Date.parse(s.configuration.returnDate) -
          Date.parse(s.settings.startDate as string)) /
          86400000,
      ) + 1;
    if (totalDays < 1 || totalDays > 60) return null;
    const ids = new Set<string>();
    for (const plan of s.plans) {
      if (
        !record(plan) ||
        !text(plan.id) ||
        ids.has(plan.id) ||
        !seed.plans.some((p) => p.id === plan.id) ||
        !text(plan.name) ||
        !text(plan.summary) ||
        !Array.isArray(plan.days) ||
        plan.days.length !== totalDays ||
        !Array.isArray(plan.items) ||
        plan.items.length > 2000
      )
        return null;
      ids.add(plan.id);
      if (
        !plan.days.every(
          (day, index) =>
            shape(day, seed.plans[0].days[0]) &&
            record(day) &&
            day.day === index + 1 &&
            Array.isArray(day.coordinates) &&
            day.coordinates.length === 2 &&
            day.coordinates.every(
              (n) => typeof n === "number" && Number.isFinite(n),
            ),
        )
      )
        return null;
      const itemIds = new Set<string>();
      if (
        plan.hotelEndpointsReady !== undefined &&
        typeof plan.hotelEndpointsReady !== "boolean"
      )
        return null;
      if (
        plan.reserveItems !== undefined &&
        (!Array.isArray(plan.reserveItems) || plan.reserveItems.length > 2000)
      )
        return null;
      if (
        plan.movementLegs !== undefined &&
        (!record(plan.movementLegs) ||
          Object.entries(plan.movementLegs).length > 4000 ||
          !Object.entries(plan.movementLegs).every(
            ([key, edit]) =>
              validMovementEdit(edit) &&
              edit.day <= totalDays &&
              key === movementKey(edit.day, edit.fromId, edit.toId),
          ))
      )
        return null;
      for (const item of [
        ...plan.items,
        ...((plan.reserveItems as unknown[] | undefined) ?? []),
      ]) {
        if (
          !record(item) ||
          !text(item.id) ||
          itemIds.has(item.id) ||
          !text(item.title) ||
          !seed.places.some((p) => p.id === item.placeId) ||
          !integer(item.day, 1, totalDays) ||
          !integer(item.endDay, item.day as number, totalDays) ||
          !date(item.date) ||
          !(item.planningDraft === true
            ? validDraftClock(item.startTime)
            : time(item.startTime)) ||
          !(item.planningDraft === true
            ? validDraftClock(item.endTime)
            : time(item.endTime)) ||
          (item.planningSlot !== undefined &&
            !routineSlots.includes(
              item.planningSlot as (typeof routineSlots)[number],
            )) ||
          ![item.planningDraft, item.planningPlaceholder].every(
            (v) => v === undefined || typeof v === "boolean",
          ) ||
          ![
            "attraction",
            "hotel",
            "restaurant",
            "transport",
            "activity",
          ].includes(String(item.type)) ||
          ![
            "not_required",
            "pending",
            "booking",
            "booked",
            "ticketed",
            "pay_on_site",
            "failed",
            "cancelled",
            "changed",
          ].includes(String(item.reservationStatus)) ||
          ![item.locked, item.fixedTime, item.reservationRequired].every(
            (v) => typeof v === "boolean",
          ) ||
          ![item.next, item.providerId, item.reservationId].every(
            (v) => v === undefined || text(v),
          )
        )
          return null;
        itemIds.add(item.id);
      }
    }
    if (
      !ids.has(s.currentPlanId) ||
      !record(s.draft) ||
      s.draft.version !== 1 ||
      !validPreparations(s.draft.preparations) ||
      (s.draft.railResponses !== undefined &&
        (!record(s.draft.railResponses) ||
          !Object.values(s.draft.railResponses).every(
            (value) => value === "later" || value === "acknowledged",
          ))) ||
      (s.draft.bookingMessages !== undefined &&
        (!record(s.draft.bookingMessages) ||
          !Object.values(s.draft.bookingMessages).every(text))) ||
      !texts(s.draft.completedIds) ||
      !Array.isArray(s.draft.items) ||
      s.draft.items.length > 2000
    )
      return null;
    const draftIds = new Set<string>();
    for (const item of s.draft.items) {
      if (
        !record(item) ||
        !text(item.id) ||
        draftIds.has(item.id) ||
        !text(item.title) ||
        !text(item.note) ||
        (item.location !== undefined && !validDetailLocation(item.location)) ||
        !integer(item.day, 1, totalDays) ||
        !time(item.startTime) ||
        !time(item.endTime) ||
        ![
          "attraction",
          "hotel",
          "restaurant",
          "transport",
          "activity",
          "parking",
          "task",
          "custom",
        ].includes(String(item.type))
      )
        return null;
      draftIds.add(item.id);
    }
    // Older browser drafts predate the separate elderly count; preserve them.
    const normalized = saved as SavedTrip;
    normalized.snapshot.configuration.travelers.seniors ??= 0;
    if (normalized.snapshot.pendingSettingsBaseline)
      normalized.snapshot.pendingSettingsBaseline.travelers.seniors ??= 0;
    return normalized;
  } catch {
    return null;
  }
}

export function saveBrowserTrip(
  storage: Pick<Storage, "getItem" | "setItem">,
  snapshot: TripSnapshot,
  expected: string | null,
): SavedTrip {
  // Refuse stale-tab overwrites. Never remove the previous copy on failure.
  if (storage.getItem(SAVED_TRIP_KEY) !== expected)
    throw new Error(
      "另一页面已更新本地行程，请先打开已保存版本再编辑；您的修改仍保留在当前页。",
    );
  const saved: SavedTrip = {
    version: 1,
    savedAt: new Date().toISOString(),
    snapshot: structuredClone(snapshot),
  };
  storage.setItem(SAVED_TRIP_KEY, JSON.stringify(saved));
  return saved;
}
