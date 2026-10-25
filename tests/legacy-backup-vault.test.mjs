import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { test } from "node:test";
import { openLegacyBytes, sealLegacyBytes } from "../scripts/legacy-backup-vault.mjs";

test("historical backup vault restores bytes and rejects corruption", () => {
  const source = randomBytes(128 * 1024);
  const passphrase = randomBytes(32).toString("base64");
  const sealed = sealLegacyBytes(source, passphrase);
  assert.deepEqual(openLegacyBytes(sealed, passphrase), source);
  assert.throws(() => openLegacyBytes(sealed, randomBytes(32).toString("base64")));
  const corrupted = Buffer.from(sealed);
  corrupted[corrupted.length - 1] ^= 1;
  assert.throws(() => openLegacyBytes(corrupted, passphrase));
});
