import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ExcelJS from "exceljs";

import { validateReviewerResponse } from "./poi-scoring-blind-review.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const SOURCE_DIR = path.join(ROOT, "docs/qa/TASK-039");
const OUTPUT_DIR = path.join(ROOT, "docs/qa/TASK-040");

export const WORKBOOK_SCHEMA_VERSION = "task-040-xlsx-v1";
export const REVIEW_HEADERS = [
  "Row",
  "Blind Item ID",
  "Scenario",
  "Traveler Intent",
  "POI A",
  "A Prefecture",
  "A Region",
  "A Category",
  "A Source 1",
  "A Source 2",
  "POI B",
  "B Prefecture",
  "B Region",
  "B Category",
  "B Source 1",
  "B Source 2",
  "Choice",
  "Confidence",
  "Note",
];
export const CHOICES = ["A", "B", "TIE", "INSUFFICIENT_INFO"];
export const CONFIDENCES = ["high", "medium", "low"];
const FORBIDDEN = [
  "candidate-0457",
  "gamma",
  "weights",
  "engine score",
  "rank",
  "score gap",
  "machine expected",
  "machine confidence",
  "poifeature numeric vector",
  "archetypetags",
  "calibration partition",
  "holdout partition",
  "internal review map",
  "machine reason code",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const stableJson = (value) => JSON.stringify(value);

const packName = (reviewerCode) =>
  `reviewer-pack-${reviewerCode.toLowerCase()}.json`;

const workbookName = (reviewerCode) =>
  `reviewer-${reviewerCode.toLowerCase()}-blind-review.xlsx`;

export async function loadPack(reviewerCode) {
  const sourcePath = path.join(SOURCE_DIR, packName(reviewerCode));
  const bytes = await readFile(sourcePath);
  return {
    sourcePath,
    sourceSha256: sha256(bytes),
    pack: JSON.parse(bytes.toString("utf8")),
  };
}

function protectedRow(item) {
  return [
    item.rowNumber,
    item.blindItemId,
    item.scenario.title,
    item.scenario.travelerIntent,
    item.poiA.name,
    item.poiA.prefecture,
    item.poiA.region,
    item.poiA.broadCategory,
    item.poiA.evidenceUrls[0],
    item.poiA.evidenceUrls[1],
    item.poiB.name,
    item.poiB.prefecture,
    item.poiB.region,
    item.poiB.broadCategory,
    item.poiB.evidenceUrls[0],
    item.poiB.evidenceUrls[1],
  ];
}

export function protectedContentDigest(pack) {
  return sha256(stableJson(pack.items.map(protectedRow)));
}

const instructions = [
  [
    "Purpose",
    "Judge which POI better fits the stated traveler scenario. Judge traveler fit, not your personal favorite.",
  ],
  ["Choice", "Choose exactly one: A, B, TIE, or INSUFFICIENT_INFO."],
  ["Confidence", "Choose high, medium, or low for every answered row."],
  [
    "Independence",
    "Work independently. Do not inspect TASK-038 files, restricted TASK-039 mapping files, scoring code, or another reviewer’s answers.",
  ],
  [
    "Evidence",
    "Source links are neutral identity references. Open them only when identity or broad type is unclear.",
  ],
  [
    "Out of scope",
    "Do not infer live opening hours, queues, weather, route feasibility, booking availability, or price inventory.",
  ],
  [
    "Insufficient information",
    "Use INSUFFICIENT_INFO when the available information cannot support a responsible judgment.",
  ],
  [
    "Protected cells",
    "Do not alter question, identity, or source cells. Only Choice, Confidence, and Note are intended for editing.",
  ],
  [
    "Privacy",
    "Do not enter your name, contact details, or other personal information in Note.",
  ],
];

function styleWorkbook(workbook, review, instructionsSheet, metadata) {
  workbook.creator = "TravelAssist QA";
  workbook.created = new Date("2026-09-11T00:00:00.000Z");
  workbook.modified = new Date("2026-09-11T00:00:00.000Z");
  workbook.calcProperties.fullCalcOnLoad = true;

  review.views = [{ state: "frozen", xSplit: 2, ySplit: 1 }];
  review.autoFilter = { from: "A1", to: "S145" };
  review.properties.defaultRowHeight = 36;
  review.getRow(1).height = 30;
  review.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  review.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF20354E" },
  };
  review.getRow(1).alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  const widths = [
    7, 20, 24, 48, 25, 14, 13, 23, 14, 14, 25, 14, 13, 23, 14, 14, 19, 14, 32,
  ];
  widths.forEach((width, index) => {
    review.getColumn(index + 1).width = width;
  });
  review.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.height = 45;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.border = { bottom: { style: "hair", color: { argb: "FFD9DEE5" } } };
      cell.protection = { locked: columnNumber <= 16 };
      if (columnNumber >= 17) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF4D8" },
        };
      } else if (rowNumber % 2 === 0) {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF5F7FA" },
        };
      }
    });
  });
  review.getColumn(1).alignment = { horizontal: "center", vertical: "middle" };
  review.getColumn(17).alignment = { horizontal: "center", vertical: "middle" };
  review.getColumn(18).alignment = { horizontal: "center", vertical: "middle" };

  instructionsSheet.views = [{ state: "frozen", ySplit: 1 }];
  instructionsSheet.columns = [{ width: 26 }, { width: 96 }];
  instructionsSheet.getRow(1).height = 34;
  instructionsSheet.getRow(1).font = {
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 12,
  };
  instructionsSheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF20354E" },
  };
  instructionsSheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.height = 45;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.protection = { locked: true };
      if (rowNumber > 1 && columnNumber === 1) {
        cell.font = { bold: true, color: { argb: "FF20354E" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFE9E4" },
        };
      }
    });
  });

  metadata.views = [{ state: "frozen", ySplit: 1 }];
  metadata.columns = [{ width: 34 }, { width: 76 }];
  metadata.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  metadata.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF20354E" },
  };
  metadata.eachRow((row, rowNumber) => {
    row.height = rowNumber === 1 ? 30 : 26;
    row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      cell.alignment = { vertical: "middle", wrapText: true };
      cell.protection = { locked: true };
      if (rowNumber > 1 && columnNumber === 1) cell.font = { bold: true };
    });
  });
}

