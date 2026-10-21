import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { neon } from "@neondatabase/serverless";
const expectedHost = process.argv[2];
const url = process.env.DATABASE_URL;
if (!url || !expectedHost || new URL(url).hostname !== expectedHost
  || !expectedHost.startsWith("ep-damp-sunset-bazyhhcn.")) throw new Error("Explicit isolated branch required.");
const database = neon(url);
const password = randomBytes(32).toString("hex");
const [exists] = await database.query("SELECT 1 FROM pg_roles WHERE rolname = 'reviewbridge_runtime'");
if (exists) throw new Error("Test role already exists; do not rotate implicitly.");
await database.transaction([
  database.query(`CREATE ROLE reviewbridge_runtime LOGIN PASSWORD '${password}' NOCREATEDB NOCREATEROLE NOBYPASSRLS`),
  database.query("GRANT CONNECT ON DATABASE neondb TO reviewbridge_runtime"),
  database.query("GRANT USAGE ON SCHEMA public TO reviewbridge_runtime"),
  database.query("GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO reviewbridge_runtime"),
  database.query("GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO reviewbridge_runtime"),
  database.query("ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO reviewbridge_runtime"),
  database.query("ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO reviewbridge_runtime"),
]);
const runtimeUrl = new URL(url);
runtimeUrl.username = "reviewbridge_runtime";
runtimeUrl.password = password;
const runtime = neon(runtimeUrl.href);
const [role] = await runtime.query(`SELECT current_user AS role, rolcreatedb, rolcreaterole, rolbypassrls,
  pg_has_role(current_user, 'neon_superuser', 'MEMBER') AS admin_member,
  has_database_privilege(current_user, 'neondb', 'CREATE') AS create_database_object,
  has_schema_privilege(current_user, 'public', 'CREATE') AS create_schema_object,
  has_table_privilege(current_user, 'public.users', 'TRUNCATE') AS truncate_users,
  has_table_privilege(current_user, 'public.users', 'SELECT,INSERT,UPDATE,DELETE') AS app_dml
  FROM pg_roles WHERE rolname=current_user`);
assert.equal(role.role, "reviewbridge_runtime");
for (const key of ["rolcreatedb","rolcreaterole","rolbypassrls","admin_member","create_database_object","create_schema_object","truncate_users"]) assert.equal(role[key], false, key);
assert.equal(role.app_dml, true);
console.log("PASS actual restricted login: app DML only, no admin/create/RLS bypass/TRUNCATE");
for (const sql of ["CREATE TABLE public.audit_forbidden_table (id integer)", "TRUNCATE public.users", "SET ROLE neondb_owner", "SELECT id FROM neon_auth.user LIMIT 0"]) {
  let denied = false;
  try { await runtime.transaction([runtime.query(sql), runtime.query("SELECT 1 / 0")]); }
  catch (error) { denied = error.code === "42501"; }
  assert.equal(denied, true, `Expected permission denial: ${sql}`);
}
console.log("PASS DDL/TRUNCATE/admin-role/auth-schema probes denied (transactions rolled back)");
