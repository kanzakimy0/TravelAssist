import "server-only";

import {
  repositoryEnvironmentPolicy,
  validateDeploymentEnvironment,
  type DeploymentEnvironmentReport,
} from "../../shared/contracts/deployment-environment";

export class DeploymentEnvironmentError extends Error {
  readonly codes: readonly string[];

  constructor(codes: readonly string[]) {
    super("Deployment environment is not ready.");
    this.name = "DeploymentEnvironmentError";
    this.codes = codes;
  }
}

export function deploymentEnvironmentReport(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): DeploymentEnvironmentReport {
  return validateDeploymentEnvironment(
    environment,
    repositoryEnvironmentPolicy,
  );
}

export function requireDeploymentEnvironment(
  environment: Readonly<Record<string, string | undefined>> = process.env,
) {
  const report = deploymentEnvironmentReport(environment);
  if (!report.ok) throw new DeploymentEnvironmentError(report.errors);
  return report.safe;
}