export async function generateWorkbook(reviewerCode, outputPath) {
  const { pack, sourceSha256 } = await loadPack(reviewerCode);
  if (
    pack.reviewerCode !== reviewerCode ||
    pack.itemCount !== 144 ||
    pack.items.length !== 144
  ) {
    throw new Error(`Invalid frozen source pack for ${reviewerCode}`);
  }
  const workbook = new ExcelJS.Workbook();
  const review = workbook.addWorksheet("Review");
  const instructionsSheet = workbook.addWorksheet("Instructions");
  const metadata = workbook.addWorksheet("Metadata");

  review.addRow(REVIEW_HEADERS);
  for (const item of pack.items) {
    const row = review.addRow([...protectedRow(item), null, null, null]);
    for (const column of [9, 10, 15, 16]) {
      const url = protectedRow(item)[column - 1];
      row.getCell(column).value = {
        text: `Source ${column % 2 === 1 ? 1 : 2}`,
        hyperlink: url,
      };
      row.getCell(column).font = {
        color: { argb: "FF1565C0" },
        underline: true,
      };
    }
    row.getCell(17).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"A,B,TIE,INSUFFICIENT_INFO"'],
      showErrorMessage: true,
      errorTitle: "Invalid choice",
      error: "Choose A, B, TIE, or INSUFFICIENT_INFO.",
    };
    row.getCell(18).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"high,medium,low"'],
      showErrorMessage: true,
      errorTitle: "Invalid confidence",
      error: "Choose high, medium, or low.",
    };
  }

  instructionsSheet.addRow(["Reviewer Instructions", "Guidance"]);
  instructions.forEach((row) => instructionsSheet.addRow(row));
  metadata.addRows([
    ["Field", "Value"],
    ["reviewVersion", pack.reviewVersion],
    ["reviewerCode", reviewerCode],
    ["itemCount", pack.itemCount],
    ["sourcePackSha256", sourceSha256],
    ["workbookSchemaVersion", WORKBOOK_SCHEMA_VERSION],
    ["protectedContentDigestAlgorithm", "SHA-256"],
    ["protectedContentDigest", protectedContentDigest(pack)],
  ]);

  styleWorkbook(workbook, review, instructionsSheet, metadata);
  await review.protect(undefined, {
    selectLockedCells: false,
    selectUnlockedCells: true,
    autoFilter: true,
  });
  await instructionsSheet.protect();
  await metadata.protect();
  await mkdir(path.dirname(outputPath), { recursive: true });
  await workbook.xlsx.writeFile(outputPath);
  return {
    pack,
    sourceSha256,
    protectedContentDigest: protectedContentDigest(pack),
  };
}

