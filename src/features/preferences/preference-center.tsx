"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import {
  countConfiguredPreferences,
  createDefaultPreferenceState,
  createResetPreferenceState,
  describePreference,
} from "./preference-model";
import { PreferenceIcon } from "./preference-icon";
import { PreferenceRadar } from "./preference-radar";
import styles from "./preference-center.module.css";

export function PreferenceCenter() {
  const [preferences, setPreferences] = useState(createDefaultPreferenceState);
  const [resetOpen, setResetOpen] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const portrait = describePreference(preferences);
  const configuredCount = countConfiguredPreferences(preferences);

  useEffect(() => {
    if (resetOpen) cancelButtonRef.current?.focus();
  }, [resetOpen]);

  return (
    <div className={styles.preferencePage} data-preference-page>
      <header className={styles.pageHeader}>
        <div className={styles.headerTitleRow}>
          <span
            className={styles.titleFlower}
            data-title-flower
            aria-hidden="true"
          >
            ✿
          </span>
          <div>
            <h1 data-primary-page-title>旅行偏好</h1>
            <span>
              这些是您长期的默认偏好，将在未来的行程规划中为您提供更个性化的推荐。
            </span>
          </div>
        </div>
        <div className={styles.headerActions}>
          <Link
            href="/personal-center/preferences/advanced"
            className={styles.secondaryButton}
          >
            <PreferenceIcon name="settings" />
            更多详细设置
          </Link>
          <button
            type="button"
            className={styles.resetButton}
            onClick={() => setResetOpen(true)}
          >
            <PreferenceIcon name="reset" />
            重置偏好
          </button>
        </div>
      </header>

      <section className={styles.radarGrid} aria-label="长期偏好画像">
        <PreferenceRadar
          title="景点偏好画像"
          description="您更容易被哪些目的地体验吸引"
          axes={preferences.attractions}
          image="/media/personal-center/preferences/radar-attractions.webp"
          icon="attractions"
          summary="偏爱自然、历史与摄影，也喜欢有人文气息的目的地。"
        />
        <PreferenceRadar
          title="旅行风格画像"
          description="您喜欢怎样安排与感受一段旅程"
          axes={preferences.travelStyle}
          image="/media/personal-center/preferences/radar-travel-style.webp"
          icon="experience"
          summary="喜欢轻松、有计划的旅程，也愿意体验当地文化与深度探索。"
        />
      </section>

      <section
        className={styles.portraitSummary}
        aria-labelledby="portrait-title"
      >
        <div className={styles.portraitIcon} aria-hidden="true">
          旅
        </div>
        <div className={styles.portraitCopy}>
          <div className={styles.summaryTitleRow}>
            <h2 id="portrait-title">您的旅行画像</h2>
            <button
              type="button"
              className={styles.helpButton}
              aria-describedby="portrait-help"
              aria-label="旅行画像说明"
            >
              ?
              <span id="portrait-help" role="tooltip">
                画像根据您保存的长期偏好生成。具体旅行中的临时调整不会永久改变这里。
              </span>
            </button>
            <span className={styles.configuredBadge}>
              {configuredCount} 项已设置
            </span>
          </div>
          {portrait ? (
            <p className={styles.portraitSentence}>{portrait}</p>
          ) : (
            <div className={styles.emptyPortrait}>
              <strong>还没有形成完整的旅行画像</strong>
              <p>设置几项偏好后，TravelAssist 会在这里为您整理旅行风格。</p>
              <Link href="/personal-center/preferences/advanced">
                开始设置偏好
              </Link>
            </div>
          )}
        </div>
      </section>

      <section
        className={styles.categorySection}
        aria-labelledby="category-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <p>PREFERENCE CATEGORIES</p>
            <h2 id="category-title">详细偏好</h2>
          </div>
          <span>选择一个类别查看当前长期偏好摘要</span>
        </div>
        <div className={styles.categoryGrid}>
          {preferences.categories.map((category) => (
            <Link
              key={category.key}
              href={category.route}
              className={styles.categoryCard}
            >
              <span className={styles.categoryArtwork} aria-hidden="true">
                <Image
                  src={category.image}
                  alt=""
                  fill
                  sizes="(max-width: 600px) 35vw, (max-width: 860px) 20vw, 120px"
                />
              </span>
              <span className={styles.categoryIcon} aria-hidden="true">
                <PreferenceIcon name={category.icon} />
              </span>
              <span className={styles.categoryContent}>
                <strong>{category.title}</strong>
                <small>{category.summary}</small>
              </span>
              <span className={styles.categoryArrow} aria-hidden="true">
                <PreferenceIcon name="arrow" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className={styles.preferenceActions} aria-label="偏好管理操作">
        <Link
          href="/personal-center/preferences/advanced"
          className={styles.preferenceAction}
        >
          <span className={styles.actionIcon} aria-hidden="true">
            <PreferenceIcon name="settings" />
          </span>
          <strong>更多详细设置</strong>
          <small>调整更细致的偏好选项，让推荐更符合您的需求。</small>
          <span className={styles.actionArrow} aria-hidden="true">
            <PreferenceIcon name="arrow" />
          </span>
        </Link>
        <button
          type="button"
          className={styles.preferenceAction}
          onClick={() => setResetOpen(true)}
        >
          <span className={styles.actionIcon} aria-hidden="true">
            <PreferenceIcon name="reset" />
          </span>
          <strong>重置偏好</strong>
          <small>将所有偏好恢复为默认设置。</small>
          <span className={styles.actionArrow} aria-hidden="true">
            <PreferenceIcon name="arrow" />
          </span>
        </button>
      </section>

      {resetOpen ? (
        <div
          className={styles.dialogBackdrop}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setResetOpen(false);
          }}
        >
          <section
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="reset-title"
            aria-describedby="reset-description"
          >
            <span className={styles.dialogIcon} aria-hidden="true">
              <PreferenceIcon name="reset" />
            </span>
            <h2 id="reset-title">重置长期偏好？</h2>
            <p id="reset-description">
              这只会重置您的长期旅行偏好，不会删除账户、同行人或已保存的旅行。
            </p>
            <div className={styles.dialogActions}>
              <button
                ref={cancelButtonRef}
                type="button"
                className={styles.secondaryButton}
                onClick={() => setResetOpen(false)}
              >
                取消
              </button>
              <button
                type="button"
                className={styles.confirmResetButton}
                onClick={() => {
                  setPreferences(createResetPreferenceState());
                  setResetOpen(false);
                }}
              >
                重置偏好
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
