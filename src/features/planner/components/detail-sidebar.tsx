import {
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import type {
  DetailDaySummary,
  DetailRailItem,
} from "../model/detail-workspace";
import type { TripState } from "../model/trip-model";
import type { MealSlot } from "../model/trip-model";
import { PlannerPopover } from "./planner-popover";
import { PlannerIcon } from "./planner-icon";
import { BulkBookingButton } from "./bulk-booking";
import type { BookingReview } from "../model/bulk-booking";
import css from "../detail-sidebar-fixed.module.css";
import { currentPlan, isoDay } from "../model/trip-model";
import type { previewScheduleAdjustment } from "../model/schedule-check";
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
  onBulkBooking,
  bookingBusy,
  onArea,
  onManageItem,
  onQueueItem,
  adjustment,
  overviewDays,
  onOverviewDay,
  onMissing,
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
  onBulkBooking: (review: BookingReview) => void;
  bookingBusy: boolean;
  onArea: (id: string, mealSlot?: MealSlot) => void;
  onManageItem: (id: string, kind: "booking" | "replace") => void;
  onQueueItem: (id: string) => void;
  adjustment: ReturnType<typeof previewScheduleAdjustment>;
  overviewDays?: { summary: DetailDaySummary; items: DetailRailItem[] }[];
  onOverviewDay?: (day: number) => void;
  onMissing: (type: "hotel" | "restaurant") => void;
}) {
  const adjustTrigger = useRef<HTMLButtonElement>(null);
  const allTrigger = useRef<HTMLButtonElement>(null);
  const [allBookings, setAllBookings] = useState(false);
  const hotels = items.filter((item) => item.type === "hotel");
  const meals = items.filter((item) => item.type === "restaurant");
  const allItems = overviewDays
    ? [
        ...new Map(
          overviewDays
            .flatMap((day) => day.items)
            .map((item) => [item.id, item]),
        ).values(),
      ]
    : items;
  const counts = allItems.reduce(
    (counts, item) => ({
      ...counts,
      [item.aiStatus]: counts[item.aiStatus] + 1,
    }),
    { normal: 0, warning: 0, error: 0 },
  );
  const reservations = allItems.filter((item) => item.reservation !== "none");
  const expenses = overviewDays
    ? overviewDays.reduce(
        (total, day) =>
          Object.fromEntries(
            Object.entries(total).map(([key, value]) => [
              key,
              value + day.summary.expenses[key as keyof typeof total],
            ]),
          ) as typeof total,
        {
          ...summary.expenses,
          transport: 0,
          parkingHighway: 0,
          ticketsActivities: 0,
          dining: 0,
          lodging: 0,
          other: 0,
          total: 0,
        },
      )
    : summary.expenses;
  const areaFor = (type: string) =>
    state.areas.find((area) => area.day === summary.day && area.type === type);
  const openArea = (type: string, mealSlot?: MealSlot) => {
    const area = areaFor(type);
    if (area) onArea(area.id, mealSlot);
    else onMissing(type === "hotelArea" ? "hotel" : "restaurant");
  };
  return (
    <div
      className={css.sidebar}
      data-detail-sidebar
      data-trip-overview-sidebar={Boolean(overviewDays) || undefined}
    >
      <header className={css.header} tabIndex={-1} data-detail-heading>
        <div>
          {overviewDays ? (
            <small>{overviewDays.length} 天 · 全程建议</small>
          ) : (
            <small>DAY {summary.day} · 本地规则检查</small>
          )}
          <h2>{overviewDays ? "行程总览" : "当日行程"}</h2>
        </div>
        <div
          className={css.counts}
          aria-label={overviewDays ? "全程状态计数" : "当日状态计数"}
        >
          <div
            data-tone="normal"
            title="前三项为互斥检查状态；已执行不等于检查正常"
          >
            <strong>{counts.normal}</strong>
            <span>✓ 正常</span>
          </div>
          <div data-tone="warning">
            <strong>{counts.warning}</strong>
            <span>! 需确认</span>
          </div>
          <div data-tone="error">
            <strong>{counts.error}</strong>
            <span>! 有问题</span>
          </div>
          <div
            data-tone="booking"
            title="独立预约待办数量，可能与需确认或有问题重复，不与前三项相加"
          >
            <strong>
              {allItems.filter((item) => item.reservation === "unknown").length}
            </strong>
            <span>? 待预约</span>
          </div>
        </div>
      </header>
      <div className={css.upperSections}>
        <FixedSection title="行程建议" id="day-overview">
          {overviewDays && (
            <div className={css.overviewAdvice}>
              <strong>
                {overviewDays.length} 天 · 优先处理冲突，再补齐餐宿与预约
              </strong>
              {overviewDays.map(({ summary: day, items: dayItems }) => (
                <button
                  key={day.day}
                  type="button"
                  onClick={() => onOverviewDay?.(day.day)}
                >
                  第 {day.day} 天 · {day.city}：{day.aiCounts.error} 项冲突 /{" "}
                  {day.aiCounts.warning} 项需确认 · 餐饮{" "}
                  {
                    new Set(
                      dayItems
                        .filter((i) => i.type === "restaurant")
                        .map((i) =>
                          Number(i.startTime.slice(0, 2)) < 11
                            ? 0
                            : Number(i.startTime.slice(0, 2)) < 16
                              ? 1
                              : 2,
                        ),
                    ).size
                  }
                  /3 ·{" "}
                  {dayItems.some((i) => i.type === "hotel")
                    ? "住宿已安排"
                    : day.day === overviewDays.length
                      ? "返程日"
                      : "住宿待补充"}
                </button>
              ))}
            </div>
          )}
          {overviewDays ? (
            <>
              <strong>全程衔接检查</strong>
              <p>
                {allItems.length} 项安排 ·{" "}
                {new Set(overviewDays.map(({ summary: day }) => day.city)).size}{" "}
                个地区
              </p>
              <p>跨地区当天优先核对接驳、行李与入住时间，避免景点安排过满。</p>
              <p>蓝色待办先补齐三餐和住宿；已确认预约与锁定项目保持不动。</p>
            </>
          ) : (
            <>
              <strong>{summary.route}</strong>
              <p>
                {summary.startTime}–{summary.endTime} · {summary.itemCount}{" "}
                项行程
              </p>
              <p>
                交通 {summary.transportMinutes} 分 · 步行{" "}
                {summary.walkingDistance}
              </p>
              <p>{summary.weather}</p>
              <p>
                活动 {summary.activityMinutes} 分 · 固定{" "}
                {summary.hardConstraintCount} / 可调 {summary.flexibleCount}
              </p>
            </>
          )}
          <p>
            交通提醒 · 固定预约前建议预留 15 分钟；首项安排前 20 分钟准备出发。
          </p>
          <p>出行检查 · 核对停车、换乘和天气，优先保护已确认的预约。</p>
          <small>本地模拟建议，没有实时路况或库存数据。</small>
          <p>前三项为检查状态；待预约为独立待办，可能重复计数。</p>
        </FixedSection>
        {!overviewDays && (
          <>
            <SlotSection
              title="餐饮"
              id="dining"
              label="早中晚餐饮"
              summary={["早餐", "午餐", "晚餐"].map((label, index) => {
                const item = meals.find((meal) => {
                  const hour = Number(meal.startTime.split(":")[0]);
                  return (hour < 11 ? 0 : hour < 16 ? 1 : 2) === index;
                });
                return (
                  <p key={label}>
                    {label} · {item?.title ?? "尚未安排"}
                  </p>
                );
              })}
              rows={["早餐", "午餐", "晚餐"].map((label, index) => {
                const candidates = meals.filter((item) => {
                  const hour = Number(item.startTime.split(":")[0]);
                  return (hour < 11 ? 0 : hour < 16 ? 1 : 2) === index;
                });
                return (
                  <MealSlot
                    key={label}
                    label={label}
                    items={candidates}
                    onLocate={onLocate}
                    onManage={(id) => onManageItem(id, "booking")}
                    onQueue={onQueueItem}
                    onChoose={() =>
                      openArea(
                        "foodArea",
                        (["breakfast", "lunch", "dinner"] as const)[index],
                      )
                    }
                    canChoose
                  />
                );
              })}
            />
            <SlotSection
              title="住宿"
              id="lodging"
              label="当晚住宿"
              summary={<p>{hotels[0]?.title ?? "选择当晚酒店"}</p>}
              note={
                hotels.length ? (
                  hotels.map((hotel) => {
                    const record = currentPlan(state).items.find(
                      (i) => i.id === hotel.id,
                    );
                    return (
                      <p key={hotel.id}>
                        {record
                          ? `入住 ${isoDay(state.settings.startDate, record.day)} · 退房 ${isoDay(state.settings.startDate, record.endDay + 1)}`
                          : "入住与退房日期待补充"}
                        <br />
                        {hotel.reservation === "none"
                          ? "未加入预约"
                          : hotel.reservationLabel}{" "}
                        · 仅本地记录
                      </p>
                    );
                  })
                ) : (
                  <p>
                    {summary.day >= currentPlan(state).days.length
                      ? "返程日无需安排当晚住宿"
                      : "当晚住宿尚未安排，可通过推荐或新增行程补充"}
                  </p>
                )
              }
              rows={[
                <MealSlot
                  key="hotel"
                  label="当晚"
                  items={hotels}
                  placeholder="选择当晚酒店"
                  onLocate={onLocate}
                  onManage={(id) => onManageItem(id, "booking")}
                  onQueue={onQueueItem}
                  onChoose={() => openArea("hotelArea")}
                  onReplace={(id) => onManageItem(id, "replace")}
                  canChoose={
                    summary.day < currentPlan(state).days.length ||
                    hotels.length > 0
                  }
                />,
              ]}
            />
          </>
        )}
        <FixedSection
          title="预计开销"
          summaryValue={`已估算 ${yen.format(expenses.total)}*`}
          id="expenses"
          collapsed
        >
          <dl className={css.expenses}>
            {[
              ["交通", expenses.transport],
              ["停车 / 高速", expenses.parkingHighway],
              ["门票 / 活动", expenses.ticketsActivities],
              ["餐饮", expenses.dining],
              ["住宿", expenses.lodging],
              ["其他", expenses.other],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {["住宿", "停车 / 高速", "其他"].includes(String(label))
                    ? "待估算"
                    : yen.format(Number(value))}
                </dd>
              </div>
            ))}
          </dl>
          <p>
            仅成人及老人按示例每人单价计算交通、门票和餐饮；当前成人及老人共{" "}
            {state.configuration.travelers.adultMale +
              state.configuration.travelers.adultFemale +
              state.configuration.travelers.seniors}{" "}
            人。
          </p>
          <p>
            儿童、婴儿费用待核对；酒店须确定房型、房间数及每晚价格。停车、高速、税费及其他固定费用均待估算。
          </p>
          <small>* 已估算部分的小计，不是完整预算、报价或订单。</small>
        </FixedSection>
      </div>
      <section
        className={`${css.reservations} ${css.withVerticalTitle}`}
        aria-label="当日预约清单"
        data-fixed-section="reservations"
      >
        <h3 className={css.verticalTitle}>
          <span>预约</span>
        </h3>
        <div
          className={css.reservationList}
          tabIndex={0}
          aria-label="住宿餐饮与门票预约项目"
        >
          {reservations.map((item) => (
            <div
              className={css.reservation}
              key={item.id}
              data-reservation-item={item.id}
            >
              <button
                type="button"
                className={css.reservationInfo}
                onClick={() => onLocate(item.id)}
              >
                <strong>{item.title}</strong>
                <small>
                  {overviewDays ? `第${item.day}天 · ` : ""}
                  {item.startTime} · {item.reservationLabel}
                </small>
              </button>
              <button
                type="button"
                aria-label={item.title + " · 预约"}
                onClick={() => onManageItem(item.id, "booking")}
              >
                {item.reservation === "confirmed" ? "管理" : "预约"} →
              </button>
            </div>
          ))}
          {!reservations.length && (
            <p className={css.empty}>
              暂无预约项目
              <br />
              <small>从餐饮、住宿或行程卡加入预约。</small>
            </p>
          )}
        </div>
        <div className={css.queueNote} role="status">
          <span>{reservations.length} 项 · 加入不代表已下单</span>
          <div className={css.bookingFooterActions}>
            <button
              ref={allTrigger}
              type="button"
              onClick={() => setAllBookings(true)}
            >
              查看全程待办
            </button>
            <BulkBookingButton
              day={summary.day}
              state={state}
              onStart={onBulkBooking}
              busy={bookingBusy}
            />
          </div>
        </div>
        {allBookings && (
          <PlannerPopover
            id="all-booking-scope"
            title="全程预约待办"
            trigger={allTrigger}
            onClose={() => setAllBookings(false)}
            placement="review"
          >
            <div className={css.expanded}>
              <p>以下入口处理当前方案全部日期的待预约项目，不限于今天。</p>
              <BulkBookingButton
                state={state}
                onStart={(review) => {
                  setAllBookings(false);
                  onBulkBooking(review);
                }}
                busy={bookingBusy}
              />
            </div>
          </PlannerPopover>
        )}
      </section>
      <footer className={css.footer} data-fixed-ai-actions>
        <div>
          <button type="button" onClick={onRecheck}>
            重新检查
          </button>
          <button
            ref={adjustTrigger}
            type="button"
            aria-expanded={adjustmentOpen}
            onClick={onToggleAdjustment}
          >
            调整后续行程
          </button>
        </div>
        <p role="status">{checkStatus}</p>
      </footer>
      {adjustmentOpen && (
        <PlannerPopover
          id="fixed-adjustment-preview"
          title="调整后续行程"
          trigger={adjustTrigger}
          placement="above"
          onClose={onToggleAdjustment}
        >
          <div className={css.expanded}>
            <h3>本地时间调整预览</h3>
            <p>
              普通安排顺延以留出至少 15
              分钟缓冲；不移动固定或锁定项目，不代表实际交通时间足够。
            </p>
            {adjustment.changes.map((change) => (
              <p key={change.id}>
                {change.title}：{change.before} → {change.startTime}–
                {change.endTime}
              </p>
            ))}
            {adjustment.blockers.map((message) => (
              <p role="alert" key={message}>
                {message}
              </p>
            ))}
            {!adjustment.changes.length && !adjustment.blockers.length && (
              <p>当前无需调整时间。预约或地点信息仍需另外核对。</p>
            )}
            <p>应用后仍需检查具体时间，并在详情页保存。</p>
            <div className={css.actions}>
              <button type="button" onClick={onToggleAdjustment}>
                保持原计划
              </button>
              <button
                type="button"
                disabled={
                  !!adjustment.blockers.length || !adjustment.changes.length
                }
                onClick={onApplyAdjustment}
              >
                应用建议（本地）
              </button>
            </div>
          </div>
        </PlannerPopover>
      )}
    </div>
  );
}
function MealSlot({
  label,
  items,
  onLocate,
  onManage,
  onQueue,
  onChoose,
  canChoose,
  placeholder = "＋ 选择餐饮",
  onReplace,
}: {
  label: string;
  items: DetailRailItem[];
  onLocate: (id: string) => void;
  onManage: (id: string) => void;
  onQueue: (id: string) => void;
  onChoose: () => void;
  canChoose: boolean;
  placeholder?: string;
  onReplace?: (id: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const item = items[index] ?? items[0];
  return (
    <div className={css.meal} data-meal-slot={label}>
      <small>{label}</small>
      <button
        type="button"
        disabled={!item && !canChoose}
        onClick={() => (item ? onLocate(item.id) : onChoose())}
      >
        <strong>{item?.title ?? placeholder}</strong>
        {item && (
          <small>
            {item.startTime} ·{" "}
            {item.reservation === "none" ? "未加入预约" : item.reservationLabel}
          </small>
        )}
      </button>
      <div>
        {item ? (
          <>
            <button
              type="button"
              disabled={!canChoose}
              onClick={() => (onReplace ? onReplace(item.id) : onChoose())}
            >
              更换
            </button>
            <button
              type="button"
              onClick={() =>
                item.reservation === "none" && !item.draft
                  ? onQueue(item.id)
                  : onManage(item.id)
              }
            >
              {item.reservation === "none" ? "加入预约" : "查看预约"}
            </button>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setIndex((index + 1) % items.length)}
              >
                切换
              </button>
            )}
          </>
        ) : (
          <button type="button" disabled={!canChoose} onClick={onChoose}>
            选择
          </button>
        )}
      </div>
    </div>
  );
}
function SlotSection({
  title,
  id,
  label,
  rows,
  note,
}: {
  title: string;
  id: string;
  label: string;
  rows: ReactNode[];
  summary: ReactNode;
  note?: ReactNode;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [expanded, setExpanded] = useState(false);
  const overflow = rows.length > (id === "dining" ? 3 : 1);
  return (
    <section
      className={`${css.slotSection} ${css.withVerticalTitle}`}
      aria-label={label}
      data-slot-section={id}
      data-overflow={overflow}
      data-inline-open={expanded}
    >
      <div className={css.sectionBase} inert={expanded}>
        <h3 className={css.verticalTitle}>
          <span>{title}</span>
        </h3>
        <div ref={viewport} className={css.slotViewport}>
          <div className={css.meals}>{rows}</div>
        </div>
        {(overflow || expanded) && (
          <button
            ref={trigger}
            type="button"
            className={css.more}
            aria-label={"展开" + title}
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            更多{" "}
            <PlannerIcon
              name="chevron"
              style={{ transform: "rotate(90deg)" }}
            />
          </button>
        )}
      </div>
      {expanded && (
        <InlineExpansion
          id={"slots-" + id}
          title={title}
          trigger={trigger}
          onClose={() => setExpanded(false)}
        >
          <div className={css.expanded}>
            <div className={css.meals}>{rows}</div>
            {note && <div className={css.slotNote}>{note}</div>}
          </div>
        </InlineExpansion>
      )}
    </section>
  );
}
function FixedSection({
  title,
  id,
  children,
  collapsed = false,
  action,
  summaryValue,
}: {
  title: string;
  id: string;
  children: ReactNode;
  collapsed?: boolean;
  action?: ReactNode;
  summaryValue?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <section
      className={`${css.fixedSection} ${id !== "expenses" ? css.withVerticalTitle : ""}`}
      data-fixed-section={id}
      data-collapsed={collapsed}
      data-inline-open={expanded}
    >
      <div className={css.sectionBase} inert={expanded}>
        <h3 className={id !== "expenses" ? css.verticalTitle : undefined}>
          <span>{title}</span>
          {summaryValue && <strong>{summaryValue}</strong>}
          {action}
        </h3>
        {!collapsed && <div className={css.preview}>{children}</div>}
        <button
          className={css.expand}
          ref={trigger}
          type="button"
          aria-label={"展开" + title}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          <PlannerIcon name="chevron" style={{ transform: "rotate(90deg)" }} />
        </button>
      </div>
      {expanded && (
        <InlineExpansion
          id={"section-" + id}
          title={title}
          trigger={trigger}
          onClose={() => setExpanded(false)}
        >
          <div className={css.expanded}>{children}</div>
        </InlineExpansion>
      )}
    </section>
  );
}

function InlineExpansion({
  id,
  title,
  trigger,
  onClose,
  children,
}: {
  id: string;
  title: string;
  trigger: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: ReactNode;
}) {
  const surface = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  useLayoutEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useLayoutEffect(() => {
    const element = surface.current;
    const returnFocus = trigger.current;
    const section = element?.parentElement;
    if (!element || !section) return;
    function measure() {
      if (!element || !section) return;
      element.style.maxHeight = `${Math.max(section.clientHeight, window.innerHeight - section.getBoundingClientRect().top - 12)}px`;
    }
    measure();
    element
      .querySelector<HTMLButtonElement>("[data-inline-fold]")
      ?.focus({ preventScroll: true });
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    window.addEventListener("resize", measure);
    function outside(event: PointerEvent) {
      if (!(event.target instanceof Element)) return;
      // Keep this section in place while a nested hotel/restaurant picker is open.
      if (
        event.target.closest(
          '[role="dialog"], dialog, [data-planner-popover]',
        ) &&
        !section?.contains(event.target)
      )
        return;
      if (!section?.contains(event.target)) close.current();
    }
    function escape(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      if (event.target instanceof Element && !section?.contains(event.target))
        return;
      event.preventDefault();
      event.stopPropagation();
      close.current();
    }
    document.addEventListener("pointerdown", outside);
    section.addEventListener("keydown", escape);
    return () => {
      const restore = element.contains(document.activeElement);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      document.removeEventListener("pointerdown", outside);
      section.removeEventListener("keydown", escape);
      if (restore)
        requestAnimationFrame(() =>
          returnFocus?.focus({ preventScroll: true }),
        );
    };
  }, [trigger]);
  return (
    <div
      ref={surface}
      id={id}
      className={`${css.inlineExpansion} ${id !== "section-expenses" ? css.withVerticalTitle : ""}`}
      data-inline-expansion
    >
      <h3 className={id !== "section-expenses" ? css.verticalTitle : undefined}>
        <span>{title}</span>
      </h3>
      {children}
      <button
        type="button"
        data-inline-fold
        className={css.inlineFold}
        onClick={onClose}
        aria-expanded="true"
      >
        折叠{" "}
        <PlannerIcon name="chevron" style={{ transform: "rotate(-90deg)" }} />
      </button>
    </div>
  );
}
