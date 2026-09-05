import { useRef, useState } from "react";
import type { PlannerAction } from "../model/planner-state";
import { threeDayWindows } from "../model/planner-state";
import type { PlannerUiState } from "../model/planner-types";
import { PlannerPopover } from "./planner-popover";
import styles from "../planner.module.css";

export function DayRangeSelector({
  state,
  totalDays,
  dispatch,
}: {
  state: PlannerUiState;
  totalDays: number;
  dispatch: (action: PlannerAction) => void;
}) {
  const [menu, setMenu] = useState<"day" | "threeDays" | null>(null);
  const dayTrigger = useRef<HTMLButtonElement>(null);
  const threeTrigger = useRef<HTMLButtonElement>(null);
  return (
    <div className={styles.dayRange} role="group" aria-label="地图日程范围">
      <button
        type="button"
        ref={dayTrigger}
        aria-pressed={state.rangeMode === "day"}
        aria-expanded={menu === "day"}
        aria-controls={menu === "day" ? "day-choices" : undefined}
        onClick={() => {
          dispatch({
            type: "range",
            mode: "day",
            start: state.selectedDay,
            totalDays,
          });
          setMenu(menu === "day" ? null : "day");
        }}
      >
        {state.rangeMode === "day" ? `第${state.selectedDay}天 ▾` : "1日"}
      </button>
      <button
        type="button"
        ref={threeTrigger}
        disabled={totalDays < 3}
        aria-pressed={state.rangeMode === "threeDays"}
        aria-expanded={menu === "threeDays"}
        aria-controls={menu === "threeDays" ? "day-choices" : undefined}
        onClick={() => {
          dispatch({
            type: "range",
            mode: "threeDays",
            start: state.threeDayStart,
            totalDays,
          });
          setMenu(menu === "threeDays" ? null : "threeDays");
        }}
      >
        {state.rangeMode === "threeDays"
          ? `Day ${state.threeDayStart}–${state.threeDayStart + 2} ▾`
          : "3日"}
      </button>
      <button
        type="button"
        aria-pressed={state.rangeMode === "all"}
        onClick={() => {
          setMenu(null);
          dispatch({ type: "range", mode: "all", totalDays });
        }}
      >
        全日
      </button>
      {menu && (
        <PlannerPopover
          id="day-choices"
          title={menu === "day" ? "选择一天" : "选择连续三天"}
          trigger={menu === "day" ? dayTrigger : threeTrigger}
          onClose={() => setMenu(null)}
        >
          <div className={styles.dayChoices}>
            {(menu === "day"
              ? Array.from({ length: totalDays }, (_, index) => ({
                  start: index + 1,
                  end: index + 1,
                }))
              : threeDayWindows(totalDays)
            ).map(({ start, end }) => (
              <button
                type="button"
                key={start}
                aria-pressed={
                  menu === "day"
                    ? state.selectedDay === start
                    : state.threeDayStart === start
                }
                onClick={() => {
                  dispatch({ type: "range", mode: menu, start, totalDays });
                  setMenu(null);
                }}
              >
                {menu === "day" ? `第${start}天` : `第${start}–${end}天`}
              </button>
            ))}
          </div>
        </PlannerPopover>
      )}
    </div>
  );
}
