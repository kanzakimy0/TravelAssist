import styles from "../themed-popover.module.css";
import { ThemedPopover } from "./themed-popover";

export function PlannedDatePopover({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ThemedPopover label={label} role="listbox" value={value || "选择时间"}>
      {(close) => (
        <div
          className={styles.options}
          onKeyDown={(event) => {
            const buttons = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                "[role='option']",
              ),
            );
            const index = buttons.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next =
              event.key === "Home"
                ? 0
                : event.key === "End"
                  ? buttons.length - 1
                  : event.key === "ArrowDown"
                    ? (index + 1) % buttons.length
                    : event.key === "ArrowUp"
                      ? (index - 1 + buttons.length) % buttons.length
                      : -1;
            if (next >= 0) {
              event.preventDefault();
              buttons[next]?.focus();
            }
          }}
        >
          {["", ...options].map((option) => (
            <button
              aria-selected={value === option}
              data-autofocus={value === option}
              key={option}
              onClick={() => {
                onChange(option);
                close();
              }}
              role="option"
              type="button"
            >
              <span>{option || "选择时间"}</span>
              <span aria-hidden="true">{value === option ? "✓" : ""}</span>
            </button>
          ))}
        </div>
      )}
    </ThemedPopover>
  );
}
