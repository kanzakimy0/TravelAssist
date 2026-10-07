import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
export function classifyCiRevision({
  eventName,
  event = {},
  eventSha,
  checkoutSha,
  checkoutParents = [],
  ref,
  expectedHead,
}) {
  const valid = (x) => typeof x === "string" && /^[0-9a-f]{40}$/.test(x);
  const branchHeadSha =
    eventName === "pull_request" ? event.pull_request?.head?.sha : eventSha;
  if (!valid(branchHeadSha) || !valid(checkoutSha))
    throw Error("CI_REVISION_SHA_MISSING_OR_INVALID");
  if (expectedHead && !valid(expectedHead))
    throw Error("EXPECTED_HEAD_INVALID");
  if (expectedHead && expectedHead !== checkoutSha)
    throw Error("EXPECTED_HEAD_MISMATCH");
  const direct = branchHeadSha === checkoutSha;
  if (
    eventName === "pull_request" &&
    !direct &&
    !checkoutParents.includes(branchHeadSha)
  )
    throw Error("PR_CHECKOUT_DOES_NOT_BIND_BRANCH_HEAD");
  return {
    schemaVersion: 1,
    eventName,
    ref: ref ?? null,
    branchHeadSha,
    checkoutSha,
    checkoutParents,
    eventSha: eventSha ?? null,
    baseSha: event.pull_request?.base?.sha ?? null,
    pullRequestNumber: event.number ?? null,
    checkoutKind: direct
      ? "BRANCH_HEAD_DIRECT"
      : eventName === "pull_request"
        ? "PULL_REQUEST_MERGE_TEST"
        : "EVENT_REVISION_NOT_BRANCH_HEAD",
    directBranchHeadTest: direct,
  };
}
export function recordCiRevision(env = process.env) {
  const git = (...args) =>
    execFileSync("git", args, { encoding: "utf8" }).trim();
  const checkoutSha = git("rev-parse", "HEAD");
  const record = classifyCiRevision({
    eventName: env.GITHUB_EVENT_NAME ?? "local",
    event: env.GITHUB_EVENT_PATH
      ? JSON.parse(fs.readFileSync(env.GITHUB_EVENT_PATH, "utf8"))
      : {},
    eventSha: env.GITHUB_SHA ?? checkoutSha,
    checkoutSha,
    checkoutParents: git("show", "-s", "--format=%P", "HEAD")
      .split(" ")
      .filter(Boolean),
    ref: env.GITHUB_REF,
    expectedHead: env.EXPECTED_HEAD,
  });
  const file = path.resolve(".artifacts/ci/revision.json");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(record, null, 2) + "\n");
  console.log("CI_REVISION " + JSON.stringify(record));
  if (env.GITHUB_STEP_SUMMARY)
    fs.appendFileSync(
      env.GITHUB_STEP_SUMMARY,
      `### Tested revision\n\n- Branch HEAD: \`${record.branchHeadSha}\`\n- Actual checkout: \`${record.checkoutSha}\`\n- Test kind: \`${record.checkoutKind}\`\n\n`,
    );
  return record;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  recordCiRevision();
