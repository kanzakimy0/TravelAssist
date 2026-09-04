import { INTERESTS } from "../model/start-flow-draft";
import type { Interest } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

interface InterestGridProps {
  dislikes: Interest[];
  likes: Interest[];
  onCycle: (interest: Interest) => void;
}

export function InterestGrid({ dislikes, likes, onCycle }: InterestGridProps) {
  return (
    <div className={styles.interestSection}>
      <div className={styles.sectionHeadingRow}>
        <h2>你的兴趣</h2>
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
            <button
              aria-label={`${interest}，当前${stateLabel}；点击切换`}
              className={styles.interestCard}
              data-preference={preference}
              key={interest}
              onClick={() => onCycle(interest)}
              type="button"
            >
              <span>{interest}</span>
              <small>{stateLabel}</small>
            </button>
          );
        })}
      </div>
      <p className={styles.interestHint}>
        点击卡片依次切换：喜欢 → 不喜欢 → 中性。
      </p>
    </div>
  );
}
