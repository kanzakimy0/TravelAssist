import { useEffect, useRef, useState, type Dispatch } from "react";
import {
  isoDay,
  reservationLabel,
  type TripAction,
  type TripItem,
  type TripState,
} from "../model/trip-model";
import {
  isProtectedItem,
  secondaryPanelModel,
} from "../model/secondary-panels";
import { PlannerOverlay } from "./planner-overlay";
import ui from "../planner-v05.module.css";

export function SecondaryPanels({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const model = secondaryPanelModel(state),
    tab = state.ui.activeBottomTab,
    mode = state.ui.rangeMode;
  const [preview, setPreview] = useState<{ from: string; to: string } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const region = useRef<HTMLDivElement>(null);
  const focused =
    model.rows.find((row) => row.day.day === state.ui.focusedDay) ??
    model.rows[0];
  const title = {
    movement: "移动概览",
    booking: "预约与票务",
    weather: "天气与备选",
    stayFood: "住宿与餐饮",
    details: "旅行体检",
    itinerary: "行程",
  }[tab];
  const selectedVisible =
    !!model.selected && model.items.some((i) => i.id === model.selected!.id);
  useEffect(() => {
    const node = region.current?.querySelector<HTMLElement>(
      '[data-item="' + state.ui.selectedTripItemId + '"]',
    );
    if (node)
      node.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "instant",
      });
  }, [state.ui.selectedTripItemId, tab]);
  function select(item: TripItem) {
    if (state.ui.selectedTripItemId === item.id)
      dispatch({ type: "inspect", id: item.placeId, level: "detail" });
    else dispatch({ type: "select", id: item.id });
  }
  function booking() {
    dispatch({ type: "ui", patch: { bookingOpen: true } });
  }
  const from = model.plan.items.find((i) => i.id === preview?.from),
    to = state.places.find((p) => p.id === preview?.to);
  return (
    <>
      <div ref={region} className={ui.secondary} data-secondary-panel={tab}>
        <section aria-label={title}>
          <h3>{title}</h3>
          <small>
            {mode === "day"
              ? "当日执行"
              : mode === "threeDays"
                ? "连续三日对比"
                : "全行程结构"}{" "}
            · 本地示例，非实时数据
          </small>
          {tab === "movement" && (
            <>
              <div className={ui.metrics}>
                <span>
                  <strong>
                    {model.rows.reduce((n, r) => n + r.travelMinutes, 0)}分
                  </strong>
                  时段间隙 / 含移动缓冲
                </span>
                <span>
                  <strong>
                    {model.rows.reduce((n, r) => n + r.legs.length, 0)}
                  </strong>
                  接驳段
                </span>
              </div>
              <p>步行、换乘次数及费用待核对；不冒充实时路线计算。</p>
            </>
          )}
          {tab === "booking" && (
            <>
              <div
                className={ui.summaryRing}
                aria-label={
                  "已完成 " + model.completed + " / " + model.bookings.length
                }
              >
                {model.completed}/{model.bookings.length}
              </div>
              <p>
                已确认 / 需预约 · {model.bookings.length - model.completed}{" "}
                项待处理
              </p>
              <p>
                最近安排：
                {model.bookings.find(
                  (i) => !["booked", "ticketed"].includes(i.reservationStatus),
                )?.title ?? "暂无待办"}
              </p>
            </>
          )}
          {tab === "weather" && (
            <>
              <p>{focused.day.weather[0]}</p>
              <p>季节 / 样例参考，非实时预报</p>
              <p>
                户外节点 {model.rows.reduce((n, r) => n + r.outdoors.length, 0)}{" "}
                项 · 留意降雨 / 能见度
              </p>
            </>
          )}
          {tab === "stayFood" && (
            <>
              <p>{mode === "all" ? "城市住宿轨迹" : "今晚住宿与跨日衔接"}</p>
              <p>
                {model.items.filter((i) => i.type === "hotel").length}{" "}
                个住宿安排
              </p>
              <p>已确认酒店是次日出发锚点；不会重新推荐替换区域。</p>
            </>
          )}
          {tab === "details" && (
            <>
              <p>本地可解释规则 · 非 AI 评分</p>
              <div className={ui.healthBar} aria-label="活动与移动时段占比">
                <span
                  style={{
                    flex: model.rows.reduce((n, r) => n + r.playMinutes, 0),
                  }}
                />
                <span
                  style={{
                    flex: model.rows.reduce((n, r) => n + r.travelMinutes, 0),
                  }}
                />
              </div>
              <p>
                活动 {model.rows.reduce((n, r) => n + r.playMinutes, 0)} 分 /
                移动缓冲 {model.rows.reduce((n, r) => n + r.travelMinutes, 0)}{" "}
                分
              </p>
              <p>
                步行、交通费用待核对；地点示例费用 ¥
                {model.items
                  .reduce(
                    (n, i) =>
                      n +
                      (state.places.find((p) => p.id === i.placeId)?.price ??
                        0),
                    0,
                  )
                  .toLocaleString()}
              </p>
            </>
          )}
          {model.selected && (
            <p className={ui.selectedHint} role="status">
              地图已选：{model.selected.title}
              {!selectedVisible
                ? " · 当前范围外，保留当前 Tab"
                : " · 对应内容已定位；无同类条目时仅显示此提示"}
            </p>
          )}
        </section>
        <section aria-label={title + "内容"}>
          {tab === "movement" &&
            model.rows.map((row) => (
              <article key={row.day.day}>
                <h4>
                  Day {row.day.day} · {row.day.city}
                </h4>
                {mode === "all" ? (
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "focusDay", day: row.day.day })
                    }
                  >
                    {row.day.city} →{" "}
                    {model.plan.days.find((d) => d.day === row.day.day + 1)
                      ?.city ?? "返程机场"}{" "}
                    · 城际衔接示例
                  </button>
                ) : (
                  <div className={ui.chain}>
                    {row.legs.map((leg) => (
                      <button
                        key={leg.id}
                        type="button"
                        data-item={leg.id}
                        aria-pressed={state.ui.selectedTripItemId === leg.id}
                        onClick={() => select(leg.from)}
                      >
                        <strong>
                          {leg.from.title} → {leg.to.title}
                        </strong>
                        <span>{leg.label}</span>
                        <small>
                          {leg.from.endTime}–{leg.to.startTime} · 间隙{" "}
                          {leg.minutes} 分
                        </small>
                        <small>距离 / 票价待核对 · {leg.warning}</small>
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
          {tab === "booking" && (
            <>
              {model.bookings.length === 0 && <p>当前范围暂无关键预约。</p>}
              {model.bookings.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  data-item={item.id}
                  aria-pressed={state.ui.selectedTripItemId === item.id}
                  onClick={() => select(item)}
                >
                  <strong>
                    Day {item.day} · {item.startTime} {item.title}
                  </strong>
                  <p>
                    {reservationLabel(item)}
                    {item.fixedTime ? " · 固定时间" : ""} · {model.travelers} 人
                  </p>
                  <small>
                    {item.providerId ?? "渠道待选择"} · 提前 15 分报到（示例） ·
                    取消截止须核对渠道
                  </small>
                </button>
              ))}
            </>
          )}
          {tab === "weather" &&
            model.rows.map((row) => (
              <article key={row.day.day}>
                <h4>
                  Day {row.day.day} · {row.day.city}
                </h4>
                <p>{row.day.weather.join(" · ")}</p>
                {mode === "all" ? (
                  <p>
                    结构风险：
                    {row.day.city === "东京"
                      ? "户外步行受降雨影响"
                      : "山景能见度 / 强风影响交通"}
                    ，保留室内日与城际缓冲。
                  </p>
                ) : (
                  <>
                    {row.outdoors.map((item) => (
                      <button
                        type="button"
                        key={item.id}
                        data-item={item.id}
                        aria-pressed={state.ui.selectedTripItemId === item.id}
                        onClick={() => select(item)}
                      >
                        {item.startTime}–{item.endTime} {item.title}
                        {isProtectedItem(item) ? " · 受保护" : " · 户外影响"}
                      </button>
                    ))}
                    {state.places
                      .filter(
                        (p) =>
                          p.city === row.day.city &&
                          p.type === "attraction" &&
                          /室内|展馆|博物馆/.test(p.name) &&
                          !model.plan.items.some((i) => i.placeId === p.id),
                      )
                      .slice(0, 2)
                      .map((place) => (
                        <button
                          type="button"
                          key={place.id}
                          disabled={
                            !row.outdoors.some((i) => !isProtectedItem(i))
                          }
                          onClick={() =>
                            setPreview({
                              from: row.outdoors.find(
                                (i) => !isProtectedItem(i),
                              )!.id,
                              to: place.id,
                            })
                          }
                        >
                          预览替换 · {place.name}
                        </button>
                      ))}
                  </>
                )}
              </article>
            ))}
          {tab === "stayFood" &&
            model.rows.map((row) => (
              <article key={row.day.day}>
                <h4>
                  Day {row.day.day} · {row.day.city}
                </h4>
                {row.stays.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    data-item={item.id}
                    aria-pressed={state.ui.selectedTripItemId === item.id}
                    onClick={() => select(item)}
                  >
                    <strong>
                      {item.title} · {reservationLabel(item)}
                    </strong>
                    <p>
                      {isoDay(state.settings.startDate, item.day)} 入住 →{" "}
                      {isoDay(state.settings.startDate, item.endDay + 1)} 退房 ·{" "}
                      {item.endDay - item.day + 1} 晚
                    </p>
                    <small>
                      当日终点 → 次日出发锚点 · 早餐 / 停车待酒店确认
                    </small>
                  </button>
                ))}
                {!row.stays.length && <p>暂无住宿安排 / 当日返程</p>}
                {model.areas
                  .filter(
                    (a) => a.day === row.day.day && a.type === "hotelArea",
                  )
                  .map((area) => (
                    <button
                      type="button"
                      key={area.id}
                      onClick={() =>
                        dispatch({
                          type: "inspect",
                          id: area.id,
                          level: "area",
                        })
                      }
                    >
                      {area.name} · 尚未确认
                    </button>
                  ))}
                {row.meals
                  .filter((i) => mode !== "all" || i.fixedTime)
                  .slice(0, 3)
                  .map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      data-item={item.id}
                      aria-pressed={state.ui.selectedTripItemId === item.id}
                      onClick={() => select(item)}
                    >
                      {item.startTime} {item.title} · {reservationLabel(item)}
                      <small>
                        {" "}
                        ·{" "}
                        {state.places
                          .find((p) => p.id === item.placeId)
                          ?.tags.slice(0, 3)
                          .join(" / ")}{" "}
                        · 忌口须确认
                      </small>
                    </button>
                  ))}
                {row.meals.length < 2 && mode !== "all" && (
                  <p>用餐缺口：请核对午餐 / 晚餐窗口</p>
                )}
              </article>
            ))}
          {tab === "details" &&
            model.rows.map((row) => (
              <article key={row.day.day}>
                <h4>
                  Day {row.day.day} · {row.items.length} 项安排
                </h4>
                <p>
                  活动 {row.playMinutes} 分 / 移动缓冲 {row.travelMinutes} 分 ·{" "}
                  {row.items.filter(isProtectedItem).length} 项受保护
                </p>
                <p>
                  {mode === "day"
                    ? "检查营业时间、步行负担和预约前缓冲。"
                    : mode === "threeDays"
                      ? "比较三日强度；城市变化需检查前一晚住宿与次日第一站。"
                      : "检查城市顺序、换酒店次数及固定节点；不展开市内琐碎交通。"}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({ type: "focusDay", day: row.day.day })
                  }
                >
                  定位 Day {row.day.day}
                </button>
              </article>
            ))}
        </section>
        <aside className={ui.actions} aria-label={title + "操作"}>
          <h4>{tab === "details" ? "建议与操作" : "下一步"}</h4>
          {tab === "movement" && (
            <>
              <p>交通时刻 / 距离 / 换乘为待核对信息，未接实时服务。</p>
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "ui", patch: { isMoreSettingsOpen: true } })
                }
              >
                调整移动偏好
              </button>
            </>
          )}
          {tab === "booking" && (
            <>
              <button type="button" onClick={booking}>
                完成预约
              </button>
              {["查看凭证", "上传凭证", "联系渠道"].map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() =>
                    setMessage(text + "：本地占位，未上传文件或联系渠道。")
                  }
                >
                  {text}
                </button>
              ))}
            </>
          )}
          {tab === "weather" && (
            <>
              <p>
                {mode === "threeDays"
                  ? "可比较晴天安排户外、雨天保留室内；固定预约不自动换日。"
                  : "替换前核对营业时间和接驳；不移动预约或住宿。"}
              </p>
              <button
                type="button"
                onClick={() =>
                  setMessage("已显示本地天气样例；没有调用实时天气服务。")
                }
              >
                核对样例来源
              </button>
            </>
          )}
          {tab === "stayFood" && (
            <>
              <button type="button" onClick={booking}>
                核对住宿 / 餐饮预约
              </button>
              <p>酒店预算及饮食限制沿用已保存偏好；不自动取消已确认安排。</p>
            </>
          )}
          {tab === "details" && (
            <>
              <p>① 预约前预留 15 分缓冲</p>
              <p>② 换酒店日检查行李衔接</p>
              <p>③ 长途移动日减少户外强度</p>
              <button
                type="button"
                onClick={() =>
                  dispatch({ type: "ui", patch: { isMoreSettingsOpen: true } })
                }
              >
                调整偏好
              </button>
            </>
          )}
          {mode !== "day" && (
            <button
              type="button"
              onClick={() =>
                dispatch({ type: "range", mode: "day", start: focused.day.day })
              }
            >
              进入 Day {focused.day.day} 单日
            </button>
          )}
          <small role="status">{message}</small>
        </aside>
      </div>
      {preview && from && to && (
        <PlannerOverlay
          kind="detail"
          title="天气备选影响预览"
          onClose={() => setPreview(null)}
        >
          <div className={ui.impact}>
            <h3>
              {from.title} → {to.name}
            </h3>
            <p>
              Day {from.day} · 原时段 {from.startTime}–{from.endTime}
              ；新停留示例 {to.duration} 分。接驳时间 /
              步行变化须核对，不伪造计算。
            </p>
            <p>
              受保护节点：
              {model.protected.map((i) => i.title).join("、") || "暂无"}
              ，固定预约与住宿不会被替换。
            </p>
            <footer>
              <button type="button" onClick={() => setPreview(null)}>
                取消
              </button>
              <button
                type="button"
                disabled={isProtectedItem(from)}
                onClick={() => {
                  dispatch({
                    type: "add",
                    placeId: to.id,
                    day: from.day,
                    reservation: to.bookingRequired,
                    replaceId: from.id,
                  });
                  setPreview(null);
                }}
              >
                确认本地替换
              </button>
            </footer>
          </div>
        </PlannerOverlay>
      )}
    </>
  );
}
