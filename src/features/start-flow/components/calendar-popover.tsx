import type { ChangeEvent, MouseEvent } from "react";

interface CalendarPopoverProps {
  label: string;
  min?: string;
  onChange: (value: string) => void;
  value: string;
}

export function CalendarPopover({
  label,
  min,
  onChange,
  value,
}: CalendarPopoverProps) {
  function openCalendar(event: MouseEvent<HTMLInputElement>) {
    event.currentTarget.showPicker?.();
  }

  return (
    <label>
      <span>{label}</span>
      <input
        aria-label={`${label}日历`}
        min={min}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          onChange(event.target.value)
        }
        onClick={openCalendar}
        type="date"
        value={value}
      />
    </label>
  );
}