function plainCellValue(cell) {
  const value = cell.value;
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    if ("error" in value)
      throw new Error(`Cell ${cell.address} contains an error`);
    if ("formula" in value || "sharedFormula" in value) {
      throw new Error(`Cell ${cell.address} contains a formula`);
    }
    if ("hyperlink" in value) return value.text ?? value.hyperlink;
    if (Array.isArray(value.richText))
      return value.richText.map((part) => part.text).join("");
  }
  return value;
}

function sourceUrl(cell) {
  const value = cell.value;
  if (value && typeof value === "object" && "hyperlink" in value)
    return value.hyperlink;
  throw new Error(`Source cell ${cell.address} is not a hyperlink`);
}

function metadataMap(sheet) {
  const result = new Map();
  for (let row = 2; row <= sheet.actualRowCount; row += 1) {
    const key = String(plainCellValue(sheet.getCell(row, 1))).trim();
    if (!key || result.has(key))
      throw new Error("Invalid or duplicate metadata field");
    result.set(key, plainCellValue(sheet.getCell(row, 2)));
  }
  return result;
}

const normalized = (value) => String(value ?? "").trim();

function assertEqual(actual, expected, label) {
  if (normalized(actual) !== normalized(expected)) {
    throw new Error(`Protected content mismatch: ${label}`);
  }
}

