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

      <section
        className={`${styles.section} ${styles.detailScopeSection}`}
        aria-labelledby="boundary-title"
      >
        <div className={styles.sectionHeading}>
          <SectionMark>03</SectionMark>
          <div>
            <h2 id="boundary-title">更多详细偏好</h2>
            <p>分清长期默认、单次旅行与同行人偏好，再进入更细的设置。</p>
          </div>
        </div>

        <div className={styles.scopeStatement}>
          <span className={styles.boundaryIcon} aria-hidden="true">
            <PreferenceIcon name="settings" />
          </span>
          <div>
            <p>本页负责</p>
            <h3>“我通常喜欢怎样的景点与活动”</h3>
            <span>
              六个维度用于快速表达喜好，拍照体验是当前已确认的详细行为偏好。
            </span>
          </div>
        </div>

        <div className={styles.scopeGrid}>
          <article className={styles.scopeCard} data-scope="available">
            <span className={styles.scopeCardBadge}>本页已提供</span>
            <h3>长期景点偏好</h3>
            <p>用于表达可复用的个人默认，不绑定某一次行程。</p>
            <ul>
              <li>六维喜好的四级快速设置</li>
              <li>拍照体验详细偏好</li>
              <li>摘要、恢复默认、取消与保存</li>
            </ul>
          </article>

          <article className={styles.scopeCard} data-scope="trip">
            <span className={styles.scopeCardBadge}>具体旅行中设置</span>
            <h3>Trip / POI 临时条件</h3>
            <p>这些条件依赖目的地、日期与当天安排，应在 Planner 中调整。</p>
            <ul>
              <li>必去 / 希望去 / 可去 / 不去与具体地点锁定</li>
              <li>日出、日落、夜景、黄金时段与拍照停留</li>
              <li>人流、排队、天气、室内外与游览顺序</li>
            </ul>
            <small>不会从本页写入或反向覆盖长期偏好。</small>
          </article>

          <article className={styles.scopeCard} data-scope="companion">
            <span className={styles.scopeCardBadge}>同行人单独管理</span>
            <h3>同行人的个人倾向</h3>
            <p>同行人喜欢拍照、户外或博物馆等信息属于各自资料。</p>
            <ul>
              <li>与当前用户的长期偏好分开</li>
              <li>组合出行时作为同行人信息使用</li>
            </ul>
          </article>

          <article className={styles.scopeCard} data-scope="future">
            <span className={styles.scopeCardBadge}>设计冻结后开放</span>
            <h3>候选详细范围</h3>
            <p>设计书已提出方向，但尚未形成正式 Preference Master Data。</p>
            <ul>
              <li>景点类别、活动形式与行为目的</li>
              <li>强度、时间适配、热门 / 小众倾向</li>
              <li>更多文化、自然、购物与娱乐细分类</li>
            </ul>
            <small>候选范围，不是当前已保存字段。</small>
          </article>
        </div>

        <dl className={styles.contractGrid} aria-label="当前实现边界">
          <div>
            <dt>Persistence</dt>
            <dd>Mock / in-memory only</dd>
          </div>
          <div>
            <dt>Formal Preference Schema</dt>
            <dd>Not implemented</dd>
          </div>
          <div>
            <dt>Planner Contract</dt>
            <dd>Not implemented</dd>
          </div>
        </dl>
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
