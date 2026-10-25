// Encrypt historical dump files before removing their plaintext originals.
// The only file written during sealing contains authenticated ciphertext.
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { openPortableKey, sealPortableKey } from "./portable-backup-key.mjs";

const MAGIC = Buffer.from("RBVAULT1\n");
const MAX_BYTES = 256 * 1024 * 1024;

export function sealLegacyBytes(plain, passphrase) {
  if (!Buffer.isBuffer(plain) || plain.length > MAX_BYTES) throw new Error("Invalid input size.");
  const key = randomBytes(32);
  const wrappedKey = sealPortableKey(key, passphrase);
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, nonce);
  cipher.setAAD(MAGIC);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const length = Buffer.alloc(2);
  length.writeUInt16BE(wrappedKey.length);
  return Buffer.concat([MAGIC, length, wrappedKey, nonce, cipher.getAuthTag(), ciphertext]);
}

export function openLegacyBytes(sealed, passphrase) {
  if (!Buffer.isBuffer(sealed) || sealed.length < MAGIC.length + 2 + 12 + 16
    || !sealed.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Invalid legacy backup envelope.");
  }
  let offset = MAGIC.length;
  const keyLength = sealed.readUInt16BE(offset);
  offset += 2;
  if (offset + keyLength + 12 + 16 > sealed.length) throw new Error("Truncated legacy backup envelope.");
  const key = openPortableKey(sealed.subarray(offset, offset += keyLength), passphrase);
  const nonce = sealed.subarray(offset, offset += 12);
  const tag = sealed.subarray(offset, offset += 16);
  const decipher = createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(sealed.subarray(offset)), decipher.final()]);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function main() {
  const [command, inputFile, outputFile] = process.argv.slice(2);
  if (!["seal", "verify", "restore"].includes(command) || !inputFile) {
    throw new Error("Usage: node scripts/legacy-backup-vault.mjs seal|verify|restore <file> [restore-output]");
  }
  const root = resolve(process.env.RB_BACKUP_VAULT_ROOT || "");
  const file = resolve(inputFile);
  if (!process.env.RB_BACKUP_VAULT_ROOT || !file.startsWith(root + sep)) {
    throw new Error("Input must be inside the explicit backup vault root.");
  }
  const passphraseFile = process.env.RB_BACKUP_PASSPHRASE_FILE;
  if (!passphraseFile || resolve(passphraseFile).startsWith(resolve(process.cwd()) + sep)) {
    throw new Error("A passphrase file outside the project is required.");
  }
  const passphrase = (await readFile(passphraseFile, "utf8")).trim();
  if (passphrase.length < 32) throw new Error("Recovery passphrase is too short.");
  if (command === "seal") {
    if (file.endsWith(".rbsealed")) throw new Error("Input is already sealed.");
    const plain = await readFile(file);
    const sealed = sealLegacyBytes(plain, passphrase);
    const sealedFile = `${file}.rbsealed`;
    await writeFile(sealedFile, sealed, { flag: "wx" });
    const recovered = openLegacyBytes(await readFile(sealedFile), passphrase);
    if (sha256(recovered) !== sha256(plain)) throw new Error("Sealed copy did not round-trip.");
    await writeFile(`${sealedFile}.proof.json`, JSON.stringify({
      source_filename: file.split(/[\\/]/).at(-1),
      source_sha256: sha256(plain),
      sealed_sha256: sha256(sealed),
      verified_at: new Date().toISOString(),
    }, null, 2), { flag: "wx" });
    console.log(JSON.stringify({ sealed_file: sealedFile, source_sha256: sha256(plain), verified: true }));
    return;
  }
  if (!file.endsWith(".rbsealed")) throw new Error("Only .rbsealed files can be opened.");
  const recovered = openLegacyBytes(await readFile(file), passphrase);
  const proof = JSON.parse(await readFile(`${file}.proof.json`, "utf8"));
  if (sha256(recovered) !== proof.source_sha256) throw new Error("Recovered data differs from proof.");
  if (command === "restore") {
    if (!outputFile) throw new Error("An explicit restore output file is required.");
    const output = resolve(outputFile);
    if (!output.startsWith(root + sep)) throw new Error("Restore output must be inside the backup vault root.");
    await writeFile(output, recovered, { flag: "wx" });
  }
  console.log(JSON.stringify({ source_sha256: sha256(recovered), verified: true, restored: command === "restore" }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
