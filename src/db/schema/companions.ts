import "server-only";
import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
  boolean,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import type { CompanionTravelProfileV1 } from "../../features/companions/domain/companion-v1";
import { profileAuditColumns, profileOwnerPolicies } from "./profile-common";

// Query mirror only. SQL owns schema history, validator functions and triggers.
export const companions = pgTable(
  "companions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull(),
    displayName: text("display_name").notNull(),
    relationshipCode: text("relationship_code"),
    relationshipLabel: text("relationship_label"),
    birthDate: date("birth_date", { mode: "string" }),
    ageGroupFallback: text("age_group_fallback"),
    genderCode: text("gender_code"),
    avatarPath: text("avatar_path"),
    travelProfile: jsonb("travel_profile")
      .$type<CompanionTravelProfileV1>()
      .notNull()
      .default(
        sql`'{"schemaVersion":"1.0","mobilityNeeds":[],"diningNeeds":[],"activityInterests":[]}'::jsonb`,
      ),
    revision: integer("revision").notNull().default(1),
    ...profileAuditColumns(),
  },
  (t) => [
    foreignKey({
      name: "companions_auth_user_fk",
      columns: [t.ownerUserId],
      foreignColumns: [authUsers.id],
    }).onDelete("cascade"),
    unique("companions_id_owner_unique").on(t.id, t.ownerUserId),
    check(
      "companions_display_name_check",
      sql`char_length(${t.displayName}) between 1 and 100 and ${t.displayName} = btrim(${t.displayName})`,
    ),
    check(
      "companions_relationship_code_check",
      sql`${t.relationshipCode} in ('family','partner','friend','colleague','other')`,
    ),
    check(
      "companions_relationship_label_check",
      sql`char_length(${t.relationshipLabel}) <= 100`,
    ),
    check(
      "companions_age_source_check",
      sql`(${t.birthDate} is not null) <> (${t.ageGroupFallback} is not null)`,
    ),
    check(
      "companions_birth_date_check",
      sql`${t.birthDate} between date '0001-01-01' and date '9999-12-31'`,
    ),
    check(
      "companions_age_group_check",
      sql`${t.ageGroupFallback} in ('infant','child','adult','senior')`,
    ),
    check(
      "companions_gender_check",
      sql`${t.genderCode} in ('female','male','other')`,
    ),
    check(
      "companions_avatar_path_check",
      sql`char_length(${t.avatarPath}) between 1 and 1024 and ${t.avatarPath} = btrim(${t.avatarPath}) and ${t.avatarPath} !~ '(^/|:|(^|/)\\.\\.?(/|$))' and position(chr(92) in ${t.avatarPath}) = 0`,
    ),
    check(
      "companions_travel_profile_check",
      sql`public.is_companion_travel_profile_v1(${t.travelProfile})`,
    ),
    check("companions_revision_check", sql`${t.revision} > 0`),
    index("companions_owner_idx").on(t.ownerUserId),
    ...profileOwnerPolicies("companions", t.ownerUserId, true),
  ],
).enableRLS();

export const companionGroups = pgTable(
  "companion_groups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerUserId: uuid("owner_user_id").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    includesOwner: boolean("includes_owner").notNull().default(false),
    revision: integer("revision").notNull().default(1),
    ...profileAuditColumns(),
  },
  (t) => [
    foreignKey({
      name: "companion_groups_auth_user_fk",
      columns: [t.ownerUserId],
      foreignColumns: [authUsers.id],
    }).onDelete("cascade"),
    unique("companion_groups_id_owner_unique").on(t.id, t.ownerUserId),
    check(
      "companion_groups_name_check",
      sql`char_length(${t.name}) between 1 and 100 and ${t.name} = btrim(${t.name})`,
    ),
    check(
      "companion_groups_description_check",
      sql`char_length(${t.description}) <= 300`,
    ),
    check("companion_groups_revision_check", sql`${t.revision} > 0`),
    index("companion_groups_owner_idx").on(t.ownerUserId),
    ...profileOwnerPolicies("companion_groups", t.ownerUserId, true),
  ],
).enableRLS();

export const companionGroupMembers = pgTable(
  "companion_group_members",
  {
    ownerUserId: uuid("owner_user_id").notNull(),
    groupId: uuid("group_id").notNull(),
    companionId: uuid("companion_id").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({
      name: "companion_group_members_pk",
      columns: [t.groupId, t.companionId],
    }),
    unique("companion_group_members_sort_unique").on(t.groupId, t.sortOrder),
    check("companion_group_members_sort_check", sql`${t.sortOrder} >= 0`),
    foreignKey({
      name: "companion_group_members_group_owner_fk",
      columns: [t.groupId, t.ownerUserId],
      foreignColumns: [companionGroups.id, companionGroups.ownerUserId],
    }).onDelete("cascade"),
    foreignKey({
      name: "companion_group_members_companion_owner_fk",
      columns: [t.companionId, t.ownerUserId],
      foreignColumns: [companions.id, companions.ownerUserId],
    }).onDelete("cascade"),
    index("companion_group_members_owner_idx").on(t.ownerUserId),
    index("companion_group_members_companion_idx").on(
      t.companionId,
      t.ownerUserId,
    ),
    ...profileOwnerPolicies("companion_group_members", t.ownerUserId, true),
  ],
).enableRLS();
