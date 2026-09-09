import { useRef, useState, type Dispatch } from "react";
import {
  currentPlan,
  tripReducer,
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
  seniors: "老人",
};

function QuickCard({
  field,
  state: liveState,
  dispatch: commit,
}: {
  field: (typeof fields)[number];
  state: TripState;
  dispatch: Dispatch<TripAction>;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<TripState | null>(null);
  const state = open ? (draft ?? liveState) : liveState;
  function dispatch(action: TripAction) {
    if (action.type === "dates") {
      const next = tripReducer(liveState, action);
      if (next.plans !== liveState.plans) {
        commit(action);
        setOpen(false);
      } else setDraft(next);
    } else setDraft((current) => tripReducer(current ?? liveState, action));
  }
  function apply() {
    commit({ type: "saveSettings", configuration: state.configuration });
    setOpen(false);
  }
  const trigger = useRef<HTMLButtonElement>(null);
  const count = currentPlan(state).days.length;
  const people = state.configuration.travelers;
  const compactTravelers =
    [
      people.adultMale + people.adultFemale
        ? `${people.adultMale + people.adultFemale} 位成人`
        : "",
      people.child ? `${people.child} 位儿童` : "",
      people.infant ? `${people.infant} 位婴儿` : "",
    ]
      .filter(Boolean)
      .join(" · ") || "未选择";
  const summary =
    field.key === "dates"
      ? liveState.settings.startDate.slice(5) +
        "–" +
        liveState.configuration.returnDate.slice(5)
      : field.key === "travelers"
        ? Object.entries(liveState.configuration.travelers)
            .filter(([, n]) => n)
            .map(
              ([key, n]) =>
                travelerLabels[key as keyof typeof travelerLabels] + " " + n,
            )
            .join(" · ")
        : liveState.configuration.preferences[field.key]?.quick
            .slice(0, 3)
            .join(" · ") || "未限定";
  return (
    <>
      <button
        type="button"
        className={styles.quickCard}
        data-quick-field={field.key}
        ref={trigger}
        aria-expanded={open}
        aria-controls={open ? "quick-" + field.key : undefined}
        onClick={() => {
          setDraft({
            ...structuredClone(liveState),
            notice: "应用前不会改变当前行程。",
          });
          setOpen(!open);
        }}
      >
        <span className={styles.quickLabel}>
          <span className={styles.quickIcon}>
            <PlannerIcon name={field.icon} />
          </span>
          {field.title}
        </span>
        <strong title={summary}>
          {field.key === "travelers" ? (
            compactTravelers
          ) : field.key === "dates" ? (
            summary
          ) : (
            <span className={styles.preferenceSummary}>
              {summary.split(" · ").map((item, i) => (
                <span key={`${i}-${item}`}>
                  {i > 0 ? "· " : ""}
                  {item}
                </span>
              ))}
            </span>
          )}
        </strong>
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
            <QuickDateMenu
              state={state}
              dispatch={dispatch}
              onCancel={() => setOpen(false)}
            />
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
                <small>老人单独计数，请勿重复计入成人</small>
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
                <button type="button" onClick={() => setOpen(false)}>
                  取消
                </button>
                <button type="button" className={menu.primary} onClick={apply}>
                  应用设置
                </button>
              </footer>
            </div>
          ) : (
            <QuickPreferenceMenu
              group={field.key}
              state={state}
              dispatch={dispatch}
              onClose={apply}
              onCancel={() => setOpen(false)}
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
