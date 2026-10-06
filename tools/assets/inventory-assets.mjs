import { extname, basename } from "node:path";
import {
  BASE,
  CATALOG,
  IMAGE_EXT,
  PROTECTED,
  files,
  read,
  json,
  measure,
  duplicateGroups,
  writeJson,
  isMain,
} from "./asset-utils.mjs";
export function inventory() {
  const manifestPaths = new Set(
    json(CATALOG + "asset-manifest.v1.json")
      .assets.filter((asset) => asset.runtime.kind === "local")
      .map((asset) => "public" + asset.runtime.path),
  );
  const aiEvidence = new Map();
  const generatedManifest =
    "docs/assets/personal-center-generated-images-20260905.manifest.json";
  for (const asset of json(generatedManifest).assets) {
    if (asset.provenance?.startsWith("AI-generated"))
      for (const path of [asset.source_path, asset.runtime_path])
        aiEvidence.set(path, generatedManifest);
  }
  const photoEvidence =
    "docs/project/WBS-5.1-VISUAL-ASSET-MANIFEST-PHOTOREAL-V3.md";
  const photoManifest =
    "assets/design/personal-center/photoreal-v3/asset-manifest.json";
  for (const asset of json(photoManifest).entries)
    aiEvidence.set(asset.path, photoEvidence);
  for (const source of [
    "neutral-paper-centre-source.png",
    "sidebar-torii-photo-master.png",
    "torii-sakura-lake-ai-source.png",
  ])
    aiEvidence.set(
      "assets/design/personal-center/photoreal-v3/sources/" + source,
      photoEvidence,
    );
  const candidates = [
    ...files("public/media"),
    ...files("assets/design"),
  ].filter(
    (p) =>
      IMAGE_EXT.has(extname(p).toLowerCase()) &&
      !manifestPaths.has(p) &&
      !p.startsWith("public/media/shared/") &&
      !p.startsWith("public/media/destinations/") &&
      !p.startsWith("public/media/generated/") &&
      !p.startsWith("assets/design/asset-library/"),
  );
  const texts = [
    ...files("src"),
    ...files("assets/design"),
    ...files("docs"),
    ...files("public/media"),
  ]
    .filter(
      (p) =>
        /\.(?:ts|tsx|css|md|html|json|txt)$/i.test(p) &&
        !p.startsWith("docs/assets/catalog/") &&
        !p.startsWith("docs/assets/generated/") &&
        !p.startsWith("assets/design/asset-library/"),
    )
    .map((p) => [p, read(p)]);
  const entries = candidates.map((path) => {
    const url = path.startsWith("public/") ? path.slice(6) : path;
    const matching = texts.filter(
      ([, content]) => content.includes(url) || content.includes(path),
    );
    const metadata = texts.filter(
      ([p, content]) =>
        /manifest|SHA256SUMS|README|preview/i.test(p) &&
        (content.includes(path) || content.includes(basename(path))),
    );
    const referencedBy = matching
      .filter(([p]) => p.startsWith("src/"))
      .map(([p]) => p);
    return {
      path,
      extension: extname(path).toLowerCase(),
      ...measure(path),
      scope: path.split("/").slice(0, 3).join("/"),
      referencedBy,
      sourceMetadataFound: metadata.length > 0,
      sourceMetadataPaths: metadata.map(([p]) => p),
      protected: PROTECTED.some((prefix) => path.startsWith(prefix)),
      status: "legacy_review_required",
      authenticity: aiEvidence.has(path) ? "illustrative" : "unreviewed",
      authenticityEvidence: aiEvidence.get(path) ?? null,
      notes: [
        "Metadata discovery is not license approval. Existing authenticity/rights require human review; originals and page references are unchanged.",
        "References are literal /media/ and repository-path matches (including CSS/Next Image); computed paths may not be attributable.",
        ...(referencedBy.length
          ? []
          : ["No literal src reference found; not proof of being unused."]),
      ],
    };
  });
  const references = texts
    .filter(
      ([p, content]) => p.startsWith("src/") && /\/media\/|url\(/.test(content),
    )
    .map(([path, content]) => ({
      path,
      references: [
        ...new Set(content.match(/\/media\/[^\s"'`)<>;,]+/g) ?? []),
      ].sort(),
      hasComputedReference: /\/media\/[^\s"'`]*\$\{/.test(content),
    }));
  const groups = duplicateGroups(entries);
  writeJson(CATALOG + "legacy-inventory.v1.json", {
    schemaVersion: 1,
    baselineCommit: BASE,
    policy: "Read-only audit, no legacy asset approved by this inventory",
    entries,
    references,
  });
  writeJson(CATALOG + "asset-aliases.v1.json", {
    schemaVersion: 1,
    aliases: groups.flatMap(({ sha256, paths }) =>
      paths.slice(1).map((path) => ({
        path,
        canonicalPath: paths[0],
        sha256,
        operation: "report_only_keep_both",
      })),
    ),
    duplicateGroups: groups,
  });
  return {
    files: entries.length,
    bytes: entries.reduce((n, e) => n + e.bytes, 0),
    protected: entries.filter((e) => e.protected).length,
    referenced: entries.filter((e) => e.referencedBy.length).length,
    missingMetadata: entries.filter((e) => !e.sourceMetadataFound).length,
    duplicateGroups: groups.length,
  };
}
if (isMain(import.meta.url)) console.log(inventory());
