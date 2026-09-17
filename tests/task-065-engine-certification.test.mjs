import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { validate, preview } from "../src/server/engine/index.ts";
import { digest, canonicalJson } from "../src/server/engine/json.ts";
import { parseChangeSet } from "../src/server/engine/input.ts";
import { parseTripPlanSnapshot } from "../src/shared/contracts/trips/index.ts";
import {
  SEED,
  PER_FAMILY,
  FAMILIES,
  seededCase,
  reverseKeys,
} from "./task-065-seeded.mjs";
test("TASK-065 fixed-seed deterministic certification: 5120 addressed cases", async (t) => {
  const evidence = {
    generatorVersion: 1,
    seed: SEED,
    seedHex: "0x065b2026",
    perFamily: PER_FAMILY,
    cases: 0,
    distribution: {},
    outcomes: {},
    issueCodes: {},
    failures: [],
  };
  const hash = createHash("sha256"),
    inputs = new Set();
  const selected =
    process.env.TASK065_CASE === undefined
      ? null
      : Number(process.env.TASK065_CASE);
  assert.ok(
    selected === null ||
      (Number.isInteger(selected) &&
        selected >= 0 &&
        selected < FAMILIES.length * PER_FAMILY),
  );
  for (const [familyIndex, family] of FAMILIES.entries()) {
    if (selected !== null && Math.floor(selected / PER_FAMILY) !== familyIndex)
      continue;
    await t.test(family, () => {
      for (let offset = 0; offset < PER_FAMILY; offset++) {
        const index = familyIndex * PER_FAMILY + offset;
        if (selected !== null && selected !== index) continue;
        const c = seededCase(index),
          before = canonicalJson(c),
          label = "seed=" + SEED + " case=" + index + " family=" + family;
        try {
          const a = validate(c.snapshot, c.change, c.context),
            b = preview(c.snapshot, c.change, c.context);
          assert.equal(
            a.outcome,
            c.expected,
            label + " " + JSON.stringify(a.issues),
          );
          assert.equal(b.outcome, c.expected, label);
          if (c.code)
            assert.ok(
              a.issues.some((i) => i.code === c.code),
              label + " expected " + c.code,
            );
          assert.deepEqual(
            a,
            validate(c.snapshot, c.change, c.context),
            label + " validate replay",
          );
          assert.deepEqual(
            b,
            preview(c.snapshot, c.change, c.context),
            label + " preview replay",
          );
          const reordered = JSON.parse(JSON.stringify(reverseKeys(c), null, 2));
          assert.deepEqual(
            a,
            validate(reordered.snapshot, reordered.change, reordered.context),
            label + " key/whitespace",
          );
          assert.equal(digest(c.change), digest(reordered.change));
          const orderOp = c.change.operations.find(
            (x) => x.op === "REORDER_ITEMS" && x.orderedItemIds?.length > 1,
          );
          if (orderOp && new Set(orderOp.orderedItemIds).size > 1)
            assert.notEqual(
              digest(orderOp.orderedItemIds),
              digest([...orderOp.orderedItemIds].reverse()),
            );
          if (parseChangeSet(c.change).ok)
            assert.notEqual(
              digest(c.change),
              digest({ ...c.change, reason: c.change.reason + " changed" }),
            );
          assert.equal(
            canonicalJson(c),
            before,
            label + " inputs remain immutable",
          );
          assert.equal(b.transaction.status, "not_started");
          assert.equal(b.resultingVersion, null);
          assert.equal(b.replay.duplicate, false);
          if (b.preview?.after)
            assert.equal(parseTripPlanSnapshot(b.preview.after).ok, true);
          if (a.assessment) {
            const ids = new Set(
              a.assessment.assessments.map((x) => x.assessmentId),
            );
            assert.equal(ids.size, a.assessment.assessments.length);
            for (const x of a.assessment.assessments) {
              for (const i of x.issueIndexes)
                assert.ok(i >= 0 && i < a.issues.length);
              for (const id of x.relatedAssessmentIds) assert.ok(ids.has(id));
            }
            for (const x of a.assessment.coverage)
              for (const id of x.assessmentIds) assert.ok(ids.has(id));
          }
          evidence.cases++;
          evidence.distribution[family] =
            (evidence.distribution[family] ?? 0) + 1;
          evidence.outcomes[a.outcome] =
            (evidence.outcomes[a.outcome] ?? 0) + 1;
          for (const i of a.issues)
            evidence.issueCodes[i.code] =
              (evidence.issueCodes[i.code] ?? 0) + 1;
          inputs.add(
            digest({
              snapshot: c.snapshot,
              change: c.change,
              context: c.context,
            }),
          );
          hash.update(canonicalJson({ index, validate: a, preview: b }));
        } catch (e) {
          evidence.failures.push({
            index,
            family,
            seed: SEED,
            reproduce:
              "TASK065_CASE=" +
              index +
              " node --import ./tests/register-route-ts.mjs --test tests/task-065-engine-certification.test.mjs",
          });
          throw e;
        }
      }
    });
  }
  evidence.transcriptSha256 = hash.digest("hex");
  evidence.uniqueInputs = inputs.size;
  evidence.status = evidence.failures.length ? "FAIL" : "PASS";
  mkdirSync(".artifacts/task065", { recursive: true });
  writeFileSync(
    ".artifacts/task065/seeded-evidence.json",
    JSON.stringify(evidence, null, 2) + "\n",
  );
  if (selected === null) assert.equal(evidence.cases, 5120);
  assert.equal(evidence.uniqueInputs, evidence.cases);
});
