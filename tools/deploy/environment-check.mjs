import { createHash } from "node:crypto";
import {
  repositoryEnvironmentPolicy,
  validateDeploymentEnvironment,
} from "../../src/shared/contracts/deployment-environment.ts";
import { localDeploymentEnvironment } from "./local-environment.mjs";

export function environmentFingerprint(safe) {
  return createHash("sha256").update(JSON.stringify(safe)).digest("hex");
}

export function checkEnvironment(environment) {
  const report = validateDeploymentEnvironment(
    environment,
    repositoryEnvironmentPolicy,
  );
  return {
    ...report,
    fingerprint: report.ok ? environmentFingerprint(report.safe) : null,
  };
}

if (process.argv[1]?.endsWith("environment-check.mjs")) {
  const environment = process.argv.includes("--local")
    ? localDeploymentEnvironment()
    : process.env;
  const report = checkEnvironment(environment);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) process.exitCode = 1;
}
