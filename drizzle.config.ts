import { defineConfig } from "drizzle-kit";

// Mapping/development tools only. No credentials are loaded by this config.
// SQL history and the only migration runner: supabase/migrations + Supabase CLI.
// Never use drizzle-kit push on Staging/Production or drizzle-kit migrate here.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./.db-tooling/drizzle-inspection",
  strict: true,
  verbose: false,
});
