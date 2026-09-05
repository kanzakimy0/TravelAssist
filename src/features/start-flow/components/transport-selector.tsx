"use client";

import { useState } from "react";

import type {
  TransportDetails,
  TransportMode,
} from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { TransportDetailModal } from "./detail-modals";
import { SquareOptionCard } from "./square-option-card";
import type { WizardIconName } from "./wizard-icon";

const OPTIONS: Array<{
  id: TransportMode;
  label: string;
  icon: WizardIconName;
}> = [
  { id: "recommended", label: "系统推荐", icon: "sparkle" },
  { id: "public", label: "公共交通", icon: "train" },
  { id: "driving", label: "自驾", icon: "car" },
  { id: "mixed", label: "混合方式", icon: "interchange" },
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
      <div
        className={styles.transportGrid}
        role="radiogroup"
        aria-label="交通方式"
      >
        {OPTIONS.map((option) => (
          <SquareOptionCard
            selected={value === option.id}
            key={option.id}
            onClick={() => onChange(option.id)}
            label={option.label}
            icon={option.icon}
          />
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
