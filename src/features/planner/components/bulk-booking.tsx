import { useEffect, useRef, useState } from "react";
import type { TripState } from "../model/trip-model";
import { buildBookingReview, type BookingReview } from "../model/bulk-booking";
import { PlannerPopover } from "./planner-popover";
import css from "../bulk-booking.module.css";

const money = (value: number) =>
  new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0,
  }).format(value);

export function BulkBookingButton({
  state,
  onStart,
  busy = false,
  day,
}: {
  state: TripState;
  onStart: (review: BookingReview) => void;
  busy?: boolean;
  day?: number;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [review, setReview] = useState<BookingReview | null>(null);
  const [remaining, setRemaining] = useState(3);
  const deadline = useRef(Infinity);
  const submitted = useRef(false);
  const signature = JSON.stringify(buildBookingReview(state, day));
  const stale = review !== null && JSON.stringify(review) !== signature;
  useEffect(() => {
    if (!review) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const frame = requestAnimationFrame(() => {
      deadline.current = Date.now() + 3000;
      interval = setInterval(
        () =>
          setRemaining(
            Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)),
          ),
        100,
      );
    });
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
      deadline.current = Infinity;
    };
  }, [review]);
  const open = () => {
    deadline.current = Infinity;
    submitted.current = false;
    setRemaining(3);
    setReview(buildBookingReview(state, day));
  };
  return (
    <>
      <button
        ref={trigger}
        type="button"
        data-bulk-booking-trigger
        className={review ? css.confirm : undefined}
        aria-expanded={Boolean(review)}
        disabled={Boolean(
          busy ||
          (review && !stale && (remaining > 0 || review.rows.length === 0)),
        )}
        onClick={() => {
          if (busy) return;
          if (!review || stale) {
            open();
            return;
          }
          if (
            Date.now() < deadline.current ||
            submitted.current ||
            !review.rows.length
          )
            return;
          submitted.current = true;
          onStart(review);
          setReview(null);
        }}
      >
        {busy
          ? "预约状态已打开"
          : !review
            ? day === undefined
              ? "全程预约"
              : "预约当日待办"
            : stale
              ? "内容已变更 · 重新核对"
              : remaining > 0
                ? `确认并预约（${remaining}s）`
                : "确认并预约（演示）"}
      </button>
      {review && (
        <PlannerPopover
          id="bulk-booking-review"
          title="核对价格与预约内容"
          trigger={trigger}
          placement="review"
          className={css.reviewPopover}
          onClose={() => setReview(null)}
        >
          <div className={css.review}>
            <p className={css.notice}>
              演示模式 ·
              未查询网站，也不会真实下单。以下仅比较现有示例价格，不代表全网最低价或有效库存。
            </p>
            <p>
              <strong>{review.planName}</strong>
              <br />
              {review.travelers} ·{" "}
              {review.day === undefined ? "全方案" : `第 ${review.day} 天`}{" "}
              {review.rows.length} 项待预约
            </p>
            {stale && (
              <p role="alert">
                行程已更改，请点击“重新核对”，再等待 3 秒确认。
              </p>
            )}
            <div className={css.reviewRows}>
              {review.rows.map((row) => (
                <article key={row.id}>
                  <header>
                    <strong>{row.title}</strong>
                    <span>
                      {row.date} · {row.time}
                      {row.nights ? ` · ${row.nights} 晚` : ""}
                    </span>
                  </header>
                  {row.offers.length ? (
                    <>
                      <p>
                        示例最低单价 <b>{money(row.offers[0].price)}</b> ·{" "}
                        {row.offers[0].name}
                      </p>
                      <div className={css.offers}>
                        {row.offers.map((offer) => (
                          <div key={offer.providerId}>
                            <span>{offer.name}</span>
                            <strong>{money(offer.price)}</strong>
                            <small>{offer.terms}</small>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p>价格待查询 · 目前没有可比较的渠道报价</p>
                  )}
                </article>
              ))}
              {!review.rows.length && (
                <p>没有待预约项目。请先从餐饮、住宿或门票加入预约。</p>
              )}
            </div>
            <p className={css.footnote}>
              人数、房型、餐型、税费、库存及取消条件尚未核实，不计算真实订单总价。
            </p>
            <p role="status">
              {remaining > 0
                ? `请核对内容，${remaining} 秒后可点击右侧按钮。`
                : "可点击右侧“确认并预约（演示）”查看处理进度。"}
            </p>
          </div>
        </PlannerPopover>
      )}
    </>
  );
}

export function BulkBookingProgress({
  review,
  onClose,
}: {
  review: BookingReview;
  onClose: () => void;
}) {
  const [processed, setProcessed] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
    let value = 0;
    const timer = setInterval(() => {
      value = Math.min(value + 1, review.rows.length);
      setProcessed(value);
      if (value === review.rows.length) clearInterval(timer);
    }, 550);
    return () => clearInterval(timer);
  }, [review.rows.length]);
  const done = processed === review.rows.length;
  return (
    <section
      className={css.progress}
      data-booking-progress
      aria-label="预约进度与状态"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header>
        <div>
          <small>BOOKING · 演示工作区</small>
          <h2 ref={heading} tabIndex={-1}>
            预约进度与状态
          </h2>
          <p>
            {review.planName} · {review.travelers}
          </p>
        </div>
        <button type="button" onClick={onClose}>
          返回地图
        </button>
      </header>
      <p className={css.notice}>
        仅模拟核对流程，未调用渠道或支付服务。不会新增真实订单，也不会把已有行程改为已预约。
      </p>
      <div className={css.summary} role="status">
        <strong>
          {processed} / {review.rows.length}
        </strong>
        <span>
          {done ? "核对演示完成 · 等待外部渠道接入" : "正在整理示例预约资料…"}
        </span>
      </div>
      <div className={css.progressRows}>
        {review.rows.map((row, index) => (
          <article key={row.id} data-prepared={index < processed}>
            <span className={css.step}>{index < processed ? "!" : "○"}</span>
            <div>
              <h3>{row.title}</h3>
              <p>
                {row.date} · {row.time}
              </p>
              <small>
                {row.offers.length
                  ? `示例参考 ${money(row.offers[0].price)} · ${row.offers[0].name}`
                  : "价格待查询"}
              </small>
            </div>
            <strong>
              {index < processed
                ? row.offers.length
                  ? "资料就绪 · 未提交"
                  : "缺少报价 · 待处理"
                : "等待整理"}
            </strong>
          </article>
        ))}
      </div>
      <footer>
        订单确认 0 笔 · 支付 0 笔 · 请在获得真实报价与条款后，再决定是否下单。
      </footer>
    </section>
  );
}
