import { useEffect, useRef, useState, type Dispatch } from "react";
import { secondaryPanelModel } from "../model/secondary-panels";
import { mealAreaChoices } from "../model/meal-area-choices";
import type { TripAction, TripState } from "../model/trip-model";
import { PlannerPopover } from "./planner-popover";
import ui from "../workspace-panels.module.css";

export function AreaRecommendations({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const model = secondaryPanelModel(state);
  return (
    <div
      className={`${ui.dailyPanels} ${ui.mealStayCards}`}
      data-area-recommendations
      data-range-mode={state.ui.rangeMode}
    >
      {(["breakfast", "lunch", "dinner", "hotel"] as const).map((slot) => (
        <section key={slot} data-area-slot={slot}>
          <h3>
            {
              {
                breakfast: "早餐",
                lunch: "午餐",
                dinner: "晚餐",
                hotel: "住宿",
              }[slot]
            }
          </h3>
          <div
            className={ui.areaDayRows}
            data-days={model.rows.length}
            style={{
              gridTemplateRows: `repeat(${model.rows.length}, minmax(0,1fr))`,
            }}
          >
            {model.rows.map((row) => (
              <div
                className={ui.areaDayRow}
                key={row.day.day}
                data-area-day={row.day.day}
              >
                <small>
                  第{row.day.day}天 · {row.day.city}
                </small>
                <div className={ui.areaChoices}>
                  {mealAreaChoices(state, row.day.day, slot === "hotel").map(
                    (choice) => (
                      <AreaChoice
                        key={choice.id}
                        choice={choice}
                        id={`${slot}-${row.day.day}-${choice.id}`}
                        onInspect={() =>
                          dispatch({
                            type: "inspect",
                            id: choice.id,
                            level: choice.level,
                            day: row.day.day,
                          })
                        }
                      />
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
          {state.ui.rangeMode === "day" && (
            <small>区域草案 · 悬停 / 点击查看理由</small>
          )}
        </section>
      ))}
    </div>
  );
}
function AreaChoice({
  choice,
  id,
  onInspect,
}: {
  choice: ReturnType<typeof mealAreaChoices>[number];
  id: string;
  onInspect: () => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    [open, setOpen] = useState(false);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const clear = () => {
    if (timer.current) clearTimeout(timer.current);
  };
  return (
    <span
      onMouseEnter={() => {
        clear();
        timer.current = setTimeout(() => setOpen(true), 180);
      }}
      onMouseLeave={() => {
        clear();
        timer.current = setTimeout(() => setOpen(false), 140);
      }}
    >
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        onFocus={() => {
          clear();
          setOpen(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            clear();
            setOpen(false);
          }
        }}
        onClick={() => {
          clear();
          setOpen(true);
        }}
      >
        {choice.label}
      </button>
      {open && (
        <PlannerPopover
          id={`reason-${id}`}
          title={choice.label}
          trigger={trigger}
          autoFocus={false}
          placement="above"
          maxHeight={250}
          onClose={() => {
            clear();
            setOpen(false);
          }}
        >
          <div className={ui.areaReason}>
            <p>{choice.reason}</p>
            <small>基于示例行程的规划建议，不代表实时可订。</small>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onInspect();
              }}
            >
              查看周边参考 →
            </button>
          </div>
        </PlannerPopover>
      )}
    </span>
  );
}
