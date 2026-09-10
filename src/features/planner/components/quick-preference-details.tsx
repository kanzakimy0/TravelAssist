import { useState } from "react";
import { quickDetailOptions } from "../data/quick-detail-options";
import {
  detailCompletion,
  quickMenuSections,
  type QuickPreferenceGroup,
} from "../data/quick-menu-sections";
import menu from "../quick-settings-menu.module.css";

export function QuickPreferenceDetails({
  group,
  initial,
  onApply,
  onCancel,
}: {
  group: QuickPreferenceGroup;
  initial: Record<string, string>;
  onApply: (details: Record<string, string>) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(() => ({ ...initial }));
  const [section, setSection] = useState(0);
  const layout = quickMenuSections[group];
  function update(key: string, value: string) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }
  return (
    <div className={`${menu.body} ${menu.detailBody}`}>
      <div className={menu.intro}>
        <span className={menu.kicker}>点选偏好 · 可随时调整</span>
        <p>常用要求直接选，仅特殊需求需要填写。应用前不会改变当前设置。</p>
      </div>
      <div className={menu.sectionNav} role="group" aria-label="详细设置分区">
        {layout.details.map((part, index) => (
          <button
            type="button"
            key={part.title}
            aria-pressed={section === index}
            onClick={() => setSection(index)}
          >
            {part.title}
            <small>
              {part.keys.filter((key) => draft[key]?.trim()).length}/
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
        <div className={menu.optionGroups}>
          {layout.details[section].keys.map((key) => {
            const config = quickDetailOptions[group][key];
            const value = draft[key] ?? "";
            const custom = value && !config.choices.includes(value);
            return (
              <fieldset className={menu.optionGroup} key={key}>
                <legend>{key}</legend>
                <div className={menu.chips}>
                  {["", ...config.choices].map((option) => (
                    <button
                      type="button"
                      key={option}
                      data-unset={!option}
                      aria-pressed={value === option}
                      onClick={() => update(key, option)}
                    >
                      <span className={menu.check} aria-hidden="true">
                        {value === option ? "✓" : "+"}
                      </span>
                      {option || "未限定"}
                    </button>
                  ))}
                </div>
                {config.manual ? (
                  <label className={menu.field}>
                    {key} · 补充填写（可选）
                    <input
                      maxLength={160}
                      placeholder={config.manual}
                      value={custom ? value : ""}
                      onChange={(event) => update(key, event.target.value)}
                    />
                  </label>
                ) : custom ? (
                  <p className={menu.legacyValue}>
                    已保留原填写：{value}
                    <button type="button" onClick={() => update(key, "")}>
                      清除原填写
                    </button>
                  </p>
                ) : null}
                {config.hint && <small>{config.hint}</small>}
              </fieldset>
            );
          })}
        </div>
      </section>
      <footer className={`${menu.footer} ${menu.detailFooter}`}>
        <small>已设定 {detailCompletion(group, draft)} 项 · 仅本次旅行</small>
        <div>
          <button className={menu.cancel} type="button" onClick={onCancel}>
            取消
          </button>
          <button
            className={menu.primary}
            type="button"
            onClick={() => onApply(draft)}
          >
            应用偏好
          </button>
        </div>
      </footer>
    </div>
  );
}
