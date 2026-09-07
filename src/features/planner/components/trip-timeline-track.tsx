import { useEffect, useRef, type CSSProperties } from "react";
import type { DetailRailItem } from "../model/detail-workspace";
import { minutes } from "../model/trip-model";
import styles from "../detail-workspace.module.css";

export const timelineStatus = {
  normal: { symbol: "✓", label: "正常" },
  warning: { symbol: "!", label: "需确认" },
  error: { symbol: "×", label: "有冲突" },
} as const;

export function TripTimelineTrack({
  items,
  selectedId,
  onItem,
  onInspect,
  sightsOnly = false,
}: {
  items: DetailRailItem[];
  selectedId: string | null;
  onItem: (item: DetailRailItem, trigger: HTMLButtonElement) => void;
  onInspect?: (item: DetailRailItem) => void;
  sightsOnly?: boolean;
}) {
  const track = useRef<HTMLDivElement>(null);
  const start = Math.min(...items.map((item) => minutes(item.startTime)), 480);
  const end = Math.max(...items.map((item) => minutes(item.endTime)), 1200);
  useEffect(() => {
    if (!selectedId) return;
    track.current
      ?.querySelector<HTMLElement>(
        `[data-rail-item="${CSS.escape(selectedId)}"]`,
      )
      ?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
  }, [selectedId]);
  if (!items.length)
    return <p className={styles.railEmpty}>当天暂无景点安排</p>;
  return (
    <div
      className={styles.railViewport}
      ref={track}
      data-sights-only={sightsOnly}
    >
      <div className={styles.railTrack}>
        <div className={styles.railLine} aria-hidden="true" />
        {items.map((item, index) => {
          const status = timelineStatus[item.aiStatus];
          const statusId = `${sightsOnly ? "planner" : "detail"}-status-${item.id}`;
          return (
            <div
              className={styles.railItem}
              data-lane={index % 2 ? "below" : "above"}
              key={item.id}
              style={
                {
                  "--rail-position": `${((minutes(item.startTime) - start) / Math.max(1, end - start)) * 100}%`,
                } as CSSProperties
              }
            >
              <span
                className={styles.statusNode}
                data-status={sightsOnly ? "sight" : item.aiStatus}
                id={statusId}
                title={
                  sightsOnly ? item.title : `${status.label}：${item.aiReason}`
                }
              >
                {!sightsOnly && <span aria-hidden="true">{status.symbol}</span>}
                <span className={styles.srOnly}>
                  {sightsOnly ? "景点" : `${status.label}：${item.aiReason}`}
                </span>
              </span>
              <button
                type="button"
                className={styles.railBubble}
                data-kind={item.type}
                data-rail-item={item.id}
                data-detail-item={sightsOnly ? undefined : item.id}
                data-timeline-stop={sightsOnly ? item.id : undefined}
                aria-pressed={selectedId === item.id}
                aria-describedby={statusId}
                onClick={(event) => onItem(item, event.currentTarget)}
                onDoubleClick={() => onInspect?.(item)}
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
  );
}
