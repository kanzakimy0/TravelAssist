"use client";

import { useState } from "react";

import type {
  TransportDetails,
  TransportMode,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { TransportDetailModal } from "./detail-modals";

const OPTIONS: Array<{ id: TransportMode; label: string }> = [
  { id: "recommended", label: "✨ 系统推荐" },
  { id: "public", label: "公共交通" },
  { id: "driving", label: "自驾" },
  { id: "mixed", label: "混合方式" },
];

interface TransportSelectorProps {
  details: TransportDetails;
  onChange: (value: TransportMode) => void;
  onDetailsChange: (patch: Partial<TransportDetails>) => void;
  value: TransportMode;
}

export function TransportSelector({
  details,
  onChange,
  onDetailsChange,
  value,
}: TransportSelectorProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <fieldset className={styles.choiceGroup}>
      <legend>交通方式</legend>
      <div className={styles.transportGrid}>
        {OPTIONS.map((option) => (
          <button
            aria-checked={value === option.id}
            className={styles.compactChoice}
            data-selected={value === option.id}
            key={option.id}
            onClick={() => onChange(option.id)}
            role="radio"
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <button
        aria-haspopup="dialog"
        className={styles.detailTrigger}
        onClick={() => setShowDetails(true)}
        type="button"
      >
        设置交通详情 →
      </button>
      {showDetails ? (
        <TransportDetailModal
          mode={value}
          onChange={onDetailsChange}
          onClose={() => setShowDetails(false)}
          value={details}
        />
      ) : null}
    </fieldset>
  );
}
