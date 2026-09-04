"use client";

import { useState } from "react";

import type { TravelerDetails, TripParty } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { TravelerDetailModal } from "./detail-modals";

const PARTY_ITEMS: Array<{ key: keyof TripParty; label: string }> = [
  { key: "adults", label: "成人" },
  { key: "children", label: "儿童" },
  { key: "infants", label: "婴幼儿" },
  { key: "seniors", label: "老人" },
];

interface PartyCounterProps {
  details: TravelerDetails;
  onChange: (key: keyof TripParty, value: number) => void;
  onDetailsChange: (patch: Partial<TravelerDetails>) => void;
  value: TripParty;
}

export function PartyCounter({
  details,
  onChange,
  onDetailsChange,
  value,
}: PartyCounterProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <fieldset className={styles.choiceGroup}>
      <legend>同行人员</legend>
      <div className={styles.partyGrid}>
        {PARTY_ITEMS.map((item) => (
          <div className={styles.partyRow} key={item.key}>
            <span>{item.label}</span>
            <span className={styles.counter}>
              <button
                aria-label={`减少${item.label}`}
                disabled={value[item.key] === 0}
                onClick={() => onChange(item.key, value[item.key] - 1)}
                type="button"
              >
                −
              </button>
              <output aria-label={`${item.label}数量`}>
                {value[item.key]}
              </output>
              <button
                aria-label={`增加${item.label}`}
                disabled={value[item.key] >= 12}
                onClick={() => onChange(item.key, value[item.key] + 1)}
                type="button"
              >
                +
              </button>
            </span>
          </div>
        ))}
      </div>
      <button
        aria-haspopup="dialog"
        className={styles.detailTrigger}
        onClick={() => setShowDetails(true)}
        type="button"
      >
        补充儿童 / 老人详情 →
      </button>
      {showDetails ? (
        <TravelerDetailModal
          onChange={onDetailsChange}
          onClose={() => setShowDetails(false)}
          value={details}
        />
      ) : null}
    </fieldset>
  );
}
