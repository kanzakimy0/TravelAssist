import { WorkspaceHeader } from "./workspace-header";
import type { Dispatch, ReactNode } from "react";

import { Button } from "@/components/ui/button";

import type { MapView, TripAction, TripState } from "../model/trip-model";
import type { StopKind } from "../model/planner-types";
import type { TripWorkspaceMode } from "../model/detail-workspace";
import { MapLayerToolbar } from "./map-layer-toolbar";
import { PlannerIcon } from "./planner-icon";
import { PlannerMapShell } from "./planner-map-shell";
import { PlannerOverlay } from "./planner-overlay";
import styles from "../planner.module.css";

interface TripWorkspaceProps {
  mode: TripWorkspaceMode;
  trip: TripState;
  dispatch: Dispatch<TripAction>;
  view: MapView;
  travelHints: Record<string, string>;
  onSelectMapFeature: (id: string, tripItemId?: string) => void;
  layers: StopKind[];
  onToggleLayer: (kind: StopKind) => void;
  terrain: boolean;
  onToggleTerrain: () => void;
  dayRange: ReactNode;
  rightContent: ReactNode;
  bottomContent: ReactNode;
  rightCollapsed: boolean;
  bottomCollapsed: boolean;
}

export function TripWorkspace({
  mode,
  trip,
  dispatch,
  view,
  travelHints,
  onSelectMapFeature,
  layers,
  onToggleLayer,
  terrain,
  onToggleTerrain,
  dayRange,
  rightContent,
  bottomContent,
  rightCollapsed,
  bottomCollapsed,
}: TripWorkspaceProps) {
  const detail = mode === "detail";
  const rightTitle = detail ? "当日执行仪表盘" : "旅行设置与方案";
  const bottomTitle = detail ? "当日执行轨道" : "当天安排";

  return (
    <div className={styles.planner} data-planner data-workspace-mode={mode}>
      <a href="#planner-workspace" className={styles.skipLink}>
        跳到旅行工作区
      </a>
      <WorkspaceHeader />
      <main
        id="planner-workspace"
        tabIndex={-1}
        className={styles.workspace}
        data-right-collapsed={rightCollapsed}
        data-bottom-collapsed={bottomCollapsed}
        data-view={mode}
      >
        <div className={styles.mapWorkspace} data-map-workspace>
          <PlannerMapShell
            state={trip}
            dispatch={dispatch}
            view={view}
            travelHints={travelHints}
            onSelect={onSelectMapFeature}
            terrain={terrain}
          />
          <MapLayerToolbar
            collapsed={trip.ui.isLayerToolbarCollapsed}
            onCollapse={() =>
              dispatch({
                type: "ui",
                patch: {
                  isLayerToolbarCollapsed: !trip.ui.isLayerToolbarCollapsed,
                },
              })
            }
            visible={layers}
            onToggle={onToggleLayer}
            terrain={terrain}
            onTerrain={onToggleTerrain}
          />
          {dayRange}
        </div>
        {!rightCollapsed && (
          <aside className={styles.rightSlot} aria-label={rightTitle}>
            <div className={styles.viewTransition} key={`right-${mode}`}>
              {rightContent}
            </div>
          </aside>
        )}
        {!bottomCollapsed && (
          <div className={styles.bottomSlot}>
            <div className={styles.viewTransition} key={`bottom-${mode}`}>
              {bottomContent}
            </div>
          </div>
        )}
        {rightCollapsed && (
          <Button
            className={styles.openRight}
            variant="secondary"
            size="small"
            aria-haspopup="dialog"
            aria-expanded={trip.ui.isRightPanelOverlayOpen}
            onClick={() =>
              dispatch({
                type: "ui",
                patch: { isRightPanelOverlayOpen: true },
              })
            }
          >
            <PlannerIcon name="settings" />
            {rightTitle}
          </Button>
        )}
        {bottomCollapsed && (
          <Button
            className={styles.openBottom}
            variant="secondary"
            aria-haspopup="dialog"
            aria-expanded={trip.ui.isBottomPanelOverlayOpen}
            onClick={() =>
              dispatch({
                type: "ui",
                patch: { isBottomPanelOverlayOpen: true },
              })
            }
          >
            <PlannerIcon name="clock" />
            {bottomTitle}
          </Button>
        )}
      </main>
      {rightCollapsed && trip.ui.isRightPanelOverlayOpen && (
        <PlannerOverlay
          kind="right"
          title={rightTitle}
          onClose={() =>
            dispatch({
              type: "ui",
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
      {bottomCollapsed && trip.ui.isBottomPanelOverlayOpen && (
        <PlannerOverlay
          kind="bottom"
          title={bottomTitle}
          onClose={() =>
            dispatch({
              type: "ui",
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
