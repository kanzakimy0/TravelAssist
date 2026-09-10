import {
  useRef,
  useState,
  type Dispatch,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import type { BottomTab } from "../model/planner-types";
import { currentPlan } from "../model/trip-model";
import type { TripAction, TripState } from "../model/trip-model";
import { ProportionalTimeline } from "./proportional-timeline";
import { PlannerIcon } from "./planner-icon";
import { SecondaryPanels } from "./secondary-panels";
import styles from "../planner.module.css";
import { BottomTabContext } from "./bottom-tab-context";
import panels from "../workspace-panels.module.css";

export const bottomTabs = [
  ["itinerary", "行程"],
  ["movement", "移动"],
  ["booking", "预约"],
  ["weather", "备选"],
  ["stayFood", "住宿·餐饮"],
  ["details", "旅行体检"],
] as const;
export function BottomExecutionPanel({
  state,
  dispatch,
  itineraryContent,
}: {
  state: TripState;
  dispatch: Dispatch<TripAction>;
  onSelect: (id: string) => void;
  itineraryContent?: ReactNode;
}) {
  const plan = currentPlan(state),
    tab = state.ui.activeBottomTab;
  const mode = state.ui.rangeMode;
  const activeTrigger = useRef<HTMLButtonElement>(null);
  const contextKey = [tab, mode, state.ui.focusedDay, plan.id].join(":");
  const [expandedTab, setExpandedTab] = useState<BottomTab | null>(null);
  const contextOpen =
    expandedTab === tab &&
    !state.ui.inspection &&
    !state.ui.isMoreSettingsOpen &&
    !state.ui.bookingOpen;
  const changeTab = (tab: BottomTab) => {
    dispatch({ type: "ui", patch: { activeBottomTab: tab } });
    setExpandedTab(tab);
  };
  function tabKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const next =
      event.key === "ArrowRight"
        ? (index + 1) % 6
        : event.key === "ArrowLeft"
          ? (index + 5) % 6
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? 5
              : -1;
    if (next < 0) return;
    event.preventDefault();
    changeTab(bottomTabs[next][0]);
    event.currentTarget
      .closest('[role="tablist"]')
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }
  return (
    <section
      className={styles.bottomPanel}
      data-bottom-panel
      data-bottom-range={mode}
      aria-label="范围执行面板"
      data-bottom-plan={plan.name}
    >
      <div
        className={styles.bottomTabs}
        role="tablist"
        aria-label="行程执行分类"
      >
        {bottomTabs.map(([id, label], index) => (
          <div
            key={id}
            role="presentation"
            className={panels.tabCell}
            data-expanded={tab === id && contextOpen}
          >
            <button
              type="button"
              role="tab"
              id={`tab-${id}`}
              ref={tab === id ? activeTrigger : undefined}
              aria-selected={tab === id}
              aria-label={label}
              aria-controls={`panel-${id}`}
              tabIndex={tab === id ? 0 : -1}
              onKeyDown={(e) => tabKey(e, index)}
              onClick={() => {
                changeTab(id);
              }}
            >
              <PlannerIcon
                name={
                  (
                    [
                      "clock",
                      "transport",
                      "booking",
                      "sun",
                      "stay",
                      "layers",
                    ] as const
                  )[index]
                }
              />
              {tab === id && contextOpen ? null : label}
            </button>
            <button
              type="button"
              className={panels.tabFold}
              data-open={tab === id && contextOpen}
              aria-label={`${tab === id && contextOpen ? "收起" : "展开"}${label}详细信息`}
              aria-expanded={tab === id && contextOpen}
              aria-controls={
                tab === id && contextOpen ? "bottom-context" : undefined
              }
              onClick={() => {
                if (tab === id && contextOpen) {
                  setExpandedTab(null);
                  activeTrigger.current?.focus({ preventScroll: true });
                } else changeTab(id);
              }}
            >
              <PlannerIcon name="chevron" />
            </button>
          </div>
        ))}
      </div>
      {contextOpen && (
        <BottomTabContext
          key={contextKey}
          state={state}
          title={bottomTabs.find(([id]) => id === tab)![1]}
          trigger={activeTrigger}
          onClose={() => {
            setExpandedTab(null);
            activeTrigger.current?.focus({ preventScroll: true });
          }}
        />
      )}
      <div
        className={styles.tabContent}
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        tabIndex={0}
      >
        {tab !== "itinerary" ? (
          <SecondaryPanels state={state} dispatch={dispatch} />
        ) : itineraryContent ? (
          itineraryContent
        ) : (
          <ProportionalTimeline state={state} dispatch={dispatch} />
        )}
      </div>
    </section>
  );
}
