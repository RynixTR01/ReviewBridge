import "server-only";
import { queryOne } from "@/lib/db";
import { createRateLimiter } from "./rate-limit-core";

export const isRateLimited = createRateLimiter({ queryOne });
