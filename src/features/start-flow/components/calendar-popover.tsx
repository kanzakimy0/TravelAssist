"use client";

import { useLayoutEffect, useRef, useState } from "react";

import {
  calendarDays,
  fromDateValue,
  moveCalendarDate,
  toDateValue,
} from "../lib/calendar";
import styles from "../themed-popover.module.css";
import { ThemedPopover } from "./themed-popover";

interface CalendarPopoverProps {
  label: string;
  min?: string;
  onChange: (value: string) => void;
  value: string;
}

export function CalendarPopover({
  label,
  min,
  onChange,
  value,
}: CalendarPopoverProps) {
  return (
    <ThemedPopover label={label} value={value || "选择日期"}>
      {(close) => (
        <Calendar
          min={min}
          value={value}
          onSelect={(next) => {
            onChange(next);
            close();
          }}
        />
      )}
    </ThemedPopover>
  );
}

function Calendar({
  min,
  value,
  onSelect,
}: {
  min?: string;
  value: string;
  onSelect: (value: string) => void;
}) {
  const [today] = useState(() => toDateValue(new Date()));
  const [focused, setFocused] = useState(() =>
    value && (!min || value >= min) ? value : min && today < min ? min : today,
  );
  const [month, setMonth] = useState(() => fromDateValue(focused));
  const gridRef = useRef<HTMLDivElement>(null);
  const focusMoved = useRef(false);
  const days = calendarDays(month);
  const focusIsVisible = days.some((date) => toDateValue(date) === focused);

  useLayoutEffect(() => {
    if (focusMoved.current)
      gridRef.current
        ?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)
        ?.focus();
  }, [focused]);

  return (
    <>
      <div className={styles.calendarHeader}>
        <button
          aria-label="上个月"
          type="button"
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
          aria-label="下个月"
          type="button"
          onClick={() =>
            setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
          }
        >
          ›
        </button>
      </div>
      <div className={styles.weekdays} aria-hidden="true">
        {"一二三四五六日".split("").map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div
        className={styles.calendarGrid}
        ref={gridRef}
        role="group"
        aria-label="日期"
        onKeyDown={(event) => {
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
            ].includes(event.key)
          )
            return;
          event.preventDefault();
          const moved = toDateValue(
            moveCalendarDate(fromDateValue(focused), event.key),
          );
          const next = min && moved < min ? min : moved;
          focusMoved.current = true;
          setFocused(next);
          setMonth(fromDateValue(next));
        }}
      >
        {days.map((date) => {
          const iso = toDateValue(date);
          const inMonth = date.getMonth() === month.getMonth();
          const disabled = !!min && iso < min;
          const active =
            iso === focused ||
            (!focusIsVisible && date.getDate() === 1 && inMonth);
          return (
            <button
              key={iso}
              data-date={iso}
              data-autofocus={iso === focused}
              data-outside={!inMonth}
              aria-label={`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`}
              aria-pressed={iso === value}
              aria-current={iso === today ? "date" : undefined}
              disabled={disabled}
              tabIndex={active ? 0 : -1}
              onFocus={() => {
                focusMoved.current = false;
                setFocused(iso);
              }}
              onClick={() => onSelect(iso)}
              type="button"
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
      <div className={styles.calendarFooter}>
        <button type="button" onClick={() => onSelect("")}>
          清除
        </button>
        <button
          disabled={!!min && today < min}
          type="button"
          onClick={() => onSelect(today)}
        >
          今天
        </button>
      </div>
    </>
  );
}
