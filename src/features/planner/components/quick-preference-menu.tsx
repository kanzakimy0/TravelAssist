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
import menu from "../quick-settings-menu.module.css";

export function QuickPreferenceMenu({
  group,
  state,
  dispatch,
  onClose,
}: {
  group: QuickPreferenceGroup;
  state: TripState;
  dispatch: Dispatch<TripAction>;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState(false);
  const [section, setSection] = useState(0);
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
        <small>点选即时同步，不会自动重排路线</small>
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
        <button type="button" className={menu.primary} onClick={onClose}>
          完成
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
          <div className={menu.body}>
            <div className={menu.intro}>
              <span className={menu.kicker}>
                偏好细节 · {completed}/{definition.details.length}
              </span>
              <p>按主题补充要求；留空代表未限定。</p>
            </div>
            <div
              className={menu.sectionNav}
              role="group"
              aria-label="详细设置分区"
            >
              {layout.details.map((part, index) => (
                <button
                  type="button"
                  key={part.title}
                  aria-pressed={section === index}
                  onClick={() => setSection(index)}
                >
                  {part.title}
                  <small>
                    {part.keys.filter((k) => value.details[k]?.trim()).length}/
                    {part.keys.length}
                  </small>
                </button>
              ))}
            </div>
            <section
              className={menu.detailSection}
              aria-label={layout.details[section].title}
            >
              <h3>{layout.details[section].title}</h3>
              <div className={menu.fieldGrid}>
                {layout.details[section].keys.map((key) => (
                  <label className={menu.field} key={key}>
                    {key}
                    <input
                      maxLength={160}
                      placeholder="未限定 · 可填写具体要求"
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
            </section>
            <footer className={menu.footer}>
              <small>输入即时同步 · 不执行真实查询</small>
              <button
                className={menu.primary}
                type="button"
                onClick={() => setDetail(false)}
              >
                返回快速设置
              </button>
            </footer>
          </div>
        </PlannerPopover>
      )}
    </div>
  );
}
