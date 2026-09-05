/** Local calendar dates, without UTC conversion that shifts the selected day. */
export function toDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function fromDateValue(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function calendarDays(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from(
    { length: 42 },
    (_, index) =>
      new Date(first.getFullYear(), first.getMonth(), 1 - offset + index),
  );
}

export function moveCalendarDate(date: Date, key: string): Date {
  const result = new Date(date);
  const offsets: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -7,
    ArrowDown: 7,
  };
  if (key in offsets) result.setDate(result.getDate() + offsets[key]);
  if (key === "Home")
    result.setDate(result.getDate() - ((result.getDay() + 6) % 7));
  if (key === "End")
    result.setDate(result.getDate() + 6 - ((result.getDay() + 6) % 7));
  if (key === "PageUp" || key === "PageDown") {
    const day = result.getDate();
    result.setDate(1);
    result.setMonth(result.getMonth() + (key === "PageUp" ? -1 : 1));
    const lastDay = new Date(
      result.getFullYear(),
      result.getMonth() + 1,
      0,
    ).getDate();
    result.setDate(Math.min(day, lastDay));
  }
  return result;
}
