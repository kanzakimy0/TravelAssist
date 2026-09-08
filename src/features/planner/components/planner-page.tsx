"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { readPlannerPlanSelection } from "@/features/navigation/main-flow-navigation";

import {
  initialPlannerSettings,
  plannerMockPlans,
} from "../data/planner-mock-data";
import { makePlannerCatalog } from "../data/planner-catalog";
import {
  detailDaySummary,
  detailMapView,
  detailRailItems,
  detailUrl,
  emptyDetailDraft,
  parseDetailDay,
  parseWorkspaceMode,
} from "../model/detail-workspace";
import type {
  DetailDraftItem,
  DetailItemKind,
  DetailRailItem,
} from "../model/detail-workspace";
import { makeConflictTest, withDraftMapPlaces } from "../model/detail-overview";
import { plannerMovementLegs } from "../model/planner-route";
import type { PlannerAction } from "../model/planner-state";
import {
  currentPlan,
  kindFor,
  makeTripState,
  mapView,
  pendingItems,
  presentationPlan,
  tripReducer,
} from "../model/trip-model";
import type { StopKind } from "../model/planner-types";
import type { TripState, TripAction, MealSlot } from "../model/trip-model";
import {
  editScheduleError,
  previewScheduleAdjustment,
} from "../model/schedule-check";
import { useBrowserTrip } from "./use-browser-trip";
import { restoreRecommendation } from "../model/recommendation-actions";
import { PlannerOverlay } from "./planner-overlay";
import localSave from "../browser-trip.module.css";
import projectStyles from "../detail-map-inspector.module.css";
import { AddTripItemDialog, TripItemDialog } from "./trip-item-dialog";
import { BookingChecklist } from "./booking-checklist";
import { BulkBookingProgress } from "./bulk-booking";
import type { BookingReview } from "../model/bulk-booking";
import { BottomExecutionPanel } from "./bottom-execution-panel";
import { DayRangeSelector } from "./day-range-selector";
import { DetailExecutionRail } from "./detail-execution-rail";
import { DetailSidebar } from "./detail-sidebar";
import { DetailReservationPanel } from "./detail-reservation-panel";
import { PlaceDetails } from "./place-details";
import { PlannerRightPanel } from "./planner-right-panel";
import { TripWorkspace } from "./trip-workspace";
import { WorkspaceCapabilities } from "./workspace-capabilities";
import { TripCompletionDialog } from "./trip-completion-dialog";
import { FlightProject } from "./flight-project";
import {
  preparationFor,
  preparationFingerprint,
  type Preparation,
} from "../model/trip-preparation";

function subscribeViewport(callback: () => void) {
  window.addEventListener("resize", callback);
  return () => window.removeEventListener("resize", callback);
}

function viewportSnapshot() {
  return `${window.innerWidth < 1200}:${window.innerHeight < 700 || window.innerWidth < 768}`;
}

function serverViewport() {
  return "false:false";
}

