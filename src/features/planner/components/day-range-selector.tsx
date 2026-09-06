import { useRef, useState } from "react";
import type { PlannerAction } from "../model/planner-state";
import type { PlannerUiState } from "../model/planner-types";
import { PlannerPopover } from "./planner-popover";
import styles from "../planner.module.css";
import ui from "../planner-interactions.module.css";

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
  const [inputOpen, setInputOpen] = useState(false);
  const [inputDay, setInputDay] = useState("1");
  const max = Math.max(1, totalDays - (menu === "threeDays" ? 2 : 0));
  const current =
    menu === "threeDays" ? state.threeDayStart : state.selectedDay;
  const first = Math.max(1, Math.min(current - 1, max - 2));
  return (
    <div
      className={styles.dayRange}
      role="group"
      aria-label="地图日程范围"
      data-range-mode={state.rangeMode}
    >
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
          ? `D${state.threeDayStart}-D${state.threeDayStart + 2} ▾`
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
          compact
          title={menu === "day" ? "选择一天" : "选择连续三天"}
          trigger={menu === "day" ? dayTrigger : threeTrigger}
          onClose={() => setMenu(null)}
        >
          <div className={styles.dayChoices}>
            {Array.from(
              { length: Math.min(3, max) },
              (_, index) => first + index,
            ).map((start) => (
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
                {menu === "day" ? `第${start}天` : `D${start}-D${start + 2}`}
              </button>
            ))}
            <button
              type="button"
              aria-expanded={inputOpen}
              onClick={() => {
                setInputDay(String(current));
                setInputOpen(!inputOpen);
              }}
            >
              输入
            </button>
          </div>
          {inputOpen && (
            <form
              className={ui.dayInput}
              onSubmit={(e) => {
                e.preventDefault();
                const start = Number(inputDay);
                if (Number.isInteger(start) && start >= 1 && start <= max) {
                  dispatch({ type: "range", mode: menu, start, totalDays });
                  setMenu(null);
                  setInputOpen(false);
                }
              }}
            >
              <label>
                第 N 天（1–{max}）
                <input
                  required
                  aria-label="输入 Day"
                  type="number"
                  min={1}
                  max={max}
                  step={1}
                  value={inputDay}
                  onChange={(e) => setInputDay(e.target.value)}
                />
              </label>
              <button type="submit">确认范围</button>
            </form>
          )}
        </PlannerPopover>
      )}
    </div>
  );
}
