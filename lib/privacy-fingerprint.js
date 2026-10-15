import { createHmac } from "node:crypto";

/** Keep recipient fingerprints pseudonymous and scoped to one user/brand. */
export function recipientFingerprint(scopeId, email) {
  const secret = process.env.NEON_AUTH_COOKIE_SECRET;
  if (!secret) throw new Error("NEON_AUTH_COOKIE_SECRET is required to fingerprint recipient addresses.");
  const normalizedEmail = String(email || "").trim().toLowerCase();
  return createHmac("sha256", secret)
    .update("reviewbridge:recipient-fingerprint:v1\0")
    .update(String(scopeId))
    .update("\0")
    .update(normalizedEmail)
    .digest("hex");
}
