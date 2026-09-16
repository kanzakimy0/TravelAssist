import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import ts from "typescript";
import { getTableConfig } from "drizzle-orm/pg-core";
import * as schema from "../src/db/schema/index.ts";

export const read = (path) =>
  readFileSync(new URL("../" + path, import.meta.url), "utf8");
export const sha256 = (text) =>
  createHash("sha256").update(text.replaceAll("\r\n", "\n")).digest("hex");
export const manifest = JSON.parse(
  read("docs/qa/TASK-054/migration-inventory.json"),
);
export const allTables = Object.values(schema)
  .map(getTableConfig)
  .sort((a, b) => a.name.localeCompare(b.name));
// Keep this accepted B catalog scoped to its immutable inventory; TASK-062 verifies the full union.
export const tables = allTables.filter((table) =>
  manifest.tables.includes(table.name),
);
export const migrationPaths = () =>
  readdirSync(new URL("../supabase/migrations/", import.meta.url))
    .filter((x) => x.endsWith(".sql"))
    .sort()
    .map((x) => "supabase/migrations/" + x);

export function assertHistory() {
  const paths = migrationPaths();
  assert.equal(
    new Set(paths.map((p) => p.split("/").at(-1).slice(0, 14))).size,
    paths.length,
    "Unique migration timestamps",
  );
  for (const path of paths)
    assert.match(path, /\/\d{14}_[a-z][a-z0-9_]+\.sql$/);
  for (const file of manifest.migrations) {
    assert.ok(
      paths.includes(file.path),
      "Accepted migration remains present: " + file.path,
    );
    assert.equal(
      sha256(read(file.path)),
      file.sha256,
      "Immutable accepted migration: " + file.path,
    );
  }
  assert.equal(
    existsSync(new URL("../drizzle/", import.meta.url)),
    false,
    "No second formal Drizzle migration history",
  );
  const pkg = JSON.parse(read("package.json"));
  for (const script of Object.values(pkg.scripts))
    assert.doesNotMatch(script, /drizzle-kit\s+(push|migrate|generate)/);
  return paths;
}

// Parse the real generated TypeScript rather than maintaining a hand-written Row model.
export function generatedContract(
  text = read("src/types/database.generated.ts"),
) {
  const file = ts.createSourceFile(
    "database.generated.ts",
    text,
    ts.ScriptTarget.Latest,
    true,
  );
  assert.equal(file.parseDiagnostics.length, 0);
  const database = file.statements.find(
    (n) => ts.isTypeAliasDeclaration(n) && n.name.text === "Database",
  );
  const fields = (node) =>
    Object.fromEntries(node.members.map((p) => [p.name.text, p]));
  const publicType = fields(database.type).public.type;
  const roots = fields(publicType);
  const properties = (node) =>
    Object.fromEntries(
      Object.entries(fields(node)).map(([name, field]) => [
        name,
        {
          type: field.type.getText(file).replace(/\s/g, ""),
          optional: Boolean(field.questionToken),
        },
      ]),
    );
  return {
    tables: Object.fromEntries(
      Object.entries(fields(roots.Tables.type)).map(([name, table]) => {
        const parts = fields(table.type);
        return [
          name,
          Object.fromEntries(
            ["Row", "Insert", "Update"].map((kind) => [
              kind,
              properties(parts[kind].type),
            ]),
          ),
        ];
      }),
    ),
    functions: Object.fromEntries(
      Object.entries(fields(roots.Functions.type)).map(([name, fn]) => {
        const parts = fields(fn.type);
        return [
          name,
          {
            args: properties(parts.Args.type),
            returns: parts.Returns.type.getText(file),
          },
        ];
      }),
    ),
  };
}

export const generatedScalar = (sqlType) =>
  ({
    uuid: "string",
    text: "string",
    date: "string",
    "timestamp with time zone": "string",
    integer: "number",
    bigint: "number",
    "double precision": "number",
    boolean: "boolean",
    jsonb: "Json",
    "uuid[]": "string[]",
  })[sqlType];

export function assertGeneratedAgreement(
  contract = generatedContract(),
  tableMappings = tables,
) {
  for (const table of tableMappings) {
    const generated = contract.tables[table.name];
    assert.ok(generated, table.name);
    for (const kind of ["Row", "Insert", "Update"]) {
      assert.deepEqual(
        Object.keys(generated[kind]).sort(),
        table.columns.map((c) => c.name).sort(),
        table.name + " " + kind,
      );
      for (const column of table.columns) {
        const actual = generated[kind][column.name];
        const scalar = generatedScalar(column.getSQLType());
        assert.ok(scalar, column.getSQLType());
        assert.equal(
          actual.type,
          scalar + (column.notNull ? "" : "|null"),
          table.name + "." + column.name,
        );
        assert.equal(
          actual.optional,
          kind === "Update" ||
            (kind === "Insert" && (column.hasDefault || !column.notNull)),
          table.name + "." + column.name + " " + kind,
        );
      }
    }
  }
}
