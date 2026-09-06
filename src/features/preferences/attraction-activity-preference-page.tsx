"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { GuardedLink } from "@/features/personal-center/components/guarded-link";
import { usePersonalNavigationGuard } from "@/features/personal-center/components/navigation-guard-context";

import {
  attractionActivityPreferencesEqual,
  attractionPreferenceDimensions,
  attractionPreferenceLevels,
  cancelAttractionActivityPreferenceChanges,
  createDefaultAttractionActivityPreferenceState,
  restoreAttractionActivityPreferenceDefaults,
  saveAttractionActivityPreference,
  setAttractionPreferenceLevel,
  summarizeAttractionActivityPreference,
  togglePhotoExperience,
  type AttractionActivityPreferenceState,
} from "./attraction-activity-preference-model";
import { PreferenceIcon } from "./preference-icon";
import styles from "./attraction-activity-preference.module.css";

function SectionMark({ children }: { children: string }) {
  return <span className={styles.sectionMark}>{children}</span>;
}

export function AttractionActivityPreferencePage() {
  const initialState = useMemo(
    () => createDefaultAttractionActivityPreferenceState(),
    [],
  );
  const [saved, setSaved] =
    useState<AttractionActivityPreferenceState>(initialState);
  const [draft, setDraft] =
    useState<AttractionActivityPreferenceState>(initialState);
  const [savedMessage, setSavedMessage] = useState(false);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { setIsDirty } = usePersonalNavigationGuard();
  const isDirty = !attractionActivityPreferencesEqual(saved, draft);
  const summary = summarizeAttractionActivityPreference(draft);

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

  function save() {
    setSaved(saveAttractionActivityPreference(draft));
    setSavedMessage(true);
    if (messageTimer.current) clearTimeout(messageTimer.current);
    messageTimer.current = setTimeout(() => setSavedMessage(false), 2200);
  }

  function cancel() {
    setDraft(cancelAttractionActivityPreferenceChanges(saved));
    setSavedMessage(false);
  }

  function restoreDefaults() {
    setDraft(restoreAttractionActivityPreferenceDefaults());
    setSavedMessage(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p>ATTRACTION &amp; ACTIVITY PREFERENCE</p>
          <h1>景点与活动偏好</h1>
          <span>设置你长期喜欢观看与参与的旅行体验</span>
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
        aria-labelledby="attraction-summary-title"
      >
        <Image
          src="/media/personal-center/preferences/category-attractions.webp"
          alt=""
          fill
          sizes="(max-width: 767px) 100vw, 720px"
          priority
        />
        <div className={styles.summaryShade} />
        <div className={styles.summaryContent}>
          <span className={styles.scopeBadge}>仅长期默认 · 页面内存</span>
          <p id="attraction-summary-title">当前景点偏好</p>
          <h2 aria-live="polite">{summary}</h2>
          <span>摘要只展示最多三项“很喜欢 / 喜欢”，并随当前草稿实时变化。</span>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="dimension-title">
        <div className={styles.sectionHeading}>
          <SectionMark>01</SectionMark>
          <div>
            <h2 id="dimension-title">景点偏好六个维度</h2>
            <p>为每个维度选择一个直观等级；没有选择时保留为“未设置”。</p>
          </div>
        </div>

        <div className={styles.dimensionGrid}>
          {attractionPreferenceDimensions.map((dimension) => {
            const currentLevel = draft.dimensions[dimension.key];
            return (
              <article
                key={dimension.key}
                className={styles.dimensionCard}
                data-dimension={dimension.key}
                data-level={currentLevel}
              >
                <div className={styles.dimensionHeading}>
                  <span className={styles.dimensionGlyph} aria-hidden="true">
                    {dimension.label.slice(0, 1)}
                  </span>
                  <div>
                    <h3>{dimension.label}</h3>
                    <p>{dimension.description}</p>
                  </div>
                </div>
                <div
                  className={styles.levelGrid}
                  role="radiogroup"
                  aria-label={`${dimension.label}偏好等级`}
                >
                  {attractionPreferenceLevels.map((level) => {
                    const selected = currentLevel === level.key;
                    return (
                      <button
                        key={level.key}
                        type="button"
                        role="radio"
                        aria-label={`${dimension.label}：${level.label}`}
                        aria-checked={selected}
                        data-selected={selected ? "true" : undefined}
                        onClick={() => {
                          setSavedMessage(false);
                          setDraft((current) =>
                            setAttractionPreferenceLevel(
                              current,
                              dimension.key,
                              level.key,
                            ),
                          );
                        }}
                      >
                        {level.label}
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="photo-title">
        <div className={styles.sectionHeading}>
          <SectionMark>02</SectionMark>
          <div>
            <h2 id="photo-title">拍照体验详细偏好</h2>
            <p>只记录是否希望在长期默认里主动安排拍照体验。</p>
          </div>
        </div>
        <label className={styles.photoPreference}>
          <input
            type="checkbox"
            checked={draft.photoExperience}
            onChange={() => {
              setSavedMessage(false);
              setDraft(togglePhotoExperience);
            }}
          />
          <span className={styles.checkboxMark} aria-hidden="true">
            ✓
          </span>
          <span>
            <strong>旅行中希望主动安排拍照体验</strong>
            <small>更重视取景价值、光线条件和拍照停留体验。</small>
          </span>
        </label>
      </section>

      <section className={styles.boundaryCard} aria-labelledby="boundary-title">
        <span className={styles.boundaryIcon} aria-hidden="true">
          <PreferenceIcon name="settings" />
        </span>
        <div>
          <h2 id="boundary-title">更多详细设置边界</h2>
          <p>
            本页不冻结尚未确认的细分类，也不保存具体 Trip / POI 的“必去 / 希望去
            / 可去 / 不去”。
          </p>
          <ul>
            <li>Persistence: Mock / in-memory only</li>
            <li>Formal Preference Schema: Not implemented</li>
            <li>Planner Contract: Not implemented</li>
          </ul>
        </div>
      </section>

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
