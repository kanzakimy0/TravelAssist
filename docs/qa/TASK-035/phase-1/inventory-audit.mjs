// Read-only Git/source audit. Never import, require or execute an audited target.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { dirname, resolve, posix } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "../../../..");
const auditedDevelopSha = "4888b4d507ee75d4f6b9914eb1a8d5661813f64b";
const legacyPrHeadSha = "f157f23ba1b93def006c2703ea8f42dcd9266c01";
const taskPublicationSha = "4fbbe4a12626b41ddcad15cc9ebf9440698192fc";
const identity = {
  schemaVersion: "1.0.0",
  auditedDevelopSha,
  legacyPrHeadSha,
  taskPublicationSha,
};
const hash = (x) => createHash("sha256").update(x).digest("hex");
const sorted = (xs) => [...new Set(xs)].sort();
const json = (x) => JSON.stringify(x, null, 2) + "\n";
const git = (...args) =>
  execFileSync("git", args, {
    cwd: root,
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
  });
const code = /\.(?:mjs|cjs|js|jsx|ts|tsx|py|sh|ps1)$/i;
const textFile = /\.(?:mjs|cjs|js|jsx|ts|tsx|py|sh|ps1|md|yml|yaml|toml|sql)$/i;
const config =
  /^(?:package(?:-lock)?\.json|tsconfig\.json|next\.config\.[^/]+|eslint\.config\.[^/]+|\.nvmrc|\.gitattributes|\.prettier[^/]*|supabase\/config\.toml)$/;
const testName =
  /(?:\.(?:test|spec|runtime)\.[^/]+$|(?:^|\/)(?:test_[^/]+\.py|[^/]*selftest\.[^/]+)$)/i;
