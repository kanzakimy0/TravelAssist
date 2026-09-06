import { useLayoutEffect, useRef, useState, type Dispatch } from "react";
import {
  calendarDays,
  fromDateValue,
  moveCalendarDate,
  toDateValue,
} from "@/features/start-flow/lib/calendar";
import type { TripState, TripAction } from "../model/trip-model";
import menu from "../quick-settings-menu.module.css";

export function QuickDateMenu({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const [departure, setDeparture] = useState(state.settings.startDate);
  const [returning, setReturning] = useState(state.configuration.returnDate);
  const [endpoint, setEndpoint] = useState<"departure" | "returning">(
    "departure",
  );
  const [focused, setFocused] = useState(departure);
  const [month, setMonth] = useState(() => fromDateValue(departure));
  const grid = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);
  const days = calendarDays(month);
  const enabledDays = days.filter(
    (date) => endpoint !== "returning" || toDateValue(date) >= departure,
  );
  const tabDate =
    enabledDays.find((date) => toDateValue(date) === focused) ??
    enabledDays.find((date) => date.getMonth() === month.getMonth()) ??
    enabledDays[0];
  const duration =
    Math.round((Date.parse(returning) - Date.parse(departure)) / 86400000) + 1;
  const valid = Number.isFinite(duration) && duration >= 1 && duration <= 60;
  useLayoutEffect(() => {
    if (moveFocus.current)
      grid.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)
        ?.focus();
  }, [focused]);
  function select(value: string) {
    if (endpoint === "departure") {
      setDeparture(value);
      if (returning < value) setReturning(value);
      setEndpoint("returning");
    } else setReturning(value);
  }
  return (
    <form
      className={`${menu.body} ${menu.dateBody}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) dispatch({ type: "dates", departure, returning });
      }}
    >
      <div className={menu.intro}>
        <span className={menu.kicker}>旅行时间 · 区间选择</span>
        <p>选好出发与归期，把期待留给旅途。</p>
      </div>
      <div className={menu.dateEndpoints}>
        <label className={menu.field} data-active={endpoint === "departure"}>
          出发日期
          <input
            required
            type="date"
            value={departure}
            onFocus={() => setEndpoint("departure")}
            onChange={(e) => {
              setDeparture(e.target.value);
              if (e.target.value) setMonth(fromDateValue(e.target.value));
            }}
          />
        </label>
        <label className={menu.field} data-active={endpoint === "returning"}>
          返回日期
          <input
            required
            type="date"
            value={returning}
            min={departure}
            onFocus={() => setEndpoint("returning")}
            onChange={(e) => {
              setReturning(e.target.value);
              if (e.target.value) setMonth(fromDateValue(e.target.value));
            }}
          />
        </label>
      </div>
      <div className={menu.calendar}>
        <div className={menu.calendarHeader}>
          <button
            type="button"
            aria-label="上个月"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            ‹
          </button>
          <strong aria-live="polite">
            {month.getFullYear()}年 {month.getMonth() + 1}月
          </strong>
          <button
            type="button"
            aria-label="下个月"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            ›
          </button>
        </div>
        <div className={menu.weekdays} aria-hidden="true">
          {"一二三四五六日".split("").map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div
          className={menu.calendarGrid}
          ref={grid}
          role="group"
          aria-label={`选择${endpoint === "departure" ? "出发" : "返回"}日期`}
          onKeyDown={(e) => {
            if (
              ![
                "ArrowLeft",
                "ArrowRight",
                "ArrowUp",
                "ArrowDown",
                "Home",
                "End",
                "PageUp",
                "PageDown",
              ].includes(e.key)
            )
              return;
            e.preventDefault();
            const moved = toDateValue(
              moveCalendarDate(fromDateValue(focused), e.key),
            );
            const next =
              endpoint === "returning" && moved < departure ? departure : moved;
            moveFocus.current = true;
            setFocused(next);
            setMonth(fromDateValue(next));
          }}
        >
          {days.map((date) => {
            const iso = toDateValue(date);
            const inMonth = date.getMonth() === month.getMonth();
            const disabled = endpoint === "returning" && iso < departure;
            return (
              <button
                type="button"
                key={iso}
                data-date={iso}
                data-outside={!inMonth}
                data-in-range={iso >= departure && iso <= returning}
                aria-label={`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`}
                aria-pressed={iso === departure || iso === returning}
                disabled={disabled}
                tabIndex={tabDate && iso === toDateValue(tabDate) ? 0 : -1}
                onFocus={() => {
                  moveFocus.current = false;
                  setFocused(iso);
                }}
                onClick={() => select(iso)}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
      <div className={menu.selectionSummary}>
        <span>
          {valid ? (
            <>
              <strong>{duration}</strong> 天 · {duration - 1} 晚
            </>
          ) : (
            "请选择 1–60 天的有效区间"
          )}
        </span>
        <small>
          日历当前选择：{endpoint === "departure" ? "出发" : "返回"}日期
        </small>
      </div>
      <p className={menu.notice}>
        应用前不会改变行程。固定预约或酒店退房超出新区间时，将保留原安排；新增日期为空白安排。
      </p>
      <footer className={menu.footer}>
        <small role="status">{state.notice}</small>
        <button type="submit" className={menu.primary} disabled={!valid}>
          应用日期区间
        </button>
      </footer>
    </form>
  );
}
