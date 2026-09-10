import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import ExcelJS from "exceljs";

import {
  CHOICES,
  CONFIDENCES,
  REVIEW_HEADERS,
  auditWorkbook,
  importWorkbook,
  loadPack,
  protectedContentDigest,
  validateWorkbook,
} from "../tools/qa/task040-blind-review-xlsx.mjs";
import { validateReviewerResponse } from "../tools/qa/poi-scoring-blind-review.mjs";

const TASK040 = path.resolve("docs/qa/TASK-040");
const workbookPath = (code) =>
  path.join(TASK040, `reviewer-${code.toLowerCase()}-blind-review.xlsx`);

async function mutateWorkbook(code, mutate) {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "travelassist-task040-"),
  );
  const target = path.join(directory, `reviewer-${code.toLowerCase()}.xlsx`);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath(code));
  await mutate(workbook);
  await workbook.xlsx.writeFile(target);
  return target;
}

test("both committed reviewer workbooks preserve the frozen 144-row question surface", async () => {
  for (const code of ["R1", "R2"]) {
    const validated = await validateWorkbook(workbookPath(code));
    const { pack, sourceSha256 } = await loadPack(code);
    assert.deepEqual(
      validated.workbook.worksheets.map((sheet) => sheet.name),
      ["Review", "Instructions", "Metadata"],
    );
    assert.equal(validated.responses.length, 144);
    assert.deepEqual(
      validated.responses.map((row) => row.blindItemId),
      pack.items.map((item) => item.blindItemId),
    );
    assert.ok(
      pack.items.every((item) => item.blindItemId.startsWith(`${code}-`)),
    );
    assert.ok(
      validated.responses.every(
        (row) =>
          row.choice === null && row.confidence === null && row.note === null,
      ),
    );
    const metadata = validated.workbook.getWorksheet("Metadata");
    assert.equal(metadata.getCell("B5").value, sourceSha256);
    assert.equal(metadata.getCell("B8").value, protectedContentDigest(pack));
  }
});

test("workbook edit surface has filters, frozen panes, protection, hyperlinks, and dropdowns", async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath("R1"));
  const review = workbook.getWorksheet("Review");
  assert.deepEqual(review.getRow(1).values.slice(1), REVIEW_HEADERS);
  assert.equal(review.views[0].state, "frozen");
  assert.equal(review.views[0].ySplit, 1);
  assert.equal(review.views[0].xSplit, 2);
  assert.ok(review.autoFilter);
  assert.equal(review.sheetProtection.sheet, true);
  assert.equal(review.getCell("A2").protection?.locked ?? true, true);
  assert.equal(review.getCell("Q2").protection.locked, false);
  assert.match(review.getCell("I2").value.hyperlink, /^https:\/\//);
  assert.equal(review.getCell("Q2").dataValidation.type, "list");
  assert.match(
    review.getCell("Q2").dataValidation.formulae[0],
    /INSUFFICIENT_INFO/,
  );
  assert.equal(review.getCell("R2").dataValidation.type, "list");
  assert.match(
    review.getCell("R2").dataValidation.formulae[0],
    /high,medium,low/,
  );
});

test("reviewer-visible workbook content has zero forbidden leakage findings", async () => {
  for (const code of ["R1", "R2"]) {
    assert.deepEqual((await auditWorkbook(workbookPath(code))).findings, []);
  }
  const audit = JSON.parse(
    await readFile(path.join(TASK040, "excel-leakage-audit.json"), "utf8"),
  );
  assert.equal(audit.passed, true);
  assert.equal(audit.totalFindings, 0);
});

test("all allowed choices round-trip through a synthetic QA-only workbook", async () => {
  const synthetic = await mutateWorkbook("R1", (workbook) => {
    const review = workbook.getWorksheet("Review");
    for (let row = 2; row <= 145; row += 1) {
      review.getCell(row, 17).value = CHOICES[(row - 2) % CHOICES.length];
      review.getCell(row, 18).value =
        CONFIDENCES[(row - 2) % CONFIDENCES.length];
      review.getCell(row, 19).value =
        row % 2 === 0 ? "QA-only synthetic note" : null;
    }
    workbook.modified = new Date("2026-09-11T03:00:00.000Z");
  });
  const output = path.join(path.dirname(synthetic), "synthetic-response.json");
  const response = await importWorkbook(synthetic, output);
  const { pack } = await loadPack("R1");
  assert.equal(response.responses.length, 144);
  assert.equal(validateReviewerResponse(response, pack).ok, true);
  assert.deepEqual(
    new Set(response.responses.map((row) => row.choice)),
    new Set(CHOICES),
  );
  assert.deepEqual(
    new Set(response.responses.map((row) => row.confidence)),
    new Set(CONFIDENCES),
  );
});

