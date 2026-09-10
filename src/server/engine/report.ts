import type {
  AssessmentScope,
  AssessmentStatus,
  EngineIssueV0_1,
  EngineResultV0_1,
  RuleAssessment,
  ReasonablenessReportV0_1,
  AssessmentImpact,
} from "../../shared/contracts/engine";
import type { EvaluationContext } from "./context";
import { RULES } from "./registry";

const rank: Record<AssessmentStatus, number> = {
  accepted: 0,
  warning: 1,
  needsConfirmation: 2,
  blocked: 3,
  unsupported: 4,
};
export const strongest = (values: AssessmentStatus[]) =>
  values.reduce((a, b) => (rank[a] >= rank[b] ? a : b), "accepted");
export const scopeId = (s: AssessmentScope) =>
  s.kind === "item" ? s.itemId : s.kind === "day" ? s.dayId : s.planId;
export function buildReport(
  result: EngineResultV0_1,
  context: EvaluationContext,
  contextFingerprint: string,
) {
  const report: ReasonablenessReportV0_1 = {
    amendment: "4.20.1",
    evaluatedAt: context.evaluationTime,
    observedVersion: result.observedVersion,
    contextFingerprint,
    policyRef: context.policy.ref,
    policyVersion: context.policy.version,
    status: "accepted",
    reasonableness: "reasonable",
    coverage: [],
    assessments: [],
  };
  const make = (
    scope: AssessmentScope,
    dimension: RuleAssessment["dimension"],
  ) => {
    const rule = RULES[dimension];
    const a: RuleAssessment = {
      assessmentId: dimension + ":" + scopeId(scope),
      scope,
      dimension,
      status: "accepted",
      reasonableness: "reasonable",
      ruleRef: rule.ref,
      ruleVersion: rule.version,
      reasonCodes: [],
      issueIndexes: [],
      relatedAssessmentIds: [],
      duration: null,
      impacts: [],
      sourceRefs: [{ kind: "rule", ref: rule.ref, version: rule.version }],
    };
    report.assessments.push(a);
    report.coverage.push({
      scope,
      dimension,
      state: "evaluated",
      assessmentIds: [a.assessmentId],
    });
    return a;
  };
  const mark = (
    a: RuleAssessment,
    code: string,
    status: Exclude<AssessmentStatus, "accepted">,
    details: EngineIssueV0_1["details"] = {},
    state: AssessmentImpact["state"] = "evaluated",
    category: EngineIssueV0_1["category"] = "schedule",
  ) => {
    a.status = strongest([a.status, status]);
    if (state === "evaluated") a.reasonableness = "unreasonable";
    else if (a.reasonableness !== "unreasonable")
      a.reasonableness = "undetermined";
    const coverage = report.coverage.find((c) =>
      c.assessmentIds.includes(a.assessmentId),
    )!;
    if (state !== "evaluated") coverage.state = state;
    const index = result.issues.length;
    const severity =
      status === "warning"
        ? "warning"
        : status === "needsConfirmation"
          ? "confirmation"
          : "blocking";
    result.issues.push({
      code,
      category,
      severity,
      path: null,
      operationId: null,
      subjectRef: scopeId(a.scope),
      retryable: state === "insufficient_inputs",
      details: { ...details, ruleRef: a.ruleRef, ruleVersion: a.ruleVersion },
    });
    a.issueIndexes.push(index);
    a.reasonCodes.push(code);
  };
  const impact = (
    a: RuleAssessment,
    metric: AssessmentImpact["metric"],
    value: number | null,
    model: { ref: string; version: string; unit: string } | null,
    state: AssessmentImpact["state"] = "evaluated",
    before: number | null = null,
  ): AssessmentImpact => {
    const i: AssessmentImpact = {
      metric,
      state,
      direction:
        value === null || before === null
          ? "unknown"
          : value > before
            ? "increase"
            : value < before
              ? "decrease"
              : "unchanged",
      value,
      unit: value === null ? null : (model?.unit ?? "minutes"),
      modelRef: value === null ? null : (model?.ref ?? a.ruleRef),
      modelVersion: value === null ? null : (model?.version ?? a.ruleVersion),
      durationBasis:
        a.duration?.basis ??
        (state === "evaluated" ? "planned_schedule" : "unknown"),
      relatedItemIds: a.scope.kind === "item" ? [a.scope.itemId] : [],
      relatedDayIds:
        a.scope.kind === "item" || a.scope.kind === "day"
          ? [a.scope.dayId]
          : a.scope.dayIds,
      sourceRefs: [...a.sourceRefs],
    };
    a.impacts.push(i);
    return i;
  };
  const finish = () => {
    report.status = strongest(report.assessments.map((a) => a.status));
    report.reasonableness = report.assessments.some(
      (a) => a.reasonableness === "unreasonable",
    )
      ? "unreasonable"
      : report.coverage.some((c) => c.state !== "evaluated")
        ? "undetermined"
        : "reasonable";
    result.assessment = report;
    return report;
  };
  return { report, make, mark, impact, finish };
}
export type Reporter = ReturnType<typeof buildReport>;
export function finishResult(result: EngineResultV0_1) {
  const unsupported =
    result.outcome === "unsupported" ||
    result.assessment?.status === "unsupported";
  result.outcome = unsupported
    ? "unsupported"
    : result.issues.some((i) => i.severity === "blocking")
      ? "blocked"
      : result.issues.some((i) => i.severity === "confirmation")
        ? "needsConfirmation"
        : "accepted";
  result.confirmationRequirements = result.issues
    .filter((i) => i.severity === "confirmation")
    .map((i) => ({
      code: i.code,
      operationIds: i.operationId ? [i.operationId] : [],
      subjectRefs: i.subjectRef ? [i.subjectRef] : [],
      summaryKey: "engine.confirm." + i.code.toLowerCase(),
      expiresAt: null,
    }));
  return result;
}
