import assert from "node:assert/strict";
import { createHash } from "node:crypto";

/** Hash committed UTF-8/LF bytes; refuse CRLF rather than silently reauthorize it. */
export function supportingManifestSha256(bytes) {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  assert.ok(
    !text.includes("\r") && text.endsWith("\n"),
    "SUPPORTING_MANIFEST_REQUIRES_UTF8_LF",
  );
  JSON.parse(text);
  return createHash("sha256").update(bytes).digest("hex");
}
