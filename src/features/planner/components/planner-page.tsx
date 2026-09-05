"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { Button } from "@/components/ui/button";
import {
  initialPlannerSettings,
  plannerMockPlans,
} from "../data/planner-mock-data";
import type { PlannerAction } from "../model/planner-state";
import { makePlannerCatalog } from "../data/planner-catalog";
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
import { PlannerMapShell } from "./planner-map-shell";
import { MapLayerToolbar } from "./map-layer-toolbar";
import { DayRangeSelector } from "./day-range-selector";
import { PlannerRightPanel } from "./planner-right-panel";
import { BottomExecutionPanel } from "./bottom-execution-panel";
import { PlannerOverlay } from "./planner-overlay";
import { PlannerIcon } from "./planner-icon";
import { PlaceDetails } from "./place-details";
import { BookingChecklist } from "./booking-checklist";
import styles from "../planner.module.css";

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
  const [trip, dispatchTrip] = useReducer(tripReducer, undefined, () => {
    const { places, areas } = makePlannerCatalog(plannerMockPlans);
    return makeTripState(
      plannerMockPlans,
      places,
      areas,
      initialPlannerSettings,
    );
  });
  // Compatibility adapter for the established shell controls; no second selection state.
  const state = { ...trip.ui, selectedStopId: trip.ui.selectedTripItemId };
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
  const [layers, setLayers] = useState<StopKind[]>([
    "sight",
    "transport",
    "stay",
    "food",
    "booking",
  ]);
  const [terrain, setTerrain] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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
  const datedPlan = presentationPlan(trip);
  const view = useMemo(() => {
    const next = mapView(trip);
    return {
      ...next,
      places: next.places.filter(
        (p) =>
          p.type === "city" ||
          layers.includes(kindFor(p.type)) ||
          p.tripItemId === trip.ui.selectedTripItemId,
      ),
      areas: next.areas.filter((a) =>
        layers.includes(a.type === "hotelArea" ? "stay" : "food"),
      ),
    };
  }, [trip, layers]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
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
  function selectStop(id: string) {
    dispatch({ type: "stop", id });
  }
  function selectMapFeature(id: string, tripItemId?: string) {
    const feature = view.places.find((p) => p.id === id);
    if (feature?.type === "city") {
      dispatchTrip({ type: "focusDay", day: feature.day! });
      return;
    }
    const item = plan.items.find((i) => i.id === tripItemId);
    dispatchTrip({
      type: "inspect",
      id: item?.placeId ?? id,
      level: view.areas.some((a) => a.id === id) ? "area" : "quick",
      day: feature?.day,
    });
  }
  const rightContent = (
    <PlannerRightPanel
      plans={trip.plans.map((p) => presentationPlan(trip, p))}
      plan={datedPlan}
      state={trip}
      dispatch={dispatchTrip}
      onPlan={(next) => {
        dispatch({ type: "plan", plan: next });
      }}
      moreOpen={state.isMoreSettingsOpen}
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
    />
  );
  const bottomContent = (
    <BottomExecutionPanel
      state={trip}
      dispatch={dispatchTrip}
      onSelect={selectStop}
    />
  );
  return (
    <div className={styles.planner} data-planner>
      <a href="#planner-workspace" className={styles.skipLink}>
        跳到旅行工作区
      </a>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span>
            <PlannerIcon name="map" />
          </span>
          TravelAssist
        </Link>
        <nav className={styles.headerNav} aria-label="Planner 导航">
          <Link href="/start">新旅行</Link>
          <Link href="/planner" aria-current="page">
            AI 行程规划
          </Link>
        </nav>
        <div className={styles.headerTitle}>
          <h1>东京与富士山的三日慢叙</h1>
          <span>示例行程</span>
        </div>
        <Link className={styles.accountLink} href="/personal-center">
          <span>个人中心</span>
          <span className={styles.avatar}>
            <PlannerIcon name="users" />
          </span>
        </Link>
      </header>
      <main
        id="planner-workspace"
        tabIndex={-1}
        className={styles.workspace}
        data-right-collapsed={rightCollapsed}
        data-bottom-collapsed={bottomCollapsed}
      >
        <div className={styles.mapWorkspace}>
          <PlannerMapShell
            state={trip}
            dispatch={dispatchTrip}
            view={view}
            travelHints={Object.fromEntries(
              plan.items
                .filter((item) => item.next)
                .map((item) => [item.id, item.next!]),
            )}
            onSelect={selectMapFeature}
            terrain={terrain}
          />
          <MapLayerToolbar
            collapsed={state.isLayerToolbarCollapsed}
            onCollapse={() =>
              dispatch({
                type: "patch",
                patch: {
                  isLayerToolbarCollapsed: !state.isLayerToolbarCollapsed,
                },
              })
            }
            visible={layers}
            onToggle={(kind) =>
              setLayers((current) =>
                current.includes(kind)
                  ? current.filter((item) => item !== kind)
                  : [...current, kind],
              )
            }
            terrain={terrain}
            onTerrain={() => setTerrain(!terrain)}
          />
          <DayRangeSelector
            state={state}
            totalDays={plan.days.length}
            dispatch={dispatch}
          />
        </div>
        {!rightCollapsed && (
          <aside className={styles.rightSlot} aria-label="旅行设置与方案">
            {rightContent}
          </aside>
        )}
        {!bottomCollapsed && (
          <div className={styles.bottomSlot}>{bottomContent}</div>
        )}
        {rightCollapsed && (
          <Button
            className={styles.openRight}
            variant="secondary"
            size="small"
            aria-haspopup="dialog"
            aria-expanded={state.isRightPanelOverlayOpen}
            onClick={() =>
              dispatch({
                type: "patch",
                patch: { isRightPanelOverlayOpen: true },
              })
            }
          >
            <PlannerIcon name="settings" />
            旅行设置与方案
          </Button>
        )}
        {bottomCollapsed && (
          <Button
            className={styles.openBottom}
            variant="secondary"
            aria-haspopup="dialog"
            aria-expanded={state.isBottomPanelOverlayOpen}
            onClick={() =>
              dispatch({
                type: "patch",
                patch: { isBottomPanelOverlayOpen: true },
              })
            }
          >
            <PlannerIcon name="clock" />
            查看行程安排
          </Button>
        )}
      </main>
      {rightCollapsed && state.isRightPanelOverlayOpen && (
        <PlannerOverlay
          kind="right"
          title="旅行设置与方案"
          onClose={() =>
            dispatch({
              type: "patch",
              patch: {
                isRightPanelOverlayOpen: false,
                isMoreSettingsOpen: false,
              },
            })
          }
        >
          {rightContent}
        </PlannerOverlay>
      )}
      {bottomCollapsed && state.isBottomPanelOverlayOpen && (
        <PlannerOverlay
          kind="bottom"
          title="当天安排"
          onClose={() =>
            dispatch({
              type: "patch",
              patch: { isBottomPanelOverlayOpen: false },
            })
          }
        >
          {bottomContent}
        </PlannerOverlay>
      )}
      {trip.ui.inspection?.level === "detail" && (
        <PlaceDetails state={trip} dispatch={dispatchTrip} />
      )}
      {trip.ui.bookingOpen && (
        <BookingChecklist state={trip} dispatch={dispatchTrip} />
      )}
    </div>
  );
}
