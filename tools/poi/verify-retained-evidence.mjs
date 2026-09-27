import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const sha = (x) => createHash("sha256").update(x).digest("hex");
const check = (ok, message) => {
  if (!ok) throw Error(message);
};
export function verify(cachePath) {
  const index = JSON.parse(
    readFileSync(
      resolve(root, "data/poi/full/sources/retained-article-index.v1.json"),
    ),
  );
  const evidence = JSON.parse(
    readFileSync(
      resolve(
        root,
        "data/poi/full/sources/reviewed-enrichment-evidence.v1.json",
      ),
    ),
  );
  const bytes = readFileSync(cachePath);
  check(
    sha(bytes) === index.sourceFileSha256,
    "Retained cache file SHA-256 changed",
  );
  const raw = JSON.parse(bytes);
  const sources = new Map(raw.map((r) => [r.url, r]));
  let locators = 0;
  for (const a of index.entries) {
    const r = sources.get(a.url);
    check(
      r && sha(r.text) === a.contentSha256,
      `Content mismatch ${a.sourceRef}`,
    );
  }
  for (const e of evidence.entries) {
    const a = index.entries.find((a) => a.sourceRef === e.sourceRef);
    const r = sources.get(a.url);
    for (const item of [
      ...e.features,
      ...e.anchors,
      ...(e.visit ? [e.visit] : []),
    ]) {
      const l = item.locator;
      check(
        Number.isInteger(l.offset) &&
          l.offset >= 0 &&
          Number.isInteger(l.length) &&
          l.length > 0 &&
          l.offset + l.length <= a.targetContentEnd,
        `Locator outside target body ${e.sourceRef}`,
      );
      check(
        sha(r.text.slice(l.offset, l.offset + l.length)) === l.locatorSha256,
        `Locator mismatch ${e.sourceRef}`,
      );
      locators++;
    }
  }
  return {
    schemaVersion: "task068-retained-source-proof-v1",
    status: "PASS",
    sourceFile: index.sourceFile,
    sourceSha256: index.sourceFileSha256,
    indexedArticles: index.entries.length,
    reviewedArticles: evidence.reviewedArticleCount,
    reviewedUsableArticles: evidence.entries.length,
    checkedLocators: locators,
    mixedSourceTails: index.entries.filter((a) => a.mixedSourceTailDetected)
      .length,
    locatorsOutsideTarget: 0,
    fullArticlesCommitted: false,
    currentNetworkReverification: false,
    verificationMeaning:
      "Raw cache SHA and exact locator integrity; semantic review remains editorial, not independent Human Gold.",
  };
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    check(
      process.argv.length === 3,
      "Usage: node tools/poi/verify-retained-evidence.mjs <retained-cache-path>",
    );
    console.log(JSON.stringify(verify(process.argv[2]), null, 2));
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
