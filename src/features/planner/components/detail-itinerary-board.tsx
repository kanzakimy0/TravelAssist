import { useEffect, useRef, useState, type Dispatch } from "react";
import type {
  DetailDraftState,
  DetailRailItem,
} from "../model/detail-workspace";
import {
  currentPlan,
  reservationLabel,
  type TripAction,
  type TripState,
} from "../model/trip-model";
import { timelineStatus } from "./trip-timeline-track";
import { missingArrangements } from "../model/required-arrangements";
import css from "../detail-itinerary-board.module.css";
import {
  detailCardKey,
  detailTimeSuggestion,
  acceptDetailTimeSuggestion,
} from "../model/detail-card-actions";

export function DetailItineraryBoard({
  day,
  items,
  selectedId,
  state,
  dispatch,
  onItem,
  draft,
  onDraft,
  onMissing,
  onBreakfastChoice,
}: {
  day: number;
  items: DetailRailItem[];
  selectedId: string | null;
  state: TripState;
  dispatch: Dispatch<TripAction>;
  draft: DetailDraftState;
  onDraft: (patch: Partial<DetailDraftState>) => void;
  onItem: (
    item: DetailRailItem,
    trigger: HTMLButtonElement,
    focus?: "advice" | "booking",
  ) => void;
  onMissing: (
    day: number,
    kind: "hotel" | "restaurant",
    slot?: "breakfast" | "lunch" | "dinner",
  ) => void;
  onBreakfastChoice: (day: number, choice: "hotel" | "simple") => void;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const [feedback, setFeedback] = useState("");
  function dismiss(key: string) {
    onDraft({ railResponses: { ...draft.railResponses, [key]: "later" } });
    setFeedback(
      "已隐藏这条提醒，项目和真实检查状态保留；内容变化后会重新提醒。",
    );
  }
  function accept(item: DetailRailItem) {
    const result = acceptDetailTimeSuggestion(state, draft, day, item.id);
    if (result.action) {
      dispatch(result.action);
      dispatch({
        type: "ui",
        patch: { selectedTripItemId: state.ui.selectedTripItemId },
      });
    }
    if (result.draft) onDraft(result.draft);
    setFeedback(result.notice);
  }
  useEffect(() => {
    if (!selectedId) return;
    viewport.current
      ?.querySelector<HTMLElement>(
        `[data-detail-column="${CSS.escape(selectedId)}"]`,
      )
      ?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "nearest",
        inline: "center",
      });
  }, [selectedId]);
  function openItem(
    item: DetailRailItem,
    trigger: HTMLButtonElement,
    detailFocus?: "advice" | "booking",
  ) {
    onItem(item, trigger, detailFocus);
  }
  return (
    <>
      <p className={css.srOnly} role="status">
        {feedback}
      </p>
      <div
        className={css.viewport}
        ref={viewport}
        data-detail-board
        data-sights-only="false"
      >
        <div className={css.columns}>
          {[
            ...items.map((item) => {
              const canonical = currentPlan(state).items.find(
                (i) => i.id === item.id,
              );
              const status =
                item.aiStatus === "error"
                  ? { symbol: "!", label: "有问题" }
                  : item.reservation === "unknown"
                    ? { symbol: "?", label: "预约待确认" }
                    : timelineStatus[item.aiStatus];
              const adviceKey = detailCardKey(state, item, "advice", items);
              const bookingKey = detailCardKey(state, item, "booking", items);
              const hasAdvice =
                item.aiStatus !== "normal" &&
                draft.railResponses?.[adviceKey] !== "later";
              const suggestion = detailTimeSuggestion(state, item, items);
              const place = state.places.find(
                (candidate) => candidate.id === canonical?.placeId,
              );
              const showReservation =
                draft.railResponses?.[bookingKey] !== "later" &&
                item.reservation !== "confirmed" &&
                canonical?.reservationRequired &&
                (Boolean(place?.bookingOptions.length) ||
                  ["booked", "ticketed", "pay_on_site", "cancelled"].includes(
                    canonical.reservationStatus,
                  ));
              return (
                <article
                  className={css.column}
                  key={item.id}
                  data-detail-column={item.id}
                  data-order={item.startTime}
                >
                  <div className={css.axis}>
                    <span
                      className={css.node}
                      id={`detail-status-${item.id}`}
                      data-status={
                        item.aiStatus === "error"
                          ? "error"
                          : item.reservation === "unknown"
                            ? "unknown"
                            : item.aiStatus
                      }
                      title={`${status.label}：${item.aiReason}`}
                    >
                      <span aria-hidden="true">{status.symbol}</span>
                      <span className={css.srOnly}>
                        {status.label}：{item.aiReason}
                      </span>
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`${css.square} ${css.itinerary}`}
                    data-detail-item={item.id}
                    data-kind={item.type}
                    data-reservation-pending={
                      item.reservation === "unknown" || undefined
                    }
                    title={item.typeLabel + " · " + item.title}
                    aria-pressed={selectedId === item.id}
                    aria-describedby={`detail-status-${item.id}`}
                    onClick={(event) => openItem(item, event.currentTarget)}
                  >
                    <div className={css.time}>
                      <time>{item.startTime}</time>
                      <span>{item.durationLabel}</span>
                    </div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.typeLabel}
                      {item.fixed ? " · 固定时间" : ""}
                    </small>
                  </button>
                  <div className={css.collapsedCards}>
                    {hasAdvice && (
                      <div data-status={item.aiStatus} data-primary-status>
                        <button
                          type="button"
                          className={css.statusBody}
                          data-status-action
                          aria-label={`${item.title}提醒`}
                          onClick={(event) =>
                            openItem(item, event.currentTarget, "advice")
                          }
                        >
                          <strong>{status.label}</strong>
                          <span>
                            {suggestion
                              ? `建议改为 ${suggestion.startTime}–${suggestion.endTime}，保留原时长`
                              : item.aiReason}
                          </span>
                        </button>
                        <QuickActions
                          label={suggestion ? "同意" : "更改"}
                          confirmTitle={
                            suggestion
                              ? `应用时间调整：${suggestion.startTime}–${suggestion.endTime}`
                              : "打开项目详情处理，不自动确认预约"
                          }
                          onIgnore={() => dismiss(adviceKey)}
                          onOpen={(trigger) =>
                            suggestion
                              ? accept(item)
                              : openItem(
                                  item,
                                  trigger,
                                  item.reservation === "unknown"
                                    ? "booking"
                                    : "advice",
                                )
                          }
                        />
                      </div>
                    )}
                    {showReservation && canonical && (
                      <div
                        data-primary-status={!hasAdvice || undefined}
                        data-status="unknown"
                      >
                        <button
                          type="button"
                          className={!hasAdvice ? css.statusBody : undefined}
                          data-reservation-card={item.id}
                          aria-label={`${item.title}预约`}
                          onClick={(event) =>
                            openItem(item, event.currentTarget, "booking")
                          }
                        >
                          <strong>{reservationLabel(canonical)} ⌃</strong>
                          {!hasAdvice && <span>查看预约记录与后续操作</span>}
                        </button>
                        {!hasAdvice && (
                          <QuickActions
                            label="更改"
                            onIgnore={() => dismiss(bookingKey)}
                            onOpen={(trigger) =>
                              openItem(item, trigger, "booking")
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            }),
            ...missingArrangements(state, day, items).map(
              ({ kind, label, slot, time }) => {
                const missingKey = `${currentPlan(state).id}:missing-${day}-${slot ?? kind}`;
                const area = state.areas.find(
                  (area) =>
                    area.day === day &&
                    area.type === (kind === "hotel" ? "hotelArea" : "foodArea"),
                );
                const openArea = () => {
                  onMissing(day, kind, slot);
                };
                return (
                  <article
                    className={css.column}
                    key={`missing-${slot ?? kind}`}
                    data-missing-arrangement={kind}
                    data-missing-meal={slot}
                    data-order={time}
                  >
                    <div className={css.axis}>
                      <span
                        className={css.node}
                        data-status="unknown"
                        aria-label={label + "未安排"}
                      >
                        <span aria-hidden="true">?</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={openArea}
                      className={`${css.square} ${css.itinerary} ${css.missing}`}
                      aria-label={`安排${label}`}
                      data-kind={kind}
                    >
                      <strong>{label}</strong>
                      <span className={css.missingPlus} aria-hidden="true">
                        ＋
                      </span>
                    </button>
                    <div className={css.collapsedCards}>
                      {draft.railResponses?.[missingKey] !== "later" && (
                        <div data-primary-status data-status="unknown">
                          <button
                            type="button"
                            className={css.statusBody}
                            onClick={openArea}
                          >
                            <strong>
                              {kind === "hotel"
                                ? "尚未选择酒店"
                                : `${label}尚未安排`}
                            </strong>
                            <span>
                              {area ? "查看推荐地区 →" : "请使用新增项目补充"}
                            </span>
                          </button>
                          {slot === "breakfast" ? (
                            <div
                              className={css.breakfastChoices}
                              role="group"
                              aria-label="早餐方式"
                            >
                              <button
                                type="button"
                                onClick={() => onBreakfastChoice(day, "hotel")}
                              >
                                酒店早餐
                              </button>
                              <button
                                type="button"
                                onClick={() => onBreakfastChoice(day, "simple")}
                              >
                                简易早餐
                              </button>
                            </div>
                          ) : (
                            <QuickActions
                              label="更改"
                              onIgnore={() => dismiss(missingKey)}
                              onOpen={openArea}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              },
            ),
          ].sort((a, b) =>
            String(a.props["data-order"]).localeCompare(
              String(b.props["data-order"]),
            ),
          )}
          {!items.length && <p>当天暂无安排，使用“新增项目”开始添加。</p>}
        </div>
      </div>
    </>
  );
}

function QuickActions({
  onOpen,
  onIgnore,
  label,
  confirmTitle,
}: {
  onOpen: (trigger: HTMLButtonElement) => void;
  onIgnore: () => void;
  label: "同意" | "更改";
  confirmTitle?: string;
}) {
  return (
    <div className={css.quickActions}>
      <button
        type="button"
        data-confirm-action
        title={confirmTitle}
        onClick={(event) => onOpen(event.currentTarget)}
      >
        {label}
      </button>
      <button
        type="button"
        onClick={onIgnore}
        title="仅隐藏当前提醒格，不删除项目或伪造已解决状态"
      >
        无视
      </button>
    </div>
  );
}
