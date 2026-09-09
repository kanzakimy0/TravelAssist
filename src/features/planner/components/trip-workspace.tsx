import type { Dispatch, ReactNode } from "react";

import { Button } from "@/components/ui/button";

import type { MapView, TripAction, TripState } from "../model/trip-model";
import type { StopKind } from "../model/planner-types";
import type { TripWorkspaceMode } from "../model/detail-workspace";
import type { DetailRailItem } from "../model/detail-workspace";
import { MapLayerToolbar } from "./map-layer-toolbar";
import { PlannerIcon } from "./planner-icon";
import { PlannerMapShell } from "./planner-map-shell";
import { PlannerOverlay } from "./planner-overlay";
import { PlannerHeader } from "./planner-header";
import styles from "../planner.module.css";
import localSave from "../browser-trip.module.css";
import { currentPlan, reservationLabel } from "../model/trip-model";
import { DetailMapInspector } from "./detail-map-inspector";
import { PlaceActions, PlaceDetails } from "./place-details";
import mapDetail from "../detail-map-inspector.module.css";

interface TripWorkspaceProps {
  projectContent?: ReactNode;
  onAdviceAction?: (
    id: string,
    action: "edit" | "adjust" | "later" | "replace",
    trigger: HTMLButtonElement,
  ) => void;
  adviceResponses?: Record<string, "later" | "acknowledged">;
  bookingProgress?: ReactNode;
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
  collapsedActions?: ReactNode;
  onExpandBottom?: () => void;
  onEditDetailItem?: (id: string, trigger: HTMLButtonElement) => void;
  detailEditor?: ReactNode;
  draftInspection?: DetailRailItem;
  detailItems?: DetailRailItem[];
  onCloseDraftInspection?: () => void;
  onCloseEditor?: () => void;
  editorItemId?: string | null;
  onManageItem?: (id: string, kind: "booking" | "replace") => void;
}

