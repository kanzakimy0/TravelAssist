import { useRef, useState, type Dispatch } from "react";
import {
  currentPlan,
  type TripAction,
  type TripState,
} from "../model/trip-model";
import { PlannerIcon } from "./planner-icon";
import { PlannerPopover } from "./planner-popover";
import { QuickPreferenceMenu } from "./quick-preference-menu";
import { QuickDateMenu } from "./quick-date-menu";
import styles from "../planner.module.css";
import menu from "../quick-settings-menu.module.css";

const fields = [
  { key: "travelers", title: "同行人", icon: "users" },
  { key: "dates", title: "旅行日期", icon: "calendar" },
  { key: "sights", title: "景点偏好", icon: "sight" },
  { key: "food", title: "餐饮偏好", icon: "food" },
  { key: "stay", title: "住宿偏好", icon: "stay" },
] as const;
const travelerLabels = {
  adultMale: "成人男性",
  adultFemale: "成人女性",
  child: "儿童",
  infant: "婴儿",
};

function QuickCard({
  field,
  state,
  dispatch,
}: {
  field: (typeof fields)[number];
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const count = currentPlan(state).days.length;
  const summary =
    field.key === "dates"
      ? state.settings.startDate.slice(5) +
        "–" +
        state.configuration.returnDate.slice(5)
      : field.key === "travelers"
        ? Object.entries(state.configuration.travelers)
            .filter(([, n]) => n)
            .map(
              ([key, n]) =>
                travelerLabels[key as keyof typeof travelerLabels] + " " + n,
            )
            .join(" · ")
        : state.configuration.preferences[field.key]?.quick
            .slice(0, 3)
            .join(" · ") || "未限定";
  return (
    <>
      <button
        type="button"
        className={styles.quickCard}
        ref={trigger}
        aria-expanded={open}
        aria-controls={open ? "quick-" + field.key : undefined}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.quickLabel}>
          <PlannerIcon name={field.icon} />
          {field.title}
        </span>
        <strong>{summary}</strong>
        {field.key === "dates" && (
          <small>
            {count}天{count - 1}晚 · 示例
          </small>
        )}
        <PlannerIcon name="chevron" className={styles.quickChevron} />
      </button>
      {open && (
        <PlannerPopover
          id={"quick-" + field.key}
          title={field.title}
          trigger={trigger}
          onClose={() => setOpen(false)}
          className={menu.menu}
          placement="side"
        >
          {field.key === "dates" ? (
            <QuickDateMenu state={state} dispatch={dispatch} />
          ) : field.key === "travelers" ? (
            <div className={menu.body}>
              <div className={menu.intro}>
                <span className={menu.kicker}>一起出发 · 当前旅行</span>
                <p>这次旅程，有谁和您同行？</p>
              </div>
              <div className={menu.selectionSummary}>
                <span>
                  共{" "}
                  <strong>
                    {Object.values(state.configuration.travelers).reduce(
                      (sum, n) => sum + n,
                      0,
                    )}
                  </strong>{" "}
                  位同行人
                </span>
                <small>人数调整即时同步</small>
              </div>
              <div className={menu.travelerRows}>
                {(
                  Object.entries(travelerLabels) as [
                    keyof typeof travelerLabels,
                    string,
                  ][]
                ).map(([key, label]) => (
                  <div className={menu.travelerRow} key={key}>
                    <span className={menu.travelerIcon}>
                      <PlannerIcon name="users" />
                    </span>
                    <strong>{label}</strong>
                    <div className={menu.stepper}>
                      <button
                        type="button"
                        aria-label={"减少" + label}
                        disabled={state.configuration.travelers[key] === 0}
                        onClick={() =>
                          dispatch({
                            type: "travelers",
                            key,
                            value: state.configuration.travelers[key] - 1,
                          })
                        }
                      >
                        −
                      </button>
                      <output aria-label={label + "人数"}>
                        {state.configuration.travelers[key]}
                      </output>
                      <button
                        type="button"
                        aria-label={"增加" + label}
                        disabled={state.configuration.travelers[key] === 20}
                        onClick={() =>
                          dispatch({
                            type: "travelers",
                            key,
                            value: state.configuration.travelers[key] + 1,
                          })
                        }
                      >
                        ＋
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <footer className={menu.footer}>
                <small role="status">{state.notice}</small>
                <button
                  type="button"
                  className={menu.primary}
                  onClick={() => setOpen(false)}
                >
                  完成
                </button>
              </footer>
            </div>
          ) : (
            <QuickPreferenceMenu
              group={field.key}
              state={state}
              dispatch={dispatch}
              onClose={() => setOpen(false)}
            />
          )}
        </PlannerPopover>
      )}
    </>
  );
}
export function TripQuickSettings(props: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  return (
    <>
      <div className={styles.quickPair}>
        {fields.slice(0, 2).map((field) => (
          <QuickCard key={field.key} field={field} {...props} />
        ))}
      </div>
      <div className={styles.quickTriple}>
        {fields.slice(2).map((field) => (
          <QuickCard key={field.key} field={field} {...props} />
        ))}
      </div>
    </>
  );
}
