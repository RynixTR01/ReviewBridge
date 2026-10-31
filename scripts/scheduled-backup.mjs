import { spawn } from "node:child_process";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { openPortableKey, sealPortableKey } from "./portable-backup-key.mjs";

const magic = Buffer.from("RBNEON1\n");
const limit = 256 * 1024 * 1024;

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
    const chunks = [];
    const errors = [];
    let size = 0;
    child.stdout.on("data", (chunk) => {
      size += chunk.length;
      if (size > limit) child.kill();
      else chunks.push(chunk);
    });
    child.stderr.on("data", (chunk) => errors.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 || size > limit) reject(new Error(`${command} failed (${code}): ${Buffer.concat(errors).toString().slice(0, 500)}`));
      else resolve(Buffer.concat(chunks));
    });
  });
}

async function main() {
  const connection = process.env.RB_BACKUP_SOURCE_URL;
  const passphrase = process.env.RB_BACKUP_PASSPHRASE;
  const directory = process.env.RB_BACKUP_OUTPUT_DIR;
  const destination = process.env.RB_BACKUP_REMOTE;
  if (!connection || !passphrase || !directory || !destination) throw new Error("Backup connection, passphrase, output directory, and remote are required.");
  const url = new URL(connection);
  if (url.protocol !== "postgresql:" || url.hostname.includes("-pooler.") || !url.hostname.endsWith(".neon.tech")) {
    throw new Error("A direct Neon PostgreSQL connection is required.");
  }
  const env = { ...process.env, PGHOST: url.hostname, PGPORT: url.port || "5432", PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password), PGDATABASE: decodeURIComponent(url.pathname.slice(1)), PGSSLMODE: "require" };
  delete env.RB_BACKUP_SOURCE_URL;
  delete env.RB_BACKUP_PASSPHRASE;
  const archive = await run("pg_dump", ["--schema=public", "--schema=neon_auth", "--format=custom", "--no-owner", "--no-acl"], env);
  if (!archive.subarray(0, 5).equals(Buffer.from("PGDMP"))) throw new Error("Invalid PostgreSQL archive.");
  const key = randomBytes(32);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  const ciphertext = Buffer.concat([cipher.update(archive), cipher.final()]);
  const sealed = Buffer.concat([magic, nonce, cipher.getAuthTag(), ciphertext]);
  const wrapped = sealPortableKey(key, passphrase);
  const decipher = createDecipheriv("aes-256-gcm", openPortableKey(wrapped, passphrase), nonce);
  decipher.setAuthTag(sealed.subarray(magic.length + 12, magic.length + 28));
  if (!Buffer.concat([decipher.update(ciphertext), decipher.final()]).equals(archive)) throw new Error("Backup verification failed.");
  await mkdir(directory, { recursive: true });
  const name = `full-${new Date().toISOString().replace(/[:.]/g, "-")}.rbbackup`;
  await writeFile(join(directory, name), sealed, { flag: "wx", mode: 0o600 });
  await writeFile(join(directory, `${name}.key.portable`), wrapped, { flag: "wx", mode: 0o600 });
  await writeFile(join(directory, `${name}.sha256`), `${createHash("sha256").update(sealed).digest("hex")}  ${name}\n`, { flag: "wx", mode: 0o600 });
  await run("rclone", ["copy", directory, destination, "--checksum", "--retries", "3"]);
  await run("rclone", ["check", directory, destination, "--one-way", "--download"]);
  console.log(`Encrypted backup uploaded and verified: ${name}`);
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

