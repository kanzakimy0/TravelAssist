import { useState } from "react";
import type { Dispatch } from "react";
import {
  currentPlan,
  pendingItems,
  reservationLabel,
  timeConflicts,
} from "../model/trip-model";
import type { TripAction, TripItem, TripState } from "../model/trip-model";
import { PlannerOverlay } from "./planner-overlay";
import styles from "../planner.module.css";

export function BookingChecklist({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const plan = currentPlan(state),
    pending = pendingItems(plan);
  const all = plan.items
    .filter((item) => item.reservationRequired)
    .sort((a, b) => a.day - b.day || a.startTime.localeCompare(b.startTime));
  return (
    <PlannerOverlay
      title="完成预约"
      kind="detail"
      onClose={() => dispatch({ type: "ui", patch: { bookingOpen: false } })}
    >
      <div className={styles.detailBody}>
        <h3>
          {pending.length
            ? `当前方案 · 待预约 ${pending.length} 项`
            : "✓ 关键预约已完成"}
        </h3>
        <p className={styles.hint}>
          仅为本地 Mock 清单，未连接任何订单 /
          支付服务。“前往预约”仅选择演示渠道，不会真实下单。真实预约请在渠道核实后手动标记。
        </p>
        {all.length === 0 && (
          <p>还没有需要预约的安排，可从地图区域或地点详情加入。</p>
        )}
        <div className={styles.bookingList}>
          {all.map((item) => (
            <BookingItem
              key={item.id}
              item={item}
              state={state}
              dispatch={dispatch}
            />
          ))}
        </div>
        <p className={styles.feedback} role="status">
          {state.notice}
        </p>
      </div>
    </PlannerOverlay>
  );
}
function BookingItem({
  item,
  state,
  dispatch,
}: {
  item: TripItem;
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const [time, setTime] = useState(item.startTime);
  const place = state.places.find((p) => p.id === item.placeId)!;
  const pending = pendingItems(currentPlan(state)).some(
    (i) => i.id === item.id,
  );
  const conflicts = timeConflicts(currentPlan(state), item, time);
  return (
    <article data-booking-item={item.id}>
      <h4>
        Day {item.day}
        {item.endDay > item.day ? `–${item.endDay}` : ""} · {item.title}
      </h4>
      <p>
        {item.date} · {item.startTime} ·{" "}
        <strong>{reservationLabel(item)}</strong>
        {item.fixedTime ? " · 固定时间" : ""}
        {item.type === "hotel"
          ? ` · ${item.endDay - item.day + 1} 晚 / 一笔预约`
          : ""}
      </p>
      {pending ? (
        <>
          <div className={styles.offerList}>
            {place.bookingOptions.map((o) => (
              <article key={o.providerId}>
                <strong>
                  {o.name}
                  {o.official ? " · 官方优先" : ""}
                </strong>
                <p>
                  示例 ¥{o.price?.toLocaleString("ja-JP")} ·{" "}
                  {o.availabilityStatus === "limited" ? "示例有限" : "库存未知"}
                </p>
                <small>
                  {o.cancellationSummary} ·{" "}
                  {o.affiliate ? "联盟渠道示例" : "非联盟示例"}
                </small>
                <button
                  type="button"
                  aria-pressed={item.providerId === o.providerId}
                  onClick={() =>
                    dispatch({
                      type: "provider",
                      id: item.id,
                      providerId: o.providerId,
                    })
                  }
                >
                  {item.providerId === o.providerId
                    ? "✓ 已选渠道"
                    : "前往预约（演示）"}{" "}
                  · {o.name}
                </button>
              </article>
            ))}
          </div>
          {item.providerId && (
            <div className={styles.confirmBooking}>
              <label className={styles.field}>
                确认预约时间
                <input
                  aria-label={`${item.title}确认预约时间`}
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </label>
              <p>
                原计划 {item.startTime} → 确认 {time || "请选择时间"}
                。确认后固定该时段，不会自动覆盖真实订单。
              </p>
              {conflicts.length > 0 && (
                <p className={styles.feedback}>
                  请核对前后安排：{conflicts.join("、")} 与停留 / 15
                  分缓冲重叠。
                </p>
              )}
              <button
                type="button"
                className={styles.primaryAction}
                disabled={!time}
                onClick={() =>
                  dispatch({ type: "complete", id: item.id, time })
                }
              >
                我已完成预约（手动标记）
              </button>
            </div>
          )}
        </>
      ) : (
        <p>✓ 已记录手动确认。真实订单查询、取消、支付不在当前范围。</p>
      )}
    </article>
  );
}
