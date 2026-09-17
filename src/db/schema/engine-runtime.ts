import "server-only";
import {
  bigint,
  boolean,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import {
  engineApplyAudits,
  engineApplyOutbox,
  engineApplyReceipts,
} from "./engine-apply";
import type { ApplyPreimageV1 } from "../../server/engine/preimage";
import type { EngineOutcome } from "../../shared/contracts/engine";
import type { RuntimeResultV1 } from "../../shared/contracts/engine/runtime";
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const engineApplyPreimages = pgTable("engine_apply_preimages", {
  receiptId: uuid("receipt_id")
    .primaryKey()
    .references(() => engineApplyAudits.receiptId, { onDelete: "cascade" }),
  preimage: jsonb("preimage").$type<ApplyPreimageV1>().notNull(),
  createdAt: createdAt(),
}).enableRLS();
export const engineApplyCompensations = pgTable("engine_apply_compensations", {
  originalReceiptId: uuid("original_receipt_id")
    .primaryKey()
    .references(() => engineApplyPreimages.receiptId, { onDelete: "cascade" }),
  compensationReceiptId: uuid("compensation_receipt_id")
    .notNull()
    .unique()
    .references(() => engineApplyAudits.receiptId, { onDelete: "cascade" }),
  createdAt: createdAt(),
}).enableRLS();
export const engineRollbackReceipts = pgTable(
  "engine_rollback_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    originalReceiptId: uuid("original_receipt_id")
      .notNull()
      .references(() => engineApplyReceipts.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    requestId: text("request_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    outcome: text("outcome").$type<EngineOutcome>().notNull(),
    issueCodes: text("issue_codes").array().notNull(),
    observedTripRevision: bigint("observed_trip_revision", {
      mode: "number",
    }).notNull(),
    observedPlanRevision: bigint("observed_plan_revision", {
      mode: "number",
    }).notNull(),
    resultingTripRevision: bigint("resulting_trip_revision", {
      mode: "number",
    }),
    resultingPlanRevision: bigint("resulting_plan_revision", {
      mode: "number",
    }),
    applyReceiptId: uuid("apply_receipt_id").references(
      () => engineApplyReceipts.id,
      { onDelete: "cascade" },
    ),
    createdAt: createdAt(),
  },
  (t) => [
    unique("engine_rollback_receipts_actor_key").on(
      t.actorUserId,
      t.idempotencyKey,
    ),
  ],
).enableRLS();
export const engineRuntimeResults = pgTable("engine_runtime_results", {
  receiptId: uuid("receipt_id")
    .primaryKey()
    .references(() => engineApplyOutbox.receiptId, { onDelete: "cascade" }),
  contractVersion: text("contract_version").notNull().default("4.23-runtime-1"),
  observedTripRevision: bigint("observed_trip_revision", { mode: "number" }),
  observedPlanRevision: bigint("observed_plan_revision", { mode: "number" }),
  recomputeStatus: text("recompute_status")
    .$type<RuntimeResultV1["recomputeStatus"]>()
    .notNull(),
  fingerprint: text("fingerprint").notNull(),
  issueCodes: text("issue_codes").array().notNull(),
  issuesTruncated: boolean("issues_truncated").notNull().default(false),
  createdAt: createdAt(),
}).enableRLS();
