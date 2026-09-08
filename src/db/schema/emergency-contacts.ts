import "server-only";

import { sql } from "drizzle-orm";
import {
  check,
  foreignKey,
  index,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import {
  boundedProfileText,
  profileAuditColumns,
  profileOwnerPolicies,
} from "./profile-common";

/** Private 0..N contacts; no Companion, notification or account lifecycle behavior. */
export const emergencyContacts = pgTable(
  "emergency_contacts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    name: text("name").notNull(),
    relationship: text("relationship").notNull(),
    phoneE164: text("phone_e164").notNull(),
    countryCode: text("country_code"),
    email: text("email"),
    note: text("note"),
    ...profileAuditColumns(),
  },
  (t) => [
    foreignKey({
      name: "emergency_contacts_auth_user_fk",
      columns: [t.userId],
      foreignColumns: [authUsers.id],
    }).onDelete("cascade"),
    index("emergency_contacts_user_id_idx").on(t.userId),
    boundedProfileText("emergency_contacts_name_check", t.name, 200),
    boundedProfileText(
      "emergency_contacts_relationship_check",
      t.relationship,
      100,
    ),
    check(
      "emergency_contacts_phone_check",
      sql`${t.phoneE164} ~ '^[+][1-9][0-9]{1,14}$'`,
    ),
    check(
      "emergency_contacts_country_check",
      sql`${t.countryCode} ~ '^[A-Z]{2}$'`,
    ),
    check(
      "emergency_contacts_email_check",
      sql`char_length(${t.email}) between 3 and 254 and ${t.email} ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'`,
    ),
    boundedProfileText("emergency_contacts_note_check", t.note, 2000),
    ...profileOwnerPolicies("emergency_contacts", t.userId, true),
  ],
).enableRLS();
