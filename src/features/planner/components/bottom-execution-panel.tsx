import type { Dispatch, KeyboardEvent } from "react";
import type { BottomTab } from "../model/planner-types";
import {
  currentPlan,
  cityStays,
  stayNights,
  itemsForDay,
  presentationPlan,
  rangeDays,
  reservationLabel,
  visibleAreas,
} from "../model/trip-model";
import type { TripAction, TripDay, TripState } from "../model/trip-model";
import { ItineraryTimeline } from "./itinerary-timeline";
import { ProportionalTimeline } from "./proportional-timeline";
import { PlannerIcon } from "./planner-icon";
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
  state,
  dispatch,
  onSelect,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
  onSelect: (id: string) => void;
}) {
  const plan = currentPlan(state),
    days = rangeDays(state),
    tab = state.ui.activeBottomTab;
  const focused = days.find((d) => d.day === state.ui.focusedDay) ?? days[0];
  const mode = state.ui.rangeMode;
  const changeTab = (tab: BottomTab) =>
    dispatch({ type: "ui", patch: { activeBottomTab: tab } });
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % 6
        : event.key === "ArrowLeft"
          ? (index + 5) % 6
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 5
              : -1;
    if (next < 0) return;
    event.preventDefault();
    changeTab(bottomTabs[next][0]);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  return (
    <section
      className={styles.bottomPanel}
      data-bottom-panel
      data-bottom-range={mode}
      aria-label="范围执行面板"
      data-bottom-plan={plan.name}
    >
      <div className={styles.executionSummary}>
        <strong className={styles.rangeHeading}>
          {mode === "day"
            ? `Day ${focused.day} · ${presentationPlan(state).days.find((day) => day.day === focused.day)!.date} · ${focused.city}`
            : mode === "threeDays"
              ? `Day ${days[0].day}–${days.at(-1)!.day} · 三日衔接`
              : "全行程 · 城市与旅行结构"}
        </strong>
        <span className={styles.todayStatus}>
          {mode === "day" ? focused.weather[0] : "范围切换不改变当前方案与预约"}{" "}
          · Mock
        </span>
      </div>
      <div
        className={styles.bottomTabs}
        role="tablist"
        aria-label="行程执行分类"
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
            onKeyDown={(e) => tabKey(e, index)}
            onClick={() => changeTab(id)}
          >
            <PlannerIcon
              name={
                (
                  [
                    "clock",
                    "transport",
                    "booking",
                    "sun",
                    "stay",
                    "layers",
                  ] as const
                )[index]
              }
            />
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
        {tab === "itinerary" && mode !== "all" ? (
          <ProportionalTimeline state={state} dispatch={dispatch} />
        ) : mode === "day" ? (
          <DayContent
            state={state}
            day={focused}
            tab={tab}
            dispatch={dispatch}
            onSelect={onSelect}
          />
        ) : mode === "threeDays" ? (
          <div className={styles.rangeCards}>
            {days.map((day) => (
              <article key={day.day} data-expanded={focused.day === day.day}>
                <button
                  type="button"
                  aria-expanded={focused.day === day.day}
                  onClick={() => dispatch({ type: "focusDay", day: day.day })}
                >
                  Day {day.day} · {day.city}{" "}
                  {focused.day === day.day ? "−" : "+"}
                </button>
                <p>{rangeSummary(state, day, tab)}</p>
                {focused.day === day.day && (
                  <DayContent
                    state={state}
                    day={day}
                    tab={tab}
                    dispatch={dispatch}
                    onSelect={onSelect}
                    compact
                  />
                )}
                <button
                  type="button"
                  className={styles.textAction}
                  onClick={() =>
                    dispatch({ type: "range", mode: "day", start: day.day })
                  }
                >
                  进入 Day {day.day} 单日
                </button>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.rangeCards}>
            {Array.from(new Set(days.map((d) => d.city))).map((city) => {
              const group = days.filter((d) => d.city === city),
                first = group[0];
              const stays = cityStays(state, city);
              const next = days.find((d) => d.day > group.at(-1)!.day);
              const bookings = plan.items.filter(
                (i) =>
                  i.reservationRequired &&
                  group.some((d) => i.day === d.day) &&
                  (i.type !== "restaurant" || i.fixedTime),
              );
              const summary: Record<BottomTab, string[]> = {
                itinerary: [
                  `${group.length} 天 · ${stays.length ? `${stayNights(stays)} 晚` : "不在本城过夜"}`,
                  next
                    ? `${city} → ${next.city} · 城际接驳`
                    : `${city} → 羽田机场 · 返程接驳`,
                ],
                movement: [
                  next
                    ? `${city} → ${next.city} · 高速巴士 / 城际交通示例`
                    : "小田原枢纽 → 羽田机场 · 电车示例",
                  "长距离移动与行李衔接；市内步行 / 小交通已隐藏",
                ],
                booking: bookings.length
                  ? bookings.map((i) => `${i.title} · ${reservationLabel(i)}`)
                  : ["本段无关键预约"],
                weather: [
                  `${city}旅行风险：${city === "东京" ? "降雨可能影响户外步行" : "山景能见度 / 强风可能影响户外活动"}`,
                  "保留室内替代与城际移动缓冲，非实时预报",
                ],
                stayFood: [
                  stays.length
                    ? stays
                        .map(
                          (i) =>
                            `${i.title} · ${i.endDay - i.day + 1} 晚 · ${reservationLabel(i)}`,
                        )
                        .join("；")
                    : "无需新增住宿",
                  ...plan.items
                    .filter(
                      (i) =>
                        i.type === "restaurant" &&
                        i.fixedTime &&
                        group.some((d) => d.day === i.day),
                    )
                    .map(
                      (i) =>
                        `${i.title} · ${i.startTime} 固定餐饮 · ${reservationLabel(i)}`,
                    ),
                  "这里只显示住宿结构与固定餐饮；普通餐厅请进入单日",
                ],
                details: [
                  `旅行健康检查：${city} · ${group.length} 天`,
                  `固定安排 ${plan.items.filter((i) => i.fixedTime && group.some((d) => i.day === d.day)).length} 项；长途移动 / 换酒店需预留缓冲`,
                  "费用、气象、线路为示例；出行前必须核对真实来源",
                ],
              };
              return (
                <article key={city}>
                  <button
                    type="button"
                    aria-pressed={state.ui.focusedDay === first.day}
                    onClick={() =>
                      dispatch({ type: "focusDay", day: first.day })
                    }
                  >
                    {city} · D{group.map((d) => d.day).join("/")} · 聚焦地图
                  </button>
                  <ul>
                    {summary[tab].map((text) => (
                      <li key={text}>{text}</li>
                    ))}
                  </ul>
                  {tab === "booking" && (
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({ type: "ui", patch: { bookingOpen: true } })
                      }
                    >
                      管理关键预约
                    </button>
                  )}
                  <div className={styles.placeActions}>
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "range",
                          mode: "day",
                          start: first.day,
                        })
                      }
                    >
                      查看单日
                    </button>
                    <button
                      type="button"
                      disabled={days.length < 3}
                      onClick={() =>
                        dispatch({
                          type: "range",
                          mode: "threeDays",
                          start: first.day,
                        })
                      }
                    >
                      查看三日
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
function rangeSummary(state: TripState, day: TripDay, tab: BottomTab) {
  const items = itemsForDay(currentPlan(state), day.day);
  if (tab === "movement")
    return `${day.city} · 主要交通 / 跨日接驳，${day.day > 1 ? "衔接前一晚住宿" : "机场到达"}`;
  if (tab === "booking")
    return `关键预约 ${items.filter((i) => i.reservationRequired).length} 项 · 按日期核对`;
  if (tab === "weather") return day.weather[0] + " · 三日天气对比";
  if (tab === "stayFood")
    return (
      items
        .filter((i) => i.type === "hotel")
        .map((i) => i.title)
        .join(" / ") || "当日返程，核对跨日住宿连接"
    );
  if (tab === "details")
    return `三日衔接分析：Day ${day.day} · ${items.filter((i) => i.fixedTime).length} 个固定时段`;
  return items
    .filter((i) => i.type !== "restaurant")
    .slice(0, 3)
    .map((i) => i.title)
    .join(" → ");
}
function DayContent({
  state,
  day,
  tab,
  dispatch,
  onSelect,
  compact = false,
}: {
  state: TripState;
  day: TripDay;
  tab: BottomTab;
  dispatch: Dispatch<TripAction>;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  const plan = currentPlan(state),
    items = itemsForDay(plan, day.day);
  if (tab === "itinerary" && !compact)
    return (
      <ItineraryTimeline
        day={presentationPlan(state).days.find((d) => d.day === day.day)!}
        selectedStopId={state.ui.selectedTripItemId}
        onSelect={onSelect}
      />
    );
  if (tab === "itinerary")
    return (
      <div className={styles.compactStops}>
        {items.map((i) => (
          <button
            key={i.id}
            type="button"
            aria-pressed={i.id === state.ui.selectedTripItemId}
            data-timeline-stop={i.id}
            onClick={() => onSelect(i.id)}
          >
            {i.startTime} {i.title} · {reservationLabel(i)}
          </button>
        ))}
      </div>
    );
  if (tab === "booking")
    return (
      <div className={styles.bookingSummary}>
        {items
          .filter((i) => i.reservationRequired)
          .map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() =>
                dispatch({ type: "ui", patch: { bookingOpen: true } })
              }
            >
              {i.startTime} {i.title} · {reservationLabel(i)}
              {i.fixedTime ? " · 固定" : ""} · 提前 15 分
            </button>
          ))}
        {!items.some((i) => i.reservationRequired) && (
          <p>这一天没有待处理的预约 / 票务。</p>
        )}
      </div>
    );
  if (tab === "stayFood")
    return (
      <div className={styles.bookingSummary}>
        {items
          .filter((i) => ["hotel", "restaurant"].includes(i.type))
          .map((i) => (
            <button
              type="button"
              key={i.id}
              onClick={() =>
                dispatch({ type: "inspect", id: i.placeId, level: "detail" })
              }
            >
              {i.startTime} {i.title} · {reservationLabel(i)}
            </button>
          ))}
        {visibleAreas(state)
          .filter((a) => a.day === day.day)
          .map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() =>
                dispatch({ type: "inspect", id: a.id, level: "area" })
              }
            >
              {a.name} · 查看推荐
            </button>
          ))}
      </div>
    );
  const texts =
    tab === "movement"
      ? compact
        ? day.movement.slice(0, 2)
        : [
            ...items
              .slice(0, -1)
              .map(
                (i, n) =>
                  `${i.title} → ${items[n + 1].title} · ${i.next ?? "步行 / 接驳约 15 分（示例）"}`,
              ),
            ...day.movement,
          ]
      : tab === "weather"
        ? day.weather
        : [
            `Day ${day.day} · ${items.length} 项安排 / ${items.filter((i) => i.fixedTime).length} 个固定时段`,
            `顺序：${items.map((i) => i.title).join(" → ")}`,
            "营业时间 / 费用为示例；点击地点查看对当前行程的影响。未接 AI 或路线计算。",
          ];
  return (
    <ul className={styles.detailCards}>
      {texts.map((text) => (
        <li key={text}>{text}</li>
      ))}
    </ul>
  );
}
