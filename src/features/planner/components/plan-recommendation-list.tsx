import type { MockPlan } from "../model/planner-types";
import { planArtwork } from "../data/planner-artwork";
import { PlannerArtworkImage } from "./planner-artwork";
import { PlannerIcon } from "./planner-icon";
import styles from "../planner.module.css";

export function PlanRecommendationList({
  plans,
  selectedId,
  onSelect,
  pendingCount,
  onBooking,
  modifiedIds,
  onSavePlan,
  onRestorePlan,
  workingPlanId,
}: {
  plans: MockPlan[];
  selectedId: string;
  onSelect: (plan: MockPlan) => void;
  pendingCount: number;
  onBooking: () => void;
  modifiedIds: string[];
  onSavePlan: (id: string) => void;
  onRestorePlan: (id: string) => void;
  workingPlanId?: string;
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
          <article
            key={plan.id}
            className={styles.planRow}
            data-selected={selectedId === plan.id}
            data-recommendation={plan.id}
          >
            <button
              type="button"
              className={styles.planSelect}
              aria-pressed={selectedId === plan.id}
              onClick={() => onSelect(plan)}
              aria-label={`选择方案 0${index + 1}：${plan.name}`}
            >
              {planArtwork(plan.id) ? (
                <PlannerArtworkImage
                  artwork={planArtwork(plan.id)!}
                  className={styles.planThumbnail}
                  sizes="80px"
                  fallback={<PlanThumbnail plan={plan} />}
                />
              ) : (
                <PlanThumbnail plan={plan} />
              )}
              <span className={styles.planText}>
                <span className={styles.planNumber}>
                  方案 0{index + 1}
                  {(workingPlanId === plan.id ||
                    modifiedIds.includes(plan.id)) && (
                    <em className={styles.modifiedPlan}>
                      {workingPlanId === plan.id ? "当前工作中方案" : "已修改"}
                    </em>
                  )}
                  {selectedId === plan.id && workingPlanId !== plan.id && (
                    <b>当前方案</b>
                  )}
                </span>
                <strong>{plan.name}</strong>
                <small>
                  {plan.days.length}天{Math.max(0, plan.days.length - 1)}晚 ·{" "}
                  {plan.summary}
                </small>
              </span>
              <PlannerIcon name="chevron" />
            </button>
            <div className={styles.planActions}>
              <button type="button" onClick={() => onSavePlan(plan.id)}>
                {workingPlanId === plan.id
                  ? "进入行程详情"
                  : workingPlanId
                    ? "切换方案"
                    : "保存并细化 →"}
              </button>
              <button
                type="button"
                disabled={!modifiedIds.includes(plan.id)}
                onClick={() => onRestorePlan(plan.id)}
              >
                还原推荐
              </button>
            </div>
          </article>
        ))}
      </div>
      <div className={styles.currentBooking} data-current-booking>
        <span role="status">
          {pendingCount
            ? `当前方案 · 待预约 ${pendingCount} 项`
            : "✓ 关键预约已完成"}
        </span>
        <button type="button" onClick={onBooking}>
          到详情管理预约
        </button>
      </div>
    </section>
  );
}

function PlanThumbnail({ plan }: { plan: MockPlan }) {
  return (
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
  );
}
