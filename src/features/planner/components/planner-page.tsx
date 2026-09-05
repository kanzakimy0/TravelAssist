"use client";

import Link from "next/link";
import {
  useEffect,
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
import {
  dateForDay,
  initialPlannerState,
  plannerReducer,
  visibleDays,
} from "../model/planner-state";
import type { PlannerSettings, StopKind } from "../model/planner-types";
import { PlannerMapShell } from "./planner-map-shell";
import { MapLayerToolbar } from "./map-layer-toolbar";
import { DayRangeSelector } from "./day-range-selector";
import { PlannerRightPanel } from "./planner-right-panel";
import { BottomExecutionPanel } from "./bottom-execution-panel";
import { PlannerOverlay } from "./planner-overlay";
import { PlannerIcon } from "./planner-icon";
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
  const [state, dispatch] = useReducer(plannerReducer, initialPlannerState);
  const [settings, setSettings] = useState(initialPlannerSettings);
  const [layers, setLayers] = useState<StopKind[]>([
    "sight",
    "transport",
    "stay",
    "food",
    "booking",
  ]);
  const [terrain, setTerrain] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState("本地示例 · 未接入真实路线 / AI");
  const [executionDay, setExecutionDay] = useState(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewport = useSyncExternalStore(
    subscribeViewport,
    viewportSnapshot,
    serverViewport,
  );
  const [rightCollapsed, bottomCollapsed] = viewport
    .split(":")
    .map((value) => value === "true");
  const plan =
    plannerMockPlans.find((item) => item.id === state.currentPlanId) ??
    plannerMockPlans[0];
  const datedPlan = {
    ...plan,
    days: plan.days.map((day) => ({
      ...day,
      date: dateForDay(settings.startDate, day.day),
    })),
  };
  const days = visibleDays(datedPlan.days, state);
  const selectedDay = days.find((day) =>
    day.stops.some((stop) => stop.id === state.selectedStopId),
  )?.day;
  const activeDay =
    selectedDay ??
    (days.some((day) => day.day === executionDay) ? executionDay : days[0].day);
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
        dispatch({
          type: "patch",
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

  function changeSetting(key: keyof PlannerSettings, value: string) {
    setSettings((current) => ({ ...current, [key]: value }));
  }
  function replan() {
    setRefreshing(true);
    setStatus("正在刷新示例路线…（Mock 演示）");
    timer.current = setTimeout(() => {
      setRefreshing(false);
      setStatus(
        `示例路线预览已刷新 · ${settings.travelers} / ${settings.pace}，未进行真实计算`,
      );
    }, 900);
  }
  function selectStop(id: string, fromMap = false) {
    dispatch({ type: "stop", id });
    if (fromMap && bottomCollapsed)
      dispatch({ type: "patch", patch: { isBottomPanelOverlayOpen: true } });
  }
  const rightContent = (
    <PlannerRightPanel
      plans={plannerMockPlans}
      plan={datedPlan}
      settings={settings}
      onChange={changeSetting}
      onPlan={(next) => {
        dispatch({ type: "plan", plan: next });
        setStatus("已切换示例方案 · 地图与底栏同步更新");
      }}
      moreOpen={state.isMoreSettingsOpen}
      onMore={(open) =>
        dispatch({ type: "patch", patch: { isMoreSettingsOpen: open } })
      }
      refreshing={refreshing}
      status={status}
      onReplan={replan}
    />
  );
  const bottomContent = (
    <BottomExecutionPanel
      days={days}
      activeDay={activeDay}
      onDay={(day) => {
        setExecutionDay(day);
        dispatch({ type: "patch", patch: { selectedStopId: null } });
      }}
      tab={state.activeBottomTab}
      onTab={(tab) =>
        dispatch({ type: "patch", patch: { activeBottomTab: tab } })
      }
      selectedStopId={state.selectedStopId}
      onSelect={selectStop}
      planName={plan.name}
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
        <div className={styles.headerTitle}>
          <h1>东京与富士山的三日慢叙</h1>
          <span>PLANNER / 示例预览</span>
        </div>
        <Link className={styles.accountLink} href="/personal-center">
          个人中心 <PlannerIcon name="users" />
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
            days={days}
            selectedStopId={state.selectedStopId}
            onSelectStop={(id) => selectStop(id, true)}
            layers={layers}
            terrain={terrain}
            planName={plan.name}
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
            查看当天安排
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
    </div>
  );
}
