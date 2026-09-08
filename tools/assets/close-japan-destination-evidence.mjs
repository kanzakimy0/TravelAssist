import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { format } from "prettier";
import {
  ROOT,
  CATALOG,
  read,
  json,
  parseCsv,
  sha256,
  files,
  write,
  isMain,
} from "./asset-utils.mjs";
import {
  MANIFEST,
  EVIDENCE,
  CONTRACT,
  SNAPSHOT,
  auditOverlaps,
} from "./japan-destination-resolution.mjs";

export const BASE = "3ad62711be8ab54a0c4fa039f9bd426e30128946";
export const TARGETS = CATALOG + "japan-destination-closure-targets.v1.json";
export const RESEARCH = CATALOG + "japan-destination-closure-research.v1.json";
const GEN = "docs/assets/generated/";
const unique = (items) => [...new Set(items)];
const cell = (value) =>
  String(value ?? "")
    .replaceAll("|", "/")
    .replaceAll("\n", " ");
const table = (headers, rows) =>
  "| " +
  headers.join(" | ") +
  " |\n| " +
  headers.map(() => "---").join(" | ") +
  " |\n" +
  rows.map((r) => "| " + r.map(cell).join(" | ") + " |").join("\n") +
  "\n";

export function pinnedEvidence(e, snapshot) {
  if (
    !/^Q\d+$/.test(e.entity_id ?? "") ||
    !Number.isSafeInteger(e.entity_revision) ||
    e.entity_revision <= 0
  )
    return false;
  if (snapshot.entities[e.entity_id]?.revision !== e.entity_revision)
    return false;
  try {
    const u = new URL(e.source_url);
    return (
      u.protocol === "https:" &&
      u.hostname === "www.wikidata.org" &&
      u.pathname === "/w/index.php" &&
      u.searchParams.get("title") === e.entity_id &&
      u.searchParams.get("oldid") === String(e.entity_revision)
    );
  } catch {
    return false;
  }
}

export function assertNoCycles(rows) {
  const ids = new Map(rows.map((r) => [r.destination_id, r]));
  for (const row of rows) {
    const seen = new Set([row.destination_id]);
    let id = row.parent_destination_id;
    while (id) {
      assert(ids.has(id), "Unknown parent " + id);
      assert(!seen.has(id), "Parent/alias hierarchy cycle at " + id);
      seen.add(id);
      id = ids.get(id).parent_destination_id;
    }
  }
}

export function scopeAccepted(scope, primary) {
  const source = primary.find(
    (r) =>
      r.url === scope.boundary_source &&
      r.accepted_gates?.includes("coverage_scope_verified"),
  );
  return (
    !!source &&
    !!scope.scope_type &&
    Array.isArray(scope.parent_entity_ids) &&
    Array.isArray(scope.prefecture_ids) &&
    scope.prefecture_ids.length > 0 &&
    !!scope.coverage_note &&
    !!scope.center_rule &&
    !!scope.poi_inclusion_rule &&
    !!scope.poi_exclusion_rule &&
    (scope.prefecture_ids.length < 2 || scope.cross_prefecture === true)
  );
}

export function protectedSnapshot() {
  const paths = [
    CATALOG + "core-attraction-generation-manifest.v1.csv",
    CATALOG + "core-source-jobs.v1.jsonl",
    CATALOG + "core-variant-output-matrix.v1.csv",
    CATALOG + "core-destination-generation-batches.v1.csv",
    ...files(GEN + "core-batches"),
  ];
  assert.equal(paths.length, 44, "Exact frozen downstream file inventory");
  return paths.map((path) => {
    const current = readFileSync(resolve(ROOT, path));
    const base = execFileSync("git", ["show", BASE + ":" + path], {
      cwd: ROOT,
      maxBuffer: 64 * 1024 * 1024,
    });
    assert(current.equals(base), "Downstream bytes changed: " + path);
    return {
      path,
      bytes: current.length,
      sha256: sha256(current),
      unchanged: true,
    };
  });
}

export function closureInput() {
  return {
    rows: parseCsv(read(MANIFEST)),
    evidence: read(EVIDENCE).trim().split("\n").map(JSON.parse),
    contract: json(CONTRACT).destinations,
    snapshot: json(SNAPSHOT),
    research: json(RESEARCH),
  };
}

