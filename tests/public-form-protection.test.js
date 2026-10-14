import assert from "node:assert/strict";
import test from "node:test";

import { isHoneypotFilled } from "../lib/public-form-protection.js";

test("detects a filled public-form honeypot", () => {
  assert.equal(isHoneypotFilled(new Map([ ["website", "https://spam.example"] ])), true);
});

test("allows an empty honeypot and a missing form value", () => {
  assert.equal(isHoneypotFilled(new Map([ ["website", "   "] ])), false);
  assert.equal(isHoneypotFilled({ get: () => null }), false);
});
