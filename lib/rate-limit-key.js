import { createHmac } from "node:crypto";

export function rateLimitBucketHash(client, key, secret) {
  return createHmac("sha256", secret).update(`${client}\0${key}`).digest("hex");
}
