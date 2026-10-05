import fs from "node:fs";
const sensitive =
  /^(?:x-amz-.+|x-goog-.+|awsaccesskeyid|signature|sig|access[_-]?token|session[_-]?token|token|api[_-]?key|key-pair-id|se|sp|sv|sr|spr|skt|ske|sks|skv|skoid|sktid)$/i;
export function safeSourceUrl(text) {
  try {
    const u = new URL(text);
    u.username = "";
    u.password = "";
    for (const k of [...u.searchParams.keys()])
      if (sensitive.test(k)) u.searchParams.delete(k);
    if (/(?:token|signature|secret|credential)=/i.test(u.hash)) u.hash = "";
    return u.href;
  } catch {
    return text;
  }
}
export function safeLogText(text) {
  return String(text)
    .replace(/<(?:meta|input)\b[^>]*>/gi, (tag) => {
      const names = [
        ...tag.matchAll(
          /(?:^|\s)(?:name|id)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi,
        ),
      ].map((match) => match[1] ?? match[2] ?? match[3]);
      return names.some((name) =>
        /csrf|token|session.?id|signature|credential|api.?key/i.test(name),
      )
        ? "<!-- REDACTED_EPHEMERAL_FIELD -->"
        : tag;
    })
    .replace(
      /((?:"nonce"|'nonce'|\bnonce)\s*[:=]\s*)(?:"[^"\r\n]*"|'[^'\r\n]*'|[^\s,;<>}]+)/gi,
      '$1"[REDACTED]"',
    )
    .replace(/https?:\/\/[^\s<>"']+/g, (u) => safeSourceUrl(u))
    .replace(/\b(Bearer\s+)[A-Za-z0-9._~+\/-]+=*/gi, "$1[REDACTED]")
    .replace(
      /\b(access[_-]?token|session[_-]?token|api[_-]?key|signature)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[REDACTED]",
    );
}
export function sanitizeEvidence(value) {
  if (typeof value === "string") return safeLogText(value);
  if (Array.isArray(value)) return value.map(sanitizeEvidence);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, sanitizeEvidence(v)]),
    );
  return value;
}
export function sanitizedWrite(file, value) {
  fs.writeFileSync(file, JSON.stringify(sanitizeEvidence(value)) + "\n");
}
