import { useRef, useState, type Dispatch } from "react";
import { preferenceDefinitions } from "../data/planner-preferences";
import {
  currentPlan,
  type PreferenceGroup,
  type TripAction,
  type TripState,
} from "../model/trip-model";
import { PlannerPopover } from "./planner-popover";
import styles from "../planner.module.css";
import ui from "../planner-interactions.module.css";

export function PreferenceEditor({
  group,
  state,
  dispatch,
}: {
  group: PreferenceGroup;
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const [detail, setDetail] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const definition = preferenceDefinitions[group];
  const value = state.configuration.preferences[group] ?? {
    quick: [],
    details: {},
  };
  return (
    <div className={ui.preferenceEditor}>
      <p className={styles.hint}>
        {group === "bookings"
          ? `已确认 ${currentPlan(state).items.filter((i) => ["booked", "ticketed"].includes(i.reservationStatus)).length} 项 · 固定预约始终受保护`
          : value.quick.join(" · ") || "未限定"}
      </p>
      <div
        className={styles.choices}
        aria-label={`${definition.title}快速设置`}
      >
        {definition.quick.map((option) => (
          <button
            type="button"
            key={option}
            aria-pressed={value.quick.includes(option)}
            onClick={() =>
              dispatch({
                type: "preference",
                group,
                quick: value.quick.includes(option)
                  ? value.quick.filter((v) => v !== option)
                  : [...value.quick, option],
              })
            }
          >
            {option}
          </button>
        ))}
      </div>
      {group === "bookings" && (
        <button
          type="button"
          onClick={() =>
            dispatch({
              type: "ui",
              patch: { bookingOpen: true, isMoreSettingsOpen: false },
            })
          }
        >
          核对预约清单
        </button>
      )}
      <button
        type="button"
        ref={trigger}
        aria-expanded={detail}
        onClick={() => setDetail(!detail)}
      >
        更多设置 · {definition.title}
      </button>
      {detail && (
        <PlannerPopover
          id={`preference-detail-${group}`}
          title={`${definition.title} · 详细设置`}
          trigger={trigger}
          onClose={() => setDetail(false)}
        >
          <p className={styles.hint}>
            当前旅行的本地偏好，不执行自动调整或真实查询。空值代表未限定。
          </p>
          <div className={ui.detailFields}>
            {definition.details.map((key) => (
              <label className={styles.field} key={key}>
                {key}
                <input
                  maxLength={160}
                  placeholder="未限定"
                  value={value.details[key] ?? ""}
                  onChange={(e) =>
                    dispatch({
                      type: "preference",
                      group,
                      detail: { key, value: e.target.value },
                    })
                  }
                />
              </label>
            ))}
          </div>
        </PlannerPopover>
      )}
    </div>
  );
}
