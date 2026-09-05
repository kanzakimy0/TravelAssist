"use client";
import { useEffect, useState } from "react";
import {
  changeRegion,
  defaultSettings,
  isChanged,
  regionSuggestion,
  settingsLabels,
  settingsOptions,
  type Settings,
  type DirtyReporter,
} from "../model";
import { Field } from "./field";
import { useFeedback } from "../hooks/use-feedback";
import styles from "../profile.module.css";

export function SettingsCard({ onDirty }: { onDirty: DirtyReporter }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [draft, setDraft] = useState(defaultSettings);
  const [editing, setEditing] = useState(false);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const feedback = useFeedback();
  const dirty = isChanged(settings, draft);
  useEffect(() => onDirty("settings", dirty), [dirty, onDirty]);
  const suggestion = showSuggestion
    ? regionSuggestion(draft.region)
    : undefined;
  return (
    <section className={styles.card} aria-labelledby="settings-title">
      <div className={styles.sectionHeader}>
        <h2 id="settings-title">基本设置</h2>
        {!editing && (
          <button
            className={styles.textButton}
            type="button"
            onClick={() => setEditing(true)}
          >
            编辑基本设置
          </button>
        )}
        <span className={styles.success} role="status">
          {feedback.message}
        </span>
      </div>
      {editing ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSettings(draft);
            setEditing(false);
            setShowSuggestion(false);
            feedback.saved();
          }}
        >
          <div className={styles.fields}>
            {(Object.keys(settingsLabels) as (keyof Settings)[]).map((key) => (
              <Field
                key={key}
                id={`settings-${key}`}
                label={settingsLabels[key]}
                value={draft[key]}
                options={settingsOptions[key]}
                onChange={(value) => {
                  if (key === "region") {
                    setDraft(changeRegion(draft, value));
                    setShowSuggestion(true);
                  } else setDraft({ ...draft, [key]: value });
                }}
              />
            ))}
          </div>
          {showSuggestion && (
            <div className={styles.suggestion}>
              <p>已保留您当前的时区、货币和单位。</p>
              {suggestion ? (
                <>
                  <p>
                    按{draft.region}建议：
                    {Object.values(suggestion).join(" · ")}
                    。多时区地区请按所在城市选择。
                  </p>
                  <button
                    type="button"
                    className={styles.textButton}
                    onClick={() => {
                      setDraft({ ...draft, ...suggestion });
                      setShowSuggestion(false);
                    }}
                  >
                    使用这些建议
                  </button>
                </>
              ) : (
                <p>请按您的使用习惯选择设置。</p>
              )}
            </div>
          )}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.button}
              onClick={() => {
                setDraft(settings);
                setEditing(false);
                setShowSuggestion(false);
              }}
            >
              取消
            </button>
            <button type="submit" className={styles.primary}>
              保存修改
            </button>
          </div>
        </form>
      ) : (
        <dl className={styles.settingsDetails}>
          {(Object.keys(settingsLabels) as (keyof Settings)[]).map((key) => (
            <div key={key}>
              <dt>{settingsLabels[key]}</dt>
              <dd>{settings[key]}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
