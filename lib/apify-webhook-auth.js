import crypto from "crypto";

export function isValidApifyWebhookSecret(providedSecret, expectedSecret) {
  if (typeof providedSecret !== "string" || typeof expectedSecret !== "string" || !providedSecret || !expectedSecret) {
    return false;
  }

  const expectedBuffer = Buffer.from(expectedSecret, "utf8");
  const providedBuffer = Buffer.from(providedSecret, "utf8");

  return expectedBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