const reviewedHelpers = new Set([
  "tests/task-052-network-guard.mjs",
  "tests/task-054-catalog.mjs",
  "tests/task-065-concurrency.mjs",
  "tests/task-065-faults.mjs",
  "tests/task-065-local-harness.mjs",
  "tests/task-065-runtime-soak.mjs",
  "tests/task-065-security.mjs",
  "tests/task-065-seeded.mjs",
  "tools/qa/canonical-supporting-hash.mjs",
  "tools/transport/task-086-validation-lanes.mjs",
]);
function readTree() {
  return git("ls-tree", "-rzl", auditedDevelopSha)
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((row) => {
      const m = row.match(/^\d+ (\w+) ([0-9a-f]+)\s+(\d+|-)\t([\s\S]+)$/);
      assert.ok(m);
      return { path: m[4], blobSha: m[2], size: Number(m[3]), type: m[1] };
    })
    .filter((x) => x.type === "blob")
    .sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
}
function readBlobs(files) {
  const bytes = execFileSync("git", ["cat-file", "--batch"], {
    cwd: root,
    input: files.map((x) => x.blobSha).join("\n") + "\n",
    maxBuffer: 256 * 1024 * 1024,
    windowsHide: true,
  });
  let offset = 0;
  return new Map(
    files.map((file) => {
      const end = bytes.indexOf(10, offset);
      const [sha, type, length] = bytes
        .subarray(offset, end)
        .toString()
        .split(" ");
      assert.equal(sha, file.blobSha);
      assert.equal(type, "blob");
      offset = end + 1;
      const body = bytes.subarray(offset, offset + Number(length));
      offset += Number(length) + 1;
      return [file.path, { text: body.toString("utf8"), sha256: hash(body) }];
    }),
  );
}
function classify(p, s) {
  if (reviewedHelpers.has(p))
    return [
      "helper",
      "source-reviewed exported support functions or opt-in loader, no standalone suite",
    ];
  if (/^src\/shared\/contracts\/.*fixtures\.ts$/.test(p))
    return [
      "fixture",
      "shared contract fixture factory outside tests directory",
    ];
  if (/^tests\/(?:fixtures|helpers)\//.test(p)) {
    if (testName.test(p) || /node:test|unittest\.TestCase/.test(s))
      return ["test", "nested assertion-bearing test"];
    return [
      p.startsWith("tests/fixtures/") ? "fixture" : "helper",
      "support directory; never counted as an executable test",
    ];
  }
  if (
    testName.test(p) ||
    (code.test(p) && /node:test|unittest\.TestCase/.test(s))
  )
    return ["test", "test/runtime/selftest name or framework source signal"];
  if (/\.browser\.mjs$/.test(p))
    return [
      "harness",
      "browser evidence harness; counted separately from test files",
    ];
  if (/^\.github\/workflows\//.test(p) || config.test(p))
    return ["config", "execution configuration"];
  if (/^tests\//.test(p))
    return /helper|fixture|register|loader/.test(p)
      ? ["helper", "test support/loader"]
      : ["harness", "non-test executable in tests"];
  if (
    code.test(p) &&
    (/^tools\/qa\//.test(p) ||
      /playwright|chromium\.launch|firefox\.launch|webkit\.launch/i.test(s) ||
      /audit|check|verify|validat|smoke|regression/i.test(posix.basename(p)))
  )
    return [
      "harness",
      "QA/browser/check tool candidate; may export helpers or write artifacts",
    ];
  return [
    "other-with-reason",
    "operational tool candidate retained conservatively; test assertions not established",
  ];
}
function partition(files) {
  const lanes = {
    assets: [],
    "regression-0": [],
    "regression-1": [],
    "regression-2": [],
    "regression-3": [],
    rebuild: [],
  };
  let i = 0;
  for (const f of [...files].sort()) {
    if (f === "tests/task-086-b-rebuild.test.mjs") lanes.rebuild.push(f);
    else if (/^tests\/task-013/.test(f)) lanes.assets.push(f);
    else lanes["regression-" + (i++ % 4)].push(f);
  }
  assert.equal(new Set(Object.values(lanes).flat()).size, files.length);
  assert.deepEqual(Object.values(lanes).flat().sort(), [...files].sort());
  return lanes;
}
function selfCheck() {
  for (const [p, s, role] of [
    ["tests/helpers/x.mjs", "export const x=1", "helper"],
    ["tests/fixtures/x.json", "{}", "fixture"],
    ["tests/nested/x.test.mjs", "", "test"],
    ["tools/x/selftest.py", "assert True", "test"],
    ["tests/python/x.py", "class C(unittest.TestCase): pass", "test"],
    ["tools/x/produce.py", "", "other-with-reason"],
    ["tests/x.browser.mjs", "", "harness"],
  ])
    assert.equal(classify(p, s)[0], role);
  assert.throws(() => partition(["tests/a.test.mjs", "tests/a.test.mjs"]));
  const lanes = partition([
    "tests/z.test.mjs",
    "tests/task-013-a.test.mjs",
    "tests/task-086-b-rebuild.test.mjs",
  ]);
  assert.equal(lanes.assets.length, 1);
  assert.equal(lanes.rebuild.length, 1);
  return {
    status: "PASS",
    checks: 10,
    scope:
      "in-memory audit classifier/partition only; no audited code executed",
  };
}
function generate() {
  const all = readTree(),
    byPath = new Map(all.map((x) => [x.path, x]));
  const readFiles = all.filter(
    (x) =>
      textFile.test(x.path) ||
      config.test(x.path) ||
      x.path === "docs/qa/TASK-055/test-inventory.json",
  );
  const contents = readBlobs(readFiles),
    source = (p) => contents.get(p)?.text ?? "";
  const candidates = all.filter(
    ({ path: p }) =>
      /^tests\//.test(p) ||
      (/^(?:tools|scripts|docs\/qa)\//.test(p) && code.test(p)) ||
      /^\.github\/workflows\//.test(p) ||
      config.test(p) ||
      testName.test(p) ||
      (code.test(p) &&
        (/fixture|harness|loader/.test(posix.basename(p)) ||
          /node:test|unittest\.TestCase|playwright|chromium\.launch/.test(
            source(p),
          ))),
  );
  const paths = candidates.map((x) => x.path),
    candidateSet = new Set(paths);
  const references = [],
    unresolvedImports = [],
    directoryReferences = [];
  const directories = new Set([
    ".",
    ...all.flatMap((x) => {
      const dirs = [];
      let p = posix.dirname(x.path);
      while (p !== ".") {
        dirs.push(p);
        p = posix.dirname(p);
      }
      return dirs;
    }),
  ]);
  const link = (from, to, line, kind) => {
    if (byPath.has(to)) references.push({ from, to, line, kind });
  };
  for (const { path: p } of readFiles) {
    const s = source(p);
    s.split(/\r?\n/).forEach((line, i) => {
      for (const m of line.matchAll(
        /(?:tests|tools|scripts|docs|src|\.github)\/[A-Za-z0-9_./-]+\.(?:mjs|cjs|js|ts|tsx|py|json|md|yml|yaml)\b/g,
      ))
        link(p, m[0], i + 1, "literal-path-mention-not-execution-proof");
    });
    if (!code.test(p)) continue;
    for (const m of s.matchAll(
      /(?:\bfrom\s*|\bimport\s*\(|\brequire\s*\(|new URL\s*\()\s*["'](\.[^"'\r\n]+)["']/g,
    )) {
      const base = posix.normalize(posix.join(posix.dirname(p), m[1]));
      const target = [
        base,
        base + ".ts",
        base + ".mjs",
        base + ".js",
        base + "/index.ts",
      ].find((x) => byPath.has(x));
      const line = s.slice(0, m.index).split("\n").length;
      if (target) link(p, target, line, "static-module-or-URL-reference");
      else if (directories.has(base.replace(/\/$/, "")) || base === "./")
        directoryReferences.push({
          from: p,
          to: base,
          line,
          kind: "tracked-directory-reference",
        });
      else if (candidateSet.has(p))
        unresolvedImports.push({
          from: p,
          specifier: m[1],
          line,
          status: "NEEDS_REVIEW",
          reason:
            "unresolved text expression: may be an embedded child source string, generated artifact, computed path or stale reference; not a proven broken import",
        });
    }
  }
  const refs = [
    ...new Map(references.map((x) => [JSON.stringify(x), x])).values(),
  ].sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1));
  const pkg = JSON.parse(source("package.json"));
  const aliases = Object.entries(pkg.scripts).map(([name, command]) => ({
    id: "npm:" + name,
    source: "package.json",
    name,
    command,
    selectedPaths: paths.filter((p) => command.includes(p)),
    executionStatus: "NOT_EXECUTED",
  }));
  const pc = JSON.parse(source("docs/qa/TASK-055/test-inventory.json")),
    pcSuites = new Map(pc.suites.map((x) => [x.file, x]));
  const top = paths.filter((p) => /^tests\/[^/]+\.test\.mjs$/.test(p)),
    lanes = partition(top);
  for (const fragment of [
    '.readdirSync(path.join(root, "tests"))',
    '.filter((x) => x.endsWith(".test.mjs"))',
    "index++ % 4",
    "tests/task-086-b-rebuild.test.mjs",
  ])
    assert.ok(
      source("tools/qa/task-086-regression-lanes.mjs").includes(fragment),
      "Selector changed: re-review required",
    );
  const indirect = [
    {
      from: "tests/task-019-trip-plan.test.mjs",
      to: "tests/task-019-projection.cases.mjs",
      condition:
        "spawnSync Node --conditions=react-server --import ./tests/register-planner-ts.mjs --test; localEnv applied",
    },
    {
      from: "tests/poi-remaining-review.test.mjs",
      to: "tests/poi-remaining-review.test.py",
      condition: "Node wrapper subprocess; python/python3 available",
    },
    {
      from: "tests/task-086-b-selected-gtfs-trailing-fields.test.mjs",
      to: "tests/python/task_086_selected_gtfs_trailing_fields.py",
      condition: "Node wrapper subprocess; PYTHON override or python/python3",
    },
    {
      from: "tests/task-086-hateruma-air-passenger.test.mjs",
      to: "tests/task-086-hateruma-abr.test.py",
      condition:
        "execFileSync; TASK086_PYTHON override or literal python; PYTHONUTF8=1",
    },
  ];
  for (const e of indirect) {
    assert.ok(byPath.has(e.from) && byPath.has(e.to));
    assert.ok(
      source(e.from).includes(posix.basename(e.to)) &&
        /spawnSync|execFileSync/.test(source(e.from)),
    );
  }
  const qg = ".github/workflows/quality-gate.yml";
  const fullJobs = [
    "regression",
    "graph",
    "extraction",
    "resume",
    "proof",
    "quality",
    "closeout-quality-gate",
  ];
  const events = [
    {
      id: "pr-ordinary",
      workflow: qg,
      event: "pull_request",
      condition:
        "head_ref != feature/b-transport-node-mobility-backbone; default PR activity types; no path filter",
      jobs: ["verify"],
      selection: "top-level-node",
      checkout:
        "default event merge ref; branchHeadSha can differ from eventSha/checkoutSha",
      proofMode:
        "serial verifyRebuild; VERIFY_PUBLISHED=0; no proof artifact retention in verify",
    },
    {
      id: "pr-backbone",
      workflow: qg,
      event: "pull_request",
      condition: "head_ref == feature/b-transport-node-mobility-backbone",
      jobs: fullJobs,
      selection: "partition-union",
      checkout: "default event merge ref, not necessarily exact branch head",
      proofMode:
        "two graphs, extraction, resume, published/corruption proof, aggregate",
    },
    {
      id: "push-develop",
      workflow: qg,
      event: "push",
      condition: "refs/heads/develop only",
      jobs: fullJobs,
      selection: "partition-union",
      checkout: "event SHA; live branch can subsequently advance",
      proofMode: "full lane receipts with event/run/attempt binding",
    },
    {
      id: "manual-full",
      workflow: qg,
      event: "workflow_dispatch",
      condition:
        "task086FinalCloseout=true OR selected ref is develop/backbone",
      jobs: fullJobs,
      selection: "partition-union",
      checkout: "event SHA; optional expectedHead equality enforced",
      proofMode: "full lane receipts; full-lane timeouts hard-coded",
    },
    {
      id: "manual-ordinary",
      workflow: qg,
      event: "workflow_dispatch",
      condition:
        "task086FinalCloseout=false AND ref neither develop nor backbone",
      jobs: ["verify"],
      selection: "top-level-node",
      checkout: "event SHA; verify does not enforce expectedHead",
      proofMode: "serial verifier; validationTimeoutMinutes applies here",
    },
    {
      id: "manual-release",
      workflow: ".github/workflows/release-rehearsal.yml",
      event: "workflow_dispatch",
      condition:
        "ref develop AND commit_sha equals current develop at trust-gate",
      jobs: ["trust-gate", "rehearse"],
      selection: "top-level-node",
      checkout: "explicit trusted_sha",
      proofMode: "serial Node plus standalone local smoke; not external deploy",
    },
    {
      id: "push-feature-automation",
      workflow: ".github/workflows/auto-create-pr.yml",
      event: "push",
      condition: "feature/**",
      jobs: ["create-draft"],
      selection: "none",
      checkout: null,
      proofMode: "administrative automation; no tests",
    },
    {
      id: "push-audit-docs",
      workflow: null,
      event: "push",
      condition: "docs/b-wbs-9-1-phase1-audit-20261006",
      jobs: [],
      selection: "none",
      checkout: null,
      proofMode: "no matching push workflow at audited SHA",
    },
  ];
  const tasks = readFiles.filter((x) =>
    /^docs\/tasks\/(?:TASK|RESULT)-/i.test(x.path),
  );
  function ownership(p) {
    if (pcSuites.has(p))
      return {
        owner: "B / Personal Center (historical scoped inventory)",
        ownerEvidence: [
          {
            path: "docs/qa/TASK-055/test-inventory.json",
            kind: "scoped historical inventory",
            sourceTask: pcSuites.get(p).sourceTask,
          },
        ],
      };
    const token = p.match(/task-(\d{3})(?!\d)/i)?.[1];
    const evidence = token
      ? tasks
          .filter((x) =>
            new RegExp("(?:/|RESULT-)TASK-" + token + "-", "i").test(x.path),
          )
          .map((x) => ({
            path: x.path,
            ownerText:
              source(x.path)
                .match(/(?:Owner|负责人|执行者)\s*[：:]\s*([^\r\n]+)/i)?.[1]
                ?.replace(/\*\*/g, "")
                .trim() ?? null,
            filenameOwnerHint:
              x.path
                .match(new RegExp("TASK-" + token + "-([ab])-", "i"))?.[1]
                ?.toUpperCase() ?? null,
            kind: "task-number association; advisory, not per-file assignment",
          }))
          .filter((x) => x.ownerText || x.filenameOwnerHint)
      : [];
    const hints = sorted(
      evidence
        .map(
          (x) =>
            x.ownerText?.match(/^([AB])(?:\b|\s|\/)/)?.[1] ??
            x.filenameOwnerHint,
        )
        .filter(Boolean),
    );
    return {
      owner: hints.length === 1 ? hints[0] : "UNKNOWN",
      ownerEvidence: evidence,
    };
  }
  function environment(p, role) {
    const s = source(p),
      old = pcSuites.get(p),
      executable = code.test(p) && role !== "config";
    const browser =
      /\.browser\.mjs$/.test(p) ||
      /(?:chromium|firefox|webkit)\.launch\(/.test(s) ||
      old?.browserRuntimeRequired === true;
    const db =
      old?.localSupabaseRequired === true ||
      /preferenceLocalRuntime\(|profileLocalRuntime\(|authLocalRuntime\(|local\.db`|postgres\(/.test(
        s,
      );
    const names = sorted(
      [
        ...s.matchAll(
          /(?:process\.env(?:\?\.)?\.|process\.env\[\s*["']|os\.environ\[\s*["']|(?:os\.)?getenv\(\s*["']|\benv\.)\s*([A-Z][A-Z0-9_]+)/g,
        ),
      ].map((m) => m[1]),
    );
    return {
      requiresDb: !executable
        ? "no"
        : db
          ? "yes"
          : old?.localSupabaseRequired === false
            ? "no"
            : "unknown",
      requiresBrowser: !executable
        ? "no"
        : browser
          ? "yes"
          : old?.browserRuntimeRequired === false
            ? "no"
            : "unknown",
      requiresNetwork: !executable ? "no" : browser || db ? "yes" : "unknown",
      requiresSecret: !executable ? "no" : "unknown",
      destructivePotential: !executable
        ? "no"
        : /writeFile|atomicWrite|\.unlink|rmSync|\.rmdir|shutil\.rmtree|\.write_text|\.write_bytes|deleteUser|db:reset|\.delete\(|\.insert\(/i.test(
              s,
            )
          ? "yes"
          : "unknown",
      networkScope:
        browser || db
          ? "local traffic expected; external isolation not proven"
          : executable
            ? "unknown; URL/mock tokens do not prove live networking"
            : "not independently executable",
      environmentVariableNames: names,
      environmentEvidence: {
        method:
          "source signals and historical TASK-055 declarations; absence is unknown; transitive effects unproven",
        source: p,
        historicalEntry: old
          ? "docs/qa/TASK-055/test-inventory.json#" + p
          : null,
        signals: {
          browser,
          db,
          subprocess: /spawn|execFile|subprocess/.test(s),
          networkTokens: /fetch\(|https?:|requests\./.test(s),
        },
      },
    };
  }
  const entries = paths.map((p) => {
    const [role, reason] = classify(p, source(p)),
      owner = ownership(p),
      env = environment(p, role),
      old = pcSuites.get(p);
    const direct = top.includes(p),
      parent = indirect.find((x) => x.to === p),
      lane =
        Object.keys(lanes).find((k) => lanes[k].includes(parent?.from ?? p)) ??
        null;
    const npm = aliases.filter((x) => x.selectedPaths.includes(p));
    const layer = ["test", "harness"].includes(role)
      ? /\.browser\.|e2e/.test(p)
        ? "e2e"
        : /\.runtime\.|rebuild|selftest/.test(p)
          ? "integration"
          : /contract|schema|boundary/.test(p)
            ? "contract"
            : old?.layer?.includes("pure unit")
              ? "unit"
              : old?.layer?.includes("integration")
                ? "integration"
                : "unknown"
      : null;
    const reasons = [];
    if (owner.owner === "UNKNOWN")
      reasons.push("owner not uniquely supported by task evidence");
    if (layer === "unknown")
      reasons.push("mixed assertions; primary layer needs human review");
    if (
      [
        "requiresDb",
        "requiresBrowser",
        "requiresNetwork",
        "requiresSecret",
        "destructivePotential",
      ].some((k) => env[k] === "unknown")
    )
      reasons.push("prerequisites/transitive side effects unproven");
    if (
      role === "other-with-reason" ||
      (role === "harness" && /^tools\//.test(p))
    )
      reasons.push(reason);
    return {
      id: "file:" + p,
      path: p,
      blobSha: byPath.get(p).blobSha,
      inputSha256: contents.get(p)?.sha256 ?? null,
      role,
      roleReason: reason,
      language: p.endsWith(".py")
        ? "python"
        : /\.[cm]?js$/.test(p)
          ? "javascript"
          : /\.tsx?$/.test(p)
            ? "typescript"
            : posix.extname(p).slice(1) || "text",
      domain: /transport|task-086|task-084-b/.test(p)
        ? "transport"
        : /poi/.test(p)
          ? "poi"
          : /asset|task-013/.test(p)
            ? "assets"
            : /planner|route/.test(p)
              ? "planner-routing"
              : old
                ? "personal-center"
                : /ai-|task-07[6-9]/.test(p)
                  ? "ai"
                  : "shared-or-unresolved",
      ...owner,
      ownershipStatus: "MACHINE_INFERRED_REVIEW_REQUIRED",
      primaryTestLayer: layer,
      additionalLayers: [],
      resourceTags: /rebuild|task-086|task-084-v2/.test(p)
        ? ["data-heavy-candidate"]
        : [],
      executionEnvironment: sorted([
        ...(code.test(p)
          ? [
              p.endsWith(".py")
                ? "python"
                : /\.[cm]?js$/.test(p)
                  ? "node"
                  : "unknown",
            ]
          : []),
        ...(env.requiresBrowser === "yes" ? ["browser"] : []),
        ...(env.requiresDb === "yes" ? ["local-db"] : []),
      ]),
      ...env,
      currentEntry: {
        npmAliases: npm.map((x) => x.id),
        existingCommands: npm.map((x) => x.command),
        directCiCommand: direct
          ? 'node --import ./tests/register-route-ts.mjs --test "tests/*.test.mjs"'
          : null,
        loaders: sorted(
          npm
            .flatMap((x) =>
              [...x.command.matchAll(/--import\s+(\S+)/g)].map((m) => m[1]),
            )
            .concat(direct || parent ? ["./tests/register-route-ts.mjs"] : []),
        ),
        flags: sorted(
          npm.flatMap((x) => x.command.match(/--[a-z-]+(?:=[^\s]+)?/g) ?? []),
        ),
        historicalPersonalCenterSelection: old
          ? { mode: old.execution.mode, nodeArgs: old.execution.nodeArgs }
          : null,
        references: refs.filter((x) => x.to === p),
      },
      ciCoverage: events.map((e) => ({
        eventId: e.id,
        status:
          e.selection === "none"
            ? "NOT_SELECTED"
            : direct
              ? "DIRECT_SELECTED_STATIC"
              : parent
                ? "INDIRECT_SELECTED_STATIC"
                : "NOT_PROVEN_SELECTED",
        job:
          e.selection === "partition-union"
            ? lane === "rebuild"
              ? "proof"
              : lane
                ? "regression"
                : null
            : direct || parent
              ? e.jobs.at(-1)
              : null,
        lane: e.selection === "partition-union" ? lane : null,
        via: parent?.from ?? null,
      })),
      executionStatus: "NOT_EXECUTED",
      executedCases: null,
      machineClassification: "STATIC_DISCOVERY",
      humanConfirmation: "NOT_CONFIRMED_PER_FILE",
      reviewStatus: reasons.length ? "NEEDS_REVIEW" : "STATIC_CLASSIFIED",
      reviewReasons: reasons,
    };
  });
  const tally = (key) =>
    Object.fromEntries(
      sorted(entries.map((x) => x[key])).map((v) => [
        v,
        entries.filter((x) => x[key] === v).length,
      ]),
    );
  const tests = entries.filter((x) => x.role === "test"),
    uncovered = tests
      .filter(
        (x) => !top.includes(x.path) && !indirect.some((e) => e.to === x.path),
      )
      .map((x) => x.path);
  const inventory = {
    ...identity,
    task: "TASK-035-A / WBS 9.1 Phase 1",
    canonicalOwner: "A",
    executionSupport: "B",
    discoveryRules: [
      "git ls-tree -rzl fixed commit; Git-tracked blobs only",
      "Every tests/** entry including nested/binary fixtures",
      "All tools/** and scripts/** executable sources: mjs,cjs,js,jsx,ts,tsx,py,sh,ps1; operational candidates retained",
      "Every workflow; named package/runtime/compiler/deployment configs",
      "Whole-repository source scan for test/spec/runtime/selftest names or node:test/unittest.TestCase/Playwright/browser signals",
      "Read all source/Markdown/YAML/TOML/config and TASK-055 inventory using git cat-file --batch; no target imports/execution",
      "References from literal repo paths and relative imports/require/new URL; mention is not execution proof",
      "One ID/path and primary role per file; suites/cases are not inferred from file counts",
    ],
    scanScope: {
      root: ".",
      trackedBlobs: all.length,
      textInputs: readFiles.length,
      metadataOnlyBlobs: all.length - readFiles.length,
      trackedTreeManifestSha256: hash(json(all)),
      excludes: [
        "untracked/ignored files, node_modules and other branches outside fixed tree",
        "non-source data/assets metadata-only except tracked test fixture candidates",
      ],
    },
    inputFileHashes: readFiles.map((x) => ({
      path: x.path,
      blobSha: x.blobSha,
      sha256: contents.get(x.path).sha256,
    })),
    summary: {
      candidateFiles: entries.length,
      byRole: tally("role"),
      byLanguage: tally("language"),
      independentTestFiles: tests.length,
      nonTestCandidateFiles: entries.length - tests.length,
      auxiliaryFiles: entries.filter((x) =>
        ["helper", "fixture", "config"].includes(x.role),
      ).length,
      topLevelNodeSelectedFiles: top.length,
      indirectPythonTestFiles: indirect.length,
      staticallySelectedUniqueTestFiles: top.length + indirect.length,
      testFilesWithoutProvenCiSelection: uncovered.length,
      discoveredSuiteCount: null,
      executedSuiteCount: null,
      executedCaseCount: null,
      countSemantics:
        "test=explicit/assertion-bearing test file; harness=separate QA/browser candidate; suite/case counts unmeasured",
      needsReviewFiles: entries.filter((x) => x.reviewStatus === "NEEDS_REVIEW")
        .length,
    },
    unresolvedItems: {
      files: entries
        .filter((x) => x.reviewStatus === "NEEDS_REVIEW")
        .map((x) => ({ id: x.id, reasons: x.reviewReasons })),
      unresolvedImports,
      testFilesWithoutProvenCiSelection: uncovered,
      limitations: [
        "Text scan is not an AST/call graph; computed paths/aliases can evade reference extraction",
        "Ownership, layer and prerequisite inference advisory; unknown is not false",
        "Docs commands can be historical; valid source path is not successful execution",
        "Binary fixtures bound by Git blobSha; inputSha256 null when not decoded",
      ],
    },
    entries,
  };
  // Preserve the actual nested runner's loader and flags rather than inheriting its parent's.
  const projection = entries.find(
    (x) => x.path === "tests/task-019-projection.cases.mjs",
  );
  projection.currentEntry.loaders = ["./tests/register-planner-ts.mjs"];
  projection.currentEntry.flags = ["--conditions=react-server", "--test"];
  projection.currentEntry.existingCommands.push(
    "node --conditions=react-server --import ./tests/register-planner-ts.mjs --test tests/task-019-projection.cases.mjs",
  );
  for (const entry of entries) {
    entry.currentEntry.ciEntryPoints = [];
    for (const workflow of all.filter((x) =>
      /^\.github\/workflows\//.test(x.path),
    )) {
      let job = null;
      source(workflow.path)
        .split(/\r?\n/)
        .forEach((line, i) => {
          const m = line.match(/^  ([a-z][a-z-]+):\s*$/);
          if (m) job = m[1];
          const alias = aliases.find(
            (x) =>
              x.selectedPaths.includes(entry.path) &&
              line.includes("npm run " + x.name),
          );
          if (job && (line.includes(entry.path) || alias))
            entry.currentEntry.ciEntryPoints.push({
              workflow: workflow.path,
              job,
              line: i + 1,
              via: alias?.id ?? entry.path,
              eventIds: events
                .filter(
                  (x) => x.workflow === workflow.path && x.jobs.includes(job),
                )
                .map((x) => x.id),
            });
        });
    }
    if (reviewedHelpers.has(entry.path))
      entry.humanConfirmation =
        "SOURCE_ROLE_CONFIRMED_ONLY; environment/ownership still advisory";
    const mentions = refs.filter(
      (x) => x.to === entry.path && top.includes(x.from),
    );
    entry.currentEntry.selectedTestReferences = mentions;
    entry.currentEntry.referenceSemantics =
      "References may read source, call a helper, or execute a child. Only four reviewed indirect test edges are execution selections; other mentions are not proof.";
  }
  inventory.discoveryRules.push(
    "Also discover fixture/harness/loader source names anywhere, docs/qa executable sources, and read tracked SQL inputs; ten support roles independently source-reviewed",
  );
  inventory.summary.indirectPythonTestFiles = indirect.filter((x) =>
    x.to.endsWith(".py"),
  ).length;
  inventory.summary.indirectNodeTestFiles = indirect.filter((x) =>
    x.to.endsWith(".mjs"),
  ).length;
  inventory.unresolvedItems.directoryReferences = directoryReferences;
  inventory.referenceGraph = {
    semantics:
      "Complete extracted source/reference graph, including non-candidate business/input targets; mentions are not execution claims",
    edges: refs,
  };
  const coverage = makeCoverage({
    identity,
    all,
    byPath,
    source,
    contents,
    events,
    lanes,
    top,
    indirect,
    aliases,
    pc,
    uncovered,
    qg,
  });
  coverage.selector.nodeArgs = [
    "--import",
    "./tests/register-route-ts.mjs",
    "--test",
    "--test-concurrency=1",
  ];
  coverage.unresolvedEntryPaths = aliases.flatMap((entry) =>
    [
      ...entry.command.matchAll(
        /(?:tests|tools|scripts)\/[A-Za-z0-9_./-]+\.(?:mjs|cjs|js|ts|py)\b/g,
      ),
    ]
      .filter((m) => !byPath.has(m[0]))
      .map((m) => ({ entry: entry.id, path: m[0], status: "NEEDS_REVIEW" })),
  );
  coverage.selector.processTimeoutMs = {
    regression: 25 * 60000,
    rebuild: 15 * 60000,
  };
  coverage.selector.workflowTimeoutMinutes = {
    regression: 35,
    graph: 45,
    extraction: 25,
    resume: 45,
    proof: 25,
    quality: 25,
    aggregate: 5,
  };
  assert.equal(new Set(entries.map((x) => x.id)).size, entries.length);
  assert.equal(new Set(paths).size, entries.length);
  assert.equal(
    Object.values(inventory.summary.byRole).reduce((a, b) => a + b, 0),
    entries.length,
  );
  assert.ok(refs.every((x) => byPath.has(x.from) && byPath.has(x.to)));
  assert.ok(
    entries.every(
      (x) => x.executionStatus === "NOT_EXECUTED" && x.executedCases === null,
    ),
  );
  assert.equal(top.length + indirect.length + uncovered.length, tests.length);
  return {
    inventory,
    coverage,
    validation: {
      candidatesClassified: entries.length,
      uniqueIds: entries.length,
      uniquePaths: entries.length,
      resolvedReferenceEdges: refs.length,
      resolvedReferenceTargetsValid: true,
      unresolvedImportReferences: unresolvedImports.length,
      primaryLaneUnionEqualsSelection: true,
      primaryLaneDuplicates: 0,
      roleCountsConsistent: true,
      coveragePartitionConsistent: true,
      auditedTargetsExecuted: 0,
    },
  };
}
function makeCoverage({
  identity,
  all,
  byPath,
  source,
  contents,
  events,
  lanes,
  top,
  indirect,
  aliases,
  pc,
  uncovered,
  qg,
}) {
  return {
    ...identity,
    semantics:
      "Static source selection/binding only; no execution PASS implied",
    workflowSources: all
      .filter((x) => /^\.github\/workflows\//.test(x.path))
      .map((x) => ({
        path: x.path,
        blobSha: x.blobSha,
        sourceSha256: contents.get(x.path).sha256,
        sourceLines: source(x.path)
          .split(/\r?\n/)
          .map((text, i) => ({ line: i + 1, text })),
      })),
    events,
    selector: {
      path: "tools/qa/task-086-regression-lanes.mjs",
      blobSha: byPath.get("tools/qa/task-086-regression-lanes.mjs").blobSha,
      method:
        "independent source-reviewed transcription; existing runner not imported/executed",
      directory: "tests",
      recursive: false,
      suffix: ".test.mjs",
      order: "JavaScript lexical sort",
      specialCondition:
        "inputs.task086FinalCloseout || github.head_ref == 'feature/b-transport-node-mobility-backbone' || github.ref == 'refs/heads/feature/b-transport-node-mobility-backbone' || github.ref == 'refs/heads/develop'",
      assetsRule: "^tests/task-013",
      rebuildRule: "tests/task-086-b-rebuild.test.mjs",
      remainingRule: "sorted remaining files round-robin index % 4",
      files: top,
      lanes,
      counts: Object.fromEntries(
        Object.entries(lanes).map(([k, v]) => [k, v.length]),
      ),
      unionEqualsTopLevelSelection: true,
      disjointPrimaryLanes: true,
    },
    indirectExecution: indirect,
    entryPoints: aliases,
    existingPersonalCenterAggregate: {
      harness: "tools/qa/personal-center-tests.mjs",
      inventory: "docs/qa/TASK-055/test-inventory.json",
      selection:
        "suites.filter(execution.mode === (argv --local ? local : non-local))",
      suites: pc.suites.map((x) => ({
        file: x.file,
        mode: x.execution.mode,
        nodeArgs: x.execution.nodeArgs,
      })),
      ciInvokesAggregate: false,
      localPrerequisites: [
        "exclusive local Supabase/Docker",
        "existing .next/BUILD_ID",
        "free ports 3000/3001",
        "explicit CODEX_PLAYWRIGHT_PATH",
        "generated DB type equality; cleanup and zero-skip assertions",
      ],
      e2eHarness: "tools/qa/personal-center-e2e.mjs",
      e2eTarget: "tests/task-059-personal-center-e2e.runtime.mjs",
      browserChoices: ["edge", "chromium", "firefox", "webkit"],
      e2eCiSelected: false,
    },
    proofChain: {
      graph: ["first", "second"],
      extraction: "extract",
      resumeNeeds: ["graph"],
      proofNeeds: ["graph", "extraction", "resume"],
      aggregateNeeds: [
        "regression",
        "graph",
        "extraction",
        "resume",
        "proof",
        "quality",
      ],
      sources: [
        "tools/transport/task-086-validation.mjs",
        "tools/transport/task-086-validation-lanes.mjs",
        "tools/transport/task-086-verify.mjs",
        "tools/qa/ci-revision.mjs",
        qg,
      ],
      binding: [
        "checkoutSha",
        "runId",
        "runAttempt",
        "inputCodeSha256",
        "proofInputSha256",
        "nodeVersion",
        "platform",
      ],
      validations: [
        "manifest inputHashes/generatorHashes versus published bytes",
        "first/second artifact equality and resume CHECKSUM_SKIP",
        "retained raw extraction reproduction",
        "independent proof-input preservation",
        "published artifact comparison",
        "resume corruption invalidation",
        "aggregate all needs success and event/run/attempt equality",
        "eligibility and engine receipts bound to same SHA/run/attempt/input",
        "regression union and distinct file count",
      ],
      artifacts: [
        {
          producer: "graph[first,second]",
          name: "task086-graph-<lane>-<github.sha>",
          consumer: "resume uses first; proof uses both",
          retentionDays: 3,
        },
        {
          producer: "extraction",
          name: "task086-extraction-<github.sha>",
          consumer: "proof",
          retentionDays: 3,
        },
        {
          producer: "resume",
          name: "task086-resume-<github.sha>",
          consumer: "proof",
          retentionDays: 3,
        },
        {
          producer: "regression[5 lanes]",
          name: "task086-regression-<lane>-<github.sha>",
          consumer: "closeout gate, merge-multiple",
          retentionDays: 3,
        },
        {
          producer: "proof",
          name: "task086-proof-<github.sha>",
          consumer: "closeout gate",
          retentionDays: 3,
        },
        {
          producer: "closeout-quality-gate",
          name: "task086-final-exact-head-<github.sha>",
          consumer: "human audit",
          retentionDays: 30,
        },
      ],
      caution:
        "exact-head job label means GITHUB_SHA/event checkout; PR merge-ref is not necessarily branch head. Gate reads shared regression-inventory.json and trusts needs success; it does not independently compare every lane log/receipt digest.",
    },
    gaps: [
      {
        id: "G1",
        finding:
          "npm test absent; old PR loader/exact-string governance assertions need redesign",
        source: "package.json",
      },
      {
        id: "G2",
        finding:
          "top-level Node selector is not all repository tests; Python selftests/runtime/browser excluded or unproven",
        files: uncovered,
      },
      {
        id: "G3",
        finding:
          "ordinary PR/release include serial heavy rebuild, but not full published/lane receipt chain",
        source: qg,
      },
      {
        id: "G4",
        finding:
          "verify ignores expectedHead input. Its artifact step requires task086FinalCloseout, which makes the job itself ineligible",
        source: qg,
      },
      {
        id: "G5",
        finding:
          "Node pinned to major 24; no setup-python step; browser/DB prerequisites not centrally modeled",
        source: ".nvmrc",
      },
      {
        id: "G6",
        finding:
          "local aliases/Personal Center aggregate overlap CI-selected tests; alternative-entry duplication differs from duplicate execution inside lane union",
        source: "tools/qa/personal-center-tests.mjs",
      },
      {
        id: "G7",
        finding:
          "script/source names cannot certify offline/no-write behavior; children, scratch outputs and heavy verification must be modeled",
        source: "tools/transport/task-086-verify.mjs",
      },
    ],
    overlap: {
      primaryLaneDuplicates: [],
      npmAliasesOverlappingCi: aliases
        .filter((x) => x.selectedPaths.some((p) => top.includes(p)))
        .map((x) => x.id),
      nestedFocusedReplay: {
        source: "tools/transport/task-086-verify.mjs",
        condition:
          "publish=true / TASK086_PUBLISH_VALIDATION=1; not set in reviewed CI",
        note: "focused subprocess tests duplicate primary selection only in this publish mode",
      },
    },
    coverageSets: {
      directTests: top,
      indirectTests: indirect.map((x) => x.to).sort(),
      notProvenSelectedTests: uncovered,
    },
    executionStatus: "NOT_EXECUTED",
  };
}
assert.equal(
  process.argv.length,
  2,
  "No alternate output/ref arguments; writes stay inside phase-1",
);
const self = selfCheck(),
  first = generate(),
  second = generate();
assert.equal(
  json(first.inventory),
  json(second.inventory),
  "Non-deterministic inventory",
);
assert.equal(
  json(first.coverage),
  json(second.coverage),
  "Non-deterministic coverage",
);
writeFileSync(resolve(here, "test-inventory.json"), json(first.inventory));
writeFileSync(resolve(here, "ci-coverage-map.json"), json(first.coverage));
const receipt = {
  ...identity,
  auditValidation: {
    status: "PASS",
    method:
      "two complete Git-object scans; exact UTF-8 JSON byte equality; dedup/count/reference validation",
    generatedInventorySha256: hash(json(first.inventory)),
    generatedCoverageSha256: hash(json(first.coverage)),
    repeatedGenerationEqual: true,
    ...first.validation,
    generatorSelfValidation: self,
    caveat:
      "PASS is audit invariant validation, not business test success or human per-file confirmation; unresolved references retained",
  },
  businessTestsExecution: {
    status: "NOT_EXECUTED",
    cases: null,
    suites: null,
    notExecuted: [
      "repository Node regression",
      "Python tests/selftests",
      "graph clean rebuild/extraction/resume/proof",
      "browser/physical-device smoke",
      "Local DB/Auth runtime",
      "real Provider/network smoke",
      "lint/typecheck/build/deployment gates",
    ],
  },
  ciStatus: {
    status: "NOT_EXECUTED_BY_THIS_AUDIT",
    eventSha: null,
    checkoutSha: null,
    branchHeadSha: null,
    note: "docs branch push not a workflow trigger at audited SHA; historical runs not current evidence; remote observation belongs in external publication receipt",
  },
};
writeFileSync(resolve(here, "audit-validation.json"), json(receipt));
console.log(
  json({
    summary: first.inventory.summary,
    auditValidation: receipt.auditValidation,
  }),
);
