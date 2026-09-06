import { useEffect, useRef, type CSSProperties } from "react";

import type { DetailRailItem } from "../model/detail-workspace";
import { minutes } from "../model/trip-model";
import type { TripPlan } from "../model/trip-model";
import styles from "../detail-workspace.module.css";

export function DetailExecutionRail({
  plan,
  day,
  items,
  selectedId,
  onDay,
  onItem,
  onAdd,
}: {
  plan: TripPlan;
  day: number;
  items: DetailRailItem[];
  selectedId: string | null;
  onDay: (day: number) => void;
  onItem: (item: DetailRailItem, trigger: HTMLButtonElement) => void;
  onAdd: (trigger: HTMLButtonElement) => void;
}) {
  const track = useRef<HTMLDivElement>(null);
  const starts = items.map((item) => minutes(item.startTime));
  const ends = items.map((item) => minutes(item.endTime));
  const bounds = {
    start: Math.min(...starts, 8 * 60),
    end: Math.max(...ends, 20 * 60),
  };

  useEffect(() => {
    if (!selectedId || !track.current) return;
    track.current
      .querySelector<HTMLElement>(
        `[data-detail-item="${CSS.escape(selectedId)}"]`,
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
  }, [selectedId]);

  return (
    <section className={styles.bottomPanel} aria-label="单日执行工作区">
      <div
        className={styles.daySelector}
        role="group"
        aria-label="选择行程日期"
      >
        {plan.days.map((tripDay) => (
          <button
            key={tripDay.day}
            type="button"
            aria-pressed={day === tripDay.day}
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

      <div className={styles.railViewport} ref={track}>
        <div className={styles.railTrack}>
          <div className={styles.railLine} aria-hidden="true" />
          {items.map((item, index) => {
            const span = Math.max(1, bounds.end - bounds.start);
            const position =
              ((minutes(item.startTime) - bounds.start) / span) * 100;
            const statusText =
              item.aiStatus === "normal"
                ? "正常"
                : item.aiStatus === "warning"
                  ? "需要确认"
                  : "有问题";
            return (
              <div
                className={styles.railItem}
                data-lane={index % 2 ? "below" : "above"}
                key={item.id}
                style={{ "--rail-position": `${position}%` } as CSSProperties}
              >
                <span
                  className={styles.statusNode}
                  data-status={item.aiStatus}
                  id={`detail-status-${item.id}`}
                  title={`AI 状态：${statusText}`}
                >
                  <span className={styles.srOnly}>AI 状态：{statusText}</span>
                </span>
                <button
                  type="button"
                  className={styles.railBubble}
                  data-kind={item.type}
                  data-detail-item={item.id}
                  aria-pressed={selectedId === item.id}
                  aria-describedby={`detail-status-${item.id}`}
                  onClick={(event) => onItem(item, event.currentTarget)}
                >
                  <time>{item.startTime}</time>
                  <strong>{item.title}</strong>
                  <span>
                    {item.typeLabel} · {item.durationLabel}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
      <button
        className={styles.addButton}
        type="button"
        onClick={(event) => onAdd(event.currentTarget)}
        aria-label="新增行程项目"
      >
        <span aria-hidden="true">＋</span>
        新增行程
      </button>
    </section>
  );
}
