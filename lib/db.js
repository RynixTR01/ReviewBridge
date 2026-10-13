import 'server-only';
import { neon } from '@neondatabase/serverless';

let neonClient;

export function getNeonClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to connect to Neon.');
  }

  neonClient ??= neon(connectionString);
  return neonClient;
}

export async function query(text, params = []) {
  return getNeonClient().query(text, params);
}

export async function queryOne(text, params = []) {
  const rows = await query(text, params);
  return rows[0] ?? null;
}
