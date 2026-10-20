import test from "node:test";
import assert from "node:assert/strict";
import { ensureVerifiedSignupSession } from "../lib/auth/signup-session.js";

test("verified signup reuses the matching active session", async () => {
  let signInCalls = 0;
  const authClient = {
    async getSession() {
      return { data: { session: { user: { email: " New@Example.com " } } } };
    },
    signIn: {
      async email() {
        signInCalls += 1;
        return { error: null };
      },
    },
  };

  const result = await ensureVerifiedSignupSession(authClient, {
    email: "new@example.com",
    password: "private-password",
  });

  assert.deepEqual(result, { error: null });
  assert.equal(signInCalls, 0);
});

test("verified signup signs in when no matching session exists", async () => {
  const attempts = [];
  const authClient = {
    async getSession() {
      return { data: { session: null } };
    },
    signIn: {
      async email(credentials) {
        attempts.push(credentials);
        return { data: { user: { email: credentials.email } }, error: null };
      },
    },
  };

  const result = await ensureVerifiedSignupSession(authClient, {
    email: "new@example.com",
    password: "private-password",
  });

  assert.deepEqual(result, { error: null });
  assert.deepEqual(attempts, [{ email: "new@example.com", password: "private-password" }]);
});

test("verified signup signs in when another account owns the active session", async () => {
  let signInCalls = 0;
  const authClient = {
    async getSession() {
      return { data: { user: { email: "other@example.com" } } };
    },
    signIn: {
      async email() {
        signInCalls += 1;
        return { error: null };
      },
    },
  };

  const result = await ensureVerifiedSignupSession(authClient, {
    email: "new@example.com",
    password: "private-password",
  });

  assert.deepEqual(result, { error: null });
  assert.equal(signInCalls, 1);
});

test("verified signup returns a rejected session fallback without throwing", async () => {
  const expectedError = new Error("Sign-in failed");
  const authClient = {
    async getSession() {
      throw new Error("Session lookup failed");
    },
    signIn: {
      async email() {
        throw expectedError;
      },
    },
  };

  const result = await ensureVerifiedSignupSession(authClient, {
    email: "new@example.com",
    password: "private-password",
  });

  assert.equal(result.error, expectedError);
});
