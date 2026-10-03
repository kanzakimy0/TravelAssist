import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { safeSourceUrl } from "./task-086-log-safety.mjs";

// Discovery only: this index never establishes identity, rights, freshness or admission.
export function findCachedSourceMetadata(cacheRoot, requestedUrl = null) {
  const skipped = new Set([
    "node_modules",
    ".git",
    "data",
    "tools",
    "tests",
    "mirror",
    "mirror-final",
    "migration-candidate",
    "registration-candidate",
  ]);
  const key = (url) => {
    const parsed = new URL(safeSourceUrl(url));
    parsed.searchParams.sort();
    return parsed.href;
  };
  const requested = requestedUrl ? key(requestedUrl) : null;
  const results = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!skipped.has(entry.name)) walk(filename);
        continue;
      }
      if (!entry.name.endsWith(".metadata.json")) continue;
      let metadata;
      try {
        metadata = JSON.parse(fs.readFileSync(filename, "utf8"));
      } catch {
        continue;
      }
      if (
        typeof metadata.url !== "string" ||
        !/^https?:\/\//.test(metadata.url)
      )
        continue;
      let url;
      try {
        url = key(metadata.url);
      } catch {
        continue;
      }
      if (requested && url !== requested) continue;
      results.push({
        url,
        metadataPath: path
          .relative(process.cwd(), filename)
          .split(path.sep)
          .join("/"),
        status: metadata.status ?? null,
        responseSha256: metadata.contentSha256 ?? metadata.sha256 ?? null,
        sanitizedCacheSha256: metadata.sanitizedCacheSha256 ?? null,
        observedAt: metadata.observedAt ?? null,
        reviewRequired: true,
      });
    }
  }
  if (fs.existsSync(cacheRoot)) walk(cacheRoot);
  return results.sort(
    (a, b) =>
      a.url.localeCompare(b.url, "en") ||
      a.metadataPath.localeCompare(b.metadataPath, "en"),
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const query = process.argv.slice(2);
  if (query.length > 1)
    throw new Error("Usage: task-086-source-cache.mjs [exact-source-url]");
  const matches = findCachedSourceMetadata(
    path.join(root, ".cache/task-086"),
    query[0],
  );
  console.log(
    JSON.stringify(
      {
        kind: "PRIVATE_METADATA_DISCOVERY_ONLY",
        limitations:
          "Indexes named metadata files, not all historical inline ledgers. Also check acquisition-index and the selected package ledger. A match needs evidence/hash/rights review; a miss is not evidence of source absence.",
        matches,
      },
      null,
      2,
    ),
  );
}
