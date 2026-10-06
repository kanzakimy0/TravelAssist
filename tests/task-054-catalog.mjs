import assert from "node:assert/strict";
import { PgDialect, getTableConfig } from "drizzle-orm/pg-core";
import {
  manifest,
  tables,
  generatedContract,
  generatedScalar,
  assertGeneratedAgreement,
  assertHistory,
} from "./task-054-migration-helpers.mjs";
const ident = (s) => '"' + s.replaceAll('"', '""') + '"';
const dialect = new PgDialect();

export async function catalog(db, names = manifest.tables) {
  // Definitions only: no user data, UUID fixtures, connection strings or credentials.
  return {
    migrations:
      await db`select version from supabase_migrations.schema_migrations order by version`,
    tables:
      await db`select relname,relrowsecurity from pg_class where relnamespace='public'::regnamespace and relname=any(${names}) order by relname`,
    columns:
      await db`select table_name,column_name,data_type,is_nullable,column_default,ordinal_position from information_schema.columns where table_schema='public' and table_name=any(${names}) order by table_name,ordinal_position`,
    constraints:
      await db`select c.relname as table_name,conname,contype,confdeltype,pg_get_constraintdef(k.oid) as definition,pg_get_expr(k.conbin,k.conrelid) as expression from pg_constraint k join pg_class c on c.oid=k.conrelid where c.relnamespace='public'::regnamespace and c.relname=any(${names}) order by c.relname,conname`,
    indexes:
      await db`select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename=any(${names}) order by tablename,indexname`,
    policies:
      await db`select tablename,policyname,cmd,roles,qual,with_check from pg_policies where schemaname='public' and tablename=any(${names}) order by policyname`,
    triggers:
      await db`select c.relname as table_name,t.tgname,pg_get_triggerdef(t.oid) as definition,t.tgenabled from pg_trigger t join pg_class c on c.oid=t.tgrelid where not t.tgisinternal and c.relnamespace='public'::regnamespace and c.relname=any(${names}) order by t.tgname`,
    functions:
      await db`select p.proname,p.prosecdef,p.proconfig,p.proargnames,oidvectortypes(p.proargtypes) as argtypes,p.pronargdefaults,pg_get_function_result(p.oid) as result,pg_get_functiondef(p.oid) as definition,p.proacl::text as acl from pg_proc p where p.pronamespace='public'::regnamespace and p.proname=any(${manifest.functions}) order by p.proname`,
    grants:
      await db`select table_name,grantee,privilege_type from information_schema.role_table_grants where table_schema='public' and table_name=any(${names}) order by table_name,grantee,privilege_type`,
  };
}

