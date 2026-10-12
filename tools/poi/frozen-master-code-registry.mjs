import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  parseMasterCodeRegistryV1,
  validateMasterCodeRegistryTransitionV1,
} from "../../src/shared/master-code/index.ts";

export const FROZEN_REGISTRY_PATH =
  "data/poi/full/sources/master-code-registry.task-043.v1.json";
export const LIVE_REGISTRY_PATH =
  "src/shared/data/master-code-registry.v1.json";
export const FROZEN_REGISTRY_SHA256 =
  "9efcc0b6172dacdabe846789430d1ed54de98f12827097e96a7651131bf044b2";
export const FROZEN_ENRICH_PATH =
  "data/poi/full/sources/enrich-candidates.task-068.mjs";
export const FROZEN_REVIEW_PATH =
  "data/poi/full/sources/review-p0.task-070.mjs";
const FROZEN_TOOL_SOURCES = {
  "tools/poi/enrich-candidates.mjs": [
    FROZEN_ENRICH_PATH,
    "9a48bb492e46d86cda1a45da4e303cc489a0047e6c2e155b640e4dd6e3a3dd76",
  ],
  "tools/poi/review-p0.mjs": [
    FROZEN_REVIEW_PATH,
    "a1ea312b9665127f7d2b1dc7e82230d41d7e476692aa08cc5a3bc813b7b5659d",
  ],
};

/** Replays the historical candidate lock while requiring the live registry to remain append-only. */
export function readFrozenMasterCodeRegistry(root) {
  const frozen = readFileSync(resolve(root, FROZEN_REGISTRY_PATH));
  const live = readFileSync(resolve(root, LIVE_REGISTRY_PATH));
  const digest = createHash("sha256").update(frozen).digest("hex");
  assert.equal(
    digest,
    FROZEN_REGISTRY_SHA256,
    "Frozen TASK-043 registry changed",
  );
  const previous = JSON.parse(frozen.toString("utf8"));
  const current = JSON.parse(live.toString("utf8"));
  assert.equal(parseMasterCodeRegistryV1(previous).ok, true);
  assert.equal(parseMasterCodeRegistryV1(current).ok, true);
  assert.equal(
    validateMasterCodeRegistryTransitionV1(previous, current).ok,
    true,
    "Live registry is not an append-only transition from the candidate lock",
  );
  return frozen;
}

export function readFrozenCandidateInput(root, path) {
  if (path === LIVE_REGISTRY_PATH) return readFrozenMasterCodeRegistry(root);
  const frozenTool = FROZEN_TOOL_SOURCES[path];
  if (frozenTool) {
    const bytes = readFileSync(resolve(root, frozenTool[0]));
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      frozenTool[1],
      `Frozen candidate tool changed: ${path}`,
    );
    return bytes;
  }
  return readFileSync(resolve(root, path));
}
