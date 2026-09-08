import { useEffect, useRef, useState, type Dispatch } from "react";
import {
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
import cards from "../secondary-cards.module.css";
import { MovementPanel } from "./movement-panel";
import { AreaRecommendations } from "./area-recommendations";
import { DailyHealthPanel } from "./daily-health-panel";
import { useWorkspaceCapabilities } from "./workspace-capabilities";

export function SecondaryPanels({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const { canBook, enterDetail } = useWorkspaceCapabilities();
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
    booking: "预约",
    weather: "备选",
    stayFood: "住宿与餐饮",
    details: "旅行体检",
    itinerary: "行程",
  }[tab];
  const ticketItems = model.tickets;
  const [alternativeKind, setAlternativeKind] = useState("rain");
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
    if (canBook) dispatch({ type: "ui", patch: { bookingOpen: true } });
    else enterDetail();
  }
  const from = model.plan.items.find((i) => i.id === preview?.from),
    to = state.places.find((p) => p.id === preview?.to);
  const custom =
    tab === "movement" ? (
      <MovementPanel state={state} dispatch={dispatch} />
    ) : tab === "stayFood" ? (
      <AreaRecommendations state={state} dispatch={dispatch} />
    ) : tab === "details" && mode === "day" ? (
      <DailyHealthPanel state={state} dispatch={dispatch} />
    ) : null;
  return (
    <>
      {custom ?? (
        <div
          ref={region}
          className={`${ui.secondary} ${cards.panel}`}
          data-secondary-panel={tab}
          data-range-mode={mode}
        >
          <section className={cards.collection} aria-label={title + "内容"}>
            {tab === "booking" && (
              <>
                {ticketItems.length === 0 && (
                  <article className={cards.card}>
                    <span className={cards.eyebrow}>购票清单</span>
                    <h4>当前范围没有需要预约的门票项目</h4>
                    <p>
                      此处只查看门票安排。酒店、餐饮及购票操作在行程详情管理。
                    </p>
                  </article>
                )}
                {ticketItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={cards.card}
                    data-item={item.id}
                    aria-pressed={state.ui.selectedTripItemId === item.id}
                    onClick={() => select(item)}
                  >
                    <span className={cards.eyebrow}>
                      Day {item.day} · {item.startTime}
                    </span>
                    <strong className={cards.cardTitle}>{item.title}</strong>
                    <span className={cards.badge}>
                      {reservationLabel(item)}
                    </span>
                    <p>
                      {item.fixedTime ? "固定时间 · " : "时间可调整 · "}
                      {model.travelers} 人
                    </p>
                    <small>
                      {item.providerId ?? "渠道待选择"} · 取消规则待核对
                      {state.places
                        .find((p) => p.id === item.placeId)
                        ?.bookingOptions.some(
                          (o) =>
                            o.availabilityStatus === "available" ||
                            o.availabilityStatus === "limited",
                        )
                        ? " · 样例可用（非实时）"
                        : " · 库存未核对"}
                    </small>
                    <span className={cards.cardLink}>定位景点 →</span>
                  </button>
                ))}
              </>
            )}
            {tab === "weather" &&
              model.rows.map((row) => (
                <article key={row.day.day} className={cards.card}>
                  <span className={cards.eyebrow}>天气与替代安排 · 示例</span>
                  <h4>
                    Day {row.day.day} · {row.day.city}
                  </h4>
                  <p>{row.day.weather.join(" · ")}</p>
                  {mode === "all" && (
                    <p>
                      结构风险：
                      {row.day.city === "东京"
                        ? "户外步行受降雨影响"
                        : "山景能见度 / 强风影响交通"}
                      ，保留室内日与城际缓冲。
                    </p>
                  )}
                  {
                    <>
                      {row.outdoors
                        .slice(0, mode === "day" ? 4 : 2)
                        .map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            data-item={item.id}
                            aria-pressed={
                              state.ui.selectedTripItemId === item.id
                            }
                            onClick={() => select(item)}
                          >
                            {item.startTime}–{item.endTime} {item.title}
                            {isProtectedItem(item)
                              ? " · 受保护"
                              : " · 户外影响"}
                          </button>
                        ))}
                      {state.places
                        .filter(
                          (p) =>
                            p.city === row.day.city &&
                            ["attraction", "activity"].includes(p.type) &&
                            !p.planningPlaceholder &&
                            (alternativeKind === "rain"
                              ? /室内|展馆|博物馆/.test(
                                  p.name + p.tags.join(" "),
                                )
                              : alternativeKind === "light"
                                ? p.duration <= 90
                                : !p.tags.some((t) => /热门|经典/.test(t))) &&
                            !model.plan.items.some((i) => i.placeId === p.id),
                        )
                        .slice(0, mode === "day" ? 3 : 2)
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
                      {!row.outdoors.length && (
                        <p>本日没有已排户外景点；保留休息与交通缓冲。</p>
                      )}
                      {row.outdoors.length > 0 &&
                        row.outdoors.every(isProtectedItem) && (
                          <p>户外项目均受保护，请在详情处理后再替换。</p>
                        )}
                      <button
                        type="button"
                        onClick={() =>
                          dispatch({
                            type: "range",
                            mode: "day",
                            start: row.day.day,
                          })
                        }
                      >
                        查看第{row.day.day}天安排
                      </button>
                    </>
                  }
                </article>
              ))}
            {tab === "details" &&
              model.rows.map((row) => (
                <article key={row.day.day} className={cards.card}>
                  <span className={cards.eyebrow}>行程强度 · 本地检查</span>
                  <h4 className={cards.healthHeading}>
                    Day {row.day.day} · {row.items.length} 项安排
                    <button
                      type="button"
                      onClick={() =>
                        dispatch({ type: "focusDay", day: row.day.day })
                      }
                    >
                      定位 Day {row.day.day}
                    </button>
                  </h4>
                  <dl className={cards.metrics}>
                    <div>
                      <dt>活动 / 分</dt>
                      <dd>{row.playMinutes}</dd>
                    </div>
                    <div>
                      <dt>已估交通 / 分</dt>
                      <dd>
                        {row.estimatedTravel}
                        {row.unknownLegs > 0 ? "+" : ""}
                      </dd>
                    </div>
                    <div>
                      <dt>受保护 / 项</dt>
                      <dd>{row.items.filter(isProtectedItem).length}</dd>
                    </div>
                  </dl>
                  <p>
                    {row.span} · {row.unknownLegs}段交通待估 ·{" "}
                    {row.tightLegs.length}段衔接待核对
                  </p>
                  <p>
                    餐饮 {row.mealSlots.filter((s) => s.item).length}/3 已选 ·{" "}
                    {row.stays.some((s) => !s.planningPlaceholder)
                      ? "住宿地点已选（非预约确认）"
                      : "住宿地点待选"}
                  </p>
                  {row.issues.slice(0, mode === "day" ? 3 : 2).map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      onClick={() =>
                        select(row.items.find((i) => i.id === issue.id)!)
                      }
                    >
                      <strong>{issue.title}</strong> · {issue.reason}
                    </button>
                  ))}
                  {!row.issues.length && (
                    <p>
                      ✓ 未发现本地时间结构冲突；营业时间和实际交通仍需核对。
                    </p>
                  )}
                  <p>
                    {mode === "day"
                      ? "检查营业时间、步行负担和预约前缓冲。"
                      : mode === "threeDays"
                        ? "比较三日强度；城市变化需检查前一晚住宿与次日第一站。"
                        : "检查城市顺序、换酒店次数及固定节点；不展开市内琐碎交通。"}
                  </p>
                </article>
              ))}
          </section>
          <aside
            className={`${ui.actions} ${cards.controls}`}
            aria-label={title + "操作"}
          >
            <h4>{tab === "details" ? "建议与操作" : "下一步"}</h4>
            <strong>{model.scopeTitle}</strong>
            <p>
              {mode === "day"
                ? "查看当前日的具体安排与待办"
                : mode === "threeDays"
                  ? "逐日比较负荷、预约与跨城衔接"
                  : "全程覆盖检查；每张日卡可进入单日"}
            </p>
            {tab === "booking" && (
              <>
                <p>
                  {ticketItems.length} 项需预约 · {model.summary.pendingTickets}{" "}
                  项待处理 · {model.summary.confirmedTickets} 项已确认
                </p>
                <p>无需预约的景点不展示；样例渠道不代表真实库存。</p>
                <button type="button" onClick={booking}>
                  {canBook ? "管理预约（详情）" : "进入详情处理购票"}
                </button>
                {canBook &&
                  ["查看凭证", "上传凭证", "联系渠道"].map((text) => (
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
                <div
                  className={ui.alternativeChoices}
                  role="group"
                  aria-label="备选调整目标"
                >
                  {[
                    ["rain", "雨天室内"],
                    ["light", "减少体力"],
                    ["crowd", "避开热门"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      aria-pressed={alternativeKind === id}
                      onClick={() => setAlternativeKind(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
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
                  查看样例说明
                </button>
              </>
            )}
            {tab === "details" && (
              <>
                <p>
                  {model.summary.issues} 项结构 / 地点待办 ·{" "}
                  {model.summary.unknownLegs}段交通待估 ·{" "}
                  {model.summary.switches}次城市衔接
                </p>
                <p>① 预约前预留 15 分缓冲</p>
                <p>② 换酒店日检查行李衔接</p>
                <p>③ 长途移动日减少户外强度</p>
                <button
                  type="button"
                  onClick={() =>
                    dispatch({
                      type: "ui",
                      patch: { isMoreSettingsOpen: true },
                    })
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
                  dispatch({
                    type: "range",
                    mode: "day",
                    start: focused.day.day,
                  })
                }
              >
                进入 Day {focused.day.day} 单日
              </button>
            )}
            <small role="status">{message}</small>
          </aside>
        </div>
      )}
      {preview && from && to && (
        <PlannerOverlay
          kind="detail"
          title="备选行程影响预览"
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
                    reservation: false,
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
