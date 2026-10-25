// Isolated disaster-recovery rehearsal. The Postgres archive and Auth rows
// remain in memory; only AES-256-GCM ciphertext reaches the disk.
import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { neon } from "@neondatabase/serverless";
import { openPortableKey, sealPortableKey } from "./portable-backup-key.mjs";

const LIMIT = 256 * 1024 * 1024;
const MAGIC = Buffer.from("RBNEON1\n");

function pgEnvironment(connection) {
  const url = new URL(connection);
  return {
    ...process.env,
    PGHOST: url.hostname,
    PGPORT: url.port || "5432",
    PGUSER: decodeURIComponent(url.username),
    PGPASSWORD: decodeURIComponent(url.password),
    PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGSSLMODE: "require",
  };
}

async function run(file, args, { env = process.env, input } = {}) {
  return new Promise((resolveResult, reject) => {
    const child = spawn(file, args, { env, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    const output = [];
    const errors = [];
    let size = 0;
    child.stdout.on("data", (chunk) => {
      size += chunk.length;
      if (size > LIMIT) child.kill();
      else output.push(chunk);
    });
    child.stderr.on("data", (chunk) => errors.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0 || size > LIMIT) reject(new Error(`${file} failed (${code}); ${Buffer.concat(errors).toString("utf8").slice(0, 500)}`));
      else resolveResult(Buffer.concat(output));
    });
    child.stdin.on("error", (error) => {
      if (!["EPIPE", "EOF"].includes(error.code)) reject(error);
    });
    child.stdin.end(input);
  });
}

async function dpapi(bytes, operation) {
  const source = operation === "protect" ? "Protect" : "Unprotect";
  const command = `$ErrorActionPreference='Stop';Add-Type -AssemblyName System.Security;` +
    `$b=[Convert]::FromBase64String([Console]::In.ReadToEnd());` +
    `$r=[Security.Cryptography.ProtectedData]::${source}($b,$null,[Security.Cryptography.DataProtectionScope]::CurrentUser);` +
    `[Console]::Out.Write([Convert]::ToBase64String($r))`;
  const result = await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", command], {
    input: Buffer.from(bytes.toString("base64"), "utf8"),
  });
  return Buffer.from(result.toString("utf8").trim(), "base64");
}

function canonicalRows(sql) {
  const lines = sql.toString("utf8").split(/\r?\n/);
  const rows = [];
  let copy = "";
  for (const line of lines) {
    if (line.startsWith("COPY ")) { copy = line; rows.push(line); continue; }
    if (copy && line === "\\.") { copy = ""; continue; }
    if (copy) rows.push(`${copy}\t${line}`);
    if (line.startsWith("SELECT pg_catalog.setval")) rows.push(line);
  }
  return createHash("sha256").update(rows.sort().join("\n")).digest("hex");
}

