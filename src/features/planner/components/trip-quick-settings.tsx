import { useRef, useState, type Dispatch } from "react";
import {
  currentPlan,
  type TripAction,
  type TripState,
} from "../model/trip-model";
import { PlannerIcon } from "./planner-icon";
import { PlannerPopover } from "./planner-popover";
import { PreferenceEditor } from "./preference-editor";
import styles from "../planner.module.css";
import ui from "../planner-interactions.module.css";

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

function DateEditor({
  state,
  dispatch,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const [departure, setDeparture] = useState(state.settings.startDate);
  const [returning, setReturning] = useState(state.configuration.returnDate);
  return (
    <form
      className={ui.detailFields}
      onSubmit={(e) => {
        e.preventDefault();
        dispatch({ type: "dates", departure, returning });
      }}
    >
      <label className={styles.field}>
        出发日期
        <input
          required
          type="date"
          value={departure}
          onChange={(e) => setDeparture(e.target.value)}
        />
      </label>
      <label className={styles.field}>
        返回日期
        <input
          required
          type="date"
          value={returning}
          min={departure}
          onChange={(e) => setReturning(e.target.value)}
        />
      </label>
      <p className={styles.hint}>
        支持 1–60 天；固定预约、酒店退房或 Day
        越界时会保留原行程。新增日期为空白安排。
      </p>
      <button type="submit">应用日期区间</button>
      <p role="status">{state.notice}</p>
    </form>
  );
}
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
        >
          {field.key === "dates" ? (
            <DateEditor state={state} dispatch={dispatch} />
          ) : field.key === "travelers" ? (
            <div className={ui.detailFields}>
              {(
                Object.entries(travelerLabels) as [
                  keyof typeof travelerLabels,
                  string,
                ][]
              ).map(([key, label]) => (
                <div className={ui.stepper} key={key}>
                  <span>{label}</span>
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
              ))}
              <p role="status">{state.notice}</p>
            </div>
          ) : (
            <PreferenceEditor
              group={field.key}
              state={state}
              dispatch={dispatch}
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
