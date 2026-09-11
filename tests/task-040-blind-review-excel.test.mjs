import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import ExcelJS from "exceljs";

import {
  CHOICES,
  CONFIDENCES,
  DISPLAY_CHOICES,
  DISPLAY_CONFIDENCES,
  REVIEW_HEADERS,
  SHEET_NAMES,
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
      SHEET_NAMES,
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
    const metadata = validated.workbook.getWorksheet("元数据");
    assert.equal(metadata.getCell("B5").value, sourceSha256);
    assert.equal(metadata.getCell("B8").value, protectedContentDigest(pack));
  }
});

test("workbook edit surface has filters, frozen panes, protection, hyperlinks, and dropdowns", async () => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(workbookPath("R1"));
  const review = workbook.getWorksheet("评审");
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
  assert.match(review.getCell("Q2").dataValidation.formulae[0], /信息不足/);
  assert.equal(review.getCell("R2").dataValidation.type, "list");
  assert.match(review.getCell("R2").dataValidation.formulae[0], /高,中,低/);
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
    const review = workbook.getWorksheet("评审");
    for (let row = 2; row <= 145; row += 1) {
      review.getCell(row, 17).value =
        DISPLAY_CHOICES[(row - 2) % DISPLAY_CHOICES.length];
      review.getCell(row, 18).value =
        DISPLAY_CONFIDENCES[(row - 2) % DISPLAY_CONFIDENCES.length];
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
    workbook.getWorksheet("评审").getCell("Q2").value = "不确定";
  });
  await assert.rejects(
    importWorkbook(invalidChoice, `${invalidChoice}.json`),
    /Invalid choice/,
  );

  const formula = await mutateWorkbook("R1", (workbook) => {
    workbook.getWorksheet("评审").getCell("Q2").value = {
      formula: '"A"',
      result: "A",
    };
  });
  await assert.rejects(importWorkbook(formula, `${formula}.json`), /formula/);

  const error = await mutateWorkbook("R1", (workbook) => {
    workbook.getWorksheet("评审").getCell("R2").value = { error: "#VALUE!" };
  });
  await assert.rejects(importWorkbook(error, `${error}.json`), /error/);

  const halfAnswered = await mutateWorkbook("R1", (workbook) => {
    workbook.getWorksheet("评审").getCell("Q2").value = "A";
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
      mutate(workbook.getWorksheet("评审")),
    );
    await assert.rejects(validateWorkbook(file), expected, name);
  }
});

test("importer rejects protected identity, source, reviewer, version, and pack SHA changes", async () => {
  const cases = [
    [
      "question",
      (workbook) => {
        workbook.getWorksheet("评审").getCell("D2").value = "已修改需求";
      },
      /Protected content mismatch/,
    ],
    [
      "poi",
      (workbook) => {
        workbook.getWorksheet("评审").getCell("E2").value = "其他景点";
      },
      /Protected content mismatch/,
    ],
    [
      "source",
      (workbook) => {
        workbook.getWorksheet("评审").getCell("I2").value = {
          text: "来源 1",
          hyperlink: "https://example.invalid",
        };
      },
      /Protected content mismatch/,
    ],
    [
      "reviewer",
      (workbook) => {
        workbook.getWorksheet("元数据").getCell("B3").value = "RX";
      },
      /Invalid reviewer code/,
    ],
    [
      "version",
      (workbook) => {
        workbook.getWorksheet("元数据").getCell("B2").value = "wrong";
      },
      /reviewVersion/,
    ],
    [
      "sha",
      (workbook) => {
        workbook.getWorksheet("元数据").getCell("B5").value = "0".repeat(64);
      },
      /sourcePackSha256/,
    ],
  ];
  for (const [name, mutate, expected] of cases) {
    const file = await mutateWorkbook("R1", mutate);
    await assert.rejects(validateWorkbook(file), expected, name);
  }
});
