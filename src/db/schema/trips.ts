import "server-only";

import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  doublePrecision,
  foreignKey,
  index,
  integer,
  pgPolicy,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  type PgTableExtraConfigValue,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUsers } from "drizzle-orm/supabase";

// SQL exclusively owns CHECKs, trigger guards, grants and DEFERRABLE behavior.
const audit = () => ({
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
const version = () => ({
  revision: bigint("revision", { mode: "number" }).notNull().default(1),
  revisionTxid: bigint("revision_txid", { mode: "bigint" })
    .notNull()
    .default(sql`txid_current()`),
});
const owner = (name: string, predicate: ReturnType<typeof sql>) =>
  pgPolicy(`${name}_owner`, {
    for: "all",
    to: authenticatedRole,
    using: predicate,
    withCheck: predicate,
  });

export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull(),
    title: text("title").notNull(),
    status: text("status").notNull(),
    defaultTimezone: text("default_timezone").notNull(),
    activePlanId: uuid("active_plan_id"),
    provenance: text("provenance").notNull(),
    ...version(),
    ...audit(),
  },
  (t): PgTableExtraConfigValue[] => [
    foreignKey({
      name: "trips_owner_user_id_fkey",
      columns: [t.ownerUserId],
      foreignColumns: [authUsers.id],
    }).onDelete("cascade"),
    index("trips_owner_idx").on(t.ownerUserId),
    index("trips_active_plan_idx")
      .on(t.activePlanId)
      .where(sql`${t.activePlanId} is not null`),
    foreignKey({
      name: "trips_active_plan_fk",
      columns: [t.id, t.activePlanId],
      foreignColumns: [tripPlans.tripId, tripPlans.id],
    }),
    owner("trips", sql`${t.ownerUserId}=(select auth.uid())`),
  ],
).enableRLS();

export const tripPlans = pgTable(
  "trip_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tripId: uuid("trip_id").notNull(),
    title: text("title").notNull(),
    position: integer("position").notNull(),
    ...version(),
    ...audit(),
  },
  (t) => [
    unique("trip_plans_trip_id_id_key").on(t.tripId, t.id),
    foreignKey({
      name: "trip_plans_trip_id_fkey",
      columns: [t.tripId],
      foreignColumns: [trips.id],
    }).onDelete("cascade"),
    unique("trip_plans_position_key").on(t.tripId, t.position),
    owner(
      "trip_plans",
      sql`exists(select 1 from public.trips t where t.id=${t.tripId} and t.owner_user_id=(select auth.uid()))`,
    ),
  ],
).enableRLS();

export const tripDays = pgTable(
  "trip_days",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    planId: uuid("plan_id").notNull(),
    dayNumber: integer("day_number").notNull(),
    localDate: date("local_date", { mode: "string" }).notNull(),
    timezone: text("timezone").notNull(),
    ...audit(),
  },
  (t) => [
    unique("trip_days_number_key").on(t.planId, t.dayNumber),
    foreignKey({
      name: "trip_days_plan_id_fkey",
      columns: [t.planId],
      foreignColumns: [tripPlans.id],
    }).onDelete("cascade"),
    index("trip_days_date_idx").on(t.planId, t.localDate),
    owner(
      "trip_days",
      sql`exists(select 1 from public.trip_plans p join public.trips t on t.id=p.trip_id where p.id=${t.planId} and t.owner_user_id=(select auth.uid()))`,
    ),
  ],
).enableRLS();

export const itineraryItems = pgTable(
  "itinerary_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    dayId: uuid("day_id").notNull(),
    placement: text("placement").notNull(),
    position: integer("position").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    placeReferenceId: text("place_reference_id"),
    placeName: text("place_name"),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    startAt: timestamp("start_at", { withTimezone: true }),
    endAt: timestamp("end_at", { withTimezone: true }),
    startTimezone: text("start_timezone"),
    endTimezone: text("end_timezone"),
    lockLevel: text("lock_level").notNull(),
    assessment: text("assessment").notNull(),
    bookingStatus: text("booking_status").notNull(),
    bookingReferenceId: text("booking_reference_id"),
    bookingVerifiedAt: timestamp("booking_verified_at", { withTimezone: true }),
    ...audit(),
  },
  (t) => [
    unique("itinerary_items_position_key").on(t.dayId, t.placement, t.position),
    foreignKey({
      name: "itinerary_items_day_id_fkey",
      columns: [t.dayId],
      foreignColumns: [tripDays.id],
    }).onDelete("cascade"),
    index("itinerary_items_start_idx").on(t.dayId, t.startAt),
    owner(
      "itinerary_items",
      sql`exists(select 1 from public.trip_days d join public.trip_plans p on p.id=d.plan_id join public.trips t on t.id=p.trip_id where d.id=${t.dayId} and t.owner_user_id=(select auth.uid()))`,
    ),
  ],
).enableRLS();
