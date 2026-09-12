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

const LOCALIZATION_PATH = path.join(OUTPUT_DIR, "localization-zh-CN.json");
const LOCALIZATION_BYTES = await readFile(LOCALIZATION_PATH);
const LOCALIZATION = JSON.parse(LOCALIZATION_BYTES.toString("utf8"));
const LOCALIZATION_SHA256 = createHash("sha256")
  .update(LOCALIZATION_BYTES)
  .digest("hex");

export const WORKBOOK_SCHEMA_VERSION = "task-040-xlsx-v3-zh-CN";
export const SHEET_NAMES = ["评审", "说明", "元数据"];
export const REVIEW_HEADERS = [
  "序号",
  "盲审题目 ID",
  "旅行场景",
  "旅客需求",
  "景点 A",
  "A 所在都道府县",
  "A 所在地区",
  "A 类型",
  "A 来源 1",
  "A 来源 2",
  "景点 B",
  "B 所在都道府县",
  "B 所在地区",
  "B 类型",
  "B 来源 1",
  "B 来源 2",
  "选择",
  "置信度",
  "备注",
];
export const CHOICES = [
  "A",
  "B",
  "TIE",
  "NEITHER_SUITABLE",
  "INSUFFICIENT_INFO",
];
export const CONFIDENCES = ["high", "medium", "low"];
export const DISPLAY_CHOICES = ["A", "B", "平局", "两者都不适合", "信息不足"];
export const DISPLAY_CONFIDENCES = ["高", "中", "低"];
const CHOICE_TO_CANONICAL = new Map([
  ["A", "A"],
  ["B", "B"],
  ["平局", "TIE"],
  ["两者都不适合", "NEITHER_SUITABLE"],
  ["信息不足", "INSUFFICIENT_INFO"],
]);
const CONFIDENCE_TO_CANONICAL = new Map([
  ["高", "high"],
  ["中", "medium"],
  ["低", "low"],
]);
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
  `reviewer-${reviewerCode.toLowerCase()}-blind-review-v2.xlsx`;

export async function loadPack(reviewerCode) {
  const sourcePath = path.join(SOURCE_DIR, packName(reviewerCode));
  const bytes = await readFile(sourcePath);
  return {
    sourcePath,
    sourceSha256: sha256(bytes),
    pack: JSON.parse(bytes.toString("utf8")),
  };
}

const SCENARIOS_ZH = {
  "Shopping and city traveler": [
    "购物与都市体验",
    "喜欢购物、热闹街区与现代都市体验。",
  ],
  "Hidden and local explorer": [
    "在地小众探索",
    "曾多次访问日本，希望探索具有地方特色、避开热门地标的地点。",
  ],
  "Food-focused traveler": [
    "美食主题",
    "希望以饮食文化和当地美食体验为行程核心。",
  ],
  "Relaxed and rest-oriented traveler": [
    "轻松疗愈",
    "希望以舒缓节奏度过平静、放松的一天。",
  ],
  "Low crowd and queue tolerance": [
    "避开拥挤",
    "对拥挤人群和长时间排队的承受能力较低。",
  ],
  "First-time iconic traveler": [
    "初次访日经典体验",
    "首次前往日本，希望获得难忘且具有代表性的日本旅行体验。",
  ],
  "Art and educational traveler": [
    "艺术与文化学习",
    "重视艺术、博物馆与具有学习价值的文化体验。",
  ],
  "Low walking and physical tolerance": [
    "少步行需求",
    "对长时间步行或体力消耗的承受能力较低。",
  ],
  "Photography and scenery": ["摄影与风景", "重视摄影机会和优美景观。"],
  "Nature traveler": ["自然旅行", "希望探索自然、山水、公园或户外景观。"],
  "History and architecture": [
    "历史与建筑",
    "对历史、文化遗产与建筑尤其感兴趣。",
  ],
  "Family and interactive soft fit": [
    "亲子互动",
    "家庭同行，希望选择互动性强、适合不同年龄段的地点。",
  ],
};
const REGIONS_ZH = {
  Chubu: "中部",
  Chugoku: "中国地区",
  Hokkaido: "北海道",
  Kansai: "关西",
  Kanto: "关东",
  Kyushu: "九州",
  Okinawa: "冲绳",
  Shikoku: "四国",
  Tohoku: "东北",
};
const PREFECTURES_ZH = {
  Aichi: "爱知县",
  Aomori: "青森县",
  Chiba: "千叶县",
  Ehime: "爱媛县",
  Fukuoka: "福冈县",
  Gifu: "岐阜县",
  Gunma: "群马县",
  Hiroshima: "广岛县",
  Hokkaido: "北海道",
  Hyogo: "兵库县",
  Ishikawa: "石川县",
  Iwate: "岩手县",
  Kagawa: "香川县",
  Kagoshima: "鹿儿岛县",
  Kanagawa: "神奈川县",
  Kochi: "高知县",
  Kumamoto: "熊本县",
  Kyoto: "京都府",
  Mie: "三重县",
  Miyagi: "宫城县",
  Miyazaki: "宫崎县",
  Nagano: "长野县",
  Nagasaki: "长崎县",
  Nara: "奈良县",
  Okayama: "冈山县",
  Okinawa: "冲绳县",
  Oita: "大分县",
  Osaka: "大阪府",
  Shimane: "岛根县",
  Shizuoka: "静冈县",
  Tochigi: "栃木县",
  Tokushima: "德岛县",
  Tokyo: "东京都",
  Tottori: "鸟取县",
  Yamagata: "山形县",
  Yamaguchi: "山口县",
  Yamanashi: "山梨县",
};
const CATEGORIES_ZH = {
  Aquarium: "水族馆",
  "Art island or cultural destination": "艺术岛或文化目的地",
  "Bridge or engineering landmark": "桥梁或工程地标",
  Castle: "城堡",
  "Historic or cultural district": "历史或文化街区",
  "Food and entertainment district": "美食与娱乐街区",
  Garden: "庭园",
  "Historic site": "历史遗址或史迹",
  "Historic village": "历史村落",
  "Lake or waterside landscape": "湖泊或水边景观",
  Market: "市场",
  "Memorial site": "纪念地",
  "Mountain or volcano": "山岳或火山",
  "Museum or educational venue": "博物馆或教育场馆",
  "National park or protected natural area": "国立公园或自然保护区",
  "Natural landscape": "自然景观",
  "Observation landmark": "观景地标",
  "Hot-spring destination": "温泉目的地",
  Park: "公园",
  "Scenic district": "风景区",
  Shrine: "神社",
  Temple: "寺院",
  "Theme park or interactive attraction": "主题乐园或互动景点",
  "Urban landmark or district": "城市地标或街区",
  "Wildlife park": "野生动物公园",
  Zoo: "动物园",
};

