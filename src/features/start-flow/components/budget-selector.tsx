"use client";

import { useState } from "react";

import type { BudgetDetails, BudgetLevel } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { BudgetDetailModal } from "./detail-modals";
import { SquareOptionCard } from "./square-option-card";
import { InfoPopover } from "./info-popover";
import type { WizardIconName } from "./wizard-icon";

const OPTIONS: Array<{
  id: BudgetLevel;
  label: string;
  description: string;
  icon: WizardIconName;
}> = [
  { id: "economy", label: "经济", description: "精打细算", icon: "coin" },
  { id: "standard", label: "标准", description: "均衡舒适", icon: "balance" },
  { id: "comfort", label: "舒适", description: "体验优先", icon: "comfort" },
  { id: "premium", label: "高端", description: "品质享受", icon: "diamond" },
];

interface BudgetSelectorProps {
  details: BudgetDetails;
  onChange: (value: BudgetLevel) => void;
  onDetailsChange: (patch: Partial<BudgetDetails>) => void;
  value: BudgetLevel;
}

export function BudgetSelector({
  details,
  onChange,
  onDetailsChange,
  value,
}: BudgetSelectorProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <fieldset className={styles.choiceGroup}>
      <legend>
        预算范围{" "}
        <InfoPopover
          label="预算范围说明"
          text="预算档位用于平衡住宿、餐饮与体验，可在详情中补充金额和优先项。"
        />
      </legend>
      <div
        className={styles.budgetGrid}
        role="radiogroup"
        aria-label="预算范围"
      >
        {OPTIONS.map((option) => (
          <SquareOptionCard
            selected={value === option.id}
            key={option.id}
            onClick={() => onChange(option.id)}
            label={option.label}
            description={option.description}
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
        设置预算详情 →
      </button>
      {showDetails ? (
        <BudgetDetailModal
          onChange={onDetailsChange}
          onClose={() => setShowDetails(false)}
          value={details}
        />
      ) : null}
    </fieldset>
  );
}