export async function verifyCatalog(db, state) {
  assert.deepEqual(
    state.migrations.map((r) => r.version),
    assertHistory().map((p) => p.split("/").at(-1).slice(0, 14)),
  );
  for (const [rows, key, expected] of [
    [state.tables, "relname", manifest.tables],
    [state.functions, "proname", manifest.functions],
    [state.triggers, "tgname", manifest.triggers],
    [state.policies, "policyname", manifest.policies],
  ])
    assert.deepEqual(rows.map((r) => r[key]).sort(), expected);
  assert.ok(state.tables.every((r) => r.relrowsecurity));
  assert.ok(state.triggers.every((r) => r.tgenabled === "O"));
  assertGeneratedAgreement();
  const generated = generatedContract();
  for (const fn of state.functions) {
    assert.equal(fn.prosecdef, false, fn.proname);
    assert.deepEqual(fn.proconfig, ["search_path=pg_catalog"]);
    const rights = (
      await db`select has_function_privilege('anon',p.oid,'execute') as anon from pg_proc p where pronamespace='public'::regnamespace and proname=${fn.proname}`
    )[0];
    assert.equal(rights.anon, false, fn.proname);
    if (fn.result === "trigger") {
      assert.equal(generated.functions[fn.proname], undefined);
      continue;
    }
    const mirror = generated.functions[fn.proname];
    assert.deepEqual(
      Object.keys(mirror.args).sort(),
      [...fn.proargnames].sort(),
    );
    const types = fn.argtypes.split(", ");
    fn.proargnames.forEach((name, i) =>
      assert.deepEqual(
        mirror.args[name],
        {
          type: generatedScalar(types[i]),
          optional: i >= types.length - fn.pronargdefaults,
        },
        fn.proname + "." + name,
      ),
    );
    assert.equal(mirror.returns, generatedScalar(fn.result));
  }
  // Let PostgreSQL parse mirror checks/defaults, so formatting/parentheses cannot hide drift.
  // Temporary objects disappear at transaction end and never form a migration history.
  await db.begin(async (tx) => {
    for (const table of tables) {
      const name = table.name;
      const columns = state.columns.filter((c) => c.table_name === name);
      assert.deepEqual(
        columns.map((c) => [
          c.column_name,
          c.data_type,
          c.is_nullable === "NO",
        ]),
        table.columns.map((c) => [c.name, c.getSQLType(), c.notNull]),
        name,
      );
      const keys = state.constraints.filter((c) => c.table_name === name);
      for (const [type, expected] of [
        ["c", table.checks.map((x) => x.name)],
        ["f", table.foreignKeys.map((x) => x.getName())],
        ["u", table.uniqueConstraints.map((x) => x.name)],
      ])
        assert.deepEqual(
          keys
            .filter((k) => k.contype === type)
            .map((k) => k.conname)
            .sort(),
          expected.sort(),
          name,
        );
      const pk = table.primaryKeys.length
        ? table.primaryKeys[0].columns
        : table.columns.filter((c) => c.primary);
      assert.equal(
        keys.find((k) => k.contype === "p").definition,
        `PRIMARY KEY (${pk.map((c) => c.name).join(", ")})`,
      );
      for (const fk of table.foreignKeys) {
        const ref = fk.reference();
        const target = getTableConfig(ref.foreignTable);
        const expected = `FOREIGN KEY (${ref.columns.map((c) => c.name).join(", ")}) REFERENCES ${target.schema ? target.schema + "." : ""}${target.name}(${ref.foreignColumns.map((c) => c.name).join(", ")}) ON DELETE CASCADE`;
        assert.equal(
          keys.find((k) => k.conname === fk.getName()).definition,
          expected,
        );
        assert.equal(fk.onDelete, "cascade");
      }
      for (const unique of table.uniqueConstraints)
        assert.equal(
          keys.find((k) => k.conname === unique.name).definition,
          `UNIQUE (${unique.columns.map((c) => c.name).join(", ")})`,
        );
      const temp = "task054_" + name;
      await tx.unsafe(
        `create temporary table ${ident(temp)} (like public.${ident(name)}) on commit drop`,
      );
      const render = (expression) => {
        const query = dialect.sqlToQuery(expression);
        assert.equal(
          query.params.length,
          0,
          "DDL has no runtime bind parameters",
        );
        return query.sql.replaceAll(ident(name) + ".", "");
      };
      for (const check of table.checks)
        await tx.unsafe(
          `alter table ${ident(temp)} add constraint ${ident(check.name)} check (${render(check.value)})`,
        );
      const mirrorChecks =
        await tx`select conname,pg_get_expr(conbin,conrelid) as expression from pg_constraint where conrelid=${temp}::regclass and contype='c' order by conname`;
      assert.deepEqual(
        Array.from(mirrorChecks),
        keys
          .filter((k) => k.contype === "c")
          .map(({ conname, expression }) => ({ conname, expression })),
        name + " CHECK expressions",
      );
      for (const column of table.columns) {
        const actual = columns.find((c) => c.column_name === column.name);
        assert.equal(
          actual.column_default !== null,
          column.hasDefault,
          name + "." + column.name + " default",
        );
        if (!column.hasDefault) continue;
        const value = column.default;
        const expression =
          typeof value === "string"
            ? "'" + value.replaceAll("'", "''") + "'"
            : typeof value === "number" || typeof value === "boolean"
              ? String(value)
              : render(value);
        await tx.unsafe(
          `alter table ${ident(temp)} alter column ${ident(column.name)} set default ${expression}`,
        );
        const parsed = (
          await tx`select pg_get_expr(d.adbin,d.adrelid) as expression from pg_attrdef d join pg_attribute a on a.attrelid=d.adrelid and a.attnum=d.adnum where d.adrelid=${temp}::regclass and a.attname=${column.name}`
        )[0];
        assert.equal(
          parsed.expression,
          actual.column_default,
          name + "." + column.name + " default expression",
        );
      }
      const indexes = state.indexes.filter((i) => i.tablename === name);
      assert.equal(
        indexes.length,
        table.indexes.length + table.uniqueConstraints.length + 1,
        name + " index inventory",
      );
      for (const { config } of table.indexes) {
        const actual = indexes.find(
          (i) => i.indexname === config.name,
        )?.indexdef;
        assert.ok(actual, config.name);
        assert.equal(
          actual.includes("CREATE UNIQUE INDEX"),
          config.unique,
          config.name,
        );
        const columns = config.columns
          .map((c) => c.name + (c.indexConfig.order === "desc" ? " DESC" : ""))
          .join(", ");
        assert.ok(
          actual.includes(`USING ${config.method} (${columns})`),
          config.name + " columns/order",
        );
        if (config.where) {
          const expected = render(config.where)
            .replaceAll('"', "")
            .toUpperCase();
          assert.equal(
            actual
              .split(" WHERE ")[1]
              .replace(/^\(|\)$/g, "")
              .toUpperCase(),
            expected,
          );
        } else assert.equal(actual.includes(" WHERE "), false);
      }
      const policies = state.policies.filter((p) => p.tablename === name);
      assert.deepEqual(
        policies.map((p) => p.policyname).sort(),
        table.policies.map((p) => p.name).sort(),
      );
      for (const policy of policies) {
        const mirror = table.policies.find((p) => p.name === policy.policyname);
        assert.deepEqual(policy.roles, ["authenticated"]);
        assert.equal(policy.cmd.toLowerCase(), mirror.for);
        for (const [actual, present] of [
          [policy.qual, mirror.using],
          [policy.with_check, mirror.withCheck],
        ]) {
          assert.equal(Boolean(actual), Boolean(present));
          if (actual) {
            const owner =
              name === "profiles"
                ? "id"
                : name === "profile_settings" || name === "emergency_contacts"
                  ? "user_id"
                  : "owner_user_id";
            assert.equal(
              actual.replace(/\s+/g, " ").trim(),
              `(( SELECT auth.uid() AS uid) = ${owner})`,
            );
          }
        }
      }
    }
  });
}
