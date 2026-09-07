"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { GuardedLink } from "@/features/personal-center/components/guarded-link";
import { usePersonalNavigationGuard } from "@/features/personal-center/components/navigation-guard-context";

import {
  cancelMobilityPreferenceChanges,
  createDefaultMobilityPreferenceState,
  getMobilityNotices,
  mobilityPreferencesEqual,
  mobilityPresets,
  restoreMobilityPreferenceDefaults,
  saveMobilityPreference,
  setMobilityPreset,
  summarizeMobilityPreference,
  toggleMobilityPreference,
  type MobilityPreset,
  type MobilityPreferenceState,
  type MobilityToggleKey,
} from "./mobility-preference-model";
import { PreferenceIcon } from "./preference-icon";
import styles from "./mobility-preference.module.css";

const tendencyOptions: Array<{
  key: MobilityToggleKey;
  title: string;
  description: string;
}> = [
  {
    key: "fewerTransfers",
    title: "少换乘",
    description: "优先减少中途换乘次数，即使总时间稍长",
  },
  {
    key: "lessWalking",
    title: "少步行",
    description: "优先减少站间和目的地之间的步行距离",
  },
];

const restrictionOptions: Array<{
  key: MobilityToggleKey;
  title: string;
  description: string;
}> = [
  {
    key: "noPublicTransit",
    title: "不乘坐公共交通",
    description: "避开铁路、地铁、公交等公共交通方式",
  },
  {
    key: "noBus",
    title: "不乘坐公交",
    description: "仅避开公交，仍可使用其他公共交通",
  },
  {
    key: "noFerry",
    title: "不乘坐游船",
    description: "避开观光游船和水上接驳路线",
  },
];

function SectionMark({ children }: { children: string }) {
  return <span className={styles.sectionMark}>{children}</span>;
}

