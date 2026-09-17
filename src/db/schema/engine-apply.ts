import "server-only";
import {
  bigint,
  foreignKey,
  jsonb,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import type { EngineResultV0_1 } from "../../shared/contracts/engine";

// Query mirrors only. SQL owns checks/grants; no authenticated policies are permitted.
const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const engineApplyReceipts = pgTable(
  "engine_apply_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    tripId: uuid("trip_id").notNull(),
    planId: uuid("plan_id").notNull(),
    changeSetId: text("change_set_id").notNull(),
    payloadHash: text("payload_hash").notNull(),
    outcome: text("outcome").$type<EngineResultV0_1["outcome"]>().notNull(),
    result: jsonb("result").$type<EngineResultV0_1>().notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    unique("engine_apply_receipts_actor_key").on(
      t.actorUserId,
      t.idempotencyKey,
    ),
    unique("engine_apply_receipts_id_outcome").on(t.id, t.outcome),
  ],
).enableRLS();

export const engineApplyAudits = pgTable(
  "engine_apply_audits",
  {
    receiptId: uuid("receipt_id").primaryKey(),
    outcome: text("outcome").notNull().default("accepted"),
    beforeTripRevision: bigint("before_trip_revision", {
      mode: "number",
    }).notNull(),
    beforePlanRevision: bigint("before_plan_revision", {
      mode: "number",
    }).notNull(),
    resultingTripRevision: bigint("resulting_trip_revision", {
      mode: "number",
    }).notNull(),
    resultingPlanRevision: bigint("resulting_plan_revision", {
      mode: "number",
    }).notNull(),
    previewHash: text("preview_hash").notNull(),
    contextFingerprint: text("context_fingerprint").notNull(),
    operationRefs: jsonb("operation_refs")
      .$type<{ operationId: string; op: string }[]>()
      .notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    foreignKey({
      name: "engine_apply_audits_receipt_fkey",
      columns: [t.receiptId, t.outcome],
      foreignColumns: [engineApplyReceipts.id, engineApplyReceipts.outcome],
    }).onDelete("cascade"),
  ],
).enableRLS();

export const engineApplyOutbox = pgTable("engine_apply_outbox", {
  receiptId: uuid("receipt_id")
    .primaryKey()
    .references(() => engineApplyAudits.receiptId, { onDelete: "cascade" }),
  eventType: text("event_type").notNull().default("engine.apply.accepted.v0.1"),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  leaseToken: uuid("lease_token"),
  leaseExpiresAt: timestamp("lease_expires_at", { withTimezone: true }),
  availableAt: timestamp("available_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  failureCode: text("failure_code"),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: createdAt(),
}).enableRLS();
