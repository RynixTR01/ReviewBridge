import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const MAGIC = Buffer.from("RBKEY1\n");
const SALT_BYTES = 16;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const KEY_BYTES = 32;
const SCRYPT_OPTIONS = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function deriveKey(passphrase, salt) {
  if (typeof passphrase !== "string" || passphrase.length < 32) {
    throw new Error("A recovery passphrase of at least 32 characters is required.");
  }
  return scryptSync(passphrase, salt, KEY_BYTES, SCRYPT_OPTIONS);
}

export function sealPortableKey(key, passphrase) {
  if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) throw new Error("Invalid archive key.");
  const salt = randomBytes(SALT_BYTES);
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(passphrase, salt), nonce);
  cipher.setAAD(MAGIC);
  const ciphertext = Buffer.concat([cipher.update(key), cipher.final()]);
  return Buffer.concat([MAGIC, salt, nonce, cipher.getAuthTag(), ciphertext]);
}

export function openPortableKey(envelope, passphrase) {
  const expectedLength = MAGIC.length + SALT_BYTES + NONCE_BYTES + TAG_BYTES + KEY_BYTES;
  if (!Buffer.isBuffer(envelope) || envelope.length !== expectedLength
    || !envelope.subarray(0, MAGIC.length).equals(MAGIC)) {
    throw new Error("Invalid portable recovery key file.");
  }
  let offset = MAGIC.length;
  const salt = envelope.subarray(offset, offset += SALT_BYTES);
  const nonce = envelope.subarray(offset, offset += NONCE_BYTES);
  const tag = envelope.subarray(offset, offset += TAG_BYTES);
  const decipher = createDecipheriv("aes-256-gcm", deriveKey(passphrase, salt), nonce);
  decipher.setAAD(MAGIC);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(envelope.subarray(offset)), decipher.final()]);
  } catch {
    throw new Error("Recovery passphrase or portable key file is invalid.");
  }
}