export async function validateWorkbook(workbookPath, { final = false } = {}) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath);
  const names = workbook.worksheets.map((sheet) => sheet.name);
  if (
    stableJson(names) !== stableJson(["Review", "Instructions", "Metadata"])
  ) {
    throw new Error(
      "Workbook must contain exactly Review, Instructions, Metadata sheets",
    );
  }
  if (workbook.worksheets.some((sheet) => sheet.state !== "visible")) {
    throw new Error("Hidden worksheets are not allowed");
  }
  const review = workbook.getWorksheet("Review");
  const metadata = workbook.getWorksheet("Metadata");
  if (
    review.columnCount > REVIEW_HEADERS.length ||
    review.actualRowCount !== 145
  ) {
    throw new Error(
      "Review sheet must contain exactly 144 reviewer rows and 19 columns",
    );
  }
  if (review.columns.some((column) => column.hidden))
    throw new Error("Hidden columns are not allowed");
  REVIEW_HEADERS.forEach((header, index) =>
    assertEqual(
      plainCellValue(review.getCell(1, index + 1)),
      header,
      `header ${index + 1}`,
    ),
  );

  const meta = metadataMap(metadata);
  const reviewerCode = normalized(meta.get("reviewerCode"));
  if (!["R1", "R2"].includes(reviewerCode))
    throw new Error("Invalid reviewer code");
  const { pack, sourceSha256 } = await loadPack(reviewerCode);
  assertEqual(meta.get("reviewVersion"), pack.reviewVersion, "reviewVersion");
  assertEqual(meta.get("itemCount"), 144, "itemCount");
  assertEqual(meta.get("sourcePackSha256"), sourceSha256, "sourcePackSha256");
  assertEqual(
    meta.get("workbookSchemaVersion"),
    WORKBOOK_SCHEMA_VERSION,
    "workbookSchemaVersion",
  );
  assertEqual(
    meta.get("protectedContentDigestAlgorithm"),
    "SHA-256",
    "digest algorithm",
  );
  assertEqual(
    meta.get("protectedContentDigest"),
    protectedContentDigest(pack),
    "protected content digest",
  );

  const seen = new Set();
  const responses = [];
  for (let index = 0; index < pack.items.length; index += 1) {
    const item = pack.items[index];
    const rowNumber = index + 2;
    const row = review.getRow(rowNumber);
    const expected = protectedRow(item);
    for (let column = 1; column <= 16; column += 1) {
      const actual = [9, 10, 15, 16].includes(column)
        ? sourceUrl(row.getCell(column))
        : plainCellValue(row.getCell(column));
      assertEqual(
        actual,
        expected[column - 1],
        `${item.blindItemId} column ${column}`,
      );
    }
    if (seen.has(item.blindItemId))
      throw new Error(`Duplicate blind ID: ${item.blindItemId}`);
    seen.add(item.blindItemId);

    const choice = normalized(plainCellValue(row.getCell(17)));
    const confidence = normalized(plainCellValue(row.getCell(18)));
    const noteValue = plainCellValue(row.getCell(19));
    const note = normalized(noteValue) === "" ? null : String(noteValue);
    if (choice && !CHOICES.includes(choice))
      throw new Error(`Invalid choice: ${item.blindItemId}`);
    if (confidence && !CONFIDENCES.includes(confidence))
      throw new Error(`Invalid confidence: ${item.blindItemId}`);
    if (Boolean(choice) !== Boolean(confidence))
      throw new Error(
        `Choice/confidence completeness mismatch: ${item.blindItemId}`,
      );
    if (final && (!choice || !confidence))
      throw new Error(`Incomplete final submission: ${item.blindItemId}`);
    responses.push({
      blindItemId: item.blindItemId,
      choice: choice || null,
      confidence: confidence || null,
      note,
    });
  }
  if (seen.size !== 144) throw new Error("Missing or duplicate blind IDs");

  return { workbook, pack, reviewerCode, sourceSha256, responses };
}

export async function importWorkbook(workbookPath, outputPath) {
  const validated = await validateWorkbook(workbookPath, { final: true });
  const submittedAt = (validated.workbook.modified ?? new Date()).toISOString();
  const response = {
    reviewVersion: validated.pack.reviewVersion,
    reviewerCode: validated.reviewerCode,
    submittedAt,
    sourcePackSha256: validated.sourceSha256,
    responses: validated.responses.map((row) => ({
      blindItemId: row.blindItemId,
      choice: row.choice,
      confidence: row.confidence,
      note: row.note,
    })),
  };
  const canonical = validateReviewerResponse(response, validated.pack);
  if (!canonical.ok)
    throw new Error(
      `TASK-039 response validation failed: ${canonical.issues.join(", ")}`,
    );
  await writeFile(outputPath, `${JSON.stringify(response, null, 2)}\n`, "utf8");
  return response;
}

function visibleWorkbookStrings(workbook) {
  const values = [];
  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: false }, (cell) => {
        const value = cell.value;
        if (value && typeof value === "object") {
          if ("hyperlink" in value)
            values.push(String(value.text ?? ""), String(value.hyperlink));
          else if ("formula" in value) values.push(String(value.formula));
          else values.push(JSON.stringify(value));
        } else values.push(String(value ?? ""));
      });
    });
  }
  return values;
}

