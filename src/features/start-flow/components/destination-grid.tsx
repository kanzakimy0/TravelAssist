"use client";

import { useState } from "react";

import styles from "../start-flow.module.css";
import { MoreRegionsModal } from "./more-regions-modal";
import { DESTINATION_ICONS, WizardIcon } from "./wizard-icon";

const PRIMARY_DESTINATIONS = [
  "东京",
  "大阪/关西",
  "北海道",
  "京都",
  "中部",
  "九州",
  "冲绳",
] as const;

interface DestinationGridProps {
  onPrefecturesChange: (values: string[]) => void;
  onToggle: (destination: string) => void;
  selectedPrefectures: string[];
  values: string[];
}

export function DestinationGrid({
  onPrefecturesChange,
  onToggle,
  selectedPrefectures,
  values,
}: DestinationGridProps) {
  const [showMore, setShowMore] = useState(false);

  return (
    <fieldset className={styles.choiceGroup}>
      <legend>目的地</legend>
      <div className={styles.destinationGrid}>
        {PRIMARY_DESTINATIONS.map((destination) => (
          <button
            aria-pressed={values.includes(destination)}
            className={styles.compactChoice}
            data-selected={values.includes(destination)}
            key={destination}
            onClick={() => onToggle(destination)}
            type="button"
          >
            <span className={styles.iconText}>
              <WizardIcon name={DESTINATION_ICONS[destination]} />
              {destination}
            </span>
          </button>
        ))}
        <button
          aria-haspopup="dialog"
          aria-pressed={selectedPrefectures.length > 0}
          className={styles.compactChoice}
          data-selected={selectedPrefectures.length > 0}
          onClick={() => setShowMore(true)}
          type="button"
        >
          <span className={styles.iconText}>
            <WizardIcon name="japanPlus" />
            更多地区
            {selectedPrefectures.length
              ? ` · ${selectedPrefectures.length}`
              : ""}
          </span>
        </button>
      </div>
      {selectedPrefectures.length ? (
        <p className={styles.destinationSummary}>
          更多地区：{selectedPrefectures.join("、")}
        </p>
      ) : null}
      {showMore ? (
        <MoreRegionsModal
          onClose={() => setShowMore(false)}
          onConfirm={onPrefecturesChange}
          selected={selectedPrefectures}
        />
      ) : null}
    </fieldset>
  );
}
