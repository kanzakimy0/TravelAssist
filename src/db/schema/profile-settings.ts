import "server-only";

import { sql } from "drizzle-orm";
import { check, foreignKey, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { authUsers } from "drizzle-orm/supabase";
import { profileAuditColumns, profileOwnerPolicies } from "./profile-common";

/** NULL values use application fallbacks; these are display overrides, not trip preferences. */
export const profileSettings = pgTable(
  "profile_settings",
  {
    userId: uuid("user_id").primaryKey(),
    locale: text("locale"),
    regionCode: text("region_code"),
    timezone: text("timezone"),
    currencyCode: text("currency_code"),
    distanceUnit: text("distance_unit"),
    temperatureUnit: text("temperature_unit"),
    timeFormat: text("time_format"),
    ...profileAuditColumns(),
  },
  (t) => [
    foreignKey({
      name: "profile_settings_auth_user_fk",
      columns: [t.userId],
      foreignColumns: [authUsers.id],
    }).onDelete("cascade"),
    check(
      "profile_settings_locale_check",
      sql`char_length(${t.locale}) between 1 and 255 and ${t.locale} ~ '^[A-Za-z]{1,8}(-[A-Za-z0-9]{1,8})*$'`,
    ),
    check("profile_settings_region_check", sql`${t.regionCode} ~ '^[A-Z]{2}$'`),
    check(
      "profile_settings_timezone_check",
      sql`char_length(${t.timezone}) between 1 and 100 and ${t.timezone} ~ '^[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)*$'`,
    ),
    check(
      "profile_settings_currency_check",
      sql`${t.currencyCode} ~ '^[A-Z]{3}$'`,
    ),
    check(
      "profile_settings_distance_check",
      sql`${t.distanceUnit} in ('km', 'mi')`,
    ),
    check(
      "profile_settings_temperature_check",
      sql`${t.temperatureUnit} in ('celsius', 'fahrenheit')`,
    ),
    check(
      "profile_settings_time_format_check",
      sql`${t.timeFormat} in ('12h', '24h')`,
    ),
    ...profileOwnerPolicies("profile_settings", t.userId),
  ],
).enableRLS();
