import { useEffect, useRef } from "react";
import type { MockDay } from "../model/planner-types";
import { PlannerIcon } from "./planner-icon";
import styles from "../planner.module.css";

export function ItineraryTimeline({
  day,
  selectedStopId,
  onSelect,
}: {
  day: MockDay;
  selectedStopId: string | null;
  onSelect: (id: string) => void;
}) {
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const selected = list.current?.querySelector<HTMLElement>(
      '[aria-pressed="true"]',
    );
    selected?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "instant",
    });
  }, [selectedStopId]);
  return (
    <ol
      className={styles.timeline}
      ref={list}
      aria-label={`Day ${day.day} 行程`}
    >
      {day.stops.map((stop) => (
        <li key={stop.id}>
          <button
            type="button"
            data-timeline-stop={stop.id}
            aria-pressed={selectedStopId === stop.id}
            onClick={() => onSelect(stop.id)}
          >
            <time>{stop.time}</time>
            <span className={styles.timelineDot}>
              <PlannerIcon name={stop.kind} />
            </span>
            <strong>{stop.name}</strong>
            <small>
              {stop.duration}
              {stop.fixed && " · 固定"}
            </small>
          </button>
          {stop.next && <span className={styles.nextLeg}>{stop.next}</span>}
        </li>
      ))}
    </ol>
  );
}