export function PlannerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseWorkspaceMode(searchParams.get("view"));
  const [trip, dispatchTrip] = useReducer(
    (
      state: TripState,
      action: TripAction | { type: "restoreBrowserTrip"; trip: TripState },
    ) =>
      action.type === "restoreBrowserTrip"
        ? action.trip
        : tripReducer(state, action),
    undefined,
    () => {
      const { places, areas } = makePlannerCatalog(plannerMockPlans);
      return makeTripState(
        plannerMockPlans,
        places,
        areas,
        initialPlannerSettings,
      );
    },
  );
  const [layers, setLayers] = useState<StopKind[]>([
    "sight",
    "transport",
    "stay",
    "food",
    "booking",
  ]);
  const [terrain, setTerrain] = useState(true);
  const [detailMinimized, setDetailMinimized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [detailDraft, setDetailDraft] = useState(emptyDetailDraft);
  const [checkStatus, setCheckStatus] =
    useState("本地规则检查完成 · 非实时 AI");
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [dialogItemId, setDialogItemId] = useState<string | null>(null);
  const [draftInspectionId, setDraftInspectionId] = useState<string | null>(
    null,
  );
  const [reservationView, setReservationView] = useState<{
    id: string;
    kind: "booking" | "replace" | "cancel" | "message";
  } | null>(null);
  const [dialogTrigger, setDialogTrigger] = useState<HTMLElement | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [manualPlanAction, setPlanAction] = useState<{
    id: string;
    kind: "save" | "restore";
    draftId?: string;
  } | null>(null);
  const [planOverwrite, setPlanOverwrite] = useState(false);
  const [archiveBeforeSwitch, setArchiveBeforeSwitch] = useState(true);
  const [draftListOpen, setDraftListOpen] = useState(false);
  const [flightOpen, setFlightOpen] = useState<string | null>(null);
  const [addType, setAddType] = useState<DetailItemKind>("attraction");
  const [replacementId, setReplacementId] = useState<string | null>(null);
  const [bulkBooking, setBulkBooking] = useState<
    (BookingReview & { focusRevision: number }) | null
  >(null);
  const showBulkBooking = Boolean(
    bulkBooking &&
    bulkBooking.focusRevision === trip.ui.focusRevision &&
    !draftInspectionId,
  );
  const [addTrigger, setAddTrigger] = useState<HTMLElement | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewport = useSyncExternalStore(
    subscribeViewport,
    viewportSnapshot,
    serverViewport,
  );
  const [rightCollapsed, bottomCollapsed] = viewport
    .split(":")
    .map((value) => value === "true");
  const plan = currentPlan(trip);
  const preparation = preparationFor(detailDraft, plan.id);
  const completionStatus = preparation.completed
    ? preparation.completed.fingerprint ===
      preparationFingerprint(trip, detailDraft, preparation)
      ? "已完成规划 · 可继续修改"
      : "规划有更新 · 待重新检查"
    : "尚未完成规划";
  function updatePreparation(p: Preparation) {
    setDetailDraft((current) => ({
      ...current,
      preparations: { ...current.preparations, [plan.id]: p },
    }));
  }
  function openFlight(id = "new") {
    resetProjectSelection();
    setFlightOpen(id);
    dispatchTrip({
      type: "ui",
      patch: {
        inspection: null,
        selectedTripItemId: null,
        isRightPanelOverlayOpen: false,
        isBottomPanelOverlayOpen: false,
      },
    });
  }
  const detailDay = parseDetailDay(searchParams.get("day"), plan.days.length);
  const detailOverview =
    mode === "detail" && searchParams.get("scope") === "overview";
  const browserTrip = useBrowserTrip({
    trip,
    draft: detailDraft,
    mode,
    day: detailDay,
    restore: (restored) =>
      dispatchTrip({ type: "restoreBrowserTrip", trip: restored }),
    setDraft: setDetailDraft,
    onLeave: () =>
      dispatchTrip({
        type: "ui",
        patch: {
          isBottomPanelOverlayOpen: false,
          isRightPanelOverlayOpen: false,
        },
      }),
  });
  const datedPlan = presentationPlan(trip);
  const pendingEntry =
    browserTrip.entryPlanId ??
    (mode === "detail" && browserTrip.ready && !trip.workingPlanId
      ? trip.ui.currentPlanId
      : null);
  const planAction =
    manualPlanAction ??
    (pendingEntry
      ? { id: pendingEntry, kind: "save" as const, draftId: undefined }
      : null);
  const switchingPlan = Boolean(
    planAction?.kind === "save" &&
    trip.workingPlanId &&
    (trip.workingPlanId !== planAction.id || planAction.draftId),
  );
  function closePlanAction() {
    setPlanAction(null);
    browserTrip.cancelEntry();
    setPlanOverwrite(false);
    setArchiveBeforeSwitch(true);
  }

  const railItems = detailRailItems(
    trip,
    detailDay,
    detailDraft.items,
    detailDraft.completedIds,
  );
  const summary = detailDaySummary(trip, detailDay, railItems);
  const overviewDays = plan.days.map((day) => {
    const items = detailRailItems(
      trip,
      day.day,
      detailDraft.items,
      detailDraft.completedIds,
    );
    return { summary: detailDaySummary(trip, day.day, items), items };
  });
  const allRailItems = [
    ...new Map(
      overviewDays.flatMap((day) => day.items).map((item) => [item.id, item]),
    ).values(),
  ];
  const adjustment = previewScheduleAdjustment(railItems);
  const selectedDialogItem = allRailItems.find(
    (item) => item.id === dialogItemId,
  );
  const managedItem = allRailItems.find(
    (item) => item.id === reservationView?.id,
  );
  const baseView = detailOverview
    ? mapView({ ...trip, ui: { ...trip.ui, rangeMode: "all" } })
    : mode === "detail"
      ? detailMapView(trip, detailDay)
      : mapView(trip);
  const viewForMode =
    mode === "detail"
      ? withDraftMapPlaces(
          baseView,
          detailDraft.items.filter(
            (item) => detailOverview || item.day === detailDay,
          ),
          draftInspectionId,
        )
      : baseView;
  const visibleView = {
    ...viewForMode,
    places: viewForMode.places.filter(
      (place) =>
        place.type === "city" ||
        layers.includes(kindFor(place.type)) ||
        place.tripItemId === viewForMode.selectedTripItemId,
    ),
    areas: viewForMode.areas.filter((area) =>
      layers.includes(area.type === "hotelArea" ? "stay" : "food"),
    ),
  };

  // Compatibility adapter for the established planner controls; no second store.
  const plannerUi = {
    ...trip.ui,
    selectedStopId: trip.ui.selectedTripItemId,
  };
  function dispatch(action: PlannerAction) {
    if (action.type === "range") dispatchTrip(action);
    else if (action.type === "plan")
      dispatchTrip({ type: "plan", id: action.plan.id });
    else if (action.type === "stop")
      dispatchTrip({ type: "select", id: action.id });
    else {
      const { selectedStopId, ...patch } = action.patch;
      dispatchTrip({
        type: "ui",
        patch: {
          ...patch,
          ...(selectedStopId !== undefined
            ? { selectedTripItemId: selectedStopId }
            : {}),
        },
      });
    }
  }

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    const selectedPlanId = readPlannerPlanSelection();
    if (selectedPlanId) dispatchTrip({ type: "plan", id: selectedPlanId });
  }, []);
  useEffect(() => {
    if (mode !== "detail") return;
    if (trip.ui.rangeMode !== "day" || trip.ui.selectedDay !== detailDay) {
      dispatchTrip({ type: "range", mode: "day", start: detailDay });
    }
  }, [detailDay, mode, trip.ui.rangeMode, trip.ui.selectedDay]);
  useEffect(() => {
    if (mode !== "detail") return;
    const focusTimer = window.setTimeout(() => {
      document
        .querySelector<HTMLElement>("[data-detail-heading]")
        ?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(focusTimer);
  }, [detailDay, mode]);
  useEffect(() => {
    let previous = viewportSnapshot();
    function onResize() {
      const next = viewportSnapshot();
      if (next !== previous) {
        dispatchTrip({
          type: "ui",
          patch: {
            isMoreSettingsOpen: false,
            isRightPanelOverlayOpen: false,
            isBottomPanelOverlayOpen: false,
          },
        });
        previous = next;
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function replan() {
    setRefreshing(true);
    timer.current = setTimeout(() => {
      setRefreshing(false);
      dispatchTrip({ type: "replan" });
    }, 900);
  }

  function selectMapFeature(id: string, tripItemId?: string) {
    resetProjectSelection();
    const draft = allRailItems.find(
      (item) => item.draft && item.id === (tripItemId ?? id),
    );
    if (mode === "detail" && draft) {
      openProject(draft);
      return;
    }
    const feature = visibleView.places.find((place) => place.id === id);
    if (feature?.type === "city") {
      dispatchTrip({ type: "focusDay", day: feature.day! });
      return;
    }
    const item = plan.items.find((candidate) => candidate.id === tripItemId);
    if (mode === "detail" && item) {
      dispatchTrip({ type: "select", id: item.id });
      return;
    }
    dispatchTrip({
      type: "inspect",
      id: item?.placeId ?? id,
      level: visibleView.areas.some((area) => area.id === id)
        ? "area"
        : "quick",
      day: feature?.day,
    });
  }

  function selectDetailDay(day: number) {
    resetProjectSelection();
    dispatchTrip({
      type: "ui",
      patch: { selectedTripItemId: null, inspection: null },
    });
    router.push(detailUrl(day), { scroll: false });
  }

  function resetProjectSelection() {
    setFlightOpen(null);
    setAddOpen(false);
    setDraftInspectionId(null);
    setDialogItemId(null);
    setBulkBooking(null);
    setReservationView(null);
    setReplacementId(null);
  }
  function openProject(item: DetailRailItem, focus?: "advice" | "booking") {
    resetProjectSelection();
    if (item.draft) {
      setDraftInspectionId(item.id);
      dispatchTrip({
        type: "ui",
        patch: { selectedTripItemId: null, inspection: null },
      });
    } else dispatchTrip({ type: "select", id: item.id });
    dispatchTrip({
      type: "ui",
      patch: {
        isBottomPanelOverlayOpen: false,
        isRightPanelOverlayOpen: false,
        detailFocus: focus,
      },
    });
  }
  function openAddProject(
    type: DetailItemKind = "attraction",
    trigger: HTMLElement | null = null,
  ) {
    resetProjectSelection();
    setAddType(type);
    setAddTrigger(trigger);
    setAddOpen(true);
    dispatchTrip({
      type: "ui",
      patch: {
        selectedTripItemId: null,
        inspection: null,
        isBottomPanelOverlayOpen: false,
        isRightPanelOverlayOpen: false,
      },
    });
  }
  function openMissing(
    day: number,
    kind: "hotel" | "restaurant",
    mealSlot?: MealSlot,
  ) {
    resetProjectSelection();
    const area = trip.areas.find(
      (area) =>
        area.day === day &&
        area.type === (kind === "hotel" ? "hotelArea" : "foodArea"),
    );
    if (detailDay !== day)
      router.push(
        `${detailUrl(day)}${detailOverview ? "&scope=overview" : ""}`,
        { scroll: false },
      );
    if (area)
      dispatchTrip({ type: "inspect", id: area.id, level: "area", day });
    else openAddProject(kind);
    dispatchTrip({
      type: "ui",
      patch: {
        mealSlot,
        isBottomPanelOverlayOpen: false,
        isRightPanelOverlayOpen: false,
      },
    });
  }

  function selectDetailItem(item: DetailRailItem, trigger: HTMLElement) {
    openProject(item);
    setDialogTrigger(trigger);
    setDialogItemId(item.id);
  }

  function updateDraftItem(
    id: string,
    patch: Pick<DetailDraftItem, "title" | "startTime" | "endTime">,
  ) {
    mutateDetailDraft((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === id ? { ...item, ...patch } : item,
      ),
    }));
  }

  function mutateDetailDraft(
    update: (
      current: ReturnType<typeof emptyDetailDraft>,
    ) => ReturnType<typeof emptyDetailDraft>,
  ) {
    setDetailDraft(update);
  }

  function applyAdjustment() {
    const preview = previewScheduleAdjustment(railItems);
    if (preview.blockers.length || !preview.changes.length) return;
    const canonicalChanges = preview.changes.filter(
      (change) => !railItems.find((i) => i.id === change.id)?.draft,
    );
    const action: TripAction = {
      type: "detailBatchEdit",
      changes: canonicalChanges,
    };
    const checked = canonicalChanges.length ? tripReducer(trip, action) : trip;
    if (canonicalChanges.length && checked.plans === trip.plans) {
      setCheckStatus(checked.notice);
      return;
    }
    if (canonicalChanges.length) dispatchTrip(action);
    mutateDetailDraft((current) => ({
      ...current,
      items: current.items.map((item) => {
        const change = preview.changes.find((c) => c.id === item.id);
        return change
          ? { ...item, startTime: change.startTime, endTime: change.endTime }
          : item;
      }),
    }));
    setCheckStatus(
      `已调整 ${preview.changes.length} 项时间并保留固定预约 · 本地规则，未保存`,
    );
    setAdjustmentOpen(false);
  }

  const plannerRight = (
    <PlannerRightPanel
      onSavePlan={(id) => {
        setPlanOverwrite(false);
        setArchiveBeforeSwitch(true);
        browserTrip.requestPlan(id);
      }}
      onRestorePlan={(id) => setPlanAction({ id, kind: "restore" })}
      plans={trip.plans.map((candidate) => presentationPlan(trip, candidate))}
      plan={datedPlan}
      state={trip}
      dispatch={dispatchTrip}
      onPlan={(next) =>
        trip.workingPlanId && trip.workingPlanId !== next.id
          ? browserTrip.requestPlan(next.id)
          : dispatch({ type: "plan", plan: next })
      }
      moreOpen={plannerUi.isMoreSettingsOpen}
      onMore={(open) =>
        dispatch({ type: "patch", patch: { isMoreSettingsOpen: open } })
      }
      refreshing={refreshing}
      status={refreshing ? "正在刷新示例路线…（Mock 演示）" : trip.notice}
      onReplan={replan}
      pendingCount={pendingItems(plan).length}
      onBooking={browserTrip.enterDetail}
      onOpenDetail={browserTrip.enterDetail}
      detailReady={browserTrip.ready}
    />
  );
  const plannerBottom = (
    <BottomExecutionPanel
      state={trip}
      dispatch={dispatchTrip}
      onSelect={(id) => dispatch({ type: "stop", id })}
    />
  );
  const detailRight = (
    <DetailSidebar
      preparation={preparation}
      onFlight={openFlight}
      onNoFlight={(value) =>
        updatePreparation({ ...preparation, noFlight: value })
      }
      onComplete={() => setCompletionOpen(true)}
      completionStatus={completionStatus}
      state={trip}
      summary={summary}
      items={railItems}
      overviewDays={detailOverview ? overviewDays : undefined}
      onOverviewDay={(day) =>
        router.push(`${detailUrl(day)}&scope=overview`, { scroll: false })
      }
      onMissing={(type) => openAddProject(type)}
      onLocate={(id) => {
        const item = allRailItems.find((item) => item.id === id);
        if (item) openProject(item);
      }}
      onManageItem={(id, kind) => setReservationView({ id, kind })}
      onQueueItem={(id) => dispatchTrip({ type: "queueReservation", id })}
      onRecheck={() => {
        const checked = detailRailItems(
          trip,
          detailDay,
          detailDraft.items,
          detailDraft.completedIds,
        );
        setCheckStatus(
          `已复检 ${checked.length} 项：${checked.filter((i) => i.aiStatus === "error").length} 项有问题、${checked.filter((i) => i.aiStatus === "warning").length} 项需确认 · 本地规则`,
        );
      }}
      adjustment={adjustment}
      checkStatus={`${checkStatus} · ${browserTrip.status}`}
      adjustmentOpen={adjustmentOpen}
      onToggleAdjustment={() => setAdjustmentOpen((open) => !open)}
      onApplyAdjustment={applyAdjustment}
      onBulkBooking={(review) => {
        resetProjectSelection();
        setBulkBooking({ ...review, focusRevision: trip.ui.focusRevision });
        dispatchTrip({
          type: "ui",
          patch: {
            inspection: null,
            selectedTripItemId: null,
            isRightPanelOverlayOpen: false,
            isBottomPanelOverlayOpen: false,
          },
        });
      }}
      bookingBusy={showBulkBooking}
      onArea={(id, mealSlot) => {
        resetProjectSelection();
        dispatchTrip({ type: "inspect", id, level: "area" });
        dispatchTrip({
          type: "ui",
          patch: { isRightPanelOverlayOpen: false, mealSlot },
        });
      }}
    />
  );
  const detailActions = (
    <section
      className={localSave.detailActions}
      aria-label="浏览器行程保存"
      data-browser-trip-actions
    >
      <button
        type="button"
        disabled={!browserTrip.ready}
        onClick={() => browserTrip.requestLeave()}
      >
        ← 返回推荐及增删项目
      </button>
      <button
        type="button"
        className={localSave.primary}
        disabled={!browserTrip.ready}
        onClick={() => browserTrip.save()}
      >
        保存行程
      </button>
      <small
        role="status"
        title={`${browserTrip.status} · 浏览器仅保存一份，新方案保存前会确认是否替换旧方案`}
        className={browserTrip.error ? localSave.error : undefined}
      >
        {browserTrip.status} · 仅保留一份
      </small>
    </section>
  );
  const detailBottom = (
    <DetailExecutionRail
      state={trip}
      dispatch={dispatchTrip}
      draft={detailDraft}
      onDraft={(patch) =>
        mutateDetailDraft((current) => ({ ...current, ...patch }))
      }
      plan={plan}
      day={detailDay}
      overview={detailOverview}
      onOverview={() => {
        resetProjectSelection();
        dispatchTrip({
          type: "ui",
          patch: { inspection: null, selectedTripItemId: null },
        });
        router.push(`${detailUrl(detailDay)}&scope=overview`, {
          scroll: false,
        });
      }}
      items={railItems}
      selectedId={draftInspectionId ?? trip.ui.selectedTripItemId}
      onDay={selectDetailDay}
      onItem={(item, _trigger, focus) => openProject(item, focus)}
      onMissing={openMissing}
      actions={detailActions}
      onMinimize={() => {
        if (!bottomCollapsed) setDetailMinimized(true);
        dispatchTrip({
          type: "ui",
          patch: { isBottomPanelOverlayOpen: false },
        });
      }}
      onAdd={(trigger) => {
        openAddProject("attraction", trigger);
      }}
    />
  );

  const detailEditor =
    mode === "detail" && selectedDialogItem ? (
      <TripItemDialog
        embedded
        key={selectedDialogItem.id}
        item={selectedDialogItem}
        trigger={dialogTrigger}
        onClose={() => setDialogItemId(null)}
        onSave={(patch) => {
          const invalid = editScheduleError(
            { ...selectedDialogItem, ...patch },
            allRailItems.filter((item) => item.day === selectedDialogItem.day),
          );
          if (invalid) return invalid;
          if (selectedDialogItem.draft) {
            updateDraftItem(selectedDialogItem.id, patch);
          } else {
            const action: TripAction = {
              type: "detailEdit",
              id: selectedDialogItem.id,
              ...patch,
            };
            const next = tripReducer(trip, action);
            if (next.plans === trip.plans) return next.notice;
            dispatchTrip(action);
          }
          setCheckStatus("本地轻量检查已运行 · 未调用真实 AI");
        }}
        onLock={() => {
          if (!selectedDialogItem.draft) {
            dispatchTrip({ type: "lock", id: selectedDialogItem.id });
          }
        }}
        onDelete={() => {
          if (selectedDialogItem.draft) {
            mutateDetailDraft((current) => ({
              ...current,
              items: current.items.filter(
                (item) => item.id !== selectedDialogItem.id,
              ),
            }));
          } else {
            dispatchTrip({ type: "remove", id: selectedDialogItem.id });
          }
          setDialogItemId(null);
        }}
        onComplete={() => {
          mutateDetailDraft((current) => ({
            ...current,
            completedIds: current.completedIds.includes(selectedDialogItem.id)
              ? current.completedIds.filter(
                  (id) => id !== selectedDialogItem.id,
                )
              : [...current.completedIds, selectedDialogItem.id],
          }));
          setDialogItemId(null);
        }}
      />
    ) : null;
  return (
    <WorkspaceCapabilities.Provider
      value={{
        canBook: mode === "detail",
        enterDetail: browserTrip.enterDetail,
      }}
    >
      <TripWorkspace
        onAdviceAction={(id, action, trigger) => {
          if (action === "adjust") {
            dispatchTrip({
              type: "ui",
              patch: { isRightPanelOverlayOpen: true },
            });
            setAdjustmentOpen(true);
          } else if (action === "replace") setReplacementId(id);
          else if (action === "later")
            mutateDetailDraft((current) => ({
              ...current,
              railResponses: { ...current.railResponses, [id]: "later" },
            }));
          else {
            const item = allRailItems.find((i) => i.id === id);
            if (item) selectDetailItem(item, trigger);
          }
        }}
        adviceResponses={detailDraft.railResponses}
        bookingProgress={
          mode === "detail" && bulkBooking && showBulkBooking ? (
            <BulkBookingProgress
              key={JSON.stringify(bulkBooking)}
              review={bulkBooking}
              onClose={() => setBulkBooking(null)}
            />
          ) : undefined
        }
        detailItems={allRailItems}
        projectContent={
          mode === "detail" && flightOpen ? (
            <FlightProject
              key={flightOpen}
              flight={preparation.flights.find((f) => f.id === flightOpen)}
              startDate={trip.settings.startDate}
              onClose={() => setFlightOpen(null)}
              onSave={(f) => {
                updatePreparation({
                  ...preparation,
                  noFlight: false,
                  flights: [
                    ...preparation.flights.filter((x) => x.id !== f.id),
                    f,
                  ],
                });
                if (flightOpen === "new") setFlightOpen(f.id);
              }}
              onRemove={() => {
                updatePreparation({
                  ...preparation,
                  flights: preparation.flights.filter(
                    (f) => f.id !== flightOpen,
                  ),
                });
                setFlightOpen(null);
              }}
            />
          ) : mode === "detail" && addOpen ? (
            <aside
              className={projectStyles.inspector}
              data-detail-map-inspector
              aria-label="项目详情框"
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.stopPropagation();
                  setAddOpen(false);
                }
              }}
            >
              <header>
                <div>
                  <small>项目详情框</small>
                  <h2>新增项目</h2>
                  <p>第 {detailDay} 天 · 先填写，再加入行程</p>
                </div>
                <button
                  type="button"
                  aria-label="关闭项目详情框"
                  onClick={() => setAddOpen(false)}
                >
                  ×
                </button>
              </header>
              <div className={projectStyles.editor}>
                <AddTripItemDialog
                  key={`${detailDay}-${addType}`}
                  embedded
                  places={trip.places.filter((p) => !p.planningPlaceholder)}
                  initialType={addType}
                  onConflictTest={() => {
                    const test = makeConflictTest(
                      railItems,
                      detailDay,
                      `detail-draft-test-${crypto.randomUUID()}`,
                    );
                    if (!test) {
                      setCheckStatus(
                        "当天没有可重叠的项目，请先添加普通安排。",
                      );
                      return;
                    }
                    mutateDetailDraft((current) => ({
                      ...current,
                      items: [...current.items, test],
                    }));
                    setAddOpen(false);
                    setDraftInspectionId(test.id);
                  }}
                  validate={(item) => editScheduleError(item, railItems)}
                  day={detailDay}
                  trigger={addTrigger}
                  onClose={() => setAddOpen(false)}
                  onAdd={(item) => {
                    mutateDetailDraft((current) => ({
                      ...current,
                      items: [...current.items, item],
                    }));
                    setAddOpen(false);
                    setDraftInspectionId(item.id);
                  }}
                />
              </div>
            </aside>
          ) : undefined
        }
        draftInspection={allRailItems.find(
          (item) => item.draft && item.id === draftInspectionId,
        )}
        onCloseDraftInspection={() => setDraftInspectionId(null)}
        editorItemId={dialogItemId}
        onManageItem={
          mode === "detail"
            ? (id, kind) => setReservationView({ id, kind })
            : undefined
        }
        detailEditor={detailEditor}
        onCloseEditor={() => setDialogItemId(null)}
        mode={mode}
        trip={trip}
        dispatch={dispatchTrip}
        view={visibleView}
        travelHints={Object.fromEntries(
          plan.days
            .flatMap((day) => plannerMovementLegs(plan, day.day))
            .map((leg) => [leg.id, leg.label]),
        )}
        onSelectMapFeature={selectMapFeature}
        onEditDetailItem={(id, trigger) => {
          const item = allRailItems.find((candidate) => candidate.id === id);
          if (item) selectDetailItem(item, trigger);
        }}
        layers={layers}
        onToggleLayer={(kind) =>
          setLayers((current) =>
            current.includes(kind)
              ? current.filter((item) => item !== kind)
              : [...current, kind],
          )
        }
        terrain={terrain}
        onToggleTerrain={() => setTerrain((current) => !current)}
        dayRange={
          mode === "planner" ? (
            <DayRangeSelector
              state={plannerUi}
              totalDays={plan.days.length}
              dispatch={dispatch}
            />
          ) : null
        }
        rightContent={mode === "planner" ? plannerRight : detailRight}
        bottomContent={mode === "planner" ? plannerBottom : detailBottom}
        rightCollapsed={rightCollapsed}
        bottomCollapsed={
          bottomCollapsed || (mode === "detail" && detailMinimized)
        }
        collapsedActions={mode === "detail" ? detailActions : undefined}
        onExpandBottom={
          mode === "detail" && detailMinimized && !bottomCollapsed
            ? () => setDetailMinimized(false)
            : undefined
        }
      />

      {planAction && (
        <PlannerOverlay
          kind="quick"
          title={
            planAction.kind === "restore"
              ? "还原推荐方案？"
              : switchingPlan
                ? "切换工作方案？"
                : "保存方案并进入详情"
          }
          onClose={closePlanAction}
          className={localSave.planConfirmation}
        >
          <div className={localSave.confirm}>
            <p>
              <strong>
                {trip.plans.find((p) => p.id === planAction.id)?.name}
              </strong>
            </p>
            <p>
              {planAction.kind === "restore"
                ? "还原此方案的原始推荐路线、项目时间、备用项目、交通修改及名称。其他方案、个人偏好、独立新增的详情项目与已保存版本不变。此操作不取消真实预约；请确认是否放弃此方案的路线修改。"
                : switchingPlan
                  ? "切换后，原工作方案的未保留修改将被废弃，新方案成为唯一工作中方案。建议先保存为浏览器草稿，可通过草稿列表恢复；不会取消外部预约。"
                  : "将当前工作区明确保存到这个浏览器，再打开所选方案的行程详情，继续核对时间、增补信息和处理预约。不是云端保存，也不代表行程已完成检查。"}
            </p>
            {switchingPlan && (
              <label>
                <input
                  type="checkbox"
                  checked={archiveBeforeSwitch}
                  onChange={(e) => setArchiveBeforeSwitch(e.target.checked)}
                />
                先把原工作方案存为草稿（推荐）
              </label>
            )}
            {planAction.kind === "save" &&
              browserTrip.saved &&
              (switchingPlan ||
                browserTrip.saved.snapshot.currentPlanId !== planAction.id) && (
                <label>
                  <input
                    type="checkbox"
                    checked={planOverwrite}
                    onChange={(e) => setPlanOverwrite(e.target.checked)}
                  />
                  我确认切换工作方案并替换当前保存记录
                </label>
              )}
            {planAction.kind === "save" && browserTrip.error && (
              <p role="alert" className={localSave.error}>
                {browserTrip.error}
              </p>
            )}
            <footer>
              <button type="button" onClick={closePlanAction}>
                取消
              </button>
              <button
                type="button"
                className={localSave.primary}
                disabled={
                  !browserTrip.ready ||
                  (planAction.kind === "save" &&
                    Boolean(
                      browserTrip.saved &&
                      (switchingPlan ||
                        browserTrip.saved.snapshot.currentPlanId !==
                          planAction.id),
                    ) &&
                    !planOverwrite)
                }
                onClick={() => {
                  if (planAction.kind === "restore") {
                    resetProjectSelection();
                    dispatchTrip({
                      type: "restoreBrowserTrip",
                      trip: restoreRecommendation(trip, planAction.id),
                    });
                    setPlanAction(null);
                  } else if (
                    browserTrip.saveRecommendation(
                      planAction.id,
                      planOverwrite,
                      archiveBeforeSwitch,
                      browserTrip.archivedDrafts.find(
                        (d) => d.id === planAction.draftId,
                      ),
                    )
                  )
                    setPlanAction(null);
                }}
              >
                {planAction.kind === "restore"
                  ? "确认还原"
                  : switchingPlan
                    ? archiveBeforeSwitch
                      ? "存为草稿并切换"
                      : "放弃原方案并切换"
                    : "保存到浏览器并进入详情"}
              </button>
            </footer>
          </div>
        </PlannerOverlay>
      )}

      {mode === "detail" && completionOpen && (
        <TripCompletionDialog
          state={trip}
          draft={detailDraft}
          items={allRailItems}
          onClose={() => setCompletionOpen(false)}
          onSave={browserTrip.savePrepared}
          overwriteRequired={Boolean(
            browserTrip.saved &&
            browserTrip.saved.snapshot.currentPlanId !== plan.id,
          )}
          status={browserTrip.status}
          onResolve={(issue, name, p) => {
            updatePreparation(p);
            if (name.trim())
              dispatchTrip({
                type: "restoreBrowserTrip",
                trip: {
                  ...trip,
                  plans: trip.plans.map((x) =>
                    x.id === plan.id ? { ...x, name: name.trim() } : x,
                  ),
                },
              });
            setCompletionOpen(false);
            if (issue.flightId || !issue.itemId) openFlight(issue.flightId);
            else {
              const item = allRailItems.find((i) => i.id === issue.itemId);
              if (item) openProject(item);
            }
          }}
        />
      )}
      {mode === "planner" && browserTrip.saved && (
        <section
          className={localSave.actions}
          aria-label="浏览器行程保存"
          data-browser-trip-actions
        >
          <>
            <button type="button" onClick={browserTrip.openSaved}>
              打开已保存行程
            </button>
            <button type="button" onClick={() => setDraftListOpen(true)}>
              浏览器草稿（{browserTrip.archivedDrafts.length}）
            </button>
            {browserTrip.error && (
              <small role="alert">{browserTrip.error}</small>
            )}
          </>
        </section>
      )}
      {draftListOpen && (
        <PlannerOverlay
          kind="quick"
          title="浏览器草稿"
          className={localSave.planConfirmation}
          onClose={() => setDraftListOpen(false)}
        >
          <div className={localSave.confirm}>
            <p>仅保存在此浏览器；载入草稿也需要确认切换，不会覆盖当前工作。</p>
            {browserTrip.archivedDrafts.length ? (
              browserTrip.archivedDrafts.map((draft) => (
                <p key={draft.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftListOpen(false);
                      setPlanOverwrite(false);
                      setArchiveBeforeSwitch(true);
                      setPlanAction({
                        id: draft.snapshot.currentPlanId,
                        kind: "save",
                        draftId: draft.id,
                      });
                    }}
                  >
                    载入：{draft.name} ·{" "}
                    {new Date(draft.savedAt).toLocaleString()}
                  </button>
                </p>
              ))
            ) : (
              <p>还没有另存的草稿。</p>
            )}
          </div>
        </PlannerOverlay>
      )}
      {browserTrip.destination && (
        <PlannerOverlay
          title="您有尚未保存的行程修改"
          kind="quick"
          onClose={browserTrip.cancelLeave}
        >
          <div className={localSave.confirm}>
            <p>
              放弃将撤销本次未保存修改，不会删除已保存的行程。保存仅保留在当前浏览器，不会同步到其他设备；此浏览器保留一份当前行程，新保存会替换上一份。
            </p>
            {browserTrip.error && (
              <p className={localSave.error} role="alert">
                {browserTrip.error}
              </p>
            )}
            <footer>
              <button type="button" onClick={browserTrip.cancelLeave}>
                继续编辑
              </button>
              <button type="button" onClick={browserTrip.discardAndLeave}>
                放弃修改并返回
              </button>
              <button
                type="button"
                className={localSave.primary}
                onClick={browserTrip.saveAndLeave}
              >
                保存并返回
              </button>
            </footer>
          </div>
        </PlannerOverlay>
      )}
      {browserTrip.overwritePending && (
        <PlannerOverlay
          title="确认替换浏览器中的行程"
          kind="quick"
          onClose={browserTrip.cancelOverwrite}
        >
          <div className={localSave.confirm}>
            <p>
              当前浏览器只保留一份行程。此次保存会以当前方案替换之前保存的方案，旧保存无法撤销；不会影响任何真实订单。
            </p>
            {browserTrip.error && <p role="alert">{browserTrip.error}</p>}
            <footer>
              <button type="button" onClick={browserTrip.cancelOverwrite}>
                取消
              </button>
              <button type="button" onClick={browserTrip.confirmOverwrite}>
                确认替换并保存
              </button>
            </footer>
          </div>
        </PlannerOverlay>
      )}
      {replacementId && (
        <PlannerOverlay
          title="选择替代项目"
          kind="quick"
          onClose={() => setReplacementId(null)}
        >
          <div className={localSave.confirm}>
            <p>
              仅列出同城、同类型的现有示例地点；固定预约不自动替换。替换后请复检时间并保存。
            </p>
            {trip.places
              .filter((place) => {
                const original = plan.items.find((i) => i.id === replacementId);
                const originalPlace = trip.places.find(
                  (p) => p.id === original?.placeId,
                );
                return (
                  original &&
                  !place.planningPlaceholder &&
                  place.id !== original.placeId &&
                  place.city === originalPlace?.city &&
                  place.type === original.type &&
                  !plan.items.some(
                    (i) => i.placeId === place.id && i.day === original.day,
                  )
                );
              })
              .slice(0, 5)
              .map((place) => (
                <button
                  key={place.id}
                  type="button"
                  onClick={() => {
                    const original = plan.items.find(
                      (i) => i.id === replacementId,
                    );
                    if (!original) return;
                    const action: TripAction = {
                      type: "add",
                      placeId: place.id,
                      day: original.day,
                      reservation: false,
                      replaceId: original.id,
                    };
                    const next = tripReducer(trip, action);
                    dispatchTrip(action);
                    if (next.plans !== trip.plans) {
                      setReplacementId(null);
                      setCheckStatus("已替换示例项目，请重新检查并保存。");
                    }
                  }}
                >
                  {place.name} · 建议 {place.duration} 分
                </button>
              ))}
            <small>若没有候选，请取消并通过“新增行程”手动安排。</small>
            <p role="status">{trip.notice}</p>
          </div>
        </PlannerOverlay>
      )}

      {mode !== "detail" && trip.ui.inspection?.level === "detail" ? (
        <PlaceDetails state={trip} dispatch={dispatchTrip} />
      ) : null}
      {mode === "detail" && trip.ui.bookingOpen ? (
        <BookingChecklist state={trip} dispatch={dispatchTrip} />
      ) : null}
      {mode === "detail" && managedItem && reservationView && (
        <DetailReservationPanel
          key={`${managedItem.id}-${reservationView.kind}`}
          item={managedItem}
          kind={reservationView.kind}
          state={trip}
          dispatch={dispatchTrip}
          message={detailDraft.bookingMessages?.[managedItem.id] ?? ""}
          onMessage={(message) =>
            setDetailDraft((current) => ({
              ...current,
              bookingMessages: {
                ...current.bookingMessages,
                [managedItem.id]: message,
              },
            }))
          }
          onReplaced={() =>
            setDetailDraft((current) => ({
              ...current,
              completedIds: current.completedIds.filter(
                (id) => id !== managedItem.id,
              ),
              bookingMessages: Object.fromEntries(
                Object.entries(current.bookingMessages ?? {}).filter(
                  ([id]) => id !== managedItem.id,
                ),
              ),
              railResponses: Object.fromEntries(
                Object.entries(current.railResponses ?? {}).filter(
                  ([id]) => id !== managedItem.id,
                ),
              ),
            }))
          }
          onClose={() => setReservationView(null)}
          onView={(kind) => setReservationView({ id: managedItem.id, kind })}
        />
      )}
    </WorkspaceCapabilities.Provider>
  );
}
