import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { openPortableKey, sealPortableKey } from "../scripts/portable-backup-key.mjs";

test("portable recovery key survives rewrap and rejects a wrong passphrase or changed bytes", () => {
  const archiveKey = randomBytes(32);
  const passphrase = randomBytes(32).toString("base64");
  const wrapped = sealPortableKey(archiveKey, passphrase);
  assert.deepEqual(openPortableKey(wrapped, passphrase), archiveKey);
  assert.notDeepEqual(sealPortableKey(archiveKey, passphrase), wrapped);
  assert.throws(() => openPortableKey(wrapped, randomBytes(32).toString("base64")));
  const tampered = Buffer.from(wrapped);
  tampered[tampered.length - 1] ^= 1;
  assert.throws(() => openPortableKey(tampered, passphrase));
});
