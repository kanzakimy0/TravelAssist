import type { DateMode } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";

interface ExpandableDateSelectorProps {
  dateMode: DateMode | null;
  durationDays: number | null;
  exactDeparture: string;
  exactReturn: string;
  onDateModeChange: (mode: DateMode) => void;
  onExactDateChange: (field: "departure" | "return", value: string) => void;
  onPlannedDateChange: (field: "departure" | "return", value: string) => void;
  plannedDeparture: string;
  plannedReturn: string;
}

const PLAN_OPTIONS = [
  "2026年9月上旬",
  "2026年9月中旬",
  "2026年9月下旬",
  "2026年10月整月",
  "2026年11月上旬",
  "2026年12月整月",
  "2027年1月整月",
  "2027年3月下旬",
  "2027年4月上旬",
  "2027年春季",
  "2027年夏季",
] as const;

export function ExpandableDateSelector({
  dateMode,
  durationDays,
  exactDeparture,
  exactReturn,
  onDateModeChange,
  onExactDateChange,
  onPlannedDateChange,
  plannedDeparture,
  plannedReturn,
}: ExpandableDateSelectorProps) {
  return (
    <fieldset className={styles.dateFieldset}>
      <legend>旅行日期</legend>
      <div className={styles.dateModeRow}>
        <div
          className={styles.dateModeOption}
          data-expanded={dateMode === "exact"}
        >
          <button
            aria-pressed={dateMode === "exact"}
            onClick={() => onDateModeChange("exact")}
            type="button"
          >
            具体日期
          </button>
          {dateMode === "exact" ? (
            <div className={styles.dateInlineFields}>
              <span aria-hidden="true" className={styles.dateDivider} />
              <label>
                <span>出发日期</span>
                <input
                  onChange={(event) =>
                    onExactDateChange("departure", event.target.value)
                  }
                  type="date"
                  value={exactDeparture}
                />
              </label>
              <span aria-hidden="true" className={styles.dateArrow}>
                →
              </span>
              <label>
                <span>返回日期</span>
                <input
                  min={exactDeparture || undefined}
                  onChange={(event) =>
                    onExactDateChange("return", event.target.value)
                  }
                  type="date"
                  value={exactReturn}
                />
              </label>
            </div>
          ) : null}
        </div>
        <div
          className={styles.dateModeOption}
          data-expanded={dateMode === "planned"}
        >
          <button
            aria-pressed={dateMode === "planned"}
            onClick={() => onDateModeChange("planned")}
            type="button"
          >
            计划日期
          </button>
          {dateMode === "planned" ? (
            <div className={styles.dateInlineFields}>
              <span aria-hidden="true" className={styles.dateDivider} />
              <label>
                <span>计划出发</span>
                <select
                  onChange={(event) =>
                    onPlannedDateChange("departure", event.target.value)
                  }
                  value={plannedDeparture}
                >
                  <option value="">选择时间</option>
                  {PLAN_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
              <span aria-hidden="true" className={styles.dateArrow}>
                →
              </span>
              <label>
                <span>计划返回</span>
                <select
                  onChange={(event) =>
                    onPlannedDateChange("return", event.target.value)
                  }
                  value={plannedReturn}
                >
                  <option value="">选择时间</option>
                  {PLAN_OPTIONS.map((option) => (
                    <option key={option}>{option}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
        <div className={styles.dateModeOption}>
          <button
            aria-pressed={dateMode === "undecided"}
            onClick={() => onDateModeChange("undecided")}
            type="button"
          >
            还没决定
          </button>
        </div>
      </div>
      {dateMode === "exact" && durationDays ? (
        <p className={styles.durationNote}>共 {durationDays} 天</p>
      ) : null}
    </fieldset>
  );
}
