// Read-only review harness: generated protected outputs must match existing bytes
// (apart from checkout CRLF). Do not change A inputs to make a gate pass.
import assert from "node:assert/strict";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

if (process.env.TASK057_PROTECTED_LIST) {
  const files = JSON.parse(
    fs
      .readFileSync(process.env.TASK057_PROTECTED_LIST, "utf8")
      .replace(/^\uFEFF/, ""),
  );
  const root = resolve(process.env.TASK057_REVIEW_ROOT);
  const protectedPaths = new Set(
    files.map((file) => resolve(root, file).toLowerCase()),
  );
  const normalize = (value) => value.toString("utf8").replaceAll("\r\n", "\n");
  function preserve(path, data, options) {
    if (typeof path !== "string" && !(path instanceof URL)) return false;
    const absolute = resolve(path instanceof URL ? fileURLToPath(path) : path);
    if (!protectedPaths.has(absolute.toLowerCase())) return false;
    const bytes =
      typeof data === "string"
        ? Buffer.from(
            data,
            typeof options === "string"
              ? options
              : (options?.encoding ?? "utf8"),
          )
        : Buffer.from(data);
    const same = normalize(fs.readFileSync(absolute)) === normalize(bytes);
    if (process.env.TASK057_GUARD_LOG)
      fs.appendFileSync(
        process.env.TASK057_GUARD_LOG,
        JSON.stringify({
          file: relative(root, absolute).replaceAll("\\", "/"),
          sameGeneratedContent: same,
          actualWrite: false,
        }) + "\n",
      );
    assert.ok(
      same,
      "TASK-057 protected output drift: " + relative(root, absolute),
    );
    return true;
  }
  const syncWrite = fs.writeFileSync;
  const asyncWrite = fs.promises.writeFile;
  fs.writeFileSync = function (path, data, options) {
    if (!preserve(path, data, options))
      return syncWrite.call(this, path, data, options);
  };
  fs.promises.writeFile = async function (path, data, options) {
    if (!preserve(path, data, options))
      return asyncWrite.call(this, path, data, options);
  };
  syncBuiltinESMExports();
}
