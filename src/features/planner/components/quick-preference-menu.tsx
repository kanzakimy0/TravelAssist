import { useRef, useState, type Dispatch } from "react";
import { preferenceDefinitions } from "../data/planner-preferences";
import {
  detailCompletion,
  quickMenuSections,
  type QuickPreferenceGroup,
} from "../data/quick-menu-sections";
import type { TripAction, TripState } from "../model/trip-model";
import { PlannerPopover } from "./planner-popover";
import { PlannerIcon } from "./planner-icon";
import { QuickPreferenceDetails } from "./quick-preference-details";
import menu from "../quick-settings-menu.module.css";

export function QuickPreferenceMenu({
  group,
  state,
  dispatch,
  onClose,
  onCancel,
}: {
  group: QuickPreferenceGroup;
  state: TripState;
  dispatch: Dispatch<TripAction>;
  onClose: () => void;
  onCancel?: () => void;
}) {
  const [detail, setDetail] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const definition = preferenceDefinitions[group];
  const layout = quickMenuSections[group];
  const value = state.configuration.preferences[group] ?? {
    quick: [],
    details: {},
  };
  const completed = detailCompletion(group, value.details);
  return (
    <div className={menu.body}>
      <div className={menu.intro}>
        <span className={menu.kicker}>当前旅行 · 可多选</span>
        <p>{layout.description}</p>
      </div>
      <div className={menu.selectionSummary}>
        <span>
          已选 <strong>{value.quick.length}</strong> 项
        </span>
        <small>仅编辑草稿，点击应用后生效；不会自动重排路线</small>
      </div>
      {layout.quick.map((part) => (
        <section className={menu.group} key={part.title}>
          <h3>{part.title}</h3>
          <div
            className={menu.chips}
            aria-label={`${definition.title}快速设置 · ${part.title}`}
          >
            {part.keys.map((option) => (
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
                <span aria-hidden="true" className={menu.check}>
                  {value.quick.includes(option) ? "✓" : "+"}
                </span>
                {option}
              </button>
            ))}
          </div>
        </section>
      ))}
      <button
        type="button"
        ref={trigger}
        className={menu.detailLink}
        aria-expanded={detail}
        onClick={() => setDetail(true)}
      >
        <PlannerIcon name="settings" />
        <span>
          更多设置 · {definition.title}
          <small>
            {completed ? `已补充 ${completed} 项细节` : "按主题补充具体要求"}
          </small>
        </span>
        <PlannerIcon name="chevron" />
      </button>
      <footer className={menu.footer}>
        <small>仅用于本次旅行</small>
        {onCancel && (
          <button type="button" onClick={onCancel}>
            取消
          </button>
        )}
        <button type="button" className={menu.primary} onClick={onClose}>
          应用设置
        </button>
      </footer>
      {detail && (
        <PlannerPopover
          id={`preference-detail-${group}`}
          title={`${definition.title} · 详细设置`}
          trigger={trigger}
          onClose={() => setDetail(false)}
          className={menu.menu}
          placement="side"
        >
          <QuickPreferenceDetails
            group={group}
            initial={value.details}
            onCancel={() => setDetail(false)}
            onApply={(details) => {
              for (const key of definition.details) {
                if ((details[key] ?? "") !== (value.details[key] ?? "")) {
                  dispatch({
                    type: "preference",
                    group,
                    detail: { key, value: details[key] ?? "" },
                  });
                }
              }
              setDetail(false);
            }}
          />
        </PlannerPopover>
      )}
    </div>
  );
}
