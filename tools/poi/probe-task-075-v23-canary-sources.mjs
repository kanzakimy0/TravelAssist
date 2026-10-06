import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const root = process.cwd();
const editorial = JSON.parse(
  readFileSync("data/poi/full/sources/remaining-v1/editorial.json", "utf8"),
).entries;
const current = new Map(
  readFileSync(
    "data/poi/full/task-075-b-japan-poi-entity-resolver-43d-completion/43d-decisions.jsonl",
    "utf8",
  )
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const row = JSON.parse(line);
      return [row.candidateKey, row];
    }),
);
const accepted = editorial.filter(
  (entry) =>
    current.get(entry.candidateKey)?.identityDisposition ===
    "EXISTING_ACCEPTED",
);
const selected = accepted.slice(0, 80);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();

const results = [];
for (const entry of selected) {
  const url = entry.source?.finalUrl ?? entry.source?.url;
  if (!url) {
    results.push({
      candidateKey: entry.candidateKey,
      url: null,
      status: "NO_URL",
    });
    continue;
  }
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": "TravelAssist-task-075-v2.3-canary/1.0" },
    });
    const html = await response.text();
    const text = stripHtml(html);
    results.push({
      candidateKey: entry.candidateKey,
      sourceRef: entry.sourceRef,
      url,
      finalUrl: response.url,
      status: response.status,
      ok: response.ok,
      textLength: text.length,
      contentSha256: sha256(text),
      currentNullFeatureCount: (
        current.get(entry.candidateKey)?.decisions ?? []
      ).filter((d) => d.value === null).length,
      editorialFeatureCodes: (entry.features ?? []).map((f) => f.code),
      textSample: text.slice(0, 320),
    });
  } catch (error) {
    results.push({
      candidateKey: entry.candidateKey,
      sourceRef: entry.sourceRef,
      url,
      status: "FETCH_ERROR",
      error: String(error?.message ?? error),
    });
  }
}

mkdirSync("docs/qa/TASK-075-B", { recursive: true });
writeFileSync(
  "docs/qa/TASK-075-B/semantic-canary-source-probe.json",
  JSON.stringify(
    {
      schemaVersion: "task-075-b-v2.3-canary-source-probe-v1",
      selectionPolicy:
        "First 80 non-residual EXISTING_ACCEPTED editorial entries; no TASK-075 residual identity row included.",
      selectedCount: selected.length,
      fetchAttempted: results.length,
      fetchOk: results.filter((r) => r.ok).length,
      retainedTextCandidateCount: results.filter(
        (r) => r.ok && r.textLength >= 200,
      ).length,
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    {
      selected: selected.length,
      attempted: results.length,
      ok: results.filter((r) => r.ok).length,
      retainedTextCandidateCount: results.filter(
        (r) => r.ok && r.textLength >= 200,
      ).length,
    },
    null,
    2,
  ),
);
