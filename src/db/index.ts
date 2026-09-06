import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

function createConnection() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is required when the server database is used.",
    );
  }
  // postgres.js connects only on a query. No pool is created at module import.
  // Transaction-mode Supabase poolers do not support prepared statements.
  const client = postgres(connectionString, {
    prepare: false,
    max: 5,
    idle_timeout: 20,
    connect_timeout: 10,
    onnotice: () => {},
  });
  return { client, db: drizzle(client, { schema, logger: false }) };
}

let connection: ReturnType<typeof createConnection> | undefined;

/** Trusted server access, not a substitute for authorization or user RLS. */
export function getDb() {
  connection ??= createConnection();
  return connection.db;
}

/** For worker shutdown/tests; do not close a shared pool after every request. */
export async function closeDb() {
  const current = connection;
  connection = undefined;
  await current?.client.end({ timeout: 5 });
}
