import ts from "typescript";
import { readFileSync, existsSync } from "node:fs";
import { resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { git, ROOT, newReport, finish, saveReport, summary } from "./scan.mjs";
import { finding, fingerprint } from "./rules.mjs";

export const publicEnv = new Set([
  "NEXT_PUBLIC_MAPBOX_TOKEN",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
]);
const directives = (sf) =>
  sf.statements
    .filter(
      (s) => ts.isExpressionStatement(s) && ts.isStringLiteral(s.expression),
    )
    .map((s) => s.expression.text);
export function analyzeModule(text, path) {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    true,
    path.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = [],
    envNames = [],
    risks = [];
  function visit(node) {
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const c = node.importClause;
      const onlyTypes =
        c?.isTypeOnly ||
        (!c?.name &&
          c?.namedBindings &&
          ts.isNamedImports(c.namedBindings) &&
          c.namedBindings.elements.length > 0 &&
          c.namedBindings.elements.every((x) => x.isTypeOnly));
      if (!onlyTypes) imports.push(node.moduleSpecifier.text);
    }
    if (
      ts.isExportDeclaration(node) &&
      !node.isTypeOnly &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      const onlyTypes =
        node.exportClause &&
        ts.isNamedExports(node.exportClause) &&
        node.exportClause.elements.length > 0 &&
        node.exportClause.elements.every((x) => x.isTypeOnly);
      if (!onlyTypes) imports.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      if (
        node.arguments.length === 1 &&
        ts.isStringLiteralLike(node.arguments[0])
      )
        imports.push(node.arguments[0].text);
      else risks.push("dynamic-module-reference");
    }
    const isEnv = (n) =>
      (ts.isPropertyAccessExpression(n) &&
        n.expression.getText(sf) === "process" &&
        n.name.text === "env") ||
      (ts.isElementAccessExpression(n) &&
        n.expression.getText(sf) === "process" &&
        ts.isStringLiteral(n.argumentExpression) &&
        n.argumentExpression.text === "env");
    if (isEnv(node)) {
      const p = node.parent;
      if (ts.isPropertyAccessExpression(p) && p.expression === node)
        envNames.push(p.name.text);
      else if (
        ts.isElementAccessExpression(p) &&
        p.expression === node &&
        ts.isStringLiteral(p.argumentExpression)
      )
        envNames.push(p.argumentExpression.text);
      else risks.push("dynamic-env-access");
    }
    if (
      ts.isCallExpression(node) &&
      /^(?:console\.(?:log|error|warn|debug|info)|(?:logger|log)\.(?:error|warn|debug|info))$/.test(
        node.expression.getText(sf),
      )
    ) {
      const args = node.arguments.map((x) => x.getText(sf)).join(" ");
      if (
        /process\.env|authorization|cookie|access.?token|refresh.?token|password|secret|connectionString|\b(?:error|err)\b/i.test(
          args,
        )
      )
        risks.push("sensitive-log-surface");
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return {
    client: directives(sf).includes("use client"),
    action: directives(sf).includes("use server"),
    serverOnly: imports.includes("server-only"),
    imports,
    envNames,
    risks,
  };
}
export function inspectGraph(modules, resolveImport) {
  const findings = [],
    visited = new Set();
  for (const [path, module] of modules) {
    if (
      module.envNames.some((n) => n !== "NODE_ENV" && !publicEnv.has(n)) &&
      !module.serverOnly
    )
      findings.push(finding(path, "missing-server-only", path));
    if (
      module.envNames.some(
        (n) => n.startsWith("NEXT_PUBLIC_") && !publicEnv.has(n),
      )
    )
      findings.push(finding(path, "unapproved-public-env", path));
    if (module.risks.includes("sensitive-log-surface"))
      findings.push(finding(path, "sensitive-log-surface", path));
  }
  function walk(path) {
    if (visited.has(path)) return;
    visited.add(path);
    const m = modules.get(path);
    if (!m) return;
    if (m.action) {
      // Server Action references are legal Next boundaries, not browser code.
      if (!m.serverOnly)
        findings.push(finding(path, "unguarded-server-action", path));
      return;
    }
    if (m.serverOnly || /^src\/(?:server|db)\//.test(path))
      findings.push(finding(path, "server-module-in-client", path, "critical"));
    if (
      m.envNames.some((n) => n !== "NODE_ENV" && !publicEnv.has(n)) ||
      m.risks.includes("dynamic-env-access")
    )
      findings.push(finding(path, "private-env-in-client", path, "critical"));
    if (m.risks.includes("dynamic-module-reference"))
      findings.push(finding(path, "unresolved-client-import", path));
    for (const spec of m.imports) {
      if (/^(?:server-only|postgres|drizzle-orm|node:)/.test(spec))
        findings.push(
          finding(path, "private-package-in-client", spec, "critical"),
        );
      const target = resolveImport(path, spec);
      if (target) walk(target);
      else if (
        (spec.startsWith(".") || spec.startsWith("@/")) &&
        !/\.(?:css|svg|png|jpg|webp|json)$/.test(spec)
      )
        findings.push(finding(path, "unresolved-client-import", spec));
    }
  }
  for (const [path, m] of modules) if (m.client) walk(path);
  return {
    findings,
    clientModules: visited.size,
    clientEntries: [...modules.values()].filter((x) => x.client).length,
  };
}
export function scanBoundary(root = ROOT) {
  const report = newReport("boundary");
  const configPath = resolve(root, "tsconfig.json");
  const raw = ts.readConfigFile(configPath, ts.sys.readFile);
  if (raw.error) throw new Error("INVALID_TSCONFIG");
  const config = ts.parseJsonConfigFileContent(raw.config, ts.sys, root);
  const paths = git(root, ["ls-files", "-z"])
    .split("\0")
    .filter((x) => /^src\/.+\.[cm]?[jt]sx?$/.test(x) && !x.endsWith(".d.ts"));
  const modules = new Map(
    paths.map((path) => [
      path,
      analyzeModule(readFileSync(resolve(root, path), "utf8"), path),
    ]),
  );
  const graph = inspectGraph(modules, (path, spec) => {
    const target = ts.resolveModuleName(
      spec,
      resolve(root, path),
      config.options,
      ts.sys,
    ).resolvedModule?.resolvedFileName;
    if (!target) return null;
    const rel = relative(root, target).split(sep).join("/");
    return modules.has(rel) ? rel : null;
  });
  report.counts.files = modules.size;
  report.counts.scanned = modules.size;
  report.clientEntries = graph.clientEntries;
  report.clientModules = graph.clientModules;
  report.findings = graph.findings;
  if (!graph.clientEntries) report.errors.push({ code: "NO_CLIENT_ENTRIES" });
  // Assert env file ignore protection without ever reading a private file.
  for (const path of [
    ".env",
    ".env.local",
    ".env.production",
    ".env.test",
    "provider-credentials.json",
    "supabase/signing_keys.json",
  ]) {
    try {
      git(root, ["check-ignore", "--no-index", path]);
    } catch {
      report.findings.push(finding(path, "missing-ignore", path));
    }
  }
  if (existsSync(resolve(root, ".env.example"))) {
    const template = readFileSync(resolve(root, ".env.example"), "utf8");
    for (const match of template.matchAll(
      /^\s*(NEXT_PUBLIC_[A-Z0-9_]+)\s*=/gm,
    )) {
      if (!publicEnv.has(match[1]))
        report.findings.push(
          finding(".env.example", "unapproved-public-env", match[1]),
        );
    }
  }
  return finish(report);
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const r = scanBoundary();
    saveReport(ROOT, r);
    console.log(
      JSON.stringify(
        {
          ...summary(r),
          clientEntries: r.clientEntries,
          clientModules: r.clientModules,
        },
        null,
        2,
      ),
    );
    process.exitCode = r.status === "PASS" ? 0 : 1;
  } catch (error) {
    console.error(
      JSON.stringify({
        status: "INCOMPLETE",
        fingerprint: fingerprint(String(error?.message ?? "unknown")),
      }),
    );
    process.exitCode = 2;
  }
}