function translated(map, value, label) {
  const result = map[value];
  if (!result)
    throw new Error(`Missing zh-CN translation for ${label}: ${value}`);
  return result;
}

function poiNameZh(name) {
  const result = LOCALIZATION.poiNames[name]?.zhCN;
  if (!result) throw new Error(`Missing zh-CN POI name: ${name}`);
  return result;
}

function protectedRow(item) {
  const scenario = translated(SCENARIOS_ZH, item.scenario.title, "scenario");
  return [
    item.rowNumber,
    item.blindItemId,
    scenario[0],
    scenario[1],
    poiNameZh(item.poiA.name),
    translated(PREFECTURES_ZH, item.poiA.prefecture, "prefecture"),
    translated(REGIONS_ZH, item.poiA.region, "region"),
    translated(CATEGORIES_ZH, item.poiA.broadCategory, "category"),
    item.poiA.evidenceUrls[0],
    item.poiA.evidenceUrls[1],
    poiNameZh(item.poiB.name),
    translated(PREFECTURES_ZH, item.poiB.prefecture, "prefecture"),
    translated(REGIONS_ZH, item.poiB.region, "region"),
    translated(CATEGORIES_ZH, item.poiB.broadCategory, "category"),
    item.poiB.evidenceUrls[0],
    item.poiB.evidenceUrls[1],
  ];
}

export function protectedContentDigest(pack) {
  return sha256(stableJson(pack.items.map(protectedRow)));
}

