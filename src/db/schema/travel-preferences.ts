import "server-only";
import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";
import type { PreferenceV1 } from "../../shared/contracts/preferences";
import type {
  TripDraftFactsV1,
  WizardProgressV1,
} from "../../shared/contracts/trips";

const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
const ownPolicies = (name: string, owner: AnyPgColumn, immutable = false) => {
  const own = sql`${authUid} = ${owner}`;
  return [
    pgPolicy(name + "_select_own", {
      for: "select",
      to: authenticatedRole,
      using: own,
    }),
    pgPolicy(name + "_insert_own", {
      for: "insert",
      to: authenticatedRole,
      withCheck: own,
    }),
    ...(immutable
      ? []
      : [
          pgPolicy(name + "_update_own", {
            for: "update",
            to: authenticatedRole,
            using: own,
            withCheck: own,
          }),
        ]),
  ];
};
const payloadColumn = () => jsonb("payload").$type<PreferenceV1>().notNull();
const emptyDefault = sql`'{"schemaVersion":"1.0","values":{}}'::jsonb`;
export const travelPreferences = pgTable(
  "travel_preferences",
  {
    ownerUserId: uuid("owner_user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    payload: payloadColumn().default(emptyDefault),
    revision: integer("revision").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    check(
      "travel_preferences_payload_check",
      sql`public.is_travel_preference_v1(${t.payload})`,
    ),
    check("travel_preferences_revision_check", sql`${t.revision}>0`),
    ...ownPolicies("travel_preferences", t.ownerUserId),
  ],
).enableRLS();
export const tripDrafts = pgTable(
  "trip_drafts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    creationKey: uuid("creation_key").notNull(),
    status: text("status")
      .$type<"active" | "archived">()
      .notNull()
      .default("active"),
    facts: jsonb("facts").$type<TripDraftFactsV1>().notNull(),
    progress: jsonb("progress").$type<WizardProgressV1>().notNull(),
    revision: integer("revision").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    unique("trip_drafts_owner_id_unique").on(t.ownerUserId, t.id),
    unique("trip_drafts_creation_unique").on(t.ownerUserId, t.creationKey),
    index("trip_drafts_owner_updated_idx").on(
      t.ownerUserId,
      t.updatedAt.desc(),
    ),
    check(
      "trip_drafts_status_check",
      sql`${t.status} in ('active','archived')`,
    ),
    check("trip_drafts_revision_check", sql`${t.revision}>0`),
    check(
      "trip_drafts_facts_check",
      sql`jsonb_typeof(${t.facts})='object' and ${t.facts}->>'contractVersion' is not distinct from '1.0' and jsonb_typeof(${t.facts}->'destinations') is not distinct from 'array' and jsonb_typeof(${t.facts}->'participants') is not distinct from 'object' and jsonb_typeof(${t.facts}->'dates') is not distinct from 'object' and octet_length(${t.facts}::text)<=131072`,
    ),
    check(
      "trip_drafts_progress_check",
      sql`jsonb_typeof(${t.progress})='object' and ${t.progress}->>'contractVersion' is not distinct from '1.0' and coalesce(${t.progress}->>'phase' in ('familiarity','preferences','trip_basics','generating','plan_selection'),false) and jsonb_typeof(${t.progress}->'completedPhases') is not distinct from 'array' and octet_length(${t.progress}::text)<=2048`,
    ),
    ...ownPolicies("trip_drafts", t.ownerUserId),
  ],
).enableRLS();
export const tripPreferenceSnapshots = pgTable(
  "trip_preference_snapshots",
  {
    tripDraftId: uuid("trip_draft_id").primaryKey(),
    ownerUserId: uuid("owner_user_id").notNull(),
    payload: payloadColumn(),
    sourcePreferenceRevision: integer("source_preference_revision").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "trip_preference_snapshots_draft_fk",
      columns: [t.ownerUserId, t.tripDraftId],
      foreignColumns: [tripDrafts.ownerUserId, tripDrafts.id],
    }).onDelete("cascade"),
    check(
      "trip_preference_snapshots_payload_check",
      sql`public.is_travel_preference_v1(${t.payload})`,
    ),
    check(
      "trip_preference_snapshots_source_check",
      sql`${t.sourcePreferenceRevision}>=0`,
    ),
    ...ownPolicies("trip_preference_snapshots", t.ownerUserId, true),
  ],
).enableRLS();
export const tripPreferenceOverrides = pgTable(
  "trip_preference_overrides",
  {
    tripDraftId: uuid("trip_draft_id").primaryKey(),
    ownerUserId: uuid("owner_user_id").notNull(),
    payload: payloadColumn().default(emptyDefault),
    revision: integer("revision").notNull().default(1),
    ...timestamps(),
  },
  (t) => [
    foreignKey({
      name: "trip_preference_overrides_draft_fk",
      columns: [t.ownerUserId, t.tripDraftId],
      foreignColumns: [tripDrafts.ownerUserId, tripDrafts.id],
    }).onDelete("cascade"),
    check(
      "trip_preference_overrides_payload_check",
      sql`public.is_travel_preference_v1(${t.payload})`,
    ),
    check("trip_preference_overrides_revision_check", sql`${t.revision}>0`),
    ...ownPolicies("trip_preference_overrides", t.ownerUserId),
  ],
).enableRLS();