async function main() {
  const passphrasePath = process.env.RB_BACKUP_PASSPHRASE_FILE;
  if (process.platform !== "win32" && !passphrasePath) {
    throw new Error("A portable recovery passphrase file is required outside Windows.");
  }
  if (passphrasePath && resolve(passphrasePath).startsWith(resolve(process.cwd()) + sep)) {
    throw new Error("Store the recovery passphrase file outside the project directory.");
  }
  const passphrase = passphrasePath && (await readFile(passphrasePath, "utf8")).trim();
  if (passphrasePath && (!passphrase || passphrase.length < 32)) {
    throw new Error("The recovery passphrase must contain at least 32 characters.");
  }
  const sourceUrl = process.env.RB_BACKUP_SOURCE_URL;
  const auditUrl = process.env.RB_BACKUP_AUDIT_URL;
  const auditHost = process.env.RB_BACKUP_AUDIT_HOST;
  const auditBranch = process.env.RB_BACKUP_AUDIT_BRANCH;
  const bin = resolve(process.env.RB_POSTGRES_BIN || "");
  const outDir = resolve(process.env.RB_BACKUP_OUTPUT_DIR || "");
  if (!sourceUrl || !auditUrl || !auditHost || !auditBranch
    || !process.env.RB_POSTGRES_BIN || !process.env.RB_BACKUP_OUTPUT_DIR) {
    throw new Error("Source, isolated audit host/branch, Postgres bin, and output directory are required.");
  }
  const source = new URL(sourceUrl);
  const audit = new URL(auditUrl);
  if (source.hostname !== "ep-still-king-ba1rge14.c-8.eu-central-1.aws.neon.tech"
    || audit.hostname !== auditHost || audit.hostname === source.hostname
    || auditBranch === "br-rough-cloud-batval9z"
    || source.username !== "neondb_owner" || audit.username !== "neondb_owner") {
    throw new Error("Unexpected production source or isolated audit destination.");
  }
  const executable = (name) => join(bin, `${name}${process.platform === "win32" ? ".exe" : ""}`);
  const schemas = ["--schema=public", "--schema=neon_auth"];
  const dumpArgs = [...schemas, "--format=custom", "--no-owner", "--no-acl"];
  await mkdir(outDir, { recursive: true });
  let backupPath = process.env.RB_BACKUP_RESUME_PATH && resolve(process.env.RB_BACKUP_RESUME_PATH);
  let archive;
  if (backupPath && (!backupPath.startsWith(outDir + sep) || !backupPath.endsWith(".rbbackup"))) {
    throw new Error("Resume backup must be inside the selected output directory.");
  }
  if (!backupPath) {
    if (!passphrase) throw new Error("RB_BACKUP_PASSPHRASE_FILE is required for a portable new backup.");
    archive = await run(executable("pg_dump"), dumpArgs, { env: pgEnvironment(sourceUrl) });
    console.log("Postgres archive captured in memory.");
    if (!archive.subarray(0, 5).equals(Buffer.from("PGDMP"))) throw new Error("Invalid pg_dump archive.");
    const key = randomBytes(32);
    const nonce = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, nonce);
    const ciphertext = Buffer.concat([cipher.update(archive), cipher.final()]);
    const envelope = Buffer.concat([MAGIC, nonce, cipher.getAuthTag(), ciphertext]);
    const wrappedKey = process.platform === "win32" && await dpapi(key, "protect");
    const portableKey = sealPortableKey(key, passphrase);
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    backupPath = join(outDir, `full-${stamp}.rbbackup`);
    await writeFile(backupPath, envelope, { flag: "wx" });
    await writeFile(`${backupPath}.key.portable`, portableKey, { flag: "wx" });
    if (wrappedKey) await writeFile(`${backupPath}.key.dpapi`, wrappedKey, { flag: "wx" });
  }

  const saved = await readFile(backupPath);
  const unwrapped = passphrase
    ? openPortableKey(await readFile(`${backupPath}.key.portable`), passphrase)
    : await dpapi(await readFile(`${backupPath}.key.dpapi`), "unprotect");
  if (!saved.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("Invalid backup header.");
  const decrypt = createDecipheriv("aes-256-gcm", unwrapped,
    saved.subarray(MAGIC.length, MAGIC.length + 12));
  decrypt.setAuthTag(saved.subarray(MAGIC.length + 12, MAGIC.length + 28));
  const recovered = Buffer.concat([decrypt.update(saved.subarray(MAGIC.length + 28)), decrypt.final()]);
  if (archive && !recovered.equals(archive)) throw new Error("Encrypted backup round trip differs.");
  archive ??= recovered;
  console.log("Recovery key and AES-GCM archive decrypted and verified.");

  const dbName = `rb_restore_${Date.now()}`;
  const auditSql = neon(auditUrl);
  await auditSql.query(`CREATE DATABASE ${dbName}`);
  console.log("Created empty restore database on isolated branch.");
  const restoreEnv = { ...pgEnvironment(auditUrl), PGDATABASE: dbName };
  const toc = (await run(executable("pg_restore"), ["--list", "--file=-"], { input: recovered })).toString("utf8");
  const restoreList = toc.split(/\r?\n/).filter((line) => !/^\d+; \d+ \d+ SCHEMA - public /.test(line)).join("\n");
  const listPath = join(tmpdir(), `rb-restore-${randomUUID()}.list`);
  await writeFile(listPath, restoreList, "utf8");
  try {
    await run(executable("pg_restore"), ["--exit-on-error", "--no-owner", "--no-acl", `--use-list=${listPath}`, `--dbname=${dbName}`], {
      env: restoreEnv, input: recovered,
    });
  } finally {
    await unlink(listPath);
  }

  const originalData = await run(executable("pg_restore"), ["--data-only", "--file=-"], { input: recovered });
  const restored = await run(executable("pg_dump"), dumpArgs, { env: restoreEnv });
  const restoredData = await run(executable("pg_restore"), ["--data-only", "--file=-"], { input: restored });
  const originalHash = canonicalRows(originalData);
  if (originalHash !== canonicalRows(restoredData)) throw new Error("Restored rows or sequences differ.");
  const proof = {
    checked_at: new Date().toISOString(),
    scope: ["public", "neon_auth"],
    backup_filename: backupPath.split(/[\\/]/).at(-1),
    sha256: createHash("sha256").update(saved).digest("hex"),
    restored_branch: auditBranch,
    restored_database: dbName,
    all_copy_rows_and_sequences_match: true,
    limitation: "Portable recovery requires the passphrase kept separately, an off-device copy, and a second-machine restore rehearsal.",
  };
  await writeFile(`${backupPath}.proof.json`, JSON.stringify(proof, null, 2));
  console.log(JSON.stringify({ ...proof, archive_bytes: archive.length }));
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
