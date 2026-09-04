"use client";

import { useState } from "react";

import styles from "../start-flow.module.css";

const PRIMARY_DESTINATIONS = [
  "东京",
  "大阪/关西",
  "北海道",
  "京都",
  "中部",
  "九州",
  "冲绳",
] as const;

const MORE_DESTINATIONS = ["东北", "北陆", "中国地区", "四国"] as const;

interface DestinationGridProps {
  onToggle: (destination: string) => void;
  values: string[];
}

export function DestinationGrid({ onToggle, values }: DestinationGridProps) {
  const [showMore, setShowMore] = useState(false);
  const hasMoreSelection = MORE_DESTINATIONS.some((item) =>
    values.includes(item),
  );

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
            {destination}
          </button>
        ))}
        <button
          aria-expanded={showMore}
          aria-pressed={hasMoreSelection}
          className={styles.compactChoice}
          data-selected={hasMoreSelection}
          onClick={() => setShowMore((current) => !current)}
          type="button"
        >
          更多地区
        </button>
      </div>
      {showMore ? (
        <div className={styles.moreDestinations}>
          {MORE_DESTINATIONS.map((destination) => (
            <button
              aria-pressed={values.includes(destination)}
              data-selected={values.includes(destination)}
              key={destination}
              onClick={() => onToggle(destination)}
              type="button"
            >
              {destination}
            </button>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