export function buildClosure(data = closureInput()) {
  assert.equal(data.rows.length, 300);
  assert.equal(new Set(data.rows.map((r) => r.destination_id)).size, 300);
  assertNoCycles(data.rows);
  const overlaps = auditOverlaps(data.rows);
  const audit = data.rows.map((row) => {
    assert(row.country_code === "JP" && /^jp-/.test(row.destination_id));
    const e = data.evidence.find(
      (e) => e.destination_id === row.destination_id,
    );
    const scope = data.contract.find(
      (c) => c.destination_id === row.destination_id,
    );
    assert(e && scope, "Missing parent evidence/contract");
    const pinned = pinnedEvidence(e, data.snapshot);
    const identity = e.identity_verified === true && pinned && !e.manual_hold;
    const primary = data.research.records.filter(
      (r) =>
        r.destination_id === row.destination_id &&
        r.access_status === "read" &&
        [
          "municipal_government",
          "prefectural_government",
          "national_government",
          "JNTO",
          "official_DMO",
        ].includes(r.source_kind) &&
        /^https:\/\//.test(r.url),
    );
    // A discovery page or directory match is not proof of every final field.
    // The closure deliberately never upgrades a parent row merely from a URL.
    const scopeFields = {
      scope_type: row.entity_type,
      parent_entity_ids: row.parent_destination_id
        ? [row.parent_destination_id]
        : [],
      prefecture_ids: unique(
        [e.primary_prefecture, ...e.secondary_prefectures].filter(Boolean),
      ),
      coverage_note: scope.coverage_scope,
      boundary_source: scope.boundary_source ?? null,
      center_rule: e.coordinate?.interpretation ?? null,
      poi_inclusion_rule: scope.allowed_poi_boundary_policy,
      poi_exclusion_rule:
        "Exclude unproven containment; no center-radius boundary inference; reuse child-owned POI IDs.",
    };
    const gates = {
      identity_verified: identity,
      prefecture_verified: identity && !!e.primary_prefecture,
      trilingual_verified:
        identity &&
        /[\u3040-\u30ff\u3400-\u9fff]/.test(row.name_ja) &&
        /[\u3400-\u9fff]/.test(row.name_zh) &&
        !!row.name_en,
      center_coordinate_verified:
        identity &&
        !!e.coordinate &&
        !!scope.center &&
        !e.unresolved_reasons.some((x) => /coordinate/.test(x)),
      coverage_scope_verified: identity && scopeAccepted(scope, primary),
      evidence_verified:
        pinned &&
        primary.some(
          (r) =>
            r.accepted_gates?.includes("evidence_verified") &&
            r.facts.length > 0,
        ),
      duplicate_overlap_clear: !overlaps.some(
        (p) =>
          (p.a === row.destination_id || p.b === row.destination_id) &&
          p.status !== "reviewed_distinct_or_nested",
      ),
    };
    // TASK-013.3.1 requires a reviewed official boundary source and explicit
    // inclusion/exclusion rules, not the parent's generated generic prose.
    // Keep missing final evidence explicit instead of grandfathering 254 rows.
    const missing = Object.entries(gates)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);
    return {
      destination_id: row.destination_id,
      current_candidate: {
        entity_id: e.entity_id,
        ja: row.name_ja,
        zh_cn: row.name_zh,
        en: row.name_en,
      },
      entity_type: row.entity_type,
      parent_status: row.entity_status,
      fully_passed: missing.length === 0,
      gates,
      missing_gates: missing,
      parent_reasons: e.unresolved_reasons,
      current_source_evidence: {
        pinned,
        source_url: e.source_url,
        revision: e.entity_revision,
        official_directory_matches: e.official_directory_matches,
      },
      current_coordinate_evidence: {
        selected: e.coordinate,
        candidates: e.coordinate_candidates,
      },
      current_prefecture_evidence: {
        primary: e.primary_prefecture,
        secondary: e.secondary_prefectures,
        paths: e.prefecture_paths,
      },
      current_language_evidence: e.names,
      current_scope_evidence: scopeFields,
      alias_overlap_flags: {
        aliases: row.aliases,
        hold: e.manual_hold,
        pairs: overlaps.filter(
          (p) => p.a === row.destination_id || p.b === row.destination_id,
        ),
      },
      supplemental_official_sources: primary,
      recommended_evidence_sources: [
        "Current municipal/prefectural government or official DMO geographic scope",
        "GSI/e-Stat source-backed representative center",
        "Official ja/en/zh names or reviewed project_standardized Chinese",
        "Reviewed cross-prefecture boundary and POI ownership rules",
      ],
    };
  });
  const targets = audit.filter((r) => !r.fully_passed);
  const summary = {
    status: targets.length ? "Partial" : "Completed",
    destination_total: audit.length,
    parent_fully_passed: data.rows.filter((r) => r.entity_status === "verified")
      .length,
    fully_passed: audit.length - targets.length,
    unresolved: targets.length,
    ...Object.fromEntries(
      Object.keys(audit[0].gates).map((gate) => [
        gate,
        audit.filter((r) => r.gates[gate]).length,
      ]),
    ),
    valid_pinned_evidence: audit.filter((r) => r.current_source_evidence.pinned)
      .length,
    official_research_records: data.research.records.filter(
      (r) => r.access_status === "read",
    ).length,
    duplicate_blockers: overlaps.filter(
      (p) => p.status !== "reviewed_distinct_or_nested",
    ).length,
    task_013_4_allowed: false,
  };
  return { schemaVersion: 1, base_commit: BASE, summary, targets, audit };
}