test("importer fails closed on invalid answers and incomplete final submissions", async () => {
  const invalidChoice = await mutateWorkbook("R1", (workbook) => {
    workbook.getWorksheet("Review").getCell("Q2").value = "MAYBE";
  });
  await assert.rejects(
    importWorkbook(invalidChoice, `${invalidChoice}.json`),
    /Invalid choice/,
  );

  const formula = await mutateWorkbook("R1", (workbook) => {
    workbook.getWorksheet("Review").getCell("Q2").value = {
      formula: '"A"',
      result: "A",
    };
  });
  await assert.rejects(importWorkbook(formula, `${formula}.json`), /formula/);

  const error = await mutateWorkbook("R1", (workbook) => {
    workbook.getWorksheet("Review").getCell("R2").value = { error: "#VALUE!" };
  });
  await assert.rejects(importWorkbook(error, `${error}.json`), /error/);

  const halfAnswered = await mutateWorkbook("R1", (workbook) => {
    workbook.getWorksheet("Review").getCell("Q2").value = "A";
  });
  await assert.rejects(
    importWorkbook(halfAnswered, `${halfAnswered}.json`),
    /completeness mismatch/,
  );

  await assert.rejects(
    importWorkbook(
      workbookPath("R1"),
      path.join(TASK040, "never-created.json"),
    ),
    /Incomplete final submission/,
  );
});

test("importer rejects missing, duplicate, unknown, reordered, extra, or hidden IDs", async () => {
  const scenarios = [
    ["missing", (sheet) => sheet.spliceRows(145, 1), /exactly 144/],
    [
      "duplicate",
      (sheet) => {
        sheet.getCell("B3").value = sheet.getCell("B2").value;
      },
      /Protected content mismatch/,
    ],
    [
      "unknown",
      (sheet) => {
        sheet.getCell("B2").value = "R1-UNKNOWN";
      },
      /Protected content mismatch/,
    ],
    [
      "reordered",
      (sheet) => {
        const a = sheet.getCell("B2").value;
        sheet.getCell("B2").value = sheet.getCell("B3").value;
        sheet.getCell("B3").value = a;
      },
      /Protected content mismatch/,
    ],
    ["extra", (sheet) => sheet.addRow([146, "R1-EXTRA"]), /exactly 144/],
    [
      "hidden",
      (sheet) => {
        sheet.getColumn(5).hidden = true;
      },
      /Hidden columns/,
    ],
  ];
  for (const [name, mutate, expected] of scenarios) {
    const file = await mutateWorkbook("R1", (workbook) =>
      mutate(workbook.getWorksheet("Review")),
    );
    await assert.rejects(validateWorkbook(file), expected, name);
  }
});

test("importer rejects protected identity, source, reviewer, version, and pack SHA changes", async () => {
  const cases = [
    [
      "question",
      (workbook) => {
        workbook.getWorksheet("Review").getCell("D2").value = "Altered intent";
      },
      /Protected content mismatch/,
    ],
    [
      "poi",
      (workbook) => {
        workbook.getWorksheet("Review").getCell("E2").value = "Different POI";
      },
      /Protected content mismatch/,
    ],
    [
      "source",
      (workbook) => {
        workbook.getWorksheet("Review").getCell("I2").value = {
          text: "Source 1",
          hyperlink: "https://example.invalid",
        };
      },
      /Protected content mismatch/,
    ],
    [
      "reviewer",
      (workbook) => {
        workbook.getWorksheet("Metadata").getCell("B3").value = "RX";
      },
      /Invalid reviewer code/,
    ],
    [
      "version",
      (workbook) => {
        workbook.getWorksheet("Metadata").getCell("B2").value = "wrong";
      },
      /reviewVersion/,
    ],
    [
      "sha",
      (workbook) => {
        workbook.getWorksheet("Metadata").getCell("B5").value = "0".repeat(64);
      },
      /sourcePackSha256/,
    ],
  ];
  for (const [name, mutate, expected] of cases) {
    const file = await mutateWorkbook("R1", mutate);
    await assert.rejects(validateWorkbook(file), expected, name);
  }
});
