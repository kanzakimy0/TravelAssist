import "server-only";

import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
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

/** Product data only. authUsers is Supabase's existing identity table, not an app-owned mirror. */
export const profiles = pgTable(
  "profiles",
  {
    id: uuid("id").primaryKey(),
    displayName: text("display_name"),
    fullName: text("full_name"),
    birthDate: date("birth_date"),
    genderCode: text("gender_code"),
    residenceCountryCode: text("residence_country_code"),
    residenceCity: text("residence_city"),
    avatarPath: text("avatar_path"),
    ...profileAuditColumns(),
  },
  (t) => [
    foreignKey({
      name: "profiles_auth_user_fk",
      columns: [t.id],
      foreignColumns: [authUsers.id],
    }).onDelete("cascade"),
    boundedProfileText("profiles_display_name_check", t.displayName, 100),
    boundedProfileText("profiles_full_name_check", t.fullName, 200),
    check(
      "profiles_birth_date_check",
      sql`${t.birthDate} between date '0001-01-01' and date '9999-12-31'`,
    ),
    boundedProfileText("profiles_gender_code_check", t.genderCode, 64),
    check(
      "profiles_country_code_check",
      sql`${t.residenceCountryCode} ~ '^[A-Z]{2}$'`,
    ),
    boundedProfileText("profiles_city_check", t.residenceCity, 200),
    boundedProfileText("profiles_avatar_path_check", t.avatarPath, 1024),
    ...profileOwnerPolicies("profiles", t.id),
  ],
).enableRLS();
