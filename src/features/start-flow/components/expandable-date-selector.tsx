import type { DateMode } from "../model/start-flow-draft";
import styles from "../start-flow.module.css";
import { CalendarPopover } from "./calendar-popover";
import { PlannedDatePopover } from "./planned-date-popover";
import { InfoPopover } from "./info-popover";

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
      <legend>
        旅行日期{" "}
        <InfoPopover
          label="旅行日期说明"
          text="具体日期用于计算天数；计划日期可填写大致时间，暂未决定也能继续。"
        />
      </legend>
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
              <CalendarPopover
                label="出发日期"
                onChange={(value) => onExactDateChange("departure", value)}
                value={exactDeparture}
              />
              <span aria-hidden="true" className={styles.dateArrow}>
                →
              </span>
              <CalendarPopover
                label="返回日期"
                min={exactDeparture || undefined}
                onChange={(value) => onExactDateChange("return", value)}
                value={exactReturn}
              />
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
              <PlannedDatePopover
                label="计划出发"
                options={PLAN_OPTIONS}
                value={plannedDeparture}
                onChange={(value) => onPlannedDateChange("departure", value)}
              />
              <span aria-hidden="true" className={styles.dateArrow}>
                →
              </span>
              <PlannedDatePopover
                label="计划返回"
                options={PLAN_OPTIONS}
                value={plannedReturn}
                onChange={(value) => onPlannedDateChange("return", value)}
              />
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
