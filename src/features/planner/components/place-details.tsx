import { useState } from "react";
import type { Dispatch } from "react";
import {
  currentPlan,
  itemsForDay,
  isoDay,
  reservationLabel,
  visibleAreas,
} from "../model/trip-model";
import type {
  PlannerPlace,
  PlaceType,
  TripAction,
  TripState,
} from "../model/trip-model";
import { PlannerOverlay } from "./planner-overlay";
import styles from "../planner.module.css";

const typeLabels: Record<PlaceType, string> = {
  attraction: "景点",
  activity: "活动 / 门票",
  hotel: "酒店",
  restaurant: "餐厅",
  transport: "交通枢纽",
};
export function PlaceArtwork({ place }: { place: PlannerPlace }) {
  return (
    <svg
      className={styles.placeArtwork}
      viewBox="0 0 300 130"
      role="img"
      aria-label={`${place.name} · 类型示意插画，非实景照片`}
    >
      <rect width="300" height="130" fill="#ece5d9" />
      <circle cx="236" cy="32" r="21" fill="#e7bd9f" />
      <path d="M0 85Q75 30 150 80T300 63V130H0Z" fill="#c8d1c7" />
      <path d="M0 112Q100 65 185 108T300 95V130H0Z" fill="#aebfc0" />
      <g
        fill="#fbf4e9"
        stroke="#80695d"
        strokeWidth="2.5"
        strokeLinejoin="round"
      >
        {place.type === "hotel" ? (
          <>
            <path d="M85 104V44H186V104Z" />
            <path d="M73 44L136 20L198 44Z" />
            <path d="M103 59H121V75H103ZM150 59H168V75H150ZM126 104V83H148V104" />
          </>
        ) : place.type === "restaurant" ? (
          <>
            <path d="M93 70Q145 128 197 70Z" />
            <path d="M86 68H202M157 54L194 24M170 57L211 31" />
            <path d="M121 55Q107 45 124 31M143 55Q129 41 147 25" fill="none" />
          </>
        ) : place.type === "transport" ? (
          <>
            <rect x="88" y="34" width="110" height="61" rx="12" />
            <path d="M99 47H187V73H99ZM106 102L97 113M180 102L190 113" />
            <circle cx="109" cy="85" r="4" />
            <circle cx="177" cy="85" r="4" />
          </>
        ) : (
          <>
            <path d="M95 105L136 26L176 105Z" />
            <path d="M118 59H154M105 84H166M129 40H143" />
            <path d="M77 107H194" />
          </>
        )}
      </g>
      <text x="12" y="20" fontSize="10" fill="#655951">
        {typeLabels[place.type]} · MOCK ILLUSTRATION
      </text>
    </svg>
  );
}
export function PlaceActions({
  state,
  place,
  dispatch,
  day,
}: {
  state: TripState;
  place: PlannerPlace;
  dispatch: Dispatch<TripAction>;
  day: number;
}) {
  const plan = currentPlan(state);
  const item = plan.items.find(
    (i) => i.placeId === place.id && (i.day === day || place.type === "hotel"),
  );
  const [nights, setNights] = useState(1);
  const replaceable = itemsForDay(plan, day).find(
    (i) =>
      ["attraction", "activity"].includes(i.type) && !i.locked && !i.fixedTime,
  );
  return (
    <div className={styles.placeActions}>
      {!item && place.type === "hotel" && (
        <label className={styles.nightsField}>
          入住 {isoDay(state.settings.startDate, day)} · 晚数{" "}
          <input
            aria-label="入住晚数"
            type="number"
            min="1"
            max={Math.max(1, plan.days.length - day)}
            value={nights}
            onChange={(e) =>
              setNights(
                Math.max(
                  1,
                  Math.min(
                    Math.max(1, plan.days.length - day),
                    Number(e.target.value) || 1,
                  ),
                ),
              )
            }
          />
          （一笔住宿预约）
        </label>
      )}
      {!item && (
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: "add",
              placeId: place.id,
              day,
              reservation: false,
              nights,
            })
          }
        >
          加入行程
        </button>
      )}
      {place.bookingRequired && !item?.reservationRequired && (
        <button
          type="button"
          className={styles.primaryAction}
          onClick={() =>
            dispatch({
              type: "add",
              placeId: place.id,
              day,
              reservation: true,
              nights,
            })
          }
        >
          加入预约
        </button>
      )}
      {item?.reservationRequired && (
        <button
          type="button"
          onClick={() => dispatch({ type: "ui", patch: { bookingOpen: true } })}
        >
          {reservationLabel(item)} · 查看预约
        </button>
      )}
      {!item &&
        replaceable &&
        ["attraction", "activity"].includes(place.type) && (
          <button
            type="button"
            onClick={() =>
              dispatch({
                type: "add",
                placeId: place.id,
                day,
                reservation: false,
                replaceId: replaceable.id,
              })
            }
          >
            替换 {replaceable.title}
          </button>
        )}
      {item && (
        <>
          <button
            type="button"
            onClick={() => dispatch({ type: "lock", id: item.id })}
          >
            {item.locked ? "解除编辑锁定" : "锁定安排"}
          </button>
          <button
            type="button"
            disabled={item.fixedTime || item.locked}
            onClick={() => dispatch({ type: "remove", id: item.id })}
          >
            移出行程
          </button>
        </>
      )}
    </div>
  );
}
export function PlaceDetails({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const inspection = state.ui.inspection;
  if (!inspection) return null;
  const close = () => dispatch({ type: "ui", patch: { inspection: null } });
  const plan = currentPlan(state);
  const area = state.areas.find((a) => a.id === inspection.id);
  if (area)
    return (
      <PlannerOverlay kind="detail" title={area.name} onClose={close}>
        <div className={styles.detailBody}>
          <p className={styles.kicker}>
            DAY {area.day} /{" "}
            {area.type === "hotelArea" ? "住宿区域" : "餐饮区域"}
          </p>
          <h3>先选合适区域，再选具体地点</h3>
          <p>{area.reason}</p>
          <p>{area.access}</p>
          <p>{area.tradeoff}</p>
          <p>{area.price} · 非实时价格</p>
          <h3>
            {area.type === "hotelArea" ? "区域内酒店推荐" : "区域内餐厅推荐"} ·
            3 个示例
          </h3>
          <div className={styles.placeRecommendations}>
            {area.recommendationIds.map((id) => {
              const p = state.places.find((p) => p.id === id)!;
              return (
                <article key={id}>
                  <PlaceArtwork place={p} />
                  <h4>{p.name}</h4>
                  <p>{p.why}</p>
                  <p>{p.tags.join(" · ")}</p>
                  <p>
                    示例 ¥{p.price.toLocaleString("ja-JP")} ·{" "}
                    {p.type === "hotel"
                      ? "房 / 晚；早餐、停车与取消政策见详情"
                      : "每人；约 60 分钟，建议预约"}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "inspect", id, level: "detail" })
                    }
                  >
                    查看{p.name}详细
                  </button>
                  <PlaceActions
                    state={state}
                    place={p}
                    dispatch={dispatch}
                    day={area.day}
                  />
                </article>
              );
            })}
          </div>
          <p role="status" className={styles.feedback}>
            {state.notice}
          </p>
        </div>
      </PlannerOverlay>
    );
  const place = state.places.find((p) => p.id === inspection.id);
  if (!place) return null;
  const item = plan.items.find((i) => i.placeId === place.id);
  const day =
    item?.day ??
    state.areas.find((a) => a.recommendationIds.includes(place.id))?.day ??
    state.ui.focusedDay;
  const dayItems = itemsForDay(plan, day),
    index = item ? dayItems.indexOf(item) : -1;
  const before = index > 0 ? dayItems[index - 1] : dayItems[0];
  const after = index >= 0 ? dayItems[index + 1] : dayItems[1];
  const quick = inspection.level === "quick";
  const parent = state.areas.find((a) =>
    a.recommendationIds.includes(place.id),
  );
  return (
    <PlannerOverlay
      kind={quick ? "quick" : "detail"}
      title={place.name}
      onClose={close}
    >
      <div className={styles.detailBody}>
        <PlaceArtwork place={place} />
        <p className={styles.kicker}>
          {typeLabels[place.type]} / {place.city} / DAY {day}
        </p>
        <p>
          <strong>{item ? reservationLabel(item) : "推荐 · 未加入行程"}</strong>{" "}
          · 建议停留 {place.duration} 分钟 ·{" "}
          {item
            ? `${item.startTime}–${item.endTime}${item.fixedTime ? " · 固定时间" : ""}`
            : "时间待安排"}
        </p>
        <p>
          {place.hours} · {place.bookingRequired ? "建议提前预约" : "无需预约"}
        </p>
        <p className={styles.hint}>
          前：{before?.title ?? "当天出发点"} → 本站 → 后：
          {after?.title ?? "当天终点"}；{before?.next ?? "示例接驳约 15 分"}
        </p>
        <div className={styles.tags}>
          {place.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        {!quick && (
          <>
            {parent && (
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "inspect", id: parent.id, level: "area" })
                }
              >
                ← 返回{parent.name}
              </button>
            )}
            <section>
              <h3>为什么适合您的这一天</h3>
              <p>
                {place.why}。当前偏好：{state.settings.sights}；
                {state.settings.travelers}；{state.settings.pace}。
              </p>
              <p>
                天气策略：{state.settings.weather}。
                {place.tags.some((t) => t.includes("室内"))
                  ? "这是附近的室内雨天备选。"
                  : "如遇降雨，请核对开放情况或改选附近室内展馆。"}
              </p>
            </section>
            <section>
              <h3>
                {place.type === "hotel"
                  ? "入住与路线衔接"
                  : place.type === "restaurant"
                    ? "用餐建议"
                    : "游览建议"}
              </h3>
              <p>{place.advice}</p>
              <p>
                {place.type === "hotel"
                  ? `入住 ${item?.date ?? isoDay(state.settings.startDate, day)} / 退房 ${isoDay(state.settings.startDate, (item?.endDay ?? day) + 1)}；当天最后一站与次日车站接驳约 15–25 分。`
                  : place.type === "restaurant"
                    ? "推荐菜：当季定食 / 乡土料理；排队示例 15–30 分。需确认座位、过敏原与用餐时段。"
                    : "建议提前 15 分到场；营业时间与无障碍设施需出发前再次核对。"}
              </p>
            </section>
            <section>
              <h3>对当前行程的影响</h3>
              <p>
                {item
                  ? `已在 Day ${day} ${item.startTime} 的行程中；${item.fixedTime ? "固定预约受保护" : "可调整，替换前请核对前后安排"}。`
                  : `若加入，示例增加约 ${place.duration + 15} 分钟与约 1.2 km 绕路；餐厅 / 酒店将替换该日未锁定的同类占位安排。`}
              </p>
              <p>
                时间影响为 Mock
                说明，不是实时计算。固定预约不会被替换；新增停留可能与后续行程冲突，请核对。
              </p>
            </section>
            <section>
              <h3>预约渠道与价格参考</h3>
              <p>
                同一地点的多个渠道，不是不同酒店 /
                餐厅。价格、余量与取消条款均为示例，未查询实时库存。
              </p>
              <div className={styles.offerList}>
                {place.bookingOptions.map((option) => (
                  <article key={option.providerId}>
                    <strong>
                      {option.name}
                      {option.official ? " · 官方优先" : ""}
                    </strong>
                    <p>
                      示例 ¥{option.price?.toLocaleString("ja-JP")} ·{" "}
                      {option.availabilityStatus === "limited"
                        ? "示例有限"
                        : "余量未知"}
                    </p>
                    <small>
                      {option.cancellationSummary} ·{" "}
                      {option.affiliate
                        ? "联盟渠道示例，可能有佣金；本页不跳转"
                        : "非联盟渠道示例"}
                    </small>
                  </article>
                ))}
              </div>
            </section>
            <section>
              <h3>附近餐饮与住宿</h3>
              <div className={styles.placeActions}>
                {visibleAreas(state)
                  .filter((a) => a.day === day)
                  .map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() =>
                        dispatch({ type: "inspect", id: a.id, level: "area" })
                      }
                    >
                      {a.name}
                    </button>
                  ))}
              </div>
            </section>
          </>
        )}
        <PlaceActions
          key={place.id}
          state={state}
          place={place}
          dispatch={dispatch}
          day={day}
        />
        {quick && (
          <button
            type="button"
            className={styles.detailLink}
            onClick={() =>
              dispatch({ type: "inspect", id: place.id, level: "detail" })
            }
          >
            查看详细 →
          </button>
        )}
        <p role="status" className={styles.feedback}>
          {state.notice}
        </p>
      </div>
    </PlannerOverlay>
  );
}
