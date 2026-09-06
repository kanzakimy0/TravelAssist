import type {
  DetailDaySummary,
  DetailRailItem,
} from "../model/detail-workspace";
import { judgementPhase } from "../model/detail-workspace";
import type { TripState } from "../model/trip-model";
import styles from "../detail-workspace.module.css";

const yen = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export function DetailSidebar({
  state,
  summary,
  items,
  onLocate,
  onRecheck,
  checkStatus,
  adjustmentOpen,
  onToggleAdjustment,
  onApplyAdjustment,
}: {
  state: TripState;
  summary: DetailDaySummary;
  items: DetailRailItem[];
  onLocate: (id: string) => void;
  onRecheck: () => void;
  checkStatus: string;
  adjustmentOpen: boolean;
  onToggleAdjustment: () => void;
  onApplyAdjustment: () => void;
}) {
  const phase = judgementPhase(state.settings.startDate);
  const hotel = items.find((item) => item.type === "hotel");
  const meals = items.filter((item) => item.type === "restaurant");
  const reservations = items.filter((item) => item.reservation !== "none");
  const placeFor = (item: DetailRailItem) =>
    state.places.find((place) => place.id === item.placeId);

  return (
    <div className={styles.sidebar} data-detail-sidebar>
      <header
        className={styles.sidebarHeader}
        tabIndex={-1}
        data-detail-heading
      >
        <span>DAY {summary.day} · EXECUTION</span>
        <h2>{phase === "planning" ? "AI 行程检查" : "AI 实时行程"}</h2>
        <p>
          {phase === "planning"
            ? "Planning Review · 本地确定性规则模拟"
            : "Execution Monitor · 无实时 Provider 的界面演示"}
        </p>
      </header>

      <section className={styles.statusGrid} aria-label="当日状态计数">
        <StatusCard
          tone="normal"
          label="正常 / 合格"
          value={summary.aiCounts.normal}
        />
        <StatusCard
          tone="warning"
          label="需要确认"
          value={summary.aiCounts.warning}
        />
        <StatusCard
          tone="error"
          label="有问题"
          value={summary.aiCounts.error}
        />
        <StatusCard
          tone="reservation"
          label="预约待确认"
          value={summary.reservationUnknownCount}
        />
      </section>

      <section
        className={styles.summaryCard}
        aria-labelledby="day-summary-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <span>{summary.date}</span>
            <h3 id="day-summary-title">{summary.route}</h3>
          </div>
          <span className={styles.sampleBadge}>Mock</span>
        </div>
        <p className={styles.weather}>{summary.weather}</p>
        <dl className={styles.metricGrid}>
          <Metric
            label="行程时间"
            value={`${summary.startTime}–${summary.endTime}`}
          />
          <Metric label="活动时长" value={`${summary.activityMinutes} 分`} />
          <Metric label="交通时间" value={`${summary.transportMinutes} 分`} />
          <Metric label="步行" value={summary.walkingDistance} />
          <Metric label="行程项目" value={`${summary.itemCount} 项`} />
          <Metric
            label="硬约束 / 可调整"
            value={`${summary.hardConstraintCount} / ${summary.flexibleCount}`}
          />
        </dl>
      </section>

      <details className={styles.detailGroup} open>
        <summary>预计开销 · {yen.format(summary.expenses.total)}</summary>
        <dl className={styles.expenseGrid}>
          <Metric label="交通" value={yen.format(summary.expenses.transport)} />
          <Metric
            label="停车 / 高速"
            value={yen.format(summary.expenses.parkingHighway)}
          />
          <Metric
            label="门票 / 活动"
            value={yen.format(summary.expenses.ticketsActivities)}
          />
          <Metric label="餐饮" value={yen.format(summary.expenses.dining)} />
          <Metric label="住宿" value={yen.format(summary.expenses.lodging)} />
          <Metric label="其他" value={yen.format(summary.expenses.other)} />
        </dl>
        <small>估算仅用于界面演示，不是报价、订单或真实结算。</small>
      </details>

      <details className={styles.detailGroup} open>
        <summary>住宿 / 餐饮</summary>
        <div className={styles.executionList}>
          <article>
            <strong>{hotel?.title ?? "当晚住宿待确认"}</strong>
            <span>入住 {hotel?.startTime ?? "--:--"} · 退房次日 10:00</span>
            <span>
              {hotel ? `${placeFor(hotel)?.city} · 示例地址` : "地址待确认"}
            </span>
            <span>停车：需确认 · 早餐：示例含早餐</span>
            <span>{hotel?.reservationLabel ?? "预约状态未知"}</span>
          </article>
          <article>
            <strong>午餐 / 晚餐</strong>
            {meals.length ? (
              meals.map((meal) => (
                <button
                  key={meal.id}
                  type="button"
                  onClick={() => onLocate(meal.id)}
                >
                  {meal.startTime} · {meal.title} · {meal.reservationLabel}
                </button>
              ))
            ) : (
              <span>推荐时间 12:30 / 18:30 · {summary.city}顺路餐饮区域</span>
            )}
          </article>
        </div>
      </details>

      <details className={styles.detailGroup} open>
        <summary>预约 / 交通 / 提醒</summary>
        <div className={styles.locateList}>
          {reservations.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onLocate(item.id)}
            >
              <span>{item.startTime}</span>
              <strong>{item.title}</strong>
              <small>{item.reservationLabel}</small>
            </button>
          ))}
          {!reservations.length ? <p>今天没有需要预约的项目。</p> : null}
        </div>
        <ul className={styles.reminders}>
          <li>Transit / driving：沿用当前 Mock 路线，尚未接 Provider。</li>
          <li>P+R / parking：到场前需确认停车与换乘条件。</li>
          <li>Critical transfer：固定预约前至少保留 15 分钟缓冲。</li>
          <li>Departure reminder：建议首项前 20 分钟准备出发。</li>
        </ul>
      </details>

      <div className={styles.aiActions}>
        <button type="button" onClick={onRecheck}>
          AI 重新检查
        </button>
        <button type="button" onClick={onToggleAdjustment}>
          调整后续行程
        </button>
      </div>
      <p className={styles.saveStatus} role="status">
        {checkStatus}
      </p>

      {adjustmentOpen ? (
        <section className={styles.adjustmentPreview} aria-label="AI 调整预览">
          <h3>模拟调整预览</h3>
          <p>
            <strong>Current</strong> 固定预约前缓冲 10 分钟
          </p>
          <p>
            <strong>Suggested</strong> 将前一项提前 15 分钟结束
          </p>
          <p>
            <strong>Diff</strong> 只调整后续一项，不覆盖整条时间轴
          </p>
          <div>
            <button type="button" onClick={onToggleAdjustment}>
              保持原计划
            </button>
            <button type="button" onClick={onApplyAdjustment}>
              应用建议（本地）
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StatusCard({
  tone,
  label,
  value,
}: {
  tone: "normal" | "warning" | "error" | "reservation";
  label: string;
  value: number;
}) {
  return (
    <article data-tone={tone}>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
