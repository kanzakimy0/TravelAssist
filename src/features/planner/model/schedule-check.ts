/** Local structural checks only. No live traffic, opening-hours or availability claims. */
export type ScheduledItem = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  type: string;
  day?: number;
  fixed?: boolean;
  fixedTime?: boolean;
  locked?: boolean;
};
const minute = (time: string) =>
  Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export function validateSchedule(
  item: Pick<ScheduledItem, "title" | "startTime" | "endTime">,
) {
  if (!item.title.trim()) return "请填写行程名称，不能只有空格。";
  if (
    ![item.startTime, item.endTime].every((t) =>
      /^([01]\d|2[0-3]):[0-5]\d$/.test(t),
    )
  )
    return "请输入有效的开始和结束时间。";
  if (minute(item.endTime) <= minute(item.startTime))
    return "结束时间必须晚于开始时间；跨日安排请拆分到对应日期。";
  return "";
}
export function scheduleConflicts(item: ScheduledItem, items: ScheduledItem[]) {
  if (item.type === "hotel") return [];
  return items.filter(
    (other) =>
      other.id !== item.id &&
      other.type !== "hotel" &&
      (other.day === undefined ||
        item.day === undefined ||
        other.day === item.day) &&
      minute(item.startTime) < minute(other.endTime) &&
      minute(item.endTime) > minute(other.startTime),
  );
}
export function editScheduleError(item: ScheduledItem, items: ScheduledItem[]) {
  const invalid = validateSchedule(item);
  if (invalid) return invalid;
  if (item.fixed || item.fixedTime || item.locked)
    return "此项目已固定或锁定。请先核对预约并解除限制，未修改原安排。";
  const conflicts = scheduleConflicts(item, items);
  return conflicts.length
    ? `与 ${conflicts.map((i) => i.title).join("、")} 时间重叠，未保存。`
    : "";
}
const clock = (value: number) =>
  `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
export function previewScheduleAdjustment(items: ScheduledItem[]) {
  const changes: {
    id: string;
    title: string;
    before: string;
    startTime: string;
    endTime: string;
  }[] = [];
  const blockers: string[] = [];
  let cursor: number | null = null;
  for (const item of [...items].sort((a, b) =>
    a.startTime.localeCompare(b.startTime),
  )) {
    if (item.type === "hotel") continue;
    const invalid = validateSchedule(item);
    if (invalid) {
      blockers.push(`${item.title}：${invalid}`);
      continue;
    }
    const start = minute(item.startTime),
      duration = minute(item.endTime) - start;
    const next = Math.max(start, cursor === null ? start : cursor + 15);
    if (next !== start && (item.fixed || item.fixedTime || item.locked)) {
      blockers.push(
        `${item.title} 为固定安排，无法自动留足缓冲；请缩短或替换前一项。`,
      );
      cursor = minute(item.endTime);
      continue;
    }
    if (next + duration > 1439) {
      blockers.push(`${item.title} 调整后超出当天，请减少安排或换日。`);
      continue;
    }
    if (next !== start)
      changes.push({
        id: item.id,
        title: item.title,
        before: `${item.startTime}–${item.endTime}`,
        startTime: clock(next),
        endTime: clock(next + duration),
      });
    cursor = next + duration;
  }
  return { changes, blockers };
}
