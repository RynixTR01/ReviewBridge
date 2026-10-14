import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const [expectedHost, ...files] = process.argv.slice(2);
const url = process.env.DATABASE_URL;
if (!url || !expectedHost || files.length === 0 || new URL(url).hostname !== expectedHost) {
  throw new Error("A direct connection to the explicitly named temporary branch is required.");
}
if (expectedHost.includes("pooler")) throw new Error("Use a direct, non-pooled connection.");

const sql = neon(url);
for (const file of files) {
  const statements = readFileSync(file, "utf8")
    .split(";")
    .map((statement) => statement.replace(/^\s*(?:--[^\n]*\n\s*)*/, "").trim())
    .filter(Boolean);
  await sql.transaction(statements.map((statement) => sql.query(statement)));
  process.stdout.write(`Applied ${file} to temporary branch.\n`);
}
