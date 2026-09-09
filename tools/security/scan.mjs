import { execFileSync, spawn } from "node:child_process";
import {
  existsSync,
  lstatSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  scanText,
  applyAllowlist,
  validateAllowlist,
  safePath,
  fingerprint,
  finding,
} from "./rules.mjs";

export const ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const MAX_TEXT_BYTES = 4 * 1024 * 1024;
function flagSkippedEnv(report, path, metadata = {}) {
  // A tracked private-env filename is forbidden even when decoding is skipped.
  if (/(^|\/)\.env(?:\.|$)/.test(path) && !path.endsWith(".env.example"))
    report.findings.push({ ...finding(path, "env-file", path), ...metadata });
}
export function git(root, args, input) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      input,
      encoding: "utf8",
      windowsHide: true,
      maxBuffer: 128 * 1024 * 1024,
      timeout: 120000,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    throw new Error("GIT_SCAN_FAILED_OUTPUT_WITHHELD");
  }
}
export function inspectBuffer(buffer, max = MAX_TEXT_BYTES) {
  if (buffer.length > max) return { skip: "oversize" };
  if (buffer[0] === 0xff && buffer[1] === 0xfe)
    return { text: buffer.subarray(2).toString("utf16le") };
  if (buffer[0] === 0xfe && buffer[1] === 0xff && buffer.length % 2 === 0)
    return {
      text: Buffer.from(buffer.subarray(2)).swap16().toString("utf16le"),
    };
  if (buffer.subarray(0, 8192).includes(0)) return { skip: "binary" };
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(buffer) };
  } catch {
    return { skip: "binary-or-unsupported-encoding" };
  }
}
export function containedFile(root, path) {
  const full = resolve(root, path);
  if (!full.startsWith(resolve(root) + sep))
    throw new Error("OUTSIDE_SCAN_ROOT");
  let current = resolve(root);
  for (const part of relative(root, full).split(sep)) {
    current = resolve(current, part);
    if (lstatSync(current).isSymbolicLink())
      throw new Error("SYMLINK_NOT_FOLLOWED");
  }
  return full;
}
export function newReport(scope) {
  return {
    version: 1,
    scope,
    limits: { maxTextBytes: MAX_TEXT_BYTES },
    counts: { commits: 0, objects: 0, files: 0, scanned: 0, bytes: 0 },
    skipped: [],
    errors: [],
    findings: [],
  };
}
export function inspect(report, path, buffer, metadata = {}, options = {}) {
  const result = inspectBuffer(buffer, options.maxBytes);
  if (result.skip) {
    flagSkippedEnv(report, path, metadata);
    report.skipped.push({
      path: safePath(path),
      reason: result.skip,
      bytes: buffer.length,
      ...metadata,
    });
    return;
  }
  report.counts.scanned++;
  report.counts.bytes += buffer.length;
  report.findings.push(
    ...scanText(result.text, path, { scope: report.scope, ...options }).map(
      (hit) => ({ ...hit, ...metadata }),
    ),
  );
}
export function finish(report, entries = []) {
  report.findings = applyAllowlist(report.findings, entries, report.scope).sort(
    (a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), "en"),
  );
  report.skipped.sort((a, b) => a.path.localeCompare(b.path, "en"));
  report.findingsByCategory = {};
  for (const hit of report.findings.filter((h) => !h.allowed))
    report.findingsByCategory[hit.category] =
      (report.findingsByCategory[hit.category] ?? 0) + 1;
  report.status = report.errors.length
    ? "INCOMPLETE"
    : Object.keys(report.findingsByCategory).length
      ? "FINDINGS"
      : "PASS";
  return report;
}
export function scanTracked(root = ROOT, entries = []) {
  const report = newReport("tracked");
  const files = git(root, ["ls-files", "-z"])
    .split("\0")
    .filter(Boolean)
    .sort();
  report.counts.files = files.length;
  for (const path of files) {
    try {
      const full = containedFile(root, path),
        stat = lstatSync(full);
      if (!stat.isFile()) {
        report.errors.push({ path: safePath(path), code: "NOT_REGULAR_FILE" });
        continue;
      }
      if (stat.size > MAX_TEXT_BYTES) {
        flagSkippedEnv(report, path);
        report.skipped.push({
          path: safePath(path),
          reason: "oversize",
          bytes: stat.size,
        });
        continue;
      }
      inspect(report, path, readFileSync(full));
    } catch {
      report.errors.push({
        path: safePath(path),
        code: "UNREADABLE_OR_UNSAFE_FILE",
      });
    }
  }
  return finish(report, entries);
}

