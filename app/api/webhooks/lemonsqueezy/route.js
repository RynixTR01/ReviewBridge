import { queryOne } from "@/lib/db";
import {
  resolveLemonSqueezyPlan,
  verifyLemonSqueezySignature,
} from "@/lib/lemonsqueezy-webhook";
import { createLemonSqueezyWebhookHandler } from "@/app/lib/lemonsqueezy-webhook-handler";

export const POST = createLemonSqueezyWebhookHandler({
  queryOne,
  resolveLemonSqueezyPlan,
  verifyLemonSqueezySignature,
});
