import type { Dispatch, RefObject } from "react";
import type { TripAction, TripState } from "../model/trip-model";
import {
  budgetLabels,
  dailyBudgets,
  paceLabels,
  dailyPlaces,
  preferenceDefinitions,
} from "../data/planner-preferences";
import { PlannerPopover } from "./planner-popover";
import { PreferenceEditor } from "./preference-editor";
import styles from "../planner.module.css";
import ui from "../planner-interactions.module.css";

const groups = [
  "movement",
  "timing",
  "queues",
  "photography",
  "bookings",
  "weather",
  "luggage",
  "needs",
  "constraints",
] as const;
export function MoreTripSettingsPopover({
  trigger,
  state,
  dispatch,
  onClose,
}: {
  trigger: RefObject<HTMLButtonElement | null>;
  state: TripState;
  dispatch: Dispatch<TripAction>;
  onClose: () => void;
}) {
  return (
    <PlannerPopover
      id="more-trip-settings"
      title="更多行程设置"
      trigger={trigger}
      onClose={onClose}
    >
      <p className={styles.hint}>
        本地 UI 演示 · 设置仅在当前页面保留，不执行真实计算。
      </p>
      <div className={ui.settingsSections}>
        {(["budget", "pace"] as const).map((key) => {
          const labels = key === "budget" ? budgetLabels : paceLabels;
          return (
            <label className={styles.field} key={key}>
              {key === "budget" ? "预算" : "旅行节奏"} ·{" "}
              {labels[state.configuration[key]]}
              <input
                aria-label={key === "budget" ? "预算档位" : "旅行节奏档位"}
                type="range"
                min={0}
                max={labels.length - 1}
                step={1}
                value={state.configuration[key]}
                aria-valuetext={labels[state.configuration[key]]}
                onChange={(e) =>
                  dispatch({
                    type: "level",
                    key,
                    value: Number(e.target.value),
                  })
                }
              />
              <span className={ui.sliderLabels}>
                {labels.map((text) => (
                  <small key={text}>{text}</small>
                ))}
              </span>
              <small>
                {key === "budget"
                  ? dailyBudgets[state.configuration.budget] +
                    " / 人 / 天（示例）"
                  : "每天 " +
                    dailyPlaces[state.configuration.pace] +
                    " 个主要地点（偏好目标）"}
              </small>
            </label>
          );
        })}
        {groups.map((group) => (
          <section className={ui.settingsSection} key={group}>
            <h3>{preferenceDefinitions[group].title}</h3>
            <PreferenceEditor group={group} state={state} dispatch={dispatch} />
          </section>
        ))}
      </div>
    </PlannerPopover>
  );
}
