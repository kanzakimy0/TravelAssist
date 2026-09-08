import "server-only";

import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  check,
  pgPolicy,
  timestamp,
} from "drizzle-orm/pg-core";
import { authenticatedRole, authUid } from "drizzle-orm/supabase";

// SQL migration owns grants/triggers. These mappings do not run DDL or queries.
export function profileAuditColumns() {
  return {
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  };
}

export function boundedProfileText(
  name: string,
  column: AnyPgColumn,
  max: number,
) {
  return check(
    name,
    sql`char_length(${column}) between 1 and ${sql.raw(String(max))} and btrim(${column}) <> ''`,
  );
}

export function profileOwnerPolicies(
  table: string,
  owner: AnyPgColumn,
  allowDelete = false,
) {
  const own = sql`${authUid} = ${owner}`;
  return [
    pgPolicy(`${table}_select_own`, {
      for: "select",
      to: authenticatedRole,
      using: own,
    }),
    pgPolicy(`${table}_insert_own`, {
      for: "insert",
      to: authenticatedRole,
      withCheck: own,
    }),
    pgPolicy(`${table}_update_own`, {
      for: "update",
      to: authenticatedRole,
      using: own,
      withCheck: own,
    }),
    ...(allowDelete
      ? [
          pgPolicy(`${table}_delete_own`, {
            for: "delete",
            to: authenticatedRole,
            using: own,
          }),
        ]
      : []),
  ];
}
