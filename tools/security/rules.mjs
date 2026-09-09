import { createHash } from "node:crypto";

export const fingerprint = (value) =>
  createHash("sha256").update(value).digest("hex");
// Never attach match text, captured groups, source lines or Error objects to findings.
export const rules = [
  [
    "private-key",
    "critical",
    /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----[\s\S]*?(?:-----END [A-Z ]*PRIVATE KEY-----|$)/g,
  ],
  [
    "github-token",
    "high",
    /\b(?:gh[pousr]_[A-Za-z0-9]{20,255}|github_pat_[A-Za-z0-9_]{30,255})\b/g,
  ],
  ["aws-access-id", "high", /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ["gcp-key", "high", /\bAIza[A-Za-z0-9_-]{30,60}\b/g],
  ["google-oauth-secret", "high", /\bGOCSPX-[A-Za-z0-9_-]{15,80}\b/g],
  ["supabase-secret", "critical", /\bsb_secret_[A-Za-z0-9_-]{12,255}\b/g],
  ["mapbox-secret", "high", /\bsk\.[A-Za-z0-9_-]{15,}(?:\.[A-Za-z0-9_-]+)*/g],
  ["mapbox-public", "low", /\bpk\.[A-Za-z0-9_-]{15,}(?:\.[A-Za-z0-9_-]+)*/g],
  ["supabase-public", "low", /\bsb_publishable_[A-Za-z0-9_-]{16,255}\b/g],
  [
    "payment-key",
    "critical",
    /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,255}\b/g,
  ],
  [
    "url-credentials",
    "high",
    /\b[a-z][a-z0-9+.-]*:\/\/[^\s\/@:"'<>]+:[^\s\/@"'<>]+@[^\s\/)"'<>]+/gi,
  ],
  [
    "azure-key",
    "high",
    /\b(?:AccountKey|SharedAccessKey)\s*=\s*[A-Za-z0-9+/]{30,}={0,2}/gi,
  ],
  ["azure-sas", "high", /[?&]sig=[A-Za-z0-9%+/]{24,}={0,2}/gi],
  [
    "generic-credential",
    "high",
    /\b(?:[A-Z_]*(?:PASSWORD|PASSWD|API_KEY|APIKEY|ACCESS_TOKEN|REFRESH_TOKEN|CLIENT_SECRET|JWT_SECRET|SECRET_ACCESS_KEY|SERVICE_ROLE_KEY)|clientSecret|accessToken|refreshToken|secret|token|bearer)\b["']?\s*[:=][ \t]*["']?([A-Za-z0-9_+/.!%:@-]{8,})(?=[\s"'`,;}\)]|$)/gi,
  ],
  ["bearer-value", "high", /\bBearer\s+([A-Za-z0-9_.+/-]{16,})/gi],
];
const categories = new Set(
  rules
    .map(([id]) => id)
    .concat([
      "jwt-service-role",
      "jwt-token",
      "jwt-public",
      "env-file",
      "env-template-value",
      "public-env-secret",
      "client-secret-marker",
      "client-canary",
    ]),
);
const placeholder = (value) =>
  /^(?:YOUR_[A-Z_]+|<[^>]+>|\$\{[^}]+\}|\*+|REDACTED|CHANGE_ME|REPLACE_ME|placeholder|example|undefined|null|current-password|new-password)$/i.test(
    value,
  );

export function safePath(path) {
  // Paths are untrusted too; never echo credential-looking filenames/URLs/control codes.
  if (
    /[\x00-\x1f\x7f]/.test(path) ||
    path.length > 240 ||
    /(?:gh[pousr]_|github_pat_|sb_secret_|[ps]k\.|:\/\/|eyJ[A-Za-z0-9_-]+\.)/.test(
      path,
    ) ||
    rules.some(([, , pattern]) => new RegExp(pattern).test(path))
  )
    return "path-sha256:" + fingerprint(path);
  return path;
}
export function finding(path, category, value, severity = "high", line = 1) {
  return {
    path: safePath(path),
    category,
    severity,
    line,
    fingerprint: fingerprint(value),
    remediation:
      "Review locally without printing; remove exposure and rotate if genuine. Do not rewrite history without authorization.",
  };
}
export function validateAllowlist(
  input,
  today = new Date().toISOString().slice(0, 10),
) {
  if (!input || input.version !== 1 || !Array.isArray(input.entries))
    throw new Error("INVALID_ALLOWLIST");
  const seen = new Set();
  for (const entry of input.entries) {
    if (
      !entry ||
      Object.keys(entry).sort().join() !==
        "category,expires,fingerprint,path,reason,scope" ||
      !categories.has(entry.category) ||
      typeof entry.path !== "string" ||
      !entry.path ||
      /[*?\[\]\\\x00-\x1f]/.test(entry.path) ||
      entry.path.startsWith("/") ||
      entry.path.split("/").includes("..") ||
      !/^[a-f0-9]{64}$/.test(entry.fingerprint) ||
      !["tracked", "history", "bundle"].includes(entry.scope) ||
      typeof entry.reason !== "string" ||
      entry.reason.trim().length < 20 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires) ||
      !Number.isFinite(Date.parse(entry.expires)) ||
      new Date(entry.expires).toISOString().slice(0, 10) !== entry.expires ||
      entry.expires < today
    )
      throw new Error("INVALID_OR_EXPIRED_ALLOWLIST");
    const key = [
      entry.scope,
      entry.category,
      entry.path,
      entry.fingerprint,
    ].join(":");
    if (seen.has(key)) throw new Error("DUPLICATE_ALLOWLIST");
    seen.add(key);
  }
  return input.entries;
}
export function applyAllowlist(findings, entries, scope) {
  return findings.map((item) => ({
    ...item,
    allowed: entries.some(
      (entry) =>
        entry.scope === scope &&
        entry.path === item.path &&
        entry.category === item.category &&
        entry.fingerprint === item.fingerprint,
    ),
  }));
}

export function scanText(
  text,
  path,
  { scope = "tracked", canaries = [] } = {},
) {
  const hits = [];
  const add = (category, value, severity, index) =>
    hits.push(
      finding(
        path,
        category,
        value,
        severity,
        1 + text.slice(0, index).split("\n").length - 1,
      ),
    );
  for (const [category, severity, pattern] of rules) {
    for (const match of text.matchAll(new RegExp(pattern))) {
      const value = match[1] ?? match[0];
      if (category === "generic-credential") {
        if (placeholder(value)) continue;
        // JS/TS assignments without a string delimiter are expressions, not
        // embedded literals, including minified URL parser property copies.
        // Env/YAML/text inputs still scan unquoted values.
        if (/\.[cm]?[jt]sx?$/.test(path) && !/[:=][ \t]*["']/.test(match[0]))
          continue;
      }
      // Keep complete URL fingerprint, never username/password snippets.
      add(category, value, severity, match.index);
    }
  }
  for (const match of text.matchAll(
    /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{8,}\b/g,
  )) {
    let role;
    try {
      role = JSON.parse(
        Buffer.from(match[0].split(".")[1], "base64url").toString(),
      ).role;
    } catch {
      /* still suspicious */
    }
    add(
      role === "service_role"
        ? "jwt-service-role"
        : role === "anon"
          ? "jwt-public"
          : "jwt-token",
      match[0],
      role === "anon" ? "low" : "critical",
      match.index,
    );
  }
  if (/(^|\/)\.env(?:\.|$)/.test(path)) {
    if (!path.endsWith(".env.example")) add("env-file", text, "high", 0);
    else
      for (const match of text.matchAll(
        /^[ \t]*[A-Z][A-Z0-9_]*[ \t]*=[ \t]*(.*?)[ \t]*\r?$/gm,
      )) {
        const value = match[1].replace(/^["']|["']$/g, "");
        if (value && !placeholder(value))
          add("env-template-value", value, "high", match.index);
      }
  }
  for (const match of text.matchAll(
    /\bNEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PASSWORD|PRIVATE_KEY|SERVICE_ROLE|DATABASE_URL)[A-Z0-9_]*\b/g,
  ))
    add("public-env-secret", match[0], "critical", match.index);
  if (scope === "bundle") {
    for (const match of text.matchAll(
      /\b(?:DATABASE_URL|SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|AUTH_SITE_URL|[A-Z0-9_]*CLIENT_SECRET|JWT_SECRET|MAPBOX_SECRET_TOKEN|AWS_SECRET_ACCESS_KEY)\b|src\/(?:db|server)\/|drizzle-orm/g,
    ))
      add("client-secret-marker", match[0], "critical", match.index);
    for (const canary of canaries)
      if (canary && text.includes(canary))
        add("client-canary", canary, "critical", text.indexOf(canary));
  }
  return [
    ...new Map(
      hits.map((hit) => [
        [hit.category, hit.line, hit.fingerprint].join(":"),
        hit,
      ]),
    ).values(),
  ];
}