export function MobilityPreferencePage() {
  const initialState = useMemo(
    () => createDefaultMobilityPreferenceState(),
    [],
  );
  const [saved, setSaved] = useState<MobilityPreferenceState>(initialState);
  const [draft, setDraft] = useState<MobilityPreferenceState>(initialState);
  const [savedMessage, setSavedMessage] = useState(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setIsDirty } = usePersonalNavigationGuard();
  const isDirty = !mobilityPreferencesEqual(saved, draft);
  const summary = summarizeMobilityPreference(draft);
  const notices = getMobilityNotices(draft);

  useEffect(() => {
    setIsDirty(isDirty);
  }, [isDirty, setIsDirty]);

  useEffect(
    () => () => {
      setIsDirty(false);
      if (messageTimer.current) clearTimeout(messageTimer.current);
    },
    [setIsDirty],
  );

  function updatePreset(preset: MobilityPreset) {
    setSavedMessage(false);
    setDraft((current) => setMobilityPreset(current, preset));
  }

  function toggle(key: MobilityToggleKey) {
    setSavedMessage(false);
    setDraft((current) => toggleMobilityPreference(current, key));
  }

  function save() {
    const nextSaved = saveMobilityPreference(draft);
    setSaved(nextSaved);
    setSavedMessage(true);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setSavedMessage(false), 2200);
  }

  function cancel() {
    setDraft(cancelMobilityPreferenceChanges(saved));
    setSavedMessage(false);
  }

  function restoreDefaults() {
    setDraft(restoreMobilityPreferenceDefaults());
    setSavedMessage(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p>MOBILITY PREFERENCE</p>
          <h1>移动偏好</h1>
          <span>设置规划旅程时默认参考的长期移动方式</span>
        </div>
        <GuardedLink
          href="/personal-center/preferences"
          className={styles.backLink}
        >
          <PreferenceIcon name="back" />
          返回旅行偏好
        </GuardedLink>
      </header>

      <section
        className={styles.summaryCard}
        aria-labelledby="mobility-summary"
      >
        <Image
          src="/media/personal-center/preferences/category-mobility.webp"
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, 720px"
          priority
        />
        <div className={styles.summaryShade} />
        <div className={styles.summaryContent}>
          <span className={styles.scopeBadge}>仅长期默认</span>
          <p>当前偏好摘要</p>
          <h2 id="mobility-summary" aria-live="polite">
            {summary}
          </h2>
          <span>
            具体旅行中的临时调整不会写回这里，也不会覆盖你的长期选择。
          </span>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="preset-title">
        <div className={styles.sectionHeading}>
          <SectionMark>01</SectionMark>
          <div>
            <h2 id="preset-title">快速预设</h2>
            <p>先选择最接近你的移动节奏，再微调下面的偏好。</p>
          </div>
        </div>
        <div
          className={styles.presetGrid}
          role="radiogroup"
          aria-labelledby="preset-title"
        >
          {(Object.keys(mobilityPresets) as MobilityPreset[]).map((preset) => {
            const item = mobilityPresets[preset];
            const selected = draft.preset === preset;
            return (
              <button
                key={preset}
                type="button"
                role="radio"
                aria-checked={selected}
                className={styles.presetCard}
                data-selected={selected ? "true" : undefined}
                onClick={() => updatePreset(preset)}
              >
                <span className={styles.radioDot} aria-hidden="true" />
                <strong>{item.label}</strong>
                <small>{item.description}</small>
              </button>
            );
          })}
        </div>
      </section>

      <div className={styles.preferenceGrid}>
        <section className={styles.section} aria-labelledby="tendency-title">
          <div className={styles.sectionHeading}>
            <SectionMark>02</SectionMark>
            <div>
              <h2 id="tendency-title">常用倾向</h2>
              <p>可独立选择，帮助规划器理解舒适度侧重点。</p>
            </div>
          </div>
          <div className={styles.optionList}>
            {tendencyOptions.map((option) => (
              <button
                key={option.key}
                type="button"
                className={styles.toggleCard}
                aria-pressed={draft[option.key]}
                onClick={() => toggle(option.key)}
              >
                <span>
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
                <span className={styles.switch} aria-hidden="true">
                  <span />
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="restriction-title">
          <div className={styles.sectionHeading}>
            <SectionMark>03</SectionMark>
            <div>
              <h2 id="restriction-title">详细限制</h2>
              <p>只选择明确需要避开的方式，规划时会优先遵循。</p>
            </div>
          </div>
          <div className={styles.optionList}>
            {restrictionOptions.map((option) => (
              <label key={option.key} className={styles.checkboxCard}>
                <input
                  type="checkbox"
                  checked={draft[option.key]}
                  onChange={() => toggle(option.key)}
                />
                <span className={styles.checkboxMark} aria-hidden="true">
                  ✓
                </span>
                <span>
                  <strong>{option.title}</strong>
                  <small>{option.description}</small>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>

      <div className={styles.noticeRegion} aria-live="polite">
        {notices.length > 0 ? (
          notices.map((notice) => (
            <div
              key={notice.id}
              className={styles.notice}
              data-tone={notice.tone}
              role="status"
            >
              <span className={styles.noticeIcon} aria-hidden="true">
                {notice.tone === "warning" ? "!" : "i"}
              </span>
              <span>
                <strong>{notice.title}</strong>
                <small>{notice.body}</small>
              </span>
            </div>
          ))
        ) : (
          <div className={styles.scopeNote}>
            <PreferenceIcon name="mobility" />
            <span>
              <strong>设置边界</strong>
              <small>
                当前为 Mock / 页面内存状态；正式偏好 Schema 与 Planner Contract
                尚未接入。
              </small>
            </span>
          </div>
        )}
      </div>

      <footer className={styles.actionBar}>
        <button
          type="button"
          className={styles.restoreButton}
          onClick={restoreDefaults}
        >
          <PreferenceIcon name="reset" />
          恢复默认
        </button>
        <span className={styles.changeState} aria-live="polite">
          {savedMessage
            ? "✓ 已保存"
            : isDirty
              ? "有未保存的修改"
              : "所有修改已保存"}
        </span>
        <div>
          <button
            type="button"
            className={styles.cancelButton}
            onClick={cancel}
          >
            取消
          </button>
          <button type="button" className={styles.saveButton} onClick={save}>
            保存偏好
          </button>
        </div>
      </footer>
    </div>
  );
}
