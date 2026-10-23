import { createHash, timingSafeEqual } from "node:crypto";

// SHA-256 of the verified owner account's email. This is an identity selector,
// not a secret or a substitute for the Neon Auth session check.
const OWNER_EMAIL_SHA256 = "6774b73f98c51a45025f17ab065b524a895c1c94efab1bf36d0309b2d0f1668a";

export function normalizeSupportTicket(formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const subject = String(formData.get("subject") || "").trim();
  const message = String(formData.get("message") || "").trim();
  const honeypot = String(formData.get("website") || "").trim();
  if (honeypot) return { error: "spam" };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "email" };
  if (subject.length < 3 || subject.length > 160) return { error: "subject" };
  if (message.length < 10 || message.length > 4000) return { error: "message" };
  return { email, subject, message };
}

export function isSupportAdmin(user) {
  if (!user?.email) return false;
  const emailHash = createHash("sha256").update(user.email.trim().toLowerCase()).digest();
  return timingSafeEqual(emailHash, Buffer.from(OWNER_EMAIL_SHA256, "hex"));
}
