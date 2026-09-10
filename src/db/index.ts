import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema/index";

function createConnection() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error("DATABASE_URL is required when calling getDb().");
  }
  // Validate without echoing connection strings or credentials in errors.
  try {
    const url = new URL(connectionString);
    if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname) {
      throw new Error();
    }
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL connection URL.");
  }
  const client = postgres(connectionString, { prepare: false });
  return { client, db: drizzle(client, { schema }) };
}

let connection: ReturnType<typeof createConnection> | undefined;
let closing: Promise<void> | undefined;

/** Trusted server query layer. Callers must authorize access; no implicit RLS. */
export function getDb() {
  if (closing) throw new Error("Database connection is shutting down.");
  connection ??= createConnection();
  return connection.db;
}

/** For explicit process/test shutdown, not after each request. */
export async function closeDb() {
  if (closing) return closing;
  if (!connection) return;
  const current = connection;
  connection = undefined;
  closing = current.client.end({ timeout: 5 });
  try {
    await closing;
  } finally {
    closing = undefined;
  }
}