export async function closureArtifacts(data = closureInput()) {
  const result = buildClosure(data);
  const downstream = protectedSnapshot();
  const output = new Map();
  const counts = table(
    ["Gate", "Actual"],
    Object.entries(result.summary).map(([k, v]) => [k, v]),
  );
  output.set(
    TARGETS,
    JSON.stringify(
      {
        schemaVersion: result.schemaVersion,
        base_commit: result.base_commit,
        summary: result.summary,
        targets: result.targets,
      },
      null,
      2,
    ) + "\n",
  );
  output.set(
    GEN + "japan-destination-closure-targets.md",
    "# Japan destination closure targets\n\nDynamic list; no hard-coded target count. Parent claims and current strict final gates are reported separately. Invalid version links and absent official boundary evidence cannot pass.\n\n" +
      counts +
      "\n" +
      table(
        ["ID", "Name", "Missing gates", "Parent reasons"],
        result.targets.map((r) => [
          r.destination_id,
          r.current_candidate.en,
          r.missing_gates.join(", "),
          r.parent_reasons.join(", "),
        ]),
      ),
  );
  output.set(
    GEN + "japan-destination-closure-evidence-report.md",
    "# Closure evidence research\n\nOfficial discovery supports only the explicitly recorded facts. No automatic identity/coordinate/scope acceptance and no image rights are inferred. The parent snapshot originally omitted props=info: 297 oldid=undefined links were not pinned evidence.\n\n" +
      table(
        [
          "Destination",
          "Institution",
          "Source",
          "Access",
          "Supported facts",
          "Still missing",
        ],
        data.research.records.map((r) => [
          r.destination_id,
          r.institution,
          r.url,
          r.access_status,
          r.facts.join("; "),
          r.remaining.join("; "),
        ]),
      ),
  );
  output.set(
    GEN + "japan-destination-final-acceptance.md",
    "# Japan destination final acceptance\n\n" +
      counts +
      "\nTASK-013.4 allowed: No. Final official boundary/evidence review is incomplete; passing structural tests does not change this gate. Original 254 parent passes remain historical; new final acceptance must verify all 300 under TASK-013.3.1.\n\n## Downstream byte protection\n\n" +
      table(
        ["File", "Bytes", "SHA256", "Unchanged"],
        downstream.map((r) => [r.path, r.bytes, r.sha256, r.unchanged]),
      ),
  );
  for (const [path, text] of output)
    output.set(path, await format(text, { filepath: path }));
  return { output, result, downstream };
}

export async function publishClosure({ check = false } = {}) {
  const bundle = await closureArtifacts();
  let changed = 0;
  for (const [path, text] of bundle.output) {
    let old;
    try {
      old = read(path);
    } catch {
      old = null;
    }
    if (check)
      assert.equal(old, text, "Non-canonical closure artifact " + path);
    else {
      if (old !== text) changed++;
      write(path, text);
    }
  }
  console.log(JSON.stringify({ changed, ...bundle.result.summary }));
  return bundle;
}
if (isMain(import.meta.url))
  await publishClosure({ check: process.argv.includes("--check") });
