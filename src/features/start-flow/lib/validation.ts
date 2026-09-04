import type {
  StartFlowCompanions,
  StartFlowTiming,
} from "../model/start-flow-draft";

export interface TimingErrors {
  startDate?: string;
  endDate?: string;
  durationDays?: string;
}

export type CompanionField = keyof StartFlowCompanions;

export type CompanionErrors = Partial<Record<CompanionField | "group", string>>;

export function normalizeDestination(destination: string) {
  return destination.trim();
}

export function validateDestination(destination: string) {
  if (!normalizeDestination(destination)) {
    return "请输入这次旅行的大致目的地。";
  }

  return null;
}

export function validateTiming(timing: StartFlowTiming): TimingErrors {
  const errors: TimingErrors = {};
  const { durationDays } = timing;
  const hasStartDate = Boolean(timing.startDate);
  const hasEndDate = Boolean(timing.endDate);
  const hasDateRange = hasStartDate && hasEndDate;
  const hasDuration = durationDays !== null;

  if (!hasDateRange && !hasDuration) {
    errors.startDate = "请填写完整日期，或者提供旅行天数。";
  }

  if (hasStartDate !== hasEndDate && !hasDuration) {
    if (!hasStartDate) {
      errors.startDate = "请补充开始日期，或改填旅行天数。";
    }
    if (!hasEndDate) {
      errors.endDate = "请补充结束日期，或改填旅行天数。";
    }
  }

  if (hasDateRange && timing.endDate < timing.startDate) {
    errors.endDate = "结束日期不能早于开始日期。";
  }

  if (hasDuration && (!Number.isInteger(durationDays) || durationDays <= 0)) {
    errors.durationDays = "旅行天数必须是大于 0 的整数。";
  }

  return errors;
}

export function validateCompanions(
  companions: StartFlowCompanions,
): CompanionErrors {
  const errors: CompanionErrors = {};
  const fields = Object.keys(companions) as CompanionField[];

  for (const field of fields) {
    const value = companions[field];
    if (!Number.isInteger(value) || value < 0) {
      errors[field] = "人数必须是不小于 0 的整数。";
    }
  }

  const total = fields.reduce((sum, field) => sum + companions[field], 0);
  if (total <= 0 && Object.keys(errors).length === 0) {
    errors.group = "请至少添加 1 位同行人。";
  }

  return errors;
}

export function hasValidationErrors(errors: object) {
  return Object.keys(errors).length > 0;
}
