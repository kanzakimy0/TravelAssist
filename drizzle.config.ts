import { defineConfig } from "drizzle-kit";

// Mapping/introspection configuration only, NOT a migration runner.
// No credentials at import time and no second formal SQL history.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./.db-tooling/introspection",
  schemaFilter: ["public"],
  strict: true,
});