// One bounded blob at a time. Metadata checked BEFORE git is asked for content.
async function withBatch(root, action) {
  const child = spawn("git", ["cat-file", "--batch"], {
    cwd: root,
    windowsHide: true,
    stdio: ["pipe", "pipe", "ignore"],
  });
  let failure;
  const stopped = new Promise((done) => child.once("close", done));
  child.on("error", () => {
    failure = true;
  });
  child.stdin.on("error", () => {
    failure = true;
  });
  const iterator = child.stdout[Symbol.asyncIterator]();
  let pending = Buffer.alloc(0);
  const timer = setTimeout(() => child.kill(), 600000);
  async function take(n) {
    while (pending.length < n) {
      const next = await iterator.next();
      if (next.done || failure) throw new Error("HISTORY_BATCH_INCOMPLETE");
      pending = Buffer.concat([pending, next.value]);
    }
    const part = pending.subarray(0, n);
    pending = pending.subarray(n);
    return part;
  }
  async function read(oid, size) {
    child.stdin.write(oid + "\n");
    const header = [];
    for (let i = 0; i < 200; i++) {
      const b = await take(1);
      if (b[0] === 10) break;
      header.push(b[0]);
    }
    if (
      !Buffer.from(header)
        .toString()
        .endsWith(" " + size)
    )
      throw new Error("HISTORY_BATCH_INVALID");
    const data = await take(size);
    await take(1);
    return data;
  }
  try {
    return await action(read);
  } finally {
    clearTimeout(timer);
    child.stdin.end();
    child.kill();
    await stopped;
  }
}
export async function scanHistory(root = ROOT, entries = []) {
  const report = newReport("history");
  if (git(root, ["rev-parse", "--is-shallow-repository"]).trim() === "true")
    report.errors.push({ code: "SHALLOW_HISTORY" });
  report.counts.commits = Number(
    git(root, ["rev-list", "--all", "--count"]).trim(),
  );
  const objects = new Map(
    git(root, ["rev-list", "--objects", "--all"])
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => [line.slice(0, 40), line.slice(41) || "<git-object>"]),
  );
  const metadata = git(
    root,
    ["cat-file", "--batch-check=%(objectname) %(objecttype) %(objectsize)"],
    [...objects.keys()].join("\n") + "\n",
  );
  report.counts.objects = objects.size;
  await withBatch(root, async (read) => {
    for (const line of metadata.trim().split("\n")) {
      const [oid, type, bytes] = line.trim().split(" ");
      if (!/^[a-f0-9]{40}$/.test(oid) || !/^\d+$/.test(bytes))
        throw new Error("INVALID_OBJECT_METADATA");
      if (!["blob", "commit", "tag"].includes(type)) continue;
      const path =
        type === "blob" ? objects.get(oid) : "<" + type + "-message>";
      const size = Number(bytes);
      report.counts.files++;
      if (size > MAX_TEXT_BYTES) {
        flagSkippedEnv(report, path, { object: oid });
        report.skipped.push({
          path: safePath(path),
          object: oid,
          reason: "oversize",
          bytes: size,
        });
        continue;
      }
      const before = report.findings.length;
      inspect(report, path, await read(oid, size), { object: oid });
      if (report.findings.length > before) {
        const commit =
          type === "commit"
            ? oid.slice(0, 12)
            : git(root, [
                "log",
                "--all",
                "--find-object=" + oid,
                "-1",
                "--format=%h",
              ]).trim();
        for (const item of report.findings.slice(before))
          item.commit = /^[a-f0-9]{7,40}$/.test(commit)
            ? commit
            : "not-associated";
      }
    }
  });
  report.coverage =
    "All objects reachable from local refs after fetch; representative path per blob; excludes reflog-only/dangling objects, binaries and recorded oversized objects. Commit/tag text included.";
  return finish(report, entries);
}
export function walkFiles(root, dir) {
  const output = [];
  for (const item of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name, "en"),
  )) {
    const full = resolve(dir, item.name);
    containedFile(root, relative(root, full));
    if (item.isDirectory()) output.push(...walkFiles(root, full));
    else if (item.isFile()) output.push(full);
  }
  return output;
}
export function scanBundle(root = ROOT, entries = [], canaries = []) {
  const report = newReport("bundle"),
    directory = resolve(root, ".next/static");
  report.limits.maxTextBytes = 16 * 1024 * 1024;
  if (!existsSync(directory)) {
    report.errors.push({ code: "BUILD_REQUIRED" });
    return finish(report, entries);
  }
  for (const file of walkFiles(root, directory)) {
    const path = relative(root, file).split(sep).join("/"),
      size = lstatSync(file).size;
    report.counts.files++;
    if (size > report.limits.maxTextBytes) {
      report.errors.push({ path, code: "BUNDLE_OVERSIZE" });
      continue;
    }
    inspect(
      report,
      path,
      readFileSync(file),
      {},
      { maxBytes: report.limits.maxTextBytes, canaries },
    );
  }
  if (!report.counts.scanned)
    report.errors.push({ code: "EMPTY_BROWSER_BUILD" });
  return finish(report, entries);
}
export function saveReport(root, report) {
  const directory = resolve(root, ".cache/security");
  mkdirSync(directory, { recursive: true });
  const path = containedFile(root, ".cache/security");
  const file = resolve(path, report.scope + ".json");
  if (existsSync(file)) containedFile(root, relative(root, file));
  writeFileSync(file, JSON.stringify(report, null, 2) + "\n");
}
export function summary(report) {
  return {
    scope: report.scope,
    status: report.status,
    counts: report.counts,
    skipped: report.skipped.reduce(
      (out, item) => ({ ...out, [item.reason]: (out[item.reason] ?? 0) + 1 }),
      {},
    ),
    findingsByCategory: report.findingsByCategory,
    allowed: report.findings.filter((x) => x.allowed).length,
    errors: report.errors,
    findings: report.findings.filter((x) => !x.allowed).slice(0, 20),
  };
}
export async function main(args) {
  if (args.length !== 1 || !["tracked", "history", "bundle"].includes(args[0]))
    throw new Error("INVALID_SCAN_MODE");
  const entries = validateAllowlist(
    JSON.parse(
      readFileSync(resolve(ROOT, "tools/security/allowlist.json"), "utf8"),
    ),
  );
  const report = await {
    tracked: scanTracked,
    history: scanHistory,
    bundle: scanBundle,
  }[args[0]](ROOT, entries);
  saveReport(ROOT, report);
  console.log(JSON.stringify(summary(report), null, 2));
  return report.status === "PASS" ? 0 : report.status === "INCOMPLETE" ? 2 : 1;
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = await main(process.argv.slice(2));
  } catch (error) {
    console.error(
      JSON.stringify({
        status: "INCOMPLETE",
        category: "scanner-error",
        fingerprint: fingerprint(String(error?.message ?? "unknown")),
      }),
    );
    process.exitCode = 2;
  }
}
