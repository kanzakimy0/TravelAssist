import { createHash } from "node:crypto";
import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, resolve, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
export const BASE = "edd91cfdaea209c629d0fe6bd01a45788f5df803";
export const CATALOG = "docs/assets/catalog/";
export const IMAGE_EXT = new Set([
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".gif",
  ".avif",
]);
export const PROTECTED = [
  "public/media/home/",
  "public/media/start/",
  "public/media/personal-center/",
  "assets/design/personal-center/",
];
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export const read = (path) => readFileSync(resolve(ROOT, path), "utf8");
export const json = (path) => JSON.parse(read(path));
export function write(path, content) {
  const target = resolve(ROOT, path);
  if (!target.startsWith(ROOT + "/") && !target.startsWith(ROOT + "\\"))
    throw Error("Outside repository");
  mkdirSync(dirname(target), { recursive: true });
  if (!existsSync(target) || readFileSync(target, "utf8") !== content)
    writeFileSync(target, content);
}
export const writeJson = (path, data) =>
  write(path, JSON.stringify(data, null, 2) + "\n");
export function files(dir) {
  const abs = resolve(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .flatMap((entry) => {
      const path = relative(ROOT, resolve(abs, entry.name)).replaceAll(
        "\\",
        "/",
      );
      return entry.isDirectory() ? files(path) : entry.isFile() ? [path] : [];
    })
    .sort();
}
export function dimensions(bytes, extension) {
  try {
    if (extension === ".svg") {
      const v = bytes
        .toString()
        .match(
          /viewBox\s*=\s*["']\s*([-\d.e+]+)[ ,]+([-\d.e+]+)[ ,]+([\d.e+]+)[ ,]+([\d.e+]+)\s*["']/i,
        );
      if (v) return { width: Number(v[3]), height: Number(v[4]) };
      const w = bytes.toString().match(/\bwidth=["']([\d.]+)(?:px)?["']/);
      const h = bytes.toString().match(/\bheight=["']([\d.]+)(?:px)?["']/);
      if (w && h) return { width: +w[1], height: +h[1] };
    }
    if (extension === ".png" && bytes.subarray(1, 4).toString() === "PNG")
      return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
    if (extension === ".gif" && bytes.subarray(0, 3).toString() === "GIF")
      return { width: bytes.readUInt16LE(6), height: bytes.readUInt16LE(8) };
    if (
      [".jpg", ".jpeg"].includes(extension) &&
      bytes.readUInt16BE(0) === 0xffd8
    ) {
      let i = 2;
      while (i < bytes.length - 9) {
        if (bytes[i++] !== 255) continue;
        while (bytes[i] === 255) i++;
        const marker = bytes[i++];
        if (
          [0xd8, 0xd9, 0x01].includes(marker) ||
          (marker >= 0xd0 && marker <= 0xd7)
        )
          continue;
        if (marker === 0xda) break;
        const length = bytes.readUInt16BE(i);
        if (
          [
            0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd,
            0xce, 0xcf,
          ].includes(marker)
        )
          return {
            width: bytes.readUInt16BE(i + 5),
            height: bytes.readUInt16BE(i + 3),
          };
        if (length < 2) break;
        i += length;
      }
    }
    if (extension === ".webp" && bytes.subarray(8, 12).toString() === "WEBP") {
      const kind = bytes.subarray(12, 16).toString();
      if (kind === "VP8X")
        return {
          width: 1 + bytes.readUIntLE(24, 3),
          height: 1 + bytes.readUIntLE(27, 3),
        };
      if (kind === "VP8 ")
        return {
          width: bytes.readUInt16LE(26) & 0x3fff,
          height: bytes.readUInt16LE(28) & 0x3fff,
        };
      if (kind === "VP8L") {
        const n = bytes.readUInt32LE(21);
        return { width: 1 + (n & 0x3fff), height: 1 + ((n >>> 14) & 0x3fff) };
      }
    }
    // AVIF spatial extent property; no decoder or downloaded dependency is used.
    if (extension === ".avif") {
      const i = bytes.indexOf(Buffer.from("ispe"));
      if (i >= 4 && bytes.readUInt32BE(i - 4) >= 20)
        return {
          width: bytes.readUInt32BE(i + 8),
          height: bytes.readUInt32BE(i + 12),
        };
    }
  } catch {
    /* Malformed / unsupported headers are recorded, never guessed. */
  }
  return { width: null, height: null };
}
export function measure(path) {
  const bytes = readFileSync(resolve(ROOT, path));
  return {
    bytes: bytes.length,
    sha256: sha256(bytes),
    ...dimensions(bytes, extname(path).toLowerCase()),
  };
}
export function duplicateGroups(entries) {
  const groups = new Map();
  for (const item of entries) {
    if (!item.sha256) continue;
    const paths = groups.get(item.sha256) ?? [];
    paths.push(item.path);
    groups.set(item.sha256, paths);
  }
  return [...groups]
    .filter(([, paths]) => paths.length > 1)
    .map(([sha256, paths]) => ({ sha256, paths: paths.sort() }))
    .sort((a, b) => a.sha256.localeCompare(b.sha256));
}
export function csv(rows, columns) {
  return (
    [columns, ...rows.map((row) => columns.map((key) => row[key] ?? ""))]
      .map((row) =>
        row
          .map((value) => '"' + String(value).replaceAll('"', '""') + '"')
          .join(","),
      )
      .join("\n") + "\n"
  );
}
export function parseCsv(text) {
  const rows = [];
  let row = [],
    field = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && (c === "," || c === "\n")) {
      row.push(field.replace(/\r$/, ""));
      field = "";
      if (c === "\n") {
        rows.push(row);
        row = [];
      }
    } else field += c;
  }
  if (quoted) throw Error("Unterminated CSV quote");
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  const columns = rows.shift() ?? [];
  if (new Set(columns).size !== columns.length)
    throw Error("Duplicate CSV column");
  return rows
    .filter((r) => r.length > 1)
    .map((r) => {
      if (r.length !== columns.length) throw Error("CSV column mismatch");
      return Object.fromEntries(columns.map((c, i) => [c, r[i]]));
    });
}
export const isMain = (url) =>
  Boolean(process.argv[1] && resolve(process.argv[1]) === fileURLToPath(url));
