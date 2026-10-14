import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const productionHost = "ep-still-king-ba1rge14.c-8.eu-central-1.aws.neon.tech";
const url = process.env.DATABASE_URL;
if (process.env.NEON_TARGET_BRANCH !== "production" || !url || new URL(url).hostname !== productionHost) {
  throw new Error("Set NEON_TARGET_BRANCH=production and use the direct production Neon connection.");
}
if (url.includes("pooler")) throw new Error("Use a direct, non-pooled production connection.");

const migrations = [
  "migrations/20261014_02_first_party_feedback.sql",
  "migrations/20261014_03_agency_brands.sql",
  "migrations/20261014_04_widget_installations.sql",
  "migrations/20261014_05_agency_members.sql",
  "migrations/20261014_06_widget_experiments.sql",
  "migrations/20261014_07_sync_alerts.sql",
  "migrations/20261014_08_feedback_rate_limits.sql",
];
const sql = neon(url);
for (const file of migrations) {
  const statements = readFileSync(file, "utf8")
    .split(";")
    .map((statement) => statement.replace(/^\s*(?:--[^\n]*\n\s*)*/, "").trim())
    .filter(Boolean);
  await sql.transaction(statements.map((statement) => sql.query(statement)));
  process.stdout.write(`Applied ${file}.\n`);
}
