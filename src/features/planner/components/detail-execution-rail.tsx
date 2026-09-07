import type { Dispatch, ReactNode } from "react";
import { DetailItineraryBoard } from "./detail-itinerary-board";
import { DetailTripOverview } from "./detail-trip-overview";

import type {
  DetailDraftState,
  DetailRailItem,
} from "../model/detail-workspace";
import type { TripAction, TripState, TripPlan } from "../model/trip-model";
import styles from "../detail-workspace.module.css";

export function DetailExecutionRail({
  overview = false,
  onOverview,
  plan,
  day,
  items,
  selectedId,
  onDay,
  onItem,
  onAdd,
  actions,
  onMinimize,
  state,
  dispatch,
  draft,
  onDraft,
  onMissing,
}: {
  overview?: boolean;
  onOverview: () => void;
  plan: TripPlan;
  day: number;
  items: DetailRailItem[];
  selectedId: string | null;
  onDay: (day: number) => void;
  onItem: (
    item: DetailRailItem,
    trigger: HTMLButtonElement,
    focus?: "advice" | "booking",
  ) => void;
  onMissing: (
    day: number,
    kind: "hotel" | "restaurant",
    slot?: "breakfast" | "lunch" | "dinner",
  ) => void;
  onAdd: (trigger: HTMLButtonElement) => void;
  actions?: ReactNode;
  onMinimize?: () => void;
  state: TripState;
  dispatch: Dispatch<TripAction>;
  draft: DetailDraftState;
  onDraft: (patch: Partial<DetailDraftState>) => void;
}) {
  return (
    <section className={styles.bottomPanel} aria-label="单日执行工作区">
      <div className={styles.railHeader}>
        {onMinimize && (
          <button
            type="button"
            className={styles.minimizeButton}
            onClick={onMinimize}
            aria-label="收起行程栏"
            title="收起行程栏"
          >
            ⌄
          </button>
        )}
        <div
          className={styles.daySelector}
          role="group"
          aria-label="选择行程日期"
        >
          <button type="button" aria-pressed={overview} onClick={onOverview}>
            <strong>行程总览</strong>
            <span>{plan.days.length} 天 · 全程摘要</span>
          </button>
          {plan.days.map((tripDay) => (
            <button
              key={tripDay.day}
              type="button"
              aria-pressed={!overview && day === tripDay.day}
              onClick={() => onDay(tripDay.day)}
            >
              <strong>第{tripDay.day}天</strong>
              <span>
                {tripDay.date.replace("月", "/").replace("日", "")} ·{" "}
                {tripDay.city}
              </span>
            </button>
          ))}
        </div>
        <div className={styles.railActions} data-detail-rail-actions>
          {actions}
          <button
            className={styles.addButton}
            type="button"
            onClick={(event) => onAdd(event.currentTarget)}
            aria-label="新增项目"
          >
            <span aria-hidden="true">＋</span>
            新增项目
          </button>
        </div>
      </div>

      {overview ? (
        <DetailTripOverview
          state={state}
          draft={draft}
          onDay={onDay}
          onItem={onItem}
          onMissing={onMissing}
        />
      ) : (
        <DetailItineraryBoard
          day={day}
          state={state}
          dispatch={dispatch}
          draft={draft}
          onDraft={onDraft}
          items={items}
          selectedId={selectedId}
          onItem={onItem}
          onMissing={onMissing}
        />
      )}
    </section>
  );
}
