import "server-only";
import { sql } from "drizzle-orm";
import {
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
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid, authUsers } from "drizzle-orm/supabase";
import type {
  TripDraftFactsV1,
  WizardProgressV1,
  TripPlanSnapshotV1,
} from "../../shared/contracts/trips";
import type {
  PreferenceV1,
  PreferencePatchV1,
} from "../../features/preferences/domain/preference-v1";
import {
  TRIP_PERSISTENCE_MAX_BYTES as caps,
  type TripLibraryStateV1,
  type TripPartySnapshotV1,
} from "../../features/trip-library/domain/trip-persistence-v1";

// Query mirror only. The additive SQL migration owns history, validation, triggers and grants.
export const tripLibraryRecords = pgTable(
  "trip_library_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull(),
    creationKey: uuid("creation_key").notNull(),
    libraryState: text("library_state")
      .$type<TripLibraryStateV1>()
      .notNull()
      .default("draft"),
    canonicalTripId: text("canonical_trip_id"),
    draftFacts: jsonb("draft_facts").$type<TripDraftFactsV1>().notNull(),
    wizardProgress: jsonb("wizard_progress")
      .$type<WizardProgressV1>()
      .notNull(),
    planSnapshot: jsonb("plan_snapshot").$type<TripPlanSnapshotV1>(),
    preferenceSnapshot: jsonb("preference_snapshot")
      .$type<PreferenceV1>()
      .notNull(),
    preferenceSourceRevision: integer("preference_source_revision").notNull(),
    preferenceOverridePatch: jsonb("preference_override_patch")
      .$type<PreferencePatchV1>()
      .notNull()
      .default(sql`'{"schemaVersion":"1.0","set":{},"unset":[]}'::jsonb`),
    partySnapshot: jsonb("party_snapshot")
      .$type<TripPartySnapshotV1>()
      .notNull(),
    storageRevision: integer("storage_revision").notNull().default(1),
    frozenAt: timestamp("frozen_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "trip_library_records_owner_fk",
      columns: [t.ownerUserId],
      foreignColumns: [authUsers.id],
    }).onDelete("cascade"),
    unique("trip_library_records_creation_unique").on(
      t.ownerUserId,
      t.creationKey,
    ),
    uniqueIndex("trip_library_records_canonical_unique")
      .on(t.ownerUserId, t.canonicalTripId)
      .where(sql`${t.canonicalTripId} is not null`),
    index("trip_library_records_owner_updated_idx").on(
      t.ownerUserId,
      t.updatedAt.desc(),
      t.id,
    ),
    check(
      "trip_library_records_state_check",
      sql`${t.libraryState} in ('draft','saved','history')`,
    ),
    check(
      "trip_library_records_lifecycle_check",
      sql`
    (${t.libraryState}='draft' and ${t.canonicalTripId} is null and ${t.planSnapshot} is null and ${t.frozenAt} is null) or
    (${t.libraryState}='saved' and ${t.canonicalTripId} is not null and ${t.planSnapshot} is not null and ${t.frozenAt} is null) or
    (${t.libraryState}='history' and ${t.canonicalTripId} is not null and ${t.planSnapshot} is not null and ${t.frozenAt} is not null)`,
    ),
    check(
      "trip_library_records_canonical_id_check",
      sql`${t.canonicalTripId} is null or
    (char_length(${t.canonicalTripId}) between 1 and 160 and ${t.canonicalTripId} !~ '[[:space:][:cntrl:]]'
    and jsonb_typeof(${t.planSnapshot}#>'{trip,id}') is not distinct from 'string'
    and (${t.canonicalTripId} = ${t.planSnapshot}#>>'{trip,id}') is true)`,
    ),
    check(
      "trip_library_records_draft_check",
      sql`public.is_trip_library_envelope_v1(${t.draftFacts},'contractVersion',${sql.raw(String(caps.draftFacts))})`,
    ),
    check(
      "trip_library_records_progress_check",
      sql`public.is_trip_library_envelope_v1(${t.wizardProgress},'contractVersion',${sql.raw(String(caps.wizardProgress))})`,
    ),
    check(
      "trip_library_records_plan_check",
      sql`${t.planSnapshot} is null or public.is_trip_library_envelope_v1(${t.planSnapshot},'contractVersion',${sql.raw(String(caps.planSnapshot))})`,
    ),
    check(
      "trip_library_records_preference_check",
      sql`public.is_travel_preference_v1(${t.preferenceSnapshot})`,
    ),
    check(
      "trip_library_records_source_revision_check",
      sql`${t.preferenceSourceRevision} >= 0 and
    (${t.preferenceSourceRevision} <> 0 or ${t.preferenceSnapshot} = '{"schemaVersion":"1.0","values":{}}'::jsonb)`,
    ),
    check(
      "trip_library_records_patch_check",
      sql`
    public.is_trip_library_envelope_v1(${t.preferenceOverridePatch},'schemaVersion',${sql.raw(String(caps.preferenceOverridePatch))})
    and (${t.preferenceOverridePatch} - 'schemaVersion' - 'set' - 'unset') = '{}'::jsonb
    and public.is_travel_preference_v1(jsonb_build_object('schemaVersion','1.0','values',${t.preferenceOverridePatch}->'set'))
    and jsonb_typeof(${t.preferenceOverridePatch}->'unset') is not distinct from 'array'`,
    ),
    check(
      "trip_library_records_party_check",
      sql`public.is_trip_party_snapshot_v1(${t.partySnapshot})`,
    ),
    check(
      "trip_library_records_storage_revision_check",
      sql`${t.storageRevision} > 0`,
    ),
    check(
      "trip_library_records_timestamps_check",
      sql`isfinite(${t.createdAt}) and isfinite(${t.updatedAt}) and (${t.frozenAt} is null or isfinite(${t.frozenAt}))`,
    ),
    pgPolicy("trip_library_records_select_own", {
      for: "select",
      to: authenticatedRole,
      using: sql`${authUid} = ${t.ownerUserId}`,
    }),
  ],
).enableRLS();
