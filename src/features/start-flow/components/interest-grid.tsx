"use client";

import { useState } from "react";

import { INTERESTS } from "../model/start-flow-draft";
import type { Interest } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { InterestDetailModal } from "./interest-detail-modal";
import { INTEREST_ICONS, WizardIcon } from "./wizard-icon";

interface InterestGridProps {
  dislikes: Interest[];
  likes: Interest[];
  onCycle: (interest: Interest) => void;
  details: Partial<Record<Interest, string[]>>;
  onDetailsChange: (interest: Interest, values: string[]) => void;
}

export function InterestGrid({
  details,
  dislikes,
  likes,
  onCycle,
  onDetailsChange,
}: InterestGridProps) {
  const [detailInterest, setDetailInterest] = useState<Interest | null>(null);
  return (
    <div className={styles.interestSection}>
      <div className={styles.sectionHeadingRow}>
        <h2>您的兴趣</h2>
        <p>
          喜欢 {likes.length}/3 · 不喜欢 {dislikes.length}/3
        </p>
      </div>
      <div className={styles.interestGrid}>
        {INTERESTS.map((interest) => {
          const preference = likes.includes(interest)
            ? "like"
            : dislikes.includes(interest)
              ? "dislike"
              : "neutral";
          const stateLabel =
            preference === "like"
              ? "喜欢"
              : preference === "dislike"
                ? "不喜欢"
                : "未选择";

          return (
            <div className={styles.interestCardWrap} key={interest}>
              <button
                aria-label={`${interest}，当前${stateLabel}；点击切换`}
                className={styles.interestCard}
                data-preference={preference}
                onClick={() => onCycle(interest)}
                type="button"
              >
                <span className={styles.iconText}>
                  <WizardIcon name={INTEREST_ICONS[interest]} />
                  {interest}
                </span>
                <small>{stateLabel}</small>
              </button>
              <button
                aria-label={`设置${interest}详细偏好`}
                className={styles.interestDetailTrigger}
                data-filled={(details[interest]?.length ?? 0) > 0}
                onClick={() => setDetailInterest(interest)}
                type="button"
              >
                {(details[interest]?.length ?? 0) > 0 ? "已细化" : "细化"}
              </button>
            </div>
          );
        })}
      </div>
      <p className={styles.interestHint}>
        点击卡片依次切换：喜欢 → 不喜欢 → 中性。
      </p>
      {detailInterest ? (
        <InterestDetailModal
          interest={detailInterest}
          onClose={() => setDetailInterest(null)}
          onConfirm={(values) => onDetailsChange(detailInterest, values)}
          values={details[detailInterest] ?? []}
        />
      ) : null}
    </div>
  );
}