export async function auditWorkbook(workbookPath) {
  const validated = await validateWorkbook(workbookPath);
  const haystack = visibleWorkbookStrings(validated.workbook)
    .join("\n")
    .toLowerCase();
  const findings = FORBIDDEN.filter((token) => haystack.includes(token));
  return {
    workbook: path.relative(ROOT, workbookPath).replaceAll("\\", "/"),
    reviewerCode: validated.reviewerCode,
    scannedVisibleStrings: visibleWorkbookStrings(validated.workbook).length,
    forbiddenConceptCount: findings.length,
    findings,
    passed: findings.length === 0,
  };
}

export async function writeManifestAndAudit() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const manifestRows = [];
  const auditRows = [];
  for (const reviewerCode of ["R1", "R2"]) {
    const workbookPath = path.join(OUTPUT_DIR, workbookName(reviewerCode));
    const validated = await validateWorkbook(workbookPath);
    const audit = await auditWorkbook(workbookPath);
    auditRows.push(audit);
    manifestRows.push({
      reviewerCode,
      workbookPath: path.relative(ROOT, workbookPath).replaceAll("\\", "/"),
      workbookSha256: sha256(await readFile(workbookPath)),
      sourcePackPath: `docs/qa/TASK-039/${packName(reviewerCode)}`,
      sourcePackSha256: validated.sourceSha256,
      itemCount: 144,
      blankAnswerRows: validated.responses.filter(
        (row) => !row.choice && !row.confidence && row.note === null,
      ).length,
      blankAnswerCells: validated.responses.reduce(
        (count, row) =>
          count +
          [row.choice, row.confidence, row.note].filter(
            (value) => value === null,
          ).length,
        0,
      ),
      sheetNames: validated.workbook.worksheets.map((sheet) => sheet.name),
      protectedContentDigest: protectedContentDigest(validated.pack),
      protectedContentCheck: "passed",
      leakageAuditStatus: audit.passed ? "passed" : "failed",
    });
  }
  const audit = {
    workbookSchemaVersion: WORKBOOK_SCHEMA_VERSION,
    forbiddenConcepts: FORBIDDEN,
    workbooks: auditRows,
    totalFindings: auditRows.reduce((sum, row) => sum + row.findings.length, 0),
    passed: auditRows.every((row) => row.passed),
  };
  const manifest = {
    workbookSchemaVersion: WORKBOOK_SCHEMA_VERSION,
    generatedFrom: "frozen TASK-039 reviewer packs",
    reviewerWorkbooks: manifestRows,
    humanJudgmentsPresent: false,
  };
  await writeFile(
    path.join(OUTPUT_DIR, "excel-leakage-audit.json"),
    `${JSON.stringify(audit, null, 2)}\n`,
  );
  await writeFile(
    path.join(OUTPUT_DIR, "workbook-manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  if (!audit.passed) throw new Error("Workbook leakage audit failed");
  return { manifest, audit };
}

export async function generateAll() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  for (const reviewerCode of ["R1", "R2"]) {
    await generateWorkbook(
      reviewerCode,
      path.join(OUTPUT_DIR, workbookName(reviewerCode)),
    );
  }
  return writeManifestAndAudit();
}

async function main() {
  const [command = "generate", input, output] = process.argv.slice(2);
  if (command === "generate") {
    const result = await generateAll();
    console.log(JSON.stringify(result.manifest, null, 2));
    return;
  }
  if (command === "import" && input && output) {
    const response = await importWorkbook(
      path.resolve(input),
      path.resolve(output),
    );
    console.log(
      JSON.stringify({
        reviewerCode: response.reviewerCode,
        responseCount: response.responses.length,
      }),
    );
    return;
  }
  throw new Error(
    "Usage: task040-blind-review-xlsx.mjs generate | import <workbook.xlsx> <response.json>",
  );
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await main();
}
