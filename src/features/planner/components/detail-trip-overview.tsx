import type {
  DetailDraftState,
  DetailRailItem,
} from "../model/detail-workspace";
import { detailRailItems } from "../model/detail-workspace";
import { overviewEntries, overviewTone } from "../model/detail-overview";
import {
  currentPlan,
  type MealSlot,
  type TripState,
} from "../model/trip-model";
import css from "../detail-trip-overview.module.css";

const symbols = { normal: "✓", warning: "!", error: "!", unknown: "?" };
const labels = {
  normal: "全部正常",
  warning: "需要确认",
  error: "存在冲突",
  unknown: "待补充 / 预约",
};
export function DetailTripOverview({
  state,
  draft,
  onDay,
  onItem,
  onMissing,
}: {
  state: TripState;
  draft: DetailDraftState;
  onDay: (day: number) => void;
  onItem: (item: DetailRailItem, trigger: HTMLButtonElement) => void;
  onMissing: (
    day: number,
    kind: "hotel" | "restaurant",
    slot?: MealSlot,
  ) => void;
}) {
  const plan = currentPlan(state);
  return (
    <div className={css.days} data-trip-overview-board>
      {plan.days.map((day) => {
        const entries = overviewEntries(
          detailRailItems(state, day.day, draft.items, draft.completedIds),
          day.day,
          plan.days.length,
        );
        const tone = overviewTone(entries);
        return (
          <section
            key={day.day}
            className={css.day}
            data-overview-day={day.day}
            data-tone={tone}
          >
            <button
              type="button"
              className={css.dayHeading}
              onClick={() => onDay(day.day)}
            >
              <strong>
                第{day.day}天 · {day.city}
              </strong>
              <span aria-label={labels[tone]}>
                {symbols[tone]} {day.date}
              </span>
            </button>
            <div
              className={css.entries}
              aria-label={`第${day.day}天时间与行程`}
              tabIndex={0}
            >
              {entries.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  data-overview-entry={entry.id}
                  data-tone={entry.tone}
                  onClick={(event) =>
                    entry.item
                      ? onItem(entry.item, event.currentTarget)
                      : onMissing(day.day, entry.missing!, entry.slot)
                  }
                >
                  <time>{entry.missing ? "待定" : entry.time}</time>
                  <strong>{entry.title}</strong>
                  <span aria-label={entry.item ? labels[entry.tone] : "未安排"}>
                    {symbols[entry.tone]}
                  </span>
                </button>
              ))}
            </div>
            <small>
              {labels[tone]} · {entries.length} 项 · 点击项目查看详情
            </small>
          </section>
        );
      })}
    </div>
  );
}