export function TripWorkspace({
  projectContent,
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
  collapsedActions,
  onExpandBottom,
  onEditDetailItem,
  detailEditor,
  draftInspection,
  detailItems,
  onCloseDraftInspection,
  onCloseEditor,
  editorItemId,
  onManageItem,
  bookingProgress,
  onAdviceAction,
  adviceResponses,
}: TripWorkspaceProps) {
  const detail = mode === "detail";
  const activeItem = currentPlan(trip).items.find(
    (item) => item.id === trip.ui.selectedTripItemId,
  );
  const selectedItem =
    !trip.ui.inspection || activeItem?.placeId === trip.ui.inspection.id
      ? activeItem
      : currentPlan(trip).items.find(
          (item) =>
            item.placeId === trip.ui.inspection?.id &&
            item.day === trip.ui.focusedDay,
        );
  const selectedArea = detail
    ? trip.areas.find((area) => area.id === trip.ui.inspection?.id)
    : undefined;
  const visibleDraft =
    !selectedItem && !trip.ui.inspection ? draftInspection : undefined;
  const selectedPlace = trip.places.find(
    (place) => place.id === (trip.ui.inspection?.id ?? selectedItem?.placeId),
  );
  const rightTitle = detail ? "当日执行仪表盘" : "旅行设置与方案";
  const judgement = detailItems?.find((item) => item.id === selectedItem?.id);
  const bottomTitle = detail ? "当日执行轨道" : "当天安排";

  return (
    <div className={styles.planner} data-planner data-workspace-mode={mode}>
      <a href="#planner-workspace" className={styles.skipLink}>
        跳到旅行工作区
      </a>
      <PlannerHeader state={trip} dispatch={dispatch} />
      <main
        id="planner-workspace"
        tabIndex={-1}
        className={`${styles.workspace} ${bottomCollapsed && collapsedActions ? localSave.withCollapsedBar : ""}`}
        data-right-collapsed={rightCollapsed}
        data-bottom-collapsed={bottomCollapsed}
        data-view={mode}
      >
        <div className={styles.mapWorkspace} data-map-workspace>
          <div
            className={`${mapDetail.surface} ${projectContent || selectedPlace || visibleDraft || selectedArea ? mapDetail.split : ""}`}
            data-map-surface
            inert={Boolean(bookingProgress)}
          >
            <PlannerMapShell
              state={trip}
              dispatch={dispatch}
              view={view}
              travelHints={travelHints}
              onSelect={onSelectMapFeature}
              terrain={terrain}
              suppressQuickCard={Boolean(
                projectContent || selectedPlace || visibleDraft || selectedArea,
              )}
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
          {bookingProgress}
          {projectContent}
          {!projectContent && (selectedPlace || visibleDraft) && (
            <DetailMapInspector
              key={selectedPlace?.id ?? visibleDraft?.id}
              place={selectedPlace}
              draftItem={!selectedPlace ? visibleDraft : undefined}
              item={selectedItem}
              onEdit={
                detail
                  ? (id, trigger) => {
                      dispatch({
                        type: "ui",
                        patch: { detailFocus: undefined },
                      });
                      onEditDetailItem?.(id, trigger);
                    }
                  : undefined
              }
              focusSection={detail ? trip.ui.detailFocus : undefined}
              focusRevision={trip.ui.focusRevision}
              editor={
                !trip.ui.detailFocus &&
                editorItemId ===
                  (selectedPlace ? selectedItem?.id : visibleDraft?.id)
                  ? detailEditor
                  : undefined
              }
              onCloseEditor={onCloseEditor}
              actions={
                detail && selectedItem && onManageItem ? (
                  <div className={mapDetail.itemActions}>
                    <h3>
                      {trip.ui.detailFocus === "booking"
                        ? "预约安排"
                        : "行程提醒"}
                    </h3>
                    {trip.ui.detailFocus === "booking" && (
                      <p>
                        {reservationLabel(selectedItem)} ·
                        仅本地管理，未发送真实预约。
                      </p>
                    )}
                    {judgement && (
                      <p data-inspector-status={judgement.aiStatus}>
                        {judgement.aiReason}
                      </p>
                    )}
                    {trip.ui.detailFocus !== "booking" && (
                      <>
                        <button
                          type="button"
                          onClick={(e) =>
                            onAdviceAction?.(
                              selectedItem.id,
                              "edit",
                              e.currentTarget,
                            )
                          }
                        >
                          调整时间
                        </button>
                        <button
                          type="button"
                          onClick={(e) =>
                            onAdviceAction?.(
                              selectedItem.id,
                              "adjust",
                              e.currentTarget,
                            )
                          }
                        >
                          预览增加缓冲
                        </button>
                        {!selectedItem.fixedTime &&
                          !selectedItem.locked &&
                          selectedItem.type !== "hotel" && (
                            <button
                              type="button"
                              onClick={(e) =>
                                onAdviceAction?.(
                                  selectedItem.id,
                                  "replace",
                                  e.currentTarget,
                                )
                              }
                            >
                              选择替代项目
                            </button>
                          )}
                        <button
                          type="button"
                          onClick={(e) =>
                            onAdviceAction?.(
                              selectedItem.id,
                              "later",
                              e.currentTarget,
                            )
                          }
                        >
                          稍后处理
                        </button>
                        {adviceResponses?.[selectedItem.id] === "later" && (
                          <p role="status">
                            已记为稍后处理，问题仍保留，不会变为正常。
                          </p>
                        )}
                      </>
                    )}
                    {(selectedItem.reservationRequired ||
                      selectedItem.type === "hotel" ||
                      selectedItem.type === "restaurant") && (
                      <button
                        type="button"
                        onClick={() => onManageItem(selectedItem.id, "booking")}
                      >
                        管理预约
                      </button>
                    )}
                    {selectedItem.type === "hotel" && (
                      <button
                        type="button"
                        onClick={() => onManageItem(selectedItem.id, "replace")}
                      >
                        更换酒店
                      </button>
                    )}
                  </div>
                ) : (
                  (!detail || !selectedItem) &&
                  selectedPlace && (
                    <>
                      <PlaceActions
                        key={selectedPlace.id}
                        state={trip}
                        dispatch={dispatch}
                        place={selectedPlace}
                        day={selectedItem?.day ?? trip.ui.focusedDay}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: "inspect",
                            id: selectedPlace.id,
                            level: "detail",
                          })
                        }
                      >
                        查看完整资料
                      </button>
                      <small role="status">{trip.notice}</small>
                    </>
                  )
                )
              }
              onClose={() => {
                onCloseEditor?.();
                onCloseDraftInspection?.();
                dispatch({
                  type: "ui",
                  patch: {
                    selectedTripItemId: null,
                    inspection: null,
                    mealSlot: undefined,
                  },
                });
                const target = selectedItem
                  ? document.querySelector<HTMLButtonElement>(
                      `[data-detail-item="${CSS.escape(selectedItem.id)}"], [data-timeline-stop="${CSS.escape(selectedItem.id)}"]`,
                    )
                  : null;
                (target ?? document.getElementById("planner-workspace"))?.focus(
                  { preventScroll: true },
                );
              }}
            />
          )}
          {!projectContent && selectedArea && (
            <aside
              className={mapDetail.inspector}
              data-detail-map-inspector
              aria-label="项目详情框"
            >
              <header>
                <div>
                  <small>项目详情框</small>
                  <h2>{selectedArea.name}</h2>
                </div>
                <button
                  type="button"
                  aria-label="关闭项目详情框"
                  onClick={() =>
                    dispatch({
                      type: "ui",
                      patch: {
                        inspection: null,
                        selectedTripItemId: null,
                        mealSlot: undefined,
                      },
                    })
                  }
                >
                  ×
                </button>
              </header>
              <div className={mapDetail.content}>
                <PlaceDetails state={trip} dispatch={dispatch} embedded />
              </div>
            </aside>
          )}
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
          <div
            className={
              collapsedActions ? localSave.collapsedBar : localSave.expandOnly
            }
            data-detail-collapsed-bar={collapsedActions ? "" : undefined}
          >
            <Button
              className={
                collapsedActions ? localSave.expandButton : styles.openBottom
              }
              variant="secondary"
              aria-label={bottomTitle}
              aria-haspopup={onExpandBottom ? undefined : "dialog"}
              aria-expanded={trip.ui.isBottomPanelOverlayOpen}
              onClick={
                onExpandBottom ??
                (() =>
                  dispatch({
                    type: "ui",
                    patch: { isBottomPanelOverlayOpen: true },
                  }))
              }
            >
              {collapsedActions ? (
                <span aria-hidden="true">⌃</span>
              ) : (
                <PlannerIcon name="clock" />
              )}
              {collapsedActions ? "展开行程" : bottomTitle}
            </Button>
            {!trip.ui.isBottomPanelOverlayOpen && collapsedActions}
          </div>
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
