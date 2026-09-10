import { useState, type Dispatch } from "react";
import type { DetailRailItem } from "../model/detail-workspace";
import {
  currentPlan,
  reservationLabel,
  timeConflicts,
  type TripState,
  type TripAction,
} from "../model/trip-model";
import { PlannerOverlay } from "./planner-overlay";
import { RecommendationRow } from "./place-details";
import css from "../detail-itinerary-board.module.css";

type View = "booking" | "message" | "cancel" | "replace";
export function DetailReservationPanel({
  item,
  kind,
  state,
  dispatch,
  message,
  onMessage,
  onReplaced,
  onClose,
  onView,
}: {
  item: DetailRailItem;
  kind: View;
  state: TripState;
  dispatch: Dispatch<TripAction>;
  message: string;
  onMessage: (message: string) => void;
  onReplaced: () => void;
  onClose: () => void;
  onView: (view: View) => void;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const [releaseConfirmed, setReleaseConfirmed] = useState(false);
  const [time, setTime] = useState(item.startTime);
  const [text, setText] = useState(message);
  const [notice, setNotice] = useState("");
  const plan = currentPlan(state);
  const record = plan.items.find((value) => value.id === item.id);
  const place = state.places.find((value) => value.id === item.placeId);
  const booked =
    record &&
    ["booked", "ticketed", "pay_on_site"].includes(record.reservationStatus);
  const protectedStay =
    record &&
    (record.fixedTime || record.locked || booked) &&
    record.reservationStatus !== "cancelled";
  const alternatives = state.places.filter(
    (value) =>
      value.type === "hotel" &&
      !value.planningPlaceholder &&
      value.city === place?.city &&
      value.id !== place.id &&
      !plan.items.some(
        (existing) => existing.id !== item.id && existing.placeId === value.id,
      ),
  );
  return (
    <PlannerOverlay
      title={`${item.title} · ${{ booking: "预约安排", message: "联系消息草稿", cancel: "记录渠道取消", replace: "更换酒店" }[kind]}`}
      kind="quick"
      onClose={onClose}
    >
      <div className={css.dialogBody}>
        <p className={css.disclaimer}>
          仅本地管理。不会真实下单、取消订单或发送消息；库存、价格、取消规则均需在原渠道核实。
        </p>
        {kind === "message" ? (
          <>
            <h3>准备给{item.type === "hotel" ? "酒店" : "商家"}的消息</h3>
            <div className={css.menuActions}>
              {[
                "您好，我预计较晚抵达，请问如何办理入住或入场？",
                "您好，请问能否提前寄存行李？",
                "您好，我想核对预约时间和人数，请协助确认。",
              ].map((template, index) => (
                <button
                  key={template}
                  type="button"
                  onClick={() => setText(template)}
                >
                  {["晚到说明", "寄存行李", "核对预约"][index]}
                </button>
              ))}
            </div>
            <label>
              消息内容
              <textarea
                maxLength={1000}
                rows={5}
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
            </label>
            <div className={css.dialogActions}>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(text);
                    setNotice("已复制，请自行粘贴到原预约渠道发送。");
                  } catch {
                    setNotice("无法自动复制，请选中文字手动复制。");
                  }
                }}
                disabled={!text.trim()}
              >
                复制消息
              </button>
              <button
                type="button"
                onClick={() => {
                  onMessage(text);
                  setNotice("消息已加入当前草稿，未发送；请保存行程以保留。");
                }}
              >
                保留消息草稿
              </button>
            </div>
          </>
        ) : kind === "cancel" ? (
          <>
            <h3>请先在原渠道取消</h3>
            <p>
              这里不会联系商家，也无法判断退款与取消费用。只在您已经完成渠道取消后更新本地记录。
            </p>
            <label className={css.confirm}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              我已在原渠道完成取消，并核对退款规则
            </label>
            <button
              type="button"
              disabled={!confirmed || !booked}
              onClick={() => {
                dispatch({
                  type: "recordCancellation",
                  id: item.id,
                  externallyCancelled: true,
                });
                onView("booking");
              }}
            >
              仅更新本地取消记录
            </button>
          </>
        ) : kind === "replace" ? (
          <>
            <h3>比较同城住宿</h3>
            <p>
              保留原入住日期与晚数。新酒店需要重新核对和预约，不会沿用旧渠道或旧订单。
            </p>
            {protectedStay && (
              <p className={css.disclaimer}>
                当前住宿已确认或锁定，暂不可替换。请先处理原预约；仅解锁不会取消真实订单。
              </p>
            )}
            {!alternatives.length && (
              <p>
                当前示例目录没有其他同城酒店，请先保留原住宿；未伪造搜索结果。
              </p>
            )}
            <div
              className={css.recommendationStrip}
              data-recommendation-strip
              tabIndex={0}
              aria-label="酒店推荐列表"
            >
              {alternatives.slice(0, 5).map((candidate) => (
                <RecommendationRow key={candidate.id} place={candidate}>
                  <button
                    type="button"
                    disabled={Boolean(protectedStay) || !record}
                    onClick={() => {
                      dispatch({
                        type: "replaceRailHotel",
                        id: item.id,
                        placeId: candidate.id,
                      });
                      onReplaced();
                      onClose();
                    }}
                  >
                    选用此酒店（尚未预约）
                  </button>
                </RecommendationRow>
              ))}
            </div>
          </>
        ) : (
          <>
            <h3>
              {record ? reservationLabel(record) : "自定义项目尚未关联预约地点"}
            </h3>
            {!record ? (
              <p>
                请先为此项目补充实际地点与渠道信息。当前可用“联系消息草稿”记录待核对事项，不会创建无来源订单。
              </p>
            ) : (
              <>
                {record.reservationStatus === "cancelled" &&
                  (record.fixedTime || record.locked) && (
                    <section aria-label="解除已取消项目的固定限制">
                      <p>
                        取消已记录，时间仍受保护。解除后才允许修改、拖动或删除此项目；不会操作真实订单。
                      </p>
                      <label className={css.confirm}>
                        <input
                          type="checkbox"
                          checked={releaseConfirmed}
                          onChange={(e) =>
                            setReleaseConfirmed(e.target.checked)
                          }
                        />
                        我确认不再需要保留此项目的固定时间
                      </label>
                      <button
                        type="button"
                        disabled={!releaseConfirmed}
                        onClick={() => {
                          dispatch({
                            type: "releaseCancelledSchedule",
                            id: item.id,
                            confirmed: releaseConfirmed,
                          });
                          setReleaseConfirmed(false);
                        }}
                      >
                        确认解除固定安排
                      </button>
                    </section>
                  )}
                {!record.reservationRequired ||
                record.reservationStatus === "cancelled" ? (
                  <button
                    type="button"
                    onClick={() =>
                      dispatch({ type: "queueReservation", id: item.id })
                    }
                  >
                    加入预约列表（未预约）
                  </button>
                ) : !booked ? (
                  <>
                    <p>
                      先选演示渠道，再在原渠道自行预约；“已选渠道”不等于“预约成功”。
                    </p>
                    <div className={css.menuActions}>
                      {place?.bookingOptions.map((option) => (
                        <button
                          key={option.providerId}
                          type="button"
                          aria-pressed={record.providerId === option.providerId}
                          onClick={() =>
                            dispatch({
                              type: "provider",
                              id: item.id,
                              providerId: option.providerId,
                            })
                          }
                        >
                          {record.providerId === option.providerId
                            ? "✓ 已选渠道 · "
                            : "选择渠道 · "}
                          {option.name}
                        </button>
                      ))}
                    </div>
                    {!place?.bookingOptions.length && (
                      <p>
                        暂无可用渠道示例；已保留待核对记录，不会伪造可预约入口。
                      </p>
                    )}
                    {record.providerId && (
                      <>
                        <label>
                          确认预约时间
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => setTime(e.target.value)}
                          />
                        </label>
                        {time &&
                          timeConflicts(plan, record, time).length > 0 && (
                            <p className={css.disclaimer}>
                              注意与相邻安排的时间 / 缓冲冲突，请核对后再记录。
                            </p>
                          )}
                        <label className={css.confirm}>
                          <input
                            type="checkbox"
                            checked={confirmed}
                            onChange={(e) => setConfirmed(e.target.checked)}
                          />
                          我已在原渠道完成预约（这里只手动记录）
                        </label>
                        <button
                          type="button"
                          disabled={!confirmed || !time}
                          onClick={() => {
                            dispatch({ type: "complete", id: item.id, time });
                            setConfirmed(false);
                          }}
                        >
                          记录已完成预约
                        </button>
                      </>
                    )}
                  </>
                ) : (
                  <p>
                    已手动确认，原时间和预约锁定保持受保护。真实订单详情请到原渠道查看。
                  </p>
                )}
              </>
            )}
            <div className={css.dialogActions}>
              <button type="button" onClick={() => onView("message")}>
                联系消息草稿
              </button>
              {item.type === "hotel" && (
                <button type="button" onClick={() => onView("replace")}>
                  比较 / 更换酒店
                </button>
              )}
              {booked && (
                <button type="button" onClick={() => onView("cancel")}>
                  取消预约 · 更新记录
                </button>
              )}
            </div>
          </>
        )}
        <p role="status">{notice || state.notice}</p>
      </div>
    </PlannerOverlay>
  );
}
