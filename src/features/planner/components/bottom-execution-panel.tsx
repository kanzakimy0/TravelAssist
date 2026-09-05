import type { KeyboardEvent } from "react";
import type { BottomTab, MockDay } from "../model/planner-types";
import { ItineraryTimeline } from "./itinerary-timeline";
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
  days,
  activeDay,
  onDay,
  tab,
  onTab,
  selectedStopId,
  onSelect,
  planName,
}: {
  days: MockDay[];
  activeDay: number;
  onDay: (day: number) => void;
  tab: BottomTab;
  onTab: (tab: BottomTab) => void;
  selectedStopId: string | null;
  onSelect: (id: string) => void;
  planName: string;
}) {
  const day = days.find((item) => item.day === activeDay) ?? days[0];
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    if (event.key === "ArrowRight") next = (index + 1) % bottomTabs.length;
    else if (event.key === "ArrowLeft")
      next = (index + bottomTabs.length - 1) % bottomTabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = bottomTabs.length - 1;
    else return;
    event.preventDefault();
    onTab(bottomTabs[next][0]);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  return (
    <section
      className={styles.bottomPanel}
      data-bottom-panel
      aria-label="当天执行"
      data-bottom-plan={planName}
    >
      <div className={styles.executionSummary}>
        <div className={styles.executionDays} aria-label="当前范围内的日期">
          {days.map((item) => (
            <button
              type="button"
              key={item.day}
              aria-pressed={item.day === day.day}
              onClick={() => onDay(item.day)}
            >
              Day {item.day}
              <span> · {item.date}</span>
            </button>
          ))}
        </div>
        <span className={styles.todayStatus}>
          {day.title} · {day.weather[0].replace("示例天气：", "")} · 示例
        </span>
      </div>
      <div
        className={styles.bottomTabs}
        role="tablist"
        aria-label="当天执行分类"
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
            onKeyDown={(event) => tabKey(event, index)}
            onClick={() => onTab(id)}
          >
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
        {tab === "itinerary" ? (
          <ItineraryTimeline
            day={day}
            selectedStopId={selectedStopId}
            onSelect={onSelect}
          />
        ) : (
          <ul className={styles.detailCards}>
            {day[tab].map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