const instructions = [
  [
    "评审目标",
    "判断哪个景点更符合给出的旅行场景。请判断旅客适配度，而不是选择您个人更喜欢的景点。",
  ],
  ["选择", "每题只能选择一项：A、B、平局、两者都不适合或信息不足。"],
  ["置信度", "每道已作答题目都必须选择高、中或低。"],
  [
    "独立性",
    "请独立完成评审。不要查看 TASK-038 文件、受限的 TASK-039 映射文件、评分代码或其他评审员的答案。",
  ],
  [
    "来源",
    "来源链接仅用于中立地确认景点身份。只有当景点身份或大类不明确时才需要打开。",
  ],
  [
    "评审范围外",
    "不要推测实时营业时间、排队情况、天气、路线可行性、预约可用性或价格库存。",
  ],
  ["信息不足", "当现有信息不足以支持可靠判断时，请选择“信息不足”。"],
  [
    "两者都不适合",
    "当现有信息已足以说明两个景点都不符合旅客需求时，请选择“两者都不适合”。",
  ],
  [
    "受保护单元格",
    "请勿修改题目、景点身份或来源单元格。只有“选择”“置信度”和“备注”允许填写。",
  ],
  ["隐私", "请勿在备注中填写姓名、联系方式或其他个人信息。"],
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
  const review = workbook.addWorksheet(SHEET_NAMES[0]);
  const instructionsSheet = workbook.addWorksheet(SHEET_NAMES[1]);
  const metadata = workbook.addWorksheet(SHEET_NAMES[2]);

  review.addRow(REVIEW_HEADERS);
  for (const item of pack.items) {
    const row = review.addRow([...protectedRow(item), null, null, null]);
    for (const column of [9, 10, 15, 16]) {
      const url = protectedRow(item)[column - 1];
      row.getCell(column).value = {
        text: `来源 ${column % 2 === 1 ? 1 : 2}`,
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
      formulae: ['"A,B,平局,两者都不适合,信息不足"'],
      showErrorMessage: true,
      errorTitle: "选择无效",
      error: "请选择 A、B、平局、两者都不适合或信息不足。",
    };
    row.getCell(18).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"高,中,低"'],
      showErrorMessage: true,
      errorTitle: "置信度无效",
      error: "请选择高、中或低。",
    };
  }

  instructionsSheet.addRow(["评审说明", "操作指引"]);
  instructions.forEach((row) => instructionsSheet.addRow(row));
  metadata.addRows([
    ["字段", "值"],
    ["评审版本", pack.reviewVersion],
    ["评审员代码", reviewerCode],
    ["题目数量", pack.itemCount],
    ["源题包 SHA-256", sourceSha256],
    ["工作簿结构版本", WORKBOOK_SCHEMA_VERSION],
    ["受保护内容摘要算法", "SHA-256"],
    ["受保护内容摘要", protectedContentDigest(pack)],
    ["中文本地化目录 SHA-256", LOCALIZATION_SHA256],
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
  if (stableJson(names) !== stableJson(SHEET_NAMES)) {
    throw new Error("工作簿必须只包含评审、说明、元数据三个工作表");
  }
  if (workbook.worksheets.some((sheet) => sheet.state !== "visible")) {
    throw new Error("Hidden worksheets are not allowed");
  }
  const review = workbook.getWorksheet(SHEET_NAMES[0]);
  const metadata = workbook.getWorksheet(SHEET_NAMES[2]);
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
  const reviewerCode = normalized(meta.get("评审员代码"));
  if (!["R1", "R2"].includes(reviewerCode))
    throw new Error("Invalid reviewer code");
  const { pack, sourceSha256 } = await loadPack(reviewerCode);
  assertEqual(meta.get("评审版本"), pack.reviewVersion, "reviewVersion");
  assertEqual(meta.get("题目数量"), 144, "itemCount");
  assertEqual(meta.get("源题包 SHA-256"), sourceSha256, "sourcePackSha256");
  assertEqual(
    meta.get("工作簿结构版本"),
    WORKBOOK_SCHEMA_VERSION,
    "workbookSchemaVersion",
  );
  assertEqual(meta.get("受保护内容摘要算法"), "SHA-256", "digest algorithm");
  assertEqual(
    meta.get("受保护内容摘要"),
    protectedContentDigest(pack),
    "protected content digest",
  );
  assertEqual(
    meta.get("中文本地化目录 SHA-256"),
    LOCALIZATION_SHA256,
    "localization catalog SHA-256",
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

    const displayChoice = normalized(plainCellValue(row.getCell(17)));
    const displayConfidence = normalized(plainCellValue(row.getCell(18)));
    const choice = displayChoice ? CHOICE_TO_CANONICAL.get(displayChoice) : "";
    const confidence = displayConfidence
      ? CONFIDENCE_TO_CANONICAL.get(displayConfidence)
      : "";
    const noteValue = plainCellValue(row.getCell(19));
    const note = normalized(noteValue) === "" ? null : String(noteValue);
    if (displayChoice && !choice)
      throw new Error(`Invalid choice: ${item.blindItemId}`);
    if (displayConfidence && !confidence)
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
      locale: "zh-CN",
      localizationCatalogPath: "docs/qa/TASK-040/localization-zh-CN.json",
      localizationCatalogSha256: LOCALIZATION_SHA256,
      protectedContentDigest: protectedContentDigest(validated.pack),
      protectedContentCheck: "passed",
      leakageAuditStatus: audit.passed ? "passed" : "failed",
    });
  }
  const audit = {
    workbookSchemaVersion: WORKBOOK_SCHEMA_VERSION,
    locale: "zh-CN",
    forbiddenConcepts: FORBIDDEN,
    workbooks: auditRows,
    totalFindings: auditRows.reduce((sum, row) => sum + row.findings.length, 0),
    passed: auditRows.every((row) => row.passed),
  };
  const manifest = {
    workbookSchemaVersion: WORKBOOK_SCHEMA_VERSION,
    locale: "zh-CN",
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
