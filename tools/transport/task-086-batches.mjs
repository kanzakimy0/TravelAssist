import fs from "node:fs";
import path from "node:path";
import {
  canonical,
  hash,
  invariant,
  validateEdges,
} from "./task-086-model.mjs";
export const jsonBytes = (value) => canonical(value) + "\n";
export const jsonlBytes = (rows) => rows.map(jsonBytes).join("");
export function atomicWrite(file, body) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file + ".pending", body);
  fs.renameSync(file + ".pending", file);
}
export function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, ""));
}
export function readRows(file) {
  return fs
    .readFileSync(file, "utf8")
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map(JSON.parse);
}
export function executeBatches(
  output,
  groups,
  {
    chunkSize = 200,
    validationContext,
    rerunBatch = null,
    repair = false,
    crashAfter = Infinity,
    allowMissingRerun = false,
  } = {},
) {
  invariant(
    Number.isInteger(chunkSize) && chunkSize > 0 && chunkSize <= 200,
    "BATCH_HARD_CAP",
  );
  invariant(
    validationContext?.sources instanceof Map &&
      validationContext?.evidence instanceof Map &&
      validationContext?.patternById instanceof Map,
    "BATCH_VALIDATION_CONTEXT_REQUIRED",
  );
  const hasFixedFlightContract = [
    ...validationContext.patternById.values(),
  ].some((p) => p.accessContract?.schemaVersion === 3);
  const hasOnboardContract = [...validationContext.patternById.values()].some(
    (p) =>
      ["PUBLIC_BUS_ONBOARD_REQUEST", "AIR_PASSENGER_PUBLIC_SHUTTLE"].includes(
        p.accessContract?.kind,
      ),
  );
  const validationContextSha256 = hash({
    sources: [...validationContext.sources].sort(),
    evidence: [...validationContext.evidence].sort(),
    patterns: [...validationContext.patternById].sort(),
    ...(validationContext.dynamicODById?.size ||
    hasFixedFlightContract ||
    hasOnboardContract
      ? {
          dynamicOD: [...(validationContext.dynamicODById ?? [])].sort(),
          nativeFacilities: [
            ...validationContext.nativeFacilityByAnchor,
          ].sort(),
          nodes: [...validationContext.nodes].sort(),
        }
      : {}),
  });
  // Validate the complete independent registry before partitioning the edge set.
  if (
    validationContext.dynamicODById?.size ||
    hasFixedFlightContract ||
    hasOnboardContract
  ) {
    invariant(
      validationContext.dynamicODValidationScope === undefined,
      "BATCH_COMPLETE_OD_CONTEXT_REQUIRED",
    );
    validateEdges(
      groups.flatMap((group) => group.edges),
      validationContext,
    );
    for (const group of groups)
      for (const edge of group.edges)
        if (edge.edgeKind === "dynamic_od_ride")
          invariant(
            group.dynamicOD?.odId === edge.dynamicODRef &&
              canonical(group.dynamicOD) ===
                canonical(
                  validationContext.dynamicODById.get(edge.dynamicODRef),
                ),
            "BATCH_OD_INPUT_REGISTRY_MISMATCH",
          );
  }
  const results = [],
    receipts = [];
  for (const group of groups)
    for (let start = 0; start < group.edges.length; start += chunkSize) {
      const batchId = `batch-${hash(group.groupId).slice(0, 20)}-${String(start / chunkSize).padStart(4, "0")}`;
      const edges = group.edges.slice(start, start + chunkSize);
      const input = {
        groupId: group.groupId,
        sourceManifest: group.sources,
        inputNodeManifest: group.nodes,
        servicePatternInput: group.pattern,
        ...(group.dynamicOD ? { dynamicODInput: group.dynamicOD } : {}),
        start,
        chunkSize,
        generatorSha256: group.generatorSha256,
        validationContextSha256,
        deficitStateSha256: hash(group.nextActionDeficitSummary ?? {}),
      };
      const fingerprint = hash(input);
      const batch = {
        batchId,
        input,
        nodeJoinDecisions: group.nodes.map((n) => ({
          nodeId: n.nodeId,
          decision: n.decision,
          identitySignature: n.identitySignature,
        })),
        edges,
        unresolvedLedger: edges.flatMap((e) =>
          Object.entries(e.metrics)
            .filter(([, m]) => m.status === "unresolved")
            .map(([field, m]) => ({
              edgeId: e.edgeId,
              field,
              reason: m.reason,
            })),
        ),
        nextActionDeficitSummary: group.nextActionDeficitSummary,
      };
      validateEdges(edges, {
        ...validationContext,
        dynamicODValidationScope: "PARTIAL_BATCH",
      });
      const body = jsonBytes(batch),
        outputSha256 = hash(body);
      const receipt = {
        batchId,
        fingerprint,
        outputSha256,
        edgeCount: edges.length,
        qa: "PASS",
      };
      const sealed = { ...receipt, receiptSha256: hash(receipt) };
      const receiptFile = path.join(
          output,
          "batch-receipts",
          batchId + ".json",
        ),
        batchFile = path.join(output, "batches", batchId + ".json");
      let disposition = "CREATED";
      if (fs.existsSync(receiptFile)) {
        let existing;
        try {
          existing = readJson(receiptFile);
          const { receiptSha256, ...unsigned } = existing;
          invariant(
            hash(unsigned) === receiptSha256 &&
              existing.batchId === batchId &&
              existing.qa === "PASS" &&
              fs.existsSync(batchFile) &&
              hash(fs.readFileSync(batchFile)) === existing.outputSha256,
            "CORRUPTED_RECEIPT_OR_BATCH",
          );
        } catch (error) {
          if (!repair || rerunBatch !== batchId)
            throw new Error(`CORRUPTED_RECEIPT_OR_BATCH:${batchId}`, {
              cause: error,
            });
          disposition = "REPAIRED_EXPLICIT_BATCH";
        }
        if (existing && disposition !== "REPAIRED_EXPLICIT_BATCH") {
          if (existing.fingerprint !== fingerprint)
            disposition = "SOURCE_OR_GENERATOR_INVALIDATED";
          else {
            invariant(
              existing.outputSha256 === outputSha256,
              "NONDETERMINISTIC_BATCH",
            );
            disposition =
              rerunBatch === batchId ? "EXPLICIT_RERUN" : "CHECKSUM_SKIP";
          }
        }
      } else if (fs.existsSync(batchFile))
        disposition = "RESUME_UNCOMMITTED_BATCH";
      if (disposition !== "CHECKSUM_SKIP") {
        atomicWrite(batchFile, body);
        atomicWrite(receiptFile, jsonBytes(sealed));
      }
      receipts.push(sealed);
      results.push({ batchId, disposition, edgeCount: edges.length });
      atomicWrite(
        path.join(output, "checkpoint.json"),
        jsonBytes({ lastPassedBatchId: batchId, receipts, complete: false }),
      );
      if (results.length >= crashAfter)
        throw new Error("SIMULATED_CRASH_AFTER_QA");
    }
  invariant(
    allowMissingRerun ||
      !rerunBatch ||
      results.some((r) => r.batchId === rerunBatch),
    "BATCH_NOT_FOUND",
  );
  atomicWrite(
    path.join(output, "checkpoint.json"),
    jsonBytes({
      lastPassedBatchId: receipts.at(-1)?.batchId ?? null,
      receipts,
      complete: true,
    }),
  );
  return { results, receipts };
}
