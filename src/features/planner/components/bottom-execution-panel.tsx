import type { Dispatch, KeyboardEvent } from "react";
import type { BottomTab } from "../model/planner-types";
import {
  currentPlan,
  cityStays,
  stayNights,
  rangeDays,
} from "../model/trip-model";
import type { TripAction, TripState } from "../model/trip-model";
import { ProportionalTimeline } from "./proportional-timeline";
import { PlannerIcon } from "./planner-icon";
import { SecondaryPanels } from "./secondary-panels";
import styles from "../planner.module.css";

export const bottomTabs = [
  ["itinerary", "行程"],
  ["movement", "移动"],
  ["booking", "预约·票务"],
  ["weather", "天气·备选"],
  ["stayFood", "住宿·餐饮"],
  ["details", "详细"],
] as const;
export function BottomExecutionPanel({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
  onSelect: (id: string) => void;
}) {
  const plan = currentPlan(state),
    days = rangeDays(state),
    tab = state.ui.activeBottomTab;
  const mode = state.ui.rangeMode;
  const changeTab = (tab: BottomTab) =>
    dispatch({ type: "ui", patch: { activeBottomTab: tab } });
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % 6
        : event.key === "ArrowLeft"
          ? (index + 5) % 6
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 5
              : -1;
    if (next < 0) return;
    event.preventDefault();
    changeTab(bottomTabs[next][0]);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  return (
    <section
      className={styles.bottomPanel}
      data-bottom-panel
      data-bottom-range={mode}
      aria-label="范围执行面板"
      data-bottom-plan={plan.name}
    >
      <div
        className={styles.bottomTabs}
        role="tablist"
        aria-label="行程执行分类"
      >
        {bottomTabs.map(([id, label], index) => (
          <button
            type="button"
            role="tab"
            id={`tab-${id}`}
            key={id}
            aria-selected={tab === id}
            aria-controls={`panel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={(e) => tabKey(e, index)}
            onClick={() => changeTab(id)}
          >
            <PlannerIcon
              name={
                (
                  [
                    "clock",
                    "transport",
                    "booking",
                    "sun",
                    "stay",
                    "layers",
                  ] as const
                )[index]
              }
            />
            {label}
          </button>
        ))}
      </div>
      <div
        className={styles.tabContent}
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab !== "itinerary" ? (
          <SecondaryPanels state={state} dispatch={dispatch} />
        ) : mode !== "all" ? (
          <ProportionalTimeline state={state} dispatch={dispatch} />
        ) : (
          <div className={styles.rangeCards}>
            {Array.from(new Set(days.map((d) => d.city))).map((city) => {
              const group = days.filter((d) => d.city === city),
                first = group[0];
              const stays = cityStays(state, city);
              const next = days.find((d) => d.day > group.at(-1)!.day);
              return (
                <article key={city}>
                  <button
                    type="button"
                    aria-pressed={state.ui.focusedDay === first.day}
                    onClick={() =>
                      dispatch({ type: "focusDay", day: first.day })
                    }
                  >
                    {city} · D{group.map((d) => d.day).join("/")} · 聚焦地图
                  </button>
                  <ul>
                    <li>
                      {group.length} 天 ·{" "}
                      {stays.length
                        ? stayNights(stays) + " 晚"
                        : "不在本城过夜"}
                    </li>
                    <li>
                      {next
                        ? city + " → " + next.city + " · 城际接驳"
                        : city + " → 羽田机场 · 返程接驳"}
                    </li>
                  </ul>
                  <div className={styles.placeActions}>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "range",
                          mode: "day",
                          start: first.day,
                        })
                      }
                    >
                      查看单日
                    </button>
                    <button
                      type="button"
                      disabled={days.length < 3}
                      onClick={() =>
                        dispatch({
                          type: "range",
                          mode: "threeDays",
                          start: first.day,
                        })
                      }
                    >
                      查看三日
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
