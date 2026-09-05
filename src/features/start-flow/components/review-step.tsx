import type { Ref } from "react";

import { Button } from "@/components/ui/button";

import type { StartFlowDraft } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

const COMPANION_LABELS = {
  adultMale: "成人男性",
  adultFemale: "成人女性",
  child: "小孩",
  infant: "婴儿",
} as const;

interface ReviewStepProps {
  draft: StartFlowDraft;
  headingRef: Ref<HTMLHeadingElement>;
  onEdit: (step: number) => void;
}

function formatDate(date: string) {
  if (!date) {
    return "";
  }

  const [year, month, day] = date.split("-").map(Number);
  return `${year}年${month}月${day}日`;
}

function formatTiming(draft: StartFlowDraft) {
  const { startDate, endDate, durationDays } = draft.timing;
  const parts: string[] = [];

  if (startDate && endDate) {
    parts.push(`${formatDate(startDate)} — ${formatDate(endDate)}`);
  } else if (startDate) {
    parts.push(`${formatDate(startDate)} 起`);
  } else if (endDate) {
    parts.push(`${formatDate(endDate)} 前结束`);
  }

  if (durationDays !== null) {
    parts.push(`${durationDays} 天`);
  }

  return parts.join("，");
}

function formatCompanions(draft: StartFlowDraft) {
  return Object.entries(draft.companions)
    .filter(([, count]) => count > 0)
    .map(
      ([key, count]) =>
        `${COMPANION_LABELS[key as keyof typeof COMPANION_LABELS]} ${count} 人`,
    )
    .join("、");
}

export function ReviewStep({ draft, headingRef, onEdit }: ReviewStepProps) {
  const sections = [
    { label: "目的地", value: draft.destination, step: 0 },
    { label: "日期 / 天数", value: formatTiming(draft), step: 1 },
    { label: "同行人", value: formatCompanions(draft), step: 2 },
    {
      label: "必要硬限制",
      value: draft.hardConstraintsNote || "暂无",
      step: 3,
    },
  ];

  return (
    <section aria-labelledby="review-heading" className={styles.step}>
      <p className={styles.eyebrow}>REVIEW</p>
      <h1
        className={styles.stepTitle}
        id="review-heading"
        ref={headingRef}
        tabIndex={-1}
      >
        确认一下这次旅行
      </h1>
      <p className={styles.stepDescription}>
        这些信息将成为后续行程规划的起点，您还可以返回任意一步修改。
      </p>
      <dl className={styles.reviewList}>
        {sections.map((section) => (
          <div className={styles.reviewItem} key={section.label}>
            <div>
              <dt className={styles.reviewLabel}>{section.label}</dt>
              <dd className={styles.reviewValue}>{section.value}</dd>
            </div>
            <Button
              aria-label={`修改${section.label}`}
              onClick={() => onEdit(section.step)}
              size="small"
              variant="ghost"
            >
              修改
            </Button>
          </div>
        ))}
      </dl>
    </section>
  );
}
