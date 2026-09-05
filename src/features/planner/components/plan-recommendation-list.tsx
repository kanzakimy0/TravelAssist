import type { MockPlan } from "../model/planner-types";
import { PlannerIcon } from "./planner-icon";
import styles from "../planner.module.css";

export function PlanRecommendationList({
  plans,
  selectedId,
  onSelect,
  pendingCount,
  onBooking,
}: {
  plans: MockPlan[];
  selectedId: string;
  onSelect: (plan: MockPlan) => void;
  pendingCount: number;
  onBooking: () => void;
}) {
  return (
    <section
      className={styles.recommendations}
      data-right-lower
      aria-labelledby="recommendations-title"
    >
      <div className={styles.sectionTitle}>
        <h2 id="recommendations-title">推荐方案</h2>
        <p>3 个方案 · 随心切换</p>
      </div>
      <div className={styles.planList}>
        {plans.map((plan, index) => (
          <button
            type="button"
            key={plan.id}
            className={styles.planRow}
            aria-pressed={selectedId === plan.id}
            onClick={() => onSelect(plan)}
          >
            <svg
              className={styles.planThumbnail}
              viewBox="0 0 100 90"
              aria-hidden="true"
            >
              <rect width="100" height="90" rx="14" fill="#eee9df" />
              <path d="M0 60q25-30 50 0t50 0v30H0" fill="#dce4e3" />
              <path d="m15 56 25-32 30 32Z" fill="#c5c9c3" />
              {plan.days.map((day) => (
                <polyline
                  key={day.day}
                  points={day.stops
                    .map((stop) => `${8 + stop.x / 12},${8 + stop.y / 8}`)
                    .join(" ")}
                  stroke={day.color}
                  strokeWidth="2"
                  fill="none"
                />
              ))}
            </svg>
            <span className={styles.planText}>
              <span className={styles.planNumber}>
                方案 0{index + 1}
                {selectedId === plan.id && <b>当前方案</b>}
              </span>
              <strong>{plan.name}</strong>
              <small>
                {plan.days.length}天
                {
                  plan.days.filter((day) =>
                    day.stops.some((stop) => stop.kind === "stay"),
                  ).length
                }
                晚 · {plan.summary}
              </small>
            </span>
            <PlannerIcon name="chevron" />
          </button>
        ))}
      </div>
      <div className={styles.currentBooking} data-current-booking>
        <span role="status">
          {pendingCount
            ? `当前方案 · 待预约 ${pendingCount} 项`
            : "✓ 关键预约已完成"}
        </span>
        <button type="button" onClick={onBooking}>
          完成预约
        </button>
      </div>
    </section>
  );
}
