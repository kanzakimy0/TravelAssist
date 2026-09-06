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
  DETAIL_DRAFT_STORAGE_KEY,
  detailDaySummary,
  detailMapView,
  detailRailItems,
  detailUrl,
  emptyDetailDraft,
  parseDetailDay,
  parseDetailDraft,
  parseWorkspaceMode,
} from "../model/detail-workspace";
import type {
  DetailDraftItem,
  DetailRailItem,
} from "../model/detail-workspace";
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
import { AddTripItemDialog, TripItemDialog } from "./trip-item-dialog";
import { BookingChecklist } from "./booking-checklist";
import { BottomExecutionPanel } from "./bottom-execution-panel";
import { DayRangeSelector } from "./day-range-selector";
import { DetailExecutionRail } from "./detail-execution-rail";
import { DetailSidebar } from "./detail-sidebar";
import { PlaceDetails } from "./place-details";
import { PlannerRightPanel } from "./planner-right-panel";
import { TripWorkspace } from "./trip-workspace";

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

function clockTime(value: number) {
  const normalized = Math.max(0, Math.min(23 * 60 + 59, value));
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

export function PlannerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = parseWorkspaceMode(searchParams.get("view"));
  const [trip, dispatchTrip] = useReducer(tripReducer, undefined, () => {
    const { places, areas } = makePlannerCatalog(plannerMockPlans);
    return makeTripState(
      plannerMockPlans,
      places,
      areas,
      initialPlannerSettings,
    );
  });
  const [layers, setLayers] = useState<StopKind[]>([
    "sight",
    "transport",
    "stay",
    "food",
    "booking",
  ]);
  const [terrain, setTerrain] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailDraft, setDetailDraft] = useState(emptyDetailDraft);
  const [detailDraftReady, setDetailDraftReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState("本地草稿 · 已自动保存");
  const [checkStatus, setCheckStatus] =
    useState("本地规则检查完成 · 非实时 AI");
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [dialogItemId, setDialogItemId] = useState<string | null>(null);
  const [dialogTrigger, setDialogTrigger] = useState<HTMLElement | null>(null);
  const [addOpen, setAddOpen] = useState(false);
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
  const detailDay = parseDetailDay(searchParams.get("day"), plan.days.length);
  const datedPlan = presentationPlan(trip);

  const railItems = detailRailItems(
    trip,
    detailDay,
    detailDraft.items,
    detailDraft.completedIds,
  );
  const summary = detailDaySummary(trip, detailDay, railItems);
  const selectedDialogItem = railItems.find((item) => item.id === dialogItemId);
  const viewForMode =
    mode === "detail" ? detailMapView(trip, detailDay) : mapView(trip);
  const visibleView = {
    ...viewForMode,
    places: viewForMode.places.filter(
      (place) =>
        place.type === "city" ||
        layers.includes(kindFor(place.type)) ||
        place.tripItemId === trip.ui.selectedTripItemId,
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
    const loadTimer = window.setTimeout(() => {
      setDetailDraft(
        parseDetailDraft(window.localStorage.getItem(DETAIL_DRAFT_STORAGE_KEY)),
      );
      setDetailDraftReady(true);
    }, 0);
    return () => window.clearTimeout(loadTimer);
  }, []);
  useEffect(() => {
    if (!detailDraftReady) return;
    const saveTimer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          DETAIL_DRAFT_STORAGE_KEY,
          JSON.stringify(detailDraft),
        );
        setSaveStatus("本地草稿 · 已自动保存");
      } catch {
        setSaveStatus("本地草稿 · 保存失败");
      }
    }, 450);
    return () => window.clearTimeout(saveTimer);
  }, [detailDraft, detailDraftReady]);
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
    router.push(detailUrl(day), { scroll: false });
  }

  function selectDetailItem(item: DetailRailItem, trigger: HTMLElement) {
    if (!item.draft) dispatchTrip({ type: "select", id: item.id });
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
    setSaveStatus("本地草稿 · 保存中…");
    setDetailDraft(update);
  }

  function applyAdjustment() {
    const target = railItems.find(
      (item) => item.aiStatus !== "normal" && !item.fixed,
    );
    const end = target?.startTime ?? "13:00";
    const [hours, minute] = end.split(":").map(Number);
    const start = clockTime(hours * 60 + minute - 15);
    mutateDetailDraft((current) => ({
      ...current,
      items: [
        ...current.items.filter(
          (item) => item.id !== `detail-adjustment-${detailDay}`,
        ),
        {
          id: `detail-adjustment-${detailDay}`,
          day: detailDay,
          title: "预约前缓冲",
          startTime: start,
          endTime: end,
          type: "task",
          note: "来自 AI 调整预览的本地模拟建议",
        },
      ],
    }));
    setCheckStatus("模拟建议已应用到本地草稿 · 未运行真实 AI");
    setAdjustmentOpen(false);
  }

  const plannerRight = (
    <PlannerRightPanel
      plans={trip.plans.map((candidate) => presentationPlan(trip, candidate))}
      plan={datedPlan}
      state={trip}
      dispatch={dispatchTrip}
      onPlan={(next) => dispatch({ type: "plan", plan: next })}
      moreOpen={plannerUi.isMoreSettingsOpen}
      onMore={(open) =>
        dispatch({ type: "patch", patch: { isMoreSettingsOpen: open } })
      }
      refreshing={refreshing}
      status={refreshing ? "正在刷新示例路线…（Mock 演示）" : trip.notice}
      onReplan={replan}
      pendingCount={pendingItems(plan).length}
      onBooking={() =>
        dispatchTrip({ type: "ui", patch: { bookingOpen: true } })
      }
      onOpenDetail={() =>
        router.push(detailUrl(trip.ui.selectedDay), { scroll: false })
      }
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
      state={trip}
      summary={summary}
      items={railItems}
      onLocate={(id) => dispatchTrip({ type: "select", id })}
      onRecheck={() => {
        setCheckStatus("模拟 AI 检查已更新 · 无实时 Provider 数据");
      }}
      checkStatus={`${checkStatus} · ${saveStatus}`}
      adjustmentOpen={adjustmentOpen}
      onToggleAdjustment={() => setAdjustmentOpen((open) => !open)}
      onApplyAdjustment={applyAdjustment}
    />
  );
  const detailBottom = (
    <DetailExecutionRail
      plan={plan}
      day={detailDay}
      items={railItems}
      selectedId={trip.ui.selectedTripItemId}
      onDay={selectDetailDay}
      onItem={selectDetailItem}
      onAdd={(trigger) => {
        setAddTrigger(trigger);
        setAddOpen(true);
      }}
    />
  );

  return (
    <>
      <TripWorkspace
        mode={mode}
        trip={trip}
        dispatch={dispatchTrip}
        view={visibleView}
        travelHints={Object.fromEntries(
          plan.items
            .filter((item) => item.next)
            .map((item) => [item.id, item.next!]),
        )}
        onSelectMapFeature={selectMapFeature}
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
        bottomCollapsed={bottomCollapsed}
      />

      {mode === "planner" && trip.ui.inspection?.level === "detail" ? (
        <PlaceDetails state={trip} dispatch={dispatchTrip} />
      ) : null}
      {mode === "planner" && trip.ui.bookingOpen ? (
        <BookingChecklist state={trip} dispatch={dispatchTrip} />
      ) : null}
      {mode === "detail" && selectedDialogItem ? (
        <TripItemDialog
          item={selectedDialogItem}
          trigger={dialogTrigger}
          onClose={() => setDialogItemId(null)}
          onSave={(patch) => {
            if (selectedDialogItem.draft) {
              updateDraftItem(selectedDialogItem.id, patch);
            } else {
              dispatchTrip({
                type: "detailEdit",
                id: selectedDialogItem.id,
                ...patch,
              });
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
              completedIds: Array.from(
                new Set([...current.completedIds, selectedDialogItem.id]),
              ),
            }));
            setDialogItemId(null);
          }}
        />
      ) : null}
      {mode === "detail" && addOpen ? (
        <AddTripItemDialog
          day={detailDay}
          trigger={addTrigger}
          onClose={() => setAddOpen(false)}
          onAdd={(item) => {
            mutateDetailDraft((current) => ({
              ...current,
              items: [...current.items, item],
            }));
            setAddOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
