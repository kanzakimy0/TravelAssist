import "server-only";

import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import type { PreferenceV1 } from "../../features/preferences/domain/preference-v1";
import { profileOwnerPolicies } from "./profile-common";

// Query mirror only. SQL migration owns function, trigger and grants.
export const travelPreferences = pgTable(
  "travel_preferences",
  {
    ownerUserId: uuid("owner_user_id").primaryKey(),
    payload: jsonb("payload")
      .$type<PreferenceV1>()
      .notNull()
      .default(sql`'{"schemaVersion":"1.0","values":{}}'::jsonb`),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    foreignKey({
      name: "travel_preferences_auth_user_fk",
      columns: [t.ownerUserId],
      foreignColumns: [authUsers.id],
    }).onDelete("cascade"),
    check(
      "travel_preferences_payload_check",
      sql`public.is_travel_preference_v1(${t.payload})`,
    ),
    check("travel_preferences_revision_check", sql`${t.revision} > 0`),
    ...profileOwnerPolicies("travel_preferences", t.ownerUserId),
  ],
).enableRLS();
